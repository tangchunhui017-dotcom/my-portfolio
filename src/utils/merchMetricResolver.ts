/**
 * src/utils/merchMetricResolver.ts
 * 企划指标解析器 — 带优先级回退的多维度规则匹配。
 * 所有函数都返回 { value, source, sourceLabel, isFallback } 结构，方便 UI 显示来源标签。
 * 纯工具函数，无副作用，可在 Server/Client 两侧使用。
 */

import type {
  MetricDefinition,
  PanelMetricUsage,
  BusinessThreshold,
  ThresholdRule,
  CategoryPriceRule,
  ChannelMetricRule,
  ProductAgeLevel,
  MerchMetricConfig,
} from '@/hooks/useMerchMetricConfig';

// ─── 公共返回结构 ──────────────────────────────────────────────────────────────

export interface ResolvedValue<T = unknown> {
  value: T;
  source: string;
  sourceLabel: string;
  isFallback: boolean;
}

function resolved<T>(value: T, source: string, sourceLabel: string, isFallback = false): ResolvedValue<T> {
  return { value, source, sourceLabel, isFallback };
}

const CATEGORY_PRICE_DIMENSIONS = [
  'brandId',
  'channelId',
  'season',
  'categoryLevel1',
  'categoryLevel2',
  'categoryLevel3',
  'priceBandId',
] as const;

function hasSpecificContextValue(value?: string): value is string {
  return Boolean(value && value !== '*' && value !== 'all');
}

function getMatchScore(rule: CategoryPriceRule, context: CategoryPriceContext): number {
  let score = 0;

  for (const field of CATEGORY_PRICE_DIMENSIONS) {
    const ruleValue = rule[field];
    const contextValue = context[field];

    if (ruleValue === '*') continue;
    if (!hasSpecificContextValue(contextValue) || ruleValue !== contextValue) return -1;
    score += 1;
  }

  return score;
}

