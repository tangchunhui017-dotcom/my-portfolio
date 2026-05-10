'use client';

import { useMemo } from 'react';

import { getDashboardMonthByWave, matchesDashboardSeasonFilter } from '@/config/dashboardTime';
import { matchesPriceBandFilter } from '@/config/priceBand';
import { useDimChannel, useDimSku, useFactInventory, useFactSalesForDashboard } from '@/hooks/useDashboardData';
import { matchesDashboardSkuCategoryFilters, type DashboardFilters } from '@/hooks/useDashboardFilter';
import type { MonthlyOTBInput } from '@/utils/otbCalculations';
import monthlyTemplate from '@/../data/otb/monthly_otb_plan.json';

interface FactSalesRow {
    sku_id: string;
    channel_id: string;
    sale_year?: string | number;
    season_year?: string | number;
    sales_season_year?: string | number;
    sale_month?: number | string;
    month?: number | string;
    sale_wave?: string;
    wave?: string;
    sales_season?: string;
    season?: string;
    unit_sold?: number | string;
    gross_sales_amt?: number | string;
    net_sales_amt?: number | string;
    cogs_amt?: number | string;
    gross_profit_amt?: number | string;
}

interface DimSkuRow {
    sku_id: string;
    sku_name?: string;
    brand_name?: string | null;
    gender?: string | null;
    category_id?: string;
    category_name?: string;
    category_l2?: string;
    product_line?: string;
    price_band?: string;
    msrp?: number;
    lifecycle?: string;
    target_audience?: string;
    target_age_group?: string;
    color?: string;
    color_family?: string;
}

interface DimChannelRow {
    channel_id: string;
    channel_type?: string;
    channel_name?: string;
    region?: string;
    city_tier?: string;
    store_format?: string;
}

interface FactInventoryRow {
    date: string;
    sku_id: string;
    store_id?: string;
    channel_id?: string;
    inventory_amount?: number | string;
}

interface MonthlySalesAgg {
    netSales: number;
    grossSales: number;
    cogs: number;
    grossProfit: number;
    units: number;
}

export interface OtbVirtualSalesLoopResult {
    monthlyInputs: MonthlyOTBInput[];
    month1BeginningInventoryCost: number;
    annualSalesForecast: number;
    factSalesTotal: number;
    source: 'fact_sales' | 'template_fallback';
    dataScopeLabel: string;
    isLoading: boolean;
    diagnostics: string[];
}

const DEFAULT_MONTHS = monthlyTemplate.months as MonthlyOTBInput[];
const DEFAULT_BEGINNING = Number(monthlyTemplate.month1BeginningInventoryCost || 0);

