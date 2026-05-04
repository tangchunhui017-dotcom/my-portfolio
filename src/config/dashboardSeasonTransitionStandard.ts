import dimPlanRaw from '@/../data/dashboard/dim_plan.json';
import { SEASONAL_INVENTORY_TRANSITIONS } from '@/config/annualControl';
import type { DashboardNonMainReason } from '@/config/dashboardCarryover';
import { formatTransitionSeasonKey, resolveTransitionWindow } from '@/config/dashboardSeasonTransitionRules';
import { getDashboardMonthByWave, normalizeDashboardWave } from '@/config/dashboardTime';
import {
    DASHBOARD_SEASON_TRANSITION_BASELINE_STANDARD,
    DASHBOARD_SEASON_TRANSITION_DIAGNOSIS_STANDARD,
    pickDashboardSeasonTransitionAlert,
} from '@/config/dashboardSeasonTransitionStandards';
import type {
    SeasonTransitionAnalysisRow,
    SeasonTransitionSourceRecord,
    TransitionHandoffRole,
    TransitionSeasonCode,
    TransitionVisibleRange,
} from '@/config/dashboardSeasonTransition';

export type SeasonTransitionPhase = 'launch' | 'main_sell' | 'handoff';
export type SeasonTransitionAlertKind = 'handoff_gap' | 'inventory_drag' | 'launch_laggard';
export type SeasonTransitionSeasonLabel = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'OTHER' | 'CARRYOVER';
export type SeasonTransitionCarryoverHealth = 'balanced' | 'low' | 'high';
export type SeasonTransitionStructureHealth = 'balanced' | 'shifted';
export type SeasonTransitionStructureDirection = 'high' | 'low' | null;

export interface SeasonTransitionPlanBaselineRow {
    anchorYear: number;
    month: number;
    monthLabel: string;
    phase: SeasonTransitionPhase;
    prevSeason: TransitionSeasonCode;
    prevSeasonYear: number;
    currentSeason: TransitionSeasonCode;
    currentSeasonYear: number;
    nextSeason: TransitionSeasonCode;
    nextSeasonYear: number;
    gmvPlan: number;
    prevShareTarget: number;
    currentShareTarget: number;
    nextShareTarget: number;
    carryoverShareTarget: number;
    nonMainShareCeiling: number;
    sellThroughTarget: number;
    sellThroughFloor: number;
    inventoryDragCeiling: number;
    launchCurveTarget: number;
    stageSummary: string;
}

export interface SeasonTransitionAnalysisResultRow {
    anchorYear: number;
    month: number;
    monthLabel: string;
    laneId: string;
    laneLabel: string;
    season: SeasonTransitionSeasonLabel;
    seasonYear: number;
    handoffRole: TransitionHandoffRole;
    nonMainReason: DashboardNonMainReason;
    salesAmt: number;
    salesShare: number;
    planSalesAmt: number;
    planShare: number;
    salesGap: number;
    shareGap: number;
    sellThrough: number;
    alerts: SeasonTransitionAlertKind[];
    diagnosisLabel: string;
    actionRecommendation: string;
}

export interface SeasonTransitionMonthlySummary {
    anchorYear: number;
    month: number;
    monthLabel: string;
    totalSalesAmt: number;
    totalPlanAmt: number;
    totalGapAmt: number;
    prevSeasonKey: string;
    currentSeasonKey: string;
    nextSeasonKey: string;
    prevSalesAmt: number;
    currentSalesAmt: number;
    nextSalesAmt: number;
    carryoverSalesAmt: number;
    otherNonMainSalesAmt: number;
    nonMainSalesAmt: number;
    prevShare: number;
    currentShare: number;
    nextShare: number;
    carryoverShareTarget: number;
    carryoverShare: number;
    carryoverShareGap: number;
    carryoverHealth: SeasonTransitionCarryoverHealth;
    otherNonMainShare: number;
    nonMainShare: number;
    structureHealth: SeasonTransitionStructureHealth;
    structureFocusRole: 'prev' | 'current' | 'next' | null;
    structureFocusGap: number;
    structureFocusDirection: SeasonTransitionStructureDirection;
    weightedSellThrough: number;
    alerts: SeasonTransitionAlertKind[];
    diagnosisLabel: string;
    actionRecommendation: string;
}

const MONTHLY_PLAN = Array.isArray((dimPlanRaw as { monthly_plan?: unknown[] }).monthly_plan)
    ? ((dimPlanRaw as { monthly_plan?: { month: number; plan_sales_amt: number }[] }).monthly_plan || [])
    : [];

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'] as const;

