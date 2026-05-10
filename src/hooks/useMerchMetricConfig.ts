'use client';
/**
 * src/hooks/useMerchMetricConfig.ts
 * 企划指标口径与业务标准配置 — 统一读取 data/merch_config/ 下所有JSON，返回结构化配置对象。
 * 所有字段均有安全回退，不会因配置缺失导致页面报错。
 */
import { useMemo } from 'react';

import metricDefinitionsRaw from '@/../data/merch_config/metric_definitions.json';
import metricUsageByPanelRaw from '@/../data/merch_config/metric_usage_by_panel.json';
import businessThresholdsRaw from '@/../data/merch_config/business_thresholds.json';
import seasonLifecycleRaw from '@/../data/merch_config/season_lifecycle_standards.json';
import productAgeRaw from '@/../data/merch_config/product_age_standards.json';
import categoryPriceRaw from '@/../data/merch_config/category_price_rules.json';
import channelMetricRaw from '@/../data/merch_config/channel_metric_rules.json';
import financialMetricRaw from '@/../data/merch_config/financial_metric_rules.json';
import cashflowMetricRaw from '@/../data/merch_config/cashflow_metric_rules.json';
import inventoryMetricRaw from '@/../data/merch_config/inventory_metric_rules.json';

// ─── 类型定义 ──────────────────────────────────────────────────────────────────

export interface MetricDefinition {
  metricId: string;
  label: string;
  description: string;
  unit: string;
  formula: string;
  defaultMetricType: string;
  usedBy: string[];
  source: string;
}

export interface PanelMetricUsage {
  label: string;
  requiredMetrics: string[];
  optionalMetrics: string[];
}

export interface ThresholdRule {
  status: 'health' | 'warning' | 'danger';
  condition: string;
  value: number;
  description: string;
}

export interface BusinessThreshold {
  metricId: string;
  label: string;
  unit: string;
  rules: ThresholdRule[];
}

export interface SeasonPhaseConfig {
  phaseId: string;
  salesShare: number;
  start: { month: number; day: number | 'month_end'; yearOffset: number };
  end: { month: number; day: number | 'month_end'; yearOffset: number };
  sellThroughTargetMin: number;
  sellThroughTargetMax: number;
}

export interface SeasonLifecycleConfig {
  label: string;
  english: string;
  phases: SeasonPhaseConfig[];
}

export interface ProductAgeLevel {
  levelId: string;
  label: string;
  dayMin: number;
  dayMax: number;
  description: string;
  targetSellThroughMin: number;
  targetSellThroughMax: number;
  discountSuggestion: string;
  otbAction: string;
  inventoryAction: string;
}

export interface CategoryPriceRule {
  ruleId: string;
  label: string;
  priority: number;
  brandId: string;
  channelId: string;
  season: string;
  categoryLevel1: string;
  categoryLevel2: string;
  categoryLevel3: string;
  priceBandId: string;
  priceBandLabel: string;
  minPrice: number;
  maxPrice: number;
  priceBandRole: string;
  targetSalesRatio: number | null;
  targetStyleRatio: number | null;
  targetSkuRatio: number | null;
  targetGrossMargin: number;
  targetMarkupRate: number;
  costCeiling: number | null;
  defaultSellThroughTarget: number;
  defaultDepthMin: number;
  defaultDepthMax: number;
}

export interface ChannelMetricRule {
  channelId: string;
  channelLabel: string;
  defaultSellThroughTarget: number;
  defaultDiscountRate: number;
  defaultReturnRate: number;
  defaultGrossMarginTarget: number;
  defaultStockToSalesRatio: number;
  defaultCollectionDays: number;
  defaultPlatformCommissionRate: number;
  capacityConstraintEnabled: boolean;
  capacityConstraintNote?: string;
  otherParams: Record<string, unknown>;
}

// ─── 财务 / 现金流 / 库存规则类型 ──────────────────────────────────────────────

