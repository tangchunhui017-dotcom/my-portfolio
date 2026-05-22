// ============================================================
// Competitor Trend Types — 竞品趋势驱动商品企划决策工作台
// ============================================================

/** 状态颜色语义 */
export type TrendStatusColor =
    | 'green'   // 机会明确
    | 'blue'    // 趋势上升
    | 'orange'  // 需观察
    | 'red'     // 高风险
    | 'purple'  // 设计机会
    | 'gray';   // 低优先级

/** 趋势标签类型 */
export type TrendTag =
    | '高热'
    | '升量'
    | '风险'
    | '小批量测试'
    | '设计机会'
    | '观察'
    | '避免跟进';

/** 风险等级 */
export type RiskLevel = 'low' | 'medium' | 'high';

/** 机会等级 */
export type OpportunityLevel = 'low' | 'medium' | 'high' | 'critical';

/** 行动状态 */
export type ActionStatus =
    | 'pending'
    | 'in_progress'
    | 'done'
    | 'rejected';

/** 推荐动作类型 */
export type RecommendedAction =
    | '加入设计灵感池'
    | '生成趋势Brief'
    | '生成竞品对标Brief'
    | '加入波段企划'
    | '调整品类结构'
    | '生成OTB建议'
    | '小批量测试'
    | '避免跟进'
    | '观察一轮';

/** 素材分类 */
export type MaterialCategory =
    | '高热趋势'
    | '价格带机会'
    | '设计参考'
    | '材质参考'
    | '颜色参考'
    | '功能卖点'
    | '竞品爆款'
    | '风险趋势';

// ────────────────────────────────────────────────────────────
// 1. KPI 总览卡片
// ────────────────────────────────────────────────────────────
export interface CompetitorTrendKpi {
    id: string;
    label: string;
    value: number | string;
    unit?: string;
    delta?: string;
    deltaType?: 'yoy' | 'mom';
    deltaPositive?: boolean;
    statusColor: TrendStatusColor;
    explanation: string;
}

// ────────────────────────────────────────────────────────────
// 2. 趋势决策摘要
// ────────────────────────────────────────────────────────────
export interface TrendDecisionSummary {
    followTrends: string[];         // 本月最值得跟进的趋势
    avoidTrends: string[];          // 不建议继续跟进的趋势
    bestPriceBand: string;          // 最有机会价格带
    bestCategoryStyle: string;      // 最有机会品类/鞋型
    enterDesignPlan: string[];      // 需进入设计计划的趋势
    enterWavePlan: string[];        // 需进入波段企划的趋势
    smallBatchTest: string[];       // 需小批量测试的趋势
}

// ────────────────────────────────────────────────────────────
// 3. 趋势行动中心
// ────────────────────────────────────────────────────────────
export interface TrendAction {
    id: string;
    trendObject: string;            // 品类/鞋型/价格带/颜色/材质/功能/竞品系列
    trendTag: TrendTag;
    trendEvidence: string;          // 趋势证据
    recommendedAction: RecommendedAction;
    targetAudience: string;         // 适合人群
    recommendedCategory: string;    // 建议品类
    recommendedShoeType: string;    // 建议鞋型
    recommendedPriceBand: string;   // 建议价格带
    recommendedWaveId: string;      // 建议波段
    expectedSalesImpact: string;    // 预计销售影响
    expectedMarginImpact: string;   // 预计毛利影响
    actionStatus: ActionStatus;
    priority: number;               // 1=最高
}

// ────────────────────────────────────────────────────────────
// 4. 价格×SKU热度散点
// ────────────────────────────────────────────────────────────
export interface PriceSkuHeatPoint {
    id: string;
    competitorBrand: string;
    category: string;
    shoeType: string;
    priceBand: string;
    priceMid: number;
    skuCount: number;
    heatScore: number;
    salesHeat: number;
    reviewCount: number;
    discountRate: number;
    opportunityLevel: OpportunityLevel;
    zoneLabel: '机会区' | '红海区' | '风险区' | '观察区';
    recommendedAction: RecommendedAction;
}

// ────────────────────────────────────────────────────────────
// 5. EPIC 竞品雷达
// ────────────────────────────────────────────────────────────
export interface EpicCompetitorRadar {
    id: string;
    competitorBrand: string;
    competitorSeries: string;
    epicEmotionScore: number;    // E: Emotion 情绪/视觉吸引力
    epicProductScore: number;    // P: Product 产品力/功能卖点
    epicInfluenceScore: number;  // I: Influence 社媒影响力
    epicCommercialScore: number; // C: Commercial 商业效率
    epicTotalScore: number;
    strengths: string[];         // 强项
    weaknesses: string[];        // 弱项
    learnable: string[];         // 可借鉴点
    riskPoints: string[];        // 风险点
}