const PHASE_PROFILE = DASHBOARD_SEASON_TRANSITION_BASELINE_STANDARD.phaseProfiles;

function safeDiv(numerator: number, denominator: number) {
    return denominator === 0 ? 0 : numerator / denominator;
}

function toWan(value: number | null | undefined) {
    return Number((((value || 0) as number) / 10000).toFixed(4));
}

function formatSeasonKey(season: TransitionSeasonCode, seasonYear: number) {
    return formatTransitionSeasonKey(season, seasonYear);
}

function resolveMonthLabel(month: number) {
    return MONTH_LABELS[Math.max(1, Math.min(12, month)) - 1];
}

function resolvePhase(month: number): SeasonTransitionPhase {
    const mod = (month - 1) % 3;
    if (mod === 0) return 'launch';
    if (mod === 1) return 'main_sell';
    return 'handoff';
}

function normalizeTargetShares(
    prevBase: number,
    currentBase: number,
    nextBase: number,
    carryoverShareTarget: number,
    nonMainCeiling: number,
) {
    const mainCapacity = Math.max(
        DASHBOARD_SEASON_TRANSITION_BASELINE_STANDARD.mainChainCapacityFloor,
        1 - nonMainCeiling - carryoverShareTarget,
    );
    const totalBase = Math.max(0.01, prevBase + currentBase + nextBase);
    const scale = mainCapacity / totalBase;
    return {
        prev: prevBase * scale,
        current: currentBase * scale,
        next: nextBase * scale,
    };
}

function getTransitionConfig(season: TransitionSeasonCode) {
    return SEASONAL_INVENTORY_TRANSITIONS.find((item) => item.season === season);
}

function buildBaselineStageSummary(
    prevSeasonKey: string,
    currentSeasonKey: string,
    nextSeasonKey: string,
    phase: SeasonTransitionPhase,
) {
    if (phase === 'launch') {
        return `${prevSeasonKey}收尾、${currentSeasonKey}起量、${nextSeasonKey}小规模预热`;
    }
    if (phase === 'main_sell') {
        return `${currentSeasonKey}主销放量，${prevSeasonKey}退出主陈列，${nextSeasonKey}控量试水`;
    }
    return `${currentSeasonKey}进入换季交接，${nextSeasonKey}开始预热承接，${prevSeasonKey}压缩尾货`;
}

function resolveRecordMonth(record: SeasonTransitionSourceRecord) {
    const wave = normalizeDashboardWave(record.sale_wave || record.wave);
    if (!wave) return null;
    return getDashboardMonthByWave(wave);
}

function normalizeMixShares(input: { prev: number; current: number; next: number; carryover: number; nonMain: number }) {
    const total = input.prev + input.current + input.next + input.carryover + input.nonMain;
    if (total <= 0) return { prev: 0, current: 0, next: 0, carryover: 0, nonMain: 0 };
    return {
        prev: input.prev / total,
        current: input.current / total,
        next: input.next / total,
        carryover: input.carryover / total,
        nonMain: input.nonMain / total,
    };
}

function buildMockActualShares(baseline: SeasonTransitionPlanBaselineRow) {
    let prev = baseline.prevShareTarget;
    let current = baseline.currentShareTarget;
    let next = baseline.nextShareTarget;
    let carryover = baseline.carryoverShareTarget;
    let nonMain = Math.min(0.18, Math.max(0.06, baseline.nonMainShareCeiling));

    if (baseline.phase === 'launch') {
        prev += 0.03;
        current -= 0.02;
        next += 0.01;
        carryover += 0.01;
    } else if (baseline.phase === 'main_sell') {
        prev = Math.max(0.04, prev - 0.04);
        current += 0.06;
        next = Math.max(0.05, next - 0.02);
        carryover = Math.max(0.04, carryover - 0.01);
        nonMain = Math.max(0.05, nonMain - 0.02);
    } else {
        prev += 0.02;
        current -= 0.03;
        next += 0.03;
        carryover += 0.01;
    }

    if (baseline.month === 4 || baseline.month === 10) {
        nonMain += 0.03;
        current = Math.max(0.2, current - 0.02);
        next += 0.01;
    }

    if (baseline.month === 7) {
        next += 0.02;
        prev = Math.max(0.04, prev - 0.02);
    }

    return normalizeMixShares({ prev, current, next, carryover, nonMain });
}