function normalizeChannelKey(channelId?: string): string | undefined {
  if (!channelId) return undefined;
  return channelId.replace(/[-_]+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
}

function getNumericRecordValue(record: Record<string, unknown> | undefined, key?: string): number | undefined {
  if (!record || !key) return undefined;
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

// ─── 1. 指标定义解析 ───────────────────────────────────────────────────────────

/**
 * 通过 metricId 查找指标定义。找不到时返回占位定义。
 */
export function resolveMetricDefinition(
  metricId: string,
  config: Pick<MerchMetricConfig, 'metricDefinitions'>
): ResolvedValue<MetricDefinition | null> {
  const found = config.metricDefinitions.find(m => m.metricId === metricId);
  if (found) {
    return resolved(found, 'merch_config/metric_definitions', found.label, false);
  }
  return resolved(null, 'fallback', metricId, true);
}

// ─── 2. 面板指标清单解析 ───────────────────────────────────────────────────────

/**
 * 获取某面板的指标清单（必用 + 可选）。找不到时返回空列表。
 */
export function resolvePanelMetrics(
  panelKey: string,
  config: Pick<MerchMetricConfig, 'metricUsageByPanel'>
): ResolvedValue<PanelMetricUsage> {
  const found = config.metricUsageByPanel[panelKey];
  if (found) {
    return resolved(found, 'merch_config/metric_usage_by_panel', panelKey, false);
  }
  const fallback: PanelMetricUsage = { label: panelKey, requiredMetrics: [], optionalMetrics: [] };
  return resolved(fallback, 'fallback', panelKey, true);
}

// ─── 3. 业务阈值解析 ───────────────────────────────────────────────────────────

/**
 * 获取某指标的业务阈值规则列表。
 */
export function resolveBusinessThreshold(
  metricId: string,
  config: Pick<MerchMetricConfig, 'businessThresholds'>
): ResolvedValue<BusinessThreshold | null> {
  const found = config.businessThresholds.find(t => t.metricId === metricId);
  if (found) {
    return resolved(found, 'merch_config/business_thresholds', found.label, false);
  }
  return resolved(null, 'fallback', metricId, true);
}

/**
 * 根据实际值和阈值规则判断健康状态。
 * 阈值规则按顺序匹配，返回第一个命中的 status。
 */
export function evaluateThresholdStatus(
  value: number,
  rules: ThresholdRule[]
): 'health' | 'warning' | 'danger' | 'unknown' {
  for (const rule of rules) {
    let match = false;
    switch (rule.condition) {
      case '>=': match = value >= rule.value; break;
      case '>':  match = value > rule.value;  break;
      case '<=': match = value <= rule.value; break;
      case '<':  match = value < rule.value;  break;
      case '==': match = value === rule.value; break;
      default:   match = false;
    }
    if (match) return rule.status;
  }
  return 'unknown';
}

// ─── 4. 品类/价格带规则解析（10级优先级回退） ──────────────────────────────────

export interface CategoryPriceContext {
  brandId?: string;
  channelId?: string;
  season?: string;
  categoryLevel1?: string;
  categoryLevel2?: string;
  categoryLevel3?: string;
  priceBandId?: string;
}

/**
 * 多维度匹配品类价格带规则。
 * 优先级：精确匹配全部维度 → 逐步放宽 → 仅匹配priceBandId → 仅匹配categoryLevel1 → system default
 */
export function resolveCategoryPriceRule(
  context: CategoryPriceContext,
  config: Pick<MerchMetricConfig, 'categoryPriceRules'>
): ResolvedValue<CategoryPriceRule | null> {
  const rules = config.categoryPriceRules.filter(r => r.ruleId !== 'default');
  const defaultRule = config.categoryPriceRules.find(r => r.ruleId === 'default') ?? null;

  function matches(rule: CategoryPriceRule, ctx: CategoryPriceContext, level: number): boolean {
    const m = (ruleVal: string, ctxVal: string | undefined) =>
      ruleVal === '*' || (Boolean(ctxVal && ctxVal !== 'all' && ctxVal !== '*') && ruleVal === ctxVal);
    switch (level) {
      case 10: // 全匹配
        return m(rule.brandId, ctx.brandId) && m(rule.channelId, ctx.channelId) &&
               m(rule.season, ctx.season) && m(rule.categoryLevel1, ctx.categoryLevel1) &&
               m(rule.categoryLevel2, ctx.categoryLevel2) && m(rule.categoryLevel3, ctx.categoryLevel3) &&
               m(rule.priceBandId, ctx.priceBandId);
      case 9: // 去掉 brandId
        return m(rule.channelId, ctx.channelId) && m(rule.season, ctx.season) &&
               m(rule.categoryLevel1, ctx.categoryLevel1) && m(rule.categoryLevel2, ctx.categoryLevel2) &&
               m(rule.categoryLevel3, ctx.categoryLevel3) && m(rule.priceBandId, ctx.priceBandId);
      case 8: // 去掉 channelId
        return m(rule.brandId, ctx.brandId) && m(rule.season, ctx.season) &&
               m(rule.categoryLevel1, ctx.categoryLevel1) && m(rule.categoryLevel2, ctx.categoryLevel2) &&
               m(rule.priceBandId, ctx.priceBandId);
      case 7:
        return m(rule.categoryLevel1, ctx.categoryLevel1) && m(rule.categoryLevel2, ctx.categoryLevel2) &&
               m(rule.categoryLevel3, ctx.categoryLevel3) && m(rule.priceBandId, ctx.priceBandId);
      case 6:
        return m(rule.categoryLevel1, ctx.categoryLevel1) && m(rule.categoryLevel2, ctx.categoryLevel2) &&
               m(rule.priceBandId, ctx.priceBandId);
      case 5:
        return m(rule.categoryLevel1, ctx.categoryLevel1) && m(rule.priceBandId, ctx.priceBandId);
      case 4:
        return m(rule.priceBandId, ctx.priceBandId);
      case 3:
        return m(rule.categoryLevel1, ctx.categoryLevel1) && m(rule.categoryLevel2, ctx.categoryLevel2);
      case 2:
        return m(rule.categoryLevel1, ctx.categoryLevel1);
      default:
        return false;
    }
  }

  for (let level = 10; level >= 2; level--) {
    const matched = rules
      .filter(r => getMatchScore(r, context) >= 0 && matches(r, context, level))
      .sort((a, b) => b.priority - a.priority);
    if (matched.length > 0) {
      const rule = matched[0];
      return resolved(rule, 'merch_config/category_price_rules', rule.label, level < 10);
    }
  }

  if (defaultRule) {
    return resolved(defaultRule, 'merch_config/category_price_rules', '系统默认规则', true);
  }
  return resolved(null, 'fallback', '无匹配规则', true);
}

// ─── 5. 渠道指标规则解析 ───────────────────────────────────────────────────────

export interface ChannelMetricContext {
  channelId: string;
}

/**
 * 按 channelId 精确查找渠道规则，找不到时回退到第一条规则或 null。
 */
export function resolveChannelMetricRule(
  context: ChannelMetricContext,
  config: Pick<MerchMetricConfig, 'channelMetricRules'>
): ResolvedValue<ChannelMetricRule | null> {
  const found = config.channelMetricRules.find(r => r.channelId === context.channelId);
  if (found) {
    return resolved(found, 'merch_config/channel_metric_rules', found.channelLabel, false);
  }
  const fallback = config.channelMetricRules[0] ?? null;
  return resolved(fallback, 'fallback', fallback?.channelLabel ?? '无渠道规则', true);
}

// ─── 6. 货龄分级解析 ───────────────────────────────────────────────────────────

/**
 * 根据商品上市天数判断货龄分级。
 */
export function resolveProductAgeLevel(
  ageDays: number,
  config: Pick<MerchMetricConfig, 'productAgeLevels'>
): ResolvedValue<ProductAgeLevel | null> {
  const found = config.productAgeLevels.find(
    level => ageDays >= level.dayMin && ageDays <= level.dayMax
  );
  if (found) {
    return resolved(found, 'merch_config/product_age_standards', found.label, false);
  }
  return resolved(null, 'fallback', `${ageDays}天`, true);
}

// ─── 7. 财务指标解析（便捷访问器）─────────────────────────────────────────────

export interface FinancialMetricContext {
  channelId?: string;
}

export interface FinancialMetricRuleBundle {
  targetGrossMarginRate: number;
  targetNetProfitRate: number;
  valueAddedTaxRate: number;
  corporateIncomeTaxRate: number;
  channelFeeRate: number;
  operatingExpenseRates: Record<string, number>;
  discountLossRule: NonNullable<MerchMetricConfig['financialMetricRules']['discountLossRule']>;
  grossProfitDefinition: NonNullable<MerchMetricConfig['financialMetricRules']['grossProfitDefinition']>;
}

export function resolveFinancialMetricRule(
  context: FinancialMetricContext,
  config: Pick<MerchMetricConfig, 'financialMetricRules'>
): ResolvedValue<FinancialMetricRuleBundle> {
  const rules = config.financialMetricRules;
  const channelFeeRates = rules.channelFeeRates as Record<string, unknown> | undefined;
  const directFee = getNumericRecordValue(channelFeeRates, context.channelId);
  const normalizedFee = getNumericRecordValue(channelFeeRates, normalizeChannelKey(context.channelId));
  const channelFeeRate = directFee ?? normalizedFee ?? 0.18;
  const isFallback = directFee === undefined && normalizedFee === undefined;

  return resolved({
    targetGrossMarginRate: rules.global?.targetGrossMarginRate ?? 0.52,
    targetNetProfitRate: rules.global?.targetNetProfitRate ?? 0.12,
    valueAddedTaxRate: rules.global?.valueAddedTaxRate ?? 0.13,
    corporateIncomeTaxRate: rules.global?.corporateIncomeTaxRate ?? 0.25,
    channelFeeRate,
    operatingExpenseRates: rules.operatingExpenseRates ?? {},
    discountLossRule: rules.discountLossRule ?? {},
    grossProfitDefinition: rules.grossProfitDefinition ?? {},
  }, 'merch_config/financial_metric_rules', isFallback ? '财务全局默认规则' : '渠道财务规则', isFallback);
}

export function resolveFinancialTargetGrossMarginRate(
  config: Pick<MerchMetricConfig, 'financialMetricRules'>
): ResolvedValue<number> {
  const val = config.financialMetricRules.global?.targetGrossMarginRate ?? 0.52;
  return resolved(val, 'merch_config/financial_metric_rules', '目标毛利率', false);
}

export function resolveFinancialTargetNetProfitRate(
  config: Pick<MerchMetricConfig, 'financialMetricRules'>
): ResolvedValue<number> {
  const val = config.financialMetricRules.global?.targetNetProfitRate ?? 0.12;
  return resolved(val, 'merch_config/financial_metric_rules', '目标净利率', false);
}

export function resolveChannelFeeRate(
  channelId: string,
  config: Pick<MerchMetricConfig, 'financialMetricRules'>
): ResolvedValue<number> {
  const rates = config.financialMetricRules.channelFeeRates as Record<string, unknown> | undefined;
  const val = getNumericRecordValue(rates, channelId) ?? getNumericRecordValue(rates, normalizeChannelKey(channelId));
  if (val !== undefined) {
    return resolved(val, 'merch_config/financial_metric_rules', `${channelId}渠道费率`, false);
  }
  return resolved(0.18, 'fallback', '渠道费率默认值', true);
}

// ─── 8. 现金流规则解析 ─────────────────────────────────────────────────────────

export interface CashflowMetricContext {
  channelId?: string;
}

export interface CashflowMetricRuleBundle {
  salesCollection: {
    collectionDays: number;
    description?: string;
    depositRateOnOrder?: number;
    balanceRateOnShipment?: number;
  };
  supplierPayment: NonNullable<MerchMetricConfig['cashflowMetricRules']['supplierPayment']>;
  cashManagement: NonNullable<MerchMetricConfig['cashflowMetricRules']['cashManagement']>;
  inventoryCapitalRule: NonNullable<MerchMetricConfig['cashflowMetricRules']['inventoryCapitalRule']>;
}

export function resolveCashflowMetricRule(
  context: CashflowMetricContext,
  config: Pick<MerchMetricConfig, 'cashflowMetricRules'>
): ResolvedValue<CashflowMetricRuleBundle> {
  const rules = config.cashflowMetricRules;
  const salesCollection = rules.salesCollection ?? {};
  const directKey = context.channelId;
  const normalizedKey = normalizeChannelKey(context.channelId);
  const matchedCollection =
    (directKey ? salesCollection[directKey] : undefined) ??
    (normalizedKey ? salesCollection[normalizedKey] : undefined);
  const collection = matchedCollection ?? salesCollection.offlineDirect ?? { collectionDays: 0 };
  const isFallback = !matchedCollection;

  return resolved({
    salesCollection: {
      collectionDays: collection.collectionDays ?? 0,
      description: collection.description,
      depositRateOnOrder: collection.depositRateOnOrder,
      balanceRateOnShipment: collection.balanceRateOnShipment,
    },
    supplierPayment: rules.supplierPayment ?? {},
    cashManagement: rules.cashManagement ?? {},
    inventoryCapitalRule: rules.inventoryCapitalRule ?? {},
  }, 'merch_config/cashflow_metric_rules', isFallback ? '现金流默认回款规则' : '渠道现金流规则', isFallback);
}

export function resolveCashflowMinimumBalance(
  config: Pick<MerchMetricConfig, 'cashflowMetricRules'>
): ResolvedValue<number> {
  const val = config.cashflowMetricRules.cashManagement?.minimumCashBalance ?? 3000000;
  return resolved(val, 'merch_config/cashflow_metric_rules', '最低现金余额', false);
}

export function resolveSupplierPaymentTerms(
  config: Pick<MerchMetricConfig, 'cashflowMetricRules'>
): ResolvedValue<{ depositRate: number; balanceRate: number; balancePaymentTermDays: number }> {
  const sp = config.cashflowMetricRules.supplierPayment;
  const val = {
    depositRate: sp?.depositRate ?? 0.30,
    balanceRate: sp?.balanceRate ?? 0.70,
    balancePaymentTermDays: sp?.balancePaymentTermDays ?? 30,
  };
  return resolved(val, 'merch_config/cashflow_metric_rules', '供应商付款条件', false);
}

// ─── 9. 库存健康规则解析 ───────────────────────────────────────────────────────

export function resolveInventoryAgedThresholds(
  config: Pick<MerchMetricConfig, 'inventoryMetricRules'>
): ResolvedValue<{ watch: number; aged: number; clearance: number }> {
  const aw = config.inventoryMetricRules.ageWarningDays;
  const val = {
    watch: aw?.watch ?? 120,
    aged: aw?.aged ?? 180,
    clearance: aw?.clearance ?? 365,
  };
  return resolved(val, 'merch_config/inventory_metric_rules', '货龄预警天数', false);
}

export function resolveInventoryStockToSalesTarget(
  channelId: string,
  config: Pick<MerchMetricConfig, 'inventoryMetricRules'>
): ResolvedValue<{ healthy: number; warning: number }> {
  const targets = config.inventoryMetricRules.stockToSalesTargets ?? {};
  const val = targets[channelId] ?? targets['default'] ?? { healthy: 4.0, warning: 6.0 };
  const isFallback = !targets[channelId];
  return resolved(val, 'merch_config/inventory_metric_rules', `${channelId}存销比目标`, isFallback);
}