function toNumber(value: unknown, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function resolveSaleYear(row: FactSalesRow) {
    const raw = row.sale_year ?? row.sales_season_year ?? row.season_year;
    const year = Number(raw);
    return Number.isFinite(year) ? year : null;
}

function resolveSaleMonth(row: FactSalesRow) {
    const direct = toNumber(row.sale_month ?? row.month, 0);
    if (direct >= 1 && direct <= 12) return Math.round(direct);
    return getDashboardMonthByWave(row.sale_wave || row.wave) ?? 0;
}

function matchesSkuScope(filters: DashboardFilters, sku: DimSkuRow) {
    if (!matchesDashboardSkuCategoryFilters(filters, sku)) return false;
    if (filters.lifecycle !== 'all' && sku.lifecycle !== filters.lifecycle) return false;
    if (filters.target_audience !== 'all' && sku.target_audience !== filters.target_audience && sku.target_age_group !== filters.target_audience) return false;
    if (filters.color !== 'all' && sku.color !== filters.color && sku.color_family !== filters.color) return false;
    if (!matchesPriceBandFilter(toNumber(sku.msrp, 0), filters.price_band, sku.price_band)) return false;
    return true;
}

function matchesChannelScope(filters: DashboardFilters, channel: DimChannelRow) {
    if (filters.channel_type !== 'all' && channel.channel_type !== filters.channel_type) return false;
    if (filters.region !== 'all' && channel.region !== filters.region) return false;
    if (filters.city_tier !== 'all' && channel.city_tier !== filters.city_tier) return false;
    if (filters.store_format !== 'all' && channel.store_format !== filters.store_format) return false;
    return true;
}

function matchesFactScope(filters: DashboardFilters, row: FactSalesRow, sku: DimSkuRow | undefined, channel: DimChannelRow | undefined, targetYear: number) {
    if (!sku || !channel) return false;
    const rowYear = resolveSaleYear(row);
    if (rowYear !== targetYear) return false;
    const wave = row.sale_wave || row.wave;
    if (!matchesDashboardSeasonFilter(filters.season, wave, row.sales_season || row.season)) return false;
    if (filters.wave !== 'all' && wave !== filters.wave) return false;
    if (!matchesSkuScope(filters, sku)) return false;
    if (!matchesChannelScope(filters, channel)) return false;
    return true;
}

function emptyMonthlyAgg() {
    return Array.from({ length: 12 }, (): MonthlySalesAgg => ({
        netSales: 0,
        grossSales: 0,
        cogs: 0,
        grossProfit: 0,
        units: 0,
    }));
}

function aggregateByMonth(rows: FactSalesRow[]) {
    const monthly = emptyMonthlyAgg();
    rows.forEach((row) => {
        const month = resolveSaleMonth(row);
        if (month < 1 || month > 12) return;
        const target = monthly[month - 1];
        const netSales = toNumber(row.net_sales_amt);
        const grossSales = toNumber(row.gross_sales_amt, netSales);
        const grossProfit = toNumber(row.gross_profit_amt);
        const cogs = toNumber(row.cogs_amt, Math.max(0, netSales - grossProfit));
        target.netSales += netSales;
        target.grossSales += grossSales;
        target.cogs += cogs;
        target.grossProfit += grossProfit;
        target.units += toNumber(row.unit_sold);
    });
    return monthly;
}

function deriveMarkupRate(agg: MonthlySalesAgg, fallback: MonthlyOTBInput) {
    if (agg.cogs > 0 && agg.netSales > 0) {
        const discountRate = agg.grossSales > 0 ? agg.netSales / agg.grossSales : fallback.discountRate;
        const retailSales = agg.netSales / Math.max(0.01, discountRate);
        return clamp(retailSales / agg.cogs, 1.8, 6);
    }
    return fallback.markupRate;
}

function deriveDiscountRate(agg: MonthlySalesAgg, fallback: MonthlyOTBInput) {
    if (agg.grossSales > 0 && agg.netSales > 0) return clamp(agg.netSales / agg.grossSales, 0.35, 1);
    return fallback.discountRate;
}

function deriveStockToSalesRatio(filters: DashboardFilters, fallback: MonthlyOTBInput) {
    const channel = String(filters.channel_type || '').toLowerCase();
    if (channel.includes('online') || channel.includes('ecom') || channel.includes('电商')) return 2;
    if (channel.includes('outlet') || channel.includes('clearance') || channel.includes('奥莱') || channel.includes('清仓')) return 1;
    return fallback.stockToSalesRatio || 3;
}

function buildScopeLabel(filters: DashboardFilters) {
    const parts = [
        filters.brand === 'all' ? '全部品牌' : filters.brand,
        filters.season_year === 'all' ? '全部年度' : `${filters.season_year}年`,
        filters.season === 'all' ? '全季节' : filters.season,
        filters.wave === 'all' ? '全月份' : filters.wave,
        filters.channel_type === 'all' ? '全渠道' : filters.channel_type,
        filters.category_id === 'all' ? '全品类' : filters.category_id,
        filters.price_band === 'all' ? '全价格带' : filters.price_band,
    ];
    return parts.join(' / ');
}

export function useOtbVirtualSalesLoop(filters: DashboardFilters): OtbVirtualSalesLoopResult {
    const { data: factSalesRaw, isLoading: loadingSales } = useFactSalesForDashboard(filters.season_year);
    const { data: dimSkuRaw, isLoading: loadingSku } = useDimSku();
    const { data: dimChannelRaw, isLoading: loadingChannel } = useDimChannel();
    const { data: inventoryRaw, isLoading: loadingInventory } = useFactInventory();

    return useMemo(() => {
        const factSales = (factSalesRaw ?? []) as FactSalesRow[];
        const dimSku = (dimSkuRaw ?? []) as DimSkuRow[];
        const dimChannel = (dimChannelRaw ?? []) as DimChannelRow[];
        const inventory = (inventoryRaw ?? []) as FactInventoryRow[];

        const skuMap = new Map(dimSku.map((sku) => [sku.sku_id, sku]));
        const channelMap = new Map(dimChannel.map((channel) => [channel.channel_id, channel]));
        const targetYear = filters.season_year === 'all'
            ? factSales.reduce((max, row) => Math.max(max, resolveSaleYear(row) ?? 0), 2025)
            : Number(filters.season_year);

        const currentRows = factSales.filter((row) => matchesFactScope(filters, row, skuMap.get(row.sku_id), channelMap.get(row.channel_id), targetYear));
        const previousRows = factSales.filter((row) => matchesFactScope(filters, row, skuMap.get(row.sku_id), channelMap.get(row.channel_id), targetYear - 1));

        const currentAgg = aggregateByMonth(currentRows);
        const previousAgg = aggregateByMonth(previousRows);
        const source: OtbVirtualSalesLoopResult['source'] = currentRows.length > 0 || previousRows.length > 0 ? 'fact_sales' : 'template_fallback';

        const monthlyInputs = DEFAULT_MONTHS.map((fallback, index) => {
            const current = currentAgg[index];
            const previous = previousAgg[index];
            const currentSales = current.netSales;
            const previousSales = previous.netSales;
            const salesForecast = currentSales > 0
                ? currentSales
                : previousSales > 0
                  ? previousSales * 1.08
                  : fallback.salesForecast;
            const benchmark = currentSales > 0 ? current : previousSales > 0 ? previous : null;
            const discountRate = benchmark ? deriveDiscountRate(benchmark, fallback) : fallback.discountRate;
            const markupRate = benchmark ? deriveMarkupRate(benchmark, fallback) : fallback.markupRate;
            const originalPurchaseBudget = salesForecast / Math.max(0.01, discountRate) / Math.max(0.01, markupRate);

            return {
                month: index + 1,
                salesForecast: Math.round(salesForecast),
                markupRate: Number(markupRate.toFixed(2)),
                discountRate: Number(discountRate.toFixed(4)),
                stockToSalesRatio: deriveStockToSalesRatio(filters, fallback),
                arrivalRate: fallback.arrivalRate || 0.95,
                originalPurchaseBudget: Math.round(originalPurchaseBudget),
            };
        });

        let month1BeginningInventoryCost = DEFAULT_BEGINNING;
        if (inventoryRaw) {
            const latestDate = inventory.reduce((max, row) => (row.date > max ? row.date : max), '');
            const latestRows = inventory.filter((row) => row.date === latestDate);
            const scopedRows = latestRows.filter((row) => {
                const sku = skuMap.get(row.sku_id);
                if (!sku || !matchesSkuScope(filters, sku)) return false;
                if (row.channel_id) {
                    const channel = channelMap.get(row.channel_id);
                    return channel ? matchesChannelScope(filters, channel) : true;
                }
                return true;
            });
            const inventoryRows = scopedRows.length > 0 ? scopedRows : latestRows;
            month1BeginningInventoryCost = inventoryRows.reduce((sum, row) => sum + toNumber(row.inventory_amount), 0);
        }

        const factSalesTotal = currentRows.reduce((sum, row) => sum + toNumber(row.net_sales_amt), 0);
        const annualSalesForecast = monthlyInputs.reduce((sum, row) => sum + row.salesForecast, 0);
        const diagnostics: string[] = [];
        if (source === 'template_fallback') {
            diagnostics.push('当前筛选口径下没有匹配到虚拟销售事实数据，月度 OTB 暂用模板基准。');
        }
        if (factSalesTotal > 0 && annualSalesForecast < factSalesTotal * 0.9) {
            diagnostics.push('年度预测低于当前虚拟销售事实合计 90%，建议检查筛选口径或预测增长率。');
        }
        if (month1BeginningInventoryCost <= 0) {
            diagnostics.push('当前口径未匹配到库存金额，月初库存按 0 参与 OTB 推导。');
        }

        return {
            monthlyInputs,
            month1BeginningInventoryCost,
            annualSalesForecast,
            factSalesTotal,
            source,
            dataScopeLabel: buildScopeLabel(filters),
            isLoading: Boolean(loadingSales || loadingSku || loadingChannel || loadingInventory),
            diagnostics,
        };
    }, [dimChannelRaw, dimSkuRaw, factSalesRaw, filters, inventoryRaw, loadingChannel, loadingInventory, loadingSales, loadingSku]);
}
