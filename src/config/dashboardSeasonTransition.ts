import dimPlanRaw from '@/../data/dashboard/dim_plan.json';
import { inferDashboardCarryoverSchema, type DashboardNonMainReason } from '@/config/dashboardCarryover';
import { DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS } from '@/config/dashboardSeasonLifecycleStandards';
import type { DashboardLifecycleFilters } from '@/config/dashboardLifecycle';
import {
    formatTransitionSeasonKey,
    resolveTransitionHandoffRole,
    resolveTransitionTimelineKey,
    type TransitionHandoffRole,
    type TransitionSeasonCode,
} from '@/config/dashboardSeasonTransitionRules';
import { getDashboardMonthByWave, normalizeDashboardWave } from '@/config/dashboardTime';

export type { TransitionHandoffRole, TransitionSeasonCode } from '@/config/dashboardSeasonTransitionRules';

export interface SeasonTransitionSourceRecord {
    record_id?: string;
    sku_id: string;
    channel_id?: string;
    wave?: string;
    week_num: number;
    net_sales_amt: number;
    sale_year?: string | number;
    sale_month?: number;
    sale_wave?: string;
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

export interface SeasonTransitionSkuMeta {
    sku_id: string;
    lifecycle?: string;
    product_track?: string | null;
    is_carryover?: boolean | string | number | null;
    carryover_type?: string | null;
    carryover_status?: string | null;
    carryover_protection_end?: string | null;
    carryover_entry_source?: string | null;
    monitor_mode?: string | null;
    non_main_reason?: string | null;
    dev_season_year?: string | number;
    dev_season?: string;
    season_year?: string | number;
    season?: string;
}

export interface TransitionVisibleRange {
    startMonth: number;
    endMonth: number;
    minAxis: number;
    maxAxis: number;
}

export interface SeasonTransitionAnalysisRow {
    rowId: string;
    sourceRecordId: string;
    skuId: string;
    channelId: string;
    saleMonth: number;
    waveKey: string;
    salesSeason: TransitionSeasonCode | null;
    salesSeasonYear: number | null;
    laneId: string;
    laneLabel: string;
    laneSeason: TransitionSeasonCode;
    laneSeasonYear: number;
    axisMonth: number;
    axisValue: number;
    handoffRole: TransitionHandoffRole;
    isMainHandoff: boolean;
    nonMainReason: DashboardNonMainReason;
    allocationRatio: number;
    allocatedSales: number;
}

export interface SeasonTransitionLanePoint {
    axisValue: number;
    slotAxisValue: number;
    label: string;
    sales: number;
}

export interface SeasonTransitionLane {
    laneId: string;
    season: TransitionSeasonCode;
    seasonYear: number;
    label: string;
    rangeLabel: string;
    start: number;
    end: number;
    months: number[];
    monthBreakdown: SeasonTransitionLanePoint[];
    actualSales: number;
    planSales: number;
    color: string;
    fill: string;
    border: string;
}

type MonthlyPlanRecord = {
    month: number;
    plan_sales_amt: number;
};

type SeasonLaneMonthWeight = {
    month: number;
    axisMonth: number;
    weight: number;
};

type SeasonLaneConfig = {
    laneId: string;
    season: TransitionSeasonCode;
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

const CARRYOVER_LANE_ID = 'carryover-season';
const OTHER_NON_MAIN_LANE_ID = 'other-seasons';

const SEASON_WINDOW_META: Record<
    TransitionSeasonCode,
    {
        label: string;
        rangeLabel: string;
        start: number;
        end: number;
        color: string;
        fill: string;
        border: string;
    }
> = {
    Q1: {
        label: '春季',
        rangeLabel: '12/10-5月末',
        start: DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS.Q1.start,
        end: DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS.Q1.end,
        color: '#4ADE80',
        fill: 'rgba(74, 222, 128, 0.10)',
        border: 'rgba(74, 222, 128, 0.38)',
    },
    Q2: {
        label: '夏季',
        rangeLabel: '3/5-9月末',
        start: DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS.Q2.start,
        end: DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS.Q2.end,
        color: '#38BDF8',
        fill: 'rgba(56, 189, 248, 0.10)',
        border: 'rgba(56, 189, 248, 0.34)',
    },
    Q3: {
        label: '秋季',
        rangeLabel: '6/25-11月末',
        start: DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS.Q3.start,
        end: DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS.Q3.end,
        color: '#FBBF24',
        fill: 'rgba(251, 191, 36, 0.10)',
        border: 'rgba(251, 191, 36, 0.36)',
    },
    Q4: {
        label: '冬季',
        rangeLabel: '9/30-次年3月末',
        start: DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS.Q4.start,
        end: DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS.Q4.end,
        color: '#818CF8',
        fill: 'rgba(129, 140, 248, 0.10)',
        border: 'rgba(129, 140, 248, 0.36)',
    },
};

const MONTHLY_PLAN = Array.isArray((dimPlanRaw as { monthly_plan?: unknown[] }).monthly_plan)
    ? ((dimPlanRaw as { monthly_plan?: MonthlyPlanRecord[] }).monthly_plan || [])
    : [];

function parseYear(value: string | number | null | undefined) {
    const year = Number(value);
    return Number.isFinite(year) ? year : null;
}

function resolveWaveKey(record: SeasonTransitionSourceRecord) {
    const normalizedWave = normalizeDashboardWave(record.sale_wave || record.wave);
    if (normalizedWave) return normalizedWave;

    const week = Number(record.week_num || 0);
    if (!Number.isFinite(week) || week <= 0 || week > 12) return null;
    return normalizeDashboardWave('W' + String(week).padStart(2, '0'));
}

function resolveRecordSeason(record: SeasonTransitionSourceRecord, skuMap: Record<string, SeasonTransitionSkuMeta | undefined>) {
    const sku = skuMap[record.sku_id];
    const season = String(record.sales_season || record.season || sku?.dev_season || sku?.season || '').toUpperCase();
    return season === 'Q1' || season === 'Q2' || season === 'Q3' || season === 'Q4' ? season : null;
}

function resolveRecordSeasonYear(record: SeasonTransitionSourceRecord, skuMap: Record<string, SeasonTransitionSkuMeta | undefined>) {
    const sku = skuMap[record.sku_id];
    return parseYear(record.sales_season_year ?? record.season_year ?? sku?.dev_season_year ?? sku?.season_year);
}

function resolveCarryoverFlag(record: SeasonTransitionSourceRecord, skuMap: Record<string, SeasonTransitionSkuMeta | undefined>) {
    const sku = skuMap[record.sku_id];
    return inferDashboardCarryoverSchema({
        ...sku,
        ...record,
    }).isCarryover;
}

function resolveNonMainReason(record: SeasonTransitionSourceRecord, skuMap: Record<string, SeasonTransitionSkuMeta | undefined>) {
    const sku = skuMap[record.sku_id];
    return inferDashboardCarryoverSchema({
        ...sku,
        ...record,
    }).nonMainReason;
}

function resolveSeasonAxisLabel(axisValue: number, anchorYear: number) {
    if (axisValue === 0) return String(anchorYear - 1) + '/12';
    if (axisValue >= 13) return String(anchorYear + 1) + '/' + String(axisValue - 12);
    return axisValue === 1 ? String(anchorYear) + '/1' : String(axisValue);
}

function buildSeasonLaneConfigs(anchorYear: number, hasPrevWinterSource: boolean): SeasonLaneConfig[] {
    const prevWinterSourceYear = hasPrevWinterSource ? anchorYear - 1 : anchorYear;

    return [
        {
            laneId: 'Q4-' + String(anchorYear - 1),
            season: 'Q4',
            seasonYear: anchorYear - 1,
            sourceYear: prevWinterSourceYear,
            label: formatTransitionSeasonKey('Q4', anchorYear - 1),
            rangeLabel: String(anchorYear - 1) + '/9/30-' + String(anchorYear) + '/3月末',
            start: 0.03,
            end: 4,
            color: SEASON_WINDOW_META.Q4.color,
            fill: SEASON_WINDOW_META.Q4.fill,
            border: SEASON_WINDOW_META.Q4.border,
            monthWeights: [
                { month: 12, axisMonth: 0, weight: 1 },
                { month: 1, axisMonth: 1, weight: 1 },
                { month: 2, axisMonth: 2, weight: 1 },
                { month: 3, axisMonth: 3, weight: 1 },
            ],
        },
        {
            laneId: 'Q1-' + String(anchorYear),
            season: 'Q1',
            seasonYear: anchorYear,
            sourceYear: anchorYear,
            label: formatTransitionSeasonKey('Q1', anchorYear),
            rangeLabel: SEASON_WINDOW_META.Q1.rangeLabel,
            start: SEASON_WINDOW_META.Q1.start,
            end: SEASON_WINDOW_META.Q1.end,
            color: SEASON_WINDOW_META.Q1.color,
            fill: SEASON_WINDOW_META.Q1.fill,
            border: SEASON_WINDOW_META.Q1.border,
            monthWeights: [
                { month: 12, axisMonth: 0, weight: 22 / 31 },
                { month: 1, axisMonth: 1, weight: 1 },
                { month: 2, axisMonth: 2, weight: 1 },
                { month: 3, axisMonth: 3, weight: 1 },
                { month: 4, axisMonth: 4, weight: 1 },
                { month: 5, axisMonth: 5, weight: 1 },
            ],
        },
        {
            laneId: 'Q2-' + String(anchorYear),
            season: 'Q2',
            seasonYear: anchorYear,
            sourceYear: anchorYear,
            label: formatTransitionSeasonKey('Q2', anchorYear),
            rangeLabel: SEASON_WINDOW_META.Q2.rangeLabel,
            start: SEASON_WINDOW_META.Q2.start,
            end: SEASON_WINDOW_META.Q2.end,
            color: SEASON_WINDOW_META.Q2.color,
            fill: SEASON_WINDOW_META.Q2.fill,
            border: SEASON_WINDOW_META.Q2.border,
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
            laneId: 'Q3-' + String(anchorYear),
            season: 'Q3',
            seasonYear: anchorYear,
            sourceYear: anchorYear,
            label: formatTransitionSeasonKey('Q3', anchorYear),
            rangeLabel: SEASON_WINDOW_META.Q3.rangeLabel,
            start: SEASON_WINDOW_META.Q3.start,
            end: SEASON_WINDOW_META.Q3.end,
            color: SEASON_WINDOW_META.Q3.color,
            fill: SEASON_WINDOW_META.Q3.fill,
            border: SEASON_WINDOW_META.Q3.border,
            monthWeights: [
                { month: 6, axisMonth: 6, weight: 6 / 30 },
                { month: 7, axisMonth: 7, weight: 1 },
                { month: 8, axisMonth: 8, weight: 1 },
                { month: 9, axisMonth: 9, weight: 1 },
                { month: 10, axisMonth: 10, weight: 1 },
                { month: 11, axisMonth: 11, weight: 1 },
            ],
        },
        {
            laneId: 'Q4-' + String(anchorYear),
            season: 'Q4',
            seasonYear: anchorYear,
            sourceYear: anchorYear,
            label: formatTransitionSeasonKey('Q4', anchorYear),
            rangeLabel: SEASON_WINDOW_META.Q4.rangeLabel,
            start: SEASON_WINDOW_META.Q4.start,
            end: SEASON_WINDOW_META.Q4.end,
            color: SEASON_WINDOW_META.Q4.color,
            fill: SEASON_WINDOW_META.Q4.fill,
            border: SEASON_WINDOW_META.Q4.border,
            monthWeights: [
                { month: 9, axisMonth: 9, weight: 1 / 30 },
                { month: 10, axisMonth: 10, weight: 1 },
                { month: 11, axisMonth: 11, weight: 1 },
                { month: 12, axisMonth: 12, weight: 1 },
                { month: 1, axisMonth: 13, weight: 1 },
                { month: 2, axisMonth: 14, weight: 1 },
                { month: 3, axisMonth: 15, weight: 1 },
            ],
        },
    ];
}

export function resolveTransitionVisibleRange(filters: DashboardLifecycleFilters): TransitionVisibleRange {
    const selectedMonth = filters.wave !== 'all'
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
        const seasonRangeMap: Record<TransitionSeasonCode, [number, number]> = {
            Q1: [1, 3],
            Q2: [4, 6],
            Q3: [7, 9],
            Q4: [10, 12],
        };
        const range = seasonRangeMap[filters.season as TransitionSeasonCode];
        return {
            startMonth: range[0],
            endMonth: range[1],
            minAxis: range[0],
            maxAxis: range[1] + 1,
        };
    }

    return {
        startMonth: 1,
        endMonth: 12,
        minAxis: 1,
        maxAxis: 13,
    };
}

export function buildSeasonTransitionAnalysisRows(
    records: SeasonTransitionSourceRecord[],
    skuMap: Record<string, SeasonTransitionSkuMeta | undefined>,
    anchorYear: number,
    visibleRange: TransitionVisibleRange,
) {
    const { startMonth, endMonth } = visibleRange;
    const hasPrevWinterSource = records.some((record) => {
        const season = resolveRecordSeason(record, skuMap);
        const seasonYear = resolveRecordSeasonYear(record, skuMap);
        return season === 'Q4' && seasonYear === anchorYear - 1;
    });
    const seasonConfigs = buildSeasonLaneConfigs(anchorYear, hasPrevWinterSource);
    const rows: SeasonTransitionAnalysisRow[] = [];

    records.forEach((record, recordIndex) => {
        const waveKey = resolveWaveKey(record);
        if (!waveKey) return;
        const month = getDashboardMonthByWave(waveKey);
        if (month === null || month < startMonth || month > endMonth) return;

        const salesInWan = Number(record.net_sales_amt || 0) / 10000;
        const season = resolveRecordSeason(record, skuMap);
        const seasonYear = resolveRecordSeasonYear(record, skuMap);
        const isCarryover = resolveCarryoverFlag(record, skuMap);
        const activeEntries = seasonConfigs
            .map((config) => {
                const weightEntry = config.monthWeights.find((entry) => entry.month === month);
                if (!weightEntry) return null;
                if (weightEntry.axisMonth < startMonth || weightEntry.axisMonth > endMonth) return null;
                return { config, weightEntry };
            })
            .filter((item): item is { config: SeasonLaneConfig; weightEntry: SeasonLaneMonthWeight } => Boolean(item));

        const matchedEntry = activeEntries.find(({ config }) => config.season === season && config.sourceYear === seasonYear) || null;
        const mainEntries = activeEntries.filter(
            ({ config }) => resolveTransitionHandoffRole(config.season, config.seasonYear, month, anchorYear) !== 'non_main',
        );
        const rawTimelineKey = resolveTransitionTimelineKey(season, seasonYear, anchorYear);

        let chosenEntry = matchedEntry;
        if (!chosenEntry && rawTimelineKey !== null && mainEntries.length > 0) {
            const ranked = mainEntries
                .map((entry) => ({
                    entry,
                    key: resolveTransitionTimelineKey(entry.config.season, entry.config.seasonYear, anchorYear),
                }))
                .filter((item): item is { entry: { config: SeasonLaneConfig; weightEntry: SeasonLaneMonthWeight }; key: number } => item.key !== null)
                .sort((a, b) => Math.abs(a.key - rawTimelineKey) - Math.abs(b.key - rawTimelineKey));

            if (ranked.length > 0 && Math.abs(ranked[0].key - rawTimelineKey) <= 1) {
                chosenEntry = ranked[0].entry;
            }
        }

        if (isCarryover) {
            rows.push({
                rowId: String(record.record_id || record.sku_id + '-' + String(recordIndex)) + '-carryover',
                sourceRecordId: String(record.record_id || record.sku_id + '-' + String(recordIndex)),
                skuId: record.sku_id,
                channelId: String(record.channel_id || ''),
                saleMonth: month,
                waveKey,
                salesSeason: season,
                salesSeasonYear: seasonYear,
                laneId: CARRYOVER_LANE_ID,
                laneLabel: '常青款',
                laneSeason: season || 'Q4',
                laneSeasonYear: seasonYear || anchorYear,
                axisMonth: month,
                axisValue: Number((month + 0.5).toFixed(2)),
                handoffRole: 'carryover',
                isMainHandoff: false,
                nonMainReason: resolveNonMainReason(record, skuMap) || 'carryover_active',
                allocationRatio: 1,
                allocatedSales: Number(salesInWan.toFixed(4)),
            });
            return;
        }

        if (chosenEntry) {
            rows.push({
                rowId: String(record.record_id || record.sku_id + '-' + String(recordIndex)) + '-' + chosenEntry.config.laneId,
                sourceRecordId: String(record.record_id || record.sku_id + '-' + String(recordIndex)),
                skuId: record.sku_id,
                channelId: String(record.channel_id || ''),
                saleMonth: month,
                waveKey,
                salesSeason: season,
                salesSeasonYear: seasonYear,
                laneId: chosenEntry.config.laneId,
                laneLabel: chosenEntry.config.label,
                laneSeason: chosenEntry.config.season,
                laneSeasonYear: chosenEntry.config.seasonYear,
                axisMonth: chosenEntry.weightEntry.axisMonth,
                axisValue: Number((chosenEntry.weightEntry.axisMonth + 0.5).toFixed(2)),
                handoffRole: resolveTransitionHandoffRole(chosenEntry.config.season, chosenEntry.config.seasonYear, month, anchorYear),
                isMainHandoff: true,
                nonMainReason: null,
                allocationRatio: 1,
                allocatedSales: Number(salesInWan.toFixed(4)),
            });
            return;
        }

        rows.push({
            rowId: String(record.record_id || record.sku_id + '-' + String(recordIndex)) + '-other',
            sourceRecordId: String(record.record_id || record.sku_id + '-' + String(recordIndex)),
            skuId: record.sku_id,
            channelId: String(record.channel_id || ''),
            saleMonth: month,
            waveKey,
            salesSeason: season,
            salesSeasonYear: seasonYear,
            laneId: OTHER_NON_MAIN_LANE_ID,
            laneLabel: '其他非主承接',
            laneSeason: 'Q4',
            laneSeasonYear: anchorYear,
            axisMonth: month,
            axisValue: Number((month + 0.5).toFixed(2)),
            handoffRole: 'non_main',
            isMainHandoff: false,
            nonMainReason: resolveNonMainReason(record, skuMap) || 'unclassified',
            allocationRatio: 1,
            allocatedSales: Number(salesInWan.toFixed(4)),
        });
    });

    return rows;
}

export function buildSeasonTransitionLanes(
    rows: SeasonTransitionAnalysisRow[],
    anchorYear: number,
    visibleRange: TransitionVisibleRange,
): SeasonTransitionLane[] {
    const { startMonth, endMonth, minAxis, maxAxis } = visibleRange;
    const hasPrevWinterLane = rows.some((row) => row.laneId === 'Q4-' + String(anchorYear - 1));
    const seasonConfigs = buildSeasonLaneConfigs(anchorYear, hasPrevWinterLane);
    const planByMonth = new Map<number, number>(
        (MONTHLY_PLAN as MonthlyPlanRecord[]).map((item) => [Number(item.month), Number(item.plan_sales_amt || 0) / 10000]),
    );
    const grouped = new Map<string, SeasonTransitionAnalysisRow[]>();
    rows.forEach((row) => {
        const bucket = grouped.get(row.laneId) || [];
        bucket.push(row);
        grouped.set(row.laneId, bucket);
    });

    const monthTotals = new Map<number, number>();
    rows.forEach((row) => {
        monthTotals.set(row.saleMonth, (monthTotals.get(row.saleMonth) || 0) + row.allocatedSales);
    });

    const lanes: SeasonTransitionLane[] = seasonConfigs
        .map((config) => {
            const laneRows = grouped.get(config.laneId) || [];
            const actualSales = laneRows.reduce((sum, row) => sum + row.allocatedSales, 0);
            const planSales = config.monthWeights.reduce((sum, entry) => {
                if (entry.axisMonth < startMonth || entry.axisMonth > endMonth) return sum;
                return sum + (planByMonth.get(entry.month) || 0) * entry.weight;
            }, 0);
            const monthMap = new Map<number, number>();
            laneRows.forEach((row) => {
                monthMap.set(row.axisMonth, (monthMap.get(row.axisMonth) || 0) + row.allocatedSales);
            });
            const monthBreakdown = config.monthWeights
                .filter((entry) => entry.axisMonth >= startMonth && entry.axisMonth <= endMonth)
                .map((entry) => {
                    const slotStart = entry.axisMonth;
                    const slotEnd = entry.axisMonth + 1;
                    const segmentStart = Math.max(config.start, slotStart, minAxis);
                    const segmentEnd = Math.min(config.end, slotEnd, maxAxis);
                    if (segmentEnd <= segmentStart) return null;
                    return {
                        axisValue: Number(((segmentStart + segmentEnd) / 2).toFixed(2)),
                        slotAxisValue: entry.axisMonth,
                        label: resolveSeasonAxisLabel(entry.axisMonth, anchorYear),
                        sales: Number((monthMap.get(entry.axisMonth) || 0).toFixed(1)),
                    };
                })
                .filter((point): point is SeasonTransitionLanePoint => Boolean(point));

            return {
                laneId: config.laneId,
                season: config.season,
                seasonYear: config.seasonYear,
                label: config.label,
                rangeLabel: config.rangeLabel,
                start: Math.max(config.start, minAxis),
                end: Math.min(config.end, maxAxis),
                months: Array.from(new Set(monthBreakdown.map((point) => point.slotAxisValue))),
                monthBreakdown,
                actualSales: Number(actualSales.toFixed(1)),
                planSales: Number(planSales.toFixed(1)),
                color: config.color,
                fill: config.fill,
                border: config.border,
            };
        })
        .filter((lane) => lane.monthBreakdown.length > 0 && lane.end > lane.start && (lane.actualSales > 0.05 || lane.planSales > 0.05));

    const buildResidualLane = (
        laneId: string,
        label: string,
        laneRows: SeasonTransitionAnalysisRow[],
        color: string,
        fill: string,
        border: string,
    ) => {
        if (laneRows.length === 0) return null;
        const laneMonths = Array.from(new Set(laneRows.map((row) => row.saleMonth))).sort((a, b) => a - b);
        const laneActual = laneRows.reduce((sum, row) => sum + row.allocatedSales, 0);
        const lanePlan = laneMonths.reduce((sum, month) => {
            const monthSales = laneRows.filter((row) => row.saleMonth === month).reduce((inner, row) => inner + row.allocatedSales, 0);
            const monthTotal = monthTotals.get(month) || 0;
            if (monthTotal <= 0) return sum;
            return sum + (planByMonth.get(month) || 0) * (monthSales / monthTotal);
        }, 0);
        const firstMonth = laneMonths[0];
        const lastMonth = laneMonths[laneMonths.length - 1];

        return {
            laneId,
            season: 'Q4' as const,
            seasonYear: anchorYear,
            label,
            rangeLabel: laneMonths.length === 1 ? String(anchorYear) + '/' + String(firstMonth) : String(firstMonth) + '-' + String(lastMonth) + '月',
            start: Math.max(minAxis, firstMonth),
            end: Math.min(maxAxis, lastMonth + 1),
            months: laneMonths,
            monthBreakdown: laneMonths.map((month) => ({
                axisValue: Number((month + 0.5).toFixed(2)),
                slotAxisValue: month,
                label: resolveSeasonAxisLabel(month, anchorYear),
                sales: Number(laneRows.filter((row) => row.saleMonth === month).reduce((sum, row) => sum + row.allocatedSales, 0).toFixed(1)),
            })),
            actualSales: Number(laneActual.toFixed(1)),
            planSales: Number(lanePlan.toFixed(1)),
            color,
            fill,
            border,
        } satisfies SeasonTransitionLane;
    };

    const carryoverLane = buildResidualLane(
        CARRYOVER_LANE_ID,
        '常青款',
        grouped.get(CARRYOVER_LANE_ID) || [],
        '#14B8A6',
        'rgba(20, 184, 166, 0.10)',
        'rgba(20, 184, 166, 0.36)',
    );
    if (carryoverLane) lanes.push(carryoverLane);

    const otherLane = buildResidualLane(
        OTHER_NON_MAIN_LANE_ID,
        '其他非主承接',
        grouped.get(OTHER_NON_MAIN_LANE_ID) || [],
        '#94A3B8',
        'rgba(148, 163, 184, 0.10)',
        'rgba(148, 163, 184, 0.32)',
    );
    if (otherLane) lanes.push(otherLane);

    const rankLane = (laneId: string) => {
        if (laneId === CARRYOVER_LANE_ID) return 1;
        if (laneId === OTHER_NON_MAIN_LANE_ID) return 2;
        return 0;
    };

    return lanes.sort((a, b) => {
        const rankDiff = rankLane(a.laneId) - rankLane(b.laneId);
        if (rankDiff !== 0) return rankDiff;
        const diff = a.start - b.start;
        if (diff !== 0) return diff;
        return a.seasonYear - b.seasonYear;
    });
}
