/**
 * src/utils/pnlV11.ts
 * P&L V11 工具函数集
 */

// ── 1. calcDecisionSummary ────────────────────────────────────────────────────
export interface DecisionSummaryInput {
  netMargin: number;
  ebitRate: number;
  cashConversionCycle: number;
  healthScore: number;
  topRisks: Array<{ title: string; amount: number; source: string }>;
  topDecisions: Array<{ title: string; detail: string; urgency: string }>;
}

export interface DecisionSummaryResult {
  healthStatus: 'healthy' | 'warning' | 'danger';
  overallScore: number;
  recommendedActions: string[];
}

export function calcDecisionSummary(input: DecisionSummaryInput): DecisionSummaryResult {
  const { netMargin, ebitRate, healthScore } = input;
  const isHealthy = netMargin >= 0.08 && ebitRate >= 0.10 && healthScore >= 75;
  const isDanger = netMargin < 0.04 || ebitRate < 0.05 || healthScore < 50;

  return {
    healthStatus: isHealthy ? 'healthy' : isDanger ? 'danger' : 'warning',
    overallScore: healthScore,
    recommendedActions: input.topDecisions.map(d => d.title),
  };
}

// ── 2. forecastRolling12Months ────────────────────────────────────────────────
export interface ForecastPoint {
  month: string;
  netRevenue: number;
  upper: number;
  lower: number;
  grossMarginRate: number;
  ebitRate: number;
  seasonFactor: number;
  confidence: number;
  isActual?: boolean;
}

export function forecastRolling12Months(
  history: Array<{ month: string; netRevenue: number; grossMarginRate: number; ebitRate: number }>,
  seasonalFactors: Record<string, number>,
  committedOrders = 0,
): ForecastPoint[] {
  if (history.length === 0) return [];
  const avgRevenue = history.reduce((s, m) => s + m.netRevenue, 0) / history.length;
  const remainingMonths = 12 - history.length;
  const forecast: ForecastPoint[] = [];
  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  for (let i = 0; i < remainingMonths; i++) {
    const monthIdx = (history.length + i) % 12;
    const month = MONTHS[monthIdx];
    const factor = seasonalFactors[month] ?? 1.0;
    const base = avgRevenue * factor * (1 + committedOrders / (avgRevenue * 12));
    const confidence = Math.max(0.5, 0.9 - i * 0.03);
    const spread = base * (1 - confidence) * 1.5;
    forecast.push({
      month,
      netRevenue: Math.round(base),
      upper: Math.round(base + spread),
      lower: Math.round(base - spread),
      grossMarginRate: 0.49,
      ebitRate: 0.08,
      seasonFactor: factor,
      confidence,
    });
  }
  return forecast;
}

// ── 3. splitSeasonalPnl ───────────────────────────────────────────────────────
export interface SeasonalSplit {
  springSummer: { netRevenue: number; grossProfit: number; grossMarginRate: number; netProfit: number };
  autumnWinter: { netRevenue: number; grossProfit: number; grossMarginRate: number; netProfit: number };
  gap: number;
}

export function splitSeasonalPnl(monthly: Array<{ month: number; netRevenue: number; grossProfit: number; ebit: number }>): SeasonalSplit {
  const ss = monthly.filter(m => m.month >= 3 && m.month <= 8);
  const aw = monthly.filter(m => m.month < 3 || m.month > 8);

  const agg = (arr: typeof ss) => ({
    netRevenue: arr.reduce((s, m) => s + m.netRevenue, 0),
    grossProfit: arr.reduce((s, m) => s + m.grossProfit, 0),
    grossMarginRate: 0,
    netProfit: arr.reduce((s, m) => s + m.ebit * 0.75, 0),
  });

  const ssData = agg(ss);
  const awData = agg(aw);
  ssData.grossMarginRate = ssData.netRevenue > 0 ? ssData.grossProfit / ssData.netRevenue : 0;
  awData.grossMarginRate = awData.netRevenue > 0 ? awData.grossProfit / awData.netRevenue : 0;

  return {
    springSummer: ssData,
    autumnWinter: awData,
    gap: awData.grossMarginRate - ssData.grossMarginRate,
  };
}

