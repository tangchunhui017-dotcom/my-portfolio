'use client';

import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { DashboardLifecycleFilters, DashboardLifecycleLabel } from '@/config/dashboardLifecycle';
import dimPlanRaw from '@/../data/dashboard/dim_plan.json';
import { ANNUAL_CONTROL_MONTH_AXIS, SEASONAL_INVENTORY_TRANSITIONS } from '@/config/annualControl';
import {
    DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS,
    DASHBOARD_SEASON_LIFECYCLE_STANDARDS,
} from '@/config/dashboardSeasonLifecycleStandards';
import {
    DASHBOARD_SEASON_TRANSITION_METRIC_STANDARD,
    DASHBOARD_SEASON_TRANSITION_OTB_PARAMETER_STANDARD,
    DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD,
    formatDashboardSeasonTransitionSingleMonthWindowLabel,
    pickDashboardSeasonTransitionAlert,
    resolveDashboardSeasonTransitionScopeLabel,
} from '@/config/dashboardSeasonTransitionStandards';
import { getDashboardMonthByWave, getDashboardSeasonByWave, normalizeDashboardWave } from '@/config/dashboardTime';
import type { CompareMode } from '@/hooks/useDashboardFilter';
import { buildSeasonTransitionAnalysisRows, buildSeasonTransitionLanes, resolveTransitionVisibleRange as resolveTransitionVisibleRangeFromTable } from '@/config/dashboardSeasonTransition';
import { buildSeasonTransitionAnalysisTable, buildSeasonTransitionMockRows, buildSeasonTransitionMonthlySummary, buildSeasonTransitionPlanBaseline } from '@/config/dashboardSeasonTransitionStandard';

interface DashboardSalesRecord {
    sku_id: string;
    wave?: string;
    sale_wave?: string;
    week_num: number;
    unit_sold: number;
    net_sales_amt: number;
    gross_profit_amt: number;
    cumulative_sell_through: number;
    sale_year?: string | number;
    sale_month?: number;
    sales_season_year?: string | number;
    sales_season?: string;
    season_year?: string | number;
    season?: string;
    product_track?: string | null;
    is_carryover?: boolean | string | number | null;
    carryover_type?: string | null;
    carryover_status?: string | null;
    carryover_protection_end?: string | null;
    carryover_entry_source?: string | null;
    monitor_mode?: string | null;
    non_main_reason?: string | null;
}

interface DashboardSkuMeta {
    sku_id: string;
    sku_name?: string;
    category_name?: string;
    category_l2?: string;
    product_line?: string;
    dev_season_year?: string | number;
    dev_season?: string;
    season_year?: string | number;
    season?: string;
    lifecycle?: string;
    product_track?: string | null;
    is_carryover?: boolean | string | number | null;
    carryover_type?: string | null;
    carryover_status?: string | null;
    carryover_protection_end?: string | null;
    carryover_entry_source?: string | null;
    monitor_mode?: string | null;
    non_main_reason?: string | null;
}

interface LifecycleDataPoint {
    periodKey: string;
    periodLabel: string;
    newSales: number;
    pastSales: number;
    oldSales: number;
    totalSales: number;
    newShare: number;
    pastShare: number;
    oldShare: number;
    dominantLifecycle: DashboardLifecycleLabel;
}

type AssortmentRole = 'Cash Cow' | 'Traffic Driver' | 'Profit Builder' | 'Risk';

interface AssortmentTopSku {
    skuId: string;
    skuName: string;
    sales: number;
}

interface AssortmentDataPoint {
    category: string;
    sales: number;
    sellThrough: number;
    margin: number;
    marginRate: number;
    role: AssortmentRole;
    salesShare: number;
    pseudoExplosiveRisk: boolean;
    newShare: number;
    oldPressureShare: number;
    topSkus: AssortmentTopSku[];
}

type AssortmentFilterKey = 'all' | 'cash-cow' | 'traffic-driver' | 'profit-builder' | 'risk';
type AssortmentLegendKey = Exclude<AssortmentFilterKey, 'all'>;
type AssortmentLabelPlacement = { position: 'top' | 'right' | 'left' | 'bottom'; offset: [number, number] };

const ASSORTMENT_MATRIX_STANDARD = {
    sellThroughSplit: 0.55,
    sellThroughStrong: 0.7,
    salesShareCore: 0.14,
    salesShareAttention: 0.1,
    marginRateHealthy: 0.3,
    marginRateHigh: 0.38,
    marginRateRisk: 0.25,
    pseudoRiskSalesShare: 0.12,
} as const;

const ASSORTMENT_LEGEND_ITEMS = [
    { key: 'cash-cow', label: '现金牛', color: '#10B981', softColor: 'rgba(16,185,129,0.10)' },
    { key: 'traffic-driver', label: '引流款', color: '#0EA5E9', softColor: 'rgba(14,165,233,0.10)' },
    { key: 'profit-builder', label: '利润机会', color: '#F59E0B', softColor: 'rgba(245,158,11,0.10)' },
    { key: 'risk', label: '风险', color: '#E11D48', softColor: 'rgba(225,29,72,0.10)' },
] as const satisfies ReadonlyArray<{
    key: AssortmentLegendKey;
    label: string;
    color: string;
    softColor: string;
}>;
type TransitionStatus = 'on-track' | 'watch' | 'lagging';

interface SeasonTransitionCard {
    month: number;
    wave: string;
    monthLabel: string;
    season: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    seasonLabel: string;
    phaseLabel: string;
    weekRange: string;
    mdRange: string;
    newTarget: number;
    newActual: number;
    oldTarget: number;
    oldActual: number;
    newDiscountTarget: number;
    newDiscountActual: number;
    oldDiscountTarget: number;
    oldDiscountActual: number;
    deviationPp: number;
    status: TransitionStatus;
    handoffFocus: string;
    carryoverRisk: string;
    lifecycleSnapshot: LifecycleDataPoint | null;
}

interface SeasonSalesMonthPoint {
    axisValue: number;
    slotAxisValue: number;
    label: string;
    sales: number;
}

interface SeasonSalesLane {
    laneId: string;
    season: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    seasonYear: number;
    label: string;
    rangeLabel: string;
    start: number;
    end: number;
    months: number[];
    monthBreakdown: SeasonSalesMonthPoint[];
    actualSales: number;
    planSales: number;
    color: string;
    fill: string;
    border: string;
}

interface Props {
    records?: DashboardSalesRecord[];
    transitionRecords?: DashboardSalesRecord[];
    skuMap?: Record<string, DashboardSkuMeta | undefined>;
    filters: DashboardLifecycleFilters;
    compareMode?: CompareMode;
}

function safeDiv(numerator: number, denominator: number) {
    return denominator === 0 ? 0 : numerator / denominator;
}

function fmtPct(value: number | null | undefined, digits = 0) {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    return `${(value * 100).toFixed(digits)}%`;
}