function resolveMockLaneMeta(
    role: TransitionHandoffRole,
    baseline: SeasonTransitionPlanBaselineRow,
): { laneId: string; laneLabel: string; laneSeason: TransitionSeasonCode; laneSeasonYear: number } {
    if (role === 'prev') {
        return {
            laneId: `${baseline.prevSeason}-${baseline.prevSeasonYear}`,
            laneLabel: formatSeasonKey(baseline.prevSeason, baseline.prevSeasonYear),
            laneSeason: baseline.prevSeason,
            laneSeasonYear: baseline.prevSeasonYear,
        };
    }
    if (role === 'current') {
        return {
            laneId: `${baseline.currentSeason}-${baseline.currentSeasonYear}`,
            laneLabel: formatSeasonKey(baseline.currentSeason, baseline.currentSeasonYear),
            laneSeason: baseline.currentSeason,
            laneSeasonYear: baseline.currentSeasonYear,
        };
    }
    if (role === 'next') {
        return {
            laneId: `${baseline.nextSeason}-${baseline.nextSeasonYear}`,
            laneLabel: formatSeasonKey(baseline.nextSeason, baseline.nextSeasonYear),
            laneSeason: baseline.nextSeason,
            laneSeasonYear: baseline.nextSeasonYear,
        };
    }
    if (role === 'carryover') {
        return {
            laneId: 'carryover-season',
            laneLabel: '常青款',
            laneSeason: baseline.currentSeason,
            laneSeasonYear: baseline.currentSeasonYear,
        };
    }
    return {
        laneId: 'other-seasons',
        laneLabel: '其他非主承接',
        laneSeason: baseline.currentSeason,
        laneSeasonYear: baseline.currentSeasonYear,
    };
}

function resolveMockRoleSellThrough(role: TransitionHandoffRole, baseline: SeasonTransitionPlanBaselineRow) {
    if (role === 'prev') return Math.max(0.38, baseline.sellThroughFloor - 0.03);
    if (role === 'current') return baseline.sellThroughTarget;
    if (role === 'next') return Math.max(0.32, baseline.sellThroughFloor - 0.1);
    if (role === 'carryover') return Math.max(0.45, baseline.sellThroughFloor);
    return Math.max(0.3, baseline.sellThroughFloor - 0.12);
}

function resolveMockNonMainReason(role: TransitionHandoffRole): DashboardNonMainReason {
    if (role === 'carryover') return 'carryover_active';
    if (role === 'non_main') return 'aged_tail';
    return null;
}

export function buildSeasonTransitionMockRows(
    records: SeasonTransitionSourceRecord[],
    baselineRows: SeasonTransitionPlanBaselineRow[],
    visibleRange: TransitionVisibleRange,
): SeasonTransitionAnalysisRow[] {
    const monthTotals = new Map<number, number>();
    records.forEach((record) => {
        const month = resolveRecordMonth(record);
        if (month === null) return;
        if (month < visibleRange.startMonth || month > visibleRange.endMonth) return;
        monthTotals.set(month, (monthTotals.get(month) || 0) + Number(record.net_sales_amt || 0) / 10000);
    });

    const rows: SeasonTransitionAnalysisRow[] = [];
    baselineRows.forEach((baseline) => {
        const month = baseline.month;
        if (month < visibleRange.startMonth || month > visibleRange.endMonth) return;
        const totalSales = monthTotals.get(month) || 0;
        if (totalSales <= 0) return;

        const mix = buildMockActualShares(baseline);
        ([
            ['prev', mix.prev],
            ['current', mix.current],
            ['next', mix.next],
            ['carryover', mix.carryover],
            ['non_main', mix.nonMain],
        ] as const).forEach(([role, share]) => {
            if (share <= 0.0001) return;
            const lane = resolveMockLaneMeta(role, baseline);
            rows.push({
                rowId: `mock-${month}-${role}`,
                sourceRecordId: `mock-${month}-${role}`,
                skuId: `MOCK-${month}-${role}`,
                channelId: 'MOCK',
                saleMonth: month,
                waveKey: `W${String(month).padStart(2, '0')}`,
                salesSeason: role === 'prev'
                    ? baseline.prevSeason
                    : role === 'current'
                      ? baseline.currentSeason
                      : role === 'next'
                        ? baseline.nextSeason
                        : null,
                salesSeasonYear: role === 'prev'
                    ? baseline.prevSeasonYear
                    : role === 'current'
                      ? baseline.currentSeasonYear
                      : role === 'next'
                        ? baseline.nextSeasonYear
                        : null,
                laneId: lane.laneId,
                laneLabel: lane.laneLabel,
                laneSeason: lane.laneSeason,
                laneSeasonYear: lane.laneSeasonYear,
                axisMonth: month,
                axisValue: Number((month + 0.5).toFixed(2)),
                handoffRole: role,
                isMainHandoff: role === 'prev' || role === 'current' || role === 'next',
                nonMainReason: resolveMockNonMainReason(role),
                allocationRatio: Number(share.toFixed(4)),
                allocatedSales: Number((totalSales * share).toFixed(4)),
            });
        });
    });

    return rows;
}