// ────────────────────────────────────────────────────────────
// 6. 升量品类与鞋型趋势
// ────────────────────────────────────────────────────────────
export interface RisingCategoryTrend {
    id: string;
    category: string;
    shoeType: string;
    growthRate: number;          // 增长率 %
    heatChange: number;          // 热度变化
    skuChange: number;           // SKU变化
    priceBand: string;
    competitorBrands: string[];  // 竞品品牌
    fitForBrand: boolean;        // 是否适合本品牌
    recommendedAction: RecommendedAction;
    statusColor: TrendStatusColor;
}

// ────────────────────────────────────────────────────────────
// 7. 竞品设计DNA
// ────────────────────────────────────────────────────────────
export interface CompetitorDesignDna {
    id: string;
    competitorBrand: string;
    competitorSeries: string;
    shoeType: string;
    silhouette: string;          // 廓形
    lastShape: string;           // 楦型
    soleStructure: string;       // 鞋底结构
    upperMaterial: string;       // 鞋面材质
    colorStory: string;          // 颜色故事
    craftDetail: string;         // 工艺细节
    functionKeypoint: string;    // 功能卖点
    visualKeywords: string[];    // 视觉关键词
    learnable: string[];         // 可借鉴点
    avoidPoints: string[];       // 避免点
}

// ────────────────────────────────────────────────────────────
// 8. 竞品上市节奏
// ────────────────────────────────────────────────────────────
export interface CompetitorLaunchCalendarItem {
    id: string;
    competitorBrand: string;
    competitorSeries: string;
    launchMonth: number;         // 1-12
    launchWave: string;          // 波段
    mainCategory: string;        // 主推品类
    priceBand: string;
    skuCount: number;
    mainChannel: string;         // 主推渠道
    discountTiming: string;      // 折扣节点
    heatChange: number;          // 热度变化
    impactOnOurBrand: string;    // 对本品影响
    suggestedResponse: RecommendedAction;
    sellThroughRate?: number;    // 完成率 0-100，如 85 表示85%
    promotionType?: string;      // 促销类型：'满减' | '折扣' | '买赠' | '限时特卖' | '无'
    promotionStrength?: string;  // 促销力度描述，如 "7折" / "满500减80"
}

// ────────────────────────────────────────────────────────────
// 9. 本品 vs 竞品差距分析
// ────────────────────────────────────────────────────────────
export interface CompetitorGapAnalysisItem {
    id: string;
    dimension: string;           // 对比维度
    competitorPerformance: string;
    ourPerformance: string;
    gap: string;
    impact: string;
    recommendedAction: RecommendedAction;
    relatedModule: string;
    riskLevel: RiskLevel;
}

// ────────────────────────────────────────────────────────────
// 10. 趋势到企划建议
// ────────────────────────────────────────────────────────────
export interface TrendPlanningRecommendation {
    trendId: string;
    trendName: string;
    trendEvidence: string;
    fitCategory: string;
    fitShoeType: string;
    recommendedPriceBand: string;
    recommendedSkuCount: number;
    recommendedWaveId: string;
    recommendedChannel: string;
    designSuggestion: string;
    otbImpact: string;
    riskLevel: RiskLevel;
    recommendedAction: RecommendedAction;
    statusColor: TrendStatusColor;
}

// ────────────────────────────────────────────────────────────
// 11. 竞品素材
// ────────────────────────────────────────────────────────────
export interface CompetitorMaterialItem {
    id: string;
    imageUrl: string;
    competitorBrand: string;
    competitorSeries: string;
    year: number;
    season: string;
    category: string;
    shoeType: string;
    price: number;
    heatScore: number;
    tags: string[];
    materialCategory: MaterialCategory;
    learnable: string;
    riskPoint?: string;
    statusColor: TrendStatusColor;
}

// ────────────────────────────────────────────────────────────
// 12. 跨模块联动入口
// ────────────────────────────────────────────────────────────
export interface CompetitorTrendRelatedModuleLink {
    moduleId: string;
    moduleName: string;
    relationship: string;        // 和竞品趋势的关系
    icon: string;
    targetTab: string;
    ctaLabel: string;
}

// ────────────────────────────────────────────────────────────
// 筛选器
// ────────────────────────────────────────────────────────────
export interface CompetitorTrendFilters {
    year: string;
    season: string;
    month: string;
    waveId: string;
    category: string;
    shoeType: string;
    priceBand: string;
    brand: string;
    competitorBrand: string;
    channel: string;
    styleTag: string;
    functionTag: string;
    material: string;
    color: string;
    heatLevel: string;
    riskLevel: string;
}

