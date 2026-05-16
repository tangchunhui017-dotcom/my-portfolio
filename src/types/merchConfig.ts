/**
 * src/types/merchConfig.ts
 * 商品企划 V17 多品牌配置化架构 — 核心类型定义
 */

export type TabKey =
  | 'overview'
  | 'annual-control'
  | 'region-store'
  | 'consumer'
  | 'category-ops'
  | 'wave-planning'
  | 'otb'
  | 'cashflow'
  | 'forecast'
  | 'pnl'
  | 'competitor-trend'
  | 'inventory-health';

export const ALL_TABS: TabKey[] = [
  'overview',
  'annual-control',
  'region-store',
  'consumer',
  'category-ops',
  'wave-planning',
  'otb',
  'cashflow',
  'forecast',
  'pnl',
  'competitor-trend',
  'inventory-health',
];

export type ConfigSource = 'platform' | 'industry' | 'brand' | 'user';

export type MetricUnit =
  | 'currency'
  | 'percent'
  | 'pairs'
  | 'count'
  | 'days'
  | 'weeks'
  | 'times'
  | 'ratio'
  | 'sqm';

export interface MetricDefinition {
  metricId: string;
  label: string;
  /** 英文名称（便于跨团队/跨系统对齐） */
  englishName?: string;
  description: string;
  unit: MetricUnit;
  formula: string;
  variables?: string[];
  defaultMetricType: 'standard' | 'reference' | 'derived';
  usedBy: TabKey[];
  category?: string;
  /** 兼容旧命名 / 跨系统别名（如 net_sales、retail_qty 等历史 ID） */
  aliases?: string[];
  source: ConfigSource;
}

export interface DimensionValue {
  id: string;
  label: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface DimensionDefinition {
  dimensionId: string;
  label: string;
  type: string;
  values: DimensionValue[];
  /** 维度级元数据（不属于任何单值的全局规则，如尺码维度的动态修正规则） */
  metadata?: Record<string, unknown>;
  scope?: TabKey[];
  source?: ConfigSource;
}

export interface ThresholdDefinition {
  thresholdId: string;
  label: string;
  unit: MetricUnit | string;
  defaultValue: number;
  warningValue?: number;
  criticalValue?: number;
  comparator?: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  appliedTo: TabKey[];
  source?: ConfigSource;
}

export interface TabSectionConfig {
  id: string;
  label: string;
  enabled: boolean;
  order?: number;
  collapsedByDefault?: boolean;
  config?: Record<string, unknown>;
}

export interface TabConfig {
  tabKey: TabKey;
  sections: TabSectionConfig[];
  customSettings?: Record<string, unknown>;
}

export interface IndustryMeta {
  id: string;
  label: string;
  version: string;
  description?: string;
  supportedTabs: TabKey[];
  createdAt?: string;
}

export interface BrandMeta {
  brandId: string;
  brandName: string;
  industry: string;
  industryTemplateVersion: string;
  logo?: string;
  color?: string;
  fiscalYear?: number;
  baseYear?: number;
  createdAt?: string;
}

export interface MergedMerchConfig {
  brand: BrandMeta;
  industry: IndustryMeta;
  metrics: Map<string, MetricDefinition>;
  dimensions: Map<string, DimensionDefinition>;
  thresholds: Map<string, ThresholdDefinition>;
  tabs: Map<TabKey, TabConfig>;
  overrideMap: {
    metrics: Set<string>;
    dimensions: Set<string>;
    thresholds: Set<string>;
    tabs: Set<TabKey>;
  };
}
