/**
 * src/components/otb/types.ts
 * OTB 预算模块统一 TypeScript 类型定义
 * 覆盖：年度总控 / 月度滚动 / 波段预算 / 品类&款深 / 价格&结构 / 渠道分配 / 执行跟踪
 */

import type { CurrencyUnit } from '@/utils/otbCalculations';

// ─── 通用枚举 ─────────────────────────────────────────────────────────────────

export type OtbApprovalStatusValue =
    | '草稿'
    | '待商品总监审批'
    | '待财务审批'
    | '已批准'
    | '已冻结'
    | '已驳回'
    | '已执行';

export type OtbRiskLevel = 'P0' | 'P1' | 'P2';

export type OtbActionType =
    | '增加OTB'
    | '冻结OTB'
    | '减少采购'
    | '延后下单'
    | '提前补货'
    | '停止补货'
    | '清理库存'
    | '调整波段'
    | '调整款深'
    | '调整价格带'
    | '调整渠道分配'
    | '提交审批'
    | '驳回重算';

export type OtbBudgetVersion = '计划' | '预测' | '实际' | '差异';

export type OtbModuleKey =
    | 'annual'
    | 'monthly'
    | 'wave'
    | 'category'
    | 'pricestructure'
    | 'channel'
    | 'execution'
    | 'import'
    | 'cashflow'
    | 'forecast'
    | 'inventory'
    | 'profit-loss'
    | 'planning';

export interface OtbNavigationContext {
    source: OtbModuleKey | 'otb';
    targetModule: OtbModuleKey | string;
    createdAt?: string;
    subject?: string;
    riskTag?: OtbActionRiskTag;
    recommendedAction?: OtbActionType | string;
    category?: string;
    waveId?: string;
    waveName?: string;
    skuId?: string;
    styleId?: string;
    channel?: string;
    region?: string;
    storeType?: string;
    month?: number;
    otbBudget?: number;
    otbUsed?: number;
    otbVariance?: number;
    orderedAmount?: number;
    deliveredAmount?: number;
    purchasePayment?: number;
    cashGap?: number;
    freezeAmount?: number;
    forecastSales?: number;
    forecastGap?: number;
    wos?: number;
    inventoryRiskAmount?: number;
    sizeCompleteness?: number;
    cogs?: number;
    grossMargin?: number;
    markdownRisk?: number;
    profitImpact?: number;
    plannedSkuCount?: number;
    skuLimit?: number;
    riskLevel?: OtbRiskLevel;
    skuWidth?: number;
    averageDepth?: number;
    inventorySupportRate?: number;
    replenishmentSuggestion?: string;
}

export type OtbJumpHandler = (tab: OtbModuleKey | string, context?: OtbNavigationContext) => void;

// ─── 核心 KPI ─────────────────────────────────────────────────────────────────

export interface OtbKpi {
    annualSalesTarget: number;
    annualOtbBudget: number;
    allocatedOtb: number;
    approvedOtb: number;
    orderedAmount: number;
    remainingOtb: number;
    frozenOtb: number;
    budgetUtilizationRate: number;
    estimatedEndingInventory: number;
    targetGrossMargin: number;
    currencyUnit: CurrencyUnit;
}

// ─── OTB 公式分解 ─────────────────────────────────────────────────────────────

export interface OtbFormulaValues {
    plannedSales?: number;
    plannedGrossMargin?: number;
    plannedSalesCost?: number;
    beginningInventory?: number;
    endingInventoryTarget?: number;
    onOrderInventory?: number;
    committedPurchase?: number;
    otbBudget?: number;
    otbUsed?: number;
    otbAvailable?: number;
    otbFrozen?: number;
    otbVariance?: number;
    currencyUnit?: CurrencyUnit;
}

export interface OtbFormulaBreakdown extends OtbFormulaValues {
    formulaLabel?: string;
    formulaNote?: string;
}

// ─── 预算锁定状态 ─────────────────────────────────────────────────────────────

export interface OtbBudgetLockStatus {
    unallocated: number;
    allocated: number;
    approved: number;
    ordered: number;
    delivered: number;
    frozen: number;
    total: number;
}

// ─── 行动建议 ─────────────────────────────────────────────────────────────────

export type OtbActionRiskTag = '超买' | '欠买' | '缺货' | '积压' | '现金不足' | '毛利风险' | '审批延迟';

export interface OtbActionModuleLink extends OtbRelatedModuleLink {
    context?: OtbNavigationContext;
}

export interface OtbAction {
    id: string;
    /** 问题对象 */
    subject: string;
    /** 风险标签 */
    riskTag: OtbActionRiskTag;
    priority: OtbRiskLevel;
    /** 问题原因 */
    reason: string;
    /** 建议动作 */
    actionType: OtbActionType;
    description: string;
    /** 影响金额 */
    forecastSalesImpact?: number;
    forecastInventoryImpact?: number;
    forecastCashImpact?: number;
    forecastMarginImpact?: number;
    /** 关联模块 */
    relatedModules?: OtbModuleKey[];
    relatedModuleLinks?: OtbActionModuleLink[];
    /** 执行状态 */
    actionStatus?: '待处理' | '处理中' | '已完成' | '已忽略';
}

// ─── 年度总控 ─────────────────────────────────────────────────────────────────

export interface AnnualOtbSummary {
    year: number;
    annualSalesTarget: number;
    annualOtbBudget: number;
    approvedBudget: number;
    budgetGap: number | null;
    carryoverRatio: number;
    weightedSellThroughTarget: number;
    ssSalesTarget: number;
    awSalesTarget: number;
    annualNewProductBudget: number;
    currencyUnit: CurrencyUnit;
}

