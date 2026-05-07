'use client';
/**
 * src/hooks/useCashflow.ts
 * 月度现金流计算 Hook — 自动/手工支出分拆，主预算源接入 useOtbEngine
 */
import { useMemo } from 'react';
import { useCashflowAssumptions, useFactPlan, useDimWavePlan, useFactInventory } from './useDashboardData';
import { useForecast } from './useForecast';
import type { ForecastScenario } from './useForecast';
import { useOtbEngine } from './useOtbEngine';
import { useGlobalConfig } from '@/context/GlobalConfigContext';
import otbExecutionTrackingRaw from '../../data/otb/otb_execution_tracking.json';

export type CashflowAlertLevel = 'safe' | 'warning' | 'danger';

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
}

export interface CashflowSimulationOptions {
    delayOtbPaymentsMonths?: number;
    reduceFirstOtbRate?: number;
    extraOpeningCash?: number;
    clearanceInventoryRate?: number;
    clearanceDiscount?: number;
    clearanceMonth?: number;
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
    const { data: cfAss } = useCashflowAssumptions() as { data: CashflowAssumptions | undefined };
    const physForecast = useForecast('physical', scenario);
    const ecomForecast = useForecast('ecommerce', scenario);
    const newStoreForecast = useForecast('new_store', scenario);
    const { data: factPlanRaw } = useFactPlan();
    const { data: dimWavePlan } = useDimWavePlan();
    const { data: factInventoryRaw } = useFactInventory();
    // P3: OTB 引擎作为 fact_plan 为空时的备用预算源
    const otbEngine = useOtbEngine(scenario);
    const { config: globalConfig } = useGlobalConfig();

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

        if (simulation.clearanceInventoryRate && simulation.clearanceInventoryRate > 0) {
            const inventoryRows: InventoryRow[] = Array.isArray(factInventoryRaw) ? factInventoryRaw : [];
            const latestDate = inventoryRows.reduce((max, row) => row.date && row.date > max ? row.date : max, '');
            const inventoryCapital = inventoryRows
                .filter(row => row.date === latestDate)
                .reduce((sum, row) => sum + Number(row.inventory_amount || 0), 0);
            const clearanceCashIn = inventoryCapital * simulation.clearanceInventoryRate * (simulation.clearanceDiscount ?? 0.5);
            const targetMonthIndex = Math.max(0, Math.min(11, (simulation.clearanceMonth ?? 1) - 1));
            collectionByMonth[targetMonthIndex] += clearanceCashIn;
        }

        // OTB 付款：优先使用 useOtbEngine 的动态预算，fact_plan 只作为引擎不可用时的兜底。
        type PlanRow = {
            year?: number | string;
            season?: string;
            wave?: string;
            plan_otb_budget?: number | string;
        };
        type WavePlanRow = {
            id?: string;
            season?: string;
            wave?: string;
            launch_date?: string;
        };
        const planRows: PlanRow[] = Array.isArray(factPlanRaw) ? factPlanRaw : [];
        const waveRows: WavePlanRow[] = Array.isArray(dimWavePlan) ? dimWavePlan : [];
        const waveMonthByKey = new Map<string, number>();
        waveRows.forEach((wave) => {
            if (!wave.launch_date) return;
            const parsed = new Date(wave.launch_date);
            if (Number.isNaN(parsed.getTime())) return;
            const month = parsed.getMonth() + 1;
            if (wave.id) waveMonthByKey.set(wave.id, month);
            if (wave.season && wave.wave) waveMonthByKey.set(`${wave.season}-${wave.wave}`, month);
        });

        const otbByMonth: number[] = Array(12).fill(0);
        let otbSource: 'plan' | 'engine' | 'uniform' = 'engine';
        if (otbEngine && otbEngine.annual.otbCostBudget > 0) {
            for (const w of otbEngine.byWave) {
                if (!w.months.length) continue;
                const firstMonth = Math.min(...w.months);
                const arrivalMonth = ((firstMonth - 2 + 11) % 12) + 1;
                if (arrivalMonth >= 1 && arrivalMonth <= 12) {
                    otbByMonth[arrivalMonth - 1] += w.otbCostBudget;
                }
            }
        } else {
            otbSource = 'plan';
            const fiscalYear = Number(globalConfig.brand.fiscalYear);
            const scopedPlanRows = planRows.filter((row) => {
                const rowYear = Number(row.year);
                return Number.isFinite(fiscalYear) ? rowYear === fiscalYear : true;
            });
            const planSourceRows = scopedPlanRows.length > 0 ? scopedPlanRows : planRows;
            planSourceRows.forEach((r: PlanRow) => {
                const budget = Number(r.plan_otb_budget || 0);
                const waveKey = r.season && r.wave ? `${r.season}-${r.wave}` : '';
                const month = waveKey ? Number(waveMonthByKey.get(waveKey) || 0) : 0;
                if (month >= 1 && month <= 12) {
                    otbByMonth[month - 1] += budget;
                }
            });
            const totalPlanOtbBudget = otbByMonth.reduce((s, v) => s + v, 0);
            if (totalPlanOtbBudget === 0) {
                otbSource = 'uniform';
                const annualOtbTotal = planSourceRows.reduce((s, row) => s + Number(row.plan_otb_budget || 0), 0);
                for (let i = 0; i < 12; i++) otbByMonth[i] = annualOtbTotal / 12;
            }
        }

        // 定金和尾款按时序偏移
        let depositByMonth: number[] = Array(12).fill(0);
        let balanceByMonth: number[] = Array(12).fill(0);
        for (let i = 0; i < 12; i++) {
            const budget = otbByMonth[i];
            // 定金：提前 3 个月支付
            const depositIdx = i - schedule.deposit.leadMonths;
            if (depositIdx >= 0) depositByMonth[depositIdx] += budget * schedule.deposit.rateOfBudget;
            // 尾款：提前 1 个月支付
            const balanceIdx = i - schedule.balance.leadMonths;
            if (balanceIdx >= 0) balanceByMonth[balanceIdx] += budget * schedule.balance.rateOfBudget;
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
            else if (closingBalance <= thresholds.safe) alertLevel = 'warning';

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
            });
            openingBalance = closingBalance;
        }

        const totalCollection = monthly.reduce((s, m) => s + m.collection, 0);
        const totalExpenses = monthly.reduce((s, m) => s + m.totalExpenses, 0);
        const otbPaymentTotal = monthly.reduce((s, m) => s + m.otbDeposit + m.otbBalance, 0);
        const netCashflow = totalCollection - totalExpenses;
        const yearEndBalance = monthly[11].closingBalance;
        const dangerMonths = monthly.filter(m => m.alertLevel === 'danger').map(m => m.month);
        const warningMonths = monthly.filter(m => m.alertLevel === 'warning').map(m => m.month);

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
            manualOutflowTop3Months,
            otbSource,
            otbPlannedPurchaseAmount,
            otbOrderedAmount,
            otbArrivedAmount,
            otbPaymentTotal,
            paymentToCollectionRatio,
            inventoryCashPressure,
            cashflowAdvice,
        };
    }, [
        cfAss,
        physForecast,
        ecomForecast,
        newStoreForecast,
        factPlanRaw,
        dimWavePlan,
        factInventoryRaw,
        otbEngine,
        globalConfig.brand.fiscalYear,
        globalConfig.cashflowManualOutflows,
        simulation.delayOtbPaymentsMonths,
        simulation.reduceFirstOtbRate,
        simulation.extraOpeningCash,
        simulation.clearanceInventoryRate,
        simulation.clearanceDiscount,
        simulation.clearanceMonth,
    ]);
}
