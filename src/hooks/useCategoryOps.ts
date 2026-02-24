'use client';

import { useMemo } from 'react';
import factSalesRaw from '@/../data/dashboard/fact_sales.json';
import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import dimChannelRaw from '@/../data/dashboard/dim_channel.json';
import dimPlanRaw from '@/../data/dashboard/dim_plan.json';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';

interface FactSalesRecord {
    sku_id: string;
    channel_id: string;
    season_year: string | number;
    season: string;
    wave: string;
    week_num: number;
    unit_sold: number;
    net_sales_amt: number;
    discount_rate?: number;
    gross_margin_rate: number;
    cumulative_sell_through: number;
    on_hand_unit: number;
}

interface DimSkuRecord {
    sku_id: string;
    sku_name?: string;
    category_id: string;
    category_name?: string;
    price_band?: string;
    msrp: number;
    lifecycle?: string;
    product_line?: string;
    target_age_group?: string;
    target_audience?: string;
    color?: string;
    color_family?: string;
}

interface DimChannelRecord {
    channel_id: string;
    channel_type: string;
    region: string;
    city_tier: string;
    store_format: string;
}

interface AggregateBucket {
    key: string;
    productLine: string;
    categoryId: string;
    category: string;
    priceBand: string;
    netSales: number;
    pairsSold: number;
    stWeighted: number;
    stWeight: number;
    gmWeighted: number;
    gmWeight: number;
    onHandUnits: number;
    skuSet: Set<string>;
    storeSet: Set<string>;
}

interface AggregationResult {
    categoryMap: Map<string, AggregateBucket>;
    cellMap: Map<string, AggregateBucket>;
    totalNetSales: number;
    totalPairs: number;
    activeSkuSet: Set<string>;
    activeStoreSet: Set<string>;
}

interface DimPlanCategoryRecord {
    category_id: string;
    plan_sales_amt: number;
    plan_units?: number;
    plan_sell_through?: number;
    plan_sku_count?: number;
}

interface DimPlanPriceBandRecord {
    price_band: string;
    plan_sales_amt: number;
    plan_sell_through?: number;
    plan_sku_count?: number;
}

interface DimPlanOverallRecord {
    plan_total_sales?: number;
    plan_total_units?: number;
    plan_avg_sell_through?: number;
    plan_active_skus?: number;
}

interface DimPlanRecord {
    season_year?: number;
    category_plan?: DimPlanCategoryRecord[];
    price_band_plan?: DimPlanPriceBandRecord[];
    overall_plan?: DimPlanOverallRecord;
}

export interface CategoryOpsSunburstNode {
    name: string;
    value: number;
    sellThrough: number;
    children?: CategoryOpsSunburstNode[];
}

export interface CategoryScatterPoint {
    id: string;
    categoryId: string;
    category: string;
    productLine: string;
    asp: number;
    salesPerSkc: number;
    netSales: number;
    sellThrough: number;
    fillRate: number;
    reorderRate: number;
    priceBandMix: string;
}

export interface CategoryHeatCell {
    id: string;
    categoryId: string;
    category: string;
    productLine: string;
    priceBand: string;
    elementLabel: string;
    netSales: number;
    pairsSold: number;
    skcCnt: number;
    asp: number;
    salesPerSkc: number;
    sellThrough: number;
    fillRate: number;
    reorderRate: number;
    fillGapPp: number;
    reorderGapPp: number;
    sellThroughGapPp: number;
    demandYoY: number;
    onHandUnits: number;
    burdenScore: number;
}

export interface CategoryOpsKpiCard {
    id: string;
    title: string;
    element: string;
    value: number;
    valueKind: 'percent' | 'pp';
    subValue: string;
    tone: 'good' | 'warn' | 'risk';
}

export interface CategoryOpsBizKpi {
    id: string;
    title: string;
    value: number;
    valueKind: 'amount' | 'pairs' | 'percent' | 'count';
    deltaValue: number | null;
    deltaKind: 'percent' | 'pp';
    description: string;
}

export interface CategoryOpsPlanBiasCard {
    id: string;
    title: string;
    actualLabel: string;
    planLabel: string;
    gapLabel: string;
    tone: 'good' | 'warn' | 'risk';
    note: string;
}

export interface CategoryOpsWaterfallPoint {
    id: string;
    categoryId: string;
    category: string;
    deltaNetSales: number;
    currentNetSales: number;
    baselineNetSales: number;
}

export interface CategoryOpsSkuActionRow {
    skuId: string;
    categoryId: string;
    category: string;
    skuName: string;
    priceBand: string;
    priceBandLabel: string;
    pairsSold: number;
    netSales: number;
    sellThrough: number;
    onHandUnits: number;
    discountRate: number;
    action: string;
    reason: string;
}

export interface CategoryOpsHeatPoint {
    id: string;
    xIndex: number;
    yIndex: number;
    value: number;
    metricKey: 'sell_through_gap' | 'fill_gap' | 'reorder_gap';
    metricLabel: string;
    rawValue: number;
    cell: CategoryHeatCell;
}

export interface CategoryOpsInsight {
    finding: string;
    cause: string;
    actions: string[];
    yoyConclusions: string[];
    storeConclusions: string[];
    categoryGroups: {
        cashflow: string[];
        potential: string[];
        warning: string[];
        research: string[];
    };
}

export interface CategoryOpsCompareMeta {
    mode: CompareMode;
    modeLabel: string;
    deltaLabel: string;
    baselineLabel: string;
    hasBaseline: boolean;
    note: string;
}

export interface CategoryOpsBaselineTotals {
    netSales: number;
    pairsSold: number;
    avgSellThrough: number;
    activeSku: number;
    storeCount: number;
}

const factSales = factSalesRaw as FactSalesRecord[];
const dimSku = dimSkuRaw as DimSkuRecord[];
const dimChannel = dimChannelRaw as DimChannelRecord[];
const dimPlan = dimPlanRaw as DimPlanRecord;

const PRICE_BAND_RANGE: Record<string, [number, number]> = {
    PB1: [199, 299],
    PB2: [300, 399],
    PB3: [400, 499],
    PB4: [500, 599],
    PB5: [600, 699],
    PB6: [700, 799],
    PB7: [800, 9999],
};

const PRICE_BAND_LABEL: Record<string, string> = {
    PB1: '¥199-299',
    PB2: '¥300-399',
    PB3: '¥400-499',
    PB4: '¥500-599',
    PB5: '¥600-699',
    PB6: '¥700-799',
    PB7: '¥800+',
    PBX: '未定义价带',
};

const AUDIENCE_TO_AGE_GROUP: Record<string, string[]> = {
    '18-23岁 GenZ': ['18-25'],
    '24-28岁 职场新人': ['26-35'],
    '29-35岁 资深中产': ['26-35'],
    '35岁以上': ['36-45', '46+'],
};

export type CategoryOpsHeatXAxis = 'element' | 'category' | 'price_band';

function safeDiv(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return numerator / denominator;
}

