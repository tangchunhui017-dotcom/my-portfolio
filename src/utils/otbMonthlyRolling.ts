import type { MonthlyOTBInput, MonthlyOTBRow, MonthlyRollingState } from '@/utils/otbCalculations';
import { calcMonthlyOTB, calcRollingOTBRebalance, safeDiv, safeNumber } from '@/utils/otbCalculations';

export type MonthStatus = 'actual' | 'current' | 'forecast';

export type MonthlyRollingRiskType =
    | 'healthy'
    | 'stockout'
    | 'overstock'
    | 'purchase_pressure'
    | 'arrival_shortage'
    | 'sales_gap'
    | 'cashflow_pressure';

export type MonthlyAction =
    | '补货'
    | '减单'
    | '暂停采购'
    | '调拨'
    | '清货'
    | '转奥莱'
    | '追加预算'
    | '延后付款';

export interface MonthlyRollingRisk {
    month: number;
    level: 'healthy' | 'warning' | 'danger';
    riskType: MonthlyRollingRiskType;
    title: string;
    message: string;
    action: string;
}

export interface MonthlyRollingAction {
    month: number;
    riskType: MonthlyRollingRiskType;
    action: MonthlyAction;
    impactAmount: number;
    priority: '高' | '中' | '低';
    owner: string;
}

export interface MonthlyRollingRow extends MonthlyOTBRow {
    monthStatus: MonthStatus;
    sourceLabel: string;
    isManualOverride: boolean;
    originalPlanSales: number;
    salesCashIn: number;
    purchasePayment: number;
}

interface MonthlyRiskContext {
    nextMonthSalesCost: number;
    originalPlanSales: number;
    salesCashIn: number;
    purchasePayment: number;
}

export interface MonthlyRollingCalcContext {
    month1Beginning: number;
    currentMonth: number; // 1-12
    annualSalesTarget: number;
    annualPurchaseBudget: number;
    rollingState: MonthlyRollingState;
    baselineInputs: MonthlyOTBInput[];
    manualOverrideKeys?: Set<string>;
}

export interface MonthlyRollingCalcResult {
    rows: MonthlyRollingRow[];
    summary: {
        currentRollingMonth: number;
        actualMonths: number;
        forecastMonths: number;
        annualSalesForecast: number;
        annualPurchaseNeed: number;
        annualBudgetDiff: number;
        maxPurchasePressureMonth: number;
        maxInventoryRiskMonth: number;
        requiredGrowthRateForRemainingMonths: number;
    };
    risks: MonthlyRollingRisk[];
    actions: MonthlyRollingAction[];
}

function sanitizeMonth(month: number) {
    return Math.min(12, Math.max(1, Math.round(month)));
}

function getMonthStatus(month: number, currentMonth: number): MonthStatus {
    if (month < currentMonth) return 'actual';
    if (month === currentMonth) return 'current';
    return 'forecast';
}

function actionForRisk(riskType: MonthlyRollingRiskType, level: 'healthy' | 'warning' | 'danger'): MonthlyAction {
    if (riskType === 'healthy') return '暂停采购';
    if (riskType === 'stockout') return '补货';
    if (riskType === 'overstock') return level === 'danger' ? '转奥莱' : '清货';
    if (riskType === 'purchase_pressure') return '追加预算';
    if (riskType === 'arrival_shortage') return '调拨';
    if (riskType === 'sales_gap') return '减单';
    if (riskType === 'cashflow_pressure') return '延后付款';
    return '暂停采购';
}

function ownerForRisk(riskType: MonthlyRollingRiskType) {
    if (riskType === 'healthy') return '商品';
    if (riskType === 'stockout' || riskType === 'arrival_shortage') return '商品/供应链';
    if (riskType === 'overstock' || riskType === 'sales_gap') return '商品/渠道';
    if (riskType === 'cashflow_pressure' || riskType === 'purchase_pressure') return '商品/财务';
    return '商品';
}