function fmtPp(value: number | null | undefined, digits = 1) {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${Math.abs(value * 100).toFixed(digits)}pp`;
}

function fmtWan(value: number | null | undefined, digits = 1) {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    return `${value.toFixed(digits)}万`;
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function resolveCategoryLabel(sku?: DashboardSkuMeta) {
    return sku?.category_l2 || sku?.category_name || sku?.product_line || sku?.sku_name || '未分类';
}

function isPseudoExplosiveRisk(salesShare: number, sellThrough: number, marginRate: number) {
    return (
        salesShare >= ASSORTMENT_MATRIX_STANDARD.pseudoRiskSalesShare &&
        sellThrough < ASSORTMENT_MATRIX_STANDARD.sellThroughSplit &&
        marginRate < ASSORTMENT_MATRIX_STANDARD.marginRateRisk
    );
}

function classifyAssortmentRole(sales: number, salesScaleThreshold: number, sellThrough: number, marginRate: number): AssortmentRole {
    const isCoreScale = sales >= salesScaleThreshold;
    const hasHealthySellThrough = sellThrough >= ASSORTMENT_MATRIX_STANDARD.sellThroughSplit;

    if (isCoreScale && hasHealthySellThrough) return 'Cash Cow';
    if (isCoreScale) return 'Traffic Driver';
    if (hasHealthySellThrough) return 'Profit Builder';
    return 'Risk';
}

function resolveAssortmentRoleLabel(point: Pick<AssortmentDataPoint, 'role' | 'pseudoExplosiveRisk'>) {
    if (point.pseudoExplosiveRisk) return '伪爆款风险';
    if (point.role === 'Cash Cow') return '现金牛';
    if (point.role === 'Traffic Driver') return '引流款';
    if (point.role === 'Profit Builder') return '利润机会';
    return '库存风险';
}

function resolveAssortmentRoleColor(point: Pick<AssortmentDataPoint, 'role' | 'pseudoExplosiveRisk'>) {
    if (point.pseudoExplosiveRisk) return '#E11D48';
    if (point.role === 'Cash Cow') return '#10B981';
    if (point.role === 'Traffic Driver') return '#0EA5E9';
    if (point.role === 'Profit Builder') return '#F59E0B';
    return '#FB7185';
}

function resolveWaveKey(record: DashboardSalesRecord) {
    const normalizedWave = normalizeDashboardWave(record.sale_wave || record.wave);
    if (normalizedWave) return normalizedWave;

    const week = Number(record.week_num || 0);
    if (!Number.isFinite(week) || week <= 0 || week > 12) return null;
    return normalizeDashboardWave(`W${String(week).padStart(2, '0')}`);
}

function parseYear(value: string | number | null | undefined) {
    const year = Number(value);
    return Number.isFinite(year) ? year : null;
}

function resolveAssortmentFilterLabel(filter: AssortmentFilterKey) {
    if (filter === 'all') return '全部品类';
    return ASSORTMENT_LEGEND_ITEMS.find((item) => item.key === filter)?.label || '全部品类';
}

function matchesAssortmentFilter(point: AssortmentDataPoint, filter: AssortmentFilterKey) {
    if (filter === 'all') return true;
    if (filter === 'risk') return point.pseudoExplosiveRisk || point.role === 'Risk';
    if (point.pseudoExplosiveRisk) return false;
    if (filter === 'cash-cow') return point.role === 'Cash Cow';
    if (filter === 'traffic-driver') return point.role === 'Traffic Driver';
    return point.role === 'Profit Builder';
}

function resolveLifecycleForPeriod(
    filters: DashboardLifecycleFilters,
    waveKey: string | null,
    sku: DashboardSkuMeta | undefined,
    record: DashboardSalesRecord,
): DashboardLifecycleLabel {
    const anchorYear =
        filters.season_year !== 'all'
            ? Number(filters.season_year)
            : parseYear(record.sale_year ?? record.season_year) ?? parseYear(sku?.dev_season_year ?? sku?.season_year) ?? 2024;
    const anchorSeason = (waveKey ? getDashboardSeasonByWave(waveKey) : null) || (record.season as 'Q1' | 'Q2' | 'Q3' | 'Q4' | undefined);
    const skuYear = parseYear(sku?.dev_season_year ?? sku?.season_year ?? record.sales_season_year ?? record.season_year);
    const skuSeason = String(sku?.dev_season || sku?.season || record.sales_season || record.season || '').toUpperCase();
    const legacyLifecycle = String(sku?.lifecycle || '').toLowerCase();

    if (!skuYear) {
        if (legacyLifecycle.includes('new') || legacyLifecycle.includes('新')) return '新品';
        if (legacyLifecycle.includes('core') || legacyLifecycle.includes('carry') || legacyLifecycle.includes('常青')) return '老品';
        return '次新品';
    }

    if (skuYear <= anchorYear - 2) return '老品';
    if (skuYear === anchorYear - 1) return '次新品';
    if (anchorSeason && skuSeason && skuYear === anchorYear && skuSeason === anchorSeason) return '新品';
    return '次新品';
}

function resolveDominantLifecycle(point: Pick<LifecycleDataPoint, 'newShare' | 'pastShare' | 'oldShare'>): DashboardLifecycleLabel {
    if (point.newShare >= point.pastShare && point.newShare >= point.oldShare) return '新品';
    if (point.oldShare >= point.pastShare) return '老品';
    return '次新品';
}

function buildLifecycleData(
    records: DashboardSalesRecord[],
    skuMap: Record<string, DashboardSkuMeta | undefined>,
    filters: DashboardLifecycleFilters,
) {
    const monthBuckets = new Map<string, { label: string; newSales: number; pastSales: number; oldSales: number }>();

    records.forEach((record) => {
        const waveKey = resolveWaveKey(record);
        if (!waveKey) return;

        const month = getDashboardMonthByWave(waveKey);
        if (month === null) return;

        const sku = skuMap[record.sku_id];
        const lifecycle = resolveLifecycleForPeriod(filters, waveKey, sku, record);
        const row = monthBuckets.get(waveKey) || {
            label: `${month}月`,
            newSales: 0,
            pastSales: 0,
            oldSales: 0,
        };
        const salesInWan = Number(record.net_sales_amt || 0) / 10000;

        if (lifecycle === '新品') row.newSales += salesInWan;
        else if (lifecycle === '老品') row.oldSales += salesInWan;
        else row.pastSales += salesInWan;

        monthBuckets.set(waveKey, row);
    });

    return Array.from(monthBuckets.entries())
        .sort((a, b) => (getDashboardMonthByWave(a[0]) || 0) - (getDashboardMonthByWave(b[0]) || 0))
        .map(([periodKey, row]) => {
            const totalSales = row.newSales + row.pastSales + row.oldSales;
            const point = {
                periodKey,
                periodLabel: row.label,
                newSales: Number(row.newSales.toFixed(1)),
                pastSales: Number(row.pastSales.toFixed(1)),
                oldSales: Number(row.oldSales.toFixed(1)),
                totalSales: Number(totalSales.toFixed(1)),
                newShare: safeDiv(row.newSales, totalSales),
                pastShare: safeDiv(row.pastSales, totalSales),
                oldShare: safeDiv(row.oldSales, totalSales),
                dominantLifecycle: '新品' as DashboardLifecycleLabel,
            } satisfies LifecycleDataPoint;

            point.dominantLifecycle = resolveDominantLifecycle(point);
            return point;
        });
}

function buildAssortmentData(
    records: DashboardSalesRecord[],
    skuMap: Record<string, DashboardSkuMeta | undefined>,
    filters: DashboardLifecycleFilters,
) {
    const categoryBuckets = new Map<string, {
        sales: number;
        margin: number;
        stWeighted: number;
        stWeight: number;
        newSales: number;
        pastSales: number;
        oldSales: number;
        skuSales: Map<string, AssortmentTopSku>;
    }>();

    records.forEach((record) => {
        const sku = skuMap[record.sku_id];
        const category = resolveCategoryLabel(sku);
        const row = categoryBuckets.get(category) || {
            sales: 0,
            margin: 0,
            stWeighted: 0,
            stWeight: 0,
            newSales: 0,
            pastSales: 0,
            oldSales: 0,
            skuSales: new Map<string, AssortmentTopSku>(),
        };
        const salesInWan = Number(record.net_sales_amt || 0) / 10000;
        const marginInWan = Number(record.gross_profit_amt || 0) / 10000;
        const weight = Math.max(Number(record.unit_sold || 0), 1);
        const lifecycle = resolveLifecycleForPeriod(filters, resolveWaveKey(record), sku, record);
        const skuId = String(record.sku_id || sku?.sku_id || `${category}-${row.skuSales.size}`);
        const skuRow = row.skuSales.get(skuId) || {
            skuId,
            skuName: sku?.sku_name || record.sku_id || '未命名SKU',
            sales: 0,
        };

        row.sales += salesInWan;
        row.margin += marginInWan;
        row.stWeighted += Number(record.cumulative_sell_through || 0) * weight;
        row.stWeight += weight;
        skuRow.sales += salesInWan;
        row.skuSales.set(skuId, skuRow);

        if (lifecycle === '新品') row.newSales += salesInWan;
        else if (lifecycle === '老品') row.oldSales += salesInWan;
        else row.pastSales += salesInWan;

        categoryBuckets.set(category, row);
    });

    const categoryEntries = Array.from(categoryBuckets.entries());
    const totalSales = categoryEntries.reduce((sum, [, row]) => sum + row.sales, 0);
    const salesScaleThreshold = safeDiv(totalSales, Math.max(categoryEntries.length, 1));

    return categoryEntries
        .map(([category, row]) => {
            const sellThrough = safeDiv(row.stWeighted, row.stWeight);
            const salesShare = safeDiv(row.sales, Math.max(totalSales, 1));
            const marginRate = safeDiv(row.margin, Math.max(row.sales, 1));
            const pseudoExplosiveRisk = isPseudoExplosiveRisk(salesShare, sellThrough, marginRate);
            const lifecycleSales = row.newSales + row.pastSales + row.oldSales;
            const topSkus = Array.from(row.skuSales.values())
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 3)
                .map((sku) => ({
                    ...sku,
                    sales: Number(sku.sales.toFixed(1)),
                }));

            return {
                category,
                sales: Number(row.sales.toFixed(1)),
                sellThrough,
                margin: Number(row.margin.toFixed(1)),
                marginRate,
                salesShare,
                role: classifyAssortmentRole(row.sales, salesScaleThreshold, sellThrough, marginRate),
                pseudoExplosiveRisk,
                newShare: safeDiv(row.newSales, lifecycleSales),
                oldPressureShare: safeDiv(row.pastSales + row.oldSales, lifecycleSales),
                topSkus,
            } satisfies AssortmentDataPoint;
        })
        .sort((a, b) => b.sales - a.sales);
}

function resolveTransitionPhaseKind(phaseLabel: string) {
    if (phaseLabel.includes('上新')) return '上新期';
    if (phaseLabel.includes('主销') || phaseLabel.includes('冲刺') || phaseLabel.includes('预热')) return '主销期';
    return '清货期';
}


const SEASON_SALES_WINDOWS: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', {
    label: string;
    rangeLabel: string;
    start: number;
    end: number;
    color: string;
    fill: string;
    border: string;
    monthWeights: Array<{ month: number; weight: number }>;
}> = {
    Q1: {
        ...DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS.Q1,
        color: '#4ADE80',
        fill: 'rgba(74, 222, 128, 0.10)',
        border: 'rgba(74, 222, 128, 0.38)',
    },
    Q2: {
        ...DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS.Q2,
        color: '#38BDF8',
        fill: 'rgba(56, 189, 248, 0.10)',
        border: 'rgba(56, 189, 248, 0.34)',
    },
    Q3: {
        ...DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS.Q3,
        color: '#FBBF24',
        fill: 'rgba(251, 191, 36, 0.10)',
        border: 'rgba(251, 191, 36, 0.36)',
    },
    Q4: {
        ...DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS.Q4,
        color: '#818CF8',
        fill: 'rgba(129, 140, 248, 0.10)',
        border: 'rgba(129, 140, 248, 0.36)',
    },
};

function resolveRecordSeason(record: DashboardSalesRecord, skuMap: Record<string, DashboardSkuMeta | undefined>) {
    const sku = skuMap[record.sku_id];
    const season = String(record.sales_season || record.season || sku?.dev_season || sku?.season || '').toUpperCase();
    if (season === 'Q1' || season === 'Q2' || season === 'Q3' || season === 'Q4') return season;
    return null;
}

function resolveRecordSeasonYear(record: DashboardSalesRecord, skuMap: Record<string, DashboardSkuMeta | undefined>) {
    const sku = skuMap[record.sku_id];
    return parseYear(record.sales_season_year ?? record.season_year ?? sku?.dev_season_year ?? sku?.season_year);
}

function resolveSeasonAxisLabel(axisValue: number, anchorYear: number) {
    if (axisValue === 0) return `${anchorYear - 1}年12月`;
    if (axisValue >= 13) return `${anchorYear + 1}年${axisValue - 12}月`;
    return `${anchorYear}年${axisValue}月`;
}

type SeasonLaneMonthWeight = {
    month: number;
    axisMonth: number;
    weight: number;
};

type SeasonLaneConfig = {
    laneId: string;
    season: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    seasonYear: number;
    sourceYear: number;
    label: string;
    rangeLabel: string;
    start: number;
    end: number;
    color: string;
    fill: string;
    border: string;
    monthWeights: SeasonLaneMonthWeight[];
};

function formatSeasonLaneLabel(season: 'Q1' | 'Q2' | 'Q3' | 'Q4', year: number) {
    const prefix = season === 'Q1' ? '春' : season === 'Q2' ? '夏' : season === 'Q3' ? '秋' : '冬';
    return prefix + String(year).slice(-2);
}

function buildSeasonLaneConfigs(anchorYear: number, hasPrevWinterSource: boolean): SeasonLaneConfig[] {
    const springWindow = SEASON_SALES_WINDOWS.Q1;
    const summerWindow = SEASON_SALES_WINDOWS.Q2;
    const autumnWindow = SEASON_SALES_WINDOWS.Q3;
    const winterWindow = SEASON_SALES_WINDOWS.Q4;
    const prevWinterSourceYear = hasPrevWinterSource ? anchorYear - 1 : anchorYear;

    return [
        {
            laneId: `Q4-${anchorYear - 1}`,
            season: 'Q4',
            seasonYear: anchorYear - 1,
            sourceYear: prevWinterSourceYear,
            label: formatSeasonLaneLabel('Q4', anchorYear - 1),
            rangeLabel: `${anchorYear - 1}/9/30-${anchorYear}/3月末`,
            start: 0.03,
            end: 4,
            color: winterWindow.color,
            fill: winterWindow.fill,
            border: winterWindow.border,
            monthWeights: [
                { month: 12, axisMonth: 0, weight: 1 },
                { month: 1, axisMonth: 1, weight: 1 },
                { month: 2, axisMonth: 2, weight: 1 },
                { month: 3, axisMonth: 3, weight: 1 },
            ],
        },
        {
            laneId: `Q1-${anchorYear}`,
            season: 'Q1',
            seasonYear: anchorYear,
            sourceYear: anchorYear,
            label: formatSeasonLaneLabel('Q1', anchorYear),
            rangeLabel: springWindow.rangeLabel,
            start: springWindow.start,
            end: springWindow.end,
            color: springWindow.color,
            fill: springWindow.fill,
            border: springWindow.border,
            monthWeights: [
                { month: 12, axisMonth: 0, weight: 22 / 31 },
                { month: 1, axisMonth: 1, weight: 1 },
                { month: 2, axisMonth: 2, weight: 1 },
                { month: 3, axisMonth: 3, weight: 1 },
                { month: 4, axisMonth: 4, weight: 1 },
                { month: 5, axisMonth: 5, weight: 27 / 31 },
            ],
        },
        {
            laneId: `Q2-${anchorYear}`,
            season: 'Q2',
            seasonYear: anchorYear,
            sourceYear: anchorYear,
            label: formatSeasonLaneLabel('Q2', anchorYear),
            rangeLabel: summerWindow.rangeLabel,
            start: summerWindow.start,
            end: summerWindow.end,
            color: summerWindow.color,
            fill: summerWindow.fill,
            border: summerWindow.border,
            monthWeights: [
                { month: 3, axisMonth: 3, weight: 27 / 31 },
                { month: 4, axisMonth: 4, weight: 1 },
                { month: 5, axisMonth: 5, weight: 1 },
                { month: 6, axisMonth: 6, weight: 1 },
                { month: 7, axisMonth: 7, weight: 1 },
                { month: 8, axisMonth: 8, weight: 1 },
                { month: 9, axisMonth: 9, weight: 1 },
            ],
        },
        {
            laneId: `Q3-${anchorYear}`,
            season: 'Q3',
            seasonYear: anchorYear,
            sourceYear: anchorYear,
            label: formatSeasonLaneLabel('Q3', anchorYear),
            rangeLabel: autumnWindow.rangeLabel,
            start: autumnWindow.start,
            end: autumnWindow.end,
            color: autumnWindow.color,
            fill: autumnWindow.fill,
            border: autumnWindow.border,
            monthWeights: [
                { month: 6, axisMonth: 6, weight: 6 / 30 },
                { month: 7, axisMonth: 7, weight: 1 },
                { month: 8, axisMonth: 8, weight: 1 },
                { month: 9, axisMonth: 9, weight: 1 },
                { month: 10, axisMonth: 10, weight: 1 },
                { month: 11, axisMonth: 11, weight: 1 },
                { month: 12, axisMonth: 12, weight: 2 / 31 },
            ],
        },
        {
            laneId: `Q4-${anchorYear}`,
            season: 'Q4',
            seasonYear: anchorYear,
            sourceYear: anchorYear,
            label: formatSeasonLaneLabel('Q4', anchorYear),
            rangeLabel: winterWindow.rangeLabel,
            start: winterWindow.start,
            end: winterWindow.end,
            color: winterWindow.color,
            fill: winterWindow.fill,
            border: winterWindow.border,
            monthWeights: [
                { month: 9, axisMonth: 9, weight: 1 / 30 },
                { month: 10, axisMonth: 10, weight: 1 },
                { month: 11, axisMonth: 11, weight: 1 },
                { month: 12, axisMonth: 12, weight: 1 },
                { month: 1, axisMonth: 13, weight: 1 },
                { month: 2, axisMonth: 14, weight: 1 },
                { month: 3, axisMonth: 15, weight: 1 },
                { month: 4, axisMonth: 16, weight: 1 / 30 },
            ],
        },
    ];
}

type TransitionVisibleRange = {
    startMonth: number;
    endMonth: number;
    minAxis: number;
    maxAxis: number;
};

function resolveTransitionVisibleRange(filters: DashboardLifecycleFilters): TransitionVisibleRange {
    const selectedMonth =
        filters.wave !== 'all'
            ? getDashboardMonthByWave(normalizeDashboardWave(filters.wave) || String(filters.wave))
            : null;

    if (selectedMonth !== null) {
        return {
            startMonth: selectedMonth,
            endMonth: selectedMonth,
            minAxis: selectedMonth,
            maxAxis: selectedMonth + 1,
        };
    }

    if (filters.season !== 'all') {
        const seasonRangeMap: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', [number, number]> = {
            Q1: [1, 3],
            Q2: [4, 6],
            Q3: [7, 9],
            Q4: [10, 12],
        };
        const [startMonth, endMonth] = seasonRangeMap[filters.season as 'Q1' | 'Q2' | 'Q3' | 'Q4'];
        return {
            startMonth,
            endMonth,
            minAxis: startMonth,
            maxAxis: endMonth + 1,
        };
    }

    return {
        startMonth: 1,
        endMonth: 12,
        minAxis: 1,
        maxAxis: 13,
    };
}

function buildSeasonSalesLanes(
    records: DashboardSalesRecord[],
    skuMap: Record<string, DashboardSkuMeta | undefined>,
    anchorYear: number,
    visibleRange: TransitionVisibleRange,
): SeasonSalesLane[] {
    const { startMonth, endMonth, minAxis, maxAxis } = visibleRange;
    const hasPrevWinterSource = records.some((record) => {
        const season = resolveRecordSeason(record, skuMap);
        const seasonYear = resolveRecordSeasonYear(record, skuMap);
        return season === 'Q4' && seasonYear === anchorYear - 1;
    });
    const seasonConfigs = buildSeasonLaneConfigs(anchorYear, hasPrevWinterSource);
    const actualSales = Object.fromEntries(seasonConfigs.map((config) => [config.laneId, 0])) as Record<string, number>;
    const monthBuckets = Object.fromEntries(seasonConfigs.map((config) => [config.laneId, new Map<number, number>()])) as Record<string, Map<number, number>>;
    const monthTotals = new Map<number, number>();
    const residualMonthSales = new Map<number, number>();
    const mockMainSeasonAbsorbRatio = 0.88;

    records.forEach((record) => {
        const waveKey = resolveWaveKey(record);
        if (!waveKey) return;
        const month = getDashboardMonthByWave(waveKey);
        if (month === null || month < startMonth || month > endMonth) return;

        const salesInWan = Number(record.net_sales_amt || 0) / 10000;
        monthTotals.set(month, (monthTotals.get(month) || 0) + salesInWan);

        const season = resolveRecordSeason(record, skuMap);
        const seasonYear = resolveRecordSeasonYear(record, skuMap);
        const activeEntries = seasonConfigs
            .map((config) => {
                const weightEntry = config.monthWeights.find((entry) => entry.month === month);
                if (!weightEntry) return null;
                if (weightEntry.axisMonth < startMonth || weightEntry.axisMonth > endMonth) return null;
                return { config, weightEntry };
            })
            .filter((item): item is { config: SeasonLaneConfig; weightEntry: SeasonLaneConfig['monthWeights'][number] } => Boolean(item));

        let matchedWeight = 0;

        activeEntries.forEach(({ config, weightEntry }) => {
            if (config.season !== season || config.sourceYear !== seasonYear) return;

            const matchedSales = salesInWan * weightEntry.weight;
            matchedWeight = Math.max(matchedWeight, weightEntry.weight);
            actualSales[config.laneId] += matchedSales;
            monthBuckets[config.laneId].set(weightEntry.axisMonth, (monthBuckets[config.laneId].get(weightEntry.axisMonth) || 0) + matchedSales);
        });

        const remainingSales = salesInWan * (1 - matchedWeight);
        if (remainingSales <= 0.0001) return;

        const activeWeightTotal = activeEntries.reduce((sum, item) => sum + item.weightEntry.weight, 0);
        if (activeWeightTotal > 0) {
            const absorbSales = remainingSales * mockMainSeasonAbsorbRatio;
            activeEntries.forEach(({ config, weightEntry }) => {
                const allocatedSales = absorbSales * (weightEntry.weight / activeWeightTotal);
                actualSales[config.laneId] += allocatedSales;
                monthBuckets[config.laneId].set(weightEntry.axisMonth, (monthBuckets[config.laneId].get(weightEntry.axisMonth) || 0) + allocatedSales);
            });

            const residualSales = remainingSales - absorbSales;
            if (residualSales > 0.0001) {
                residualMonthSales.set(month, (residualMonthSales.get(month) || 0) + residualSales);
            }
            return;
        }

        residualMonthSales.set(month, (residualMonthSales.get(month) || 0) + remainingSales);
    });
    const monthlyPlan = Array.isArray((dimPlanRaw as { monthly_plan?: Array<{ month: number; plan_sales_amt: number }> }).monthly_plan)
        ? (dimPlanRaw as { monthly_plan: Array<{ month: number; plan_sales_amt: number }> }).monthly_plan
        : [];
    const planByMonth = new Map<number, number>(
        monthlyPlan.map((item) => [Number(item.month), Number(item.plan_sales_amt || 0) / 10000]),
    );

    const lanes: SeasonSalesLane[] = seasonConfigs
        .map((config) => {
            const planSales = config.monthWeights.reduce((sum, entry) => {
                if (entry.axisMonth < startMonth || entry.axisMonth > endMonth) return sum;
                return sum + (planByMonth.get(entry.month) || 0) * entry.weight;
            }, 0);

            const monthBreakdown = config.monthWeights
                .filter((entry) => entry.axisMonth >= startMonth && entry.axisMonth <= endMonth)
                .map((entry) => {
                    const slotStart = entry.axisMonth;
                    const slotEnd = entry.axisMonth + 1;
                    const segmentStart = Math.max(config.start, slotStart, minAxis);
                    const segmentEnd = Math.min(config.end, slotEnd, maxAxis);
                    if (segmentEnd <= segmentStart) return null;
                    const sales = monthBuckets[config.laneId].get(entry.axisMonth) || 0;
                    return {
                        axisValue: Number(((segmentStart + segmentEnd) / 2).toFixed(2)),
                        slotAxisValue: entry.axisMonth,
                        label: resolveSeasonAxisLabel(entry.axisMonth, anchorYear),
                        sales: Number(sales.toFixed(1)),
                    };
                })
                .filter((point): point is SeasonSalesMonthPoint => point !== null)
                .sort((a, b) => a.axisValue - b.axisValue);

            const clippedStart = Math.max(config.start, minAxis);
            const clippedEnd = Math.min(config.end, maxAxis);

            return {
                laneId: config.laneId,
                season: config.season,
                seasonYear: config.seasonYear,
                label: config.label,
                rangeLabel: config.rangeLabel,
                start: clippedStart,
                end: clippedEnd,
                months: Array.from(new Set(config.monthWeights.filter((entry) => entry.axisMonth >= startMonth && entry.axisMonth <= endMonth).map((entry) => entry.month))),
                monthBreakdown,
                actualSales: Number(actualSales[config.laneId].toFixed(1)),
                planSales: Number(planSales.toFixed(1)),
                color: config.color,
                fill: config.fill,
                border: config.border,
            };
        })
        .filter((lane) => lane.monthBreakdown.length > 0 && lane.end > lane.start && (lane.actualSales > 0.05 || lane.planSales > 0.05));

    const residualMonths = Array.from(residualMonthSales.keys()).sort((a, b) => a - b);
    if (residualMonths.length > 0) {
        const residualActual = residualMonths.reduce((sum, month) => sum + (residualMonthSales.get(month) || 0), 0);
        const residualPlan = residualMonths.reduce((sum, month) => {
            const monthSales = residualMonthSales.get(month) || 0;
            const monthTotal = monthTotals.get(month) || 0;
            if (monthTotal <= 0) return sum;
            return sum + (planByMonth.get(month) || 0) * (monthSales / monthTotal);
        }, 0);
        const firstMonth = residualMonths[0];
        const lastMonth = residualMonths[residualMonths.length - 1];
        lanes.push({
            laneId: 'other-seasons',
            season: 'Q4',
            seasonYear: anchorYear,
            label: '非主承接货季',
            rangeLabel: residualMonths.length === 1 ? `${anchorYear}/${firstMonth}` : `${firstMonth}-${lastMonth}月`,
            start: Math.max(minAxis, firstMonth),
            end: Math.min(maxAxis, lastMonth + 1),
            months: residualMonths,
            monthBreakdown: residualMonths.map((month) => ({
                axisValue: Number((month + 0.5).toFixed(2)),
                slotAxisValue: month,
                label: resolveSeasonAxisLabel(month, anchorYear),
                sales: Number((residualMonthSales.get(month) || 0).toFixed(1)),
            })),
            actualSales: Number(residualActual.toFixed(1)),
            planSales: Number(residualPlan.toFixed(1)),
            color: '#94A3B8',
            fill: 'rgba(148, 163, 184, 0.10)',
            border: 'rgba(148, 163, 184, 0.32)',
        });
    }

    return lanes.sort((a, b) => {
        const firstMonthDiff = a.start - b.start;
        if (firstMonthDiff !== 0) return firstMonthDiff;
        return a.seasonYear - b.seasonYear;
    });
}
function resolveVisibleSeasonSalesLanes(lanes: SeasonSalesLane[]) {
    return lanes;
}

function resolveTransitionFocusLane(
    lanes: SeasonSalesLane[],
    filters: DashboardLifecycleFilters,
    compareMode: CompareMode,
) {
    if (lanes.length === 0) return null;

    if (filters.season !== 'all') {
        return lanes.find((lane) => lane.season === filters.season) || lanes[0];
    }

    if (filters.wave !== 'all') {
        const month = getDashboardMonthByWave(normalizeDashboardWave(filters.wave) || String(filters.wave));
        if (month !== null) {
            return lanes.find((lane) => lane.monthBreakdown.some((point) => point.slotAxisValue === month)) || lanes[0];
        }
    }

    if (compareMode === 'plan') {
        return [...lanes].sort((a, b) => a.actualSales - a.planSales - (b.actualSales - b.planSales))[0] || lanes[0];
    }

    return [...lanes].sort((a, b) => b.actualSales - a.actualSales)[0] || lanes[0];
}

function resolveSeasonLaneTooltip(lane: SeasonSalesLane, showPlanOverlay: boolean) {
    const variance = lane.actualSales - lane.planSales;
    const varianceText = variance > 0 ? '+' + fmtWan(Math.abs(variance)) : variance < 0 ? '-' + fmtWan(Math.abs(variance)) : fmtWan(0);
    const monthRows = lane.monthBreakdown
        .map(
            (point) =>
                '<div style="margin-top:4px;display:flex;justify-content:space-between;gap:16px;"><span>' + point.label + '</span><span>' + fmtWan(point.sales) + '</span></div>',
        )
        .join('');

    return (
        '<div style="min-width:240px;">' +
        '<div style="font-weight:600;">' + lane.label + '销售带</div>' +
        '<div style="margin-top:6px;color:#64748B;">销售期 ' + lane.rangeLabel + '</div>' +
        '<div style="margin-top:10px;display:flex;justify-content:space-between;gap:16px;"><span>实际销售额</span><span>' + fmtWan(lane.actualSales) + '</span></div>' +
        (showPlanOverlay
            ? '<div style="margin-top:6px;display:flex;justify-content:space-between;gap:16px;"><span>计划销售额</span><span>' + fmtWan(lane.planSales) + '</span></div>' +
              '<div style="margin-top:6px;display:flex;justify-content:space-between;gap:16px;"><span>金额偏差</span><span>' + varianceText + '</span></div>'
            : '') +
        (monthRows ? '<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(148,163,184,0.14);font-weight:600;">逐月销售额</div>' + monthRows : '') +
        '</div>'
    );
}

function buildTransitionCard(
    axisItems: Array<(typeof ANNUAL_CONTROL_MONTH_AXIS)[number]>,
    transition: (typeof SEASONAL_INVENTORY_TRANSITIONS)[number],
    mode: 'month' | 'season',
    lifecycleMap: Map<string, LifecycleDataPoint>,
): SeasonTransitionCard {
    const first = axisItems[0];
    const last = axisItems[axisItems.length - 1];
    const snapshotPoints = axisItems
        .map((item) => lifecycleMap.get(item.wave))
        .filter((item): item is LifecycleDataPoint => Boolean(item));

    let lifecycleSnapshot: LifecycleDataPoint | null = null;
    let newActual = transition.actualNewGoodsRatio;
    let oldActual = transition.actualOldGoodsRatio;

    if (snapshotPoints.length > 0) {
        const totals = snapshotPoints.reduce(
            (acc, item) => {
                acc.newSales += item.newSales;
                acc.pastSales += item.pastSales;
                acc.oldSales += item.oldSales;
                return acc;
            },
            { newSales: 0, pastSales: 0, oldSales: 0 },
        );
        const totalSales = totals.newSales + totals.pastSales + totals.oldSales;
        lifecycleSnapshot = {
            periodKey: mode === 'season' ? transition.season : first.wave,
            periodLabel: mode === 'season' ? first.month + '-' + last.month + '月' : first.month + '月',
            newSales: Number(totals.newSales.toFixed(1)),
            pastSales: Number(totals.pastSales.toFixed(1)),
            oldSales: Number(totals.oldSales.toFixed(1)),
            totalSales: Number(totalSales.toFixed(1)),
            newShare: safeDiv(totals.newSales, totalSales),
            pastShare: safeDiv(totals.pastSales, totalSales),
            oldShare: safeDiv(totals.oldSales, totalSales),
            dominantLifecycle: '新品',
        };
        lifecycleSnapshot.dominantLifecycle = resolveDominantLifecycle(lifecycleSnapshot);
        newActual = lifecycleSnapshot.newShare;
        oldActual = lifecycleSnapshot.pastShare + lifecycleSnapshot.oldShare;
    }

    const deviationPp = (newActual - transition.newGoodsRatio) * 100;
    const status: TransitionStatus = deviationPp >= -3 ? 'on-track' : deviationPp >= -8 ? 'watch' : 'lagging';

    return {
        month: first.month,
        wave: mode === 'season' ? transition.season : first.wave,
        monthLabel: mode === 'season' ? first.month + '-' + last.month + '月' : first.month + '月',
        season: first.season,
        seasonLabel: transition.seasonLabel,
        phaseLabel: mode === 'season' ? '季节总览' : first.phaseLabel,
        weekRange: mode === 'season' ? first.weekRange + ' - ' + last.weekRange : first.weekRange,
        mdRange: mode === 'season' ? first.mdRange + ' - ' + last.mdRange : first.mdRange,
        newTarget: transition.newGoodsRatio,
        newActual,
        oldTarget: transition.oldGoodsRatio,
        oldActual,
        newDiscountTarget: transition.newGoodsDiscountTarget,
        newDiscountActual: transition.actualNewGoodsDiscount,
        oldDiscountTarget: transition.oldGoodsDiscountTarget,
        oldDiscountActual: transition.actualOldGoodsDiscount,
        deviationPp,
        status,
        handoffFocus: transition.handoffFocus,
        carryoverRisk: transition.carryoverRisk,
        lifecycleSnapshot,
    };
}

function resolveSeasonTransitionData(
    lifecycleData: LifecycleDataPoint[],
    filters: DashboardLifecycleFilters,
): SeasonTransitionCard[] {
    const lifecycleMap = new Map(lifecycleData.map((item) => [item.periodKey, item]));

    if (filters.wave !== 'all') {
        const waveKey = normalizeDashboardWave(filters.wave);
        const axisItem = ANNUAL_CONTROL_MONTH_AXIS.find((item) => item.wave === waveKey);
        if (!axisItem) return [];
        const transition =
            SEASONAL_INVENTORY_TRANSITIONS.find((item) => item.season === axisItem.season) ||
            SEASONAL_INVENTORY_TRANSITIONS[0];
        return [buildTransitionCard([axisItem], transition, 'month', lifecycleMap)];
    }

    if (filters.season !== 'all') {
        return ANNUAL_CONTROL_MONTH_AXIS.filter((item) => item.season === filters.season).map((axisItem) => {
            const transition =
                SEASONAL_INVENTORY_TRANSITIONS.find((item) => item.season === axisItem.season) ||
                SEASONAL_INVENTORY_TRANSITIONS[0];
            return buildTransitionCard([axisItem], transition, 'month', lifecycleMap);
        });
    }

    return SEASONAL_INVENTORY_TRANSITIONS.map((transition) => {
        const axisItems = ANNUAL_CONTROL_MONTH_AXIS.filter((item) => item.season === transition.season);
        return buildTransitionCard(axisItems, transition, 'season', lifecycleMap);
    });
}

function resolveSeasonTransitionChartCells(
    lifecycleData: LifecycleDataPoint[],
    filters: DashboardLifecycleFilters,
): SeasonTransitionCard[] {
    const lifecycleMap = new Map(lifecycleData.map((item) => [item.periodKey, item]));
    const visibleAxisItems = ANNUAL_CONTROL_MONTH_AXIS.filter((item) => {
        if (filters.wave !== 'all') {
            return item.wave === normalizeDashboardWave(filters.wave);
        }
        if (filters.season !== 'all') {
            return item.season === filters.season;
        }
        return true;
    });

    return visibleAxisItems.map((axisItem) => {
        const transition =
            SEASONAL_INVENTORY_TRANSITIONS.find((item) => item.season === axisItem.season) ||
            SEASONAL_INVENTORY_TRANSITIONS[0];
        return buildTransitionCard([axisItem], transition, 'month', lifecycleMap);
    });
}

function resolveTransitionTone(status: TransitionStatus) {
    if (status === 'lagging') {
        return {
            panel: 'border-rose-200 bg-rose-50/70',
            badge: 'bg-rose-100 text-rose-600',
            bar: 'bg-rose-500',
        };
    }
    if (status === 'watch') {
        return {
            panel: 'border-amber-200 bg-amber-50/70',
            badge: 'bg-amber-100 text-amber-700',
            bar: 'bg-amber-500',
        };
    }
    return {
        panel: 'border-emerald-200 bg-emerald-50/70',
        badge: 'bg-emerald-100 text-emerald-700',
        bar: 'bg-emerald-500',
    };
}

function resolveTransitionMetricText(label: '计划' | '实际', actual: number, target: number, showPlanOverlay: boolean) {
    if (showPlanOverlay) {
        return label + Math.round(target * 100) + '/' + Math.round(actual * 100);
    }
    return label + Math.round(actual * 100);
}

function resolveTransitionTooltip(item: SeasonTransitionCard, showPlanOverlay: boolean) {
    const newLine = showPlanOverlay
        ? '计划 ' + fmtPct(item.newTarget) + ' / 实际 ' + fmtPct(item.newActual)
        : '实际 ' + fmtPct(item.newActual);
    const discountLine = showPlanOverlay
        ? '计划 ' + fmtPct(item.oldDiscountTarget) + ' / 实际 ' + fmtPct(item.oldDiscountActual)
        : '实际 ' + fmtPct(item.oldDiscountActual);
    const oldLine = showPlanOverlay
        ? '计划 ' + fmtPct(item.oldTarget) + ' / 实际 ' + fmtPct(item.oldActual)
        : '实际 ' + fmtPct(item.oldActual);

    return (
        '<div style="min-width:220px;">' +
        '<div style="font-weight:600;">' + item.monthLabel + ' / ' + item.seasonLabel + ' / ' + item.phaseLabel + '</div>' +
        '<div style="margin-top:6px;color:#64748B;">' + item.weekRange + ' / ' + item.mdRange + '</div>' +
        '<div style="margin-top:10px;display:flex;justify-content:space-between;gap:16px;"><span>新品结构</span><span>' + newLine + '</span></div>' +
        '<div style="margin-top:6px;display:flex;justify-content:space-between;gap:16px;"><span>老货折扣</span><span>' + discountLine + '</span></div>' +
        '<div style="margin-top:6px;display:flex;justify-content:space-between;gap:16px;"><span>老货结构</span><span>' + oldLine + '</span></div>' +
        '<div style="margin-top:10px;color:#334155;">承接重点：' + item.handoffFocus + '</div>' +
        '<div style="margin-top:4px;color:#64748B;">风险提示：' + item.carryoverRisk + '</div>' +
        '</div>'
    );
}

function resolveCompareModeLabel(compareMode: CompareMode) {
    if (compareMode === 'plan') return '计划';
    if (compareMode === 'yoy') return '同比';
    if (compareMode === 'mom') return '环比';
    return '实际';
}

function resolveTransitionInsightStatus(alerts: readonly string[], hasStructureWarning = false) {
    if (alerts.includes('handoff_gap')) return 'critical' as const;
    if (alerts.includes('inventory_drag') || alerts.includes('launch_laggard') || hasStructureWarning) return 'warning' as const;
    return 'normal' as const;
}

function resolveTransitionPrimaryAlert(alerts: readonly string[]) {
    return pickDashboardSeasonTransitionAlert(alerts as Array<'handoff_gap' | 'inventory_drag' | 'launch_laggard'>);
}

function resolveTransitionStructureFocusLabel(summary: {
    prevSeasonKey: string;
    currentSeasonKey: string;
    nextSeasonKey: string;
    structureFocusRole: 'prev' | 'current' | 'next' | null;
}) {
    if (summary.structureFocusRole === 'prev') return summary.prevSeasonKey;
    if (summary.structureFocusRole === 'current') return summary.currentSeasonKey;
    if (summary.structureFocusRole === 'next') return summary.nextSeasonKey;
    return '主承接结构';
}

function resolveTransitionFocusMetricLabel(focusLabel: string) {
    if (!focusLabel) return '聚焦销售额';
    return `${focusLabel}销售额`;
}

function joinTransitionMonthLabels(months: number[]) {
    if (months.length === 0) return '--';
    return months.map((month) => `${month}月`).join('、');
}

function formatTransitionGap(value: number) {
    if (!Number.isFinite(value) || value === 0) return fmtWan(0);
    const sign = value > 0 ? '+' : '-';
    return sign + fmtWan(Math.abs(value));
}

function InfoHoverTip({ title, lines, align = 'right' }: { title: string; lines: string[]; align?: 'left' | 'right' }) {
    return (
        <div className="relative group">
            <button
                type="button"
                aria-label={`${title}口径说明`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] text-slate-500 transition-colors hover:text-slate-700 hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
                i
            </button>
            <div className={`pointer-events-none absolute top-[calc(100%+8px)] z-30 w-[360px] max-w-[82vw] rounded-lg border border-slate-200 bg-white p-2.5 text-left text-[11px] leading-5 text-slate-600 shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${align === 'left' ? 'left-0' : 'right-0'}`}> 
                <div className="mb-1 text-[11px] font-semibold text-slate-800">{title}</div>
                <div className="space-y-0.5">
                    {lines.map((line) => (
                        <div key={line}>{line}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function LifecycleAssortmentPanel({ records = [], transitionRecords = [], skuMap = {}, filters, compareMode = 'none' }: Props) {
    const [activeTab, setActiveTab] = useState<'transition' | 'lifecycle' | 'assortment'>('transition');
    const [activeAssortmentFilter, setActiveAssortmentFilter] = useState<AssortmentFilterKey>('all');

    const lifecycleData = useMemo(() => buildLifecycleData(records, skuMap, filters), [records, skuMap, filters]);
    const assortmentData = useMemo(() => buildAssortmentData(records, skuMap, filters), [records, skuMap, filters]);
    const transitionAnchorYear = useMemo(() => {
        if (filters.season_year !== 'all') {
            return Number(filters.season_year);
        }
        const years = (transitionRecords && transitionRecords.length > 0 ? transitionRecords : records)
            .map((record) => parseYear(record.sale_year ?? record.season_year))
            .filter((year): year is number => year !== null);
        return years.length > 0 ? Math.max(...years) : new Date().getFullYear();
    }, [filters.season_year, records, transitionRecords]);
    const seasonSalesSource = useMemo(
        () => (transitionRecords.length > 0 ? transitionRecords : records),
        [records, transitionRecords],
    );
    const transitionVisibleRange = useMemo(() => resolveTransitionVisibleRangeFromTable(filters), [filters]);
    const transitionAxisLabels = useMemo(() => Array.from({ length: transitionVisibleRange.endMonth - transitionVisibleRange.startMonth + 1 }, (_, index) => {
        const month = transitionVisibleRange.startMonth + index;
        if (month === 0) return String(transitionAnchorYear - 1) + '/12';
        if (month >= 13) return String(transitionAnchorYear + 1) + '/' + String(month - 12);
        if (month === 1 && transitionVisibleRange.startMonth === 0) return '1月';
        return month === transitionVisibleRange.startMonth ? String(transitionAnchorYear) + '/' + String(month) : String(month) + '月';
    }), [transitionVisibleRange.endMonth, transitionVisibleRange.startMonth, transitionAnchorYear]);
    const transitionPlanBaseline = useMemo(() => buildSeasonTransitionPlanBaseline(transitionAnchorYear), [transitionAnchorYear]);
    const transitionAnalysisRows = useMemo(() => {
        const actualRows = buildSeasonTransitionAnalysisRows(seasonSalesSource, skuMap, transitionAnchorYear, transitionVisibleRange);
        if (actualRows.length > 0) return actualRows;
        return buildSeasonTransitionMockRows(records, transitionPlanBaseline, transitionVisibleRange);
    }, [records, seasonSalesSource, skuMap, transitionAnchorYear, transitionPlanBaseline, transitionVisibleRange]);
    const transitionAnalysisTable = useMemo(
        () => buildSeasonTransitionAnalysisTable(transitionAnalysisRows, seasonSalesSource, transitionPlanBaseline),
        [seasonSalesSource, transitionAnalysisRows, transitionPlanBaseline],
    );
    const transitionMonthlySummary = useMemo(
        () => buildSeasonTransitionMonthlySummary(transitionAnalysisTable, transitionPlanBaseline, transitionVisibleRange),
        [transitionAnalysisTable, transitionPlanBaseline, transitionVisibleRange],
    );
    const seasonSalesLanes = useMemo(() => buildSeasonTransitionLanes(transitionAnalysisRows, transitionAnchorYear, transitionVisibleRange), [transitionAnalysisRows, transitionAnchorYear, transitionVisibleRange]);
    const visibleSeasonSalesLanes = useMemo(() => resolveVisibleSeasonSalesLanes(seasonSalesLanes), [seasonSalesLanes]);
    const renderedTransitionLanes = useMemo(() => visibleSeasonSalesLanes, [visibleSeasonSalesLanes]);
    const mainTransitionLanes = useMemo(
        () => renderedTransitionLanes.filter((lane) => lane.laneId !== 'other-seasons' && lane.laneId !== 'carryover-season'),
        [renderedTransitionLanes],
    );
    const carryoverTransitionLane = useMemo(
        () => renderedTransitionLanes.find((lane) => lane.laneId === 'carryover-season') || null,
        [renderedTransitionLanes],
    );
    const otherNonMainTransitionLane = useMemo(
        () => renderedTransitionLanes.find((lane) => lane.laneId === 'other-seasons') || null,
        [renderedTransitionLanes],
    );
    const hasTransitionData = seasonSalesLanes.length > 0;
    const hasTransitionChartData = renderedTransitionLanes.length > 0;
    const hasLifecycleData = lifecycleData.length > 0;
    const hasAssortmentData = assortmentData.length > 0;
    const filteredAssortmentData = useMemo(
        () => assortmentData.filter((item) => matchesAssortmentFilter(item, activeAssortmentFilter)),
        [activeAssortmentFilter, assortmentData],
    );
    const hasVisibleAssortmentData = filteredAssortmentData.length > 0;
    const assortmentLegendCounts = useMemo(
        () =>
            ASSORTMENT_LEGEND_ITEMS.reduce((acc, item) => {
                acc[item.key] = assortmentData.filter((point) => matchesAssortmentFilter(point, item.key)).length;
                return acc;
            }, {} as Record<AssortmentLegendKey, number>),
        [assortmentData],
    );
    const transitionStandardsTooltipLines = useMemo(() => [
        `主判定：${DASHBOARD_SEASON_TRANSITION_METRIC_STANDARD.primaryMetric.label}；健康护栏：${DASHBOARD_SEASON_TRANSITION_METRIC_STANDARD.healthGuardrailMetric.label}；辅助解释：${DASHBOARD_SEASON_TRANSITION_METRIC_STANDARD.supportingMetric.label}。`,
        `承接断档：月GMV达成率低于 ${fmtPct(DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.amountAchievement.healthyMin)}，且主链占比弱于基线 ${fmtPct(DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.shareGap.mainChainWeakPp)}。`,
        `长尾拖尾：前季或其他非主承接占比超线；占比偏差超过 ${fmtPct(DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.shareGap.warningPp)} 开始预警。`,
        `上新偏离：当前季或下一季起量低于计划带；预警偏差约 ${fmtPct(DASHBOARD_SEASON_TRANSITION_TOLERANCE_STANDARD.shareGap.nextLaunchWarningPp)}。`,
        `常青款目标销售占比：${fmtPct(DASHBOARD_SEASON_TRANSITION_OTB_PARAMETER_STANDARD.trackMix.carryover.salesShareRange.min)} - ${fmtPct(DASHBOARD_SEASON_TRANSITION_OTB_PARAMETER_STANDARD.trackMix.carryover.salesShareRange.max)}。`,
        `生命周期窗口：春 ${DASHBOARD_SEASON_LIFECYCLE_STANDARDS.Q1.windowLabel}；夏 ${DASHBOARD_SEASON_LIFECYCLE_STANDARDS.Q2.windowLabel}；秋 ${DASHBOARD_SEASON_LIFECYCLE_STANDARDS.Q3.windowLabel}；冬 ${DASHBOARD_SEASON_LIFECYCLE_STANDARDS.Q4.windowLabel}。`,
    ], []);
    const assortmentStandardsTooltipLines = useMemo(() => [
        `横轴=累计售罄率；纵轴=净销售额；气泡大小=毛利规模；颜色=经营角色。`,
        `现金牛：高售罄 + 高销售贡献，稳定承接利润与流水。`,
        `引流款：高销售贡献，但售罄仍低于基准线，承担放量与引流角色。`,
        `利润机会：售罄强于基准线，但销售贡献还未放大。`,
        `库存风险：销售贡献与售罄双弱，需要优先复盘。`,
        `伪爆款风险：销售贡献不低，但售罄率低于 ${fmtPct(ASSORTMENT_MATRIX_STANDARD.sellThroughSplit)} 且毛利率低于 ${fmtPct(ASSORTMENT_MATRIX_STANDARD.marginRateRisk)}。`,
        '四个区域与点颜色现在使用同一套象限口径：右上现金牛，左上引流款，右下利润机会，左下库存风险。',
        '单条竖虚线表示盈亏警戒线，当前按 55% 售罄率作为经营安全线；横向虚线表示平均销量线。',
        '默认展示当前筛选下的全部品类；点击顶部图例可一键只看某一类。',
    ], []);
    const transitionInsight = useMemo(() => {
        if (!hasTransitionData || transitionMonthlySummary.length === 0) {
            return {
                windowLabel: '--',
                conclusion: '当前筛选下暂无可判读的季节承接结论。',
                basis: '建议先放宽年份、季别或月份筛选，再观察货季承接金额。',
                action: '暂无动作建议。',
                deviationLabel: '--',
                status: 'normal' as 'normal' | 'warning' | 'critical',
                focusAmount: 0,
                focusLabel: '聚焦货季',
                totalAmount: 0,
            };
        }

        const allAlerts = transitionMonthlySummary.flatMap((item) => item.alerts);
        const primaryAlert = resolveTransitionPrimaryAlert(allAlerts);
        const hasStructureWarning = transitionMonthlySummary.some((item) => item.carryoverHealth !== 'balanced' || item.structureHealth !== 'balanced');
        const status = resolveTransitionInsightStatus(allAlerts, hasStructureWarning);
        const totalRenderedSales = renderedTransitionLanes.reduce((sum, lane) => sum + lane.actualSales, 0);
        const dominantLanePool = renderedTransitionLanes.filter((lane) => lane.actualSales > 0.05);
        const dominantLane = dominantLanePool.length > 0
            ? dominantLanePool.reduce((best, lane) => (lane.actualSales > best.actualSales ? lane : best), dominantLanePool[0])
            : renderedTransitionLanes[0] || null;
        const gapMonths = transitionMonthlySummary.filter((item) => item.alerts.includes('handoff_gap')).map((item) => item.month);
        const dragMonths = transitionMonthlySummary.filter((item) => item.alerts.includes('inventory_drag')).map((item) => item.month);
        const lagMonths = transitionMonthlySummary.filter((item) => item.alerts.includes('launch_laggard')).map((item) => item.month);
        const scopeLabel = resolveDashboardSeasonTransitionScopeLabel({
            wave: String(filters.wave),
            season: String(filters.season),
        });

        if (filters.wave !== 'all') {
            const summary = transitionMonthlySummary[0];
            const focusCandidates = [
                { label: summary.prevSeasonKey, amount: summary.prevSalesAmt },
                { label: summary.currentSeasonKey, amount: summary.currentSalesAmt },
                { label: summary.nextSeasonKey, amount: summary.nextSalesAmt },
                { label: '常青款', amount: summary.carryoverSalesAmt },
                { label: '其他非主承接', amount: summary.otherNonMainSalesAmt },
            ].filter((item) => item.amount > 0);
            const leadingSeason = focusCandidates.sort((a, b) => b.amount - a.amount)[0] || { label: summary.currentSeasonKey, amount: summary.totalSalesAmt };

            let conclusion = '';
            if (primaryAlert === 'handoff_gap') {
                conclusion = `${summary.monthLabel}${summary.currentSeasonKey}承接出现断档，主承接金额未能按计划接住。`;
            } else if (primaryAlert === 'inventory_drag') {
                conclusion = `${summary.monthLabel}${summary.prevSeasonKey}与其他非主承接占比偏高，挤占了${summary.currentSeasonKey}与${summary.nextSeasonKey}的承接空间。`;
            } else if (primaryAlert === 'launch_laggard') {
                conclusion = `${summary.monthLabel}${summary.nextSeasonKey}预热金额低于计划，上新节奏偏慢。`;
            } else if (leadingSeason.label === '常青款') {
                conclusion = `${summary.monthLabel}常青款贡献稳定，形成季节主链之外的常销底盘。`;
            } else {
                conclusion = `${summary.monthLabel}${summary.currentSeasonKey}为主承接季，季节货与常青款的接力基本稳定。`;
            }

            if (!primaryAlert) {
                if (summary.carryoverHealth === 'low') {
                    conclusion = `${summary.monthLabel}常青款底盘偏弱，季节主链之外的常销支撑低于目标。`;
                } else if (summary.carryoverHealth === 'high') {
                    conclusion = `${summary.monthLabel}常青款占比偏高，正在挤占${summary.currentSeasonKey}主承接的陈列与销售空间。`;
                } else if (summary.structureHealth === 'shifted') {
                    const focusLabel = resolveTransitionStructureFocusLabel(summary);
                    conclusion = `${summary.monthLabel}${focusLabel}${summary.structureFocusDirection === 'high' ? '占比高于' : '占比低于'}月度基线，主承接结构出现偏移。`;
                }
            }

            const basis = [
                `${summary.currentSeasonKey}销售额 ${fmtWan(summary.currentSalesAmt)}，占比 ${fmtPct(summary.currentShare)}`,
                `${summary.prevSeasonKey} ${fmtPct(summary.prevShare)}`,
                `${summary.nextSeasonKey} ${fmtPct(summary.nextShare)}`,
                `常青款 ${fmtPct(summary.carryoverShare)} / 目标 ${fmtPct(summary.carryoverShareTarget)}`,
                `其他非主承接 ${fmtPct(summary.otherNonMainShare)}`,
                summary.structureHealth === 'shifted'
                    ? `${resolveTransitionStructureFocusLabel(summary)}偏差 ${summary.structureFocusDirection === 'high' ? '+' : ''}${fmtPct(summary.structureFocusGap)}`
                    : '主链结构落在目标带内',
                `月GMV ${fmtWan(summary.totalSalesAmt)}${compareMode === 'plan' ? ' / 计划 ' + fmtWan(summary.totalPlanAmt) : ''}`,
            ].join('；');

            return {
                windowLabel: formatDashboardSeasonTransitionSingleMonthWindowLabel(leadingSeason.label),
                conclusion,
                basis,
                action: summary.actionRecommendation,
                deviationLabel: compareMode === 'plan' ? formatTransitionGap(summary.totalGapAmt) : fmtWan(leadingSeason.amount || summary.totalSalesAmt),
                status,
                focusAmount: leadingSeason.amount || summary.totalSalesAmt,
                focusLabel: leadingSeason.label,
                totalAmount: summary.totalSalesAmt,
            };
        }

        const totalGap = transitionMonthlySummary.reduce((sum, item) => sum + item.totalGapAmt, 0);
        const mainHandoffSales = mainTransitionLanes.reduce((sum, lane) => sum + lane.actualSales, 0);
        const dominantShare = safeDiv(dominantLane?.actualSales || 0, totalRenderedSales);
        const mainHandoffShare = safeDiv(mainHandoffSales, totalRenderedSales);
        const carryoverShare = safeDiv(carryoverTransitionLane?.actualSales || 0, totalRenderedSales);
        const otherNonMainShare = safeDiv(otherNonMainTransitionLane?.actualSales || 0, totalRenderedSales);
        const triggerSummary = (
            primaryAlert ? transitionMonthlySummary.find((item) => item.alerts.includes(primaryAlert)) : null
        ) || transitionMonthlySummary.find((item) => item.carryoverHealth !== 'balanced' || item.structureHealth !== 'balanced') || transitionMonthlySummary[0];
        const carryoverHighMonths = transitionMonthlySummary.filter((item) => item.carryoverHealth === 'high').map((item) => item.month);
        const carryoverLowMonths = transitionMonthlySummary.filter((item) => item.carryoverHealth === 'low').map((item) => item.month);
        const structureShiftMonths = transitionMonthlySummary.filter((item) => item.structureHealth === 'shifted').map((item) => item.month);

        let conclusion = '';
        if (primaryAlert === 'handoff_gap') {
            conclusion = `${joinTransitionMonthLabels(gapMonths)}出现承接断档，${dominantLane?.label || '主承接货季'}与相邻季别的接力不足。`;
        } else if (primaryAlert === 'inventory_drag') {
            conclusion = `${joinTransitionMonthLabels(dragMonths)}出现长尾拖尾，旧季与其他非主承接占比超标。`;
        } else if (primaryAlert === 'launch_laggard') {
            conclusion = `${joinTransitionMonthLabels(lagMonths)}出现上新偏离，下一季预热金额未达基线。`;
        } else if (dominantLane?.laneId === 'carryover-season') {
            conclusion = `常青款在当前筛选范围内形成稳定底盘，季节主链与常销货盘协同接力。`;
        } else {
            conclusion = `${dominantLane?.label || '当前主季'}为主力承接货季，当前筛选范围内的季节接力整体稳定。`;
        }

        if (!primaryAlert) {
            if (carryoverHighMonths.length > 0) {
                conclusion = `${joinTransitionMonthLabels(carryoverHighMonths)}常青款占比高于目标区间，主季承接空间被常销货盘挤占。`;
            } else if (carryoverLowMonths.length > 0) {
                conclusion = `${joinTransitionMonthLabels(carryoverLowMonths)}常青款底盘偏弱，全年常销支撑不足。`;
            } else if (structureShiftMonths.length > 0) {
                conclusion = `${joinTransitionMonthLabels(structureShiftMonths)}主承接结构偏离月度基线，换季节奏需要重新校正。`;
            }
        }

        const abnormalMonths = Array.from(new Set([...gapMonths, ...dragMonths, ...lagMonths])).sort((a, b) => a - b);
        const basis = [
            `${dominantLane?.label || '主承接货季'}销售额 ${fmtWan(dominantLane?.actualSales || 0)}，占比 ${fmtPct(dominantShare)}`,
            `主承接货季合计占比 ${fmtPct(mainHandoffShare)}`,
            `常青款 ${fmtPct(carryoverShare)} / 目标 ${fmtPct(triggerSummary.carryoverShareTarget)}`,
            `其他非主承接 ${fmtPct(otherNonMainShare)}`,
            carryoverHighMonths.length > 0
                ? `常青偏高月份 ${joinTransitionMonthLabels(carryoverHighMonths)}`
                : carryoverLowMonths.length > 0
                  ? `常青偏低月份 ${joinTransitionMonthLabels(carryoverLowMonths)}`
                  : structureShiftMonths.length > 0
                    ? `结构偏移月份 ${joinTransitionMonthLabels(structureShiftMonths)}`
                    : abnormalMonths.length > 0
                      ? `异常月份 ${joinTransitionMonthLabels(abnormalMonths)}`
                      : '未发现超出基线的异常月份',
        ].join('；');

        return {
            windowLabel: scopeLabel,
            conclusion,
            basis,
            action: triggerSummary.actionRecommendation,
            deviationLabel: compareMode === 'plan' ? formatTransitionGap(totalGap) : fmtWan(dominantLane?.actualSales || totalRenderedSales),
            status,
            focusAmount: dominantLane?.actualSales || totalRenderedSales,
            focusLabel: dominantLane?.label || '聚焦货季',
            totalAmount: totalRenderedSales,
        };
    }, [carryoverTransitionLane, compareMode, filters.season, filters.wave, hasTransitionData, mainTransitionLanes, otherNonMainTransitionLane, renderedTransitionLanes, transitionMonthlySummary]);


    const transitionBasisLines = useMemo(
        () => transitionInsight.basis
            .split(/[;；]/)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 4),
        [transitionInsight.basis],
    );
    const transitionGapMonthSet = useMemo(
        () => new Set(transitionMonthlySummary.filter((item) => item.alerts.includes('handoff_gap')).map((item) => item.month)),
        [transitionMonthlySummary],
    );
    const transitionDragMonthSet = useMemo(
        () => new Set(transitionMonthlySummary.filter((item) => item.alerts.includes('inventory_drag')).map((item) => item.month)),
        [transitionMonthlySummary],
    );
    const transitionLagMonthSet = useMemo(
        () => new Set(transitionMonthlySummary.filter((item) => item.alerts.includes('launch_laggard')).map((item) => item.month)),
        [transitionMonthlySummary],
    );
    const transitionLaneMonthAlertMap = useMemo(() => {
        const map = new Map<string, Map<number, Set<string>>>();
        transitionAnalysisTable.forEach((row) => {
            if (row.alerts.length === 0) return;
            const laneMap = map.get(row.laneId) || new Map<number, Set<string>>();
            const monthAlerts = laneMap.get(row.month) || new Set<string>();
            row.alerts.forEach((alert) => monthAlerts.add(alert));
            laneMap.set(row.month, monthAlerts);
            map.set(row.laneId, laneMap);
        });
        return map;
    }, [transitionAnalysisTable]);
    const transitionLaneAlertMap = useMemo(() => {
        const map = new Map<string, Set<string>>();
        transitionAnalysisTable.forEach((row) => {
            if (row.alerts.length === 0) return;
            const laneAlerts = map.get(row.laneId) || new Set<string>();
            row.alerts.forEach((alert) => laneAlerts.add(alert));
            map.set(row.laneId, laneAlerts);
        });
        return map;
    }, [transitionAnalysisTable]);

    const lifecycleInsight = useMemo(() => {
        if (!hasLifecycleData) {
            return {
                windowLabel: '--',
                conclusion: '当前筛选下暂无可观测的库龄层级指标。',
                basis: '暂无数据依据。',
                action: '建议先放宽时间或品类筛选。',
                status: 'normal' as 'normal' | 'warning' | 'critical',
                actualNewShare: 0,
                targetNewShare: 0.5,
            };
        }

        const newDominantPeriods = lifecycleData.filter((item) => item.newShare >= 0.5);
        const windowLabel =
            newDominantPeriods.length === 0
                ? '未形成新品主导'
                : newDominantPeriods.length === 1
                  ? newDominantPeriods[0].periodLabel
                  : `${newDominantPeriods[0].periodLabel}-${newDominantPeriods[newDominantPeriods.length - 1].periodLabel}`;

        const selectedMonth = filters.wave !== 'all' ? getDashboardMonthByWave(normalizeDashboardWave(filters.wave) || String(filters.wave)) : null;

        
        let targetNewShare = 0;
        let targetOldPressure = 0;
        let actualNewShare = 0;
        let actualOldPressure = 0;
        let status: 'normal' | 'warning' | 'critical' = 'normal';
        let conclusion = '';
        let basis = '';
        let action = '';

        if (selectedMonth !== null) {
            // ==========================================
            // LOGIC A: 聚焦单一月份 (波段微操)
            // ==========================================
            const latest = lifecycleData[lifecycleData.length - 1]; // 单个波段通常只有一条，或最后一条即为该波段
            actualNewShare = latest.newShare;
            actualOldPressure = latest.oldShare + latest.pastShare;
            
            const currentSeason = filters.season !== 'all' ? filters.season as 'Q1' | 'Q2' | 'Q3' | 'Q4' : 'Q1';
            const window = SEASON_SALES_WINDOWS[currentSeason];
            const totalMonths = window.monthWeights.length;
            const monthIdx = window.monthWeights.findIndex(w => w.month === selectedMonth);
            
            let progress = 0.5;
            if (monthIdx !== -1) progress = monthIdx / (totalMonths - 1);

            const isEarly = progress < 0.25;
            const isLate = progress > 0.75;
            targetNewShare = isEarly ? 0.82 : isLate ? 0.45 : 0.62;
            targetOldPressure = isEarly ? 0.15 : isLate ? 0.55 : 0.35;

            const isNewFailing = actualNewShare < targetNewShare;
            const isOldPressuring = actualOldPressure > targetOldPressure;
            
            if (isNewFailing && isOldPressuring) status = 'critical';
            else if (isNewFailing || isOldPressuring) status = 'warning';

            conclusion = status === 'critical'
                ? '新品主导严重滞后，存量货池正在挤压新品销售。'
                : status === 'warning'
                    ? isNewFailing ? '新品动能不足，未达到阶段预期。' : '老品占比偏高，建议启动库存清理。'
                    : '新品主导力较强，当前波段库龄结构健康。';

            basis = `当前${isEarly ? '开季期' : isLate ? '季末期' : '主销期'}；新品占比 ${fmtPct(actualNewShare)}（本阶段目标 ${fmtPct(targetNewShare)}）；次新品及老品合计 ${fmtPct(actualOldPressure)}。`;

            action = status === 'critical'
                ? '立即启动陈列强制切换指令，压缩老货排面，释放新品销售空间。'
                : status === 'warning'
                    ? '审查新品入店率及价格带竞争力，必要时对次新品进行集中特卖。'
                    : '维持当前推进节奏，重点关注新品售罄质量及连带率。';
        } else {
            // ==========================================
            // LOGIC B: 宏观全局 (全季节或单季节的全盘总结)
            // ==========================================
            const isFullYear = filters.season === 'all';
            targetOldPressure = isFullYear ? 0.40 : 0.35;

            const totalLifecycleSales = lifecycleData.reduce((sum, item) => sum + item.totalSales, 0);
            actualNewShare = safeDiv(lifecycleData.reduce((sum, item) => sum + item.newSales, 0), Math.max(totalLifecycleSales, 1));
            actualOldPressure = safeDiv(lifecycleData.reduce((sum, item) => sum + item.oldSales + item.pastSales, 0), Math.max(totalLifecycleSales, 1));

            const goodMonths = lifecycleData.filter(item => item.newShare > targetNewShare).length;
            const totalMonthsCount = lifecycleData.length;
            const hitRatio = totalMonthsCount > 0 ? goodMonths / totalMonthsCount : 0;

            if (actualNewShare < targetNewShare - 0.15 || hitRatio < 0.25) status = 'critical';
            else if (actualNewShare < targetNewShare || hitRatio < 0.5) status = 'warning';

            conclusion = status === 'critical'
                ? `${isFullYear ? '全年' : '该季'}盘面由旧货主导，品牌焕新策略落地失效。`
                : status === 'warning'
                    ? '整体推新力度偏弱，存在过度依赖清仓维持流水的迹象。'
                    : `${isFullYear ? '全年' : '季节'}整体上新势能良好，新品兑现了大部分业绩。`;

            basis = `全局视角下，${totalMonthsCount} 个监控月中有 ${goodMonths} 个月超过新品主导线；综合新品均值 ${fmtPct(actualNewShare)}（基准 ${fmtPct(targetNewShare)}）。`;

            action = status === 'critical'
                ? '必须彻查商品企划与终端执行的断层，重新制定来年的上新波段与旧货消化底线。'
                : status === 'warning'
                    ? '建议在后续 OTBM 预算规划中严格限制次新品采购比例，逼迫终端卖新。'
                    : '全局健康，建议继续深挖那些常青贡献的爆款，形成稳固的经典款基盘。';
        }

        return {
            windowLabel,
            conclusion,
            basis,
            action,
            status,
            actualNewShare,
            targetNewShare,
        };
    }, [hasLifecycleData, lifecycleData, filters.wave, filters.season]);

    const assortmentInsight = useMemo(() => {
        if (!hasAssortmentData) {
            return {
                cashCow: null as AssortmentDataPoint | null,
                pseudoRisk: null as AssortmentDataPoint | null,
            };
        }

        return {
            cashCow: assortmentData.find((item) => item.role === 'Cash Cow') || assortmentData[0] || null,
            pseudoRisk:
                assortmentData.find((item) => item.pseudoExplosiveRisk) ||
                assortmentData.find((item) => item.role === 'Risk') ||
                null,
        };
    }, [assortmentData, hasAssortmentData]);
    const assortmentActionSummary = useMemo(() => {
        const riskItems = assortmentData.filter((item) => matchesAssortmentFilter(item, 'risk'));
        const pseudoRiskItems = assortmentData.filter((item) => item.pseudoExplosiveRisk);
        const visibleSales = filteredAssortmentData.reduce((sum, item) => sum + item.sales, 0);
        const riskSales = riskItems.reduce((sum, item) => sum + item.sales, 0);

        return {
            focusLabel: resolveAssortmentFilterLabel(activeAssortmentFilter),
            visibleCount: filteredAssortmentData.length,
            visibleSales: Number(visibleSales.toFixed(1)),
            riskCount: riskItems.length,
            riskSales: Number(riskSales.toFixed(1)),
            pseudoRiskCount: pseudoRiskItems.length,
        };
    }, [activeAssortmentFilter, assortmentData, filteredAssortmentData]);

    const assortmentChartData = useMemo(() => filteredAssortmentData, [filteredAssortmentData]);
    const assortmentLabelMeta = useMemo(() => {
        const labelCategories = new Set<string>();

        if (filteredAssortmentData.length <= 6) {
            filteredAssortmentData.forEach((item) => labelCategories.add(item.category));
        } else {
            filteredAssortmentData
                .slice()
                .sort((a, b) => b.sales - a.sales)
                .slice(0, activeAssortmentFilter === 'all' ? 6 : 5)
                .forEach((item) => labelCategories.add(item.category));

            if (assortmentInsight.cashCow?.category) labelCategories.add(assortmentInsight.cashCow.category);
            if (assortmentInsight.pseudoRisk?.category) labelCategories.add(assortmentInsight.pseudoRisk.category);
        }

        const maxVisibleSales = filteredAssortmentData.length > 0 ? Math.max(...filteredAssortmentData.map((item) => item.sales)) : 1;
        const placementPattern: AssortmentLabelPlacement[] = [
            { position: 'top', offset: [0, 10] },
            { position: 'right', offset: [10, 0] },
            { position: 'left', offset: [-10, 0] },
            { position: 'bottom', offset: [0, -10] },
            { position: 'top', offset: [16, 14] },
            { position: 'top', offset: [-16, 14] },
        ];
        const clusterUsage = new Map<string, number>();
        const placements = new Map<string, AssortmentLabelPlacement>();

        filteredAssortmentData
            .filter((item) => labelCategories.has(item.category))
            .sort((a, b) => a.sellThrough - b.sellThrough || b.sales - a.sales)
            .forEach((item) => {
                const xBucket = Math.round((item.sellThrough * 100) / 12);
                const yBucket = Math.round((item.sales / Math.max(maxVisibleSales, 1)) * 4);
                const clusterKey = `${xBucket}-${yBucket}`;
                const clusterIndex = clusterUsage.get(clusterKey) || 0;
                placements.set(item.category, placementPattern[clusterIndex % placementPattern.length]);
                clusterUsage.set(clusterKey, clusterIndex + 1);
            });

        return { labelCategories, placements };
    }, [activeAssortmentFilter, assortmentInsight.cashCow?.category, assortmentInsight.pseudoRisk?.category, filteredAssortmentData]);

    const assortmentSalesScaleLine = useMemo(
        () => assortmentData.length > 0
            ? Number((assortmentData.reduce((sum, item) => sum + item.sales, 0) / assortmentData.length).toFixed(1))
            : 400,
        [assortmentData],
    );

    const showPlanOverlay = compareMode === 'plan';
    const isSingleTransitionMonth = transitionVisibleRange.startMonth === transitionVisibleRange.endMonth;

    const transitionOption = useMemo<EChartsOption>(() => ({
        backgroundColor: 'transparent',
        animationDuration: 700,
        tooltip: {
            trigger: 'item',
            appendToBody: true,
            backgroundColor: 'rgba(255,255,255,0.98)',
            borderColor: 'rgba(15,23,42,0.08)',
            textStyle: { color: '#0F172A', fontSize: 13 },
            formatter: (params: any) => {
                const lane = renderedTransitionLanes[params.dataIndex];
                if (!lane) return '';
                return resolveSeasonLaneTooltip(lane, showPlanOverlay);
            },
        },
        grid: { top: 32, left: 60, right: 36, bottom: 8, containLabel: true },
        xAxis: [
            {
                type: 'value',
                min: transitionVisibleRange.minAxis,
                max: transitionVisibleRange.maxAxis,
                interval: 1,
                axisLine: { lineStyle: { color: '#E2E8F0' } },
                axisTick: { show: false },
                axisLabel: { show: false },
                splitLine: { show: true, lineStyle: { color: 'rgba(148,163,184,0.12)' } },
            },
            {
                type: 'category',
                position: 'bottom',
                boundaryGap: true,
                data: transitionAxisLabels,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    interval: 0,
                    hideOverlap: false,
                    margin: -12,
                    formatter: (value: string, index: number) => {
                        const month = transitionVisibleRange.startMonth + index;
                        if (transitionGapMonthSet.has(month)) {
                            return '{gapBadge|断档}\n{base|' + value + '}';
                        }
                        return '{placeholder|}\n{base|' + value + '}';
                    },
                    rich: {
                        base: { color: '#64748B', fontWeight: 500, lineHeight: 20 },
                        gapBadge: {
                            color: '#fff',
                            fontSize: 9,
                            fontWeight: 700,
                            padding: [2, 5],
                            backgroundColor: 'rgba(225, 29, 72, 0.82)',
                            borderRadius: 3,
                            lineHeight: 18,
                        },
                        placeholder: { lineHeight: 18 },
                        gap: { color: '#334155', fontWeight: 700 },
                        lag: { color: '#334155', fontWeight: 700 },
                        drag: { color: '#334155', fontWeight: 700 },
                    },
                },
                splitLine: { show: false },
            },
        ],
        yAxis: {
            type: 'category',
            inverse: true,
            data: renderedTransitionLanes.map((lane) => lane.label),
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#334155', fontWeight: 600 },
            splitLine: { show: false },
        },
        series: [
            {
                type: 'custom',
                coordinateSystem: 'cartesian2d',
                xAxisIndex: 0,
                yAxisIndex: 0,
                data: renderedTransitionLanes.map((lane, index) => [lane.start, index, lane.end]),
                renderItem: (params: any, api: any) => {
                    const lane = renderedTransitionLanes[params.dataIndex];
                    if (!lane) return null;
                    const startPoint = api.coord([lane.start, api.value(1)]);
                    const endPoint = api.coord([lane.end, api.value(1)]);
                    const slotMonth = lane.monthBreakdown[0]?.slotAxisValue ?? transitionVisibleRange.startMonth;
                    const slotStartPoint = api.coord([slotMonth, api.value(1)]);
                    const slotEndPoint = api.coord([slotMonth + 1, api.value(1)]);
                    const clippedWidth = endPoint[0] - startPoint[0];
                    const slotWidth = slotEndPoint[0] - slotStartPoint[0];
                    const cellWidth = isSingleTransitionMonth ? slotWidth : clippedWidth;
                    const height = Math.min(
                        isSingleTransitionMonth ? 46 : 48,
                        Math.abs(api.size([0, 1])[1]) * (isSingleTransitionMonth ? 0.45 : 0.5),
                    );
                    const width = isSingleTransitionMonth
                        ? Math.min(300, Math.max(180, cellWidth * 0.34))
                        : Math.max(120, clippedWidth);
                    const x = isSingleTransitionMonth ? slotStartPoint[0] + (slotWidth - width) / 2 : startPoint[0];
                    const y = startPoint[1] - height / 2;
                    const amountText = showPlanOverlay
                        ? '计划 ' + fmtWan(lane.planSales) + ' / 实际 ' + fmtWan(lane.actualSales)
                        : fmtWan(lane.actualSales);
                    const compressedRange = lane.rangeLabel.replace(/\d{4}\//g, '').replace(/-/g, ' - ');
                    const isShortBar = width < 120;
                    const showRangeText = width >= 80;
                    const amountFont = width >= 220 ? '700 12px sans-serif' : '700 11px sans-serif';
                    const rangeFont = '10px sans-serif';
                    const amountX = isShortBar ? x + width + 8 : x + width / 2;
                    const amountY = y + height / 2;
                    const amountAlign = isShortBar ? 'left' : 'center';
                    const rangeX = x + width / 2;
                    const rangeY = y + height + 2;
                    const dotY = y + height - 2;
                    const isResidual = lane.laneId === 'other-seasons' || lane.laneId === 'residual';
                    const laneAlerts = transitionLaneAlertMap.get(lane.laneId) || new Set();
                    const laneMonthAlerts = transitionLaneMonthAlertMap.get(lane.laneId) || new Map();
                    const hasInventoryDrag = laneAlerts.has('inventory_drag');
                    const hasLaunchLaggard = laneAlerts.has('launch_laggard');
                    const monthDots = lane.monthBreakdown.map((point) => {
                        const dot = api.coord([point.axisValue, api.value(1)]);
                        const cx = isSingleTransitionMonth ? x + width / 2 : dot[0];
                        const monthAlerts = laneMonthAlerts.get(point.slotAxisValue) || new Set();
                        const isLaunchDot = monthAlerts.has('launch_laggard');
                        const isDragDot = monthAlerts.has('inventory_drag');
                        const isGapDot = monthAlerts.has('handoff_gap');
                        return {
                            type: 'circle',
                            shape: {
                                cx,
                                cy: dotY,
                                r: isLaunchDot ? 4 : width >= 200 ? 3.1 : 2.8,
                            },
                            style: {
                                fill: isLaunchDot ? '#FFFFFF' : isDragDot ? '#F59E0B' : isGapDot ? '#FB7185' : lane.color,
                                stroke: isLaunchDot ? '#DC2626' : '#FFFFFF',
                                lineWidth: isLaunchDot ? 2 : 1.2,
                                opacity: 0.95,
                                shadowBlur: isLaunchDot || isDragDot || isGapDot ? 8 : 6,
                                shadowColor: isLaunchDot ? '#DC2626' : isDragDot ? '#F59E0B' : isGapDot ? '#FB7185' : lane.color,
                            },
                        };
                    });
                    return {
                        type: 'group',
                        children: [
                            {
                                type: 'rect',
                                shape: { x, y, width, height, r: 20 },
                                style: {
                                    fill: isResidual ? 'rgba(241, 245, 249, 0.4)' : lane.fill,
                                    stroke: isResidual
                                        ? hasInventoryDrag
                                            ? 'rgba(245, 158, 11, 0.55)'
                                            : 'rgba(148, 163, 184, 0.3)'
                                        : hasInventoryDrag
                                          ? 'rgba(245, 158, 11, 0.75)'
                                          : hasLaunchLaggard
                                            ? 'rgba(239, 68, 68, 0.42)'
                                            : lane.border,
                                    lineWidth: hasInventoryDrag ? 2 : 1.4,
                                    lineDash: isResidual ? [4, 4] : hasInventoryDrag ? [8, 5] : undefined,
                                    shadowBlur: hasInventoryDrag ? 10 : 0,
                                    shadowColor: hasInventoryDrag ? 'rgba(245, 158, 11, 0.28)' : 'transparent',
                                },
                            },
                            {
                                type: 'text',
                                style: {
                                    x: amountX,
                                    y: amountY,
                                    text: amountText,
                                    fill: isShortBar ? '#64748B' : lane.color,
                                    font: amountFont,
                                    textAlign: amountAlign,
                                    textVerticalAlign: 'middle',
                                },
                            },
                            ...(showRangeText
                                ? [
                                    {
                                        type: 'text',
                                        style: {
                                            x: rangeX,
                                            y: rangeY,
                                            text: compressedRange,
                                            fill: '#94A3B8',
                                            font: rangeFont,
                                            textAlign: 'center',
                                            textVerticalAlign: 'top',
                                        },
                                    },
                                ]
                                : []),
                            ...monthDots,
                        ],
                    };
                },
            } as any,
            {
                type: 'line',
                xAxisIndex: 0,
                yAxisIndex: 0,
                data: [],
                silent: true,
                symbol: 'none',
                lineStyle: { opacity: 0 },
                tooltip: { show: false },
                markLine: {
                    symbol: 'none',
                    silent: true,
                    animation: false,
                    label: { show: false },
                    lineStyle: { color: 'rgba(225, 29, 72, 0.45)', width: 1, type: 'dashed' },
                    data: Array.from(transitionGapMonthSet).map((month) => ({ xAxis: month + 0.5 })),
                },
            },
        ],
    }), [
        isSingleTransitionMonth,
        renderedTransitionLanes,
        showPlanOverlay,
        transitionAxisLabels,
        transitionVisibleRange,
        transitionDragMonthSet,
        transitionGapMonthSet,
        transitionLagMonthSet,
        transitionLaneAlertMap,
        transitionLaneMonthAlertMap,
    ]);

    const lifecycleOption = useMemo<EChartsOption>(() => ({
        backgroundColor: 'transparent',
        animationDuration: 700,
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(255, 255, 255, 0.97)',
            borderColor: 'rgba(15, 23, 42, 0.08)',
            textStyle: { color: '#0F172A', fontSize: 13 },
            formatter: (params: any) => {
                const rows = Array.isArray(params) ? params : [params];
                const point = lifecycleData[rows[0]?.dataIndex ?? 0];
                if (!point) return '';
                const colorMap: Record<string, string> = {
                    '新品': '#0EA5E9',
                    '次新品': '#CBD5E1',
                    '老品': '#334155',
                };
                const detailRows = [
                    ['新品', point.newShare, point.newSales],
                    ['次新品', point.pastShare, point.pastSales],
                    ['老品', point.oldShare, point.oldSales],
                ]
                    .map(([label, share, sales]) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:6px;">
                                <span style="display:inline-flex;align-items:center;gap:8px;">
                                    <span style="width:8px;height:8px;border-radius:9999px;background:${colorMap[String(label)]};"></span>
                                    ${label}
                                </span>
                                <span>${fmtPct(Number(share), 1)} / ${fmtWan(Number(sales))}</span>
                            </div>`)
                    .join('');
                return `
                    <div style="min-width: 220px;">
                        <div style="font-weight:600;">${point.periodLabel}</div>
                        <div style="margin-top:4px;color:#64748B;">总净销售额：${fmtWan(point.totalSales)}</div>
                        ${detailRows}
                    </div>
                `;
            },
        },
        legend: {
            data: ['次新品', '老品', '新品'],
            icon: 'circle',
            top: 10,
            textStyle: { color: '#94A3B8', fontSize: 12 },
        },
        grid: { top: 64, left: 44, right: 28, bottom: 36, containLabel: true },
        xAxis: {
            type: 'category',
            data: lifecycleData.map((item) => item.periodLabel),
            axisLine: { lineStyle: { color: '#E2E8F0' } },
            axisTick: { show: false },
            axisLabel: { color: '#64748B', interval: 0 },
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: 100,
            splitNumber: 5,
            splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.05)', type: 'dashed' } },
            axisLabel: { color: '#64748B', formatter: '{value}%' },
        },
        series: [
            {
                name: '次新品',
                type: 'bar',
                stack: 'lifecycle-share',
                barMaxWidth: 42,
                itemStyle: { color: '#CBD5E1', borderRadius: [0, 0, 4, 4] },
                emphasis: { focus: 'series' },
                label: {
                    show: true,
                    position: 'inside',
                    color: '#FFFFFF',
                    fontSize: 11,
                    formatter: (params: any) => Number(params.value) >= 12 ? `${Number(params.value).toFixed(0)}%` : '',
                },
                data: lifecycleData.map((item) => Number((item.pastShare * 100).toFixed(1))),
            },
            {
                name: '老品',
                type: 'bar',
                stack: 'lifecycle-share',
                barMaxWidth: 42,
                itemStyle: { color: '#334155' },
                emphasis: { focus: 'series' },
                label: {
                    show: true,
                    position: 'inside',
                    color: '#FFFFFF',
                    fontSize: 11,
                    formatter: (params: any) => Number(params.value) >= 12 ? `${Number(params.value).toFixed(0)}%` : '',
                },
                data: lifecycleData.map((item) => Number((item.oldShare * 100).toFixed(1))),
            },
            {
                name: '新品',
                type: 'bar',
                stack: 'lifecycle-share',
                barMaxWidth: 42,
                itemStyle: { color: '#0EA5E9', borderRadius: [4, 4, 0, 0] },
                emphasis: { focus: 'series' },
                label: {
                    show: true,
                    position: 'inside',
                    color: '#FFFFFF',
                    fontSize: 11,
                    formatter: (params: any) => Number(params.value) >= 12 ? `${Number(params.value).toFixed(0)}%` : '',
                },
                markLine: {
                    symbol: 'none',
                    silent: true,
                    lineStyle: {
                        type: 'dashed',
                        color: lifecycleInsight.status === 'critical' ? 'rgba(225, 29, 72, 0.4)' : 'rgba(15, 23, 42, 0.18)',
                        width: lifecycleInsight.status === 'critical' ? 2 : 1,
                    },
                    label: {
                        formatter: '战略主导线 ' + fmtPct(lifecycleInsight.targetNewShare, 0),
                        color: lifecycleInsight.status === 'critical' ? '#E11D48' : '#64748B',
                    },
                    data: [{ yAxis: lifecycleInsight.targetNewShare * 100 }],
                },
                data: lifecycleData.map((item) => Number((item.newShare * 100).toFixed(1))),
            },
        ],
    }), [lifecycleData, lifecycleInsight.status, lifecycleInsight.targetNewShare]);
    const assortmentOption = useMemo<EChartsOption>(() => {
        const maxSales = assortmentData.length > 0 ? Math.max(...assortmentData.map((item) => item.sales)) : 100;
        const yMax = Math.max(Number((maxSales * 1.15).toFixed(1)), assortmentSalesScaleLine + 80, 100);
        const sellThroughSplit = ASSORTMENT_MATRIX_STANDARD.sellThroughSplit * 100;

        const scatterData = assortmentChartData.map((item) => {
            const color = resolveAssortmentRoleColor(item);
            const glowColor = item.pseudoExplosiveRisk
                ? 'rgba(225, 29, 72, 0.7)'
                : item.role === 'Cash Cow'
                    ? 'rgba(16, 185, 129, 0.38)'
                    : item.role === 'Traffic Driver'
                        ? 'rgba(14, 165, 233, 0.32)'
                        : item.role === 'Profit Builder'
                            ? 'rgba(245, 158, 11, 0.32)'
                            : 'rgba(251, 113, 133, 0.34)';
            const labelPlacement = assortmentLabelMeta.placements.get(item.category) || { position: 'top', offset: [0, 10] as [number, number] };
            const shouldShowLabel = assortmentLabelMeta.labelCategories.has(item.category);

            return {
                name: item.category,
                roleLabel: resolveAssortmentRoleLabel(item),
                pseudoExplosiveRisk: item.pseudoExplosiveRisk,
                newShare: item.newShare,
                oldPressureShare: item.oldPressureShare,
                topSkus: item.topSkus,
                value: [
                    Number((item.sellThrough * 100).toFixed(1)),
                    item.sales,
                    item.margin,
                    Number((item.marginRate * 100).toFixed(1)),
                ],
                label: {
                    show: shouldShowLabel,
                    position: labelPlacement.position,
                    offset: labelPlacement.offset,
                },
                emphasis: {
                    label: {
                        show: true,
                        position: labelPlacement.position,
                        offset: labelPlacement.offset,
                    },
                },
                itemStyle: {
                    color,
                    borderColor: item.pseudoExplosiveRisk ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.9)',
                    borderWidth: item.pseudoExplosiveRisk ? 3.5 : 1.8,
                    shadowBlur: item.pseudoExplosiveRisk ? 30 : item.role === 'Cash Cow' ? 24 : 18,
                    shadowColor: glowColor,
                    opacity: item.pseudoExplosiveRisk ? 1 : 0.95,
                },
            };
        });

        return {
            backgroundColor: 'transparent',
            animationDuration: 800,
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                borderColor: 'rgba(0, 0, 0, 0.05)',
                textStyle: { color: '#0F172A', fontSize: 13 },
                formatter: (params: any) => {
                    const payload = Array.isArray(params) ? params[0] : params;
                    const point = payload?.data ?? null;
                    const value = Array.isArray(point?.value)
                        ? point.value
                        : Array.isArray(payload?.value)
                            ? payload.value
                            : [];
                    const name = point?.name || payload?.name || '未命名品类';
                    const roleLabel = point?.roleLabel || '结构观察';
                    const sellThrough = Number(value[0] ?? 0);
                    const sales = Number(value[1] ?? 0);
                    const margin = Number(value[2] ?? 0);
                    const marginRate = Number(value[3] ?? 0);
                    const newShare = Number(point?.newShare ?? 0);
                    const oldPressureShare = Number(point?.oldPressureShare ?? 0);
                    const topSkus = Array.isArray(point?.topSkus) ? point.topSkus as AssortmentTopSku[] : [];
                    const topSkuRows = topSkus.length > 0
                        ? topSkus
                            .map((sku, index) => `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:6px;">
                                    <span style="color:#475569;">${index + 1}. ${escapeHtml(sku.skuName)}</span>
                                    <span style="font-weight:600;color:#0F172A;">${fmtWan(sku.sales)}</span>
                                </div>`)
                            .join('')
                        : '<div style="margin-top:6px;color:#94A3B8;">暂无 SKU 明细</div>';

                    return `
                        <div style="min-width:280px;">
                            <div style="font-size:14px;font-weight:700;">${escapeHtml(name)}</div>
                            <div style="margin-top:4px;color:#64748B;">角色：${escapeHtml(roleLabel)}</div>
                            <div style="margin-top:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px;">
                                <div>
                                    <div style="font-size:11px;color:#94A3B8;">累计售罄率</div>
                                    <div style="margin-top:2px;font-weight:600;">${sellThrough.toFixed(1)}%</div>
                                </div>
                                <div>
                                    <div style="font-size:11px;color:#94A3B8;">净销售额</div>
                                    <div style="margin-top:2px;font-weight:600;">${sales.toFixed(1)}万</div>
                                </div>
                                <div>
                                    <div style="font-size:11px;color:#94A3B8;">毛利额</div>
                                    <div style="margin-top:2px;font-weight:600;">${margin.toFixed(1)}万</div>
                                </div>
                                <div>
                                    <div style="font-size:11px;color:#94A3B8;">毛利率</div>
                                    <div style="margin-top:2px;font-weight:600;">${marginRate.toFixed(1)}%</div>
                                </div>
                            </div>
                            <div style="margin-top:12px;border-top:1px solid rgba(148,163,184,0.18);padding-top:10px;">
                                <div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;">
                                    <span style="color:#64748B;">新品销售占比</span>
                                    <span style="font-weight:600;">${fmtPct(newShare, 1)}</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;margin-top:6px;">
                                    <span style="color:#64748B;">老品压力（次新+老品）</span>
                                    <span style="font-weight:600;">${fmtPct(oldPressureShare, 1)}</span>
                                </div>
                            </div>
                            <div style="margin-top:12px;border-top:1px solid rgba(148,163,184,0.18);padding-top:10px;">
                                <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#94A3B8;text-transform:uppercase;">Top 3 SKU</div>
                                ${topSkuRows}
                            </div>
                        </div>
                    `;
                },
            },
            grid: { top: 52, left: 56, right: 40, bottom: 52, containLabel: true },
            xAxis: {
                type: 'value',
                name: '累计售罄率 (%)',
                nameTextStyle: { color: '#64748B', align: 'center', padding: [10, 0, 0, 0] },
                nameLocation: 'middle',
                splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.03)', type: 'dashed' } },
                axisLine: { lineStyle: { color: '#E2E8F0' } },
                axisLabel: { color: '#94A3B8', formatter: '{value}%' },
                min: 0,
                max: 100,
            },
            yAxis: {
                type: 'value',
                name: '净销售额 (万)',
                nameTextStyle: { color: '#64748B', padding: [0, 0, 15, 0] },
                splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.03)', type: 'dashed' } },
                axisLine: { lineStyle: { color: '#E2E8F0' } },
                axisLabel: { color: '#94A3B8' },
                min: 0,
                max: yMax,
            },
            series: [
                {
                    name: '品类分布',
                    type: 'scatter',
                    markArea: {
                        silent: true,
                        label: {
                            show: true,
                            position: 'inside',
                            align: 'center',
                            verticalAlign: 'middle',
                            distance: 0,
                            color: 'rgba(148,163,184,0.14)',
                            fontSize: 30,
                            fontWeight: 700,
                        },
                        data: [
                            [{ name: '库存警示区', xAxis: 0, yAxis: 0, itemStyle: { color: 'rgba(251,113,133,0.05)' } }, { xAxis: sellThroughSplit, yAxis: assortmentSalesScaleLine }],
                            [{ name: '引流放量区', xAxis: 0, yAxis: assortmentSalesScaleLine, itemStyle: { color: 'rgba(14,165,233,0.045)' } }, { xAxis: sellThroughSplit, yAxis: yMax }],
                            [{ name: '利润机会区', xAxis: sellThroughSplit, yAxis: 0, itemStyle: { color: 'rgba(245,158,11,0.045)' } }, { xAxis: 100, yAxis: assortmentSalesScaleLine }],
                            [{ name: '高贡献核心区', xAxis: sellThroughSplit, yAxis: assortmentSalesScaleLine, itemStyle: { color: 'rgba(16,185,129,0.055)' } }, { xAxis: 100, yAxis: yMax }],
                        ],
                    },
                    markLine: {
                        silent: true,
                        symbol: 'none',
                        data: [
                            { xAxis: sellThroughSplit, lineStyle: { type: 'dashed', color: 'rgba(100,116,139,0.36)', width: 1.25 }, label: { formatter: '盈亏警戒线', position: 'insideEndTop', color: '#64748B', fontSize: 11 } },
                            { yAxis: assortmentSalesScaleLine, lineStyle: { type: 'dashed', color: 'rgba(100,116,139,0.22)', width: 1 }, label: { formatter: '平均销量线', position: 'insideEnd', color: '#94A3B8', fontSize: 10 } },
                        ],
                    },
                    data: scatterData,
                    label: {
                        show: false,
                        formatter: '{b}',
                        color: '#334155',
                        fontSize: 11,
                        fontWeight: 600,
                        distance: 10,
                        textShadowBlur: 10,
                        textShadowColor: 'rgba(255,255,255,0.92)',
                    },
                    labelLayout: {
                        hideOverlap: true,
                        moveOverlap: 'shiftY',
                    },
                    emphasis: {
                        focus: 'self',
                        scale: true,
                        itemStyle: {
                            opacity: 1,
                            borderColor: 'rgba(255,255,255,1)',
                            borderWidth: 3,
                            shadowBlur: 32,
                        },
                        label: {
                            show: true,
                            formatter: '{b}',
                            color: '#0F172A',
                            fontSize: 12,
                            fontWeight: 700,
                            backgroundColor: 'rgba(255,255,255,0.96)',
                            padding: [4, 6],
                            borderRadius: 6,
                            shadowBlur: 8,
                            shadowColor: 'rgba(255,255,255,0.9)',
                        },
                    },
                    blur: {
                        itemStyle: { opacity: 0.18 },
                        label: { opacity: 0.12 },
                    },
                },
            ],
        };
    }, [assortmentChartData, assortmentData, assortmentLabelMeta, assortmentSalesScaleLine]);

    return (
        <div className="relative mb-6 w-full overflow-hidden rounded-[24px] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-slate-200">
            <div className="relative flex items-center justify-between border-b border-slate-100 px-8 pb-4 pt-6">
                <div>
                    <h2 className="flex items-center gap-3 text-xl font-semibold tracking-wide text-slate-900">
                        <div className="h-6 w-1.5 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500" />
                        商品生命周期与销售结构大盘
                    </h2>
                    <p className="mt-2 max-w-3xl text-xs text-slate-500">
                        {activeTab === 'transition'
                            ? '按春夏秋冬的销售窗口观察上一季与下一季货盘的金额承接，计划模式下对照计划与实际销售额。'
                            : activeTab === 'lifecycle'
                              ? '库龄层级页签用于观察新品、次新品、老品在所选时间范围内的销售占比变化，并用 50% 新品主导线判断承接是否形成。'
                              : '四象限矩阵用于识别真正养家糊口的品类，以及高销量低毛利低售罄的伪爆款风险。'}
                    </p>
                </div>

                <div className="flex rounded-xl bg-slate-50 p-1 shadow-inner ring-1 ring-slate-200">
                    <button
                        onClick={() => setActiveTab('transition')}
                        className={[
                            'rounded-lg px-4 py-1.5 text-xs font-semibold transition-all',
                            activeTab === 'transition' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                        ].join(' ')}
                    >
                        季节承接节奏
                    </button>
                    <button
                        onClick={() => setActiveTab('lifecycle')}
                        className={[
                            'rounded-lg px-4 py-1.5 text-xs font-semibold transition-all',
                            activeTab === 'lifecycle' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                        ].join(' ')}
                    >
                        库龄层级销售结构
                    </button>
                    <button
                        onClick={() => setActiveTab('assortment')}
                        className={[
                            'rounded-lg px-4 py-1.5 text-xs font-semibold transition-all',
                            activeTab === 'assortment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                        ].join(' ')}
                    >
                        四象限品类矩阵
                    </button>
                </div>
            </div>

            <div className="relative bg-gradient-to-b from-transparent to-slate-50/50 p-8 pb-10">
                <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
                    <div className="flex flex-col gap-4">
                        {activeTab === 'transition' ? (
                            <>
                                <div className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 ${
                                    transitionInsight.status === 'critical' ? 'border-rose-100 shadow-rose-100/50 hover:shadow-rose-100' :
                                    transitionInsight.status === 'warning' ? 'border-amber-100 shadow-amber-100/30' : 'border-indigo-100'
                                }`}>
                                    <div className={`absolute bottom-0 left-0 top-0 w-1.5 transition-colors duration-500 ${
                                        transitionInsight.status === 'critical' ? 'bg-rose-500' :
                                        transitionInsight.status === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'
                                    }`} />
                                    <div className="p-6 pl-7">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">{"\u5b63\u8282\u9500\u552e\u627f\u63a5\u7b80\u62a5"}</h4>
                                                <p className="font-mono text-xl font-light tracking-tight text-slate-800">
                                                    {transitionInsight.windowLabel}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-4xl font-light tracking-tight leading-none ${
                                                    transitionInsight.status === 'critical' ? 'text-rose-600' :
                                                    transitionInsight.status === 'warning' ? 'text-amber-600' : 'text-indigo-600'
                                                }`}>
                                                    {fmtWan(transitionInsight.focusAmount).replace("\u4e07", "")}<span className="text-xl ml-0.5">{"\u4e07"}</span>
                                                </div>
                                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                                                    {resolveTransitionFocusMetricLabel(transitionInsight.focusLabel)}
                                                </div>
                                                <div className="mt-1 text-[10px] font-medium text-slate-400">
                                                    总GMV {fmtWan(transitionInsight.totalAmount)}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-8 flex flex-col gap-5">
                                            <div>
                                                <div className="mb-1.5 flex items-center gap-1.5">
                                                    <div className="h-[3px] w-[3px] rounded-full bg-slate-300" />
                                                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{"\u6218\u7565\u5b9a\u6027"}</span>
                                                </div>
                                                <p className="text-[13px] leading-relaxed text-slate-700">{transitionInsight.conclusion}</p>
                                            </div>
                                            <div>
                                                <div className="mb-1.5 flex items-center gap-1.5">
                                                    <div className="h-[3px] w-[3px] rounded-full bg-slate-300" />
                                                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">判断依据</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {transitionBasisLines.map((line) => (
                                                        <div key={line} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] leading-5 text-slate-600">
                                                            {line}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className={`mt-2 rounded-xl p-4 transition-colors duration-300 ${
                                                transitionInsight.status === 'critical' ? 'bg-rose-50/80 group-hover:bg-rose-50' :
                                                transitionInsight.status === 'warning' ? 'bg-amber-50/80' : 'bg-indigo-50/80'
                                            }`}>
                                                <div className="mb-2 flex items-center gap-1.5">
                                                    <div className={`h-1.5 w-1.5 rounded-full ${
                                                        transitionInsight.status === 'critical' ? 'bg-rose-500 animate-pulse outline outline-2 outline-rose-500/20' :
                                                        transitionInsight.status === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'
                                                    }`} />
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                                        transitionInsight.status === 'critical' ? 'text-rose-600' :
                                                        transitionInsight.status === 'warning' ? 'text-amber-600' : 'text-indigo-600'
                                                    }`}>{"\u6267\u884c\u957f\u6307\u4ee4"}</span>
                                                </div>
                                                <p className={`text-xs leading-relaxed font-medium ${
                                                    transitionInsight.status === 'critical' ? 'text-rose-700' :
                                                    transitionInsight.status === 'warning' ? 'text-amber-800' : 'text-slate-700'
                                                }`}>{transitionInsight.action}</p>
                                                <div className="mt-2 text-[10px] font-bold text-slate-400 opacity-80 uppercase tracking-tighter">
                                                    {compareMode === 'plan' ? '计划金额偏差：' : '当前聚焦偏差：'}{transitionInsight.deviationLabel}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : activeTab === 'lifecycle' ? (
                            <>
                                <div className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 ${
                                    lifecycleInsight.status === 'critical' ? 'border-rose-100 shadow-rose-100/50 hover:shadow-rose-100' :
                                    lifecycleInsight.status === 'warning' ? 'border-amber-100 shadow-amber-100/30' : 'border-slate-100'
                                }`}>
                                    <div className={`absolute bottom-0 left-0 top-0 w-1.5 transition-colors duration-500 ${
                                        lifecycleInsight.status === 'critical' ? 'bg-rose-500' :
                                        lifecycleInsight.status === 'warning' ? 'bg-amber-500' : 'bg-sky-500'
                                    }`} />
                                    <div className="p-6 pl-7">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">{"\u65b0\u54c1\u4e3b\u5bfc\u6267\u884c\u7b80\u62a5"}</h4>
                                                <p className="font-mono text-xl font-light tracking-tight text-slate-800">{lifecycleInsight.windowLabel}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-4xl font-light tracking-tight leading-none ${
                                                    lifecycleInsight.status === 'critical' ? 'text-rose-600' :
                                                    lifecycleInsight.status === 'warning' ? 'text-amber-600' : 'text-sky-600'
                                                }`}>
                                                    {fmtPct(lifecycleInsight.actualNewShare, 1).replace('%', '')}<span className="text-xl ml-0.5">%</span>
                                                </div>
                                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">综合新品占比</div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-8 flex flex-col gap-5">
                                            <div>
                                                <div className="mb-1.5 flex items-center gap-1.5">
                                                    <div className="h-[3px] w-[3px] rounded-full bg-slate-300" />
                                                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{"\u6218\u7565\u5b9a\u6027"}</span>
                                                </div>
                                                <p className="text-[13px] leading-relaxed text-slate-700">{lifecycleInsight.conclusion}</p>
                                            </div>
                                            
                                            <div className="border-l-2 border-slate-100 pl-3">
                                                <p className="text-xs leading-relaxed text-slate-500">{lifecycleInsight.basis}</p>
                                            </div>

                                            <div className={`mt-2 rounded-xl p-4 transition-colors duration-300 ${
                                                lifecycleInsight.status === 'critical' ? 'bg-rose-50/80 group-hover:bg-rose-50' :
                                                lifecycleInsight.status === 'warning' ? 'bg-amber-50/80' : 'bg-slate-50/80'
                                            }`}>
                                                <div className="mb-2 flex items-center gap-1.5">
                                                    <div className={`h-1.5 w-1.5 rounded-full ${
                                                        lifecycleInsight.status === 'critical' ? 'bg-rose-500 animate-pulse outline outline-2 outline-rose-500/20' :
                                                        lifecycleInsight.status === 'warning' ? 'bg-amber-500' : 'bg-sky-500'
                                                    }`} />
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                                        lifecycleInsight.status === 'critical' ? 'text-rose-600' :
                                                        lifecycleInsight.status === 'warning' ? 'text-amber-600' : 'text-sky-600'
                                                    }`}>{"\u6267\u884c\u957f\u6307\u4ee4"}</span>
                                                </div>
                                                <p className={`text-xs leading-relaxed font-medium ${
                                                    lifecycleInsight.status === 'critical' ? 'text-rose-700' :
                                                    lifecycleInsight.status === 'warning' ? 'text-amber-800' : 'text-slate-700'
                                                }`}>{lifecycleInsight.action}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 ${
                                assortmentInsight.pseudoRisk?.pseudoExplosiveRisk ? 'border-rose-100 shadow-rose-100/40' :
                                assortmentInsight.pseudoRisk ? 'border-amber-100 shadow-amber-100/30' : 'border-emerald-100'
                            }`}>
                                <div className={`absolute bottom-0 left-0 top-0 w-1.5 ${
                                    assortmentInsight.pseudoRisk?.pseudoExplosiveRisk ? 'bg-rose-500' :
                                    assortmentInsight.pseudoRisk ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} />
                                <div className="p-6 pl-7">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">品类矩阵战略简报</h4>
                                            <p className="font-mono text-xl font-light tracking-tight text-slate-800">{assortmentInsight.cashCow?.category || '--'}</p>
                                            <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-500">
                                                当前视图：{assortmentActionSummary.focusLabel} · {assortmentActionSummary.visibleCount} 类 / {fmtWan(assortmentActionSummary.visibleSales)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-4xl font-light tracking-tight leading-none ${
                                                assortmentInsight.pseudoRisk?.pseudoExplosiveRisk ? 'text-rose-600' :
                                                assortmentInsight.pseudoRisk ? 'text-amber-600' : 'text-emerald-600'
                                            }`}>
                                                {assortmentInsight.cashCow ? fmtPct(assortmentInsight.cashCow.sellThrough, 0).replace('%', '') : '--'}<span className="text-xl ml-0.5">%</span>
                                            </div>
                                            <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">核心售罄率</div>
                                            <div className="mt-1 text-[10px] font-medium text-slate-400">
                                                毛利率 {assortmentInsight.cashCow ? fmtPct(assortmentInsight.cashCow.marginRate, 0) : '--'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex flex-col gap-5">
                                        <div>
                                            <div className="mb-1.5 flex items-center gap-1.5">
                                                <div className="h-[3px] w-[3px] rounded-full bg-slate-300" />
                                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">战略定性</span>
                                            </div>
                                            <p className="text-[13px] leading-relaxed text-slate-700">
                                                {assortmentInsight.cashCow
                                                    ? `核心现金牛由${assortmentInsight.cashCow.category}承接，当前售罄 ${fmtPct(assortmentInsight.cashCow.sellThrough)}、毛利率 ${fmtPct(assortmentInsight.cashCow.marginRate)}；风险区共有 ${assortmentActionSummary.riskCount} 个品类，涉及销售额 ${fmtWan(assortmentActionSummary.riskSales)}，其中伪爆款 ${assortmentActionSummary.pseudoRiskCount} 个。`
                                                    : `当前筛选下暂无足够数据识别明确的现金牛品类；风险区共有 ${assortmentActionSummary.riskCount} 个品类，涉及销售额 ${fmtWan(assortmentActionSummary.riskSales)}。`}
                                            </p>
                                        </div>
                                        <div>
                                            <div className="mb-1.5 flex items-center gap-1.5">
                                                <div className="h-[3px] w-[3px] rounded-full bg-slate-300" />
                                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">判断依据</span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] leading-5 text-slate-600">
                                                    {assortmentInsight.cashCow
                                                        ? `现金牛：${assortmentInsight.cashCow.category}，售罄 ${fmtPct(assortmentInsight.cashCow.sellThrough)}，毛利率 ${fmtPct(assortmentInsight.cashCow.marginRate)}。`
                                                        : '现金牛：当前暂无命中。'}
                                                </div>
                                                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] leading-5 text-slate-600">
                                                    {assortmentInsight.pseudoRisk
                                                        ? `${assortmentInsight.pseudoRisk.pseudoExplosiveRisk ? '伪爆款风险' : '风险观察'}：${assortmentInsight.pseudoRisk.category}，售罄 ${fmtPct(assortmentInsight.pseudoRisk.sellThrough)}，毛利率 ${fmtPct(assortmentInsight.pseudoRisk.marginRate)}。`
                                                        : '风险观察：当前暂无明显伪爆款风险品类。'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`mt-2 rounded-xl p-4 transition-colors duration-300 ${
                                            assortmentInsight.pseudoRisk?.pseudoExplosiveRisk ? 'bg-rose-50/80 group-hover:bg-rose-50' :
                                            assortmentInsight.pseudoRisk ? 'bg-amber-50/80' : 'bg-emerald-50/70'
                                        }`}>
                                            <div className="mb-2 flex items-center gap-1.5">
                                                <div className={`h-1.5 w-1.5 rounded-full ${
                                                    assortmentInsight.pseudoRisk?.pseudoExplosiveRisk ? 'bg-rose-500 animate-pulse outline outline-2 outline-rose-500/20' :
                                                    assortmentInsight.pseudoRisk ? 'bg-amber-500' : 'bg-emerald-500'
                                                }`} />
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                                    assortmentInsight.pseudoRisk?.pseudoExplosiveRisk ? 'text-rose-600' :
                                                    assortmentInsight.pseudoRisk ? 'text-amber-600' : 'text-emerald-600'
                                                }`}>风险预警</span>
                                            </div>
                                            <p className={`text-xs leading-relaxed font-medium ${
                                                assortmentInsight.pseudoRisk?.pseudoExplosiveRisk ? 'text-rose-700' :
                                                assortmentInsight.pseudoRisk ? 'text-amber-800' : 'text-slate-700'
                                            }`}>
                                                {assortmentInsight.pseudoRisk
                                                    ? assortmentInsight.pseudoRisk.pseudoExplosiveRisk
                                                        ? '优先复盘该风险品类的折扣力度、价格带和主推资源，避免高销量低毛利低售罄继续侵蚀利润。'
                                                        : '建议针对风险观察品类复盘上市节奏与货盘结构，避免其继续滑向伪爆款风险区。'
                                                    : '当前矩阵结构健康，建议继续深耕现金牛品类，并观察利润机会区的放大空间。'}
                                            </p>
                                            <div className="mt-2 text-[10px] font-bold text-slate-400 opacity-80 uppercase tracking-tighter">
                                                {assortmentInsight.pseudoRisk
                                                    ? `当前关注：${assortmentInsight.pseudoRisk.category} · 风险区 ${assortmentActionSummary.riskCount} 类 / 伪爆款 ${assortmentActionSummary.pseudoRiskCount} 类`
                                                    : `稳定底盘：${assortmentInsight.cashCow?.category || '--'} · 风险区 ${assortmentActionSummary.riskCount} 类`}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative h-[650px] overflow-visible rounded-[24px] border border-slate-100 bg-white shadow-inner">
                        {activeTab === 'transition' ? (
                            hasTransitionChartData ? (
                                <div className="flex h-full flex-col overflow-hidden rounded-[24px]">
                                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                                        <div className="hidden flex-1 lg:block"></div>
                                        <div className="flex flex-[2] items-center justify-center gap-6 whitespace-nowrap text-[10.5px] font-medium text-slate-500">
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="h-px w-5 border-t border-dashed border-rose-500"></span>
                                                承接断档月
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="h-3 w-5 rounded-full border-2 border-dashed border-amber-400 bg-amber-50/50"></span>
                                                长尾拖尾货季带
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full border-2 border-rose-600 bg-white"></span>
                                                上新偏离点
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full bg-sky-400 ring-2 ring-white shadow-sm"></span>
                                                月度销售落点
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                                                常青独立带
                                            </span>
                                        </div>
                                        <div className="flex flex-1 items-center justify-end gap-3">
                                            <InfoHoverTip title="判定口径说明" lines={transitionStandardsTooltipLines} />
                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">
                                                顶部切换：{resolveCompareModeLabel(compareMode)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <ReactECharts key="transition-chart" option={transitionOption} notMerge={true} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-slate-400">当前筛选下暂无季节承接节奏数据</div>
                            )
                        ) : activeTab === 'lifecycle' ? (
                            hasLifecycleData ? (
                                <ReactECharts key="lifecycle-chart" option={lifecycleOption} notMerge={true} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-slate-400">{"\u5f53\u524d\u7b5b\u9009\u4e0b\u6682\u65e0\u751f\u547d\u5468\u671f\u9500\u552e\u7ed3\u6784\u6570\u636e"}</div>
                            )
                        ) : hasAssortmentData ? (
                            <div className="flex h-full flex-col overflow-hidden rounded-[24px]">
                                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                                    <div className="hidden flex-1 lg:block"></div>
                                    <div className="flex flex-[2] flex-wrap items-center justify-center gap-x-6 gap-y-2 whitespace-nowrap text-[10.5px] font-medium text-slate-500">
                                        <button
                                            type="button"
                                            onClick={() => setActiveAssortmentFilter('all')}
                                            className={[
                                                'inline-flex items-center gap-2 text-[11px] font-semibold transition-colors',
                                                activeAssortmentFilter === 'all' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700',
                                            ].join(' ')}
                                        >
                                            <span className={[
                                                'h-2.5 w-2.5 rounded-full transition-all',
                                                activeAssortmentFilter === 'all' ? 'bg-slate-700 ring-4 ring-slate-200/70' : 'bg-slate-300',
                                            ].join(' ')} />
                                            <span>全部</span>
                                            <span className={activeAssortmentFilter === 'all' ? 'text-slate-600' : 'text-slate-400'}>{assortmentData.length}</span>
                                        </button>
                                        {ASSORTMENT_LEGEND_ITEMS.map((item) => {
                                            const isActive = activeAssortmentFilter === item.key;
                                            const count = assortmentLegendCounts[item.key];

                                            return (
                                                <button
                                                    key={item.key}
                                                    type="button"
                                                    onClick={() => setActiveAssortmentFilter((current) => (current === item.key ? 'all' : item.key))}
                                                    disabled={count === 0}
                                                    aria-pressed={isActive}
                                                    className={[
                                                        'inline-flex items-center gap-2 text-[11px] font-semibold transition-colors',
                                                        count === 0
                                                            ? 'cursor-not-allowed text-slate-300'
                                                            : isActive
                                                                ? 'text-slate-900'
                                                                : 'text-slate-500 hover:text-slate-700',
                                                    ].join(' ')}
                                                >
                                                    <span
                                                        className={['h-2.5 w-2.5 rounded-full transition-all', isActive ? 'ring-4' : ''].join(' ')}
                                                        style={{
                                                            backgroundColor: item.color,
                                                            boxShadow: isActive ? `0 0 0 4px ${item.softColor}` : 'none',
                                                            opacity: count === 0 ? 0.35 : 1,
                                                        }}
                                                    />
                                                    <span>{item.label}</span>
                                                    <span className={isActive ? 'text-slate-600' : 'text-slate-400'}>{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex flex-1 items-center justify-end gap-3">
                                        <InfoHoverTip title="矩阵口径说明" lines={assortmentStandardsTooltipLines} />
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">
                                            矩阵视角：{activeAssortmentFilter === 'all' ? '全部品类' : `只看${resolveAssortmentFilterLabel(activeAssortmentFilter)}`}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    {hasVisibleAssortmentData ? (
                                        <ReactECharts key="assortment-chart" option={assortmentOption} notMerge={true} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-slate-400">当前图例筛选下暂无可用品类矩阵数据</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-slate-400">当前筛选下暂无可用品类矩阵数据</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}