function formatWan(value: number) {
    if (!Number.isFinite(value)) return '—';
    return `${(value / 10_000).toFixed(1)}万`;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function parsePriceBandOrder(priceBand: string) {
    const matchedPb = priceBand.match(/PB\s*(\d+)/i);
    if (matchedPb) return Number(matchedPb[1]);
    const fallback = priceBand.match(/\d+/);
    return fallback ? Number(fallback[0]) : Number.MAX_SAFE_INTEGER;
}

function formatPriceBandLabel(priceBand: string) {
    const normalized = String(priceBand || '').toUpperCase().replace(/\s/g, '');
    return PRICE_BAND_LABEL[normalized] || priceBand || PRICE_BAND_LABEL.PBX;
}

function getCompareModeLabel(compareMode: CompareMode) {
    if (compareMode === 'plan') return 'vs计划';
    if (compareMode === 'yoy') return '同比去年';
    if (compareMode === 'mom') return '环比上季';
    return '无对比';
}

function getCompareDeltaLabel(compareMode: CompareMode) {
    if (compareMode === 'plan') return '较计划';
    if (compareMode === 'yoy') return '较去年同期';
    if (compareMode === 'mom') return '较上季';
    return '较基线';
}

function getHeatmapMetricLabels(compareMode: CompareMode, deltaLabel: string) {
    if (compareMode === 'none') {
        return ['售罄率偏离(pp)', '执行率偏离(pp)', '补单率偏离(pp)'] as const;
    }
    return [
        `售罄率${deltaLabel}(pp)`,
        `执行率${deltaLabel}(pp)`,
        `补单率${deltaLabel}(pp)`,
    ] as const;
}

function resolveMomBaseline(filters: DashboardFilters) {
    if (filters.season === 'all') return null;
    const matched = String(filters.season).toUpperCase().match(/^Q([1-4])$/);
    if (!matched) return null;
    const selectedYear = Number(filters.season_year);
    if (!Number.isFinite(selectedYear)) return null;

    const quarter = Number(matched[1]);
    if (quarter === 1) {
        return { year: selectedYear - 1, season: 'Q4' };
    }
    return { year: selectedYear, season: `Q${quarter - 1}` };
}

function normalizePlanPriceBand(priceBand: string) {
    const normalized = String(priceBand || '').replace(/\s/g, '');
    if (normalized.includes('199-299')) return 'PB1';
    if (normalized.includes('300-399')) return 'PB2';
    if (normalized.includes('400-499')) return 'PB3';
    if (normalized.includes('500-599')) return 'PB4';
    if (normalized.includes('600-699')) return 'PB5';
    if (normalized.includes('700')) return 'PB6';
    return normalized || 'PBX';
}

function getAggregationAvgSellThrough(aggregation: AggregationResult) {
    const cells = Array.from(aggregation.cellMap.values());
    const totalSales = cells.reduce((sum, bucket) => sum + bucket.netSales, 0);
    if (totalSales <= 0) return 0;
    return safeDiv(
        cells.reduce((sum, bucket) => sum + safeDiv(bucket.stWeighted, bucket.stWeight) * bucket.netSales, 0),
        totalSales,
    );
}

function matchesPriceBand(sku: DimSkuRecord, selectedPriceBand: string | 'all') {
    if (selectedPriceBand === 'all') return true;
    if (sku.price_band && sku.price_band === selectedPriceBand) return true;
    const range = PRICE_BAND_RANGE[selectedPriceBand];
    if (!range) return true;
    return sku.msrp >= range[0] && sku.msrp <= range[1];
}

function matchesTargetAudience(sku: DimSkuRecord, selectedAudience: string | 'all') {
    if (selectedAudience === 'all') return true;
    if (sku.target_audience === selectedAudience) return true;
    if (sku.target_age_group === selectedAudience) return true;
    if (!sku.target_age_group) return false;
    const mapped = AUDIENCE_TO_AGE_GROUP[selectedAudience];
    return Boolean(mapped?.includes(sku.target_age_group));
}

function matchesColor(sku: DimSkuRecord, selectedColor: string | 'all') {
    if (selectedColor === 'all') return true;
    return sku.color === selectedColor || sku.color_family === selectedColor;
}

function shouldIncludeRecord(
    sale: FactSalesRecord,
    sku: DimSkuRecord,
    channel: DimChannelRecord,
    filters: DashboardFilters,
    forcedYear: number | null,
    forcedSeason: string | null = null,
) {
    if (forcedYear !== null) {
        if (Number(sale.season_year) !== forcedYear) return false;
    } else if (filters.season_year !== 'all' && String(sale.season_year) !== String(filters.season_year)) {
        return false;
    }

    const seasonFilter = forcedSeason ?? filters.season;
    if (seasonFilter !== 'all' && sale.season !== seasonFilter) return false;
    if (filters.wave !== 'all' && sale.wave !== filters.wave) return false;
    if (filters.category_id !== 'all' && sku.category_id !== filters.category_id) return false;
    if (filters.channel_type !== 'all' && channel.channel_type !== filters.channel_type) return false;
    if (filters.lifecycle !== 'all' && sku.lifecycle !== filters.lifecycle) return false;
    if (filters.region !== 'all' && channel.region !== filters.region) return false;
    if (filters.city_tier !== 'all' && channel.city_tier !== filters.city_tier) return false;
    if (filters.store_format !== 'all' && channel.store_format !== filters.store_format) return false;
    if (!matchesTargetAudience(sku, filters.target_audience)) return false;
    if (!matchesColor(sku, filters.color)) return false;
    if (!matchesPriceBand(sku, filters.price_band)) return false;

    return true;
}

function createBucket(
    key: string,
    productLine: string,
    categoryId: string,
    category: string,
    priceBand: string,
): AggregateBucket {
    return {
        key,
        productLine,
        categoryId,
        category,
        priceBand,
        netSales: 0,
        pairsSold: 0,
        stWeighted: 0,
        stWeight: 0,
        gmWeighted: 0,
        gmWeight: 0,
        onHandUnits: 0,
        skuSet: new Set<string>(),
        storeSet: new Set<string>(),
    };
}

function aggregateSales(
    filters: DashboardFilters,
    skuMap: Map<string, DimSkuRecord>,
    channelMap: Map<string, DimChannelRecord>,
    forcedYear: number | null,
    forcedSeason: string | null = null,
): AggregationResult {
    const categoryMap = new Map<string, AggregateBucket>();
    const cellMap = new Map<string, AggregateBucket>();
    const activeSkuSet = new Set<string>();
    const activeStoreSet = new Set<string>();
    const latestInventoryBySkuChannel = new Map<string, {
        weekNum: number;
        onHandUnits: number;
        categoryKey: string;
        cellKey: string;
    }>();

    let totalNetSales = 0;
    let totalPairs = 0;

    factSales.forEach((sale) => {
        const sku = skuMap.get(sale.sku_id);
        const channel = channelMap.get(sale.channel_id);
        if (!sku || !channel) return;
        if (!shouldIncludeRecord(sale, sku, channel, filters, forcedYear, forcedSeason)) return;

        const categoryId = sku.category_id || 'unknown';
        const category = sku.category_name || sku.category_id || '未定义品类';
        const productLine = sku.product_line || '未定义产品线';
        const priceBand = sku.price_band || 'PBX';

        const categoryKey = `${productLine}__${categoryId}`;
        const cellKey = `${categoryId}__${priceBand}`;

        if (!categoryMap.has(categoryKey)) {
            categoryMap.set(categoryKey, createBucket(categoryKey, productLine, categoryId, category, 'ALL'));
        }
        if (!cellMap.has(cellKey)) {
            cellMap.set(cellKey, createBucket(cellKey, productLine, categoryId, category, priceBand));
        }

        const categoryBucket = categoryMap.get(categoryKey);
        const cellBucket = cellMap.get(cellKey);
        if (!categoryBucket || !cellBucket) return;

        const units = Math.max(0, sale.unit_sold || 0);
        const sales = Math.max(0, sale.net_sales_amt || 0);
        const stWeight = Math.max(units, 1);
        const gmWeight = Math.max(sales, 1);

        categoryBucket.netSales += sales;
        categoryBucket.pairsSold += units;
        categoryBucket.stWeighted += (sale.cumulative_sell_through || 0) * stWeight;
        categoryBucket.stWeight += stWeight;
        categoryBucket.gmWeighted += (sale.gross_margin_rate || 0) * gmWeight;
        categoryBucket.gmWeight += gmWeight;
        categoryBucket.skuSet.add(sale.sku_id);
        categoryBucket.storeSet.add(sale.channel_id);

        cellBucket.netSales += sales;
        cellBucket.pairsSold += units;
        cellBucket.stWeighted += (sale.cumulative_sell_through || 0) * stWeight;
        cellBucket.stWeight += stWeight;
        cellBucket.gmWeighted += (sale.gross_margin_rate || 0) * gmWeight;
        cellBucket.gmWeight += gmWeight;
        cellBucket.skuSet.add(sale.sku_id);
        cellBucket.storeSet.add(sale.channel_id);
        activeSkuSet.add(sale.sku_id);
        activeStoreSet.add(sale.channel_id);

        const snapshotKey = `${sale.sku_id}__${sale.channel_id}`;
        const latestSnapshot = latestInventoryBySkuChannel.get(snapshotKey);
        if (!latestSnapshot || sale.week_num > latestSnapshot.weekNum) {
            latestInventoryBySkuChannel.set(snapshotKey, {
                weekNum: sale.week_num,
                onHandUnits: Math.max(0, sale.on_hand_unit || 0),
                categoryKey,
                cellKey,
            });
        }

        totalNetSales += sales;
        totalPairs += units;
    });

    latestInventoryBySkuChannel.forEach((snapshot) => {
        const categoryBucket = categoryMap.get(snapshot.categoryKey);
        const cellBucket = cellMap.get(snapshot.cellKey);
        if (categoryBucket) categoryBucket.onHandUnits += snapshot.onHandUnits;
        if (cellBucket) cellBucket.onHandUnits += snapshot.onHandUnits;
    });

    return {
        categoryMap,
        cellMap,
        totalNetSales,
        totalPairs,
        activeSkuSet,
        activeStoreSet,
    };
}

function deriveFillRate(sellThrough: number, demandYoY: number, inventoryPressure: number) {
    // v0 mock based on sales: 缺少真实需求/配发字段时，按动销与库存压力近似推导 Fill Rate。
    const rawValue = 0.74 + sellThrough * 0.2 + demandYoY * 0.08 - inventoryPressure * 0.12;
    return clamp(rawValue, 0.62, 0.97);
}

function deriveReorderRate(fillRate: number, demandYoY: number, inventoryPressure: number) {
    // v0 mock based on sales: 缺少补单事实时，用执行缺口与需求增速近似推导补单压力。
    const rawValue =
        0.03 +
        Math.max(0, 0.9 - fillRate) * 0.4 +
        Math.max(0, demandYoY) * 0.2 -
        Math.max(0, inventoryPressure - 0.4) * 0.05;
    return clamp(rawValue, 0.015, 0.35);
}

interface BaselineMetric {
    netSales: number;
    sellThrough: number | null;
    storeCount: number;
}

interface BaselineSnapshot {
    categoryMap: Map<string, BaselineMetric>;
    cellMap: Map<string, BaselineMetric>;
    totals: CategoryOpsBaselineTotals;
}

function buildBaselineFromAggregation(aggregation: AggregationResult): BaselineSnapshot {
    const categoryMap = new Map<string, BaselineMetric>();
    const cellMap = new Map<string, BaselineMetric>();

    aggregation.categoryMap.forEach((bucket) => {
        categoryMap.set(bucket.key, {
            netSales: bucket.netSales,
            sellThrough: safeDiv(bucket.stWeighted, bucket.stWeight),
            storeCount: bucket.storeSet.size,
        });
    });

    aggregation.cellMap.forEach((bucket) => {
        cellMap.set(bucket.key, {
            netSales: bucket.netSales,
            sellThrough: safeDiv(bucket.stWeighted, bucket.stWeight),
            storeCount: bucket.storeSet.size,
        });
    });

    return {
        categoryMap,
        cellMap,
        totals: {
            netSales: aggregation.totalNetSales,
            pairsSold: aggregation.totalPairs,
            avgSellThrough: getAggregationAvgSellThrough(aggregation),
            activeSku: aggregation.activeSkuSet.size,
            storeCount: aggregation.activeStoreSet.size,
        },
    };
}

function buildPlanBaseline(current: AggregationResult): BaselineSnapshot | null {
    const categoryPlanRows = dimPlan.category_plan || [];
    const priceBandPlanRows = dimPlan.price_band_plan || [];
    const overallPlan = dimPlan.overall_plan || null;

    if (!categoryPlanRows.length && !overallPlan) return null;

    const categoryPlanMap = new Map<string, DimPlanCategoryRecord>();
    categoryPlanRows.forEach((row) => categoryPlanMap.set(row.category_id, row));

    const bandPlanMap = new Map<string, DimPlanPriceBandRecord>();
    priceBandPlanRows.forEach((row) => bandPlanMap.set(normalizePlanPriceBand(row.price_band), row));
    const totalBandPlanSales = priceBandPlanRows.reduce((sum, row) => sum + (row.plan_sales_amt || 0), 0);

    const categoryCurrentSales = new Map<string, number>();
    current.cellMap.forEach((bucket) => {
        categoryCurrentSales.set(bucket.categoryId, (categoryCurrentSales.get(bucket.categoryId) || 0) + bucket.netSales);
    });

    const categoryMap = new Map<string, BaselineMetric>();
    current.categoryMap.forEach((bucket) => {
        const categoryPlan = categoryPlanMap.get(bucket.categoryId);
        categoryMap.set(bucket.key, {
            netSales: categoryPlan?.plan_sales_amt || 0,
            sellThrough: categoryPlan?.plan_sell_through ?? null,
            storeCount: bucket.storeSet.size,
        });
    });

    const cellMap = new Map<string, BaselineMetric>();
    current.cellMap.forEach((bucket) => {
        const categoryPlan = categoryPlanMap.get(bucket.categoryId);
        const categoryPlanSales = categoryPlan?.plan_sales_amt || 0;

        const currentCategoryTotal = categoryCurrentSales.get(bucket.categoryId) || 0;
        const currentShare = currentCategoryTotal > 0 ? safeDiv(bucket.netSales, currentCategoryTotal) : 0;

        const bandPlan = bandPlanMap.get(bucket.priceBand);
        const bandShare = totalBandPlanSales > 0 ? safeDiv(bandPlan?.plan_sales_amt || 0, totalBandPlanSales) : 0;
        const blendedShare = currentShare > 0 ? currentShare : bandShare;

        const planSellThroughCandidates = [categoryPlan?.plan_sell_through, bandPlan?.plan_sell_through]
            .filter((value): value is number => Number.isFinite(value));
        const planSellThrough =
            planSellThroughCandidates.length > 0
                ? safeDiv(planSellThroughCandidates.reduce((sum, value) => sum + value, 0), planSellThroughCandidates.length)
                : null;

        cellMap.set(bucket.key, {
            netSales: categoryPlanSales * blendedShare,
            sellThrough: planSellThrough,
            storeCount: bucket.storeSet.size,
        });
    });

    const categoryPlanTotalSales = categoryPlanRows.reduce((sum, row) => sum + (row.plan_sales_amt || 0), 0);
    const categoryPlanTotalUnits = categoryPlanRows.reduce((sum, row) => sum + (row.plan_units || 0), 0);
    const categoryPlanTotalSkus = categoryPlanRows.reduce((sum, row) => sum + (row.plan_sku_count || 0), 0);

    const planAvgSellThrough =
        Number.isFinite(overallPlan?.plan_avg_sell_through)
            ? Number(overallPlan?.plan_avg_sell_through)
            : safeDiv(
                categoryPlanRows.reduce((sum, row) => sum + (row.plan_sell_through || 0) * (row.plan_sales_amt || 0), 0),
                categoryPlanTotalSales,
            );

    return {
        categoryMap,
        cellMap,
        totals: {
            netSales: Number(overallPlan?.plan_total_sales || categoryPlanTotalSales || 0),
            pairsSold: Number(overallPlan?.plan_total_units || categoryPlanTotalUnits || 0),
            avgSellThrough: planAvgSellThrough,
            activeSku: Number(overallPlan?.plan_active_skus || categoryPlanTotalSkus || 0),
            storeCount: current.activeStoreSet.size,
        },
    };
}

function buildSunburstData(rows: CategoryHeatCell[]): CategoryOpsSunburstNode[] {
    const lineMap = new Map<string, CategoryOpsSunburstNode>();

    rows.forEach((row) => {
        const lineNode = lineMap.get(row.productLine) || {
            name: row.productLine,
            value: 0,
            sellThrough: 0,
            children: [],
        };

        lineNode.value += row.netSales;
        if (!lineNode.children) lineNode.children = [];

        lineNode.children.push({
            name: row.category,
            value: row.netSales,
            sellThrough: row.sellThrough,
        });

        lineMap.set(row.productLine, lineNode);
    });

    return Array.from(lineMap.values())
        .map((lineNode) => {
            const totalValue = lineNode.children?.reduce((sum, item) => sum + item.value, 0) || 0;
            const weightedSellThrough = lineNode.children?.reduce((sum, item) => {
                return sum + item.sellThrough * item.value;
            }, 0) || 0;

            return {
                ...lineNode,
                value: totalValue,
                sellThrough: safeDiv(weightedSellThrough, totalValue),
            };
        })
        .sort((a, b) => b.value - a.value);
}

function buildHeatAxisCells(cells: CategoryHeatCell[], axisMode: CategoryOpsHeatXAxis) {
    if (axisMode === 'element') {
        return [...cells].sort((a, b) => b.netSales - a.netSales).slice(0, 16);
    }

    type GroupAccumulator = {
        id: string;
        categoryId: string;
        category: string;
        priceBand: string;
        elementLabel: string;
        netSales: number;
        pairsSold: number;
        skcCnt: number;
        onHandUnits: number;
        burdenScore: number;
        weightedSales: number;
        sellThroughWeighted: number;
        fillRateWeighted: number;
        reorderRateWeighted: number;
        fillGapWeighted: number;
        reorderGapWeighted: number;
        sellThroughGapWeighted: number;
        demandYoYWeighted: number;
        productLineSales: Map<string, number>;
    };

    const grouped = new Map<string, GroupAccumulator>();

    cells.forEach((cell) => {
        const key = axisMode === 'category' ? cell.categoryId : cell.priceBand;
        const elementLabel = axisMode === 'category' ? cell.category : formatPriceBandLabel(cell.priceBand);
        const initial = grouped.get(key) || {
            id: `${axisMode}__${key}`,
            categoryId: axisMode === 'category' ? cell.categoryId : 'all',
            category: axisMode === 'category' ? cell.category : '全部品类',
            priceBand: axisMode === 'price_band' ? cell.priceBand : 'all',
            elementLabel,
            netSales: 0,
            pairsSold: 0,
            skcCnt: 0,
            onHandUnits: 0,
            burdenScore: 0,
            weightedSales: 0,
            sellThroughWeighted: 0,
            fillRateWeighted: 0,
            reorderRateWeighted: 0,
            fillGapWeighted: 0,
            reorderGapWeighted: 0,
            sellThroughGapWeighted: 0,
            demandYoYWeighted: 0,
            productLineSales: new Map<string, number>(),
        };

        const weight = Math.max(cell.netSales, 1);
        initial.netSales += cell.netSales;
        initial.pairsSold += cell.pairsSold;
        initial.skcCnt += cell.skcCnt;
        initial.onHandUnits += cell.onHandUnits;
        initial.burdenScore += cell.burdenScore;
        initial.weightedSales += weight;
        initial.sellThroughWeighted += cell.sellThrough * weight;
        initial.fillRateWeighted += cell.fillRate * weight;
        initial.reorderRateWeighted += cell.reorderRate * weight;
        initial.fillGapWeighted += cell.fillGapPp * weight;
        initial.reorderGapWeighted += cell.reorderGapPp * weight;
        initial.sellThroughGapWeighted += cell.sellThroughGapPp * weight;
        initial.demandYoYWeighted += cell.demandYoY * weight;

        initial.productLineSales.set(
            cell.productLine,
            (initial.productLineSales.get(cell.productLine) || 0) + cell.netSales,
        );

        grouped.set(key, initial);
    });

    const rows = Array.from(grouped.values()).map((item) => {
        const topProductLine =
            Array.from(item.productLineSales.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '未定义产品线';

        return {
            id: item.id,
            categoryId: item.categoryId,
            category: item.category,
            productLine: topProductLine,
            priceBand: item.priceBand,
            elementLabel: item.elementLabel,
            netSales: item.netSales,
            pairsSold: item.pairsSold,
            skcCnt: item.skcCnt,
            asp: safeDiv(item.netSales, item.pairsSold),
            salesPerSkc: safeDiv(item.netSales, item.skcCnt),
            sellThrough: safeDiv(item.sellThroughWeighted, item.weightedSales),
            fillRate: safeDiv(item.fillRateWeighted, item.weightedSales),
            reorderRate: safeDiv(item.reorderRateWeighted, item.weightedSales),
            fillGapPp: safeDiv(item.fillGapWeighted, item.weightedSales),
            reorderGapPp: safeDiv(item.reorderGapWeighted, item.weightedSales),
            sellThroughGapPp: safeDiv(item.sellThroughGapWeighted, item.weightedSales),
            demandYoY: safeDiv(item.demandYoYWeighted, item.weightedSales),
            onHandUnits: item.onHandUnits,
            burdenScore: item.burdenScore,
        } satisfies CategoryHeatCell;
    });

    if (axisMode === 'price_band') {
        return rows.sort((a, b) => parsePriceBandOrder(a.elementLabel) - parsePriceBandOrder(b.elementLabel));
    }

    return rows.sort((a, b) => b.netSales - a.netSales);
}

function deltaPercent(current: number, baseline: number) {
    if (baseline <= 0) return null;
    return safeDiv(current - baseline, baseline);
}

function deltaPp(current: number, baseline: number) {
    return (current - baseline) * 100;
}

function resolveToneByGap(absGapPercent: number) {
    if (absGapPercent <= 0.08) return 'good' as const;
    if (absGapPercent <= 0.18) return 'warn' as const;
    return 'risk' as const;
}

type SkuActionAgg = {
    skuId: string;
    skuName: string;
    categoryId: string;
    category: string;
    priceBand: string;
    netSales: number;
    pairsSold: number;
    stWeighted: number;
    stWeight: number;
    discountWeighted: number;
    discountWeight: number;
    onHandUnits: number;
};

function buildSkuActionRows(
    filters: DashboardFilters,
    skuMap: Map<string, DimSkuRecord>,
    channelMap: Map<string, DimChannelRecord>,
    avgSellThrough: number,
): CategoryOpsSkuActionRow[] {
    const skuMapAgg = new Map<string, SkuActionAgg>();
    const latestInventoryBySkuChannel = new Map<string, { weekNum: number; onHandUnits: number }>();

    factSales.forEach((sale) => {
        const sku = skuMap.get(sale.sku_id);
        const channel = channelMap.get(sale.channel_id);
        if (!sku || !channel) return;
        if (!shouldIncludeRecord(sale, sku, channel, filters, null, null)) return;

        const row = skuMapAgg.get(sale.sku_id) || {
            skuId: sale.sku_id,
            skuName: sku.sku_name || sale.sku_id,
            categoryId: sku.category_id || 'unknown',
            category: sku.category_name || sku.category_id || '未定义品类',
            priceBand: sku.price_band || 'PBX',
            netSales: 0,
            pairsSold: 0,
            stWeighted: 0,
            stWeight: 0,
            discountWeighted: 0,
            discountWeight: 0,
            onHandUnits: 0,
        };

        const units = Math.max(0, sale.unit_sold || 0);
        const sales = Math.max(0, sale.net_sales_amt || 0);
        const stWeight = Math.max(units, 1);
        const discountWeight = Math.max(sales, 1);

        row.netSales += sales;
        row.pairsSold += units;
        row.stWeighted += (sale.cumulative_sell_through || 0) * stWeight;
        row.stWeight += stWeight;
        row.discountWeighted += (sale.discount_rate || 0) * discountWeight;
        row.discountWeight += discountWeight;

        const snapshotKey = `${sale.sku_id}__${sale.channel_id}`;
        const latestSnapshot = latestInventoryBySkuChannel.get(snapshotKey);
        if (!latestSnapshot || sale.week_num > latestSnapshot.weekNum) {
            latestInventoryBySkuChannel.set(snapshotKey, {
                weekNum: sale.week_num,
                onHandUnits: Math.max(0, sale.on_hand_unit || 0),
            });
        }

        skuMapAgg.set(sale.sku_id, row);
    });

    latestInventoryBySkuChannel.forEach((snapshot, key) => {
        const skuId = key.split('__')[0];
        const row = skuMapAgg.get(skuId);
        if (!row) return;
        row.onHandUnits += snapshot.onHandUnits;
    });

    return Array.from(skuMapAgg.values())
        .map((row) => {
            const sellThrough = safeDiv(row.stWeighted, row.stWeight);
            const discountRate = safeDiv(row.discountWeighted, row.discountWeight);
            const stockToSales = safeDiv(row.onHandUnits, Math.max(row.pairsSold, 1));
            const fillRate = deriveFillRate(sellThrough, 0, safeDiv(row.onHandUnits, row.onHandUnits + row.pairsSold));

            let action = '维持观察';
            let reason = '供需结构接近样本均值，维持正常陈列与补货频率。';

            if (sellThrough >= avgSellThrough + 0.03 && discountRate <= 0.18) {
                action = '补单加深';
                reason = '售罄高于均值且折扣受控，建议加深核心尺码与主推款厚度。';
            } else if (sellThrough < avgSellThrough - 0.03 && stockToSales >= 1.8) {
                action = '收敛清理';
                reason = '售罄偏低且库存压力高，建议缩减 SKU 宽度并加速去化。';
            } else if (discountRate >= 0.30 && sellThrough < avgSellThrough) {
                action = '调价修复';
                reason = '折扣偏深但去化未改善，建议优化价格带策略与促销节奏。';
            } else if (fillRate < 0.86 && sellThrough >= avgSellThrough) {
                action = '调拨补货';
                reason = '执行率偏低且需求稳定，建议跨仓调拨保证畅销尺码。';
            }

            return {
                skuId: row.skuId,
                categoryId: row.categoryId,
                category: row.category,
                skuName: row.skuName,
                priceBand: row.priceBand,
                priceBandLabel: formatPriceBandLabel(row.priceBand),
                pairsSold: row.pairsSold,
                netSales: row.netSales,
                sellThrough,
                onHandUnits: row.onHandUnits,
                discountRate,
                action,
                reason,
            } satisfies CategoryOpsSkuActionRow;
        })
        .sort((a, b) => b.netSales - a.netSales);
}

export function useCategoryOps(
    filters: DashboardFilters,
    heatmapXAxis: CategoryOpsHeatXAxis = 'element',
    compareMode: CompareMode = 'none',
) {
    return useMemo(() => {
        const skuMap = new Map<string, DimSkuRecord>();
        dimSku.forEach((item) => skuMap.set(item.sku_id, item));

        const channelMap = new Map<string, DimChannelRecord>();
        dimChannel.forEach((item) => channelMap.set(item.channel_id, item));

        const current = aggregateSales(filters, skuMap, channelMap, null, null);
        const planSnapshot = buildPlanBaseline(current);
        const modeLabel = getCompareModeLabel(compareMode);
        const deltaLabel = getCompareDeltaLabel(compareMode);
        const heatMetricLabels = getHeatmapMetricLabels(compareMode, deltaLabel);
        const selectedYear = Number(filters.season_year);

        let baselineSnapshot: BaselineSnapshot | null = null;
        let baselineLabel = '无基线';
        let note =
            '无对比模式：当前值展示，不计算同期差值。执行率/补单率为 v0 推导口径（fill_rate=ship/demand，reorder_rate=reorder/demand）。';

        if (compareMode === 'yoy') {
            const baselineYear = Number.isFinite(selectedYear) ? selectedYear - 1 : null;
            if (baselineYear !== null) {
                const baselineAggregation = aggregateSales(filters, skuMap, channelMap, baselineYear, null);
                baselineSnapshot = buildBaselineFromAggregation(baselineAggregation);
                baselineLabel = `${baselineYear}年同期`;
                note = baselineSnapshot.totals.netSales > 0
                    ? '同比口径：基线为去年同期同筛选样本。执行率/补单率为 v0 推导口径。'
                    : '同比口径：当前筛选缺少去年同期样本，差值项显示为 0。';
            } else {
                note = '同比口径：当前年份未锁定，无法构建去年同期基线。';
            }
        } else if (compareMode === 'mom') {
            const momBaseline = resolveMomBaseline(filters);
            if (momBaseline) {
                const baselineAggregation = aggregateSales(
                    filters,
                    skuMap,
                    channelMap,
                    momBaseline.year,
                    momBaseline.season,
                );
                baselineSnapshot = buildBaselineFromAggregation(baselineAggregation);
                baselineLabel = `${momBaseline.year}-${momBaseline.season}`;
                note = baselineSnapshot.totals.netSales > 0
                    ? '环比口径：基线为上季同筛选样本。执行率/补单率为 v0 推导口径。'
                    : '环比口径：上季样本为空，差值项显示为 0。';
            } else {
                note = '环比口径：请先选择具体季度（Q1-Q4），再计算较上季差值。';
            }
        } else if (compareMode === 'plan') {
            baselineSnapshot = planSnapshot;
            baselineLabel = '计划口径';
            note = baselineSnapshot
                ? '计划口径：销售/售罄基线来自 dim_plan；执行率与补单率为 v0 推导口径。'
                : '计划口径：当前缺 dim_plan 基线，差值项显示为 0。';
        }

        const hasBaseline = compareMode !== 'none' && !!baselineSnapshot;
        const baselineCategoryMap = baselineSnapshot?.categoryMap || null;
        const baselineCellMap = baselineSnapshot?.cellMap || null;
        const baselineTotals = baselineSnapshot?.totals || null;

        type CategoryRow = {
            id: string;
            categoryId: string;
            category: string;
            productLine: string;
            netSales: number;
            baselineNetSales: number;
            storeCount: number;
            baselineStoreCount: number;
            salesPerStoreAmt: number;
            salesPerStoreYoY: number | null;
            pairsSold: number;
            skcCnt: number;
            asp: number;
            salesPerSkc: number;
            sellThrough: number;
            baselineSellThrough: number | null;
            fillRate: number;
            baselineFillRate: number | null;
            reorderRate: number;
            baselineReorderRate: number | null;
            demandYoY: number;
            onHandUnits: number;
        };

        const categoryRows: CategoryRow[] = Array.from(current.categoryMap.values())
            .map((bucket) => {
                const baselineMetric = baselineCategoryMap?.get(bucket.key);
                const baselineNetSales = baselineMetric?.netSales || 0;
                const storeCount = bucket.storeSet.size;
                const baselineStoreCount = baselineMetric?.storeCount || storeCount;
                const salesPerStoreAmt = safeDiv(bucket.netSales, Math.max(storeCount, 1));
                const baselineSalesPerStoreAmt = safeDiv(baselineNetSales, Math.max(baselineStoreCount, 1));
                const salesPerStoreYoY = hasBaseline
                    ? deltaPercent(salesPerStoreAmt, baselineSalesPerStoreAmt)
                    : null;
                const demandYoY = hasBaseline && baselineNetSales > 0
                    ? safeDiv(bucket.netSales - baselineNetSales, baselineNetSales)
                    : 0;

                const sellThrough = safeDiv(bucket.stWeighted, bucket.stWeight);
                const inventoryPressure = safeDiv(bucket.onHandUnits, bucket.onHandUnits + bucket.pairsSold);
                const fillRate = deriveFillRate(sellThrough, hasBaseline ? demandYoY : 0, inventoryPressure);
                const reorderRate = deriveReorderRate(fillRate, hasBaseline ? demandYoY : 0, inventoryPressure);

                const baselineSellThrough = hasBaseline ? baselineMetric?.sellThrough ?? null : null;
                const baselineFillRate = baselineSellThrough === null
                    ? null
                    : deriveFillRate(baselineSellThrough, 0, inventoryPressure);
                const baselineReorderRate = baselineFillRate === null
                    ? null
                    : deriveReorderRate(baselineFillRate, 0, inventoryPressure);

                return {
                    id: bucket.key,
                    categoryId: bucket.categoryId,
                    category: bucket.category,
                    productLine: bucket.productLine,
                    netSales: bucket.netSales,
                    baselineNetSales,
                    storeCount,
                    baselineStoreCount,
                    salesPerStoreAmt,
                    salesPerStoreYoY,
                    pairsSold: bucket.pairsSold,
                    skcCnt: bucket.skuSet.size,
                    asp: safeDiv(bucket.netSales, bucket.pairsSold),
                    salesPerSkc: safeDiv(bucket.netSales, bucket.skuSet.size),
                    sellThrough,
                    baselineSellThrough,
                    fillRate,
                    baselineFillRate,
                    reorderRate,
                    baselineReorderRate,
                    demandYoY,
                    onHandUnits: bucket.onHandUnits,
                };
            })
            .sort((a, b) => b.netSales - a.netSales);

        type CellRow = {
            id: string;
            categoryId: string;
            category: string;
            productLine: string;
            priceBand: string;
            netSales: number;
            baselineNetSales: number;
            pairsSold: number;
            skcCnt: number;
            asp: number;
            salesPerSkc: number;
            sellThrough: number;
            baselineSellThrough: number | null;
            fillRate: number;
            baselineFillRate: number | null;
            reorderRate: number;
            baselineReorderRate: number | null;
            demandYoY: number;
            onHandUnits: number;
        };

        const cellRowsRaw: CellRow[] = Array.from(current.cellMap.values())
            .map((bucket) => {
                const baselineMetric = baselineCellMap?.get(bucket.key);
                const baselineNetSales = baselineMetric?.netSales || 0;
                const demandYoY = hasBaseline && baselineNetSales > 0
                    ? safeDiv(bucket.netSales - baselineNetSales, baselineNetSales)
                    : 0;

                const sellThrough = safeDiv(bucket.stWeighted, bucket.stWeight);
                const inventoryPressure = safeDiv(bucket.onHandUnits, bucket.onHandUnits + bucket.pairsSold);
                const fillRate = deriveFillRate(sellThrough, hasBaseline ? demandYoY : 0, inventoryPressure);
                const reorderRate = deriveReorderRate(fillRate, hasBaseline ? demandYoY : 0, inventoryPressure);

                const baselineSellThrough = hasBaseline ? baselineMetric?.sellThrough ?? null : null;
                const baselineFillRate = baselineSellThrough === null
                    ? null
                    : deriveFillRate(baselineSellThrough, 0, inventoryPressure);
                const baselineReorderRate = baselineFillRate === null
                    ? null
                    : deriveReorderRate(baselineFillRate, 0, inventoryPressure);

                return {
                    id: bucket.key,
                    categoryId: bucket.categoryId,
                    category: bucket.category,
                    productLine: bucket.productLine,
                    priceBand: bucket.priceBand,
                    netSales: bucket.netSales,
                    baselineNetSales,
                    pairsSold: bucket.pairsSold,
                    skcCnt: bucket.skuSet.size,
                    asp: safeDiv(bucket.netSales, bucket.pairsSold),
                    salesPerSkc: safeDiv(bucket.netSales, bucket.skuSet.size),
                    sellThrough,
                    baselineSellThrough,
                    fillRate,
                    baselineFillRate,
                    reorderRate,
                    baselineReorderRate,
                    demandYoY,
                    onHandUnits: bucket.onHandUnits,
                };
            })
            .sort((a, b) => b.netSales - a.netSales);

        const totalCellSales = cellRowsRaw.reduce((sum, item) => sum + item.netSales, 0);
        const avgSellThrough = safeDiv(
            cellRowsRaw.reduce((sum, item) => sum + item.sellThrough * item.netSales, 0),
            totalCellSales,
        );
        const avgFillRate = safeDiv(
            cellRowsRaw.reduce((sum, item) => sum + item.fillRate * item.netSales, 0),
            totalCellSales,
        );
        const avgReorderRate = safeDiv(
            cellRowsRaw.reduce((sum, item) => sum + item.reorderRate * item.netSales, 0),
            totalCellSales,
        );

        const baselineWeight = cellRowsRaw.reduce((sum, item) => sum + Math.max(item.baselineNetSales, 0), 0);
        const baselineAvgSellThrough = hasBaseline
            ? (baselineTotals?.avgSellThrough ?? safeDiv(
                cellRowsRaw.reduce((sum, item) => {
                    if (item.baselineSellThrough === null) return sum;
                    return sum + item.baselineSellThrough * Math.max(item.baselineNetSales, 0);
                }, 0),
                baselineWeight,
            ))
            : avgSellThrough;
        const baselineAvgFillRate = hasBaseline
            ? safeDiv(
                cellRowsRaw.reduce((sum, item) => {
                    if (item.baselineFillRate === null) return sum;
                    return sum + item.baselineFillRate * Math.max(item.baselineNetSales, 0);
                }, 0),
                baselineWeight,
            ) || avgFillRate
            : avgFillRate;
        const baselineAvgReorderRate = hasBaseline
            ? safeDiv(
                cellRowsRaw.reduce((sum, item) => {
                    if (item.baselineReorderRate === null) return sum;
                    return sum + item.baselineReorderRate * Math.max(item.baselineNetSales, 0);
                }, 0),
                baselineWeight,
            ) || avgReorderRate
            : avgReorderRate;

        const currentStoreCount = current.activeStoreSet.size;
        const currentActiveSku = current.activeSkuSet.size;
        const demandPairs = safeDiv(current.totalPairs, Math.max(avgSellThrough, 0.05));
        const shipPairs = demandPairs * avgFillRate;
        const sellShipRatio = safeDiv(current.totalPairs, shipPairs);
        const salesPerSkuAmt = safeDiv(current.totalNetSales, currentActiveSku);
        const salesPerStoreAmt = safeDiv(current.totalNetSales, currentStoreCount);

        const baselinePairs = baselineTotals?.pairsSold || 0;
        const baselineSales = baselineTotals?.netSales || 0;
        const baselineStoreCount = baselineTotals?.storeCount || currentStoreCount;
        const baselineActiveSku = baselineTotals?.activeSku || 0;
        const baselineDemandPairs = safeDiv(baselinePairs, Math.max(baselineAvgSellThrough, 0.05));
        const baselineShipPairs = baselineDemandPairs * baselineAvgFillRate;
        const baselineSellShipRatio = safeDiv(baselinePairs, baselineShipPairs);
        const baselineSalesPerSkuAmt = safeDiv(baselineSales, Math.max(baselineActiveSku, 1));
        const baselineSalesPerStoreAmt = safeDiv(baselineSales, Math.max(baselineStoreCount, 1));

        const businessKpis: CategoryOpsBizKpi[] = [
            {
                id: 'ship_qty',
                title: '发货量',
                value: shipPairs,
                valueKind: 'pairs',
                deltaValue: hasBaseline ? deltaPercent(shipPairs, baselineShipPairs) : null,
                deltaKind: 'percent',
                description: `基线：${baselineLabel}`,
            },
            {
                id: 'sales_qty',
                title: '销量',
                value: current.totalPairs,
                valueKind: 'pairs',
                deltaValue: hasBaseline ? deltaPercent(current.totalPairs, baselinePairs) : null,
                deltaKind: 'percent',
                description: `基线：${baselineLabel}`,
            },
            {
                id: 'sales_amt',
                title: '销额',
                value: current.totalNetSales,
                valueKind: 'amount',
                deltaValue: hasBaseline ? deltaPercent(current.totalNetSales, baselineSales) : null,
                deltaKind: 'percent',
                description: `基线：${baselineLabel}`,
            },
            {
                id: 'sell_ship_ratio',
                title: '销发比',
                value: sellShipRatio,
                valueKind: 'percent',
                deltaValue: hasBaseline ? deltaPp(sellShipRatio, baselineSellShipRatio) : null,
                deltaKind: 'pp',
                description: '定义：销量 / 发货量',
            },
            {
                id: 'active_sku',
                title: '动销SKU',
                value: currentActiveSku,
                valueKind: 'count',
                deltaValue: hasBaseline ? deltaPercent(currentActiveSku, baselineActiveSku) : null,
                deltaKind: 'percent',
                description: `基线：${baselineLabel}`,
            },
            {
                id: 'sku_depth_amt',
                title: '单款销额',
                value: salesPerSkuAmt,
                valueKind: 'amount',
                deltaValue: hasBaseline ? deltaPercent(salesPerSkuAmt, baselineSalesPerSkuAmt) : null,
                deltaKind: 'percent',
                description: '定义：销额 / 动销SKU',
            },
            {
                id: 'store_depth_amt',
                title: '单店销额',
                value: salesPerStoreAmt,
                valueKind: 'amount',
                deltaValue: hasBaseline ? deltaPercent(salesPerStoreAmt, baselineSalesPerStoreAmt) : null,
                deltaKind: 'percent',
                description: '定义：销额 / 动销门店',
            },
        ];

        const planTotals = planSnapshot?.totals || null;
        const planActiveSku = planTotals?.activeSku || 0;
        const planSalesAmt = planTotals?.netSales || 0;
        const planSkuDepthAmt = safeDiv(planSalesAmt, Math.max(planActiveSku, 1));
        const actualSkuDepthAmt = salesPerSkuAmt;
        const planSellThrough = planTotals?.avgSellThrough || 0;
        const skuGapPercent = deltaPercent(currentActiveSku, planActiveSku) || 0;
        const depthGapPercent = deltaPercent(actualSkuDepthAmt, planSkuDepthAmt) || 0;
        const stGapPp = deltaPp(avgSellThrough, planSellThrough);

        const planBiasCards: CategoryOpsPlanBiasCard[] = [
            {
                id: 'plan_sku_gap',
                title: '企划SKU vs 动销SKU',
                actualLabel: `实际 ${currentActiveSku} 款`,
                planLabel: planActiveSku > 0 ? `计划 ${planActiveSku} 款` : '计划 —',
                gapLabel: planActiveSku > 0 ? `${skuGapPercent >= 0 ? '+' : ''}${(skuGapPercent * 100).toFixed(1)}%` : '—',
                tone: planActiveSku > 0 ? resolveToneByGap(Math.abs(skuGapPercent)) : 'warn',
                note: planActiveSku > 0 ? 'SKU宽度偏差过大时，需检查企划落地与渠道适配。' : '缺计划SKU字段，暂无法判定偏差。',
            },
            {
                id: 'plan_depth_gap',
                title: '计划单款深度 vs 实际单款深度',
                actualLabel: `实际 ${Math.round(actualSkuDepthAmt / 10_000)}万/款`,
                planLabel: planSkuDepthAmt > 0 ? `计划 ${Math.round(planSkuDepthAmt / 10_000)}万/款` : '计划 —',
                gapLabel: planSkuDepthAmt > 0 ? `${depthGapPercent >= 0 ? '+' : ''}${(depthGapPercent * 100).toFixed(1)}%` : '—',
                tone: planSkuDepthAmt > 0 ? resolveToneByGap(Math.abs(depthGapPercent)) : 'warn',
                note: planSkuDepthAmt > 0 ? '深度偏差反映货盘厚度与动销能力错配。' : '缺计划深度字段，暂无法判定偏差。',
            },
            {
                id: 'plan_sellthrough_gap',
                title: '计划售罄 vs 实际售罄',
                actualLabel: `实际 ${(avgSellThrough * 100).toFixed(1)}%`,
                planLabel: planSellThrough > 0 ? `计划 ${(planSellThrough * 100).toFixed(1)}%` : '计划 —',
                gapLabel: planSellThrough > 0 ? `${stGapPp >= 0 ? '+' : ''}${stGapPp.toFixed(1)}pp` : '—',
                tone: planSellThrough > 0 ? resolveToneByGap(Math.abs(stGapPp / 100)) : 'warn',
                note: planSellThrough > 0 ? '售罄偏差可直接用于补单与收敛动作优先级。' : '缺计划售罄字段，暂无法判定偏差。',
            },
        ];

        const heatCells: CategoryHeatCell[] = cellRowsRaw.map((row) => {
            const burdenScore = row.onHandUnits * Math.max(0.25, 1 - row.sellThrough);
            const fillGapPp = compareMode === 'none'
                ? (row.fillRate - avgFillRate) * 100
                : (row.fillRate - (row.baselineFillRate ?? baselineAvgFillRate)) * 100;
            const reorderGapPp = compareMode === 'none'
                ? (row.reorderRate - avgReorderRate) * 100
                : (row.reorderRate - (row.baselineReorderRate ?? baselineAvgReorderRate)) * 100;
            const sellThroughGapPp = compareMode === 'none'
                ? (row.sellThrough - avgSellThrough) * 100
                : (row.sellThrough - (row.baselineSellThrough ?? baselineAvgSellThrough)) * 100;

            return {
                id: row.id,
                categoryId: row.categoryId,
                category: row.category,
                productLine: row.productLine,
                priceBand: row.priceBand,
                elementLabel: `${row.category} / ${formatPriceBandLabel(row.priceBand)}`,
                netSales: row.netSales,
                pairsSold: row.pairsSold,
                skcCnt: row.skcCnt,
                asp: row.asp,
                salesPerSkc: row.salesPerSkc,
                sellThrough: row.sellThrough,
                fillRate: row.fillRate,
                reorderRate: row.reorderRate,
                fillGapPp,
                reorderGapPp,
                sellThroughGapPp,
                demandYoY: row.demandYoY,
                onHandUnits: row.onHandUnits,
                burdenScore,
            };
        });

        const categoryPriceBandMix = new Map<string, string>();
        categoryRows.forEach((row) => {
            const topPriceBands = heatCells
                .filter((cell) => cell.categoryId === row.categoryId)
                .sort((a, b) => b.netSales - a.netSales)
                .slice(0, 2)
                .sort((a, b) => parsePriceBandOrder(a.priceBand) - parsePriceBandOrder(b.priceBand))
                .map((cell) => formatPriceBandLabel(cell.priceBand));

            categoryPriceBandMix.set(row.categoryId, topPriceBands.join(' / ') || PRICE_BAND_LABEL.PBX);
        });

        const scatterPoints: CategoryScatterPoint[] = categoryRows.map((row) => ({
            id: row.id,
            categoryId: row.categoryId,
            category: row.category,
            productLine: row.productLine,
            asp: row.asp,
            salesPerSkc: row.salesPerSkc,
            netSales: row.netSales,
            sellThrough: row.sellThrough,
            fillRate: row.fillRate,
            reorderRate: row.reorderRate,
            priceBandMix: categoryPriceBandMix.get(row.categoryId) || PRICE_BAND_LABEL.PBX,
        }));

        const scatterReference = {
            aspAvg: safeDiv(current.totalNetSales, current.totalPairs),
            salesPerSkcAvg: safeDiv(
                categoryRows.reduce((sum, row) => sum + row.netSales, 0),
                categoryRows.reduce((sum, row) => sum + row.skcCnt, 0),
            ),
        };

        const focusCells = buildHeatAxisCells(heatCells, heatmapXAxis);
        const heatXLabels = focusCells.map((cell) => cell.elementLabel);
        const heatPoints: CategoryOpsHeatPoint[] = [];

        focusCells.forEach((cell, xIndex) => {
            const metrics: Array<{
                metricKey: CategoryOpsHeatPoint['metricKey'];
                metricLabel: string;
                rawValue: number;
                chartValue: number;
            }> = [
                {
                    metricKey: 'sell_through_gap',
                    metricLabel: heatMetricLabels[0],
                    rawValue: cell.sellThroughGapPp,
                    chartValue: cell.sellThroughGapPp,
                },
                {
                    metricKey: 'fill_gap',
                    metricLabel: heatMetricLabels[1],
                    rawValue: cell.fillGapPp,
                    chartValue: cell.fillGapPp,
                },
                {
                    metricKey: 'reorder_gap',
                    metricLabel: heatMetricLabels[2],
                    rawValue: cell.reorderGapPp,
                    chartValue: -cell.reorderGapPp,
                },
            ];

            metrics.forEach((metric, yIndex) => {
                heatPoints.push({
                    id: `${cell.id}__${metric.metricKey}`,
                    xIndex,
                    yIndex,
                    value: metric.chartValue,
                    metricKey: metric.metricKey,
                    metricLabel: metric.metricLabel,
                    rawValue: metric.rawValue,
                    cell,
                });
            });
        });

        const heatAbsMax = Math.max(
            1,
            ...heatPoints.map((item) => Math.abs(item.value)),
        );

        const topDemandCell = [...heatCells].sort((a, b) => {
            if (compareMode === 'none') return b.netSales - a.netSales;
            return b.demandYoY - a.demandYoY;
        })[0] || null;
        const topSupplyRiskCell = [...heatCells].sort((a, b) => {
            if (compareMode === 'none') return a.fillRate - b.fillRate;
            return a.fillGapPp - b.fillGapPp;
        })[0] || null;
        const topReorderPressureCell = [...heatCells].sort((a, b) => {
            if (compareMode === 'none') return b.reorderRate - a.reorderRate;
            return b.reorderGapPp - a.reorderGapPp;
        })[0] || null;
        const topTailBurdenCell = [...heatCells].sort((a, b) => {
            if (compareMode === 'none') return b.burdenScore - a.burdenScore;
            return a.sellThroughGapPp - b.sellThroughGapPp;
        })[0] || null;

        const kpis: CategoryOpsKpiCard[] = [
            {
                id: 'top_demand',
                title: compareMode === 'none' ? '当前贡献 Top 要素' : `需求变化 Top 要素（${deltaLabel}）`,
                element: topDemandCell?.elementLabel || '--',
                value: compareMode === 'none'
                    ? safeDiv(topDemandCell?.netSales || 0, current.totalNetSales)
                    : topDemandCell?.demandYoY || 0,
                valueKind: 'percent',
                subValue: compareMode === 'none'
                    ? `净销 ${Math.round((topDemandCell?.netSales || 0) / 10_000)}万`
                    : `${deltaLabel} ${((topDemandCell?.demandYoY || 0) * 100).toFixed(1)}%`,
                tone: compareMode === 'none'
                    ? (safeDiv(topDemandCell?.netSales || 0, current.totalNetSales) >= 0.18 ? 'good' : 'warn')
                    : ((topDemandCell?.demandYoY || 0) >= 0.08 ? 'good' : 'warn'),
            },
            {
                id: 'supply_risk',
                title: compareMode === 'none' ? '供给侧风险 Top 要素' : `供给侧风险 Top 要素（${deltaLabel}）`,
                element: topSupplyRiskCell?.elementLabel || '--',
                value: compareMode === 'none' ? (topSupplyRiskCell?.fillRate || 0) : (topSupplyRiskCell?.fillGapPp || 0),
                valueKind: compareMode === 'none' ? 'percent' : 'pp',
                subValue: compareMode === 'none'
                    ? `较样本均值 ${topSupplyRiskCell ? topSupplyRiskCell.fillGapPp.toFixed(1) : '0.0'}pp`
                    : `当前执行率 ${((topSupplyRiskCell?.fillRate || 0) * 100).toFixed(1)}%`,
                tone: (topSupplyRiskCell?.fillGapPp || 0) <= -3 ? 'risk' : 'warn',
            },
            {
                id: 'reorder_pressure',
                title: compareMode === 'none' ? '补单压力 Top 要素' : `补单压力 Top 要素（${deltaLabel}）`,
                element: topReorderPressureCell?.elementLabel || '--',
                value: compareMode === 'none'
                    ? (topReorderPressureCell?.reorderRate || 0)
                    : (topReorderPressureCell?.reorderGapPp || 0),
                valueKind: compareMode === 'none' ? 'percent' : 'pp',
                subValue: compareMode === 'none'
                    ? `较样本均值 +${topReorderPressureCell ? topReorderPressureCell.reorderGapPp.toFixed(1) : '0.0'}pp`
                    : `当前补单率 ${((topReorderPressureCell?.reorderRate || 0) * 100).toFixed(1)}%`,
                tone: compareMode === 'none'
                    ? ((topReorderPressureCell?.reorderRate || 0) >= avgReorderRate + 0.015 ? 'risk' : 'warn')
                    : ((topReorderPressureCell?.reorderGapPp || 0) >= 1.5 ? 'risk' : 'warn'),
            },
            {
                id: 'tail_burden',
                title: compareMode === 'none' ? '长尾包袱 Top 要素' : `长尾包袱 Top 要素（${deltaLabel}）`,
                element: topTailBurdenCell?.elementLabel || '--',
                value: compareMode === 'none'
                    ? (topTailBurdenCell?.sellThrough || 0)
                    : (topTailBurdenCell?.sellThroughGapPp || 0),
                valueKind: compareMode === 'none' ? 'percent' : 'pp',
                subValue: compareMode === 'none'
                    ? `库存 ${Math.round(topTailBurdenCell?.onHandUnits || 0).toLocaleString('zh-CN')}双`
                    : `当前售罄率 ${((topTailBurdenCell?.sellThrough || 0) * 100).toFixed(1)}%`,
                tone: compareMode === 'none'
                    ? ((topTailBurdenCell?.sellThrough || 0) < avgSellThrough ? 'risk' : 'warn')
                    : ((topTailBurdenCell?.sellThroughGapPp || 0) <= -2 ? 'risk' : 'warn'),
            },
        ];

        const categoryWaterfall = categoryRows
            .map((row) => {
                const deltaNetSales = compareMode === 'none'
                    ? row.netSales
                    : row.netSales - row.baselineNetSales;
                return {
                    id: row.id,
                    categoryId: row.categoryId,
                    category: row.category,
                    deltaNetSales,
                    currentNetSales: row.netSales,
                    baselineNetSales: row.baselineNetSales,
                } satisfies CategoryOpsWaterfallPoint;
            })
            .sort((a, b) => Math.abs(b.deltaNetSales) - Math.abs(a.deltaNetSales))
            .slice(0, 10);

        const skuActionRows = buildSkuActionRows(filters, skuMap, channelMap, avgSellThrough);

        const topCategory = categoryRows[0] || null;
        const mismatchCell = [...heatCells]
            .sort((a, b) => {
                const scoreA =
                    Math.max(0, -a.fillGapPp) * 1.6 +
                    Math.max(0, a.reorderGapPp) * 1.3 +
                    Math.max(0, -a.sellThroughGapPp);
                const scoreB =
                    Math.max(0, -b.fillGapPp) * 1.6 +
                    Math.max(0, b.reorderGapPp) * 1.3 +
                    Math.max(0, -b.sellThroughGapPp);
                return scoreB - scoreA;
            })[0] || null;

        let cause = '当前样本供需基本平衡，建议按波段做轻量结构微调。';
        if (mismatchCell) {
            if (mismatchCell.fillGapPp < -3 && mismatchCell.reorderGapPp > 2) {
                cause = `供给侧短缺主导：${mismatchCell.elementLabel} 执行率偏低、补单压力偏高。`;
            } else if (mismatchCell.sellThroughGapPp < -2) {
                cause = compareMode === 'none'
                    ? `需求侧疲软主导：${mismatchCell.elementLabel} 售罄率低于均值，去化慢。`
                    : `需求侧疲软主导：${mismatchCell.elementLabel} 售罄率${deltaLabel}偏弱，去化慢。`;
            } else if (mismatchCell.demandYoY > 0.18 && mismatchCell.fillGapPp < 0) {
                cause = `需求增长快于供给：${mismatchCell.elementLabel} 需要提前加深备货。`;
            } else {
                cause = `供需双侧错配：${mismatchCell.elementLabel} 需同步优化配货节奏与主推结构。`;
            }
        }

        const actions: string[] = [];
        if (topSupplyRiskCell) {
            actions.push(`对 ${topSupplyRiskCell.elementLabel} 启动优先补货调拨，先保核心码段与核心门店。`);
        }
        if (topReorderPressureCell) {
            actions.push(`对 ${topReorderPressureCell.elementLabel} 前置二次补单窗口，缩短到货周期。`);
        }
        if (topTailBurdenCell) {
            actions.push(`对 ${topTailBurdenCell.elementLabel} 执行 SKU 收敛，压缩低效宽度，优先清理慢动销库存。`);
        }
        if (topCategory) {
            actions.push(`将资源向 ${topCategory.category} 倾斜，提升高动销价带深度，降低断码风险。`);
        }
        if (actions.length < 3) {
            actions.push('保持主力品类节奏稳定，按周监控售罄与执行率差值，避免结构性偏离。');
        }

        const channelLabel = filters.channel_type === 'all' ? '全渠道' : `${filters.channel_type}`;
        const totalDeltaAmt = current.totalNetSales - baselineSales;
        const totalDeltaPct = hasBaseline ? deltaPercent(current.totalNetSales, baselineSales) : null;
        const storeDeltaPct = hasBaseline ? deltaPercent(salesPerStoreAmt, baselineSalesPerStoreAmt) : null;

        const growthRows = hasBaseline
            ? [...categoryRows].filter((row) => row.netSales - row.baselineNetSales > 0).sort((a, b) => (b.netSales - b.baselineNetSales) - (a.netSales - a.baselineNetSales))
            : [...categoryRows].sort((a, b) => b.netSales - a.netSales);
        const declineRows = hasBaseline
            ? [...categoryRows].filter((row) => row.netSales - row.baselineNetSales < 0).sort((a, b) => (a.netSales - a.baselineNetSales) - (b.netSales - b.baselineNetSales))
            : [];

        const storeUpRows = categoryRows
            .filter((row) => row.salesPerStoreYoY !== null && (row.salesPerStoreYoY || 0) > 0)
            .sort((a, b) => (b.salesPerStoreYoY || 0) - (a.salesPerStoreYoY || 0));
        const storeDownRows = categoryRows
            .filter((row) => row.salesPerStoreYoY !== null && (row.salesPerStoreYoY || 0) < 0)
            .sort((a, b) => (a.salesPerStoreYoY || 0) - (b.salesPerStoreYoY || 0));

        const focusRows = [...categoryRows]
            .filter((row) => !hasBaseline || row.demandYoY >= 0)
            .sort((a, b) => {
                const scoreA = safeDiv(a.netSales, Math.max(current.totalNetSales, 1)) + Math.max(0, a.demandYoY) * 0.8;
                const scoreB = safeDiv(b.netSales, Math.max(current.totalNetSales, 1)) + Math.max(0, b.demandYoY) * 0.8;
                return scoreB - scoreA;
            });

        const categoryGroups = {
            cashflow: [] as string[],
            potential: [] as string[],
            warning: [] as string[],
            research: [] as string[],
        };

        categoryRows.forEach((row) => {
            const highDepth = row.salesPerSkc >= scatterReference.salesPerSkcAvg;
            const highMomentum = hasBaseline ? row.demandYoY >= 0 : row.sellThrough >= avgSellThrough;

            if (highDepth && highMomentum) {
                categoryGroups.cashflow.push(row.category);
            } else if (!highDepth && highMomentum) {
                categoryGroups.potential.push(row.category);
            } else if (!highDepth && !highMomentum) {
                categoryGroups.warning.push(row.category);
            } else {
                categoryGroups.research.push(row.category);
            }
        });

        const yoyConclusions: string[] = hasBaseline
            ? [
                `${channelLabel}口径销额${deltaLabel}${totalDeltaAmt >= 0 ? '+' : ''}${(totalDeltaAmt / 10_000).toFixed(1)}万（${totalDeltaPct === null ? '—' : `${(totalDeltaPct * 100).toFixed(1)}%`}）。`,
                `增长较多品类：${growthRows.slice(0, 5).map((item) => item.category).join('、') || '—'}。`,
                `下滑较多品类：${declineRows.slice(0, 5).map((item) => item.category).join('、') || '无明显下滑品类'}。`,
                `重点品类建议：${focusRows.slice(0, 4).map((item) => item.category).join('、') || '—'}。`,
            ]
            : [
                `${channelLabel}口径当前销额 ${formatWan(current.totalNetSales)}，以当前贡献度输出重点品类。`,
                `当前贡献Top品类：${growthRows.slice(0, 5).map((item) => item.category).join('、') || '—'}。`,
            ];

        const storeConclusions: string[] = hasBaseline
            ? [
                `动销门店：本期 ${currentStoreCount} 家，基线 ${baselineStoreCount} 家；单店销额${deltaLabel}${storeDeltaPct === null ? '—' : `${(storeDeltaPct * 100).toFixed(1)}%`}。`,
                `店均提升品类：${storeUpRows.slice(0, 3).map((item) => item.category).join('、') || '—'}。`,
                `店均下滑品类：${storeDownRows.slice(0, 3).map((item) => item.category).join('、') || '无明显下滑品类'}。`,
            ]
            : [
                `动销门店 ${currentStoreCount} 家，当前单店销额 ${formatWan(salesPerStoreAmt)}。`,
                `当前店均销额较高品类：${[...categoryRows].sort((a, b) => b.salesPerStoreAmt - a.salesPerStoreAmt).slice(0, 3).map((item) => item.category).join('、') || '—'}。`,
            ];

        const topCategoryBaselineSales = topCategory
            ? (baselineCategoryMap?.get(topCategory.id)?.netSales || 0)
            : 0;
        const topCategoryDeltaPct = topCategoryBaselineSales > 0
            ? safeDiv(topCategory.netSales - topCategoryBaselineSales, topCategoryBaselineSales) * 100
            : 0;

        const insight: CategoryOpsInsight = {
            finding: topCategory
                ? compareMode === 'none'
                    ? `${topCategory.category} 为当前最大贡献品类，销售占比 ${(
                        safeDiv(topCategory.netSales, current.totalNetSales) * 100
                    ).toFixed(1)}%。`
                    : `${topCategory.category} 为当前最大贡献品类，销售占比 ${(
                        safeDiv(topCategory.netSales, current.totalNetSales) * 100
                    ).toFixed(1)}%，${deltaLabel}${topCategoryDeltaPct.toFixed(1)}%。`
                : '当前筛选口径下暂无可用品类贡献数据。',
            cause,
            actions: actions.slice(0, 5),
            yoyConclusions,
            storeConclusions,
            categoryGroups,
        };

        const compareMeta: CategoryOpsCompareMeta = {
            mode: compareMode,
            modeLabel,
            deltaLabel,
            baselineLabel,
            hasBaseline,
            note,
        };

        return {
            totals: {
                netSales: current.totalNetSales,
                pairsSold: current.totalPairs,
                categoryCount: categoryRows.length,
                skuCount: categoryRows.reduce((sum, row) => sum + row.skcCnt, 0),
                storeCount: currentStoreCount,
                demandPairs,
                shipPairs,
                sellShipRatio,
                avgSellThrough,
                avgFillRate,
                avgReorderRate,
            },
            baselineTotals,
            compareMeta,
            businessKpis,
            planBiasCards,
            kpis,
            sunburstData: buildSunburstData(heatCells),
            scatterPoints,
            scatterReference,
            categoryWaterfall,
            skuActionRows,
            heatmap: {
                xAxisMode: heatmapXAxis,
                xLabels: heatXLabels,
                yLabels: [...heatMetricLabels],
                points: heatPoints,
                min: -heatAbsMax,
                max: heatAbsMax,
            },
            insight,
        };
    }, [filters, heatmapXAxis, compareMode]);
}
