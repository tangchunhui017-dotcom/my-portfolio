/**
 * src/types/invHealthV10Types.ts
 * 库存健康 V10 新增类型定义
 */

// ─── 健康度评分历史 ──────────────────────────────────────────────────────────
export interface InvHealthDimension {
  score: number;
  weight: number;
  label: string;
  note: string;
}

export interface InvHealthScoreCurrent {
  score: number;
  grade: 'good' | 'warning' | 'danger';
  dimensions: Record<string, InvHealthDimension>;
}

export interface InvHealthScoreWeekSnapshot {
  week: string;
  date: string;
  score: number;
  riskAmount: number;
}

export interface InvVsLastWeek {
  scoreDelta: number;
  riskAmountDelta: number;
  processedSkuCount: number;
  releasedCash: number;
}

export interface InvHealthScoreHistory {
  meta: { updatedAt: string; note: string };
  current: InvHealthScoreCurrent;
  history: InvHealthScoreWeekSnapshot[];
  vsLastWeek: InvVsLastWeek;
}

// ─── 行动日志 ───────────────────────────────────────────────────────────────
export interface InvActionLogEntry {
  id: string;
  actionId: string;
  status: 'completed' | 'transferred' | 'cancelled';
  operator: string;
  completedAt?: string;
  transferredTo?: string;
  transferredAt?: string;
  note?: string;
}

export interface InvActionLogWeekSummary {
  total: number;
  completed: number;
  transferred: number;
  cancelled: number;
  pending: number;
  processedSkuCount: number;
  releasedCash: number;
  reducedWos: number;
}

export interface InvActionLog {
  meta: { updatedAt: string };
  weekSummary: InvActionLogWeekSummary;
  log: InvActionLogEntry[];
}

// ─── 断码SKU明细 ─────────────────────────────────────────────────────────────
export interface InvBrokenSkuItem {
  skuId: string;
  styleName: string;
  category: string;
  isCore: boolean;
  missingSizes: string[];
  occupyAmount: number;
  suggestAction: string;
  补码成本?: number;
}

export interface InvBrokenSizeSummary {
  totalBrokenSkuCount: number;
  coreBrokenSkuCount: number;
  nonCoreBrokenSkuCount: number;
  brokenSizeAmountPct: number;
  healthyThreshold: number;
  totalOccupyAmount: number;
  coreOccupyAmount: number;
}

export interface InvBrokenSizeDetail {
  meta: { updatedAt: string };
  summary: InvBrokenSizeSummary;
  topBrokenSkus: InvBrokenSkuItem[];
}

// ─── 季节性必清倒计时 ────────────────────────────────────────────────────────
export type InvSeasonalRiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface InvSeasonalCategory {
  key: string;
  label: string;
  icon: string;
  deadline: string;
  daysLeft: number;
  currentInventoryAmount: number;
  estimatedSelloutAmount: number;
  estimatedRiskAmount: number;
  riskLevel: InvSeasonalRiskLevel;
  note: string;
  suggestion: string;
}

export interface InvSeasonalData {
  meta: { updatedAt: string; businessDate: string };
  categories: InvSeasonalCategory[];
}

// ─── 反馈信号 ───────────────────────────────────────────────────────────────
export type InvFeedbackPriority = 'P0' | 'P1' | 'P2';

export interface InvFeedbackSignal {
  id: string;
  targetModule: string;
  priority: InvFeedbackPriority;
  title: string;
  detail: string;
  impact: string;
  status: 'pending' | 'accepted' | 'ignored';
}

export interface InvFeedbackSignals {
  meta: { updatedAt: string; generatedFrom: string };
  signals: InvFeedbackSignal[];
}

// ─── 库龄跌价准备 ─────────────────────────────────────────────────────────────
export interface InvAgingImpairmentRule {
  bucket: string;
  impairmentRate: number;
  label: string;
}

export interface InvAgingBucketCalc {
  amount: number;
  impairmentRate: number;
  impairmentAmount: number;
}

export interface InvAgingImpairmentData {
  meta: { updatedAt: string };
  rules: InvAgingImpairmentRule[];
  calculation: {
    normal: InvAgingBucketCalc;
    watch:  InvAgingBucketCalc;
    risk:   InvAgingBucketCalc;
  };
  totalImpairment: number;
  pnlImpact: { ebitImpactPct: number; note: string };
}
