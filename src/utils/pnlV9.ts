/**
 * src/utils/pnlV9.ts — P&L V9 工具函数
 * 涵盖：预算偏差归因 / 现金缺口 / 库存周转 / CCC / 货品深度 / 评级4维 / 模拟开店
 */

// ─── 类型定义 ──────────────────────────────────────────────────────────────────
export interface BudgetItem { item: string; budget: number; actual: number; variance: number; type: 'positive' | 'overspend' | 'neutral'; attribution: string; priority?: 'P0' | 'P1' | 'P2'; }
export interface BudgetVarianceResult { totalVariance: number; revenueEffect: number; costOverrun: number; top5: BudgetItem[]; }
export interface CashflowMonth { month: string; salesReceipt: number; purchasePayment: number; opexPayment: number; netCashflow: number; gapFlag: boolean; }
export interface CashflowGapResult { gapMonths: string[]; peakDeficit: number; peakMonth: string; annualNetCashflow: number; }
export interface StoreDepthMetrics { avgInventoryValue: number; inventoryTurnover: number; monthlyStockoutRisk: number; skuEfficiency: number; }
export interface GradingDimension { key: string; label: string; weight: number; score: number; grade: string; benchmark: string; suggestion: string; }
export interface GradingResult { totalScore: number; finalGrade: string; recommendation: string; dimensions: GradingDimension[]; }
export interface StoreSimInput { storeType: string; label: string; count: number; monthlyRevenue: number; grossMarginRate: number; totalOpex: number; initialInvestment: number; }
export interface StoreSimResult { annualRevenue: number; annualNetProfit: number; annualNetProfitRate: number; totalInitialInvestment: number; blendedPaybackMonths: number; cashPressureMonths: string[]; }
export type CompareMode = 'actual' | 'vs_ly' | 'vs_budget';

// ─── 预算偏差归因 ──────────────────────────────────────────────────────────────
export function calcBudgetVarianceAttribution(items: BudgetItem[]): BudgetVarianceResult {
    const revenueEffect = items.filter(i => i.item === '净收入').reduce((s, i) => s + i.variance, 0);
    const costOverrun = items.filter(i => i.type === 'overspend').reduce((s, i) => s + i.variance, 0);
    const totalVariance = revenueEffect + costOverrun;
    const top5 = [...items].filter(i => i.variance !== 0).sort((a, b) => a.variance - b.variance).slice(0, 5);
    return { totalVariance, revenueEffect, costOverrun, top5 };
}

// ─── 现金缺口识别 ──────────────────────────────────────────────────────────────
export function calcCashflowGap(monthly: CashflowMonth[]): CashflowGapResult {
    const gapMonths = monthly.filter(m => m.gapFlag).map(m => m.month);
    const annualNetCashflow = monthly.reduce((s, m) => s + m.netCashflow, 0);
    const peak = [...monthly].sort((a, b) => a.netCashflow - b.netCashflow)[0];
    return { gapMonths, peakDeficit: peak?.netCashflow ?? 0, peakMonth: peak?.month ?? '', annualNetCashflow };
}

// ─── 库存周转率 ────────────────────────────────────────────────────────────────
export function calcInventoryTurnover(annualSales: number, avgInventoryAtCost: number): number {
    if (avgInventoryAtCost <= 0) return 0;
    return annualSales / avgInventoryAtCost;
}

// ─── 现金转化周期 CCC = DSO + DIO - DPO ────────────────────────────────────────
export function calcCCC(dso: number, dio: number, dpo: number): number { return dso + dio - dpo; }

// ─── 单店货品深度指标 ──────────────────────────────────────────────────────────
export function calcStoreDepthMetrics(params: {
    skuCount: number; avgDepth: number; unitCost: number;
    monthlyRevenue: number; monthlyReorderFreq: number; sizeCompletion: number;
}): StoreDepthMetrics {
    const avgInventoryValue = params.skuCount * params.avgDepth * params.unitCost;
    const annualSales = params.monthlyRevenue * 12;
    const inventoryTurnover = avgInventoryValue > 0 ? annualSales / avgInventoryValue : 0;
    const monthlyStockoutRisk = (1 - params.sizeCompletion) * params.skuCount;
    const skuEfficiency = params.skuCount > 0 ? params.monthlyRevenue / params.skuCount : 0;
    return { avgInventoryValue, inventoryTurnover, monthlyStockoutRisk, skuEfficiency };
}

// ─── 评级4维评分 ───────────────────────────────────────────────────────────────
interface GradingFormulaData {
    dimensions: Array<{ key: string; label: string; weight: number; tiers: Array<{ grade: string; min: number; max: number; score: number; benchmark: string; suggestion: string }> }>;
    gradeThresholds: Array<{ grade: string; minScore: number; label: string }>;
}
export function calcGradingScore(
    metrics: { profitRate: number; salesPerSqm: number; paybackMonths: number; investmentIntensity: number },
    formula: GradingFormulaData,
): GradingResult {
    const valMap: Record<string, number> = { profitRate: metrics.profitRate, salesPerSqm: metrics.salesPerSqm, paybackMonths: metrics.paybackMonths, investmentIntensity: metrics.investmentIntensity };
    const dimensions: GradingDimension[] = formula.dimensions.map(dim => {
        const val = valMap[dim.key] ?? 0;
        const tier = dim.tiers.find(t => val >= t.min && val < t.max) ?? dim.tiers[dim.tiers.length - 1];
        return { key: dim.key, label: dim.label, weight: dim.weight, score: tier.score, grade: tier.grade, benchmark: tier.benchmark, suggestion: tier.suggestion };
    });
    const totalScore = dimensions.reduce((s, d) => s + d.score * d.weight, 0);
    const threshold = [...formula.gradeThresholds].sort((a, b) => b.minScore - a.minScore).find(g => totalScore >= g.minScore);
    return { totalScore, finalGrade: threshold?.grade ?? 'Loss', recommendation: threshold?.label ?? '亏损退出', dimensions };
}

// ─── 模拟开店组合 ──────────────────────────────────────────────────────────────
export function simulateNewStorePortfolio(stores: StoreSimInput[]): StoreSimResult {
    let annualRevenue = 0, annualNetProfit = 0, totalInitialInvestment = 0;
    const cashPressureMonths: string[] = [];
    for (const s of stores) {
        const monthlyNetProfit = s.monthlyRevenue * s.grossMarginRate - s.totalOpex;
        annualRevenue += s.monthlyRevenue * s.count * 12;
        annualNetProfit += monthlyNetProfit * s.count * 12;
        totalInitialInvestment += s.initialInvestment * s.count;
    }
    const annualNetProfitRate = annualRevenue > 0 ? annualNetProfit / annualRevenue : 0;
    // 假设首批货款+装修在开业前2个月密集付款
    cashPressureMonths.push('开业前2个月（装修+首批货）');
    const blendedPaybackMonths = annualNetProfit > 0 ? Math.ceil(totalInitialInvestment / (annualNetProfit / 12)) : 999;
    return { annualRevenue, annualNetProfit, annualNetProfitRate, totalInitialInvestment, blendedPaybackMonths, cashPressureMonths };
}