export interface FinancialMetricRules {
  _note?: string;
  global?: {
    targetGrossMarginRate?: number;
    targetNetProfitRate?: number;
    valueAddedTaxRate?: number;
    corporateIncomeTaxRate?: number;
    effectiveTaxRateNote?: string;
  };
  channelFeeRates?: Record<string, number>;
  operatingExpenseRates?: Record<string, number>;
  discountLossRule?: {
    method?: string;
    description?: string;
    markdownLossAccountingCode?: string;
    annualMarkdownLossBudgetRate?: number;
    warningThresholdRate?: number;
    dangerThresholdRate?: number;
  };
  grossProfitDefinition?: {
    description?: string;
    cogsBasis?: string;
    cogsIncludesWarehouse?: boolean;
    cogsIncludesInboundLogistics?: boolean;
  };
}

export interface CashflowMetricRules {
  _note?: string;
  salesCollection?: Record<string, { collectionDays?: number; description?: string; depositRateOnOrder?: number; balanceRateOnShipment?: number }>;
  supplierPayment?: {
    depositRate?: number;
    depositTiming?: string;
    balanceRate?: number;
    balanceTiming?: string;
    balancePaymentTermDays?: number;
    description?: string;
  };
  cashManagement?: {
    minimumCashBalance?: number;
    minimumCashBalanceNote?: string;
    fundingGapWarningThreshold?: number;
    fundingGapDangerThreshold?: number;
    shortTermCreditLine?: number;
    shortTermCreditLineNote?: string;
  };
  inventoryCapitalRule?: {
    method?: string;
    turnoverDays?: number;
    turnoverDaysNote?: string;
    capitalCostRate?: number;
    capitalCostRateNote?: string;
  };
}

export interface InventoryMetricRules {
  _note?: string;
  turnoverTargets?: {
    annualTurnoverTimesMin?: number;
    annualTurnoverTimesTarget?: number;
    annualTurnoverTimesMax?: number;
    inventoryDaysMin?: number;
    inventoryDaysTarget?: number;
    inventoryDaysMax?: number;
    note?: string;
  };
  stockToSalesTargets?: Record<string, { healthy: number; warning: number }>;
  weeksOfSupplyTargets?: Record<string, { healthy: number; warning: number; danger: number }>;
  ageWarningDays?: { watch?: number; aged?: number; clearance?: number; note?: string };
  agedInventoryRateThresholds?: { healthy?: number; warning?: number; danger?: number; note?: string };
  brokenSizeThresholds?: { healthy?: number; warning?: number; danger?: number; note?: string };
  inventoryReduceActions?: Array<{ triggerCondition: string; action: string; discountRange: [number, number]; priority: number }>;
}

// ─── 主 Hook ──────────────────────────────────────────────────────────────────

export interface MerchMetricConfig {
  metricDefinitions: MetricDefinition[];
  metricUsageByPanel: Record<string, PanelMetricUsage>;
  businessThresholds: BusinessThreshold[];
  seasonLifecycle: {
    note: string;
    phases: { phaseId: string; label: string; description: string }[];
    seasons: Record<string, SeasonLifecycleConfig>;
  };
  productAgeLevels: ProductAgeLevel[];
  categoryPriceRules: CategoryPriceRule[];
  channelMetricRules: ChannelMetricRule[];
  financialMetricRules: FinancialMetricRules;
  cashflowMetricRules: CashflowMetricRules;
  inventoryMetricRules: InventoryMetricRules;
}

export function useMerchMetricConfig(): MerchMetricConfig {
  return useMemo<MerchMetricConfig>(() => ({
    metricDefinitions: metricDefinitionsRaw as MetricDefinition[],
    metricUsageByPanel: metricUsageByPanelRaw as Record<string, PanelMetricUsage>,
    businessThresholds: (businessThresholdsRaw as { thresholds: BusinessThreshold[] }).thresholds ?? [],
    seasonLifecycle: seasonLifecycleRaw as unknown as MerchMetricConfig['seasonLifecycle'],
    productAgeLevels: (productAgeRaw as { levels: ProductAgeLevel[] }).levels ?? [],
    categoryPriceRules: (categoryPriceRaw as { rules: CategoryPriceRule[] }).rules ?? [],
    channelMetricRules: (channelMetricRaw as { rules: ChannelMetricRule[] }).rules ?? [],
    financialMetricRules: financialMetricRaw as unknown as FinancialMetricRules,
    cashflowMetricRules: cashflowMetricRaw as unknown as CashflowMetricRules,
    inventoryMetricRules: inventoryMetricRaw as unknown as InventoryMetricRules,
  }), []);
}
