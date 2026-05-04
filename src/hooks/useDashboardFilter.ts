'use client';

import { useMemo, useState } from 'react';

import factSalesRaw from '@/../data/dashboard/fact_sales.json';
import dimChannelRaw from '@/../data/dashboard/dim_channel.json';
import dimPlanRaw from '@/../data/dashboard/dim_plan.json';
import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import { FOOTWEAR_CATEGORY_CORE_ORDER, matchCategoryL1, matchCategoryL2, resolveFootwearCategory } from '@/config/categoryMapping';
import { getDashboardCompareMeta, resolveDashboardMomBaseline, type DashboardCompareContext } from '@/config/dashboardCompare';
import { matchesDashboardBrand, matchesDashboardCategoryL1 } from '@/config/dashboardFilterStandards';
import { resolveDashboardLifecycleLabel } from '@/config/dashboardLifecycle';
import { deriveDashboardAnnualPlanTotal, deriveDashboardMonthlyPlanBreakdown, deriveScopedAnnualPlanTotal } from '@/config/dashboardPlan';
import {
    PRICE_BANDS,
    formatPriceBandLabel,
    matchesPriceBandFilter,
    resolvePriceBandByMsrp,
} from '@/config/priceBand';
import { getCurrentDashboardWave, getDashboardMonthByWave, matchesDashboardSeasonFilter } from '@/config/dashboardTime';

export type CompareMode = 'none' | 'plan' | 'yoy' | 'mom';

interface FactSalesRecord {
    record_id: string;
    sku_id: string;
    channel_id: string;
    sale_year?: string;
    sale_month?: number;
    sale_wave?: string;
    sales_season_year?: string;
    sales_season?: string;
    season_year: string;
    season: string;
    wave: string;
    week_num: number;
    unit_sold: number;
    gross_sales_amt: number;
    net_sales_amt: number;
    discount_amt: number;
    discount_rate: number;
    cogs_amt: number;
    gross_profit_amt: number;
    gross_margin_rate: number;
    cumulative_sell_through: number;
    on_hand_unit: number;
}

interface DimSku {
    sku_id: string;
    sku_name: string;
    category_id: string;
    category_name: string;
    category_l2?: string;
    product_line?: string;
    season_year?: string;
    season?: string;
    dev_season_year?: string;
    dev_season?: string;
    brand_name?: string;
    gender?: string;
    price_band: string;
    msrp: number;
    lifecycle?: string;
    launch_date?: string;
    target_audience?: string;
    target_age_group?: string;
    color?: string;
    color_family?: string;
}

interface DimChannel {
    channel_id: string;
    channel_type: string;
    channel_name: string;
    is_online: boolean;
    region: string;
    city_tier: string;
    store_format: string;
}

interface DimPlanMonthlyRecord {
    month: number;
    plan_sales_amt: number;
}

interface DimPlan {
    season_year: number;
    category_plan: { category_id: string; plan_sales_amt: number; plan_units: number; plan_sell_through: number; plan_margin_rate: number; plan_sku_count: number }[];
    channel_plan: { channel_type: string; plan_sales_amt: number; plan_sell_through: number; plan_margin_rate: number; plan_sales_share: number }[];
    overall_plan: { plan_total_sales: number; plan_total_units: number; plan_avg_sell_through: number; plan_avg_margin_rate: number; plan_avg_discount_depth: number; plan_active_skus: number; plan_ending_inventory_units: number; plan_ending_inventory_amt: number; plan_wos: number };
    monthly_plan?: DimPlanMonthlyRecord[];
}

const factSales = factSalesRaw as unknown as FactSalesRecord[];
const dimSku = dimSkuRaw as unknown as DimSku[];
const dimChannel = dimChannelRaw as unknown as DimChannel[];
const dimPlan = dimPlanRaw as unknown as DimPlan;

export interface DashboardFilters {
    season_year: number | 'all';
    season: string | 'all';
    wave: string | 'all';
    brand: string | 'all';
    category_l1: string | 'all';
    category_id: string | 'all';
    sub_category: string | 'all';
    channel_type: string | 'all';
    price_band: string | 'all';
    lifecycle: string | 'all';
    region: string | 'all';
    city_tier: string | 'all';
    store_format: string | 'all';
    target_audience: string | 'all';
    color: string | 'all';
}

export function getDefaultDashboardFilters(now = new Date()): DashboardFilters {
    return {
        season_year: 2025,
        season: 'all',
        wave: getCurrentDashboardWave(now),
        brand: 'all',
        category_l1: 'all',
        category_id: 'all',
        sub_category: 'all',
        channel_type: 'all',
        price_band: 'all',
        lifecycle: 'all',
        region: 'all',
        city_tier: 'all',
        store_format: 'all',
        target_audience: 'all',
        color: 'all',
    };
}

export const DEFAULT_FILTERS: DashboardFilters = getDefaultDashboardFilters();