export function buildSeasonTransitionPlanBaseline(anchorYear: number): SeasonTransitionPlanBaselineRow[] {
    return Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const phase = resolvePhase(month);
        const window = resolveTransitionWindow(anchorYear, month);
        const prev = window.prev;
        const current = window.current;
        const next = window.next;
        const currentConfig = getTransitionConfig(current.season);
        const nextConfig = getTransitionConfig(next.season);
        const phaseProfile = PHASE_PROFILE[phase];
        const carryoverShareTarget = DASHBOARD_SEASON_TRANSITION_BASELINE_STANDARD.carryoverShareTargetByPhase[phase];
        const gmvPlan = toWan(MONTHLY_PLAN.find((item) => Number(item.month) === month)?.plan_sales_amt || 0);

        const prevBase = (currentConfig?.oldGoodsRatio || 0.2) * phaseProfile.prevMultiplier;
        const currentBase = (currentConfig?.newGoodsRatio || 0.65) * phaseProfile.currentMultiplier;
        const nextBase = Math.max(
            phaseProfile.nextAbsolute,
            (nextConfig?.newGoodsRatio || 0.65) * DASHBOARD_SEASON_TRANSITION_BASELINE_STANDARD.nextSeasonWarmupMultiplier[phase],
        );
        const shares = normalizeTargetShares(prevBase, currentBase, nextBase, carryoverShareTarget, phaseProfile.nonMainCeiling);
        const prevSeasonKey = formatSeasonKey(prev.season, prev.seasonYear);
        const currentSeasonKey = formatSeasonKey(current.season, current.seasonYear);
        const nextSeasonKey = formatSeasonKey(next.season, next.seasonYear);
        const sellThroughTarget = currentConfig?.sellThroughTarget || 0.75;

        return {
            anchorYear,
            month,
            monthLabel: resolveMonthLabel(month),
            phase,
            prevSeason: prev.season,
            prevSeasonYear: prev.seasonYear,
            currentSeason: current.season,
            currentSeasonYear: current.seasonYear,
            nextSeason: next.season,
            nextSeasonYear: next.seasonYear,
            gmvPlan: Number(gmvPlan.toFixed(1)),
            prevShareTarget: Number(shares.prev.toFixed(4)),
            currentShareTarget: Number(shares.current.toFixed(4)),
            nextShareTarget: Number(shares.next.toFixed(4)),
            carryoverShareTarget: Number(carryoverShareTarget.toFixed(4)),
            nonMainShareCeiling: Number(phaseProfile.nonMainCeiling.toFixed(4)),
            sellThroughTarget: Number(sellThroughTarget.toFixed(4)),
            sellThroughFloor: Number(Math.max(DASHBOARD_SEASON_TRANSITION_BASELINE_STANDARD.sellThroughFloor.absoluteMin, sellThroughTarget - DASHBOARD_SEASON_TRANSITION_BASELINE_STANDARD.sellThroughFloor.offsetFromTarget).toFixed(4)),
            inventoryDragCeiling: Number(Math.max(shares.prev + DASHBOARD_SEASON_TRANSITION_BASELINE_STANDARD.inventoryDragAllowance.prevShareExtra, DASHBOARD_SEASON_TRANSITION_BASELINE_STANDARD.inventoryDragAllowance.floorByPhase[phase]).toFixed(4)),
            launchCurveTarget: Number((phase === 'handoff' ? shares.next : shares.current).toFixed(4)),
            stageSummary: buildBaselineStageSummary(prevSeasonKey, currentSeasonKey, nextSeasonKey, phase),
        };
    });
}

function resolveRolePlanShare(baseline: SeasonTransitionPlanBaselineRow, role: TransitionHandoffRole) {
    if (role === 'prev') return baseline.prevShareTarget;
    if (role === 'current') return baseline.currentShareTarget;
    if (role === 'next') return baseline.nextShareTarget;
    if (role === 'carryover') return baseline.carryoverShareTarget;
    return baseline.nonMainShareCeiling;
}

