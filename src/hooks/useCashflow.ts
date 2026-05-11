'use client';
/**
 * src/hooks/useCashflow.ts
 * 月度现金流计算 Hook — 自动/手工支出分拆，OTB 波段计划联动
 */
import { useMemo } from 'react';
import { useCashflowAssumptions, useFactInventory } from './useDashboardData';
import { useForecast } from './useForecast';
import type { ForecastScenario } from './useForecast';
import { useGlobalConfig } from '@/context/GlobalConfigContext';
import { WAVE_PLAN_MASTER } from '@/utils/wavePlanMaster';
import otbExecutionTrackingRaw from '../../data/otb/otb_execution_tracking.json';
import purchasePaymentPlanRaw from '../../data/planning/purchase_payment_plan.json';
import cashflowAssumptionsFallback from '../../data/dashboard/cashflow_assumptions.json';
import factInventoryFallback from '../../data/dashboard/fact_inventory.json';

export type CashflowAlertLevel = 'safe' | 'warning' | 'danger';

export type SpendCategory = '采购付款' | '营销费用' | '人力成本' | '租金/办公' | '其他/手工';

export interface MonthlyCashflow {
    month: number;
    label: string;
    openingBalance: number;
    collection: number;
    otbDeposit: number;
    otbBalance: number;
    fixedExpenses: number;
    variableExpenses: number;
    // v2.1: split
    autoExpenses: number;
    manualExpenses: number;
    totalExpenses: number;
    netCashflow: number;
    closingBalance: number;
    alertLevel: CashflowAlertLevel;
    // v3.0: new
    cashRunwayMonths: number;
    otbPaymentShare: number; // OTB付款占总支出比
    yoyDelta: number | null;
    // v3.1: new
    spendByCategory: Record<SpendCategory, number>;
    paymentMinusCollection: number; // OTB付款 - 销售回款（正=净流出）
}

export interface CreditPool {
    total: number;
    used: number;
    available: number;
    expireDate: string;
}

export interface CashflowEvent {
    month: number;
    label: string;
    title: string;
    type: 'payment' | 'collection' | 'milestone';
    amount?: number;
}

export interface CashflowScenarioComparison {
    label: string;
    yearEndBalance: number;
    netCashflow: number;
    maxGapMonth: number | null;
    maxGapAmount: number;
    dangerMonthCount: number;
    breachSafetyMonthCount: number;
    suggestedCredit: number;
}

export interface CashflowResult {
    monthly: MonthlyCashflow[];
    totalCollection: number;
    totalExpenses: number;
    netCashflow: number;
    yearEndBalance: number;
    maxGapMonth: number | null;
    maxGapAmount: number;
    dangerMonths: number[];
    warningMonths: number[];
    breachSafetyMonths: number[]; // v3.0
    // v2.1
    manualOutflowTop3Months: Array<{ month: number; label: string; manualTotal: number }>;
    // P3: OTB 预算来源
    otbSource: 'plan' | 'engine' | 'uniform';
    // OTB linkage
    otbPlannedPurchaseAmount: number;
    otbOrderedAmount: number;
    otbArrivedAmount: number;
    otbPaymentTotal: number;
    paymentToCollectionRatio: number | null;
    inventoryCashPressure: number;
    cashflowAdvice: string[];
    // v3.0: new aggregate metrics
    cashSafetyMonths: number;        // 年未余额 / 月均支出
    averageMonthlySpend: number;
    dso: number | null;              // Days Sales Outstanding
    dpo: number | null;              // Days Payable Outstanding
    ccc: number | null;              // Cash Conversion Cycle
    // v3.1: new
    creditPool: CreditPool;          // 授信额度池
    spendByCategoryAnnual: Record<SpendCategory, number>; // 年度支出按科目
    consecutiveBreachRanges: Array<{ start: number; end: number; length: number }>; // 连续跌破水位月段
    suggestedCreditAmount: number;   // 建议授信额度（=最大缺口绝对值 × 1.2 安全系数）
}