const AUDIENCE_TO_AGE_GROUP: Record<string, string[]> = {
    '18-23岁 GenZ': ['18-25'],
    '24-28岁 职场新人': ['26-35'],
    '29-35岁 资深中产': ['26-35'],
    '35岁以上': ['36-45', '46+'],
};

function matchesTargetAudience(sku: DimSku, selectedAudience: string | 'all') {
    if (selectedAudience === 'all') return true;
    if (sku.target_audience === selectedAudience) return true;
    if (sku.target_age_group === selectedAudience) return true;

    if (sku.target_age_group) {
        const mappedAgeGroups = AUDIENCE_TO_AGE_GROUP[selectedAudience];
        if (mappedAgeGroups?.includes(sku.target_age_group)) return true;
    }
    return false;
}

function matchesColor(sku: DimSku, selectedColor: string | 'all') {
    if (selectedColor === 'all') return true;
    return sku.color === selectedColor || sku.color_family === selectedColor;
}

function resolveDashboardSaleYear(record: Pick<FactSalesRecord, 'sale_year' | 'season_year'>) {
    const rawYear = record.sale_year ?? record.season_year;
    if (rawYear === null || rawYear === undefined || rawYear === '') return null;
    return String(rawYear);
}

function resolveDashboardSaleWave(record: Pick<FactSalesRecord, 'sale_wave' | 'wave'>) {
    return record.sale_wave || record.wave || null;
}

function resolveDashboardSelectedYear(selectedYear: number | 'all') {
    if (selectedYear === 'all') return Number(dimPlan.season_year || 2025);
    const normalized = Number(selectedYear);
    return Number.isFinite(normalized) ? normalized : Number(dimPlan.season_year || 2025);
}

function matchesDashboardYearFilter(selectedYear: number | 'all', record: Pick<FactSalesRecord, 'sale_year' | 'season_year'>) {
    if (selectedYear === 'all') return true;
    return resolveDashboardSaleYear(record) === String(selectedYear);
}

function matchesDashboardTimeFilters(
    filters: Pick<DashboardFilters, 'season_year' | 'season' | 'wave'>,
    record: Pick<FactSalesRecord, 'sale_year' | 'season_year' | 'sale_wave' | 'wave' | 'sales_season' | 'season'>,
) {
    const saleWave = resolveDashboardSaleWave(record);
    if (!matchesDashboardYearFilter(filters.season_year, record)) return false;
    if (!matchesDashboardSeasonFilter(filters.season, saleWave, record.sales_season || record.season || undefined)) return false;
    if (filters.wave !== 'all' && saleWave !== filters.wave) return false;
    return true;
}

type DashboardSkuCategoryScope = {
    brand_name?: string | null;
    gender?: string | null;
    category_name?: string;
    category_id?: string;
    sku_name?: string;
    category_l2?: string;
    product_line?: string;
};

export function matchesDashboardSkuCategoryFilters(
    filters: Pick<DashboardFilters, 'brand' | 'category_l1' | 'category_id' | 'sub_category'>,
    sku: DashboardSkuCategoryScope,
) {
    if (!matchesDashboardBrand(filters.brand, sku.brand_name)) return false;
    if (!matchesDashboardCategoryL1(filters.category_l1, sku.gender)) return false;
    if (!matchCategoryL1(filters.category_id, sku.category_name, sku.category_id, sku.sku_name, sku.category_l2, sku.product_line)) return false;
    if (!matchCategoryL2(filters.sub_category, sku.category_name, sku.category_id, sku.sku_name, sku.category_l2, sku.product_line)) return false;
    return true;
}

function resolveSkuLifecycle(filters: DashboardFilters, sku: DimSku) {
    return resolveDashboardLifecycleLabel(filters, {
        season_year: sku.dev_season_year ?? sku.season_year,
        season: sku.dev_season ?? sku.season,
        lifecycle: sku.lifecycle,
    });
}

function matchesDashboardNonTimeFilters(filters: DashboardFilters, sku: DimSku, channel: DimChannel) {
    if (!matchesDashboardSkuCategoryFilters(filters, sku)) return false;
    if (filters.channel_type !== 'all' && channel.channel_type !== filters.channel_type) return false;
    if (filters.lifecycle !== 'all' && resolveSkuLifecycle(filters, sku) !== filters.lifecycle) return false;
    if (filters.region !== 'all' && channel.region !== filters.region) return false;
    if (filters.city_tier !== 'all' && channel.city_tier !== filters.city_tier) return false;
    if (filters.store_format !== 'all' && channel.store_format !== filters.store_format) return false;
    if (!matchesTargetAudience(sku, filters.target_audience)) return false;
    if (!matchesColor(sku, filters.color)) return false;
    if (!matchesPriceBandFilter(sku.msrp, filters.price_band, sku.price_band)) return false;
    return true;
}

function buildDashboardMonthlySales(records: Array<Pick<FactSalesRecord, 'sale_wave' | 'wave' | 'net_sales_amt'>>) {
    const monthly = Array.from({ length: 12 }, () => 0);
    records.forEach((record) => {
        const month = getDashboardMonthByWave(resolveDashboardSaleWave(record));
        if (month) monthly[month - 1] += Number(record.net_sales_amt || 0);
    });
    return monthly;
}

