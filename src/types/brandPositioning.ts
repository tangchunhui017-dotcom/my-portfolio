/**
 * src/types/brandPositioning.ts
 * 品牌定位 Tab 的数据契约 — 品牌定位标准库 + 商品企划判断台。
 *
 * 当前阶段（V1）：5 个核心模块走类型 + 默认数据，剩余 8 个模块在 V2 接入。
 */

export type PositioningVersion = '年度版' | '季度版' | '波段版' | '复盘版';
export type PositioningStatus = '草稿' | '已确认' | '执行中' | '待复盘';
export type RiskLevel = 'healthy' | 'opportunity' | 'warning' | 'risk' | 'design' | 'low';

/** ── 1. 总览 KPI ────────────────────────────────────────────────────────── */
export interface BrandPositioningKpi {
    kpiId: string;
    label: string;
    currentValue: string;
    targetValue: string;
    variance: string;
    status: RiskLevel;
    description: string;
}

/** ── 2. 品牌身份 ────────────────────────────────────────────────────────── */
export interface BrandIdentity {
    brandId: string;
    brandName: string;
    brandNameEnglish?: string;
    country: string;
    foundedYear: number;
    enterChinaYear?: number;
    founder: string;
    businessScope: string;
    productCategories: string[];
    brandSlogan: string;
    brandStory: string;
    brandMission: string;
    brandPromise: string;
    /** 大幅 hero/封面图（缺失时走占位） */
    mainImage?: string;
}

/** ── 2.5 品牌理念 ──────────────────────────────────────────────────────── */
export interface BrandPhilosophy {
    slogan: string;
    sloganEnglish: string;
    themeKeywords: string[];
    manifesto: string[];
    /** 5 张 mood 拼贴图（缺失时走占位） */
    moodImages: (string | null)[];
}

/** ── 3. 品牌 DNA / 品牌风格 关键词 ──────────────────────────────────────── */
export interface BrandDnaKeyword {
    keywordId: string;
    keywordName: string;
    keywordEnglish: string;
    keywordDefinition: string;
    /** 杂志层：诗意多行描述（4-5 行） */
    poeticDescription: string[];
    productExpression: string;
    designExpression: string;
    visualExpression: string;
    materialExpression: string;
    colorExpression: string;
    doRules: string[];
    dontRules: string[];
    /** 5 张 mood 图 URL（缺失走占位） */
    moodImages: (string | null)[];
}

/** ── 4. 品牌层级定位 ────────────────────────────────────────────────────── */
export type BrandTier =
    | '国际一线鞋履品牌'
    | '国际二线鞋履品牌'
    | '国内一线鞋履品牌'
    | '国内二线鞋履品牌'
    | '国内三线鞋履品牌'
    | '大众快时尚鞋履品牌';

/** 金字塔单层 — 从顶（最高端）到底（最低端） */
export interface TierLadderEntry {
    tierId: string;
    tierLabel: string;
    priceRange: [number, number];
    competitors: string[];
    isOwnTier?: boolean;
}

/** 风格象限关键词 — x/y ∈ [-1, 1]，圆心 (0,0) */
export interface QuadrantKeyword {
    keyword: string;
    x: number;
    y: number;
    /** 是否落在中央圆内（视觉权重） */
    inCircle?: boolean;
}

/** 风格象限定义 */
export interface StyleQuadrant {
    axes: { x: { left: string; right: string }; y: { top: string; bottom: string } };
    cornerLabels: { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string };
    keywords: QuadrantKeyword[];
    brandPosition: { x: number; y: number };
    /** 上季度位置（用于显示漂移箭头），可选 */
    previousPosition?: { x: number; y: number };
    /** 竞品位置，可选 */
    competitorPositions?: { name: string; x: number; y: number }[];
}

export interface BrandTierPositioning {
    brandTier: BrandTier;
    competitiveSet: string;
    upperCompetitors: string[];
    directCompetitors: string[];
    lowerCompetitors: string[];
    priceFloor: number;
    corePriceBand: [number, number];
    premiumPriceBand: [number, number];
    brandPositionDescription: string;
    /** 金字塔阶梯（从最高端到最低端） */
    tierLadder: TierLadderEntry[];
    /** 风格象限定义（可选，缺失时不渲染象限） */
    styleQuadrant?: StyleQuadrant;
}

/** ── 5. 系列结构策略 ────────────────────────────────────────────────────── */
export type SeriesRole = '品牌光环 / 营销预算' | '流量引擎 / 季节性' | '基石业务 / 现金奶牛';
export type PlanningRole = '形象款' | '主推款' | '常青款' | '促销款';

export interface SeriesPortfolioItem {
    seriesId: string;
    seriesName: string;
    seriesRole: SeriesRole;
    targetShareMin: number;
    targetShareMax: number;
    currentShare: number;
    targetConsumer: string;
    targetPriceBand: [number, number];
    targetGrossMargin: number;
    suggestedSkuCount: number;
    suggestedOtbShare: number;
    planningRole: PlanningRole;
    riskLevel: RiskLevel;
    recommendedAction: string;
    /** 杂志层：诗意多行描述（PPT 风格） */
    poeticDescription: string[];
    /** 2x2 mood 拼贴图（缺失走占位） */
    moodImages: (string | null)[];
}

