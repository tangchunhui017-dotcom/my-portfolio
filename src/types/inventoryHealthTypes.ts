/**
 * src/types/inventoryHealthTypes.ts
 * Inventory Health V3 — shared type definitions
 */

export type RiskLevel = 'critical' | 'high' | 'medium' | 'healthy' | 'opportunity';
export type ActionStatus = 'suggested' | 'pending' | 'in_progress' | 'done' | 'closed';
export type ActionType = 'replenish' | 'markdown' | 'transfer' | 'clearance' | 'monitor';
export type LifecycleStage = 'new' | 'growth' | 'maturity' | 'decline' | 'clearance';

export interface InventoryHealthKpi {
  totalInventoryCost: number;
  totalInventoryRetail: number;
  overallWos: number;
  healthySkuPct: number;
  riskInventoryAmount: number;
  brokenSizeSkuCount: number;
  estimatedMarkdownLoss: number;
  estimatedCashRelease: number;
  targets: { overallWos: number; healthySkuPct: number; brokenSizeSkuCount: number };
  vsLastWeek: Record<string, number>;
}

export interface InventoryAction {
  id: string;
  priority: number;
  riskLevel: RiskLevel;
  skuId: string;
  styleName: string;
  category: string;
  waveId: string;
  riskReason: string;
  recommendedAction: string;
  actionType: ActionType;
  expectedImpact: string;
  expectedCashRelease: number;
  expectedMarginImpact: number;
  status: ActionStatus;
  relatedModules: string[];
  deadline: string;
  owner: string;
}

export interface InventoryRiskMatrixItem {
  id: string;
  name: string;
  category: string;
  waveId: string;
  channel: string;
  lifecycleStage: string;
  priceBand: string;
  wos: number;
  sellThroughRate: number;
  inventoryCost: number;
  riskLevel: RiskLevel;
}

export interface WosDistributionItem {
  bucket: string;
  label: string;
  min: number;
  max: number;
  skuCount: number;
  inventoryCost: number;
  pct: number;
  action: string;
}

export interface InventoryAgingItem {
  bucket: string;
  label: string;
  days: string;
  inventoryCost: number;
  skuCount: number;
  sellThroughRate: number;
  wos: number;
  riskLevel: RiskLevel;
  action: string;
}

export interface RiskSkuItem {
  skuId: string;
  styleId: string;
  styleName: string;
  category: string;
  waveId: string;
  waveName: string;
  season: string;
  channel: string;
  lifecycleStage: string;
  priceBand: string;
  inventoryUnits: number;
  inventoryCost: number;
  inventoryRetail: number;
  sellThroughRate: number;
  wos: number;
  sizeCompleteness: number;
  coreSizeCompleteness: number;
  forecastUnits: number;
  actualSalesUnits: number;
  forecastVariance: number;
  markdownRate: number;
  riskLevel: RiskLevel;
  riskReason: string;
  recommendedAction: string;
  expectedCashRelease: number;
  expectedMarginImpact: number;
  relatedModules: string[];
}

export interface SizeHealthCategory {
  key: string;
  label: string;
  gender: string;
  coreSizes: string[];
  womenCoreSizes: string[];
  sizeCompleteness: number;
  coreSizeCompleteness: number;
  topBrokenSizes: string[];
  topOverstockSizes: string[];
  status: string;
  brokenSkuCount: number;
  overstockSkuCount: number;
}

export interface WaveInventoryHealthItem {
  waveId: string;
  waveName: string;
  launchDate: string;
  plannedSkuCount: number;
  actualSkuCount: number;
  inventoryCost: number;
  sellThroughRate: number;
  wos: number;
  riskInventoryAmount: number;
  lifecycleStage: string;
  affectsNextWave: boolean;
  affectsNote: string;
  action: string;
}

export interface LifecycleInventoryItem {
  stage: string;
  label: string;
  inventoryCost: number;
  skuCount: number;
  wos: number;
  sellThroughRate: number;
  markdownRate: number;
  action: string;
}

export interface FinancialImpactScenario {
  scenario: string;
  label: string;
  description: string;
  estimatedSalesAmount: number;
  estimatedCashRelease: number;
  markdownLoss: number;
  grossMarginImpact: number;
  inventoryRelease: number;
  estimatedWeeks: number;
}

export interface RelatedModuleLink {
  moduleId: string;
  label: string;
  relationship: string;
  href?: string;
}

export function fmtK(v: number) {
  if (v >= 1e7) return `¥${(v / 1e4).toFixed(0)}万`;
  if (v >= 1e4) return `¥${(v / 1e4).toFixed(1)}万`;
  return `¥${v.toFixed(0)}`;
}

export function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  healthy: '#22c55e',
  opportunity: '#3b82f6',
};

export const RISK_LABELS: Record<string, string> = {
  critical: '极高风险',
  high: '高风险',
  medium: '中风险',
  healthy: '健康',
  opportunity: '机会',
};

export const ACTION_STATUS_LABELS: Record<string, string> = {
  suggested: '建议中',
  pending: '待审批',
  in_progress: '执行中',
  done: '已完成',
  closed: '已关闭',
};

export const ACTION_STATUS_COLORS: Record<string, string> = {
  suggested: '#94a3b8',
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  done: '#22c55e',
  closed: '#6b7280',
};