function resolveBaselineSelection(
    compareMode: CompareMode,
    filters: DashboardFilters,
    compareContext: DashboardCompareContext,
): { year: number; season: string | 'all'; wave: string | 'all' } | null {
    if (compareMode === 'none' || compareMode === 'plan') return null;

    const selectedYear = resolveDashboardSelectedYear(filters.season_year);
    if (compareMode === 'yoy') {
        return {
            year: selectedYear - 1,
            season: filters.season,
            wave: filters.wave,
        };
    }

    const baseline = resolveDashboardMomBaseline(filters, selectedYear, compareContext);
    if (!baseline) return null;
    return {
        year: baseline.year,
        season: baseline.season,
        wave: baseline.wave,
    };
}

export function useDashboardFilter(compareMode: CompareMode = 'none', compareContext: DashboardCompareContext = 'overview') {
    const [filters, setFilters] = useState<DashboardFilters>(() => getDefaultDashboardFilters());

    const skuMap = useMemo(() => {
        const map: Record<string, DimSku> = {};
        dimSku.forEach((sku) => {
            map[sku.sku_id] = sku;
        });
        return map;
    }, []);

    const channelMap = useMemo(() => {
        const map: Record<string, DimChannel> = {};
        dimChannel.forEach((channel) => {
            map[channel.channel_id] = channel;
        });
        return map;
    }, []);

    const filteredRecords = useMemo(() => {
        return factSales.filter((record) => {
            const sku = skuMap[record.sku_id];
            const channel = channelMap[record.channel_id];
            if (!sku || !channel) return false;
            if (!matchesDashboardTimeFilters(filters, record)) return false;
            return matchesDashboardNonTimeFilters(filters, sku, channel);
        });
    }, [filters, skuMap, channelMap]);

    const transitionRecords = useMemo(() => {
        return factSales.filter((record) => {
            const sku = skuMap[record.sku_id];
            const channel = channelMap[record.channel_id];
            if (!sku || !channel) return false;
            if (!matchesDashboardYearFilter(filters.season_year, record)) return false;
            return matchesDashboardNonTimeFilters(filters, sku, channel);
        });
    }, [filters, skuMap, channelMap]);

    const compareMeta = useMemo(
        () => getDashboardCompareMeta(compareMode, filters, compareContext),
        [compareContext, compareMode, filters],
    );

    const kpis = useMemo(() => {
        if (filteredRecords.length === 0) return null;

        const totalNetSales = filteredRecords.reduce((sum, record) => sum + Number(record.net_sales_amt || 0), 0);
        const totalGrossSales = filteredRecords.reduce((sum, record) => sum + Number(record.gross_sales_amt || 0), 0);
        const totalUnits = filteredRecords.reduce((sum, record) => sum + Number(record.unit_sold || 0), 0);
        const totalGrossProfit = filteredRecords.reduce((sum, record) => sum + Number(record.gross_profit_amt || 0), 0);
        const totalDiscountAmt = filteredRecords.reduce((sum, record) => sum + Number(record.discount_amt || 0), 0);

        const skuLatestST: Record<string, number> = {};
        filteredRecords.forEach((record) => {
            const weekKey = `${record.sku_id}_week`;
            if (!skuLatestST[record.sku_id] || record.week_num > (skuLatestST[weekKey] ?? 0)) {
                skuLatestST[record.sku_id] = record.cumulative_sell_through;
                skuLatestST[weekKey] = record.week_num;
            }
        });
        const skuIds = Object.keys(skuLatestST).filter((key) => !key.endsWith('_week'));
        const avgSellThrough = skuIds.length > 0
            ? skuIds.reduce((sum, skuId) => sum + skuLatestST[skuId], 0) / skuIds.length
            : 0;

        const avgMarginRate = totalNetSales > 0 ? totalGrossProfit / totalNetSales : 0;
        const avgDiscountRate = totalGrossSales > 0 ? totalNetSales / totalGrossSales : 0;
        const avgDiscountDepth = totalGrossSales > 0 ? totalDiscountAmt / totalGrossSales : 0;
        const activeSKUs = new Set(filteredRecords.map((record) => record.sku_id)).size;

        const channelSales: Record<string, number> = {};
        filteredRecords.forEach((record) => {
            const channel = channelMap[record.channel_id];
            if (!channel) return;
            channelSales[channel.channel_type] = (channelSales[channel.channel_type] || 0) + Number(record.net_sales_amt || 0);
        });

        const priceBandSales: Record<string, { units: number; sales: number; grossProfit: number; onHandUnits: number }> = {};
        filteredRecords.forEach((record) => {
            const sku = skuMap[record.sku_id];
            if (!sku) return;
            const bandId = resolvePriceBandByMsrp(sku.msrp);
            if (bandId === 'PBX') return;
            if (!priceBandSales[bandId]) {
                priceBandSales[bandId] = { units: 0, sales: 0, grossProfit: 0, onHandUnits: 0 };
            }
            priceBandSales[bandId].units += Number(record.unit_sold || 0);
            priceBandSales[bandId].sales += Number(record.net_sales_amt || 0);
            priceBandSales[bandId].grossProfit += Number(record.gross_profit_amt || 0);
            priceBandSales[bandId].onHandUnits = Math.max(priceBandSales[bandId].onHandUnits, Number(record.on_hand_unit || 0));
        });

        const heatmapData: Record<string, { skus: Set<string>; sales: number; st: number }> = {};
        const categories = FOOTWEAR_CATEGORY_CORE_ORDER;
        const bands = PRICE_BANDS.map((band) => band.id);
        categories.forEach((category) => {
            bands.forEach((bandId) => {
                heatmapData[`${category}_${bandId}`] = { skus: new Set(), sales: 0, st: 0 };
            });
        });

        filteredRecords.forEach((record) => {
            const sku = skuMap[record.sku_id];
            if (!sku) return;
            const bandId = resolvePriceBandByMsrp(sku.msrp);
            if (bandId === 'PBX') return;
            const { categoryL1 } = resolveFootwearCategory(
                sku.category_name,
                sku.category_id,
                sku.sku_name,
                sku.category_l2,
                sku.product_line,
            );
            const key = `${categoryL1}_${bandId}`;
            if (!heatmapData[key]) return;
            heatmapData[key].skus.add(sku.sku_id);
            heatmapData[key].sales += Number(record.net_sales_amt || 0);
        });

        Object.keys(heatmapData).forEach((key) => {
            const scopedSkuIds = Array.from(heatmapData[key].skus);
            if (scopedSkuIds.length === 0) return;
            const stSum = scopedSkuIds.reduce((sum, skuId) => sum + (skuLatestST[skuId] || 0), 0);
            heatmapData[key].st = stSum / scopedSkuIds.length;
        });

        const heatmapChartData = {
            skuCounts: [] as [number, number, number][],
            sales: [] as [number, number, number][],
            sellThrough: [] as [number, number, number][],
        };
        categories.forEach((category, yIndex) => {
            bands.forEach((bandId, xIndex) => {
                const key = `${category}_${bandId}`;
                const data = heatmapData[key];
                heatmapChartData.skuCounts.push([xIndex, yIndex, data.skus.size]);
                heatmapChartData.sales.push([xIndex, yIndex, Math.round(data.sales / 10000)]);
                heatmapChartData.sellThrough.push([xIndex, yIndex, Math.round(data.st * 100)]);
            });
        });

        const weeklyData: Record<number, { units: number; sales: number; st: number; marginRate: number }> = {};
        filteredRecords.forEach((record) => {
            if (!weeklyData[record.week_num]) {
                weeklyData[record.week_num] = { units: 0, sales: 0, st: 0, marginRate: 0 };
            }
            weeklyData[record.week_num].units += Number(record.unit_sold || 0);
            weeklyData[record.week_num].sales += Number(record.net_sales_amt || 0);
        });
        Object.keys(weeklyData).forEach((rawWeek) => {
            const week = Number(rawWeek);
            const weekRecords = filteredRecords.filter((record) => record.week_num === week);
            const stValues = weekRecords.map((record) => Number(record.cumulative_sell_through || 0));
            weeklyData[week].st = stValues.length > 0 ? stValues.reduce((sum, value) => sum + value, 0) / stValues.length : 0;
            const weekSales = weekRecords.reduce((sum, record) => sum + Number(record.net_sales_amt || 0), 0);
            const weekProfit = weekRecords.reduce((sum, record) => sum + Number(record.gross_profit_amt || 0), 0);
            weeklyData[week].marginRate = weekSales > 0 ? weekProfit / weekSales : 0;
        });

        const cohortData: Record<number, { st: number; skuCount: number }> = {};
        const skuLaunchWeek: Record<string, number> = {};
        const seasonBase: Record<string, string> = {
            Q1: '2024-02-01',
            Q2: '2024-05-01',
            Q3: '2024-08-01',
            Q4: '2024-11-01',
        };
        Object.values(skuMap).forEach((sku) => {
            if (!sku.launch_date) return;
            const launch = new Date(sku.launch_date);
            const anchor = new Date(seasonBase[String(sku.dev_season ?? sku.season ?? 'Q1')] || '2024-02-01');
            const diffDays = Math.floor((launch.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
            skuLaunchWeek[sku.sku_id] = Math.max(1, Math.floor(diffDays / 7) + 1);
        });
        filteredRecords.forEach((record) => {
            const launchWeek = skuLaunchWeek[record.sku_id] || 1;
            const weeksSinceLaunch = record.week_num - launchWeek + 1;
            if (weeksSinceLaunch > 0 && !cohortData[weeksSinceLaunch]) {
                cohortData[weeksSinceLaunch] = { st: 0, skuCount: 0 };
            }
        });
        Object.keys(cohortData).forEach((rawWeekAge) => {
            const weekAge = Number(rawWeekAge);
            const records = filteredRecords.filter((record) => {
                const launchWeek = skuLaunchWeek[record.sku_id] || 1;
                return record.week_num - launchWeek + 1 === weekAge;
            });
            const stValues = records.map((record) => Number(record.cumulative_sell_through || 0));
            cohortData[weekAge].st = stValues.length > 0 ? stValues.reduce((sum, value) => sum + value, 0) / stValues.length : 0;
            cohortData[weekAge].skuCount = new Set(records.map((record) => record.sku_id)).size;
        });

        const activeData: Record<number, { st: number; skuCount: number }> = {};
        Object.keys(weeklyData).forEach((rawWeek) => {
            const week = Number(rawWeek);
            const weekRecords = filteredRecords.filter((record) => record.week_num === week);
            const stValues = weekRecords.map((record) => Number(record.cumulative_sell_through || 0));
            activeData[week] = {
                st: stValues.length > 0 ? stValues.reduce((sum, value) => sum + value, 0) / stValues.length : 0,
                skuCount: new Set(weekRecords.map((record) => record.sku_id)).size,
            };
        });

        const stageData: Record<number, { st: number; skuCount: number }> = {};
        Object.keys(weeklyData).forEach((rawWeek) => {
            const week = Number(rawWeek);
            const weekRecords = filteredRecords.filter((record) => record.week_num === week);
            const newSkuRecords = weekRecords.filter((record) => {
                const sku = skuMap[record.sku_id];
                return sku ? resolveSkuLifecycle(filters, sku) === '新品' : false;
            });
            const stValues = newSkuRecords.map((record) => Number(record.cumulative_sell_through || 0));
            stageData[week] = {
                st: stValues.length > 0 ? stValues.reduce((sum, value) => sum + value, 0) / stValues.length : 0,
                skuCount: new Set(newSkuRecords.map((record) => record.sku_id)).size,
            };
        });

        const skuSales: Record<string, number> = {};
        filteredRecords.forEach((record) => {
            skuSales[record.sku_id] = (skuSales[record.sku_id] || 0) + Number(record.net_sales_amt || 0);
        });
        const sortedSkus = Object.entries(skuSales).sort((left, right) => right[1] - left[1]);
        const top10Sales = sortedSkus.slice(0, 10).reduce((sum, [, sales]) => sum + sales, 0);
        const top10Concentration = totalNetSales > 0 ? top10Sales / totalNetSales : 0;

        const skuAggMap: Record<string, { price: number; sellThrough: number; units: number; name: string; lifecycle: string }> = {};
        filteredRecords.forEach((record) => {
            const sku = skuMap[record.sku_id];
            if (!sku) return;
            if (!skuAggMap[record.sku_id]) {
                skuAggMap[record.sku_id] = {
                    price: Number(sku.msrp || 0),
                    sellThrough: 0,
                    units: 0,
                    name: sku.sku_name,
                    lifecycle: resolveSkuLifecycle(filters, sku),
                };
            }
            skuAggMap[record.sku_id].units += Number(record.unit_sold || 0);
        });
        filteredRecords.forEach((record) => {
            const aggregate = skuAggMap[record.sku_id];
            if (!aggregate) return;
            if (Number(record.cumulative_sell_through || 0) > aggregate.sellThrough) {
                aggregate.sellThrough = Number(record.cumulative_sell_through || 0);
            }
        });
        const allSkuPoints = Object.values(skuAggMap);
        const totalSkuCount = allSkuPoints.length;
        const atRiskSkus = allSkuPoints.filter(
            (sku) => sku.sellThrough < 0.7 || sku.sellThrough > 0.92 || (sku.price >= 600 && sku.sellThrough < 0.75),
        );
        let scatterSkus = atRiskSkus;
        if (scatterSkus.length < 20) {
            const sortedBySellThrough = [...allSkuPoints].sort((left, right) => left.sellThrough - right.sellThrough);
            scatterSkus = sortedBySellThrough.slice(0, Math.min(60, sortedBySellThrough.length));
        }
        scatterSkus = scatterSkus.slice(0, 80);

        const skuLatestInventory: Record<string, { units: number; msrp: number; week: number }> = {};
        filteredRecords.forEach((record) => {
            const sku = skuMap[record.sku_id];
            if (!sku) return;
            const current = skuLatestInventory[record.sku_id];
            if (!current || record.week_num > current.week) {
                skuLatestInventory[record.sku_id] = {
                    units: Number(record.on_hand_unit || 0),
                    msrp: Number(sku.msrp || 0),
                    week: record.week_num,
                };
            }
        });
        const totalOnHandUnits = Object.values(skuLatestInventory).reduce((sum, item) => sum + item.units, 0);
        const totalOnHandAmt = Object.values(skuLatestInventory).reduce((sum, item) => sum + item.units * item.msrp * 0.6, 0);
        // WOS 使用近 4 周滚动均值，避免季初数据拉低 avgWeekly
        const sortedWeeks = Object.keys(weeklyData).map(Number).sort((a, b) => b - a);
        const rolling4Weeks = sortedWeeks.slice(0, 4);
        const rolling4Units = rolling4Weeks.length > 0
            ? rolling4Weeks.reduce((sum, w) => sum + (weeklyData[w]?.units ?? 0), 0) / rolling4Weeks.length
            : totalUnits / (Object.keys(weeklyData).length || 1);
        const wos = rolling4Units > 0 ? Math.round((totalOnHandUnits / rolling4Units) * 10) / 10 : 0;
        const dos = wos * 7;

        const categoryActual: Record<string, { actual_sales: number; actual_units: number; actual_sell_through: number; actual_margin_rate: number; sku_count: number }> = {};
        filteredRecords.forEach((record) => {
            const sku = skuMap[record.sku_id];
            if (!sku) return;
            const { categoryL1 } = resolveFootwearCategory(
                sku.category_name,
                sku.category_id,
                sku.sku_name,
                sku.category_l2,
                sku.product_line,
            );
            if (!categoryActual[categoryL1]) {
                categoryActual[categoryL1] = { actual_sales: 0, actual_units: 0, actual_sell_through: 0, actual_margin_rate: 0, sku_count: 0 };
            }
            categoryActual[categoryL1].actual_sales += Number(record.net_sales_amt || 0);
            categoryActual[categoryL1].actual_units += Number(record.unit_sold || 0);
        });
        Object.keys(categoryActual).forEach((category) => {
            const categoryRecords = filteredRecords.filter((record) => {
                const sku = skuMap[record.sku_id];
                if (!sku) return false;
                const { categoryL1 } = resolveFootwearCategory(
                    sku.category_name,
                    sku.category_id,
                    sku.sku_name,
                    sku.category_l2,
                    sku.product_line,
                );
                return categoryL1 === category;
            });
            const categorySkuIds = [...new Set(categoryRecords.map((record) => record.sku_id))];
            const latestSTs = categorySkuIds.map((skuId) => skuLatestST[skuId] || 0);
            categoryActual[category].actual_sell_through = latestSTs.length > 0
                ? latestSTs.reduce((sum, value) => sum + value, 0) / latestSTs.length
                : 0;
            const categorySales = categoryRecords.reduce((sum, record) => sum + Number(record.net_sales_amt || 0), 0);
            const categoryProfit = categoryRecords.reduce((sum, record) => sum + Number(record.gross_profit_amt || 0), 0);
            categoryActual[category].actual_margin_rate = categorySales > 0 ? categoryProfit / categorySales : 0;
            categoryActual[category].sku_count = categorySkuIds.length;
        });

        const channelActual: Record<string, { actual_sales: number; actual_sell_through: number; actual_margin_rate: number }> = {};
        filteredRecords.forEach((record) => {
            const channel = channelMap[record.channel_id];
            if (!channel) return;
            if (!channelActual[channel.channel_type]) {
                channelActual[channel.channel_type] = { actual_sales: 0, actual_sell_through: 0, actual_margin_rate: 0 };
            }
            channelActual[channel.channel_type].actual_sales += Number(record.net_sales_amt || 0);
        });
        Object.keys(channelActual).forEach((channelType) => {
            const channelRecords = filteredRecords.filter((record) => channelMap[record.channel_id]?.channel_type === channelType);
            const channelSkuIds = [...new Set(channelRecords.map((record) => record.sku_id))];
            const latestSTs = channelSkuIds.map((skuId) => skuLatestST[skuId] || 0);
            channelActual[channelType].actual_sell_through = latestSTs.length > 0
                ? latestSTs.reduce((sum, value) => sum + value, 0) / latestSTs.length
                : 0;
            const channelSalesTotal = channelRecords.reduce((sum, record) => sum + Number(record.net_sales_amt || 0), 0);
            const channelProfitTotal = channelRecords.reduce((sum, record) => sum + Number(record.gross_profit_amt || 0), 0);
            channelActual[channelType].actual_margin_rate = channelSalesTotal > 0 ? channelProfitTotal / channelSalesTotal : 0;
        });

        const selectedYear = resolveDashboardSelectedYear(filters.season_year);
        const monthlyPlanSource = (dimPlan.monthly_plan || [])
            .slice()
            .sort((left, right) => Number(left.month || 0) - Number(right.month || 0))
            .map((row) => Number(row.plan_sales_amt || 0));
        const annualPlanTotal = deriveDashboardAnnualPlanTotal(monthlyPlanSource, Number(dimPlan.overall_plan?.plan_total_sales || 0));
        const annualScopedRecords = factSales.filter((record) => {
            const sku = skuMap[record.sku_id];
            const channel = channelMap[record.channel_id];
            if (!sku || !channel) return false;
            if (!matchesDashboardYearFilter(selectedYear, record)) return false;
            return matchesDashboardNonTimeFilters(filters, sku, channel);
        });
        const previousYearScopedRecords = factSales.filter((record) => {
            const sku = skuMap[record.sku_id];
            const channel = channelMap[record.channel_id];
            if (!sku || !channel) return false;
            if (!matchesDashboardYearFilter(selectedYear - 1, record)) return false;
            return matchesDashboardNonTimeFilters(filters, sku, channel);
        });
        const overallAnnualActualTotal = factSales.reduce((sum, record) => {
            if (!matchesDashboardYearFilter(selectedYear, record)) return sum;
            return sum + Number(record.net_sales_amt || 0);
        }, 0);
        const scopedAnnualActualTotal = annualScopedRecords.reduce((sum, record) => sum + Number(record.net_sales_amt || 0), 0);
        const scopedAnnualPlanTotal = deriveScopedAnnualPlanTotal(annualPlanTotal, scopedAnnualActualTotal, overallAnnualActualTotal);
        const planBreakdown = deriveDashboardMonthlyPlanBreakdown({
            annualPlanTotal: scopedAnnualPlanTotal,
            monthlyPlanSource,
            currentYearMonthlyActuals: buildDashboardMonthlySales(annualScopedRecords),
            previousYearMonthlyActuals: buildDashboardMonthlySales(previousYearScopedRecords),
            season: filters.season,
            wave: filters.wave,
        });
        const periodRatio = scopedAnnualPlanTotal > 0 ? planBreakdown.periodPlanTotal / scopedAnnualPlanTotal : 0;

        return {
            totalNetSales,
            totalGrossSales,
            totalUnits,
            totalGrossProfit,
            avgSellThrough,
            avgMarginRate,
            avgDiscountRate,
            avgDiscountDepth,
            activeSKUs,
            channelSales,
            priceBandSales,
            heatmapChartData,
            weeklyData,
            cohortData,
            activeData,
            stageData,
            top10Concentration,
            scatterSkus,
            totalSkuCount,
            totalOnHandUnits,
            totalOnHandAmt,
            wos,
            dos,
            categoryActual,
            channelActual,
            planData: {
                ...dimPlan,
                category_plan: dimPlan.category_plan.map((row) => ({
                    ...row,
                    plan_sales_amt: Number(row.plan_sales_amt || 0) * periodRatio,
                    plan_units: Math.round(Number(row.plan_units || 0) * periodRatio),
                    plan_sku_count: Math.round(Number(row.plan_sku_count || 0) * Math.max(periodRatio, 0.35)),
                })),
                channel_plan: dimPlan.channel_plan.map((row) => ({
                    ...row,
                    plan_sales_amt: Number(row.plan_sales_amt || 0) * periodRatio,
                })),
                monthly_plan: planBreakdown.monthlyPlan.map((plan_sales_amt, index) => ({ month: index + 1, plan_sales_amt })),
                overall_plan: {
                    ...dimPlan.overall_plan,
                    plan_total_sales: planBreakdown.periodPlanTotal,
                    plan_total_units: Math.round(Number(dimPlan.overall_plan?.plan_total_units || 0) * periodRatio),
                    plan_active_skus: Math.round(Number(dimPlan.overall_plan?.plan_active_skus || 0) * Math.max(periodRatio, 0.35)),
                    plan_ending_inventory_units: Math.round(Number(dimPlan.overall_plan?.plan_ending_inventory_units || 0) * periodRatio),
                    plan_ending_inventory_amt: Number(dimPlan.overall_plan?.plan_ending_inventory_amt || 0) * periodRatio,
                },
            },
            sortedSkus: sortedSkus.slice(0, 10).map(([skuId, sales]) => ({
                sku: skuMap[skuId],
                sales,
                pct: totalNetSales > 0 ? sales / totalNetSales : 0,
            })),
        };
    }, [filteredRecords, filters, skuMap, channelMap]);

    const baselineSelection = useMemo(
        () => resolveBaselineSelection(compareMode, filters, compareContext),
        [compareContext, compareMode, filters],
    );

    const baselineRecords = useMemo(() => {
        if (!baselineSelection) return [];
        return factSales.filter((record) => {
            const sku = skuMap[record.sku_id];
            const channel = channelMap[record.channel_id];
            if (!sku || !channel) return false;

            const baselineWaveKey = resolveDashboardSaleWave(record);
            if (!matchesDashboardYearFilter(baselineSelection.year, record)) return false;
            if (!matchesDashboardSeasonFilter(baselineSelection.season, baselineWaveKey, record.sales_season || record.season || undefined)) return false;
            if (baselineSelection.wave !== 'all' && baselineWaveKey !== baselineSelection.wave) return false;

            return matchesDashboardNonTimeFilters(filters, sku, channel);
        });
    }, [baselineSelection, channelMap, filters, skuMap]);

    const baselineKpis = useMemo(() => {
        if (baselineRecords.length === 0) return null;

        const totalNetSales = baselineRecords.reduce((sum, record) => sum + Number(record.net_sales_amt || 0), 0);
        const totalGrossSales = baselineRecords.reduce((sum, record) => sum + Number(record.gross_sales_amt || 0), 0);
        const totalUnits = baselineRecords.reduce((sum, record) => sum + Number(record.unit_sold || 0), 0);
        const totalGrossProfit = baselineRecords.reduce((sum, record) => sum + Number(record.gross_profit_amt || 0), 0);
        const totalDiscountAmt = baselineRecords.reduce((sum, record) => sum + Number(record.discount_amt || 0), 0);
        const skuLatestST: Record<string, number> = {};
        baselineRecords.forEach((record) => {
            const weekKey = `${record.sku_id}_week`;
            if (!skuLatestST[record.sku_id] || record.week_num > (skuLatestST[weekKey] ?? 0)) {
                skuLatestST[record.sku_id] = record.cumulative_sell_through;
                skuLatestST[weekKey] = record.week_num;
            }
        });
        const skuIds = Object.keys(skuLatestST).filter((key) => !key.endsWith('_week'));
        const avgSellThrough = skuIds.length > 0
            ? skuIds.reduce((sum, skuId) => sum + skuLatestST[skuId], 0) / skuIds.length
            : 0;

        const avgMarginRate = totalNetSales > 0 ? totalGrossProfit / totalNetSales : 0;
        const avgDiscountRate = totalGrossSales > 0 ? totalNetSales / totalGrossSales : 0;
        const avgDiscountDepth = totalGrossSales > 0 ? totalDiscountAmt / totalGrossSales : 0;
        const activeSKUs = new Set(baselineRecords.map((record) => record.sku_id)).size;

        const skuLatestInventory: Record<string, { units: number; msrp: number; week: number }> = {};
        baselineRecords.forEach((record) => {
            const sku = skuMap[record.sku_id];
            if (!sku) return;
            const current = skuLatestInventory[record.sku_id];
            if (!current || record.week_num > current.week) {
                skuLatestInventory[record.sku_id] = {
                    units: Number(record.on_hand_unit || 0),
                    msrp: Number(sku.msrp || 0),
                    week: record.week_num,
                };
            }
        });
        const totalOnHandUnits = Object.values(skuLatestInventory).reduce((sum, item) => sum + item.units, 0);
        // WOS 使用近 4 周滚动均值
        const baselineSortedWeeks = [...new Set(baselineRecords.map((record) => record.week_num))].sort((a, b) => b - a);
        const baseline4Weeks = baselineSortedWeeks.slice(0, 4);
        const baselineWeeklyUnits: Record<number, number> = {};
        baselineRecords.forEach((record) => { baselineWeeklyUnits[record.week_num] = (baselineWeeklyUnits[record.week_num] ?? 0) + Number(record.unit_sold || 0); });
        const avgWeeklyUnits = baseline4Weeks.length > 0
            ? baseline4Weeks.reduce((sum, w) => sum + (baselineWeeklyUnits[w] ?? 0), 0) / baseline4Weeks.length
            : totalUnits / (baselineSortedWeeks.length || 1);
        const wos = avgWeeklyUnits > 0 ? Math.round((totalOnHandUnits / avgWeeklyUnits) * 10) / 10 : 0;

        return {
            totalNetSales,
            totalGrossSales,
            totalUnits,
            totalGrossProfit,
            avgSellThrough,
            avgMarginRate,
            avgDiscountRate,
            avgDiscountDepth,
            activeSKUs,
            totalOnHandUnits,
            wos,
        };
    }, [baselineRecords, skuMap]);

    const filterSummary = useMemo(() => {
        const parts: string[] = [];
        if (filters.season_year !== 'all') parts.push(`${filters.season_year}年`);
        if (filters.season !== 'all') parts.push(`${filters.season}季`);
        if (filters.wave !== 'all') {
            const month = getDashboardMonthByWave(filters.wave);
            parts.push(month ? `${month}月` : filters.wave);
        }
        if (filters.brand !== 'all') parts.push(filters.brand);
        if (filters.category_l1 !== 'all') parts.push(filters.category_l1);
        if (filters.category_id !== 'all') parts.push(filters.category_id);
        if (filters.sub_category !== 'all') parts.push(filters.sub_category);
        if (filters.channel_type !== 'all') parts.push(filters.channel_type);
        if (filters.lifecycle !== 'all') parts.push(filters.lifecycle);
        if (filters.region !== 'all') parts.push(filters.region);
        if (filters.city_tier !== 'all') parts.push(filters.city_tier);
        if (filters.store_format !== 'all') parts.push(filters.store_format);
        if (filters.target_audience !== 'all') parts.push(filters.target_audience);
        if (filters.color !== 'all') parts.push(filters.color);
        if (filters.price_band !== 'all') parts.push(formatPriceBandLabel(filters.price_band));
        return parts.length > 0 ? parts.join(' · ') : '全部数据';
    }, [filters]);

    return {
        filters,
        setFilters,
        filteredRecords,
        transitionRecords,
        kpis,
        baselineKpis,
        filterSummary,
        compareMeta,
        skuMap,
        channelMap,
    };
}
