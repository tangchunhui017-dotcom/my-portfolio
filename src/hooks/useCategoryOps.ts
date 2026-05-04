'use client';

import { useMemo } from 'react';
import factSalesRaw from '@/../data/dashboard/fact_sales.json';
import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import dimChannelRaw from '@/../data/dashboard/dim_channel.json';
import dimPlanRaw from '@/../data/dashboard/dim_plan.json';
import factOpsRaw from '@/../data/dashboard/fact_ops.json';
import sizeRuleMatrixRaw from '@/../data/taxonomy/size_rule_matrix.json';
import sizeCurvesRaw from '@/../data/taxonomy/size_curves.json';
import { matchesDashboardSkuCategoryFilters } from '@/hooks/useDashboardFilter';
import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import { resolveFootwearCategory } from '@/config/categoryMapping';
import {
    formatPriceBandLabel,
    getPriceBandSortRank,
    matchesPriceBandFilter,
    normalizePlanPriceBandKey,
    normalizePriceBandKey,
    PRICE_BAND_LABELS,
    resolvePriceBandByMsrp,
} from '@/config/priceBand';
import { matchesAudienceFilter } from '@/config/audienceMapping';
import { resolveDashboardLifecycleLabel } from '@/config/dashboardLifecycle';
import { buildDashboardOpsRecordKey, type DashboardOpsFactRecord } from '@/config/dashboardOps';
import { getDashboardCompareMeta, resolveDashboardMomBaseline } from '@/config/dashboardCompare';
import { matchesDashboardSeasonFilter } from '@/config/dashboardTime';

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
    category_l2?: string;
    season_year?: string | number;
    season?: string;
    price_band?: string;
    msrp: number;
    lifecycle?: string;
    product_line?: string;
    target_age_group?: string;
    target_audience?: string;
    color?: string;
    color_family?: string;
    gender?: string;
}

interface DimChannelRecord {
    channel_id: string;
    channel_type: string;
    region: string;
    city_tier: string;
    store_format: string;
}

type SizeGenderKey = 'women' | 'men';
type SizeLineTypeKey = 'fashion_casual' | 'sport_casual';
type SizeRegionClusterKey = 'north' | 'south' | 'default';
type SizeCategoryBiasKey = 'upsize' | 'fit_strict' | 'none';
type SizeChannelBiasKey = 'online' | 'offline';

interface SizeBandDefinition {
    size_range: string[];
    small: string[];
    core: string[];
    large: string[];
}

interface SizeRuleProfile {
    profile_id: string;
    gender: SizeGenderKey;
    line_type: SizeLineTypeKey;
    band_definition: string;
    curve_default: string;
    curve_north: string;
    curve_south: string;
}

interface SizeRuleMatrixData {
    band_definitions: Record<string, SizeBandDefinition>;
    base_profiles: SizeRuleProfile[];
    dynamic_adjustments: {
        region_clusters: Record<'north' | 'south', string[]>;
        category_bias: Record<'upsize' | 'fit_strict', string[]>;
        channel_bias: Record<SizeChannelBiasKey, { edge_size_factor: number; note: string }>;
    };
}

interface SizeCurvesData {
    curves: Record<string, Record<string, number>>;
}

interface SizeCurveSummary {
    curveId: string;
    primarySize: string;
    coreShare: number;
    edgeShare: number;
}

interface AggregateBucket {
    key: string;
    productLine: string;
    categoryId: string;
    categoryFilterId: string;
    category: string;
    priceBand: string;
    netSales: number;
    pairsSold: number;
    cumulativeStWeighted: number;
    effectiveStWeighted: number;
    stWeight: number;
    gmWeighted: number;
    gmWeight: number;
    discountWeighted: number;
    discountWeight: number;
    onHandUnits: number;
    demandPairs: number;
    shipPairs: number;
    reorderPairs: number;
    skuSet: Set<string>;
    storeSet: Set<string>;
    lifecycleSkuSet: Record<LifecycleKey, Set<string>>;
}

interface AggregationResult {
    categoryMap: Map<string, AggregateBucket>;
    cellMap: Map<string, AggregateBucket>;
    totalNetSales: number;
    totalPairs: number;
    scopedSkuSet: Set<string>;
    scopedStoreSet: Set<string>;
    activeSkuSet: Set<string>;
    activeStoreSet: Set<string>;
}

interface SellThroughTrendBucket {
    key: string;
    label: string;
    weekNum: number;
    wave: string;
    cumulativeWeighted: number;
    effectiveWeighted: number;
    weight: number;
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
    categoryFilterId: string;
    category: string;
    productLine: string;
    contributionShare: number;
    momentum: number;
    skuCount: number;
    primaryLifecycle: LifecycleKey;
    primaryLifecycleLabel: string;
    gmRate: number;
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
    categoryFilterId: string;
    category: string;
    productLine: string;
    priceBand: string;
    elementLabel: string;
    netSales: number;
    pairsSold: number;
    skcCnt: number;
    gmRate: number;
    discountRate: number;
    asp: number;
    salesPerSkc: number;
    sellThrough: number;
    cumulativeSellThrough: number;
    effectiveSellThrough: number;
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
    categoryFilterId: string;
    category: string;
    deltaNetSales: number;
    currentNetSales: number;
    baselineNetSales: number;
}

export interface CategoryOpsParetoPoint {
    rank: number;
    skuId: string;
    skuName: string;
    category: string;
    netSales: number;
    cumulativeShare: number;
}

export interface CategoryOpsSkuActionRow {
    skuId: string;
    categoryId: string;
    categoryFilterId: string;
    category: string;
    skuName: string;
    priceBand: string;
    priceBandLabel: string;
    pairsSold: number;
    netSales: number;
    sellThrough: number;
    onHandUnits: number;
    discountRate: number;
    gmRate: number;
    lifecycle: LifecycleKey;
    lifecycleLabel: string;
    action: string;
    reason: string;
    size?: string;
    size_code?: string;
    full_size_rate?: number;
    stockout_rate?: number;
    core_size_sales_share?: number;
    last_id?: string;
    last_name?: string;
    size_profile_id?: string;
    size_curve_id?: string;
}

export interface CategoryOpsHeatPoint {
    id: string;
    xIndex: number;
    yIndex: number;
    value: number;
    metricKey:
        | 'sell_through_gap'
        | 'fill_gap'
        | 'reorder_gap'
        | 'sku_count'
        | 'net_sales'
        | 'sales_share'
        | 'sell_through';
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
    sellThroughMode: SellThroughMode;
    sellThroughLabel: string;
}

export interface CategoryOpsBaselineTotals {
    netSales: number;
    pairsSold: number;
    avgSellThrough: number;
    activeSku: number;
    totalSku: number;
    storeCount: number;
    grossProfit: number | null;
    gmRate: number | null;
    discountRate: number | null;
    effectiveSellThrough: number | null;
}

export type SellThroughMode = 'effective' | 'cumulative';
export type CategoryLevel = 'l1' | 'l2';

export interface CategoryOpsDepthBin {
    label: string;
    count: number;
    share: number;
}

export interface CategoryOpsDepthSummary {
    sCount: number;
    mainCount: number;
    tailCount: number;
    sThreshold: number;
    mainThreshold: number;
}

export interface CategoryOpsDepthScatterPoint {
    skuId: string;
    skuName: string;
    categoryId: string;
    categoryFilterId: string;
    category: string;
    priceBand: string;
    lifecycleLabel: string;
    pairsSold: number;
    sellThrough: number;
    onHandUnits: number;
    gmRate: number;
    discountRate: number;
    action: string;
}

export interface CategoryOpsOtbSuggestionRow {
    categoryId: string;
    categoryFilterId: string;
    category: string;
    salesShare: number;
    gmShare: number;
    skuShare: number;
    currentWeight: number;
    suggestedWeight: number;
    deltaPp: number;
    reason: string;
}

export interface CategoryOpsSellThroughTrendPoint {
    key: string;
    label: string;
    weekNum: number;
    wave: string;
    cumulativeSellThrough: number;
    effectiveSellThrough: number;
    baselineCumulativeSellThrough: number | null;
    baselineEffectiveSellThrough: number | null;
}

export interface CategoryOpsDecisionItem {
    id: string;
    title: string;
    finding: string;
    decision: string;
    result: string;
}

const factSales = factSalesRaw as FactSalesRecord[];
const dimSku = dimSkuRaw as DimSkuRecord[];
const dimChannel = dimChannelRaw as DimChannelRecord[];
const dimPlan = dimPlanRaw as DimPlanRecord;
const factOps = factOpsRaw as DashboardOpsFactRecord[];
const factOpsMap = new Map<string, DashboardOpsFactRecord>(
    factOps.map((row) => [row.record_key || buildDashboardOpsRecordKey(row), row]),
);
const sizeRuleMatrix = sizeRuleMatrixRaw as SizeRuleMatrixData;
const sizeCurves = sizeCurvesRaw as SizeCurvesData;

export type CategoryOpsHeatXAxis = 'element' | 'category' | 'price_band';

type LifecycleKey = '\u65b0\u54c1' | '\u6b21\u65b0\u54c1' | '\u8001\u54c1';

const LIFECYCLE_LABEL: Record<LifecycleKey, string> = {
    '\u65b0\u54c1': '\u65b0\u54c1',
    '\u6b21\u65b0\u54c1': '\u6b21\u65b0\u54c1',
    '\u8001\u54c1': '\u8001\u54c1',
};
const WOMEN_HINTS = ['women', 'woman', 'female', 'lady', 'ladies', 'girl', '女'];
const MEN_HINTS = ['men', 'man', 'male', 'boy', '男'];
const UNISEX_HINTS = ['unisex', 'neutral', '中性'];
const SPORT_LINE_HINTS = [
    'sport',
    'sports',
    'running',
    'runner',
    'trail',
    'hiking',
    'outdoor',
    'training',
    'basket',
    'soccer',
    'tennis',
    '运动',
    '跑',
    '越野',
    '徒步',
    '登山',
    '溯溪',
    '户外',
    '机能',
];
const UPSIZE_HINTS = ['boots', 'boot', 'dad', 'running', 'outdoor', '靴', '老爹', '跑', '户外', '越野', '徒步', '登山'];
const FIT_STRICT_HINTS = ['heels', 'heel', 'pump', 'pumps', 'ballet', 'mary_jane', 'maryjane', '高跟', '浅口', '芭蕾', '玛丽珍', '单鞋'];
const ONLINE_CHANNEL_HINTS = ['online', 'ecom', 'e-commerce', 'ec', '电商', '线上'];
const NORTH_REGION_HINTS = ['north_china', 'northeast_china', 'northwest_china', 'north', 'northeast', 'northwest', '华北', '东北', '西北'];
const SOUTH_REGION_HINTS = ['south_china', 'southwest_china', 'east_china', 'south', 'southwest', 'east', '华南', '西南', '华东'];

const sizeProfileMap = new Map<string, SizeRuleProfile>(
    (sizeRuleMatrix.base_profiles || []).map((profile) => [`${profile.gender}__${profile.line_type}`, profile] as const),
);