export interface CashflowSimulationOptions {
    delayOtbPaymentsMonths?: number;
    reduceFirstOtbRate?: number;
    extraOpeningCash?: number;
    clearanceInventoryRate?: number;
    clearanceDiscount?: number;
    clearanceMonth?: number;
    // v3.0: new P0 options
    depositLeadMonths?: number;     // OTB定金提前N月（覆盖假设文件）
    balanceLeadMonths?: number;     // OTB尾款提前N月
    cashSafetyThreshold?: number;   // 现金安全水位（默认500万）
    // v3.1: new
    collectionLagDays?: number;     // 销售回款滞后N天（覆盖月口径）
    creditTotal?: number;           // 授信总额度（默认 3000 万）
    creditUsed?: number;            // 已用授信
    creditExpireDate?: string;      // 授信到期日
}

interface CashflowAssumptions {
    initialCash: number;
    collectionTerms: {
        physical: { lagMonths: number };
        ecommerce: { lagMonths: number };
        franchise: { lagMonths: number };
    };
    otbPaymentSchedule: {
        deposit: { rateOfBudget: number; leadMonths: number };
        balance: { rateOfBudget: number; leadMonths: number };
    };
    fixedMonthlyExpenses: Record<string, number>;
    variableExpenseRates: Record<string, number>;
    alertThresholds: { safe: number; warning: number };
    channelRevenueSplit: { physical: number; ecommerce: number; franchise: number };
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function delayPayments(values: number[], delayMonths: number): number[] {
    if (delayMonths <= 0) return values;
    const shifted = Array(12).fill(0);
    values.forEach((value, index) => {
        const targetIndex = index + delayMonths;
        if (targetIndex < 12) shifted[targetIndex] += value;
    });
    return shifted;
}

interface InventoryRow {
    date?: string;
    inventory_amount?: number | string;
}

interface OTBExecutionTrackingSourceRow {
    plannedPurchaseAmount?: number;
    orderedAmount?: number;
    arrivedAmount?: number;
}

interface WaveOtbPlanSourceRow {
    launchDate?: string;
    launch_date?: string;
    planOtbBudget?: number;
    plan_otb_budget?: number;
}

interface PurchasePaymentPlanSourceRow {
    paymentNode?: 'deposit' | 'balance' | string;
    paymentMonth?: number;
    paymentDate?: string;
    paymentAmount?: number;
}

function monthFromDate(rawDate: string | undefined): number {
    if (!rawDate) return 0;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return 0;
    return parsed.getMonth() + 1;
}

function reduceFirstOtbPayments(deposit: number[], balance: number[], reduceRate: number) {
    if (reduceRate <= 0) return { deposit, balance };
    const nextDeposit = [...deposit];
    const nextBalance = [...balance];
    let reducedMonths = 0;
    for (let i = 0; i < 12; i++) {
        if (nextDeposit[i] + nextBalance[i] <= 0) continue;
        nextDeposit[i] *= (1 - reduceRate);
        nextBalance[i] *= (1 - reduceRate);
        reducedMonths += 1;
        if (reducedMonths >= 2) break;
    }
    return { deposit: nextDeposit, balance: nextBalance };
}

export function useCashflow(scenario: ForecastScenario, simulation: CashflowSimulationOptions = {}): CashflowResult | null {
    const { data: cfAssRemote } = useCashflowAssumptions() as { data: CashflowAssumptions | undefined };
    const physForecast = useForecast('physical', scenario);
    const ecomForecast = useForecast('ecommerce', scenario);
    const newStoreForecast = useForecast('new_store', scenario);
    const { data: factInventoryRaw } = useFactInventory();
    const { config: globalConfig } = useGlobalConfig();
    const cfAss = cfAssRemote ?? (cashflowAssumptionsFallback as CashflowAssumptions);

    return useMemo(() => {
        if (!cfAss || !physForecast || !ecomForecast || !newStoreForecast) return null;

        const terms = cfAss.collectionTerms;
        const schedule = cfAss.otbPaymentSchedule;
        const fixedTotal = Object.values(cfAss.fixedMonthlyExpenses).reduce((s, v) => s + v, 0);
        const varRate = Object.values(cfAss.variableExpenseRates).reduce((s, v) => s + v, 0);
        const thresholds = cfAss.alertThresholds;

        // Manual outflows from GlobalConfig
        const manualOutflows = globalConfig.cashflowManualOutflows;
        const manualByMonth: number[] = Array(12).fill(0);
        for (let i = 0; i < 12; i++) {
            Object.values(manualOutflows).forEach(arr => { manualByMonth[i] += arr[i] ?? 0; });
        }

        // 月度收入各渠道：useForecast 已经是渠道口径，不能再乘 channelRevenueSplit。
        const physRevByMonth = physForecast.monthly.map(m => m.forecastRevenue);
        const ecomRevByMonth = ecomForecast.monthly.map(m => m.forecastRevenue);
        const newStoreRevByMonth = newStoreForecast.monthly.map(m => m.forecastRevenue);
        const franRevByMonth = Array(12).fill(0);

        // 月度回款
        const collectionByMonth: number[] = Array(12).fill(0);
        for (let i = 0; i < 12; i++) {
            collectionByMonth[i] += (physRevByMonth[i] + newStoreRevByMonth[i]) * (1 - terms.physical.lagMonths);
            collectionByMonth[i] += ecomRevByMonth[i] * 0.5;
            if (i > 0) collectionByMonth[i] += ecomRevByMonth[i - 1] * 0.5;
            if (i > 0) collectionByMonth[i] += franRevByMonth[i - 1];
        }

        // 应用 collectionLagDays 滞后（按 30 天=1月折算）
        if (simulation.collectionLagDays && simulation.collectionLagDays > 0) {
            const lagMonths = Math.round(simulation.collectionLagDays / 30);
            if (lagMonths > 0) {
                const shifted = Array(12).fill(0);
                collectionByMonth.forEach((v, i) => {
                    const targetIdx = i + lagMonths;
                    if (targetIdx < 12) shifted[targetIdx] += v;
                });
                collectionByMonth.splice(0, 12, ...shifted);
            }
        }

        if (simulation.clearanceInventoryRate && simulation.clearanceInventoryRate > 0) {
            const inventoryRows: InventoryRow[] = Array.isArray(factInventoryRaw)
                ? factInventoryRaw
                : (factInventoryFallback as InventoryRow[]);
            const latestDate = inventoryRows.reduce((max, row) => row.date && row.date > max ? row.date : max, '');
            const inventoryCapital = inventoryRows
                .filter(row => row.date === latestDate)
                .reduce((sum, row) => sum + Number(row.inventory_amount || 0), 0);
            const clearanceCashIn = inventoryCapital * simulation.clearanceInventoryRate * (simulation.clearanceDiscount ?? 0.5);
            const targetMonthIndex = Math.max(0, Math.min(11, (simulation.clearanceMonth ?? 1) - 1));
            collectionByMonth[targetMonthIndex] += clearanceCashIn;
        }

        // OTB付款：优先读取统一planning付款排期；若缺失或模拟调整账期，则回退到波段预算推导。
        let otbSource: 'plan' | 'engine' | 'uniform' = 'plan';
        let depositByMonth: number[] = Array(12).fill(0);
        let balanceByMonth: number[] = Array(12).fill(0);

        const hasLeadSimulation = simulation.depositLeadMonths !== undefined || simulation.balanceLeadMonths !== undefined;
        if (!hasLeadSimulation) {
            (purchasePaymentPlanRaw as PurchasePaymentPlanSourceRow[]).forEach((row) => {
                const month = Number(row.paymentMonth) || monthFromDate(row.paymentDate);
                const amount = Number(row.paymentAmount || 0);
                if (month < 1 || month > 12 || amount <= 0) return;
                if (row.paymentNode === 'deposit') depositByMonth[month - 1] += amount;
                else balanceByMonth[month - 1] += amount;
            });
        }

        const plannedPaymentTotal = depositByMonth.reduce((s, v) => s + v, 0) + balanceByMonth.reduce((s, v) => s + v, 0);
        if (plannedPaymentTotal === 0 || hasLeadSimulation) {
            const otbByMonth: number[] = Array(12).fill(0);
            const wavePlanRows = WAVE_PLAN_MASTER as WaveOtbPlanSourceRow[];
            wavePlanRows.forEach((row) => {
                const month = monthFromDate(row.launchDate ?? row.launch_date);
                const budget = Number(row.planOtbBudget ?? row.plan_otb_budget ?? 0);
                if (month >= 1 && month <= 12) otbByMonth[month - 1] += budget;
            });
            const totalPlanOtbBudget = otbByMonth.reduce((s, v) => s + v, 0);
            if (totalPlanOtbBudget === 0) {
                otbSource = 'uniform';
                const annualOtbTotal = (otbExecutionTrackingRaw as OTBExecutionTrackingSourceRow[])
                    .reduce((sum, row) => sum + Number(row.plannedPurchaseAmount || 0), 0);
                for (let i = 0; i < 12; i++) otbByMonth[i] = annualOtbTotal / 12;
            }

            depositByMonth = Array(12).fill(0);
            balanceByMonth = Array(12).fill(0);
            const effectiveDepositLead = simulation.depositLeadMonths ?? schedule.deposit.leadMonths;
            const effectiveBalanceLead = simulation.balanceLeadMonths ?? schedule.balance.leadMonths;
            for (let i = 0; i < 12; i++) {
                const budget = otbByMonth[i];
                const depositIdx = i - effectiveDepositLead;
                if (depositIdx >= 0) depositByMonth[depositIdx] += budget * schedule.deposit.rateOfBudget;
                const balanceIdx = i - effectiveBalanceLead;
                if (balanceIdx >= 0) balanceByMonth[balanceIdx] += budget * schedule.balance.rateOfBudget;
            }
        }

        if (simulation.delayOtbPaymentsMonths && simulation.delayOtbPaymentsMonths > 0) {
            depositByMonth = delayPayments(depositByMonth, simulation.delayOtbPaymentsMonths);
            balanceByMonth = delayPayments(balanceByMonth, simulation.delayOtbPaymentsMonths);
        }
        if (simulation.reduceFirstOtbRate && simulation.reduceFirstOtbRate > 0) {
            const reduced = reduceFirstOtbPayments(depositByMonth, balanceByMonth, simulation.reduceFirstOtbRate);
            depositByMonth = reduced.deposit;
            balanceByMonth = reduced.balance;
        }

        // 构建月度现金流
        let openingBalance = cfAss.initialCash + (simulation.extraOpeningCash ?? 0);
        const safetyThreshold = simulation.cashSafetyThreshold ?? cfAss.alertThresholds.safe;
        const monthly: MonthlyCashflow[] = [];

        for (let i = 0; i < 12; i++) {
            const totalRevThisMonth = physRevByMonth[i] + ecomRevByMonth[i] + newStoreRevByMonth[i] + franRevByMonth[i];
            const collection = collectionByMonth[i];
            const otbDeposit = depositByMonth[i];
            const otbBalance = balanceByMonth[i];
            const variableExpenses = totalRevThisMonth * varRate;
            // Auto = fixed + variable + OTB payments
            const autoExpenses = fixedTotal + variableExpenses + otbDeposit + otbBalance;
            const manualExpenses = manualByMonth[i];
            const totalExpenses = autoExpenses + manualExpenses;
            const netCashflow = collection - totalExpenses;
            const closingBalance = openingBalance + netCashflow;

            let alertLevel: CashflowAlertLevel = 'safe';
            if (closingBalance <= thresholds.warning) alertLevel = 'danger';
            else if (closingBalance <= safetyThreshold) alertLevel = 'warning';

            const otbPaymentShare = totalExpenses > 0 ? (otbDeposit + otbBalance) / totalExpenses : 0;
            const paymentMinusCollection = (otbDeposit + otbBalance) - collection;

            // 支出按科目拆分（基于配置的固定支出科目+可变=营销，OTB 单独，手工归"其他"）
            // 假设 fixedMonthlyExpenses 中包含人力/租金等科目；为简化用经验比例分摊
            const spendByCategory: Record<SpendCategory, number> = {
                '采购付款': otbDeposit + otbBalance,
                '营销费用': variableExpenses,
                '人力成本': fixedTotal * 0.55,  // 经验比例
                '租金/办公': fixedTotal * 0.30,
                '其他/手工': fixedTotal * 0.15 + manualExpenses,
            };

            monthly.push({
                month: i + 1,
                label: MONTH_LABELS[i],
                openingBalance,
                collection,
                otbDeposit,
                otbBalance,
                fixedExpenses: fixedTotal,
                variableExpenses,
                autoExpenses,
                manualExpenses,
                totalExpenses,
                netCashflow,
                closingBalance,
                alertLevel,
                cashRunwayMonths: 0, // filled below
                otbPaymentShare,
                yoyDelta: null, // no LY data available
                spendByCategory,
                paymentMinusCollection,
            });
            openingBalance = closingBalance;
        }

        // Compute cashRunwayMonths: closing balance / average monthly spend (forward-looking)
        const totalSpend = monthly.reduce((s, m) => s + m.totalExpenses, 0);
        const avgMonthlySpend = totalSpend / 12;
        for (let i = 0; i < 12; i++) {
            monthly[i].cashRunwayMonths = avgMonthlySpend > 0 ? +(monthly[i].closingBalance / avgMonthlySpend).toFixed(1) : 0;
        }

        const totalCollection = monthly.reduce((s, m) => s + m.collection, 0);
        const totalExpenses = monthly.reduce((s, m) => s + m.totalExpenses, 0);
        const otbPaymentTotal = monthly.reduce((s, m) => s + m.otbDeposit + m.otbBalance, 0);
        const netCashflow = totalCollection - totalExpenses;
        const yearEndBalance = monthly[11].closingBalance;
        const dangerMonths = monthly.filter(m => m.alertLevel === 'danger').map(m => m.month);
        const warningMonths = monthly.filter(m => m.alertLevel === 'warning').map(m => m.month);
        const breachSafetyMonths = monthly
            .filter(m => m.closingBalance < (simulation.cashSafetyThreshold ?? cfAss.alertThresholds.safe))
            .map(m => m.month);
        const averageMonthlySpend = totalExpenses / 12;
        const cashSafetyMonths = averageMonthlySpend > 0 ? +(yearEndBalance / averageMonthlySpend).toFixed(1) : 0;

        // DSO / DPO / CCC approximation (annual)
        const annualRevenue = totalCollection;
        const dso = annualRevenue > 0 ? (otbPaymentTotal / annualRevenue) * 365 : null; // proxy
        const dpo = totalCollection > 0 ? (otbPaymentTotal / totalExpenses) * 365 : null;
        const ccc = (dso !== null && dpo !== null) ? dso - dpo : null;

        const minClosing = Math.min(...monthly.map(m => m.closingBalance));
        const maxGapMonth = minClosing < 0 ? (monthly.find(m => m.closingBalance === minClosing)?.month ?? null) : null;

        // Top 3 manual outflow months
        const manualOutflowTop3Months = [...monthly]
            .sort((a, b) => b.manualExpenses - a.manualExpenses)
            .slice(0, 3)
            .map(m => ({ month: m.month, label: m.label, manualTotal: m.manualExpenses }));

        const executionRows = otbExecutionTrackingRaw as OTBExecutionTrackingSourceRow[];
        const otbPlannedPurchaseAmount = executionRows.reduce((sum, row) => sum + Number(row.plannedPurchaseAmount || 0), 0);
        const otbOrderedAmount = executionRows.reduce((sum, row) => sum + Number(row.orderedAmount || 0), 0);
        const otbArrivedAmount = executionRows.reduce((sum, row) => sum + Number(row.arrivedAmount || 0), 0);
        const inventoryCashPressure = Math.max(0, otbOrderedAmount - otbArrivedAmount);
        const paymentToCollectionRatio = totalCollection > 0 ? otbPaymentTotal / totalCollection : null;
        const cashflowAdvice = [
            ...monthly
                .filter(month => month.otbDeposit + month.otbBalance > month.collection)
                .slice(0, 3)
                .map(month => `${month.label}采购付款高于销售回款，需调整付款节点或增加备用金`),
            inventoryCashPressure > otbOrderedAmount * 0.25 ? '库存占用金额持续偏高，采购节奏快于到货/销售消化' : '',
            netCashflow > 0 && otbOrderedAmount < otbPlannedPurchaseAmount * 0.9 ? '现金流尚可且预算未完全执行，可优先追加核心波段预算' : '',
            netCashflow < 0 && otbOrderedAmount < otbPlannedPurchaseAmount ? '预算仍有余量但现金流紧张，建议控制非核心款下单' : '',
        ].filter(Boolean);

        // v3.1: 年度支出按科目汇总
        const spendByCategoryAnnual: Record<SpendCategory, number> = {
            '采购付款': 0, '营销费用': 0, '人力成本': 0, '租金/办公': 0, '其他/手工': 0,
        };
        monthly.forEach(m => {
            (Object.keys(m.spendByCategory) as SpendCategory[]).forEach(k => {
                spendByCategoryAnnual[k] += m.spendByCategory[k];
            });
        });

        // v3.1: 连续跌破水位月段
        const safetyT = simulation.cashSafetyThreshold ?? cfAss.alertThresholds.safe;
        const consecutiveBreachRanges: Array<{ start: number; end: number; length: number }> = [];
        let runStart: number | null = null;
        for (let i = 0; i < 12; i++) {
            const breached = monthly[i].closingBalance < safetyT;
            if (breached && runStart === null) runStart = i + 1;
            if ((!breached || i === 11) && runStart !== null) {
                const end = breached ? i + 1 : i;
                consecutiveBreachRanges.push({ start: runStart, end, length: end - runStart + 1 });
                runStart = null;
            }
        }

        // v3.1: 建议授信额度 = 最大缺口绝对值 × 1.2 安全系数
        const suggestedCreditAmount = minClosing < 0 ? Math.ceil(Math.abs(minClosing) * 1.2 / 100000) * 100000 : 0;

        // v3.1: 授信额度池（支持模拟参数覆盖）
        const creditTotal = simulation.creditTotal ?? 30000000;
        const creditUsed = simulation.creditUsed ?? 0;
        const creditPool: CreditPool = {
            total: creditTotal,
            used: creditUsed,
            available: Math.max(0, creditTotal - creditUsed),
            expireDate: simulation.creditExpireDate ?? '2027-12-31',
        };

        return {
            monthly,
            totalCollection,
            totalExpenses,
            netCashflow,
            yearEndBalance,
            maxGapMonth,
            maxGapAmount: minClosing < 0 ? minClosing : 0,
            dangerMonths,
            warningMonths,
            breachSafetyMonths,
            manualOutflowTop3Months,
            otbSource,
            otbPlannedPurchaseAmount,
            otbOrderedAmount,
            otbArrivedAmount,
            otbPaymentTotal,
            paymentToCollectionRatio,
            inventoryCashPressure,
            cashflowAdvice,
            cashSafetyMonths,
            averageMonthlySpend,
            dso,
            dpo,
            ccc,
            creditPool,
            spendByCategoryAnnual,
            consecutiveBreachRanges,
            suggestedCreditAmount,
        };
    }, [
        cfAss,
        physForecast,
        ecomForecast,
        newStoreForecast,
        factInventoryRaw,
        globalConfig.cashflowManualOutflows,
        simulation.delayOtbPaymentsMonths,
        simulation.reduceFirstOtbRate,
        simulation.extraOpeningCash,
        simulation.clearanceInventoryRate,
        simulation.clearanceDiscount,
        simulation.clearanceMonth,
        simulation.depositLeadMonths,
        simulation.balanceLeadMonths,
        simulation.cashSafetyThreshold,
        simulation.collectionLagDays,
        simulation.creditTotal,
        simulation.creditUsed,
        simulation.creditExpireDate,
    ]);
}

// ─── 工具函数 ─────────────────────────────────────────────────

/** 安全水位告警分析：返回跌破月份和连续跌破段 */
export function calcCashSafetyAlerts(monthly: MonthlyCashflow[], threshold: number): {
    breachMonths: number[];
    consecutiveBreaches: Array<{ start: number; end: number; length: number }>;
    maxConsecutiveLength: number;
} {
    const breachMonths = monthly.filter(m => m.closingBalance < threshold).map(m => m.month);
    const consecutiveBreaches: Array<{ start: number; end: number; length: number }> = [];
    let runStart: number | null = null;
    for (let i = 0; i < monthly.length; i++) {
        const breached = monthly[i].closingBalance < threshold;
        if (breached && runStart === null) runStart = monthly[i].month;
        if ((!breached || i === monthly.length - 1) && runStart !== null) {
            const end = breached ? monthly[i].month : monthly[i - 1]?.month ?? runStart;
            consecutiveBreaches.push({ start: runStart, end, length: end - runStart + 1 });
            runStart = null;
        }
    }
    const maxConsecutiveLength = consecutiveBreaches.reduce((max, r) => Math.max(max, r.length), 0);
    return { breachMonths, consecutiveBreaches, maxConsecutiveLength };
}

/** 多场景对比：基准 + 多个模拟场景的关键指标对比 */
export function compareCashflowScenarios(scenarios: Array<{ label: string; result: CashflowResult }>): CashflowScenarioComparison[] {
    return scenarios.map(({ label, result }) => ({
        label,
        yearEndBalance: result.yearEndBalance,
        netCashflow: result.netCashflow,
        maxGapMonth: result.maxGapMonth,
        maxGapAmount: result.maxGapAmount,
        dangerMonthCount: result.dangerMonths.length,
        breachSafetyMonthCount: result.breachSafetyMonths.length,
        suggestedCredit: result.suggestedCreditAmount,
    }));
}

/** 现金流时间线事件：识别月度关键节点（最大付款月、最大回款月、连续负月起点等） */
export function generateCashflowEvents(monthly: MonthlyCashflow[]): CashflowEvent[] {
    const events: CashflowEvent[] = [];
    if (monthly.length === 0) return events;

    // 最大付款月
    const maxPayment = monthly.reduce((max, m) =>
        (m.otbDeposit + m.otbBalance) > (max.otbDeposit + max.otbBalance) ? m : max, monthly[0]);
    events.push({
        month: maxPayment.month,
        label: maxPayment.label,
        title: '最大OTB付款月',
        type: 'payment',
        amount: maxPayment.otbDeposit + maxPayment.otbBalance,
    });

    // 最大回款月
    const maxCollection = monthly.reduce((max, m) => m.collection > max.collection ? m : max, monthly[0]);
    events.push({
        month: maxCollection.month,
        label: maxCollection.label,
        title: '最大销售回款月',
        type: 'collection',
        amount: maxCollection.collection,
    });

    // 最大缺口月（如果有）
    const minBalance = monthly.reduce((min, m) => m.closingBalance < min.closingBalance ? m : min, monthly[0]);
    if (minBalance.closingBalance < 0) {
        events.push({
            month: minBalance.month,
            label: minBalance.label,
            title: '最大现金缺口月',
            type: 'milestone',
            amount: minBalance.closingBalance,
        });
    }

    return events;
}
