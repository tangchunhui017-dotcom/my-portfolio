'use client';

import { useMemo } from 'react';
import { useDimChannel, useDimSku, useFactSales } from '@/hooks/useDashboardData';
import {
    matchesDashboardSkuCategoryFilters,
    type DashboardFilters,
} from '@/hooks/useDashboardFilter';
import { resolveDashboardLifecycleLabel } from '@/config/dashboardLifecycle';
import { matchesDashboardSeasonFilter } from '@/config/dashboardTime';
import { matchesPriceBandFilter } from '@/config/priceBand';
import { useSizeHealthAnalysis } from '@/hooks/useSizeHealthAnalysis';

type ClearanceActionType = '整款清退' | '边缘码清退' | '降折观察' | '渠道调拨' | '补码优先';
type ClearanceTone = 'good' | 'warn' | 'risk';

interface FactSalesRecord {
    record_id?: string;
    sku_id: string;
    channel_id: string;
    season_year?: string | number;
    sale_year?: string | number;
    season?: string;
    sales_season?: string;
    wave?: string;
    sale_wave?: string;
    week_num: number;
    unit_sold: number;
    gross_sales_amt: number;
    net_sales_amt: number;
    discount_amt: number;
    gross_profit_amt: number;
    cumulative_sell_through: number;
    on_hand_unit: number;
}

interface DimSkuRecord {
    sku_id: string;
    sku_name: string;
    brand_name?: string;
    gender?: string;
    category_id?: string;
    category_name?: string;
    category_l2?: string;
    product_line?: string;
    season_year?: string | number;
    season?: string;
    dev_season_year?: string | number;
    dev_season?: string;
    price_band?: string;
    msrp?: number;
    lifecycle?: string;
    target_audience?: string;
    target_age_group?: string;
    color?: string;
    color_family?: string;
}

interface DimChannelRecord {
    channel_id: string;
    channel_type?: string;
    region?: string;
    city_tier?: string;
    store_format?: string;
}

interface SkuAgg {
    skuId: string;
    skuName: string;
    category: string;
    lifecycle: string;
    msrp: number;
    salesUnits: number;
    netSales: number;
    grossSales: number;
    discountAmt: number;
    grossProfit: number;
    onHandUnits: number;
    sellThrough: number;
    discountRate: number;
    marginRate: number;
    wos: number;
    avgWeeklyUnits: number;
    weekUnits: Map<number, number>;
    latestByChannel: Map<string, FactSalesRecord>;
}

export interface ClearanceKpiCard {
    id: string;
    label: string;
    value: string;
    detail: string;
    tone: ClearanceTone;
}

export interface ClearanceRiskRow {
    skuId: string;
    skuName: string;
    category: string;
    lifecycle: string;
    actionType: ClearanceActionType;
    priority: 'P0' | 'P1' | 'P2';
    onHandUnits: number;
    inventoryAmount: number;
    sellThrough: number;
    discountRate: number;
    marginRate: number;
    wos: number;
    clearanceScore: number;
    reason: string;
    action: string;
    sizeNote: string | null;
}

export interface ClearancePaceSummary {
    skuCount: number;
    clearanceSkuCount: number;
    clearanceInventoryUnits: number;
    clearanceInventoryAmount: number;
    clearanceCompletionRate: number;
    clearanceWos: number;
    oldStockShare: number;
    highDiscountIneffectiveCount: number;
    edgeClearanceCount: number;
    markdownWatchCount: number;
    keepReplenishmentCount: number;
    kpiCards: ClearanceKpiCard[];
    riskRows: ClearanceRiskRow[];
    actionMix: Array<{ type: ClearanceActionType; count: number; units: number }>;
    conclusion: string;
}

function safeDiv(numerator: number, denominator: number) {
    return denominator <= 0 ? 0 : numerator / denominator;
}

function fmtPct(value: number, digits = 0) {
    return `${(value * 100).toFixed(digits)}%`;
}

function fmtUnits(value: number) {
    return `${Math.round(value).toLocaleString('zh-CN')} 双`;
}

function fmtMoneyWan(value: number) {
    return `¥${(value / 10000).toFixed(1)}万`;
}

function getRiskTone(value: number, warn: number, risk: number): ClearanceTone {
    if (value >= risk) return 'risk';
    if (value >= warn) return 'warn';
    return 'good';
}