function safeDiv(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return numerator / denominator;
}

function formatWan(value: number) {
    if (!Number.isFinite(value)) return '—';
    return `${(value / 10_000).toFixed(1)}万`;
}

function formatPairs(value: number) {
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) >= 10_000) return `${(value / 10_000).toFixed(1)}万双`;
    return `${Math.round(value).toLocaleString('zh-CN')}双`;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function normalizeToken(value?: string | null) {
    return String(value || '').trim().toLowerCase();
}

function includesAnyToken(text: string, tokens: string[]) {
    if (!text) return false;
    return tokens.some((token) => token && text.includes(token));
}

function resolveSizeLineType(sku: DimSkuRecord): SizeLineTypeKey {
    const text = normalizeToken([sku.product_line, sku.category_l2, sku.category_name, sku.sku_name].filter(Boolean).join(' '));
    if (includesAnyToken(text, SPORT_LINE_HINTS)) return 'sport_casual';
    return 'fashion_casual';
}

function resolveSizeGender(sku: DimSkuRecord, lineType: SizeLineTypeKey): SizeGenderKey {
    const genderRaw = normalizeToken(sku.gender);
    if (includesAnyToken(genderRaw, WOMEN_HINTS)) return 'women';
    if (includesAnyToken(genderRaw, MEN_HINTS)) return 'men';
    if (includesAnyToken(genderRaw, UNISEX_HINTS)) return lineType === 'sport_casual' ? 'men' : 'women';

    const text = normalizeToken([sku.category_l2, sku.product_line, sku.category_name, sku.sku_name].filter(Boolean).join(' '));
    if (includesAnyToken(text, FIT_STRICT_HINTS)) return 'women';
    if (includesAnyToken(text, UPSIZE_HINTS)) return lineType === 'sport_casual' ? 'men' : 'women';
    return lineType === 'fashion_casual' ? 'women' : 'men';
}

function normalizeRegionCluster(regionRaw?: string | null): 'north' | 'south' | null {
    const region = normalizeToken(regionRaw);
    if (!region) return null;

    const northClusters = (sizeRuleMatrix.dynamic_adjustments?.region_clusters?.north || []).map((item) => normalizeToken(item));
    const southClusters = (sizeRuleMatrix.dynamic_adjustments?.region_clusters?.south || []).map((item) => normalizeToken(item));
    if (includesAnyToken(region, northClusters) || includesAnyToken(region, NORTH_REGION_HINTS)) return 'north';
    if (includesAnyToken(region, southClusters) || includesAnyToken(region, SOUTH_REGION_HINTS)) return 'south';

    return null;
}

function normalizeChannelBias(channelTypeRaw?: string | null): SizeChannelBiasKey {
    const channelType = normalizeToken(channelTypeRaw);
    if (includesAnyToken(channelType, ONLINE_CHANNEL_HINTS)) return 'online';
    return 'offline';
}

function resolveSizeCategoryBias(sku: DimSkuRecord): SizeCategoryBiasKey {
    const text = normalizeToken([sku.category_l2, sku.product_line, sku.category_name, sku.sku_name].filter(Boolean).join(' '));
    const upsizeCodes = (sizeRuleMatrix.dynamic_adjustments?.category_bias?.upsize || []).map((item) => normalizeToken(item));
    const fitStrictCodes = (sizeRuleMatrix.dynamic_adjustments?.category_bias?.fit_strict || []).map((item) => normalizeToken(item));
    if (includesAnyToken(text, upsizeCodes) || includesAnyToken(text, UPSIZE_HINTS)) return 'upsize';
    if (includesAnyToken(text, fitStrictCodes) || includesAnyToken(text, FIT_STRICT_HINTS)) return 'fit_strict';
    return 'none';
}

function resolveSizeProfile(gender: SizeGenderKey, lineType: SizeLineTypeKey): SizeRuleProfile | null {
    return (
        sizeProfileMap.get(`${gender}__${lineType}`) ||
        sizeProfileMap.get(`women__${lineType}`) ||
        sizeProfileMap.get(`men__${lineType}`) ||
        sizeRuleMatrix.base_profiles?.[0] ||
        null
    );
}

function resolveDominantRegionCluster(northSales: number, southSales: number): SizeRegionClusterKey {
    if (northSales > southSales * 1.05) return 'north';
    if (southSales > northSales * 1.05) return 'south';
    return 'default';
}

function summarizeSizeCurve(profile: SizeRuleProfile, regionCluster: SizeRegionClusterKey): SizeCurveSummary {
    const resolvedCurveId = regionCluster === 'north'
        ? profile.curve_north
        : regionCluster === 'south'
            ? profile.curve_south
            : profile.curve_default;
    const fallbackCurveId = profile.curve_default;
    const curveId = sizeCurves.curves[resolvedCurveId] ? resolvedCurveId : fallbackCurveId;
    const curve = sizeCurves.curves[curveId] || {};
    const band = sizeRuleMatrix.band_definitions[profile.band_definition];

    const entries = Object.entries(curve)
        .map(([size, qty]) => ({ size, qty: Math.max(0, Number(qty) || 0) }))
        .sort((a, b) => Number(a.size) - Number(b.size));
    const totalQty = entries.reduce((sum, item) => sum + item.qty, 0);
    const primary = entries.reduce(
        (best, item) => (item.qty > best.qty ? item : best),
        entries[0] || { size: String(band?.core?.[0] || ''), qty: 0 },
    );
    const coreSet = new Set((band?.core || []).map((size) => String(size)));
    const edgeSet = new Set([...(band?.small || []), ...(band?.large || [])].map((size) => String(size)));
    const coreQty = entries.reduce((sum, item) => sum + (coreSet.has(item.size) ? item.qty : 0), 0);
    const edgeQty = entries.reduce((sum, item) => sum + (edgeSet.has(item.size) ? item.qty : 0), 0);

    return {
        curveId,
        primarySize: primary.size || String(band?.core?.[0] || ''),
        coreShare: safeDiv(coreQty, Math.max(totalQty, 1)),
        edgeShare: safeDiv(edgeQty, Math.max(totalQty, 1)),
    };
}

function resolveEdgeSizeFactor(onlineMix: number, offlineMix: number) {
    const onlineFactor = Number(sizeRuleMatrix.dynamic_adjustments?.channel_bias?.online?.edge_size_factor || 1);
    const offlineFactor = Number(sizeRuleMatrix.dynamic_adjustments?.channel_bias?.offline?.edge_size_factor || 1);
    const totalMix = onlineMix + offlineMix;
    if (totalMix <= 0) return safeDiv(onlineFactor + offlineFactor, 2);
    return safeDiv(onlineMix * onlineFactor + offlineMix * offlineFactor, totalMix);
}

function deriveSizeHealthMetrics(
    sku: DimSkuRecord,
    sellThrough: number,
    pairsSold: number,
    onHandUnits: number,
    northSales: number,
    southSales: number,
    onlineSales: number,
    offlineSales: number,
) {
    const lineType = resolveSizeLineType(sku);
    const gender = resolveSizeGender(sku, lineType);
    const profile = resolveSizeProfile(gender, lineType);
    if (!profile) {
        return {
            sizeCode: '',
            fullSizeRate: 0,
            stockoutRate: 0,
            coreSizeSalesShare: 0,
            lastId: '',
            lastName: '',
            profileId: '',
            curveId: '',
        };
    }

    const regionCluster = resolveDominantRegionCluster(northSales, southSales);
    const curveSummary = summarizeSizeCurve(profile, regionCluster);
    const edgeFactor = resolveEdgeSizeFactor(onlineSales, offlineSales);
    const categoryBias = resolveSizeCategoryBias(sku);
    const inventoryPressure = safeDiv(onHandUnits, Math.max(onHandUnits + pairsSold, 1));
    const demandHeat = clamp(sellThrough - 0.68, -0.2, 0.32);

    let fullSizeRate =
        0.86 -
        curveSummary.edgeShare * 0.18 +
        demandHeat * 0.12 -
        Math.max(0, inventoryPressure - 0.55) * 0.14 -
        Math.max(0, edgeFactor - 1) * 0.08 +
        Math.max(0, 1 - edgeFactor) * 0.03;
    if (categoryBias === 'upsize') fullSizeRate -= 0.02;
    if (categoryBias === 'fit_strict') fullSizeRate -= 0.01;
    fullSizeRate = clamp(fullSizeRate, 0.52, 0.96);

    let stockoutRate = 1 - fullSizeRate + Math.max(0, demandHeat) * 0.12;
    if (categoryBias === 'upsize') stockoutRate += 0.02;
    if (categoryBias === 'fit_strict') stockoutRate -= 0.01;
    stockoutRate = clamp(stockoutRate, 0.04, 0.45);

    let coreSizeSalesShare =
        curveSummary.coreShare +
        Math.max(0, demandHeat) * 0.06 -
        Math.max(0, stockoutRate - 0.2) * 0.18;
    if (categoryBias === 'fit_strict') coreSizeSalesShare += 0.03;
    coreSizeSalesShare = clamp(coreSizeSalesShare, 0.42, 0.88);

    return {
        sizeCode: curveSummary.primarySize,
        fullSizeRate,
        stockoutRate,
        coreSizeSalesShare,
        lastId: `${gender}_${lineType}`,
        lastName: sku.product_line || sku.category_l2 || sku.category_name || '标准楦型',
        profileId: profile.profile_id,
        curveId: curveSummary.curveId,
    };
}

function resolveLifecycleScopeFilters(
    filters: DashboardFilters,
    forcedYear: number | null,
    forcedSeason: string | null = null,
    forcedWave: string | null = null,
) {
    return {
        season_year: forcedYear === null ? filters.season_year : forcedYear,
        season: forcedSeason ?? filters.season,
        wave: forcedWave ?? filters.wave,
    };
}

function normalizeLifecycle(
    filters: DashboardFilters,
    sku: Pick<DimSkuRecord, 'season_year' | 'season' | 'lifecycle'>,
    forcedYear: number | null = null,
    forcedSeason: string | null = null,
    forcedWave: string | null = null,
): LifecycleKey {
    return resolveDashboardLifecycleLabel(
        resolveLifecycleScopeFilters(filters, forcedYear, forcedSeason, forcedWave),
        sku,
    ) as LifecycleKey;
}

function getLifecycleLabel(key: LifecycleKey) {
    return LIFECYCLE_LABEL[key];
}

function getEffectiveInventoryFactor(lifecycle: LifecycleKey) {
    if (lifecycle === '\u65b0\u54c1') return 0.95;
    if (lifecycle === '\u8001\u54c1') return 0.85;
    return 0.72;
}

function createLifecycleSkuSet(): Record<LifecycleKey, Set<string>> {
    return {
        '\u65b0\u54c1': new Set<string>(),
        '\u6b21\u65b0\u54c1': new Set<string>(),
        '\u8001\u54c1': new Set<string>(),
    };
}

