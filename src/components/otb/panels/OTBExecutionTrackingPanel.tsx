'use client';
/**
 * src/components/otb/panels/OTBExecutionTrackingPanel.tsx
 * 采购执行与上市履约看板
 */
import { useState, useMemo, useCallback, useRef, type ReactNode } from 'react';
import {
    calcExecutionStatus, formatCurrency, formatPct,
    type CurrencyUnit, type ExecutionTrackingInput, type ExecutionStatus,
} from '@/utils/otbCalculations';
import {
    BUSINESS_DATE,
    resolveExecTimeStatus,
    calcExecutionSummary,
    calcWaveSummaries,
    type ExecDiagnosis,
    type ExecTimeStatus,
    type WaveExecSummary,
} from '@/utils/otbExecutionTracking';
import type { OTBPriceStructureOutput } from './OTBPriceStructurePanel';
import defaultData from '../../../../data/otb/otb_execution_tracking.json';
import { WAVE_PLAN_MASTER } from '@/utils/wavePlanMaster';

interface Props {
    currencyUnit:       CurrencyUnit;
    priceStructure?:    OTBPriceStructureOutput | null;
    records?:           ExecutionTrackingInput[];
    onRecordsChange?:   (records: ExecutionTrackingInput[]) => void;
}

interface WavePlanRecord {
    id: string;
    season: string;
    seasonLabel?: string;
    wave: string;
    waveRole?: string;
    launchMonth: number;
    launchDate: string;
    plannedStyleCount?: number;
    targetColorCount?: number;
    targetSkuCount?: number;
    averageDepth?: number;
    sellThroughTarget?: number;
    arrivalRateTarget?: number;
    arrivalSuggestion?: string;
    planOtbBudget?: number;
    mainCategory?: string;
    priceBandFocus?: string[];
    productRoleFocus?: string[];
    orderDeadline?: string;
    warehouseDeadline?: string;
}

interface WaveViewModel extends WaveExecSummary {
    quarterLabel: string;
    seasonLabel?: string;
    mainCategory?: string;
    plan?: WavePlanRecord;
    isMissingExecution: boolean;
    missingDiagnosis?: ExecDiagnosis;
}

const TIME_STATUS_STYLE: Record<ExecTimeStatus, { card: string; label: string; dot: string; text: string }> = {
    closed:   { card: 'border-slate-200 bg-slate-50',   label: '已上市', dot: 'bg-slate-400',   text: 'text-slate-500' },
    current:  { card: 'border-sky-200 bg-sky-50',       label: '当前执行', dot: 'bg-sky-500',   text: 'text-sky-700' },
    planning: { card: 'border-teal-200 bg-teal-50',     label: '未来计划', dot: 'bg-teal-500',  text: 'text-teal-700' },
};

const PRIORITY_BADGE: Record<string, string> = {
    P0: 'bg-rose-600 text-white',
    P1: 'bg-amber-500 text-white',
    P2: 'bg-slate-200 text-slate-600',
};
const PRIORITY_CARD: Record<string, string> = {
    P0: 'border-rose-200 bg-rose-50',
    P1: 'border-amber-200 bg-amber-50',
    P2: 'border-slate-200 bg-slate-50',
};

const ALL_STATUSES: ExecutionStatus[] = ['未开始', '计划中', '已审批', '已下单', '已到货', '偏差预警', '已关闭'];

const STATUS_CONFIG: Record<ExecutionStatus, { bg: string; text: string }> = {
    '未开始':   { bg: 'bg-slate-100',    text: 'text-slate-500'  },
    '计划中':   { bg: 'bg-sky-100',      text: 'text-sky-700'    },
    '已审批':   { bg: 'bg-indigo-100',   text: 'text-indigo-700' },
    '已下单':   { bg: 'bg-amber-100',    text: 'text-amber-700'  },
    '已到货':   { bg: 'bg-emerald-100',  text: 'text-emerald-700'},
    '偏差预警': { bg: 'bg-rose-100',     text: 'text-rose-700'   },
    '已关闭':   { bg: 'bg-slate-200',    text: 'text-slate-600'  },
};

const PRICE_BAND_LABEL: Record<string, string> = {
    entry:  '入门',
    volume: '走量',
    profit: '利润',
    image:  '形象',
};

function rateColorAgainst(rate: number | null, target: number): string {
    if (rate === null) return 'text-slate-400';
    if (rate >= target)             return 'text-emerald-600';
    if (rate >= target * 0.85)      return 'text-amber-600';
    return 'text-rose-600';
}

function rateBgAgainst(rate: number | null, target: number): string {
    if (rate === null) return 'bg-slate-50 text-slate-400';
    if (rate >= target)             return 'bg-emerald-50 text-emerald-700';
    if (rate >= target * 0.85)      return 'bg-amber-50 text-amber-700';
    return 'bg-rose-50 text-rose-700';
}

function progressFillColor(rate: number | null, target: number): string {
    if (rate === null) return 'bg-slate-200';
    if (rate >= target)             return 'bg-emerald-400';
    if (rate >= target * 0.85)      return 'bg-amber-400';
    return 'bg-rose-400';
}

function pct(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return `${Math.round(v * 100)}%`;
}

function waveKey(season: string, wave: string) {
    return `${season}-${wave}`;
}

function resolveQuarterLabel(month: number) {
    return `Q${Math.max(1, Math.min(4, Math.ceil(month / 3)))}`;
}

function diffDaysFromBusinessDate(rawDate: string, businessDate: Date) {
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return 0;
    return Math.round((parsed.getTime() - businessDate.getTime()) / (1000 * 60 * 60 * 24));
}

function comparePriority(a: ExecDiagnosis, b: ExecDiagnosis) {
    const priorityOrder: Record<ExecDiagnosis['priority'], number> = { P0: 0, P1: 1, P2: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority] || b.impactAmount - a.impactAmount;
}

function buildMissingExecutionDiagnosis(plan: WavePlanRecord, timeStatus: ExecTimeStatus): ExecDiagnosis | null {
    if (timeStatus === 'planning') return null;
    const isClosed = timeStatus === 'closed';
    return {
        id: `${plan.id}-missing-execution-plan`,
        rowId: `missing-${plan.id}`,
        season: plan.season,
        wave: plan.wave,
        categoryLabel: plan.mainCategory ?? '全品类',
        productRoleName: '波段执行计划',
        level: isClosed ? 'warning' : 'danger',
        priority: isClosed ? 'P1' : 'P0',
        issue: isClosed
            ? `${plan.season} ${plan.wave} 已上市，但缺少采购执行记录，无法复盘预算落地`
            : `${plan.season} ${plan.wave} 已进入执行窗口，但缺少采购执行计划`,
        impactAmount: plan.planOtbBudget ?? 0,
        impactLaunchDate: plan.launchDate,
        action: isClosed
            ? '补录执行数据，完成上市复盘与预算偏差归因'
            : '从波段拆解生成执行计划，补齐开发、核价、下单和到货节点',
        owner: isClosed ? '商品运营' : '商品企划/采购',
    };
}