// ── 4. calcPareto80_20 ────────────────────────────────────────────────────────
export interface SkuProfitRow {
  skuId: string;
  label: string;
  revenue: number;
  contributionProfit: number;
}

export interface ParetoResult {
  coreSkus: SkuProfitRow[];
  tailSkus: SkuProfitRow[];
  coreRevenuePct: number;
  coreProfitPct: number;
}

export function calcPareto80_20(skus: SkuProfitRow[]): ParetoResult {
  const sorted = [...skus].sort((a, b) => b.contributionProfit - a.contributionProfit);
  const totalRevenue = sorted.reduce((s, k) => s + k.revenue, 0);
  const totalProfit = sorted.reduce((s, k) => s + k.contributionProfit, 0);
  const cutoff = Math.ceil(sorted.length * 0.2);
  const coreSkus = sorted.slice(0, cutoff);
  const tailSkus = sorted.slice(cutoff);
  const coreRevenue = coreSkus.reduce((s, k) => s + k.revenue, 0);
  const coreProfit = coreSkus.reduce((s, k) => s + k.contributionProfit, 0);
  return {
    coreSkus,
    tailSkus,
    coreRevenuePct: totalRevenue > 0 ? coreRevenue / totalRevenue : 0,
    coreProfitPct: totalProfit > 0 ? coreProfit / totalProfit : 0,
  };
}

// ── 5. calcDistributionPnl ────────────────────────────────────────────────────
export interface DistributionChannel {
  channel: string;
  label: string;
  netRevenue: number;
  grossMarginRate: number;
  totalOpex: number;
}

export interface DistributionPnlRow extends DistributionChannel {
  grossProfit: number;
  contributionProfit: number;
  contributionProfitRate: number;
}

export function calcDistributionPnl(channels: DistributionChannel[]): DistributionPnlRow[] {
  return channels.map(ch => {
    const grossProfit = ch.netRevenue * ch.grossMarginRate;
    const contributionProfit = grossProfit - ch.totalOpex;
    return {
      ...ch,
      grossProfit,
      contributionProfit,
      contributionProfitRate: ch.netRevenue > 0 ? contributionProfit / ch.netRevenue : 0,
    };
  });
}

// ── 6. calcDupont ─────────────────────────────────────────────────────────────
export interface DupontInput {
  netProfit: number;
  netRevenue: number;
  totalAssets: number;
  totalEquity: number;
}

export interface DupontResult {
  roe: number;
  netMargin: number;
  assetTurnover: number;
  equityMultiplier: number;
}

export function calcDupont(input: DupontInput): DupontResult {
  const netMargin = input.netRevenue > 0 ? input.netProfit / input.netRevenue : 0;
  const assetTurnover = input.totalAssets > 0 ? input.netRevenue / input.totalAssets : 0;
  const equityMultiplier = input.totalEquity > 0 ? input.totalAssets / input.totalEquity : 0;
  const roe = netMargin * assetTurnover * equityMultiplier;
  return { roe, netMargin, assetTurnover, equityMultiplier };
}

// ── 7. calcBreakEvenSensitivity ───────────────────────────────────────────────
export interface BreakEvenSensitivityInput {
  grossMarginRate: number;
  marketingExpenseRate: number;
  rentRate: number;
  fixedCosts: number;
  netRevenue: number;
}

export interface BreakEvenSensitivityResult {
  breakEvenSales: number;
  safetyMargin: number;
  netProfitRate: number;
}