function getReverseTone(value: number, warn: number, risk: number): ClearanceTone {
    if (value <= risk) return 'risk';
    if (value <= warn) return 'warn';
    return 'good';
}

function resolveSaleYear(record: Pick<FactSalesRecord, 'sale_year' | 'season_year'>) {
    const raw = record.sale_year ?? record.season_year;
    return raw === undefined || raw === null || raw === '' ? null : String(raw);
}

function resolveSaleWave(record: Pick<FactSalesRecord, 'sale_wave' | 'wave'>) {
    return record.sale_wave || record.wave || null;
}

function getTimeOrder(record: Pick<FactSalesRecord, 'sale_year' | 'season_year' | 'sale_wave' | 'wave' | 'week_num'>) {
    const year = Number(resolveSaleYear(record) || 0);
    const wave = Number(String(resolveSaleWave(record) || '').replace(/^W/i, '')) || 0;
    const week = Number(record.week_num || 0);
    return year * 10000 + wave * 100 + week;
}

function matchesTimeFilters(filters: DashboardFilters, record: FactSalesRecord) {
    if (filters.season_year !== 'all' && resolveSaleYear(record) !== String(filters.season_year)) return false;
    if (!matchesDashboardSeasonFilter(filters.season, resolveSaleWave(record), record.sales_season || record.season)) return false;
    if (filters.wave !== 'all' && resolveSaleWave(record) !== filters.wave) return false;
    return true;
}

function matchesTargetAudience(sku: DimSkuRecord, selectedAudience: string | 'all') {
    if (selectedAudience === 'all') return true;
    return sku.target_audience === selectedAudience || sku.target_age_group === selectedAudience;
}

function matchesColor(sku: DimSkuRecord, selectedColor: string | 'all') {
    if (selectedColor === 'all') return true;
    return sku.color === selectedColor || sku.color_family === selectedColor;
}

function resolveLifecycle(filters: DashboardFilters, sku: DimSkuRecord) {
    return resolveDashboardLifecycleLabel(filters, {
        season_year: sku.dev_season_year ?? sku.season_year,
        season: sku.dev_season ?? sku.season,
        lifecycle: sku.lifecycle,
    });
}

function matchesNonTimeFilters(filters: DashboardFilters, sku: DimSkuRecord, channel: DimChannelRecord) {
    if (!matchesDashboardSkuCategoryFilters(filters, sku)) return false;
    if (filters.channel_type !== 'all' && channel.channel_type !== filters.channel_type) return false;
    if (filters.region !== 'all' && channel.region !== filters.region) return false;
    if (filters.city_tier !== 'all' && channel.city_tier !== filters.city_tier) return false;
    if (filters.store_format !== 'all' && channel.store_format !== filters.store_format) return false;
    if (!matchesTargetAudience(sku, filters.target_audience)) return false;
    if (!matchesColor(sku, filters.color)) return false;
    if (!matchesPriceBandFilter(Number(sku.msrp || 0), filters.price_band, sku.price_band)) return false;
    if (filters.lifecycle !== 'all' && resolveLifecycle(filters, sku) !== filters.lifecycle) return false;
    return true;
}

function buildPriority(score: number): 'P0' | 'P1' | 'P2' {
    if (score >= 90) return 'P0';
    if (score >= 55) return 'P1';
    return 'P2';
}

function resolveActionType(row: SkuAgg, sizeRisk?: { riskLabels: string[]; edgeStockShare: number; stockoutRate: number; fullSizeRate: number }) {
    const hasCoreStockout = Boolean(sizeRisk?.riskLabels.includes('核心尺码断码'));
    const edgeStockShare = sizeRisk?.edgeStockShare ?? 0;
    const oldLifecycle = row.lifecycle === '老品';
    const highDiscountIneffective = row.discountRate >= 0.2 && row.sellThrough < 0.65 && row.wos >= 8;
    const lowSellHighStock = row.sellThrough < 0.58 && row.wos >= 8 && row.onHandUnits >= 60;

    if (hasCoreStockout && edgeStockShare < 0.32 && row.wos < 8) return '补码优先';
    if (edgeStockShare >= 0.35 && row.onHandUnits >= 80) return '边缘码清退';
    if ((oldLifecycle && row.wos >= 8 && row.sellThrough < 0.78) || highDiscountIneffective) return '整款清退';
    if (lowSellHighStock && row.discountRate < 0.18) return '降折观察';
    if (row.wos >= 10 && row.sellThrough >= 0.65) return '渠道调拨';
    return null;
}