function resolveLaneLabel(row: SeasonTransitionAnalysisRow) {
    if (row.laneId === 'carryover-season') return '常青款';
    if (row.laneId === 'other-seasons') return '其他非主承接';
    return formatSeasonKey(row.laneSeason, row.laneSeasonYear);
}

function buildSourceRecordMap(records: SeasonTransitionSourceRecord[]) {
    const recordMap = new Map<string, SeasonTransitionSourceRecord>();
    records.forEach((record, index) => {
        const id = String(record.record_id || `${record.sku_id}-${index}`);
        if (!recordMap.has(id)) recordMap.set(id, record);
    });
    return recordMap;
}

function resolveGroupDiagnosis(role: TransitionHandoffRole, shareGap: number, salesGap: number, sellThrough: number, baseline: SeasonTransitionPlanBaselineRow) {
    const laneThresholds = DASHBOARD_SEASON_TRANSITION_DIAGNOSIS_STANDARD.laneThresholds;
    const sellThroughThresholds = DASHBOARD_SEASON_TRANSITION_DIAGNOSIS_STANDARD.sellThroughThresholds;
    const diagnosisCopy = DASHBOARD_SEASON_TRANSITION_DIAGNOSIS_STANDARD.diagnosisCopy;

    if (role === 'carryover') {
        return {
            alerts: [] as SeasonTransitionAlertKind[],
            diagnosisLabel: diagnosisCopy.carryover.label,
            actionRecommendation: diagnosisCopy.carryover.action,
        };
    }
    if (role === 'non_main' && shareGap > laneThresholds.nonMainShareGap) {
        return {
            alerts: ['inventory_drag'] as SeasonTransitionAlertKind[],
            diagnosisLabel: diagnosisCopy.nonMainOverflow.label,
            actionRecommendation: diagnosisCopy.nonMainOverflow.action,
        };
    }

    if ((role === 'current' || role === 'next') && salesGap < 0 && shareGap < -laneThresholds.handoffShareGap) {
        const shortageLike = sellThrough >= Math.min(0.95, baseline.sellThroughTarget + sellThroughThresholds.shortageLikeGap);
        return {
            alerts: ['handoff_gap'] as SeasonTransitionAlertKind[],
            diagnosisLabel: shortageLike ? diagnosisCopy.handoffGap.shortageLabel : diagnosisCopy.handoffGap.demandLabel,
            actionRecommendation: shortageLike ? diagnosisCopy.handoffGap.shortageAction : diagnosisCopy.handoffGap.demandAction,
        };
    }

    if (role === 'prev' && shareGap > laneThresholds.prevTailShareGap) {
        return {
            alerts: ['inventory_drag'] as SeasonTransitionAlertKind[],
            diagnosisLabel: diagnosisCopy.prevInventoryDrag.label,
            actionRecommendation: diagnosisCopy.prevInventoryDrag.action,
        };
    }

    if (role === 'next' && shareGap < -laneThresholds.nextLaunchShareGap) {
        return {
            alerts: ['launch_laggard'] as SeasonTransitionAlertKind[],
            diagnosisLabel: diagnosisCopy.nextLaunchLaggard.label,
            actionRecommendation: diagnosisCopy.nextLaunchLaggard.action,
        };
    }

    return {
        alerts: [] as SeasonTransitionAlertKind[],
        diagnosisLabel: diagnosisCopy.healthy.label,
        actionRecommendation: diagnosisCopy.healthy.action,
    };
}