export function calcBreakEvenSensitivity(params: BreakEvenSensitivityInput): BreakEvenSensitivityResult {
  const variableCostRate = 1 - params.grossMarginRate + params.marketingExpenseRate + params.rentRate;
  const contributionMarginRate = 1 - variableCostRate;
  const breakEvenSales = contributionMarginRate > 0 ? params.fixedCosts / contributionMarginRate : Infinity;
  const safetyMargin = params.netRevenue > 0 ? (params.netRevenue - breakEvenSales) / params.netRevenue : 0;
  const netProfitRate = params.netRevenue > 0
    ? (params.netRevenue * contributionMarginRate - params.fixedCosts) / params.netRevenue
    : 0;
  return { breakEvenSales, safetyMargin, netProfitRate };
}

// ── 8. calcStoreDcf ───────────────────────────────────────────────────────────
export interface StoreDcfInput {
  initialInvestment: number;
  annualCashFlows: number[];
  terminalGrowthRate: number;
  discountRate: number;
}

export interface StoreDcfResult {
  npv: number;
  irr: number;
  paybackYears: number;
  terminalValue: number;
}

export function calcStoreDcf(input: StoreDcfInput): StoreDcfResult {
  const { initialInvestment, annualCashFlows, terminalGrowthRate, discountRate } = input;
  let npv = -initialInvestment;
  let cumulative = 0;
  let paybackYears = annualCashFlows.length + 1;

  for (let i = 0; i < annualCashFlows.length; i++) {
    const discounted = annualCashFlows[i] / Math.pow(1 + discountRate, i + 1);
    npv += discounted;
    cumulative += annualCashFlows[i];
    if (cumulative >= initialInvestment && paybackYears > annualCashFlows.length) {
      const prev = cumulative - annualCashFlows[i];
      paybackYears = i + (initialInvestment - prev) / annualCashFlows[i];
    }
  }

  const lastFlow = annualCashFlows[annualCashFlows.length - 1] ?? 0;
  const terminalValue = discountRate > terminalGrowthRate
    ? (lastFlow * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate) / Math.pow(1 + discountRate, annualCashFlows.length)
    : 0;
  npv += terminalValue;

  // IRR via Newton's method
  let irr = 0.15;
  for (let iter = 0; iter < 50; iter++) {
    let f = -initialInvestment;
    let df = 0;
    for (let i = 0; i < annualCashFlows.length; i++) {
      f += annualCashFlows[i] / Math.pow(1 + irr, i + 1);
      df -= (i + 1) * annualCashFlows[i] / Math.pow(1 + irr, i + 2);
    }
    if (Math.abs(df) < 1e-10) break;
    const next = irr - f / df;
    if (Math.abs(next - irr) < 1e-8) { irr = next; break; }
    irr = next;
  }

  return { npv, irr, paybackYears, terminalValue };
}

// ── 9. generatePnlFeedbackSignals ────────────────────────────────────────────
export interface PnlFeedbackSignal {
  id: string;
  targetModule: 'otb' | 'planning' | 'forecast' | 'category';
  priority: 'P0' | 'P1' | 'P2';
  title: string;
  detail: string;
  impact: string;
}

export function generatePnlFeedbackSignals(pnl: {
  netMargin: number;
  grossMarginRate: number;
  netRevenuePctVsBudget: number;
}): PnlFeedbackSignal[] {
  const signals: PnlFeedbackSignal[] = [];
  if (pnl.grossMarginRate < 0.5) {
    signals.push({
      id: 'auto-fb-01', targetModule: 'otb', priority: 'P1',
      title: `毛利率低于50% → 建议OTB向高毛利品类倾斜`,
      detail: `当前综合毛利率 ${(pnl.grossMarginRate * 100).toFixed(1)}%，建议增加运动品类OTB占比`,
      impact: '预计毛利率提升1-2pp',
    });
  }
  if (pnl.netRevenuePctVsBudget < -0.05) {
    signals.push({
      id: 'auto-fb-02', targetModule: 'forecast', priority: 'P1',
      title: `实际净收入偏低 → 销售预测需重新校准`,
      detail: `实际净收入低于预测 ${(-pnl.netRevenuePctVsBudget * 100).toFixed(1)}%，预测模型需更新`,
      impact: '提升下半年预测准确率',
    });
  }
  return signals;
}
