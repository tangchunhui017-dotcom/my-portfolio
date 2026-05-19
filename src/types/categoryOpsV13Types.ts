// src/types/categoryOpsV13Types.ts
// V13 品类运营决策工作台 — 鞋类品牌品类增长与结构优化

export type RiskLevel = 'healthy' | 'opportunity' | 'warning' | 'high' | 'observe' | 'none';
export type ActionStatus = 'suggested' | 'pending' | 'in_progress' | 'done' | 'closed';
export type CategoryRole = 'growth' | 'profit' | 'image' | 'basic' | 'test' | 'clearance';

export interface CategoryKpi {
    key: string;
    label: string;
    value: number;
    target?: number;
    delta?: number;        // vs target
    yoy?: number;          // vs last year
    mom?: number;          // vs last month
    format: 'amount' | 'pct' | 'count' | 'ratio' | 'days';
    riskLevel: RiskLevel;
    note?: string;
}

export interface CategoryAction {
    id: string;
    priority: 1 | 2 | 3;
    /** 问题对象 */
    subject: string;
    subjectType: 'category' | 'shoeType' | 'sku' | 'priceBand' | 'wave' | 'channel';
    riskTags: string[];
    riskReason: string;
    recommendedAction: string;
    actionType:
        | 'increase_otb'
        | 'freeze_otb'
        | 'reduce_sku'
        | 'deepen_key_sku'
        | 'clear_long_tail'
        | 'adjust_price_band'
        | 'adjust_wave_structure'
        | 'adjust_design_direction'
        | 'adjust_channel_allocation'
        | 'review_design_direction';
    expectedSalesImpact: number;
    expectedMarginImpact: number;
    expectedInventoryImpact: number;
    expectedCashImpact: number;
    relatedModules: string[];
    status: ActionStatus;
    deadline?: string;
    owner?: string;
}

export interface CategoryRoleItem {
    categoryId: string;
    category: string;
    categoryRole: CategoryRole;
    salesAmount: number;
    grossMargin: number;
    inventoryAmount: number;
    sellThroughRate: number;
    wos: number;
    otbRecommendation: string;
    waveRecommendation: string;
    designRecommendation: string;
    riskLevel: RiskLevel;
    yoy?: number;
}

export interface CategoryStructureItem {
    category: string;
    salesContribution: number;
    grossProfitContribution: number;
    inventoryContribution: number;
    otbContribution: number;
    skuContribution: number;
    sellThroughRate: number;
    wos: number;
    markdownRate: number;
    yoy: number;
    mom?: number;
    recommendedAction: string;
    riskLevel: RiskLevel;
}

export interface ContributionBreakdownItem {
    category: string;
    salesContribution: number;
    grossProfitContribution: number;
    growthContribution: number;
    newProductContribution: number;
    markdownLoss: number;
    inventoryRiskContribution: number;
    isPulling: boolean;      // 拉动 vs 拖累
    riskLevel: RiskLevel;
    recommendedAction: string;
}

export interface SkuParetoItem {
    skuId: string;
    styleId: string;
    styleName: string;
    category: string;
    shoeType: string;
    priceBand: string;
    salesAmount: number;
    grossProfit: number;
    grossMargin: number;
    sellThroughRate: number;
    inventoryAmount: number;
    wos: number;
    skuRole: string;
    recommendedAction: string;
    cumulativeSalesShare: number;
}

export interface SupplyDemandEfficiencyItem {
    category: string;
    salesShare: number;
    inventoryShare: number;
    otbShare: number;
    skuShare: number;
    supplyDemandRatio: number;
    sellThroughRate: number;
    wos: number;
    stockoutRisk: boolean;
    overstockRisk: boolean;
    diagnosis: 'shortage' | 'overstock' | 'over_otb' | 'low_sku_efficiency' | 'balanced';
    recommendedAction: string;
    riskLevel: RiskLevel;
}

export interface WidthDepthAnalysisItem {
    category: string;
    plannedSkuCount: number;
    actualSkuCount: number;
    skuWidth: number;
    averageDepth: number;
    storeAverageDepth: number;
    coreSizeDepth: number;
    sizeCompleteness: number;
    sellThroughRate: number;
    grossMargin: number;
    inventoryRisk: RiskLevel;
    quadrant: 'deepen' | 'reduce' | 'maintain' | 'watchMargin';
    recommendedAction: string;
}

export interface DesignSignalItem {
    id: string;
    shoeType: string;
    color: string;
    material: string;
    functionBenefit: string;
    seriesName: string;
    salesGrowth: number;
    sellThroughRate: number;
    grossMargin: number;
    returnRate: number;
    consumerFeedback: string;
    designRecommendation:
        | 'continue'
        | 'small_batch'
        | 'reduce'
        | 'stop'
        | 'hero_visual';
    designRecommendationLabel: string;
    riskLevel: RiskLevel;
    // 鞋类专业字段（可选，向后兼容）
    lastType?: string;         // 楦型偏好
    soleStructure?: string;    // 鞋底结构
    colorStory?: string;       // 颜色故事
    materialTrend?: string;    // 材质趋势
    wearingScene?: string;     // 穿着场景
    competitorRef?: string;    // 竞品参考
    designAdvice?: string;     // 设计建议
    funcTags?: string[];       // 功能卖点标签
}

export interface CategoryOtbRecommendation {
    category: string;
    currentOtb: number;
    recommendedOtb: number;
    adjustment: number;
    adjustmentReason: string;
    expectedSalesImpact: number;
    expectedInventoryImpact: number;
    expectedMarginImpact: number;
    expectedCashImpact: number;
    recommendedAction: string;
    riskLevel: RiskLevel;
}

export interface CategorySkuDetailItem {
    skuId: string;
    styleId: string;
    styleName: string;
    category: string;
    shoeType: string;
    color: string;
    material: string;
    priceBand: string;
    skuRole: string;
    salesAmount: number;
    salesUnits: number;
    grossProfit: number;
    grossMargin: number;
    sellThroughRate: number;
    inventoryAmount: number;
    wos: number;
    sizeCompleteness: number;
    currentOtb: number;
    recommendedAction: string;
    riskLevel: RiskLevel;
    highlight: 'top_sales' | 'high_margin' | 'high_risk' | 'inefficient' | 'high_growth' | null;
}

export interface CategoryRelatedModuleLink {
    moduleId: string;
    moduleLabel: string;
    description: string;
    params: Record<string, string | number>;
    icon: string;
}