export function buildSeasonTransitionAnalysisTable(
    rows: SeasonTransitionAnalysisRow[],
    records: SeasonTransitionSourceRecord[],
    baselineRows: SeasonTransitionPlanBaselineRow[],
): SeasonTransitionAnalysisResultRow[] {
    const recordMap = buildSourceRecordMap(records);
    const baselineMap = new Map<number, SeasonTransitionPlanBaselineRow>(baselineRows.map((row) => [row.month, row]));
    const monthTotalMap = new Map<number, number>();
    rows.forEach((row) => {
        monthTotalMap.set(row.saleMonth, (monthTotalMap.get(row.saleMonth) || 0) + row.allocatedSales);
    });

    const grouped = new Map<string, SeasonTransitionAnalysisRow[]>();
    rows.forEach((row) => {
        const key = `${row.saleMonth}:${row.laneId}`;
        const bucket = grouped.get(key) || [];
        bucket.push(row);
        grouped.set(key, bucket);
    });

    return Array.from(grouped.entries())
        .map(([groupKey, laneRows]): SeasonTransitionAnalysisResultRow | null => {
            const [monthRaw] = groupKey.split(':');
            const month = Number(monthRaw);
            const baseline = baselineMap.get(month);
            if (!baseline) return null;

            const sample = laneRows[0];
            const salesAmt = laneRows.reduce((sum, row) => sum + row.allocatedSales, 0);
            const monthTotal = monthTotalMap.get(month) || 0;
            const salesShare = safeDiv(salesAmt, monthTotal);
            const planShare = resolveRolePlanShare(baseline, sample.handoffRole);
            const planSalesAmt = baseline.gmvPlan * planShare;
            const weightedSellThrough = safeDiv(
                laneRows.reduce((sum, row) => {
                    const source = recordMap.get(row.sourceRecordId) as { cumulative_sell_through?: number } | undefined;
                    const sellThrough = source
                        ? Number(source.cumulative_sell_through || 0)
                        : resolveMockRoleSellThrough(sample.handoffRole, baseline);
                    return sum + row.allocatedSales * sellThrough;
                }, 0),
                salesAmt,
            );
            const diagnosis = resolveGroupDiagnosis(sample.handoffRole, salesShare - planShare, salesAmt - planSalesAmt, weightedSellThrough, baseline);

            return {
                anchorYear: baseline.anchorYear,
                month,
                monthLabel: baseline.monthLabel,
                laneId: sample.laneId,
                laneLabel: resolveLaneLabel(sample),
                season: sample.laneId === 'carryover-season' ? 'CARRYOVER' : sample.laneId === 'other-seasons' ? 'OTHER' : sample.laneSeason,
                seasonYear: sample.laneSeasonYear,
                handoffRole: sample.handoffRole,
                nonMainReason: sample.nonMainReason,
                salesAmt: Number(salesAmt.toFixed(1)),
                salesShare: Number(salesShare.toFixed(4)),
                planSalesAmt: Number(planSalesAmt.toFixed(1)),
                planShare: Number(planShare.toFixed(4)),
                salesGap: Number((salesAmt - planSalesAmt).toFixed(1)),
                shareGap: Number((salesShare - planShare).toFixed(4)),
                sellThrough: Number(weightedSellThrough.toFixed(4)),
                alerts: diagnosis.alerts,
                diagnosisLabel: diagnosis.diagnosisLabel,
                actionRecommendation: diagnosis.actionRecommendation,
            } satisfies SeasonTransitionAnalysisResultRow;
        })
        .filter((row): row is SeasonTransitionAnalysisResultRow => row !== null)
        .sort((a, b) => a.month - b.month || a.laneLabel.localeCompare(b.laneLabel));
}

function pickFirstAlert(alerts: SeasonTransitionAlertKind[]) {
    return pickDashboardSeasonTransitionAlert(alerts);
}

function resolveCarryoverHealth(baseline: SeasonTransitionPlanBaselineRow, carryoverShare: number) {
    const healthThresholds = DASHBOARD_SEASON_TRANSITION_DIAGNOSIS_STANDARD.healthThresholds;
    const gap = carryoverShare - baseline.carryoverShareTarget;
    if (gap > healthThresholds.carryoverWarningGap) return { status: 'high' as SeasonTransitionCarryoverHealth, gap };
    if (gap < -healthThresholds.carryoverWarningGap) return { status: 'low' as SeasonTransitionCarryoverHealth, gap };
    return { status: 'balanced' as SeasonTransitionCarryoverHealth, gap };
}

function resolveStructureHealth(
    baseline: SeasonTransitionPlanBaselineRow,
    prevShare: number,
    currentShare: number,
    nextShare: number,
) {
    const healthThresholds = DASHBOARD_SEASON_TRANSITION_DIAGNOSIS_STANDARD.healthThresholds;
    const candidates = [
        { role: 'prev' as const, gap: prevShare - baseline.prevShareTarget },
        { role: 'current' as const, gap: currentShare - baseline.currentShareTarget },
        { role: 'next' as const, gap: nextShare - baseline.nextShareTarget },
    ].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
    const focus = candidates[0] || { role: null, gap: 0 };
    if (focus.role && Math.abs(focus.gap) > healthThresholds.structureShiftGap) {
        return {
            status: 'shifted' as SeasonTransitionStructureHealth,
            focusRole: focus.role,
            focusGap: focus.gap,
            focusDirection: focus.gap >= 0 ? 'high' as SeasonTransitionStructureDirection : 'low' as SeasonTransitionStructureDirection,
        };
    }
    return { status: 'balanced' as SeasonTransitionStructureHealth, focusRole: null, focusGap: 0, focusDirection: null as SeasonTransitionStructureDirection };
}

