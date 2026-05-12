// src/types/pnlDecisionTypes.ts
// Types for P&L Decision Center V10

export type RiskLevel = 'healthy' | 'medium' | 'high' | 'critical' | 'opportunity';
export type ActionStatus = 'suggested' | 'pending' | 'in_progress' | 'done' | 'closed';
export type ActionType = 'clearance' | 'reduce_expense' | 'stop_replenishment' | 'adjust_price_band' | 'optimize_store_cost' | 'increase_high_margin_mix';
export type KpiFormat = 'money' | 'pct' | 'number';

export interface ProfitLossKpi {
  key: string;
  label: string;
  actual: number;
  plan: number;
  variance: number;
  variancePct: number;
  vsLastPeriod: number;
  riskLevel: RiskLevel;
  format: KpiFormat;
  higherIsBad?: boolean;
}

export interface ProfitAlertAction {
  id: string;
  priority: number;
  riskLevel: RiskLevel;
  actionType: ActionType;
  subject: string;
  subjectType: string;
  riskReason: string;
  financialImpact: number;
  improvementAmount: number;
  recommendedAction: string;
  status: ActionStatus;
  deadline: string;
  owner: string;
  relatedModules: string[];
}

export interface ProfitStatementLine {
  key: string;
  label: string;
  indent: number;
  isTotal: boolean;
  plan: number;
  forecast: number;
  actual: number;
  yoy: number;
}

export interface ProfitBridgeItem {
  key: string;
  label: string;
  impact: number;
  type: 'positive' | 'negative';
  description: string;
}

export interface ProfitBridge {
  targetNetProfit: number;
  actualNetProfit: number;
  totalGap: number;
  factors: ProfitBridgeItem[];
}

export interface WaveContributionItem {
  waveId: string;
  waveName: string;
  launchDate: string;
  salesAmount: number;
  grossMargin: number;
  discountRate: number;
  netProfit: number;
  netMargin: number;
  roi: number;
  inventoryCost: number;
  inventoryWriteDown: number;
  riskLevel: RiskLevel;
  action: string;
}

export interface PriceBandItem {
  priceBand: string;
  label: string;
  salesAmount: number;
  grossMargin: number;
  discountRate: number;
  netProfit: number;
  netMargin: number;
  roi: number;
  riskLevel: RiskLevel;
  action: string;
}

export interface MarkdownScenario {
  scenario: string;
  label: string;
  desc: string;
  estimatedSales: number;
  cashRelease: number;
  markdownLoss: number;
  grossMarginImpact: number;
  netProfitImpact: number;
  inventoryRelease: number;
  weeks: number;
}

export interface BreakEvenChannel {
  channel: string;
  label: string;
  breakEvenSales: number;
  currentSales: number;
  safetyMargin: number;
  riskLevel: RiskLevel;
}

export interface BreakEvenCategory {
  category: string;
  label: string;
  breakEvenSales: number;
  currentSales: number;
  safetyMargin: number;
  riskLevel: RiskLevel;
}

export interface BreakEvenAnalysis {
  brand: {
    breakEvenSales: number;
    breakEvenUnits: number;
    breakEvenMargin: number;
    currentSales: number;
    gapAmount: number;
    gapUnits: number;
    estimatedBreakEvenMonth: string;
    safetyMargin: number;
    riskLevel: RiskLevel;
  };
  channels: BreakEvenChannel[];
  categories: BreakEvenCategory[];
}

export interface CashDriver {
  driver: string;
  amount: number;
  explanation: string;
}

export interface CashPnlLinkage {
  accountingNetProfit: number;
  operatingCashflow: number;
  inventoryCashTied: number;
  purchasePayment: number;
  clearanceCashback: number;
  accountsReceivable: number;
  cashGap: number;
  conclusion: string;
  drivers: CashDriver[];
  otbRecommendation: string;
}

export interface RelatedModuleLink {
  id: string;
  label: string;
  color: string;
  relationship: string;
  icon: string;
  param: string;
}

export interface PnlDecisionData {
  meta: { year: string; updatedAt: string; version: string };
  kpis: ProfitLossKpi[];
  alertActions: ProfitAlertAction[];
  profitStatement: ProfitStatementLine[];
  profitBridge: ProfitBridge;
  waveContribution: WaveContributionItem[];
  priceBandContribution: PriceBandItem[];
  markdownScenarios: {
    current: {
      grossSales: number;
      discountSales: number;
      avgDiscountRate: number;
      markdownLoss: number;
      clearanceLoss: number;
      inventoryWriteDown: number;
      riskInventoryAmount: number;
      discountedGrossMargin: number;
      netProfitImpact: number;
    };
    scenarios: MarkdownScenario[];
  };
  breakEven: BreakEvenAnalysis;
  cashPnlLinkage: CashPnlLinkage;
  relatedModules: RelatedModuleLink[];
}

// ─── Utility helpers ────────────────────────────────────────────────────────
export function fmtM(v: number): string {
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1e8) return sign + '¥' + (a / 1e8).toFixed(2) + '亿';
  if (a >= 1e7) return sign + '¥' + (a / 1e7).toFixed(1) + '千万';
  if (a >= 1e4) return sign + '¥' + (a / 1e4).toFixed(0) + '万';
  return sign + '¥' + a.toFixed(0);
}

export function pctM(v: number): string {
  return (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%';
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  healthy: 'text-emerald-600',
  medium: 'text-amber-600',
  high: 'text-rose-600',
  critical: 'text-rose-700',
  opportunity: 'text-sky-600',
};

export const RISK_BG: Record<RiskLevel, string> = {
  healthy: 'bg-emerald-50 border-emerald-100',
  medium: 'bg-amber-50 border-amber-100',
  high: 'bg-rose-50 border-rose-100',
  critical: 'bg-rose-100 border-rose-200',
  opportunity: 'bg-sky-50 border-sky-100',
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  suggested: '建议',
  pending: '待处理',
  in_progress: '进行中',
  done: '已完成',
  closed: '已关闭',
};

export const ACTION_STATUS_COLORS: Record<ActionStatus, string> = {
  suggested: 'bg-sky-100 text-sky-700',
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-violet-100 text-violet-700',
  done: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-500',
};