function resolvePrimaryLifecycle(lifecycleSkuSet: Record<LifecycleKey, Set<string>>): LifecycleKey {
    const entries = (Object.keys(lifecycleSkuSet) as LifecycleKey[]).map((key) => ({
        key,
        count: lifecycleSkuSet[key].size,
    }));
    entries.sort((a, b) => b.count - a.count);
    return entries[0]?.count > 0 ? entries[0].key : '\u6b21\u65b0\u54c1';
}
function resolveMomBaseline(filters: DashboardFilters) {
    const selectedYear = filters.season_year === 'all' ? 2025 : Number(filters.season_year);
    if (!Number.isFinite(selectedYear)) return null;
    return resolveDashboardMomBaseline(filters, selectedYear, 'category');
}

function getBucketSellThrough(bucket: AggregateBucket, sellThroughMode: SellThroughMode) {
    const weighted = sellThroughMode === 'effective' ? bucket.effectiveStWeighted : bucket.cumulativeStWeighted;
    return safeDiv(weighted, bucket.stWeight);
}

function getAggregationAvgSellThrough(aggregation: AggregationResult, sellThroughMode: SellThroughMode) {
    const cells = Array.from(aggregation.cellMap.values());
    const totalSales = cells.reduce((sum, bucket) => sum + bucket.netSales, 0);
    if (totalSales <= 0) return 0;
    return safeDiv(
        cells.reduce((sum, bucket) => sum + getBucketSellThrough(bucket, sellThroughMode) * bucket.netSales, 0),
        totalSales,
    );
}

function buildAggregationProductStats(aggregation: AggregationResult) {
    const cells = Array.from(aggregation.cellMap.values());
    const totalSales = aggregation.totalNetSales;
    const totalPairs = aggregation.totalPairs;

    const grossProfit = cells.reduce((sum, bucket) => {
        const gmRate = safeDiv(bucket.gmWeighted, Math.max(bucket.gmWeight, 1));
        return sum + bucket.netSales * gmRate;
    }, 0);

    const discountRate = safeDiv(
        cells.reduce((sum, bucket) => {
            const weightedDiscount = safeDiv(bucket.discountWeighted, Math.max(bucket.discountWeight, 1));
            return sum + weightedDiscount * bucket.netSales;
        }, 0),
        Math.max(totalSales, 1),
    );

    return {
        netSales: totalSales,
        pairsSold: totalPairs,
        grossProfit,
        gmRate: safeDiv(grossProfit, Math.max(totalSales, 1)),
        discountRate,
        effectiveSellThrough: getAggregationAvgSellThrough(aggregation, 'effective'),
        cumulativeSellThrough: getAggregationAvgSellThrough(aggregation, 'cumulative'),
        activeSku: aggregation.activeSkuSet.size,
        totalSku: aggregation.scopedSkuSet.size,
        storeCount: aggregation.activeStoreSet.size,
    };
}

function matchesTargetAudience(sku: DimSkuRecord, selectedAudience: string | 'all') {
    return matchesAudienceFilter(sku.target_audience, sku.target_age_group, selectedAudience);
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
    forcedWave: string | null = null,
) {
    if (forcedYear !== null) {
        if (Number(sale.season_year) !== forcedYear) return false;
    } else if (filters.season_year !== 'all' && String(sale.season_year) !== String(filters.season_year)) {
        return false;
    }

    const seasonFilter = forcedSeason ?? filters.season;
    const waveFilter = forcedWave ?? filters.wave;
    if (!matchesDashboardSeasonFilter(seasonFilter, sale.wave, sale.season)) return false;
    if (waveFilter !== 'all' && sale.wave !== waveFilter) return false;
    if (!matchesDashboardSkuCategoryFilters(filters, sku)) return false;
    if (filters.channel_type !== 'all' && channel.channel_type !== filters.channel_type) return false;
    const lifecycle = normalizeLifecycle(filters, sku, forcedYear, forcedSeason, forcedWave);
    if (filters.lifecycle !== 'all' && lifecycle !== filters.lifecycle) return false;
    if (filters.region !== 'all' && channel.region !== filters.region) return false;
    if (filters.city_tier !== 'all' && channel.city_tier !== filters.city_tier) return false;
    if (filters.store_format !== 'all' && channel.store_format !== filters.store_format) return false;
    if (!matchesTargetAudience(sku, filters.target_audience)) return false;
    if (!matchesColor(sku, filters.color)) return false;
    if (!matchesPriceBandFilter(sku.msrp, filters.price_band, sku.price_band)) return false;

    return true;
}

function createBucket(
    key: string,
    productLine: string,
    categoryId: string,
    categoryFilterId: string,
    category: string,
    priceBand: string,
): AggregateBucket {
    return {
        key,
        productLine,
        categoryId,
        categoryFilterId,
        category,
        priceBand,
        netSales: 0,
        pairsSold: 0,
        cumulativeStWeighted: 0,
        effectiveStWeighted: 0,
        stWeight: 0,
        gmWeighted: 0,
        gmWeight: 0,
        discountWeighted: 0,
        discountWeight: 0,
        onHandUnits: 0,
        demandPairs: 0,
        shipPairs: 0,
        reorderPairs: 0,
        skuSet: new Set<string>(),
        storeSet: new Set<string>(),
        lifecycleSkuSet: createLifecycleSkuSet(),
    };
}

function aggregateSales(
    filters: DashboardFilters,
    skuMap: Map<string, DimSkuRecord>,
    channelMap: Map<string, DimChannelRecord>,
    forcedYear: number | null,
    forcedSeason: string | null = null,
    forcedWave: string | null = null,
    categoryLevel: CategoryLevel = 'l1',
) {
    const categoryMap = new Map<string, AggregateBucket>();
    const cellMap = new Map<string, AggregateBucket>();
    const scopedSkuSet = new Set<string>();
    const scopedStoreSet = new Set<string>();
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
        if (!shouldIncludeRecord(sale, sku, channel, filters, forcedYear, forcedSeason, forcedWave)) return;

        const categoryMeta = resolveFootwearCategory(
            sku.category_name,
            sku.category_id,
            sku.sku_name,
            sku.category_l2,
            sku.product_line,
        );
        const categoryFilterId = categoryMeta.categoryL1 || sku.category_id || 'unknown';
        const categoryL1 = categoryMeta.categoryL1 || sku.category_name || categoryFilterId || '未定义品类';
        const categoryL2 = categoryMeta.categoryL2 || categoryL1;
        const categoryId = categoryLevel === 'l2'
            ? `${categoryFilterId}__${categoryL2}`
            : categoryFilterId;
        const category = categoryLevel === 'l2' ? categoryL2 : categoryL1;
        const productLine = categoryMeta.categoryL1 || '未定义产品线';
        const priceBand = normalizePriceBandKey(sku.price_band || resolvePriceBandByMsrp(sku.msrp));

        const categoryKey = `${productLine}__${categoryId}`;
        const cellKey = `${categoryId}__${priceBand}`;

        if (!categoryMap.has(categoryKey)) {
            categoryMap.set(
                categoryKey,
                createBucket(categoryKey, productLine, categoryId, categoryFilterId, category, 'ALL'),
            );
        }
        if (!cellMap.has(cellKey)) {
            cellMap.set(
                cellKey,
                createBucket(cellKey, productLine, categoryId, categoryFilterId, category, priceBand),
            );
        }

        const categoryBucket = categoryMap.get(categoryKey);
        const cellBucket = cellMap.get(cellKey);
        if (!categoryBucket || !cellBucket) return;

        const units = Math.max(0, sale.unit_sold || 0);
        const sales = Math.max(0, sale.net_sales_amt || 0);
        const stWeight = Math.max(units, 1);
        const gmWeight = Math.max(sales, 1);
        const lifecycle = normalizeLifecycle(filters, sku, forcedYear, forcedSeason, forcedWave);
        const onHandUnits = Math.max(0, sale.on_hand_unit || 0);
        const effectiveInventoryFactor = getEffectiveInventoryFactor(lifecycle);
        const effectiveSellThrough = safeDiv(units, units + onHandUnits * effectiveInventoryFactor);
        const cumulativeSellThrough = sale.cumulative_sell_through || 0;
        const inventoryPressure = safeDiv(onHandUnits, onHandUnits + units);
        const sellThroughProxy = clamp(cumulativeSellThrough || 0.72, 0.55, 0.9);
        const opsRecord = factOpsMap.get(buildDashboardOpsRecordKey(sale));
        const demandPairs = Math.max(0, Number(opsRecord?.demand_pairs) || safeDiv(units, Math.max(sellThroughProxy, 0.05)));
        const fillRate = demandPairs > 0
            ? (Number(opsRecord?.fill_rate) || deriveFillRate(sellThroughProxy, 0, inventoryPressure))
            : 0;
        const shipPairs = Math.max(0, Number(opsRecord?.ship_pairs) || demandPairs * fillRate);
        const reorderRate = demandPairs > 0
            ? (Number(opsRecord?.reorder_rate) || deriveReorderRate(fillRate, 0, inventoryPressure))
            : 0;
        const reorderPairs = Math.max(0, Number(opsRecord?.reorder_pairs) || demandPairs * reorderRate);

        categoryBucket.netSales += sales;
        categoryBucket.pairsSold += units;
        categoryBucket.cumulativeStWeighted += cumulativeSellThrough * stWeight;
        categoryBucket.effectiveStWeighted += effectiveSellThrough * stWeight;
        categoryBucket.stWeight += stWeight;
        categoryBucket.gmWeighted += (sale.gross_margin_rate || 0) * gmWeight;
        categoryBucket.gmWeight += gmWeight;
        categoryBucket.discountWeighted += (sale.discount_rate || 0) * gmWeight;
        categoryBucket.discountWeight += gmWeight;
        categoryBucket.demandPairs += demandPairs;
        categoryBucket.shipPairs += shipPairs;
        categoryBucket.reorderPairs += reorderPairs;
        categoryBucket.skuSet.add(sale.sku_id);
        categoryBucket.storeSet.add(sale.channel_id);
        categoryBucket.lifecycleSkuSet[lifecycle].add(sale.sku_id);

        cellBucket.netSales += sales;
        cellBucket.pairsSold += units;
        cellBucket.cumulativeStWeighted += cumulativeSellThrough * stWeight;
        cellBucket.effectiveStWeighted += effectiveSellThrough * stWeight;
        cellBucket.stWeight += stWeight;
        cellBucket.gmWeighted += (sale.gross_margin_rate || 0) * gmWeight;
        cellBucket.gmWeight += gmWeight;
        cellBucket.discountWeighted += (sale.discount_rate || 0) * gmWeight;
        cellBucket.discountWeight += gmWeight;
        cellBucket.demandPairs += demandPairs;
        cellBucket.shipPairs += shipPairs;
        cellBucket.reorderPairs += reorderPairs;
        cellBucket.skuSet.add(sale.sku_id);
        cellBucket.storeSet.add(sale.channel_id);
        cellBucket.lifecycleSkuSet[lifecycle].add(sale.sku_id);
        scopedSkuSet.add(sale.sku_id);
        scopedStoreSet.add(sale.channel_id);
        if (units > 0 || sales > 0) {
            activeSkuSet.add(sale.sku_id);
            activeStoreSet.add(sale.channel_id);
        }

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
        scopedSkuSet,
        scopedStoreSet,
        activeSkuSet,
        activeStoreSet,
    };
}