function resolveSummaryDiagnosis(
    baseline: SeasonTransitionPlanBaselineRow,
    totalSalesAmt: number,
    prevShare: number,
    currentShare: number,
    nextShare: number,
    carryoverHealth: SeasonTransitionCarryoverHealth,
    otherNonMainShare: number,
    structureHealth: SeasonTransitionStructureHealth,
    weightedSellThrough: number,
): Pick<SeasonTransitionMonthlySummary, 'alerts' | 'diagnosisLabel' | 'actionRecommendation'> {
    const summaryThresholds = DASHBOARD_SEASON_TRANSITION_DIAGNOSIS_STANDARD.summaryThresholds;
    const sellThroughThresholds = DASHBOARD_SEASON_TRANSITION_DIAGNOSIS_STANDARD.sellThroughThresholds;
    const diagnosisCopy = DASHBOARD_SEASON_TRANSITION_DIAGNOSIS_STANDARD.diagnosisCopy;
    const alerts: SeasonTransitionAlertKind[] = [];
    const amountShortfall = totalSalesAmt < baseline.gmvPlan * summaryThresholds.amountShortfallRatio;
    const mainChainWeak = currentShare + nextShare < baseline.currentShareTarget + baseline.nextShareTarget - summaryThresholds.mainChainWeakGap;
    const inventoryDrag = prevShare > baseline.inventoryDragCeiling || otherNonMainShare > baseline.nonMainShareCeiling;
    const launchLaggard =
        (baseline.phase === 'launch' && currentShare < baseline.currentShareTarget - summaryThresholds.launchCurrentGap) ||
        (baseline.phase !== 'launch' && nextShare < baseline.nextShareTarget - summaryThresholds.launchNextGap);

    if (amountShortfall && mainChainWeak) alerts.push('handoff_gap');
    if (inventoryDrag) alerts.push('inventory_drag');
    if (launchLaggard) alerts.push('launch_laggard');

    const primaryAlert = pickFirstAlert(alerts);
    if (primaryAlert === 'handoff_gap') {
        return {
            alerts,
            diagnosisLabel: weightedSellThrough >= Math.min(0.95, baseline.sellThroughTarget + sellThroughThresholds.shortageLikeGap) ? diagnosisCopy.summaryHandoffGap.shortageLabel : diagnosisCopy.summaryHandoffGap.demandLabel,
            actionRecommendation:
                weightedSellThrough >= Math.min(0.95, baseline.sellThroughTarget + sellThroughThresholds.shortageLikeGap)
                    ? diagnosisCopy.summaryHandoffGap.shortageAction
                    : diagnosisCopy.summaryHandoffGap.demandAction,
        };
    }
    if (primaryAlert === 'inventory_drag') {
        return {
            alerts,
            diagnosisLabel: diagnosisCopy.summaryInventoryDrag.label,
            actionRecommendation: diagnosisCopy.summaryInventoryDrag.action,
        };
    }
    if (primaryAlert === 'launch_laggard') {
        return { alerts, diagnosisLabel: diagnosisCopy.summaryLaunchLaggard.label, actionRecommendation: diagnosisCopy.summaryLaunchLaggard.action };
    }
    if (carryoverHealth === 'low') {
        return { alerts: [], diagnosisLabel: diagnosisCopy.summaryCarryoverLow.label, actionRecommendation: diagnosisCopy.summaryCarryoverLow.action };
    }
    if (carryoverHealth === 'high') {
        return { alerts: [], diagnosisLabel: diagnosisCopy.summaryCarryoverHigh.label, actionRecommendation: diagnosisCopy.summaryCarryoverHigh.action };
    }
    if (structureHealth === 'shifted') {
        return { alerts: [], diagnosisLabel: diagnosisCopy.summaryStructureShift.label, actionRecommendation: diagnosisCopy.summaryStructureShift.action };
    }
    return { alerts: [], diagnosisLabel: diagnosisCopy.summaryHealthy.label, actionRecommendation: diagnosisCopy.summaryHealthy.action };
}