function resolvePlanForRecord(record: ExecutionTrackingInput, plans: WavePlanRecord[]) {
    const exact = plans.find(plan => plan.season === record.season && plan.wave === record.wave);
    if (exact) return exact;
    const launchMonth = Number(record.launchDate?.slice(5, 7));
    if (!Number.isFinite(launchMonth)) return null;
    return plans.find(plan => plan.season === record.season && plan.launchMonth === launchMonth) ?? null;
}

export default function OTBExecutionTrackingPanel({
    currencyUnit, priceStructure, records: externalRecords, onRecordsChange,
}: Props) {
    const [internalRecords, setInternalRecords] = useState<ExecutionTrackingInput[]>(
        () => defaultData as ExecutionTrackingInput[],
    );
    const records       = externalRecords ?? internalRecords;
    const businessDate  = BUSINESS_DATE;

    const [ledgerOpen,   setLedgerOpen]   = useState(false);
    const [helpOpen,     setHelpOpen]     = useState(false);
    const [ledgerFilter, setLedgerFilter] = useState<'all' | 'risk' | 'current' | 'planning'>('all');
    const [selectedWave, setSelectedWave] = useState<string | null>(null);
    const [showAllActions, setShowAllActions] = useState(false);
    const [heatmapMetric, setHeatmapMetric] = useState<'sellThrough' | 'arrival' | 'order' | 'development'>('arrival');
    const ledgerRef = useRef<HTMLDivElement>(null);

    const wavePlans = useMemo(() => (
        (WAVE_PLAN_MASTER as WavePlanRecord[])
            .slice()
            .sort((a, b) => a.launchMonth - b.launchMonth || a.launchDate.localeCompare(b.launchDate))
    ), []);

    const enrichedRecords = useMemo<ExecutionTrackingInput[]>(() => {
        return records.map((record, index) => {
            const wavePlan = resolvePlanForRecord(record, wavePlans);
            const normalizedRecord: ExecutionTrackingInput = wavePlan
                ? {
                    ...record,
                    season: wavePlan.season,
                    wave: wavePlan.wave,
                    launchDate: wavePlan.launchDate,
                    orderDueDate: record.orderDueDate ?? wavePlan.orderDeadline,
                    warehouseDueDate: record.warehouseDueDate ?? wavePlan.warehouseDeadline,
                    plannedPurchaseAmount: record.plannedPurchaseAmount || wavePlan.planOtbBudget || 0,
                    plannedStyleCount: record.plannedStyleCount || wavePlan.plannedStyleCount || 0,
                }
                : record;

            if (!priceStructure) return normalizedRecord;
            const structureRow = priceStructure.categoryDepthInputs.find(item =>
                item.season === normalizedRecord.season &&
                item.wave   === normalizedRecord.wave &&
                item.category === normalizedRecord.category,
            ) ?? priceStructure.categoryDepthInputs[index % Math.max(1, priceStructure.categoryDepthInputs.length)];
            if (!structureRow) return normalizedRecord;
            const targetGrossMargin = structureRow.grossMarginTarget ?? 0.45;
            const actualGrossMargin = structureRow.retailPrice > 0
                ? 1 - structureRow.costPrice / structureRow.retailPrice
                : targetGrossMargin;
            return {
                ...normalizedRecord,
                priceBandId:       normalizedRecord.priceBandId       ?? structureRow.priceBandId,
                priceBandLabel:    normalizedRecord.priceBandLabel    ?? structureRow.priceBandLabel,
                productRoleId:     normalizedRecord.productRoleId     ?? structureRow.productRoleId,
                productRoleName:   normalizedRecord.productRoleName   ?? structureRow.productRoleName,
                costCeiling:       normalizedRecord.costCeiling       ?? structureRow.costCeiling,
                targetGrossMargin: normalizedRecord.targetGrossMargin ?? targetGrossMargin,
                actualGrossMargin: normalizedRecord.actualGrossMargin ?? actualGrossMargin,
                pricingStatus:     normalizedRecord.pricingStatus     ?? (actualGrossMargin < targetGrossMargin ? '毛利异常' : '已确认'),
                costRisk:          normalizedRecord.costRisk          ?? (structureRow.costCeiling !== undefined && structureRow.costPrice > structureRow.costCeiling ? '成本超限' : '正常'),
            };
        });
    }, [priceStructure, records, wavePlans]);

    const allRows  = useMemo(() => enrichedRecords.map(r => calcExecutionStatus(r, businessDate)), [enrichedRecords, businessDate]);
    const rawSummary  = useMemo(() => calcExecutionSummary(allRows, businessDate), [allRows, businessDate]);
    const rowWaveSummaries = useMemo(() => calcWaveSummaries(allRows, businessDate), [allRows, businessDate]);
    const rowWaveMap = useMemo(() => {
        const map = new Map<string, WaveExecSummary>();
        rowWaveSummaries.forEach(wave => map.set(wave.key, wave));
        return map;
    }, [rowWaveSummaries]);

    const waves = useMemo<WaveViewModel[]>(() => wavePlans.map(plan => {
        const key = waveKey(plan.season, plan.wave);
        const existing = rowWaveMap.get(key);
        if (existing) {
            return {
                ...existing,
                quarterLabel: resolveQuarterLabel(plan.launchMonth),
                seasonLabel: plan.seasonLabel,
                mainCategory: plan.mainCategory,
                plan,
                isMissingExecution: false,
            };
        }

        const timeStatus = resolveExecTimeStatus(plan.launchDate, businessDate);
        const missingDiagnosis = buildMissingExecutionDiagnosis(plan, timeStatus) ?? undefined;
        return {
            key,
            season: plan.season,
            wave: plan.wave,
            quarterLabel: resolveQuarterLabel(plan.launchMonth),
            seasonLabel: plan.seasonLabel,
            mainCategory: plan.mainCategory,
            plan,
            timeStatus,
            launchDate: plan.launchDate,
            daysToLaunch: diffDaysFromBusinessDate(plan.launchDate, businessDate),
            totalPlannedStyles: plan.plannedStyleCount ?? 0,
            totalDevelopedStyles: 0,
            totalPricedStyles: 0,
            totalOrderedStyles: 0,
            totalPPA: plan.planOtbBudget ?? 0,
            totalOA: 0,
            totalAA: 0,
            devRate: null,
            pricingRate: null,
            orderRate: null,
            arrivalRate: null,
            riskCount: missingDiagnosis ? 1 : 0,
            p0Count: missingDiagnosis?.priority === 'P0' ? 1 : 0,
            diagnoses: missingDiagnosis ? [missingDiagnosis] : [],
            isMissingExecution: true,
            missingDiagnosis,
        };
    }), [wavePlans, rowWaveMap, businessDate]);

    const actions = useMemo(() => (
        [
            ...rawSummary.allDiagnoses,
            ...waves.flatMap(wave => wave.missingDiagnosis ? [wave.missingDiagnosis] : []),
        ].sort(comparePriority)
    ), [rawSummary.allDiagnoses, waves]);

    const summary = useMemo(() => {
        const plannedPurchaseAmount = waves.reduce((sum, wave) => sum + wave.totalPPA, 0);
        const orderedAmount = waves.reduce((sum, wave) => sum + wave.totalOA, 0);
        const arrivedAmount = waves.reduce((sum, wave) => sum + wave.totalAA, 0);
        const plannedStyleCount = waves.reduce((sum, wave) => sum + wave.totalPlannedStyles, 0);
        const developedStyleCount = waves.reduce((sum, wave) => sum + wave.totalDevelopedStyles, 0);
        const pricedStyleCount = waves.reduce((sum, wave) => sum + wave.totalPricedStyles, 0);
        const orderedStyleCount = waves.reduce((sum, wave) => sum + wave.totalOrderedStyles, 0);

        return {
            plannedPurchaseAmount,
            orderedAmount,
            arrivedAmount,
            plannedStyleCount,
            developedStyleCount,
            pricedStyleCount,
            orderedStyleCount,
            developmentRate: plannedStyleCount > 0 ? developedStyleCount / plannedStyleCount : null,
            pricingRate: plannedStyleCount > 0 ? pricedStyleCount / plannedStyleCount : null,
            orderExecutionRate: plannedPurchaseAmount > 0 ? orderedAmount / plannedPurchaseAmount : null,
            arrivalExecutionRate: orderedAmount > 0 ? arrivedAmount / orderedAmount : null,
            riskCount: actions.length,
            p0Count: actions.filter(action => action.priority === 'P0').length,
            p1Count: actions.filter(action => action.priority === 'P1').length,
        };
    }, [waves, actions]);

    const upcomingDeadlines = useMemo(() => {
        const items: { wave: WavePlanRecord; type: '下单截止' | '入仓截止'; days: number; date: string }[] = [];
        wavePlans.forEach(plan => {
            if (plan.orderDeadline) {
                const days = diffDaysFromBusinessDate(plan.orderDeadline, businessDate);
                if (days >= -2 && days <= 14) items.push({ wave: plan, type: '下单截止', days, date: plan.orderDeadline });
            }
            if (plan.warehouseDeadline) {
                const days = diffDaysFromBusinessDate(plan.warehouseDeadline, businessDate);
                if (days >= -2 && days <= 14) items.push({ wave: plan, type: '入仓截止', days, date: plan.warehouseDeadline });
            }
        });
        return items.sort((a, b) => a.days - b.days);
    }, [wavePlans, businessDate]);

    const closedSellThroughRows = useMemo(() => {
        const rows: { row: typeof allRows[number]; target: number }[] = [];
        for (const row of allRows) {
            if (resolveExecTimeStatus(row.launchDate, businessDate) !== 'closed') continue;
            const plan = wavePlans.find(p => p.season === row.season && p.wave === row.wave);
            const target = row.sellThroughBenchmark ?? plan?.sellThroughTarget ?? 0.7;
            if (row.sellThroughRate !== undefined) rows.push({ row, target });
        }
        return rows.sort((a, b) => a.row.launchDate.localeCompare(b.row.launchDate));
    }, [allRows, wavePlans, businessDate]);

    const avgSellThrough = useMemo(() => {
        if (closedSellThroughRows.length === 0) return null;
        const sumWeighted = closedSellThroughRows.reduce((s, r) => s + (r.row.sellThroughRate ?? 0) * r.row.plannedPurchaseAmount, 0);
        const sumWeight = closedSellThroughRows.reduce((s, r) => s + r.row.plannedPurchaseAmount, 0);
        return sumWeight > 0 ? sumWeighted / sumWeight : null;
    }, [closedSellThroughRows]);

    const heatmap = useMemo(() => {
        const categorySet = new Set<string>();
        const cellMap = new Map<string, typeof allRows[number]>();
        for (const row of allRows) {
            categorySet.add(row.categoryLabel);
            cellMap.set(`${row.season}-${row.wave}::${row.categoryLabel}`, row);
        }
        return { categories: Array.from(categorySet), cellMap };
    }, [allRows]);

    const visibleActions = showAllActions ? actions : actions.slice(0, 6);
    const waveGroups = useMemo(() => (
        ['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => ({
            quarter,
            waves: waves.filter(wave => wave.quarterLabel === quarter),
        })).filter(group => group.waves.length > 0)
    ), [waves]);

    const fc = useCallback((v: number | null | undefined) => formatCurrency(v, currencyUnit), [currencyUnit]);

    const updateRecord = useCallback(<K extends keyof ExecutionTrackingInput>(
        id: string, field: K, value: ExecutionTrackingInput[K],
    ) => {
        const updater = (prev: ExecutionTrackingInput[]) =>
            prev.map(row => row.id === id ? { ...row, [field]: value } : row);
        if (onRecordsChange) onRecordsChange(updater(records));
        else setInternalRecords(updater);
    }, [onRecordsChange, records]);

    const scopedLedgerRows = useMemo(() => (
        selectedWave
            ? allRows.filter(r => `${r.season}-${r.wave}` === selectedWave)
            : allRows
    ), [allRows, selectedWave]);

    const ledgerRows = useMemo(() => {
        if (ledgerFilter === 'risk') return scopedLedgerRows.filter(r => r.milestoneRisks.length > 0 || r.orderRisk || r.arrivalRisk || r.developmentGap);
        if (ledgerFilter === 'current')  return scopedLedgerRows.filter(r => resolveExecTimeStatus(r.launchDate, businessDate) === 'current');
        if (ledgerFilter === 'planning') return scopedLedgerRows.filter(r => resolveExecTimeStatus(r.launchDate, businessDate) === 'planning');
        return scopedLedgerRows;
    }, [scopedLedgerRows, ledgerFilter, businessDate]);

    const openLedger = () => {
        setLedgerOpen(true);
        setTimeout(() => ledgerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    };

    const closedCount   = waves.filter(w => w.timeStatus === 'closed').length;
    const currentCount  = waves.filter(w => w.timeStatus === 'current').length;
    const planningCount = waves.filter(w => w.timeStatus === 'planning').length;

    return (
        <div className="space-y-4">

            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">采购执行与上市履约看板</span>
                <Divider />
                <span>业务日期 <strong className="text-slate-700">2026/05/09</strong></span>
                <Divider />
                <span>全年 <strong className="text-slate-700">{waves.length}</strong> 波段</span>
                <span className="ml-auto inline-flex items-center gap-3">
                    <WaveStatusDot color="bg-slate-400" label={`已上市 ${closedCount}`} />
                    <WaveStatusDot color="bg-sky-500" label={`执行中 ${currentCount}`} />
                    <WaveStatusDot color="bg-teal-500" label={`未来 ${planningCount}`} />
                    <button
                        type="button"
                        onClick={() => setHelpOpen(true)}
                        className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100 transition-colors"
                        aria-label="查看计算规则"
                        title="查看计算规则"
                    >
                        <span className="text-[11px] font-semibold">?</span>
                    </button>
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                <KpiCard label="计划采购额" value={fc(summary.plannedPurchaseAmount)} color="normal" />
                <KpiCard label="已下单"     value={fc(summary.orderedAmount)}          color="sky" />
                <KpiCard label="已到货"     value={fc(summary.arrivedAmount)}          color="emerald" />
                <KpiCard
                    label="下单执行率"
                    value={pct(summary.orderExecutionRate)}
                    color={summary.orderExecutionRate !== null && summary.orderExecutionRate < 0.80 ? 'danger' : 'normal'}
                />
                <KpiCard
                    label="到货执行率"
                    value={pct(summary.arrivalExecutionRate)}
                    color={summary.arrivalExecutionRate !== null && summary.arrivalExecutionRate < 0.70 ? 'danger' : 'normal'}
                />
                <KpiDualCard
                    label="开发 / 定价进度"
                    primary={pct(summary.developmentRate)}
                    secondary={pct(summary.pricingRate)}
                    primaryLabel="开发"
                    secondaryLabel="定价"
                    color={summary.developmentRate !== null && summary.developmentRate < 0.85 ? 'warn' : 'normal'}
                />
                <KpiCard
                    label="执行风险"
                    value={`${summary.riskCount} 项`}
                    sub={summary.p0Count > 0 ? `P0 ${summary.p0Count} · P1 ${summary.p1Count}` : `P1 ${summary.p1Count}`}
                    color={summary.p0Count > 0 ? 'danger' : summary.riskCount > 0 ? 'warn' : 'emerald'}
                />
            </div>

            {upcomingDeadlines.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-amber-700">即将到期节点</span>
                        <span className="text-[10px] text-amber-600">未来 14 天内 {upcomingDeadlines.length} 项关键截止日</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {upcomingDeadlines.map(d => (
                            <span
                                key={`${d.wave.id}-${d.type}`}
                                className={`text-[11px] rounded-full px-2.5 py-1 font-medium ${
                                    d.days < 0 ? 'bg-rose-600 text-white' :
                                    d.days <= 3 ? 'bg-rose-500 text-white' :
                                    d.days <= 7 ? 'bg-amber-500 text-white' :
                                    'bg-amber-100 text-amber-800'
                                }`}
                            >
                                {d.wave.season} {d.wave.wave} · {d.type} · {
                                    d.days < 0 ? `已过期 ${Math.abs(d.days)} 天` :
                                    d.days === 0 ? '今天到期' :
                                    `还有 ${d.days} 天`
                                } ({d.date})
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <section>
                <SectionHeader
                    title="风险行动队列"
                    subtitle={actions.length > 0
                        ? `${summary.p0Count} 紧急 · ${summary.p1Count} 重要 · ${actions.filter(a => a.priority === 'P2').length} 建议`
                        : '无风险行动项'
                    }
                />
                {actions.length === 0 ? (
                    <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-xs text-emerald-700">
                        ✓ 全部波段执行状态健康，暂无风险行动项
                    </div>
                ) : (
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {visibleActions.map(action => (
                            <ActionCard key={action.id} action={action} fc={fc} />
                        ))}
                        {actions.length > 6 && (
                            <button
                                type="button"
                                onClick={() => setShowAllActions(v => !v)}
                                className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4 text-xs text-slate-400 flex flex-col items-center justify-center gap-1 hover:bg-slate-100 transition-colors"
                            >
                                <span className="text-xl font-bold text-slate-300">{showAllActions ? '−' : `+${actions.length - 6}`}</span>
                                <span>{showAllActions ? '收起行动项' : '查看全部行动项'}</span>
                            </button>
                        )}
                    </div>
                )}
            </section>

            <section>
                <SectionHeader title="波段执行时间轴" subtitle="按 Q1-Q4 分组 · 灰=已上市 · 蓝=当前执行 · 绿=未来计划" />
                <div className="mt-2 space-y-2">
                    {waveGroups.map(group => (
                        <div key={group.quarter} className="rounded-xl border border-slate-100 bg-white shadow-sm p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-slate-700">{group.quarter}</span>
                                <span className="text-[10px] text-slate-400">{group.waves.length} 个波段</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {group.waves.map(wave => (
                                    <WaveCard
                                        key={wave.key}
                                        wave={wave}
                                        businessDate={businessDate}
                                        selected={selectedWave === wave.key}
                                        sellThroughRow={closedSellThroughRows.find(r => `${r.row.season}-${r.row.wave}` === wave.key)}
                                        fc={fc}
                                        onSelect={() => {
                                            setSelectedWave(wave.key === selectedWave ? null : wave.key);
                                            if (wave.key !== selectedWave) {
                                                setLedgerOpen(true);
                                                setLedgerFilter('all');
                                                setTimeout(() => ledgerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <SectionHeader
                    title="波段 × 品类执行热力图"
                    subtitle="点击单元格跳转台账明细 · 颜色基于该波段目标值动态判定"
                />
                <div className="mt-2 rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50">
                        <span className="text-[11px] text-slate-500 mr-1">显示指标</span>
                        {(
                            [
                                { key: 'arrival',     label: '到货率' },
                                { key: 'order',       label: '下单率' },
                                { key: 'development', label: '开发率' },
                                { key: 'sellThrough', label: '售罄率（已上市）' },
                            ] as const
                        ).map(opt => (
                            <button
                                key={opt.key}
                                type="button"
                                onClick={() => setHeatmapMetric(opt.key)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                                    heatmapMetric === opt.key
                                        ? 'bg-slate-700 text-white border-slate-700'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-max">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="px-3 py-2.5 text-left text-slate-400 font-medium whitespace-nowrap sticky left-0 bg-slate-50">波段</th>
                                    <th className="px-3 py-2.5 text-left text-slate-400 font-medium whitespace-nowrap">上市</th>
                                    {heatmap.categories.map(cat => (
                                        <th key={cat} className="px-3 py-2.5 text-center text-slate-400 font-medium whitespace-nowrap">{cat}</th>
                                    ))}
                                    <th className="px-3 py-2.5 text-center text-slate-400 font-medium whitespace-nowrap">汇总</th>
                                </tr>
                            </thead>
                            <tbody>
                                {waves.map(wave => {
                                    const waveTarget = (() => {
                                        if (heatmapMetric === 'sellThrough') return wave.plan?.sellThroughTarget ?? 0.75;
                                        if (heatmapMetric === 'arrival')     return wave.plan?.arrivalRateTarget ?? 0.80;
                                        return 0.85;
                                    })();
                                    const waveAggregate: number | null = (() => {
                                        if (heatmapMetric === 'sellThrough') {
                                            if (wave.timeStatus !== 'closed') return null;
                                            const closedRows = allRows.filter(r => r.season === wave.season && r.wave === wave.wave && r.sellThroughRate !== undefined);
                                            if (closedRows.length === 0) return null;
                                            const sumW = closedRows.reduce((s, r) => s + (r.sellThroughRate ?? 0) * r.plannedPurchaseAmount, 0);
                                            const sumA = closedRows.reduce((s, r) => s + r.plannedPurchaseAmount, 0);
                                            return sumA > 0 ? sumW / sumA : null;
                                        }
                                        if (heatmapMetric === 'arrival')     return wave.arrivalRate;
                                        if (heatmapMetric === 'order')       return wave.orderRate;
                                        return wave.devRate;
                                    })();
                                    const style = TIME_STATUS_STYLE[wave.timeStatus];
                                    return (
                                        <tr key={wave.key} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                                            <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap sticky left-0 bg-white">
                                                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${style.dot}`} />
                                                {wave.season} {wave.wave}
                                            </td>
                                            <td className="px-3 py-2 text-[11px] text-slate-500 whitespace-nowrap">{wave.launchDate}</td>
                                            {heatmap.categories.map(cat => {
                                                const cell = heatmap.cellMap.get(`${wave.key}::${cat}`);
                                                if (!cell) {
                                                    return <td key={cat} className="px-3 py-2 text-center text-slate-300 text-xs bg-slate-50/40">·</td>;
                                                }
                                                const value: number | null = (() => {
                                                    if (heatmapMetric === 'sellThrough') return cell.sellThroughRate ?? null;
                                                    if (heatmapMetric === 'arrival')     return cell.orderedAmount > 0 ? cell.arrivedAmount / cell.orderedAmount : null;
                                                    if (heatmapMetric === 'order')       return cell.plannedPurchaseAmount > 0 ? cell.orderedAmount / cell.plannedPurchaseAmount : null;
                                                    return cell.plannedStyleCount > 0 ? cell.developedStyleCount / cell.plannedStyleCount : null;
                                                })();
                                                const target = (() => {
                                                    if (heatmapMetric === 'sellThrough') return cell.sellThroughBenchmark ?? wave.plan?.sellThroughTarget ?? 0.75;
                                                    if (heatmapMetric === 'arrival')     return wave.plan?.arrivalRateTarget ?? 0.80;
                                                    return 0.85;
                                                })();
                                                if (value === null) {
                                                    return <td key={cat} className="px-3 py-2 text-center text-slate-300 text-[11px]">—</td>;
                                                }
                                                return (
                                                    <td
                                                        key={cat}
                                                        onClick={() => { openLedger(); setSelectedWave(wave.key); }}
                                                        className={`px-3 py-2 text-center text-xs cursor-pointer hover:opacity-80 ${rateBgAgainst(value, target)}`}
                                                        title={`目标 ${pct(target)} · 实际 ${pct(value)}`}
                                                    >
                                                        {pct(value)}
                                                    </td>
                                                );
                                            })}
                                            <td className={`px-3 py-2 text-center text-xs font-semibold ${rateColorAgainst(waveAggregate, waveTarget)}`}>
                                                {waveAggregate === null ? (wave.isMissingExecution ? '待计划' : '—') : pct(waveAggregate)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[10px] text-slate-400 px-4 py-2 bg-slate-50/40 border-t border-slate-100">
                        颜色判定：实际值 ≥ 目标 → 绿；≥ 目标 × 85% → 黄；&lt; 目标 × 85% → 红。&quot;·&quot; 表示该品类在此波段无计划，&quot;—&quot; 表示尚无数据。
                    </p>
                </div>
            </section>

            {closedSellThroughRows.length > 0 && (
                <section>
                    <SectionHeader
                        title="已上市波段售罄率复盘"
                        subtitle={`${closedSellThroughRows.length} 条品类记录 · 加权均值 ${avgSellThrough !== null ? pct(avgSellThrough) : '—'}`}
                    />
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {closedSellThroughRows.map(({ row, target }) => {
                            const rate = row.sellThroughRate ?? 0;
                            const ratio = target > 0 ? rate / target : 0;
                            const status = ratio >= 1 ? 'good' : ratio >= 0.85 ? 'warn' : 'bad';
                            const styleByStatus = {
                                good: 'border-emerald-200 bg-emerald-50',
                                warn: 'border-amber-200 bg-amber-50',
                                bad:  'border-rose-200 bg-rose-50',
                            }[status];
                            const textByStatus = {
                                good: 'text-emerald-700',
                                warn: 'text-amber-700',
                                bad:  'text-rose-700',
                            }[status];
                            return (
                                <div key={row.id} className={`rounded-lg border p-3 ${styleByStatus}`}>
                                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                                        <span className="font-semibold text-slate-800 text-xs">
                                            {row.season} {row.wave} · {row.categoryLabel}
                                        </span>
                                        {row.reorderTriggered && (
                                            <span className="text-[9px] rounded-full bg-emerald-600 text-white px-1.5 py-0.5 font-medium">已触发翻单</span>
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-2 mb-1.5">
                                        <span className={`text-xl font-bold ${textByStatus}`}>{pct(rate)}</span>
                                        <span className="text-[10px] text-slate-500">vs 目标 {pct(target)}</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-white/60 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${
                                                status === 'good' ? 'bg-emerald-500' :
                                                status === 'warn' ? 'bg-amber-500' :
                                                'bg-rose-500'
                                            }`}
                                            style={{ width: `${Math.min(100, rate * 100)}%` }}
                                        />
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1.5">
                                        采购 {fc(row.plannedPurchaseAmount)} · 上市 {row.launchDate}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            <div ref={ledgerRef}>
                <CollapsibleSection
                    title="执行台账"
                    subtitle="默认折叠 · 蓝底可编辑 · 支持多维筛选"
                    open={ledgerOpen}
                    onToggle={() => setLedgerOpen(v => !v)}
                >
                    <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-slate-100">
                        {selectedWave && (
                            <button
                                type="button"
                                onClick={() => setSelectedWave(null)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-all"
                            >
                                聚焦波段 {selectedWave} ×
                            </button>
                        )}
                        {(
                            [
                                { key: 'all',      label: `全部 (${scopedLedgerRows.length})` },
                                { key: 'current',  label: `当前执行 (${scopedLedgerRows.filter(r => resolveExecTimeStatus(r.launchDate, businessDate) === 'current').length})` },
                                { key: 'planning', label: `未来计划 (${scopedLedgerRows.filter(r => resolveExecTimeStatus(r.launchDate, businessDate) === 'planning').length})` },
                                { key: 'risk',     label: `仅风险行` },
                            ] as const
                        ).map(item => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setLedgerFilter(item.key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                    ledgerFilter === item.key
                                        ? 'bg-slate-700 text-white border-slate-700'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-max text-xs w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 text-[11px]">
                                    <th className="py-2 px-3 text-left font-medium sticky left-0 bg-slate-50">季节/波段</th>
                                    <th className="py-2 px-3 text-left font-medium sticky left-20 bg-slate-50">品类</th>
                                    <th className="py-2 px-3 text-left font-medium sticky left-36 bg-slate-50">状态</th>
                                    <th className="py-2 px-3 text-right font-medium">计划款</th>
                                    <th className="py-2 px-3 text-right font-medium">已开发</th>
                                    <th className="py-2 px-3 text-right font-medium">已定价</th>
                                    <th className="py-2 px-3 text-right font-medium">已下单款</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">计划采购额</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">实际下单额</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">已到货额</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">下单执行率</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">到货执行率</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">售罄率</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">下单截止</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">入仓截止</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">毛利</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">上市日期</th>
                                    <th className="py-2 px-3 text-right font-medium whitespace-nowrap">距上市</th>
                                    <th className="py-2 px-3 text-right font-medium">节点风险</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledgerRows.map(row => {
                                    const hasRisk  = row.milestoneRisks.length > 0 || row.orderRisk || row.arrivalRisk;
                                    const berRate  = row.budgetExecutionRate  ?? 0;
                                    const aerRate  = row.arrivalExecutionRate ?? 0;
                                    const cfg      = STATUS_CONFIG[row.status] ?? { bg: 'bg-slate-100', text: 'text-slate-500' };
                                    const stRate   = row.sellThroughRate;
                                    const stTarget = row.sellThroughBenchmark ?? wavePlans.find(p => p.season === row.season && p.wave === row.wave)?.sellThroughTarget ?? 0.75;
                                    const targetMargin = row.targetGrossMargin ?? 0.45;
                                    const actualMargin = row.actualGrossMargin ?? targetMargin;
                                    return (
                                        <tr key={row.id} className={`border-b border-slate-50 hover:bg-slate-50/50 ${hasRisk ? 'bg-rose-50/20' : ''}`}>
                                            <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap sticky left-0 bg-white/90">
                                                {row.season} {row.wave}
                                            </td>
                                            <td className="py-2 px-3 text-slate-600 whitespace-nowrap sticky left-20 bg-white/90">
                                                {row.categoryLabel}
                                            </td>
                                            <td className="py-2 px-3 sticky left-36 bg-white/90">
                                                <select
                                                    value={records.find(r => r.id === row.id)?.status ?? row.status}
                                                    onChange={e => updateRecord(row.id, 'status', e.target.value as ExecutionStatus)}
                                                    className={`text-[10px] rounded-full px-2 py-0.5 border border-transparent font-medium ${cfg.bg} ${cfg.text}`}
                                                >
                                                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </td>
                                            <td className="py-1.5 px-2"><EditNum value={row.plannedStyleCount} onChange={v => updateRecord(row.id, 'plannedStyleCount', Math.max(0, Math.round(v)))} /></td>
                                            <td className={`py-1.5 px-2 ${row.developmentGap ? 'bg-amber-50/40' : ''}`}><EditNum value={row.developedStyleCount} onChange={v => updateRecord(row.id, 'developedStyleCount', Math.max(0, Math.round(v)))} /></td>
                                            <td className="py-1.5 px-2"><EditNum value={row.pricedStyleCount} onChange={v => updateRecord(row.id, 'pricedStyleCount', Math.max(0, Math.round(v)))} /></td>
                                            <td className={`py-1.5 px-2 ${row.orderNodeRisk ? 'bg-rose-50/40' : ''}`}><EditNum value={row.orderedStyleCount} onChange={v => updateRecord(row.id, 'orderedStyleCount', Math.max(0, Math.round(v)))} /></td>
                                            <td className="py-1.5 px-2"><EditNum value={row.plannedPurchaseAmount} step={100000} onChange={v => updateRecord(row.id, 'plannedPurchaseAmount', v)} /></td>
                                            <td className="py-1.5 px-2"><EditNum value={row.orderedAmount}         step={100000} onChange={v => updateRecord(row.id, 'orderedAmount', v)} /></td>
                                            <td className={`py-1.5 px-2 ${row.warehouseNodeRisk ? 'bg-rose-50/40' : ''}`}><EditNum value={row.arrivedAmount} step={100000} onChange={v => updateRecord(row.id, 'arrivedAmount', v)} /></td>
                                            <td className={`py-2 px-3 text-right font-medium ${berRate >= 0.90 ? 'text-emerald-600' : berRate >= 0.80 ? 'text-slate-600' : berRate > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                {row.budgetExecutionRate !== null ? formatPct(row.budgetExecutionRate) : '—'}
                                            </td>
                                            <td className={`py-2 px-3 text-right font-medium ${aerRate >= 0.90 ? 'text-emerald-600' : aerRate >= 0.70 ? 'text-slate-600' : aerRate > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                {row.arrivalExecutionRate !== null ? formatPct(row.arrivalExecutionRate) : '—'}
                                            </td>
                                            <td className="py-1.5 px-2 text-right">
                                                {stRate !== undefined ? (
                                                    <span className={`text-xs font-medium ${rateColorAgainst(stRate, stTarget)}`}>{pct(stRate)}</span>
                                                ) : resolveExecTimeStatus(row.launchDate, businessDate) === 'closed' ? (
                                                    <input
                                                        type="number"
                                                        step={0.01}
                                                        min={0}
                                                        max={1}
                                                        placeholder="—"
                                                        onChange={e => updateRecord(row.id, 'sellThroughRate', parseFloat(e.target.value) || 0)}
                                                        className="w-16 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none"
                                                    />
                                                ) : (
                                                    <span className="text-slate-300 text-[11px]">—</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-right text-[11px] text-slate-500 whitespace-nowrap">
                                                {row.orderDueDate || '—'}
                                            </td>
                                            <td className="py-2 px-3 text-right text-[11px] text-slate-500 whitespace-nowrap">
                                                {row.warehouseDueDate || '—'}
                                            </td>
                                            <td className={`py-2 px-3 text-right text-[11px] font-medium whitespace-nowrap ${actualMargin >= targetMargin ? 'text-emerald-600' : actualMargin >= targetMargin * 0.9 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                {pct(actualMargin)}<span className="text-slate-400 font-normal"> / {pct(targetMargin)}</span>
                                            </td>
                                            <td className="py-2 px-3 text-right text-slate-500 whitespace-nowrap">
                                                <input
                                                    type="date"
                                                    value={row.launchDate}
                                                    onChange={e => updateRecord(row.id, 'launchDate', e.target.value)}
                                                    className="text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5 focus:outline-none"
                                                />
                                            </td>
                                            <td className={`py-2 px-3 text-right whitespace-nowrap ${
                                                row.daysToLaunch < 0 ? 'text-slate-400' :
                                                row.daysToLaunch < 15 ? 'text-rose-600 font-medium' :
                                                row.daysToLaunch < 30 ? 'text-amber-600' : 'text-slate-600'
                                            }`}>
                                                {row.daysToLaunch < 0 ? `已过 ${Math.abs(row.daysToLaunch)}天` : `${row.daysToLaunch}天`}
                                            </td>
                                            <td className="py-2 px-3 text-right whitespace-nowrap">
                                                {row.milestoneRisks.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 justify-end">
                                                        {row.milestoneRisks.slice(0, 2).map(risk => (
                                                            <span key={risk} className="bg-rose-100 text-rose-600 text-[9px] px-1.5 py-0.5 rounded-full">{risk}</span>
                                                        ))}
                                                        {row.milestoneRisks.length > 2 && (
                                                            <span className="text-rose-400 text-[9px]">+{row.milestoneRisks.length - 2}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-emerald-600 text-[10px]">正常</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-sky-50 text-xs border-t border-sky-100 font-semibold">
                                    <td className="py-2.5 px-3 text-slate-700" colSpan={3}>合计</td>
                                    <td className="py-2.5 px-3 text-right">{ledgerRows.reduce((s, r) => s + r.plannedStyleCount, 0)}</td>
                                    <td className="py-2.5 px-3 text-right">{ledgerRows.reduce((s, r) => s + r.developedStyleCount, 0)}</td>
                                    <td className="py-2.5 px-3 text-right">{ledgerRows.reduce((s, r) => s + r.pricedStyleCount, 0)}</td>
                                    <td className="py-2.5 px-3 text-right">{ledgerRows.reduce((s, r) => s + r.orderedStyleCount, 0)}</td>
                                    <td className="py-2.5 px-3 text-right">{fc(ledgerRows.reduce((s, r) => s + r.plannedPurchaseAmount, 0))}</td>
                                    <td className="py-2.5 px-3 text-right text-sky-700">{fc(ledgerRows.reduce((s, r) => s + r.orderedAmount, 0))}</td>
                                    <td className="py-2.5 px-3 text-right text-emerald-700">{fc(ledgerRows.reduce((s, r) => s + r.arrivedAmount, 0))}</td>
                                    <td colSpan={9} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    {ledgerRows.length === 0 && (
                        <div className="flex items-center justify-center h-14 text-sm text-slate-400">暂无符合条件的记录</div>
                    )}
                </CollapsibleSection>
            </div>

            {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

        </div>
    );
}

function Divider() {
    return <span className="text-slate-300 select-none" aria-hidden="true">|</span>;
}

function WaveStatusDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
            <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
            {label}
        </span>
    );
}

function KpiCard({ label, value, sub, color }: {
    label: string;
    value: string;
    sub?: string;
    color: 'normal' | 'sky' | 'emerald' | 'warn' | 'danger';
}) {
    const colorMap: Record<typeof color, string> = {
        normal:  'text-slate-800',
        sky:     'text-sky-700',
        emerald: 'text-emerald-600',
        warn:    'text-amber-600',
        danger:  'text-rose-600',
    };
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-400 leading-snug">{label}</p>
            <p className={`text-base font-bold mt-0.5 ${colorMap[color]}`}>{value}</p>
            {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
    );
}

function KpiDualCard({ label, primary, secondary, primaryLabel, secondaryLabel, color }: {
    label: string;
    primary: string;
    secondary: string;
    primaryLabel: string;
    secondaryLabel: string;
    color: 'normal' | 'warn' | 'danger';
}) {
    const colorMap: Record<typeof color, string> = {
        normal: 'text-slate-800',
        warn:   'text-amber-600',
        danger: 'text-rose-600',
    };
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-400 leading-snug">{label}</p>
            <div className="flex items-baseline gap-2 mt-0.5">
                <span className={`text-base font-bold ${colorMap[color]}`}>{primary}</span>
                <span className="text-[10px] text-slate-400">{primaryLabel}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-sm font-semibold text-slate-600">{secondary}</span>
                <span className="text-[10px] text-slate-400">{secondaryLabel}</span>
            </div>
        </div>
    );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
            {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
        </div>
    );
}

function ActionCard({ action, fc }: { action: ExecDiagnosis; fc: (v: number) => string }) {
    return (
        <div className={`rounded-lg border p-3 text-xs ${PRIORITY_CARD[action.priority] ?? 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-start gap-2 mb-1.5">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${PRIORITY_BADGE[action.priority]}`}>
                    {action.priority}
                </span>
                <span className="font-semibold text-slate-800 leading-snug text-[11px]">
                    {action.season} {action.wave} · {action.categoryLabel}
                    {action.productRoleName && <span className="ml-1 text-slate-500">· {action.productRoleName}</span>}
                </span>
            </div>
            <p className="text-slate-600 leading-snug mb-1.5">{action.issue}</p>
            {action.impactAmount > 0 && (
                <p className="text-slate-500 text-[11px] mb-1">影响金额 <strong>{fc(action.impactAmount)}</strong> · 上市 {action.impactLaunchDate}</p>
            )}
            <div className="flex items-start gap-1 mt-1.5 pt-1.5 border-t border-black/5 text-[11px] text-slate-500">
                <span className="font-medium text-slate-700 shrink-0">建议：</span>
                <span>{action.action}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">责任：{action.owner}</div>
        </div>
    );
}

function WaveCard({
    wave, businessDate, selected, sellThroughRow, fc, onSelect,
}: {
    wave: WaveViewModel;
    businessDate: Date;
    selected: boolean;
    sellThroughRow?: { row: { sellThroughRate?: number; sellThroughBenchmark?: number; reorderTriggered?: boolean }; target: number };
    fc: (v: number) => string;
    onSelect: () => void;
}) {
    const style = TIME_STATUS_STYLE[wave.timeStatus];
    const hasRisk = wave.riskCount > 0;
    const plan = wave.plan;
    const isClosed = wave.timeStatus === 'closed';

    const arrivalTarget = plan?.arrivalRateTarget ?? 0.80;
    const orderTarget   = 0.85;
    const devTarget     = 0.90;

    const orderDeadlineDays = plan?.orderDeadline ? diffDaysFromBusinessDate(plan.orderDeadline, businessDate) : null;
    const warehouseDeadlineDays = plan?.warehouseDeadline ? diffDaysFromBusinessDate(plan.warehouseDeadline, businessDate) : null;

    const stages = [
        { label: '开发', rate: wave.devRate,     target: devTarget   },
        { label: '定价', rate: wave.pricingRate, target: devTarget   },
        { label: '下单', rate: wave.orderRate,   target: orderTarget },
        { label: '到货', rate: wave.arrivalRate, target: arrivalTarget },
    ];

    return (
        <div
            onClick={onSelect}
            className={`rounded-lg border p-3 cursor-pointer transition-all ${style.card} ${selected ? 'ring-2 ring-sky-400' : ''} ${hasRisk ? 'border-rose-300' : ''}`}
        >
            <div className="flex items-center gap-1.5 mb-1">
                <span className={`inline-block w-2 h-2 rounded-full ${style.dot}`} />
                <span className={`text-[10px] font-semibold ${style.text}`}>{style.label}</span>
                {wave.isMissingExecution && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">待计划</span>
                )}
                {hasRisk && <span className="ml-auto text-[10px] text-rose-500 font-bold">⚠{wave.riskCount}</span>}
            </div>

            <div className="flex items-baseline gap-2">
                <span className="font-bold text-slate-800 text-sm">{wave.season} {wave.wave}</span>
                <span className="text-[10px] text-slate-500">{wave.launchDate}</span>
            </div>
            <div className={`text-[10px] mt-0.5 font-medium ${wave.daysToLaunch < 0 ? 'text-slate-400' : wave.daysToLaunch < 30 ? 'text-rose-500' : 'text-slate-500'}`}>
                {wave.daysToLaunch < 0 ? `已上市 ${Math.abs(wave.daysToLaunch)}天` : `上市还有 ${wave.daysToLaunch}天`}
            </div>

            {plan && (
                <div className="mt-1.5 pt-1.5 border-t border-black/5 text-[10px] text-slate-500 space-y-0.5">
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <span><span className="text-slate-400">品类</span> {plan.mainCategory ?? '全品类'}</span>
                        {plan.priceBandFocus && plan.priceBandFocus.length > 0 && (
                            <span><span className="text-slate-400">价位</span> {plan.priceBandFocus.map(b => PRICE_BAND_LABEL[b] ?? b).join('/')}</span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <span>{plan.plannedStyleCount ?? 0}款 × {plan.targetColorCount ?? '?'}配色</span>
                        {plan.targetSkuCount && <span>= {plan.targetSkuCount} SKU</span>}
                        {plan.averageDepth && <span><span className="text-slate-400">深度</span> {plan.averageDepth}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <span><span className="text-slate-400">采购</span> {fc(wave.totalPPA)}</span>
                        {plan.sellThroughTarget && <span><span className="text-slate-400">目标售罄</span> {pct(plan.sellThroughTarget)}</span>}
                    </div>
                </div>
            )}

            <div className="mt-2 space-y-1">
                {stages.map(({ label, rate, target }) => (
                    <div key={label} className="flex items-center gap-1.5 text-[10px]">
                        <span className="w-7 text-slate-400 shrink-0">{label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${progressFillColor(rate, target)}`}
                                style={{ width: rate !== null ? `${Math.min(100, rate * 100)}%` : '0%' }}
                            />
                        </div>
                        <span className={`w-9 text-right font-medium ${rateColorAgainst(rate, target)}`}>
                            {wave.isMissingExecution ? '—' : pct(rate)}
                        </span>
                    </div>
                ))}
            </div>

            {isClosed && sellThroughRow && sellThroughRow.row.sellThroughRate !== undefined && (
                <div className="mt-2 pt-1.5 border-t border-black/5">
                    <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-slate-400">售罄率</span>
                        <span className={`font-semibold ${rateColorAgainst(sellThroughRow.row.sellThroughRate ?? null, sellThroughRow.target)}`}>
                            {pct(sellThroughRow.row.sellThroughRate)} <span className="text-slate-400 font-normal">/ {pct(sellThroughRow.target)}</span>
                        </span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${progressFillColor(sellThroughRow.row.sellThroughRate ?? null, sellThroughRow.target)}`}
                            style={{ width: `${Math.min(100, (sellThroughRow.row.sellThroughRate ?? 0) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {!isClosed && plan && (plan.orderDeadline || plan.warehouseDeadline) && (
                <div className="mt-2 pt-1.5 border-t border-black/5 text-[10px] text-slate-500 space-y-0.5">
                    {plan.orderDeadline && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">下单截止</span>
                            <span className={
                                orderDeadlineDays !== null && orderDeadlineDays < 0 ? 'text-rose-500 font-bold' :
                                orderDeadlineDays !== null && orderDeadlineDays <= 7 ? 'text-rose-500 font-bold' :
                                orderDeadlineDays !== null && orderDeadlineDays <= 14 ? 'text-amber-600 font-semibold' :
                                ''
                            }>
                                {plan.orderDeadline}
                                {orderDeadlineDays !== null && orderDeadlineDays < 0 && ` (已过)`}
                                {orderDeadlineDays !== null && orderDeadlineDays >= 0 && orderDeadlineDays <= 14 && ` (${orderDeadlineDays}天)`}
                            </span>
                        </div>
                    )}
                    {plan.warehouseDeadline && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">入仓截止</span>
                            <span className={
                                warehouseDeadlineDays !== null && warehouseDeadlineDays < 0 ? 'text-rose-500 font-bold' :
                                warehouseDeadlineDays !== null && warehouseDeadlineDays <= 7 ? 'text-rose-500 font-bold' :
                                warehouseDeadlineDays !== null && warehouseDeadlineDays <= 14 ? 'text-amber-600 font-semibold' :
                                ''
                            }>
                                {plan.warehouseDeadline}
                                {warehouseDeadlineDays !== null && warehouseDeadlineDays < 0 && ` (已过)`}
                                {warehouseDeadlineDays !== null && warehouseDeadlineDays >= 0 && warehouseDeadlineDays <= 14 && ` (${warehouseDeadlineDays}天)`}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {plan?.arrivalSuggestion && !wave.isMissingExecution && (
                <p className="mt-1.5 text-[9px] text-slate-400 italic leading-snug">{plan.arrivalSuggestion}</p>
            )}
        </div>
    );
}

function EditNum({ value, step = 1, onChange }: {
    value: number;
    step?: number;
    onChange: (v: number) => void;
}) {
    return (
        <input
            type="number"
            value={value}
            step={step}
            min={0}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className="w-20 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none focus:border-sky-400"
        />
    );
}

function CollapsibleSection({ title, subtitle, open, onToggle, children }: {
    title: string;
    subtitle?: string;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    return (
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm text-slate-700">{title}</span>
                    {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
                </div>
                <svg
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && <div className="border-t border-slate-100">{children}</div>}
        </div>
    );
}

function HelpModal({ onClose }: { onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-[90%] max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-base font-semibold text-slate-800">计算规则与字段说明</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
                        aria-label="关闭"
                    >
                        ×
                    </button>
                </div>
                <div className="px-6 py-4 text-xs text-slate-600 space-y-2 leading-relaxed">
                    <h4 className="font-semibold text-slate-700 text-sm pt-1">执行率公式</h4>
                    <p>• <strong>下单执行率</strong> = 实际下单额 ÷ 计划采购额</p>
                    <p>• <strong>到货执行率</strong> = 已到货额 ÷ 实际下单额</p>
                    <p>• <strong>开发完成率</strong> = 已开发款数 ÷ 计划款数</p>
                    <p>• <strong>定价完成率</strong> = 已定价款数 ÷ 计划款数</p>
                    <p>• <strong>售罄率</strong> = 已售出件数 ÷ 总到货件数（已上市波段录入）</p>

                    <h4 className="font-semibold text-slate-700 text-sm pt-2">时间状态</h4>
                    <p>• <strong>已上市</strong>：上市日期 &lt; 业务日期（2026-05-09）</p>
                    <p>• <strong>当前执行</strong>：上市日期距今 ≤ 120 天</p>
                    <p>• <strong>未来计划</strong>：上市日期距今 &gt; 120 天</p>

                    <h4 className="font-semibold text-slate-700 text-sm pt-2">关键截止节点</h4>
                    <p>• 设计开发截止 = 上市前 120 天</p>
                    <p>• 核价截止 = 上市前 80 天</p>
                    <p>• 下单截止 = 上市前 75 天（实际值以波段计划录入为准）</p>
                    <p>• 入仓截止 = 上市前 15 天（实际值以波段计划录入为准）</p>

                    <h4 className="font-semibold text-slate-700 text-sm pt-2">配色判定（动态阈值）</h4>
                    <p>• 绿色：实际值 ≥ 该波段目标值</p>
                    <p>• 黄色：实际值 ≥ 目标值 × 85%</p>
                    <p>• 红色：实际值 &lt; 目标值 × 85%</p>
                    <p className="text-slate-400 pt-1">注：目标值（如到货率、售罄率）来自波段计划，每波段独立设定。</p>

                    <h4 className="font-semibold text-slate-700 text-sm pt-2">交互</h4>
                    <p>• 蓝底单元格为可编辑输入字段</p>
                    <p>• 执行率/售罄率配色为自动计算只读字段</p>
                    <p>• 点击波段卡片或热力图单元格可跳转执行台账并自动聚焦</p>
                </div>
            </div>
        </div>
    );
}