export function monthlyRollingRiskTypeLabel(riskType: MonthlyRollingRiskType) {
    const labels: Record<MonthlyRollingRiskType, string> = {
        healthy: '状态健康',
        stockout: '缺货风险',
        overstock: '积压风险',
        purchase_pressure: '采购压力',
        arrival_shortage: '到货不足',
        sales_gap: '销售缺口',
        cashflow_pressure: '现金流压力',
    };
    return labels[riskType];
}

const RISK_PRIORITY: Record<MonthlyRollingRiskType, number> = {
    healthy: 0,
    sales_gap: 10,
    overstock: 20,
    arrival_shortage: 30,
    purchase_pressure: 40,
    cashflow_pressure: 50,
    stockout: 60,
};

function riskLevelRank(level: MonthlyRollingRisk['level']) {
    if (level === 'danger') return 3;
    if (level === 'warning') return 2;
    return 1;
}

function sortMonthlyRisks(risks: MonthlyRollingRisk[]) {
    return [...risks].sort((a, b) => {
        const levelDiff = riskLevelRank(b.level) - riskLevelRank(a.level);
        if (levelDiff !== 0) return levelDiff;
        return RISK_PRIORITY[b.riskType] - RISK_PRIORITY[a.riskType];
    });
}

export function diagnoseMonthlyRollingRisks(
    row: MonthlyRollingRow,
    context: MonthlyRiskContext,
): MonthlyRollingRisk[] {
    const risks: MonthlyRollingRisk[] = [];

    if (row.endingInventoryCost < context.nextMonthSalesCost * 1.2) {
        risks.push({
            month: row.month,
            level: 'danger',
            riskType: 'stockout',
            title: '缺货风险',
            message: '月末库存低于下月销售成本 1.2 倍，存在缺货风险。',
            action: '提前锁定主推款补货或跨渠道调拨。',
        });
    }

    if (row.stockToSalesRatio > 4) {
        risks.push({
            month: row.month,
            level: 'warning',
            riskType: 'overstock',
            title: '积压风险',
            message: '存销比高于 4，库存周转压力偏高。',
            action: '减少后续采购，增加清货和奥莱承接。',
        });
    }

    if (row.actualPurchaseRequiredAmount > row.originalPurchaseBudget * 1.2) {
        risks.push({
            month: row.month,
            level: 'danger',
            riskType: 'purchase_pressure',
            title: '采购压力',
            message: '实际采购需求高于原预算 20% 以上。',
            action: '复核销售预测，必要时提交追加预算。',
        });
    }

    if (row.arrivalRate < 0.85) {
        risks.push({
            month: row.month,
            level: 'warning',
            riskType: 'arrival_shortage',
            title: '到货不足',
            message: '到货率低于 85%，上市节奏可能受影响。',
            action: '跟进供应链交期，优先保障主推波段。',
        });
    }

    if (row.salesForecast < context.originalPlanSales * 0.9) {
        risks.push({
            month: row.month,
            level: 'warning',
            riskType: 'sales_gap',
            title: '销售缺口',
            message: '销售预测低于原计划 10% 以上。',
            action: '降低后续采购或调整价格带结构。',
        });
    }

    if (context.purchasePayment > context.salesCashIn) {
        risks.push({
            month: row.month,
            level: 'danger',
            riskType: 'cashflow_pressure',
            title: '现金流压力',
            message: '采购付款高于销售回款，现金流承压。',
            action: '延后非核心波段下单，优化付款节奏。',
        });
    }

    if (risks.length === 0) {
        risks.push({
            month: row.month,
            level: 'healthy',
            riskType: 'healthy',
            title: '状态健康',
            message: '当月销售、库存与采购节奏基本匹配。',
            action: '按当前节奏执行，持续跟踪波段兑现。',
        });
    }

    return sortMonthlyRisks(risks);
}