function aggregateSellThroughTrend(
    filters: DashboardFilters,
    skuMap: Map<string, DimSkuRecord>,
    channelMap: Map<string, DimChannelRecord>,
    forcedYear: number | null,
    forcedSeason: string | null = null,
    forcedWave: string | null = null,
) {
    const trendMap = new Map<string, SellThroughTrendBucket>();

    factSales.forEach((sale) => {
        const sku = skuMap.get(sale.sku_id);
        const channel = channelMap.get(sale.channel_id);
        if (!sku || !channel) return;
        if (!shouldIncludeRecord(sale, sku, channel, filters, forcedYear, forcedSeason, forcedWave)) return;

        const lifecycle = normalizeLifecycle(filters, sku, forcedYear, forcedSeason, forcedWave);
        const units = Math.max(0, sale.unit_sold || 0);
        const weight = Math.max(units, 1);
        const onHandUnits = Math.max(0, sale.on_hand_unit || 0);
        const effectiveInventoryFactor = getEffectiveInventoryFactor(lifecycle);
        const effectiveSellThrough = safeDiv(units, units + onHandUnits * effectiveInventoryFactor);
        const cumulativeSellThrough = clamp(sale.cumulative_sell_through || 0, 0, 1);
        const wave = sale.wave || '未知波段';
        const weekNum = Number(sale.week_num) || 0;
        const key = `${wave}__${weekNum}`;
        const label = `W${weekNum} · ${wave}`;

        if (!trendMap.has(key)) {
            trendMap.set(key, {
                key,
                label,
                weekNum,
                wave,
                cumulativeWeighted: 0,
                effectiveWeighted: 0,
                weight: 0,
            });
        }

        const bucket = trendMap.get(key);
        if (!bucket) return;
        bucket.cumulativeWeighted += cumulativeSellThrough * weight;
        bucket.effectiveWeighted += effectiveSellThrough * weight;
        bucket.weight += weight;
    });

    return trendMap;
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

interface OperationalInferenceTotals {
    demandPairs: number;
    shipPairs: number;
    avgFillRate: number;
    avgReorderRate: number;
}

function inferOperationalTotals(
    filters: DashboardFilters,
    skuMap: Map<string, DimSkuRecord>,
    channelMap: Map<string, DimChannelRecord>,
    opsMap: Map<string, DashboardOpsFactRecord>,
    forcedYear: number | null,
    forcedSeason: string | null = null,
    forcedWave: string | null = null,
): OperationalInferenceTotals {
    let demandPairs = 0;
    let shipPairs = 0;
    let fillWeighted = 0;
    let reorderWeighted = 0;
    let weight = 0;

    factSales.forEach((sale) => {
        const sku = skuMap.get(sale.sku_id);
        const channel = channelMap.get(sale.channel_id);
        if (!sku || !channel) return;
        if (!shouldIncludeRecord(sale, sku, channel, filters, forcedYear, forcedSeason, forcedWave)) return;

        const units = Math.max(0, sale.unit_sold || 0);
        const onHandUnits = Math.max(0, sale.on_hand_unit || 0);
        const opsRecord = opsMap.get(buildDashboardOpsRecordKey(sale));
        const sellThroughProxy = clamp(sale.cumulative_sell_through || 0.72, 0.55, 0.9);
        const inventoryPressure = safeDiv(onHandUnits, onHandUnits + units);
        const demand = Number(opsRecord?.demand_pairs || safeDiv(units, sellThroughProxy));
        const ship = Number(opsRecord?.ship_pairs || 0) || demand * deriveFillRate(sellThroughProxy, 0, inventoryPressure);
        const fillRate = demand > 0 ? Number(opsRecord?.fill_rate || 0) || safeDiv(ship, demand) : 0;
        const reorderRate = demand > 0
            ? Number(opsRecord?.reorder_rate || 0) || deriveReorderRate(fillRate, 0, inventoryPressure)
            : 0;
        const inferenceWeight = Math.max(demand, 1);

        demandPairs += demand;
        shipPairs += ship;
        fillWeighted += fillRate * inferenceWeight;
        reorderWeighted += reorderRate * inferenceWeight;
        weight += inferenceWeight;
    });

    return {
        demandPairs,
        shipPairs,
        avgFillRate: safeDiv(fillWeighted, weight),
        avgReorderRate: safeDiv(reorderWeighted, weight),
    };
}

interface BaselineMetric {
    netSales: number;
    cumulativeSellThrough: number | null;
    effectiveSellThrough: number | null;
    storeCount: number;
    demandPairs?: number | null;
    shipPairs?: number | null;
    reorderPairs?: number | null;
    fillRate?: number | null;
    reorderRate?: number | null;
}

interface BaselineSnapshot {
    categoryMap: Map<string, BaselineMetric>;
    cellMap: Map<string, BaselineMetric>;
    totals: CategoryOpsBaselineTotals;
}

function buildBaselineFromAggregation(aggregation: AggregationResult, sellThroughMode: SellThroughMode): BaselineSnapshot {
    const categoryMap = new Map<string, BaselineMetric>();
    const cellMap = new Map<string, BaselineMetric>();
    const productStats = buildAggregationProductStats(aggregation);

    aggregation.categoryMap.forEach((bucket) => {
        categoryMap.set(bucket.key, {
            netSales: bucket.netSales,
            cumulativeSellThrough: safeDiv(bucket.cumulativeStWeighted, bucket.stWeight),
            effectiveSellThrough: safeDiv(bucket.effectiveStWeighted, bucket.stWeight),
            storeCount: bucket.storeSet.size,
            demandPairs: bucket.demandPairs,
            shipPairs: bucket.shipPairs,
            reorderPairs: bucket.reorderPairs,
            fillRate: safeDiv(bucket.shipPairs, bucket.demandPairs),
            reorderRate: safeDiv(bucket.reorderPairs, bucket.demandPairs),
        });
    });

    aggregation.cellMap.forEach((bucket) => {
        cellMap.set(bucket.key, {
            netSales: bucket.netSales,
            cumulativeSellThrough: safeDiv(bucket.cumulativeStWeighted, bucket.stWeight),
            effectiveSellThrough: safeDiv(bucket.effectiveStWeighted, bucket.stWeight),
            storeCount: bucket.storeSet.size,
            demandPairs: bucket.demandPairs,
            shipPairs: bucket.shipPairs,
            reorderPairs: bucket.reorderPairs,
            fillRate: safeDiv(bucket.shipPairs, bucket.demandPairs),
            reorderRate: safeDiv(bucket.reorderPairs, bucket.demandPairs),
        });
    });

    return {
        categoryMap,
        cellMap,
        totals: {
            netSales: aggregation.totalNetSales,
            pairsSold: aggregation.totalPairs,
            avgSellThrough: getAggregationAvgSellThrough(aggregation, sellThroughMode),
            activeSku: aggregation.activeSkuSet.size,
            totalSku: aggregation.scopedSkuSet.size,
            storeCount: aggregation.activeStoreSet.size,
            grossProfit: productStats.grossProfit,
            gmRate: productStats.gmRate,
            discountRate: productStats.discountRate,
            effectiveSellThrough: productStats.effectiveSellThrough,
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
    priceBandPlanRows.forEach((row) => bandPlanMap.set(normalizePlanPriceBandKey(row.price_band), row));
    const totalBandPlanSales = priceBandPlanRows.reduce((sum, row) => sum + (row.plan_sales_amt || 0), 0);

    const categoryCurrentSales = new Map<string, number>();
    current.cellMap.forEach((bucket) => {
        categoryCurrentSales.set(
            bucket.categoryFilterId,
            (categoryCurrentSales.get(bucket.categoryFilterId) || 0) + bucket.netSales,
        );
    });
    const categoryCurrentGroupSales = new Map<string, number>();
    current.categoryMap.forEach((bucket) => {
        categoryCurrentGroupSales.set(
            bucket.categoryFilterId,
            (categoryCurrentGroupSales.get(bucket.categoryFilterId) || 0) + bucket.netSales,
        );
    });

    const categoryMap = new Map<string, BaselineMetric>();
    current.categoryMap.forEach((bucket) => {
        const categoryPlan = categoryPlanMap.get(bucket.categoryFilterId);
        const categoryPlanSales = categoryPlan?.plan_sales_amt || 0;
        const shouldSplitPlan = bucket.categoryId !== bucket.categoryFilterId;
        const groupCurrentSales = categoryCurrentGroupSales.get(bucket.categoryFilterId) || 0;
        const groupShare = shouldSplitPlan && groupCurrentSales > 0
            ? safeDiv(bucket.netSales, groupCurrentSales)
            : 1;
        categoryMap.set(bucket.key, {
            netSales: categoryPlanSales * groupShare,
            cumulativeSellThrough: categoryPlan?.plan_sell_through ?? null,
            effectiveSellThrough: categoryPlan?.plan_sell_through ?? null,
            storeCount: bucket.storeSet.size,
        });
    });

    const cellMap = new Map<string, BaselineMetric>();
    current.cellMap.forEach((bucket) => {
        const categoryPlan = categoryPlanMap.get(bucket.categoryFilterId);
        const categoryPlanSales = categoryPlan?.plan_sales_amt || 0;

        const currentCategoryTotal = categoryCurrentSales.get(bucket.categoryFilterId) || 0;
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
            cumulativeSellThrough: planSellThrough,
            effectiveSellThrough: planSellThrough,
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
            totalSku: Number(overallPlan?.plan_active_skus || categoryPlanTotalSkus || 0),
            storeCount: current.activeStoreSet.size,
            grossProfit: null,
            gmRate: null,
            discountRate: null,
            effectiveSellThrough: Number.isFinite(planAvgSellThrough) ? Number(planAvgSellThrough) : null,
        },
    };
}

function buildSunburstData(rows: CategoryHeatCell[]): CategoryOpsSunburstNode[] {
    type CategoryAgg = {
        id: string;
        name: string;
        value: number;
        sellThroughWeighted: number;
    };
    type LineAgg = {
        name: string;
        categories: Map<string, CategoryAgg>;
    };

    const lineMap = new Map<string, LineAgg>();

    rows.forEach((row) => {
        if (!lineMap.has(row.productLine)) {
            lineMap.set(row.productLine, {
                name: row.productLine,
                categories: new Map<string, CategoryAgg>(),
            });
        }
        const lineAgg = lineMap.get(row.productLine);
        if (!lineAgg) return;

        const categoryKey = row.categoryId || row.category;
        const currentAgg = lineAgg.categories.get(categoryKey) || {
            id: categoryKey,
            name: row.category,
            value: 0,
            sellThroughWeighted: 0,
        };

        currentAgg.value += row.netSales;
        currentAgg.sellThroughWeighted += row.sellThrough * row.netSales;
        lineAgg.categories.set(categoryKey, currentAgg);
    });

    return Array.from(lineMap.values())
        .map((lineAgg) => {
            const children = Array.from(lineAgg.categories.values())
                .map((item) => ({
                    name: item.name,
                    value: item.value,
                    sellThrough: safeDiv(item.sellThroughWeighted, item.value),
                }))
                .sort((a, b) => b.value - a.value);

            const totalValue = children.reduce((sum, item) => sum + item.value, 0);
            const weightedSellThrough = children.reduce((sum, item) => sum + item.sellThrough * item.value, 0);

            return {
                name: lineAgg.name,
                value: totalValue,
                sellThrough: safeDiv(weightedSellThrough, totalValue),
                children,
            };
        })
        .sort((a, b) => b.value - a.value);
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

function quantile(values: number[], q: number) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * clamp(q, 0, 1);
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
}

type SkuActionAgg = {
    skuId: string;
    skuName: string;
    skuMeta: DimSkuRecord;
    categoryId: string;
    categoryFilterId: string;
    category: string;
    priceBand: string;
    lifecycle: LifecycleKey;
    netSales: number;
    pairsSold: number;
    cumulativeStWeighted: number;
    effectiveStWeighted: number;
    stWeight: number;
    gmWeighted: number;
    gmWeight: number;
    discountWeighted: number;
    discountWeight: number;
    onHandUnits: number;
    northSales: number;
    southSales: number;
    onlineSales: number;
    offlineSales: number;
};

function buildSkuActionRows(
    filters: DashboardFilters,
    skuMap: Map<string, DimSkuRecord>,
    channelMap: Map<string, DimChannelRecord>,
    avgSellThrough: number,
    sellThroughMode: SellThroughMode,
    categoryLevel: CategoryLevel,
): CategoryOpsSkuActionRow[] {
    const skuMapAgg = new Map<string, SkuActionAgg>();
    const latestInventoryBySkuChannel = new Map<string, { weekNum: number; onHandUnits: number }>();

    factSales.forEach((sale) => {
        const sku = skuMap.get(sale.sku_id);
        const channel = channelMap.get(sale.channel_id);
        if (!sku || !channel) return;
        if (!shouldIncludeRecord(sale, sku, channel, filters, null, null)) return;

        const categoryMeta = resolveFootwearCategory(
            sku.category_name,
            sku.category_id,
            sku.sku_name,
            sku.category_l2,
            sku.product_line,
        );
        const categoryFilterId = categoryMeta.categoryL1 || sku.category_id || 'unknown';
        const categoryL1 = categoryMeta.categoryL1 || sku.category_name || categoryFilterId || '未定义品类';
        const categoryL2 = categoryMeta.categoryL2 || categoryL1;
        const resolvedCategoryId = categoryLevel === 'l2'
            ? `${categoryFilterId}__${categoryL2}`
            : categoryFilterId;
        const resolvedCategory = categoryLevel === 'l2' ? categoryL2 : categoryL1;

        const row = skuMapAgg.get(sale.sku_id) || {
            skuId: sale.sku_id,
            skuName: sku.sku_name || sale.sku_id,
            skuMeta: sku,
            categoryId: resolvedCategoryId,
            categoryFilterId,
            category: resolvedCategory,
            priceBand: sku.price_band || 'PBX',
            lifecycle: normalizeLifecycle(filters, sku),
            netSales: 0,
            pairsSold: 0,
            cumulativeStWeighted: 0,
            effectiveStWeighted: 0,
            stWeight: 0,
            gmWeighted: 0,
            gmWeight: 0,
            discountWeighted: 0,
            discountWeight: 0,
            onHandUnits: 0,
            northSales: 0,
            southSales: 0,
            onlineSales: 0,
            offlineSales: 0,
        };

        const units = Math.max(0, sale.unit_sold || 0);
        const sales = Math.max(0, sale.net_sales_amt || 0);
        const stWeight = Math.max(units, 1);
        const discountWeight = Math.max(sales, 1);
        const onHandUnits = Math.max(0, sale.on_hand_unit || 0);
        const effectiveInventoryFactor = getEffectiveInventoryFactor(row.lifecycle);
        const effectiveSellThrough = safeDiv(units, units + onHandUnits * effectiveInventoryFactor);

        row.netSales += sales;
        row.pairsSold += units;
        row.cumulativeStWeighted += (sale.cumulative_sell_through || 0) * stWeight;
        row.effectiveStWeighted += effectiveSellThrough * stWeight;
        row.stWeight += stWeight;
        row.gmWeighted += (sale.gross_margin_rate || 0) * Math.max(sales, 1);
        row.gmWeight += Math.max(sales, 1);
        row.discountWeighted += (sale.discount_rate || 0) * discountWeight;
        row.discountWeight += discountWeight;
        const mixWeight = Math.max(sales, units, 1);
        const regionCluster = normalizeRegionCluster(channel.region);
        if (regionCluster === 'north') row.northSales += mixWeight;
        if (regionCluster === 'south') row.southSales += mixWeight;
        const channelBias = normalizeChannelBias(channel.channel_type);
        if (channelBias === 'online') row.onlineSales += mixWeight;
        else row.offlineSales += mixWeight;

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
            const sellThrough = sellThroughMode === 'effective'
                ? safeDiv(row.effectiveStWeighted, row.stWeight)
                : safeDiv(row.cumulativeStWeighted, row.stWeight);
            const discountRate = safeDiv(row.discountWeighted, row.discountWeight);
            const gmRate = safeDiv(row.gmWeighted, row.gmWeight);
            const stockToSales = safeDiv(row.onHandUnits, Math.max(row.pairsSold, 1));
            const fillRate = deriveFillRate(sellThrough, 0, safeDiv(row.onHandUnits, row.onHandUnits + row.pairsSold));
            const sizeMetrics = deriveSizeHealthMetrics(
                row.skuMeta,
                sellThrough,
                row.pairsSold,
                row.onHandUnits,
                row.northSales,
                row.southSales,
                row.onlineSales,
                row.offlineSales,
            );

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
                categoryFilterId: row.categoryFilterId,
                category: row.category,
                skuName: row.skuName,
                priceBand: row.priceBand,
                priceBandLabel: formatPriceBandLabel(row.priceBand),
                pairsSold: row.pairsSold,
                netSales: row.netSales,
                sellThrough,
                onHandUnits: row.onHandUnits,
                discountRate,
                gmRate,
                lifecycle: row.lifecycle,
                lifecycleLabel: getLifecycleLabel(row.lifecycle),
                action,
                reason,
                size: sizeMetrics.sizeCode,
                size_code: sizeMetrics.sizeCode,
                full_size_rate: sizeMetrics.fullSizeRate,
                stockout_rate: sizeMetrics.stockoutRate,
                core_size_sales_share: sizeMetrics.coreSizeSalesShare,
                last_id: sizeMetrics.lastId,
                last_name: sizeMetrics.lastName,
                size_profile_id: sizeMetrics.profileId,
                size_curve_id: sizeMetrics.curveId,
            } satisfies CategoryOpsSkuActionRow;
        })
        .sort((a, b) => b.netSales - a.netSales);
}

export function useCategoryOps(
    filters: DashboardFilters,
    heatmapXAxis: CategoryOpsHeatXAxis = 'element',
    sellThroughMode: SellThroughMode = 'effective',
    compareMode: CompareMode = 'none',
    categoryLevel: CategoryLevel = 'l1',
) {
    return useMemo(() => {
        const skuMap = new Map<string, DimSkuRecord>();
        dimSku.forEach((item) => skuMap.set(item.sku_id, item));

        const channelMap = new Map<string, DimChannelRecord>();
        dimChannel.forEach((item) => channelMap.set(item.channel_id, item));

        const current = aggregateSales(filters, skuMap, channelMap, null, null, null, categoryLevel);
        const planSnapshot = buildPlanBaseline(current);
        const compareMetaConfig = getDashboardCompareMeta(compareMode, filters, 'category');
        const modeLabel = compareMetaConfig.modeLabel;
        const deltaLabel = compareMetaConfig.deltaLabel;
        const selectedYear = Number(filters.season_year);
        const sellThroughLabel = sellThroughMode === 'effective' ? '有效售罄率' : '累计售罄率';

        let baselineSnapshot: BaselineSnapshot | null = null;
        let baselineProductStats: ReturnType<typeof buildAggregationProductStats> | null = null;
        let baselineForcedYear: number | null = null;
        let baselineForcedSeason: string | null = null;
        let baselineForcedWave: string | null = null;
        let baselineLabel = '无基线';
        let note =
            `无对比模式：当前值展示，不计算同期差值。当前售罄口径：${sellThroughLabel}。执行率/补单率为运营事实口径（mock fact_ops；fill_rate=ship/demand，reorder_rate=reorder/demand）。`;

        if (compareMode === 'yoy') {
            const baselineYear = Number.isFinite(selectedYear) ? selectedYear - 1 : null;
            if (baselineYear !== null) {
                baselineForcedYear = baselineYear;
                baselineForcedSeason = null;
                const baselineAggregation = aggregateSales(
                    filters,
                    skuMap,
                    channelMap,
                    baselineYear,
                    null,
                    categoryLevel,
                );
                baselineSnapshot = buildBaselineFromAggregation(baselineAggregation, sellThroughMode);
                baselineProductStats = buildAggregationProductStats(baselineAggregation);
                baselineLabel = `${baselineYear}年同期`;
                note = baselineSnapshot.totals.netSales > 0
                    ? `同比口径：基线为去年同期同筛选样本；当前售罄口径：${sellThroughLabel}；执行率/补单率为运营事实口径。`
                    : '同比口径：当前筛选缺少去年同期样本，差值项显示为 0。';
            } else {
                note = '同比口径：当前年份未锁定，无法构建去年同期基线。';
            }
        } else if (compareMode === 'mom') {
            const momBaseline = resolveMomBaseline(filters);
            if (momBaseline) {
                baselineForcedYear = momBaseline.year;
                baselineForcedSeason = momBaseline.season;
                baselineForcedWave = momBaseline.wave === 'all' ? null : momBaseline.wave;
                const baselineAggregation = aggregateSales(
                    filters,
                    skuMap,
                    channelMap,
                    momBaseline.year,
                    momBaseline.season,
                    baselineForcedWave,
                    categoryLevel,
                );
                baselineSnapshot = buildBaselineFromAggregation(baselineAggregation, sellThroughMode);
                baselineProductStats = buildAggregationProductStats(baselineAggregation);
                baselineLabel = momBaseline.label;
                note = baselineSnapshot.totals.netSales > 0
                    ? (momBaseline.basis === 'wave'
                        ? `环比口径：基线为上波段同筛选样本；当前售罄口径：${sellThroughLabel}；执行率/补单率为运营事实口径。`
                        : `环比口径：基线为上季同筛选样本；当前售罄口径：${sellThroughLabel}；执行率/补单率为运营事实口径。`)
                    : (momBaseline.basis === 'wave'
                        ? '环比口径：当前筛选缺少上波段样本，差值项显示为 0。'
                        : '环比口径：当前筛选缺少上季样本，差值项显示为 0。');
            } else {
                note = compareMetaConfig.disabledReason || '环比口径：请先选择具体季度或波段，再计算较前周期差值。';
            }
        } else if (compareMode === 'plan') {
            baselineSnapshot = planSnapshot;
            baselineLabel = '计划口径';
            baselineProductStats = null;
            note = baselineSnapshot
                ? `计划口径：销售/售罄基线来自 dim_plan；当前售罄口径：${sellThroughLabel}；执行率与补单率为运营事实口径。`
                : '计划口径：当前缺 dim_plan 基线，差值项显示为 0。';
        }

        const hasBaseline = compareMode !== 'none' && !!baselineSnapshot;
        const baselineCategoryMap = baselineSnapshot?.categoryMap || null;
        const baselineCellMap = baselineSnapshot?.cellMap || null;
        const baselineTotals = baselineSnapshot?.totals || null;

        const currentTrendMap = aggregateSellThroughTrend(filters, skuMap, channelMap, null, null, null);
        const baselineTrendMap =
            baselineForcedYear !== null
                ? aggregateSellThroughTrend(filters, skuMap, channelMap, baselineForcedYear, baselineForcedSeason, baselineForcedWave)
                : null;

        const sellThroughTrend = Array.from(currentTrendMap.values())
            .sort((a, b) => {
                if (a.weekNum !== b.weekNum) return a.weekNum - b.weekNum;
                return a.wave.localeCompare(b.wave, 'zh-CN');
            })
            .slice(0, 24)
            .map((bucket) => {
                const baselineBucket = baselineTrendMap?.get(bucket.key);
                return {
                    key: bucket.key,
                    label: bucket.label,
                    weekNum: bucket.weekNum,
                    wave: bucket.wave,
                    cumulativeSellThrough: safeDiv(bucket.cumulativeWeighted, bucket.weight),
                    effectiveSellThrough: safeDiv(bucket.effectiveWeighted, bucket.weight),
                    baselineCumulativeSellThrough: baselineBucket
                        ? safeDiv(baselineBucket.cumulativeWeighted, baselineBucket.weight)
                        : null,
                    baselineEffectiveSellThrough: baselineBucket
                        ? safeDiv(baselineBucket.effectiveWeighted, baselineBucket.weight)
                        : null,
                } satisfies CategoryOpsSellThroughTrendPoint;
            });

        type CategoryRow = {
            id: string;
            categoryId: string;
            categoryFilterId: string;
            category: string;
            productLine: string;
            primaryLifecycle: LifecycleKey;
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
            gmRate: number;
            discountRate: number;
            sellThrough: number;
            cumulativeSellThrough: number;
            effectiveSellThrough: number;
            baselineSellThrough: number | null;
            demandPairs: number;
            shipPairs: number;
            reorderPairs: number;
            baselineDemandPairs: number | null;
            baselineShipPairs: number | null;
            baselineReorderPairs: number | null;
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

                const cumulativeSellThrough = safeDiv(bucket.cumulativeStWeighted, bucket.stWeight);
                const effectiveSellThrough = safeDiv(bucket.effectiveStWeighted, bucket.stWeight);
                const sellThrough = sellThroughMode === 'effective' ? effectiveSellThrough : cumulativeSellThrough;
                const inventoryPressure = safeDiv(bucket.onHandUnits, bucket.onHandUnits + bucket.pairsSold);
                const demandPairs = bucket.demandPairs;
                const shipPairs = bucket.shipPairs;
                const reorderPairs = bucket.reorderPairs;
                const fillRate = safeDiv(shipPairs, demandPairs);
                const reorderRate = safeDiv(reorderPairs, demandPairs);
                const primaryLifecycle = resolvePrimaryLifecycle(bucket.lifecycleSkuSet);

                const baselineSellThrough = hasBaseline
                    ? (sellThroughMode === 'effective'
                        ? baselineMetric?.effectiveSellThrough ?? null
                        : baselineMetric?.cumulativeSellThrough ?? null)
                    : null;
                const baselineDemandPairs = baselineMetric?.demandPairs ?? null;
                const baselineShipPairs = baselineMetric?.shipPairs ?? null;
                const baselineReorderPairs = baselineMetric?.reorderPairs ?? null;
                const demandYoY = hasBaseline && baselineDemandPairs && baselineDemandPairs > 0
                    ? safeDiv(demandPairs - baselineDemandPairs, baselineDemandPairs)
                    : (hasBaseline && baselineNetSales > 0
                        ? safeDiv(bucket.netSales - baselineNetSales, baselineNetSales)
                        : 0);
                const baselineFillRate = baselineMetric?.fillRate
                    ?? (baselineSellThrough === null ? null : deriveFillRate(baselineSellThrough, 0, inventoryPressure));
                const baselineReorderRate = baselineMetric?.reorderRate
                    ?? (baselineFillRate === null ? null : deriveReorderRate(baselineFillRate, 0, inventoryPressure));

                return {
                    id: bucket.key,
                    categoryId: bucket.categoryId,
                    categoryFilterId: bucket.categoryFilterId,
                    category: bucket.category,
                    productLine: bucket.productLine,
                    primaryLifecycle,
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
                    gmRate: safeDiv(bucket.gmWeighted, bucket.gmWeight),
                    discountRate: safeDiv(bucket.discountWeighted, bucket.discountWeight),
                    sellThrough,
                    cumulativeSellThrough,
                    effectiveSellThrough,
                    baselineSellThrough,
                    demandPairs,
                    shipPairs,
                    reorderPairs,
                    baselineDemandPairs,
                    baselineShipPairs,
                    baselineReorderPairs,
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
            categoryFilterId: string;
            category: string;
            productLine: string;
            priceBand: string;
            netSales: number;
            baselineNetSales: number;
            pairsSold: number;
            skcCnt: number;
            asp: number;
            salesPerSkc: number;
            gmRate: number;
            discountRate: number;
            sellThrough: number;
            cumulativeSellThrough: number;
            effectiveSellThrough: number;
            baselineSellThrough: number | null;
            demandPairs: number;
            shipPairs: number;
            reorderPairs: number;
            baselineDemandPairs: number | null;
            baselineShipPairs: number | null;
            baselineReorderPairs: number | null;
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

                const cumulativeSellThrough = safeDiv(bucket.cumulativeStWeighted, bucket.stWeight);
                const effectiveSellThrough = safeDiv(bucket.effectiveStWeighted, bucket.stWeight);
                const sellThrough = sellThroughMode === 'effective' ? effectiveSellThrough : cumulativeSellThrough;
                const inventoryPressure = safeDiv(bucket.onHandUnits, bucket.onHandUnits + bucket.pairsSold);
                const demandPairs = bucket.demandPairs;
                const shipPairs = bucket.shipPairs;
                const reorderPairs = bucket.reorderPairs;
                const fillRate = safeDiv(shipPairs, demandPairs);
                const reorderRate = safeDiv(reorderPairs, demandPairs);

                const baselineSellThrough = hasBaseline
                    ? (sellThroughMode === 'effective'
                        ? baselineMetric?.effectiveSellThrough ?? null
                        : baselineMetric?.cumulativeSellThrough ?? null)
                    : null;
                const baselineDemandPairs = baselineMetric?.demandPairs ?? null;
                const baselineShipPairs = baselineMetric?.shipPairs ?? null;
                const baselineReorderPairs = baselineMetric?.reorderPairs ?? null;
                const demandYoY = hasBaseline && baselineDemandPairs && baselineDemandPairs > 0
                    ? safeDiv(demandPairs - baselineDemandPairs, baselineDemandPairs)
                    : (hasBaseline && baselineNetSales > 0
                        ? safeDiv(bucket.netSales - baselineNetSales, baselineNetSales)
                        : 0);
                const baselineFillRate = baselineMetric?.fillRate
                    ?? (baselineSellThrough === null ? null : deriveFillRate(baselineSellThrough, 0, inventoryPressure));
                const baselineReorderRate = baselineMetric?.reorderRate
                    ?? (baselineFillRate === null ? null : deriveReorderRate(baselineFillRate, 0, inventoryPressure));

                return {
                    id: bucket.key,
                    categoryId: bucket.categoryId,
                    categoryFilterId: bucket.categoryFilterId,
                    category: bucket.category,
                    productLine: bucket.productLine,
                    priceBand: bucket.priceBand,
                    netSales: bucket.netSales,
                    baselineNetSales,
                    pairsSold: bucket.pairsSold,
                    skcCnt: bucket.skuSet.size,
                    asp: safeDiv(bucket.netSales, bucket.pairsSold),
                    salesPerSkc: safeDiv(bucket.netSales, bucket.skuSet.size),
                    gmRate: safeDiv(bucket.gmWeighted, bucket.gmWeight),
                    discountRate: safeDiv(bucket.discountWeighted, bucket.discountWeight),
                    sellThrough,
                    cumulativeSellThrough,
                    effectiveSellThrough,
                    baselineSellThrough,
                    demandPairs,
                    shipPairs,
                    reorderPairs,
                    baselineDemandPairs,
                    baselineShipPairs,
                    baselineReorderPairs,
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
        const totalCellDemand = cellRowsRaw.reduce((sum, item) => sum + item.demandPairs, 0);
        const avgSellThrough = safeDiv(
            cellRowsRaw.reduce((sum, item) => sum + item.sellThrough * item.netSales, 0),
            totalCellSales,
        );
        const avgFillRate = totalCellDemand > 0
            ? safeDiv(
                cellRowsRaw.reduce((sum, item) => sum + item.shipPairs, 0),
                totalCellDemand,
            )
            : safeDiv(
                cellRowsRaw.reduce((sum, item) => sum + item.fillRate * item.netSales, 0),
                totalCellSales,
            );
        const avgReorderRate = totalCellDemand > 0
            ? safeDiv(
                cellRowsRaw.reduce((sum, item) => sum + item.reorderPairs, 0),
                totalCellDemand,
            )
            : safeDiv(
                cellRowsRaw.reduce((sum, item) => sum + item.reorderRate * item.netSales, 0),
                totalCellSales,
            );

        const baselineWeight = cellRowsRaw.reduce((sum, item) => sum + Math.max(item.baselineNetSales, 0), 0);
        const baselineDemandWeight = cellRowsRaw.reduce((sum, item) => sum + Math.max(item.baselineDemandPairs || 0, 0), 0);
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
            ? (baselineDemandWeight > 0
                ? safeDiv(
                    cellRowsRaw.reduce((sum, item) => sum + Math.max(item.baselineShipPairs || 0, 0), 0),
                    baselineDemandWeight,
                )
                : safeDiv(
                    cellRowsRaw.reduce((sum, item) => {
                        if (item.baselineFillRate === null) return sum;
                        return sum + item.baselineFillRate * Math.max(item.baselineNetSales, 0);
                    }, 0),
                    baselineWeight,
                )) || avgFillRate
            : avgFillRate;
        const baselineAvgReorderRate = hasBaseline
            ? (baselineDemandWeight > 0
                ? safeDiv(
                    cellRowsRaw.reduce((sum, item) => sum + Math.max(item.baselineReorderPairs || 0, 0), 0),
                    baselineDemandWeight,
                )
                : safeDiv(
                    cellRowsRaw.reduce((sum, item) => {
                        if (item.baselineReorderRate === null) return sum;
                        return sum + item.baselineReorderRate * Math.max(item.baselineNetSales, 0);
                    }, 0),
                    baselineWeight,
                )) || avgReorderRate
            : avgReorderRate;

        const currentStoreCount = current.activeStoreSet.size;
        const currentActiveSku = current.activeSkuSet.size;
        const currentTotalSku = current.scopedSkuSet.size;
        const currentOperationalTotals = inferOperationalTotals(filters, skuMap, channelMap, factOpsMap, null, null, null);
        const demandPairs = currentOperationalTotals.demandPairs;
        const shipPairs = currentOperationalTotals.shipPairs;
        const shipExecutionRate = currentOperationalTotals.avgFillRate || avgFillRate;
        const sellShipRatio = safeDiv(current.totalPairs, shipPairs);
        const salesPerSkuAmt = safeDiv(current.totalNetSales, currentActiveSku);
        const salesPerStoreAmt = safeDiv(current.totalNetSales, currentStoreCount);
        const activeSkuRatio = safeDiv(currentActiveSku, Math.max(currentTotalSku, 1));

        const baselinePairs = baselineTotals?.pairsSold || 0;
        const baselineSales = baselineTotals?.netSales || 0;
        const baselineStoreCount = baselineTotals?.storeCount || currentStoreCount;
        const baselineActiveSku = baselineProductStats?.activeSku ?? baselineTotals?.activeSku ?? 0;
        const baselineOperationalTotals = hasBaseline && compareMode !== 'plan' && baselineForcedYear !== null
            ? inferOperationalTotals(filters, skuMap, channelMap, factOpsMap, baselineForcedYear, baselineForcedSeason, baselineForcedWave)
            : null;
        const baselineDemandPairs = baselineOperationalTotals?.demandPairs
            ?? safeDiv(baselinePairs, Math.max(baselineAvgSellThrough, 0.05));
        const baselineShipPairs = baselineOperationalTotals?.shipPairs
            ?? (baselineDemandPairs * baselineAvgFillRate);
        const baselineSellShipRatio = safeDiv(baselinePairs, baselineShipPairs);
        const baselineSalesPerSkuAmt = safeDiv(baselineSales, Math.max(baselineActiveSku, 1));
        const baselineSalesPerStoreAmt = safeDiv(baselineSales, Math.max(baselineStoreCount, 1));
        const businessKpis: CategoryOpsBizKpi[] = [
            {
                id: 'ship_pairs',
                title: '发货量',
                value: shipPairs,
                valueKind: 'pairs',
                deltaValue: hasBaseline ? deltaPercent(shipPairs, baselineShipPairs) : null,
                deltaKind: 'percent',
                description: `需求 ${formatPairs(demandPairs)}（基线：${baselineLabel}）`,
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
                title: '销售额（GMV）',
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
                description: `执行率 ${(shipExecutionRate * 100).toFixed(1)}%（基线：${baselineLabel}）`,
            },
            {
                id: 'active_sku_count',
                title: '动销SKU',
                value: currentActiveSku,
                valueKind: 'count',
                deltaValue:
                    hasBaseline && baselineActiveSku > 0 ? deltaPercent(currentActiveSku, baselineActiveSku) : null,
                deltaKind: 'percent',
                description: `总SKU ${currentTotalSku}（占比 ${(activeSkuRatio * 100).toFixed(1)}%）`,
            },
            {
                id: 'sales_per_sku',
                title: '单款销额',
                value: salesPerSkuAmt,
                valueKind: 'amount',
                deltaValue: hasBaseline ? deltaPercent(salesPerSkuAmt, baselineSalesPerSkuAmt) : null,
                deltaKind: 'percent',
                description: `按动销SKU口径（${currentActiveSku}款）`,
            },
            {
                id: 'sales_per_store',
                title: '单店销额',
                value: salesPerStoreAmt,
                valueKind: 'amount',
                deltaValue: hasBaseline ? deltaPercent(salesPerStoreAmt, baselineSalesPerStoreAmt) : null,
                deltaKind: 'percent',
                description: `动销门店 ${currentStoreCount} 家（基线：${baselineLabel}）`,
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
                categoryFilterId: row.categoryFilterId,
                category: row.category,
                productLine: row.productLine,
                priceBand: row.priceBand,
                elementLabel: `${row.category} / ${formatPriceBandLabel(row.priceBand)}`,
                netSales: row.netSales,
                pairsSold: row.pairsSold,
                skcCnt: row.skcCnt,
                gmRate: row.gmRate,
                discountRate: row.discountRate,
                asp: row.asp,
                salesPerSkc: row.salesPerSkc,
                sellThrough: row.sellThrough,
                cumulativeSellThrough: row.cumulativeSellThrough,
                effectiveSellThrough: row.effectiveSellThrough,
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
                .sort((a, b) => getPriceBandSortRank(a.priceBand) - getPriceBandSortRank(b.priceBand))
                .map((cell) => formatPriceBandLabel(cell.priceBand));

            categoryPriceBandMix.set(row.categoryId, topPriceBands.join(' / ') || PRICE_BAND_LABELS.PBX);
        });

        const scatterPoints: CategoryScatterPoint[] = categoryRows.map((row) => ({
            id: row.id,
            categoryId: row.categoryId,
            categoryFilterId: row.categoryFilterId,
            category: row.category,
            productLine: row.productLine,
            contributionShare: safeDiv(row.netSales, Math.max(current.totalNetSales, 1)),
            momentum: hasBaseline ? row.demandYoY : row.sellThrough - avgSellThrough,
            skuCount: row.skcCnt,
            primaryLifecycle: row.primaryLifecycle,
            primaryLifecycleLabel: getLifecycleLabel(row.primaryLifecycle),
            gmRate: row.gmRate,
            asp: row.asp,
            salesPerSkc: row.salesPerSkc,
            netSales: row.netSales,
            sellThrough: row.sellThrough,
            fillRate: row.fillRate,
            reorderRate: row.reorderRate,
            priceBandMix: categoryPriceBandMix.get(row.categoryId) || PRICE_BAND_LABELS.PBX,
        }));

        const scatterReference = {
            contributionShareAvg: safeDiv(1, Math.max(categoryRows.length, 1)),
            momentumAvg: hasBaseline
                ? 0
                : safeDiv(
                    categoryRows.reduce((sum, row) => sum + (row.sellThrough - avgSellThrough), 0),
                    Math.max(categoryRows.length, 1),
                ),
            aspAvg: safeDiv(current.totalNetSales, current.totalPairs),
            salesPerSkcAvg: safeDiv(
                categoryRows.reduce((sum, row) => sum + row.netSales, 0),
                categoryRows.reduce((sum, row) => sum + row.skcCnt, 0),
            ),
        };

        const priceBandKeySet = new Set(heatCells.map((cell) => normalizePriceBandKey(cell.priceBand)));
        const priceBandLabelKeys = Object.keys(PRICE_BAND_LABELS) as Array<keyof typeof PRICE_BAND_LABELS>;
        let orderedPriceBandKeys = priceBandLabelKeys
            .filter((key) => key !== 'PBX' && priceBandKeySet.has(key))
            .sort((a, b) => getPriceBandSortRank(a) - getPriceBandSortRank(b));
        if (!orderedPriceBandKeys.length) {
            orderedPriceBandKeys = Array.from(priceBandKeySet).sort(
                (a, b) => getPriceBandSortRank(a) - getPriceBandSortRank(b),
            );
        }
        if (!orderedPriceBandKeys.length) {
            orderedPriceBandKeys = ['PBX'];
        }

        const heatXLabels = orderedPriceBandKeys.map((key) => formatPriceBandLabel(key));
        const heatYRows = categoryRows.map((row) => ({
            categoryId: row.categoryId,
            categoryFilterId: row.categoryFilterId,
            categoryLabel: row.category,
            productLine: row.productLine,
        }));
        const heatYLabels = heatYRows.map((row) => row.categoryLabel);

        const heatCellLookup = new Map<string, CategoryHeatCell>();
        heatCells.forEach((cell) => {
            const key = `${cell.categoryId}__${normalizePriceBandKey(cell.priceBand)}`;
            heatCellLookup.set(key, cell);
        });

        const heatPoints: CategoryOpsHeatPoint[] = [];
        heatYRows.forEach((row, yIndex) => {
            orderedPriceBandKeys.forEach((priceBandKey, xIndex) => {
                const lookupKey = `${row.categoryId}__${priceBandKey}`;
                const matchedCell = heatCellLookup.get(lookupKey);
                const cell = matchedCell || ({
                    id: lookupKey,
                    categoryId: row.categoryId,
                    categoryFilterId: row.categoryFilterId,
                    category: row.categoryLabel,
                    productLine: row.productLine,
                    priceBand: priceBandKey,
                    elementLabel: `${row.categoryLabel} / ${formatPriceBandLabel(priceBandKey)}`,
                    netSales: 0,
                    pairsSold: 0,
                    skcCnt: 0,
                    gmRate: 0,
                    discountRate: 0,
                    asp: 0,
                    salesPerSkc: 0,
                    sellThrough: 0,
                    cumulativeSellThrough: 0,
                    effectiveSellThrough: 0,
                    fillRate: 0,
                    reorderRate: 0,
                    fillGapPp: 0,
                    reorderGapPp: 0,
                    sellThroughGapPp: 0,
                    demandYoY: 0,
                    onHandUnits: 0,
                    burdenScore: 0,
                } satisfies CategoryHeatCell);

                const metrics: Array<{
                    metricKey: CategoryOpsHeatPoint['metricKey'];
                    metricLabel: string;
                    rawValue: number;
                    chartValue: number;
                }> = [
                    {
                        metricKey: 'sku_count',
                        metricLabel: 'SKU数',
                        rawValue: cell.skcCnt,
                        chartValue: cell.skcCnt,
                    },
                    {
                        metricKey: 'net_sales',
                        metricLabel: '销售额',
                        rawValue: cell.netSales,
                        chartValue: cell.netSales,
                    },
                    {
                        metricKey: 'sell_through',
                        metricLabel: sellThroughLabel,
                        rawValue: cell.sellThrough * 100,
                        chartValue: cell.sellThrough * 100,
                    },
                ];

                metrics.forEach((metric) => {
                    heatPoints.push({
                        id: `${lookupKey}__${metric.metricKey}`,
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
        });

        const metricRange = {
            sku_count: {
                min: 0,
                max: Math.max(1, ...heatPoints.filter((item) => item.metricKey === 'sku_count').map((item) => item.value)),
            },
            net_sales: {
                min: 0,
                max: Math.max(1, ...heatPoints.filter((item) => item.metricKey === 'net_sales').map((item) => item.value)),
            },
            sell_through: {
                min: Math.max(0, Math.floor((Math.min(...heatPoints
                    .filter((item) => item.metricKey === 'sell_through')
                    .map((item) => item.value), 0)) / 5) * 5),
                max: Math.min(100, Math.ceil((Math.max(...heatPoints
                    .filter((item) => item.metricKey === 'sell_through')
                    .map((item) => item.value), 0)) / 5) * 5 || 100),
            },
        };

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
                    categoryFilterId: row.categoryFilterId,
                    category: row.category,
                    deltaNetSales,
                    currentNetSales: row.netSales,
                    baselineNetSales: row.baselineNetSales,
                } satisfies CategoryOpsWaterfallPoint;
            })
            .sort((a, b) => Math.abs(b.deltaNetSales) - Math.abs(a.deltaNetSales))
            .slice(0, 10);

        const skuActionRows = buildSkuActionRows(
            filters,
            skuMap,
            channelMap,
            avgSellThrough,
            sellThroughMode,
            categoryLevel,
        );

        const paretoRows = [...skuActionRows].sort((a, b) => b.netSales - a.netSales);
        const paretoTotal = paretoRows.reduce((sum, row) => sum + row.netSales, 0);
        const paretoAcc = paretoRows.slice(0, 30).reduce(
            (acc, row, index) => {
                const nextSum = acc.sum + row.netSales;
                return {
                    sum: nextSum,
                    points: [
                        ...acc.points,
                        {
                            rank: index + 1,
                            skuId: row.skuId,
                            skuName: row.skuName,
                            category: row.category,
                            netSales: row.netSales,
                            cumulativeShare: safeDiv(nextSum, Math.max(paretoTotal, 1)),
                        } satisfies CategoryOpsParetoPoint,
                    ],
                };
            },
            { sum: 0, points: [] as CategoryOpsParetoPoint[] },
        );
        const paretoPoints = paretoAcc.points;
        const top10ParetoShare = safeDiv(
            paretoRows.slice(0, 10).reduce((sum, row) => sum + row.netSales, 0),
            Math.max(paretoTotal, 1),
        );
        const top20ParetoShare = safeDiv(
            paretoRows.slice(0, 20).reduce((sum, row) => sum + row.netSales, 0),
            Math.max(paretoTotal, 1),
        );

        const depthValues = skuActionRows.map((row) => row.pairsSold);
        const mainThreshold = quantile(depthValues, 0.4);
        const sThreshold = quantile(depthValues, 0.8);
        const segmentSummary = skuActionRows.reduce(
            (acc, row) => {
                if (row.pairsSold >= sThreshold) acc.sCount += 1;
                else if (row.pairsSold >= mainThreshold) acc.mainCount += 1;
                else acc.tailCount += 1;
                return acc;
            },
            {
                sCount: 0,
                mainCount: 0,
                tailCount: 0,
            } as Pick<CategoryOpsDepthSummary, 'sCount' | 'mainCount' | 'tailCount'>,
        );

        const depthBins: CategoryOpsDepthBin[] = [
            { label: '<100双', count: 0, share: 0 },
            { label: '100-299双', count: 0, share: 0 },
            { label: '300-599双', count: 0, share: 0 },
            { label: '600-999双', count: 0, share: 0 },
            { label: '1000+双', count: 0, share: 0 },
        ];

        skuActionRows.forEach((row) => {
            if (row.pairsSold < 100) depthBins[0].count += 1;
            else if (row.pairsSold < 300) depthBins[1].count += 1;
            else if (row.pairsSold < 600) depthBins[2].count += 1;
            else if (row.pairsSold < 1000) depthBins[3].count += 1;
            else depthBins[4].count += 1;
        });
        depthBins.forEach((bin) => {
            bin.share = safeDiv(bin.count, Math.max(skuActionRows.length, 1));
        });

        const depthScatterPoints: CategoryOpsDepthScatterPoint[] = skuActionRows.map((row) => ({
            skuId: row.skuId,
            skuName: row.skuName,
            categoryId: row.categoryId,
            categoryFilterId: row.categoryFilterId,
            category: row.category,
            priceBand: row.priceBandLabel,
            lifecycleLabel: row.lifecycleLabel,
            pairsSold: row.pairsSold,
            sellThrough: row.sellThrough,
            onHandUnits: row.onHandUnits,
            gmRate: row.gmRate,
            discountRate: row.discountRate,
            action: row.action,
        }));

        const totalCategoryGrossProfit = categoryRows.reduce((sum, row) => sum + row.netSales * row.gmRate, 0);
        const otbRawScores = categoryRows.map((row) => {
            const salesShare = safeDiv(row.netSales, Math.max(current.totalNetSales, 1));
            const gmShare = safeDiv(row.netSales * row.gmRate, Math.max(totalCategoryGrossProfit, 1));
            const skuShare = safeDiv(row.skcCnt, Math.max(currentActiveSku, 1));
            const currentWeight = salesShare;
            let score =
                salesShare * 0.45 +
                gmShare * 0.35 +
                Math.max(0, row.sellThrough - avgSellThrough) * 0.2;
            if (hasBaseline) {
                score += Math.max(0, row.demandYoY) * 0.2;
                score -= Math.max(0, -row.demandYoY) * 0.15;
            }
            if (skuShare > salesShare * 1.25) {
                score -= 0.06;
            }
            score = Math.max(score, 0.001);

            const reasonTokens: string[] = [];
            if (hasBaseline && row.demandYoY > 0.05) reasonTokens.push('增长为正');
            if (row.gmRate >= safeDiv(totalCategoryGrossProfit, Math.max(current.totalNetSales, 1))) reasonTokens.push('毛利贡献偏高');
            if (row.sellThrough >= avgSellThrough) reasonTokens.push(`${sellThroughLabel}高于均值`);
            if (hasBaseline && row.demandYoY < -0.05) reasonTokens.push('增长转弱');
            if (skuShare > salesShare * 1.25) reasonTokens.push('SKU占比高于贡献');
            if (!reasonTokens.length) reasonTokens.push('结构基本平衡');

            return {
                categoryId: row.categoryId,
                categoryFilterId: row.categoryFilterId,
                category: row.category,
                salesShare,
                gmShare,
                skuShare,
                currentWeight,
                score,
                reason: reasonTokens.join('、'),
            };
        });

        const otbScoreTotal = otbRawScores.reduce((sum, row) => sum + row.score, 0);
        const otbSuggestions: CategoryOpsOtbSuggestionRow[] = otbRawScores
            .map((row) => {
                const suggestedWeight = safeDiv(row.score, Math.max(otbScoreTotal, 1));
                return {
                    categoryId: row.categoryId,
                    categoryFilterId: row.categoryFilterId,
                    category: row.category,
                    salesShare: row.salesShare,
                    gmShare: row.gmShare,
                    skuShare: row.skuShare,
                    currentWeight: row.currentWeight,
                    suggestedWeight,
                    deltaPp: (suggestedWeight - row.currentWeight) * 100,
                    reason: row.reason,
                };
            })
            .sort((a, b) => b.suggestedWeight - a.suggestedWeight);

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
            const contributionShare = safeDiv(row.netSales, Math.max(current.totalNetSales, 1));
            const highContribution = contributionShare >= scatterReference.contributionShareAvg;
            const highMomentum = hasBaseline ? row.demandYoY >= 0 : row.sellThrough >= avgSellThrough;

            if (highContribution && highMomentum) {
                categoryGroups.cashflow.push(row.category);
            } else if (!highContribution && highMomentum) {
                categoryGroups.potential.push(row.category);
            } else if (highContribution && !highMomentum) {
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

        const decisionRows: CategoryOpsDecisionItem[] = [];
        if (mismatchCell) {
            decisionRows.push({
                id: 'decision-mismatch',
                title: '链路纠偏',
                finding: `${mismatchCell.elementLabel} ${sellThroughLabel} ${(mismatchCell.sellThrough * 100).toFixed(1)}%，执行率 ${(mismatchCell.fillRate * 100).toFixed(1)}%，补单率 ${(mismatchCell.reorderRate * 100).toFixed(1)}%。`,
                decision: mismatchCell.fillGapPp < -2
                    ? '优先补单+调拨，先保核心尺码与高动销门店；同时收缩低效SKU宽度。'
                    : '维持主推节奏，按周监控售罄与补单差异，避免供需错配放大。',
                result: mismatchCell.fillGapPp < -2
                    ? '预计两周内执行率改善 1.5-2.5pp，断码率下降。'
                    : '预计折扣稳定，毛利波动收敛在 1pp 以内。',
            });
        }

        if (topCategory) {
            const contributionShare = safeDiv(topCategory.netSales, Math.max(current.totalNetSales, 1));
            decisionRows.push({
                id: `decision-top-${topCategory.categoryId}`,
                title: '主力品类加深',
                finding: `${topCategory.category} 当前贡献 ${(contributionShare * 100).toFixed(1)}%，${deltaLabel}${(topCategoryDeltaPct || 0).toFixed(1)}%。`,
                decision: '提高主力价带备货深度，优先补核心价位与老品基盘款，减少非主力长尾投放。',
                result: '预计动销效率提升，主力品类售罄可提升 1-2pp。',
            });
        }

        const otbDown = [...otbSuggestions]
            .filter((row) => row.deltaPp < 0)
            .sort((a, b) => a.deltaPp - b.deltaPp)[0] || null;
        if (otbDown) {
            decisionRows.push({
                id: `decision-otb-${otbDown.categoryId}`,
                title: 'OTB 收敛',
                finding: `${otbDown.category} SKU占比 ${((otbDown.skuShare || 0) * 100).toFixed(1)}%，高于销售贡献 ${((otbDown.salesShare || 0) * 100).toFixed(1)}%。`,
                decision: `建议 OTB 权重下调 ${Math.abs(otbDown.deltaPp).toFixed(1)}pp，并同步精简弱势价带 SKU。`,
                result: '预计库存周转改善 0.2-0.4 周，折扣压力下降。',
            });
        }

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
            sellThroughMode,
            sellThroughLabel,
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
                avgFillRate: shipExecutionRate,
                avgReorderRate: currentOperationalTotals.avgReorderRate || avgReorderRate,
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
            pareto: {
                points: paretoPoints,
                top10Share: top10ParetoShare,
                top20Share: top20ParetoShare,
            },
            depth: {
                bins: depthBins,
                summary: {
                    ...segmentSummary,
                    sThreshold,
                    mainThreshold,
                },
                scatterPoints: depthScatterPoints,
            },
            otbSuggestions,
            skuActionRows,
            sellThroughTrend,
            heatmap: {
                xAxisMode: heatmapXAxis,
                xLabels: heatXLabels,
                yLabels: heatYLabels,
                points: heatPoints,
                min: 0,
                max: metricRange.net_sales.max,
                metricRange,
            },
            insight,
            decisionRows,
        };
    }, [filters, heatmapXAxis, sellThroughMode, compareMode, categoryLevel]);
}