/** ── 6. 价格架构 ────────────────────────────────────────────────────────── */
export type PricingRole = '入门款' | '主力款' | '形象款' | '高端拓展';

export interface PriceArchitectureItem {
    category: string;
    subCategory?: string;
    /** 细分品类（多个），用于转置矩阵的"细分品类"行 */
    subCategories?: string[];
    channel: string;
    entryPriceBand: [number, number];
    corePriceBand: [number, number];
    premiumPriceBand: [number, number];
    priceFloor: number;
    priceCeiling: number;
    targetGrossMargin: number;
    markdownSafetyLine: number;
    pricingRole: PricingRole;
    riskLevel: RiskLevel;
    recommendedAction: string;
}

/** ── 7. 目标客群定义 ───────────────────────────────────────────────────── */
export interface TargetConsumerSegment {
    segmentName: string;
    ageRange: string;
    mentalAgeRange: string;
    targetShare: number;
    actualShare?: number;
    occupationTags: string[];
    lifestyleTags: string[];
    purchaseMotivation: string;
    purchaseBarrier: string;
    priceAcceptance: [number, number];
    stylePreference: string[];
    scenarioPreference: string[];
    productSuggestion: string;
    /** 杂志层：人群行为长描述（8-10 行） */
    personaDescription: string[];
}

/** 客群整体概述（中心年龄层 + 心理年龄层 + 诗意摘要 + 职业列表 + 5 portrait 图） */
export interface ConsumerOverview {
    centralAgeRange: string;
    mentalAgeRange: string;
    poeticSummary: string[];
    /** 品牌目标客群的职业画像（11 项左右，跨年龄段汇总） */
    occupations: string[];
    /** 职业 mood 拼图（4 图，缺失走占位） */
    occupationImages: (string | null)[];
    portraitImages: (string | null)[];
}

/** ── 8. 生活方式与场景 ─────────────────────────────────────────────────── */
export interface LifestyleScenarioItem {
    scenario: string;
    lifestyleKeyword: string;
    relatedCategory: string[];
    relatedShoeType: string[];
    productOpportunity: string;
    designSuggestion: string;
    channelSuggestion: string;
}

/** 生活方式整体概述（用于 09 顶部 PPT 杂志层） */
export interface LifestyleOverview {
    /** 10 个 lifestyle 关键词 slash 串 — 顶部展示 */
    scenarios: string[];
    /** 诗意摘要（4-5 行） */
    poeticSummary: string[];
    /** 5 张 portrait/lifestyle 图（缺失走占位） */
    moodImages: (string | null)[];
}

/** ── 9. 品牌策略矩阵 ───────────────────────────────────────────────────── */
export type StrategyDimension = '产品' | '价格' | '服务' | '渠道' | '供应链' | '组织';
export type StrategyType = 'SO 进攻' | 'WO 改良' | 'ST 防御' | 'WT 止损';
export type StrategyStatus = '草稿' | '执行中' | '已完成' | '搁置';

export interface BrandStrategyMatrixItem {
    strategyId: string;
    strategyDimension: StrategyDimension;
    currentProblem: string;
    opportunity: string;
    threat: string;
    strategyType: StrategyType;
    strategyName: string;
    strategyDescription: string;
    expectedImpact: string;
    relatedModule: string;
    owner: string;
    status: StrategyStatus;
}

/** ── 10. 品牌定位健康度 ────────────────────────────────────────────────── */
export interface BrandPositioningHealthCheck {
    checkId: string;
    checkItem: string;
    targetStandard: string;
    currentStatus: string;
    variance: string;
    riskLevel: RiskLevel;
    riskReason?: string;
    recommendedAction: string;
    relatedModule: string;
    jumpAction: string;
}

/** ── 11. 定位到企划输出 ────────────────────────────────────────────────── */
export interface BrandPositioningPlanningOutput {
    outputId: string;
    targetModule: string;
    targetIcon: string;
    outputs: { label: string; value: string }[];
}

/** ── 12. 跨模块联动入口 ────────────────────────────────────────────────── */
export interface BrandPositioningRelatedModuleLink {
    linkId: string;
    targetModule: string;
    targetIcon: string;
    relationship: string;
    actionLabel: string;
}

/** ── 顶层数据包 ────────────────────────────────────────────────────────── */
export interface BrandPositioningSnapshot {
    brandId: string;
    year: number;
    season?: string;
    positioningVersion: PositioningVersion;
    positioningStatus: PositioningStatus;
    updatedAt: string;
    kpis: BrandPositioningKpi[];
    identity: BrandIdentity;
    philosophy: BrandPhilosophy;
    dnaKeywords: BrandDnaKeyword[];
    tier: BrandTierPositioning;
    seriesPortfolio: SeriesPortfolioItem[];
    priceArchitecture: PriceArchitectureItem[];
    consumerOverview: ConsumerOverview;
    targetConsumers: TargetConsumerSegment[];
    lifestyleOverview: LifestyleOverview;
    lifestyleScenarios: LifestyleScenarioItem[];
    strategyMatrix: BrandStrategyMatrixItem[];
    healthChecks: BrandPositioningHealthCheck[];
    planningOutputs: BrandPositioningPlanningOutput[];
    relatedModuleLinks: BrandPositioningRelatedModuleLink[];
}
