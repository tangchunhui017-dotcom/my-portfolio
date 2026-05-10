'use client';

import { useCallback, useMemo, useState } from 'react';

import { getDashboardMonthByWave } from '@/config/dashboardTime';
import { useOtbVirtualSalesLoop } from '@/hooks/useOtbVirtualSalesLoop';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import {
    formatCurrency,
    formatPct,
    safeNumber,
    type CurrencyUnit,
    type MonthlyOTBInput,
    type MonthlyRollingState,
} from '@/utils/otbCalculations';
import {
    calcMonthlyRollingOTB,
    calcMonthlyAchievementProgress,
    calcCashflowTimeline,
    compareThreeScenarios,
    reviewLastMonthActions,
    monthlyRollingRiskTypeLabel,
    type MonthStatus,
    type MonthlyAction,
    type MonthlyRollingAction,
    type MonthlyRollingRisk,
    type MonthlyRollingRow,
    type ExecutedAction,
    type MonthlyRollingCalcResult,
} from '@/utils/otbMonthlyRolling';

interface Props {
    currencyUnit: CurrencyUnit;
    filters: DashboardFilters;
    isLocked?: boolean;
    versionStatus?: string;
    versionName?: string;
    onScenarioSave?: (scenario: PlanScenario, snapshot: unknown) => void;
    isLockedScenario?: boolean;
    executedActionsByMonth?: Record<number, ExecutedAction[]>;
    factSalesByMonth?: Record<number, number>;
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

type PlanScenario = 'standard' | 'conservative' | 'optimistic';

const SCENARIOS: { key: PlanScenario; label: string }[] = [
    { key: 'standard', label: '标准版' },
    { key: 'conservative', label: '保守版' },
    { key: 'optimistic', label: '乐观版' },
];

const EDITABLE_VERSION_STATUS = new Set(['draft', 'rolling_adjustment']);

function toSafeCurrency(value: number | null | undefined, unit: CurrencyUnit) {
    const n = safeNumber(value);
    if (n === null) return '--';
    return formatCurrency(n, unit);
}

function formatPurchaseNeed(value: number | null | undefined, unit: CurrencyUnit) {
    const n = safeNumber(value);
    if (n === null) return '--';
    if (n <= 0) return `无需新增 · 可释放 ${toSafeCurrency(Math.abs(n), unit)}`;
    return toSafeCurrency(n, unit);
}

function primaryRiskMap(risks: MonthlyRollingRisk[]) {
    const map = new Map<number, MonthlyRollingRisk>();
    risks.forEach((risk) => {
        if (!map.has(risk.month)) map.set(risk.month, risk);
    });
    return map;
}

function resolveCurrentMonth(filters: DashboardFilters) {
    const explicitMonth = Number((filters as DashboardFilters & { month?: number | string }).month);
    if (Number.isFinite(explicitMonth) && explicitMonth >= 1 && explicitMonth <= 12) {
        return Math.round(explicitMonth);
    }
    return getDashboardMonthByWave(filters.wave) ?? new Date().getMonth() + 1;
}

function statusTag(status: MonthStatus) {
    if (status === 'actual') {
        return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600">已锁定</span>;
    }
    if (status === 'current') {
        return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-sky-100 text-sky-700">当前月</span>;
    }
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-50 text-slate-500">预测月</span>;
}

function riskBadge(level: MonthlyRollingRisk['level'], title: string) {
    const tone =
        level === 'danger'
            ? 'bg-rose-50 text-rose-700 border-rose-100'
            : level === 'warning'
              ? 'bg-amber-50 text-amber-700 border-amber-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-100';
    return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone}`}>{title}</span>;
}

function actionLabel(action: MonthlyAction) {
    const map: Record<MonthlyAction, string> = {
        补货: '补货',
        减单: '减单',
        暂停采购: '暂停采购',
        调拨: '调拨',
        清货: '清货',
        转奥莱: '转奥莱',
        追加预算: '追加预算',
        延后付款: '延后付款',
    };
    return map[action];
}

function NumberInputCell({
    value,
    disabled,
    step,
    min,
    onChange,
    showManual,
    currencyDisplay,
}: {
    value: number;
    disabled: boolean;
    step: number;
    min?: number;
    onChange: (v: number) => void;
    showManual?: boolean;
    /** 当设置时，输入框按该单位显示并换算（wan = 万元 / yi = 亿元） */
    currencyDisplay?: CurrencyUnit;
}) {
    // 按 currencyDisplay 换算输入框显示值与 step
    const divisor = currencyDisplay === 'wan' ? 10000 : currencyDisplay === 'yi' ? 100000000 : 1;
    const unitLabel = currencyDisplay === 'wan' ? '万' : currencyDisplay === 'yi' ? '亿' : null;
    const displayValue = Number.isFinite(value) ? value / divisor : 0;
    const displayStep = step / divisor;
    const inputWidth = currencyDisplay ? 'w-14' : 'w-[84px]';
    return (
        <div className="flex items-center justify-end gap-0.5">
            {unitLabel && <span className="text-[10px] text-slate-400 leading-none">¥</span>}
            <input
                type="number"
                value={Number(displayValue.toFixed(currencyDisplay ? 1 : 0))}
                step={displayStep}
                min={min !== undefined ? min / divisor : undefined}
                disabled={disabled}
                onChange={(e) => onChange((parseFloat(e.target.value) || 0) * divisor)}
                className={`${inputWidth} text-right text-[11px] font-medium rounded px-1 py-1 focus:outline-none transition-colors ${
                    disabled
                        ? 'bg-transparent text-slate-500 cursor-default'
                        : 'bg-sky-50/50 border border-sky-200/50 text-slate-700 hover:bg-sky-50 focus:bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400'
                }`}
            />
            {unitLabel && <span className="text-[10px] text-slate-400 leading-none">{unitLabel}</span>}
            {showManual ? <span className="text-[10px] text-sky-600 ml-0.5">手动</span> : null}
        </div>
    );
}

function KPICard({ label, value, sub, tone = 'default' }: { label: string; value: string; sub?: string; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
    const subTone = tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : tone === 'danger' ? 'text-rose-600' : 'text-slate-400';
    return (
        <div className="px-4 py-3.5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-slate-800 mt-1 leading-snug">{value}</p>
            {sub ? <p className={`text-[10px] mt-0.5 ${subTone}`}>{sub}</p> : null}
        </div>
    );
}

function MonthlyRollingDecisionSummary({
    rows,
    summary,
    risks,
    actions,
    currentMonth,
    isReadonly,
    currencyUnit,
    versionName,
    factSalesByMonth,
}: {
    rows: MonthlyRollingRow[];
    summary: ReturnType<typeof calcMonthlyRollingOTB>['summary'];
    risks: MonthlyRollingRisk[];
    actions: MonthlyRollingAction[];
    currentMonth: number;
    isReadonly: boolean;
    currencyUnit: CurrencyUnit;
    versionName?: string;
    factSalesByMonth?: Record<number, number>;
}) {
    const maxPurchase = rows.find((row) => row.month === summary.maxPurchasePressureMonth);
    const maxInventory = rows.find((row) => row.month === summary.maxInventoryRiskMonth);

    // Cumulative achievement rate (1 to currentMonth-1 actual months)
    const actualRows = rows.filter((r) => r.monthStatus === 'actual');
    const cumulativePlan = actualRows.reduce((s, r) => s + r.originalPlanSales, 0);
    const cumulativeActual = actualRows.reduce((s, r) => {
        const fact = factSalesByMonth?.[r.month - 1];
        return s + (typeof fact === 'number' ? fact : r.salesForecast);
    }, 0);
    const cumAchRate = cumulativePlan > 0 ? cumulativeActual / cumulativePlan : null;

    // Current month achievement
    const curRow = rows.find((r) => r.month === currentMonth);
    const curFact = factSalesByMonth?.[currentMonth - 1];
    const curPlan = curRow?.salesForecast ?? 0;
    const curAchRate = curPlan > 0 && typeof curFact === 'number' ? curFact / curPlan : null;

    // Risk counts by priority
    const nonHealthyRisks = risks.filter((r) => r.level !== 'healthy');
    const p0Count = nonHealthyRisks.filter((r) => r.level === 'danger').length;
    const p1Count = nonHealthyRisks.filter((r) => r.level === 'warning').length;
    const totalRiskActions = actions.length;

    const annualNeedTone: 'default' | 'success' | 'warning' | 'danger' =
        summary.annualPurchaseNeed < 0 ? 'success' : summary.annualPurchaseNeed > 0 ? 'warning' : 'default';
    const annualNeedValue = summary.annualPurchaseNeed <= 0
        ? `可释放 ${toSafeCurrency(Math.abs(summary.annualPurchaseNeed), currencyUnit)}`
        : toSafeCurrency(summary.annualPurchaseNeed, currencyUnit);
    const annualNeedSub = summary.annualPurchaseNeed <= 0 ? '无需新增采购' : '需新增采购';

    const budgetDiff = summary.annualBudgetDiff;
    const budgetTone: 'default' | 'success' | 'warning' | 'danger' = budgetDiff > 0 ? 'danger' : budgetDiff < 0 ? 'success' : 'default';
    const budgetValue = budgetDiff > 0
        ? `超 ${toSafeCurrency(budgetDiff, currencyUnit)}`
        : budgetDiff < 0
          ? `余 ${toSafeCurrency(Math.abs(budgetDiff), currencyUnit)}`
          : '持平';

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">月度滚动决策摘要</h3>
                <div className="text-[10px] text-slate-400">
                    {isReadonly ? `当前为 ${versionName ?? '锁定版'}，核心预算字段只读` : '滚动控制中'}
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-y sm:divide-y-0 divide-slate-100">
                <KPICard
                    label="全年销售预测"
                    value={toSafeCurrency(summary.annualSalesForecast, currencyUnit)}
                    sub={`剩余增速需求 ${summary.requiredGrowthRateForRemainingMonths >= 0 ? '+' : ''}${(summary.requiredGrowthRateForRemainingMonths * 100).toFixed(1)}%`}
                    tone={summary.requiredGrowthRateForRemainingMonths > 0.08 ? 'warning' : 'default'}
                />
                <KPICard
                    label="当月达成率"
                    value={curAchRate !== null ? `${(curAchRate * 100).toFixed(1)}%` : '--'}
                    sub={curAchRate !== null ? (curAchRate >= 1 ? '达成计划' : `距计划差 ${toSafeCurrency(curPlan - (curFact ?? 0), currencyUnit)}`) : `计划 ${toSafeCurrency(curPlan, currencyUnit)}`}
                    tone={curAchRate !== null ? (curAchRate >= 1 ? 'success' : curAchRate < 0.9 ? 'danger' : 'warning') : 'default'}
                />
                <KPICard
                    label="累计达成率"
                    value={cumAchRate !== null ? `${(cumAchRate * 100).toFixed(1)}%` : '--'}
                    sub={cumAchRate !== null ? `1-${currentMonth - 1}月 累计 ${toSafeCurrency(cumulativeActual, currencyUnit)}` : `已锁 ${summary.actualMonths} 个月`}
                    tone={cumAchRate !== null ? (cumAchRate >= 0.95 ? 'success' : cumAchRate < 0.85 ? 'danger' : 'warning') : 'default'}
                />
                <KPICard
                    label="全年净采购"
                    value={annualNeedValue}
                    sub={annualNeedSub}
                    tone={annualNeedTone}
                />
                <KPICard
                    label="年度预算差异"
                    value={budgetValue}
                    sub={budgetDiff > 0 ? '超出年度预算' : '预算有余量'}
                    tone={budgetTone}
                />
                <KPICard
                    label="最大采购压力月"
                    value={`${MONTH_LABELS[summary.maxPurchasePressureMonth - 1]}`}
                    sub={`差异 ${toSafeCurrency(maxPurchase?.budgetDiff ?? 0, currencyUnit)}`}
                    tone={(maxPurchase?.budgetDiff ?? 0) > 0 ? 'danger' : 'default'}
                />
                <KPICard
                    label="最大库存风险月"
                    value={`${MONTH_LABELS[summary.maxInventoryRiskMonth - 1]}`}
                    sub={`存销比 ${maxInventory ? maxInventory.stockToSalesRatio.toFixed(1) : '--'}`}
                    tone={(maxInventory?.stockToSalesRatio ?? 0) > 4 ? 'danger' : (maxInventory?.stockToSalesRatio ?? 0) > 3 ? 'warning' : 'default'}
                />
                <KPICard
                    label="风险与动作"
                    value={`${totalRiskActions} 项`}
                    sub={`P0×${p0Count} / P1×${p1Count}`}
                    tone={p0Count > 0 ? 'danger' : p1Count > 0 ? 'warning' : 'success'}
                />
            </div>
        </div>
    );
}

function MonthlyRollingControlBar({
    scenario,
    setScenario,
    saveScenario,
    resetScenario,
    exportCsv,
    savedAt,
    isManualMode,
    isLockedScenario,
}: {
    scenario: PlanScenario;
    setScenario: (scenario: PlanScenario) => void;
    saveScenario: () => void;
    resetScenario: () => void;
    exportCsv: () => void;
    savedAt: string;
    isManualMode: boolean;
    isLockedScenario?: boolean;
}) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <p className="text-xs font-medium text-slate-700">滚动控制条</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{savedAt ? `最近保存：${savedAt}` : '未保存变更'}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                        {SCENARIOS.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => setScenario(item.key)}
                                className={`px-2.5 py-1 text-[10px] font-medium ${scenario === item.key ? 'bg-sky-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    {isManualMode ? (
                        <button onClick={resetScenario} className="px-2 py-1 rounded border border-slate-200 text-slate-600 text-[11px] hover:border-sky-300">
                            恢复虚拟数据
                        </button>
                    ) : null}
                    <button onClick={exportCsv} className="px-2 py-1 rounded border border-slate-200 text-slate-600 text-[11px] hover:border-sky-300">
                        导出 CSV
                    </button>
                    <button
                        onClick={saveScenario}
                        disabled={isLockedScenario}
                        className="px-3 py-1.5 rounded bg-sky-500 text-white text-[11px] font-medium hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLockedScenario ? '已锁定' : '💾 保存当前方案'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function MonthlyRollingTrendChart({
    rows,
    risks,
    currentMonth,
    currencyUnit,
    factSalesByMonth,
    annualPurchaseBudget,
}: {
    rows: MonthlyRollingRow[];
    risks: MonthlyRollingRisk[];
    currentMonth: number;
    currencyUnit: CurrencyUnit;
    factSalesByMonth?: Record<number, number>;
    annualPurchaseBudget: number;
}) {
    const monthlyBudget = annualPurchaseBudget / 12;
    const maxValue = Math.max(
        1,
        ...rows.map((row) => {
            const fact = factSalesByMonth?.[row.month - 1] ?? 0;
            return Math.max(row.salesForecast, fact, row.endingInventoryCost, Math.max(0, row.actualPurchaseRequiredAmount), monthlyBudget);
        }),
    );
    const riskByMonth = primaryRiskMap(risks);

    // Cumulative achievement line points
    let cumActual = 0;
    let cumPlan = 0;
    const cumPoints = rows.map((row) => {
        const fact = factSalesByMonth?.[row.month - 1];
        if (row.monthStatus === 'actual' && typeof fact === 'number') {
            cumActual += fact;
            cumPlan += row.originalPlanSales;
        } else if (row.monthStatus === 'actual') {
            cumActual += row.salesForecast;
            cumPlan += row.originalPlanSales;
        }
        return cumPlan > 0 ? cumActual / cumPlan : null;
    });

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h3 className="font-semibold text-slate-800">月度趋势图</h3>
                    <p className="text-xs text-slate-400 mt-0.5">蓝=销售预测 · 绿=实际销售 · 橙=实际采购 · 灰细=月末库存 · 虚线=月均预算基线</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-sky-500 inline-block" /> 销售预测</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> 实际销售</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> 实际采购</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-400 inline-block" /> 月末库存</span>
                    <span className="text-sky-600 font-medium">当前月：{MONTH_LABELS[currentMonth - 1]}</span>
                </div>
            </div>
            <div className="px-4 py-4 overflow-x-auto">
                <div className="min-w-[980px] relative">
                    {/* Budget baseline dashed line */}
                    <div
                        className="absolute left-0 right-0 border-t-2 border-dashed border-sky-300/60 z-10 pointer-events-none"
                        style={{ bottom: `${(monthlyBudget / maxValue) * 220}px` }}
                        title={`月均预算基线 ${toSafeCurrency(monthlyBudget, currencyUnit)}`}
                    />
                    <div className="grid grid-cols-12 gap-2 items-end h-[220px]">
                        {rows.map((row, idx) => {
                            const salesH = `${(Math.max(0, row.salesForecast) / maxValue) * 100}%`;
                            const purchaseH = `${(Math.max(0, row.actualPurchaseRequiredAmount) / maxValue) * 100}%`;
                            const inventoryH = `${(Math.max(0, row.endingInventoryCost) / maxValue) * 100}%`;
                            const fact = factSalesByMonth?.[row.month - 1];
                            const factH = typeof fact === 'number' ? `${(Math.max(0, fact) / maxValue) * 100}%` : '0%';
                            const hasFactSales = row.monthStatus === 'actual' && typeof fact === 'number';
                            const risk = riskByMonth.get(row.month);
                            const isCurrent = row.month === currentMonth;

                            return (
                                <div
                                    key={row.month}
                                    className={`relative h-full rounded-lg border px-1 py-2 flex flex-col justify-end ${
                                        risk?.level === 'danger' ? 'bg-rose-50/50 border-rose-100' : isCurrent ? 'bg-sky-50/50 border-sky-100' : 'bg-slate-50/30 border-slate-100'
                                    }`}
                                >
                                    {/* Today marker */}
                                    {isCurrent ? <div className="absolute inset-y-1 left-1/2 w-[2px] -translate-x-1/2 bg-sky-400/60 z-10" /> : null}
                                    <div className="relative z-10 flex items-end justify-center gap-0.5 h-full">
                                        <div className="w-2.5 rounded-t bg-sky-500" style={{ height: salesH }} title={`销售预测 ${toSafeCurrency(row.salesForecast, currencyUnit)}`} />
                                        {hasFactSales ? (
                                            <div className="w-2.5 rounded-t bg-emerald-500" style={{ height: factH }} title={`实际销售 ${toSafeCurrency(fact!, currencyUnit)}`} />
                                        ) : null}
                                        <div className="w-2.5 rounded-t bg-amber-400" style={{ height: purchaseH }} title={`实际采购 ${formatPurchaseNeed(row.actualPurchaseRequiredAmount, currencyUnit)}`} />
                                        <div className="w-1 rounded-t bg-slate-400/70" style={{ height: inventoryH }} title={`月末库存 ${toSafeCurrency(row.endingInventoryCost, currencyUnit)}`} />
                                    </div>
                                    {/* Cumulative achievement dot */}
                                    {cumPoints[idx] !== null ? (
                                        <div
                                            className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-violet-500 border-2 border-white z-20"
                                            style={{ bottom: `${(cumPoints[idx]! * 100)}%` }}
                                            title={`累计达成率 ${(cumPoints[idx]! * 100).toFixed(1)}%`}
                                        />
                                    ) : null}
                                    <div className="relative z-10 mt-1 text-center">
                                        <p className="text-[9px] text-slate-500">{MONTH_LABELS[row.month - 1]}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MonthlyOTBEditableTable({
    rows,
    risks,
    currencyUnit,
    isReadonly,
    editNotice,
    onEditAttempt,
    onChange,
    factSalesByMonth,
}: {
    rows: MonthlyRollingRow[];
    risks: MonthlyRollingRisk[];
    currencyUnit: CurrencyUnit;
    isReadonly: boolean;
    editNotice: string;
    onEditAttempt: (row: MonthlyRollingRow) => void;
    onChange: (idx: number, field: keyof MonthlyOTBInput, value: number) => void;
    factSalesByMonth?: Record<number, number>;
}) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const riskByMonth = primaryRiskMap(risks);

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h3 className="font-semibold text-slate-800">月度 OTB 明细表</h3>
                        <p className="text-xs text-slate-400 mt-0.5">12 主列 · 关键决策列前置 · 已锁定行视觉降权</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isReadonly ? (
                            <span className="text-[11px] rounded-full px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100">
                                审批版/锁定版只读
                            </span>
                        ) : null}
                        <button
                            onClick={() => setShowAdvanced((v) => !v)}
                            className="text-[11px] px-2.5 py-1 rounded border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100"
                        >
                            高级字段 {showAdvanced ? '▾' : '▸'}
                        </button>
                    </div>
                </div>
                {editNotice ? (
                    <div className="text-[11px] rounded-lg px-3 py-2 bg-amber-50 border border-amber-100 text-amber-700">{editNotice}</div>
                ) : null}
            </div>

            <div className="overflow-x-auto">
                <table className={`${showAdvanced ? 'min-w-[1540px]' : 'min-w-[980px]'} w-full text-xs text-slate-700`}>
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[11px]">
                            <th className="sticky left-0 z-20 bg-slate-50/90 px-2.5 py-2 text-left">月份</th>
                            <th className="px-2.5 py-2 text-left">状态</th>
                            <th className="px-2.5 py-2 text-right">月初库存</th>
                            <th className="px-2.5 py-2 text-right">销售预测</th>
                            {/* actual 月显示实际 vs 计划 */}
                            <th className="px-2.5 py-2 text-right">实际/达成</th>
                            <th className="px-2.5 py-2 text-right">销售成本</th>
                            <th className="px-2.5 py-2 text-right">月末目标库存</th>
                            <th className="px-2.5 py-2 text-right">实际所需采购</th>
                            <th className="px-2.5 py-2 text-right">差异(金额/率)</th>
                            <th className="px-2.5 py-2 text-right">健康度</th>
                            <th className="px-2.5 py-2 text-left">风险</th>
                            <th className="sticky right-0 z-20 bg-slate-50/90 px-2.5 py-2 text-left">建议动作</th>
                            {showAdvanced ? (
                                <>
                                    <th className="px-2.5 py-2 text-right bg-purple-50/50 text-purple-600">倍率</th>
                                    <th className="px-2.5 py-2 text-right bg-purple-50/50 text-purple-600">折扣率</th>
                                    <th className="px-2.5 py-2 text-right bg-purple-50/50 text-purple-600">吊牌销售额</th>
                                    <th className="px-2.5 py-2 text-right bg-purple-50/50 text-purple-600">存销比</th>
                                    <th className="px-2.5 py-2 text-right bg-purple-50/50 text-purple-600">采购需金额</th>
                                    <th className="px-2.5 py-2 text-right bg-purple-50/50 text-purple-600">到货率</th>
                                </>
                            ) : null}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const risk = riskByMonth.get(row.month);
                            const readOnlyByStatus = row.monthStatus === 'actual' || isReadonly;
                            const canEdit = !readOnlyByStatus && (row.monthStatus === 'current' || row.monthStatus === 'forecast');
                            const diffTone = row.budgetDiff > 0 ? 'text-rose-600' : row.budgetDiff < 0 ? 'text-emerald-600' : 'text-slate-500';
                            const fact = factSalesByMonth?.[row.month - 1];
                            const achRate = typeof fact === 'number' && row.salesForecast > 0 ? fact / row.salesForecast : null;

                            const healthPct = Math.max(0, Math.min(100, 100 - (Math.abs(row.budgetDiff) / Math.max(1, row.originalPurchaseBudget)) * 100));
                            const healthTone = healthPct >= 90 ? 'text-emerald-600' : healthPct >= 70 ? 'text-amber-600' : 'text-rose-600';

                            return (
                                <tr
                                    key={row.month}
                                    className={`border-b border-slate-50 transition-colors ${row.monthStatus === 'actual' ? 'bg-slate-100/40 opacity-80' : 'hover:bg-slate-50/50'}`}
                                >
                                    <td className="sticky left-0 z-10 bg-white px-2.5 py-2 font-medium text-slate-700 border-r border-slate-100">{MONTH_LABELS[idx]}</td>
                                    <td className="px-2.5 py-2">{statusTag(row.monthStatus)}</td>
                                    <td className="px-2.5 py-2 text-right">{toSafeCurrency(row.beginningInventoryCost, currencyUnit)}</td>
                                    <td className="px-2.5 py-2 text-right">
                                        <button type="button" onClick={() => (!canEdit ? onEditAttempt(row) : undefined)} className="w-full text-right">
                                            <NumberInputCell
                                                value={row.salesForecast}
                                                step={100000}
                                                disabled={!canEdit}
                                                showManual={row.isManualOverride}
                                                onChange={(v) => onChange(idx, 'salesForecast', v)}
                                                currencyDisplay={currencyUnit}
                                            />
                                        </button>
                                    </td>
                                    <td className="px-2.5 py-2 text-right text-[11px]">
                                        {row.monthStatus === 'actual' && typeof fact === 'number' ? (
                                            <div>
                                                <div className="font-medium">{toSafeCurrency(fact, currencyUnit)}</div>
                                                <div className={`text-[10px] ${achRate! >= 1 ? 'text-emerald-600' : achRate! < 0.9 ? 'text-rose-600' : 'text-amber-600'}`}>
                                                    {(achRate! * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300">--</span>
                                        )}
                                    </td>
                                    <td className="px-2.5 py-2 text-right text-slate-500">{toSafeCurrency(row.salesCost, currencyUnit)}</td>
                                    <td className="px-2.5 py-2 text-right text-slate-500">{toSafeCurrency(row.endingInventoryCost, currencyUnit)}</td>
                                    <td className="px-2.5 py-2 text-right font-medium">{formatPurchaseNeed(row.actualPurchaseRequiredAmount, currencyUnit)}</td>
                                    <td className={`px-2.5 py-2 text-right text-[11px] ${diffTone}`}>
                                        <div className="font-medium">{toSafeCurrency(row.budgetDiff, currencyUnit)}</div>
                                        <div className="text-[10px]">{formatPct(row.budgetDiffRate)}</div>
                                    </td>
                                    <td className={`px-2.5 py-2 text-right font-medium text-[11px] ${healthTone}`}>{healthPct.toFixed(0)}</td>
                                    <td className="px-2.5 py-2">{risk ? riskBadge(risk.level, risk.title) : '--'}</td>
                                    <td className="sticky right-0 z-10 bg-white px-2.5 py-2 text-[11px] text-slate-600 border-l border-slate-100">
                                        {risk?.level === 'healthy' ? '--' : risk?.action ?? '--'}
                                        {row.monthStatus === 'current' && !isReadonly ? <span className="ml-1 text-sky-600">滚动调整中</span> : null}
                                    </td>
                                    {showAdvanced ? (
                                        <>
                                            <td className="px-2.5 py-2 text-right bg-purple-50/30">
                                                <button type="button" onClick={() => (!canEdit ? onEditAttempt(row) : undefined)} className="w-full text-right">
                                                    <NumberInputCell value={row.markupRate} step={0.1} min={0.1} disabled={!canEdit} onChange={(v) => onChange(idx, 'markupRate', v)} />
                                                </button>
                                            </td>
                                            <td className="px-2.5 py-2 text-right bg-purple-50/30">
                                                <button type="button" onClick={() => (!canEdit ? onEditAttempt(row) : undefined)} className="w-full text-right">
                                                    <NumberInputCell value={Number((row.discountRate * 100).toFixed(1))} step={0.5} min={1} disabled={!canEdit} onChange={(v) => onChange(idx, 'discountRate', v / 100)} />
                                                </button>
                                            </td>
                                            <td className="px-2.5 py-2 text-right bg-purple-50/30 text-slate-500">{toSafeCurrency(row.retailSalesAmount, currencyUnit)}</td>
                                            <td className="px-2.5 py-2 text-right bg-purple-50/30">
                                                <button type="button" onClick={() => (!canEdit ? onEditAttempt(row) : undefined)} className="w-full text-right">
                                                    <NumberInputCell value={row.stockToSalesRatio} step={0.5} min={1} disabled={!canEdit} onChange={(v) => onChange(idx, 'stockToSalesRatio', v)} />
                                                </button>
                                            </td>
                                            <td className="px-2.5 py-2 text-right bg-purple-50/30 text-slate-500">{formatPurchaseNeed(row.purchaseRequiredAmount, currencyUnit)}</td>
                                            <td className="px-2.5 py-2 text-right bg-purple-50/30">
                                                <button type="button" onClick={() => (!canEdit ? onEditAttempt(row) : undefined)} className="w-full text-right">
                                                    <NumberInputCell value={Number((row.arrivalRate * 100).toFixed(1))} step={1} min={1} disabled={!canEdit} onChange={(v) => onChange(idx, 'arrivalRate', v / 100)} />
                                                </button>
                                            </td>
                                        </>
                                    ) : null}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MonthlyRollingRiskActionPanel({ risks, actions, currencyUnit }: { risks: MonthlyRollingRisk[]; actions: MonthlyRollingAction[]; currencyUnit: CurrencyUnit }) {
    const [activeTab, setActiveTab] = useState<'risks' | 'actions'>('risks');
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'P0' | 'P1'>('all');

    const nonHealthy = risks.filter((r) => r.level !== 'healthy');
    const p0Risks = nonHealthy.filter((r) => r.level === 'danger');
    const p1Risks = nonHealthy.filter((r) => r.level === 'warning');
    const filteredRisks = priorityFilter === 'P0' ? p0Risks : priorityFilter === 'P1' ? p1Risks : nonHealthy;

    const sortedActions = [...actions].sort((a, b) => {
        const rank = { 高: 3, 中: 2, 低: 1 };
        return rank[b.priority] - rank[a.priority];
    });
    const filteredActions = priorityFilter === 'P0'
        ? sortedActions.filter((a) => a.priority === '高')
        : priorityFilter === 'P1'
          ? sortedActions.filter((a) => a.priority === '中')
          : sortedActions;

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-4 flex-wrap">
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[11px]">
                    <button onClick={() => setActiveTab('risks')} className={`px-3 py-1.5 font-medium ${activeTab === 'risks' ? 'bg-rose-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                        风险诊断 ({nonHealthy.length})
                    </button>
                    <button onClick={() => setActiveTab('actions')} className={`px-3 py-1.5 font-medium ${activeTab === 'actions' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                        建议动作 ({actions.length})
                    </button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                    {(['all', 'P0', 'P1'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setPriorityFilter(f)}
                            className={`px-2 py-0.5 rounded-full border ${
                                priorityFilter === f
                                    ? f === 'P0' ? 'bg-rose-500 text-white border-rose-500' : f === 'P1' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-700 text-white border-slate-700'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                            {f === 'all' ? `全部 (${nonHealthy.length})` : f === 'P0' ? `P0 紧急 (${p0Risks.length})` : `P1 重要 (${p1Risks.length})`}
                        </button>
                    ))}
                </div>
            </div>
            {activeTab === 'risks' ? (
                <div className="px-5 py-4 space-y-2.5">
                    {filteredRisks.length === 0 ? (
                        <div className="rounded-lg px-3 py-2 text-xs bg-emerald-50 border border-emerald-100 text-emerald-700">暂无匹配风险，滚动节奏整体健康。</div>
                    ) : (
                        filteredRisks.map((risk) => (
                            <div
                                key={`${risk.month}-${risk.riskType}`}
                                className={`rounded-lg px-3 py-2.5 text-xs border ${
                                    risk.level === 'danger'
                                        ? 'bg-rose-50 border-rose-100 text-rose-700'
                                        : 'bg-amber-50 border-amber-100 text-amber-700'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold">{MONTH_LABELS[risk.month - 1]} · {risk.title}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${risk.level === 'danger' ? 'bg-rose-100' : 'bg-amber-100'}`}>{risk.level === 'danger' ? 'P0' : 'P1'}</span>
                                </div>
                                <div className="mt-1">{risk.message}</div>
                                <div className="mt-1 font-medium">建议：{risk.action}</div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-[760px] w-full text-xs">
                        <thead className="bg-slate-50/80 text-slate-500">
                            <tr>
                                <th className="px-3 py-2 text-left">月份</th>
                                <th className="px-3 py-2 text-left">风险类型</th>
                                <th className="px-3 py-2 text-left">建议动作</th>
                                <th className="px-3 py-2 text-right">影响金额</th>
                                <th className="px-3 py-2 text-left">优先级</th>
                                <th className="px-3 py-2 text-left">责任模块</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredActions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-3 text-slate-400">暂无匹配动作建议。</td>
                                </tr>
                            ) : (
                                filteredActions.map((item) => (
                                    <tr key={`${item.month}-${item.riskType}`} className="border-t border-slate-100">
                                        <td className="px-3 py-2">{MONTH_LABELS[item.month - 1]}</td>
                                        <td className="px-3 py-2">{monthlyRollingRiskTypeLabel(item.riskType)}</td>
                                        <td className="px-3 py-2 font-medium text-slate-700">{actionLabel(item.action)}</td>
                                        <td className="px-3 py-2 text-right">{toSafeCurrency(item.impactAmount, currencyUnit)}</td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${item.priority === '高' ? 'bg-rose-50 text-rose-700' : item.priority === '中' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {item.priority}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">{item.owner}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function MonthlyOTBRollingPanel({
    currencyUnit,
    filters,
    isLocked = false,
    versionStatus,
    versionName,
    onScenarioSave,
    isLockedScenario,
    executedActionsByMonth = {},
    factSalesByMonth,
}: Props) {
    const virtualLoop = useOtbVirtualSalesLoop(filters);

    const [scenario, setScenario] = useState<PlanScenario>('standard');
    const [manualBeginning, setManualBeginning] = useState<number | null>(null);
    const [manualInputs, setManualInputs] = useState<MonthlyOTBInput[] | null>(null);
    const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set());
    const [savedAt, setSavedAt] = useState<string>('');
    const [editNotice, setEditNotice] = useState<string>('');
    const [helpOpen, setHelpOpen] = useState(false);
    const [bannerExpanded, setBannerExpanded] = useState(false);
    const [scenarioCompareOpen, setScenarioCompareOpen] = useState(false);
    const [rollingState, setRollingState] = useState<MonthlyRollingState>({
        lockedMonths: [],
        actualSales: {},
        actualPurchaseAmount: {},
        actualArrivalAmount: {},
        actualEndingInventory: {},
    });

    const sourceInputs = virtualLoop.monthlyInputs;
    const currentMonth = resolveCurrentMonth(filters);
    const beginning = manualBeginning ?? virtualLoop.month1BeginningInventoryCost;
    const inputs = manualInputs ?? sourceInputs;
    const annualSalesTarget = sourceInputs.reduce((sum, row) => sum + row.salesForecast, 0);
    const annualPurchaseBudget = sourceInputs.reduce((sum, row) => sum + row.originalPurchaseBudget, 0);

    const isCoreReadonly = isLocked || !EDITABLE_VERSION_STATUS.has(versionStatus ?? 'draft');
    const rolling = useMemo(
        () => calcMonthlyRollingOTB(inputs, {
            month1Beginning: beginning,
            currentMonth,
            annualSalesTarget,
            annualPurchaseBudget,
            rollingState,
            baselineInputs: sourceInputs,
            manualOverrideKeys: manualOverrides,
        }),
        [annualPurchaseBudget, annualSalesTarget, beginning, currentMonth, inputs, manualOverrides, rollingState, sourceInputs],
    );

    const isManualMode = manualInputs !== null || manualBeginning !== null;

    const achievementProgress = useMemo(
        () => calcMonthlyAchievementProgress(rolling.rows, rollingState, currentMonth),
        [rolling.rows, rollingState, currentMonth],
    );

    const cashflowTimeline = useMemo(() => calcCashflowTimeline(rolling.rows), [rolling.rows]);

    const lastMonthReview = useMemo(
        () => reviewLastMonthActions(rolling.actions, executedActionsByMonth, currentMonth),
        [rolling.actions, executedActionsByMonth, currentMonth],
    );

    // Load all 3 scenarios from localStorage for comparison
    const scenarioResults = useMemo(() => {
        const load = (key: PlanScenario): MonthlyRollingCalcResult | undefined => {
            if (key === scenario) return rolling;
            try {
                const raw = window.localStorage.getItem(`otb-monthly-plan-${key}`);
                if (!raw) return undefined;
                const parsed = JSON.parse(raw) as { inputs?: MonthlyOTBInput[]; beginning?: number; rollingState?: MonthlyRollingState };
                const inp = Array.isArray(parsed.inputs) ? parsed.inputs : sourceInputs;
                const beg = typeof parsed.beginning === 'number' ? parsed.beginning : beginning;
                const rs = parsed.rollingState ?? { lockedMonths: [], actualSales: {}, actualPurchaseAmount: {}, actualArrivalAmount: {}, actualEndingInventory: {} };
                return calcMonthlyRollingOTB(inp, { month1Beginning: beg, currentMonth, annualSalesTarget, annualPurchaseBudget, rollingState: rs, baselineInputs: sourceInputs });
            } catch { return undefined; }
        };
        return { standard: load('standard'), conservative: load('conservative'), optimistic: load('optimistic') };
    }, [scenario, rolling, sourceInputs, beginning, currentMonth, annualSalesTarget, annualPurchaseBudget]);

    const scenarioCompareRows = useMemo(() => compareThreeScenarios(scenarioResults), [scenarioResults]);

    const updateRow = useCallback((idx: number, field: keyof MonthlyOTBInput, value: number) => {
        const row = rolling.rows[idx];
        if (isCoreReadonly || row.monthStatus === 'actual') {
            setEditNotice('审批版不可直接修改，请在版本治理中创建滚动调整版。');
            return;
        }

        // Compute downstream chain notice for salesForecast changes
        if (field === 'salesForecast') {
            const oldValue = row.salesForecast;
            const delta = value - oldValue;
            const downstreamCount = rolling.rows.filter((r) => r.month > idx + 1).length;
            if (delta !== 0 && downstreamCount > 0) {
                const sign = delta > 0 ? '+' : '';
                setEditNotice(`✓ ${MONTH_LABELS[idx]}销售调整 ${sign}${toSafeCurrency(delta, currencyUnit)} → 已联动重算下游 ${downstreamCount} 个月`);
                setTimeout(() => setEditNotice(''), 5000);
            } else {
                setEditNotice('');
            }
        } else {
            setEditNotice('');
        }

        setManualInputs((prev) => {
            const base = (prev ?? sourceInputs).map((item) => ({ ...item }));
            base[idx] = { ...base[idx], [field]: value };
            return base;
        });
        setManualOverrides((prev) => {
            const next = new Set(prev);
            next.add(`${idx}:${String(field)}`);
            return next;
        });
    }, [isCoreReadonly, rolling.rows, sourceInputs, currencyUnit]);

    const loadScenario = useCallback((nextScenario: PlanScenario) => {
        setScenario(nextScenario);
        const raw = window.localStorage.getItem(`otb-monthly-plan-${nextScenario}`);
        if (!raw) {
            setManualBeginning(null);
            setManualInputs(null);
            setManualOverrides(new Set());
            setSavedAt('');
            setRollingState({ lockedMonths: [], actualSales: {}, actualPurchaseAmount: {}, actualArrivalAmount: {}, actualEndingInventory: {} });
            return;
        }
        try {
            const parsed = JSON.parse(raw) as {
                beginning?: number;
                inputs?: MonthlyOTBInput[];
                savedAt?: string;
                rollingState?: MonthlyRollingState;
                manualOverrideKeys?: string[];
            };
            setManualBeginning(typeof parsed.beginning === 'number' ? parsed.beginning : null);
            setManualInputs(Array.isArray(parsed.inputs) ? parsed.inputs : null);
            setSavedAt(parsed.savedAt ?? '');
            setRollingState(parsed.rollingState ?? { lockedMonths: [], actualSales: {}, actualPurchaseAmount: {}, actualArrivalAmount: {}, actualEndingInventory: {} });
            setManualOverrides(new Set(parsed.manualOverrideKeys ?? []));
        } catch {
            setManualBeginning(null);
            setManualInputs(null);
            setManualOverrides(new Set());
            setSavedAt('');
            setRollingState({ lockedMonths: [], actualSales: {}, actualPurchaseAmount: {}, actualArrivalAmount: {}, actualEndingInventory: {} });
        }
    }, []);

    const saveScenario = useCallback(() => {
        const nextSavedAt = new Date().toLocaleString('zh-CN', { hour12: false });
        const snapshot = { beginning, inputs, savedAt: nextSavedAt, rollingState, manualOverrideKeys: Array.from(manualOverrides) };
        window.localStorage.setItem(`otb-monthly-plan-${scenario}`, JSON.stringify(snapshot));
        setSavedAt(nextSavedAt);
        onScenarioSave?.(scenario, snapshot);
    }, [beginning, inputs, manualOverrides, rollingState, scenario, onScenarioSave]);

    const resetToVirtualData = useCallback(() => {
        setManualBeginning(null);
        setManualInputs(null);
        setManualOverrides(new Set());
        setSavedAt('');
        setEditNotice('');
    }, []);

    const exportCsv = useCallback(() => {
        const headers = [
            '月份', '状态', '月初库存',
            '销售预测', '倍率', '折扣率', '吊牌销售额', '销售成本',
            '存销比', '月末目标库存',
            '采购需金额', '到货率', '实际所需采购',
            '原预算', '差异金额', '差异率',
            '风险', '建议动作',
        ];
        const riskByMonth = primaryRiskMap(rolling.risks);

        const body = rolling.rows.map((row, idx) => {
            const risk = riskByMonth.get(row.month);
            return [
                MONTH_LABELS[idx],
                row.monthStatus,
                row.beginningInventoryCost,
                row.salesForecast,
                row.markupRate,
                row.discountRate,
                row.retailSalesAmount,
                row.salesCost,
                row.stockToSalesRatio,
                row.endingInventoryCost,
                formatPurchaseNeed(row.purchaseRequiredAmount, currencyUnit),
                row.arrivalRate,
                formatPurchaseNeed(row.actualPurchaseRequiredAmount, currencyUnit),
                row.originalPurchaseBudget,
                row.budgetDiff,
                row.budgetDiffRate ?? '',
                risk?.title ?? '',
                risk?.action ?? '',
            ];
        });

        const csv = [headers, ...body]
            .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `otb-monthly-${scenario}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [rolling.risks, rolling.rows, scenario]);

    const onEditAttempt = useCallback((row: MonthlyRollingRow) => {
        if (row.monthStatus === 'actual') {
            setEditNotice('已发生月份已锁定为实际口径，不允许被预测重算覆盖。');
            return;
        }
        if (isCoreReadonly) {
            setEditNotice('审批版不可直接修改，请在版本治理中创建滚动调整版。');
            return;
        }
    }, [isCoreReadonly]);

    return (
        <div className="space-y-4 relative">
            {/* 1. Data ingest banner — compressed single line with expandable detail */}
            <div className={`rounded-xl border px-4 py-2.5 text-xs ${virtualLoop.source === 'fact_sales' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-medium">
                        {virtualLoop.source === 'fact_sales' ? '✓' : '⚠'} fact_sales · {virtualLoop.dataScopeLabel} · 事实销售 {toSafeCurrency(virtualLoop.factSalesTotal, currencyUnit)} · 已锁定 {rolling.summary.actualMonths} 个月
                        {isManualMode ? ' · 已手动覆盖' : ''}
                        {virtualLoop.isLoading ? ' · 加载中…' : ''}
                    </span>
                    <button onClick={() => setBannerExpanded((v) => !v)} className="underline opacity-70 hover:opacity-100 shrink-0">
                        详情 {bannerExpanded ? '▴' : '▾'}
                    </button>
                </div>
                {bannerExpanded ? (
                    <div className="mt-2 pt-2 border-t border-current/10 space-y-0.5 opacity-90">
                        <p>业务日期：2026-05-10</p>
                        <p>1-{currentMonth - 1}月 ⬛ 已锁定 (actual)：使用 fact_sales 实际数据</p>
                        <p>{MONTH_LABELS[currentMonth - 1]} ◯ 当前月 (current)：实际 + 预测混合</p>
                        <p>{currentMonth + 1}-12月 ◯ 预测月 (forecast)：forecast / OTB 模型</p>
                        <p>年度预测 {toSafeCurrency(rolling.summary.annualSalesForecast, currencyUnit)}</p>
                    </div>
                ) : null}
            </div>

            {/* 2. Cumulative achievement progress bar */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3.5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">2026 年度销售达成进度</span>
                    <span className={`text-[11px] font-medium ${achievementProgress.deviation < -0.05 ? 'text-rose-600' : achievementProgress.deviation < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {achievementProgress.deviation < -0.05 ? '⚠ 滞后' : achievementProgress.deviation < 0 ? '稍落后' : '✓ 领先'} {Math.abs(achievementProgress.deviation * 100).toFixed(1)}pp
                    </span>
                </div>
                <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
                    {/* Time progress ghost */}
                    <div className="absolute inset-y-0 left-0 bg-slate-200 rounded-full" style={{ width: `${achievementProgress.timeProgress * 100}%` }} />
                    {/* Sales achievement */}
                    <div
                        className={`absolute inset-y-0 left-0 rounded-full ${achievementProgress.achievementRate >= achievementProgress.timeProgress ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(1, achievementProgress.achievementRate) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                    <span>已发生 {toSafeCurrency(achievementProgress.cumulativeActual, currencyUnit)} / 计划 {toSafeCurrency(achievementProgress.cumulativePlan, currencyUnit)}</span>
                    <span>销售达成 {(achievementProgress.achievementRate * 100).toFixed(1)}% / 时间进度 {(achievementProgress.timeProgress * 100).toFixed(1)}%</span>
                </div>
            </div>

            {/* 3. Decision summary KPI cards */}
            <MonthlyRollingDecisionSummary
                rows={rolling.rows}
                summary={rolling.summary}
                risks={rolling.risks}
                actions={rolling.actions}
                currentMonth={currentMonth}
                isReadonly={isCoreReadonly}
                currencyUnit={currencyUnit}
                versionName={versionName}
                factSalesByMonth={factSalesByMonth}
            />

            {/* 3a. 决策建议警示条（基于风险/采购压力自动生成） */}
            {(() => {
                const maxPurchase = rolling.rows.find((row) => row.month === rolling.summary.maxPurchasePressureMonth);
                const maxInventory = rolling.rows.find((row) => row.month === rolling.summary.maxInventoryRiskMonth);
                const p0RiskCount = rolling.risks.filter((r) => r.level === 'danger').length;
                const purchasePressureMonths = rolling.rows.filter((r) => r.budgetDiff > 0).length;
                const recommendation = (() => {
                    if (p0RiskCount > 0 && (maxPurchase?.budgetDiff ?? 0) > 0) {
                        return `优先复核 ${MONTH_LABELS[rolling.summary.maxPurchasePressureMonth - 1]} 等高压月份采购节奏（${purchasePressureMonths} 项采购压力 / P0×${p0RiskCount}），必要时申请追加预算`;
                    }
                    if ((maxInventory?.stockToSalesRatio ?? 0) > 4) {
                        return `${MONTH_LABELS[rolling.summary.maxInventoryRiskMonth - 1]}存销比 ${maxInventory!.stockToSalesRatio.toFixed(1)} 偏高，优先执行清货/转奥莱降低库存积压风险`;
                    }
                    if (rolling.summary.requiredGrowthRateForRemainingMonths > 0.08) {
                        return `剩余月份需提速 ${(rolling.summary.requiredGrowthRateForRemainingMonths * 100).toFixed(1)}%，建议锁定主推款到货并强化营销节奏`;
                    }
                    if (purchasePressureMonths > 0) {
                        return `${purchasePressureMonths} 个月份采购超预算，建议复核销售预测与库存目标，必要时调整采购节奏`;
                    }
                    return `${MONTH_LABELS[currentMonth - 1]}销售节奏整体健康，持续跟踪库存与到货节奏即可`;
                })();
                const tone = p0RiskCount > 0 || (maxPurchase?.budgetDiff ?? 0) > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : (maxInventory?.stockToSalesRatio ?? 0) > 4
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-sky-50 border-sky-200 text-sky-700';
                return (
                    <div className={`rounded-xl border px-4 py-2.5 text-xs flex items-start gap-2 ${tone}`}>
                        <span className="font-bold text-[13px] shrink-0">💡</span>
                        <div>
                            <span className="font-semibold mr-1">决策建议：</span>
                            <span>{recommendation}</span>
                        </div>
                    </div>
                );
            })()}

            {/* 4. Scenario control bar */}
            <MonthlyRollingControlBar
                scenario={scenario}
                setScenario={loadScenario}
                saveScenario={saveScenario}
                resetScenario={resetToVirtualData}
                exportCsv={exportCsv}
                savedAt={savedAt}
                isManualMode={isManualMode}
                isLockedScenario={isLockedScenario}
            />

            {/* 5. Monthly trend chart */}
            <MonthlyRollingTrendChart
                rows={rolling.rows}
                risks={rolling.risks}
                currentMonth={currentMonth}
                currencyUnit={currencyUnit}
                factSalesByMonth={factSalesByMonth}
                annualPurchaseBudget={annualPurchaseBudget}
            />

            {/* 6. Cashflow timeline small card (P2) */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-800 text-sm">现金流时间线</h3>
                        <p className="text-xs text-slate-400 mt-0.5">绿=销售回款 · 红=采购付款 · 圆圈=现金缺口月</p>
                    </div>
                </div>
                <div className="px-4 py-3 overflow-x-auto">
                    <div className="min-w-[760px] flex gap-1 items-end h-[80px]">
                        {cashflowTimeline.map((item) => {
                            const maxFlow = Math.max(1, ...cashflowTimeline.map((i) => Math.max(i.salesInflow, i.purchaseOutflow)));
                            const inflowH = `${(item.salesInflow / maxFlow) * 100}%`;
                            const outflowH = `${(item.purchaseOutflow / maxFlow) * 100}%`;
                            return (
                                <div key={item.month} className="flex-1 flex flex-col items-center gap-0.5">
                                    <div className="flex items-end gap-0.5 h-[60px]">
                                        <div className="w-2 rounded-t bg-emerald-400" style={{ height: inflowH }} title={`回款 ${toSafeCurrency(item.salesInflow, currencyUnit)}`} />
                                        <div className="w-2 rounded-t bg-rose-400" style={{ height: outflowH }} title={`付款 ${toSafeCurrency(item.purchaseOutflow, currencyUnit)}`} />
                                    </div>
                                    {item.isShortage ? <div className="w-2 h-2 rounded-full bg-rose-500 border border-white" title="现金缺口月" /> : <div className="w-2 h-2" />}
                                    <span className="text-[8px] text-slate-400">{item.month}月</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 7. Last month action review (conditional, P2) */}
            {lastMonthReview.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3.5">
                    <h3 className="font-semibold text-slate-800 text-sm mb-3">{MONTH_LABELS[currentMonth - 2]} 动作执行回顾 ({lastMonthReview.length} 项)</h3>
                    <div className="space-y-2">
                        {lastMonthReview.map(({ action, executed }, i) => (
                            <div key={i} className={`rounded-lg px-3 py-2 text-xs border ${executed ? (executed.achievementPct !== null && executed.achievementPct >= 0.9 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700') : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                <span className="font-medium">{executed ? (executed.achievementPct !== null && executed.achievementPct >= 0.9 ? '✓' : '⚠') : '○'} {actionLabel(action.action)}</span>
                                {' '} 建议 {toSafeCurrency(action.impactAmount, currencyUnit)}
                                {executed ? (
                                    <> · 实际执行 {executed.executedAmount !== null ? toSafeCurrency(executed.executedAmount, currencyUnit) : '--'}
                                    {executed.achievementPct !== null ? ` (达成 ${(executed.achievementPct * 100).toFixed(0)}%)` : ''}</>
                                ) : ' · 暂无执行记录'}
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* 8. Detail table */}
            <MonthlyOTBEditableTable
                rows={rolling.rows}
                risks={rolling.risks}
                currencyUnit={currencyUnit}
                isReadonly={isCoreReadonly}
                editNotice={editNotice}
                onEditAttempt={onEditAttempt}
                onChange={updateRow}
                factSalesByMonth={factSalesByMonth}
            />

            {/* 9. Merged risk + action panel */}
            <MonthlyRollingRiskActionPanel risks={rolling.risks} actions={rolling.actions} currencyUnit={currencyUnit} />

            {/* 10. Scenario comparison (P2) */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => setScenarioCompareOpen((v) => !v)}
                    className="w-full px-5 py-3 text-left flex items-center justify-between hover:bg-slate-50"
                >
                    <span className="text-sm font-semibold text-slate-700">⚙ 3 场景对比</span>
                    <span className="text-xs text-slate-400">{scenarioCompareOpen ? '▴ 收起' : '▾ 展开'}</span>
                </button>
                {scenarioCompareOpen ? (
                    <div className="px-5 pb-4 overflow-x-auto">
                        <table className="min-w-[480px] w-full text-xs">
                            <thead className="text-slate-500">
                                <tr className="border-b border-slate-100">
                                    <th className="py-2 text-left">指标</th>
                                    <th className="py-2 text-right">标准版</th>
                                    <th className="py-2 text-right">保守版</th>
                                    <th className="py-2 text-right">乐观版</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scenarioCompareRows.map((row) => (
                                    <tr key={row.label} className="border-t border-slate-50">
                                        <td className="py-1.5 text-slate-600">{row.label}</td>
                                        {(['standard', 'conservative', 'optimistic'] as const).map((k) => (
                                            <td key={k} className={`py-1.5 text-right font-medium ${k === scenario ? 'text-sky-600' : 'text-slate-700'}`}>
                                                {typeof row[k] === 'number' ? toSafeCurrency(row[k] as number, currencyUnit) : String(row[k])}
                                                {k === scenario ? ' ★' : ''}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>

            {/* ? Help popup */}
            <button
                onClick={() => setHelpOpen((v) => !v)}
                className="fixed bottom-6 right-6 z-50 w-9 h-9 rounded-full bg-sky-500 text-white text-sm font-bold shadow-lg hover:bg-sky-600 flex items-center justify-center"
                title="字段说明"
            >
                ?
            </button>
            {helpOpen ? (
                <div className="fixed bottom-16 right-6 z-50 w-80 bg-sky-50 border border-sky-200 rounded-xl shadow-xl p-4 text-xs text-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sky-800">字段公式说明</span>
                        <button onClick={() => setHelpOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                    <p><strong>月初库存</strong> = 上月月末库存</p>
                    <p><strong>销售预测</strong> = 用户输入或历史模型</p>
                    <p><strong>销售成本</strong> = 销售预测 × 折扣率 ÷ 倍率</p>
                    <p><strong>月末目标库存</strong> = 销售成本 × 存销比</p>
                    <p><strong>采购需金额</strong> = 月末目标库存 + 销售成本 - 月初库存</p>
                    <p><strong>实际所需采购</strong> = 采购需金额 ÷ 到货率</p>
                    <p><strong>差异金额</strong> = 实际所需采购 - 原预算</p>
                    <hr className="border-sky-200 my-1.5" />
                    <p><strong>已锁定 (actual)</strong>：业务日期之前月份，使用 fact_sales</p>
                    <p><strong>当前月 (current)</strong>：业务日期所在月，实际+预测</p>
                    <p><strong>预测月 (forecast)</strong>：未来月份，OTB 模型</p>
                </div>
            ) : null}

            {virtualLoop.diagnostics.map((diagnosis, index) => (
                <div key={`${diagnosis}-${index}`} className="px-4 py-3 rounded-xl text-xs bg-amber-50 border border-amber-100 text-amber-700">
                    {diagnosis}
                </div>
            ))}
        </div>
    );
}