function buildReason(row: SkuAgg, actionType: ClearanceActionType, sizeNote: string | null) {
    if (actionType === '补码优先') return `${row.skuName} 有核心尺码缺口，但整款仍具备动销能力，不应直接清退。`;
    if (actionType === '边缘码清退') return `${row.skuName} 库存主要被边缘码占用，需清边缘码而非整款甩货。`;
    if (actionType === '整款清退') return `${row.lifecycle}，售罄 ${fmtPct(row.sellThrough)}，WOS ${row.wos.toFixed(1)} 周，折扣 ${fmtPct(row.discountRate)} 后仍去化偏慢。`;
    if (actionType === '降折观察') return `低售罄高库存但折扣尚未充分打开，可先做小幅降折测试。`;
    if (sizeNote) return sizeNote;
    return `库存 WOS ${row.wos.toFixed(1)} 周，建议优先做渠道调拨验证。`;
}

function buildAction(row: SkuAgg, actionType: ClearanceActionType, sizeNote: string | null) {
    if (actionType === '补码优先') return sizeNote || '优先补齐核心尺码，暂不进入清退池。';
    if (actionType === '边缘码清退') return '边缘码做组合清退或转低线渠道，核心码维持正常售卖。';
    if (actionType === '整款清退') return row.marginRate < 0.35 ? '停止继续无效降折，转清退或奥莱渠道。' : '进入清货池，建议加大折扣或组合促销。';
    if (actionType === '降折观察') return '先降折 5-10pp 观察两周，若动销无改善则转清退。';
    return '从低动销渠道调拨到高售罄渠道，避免过早清退。';
}