export function diagnoseMonthlyRollingRisk(
    row: MonthlyRollingRow,
    context: MonthlyRiskContext,
): MonthlyRollingRisk {
    return diagnoseMonthlyRollingRisks(row, context)[0];
}

export function calcMonthlyRollingOTB(
    inputs: MonthlyOTBInput[],
    context: MonthlyRollingCalcContext,
): MonthlyRollingCalcResult {
    const currentMonth = sanitizeMonth(context.currentMonth);
    const baselineInputs = context.baselineInputs.length > 0 ? context.baselineInputs : inputs;
    const baseAnnualSalesTarget = safeNumber(context.annualSalesTarget)
        ?? baselineInputs.reduce((sum, row) => sum + (safeNumber(row.salesForecast) ?? 0), 0);
    const baseAnnualPurchaseBudget = safeNumber(context.annualPurchaseBudget)
        ?? baselineInputs.reduce((sum, row) => sum + (safeNumber(row.originalPurchaseBudget) ?? 0), 0);

    const monthIndexes = inputs.map((_, idx) => idx);
    const actualMonthIndexes = monthIndexes.filter((idx) => idx + 1 < currentMonth);
    const effectiveLockedMonths = Array.from(new Set([
        ...context.rollingState.lockedMonths,
        ...actualMonthIndexes,
    ])).sort((a, b) => a - b);

    const rebalanceState: MonthlyRollingState = {
        ...context.rollingState,
        lockedMonths: effectiveLockedMonths,
    };

    const rebalancedInputs = calcRollingOTBRebalance(inputs, rebalanceState, baseAnnualPurchaseBudget);
    const calculatedRows = calcMonthlyOTB(rebalancedInputs, context.month1Beginning);

    const rows: MonthlyRollingRow[] = calculatedRows.map((row, idx) => {
        const month = idx + 1;
        const monthStatus = getMonthStatus(month, currentMonth);
        const actualPurchase = context.rollingState.actualPurchaseAmount[idx];
        const actualArrival = context.rollingState.actualArrivalAmount[idx];
        const actualEnding = context.rollingState.actualEndingInventory[idx];
        const originalPlanSales = safeNumber(baselineInputs[idx]?.salesForecast) ?? row.salesForecast;

        let arrivalRate = row.arrivalRate;
        if (monthStatus === 'actual' && safeNumber(actualPurchase) !== null && safeNumber(actualArrival) !== null && actualPurchase > 0) {
            const ratio = safeDiv(actualArrival, actualPurchase);
            arrivalRate = ratio === null ? row.arrivalRate : Math.max(0.01, Math.min(1.5, ratio));
        }

        const overriddenActualPurchase = monthStatus === 'actual' && safeNumber(actualPurchase) !== null
            ? actualPurchase
            : row.actualPurchaseRequiredAmount;
        const overriddenEnding = monthStatus === 'actual' && safeNumber(actualEnding) !== null
            ? actualEnding
            : row.endingInventoryCost;

        const budgetDiff = overriddenActualPurchase - row.originalPurchaseBudget;
        const budgetDiffRate = row.originalPurchaseBudget > 0 ? safeDiv(budgetDiff, row.originalPurchaseBudget) : null;
        const salesCashIn = row.salesForecast * 0.9;
        const purchasePayment = overriddenActualPurchase * 0.85;

        return {
            ...row,
            monthStatus,
            sourceLabel: monthStatus === 'actual' ? 'fact_sales 实际数据' : monthStatus === 'current' ? '实际 + 预测' : 'forecast / OTB 模型预测',
            isManualOverride: context.manualOverrideKeys?.has(`${idx}:salesForecast`)
                || context.manualOverrideKeys?.has(`${idx}:markupRate`)
                || context.manualOverrideKeys?.has(`${idx}:discountRate`)
                || context.manualOverrideKeys?.has(`${idx}:stockToSalesRatio`)
                || context.manualOverrideKeys?.has(`${idx}:arrivalRate`)
                || context.manualOverrideKeys?.has(`${idx}:originalPurchaseBudget`)
                || false,
            arrivalRate,
            endingInventoryCost: overriddenEnding,
            actualPurchaseRequiredAmount: overriddenActualPurchase,
            budgetDiff,
            budgetDiffRate,
            originalPlanSales,
            salesCashIn,
            purchasePayment,
        };
    });

    const annualSalesForecast = rows.reduce((sum, row) => sum + row.salesForecast, 0);
    const annualPurchaseNeed = rows.reduce((sum, row) => sum + row.actualPurchaseRequiredAmount, 0);
    const annualBudgetDiff = annualPurchaseNeed - baseAnnualPurchaseBudget;

    const actualSalesToDate = rows
        .filter((row) => row.monthStatus === 'actual')
        .reduce((sum, row) => sum + row.salesForecast, 0);
    const remainingForecast = rows
        .filter((row) => row.monthStatus !== 'actual')
        .reduce((sum, row) => sum + row.salesForecast, 0);
    const requiredGrowthRateForRemainingMonths = remainingForecast > 0
        ? Math.max(-1, (baseAnnualSalesTarget - actualSalesToDate) / remainingForecast - 1)
        : 0;

    const maxPurchasePressureRow = rows.reduce((max, row) => {
        if (row.budgetDiff > max.budgetDiff) return row;
        return max;
    }, rows[0]);

    const maxInventoryRiskRow = rows.reduce((max, row, idx) => {
        const nextMonthSales = rows[idx + 1]?.salesCost ?? row.salesCost;
        const currentRisk = nextMonthSales > 0 ? row.endingInventoryCost / nextMonthSales : 999;
        const maxRisk = nextMonthSales > 0 ? max.endingInventoryCost / (rows[(max.month - 1) + 1]?.salesCost ?? max.salesCost) : 999;
        return currentRisk < maxRisk ? row : max;
    }, rows[0]);

    const risks = rows.flatMap((row, idx) => diagnoseMonthlyRollingRisks(row, {
        nextMonthSalesCost: rows[idx + 1]?.salesCost ?? row.salesCost,
        originalPlanSales: row.originalPlanSales,
        salesCashIn: row.salesCashIn,
        purchasePayment: row.purchasePayment,
    }));

    const actions: MonthlyRollingAction[] = risks
        .filter((risk) => risk.level !== 'healthy')
        .map((risk) => {
            const row = rows[risk.month - 1];
            const impactAmount = Math.max(
                0,
                risk.riskType === 'sales_gap'
                    ? row.originalPlanSales - row.salesForecast
                    : risk.riskType === 'stockout'
                      ? Math.max(0, ((rows[risk.month]?.salesCost ?? row.salesCost) * 1.2) - row.endingInventoryCost)
                      : Math.abs(row.budgetDiff),
            );
            return {
                month: risk.month,
                riskType: risk.riskType,
                action: actionForRisk(risk.riskType, risk.level),
                impactAmount,
                priority: risk.level === 'danger' ? '高' : '中',
                owner: ownerForRisk(risk.riskType),
            };
        });

    return {
        rows,
        summary: {
            currentRollingMonth: currentMonth,
            actualMonths: rows.filter((row) => row.monthStatus === 'actual').length,
            forecastMonths: rows.filter((row) => row.monthStatus === 'forecast').length,
            annualSalesForecast,
            annualPurchaseNeed,
            annualBudgetDiff,
            maxPurchasePressureMonth: maxPurchasePressureRow.month,
            maxInventoryRiskMonth: maxInventoryRiskRow.month,
            requiredGrowthRateForRemainingMonths,
        },
        risks,
        actions,
    };
}