// ─── 月度滚动重算 ─────────────────────────────────────────────────────────────

export interface MonthlyOtbRecalculation {
    month: number;
    originalOtb: number;
    forecastSalesDelta: number;
    inventoryDelta: number;
    onOrderDelta: number;
    cashConstraint: number;
    recalculatedOtb: number;
    adjustmentAmount: number;
    recommendedAction: OtbActionType;
    currencyUnit: CurrencyUnit;
}

// ─── 波段预算 ─────────────────────────────────────────────────────────────────

export interface WaveOtbBudget {
    waveId: string;
    waveName: string;
    season: string;
    launchDate: string;
    plannedSkuCount: number;
    plannedHeroSkuCount: number;
    plannedSales: number;
    otbBudget: number;
    otbUsed: number;
    otbAvailable: number;
    expectedInventory: number;
    wos: number;
    sellThroughRate: number | null;
    riskLevel: OtbRiskLevel;
    recommendedAction?: OtbActionType;
    /** 企划计划 SKU 数（用于对比） */
    planSkuCount?: number;
    /** 预算能支撑的 SKU 上限 */
    maxSupportedSkuCount?: number;
    currencyUnit: CurrencyUnit;
}

// ─── 品类&款深 ────────────────────────────────────────────────────────────────

export interface CategoryDepthOtb {
    category: string;
    subCategory?: string;
    season?: string;
    waveId?: string;
    plannedSkuCount: number;
    actualSkuCount: number;
    skuWidth: number;
    averageDepth: number;
    coreSizeDepth: number;
    longTailSizeRatio: number;
    otbBudget: number;
    otbPerSku: number;
    forecastUnits: number;
    sellThroughRate: number | null;
    grossMargin: number;
    inventoryRiskAmount: number;
    recommendedAction?: OtbActionType;
    currencyUnit: CurrencyUnit;
}

// ─── 价格&结构 ────────────────────────────────────────────────────────────────

export interface PriceStructureOtb {
    priceBand: string;
    role: '引流款' | '主力款' | '利润款' | '形象款' | '清仓款';
    plannedSales: number;
    otbBudget: number;
    forecastUnits: number;
    grossMargin: number;
    markdownSpace: number;
    minAcceptableDiscount: number;
    roi: number;
    inventoryRisk: number;
    recommendedAction?: OtbActionType;
    currencyUnit: CurrencyUnit;
}

// ─── 渠道分配 ─────────────────────────────────────────────────────────────────

export interface ChannelOtbAllocation {
    channel: string;
    channelType: '直营门店' | '电商平台' | '加盟' | '奥莱' | '新店' | '快闪';
    plannedSales: number;
    forecastSales: number;
    otbBudget: number;
    otbUsed: number;
    inventoryUnits: number;
    onOrderUnits: number;
    inventorySupportRate: number;
    wos: number;
    grossMargin: number;
    returnRate: number;
    platformFee: number;
    cashCollectionDays: number;
    cashEfficiency: number;
    riskLevel: OtbRiskLevel;
    recommendedAction?: OtbActionType;
    /** 调拨建议 */
    transferSuggestion?: string;
    currencyUnit: CurrencyUnit;
}

// ─── 执行漏斗 ─────────────────────────────────────────────────────────────────

export interface OtbExecutionFunnel {
    step: '预算生成' | '预算审批' | '采购申请' | 'PO下单' | '供应商确认' | '在途' | '到货' | '入库' | '销售验证';
    count: number;
    completionRate: number;
    color: string;
}

// ─── 审批状态 ─────────────────────────────────────────────────────────────────

export interface OtbApprovalStatus {
    recordId: string;
    season: string;
    waveId: string;
    category?: string;
    channel?: string;
    otbBudget: number;
    approvalStatus: OtbApprovalStatusValue;
    submittedAt?: string;
    approvedAt?: string;
    approvedBy?: string;
    rejectionReason?: string;
}

// ─── 采购订单跟踪 ─────────────────────────────────────────────────────────────

export interface PurchaseOrderTracking {
    poId: string;
    skuId?: string;
    styleId?: string;
    category?: string;
    waveId: string;
    channel?: string;
    otbBudget: number;
    orderedAmount: number;
    deliveredAmount: number;
    varianceAmount: number;
    varianceRate: number;
    currentInventory?: number;
    forecastSales?: number;
    recommendedAction?: OtbActionType;
    /** 超买/欠买 */
    alertType?: '超买' | '欠买';
    approvalStatus: OtbApprovalStatusValue;
    executionStatus?: '未开始' | '计划中' | '已审批' | '已下单' | '已到货' | '偏差预警' | '已关闭';
    currencyUnit: CurrencyUnit;
}

// ─── 关联模块跳转链接 ─────────────────────────────────────────────────────────

export interface OtbRelatedModuleLink {
    targetModule: OtbModuleKey | string;
    label: string;
    icon?: string;
    /** 跳转时携带的上下文参数 */
    params?: {
        category?: string;
        waveId?: string;
        skuId?: string;
        channel?: string;
        forecastSales?: number;
        forecastGap?: number;
        wos?: number;
        inventoryRiskAmount?: number;
        otbBudget?: number;
        plannedSkuCount?: number;
        month?: number;
        otbUsed?: number;
        cashGap?: number;
        grossMargin?: number;
        markdownRisk?: number;
        profitImpact?: number;
    };
    colorScheme?: 'sky' | 'violet' | 'emerald' | 'amber' | 'slate';
}