// ────────────────────────────────────────────────────────────
// 跳转参数类型
// ────────────────────────────────────────────────────────────
export interface CompetitorJumpToConsumer {
    trendId: string;
    trendName: string;
    shoeType: string;
    priceBand: string;
    targetSegment?: string;
}

export interface CompetitorJumpToCategory {
    category: string;
    shoeType: string;
    growthRate: number;
    recommendedAction: string;
}

export interface CompetitorJumpToPlanning {
    trendId: string;
    waveId: string;
    recommendedSkuCount: number;
    designTheme: string;
    launchMonth: number;
}

export interface CompetitorJumpToOtb {
    trendId: string;
    category: string;
    priceBand: string;
    suggestedOtb: string;
    recommendedSkuCount: number;
}

export interface CompetitorJumpToDesign {
    trendId: string;
    competitorBrand: string;
    shoeType: string;
    color?: string;
    material?: string;
    designKeywords?: string[];
}

// ────────────────────────────────────────────────────────────
// 品类策略矩阵
// ────────────────────────────────────────────────────────────

/** 品类成熟度 */
export type ShoeTypeMaturity = '成熟' | '成长' | '潜力' | '机会';

/** 品类定位 */
export type CoreMore = 'core' | 'more';

/** 本品在该品类的当前位置 */
export type OurPosition = '强势' | '持平' | '薄弱' | '未布局';

/** 建议策略 */
export type CategoryStrategy = '守住' | '跟进加码' | '小批切入' | '观望' | '退出';

export interface CategoryStrategyMatrixCell {
    id: string;
    shoeType: string;               // 鞋型名称，如"厚底老爹鞋"
    maturity: ShoeTypeMaturity;
    coreMore: CoreMore;
    topCompetitorBrands: string[];  // 该鞋型最强的竞品，最多3个
    ourPosition: OurPosition;
    strategy: CategoryStrategy;
    strategyReason: string;         // 一句话理由，如"热度同比+38%，本品空缺"
    keyEvidence: string;            // 支撑数据，如"NB 990v6 热度92分，SKU+15%"
    seasonPriority: 'H' | 'M' | 'L'; // 本季优先级
}

// ────────────────────────────────────────────────────────────
// 走访记录
// ────────────────────────────────────────────────────────────
export interface FieldVisitRecord {
    id: string;
    createdAt: string;             // ISO 日期字符串
    visitDate: string;             // 实际调研日期，如 "2026-05-15"
    researcher: string;            // 调研人姓名
    city: string;                  // 城市
    mall: string;                  // 商场/商圈名称
    competitorBrand: string;       // 竞品品牌
    windowDisplay: string;         // 橱窗主推：鞋型+颜色+材质
    storeProducts: string;         // 店铺货品结构
    colorMaterial: string;         // 主推色+材质
    staffPushItem: string;         // 店员主推款名称或描述
    staffPushKeywords: string;     // 店员主推卖点话术
    keyPrice: string;              // 主推价格
    promotionActivity: string;     // 促销活动
    summary: string;               // 本次走访核心发现与对本品启发（2-4句）
    tags: string[];                // 快速标签
}

// ────────────────────────────────────────────────────────────
// 调研结论报告
// ────────────────────────────────────────────────────────────
export interface ResearchFinding {
    id: string;
    priority: number;              // 1=最重要
    findingType: '机会' | '风险' | '趋势' | '竞品动向';
    title: string;                 // 一句话标题
    evidence: string;              // 支撑数据/事实
    implication: string;           // 对本品的意义
}

export interface DepartmentGuidance {
    department: '商品企划部' | '运营部' | '设计部' | '渠道部';
    keyAction: string;             // 最重要的一个行动
    details: string[];             // 2-3条具体建议
}

export interface ResearchConclusionReport {
    reportPeriod: string;          // 如 "2026年春夏季（2026Q1-Q2）"
    generatedAt: string;           // 生成日期
    topFindings: ResearchFinding[]; // 核心发现，3-5条，按优先级排序
    opportunityShoeTypes: string[]; // 机会鞋型，排序
    opportunityPriceBands: string[]; // 机会价格带，排序
    riskAlerts: string[];          // 风险提示，2-3条
    departmentGuidance: DepartmentGuidance[]; // 各部门建议
    nextResearchPlan: string;      // 下次调研建议（时间/地点/重点）
}