// ─── New utility functions ────────────────────────────────────────────────────

export interface MonthlyAchievementProgress {
    cumulativeActual: number;
    cumulativePlan: number;
    achievementRate: number;
    timeProgress: number;
    deviation: number;
}

export function calcMonthlyAchievementProgress(
    rows: MonthlyRollingRow[],
    rollingState: MonthlyRollingState,
    currentMonth: number,
): MonthlyAchievementProgress {
    const actualRows = rows.filter((r) => r.monthStatus === 'actual');
    const cumulativeActual = actualRows.reduce((sum, r) => {
        const actual = rollingState.actualSales[r.month - 1];
        return sum + (typeof actual === 'number' ? actual : r.salesForecast);
    }, 0);
    const cumulativePlan = actualRows.reduce((sum, r) => sum + r.originalPlanSales, 0);
    const achievementRate = cumulativePlan > 0 ? safeDiv(cumulativeActual, cumulativePlan) ?? 1 : 1;
    const timeProgress = (currentMonth - 1) / 12;
    const deviation = achievementRate - timeProgress;
    return { cumulativeActual, cumulativePlan, achievementRate, timeProgress, deviation };
}

export interface CashflowTimelineItem {
    month: number;
    salesInflow: number;
    purchaseOutflow: number;
    netCashflow: number;
    cumulativeNet: number;
    isShortage: boolean;
}