export function useClearancePace(filters: DashboardFilters) {
    const yearParam = filters.season_year !== 'all' ? String(filters.season_year) : undefined;
    const seasonParam = filters.season !== 'all' ? filters.season : undefined;
    const waveParam = filters.wave !== 'all' ? filters.wave : undefined;
    const salesResult = useFactSales(yearParam, seasonParam, waveParam);
    const skuResult = useDimSku();
    const channelResult = useDimChannel();
    const { summary: sizeSummary } = useSizeHealthAnalysis(filters);

    const summary = useMemo<ClearancePaceSummary | null>(() => {
        const sales = (salesResult.data ?? []) as FactSalesRecord[];
        const dimSku = (skuResult.data ?? []) as DimSkuRecord[];
        const dimChannel = (channelResult.data ?? []) as DimChannelRecord[];
        if (!sales.length || !dimSku.length || !dimChannel.length) return null;

        const skuMap = new Map(dimSku.map((sku) => [sku.sku_id, sku]));
        const channelMap = new Map(dimChannel.map((channel) => [channel.channel_id, channel]));
        const aggMap = new Map<string, SkuAgg>();

        sales.forEach((record) => {
            const sku = skuMap.get(record.sku_id);
            const channel = channelMap.get(record.channel_id);
            if (!sku || !channel) return;
            if (!matchesTimeFilters(filters, record)) return;
            if (!matchesNonTimeFilters(filters, sku, channel)) return;

            const lifecycle = resolveLifecycle(filters, sku);
            const bucket = aggMap.get(record.sku_id) || {
                skuId: record.sku_id,
                skuName: sku.sku_name || record.sku_id,
                category: sku.category_l2 || sku.category_name || sku.product_line || '未分类',
                lifecycle,
                msrp: Number(sku.msrp || 0),
                salesUnits: 0,
                netSales: 0,
                grossSales: 0,
                discountAmt: 0,
                grossProfit: 0,
                onHandUnits: 0,
                sellThrough: 0,
                discountRate: 0,
                marginRate: 0,
                wos: 99.9,
                avgWeeklyUnits: 0,
                weekUnits: new Map<number, number>(),
                latestByChannel: new Map<string, FactSalesRecord>(),
            };

            bucket.salesUnits += Number(record.unit_sold || 0);
            bucket.netSales += Number(record.net_sales_amt || 0);
            bucket.grossSales += Number(record.gross_sales_amt || 0);
            bucket.discountAmt += Number(record.discount_amt || 0);
            bucket.grossProfit += Number(record.gross_profit_amt || 0);
            bucket.weekUnits.set(record.week_num, (bucket.weekUnits.get(record.week_num) || 0) + Number(record.unit_sold || 0));

            const currentLatest = bucket.latestByChannel.get(record.channel_id);
            if (!currentLatest || getTimeOrder(record) >= getTimeOrder(currentLatest)) {
                bucket.latestByChannel.set(record.channel_id, record);
            }
            aggMap.set(record.sku_id, bucket);
        });

        const rows = Array.from(aggMap.values()).map((row) => {
            const latestRecords = Array.from(row.latestByChannel.values());
            const latestWeight = latestRecords.reduce((sum, record) => sum + Math.max(Number(record.unit_sold || 0) + Number(record.on_hand_unit || 0), 1), 0);
            row.onHandUnits = latestRecords.reduce((sum, record) => sum + Number(record.on_hand_unit || 0), 0);
            row.sellThrough = safeDiv(
                latestRecords.reduce((sum, record) => sum + Number(record.cumulative_sell_through || 0) * Math.max(Number(record.unit_sold || 0) + Number(record.on_hand_unit || 0), 1), 0),
                latestWeight,
            );
            row.discountRate = safeDiv(row.discountAmt, row.grossSales);
            row.marginRate = safeDiv(row.grossProfit, row.netSales);
            const latestWeeks = Array.from(row.weekUnits.keys()).sort((a, b) => b - a).slice(0, 4);
            row.avgWeeklyUnits = latestWeeks.length
                ? latestWeeks.reduce((sum, week) => sum + (row.weekUnits.get(week) || 0), 0) / latestWeeks.length
                : safeDiv(row.salesUnits, Math.max(row.weekUnits.size, 1));
            row.wos = row.avgWeeklyUnits > 0 ? row.onHandUnits / row.avgWeeklyUnits : 99.9;
            return row;
        });

        const sizeRiskMap = sizeSummary?.riskMap ?? {};
        const riskRows = rows.flatMap<ClearanceRiskRow>((row) => {
            const sizeRisk = sizeRiskMap[row.skuId];
            const actionType = resolveActionType(row, sizeRisk);
            if (!actionType) return [];

            const sizeNote = sizeRisk?.stockoutSizes?.length
                ? `缺码 ${sizeRisk.stockoutSizes.slice(0, 4).join('/')}，边缘码库存占比 ${fmtPct(sizeRisk.edgeStockShare)}`
                : sizeRisk?.riskLabels.includes('边缘码积压')
                    ? `边缘码库存占比 ${fmtPct(sizeRisk.edgeStockShare)}`
                    : null;
            const score =
                Math.max(0, row.wos - 6) * 5 +
                Math.max(0, 0.75 - row.sellThrough) * 70 +
                Math.max(0, row.discountRate - 0.15) * 80 +
                Math.max(0, 0.38 - row.marginRate) * 80 +
                (actionType === '整款清退' ? 25 : actionType === '边缘码清退' ? 18 : actionType === '补码优先' ? 10 : 12) +
                Math.min(row.onHandUnits / 300, 1) * 15;
            const inventoryAmount = row.onHandUnits * row.msrp * Math.max(0.45, 1 - row.discountRate);

            return [{
                skuId: row.skuId,
                skuName: row.skuName,
                category: row.category,
                lifecycle: row.lifecycle,
                actionType,
                priority: buildPriority(score),
                onHandUnits: row.onHandUnits,
                inventoryAmount,
                sellThrough: row.sellThrough,
                discountRate: row.discountRate,
                marginRate: row.marginRate,
                wos: row.wos,
                clearanceScore: score,
                reason: buildReason(row, actionType, sizeNote),
                action: buildAction(row, actionType, sizeNote),
                sizeNote,
            }];
        }).sort((a, b) => b.clearanceScore - a.clearanceScore || b.inventoryAmount - a.inventoryAmount);

        const clearanceRows = riskRows.filter((row) => row.actionType !== '补码优先');
        const clearanceInventoryUnits = clearanceRows.reduce((sum, row) => sum + row.onHandUnits, 0);
        const clearanceInventoryAmount = clearanceRows.reduce((sum, row) => sum + row.inventoryAmount, 0);
        const clearanceSoldUnits = clearanceRows.reduce((sum, row) => {
            const source = aggMap.get(row.skuId);
            return sum + (source?.salesUnits || 0);
        }, 0);
        const clearanceAvgWeeklyUnits = clearanceRows.reduce((sum, row) => {
            const source = aggMap.get(row.skuId);
            return sum + (source?.avgWeeklyUnits || 0);
        }, 0);
        const oldStockUnits = rows
            .filter((row) => row.lifecycle === '老品')
            .reduce((sum, row) => sum + row.onHandUnits, 0);
        const totalStockUnits = rows.reduce((sum, row) => sum + row.onHandUnits, 0);
        const clearanceCompletionRate = safeDiv(clearanceSoldUnits, clearanceSoldUnits + clearanceInventoryUnits);
        const clearanceWos = safeDiv(clearanceInventoryUnits, clearanceAvgWeeklyUnits);
        const oldStockShare = safeDiv(oldStockUnits, totalStockUnits);
        const highDiscountIneffectiveCount = riskRows.filter((row) => row.discountRate >= 0.2 && row.sellThrough < 0.65).length;
        const edgeClearanceCount = riskRows.filter((row) => row.actionType === '边缘码清退').length;
        const markdownWatchCount = riskRows.filter((row) => row.actionType === '降折观察').length;
        const keepReplenishmentCount = riskRows.filter((row) => row.actionType === '补码优先').length;

        const kpiCards: ClearanceKpiCard[] = [
            {
                id: 'clearance_inventory',
                label: '应清库存',
                value: fmtUnits(clearanceInventoryUnits),
                detail: `${fmtMoneyWan(clearanceInventoryAmount)} 占用`,
                tone: getRiskTone(clearanceWos, 7, 10),
            },
            {
                id: 'completion',
                label: '清货完成率',
                value: fmtPct(clearanceCompletionRate),
                detail: '低于 55% 说明清货节奏偏慢',
                tone: getReverseTone(clearanceCompletionRate, 0.62, 0.55),
            },
            {
                id: 'clearance_wos',
                label: '清货 WOS',
                value: `${clearanceWos.toFixed(1)} 周`,
                detail: '超过 10 周需要加速去化',
                tone: getRiskTone(clearanceWos, 7, 10),
            },
            {
                id: 'old_stock',
                label: '老品库存占比',
                value: fmtPct(oldStockShare),
                detail: `${edgeClearanceCount} 款为边缘码清退`,
                tone: getRiskTone(oldStockShare, 0.28, 0.38),
            },
        ];

        const mixMap = new Map<ClearanceActionType, { type: ClearanceActionType; count: number; units: number }>();
        riskRows.forEach((row) => {
            const bucket = mixMap.get(row.actionType) || { type: row.actionType, count: 0, units: 0 };
            bucket.count += 1;
            bucket.units += row.onHandUnits;
            mixMap.set(row.actionType, bucket);
        });
        const actionMix = Array.from(mixMap.values()).sort((a, b) => b.units - a.units);

        const topRisk = riskRows[0];
        const conclusion = topRisk
            ? `${topRisk.category}「${topRisk.skuName}」清货优先级最高，建议${topRisk.action}`
            : '当前筛选下暂无明显应清未清 SKU，清货节奏整体可控。';

        return {
            skuCount: rows.length,
            clearanceSkuCount: clearanceRows.length,
            clearanceInventoryUnits,
            clearanceInventoryAmount,
            clearanceCompletionRate,
            clearanceWos,
            oldStockShare,
            highDiscountIneffectiveCount,
            edgeClearanceCount,
            markdownWatchCount,
            keepReplenishmentCount,
            kpiCards,
            riskRows: riskRows.slice(0, 8),
            actionMix,
            conclusion,
        };
    }, [channelResult.data, filters, salesResult.data, sizeSummary?.riskMap, skuResult.data]);

    return {
        summary,
        isLoading: salesResult.isLoading || skuResult.isLoading || channelResult.isLoading,
        error: salesResult.error || skuResult.error || channelResult.error,
    };
}