export function buildSeasonTransitionMonthlySummary(
    analysisRows: SeasonTransitionAnalysisResultRow[],
    baselineRows: SeasonTransitionPlanBaselineRow[],
    visibleRange?: TransitionVisibleRange,
): SeasonTransitionMonthlySummary[] {
    const baselineMap = new Map<number, SeasonTransitionPlanBaselineRow>(baselineRows.map((row) => [row.month, row]));
    const grouped = new Map<number, SeasonTransitionAnalysisResultRow[]>();
    analysisRows.forEach((row) => {
        if (visibleRange && (row.month < visibleRange.startMonth || row.month > visibleRange.endMonth)) return;
        const bucket = grouped.get(row.month) || [];
        bucket.push(row);
        grouped.set(row.month, bucket);
    });

    return Array.from(grouped.entries())
        .map(([month, rows]) => {
            const baseline = baselineMap.get(month);
            if (!baseline) return null;
            const totalSalesAmt = rows.reduce((sum, row) => sum + row.salesAmt, 0);
            const totalPlanAmt = baseline.gmvPlan;
            const prevRow = rows.find((row) => row.handoffRole === 'prev');
            const currentRow = rows.find((row) => row.handoffRole === 'current');
            const nextRow = rows.find((row) => row.handoffRole === 'next');
            const carryoverRow = rows.find((row) => row.handoffRole === 'carryover');
            const nonMainRow = rows.find((row) => row.handoffRole === 'non_main');
            const prevShare = prevRow?.salesShare || 0;
            const currentShare = currentRow?.salesShare || 0;
            const nextShare = nextRow?.salesShare || 0;
            const carryoverShare = carryoverRow?.salesShare || 0;
            const otherNonMainShare = nonMainRow?.salesShare || 0;
            const nonMainShare = carryoverShare + otherNonMainShare;
            const carryoverHealth = resolveCarryoverHealth(baseline, carryoverShare);
            const structureHealth = resolveStructureHealth(baseline, prevShare, currentShare, nextShare);
            const weightedSellThrough = safeDiv(
                rows.reduce((sum, row) => sum + row.salesAmt * row.sellThrough, 0),
                totalSalesAmt,
            );
            const diagnosis = resolveSummaryDiagnosis(
                baseline,
                totalSalesAmt,
                prevShare,
                currentShare,
                nextShare,
                carryoverHealth.status,
                otherNonMainShare,
                structureHealth.status,
                weightedSellThrough,
            );

            return {
                anchorYear: baseline.anchorYear,
                month,
                monthLabel: baseline.monthLabel,
                totalSalesAmt: Number(totalSalesAmt.toFixed(1)),
                totalPlanAmt: Number(totalPlanAmt.toFixed(1)),
                totalGapAmt: Number((totalSalesAmt - totalPlanAmt).toFixed(1)),
                prevSeasonKey: formatSeasonKey(baseline.prevSeason, baseline.prevSeasonYear),
                currentSeasonKey: formatSeasonKey(baseline.currentSeason, baseline.currentSeasonYear),
                nextSeasonKey: formatSeasonKey(baseline.nextSeason, baseline.nextSeasonYear),
                prevSalesAmt: Number((prevRow?.salesAmt || 0).toFixed(1)),
                currentSalesAmt: Number((currentRow?.salesAmt || 0).toFixed(1)),
                nextSalesAmt: Number((nextRow?.salesAmt || 0).toFixed(1)),
                carryoverSalesAmt: Number((carryoverRow?.salesAmt || 0).toFixed(1)),
                otherNonMainSalesAmt: Number((nonMainRow?.salesAmt || 0).toFixed(1)),
                nonMainSalesAmt: Number(((carryoverRow?.salesAmt || 0) + (nonMainRow?.salesAmt || 0)).toFixed(1)),
                prevShare: Number(prevShare.toFixed(4)),
                currentShare: Number(currentShare.toFixed(4)),
                nextShare: Number(nextShare.toFixed(4)),
                carryoverShareTarget: Number(baseline.carryoverShareTarget.toFixed(4)),
                carryoverShare: Number(carryoverShare.toFixed(4)),
                carryoverShareGap: Number(carryoverHealth.gap.toFixed(4)),
                carryoverHealth: carryoverHealth.status,
                otherNonMainShare: Number(otherNonMainShare.toFixed(4)),
                nonMainShare: Number(nonMainShare.toFixed(4)),
                structureHealth: structureHealth.status,
                structureFocusRole: structureHealth.focusRole,
                structureFocusGap: Number(structureHealth.focusGap.toFixed(4)),
                structureFocusDirection: structureHealth.focusDirection,
                weightedSellThrough: Number(weightedSellThrough.toFixed(4)),
                alerts: diagnosis.alerts,
                diagnosisLabel: diagnosis.diagnosisLabel,
                actionRecommendation: diagnosis.actionRecommendation,
            } satisfies SeasonTransitionMonthlySummary;
        })
        .filter((row): row is SeasonTransitionMonthlySummary => Boolean(row))
        .sort((a, b) => a.month - b.month);
}