export function calcCashflowTimeline(rows: MonthlyRollingRow[]): CashflowTimelineItem[] {
    let cumulativeNet = 0;
    return rows.map((row) => {
        const salesInflow = row.salesCashIn;
        const purchaseOutflow = row.purchasePayment;
        const netCashflow = salesInflow - purchaseOutflow;
        cumulativeNet += netCashflow;
        return {
            month: row.month,
            salesInflow,
            purchaseOutflow,
            netCashflow,
            cumulativeNet,
            isShortage: netCashflow < 0,
        };
    });
}

export interface ScenarioComparisonRow {
    label: string;
    standard: string | number;
    conservative: string | number;
    optimistic: string | number;
}

export function compareThreeScenarios(scenarios: {
    standard?: MonthlyRollingCalcResult;
    conservative?: MonthlyRollingCalcResult;
    optimistic?: MonthlyRollingCalcResult;
}): ScenarioComparisonRow[] {
    const s = scenarios.standard?.summary;
    const c = scenarios.conservative?.summary;
    const o = scenarios.optimistic?.summary;
    return [
        { label: '年度销售预测', standard: s?.annualSalesForecast ?? '--', conservative: c?.annualSalesForecast ?? '--', optimistic: o?.annualSalesForecast ?? '--' },
        { label: '年度净采购', standard: s?.annualPurchaseNeed ?? '--', conservative: c?.annualPurchaseNeed ?? '--', optimistic: o?.annualPurchaseNeed ?? '--' },
        { label: '最大压力月', standard: s ? `${s.maxPurchasePressureMonth}月` : '--', conservative: c ? `${c.maxPurchasePressureMonth}月` : '--', optimistic: o ? `${o.maxPurchasePressureMonth}月` : '--' },
        { label: '年度预算差异', standard: s?.annualBudgetDiff ?? '--', conservative: c?.annualBudgetDiff ?? '--', optimistic: o?.annualBudgetDiff ?? '--' },
    ];
}

export interface ExecutedAction {
    actionId: string;
    suggestedAmount: number;
    executedAmount: number | null;
    achievementPct: number | null;
}

export function reviewLastMonthActions(
    actions: MonthlyRollingAction[],
    executedRecord: Record<number, ExecutedAction[]>,
    currentMonth: number,
): Array<{ action: MonthlyRollingAction; executed: ExecutedAction | null }> {
    const lastMonth = currentMonth - 1;
    if (lastMonth < 1) return [];
    const lastMonthActions = actions.filter((a) => a.month === lastMonth);
    const executed = executedRecord[lastMonth] ?? [];
    return lastMonthActions.map((action) => {
        const found = executed.find((e) => e.actionId === `${action.month}-${action.riskType}`) ?? null;
        return { action, executed: found };
    });
}
