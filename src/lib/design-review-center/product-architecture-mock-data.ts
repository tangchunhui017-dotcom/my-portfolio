/**
 * 产品架构工作台 — Mock 数据
 * 为 12 个模块提供结构化测试数据
 */

import type {
  ProductArchitectureDecisionSummary,
  ArchitectureInputAlignment,
  OtbProductArchitectureBreakdown,
  ArchHealthDimension,
  ProductRoleMixItem,
  ArchitectureGapItem,
  ProductArchitectureMatrixItem,
  StyleCardReviewItem,
  SharedLastSoleMoldEfficiency,
  ArchitectureRiskActionItem,
  ProductArchitectureRelatedModuleLink,
} from './types';

// ── 1. 产品架构决策摘要 ───────────────────────────────────────────────────────

export const ARCH_DECISION_SUMMARY: ProductArchitectureDecisionSummary = {
  architectureStatus: 'warning',
  mainIssue: '主推款覆盖不足（Hero仅8款，目标12款），¥399-599 主力价位拥挤，轻户外鞋型缺少高毛利款',
  mainOpportunity: '城市机能通勤鞋需求热度高且当前架构空白，补入2款可同时填补价格带缺口和Hero款缺口',
  suggestAddDirections: ['城市机能通勤鞋（¥599-799）×2', '轻户外高毛利休闲鞋（¥499-699）×1', '商务休闲过渡款（¥399-599）×1'],
  suggestReduceDirections: ['低差异化休闲运动鞋（¥199-299）×3', '价格带重叠的基础训练鞋×2'],
  waveImpact: true,
  waveImpactReason: 'W1 Hero款未确认，影响首波上市声量',
  otbBreached: false,
  costBreached: true,
  totalStyleCount: 31,
  heroStyleCount: 8,
  missingHeroCount: 4,
  totalSkuCount: 186,
  newMoldCount: 9,
  newMoldLimit: 6,
  sharedSoleRate: 0.58,
  sharedLastRate: 0.62,
  otbCoverage: 0.87,
};

// ── 2. 商品企划输入承接 ───────────────────────────────────────────────────────

export const ARCH_INPUT_ALIGNMENTS: ArchitectureInputAlignment[] = [
  {
    inputSource: '品牌定位',
    inputSummary: '精工质朴·城市机能，目标 25-38 岁都市男性',
    architectureTranslation: '城市通勤鞋设定为主轴，避免运动休闲与经典皮鞋各占50%的稀释结构',
    alignmentStatus: 'partial',
    generatedStyleCount: 14,
    unassignedRequirementCount: 2,
    deviationRisk: 'medium',
    deviation: '运动训练系列占比偏高（28%），与品牌轻户外城市定位存在偏离',
    recommendedAction: '压缩纯运动训练款比例，强化城市机能通勤鞋定位',
    jumpAction: '/merch-planning/brand-positioning',
  },
  {
    inputSource: '消费者画像',
    inputSummary: '通勤+轻户外双场景，注重功能性和材料质感',
    architectureTranslation: '主力鞋型设定为低帮轻量休闲鞋和轻户外越野鞋，注重科技中底和天然材料',
    alignmentStatus: 'aligned',
    generatedStyleCount: 18,
    unassignedRequirementCount: 0,
    deviationRisk: 'low',
    recommendedAction: '按计划推进，确保Hero款覆盖核心通勤场景',
    jumpAction: '/merch-planning/consumer-profile',
  },
  {
    inputSource: '竞品&趋势',
    inputSummary: '极简机能、复古户外、可持续材料为三大趋势方向',
    architectureTranslation: '趋势款设定：机能越野×3、复古休闲×2，引入再生材料款型',
    alignmentStatus: 'partial',
    generatedStyleCount: 5,
    unassignedRequirementCount: 3,
    deviationRisk: 'medium',
    deviation: '可持续材料款只有1款，竞品趋势要求不低于4款',
    recommendedAction: '将3款基础款材料升级为再生/植物鞣革材料，同时计入趋势覆盖',
    jumpAction: '/merch-planning/trend-analysis',
  },
  {
    inputSource: '品类运营',
    inputSummary: 'W1 13款/W2 18款，休闲鞋55%/功能鞋30%/皮鞋15%',
    architectureTranslation: '架构款数31款符合分配，但休闲鞋比例偏高至63%',
    alignmentStatus: 'deviated',
    generatedStyleCount: 31,
    unassignedRequirementCount: 0,
    deviationRisk: 'high',
    deviation: '休闲鞋超出品类目标8个百分点，功能鞋和皮鞋覆盖不足',
    recommendedAction: '削减4款低差异化休闲鞋，补入2款功能鞋和1款皮鞋',
    jumpAction: '/merch-planning/category-ops',
  },
  {
    inputSource: '波段企划',
    inputSummary: 'W1 上市2026-03，W2 上市2026-06，Hero款需提前8周定案',
    architectureTranslation: 'W1对应13款已规划，W2对应18款中3款还未分配系列',
    alignmentStatus: 'partial',
    generatedStyleCount: 28,
    unassignedRequirementCount: 3,
    deviationRisk: 'high',
    deviation: 'W1 Hero款 4/5 还未进入开发，距W1上市只剩12周',
    recommendedAction: '立即推进 W1 Hero款评审，本周确认材料和楦型方向',
    jumpAction: '/merch-planning/wave-plan',
  },
  {
    inputSource: 'OTB预算',
    inputSummary: 'OTB总预算 ¥280万，成本带 ¥140-¥270，毛利目标 ≥52%',
    architectureTranslation: '当前架构成本估算 ¥312万，超出OTB 11%',
    alignmentStatus: 'deviated',
    generatedStyleCount: 31,
    unassignedRequirementCount: 0,
    deviationRisk: 'high',
    deviation: '新模过多（9款超出限额6款），导致开发成本超标',
    recommendedAction: '合并3款相似鞋型共模，压缩新模至限额以内',
    jumpAction: '/merch-planning/otb',
  },
];

// ── 3. OTB → 产品架构拆解 ────────────────────────────────────────────────────

export const OTB_ARCH_BREAKDOWNS: OtbProductArchitectureBreakdown[] = [
  {
    waveId: 'W1',
    waveName: 'W1 春季首发',
    category: '休闲鞋',
    plannedSkuCount: 52,
    architectureSkuCount: 48,
    skuGap: -4,
    skuWidth: 13,
    skuDepth: 4,
    heroSkuTarget: 3,
    heroSkuActual: 1,
    coreSkuTarget: 6,
    coreSkuActual: 7,
    testSkuTarget: 2,
    testSkuActual: 3,
    imageSkuTarget: 2,
    imageSkuActual: 2,
    priceBandTarget: '¥399-599',
    priceBandActual: '¥299-499',
    costBandTarget: '¥160-220',
    costBandActual: '¥180-260',
    otbBudget: 120,
    architectureCostEstimate: 138,
    costVariance: 18,
    sharedSoleTarget: 6,
    sharedLastTarget: 7,
    newMoldLimit: 3,
    newMoldActual: 5,
    alignmentStatus: 'deviated',
    recommendedAction: '削减低差异休闲款×2，推进Hero款进入评审，价格带上移至¥399+',
  },
  {
    waveId: 'W1',
    waveName: 'W1 春季首发',
    category: '功能鞋',
    plannedSkuCount: 24,
    architectureSkuCount: 20,
    skuGap: -4,
    skuWidth: 5,
    skuDepth: 4,
    heroSkuTarget: 2,
    heroSkuActual: 2,
    coreSkuTarget: 2,
    coreSkuActual: 1,
    testSkuTarget: 1,
    testSkuActual: 2,
    imageSkuTarget: 0,
    imageSkuActual: 0,
    priceBandTarget: '¥499-799',
    priceBandActual: '¥499-699',
    costBandTarget: '¥200-280',
    costBandActual: '¥210-270',
    otbBudget: 55,
    architectureCostEstimate: 52,
    costVariance: -3,
    sharedSoleTarget: 3,
    sharedLastTarget: 2,
    newMoldLimit: 1,
    newMoldActual: 1,
    alignmentStatus: 'aligned',
    recommendedAction: '补入1款核心功能鞋，SKU深度尚可，维持现有计划',
  },
  {
    waveId: 'W2',
    waveName: 'W2 夏季延伸',
    category: '休闲鞋',
    plannedSkuCount: 68,
    architectureSkuCount: 72,
    skuGap: 4,
    skuWidth: 18,
    skuDepth: 4,
    heroSkuTarget: 4,
    heroSkuActual: 3,
    coreSkuTarget: 8,
    coreSkuActual: 9,
    testSkuTarget: 3,
    testSkuActual: 4,
    imageSkuTarget: 3,
    imageSkuActual: 2,
    priceBandTarget: '¥299-699',
    priceBandActual: '¥299-599',
    costBandTarget: '¥140-250',
    costBandActual: '¥150-270',
    otbBudget: 145,
    architectureCostEstimate: 162,
    costVariance: 17,
    sharedSoleTarget: 9,
    sharedLastTarget: 10,
    newMoldLimit: 3,
    newMoldActual: 4,
    alignmentStatus: 'partial',
    recommendedAction: '将1款新模替换为共模方案，优化¥399-599区间Hero款推进',
  },
  {
    waveId: 'W2',
    waveName: 'W2 夏季延伸',
    category: '商务皮鞋',
    plannedSkuCount: 20,
    architectureSkuCount: 16,
    skuGap: -4,
    skuWidth: 4,
    skuDepth: 4,
    heroSkuTarget: 1,
    heroSkuActual: 1,
    coreSkuTarget: 2,
    coreSkuActual: 1,
    testSkuTarget: 1,
    testSkuActual: 1,
    imageSkuTarget: 0,
    imageSkuActual: 1,
    priceBandTarget: '¥599-999',
    priceBandActual: '¥699-999',
    costBandTarget: '¥240-360',
    costBandActual: '¥260-380',
    otbBudget: 60,
    architectureCostEstimate: 68,
    costVariance: 8,
    sharedSoleTarget: 2,
    sharedLastTarget: 3,
    newMoldLimit: 1,
    newMoldActual: 0,
    alignmentStatus: 'partial',
    recommendedAction: '补入1款核心皮鞋，优先考虑共楦方案降低成本',
  },
];

// ── 4. 架构健康评分 ───────────────────────────────────────────────────────────

export const ARCH_HEALTH_DIMENSIONS: ArchHealthDimension[] = [
  { dimension: '品类覆盖', dimensionKey: 'category', currentValue: 3, targetValue: 4, variance: 75, riskLevel: 'warning', deductionReason: '皮鞋品类占比偏低', recommendedAction: '补入2款皮鞋提升品类覆盖' },
  { dimension: '鞋型覆盖', dimensionKey: 'shoetype', currentValue: 7, targetValue: 8, variance: 87, riskLevel: 'warning', deductionReason: '轻户外运动鞋型空白', recommendedAction: '增加越野/徒步鞋型款式' },
  { dimension: '价格带覆盖', dimensionKey: 'price', currentValue: 68, targetValue: 100, variance: 68, riskLevel: 'warning', deductionReason: '¥399-599 区间严重拥挤，¥699+ 空白', recommendedAction: '压缩中低价位3款，补入高价位2款' },
  { dimension: '产品角色覆盖', dimensionKey: 'role', currentValue: 7, targetValue: 10, variance: 70, riskLevel: 'warning', deductionReason: '利润款、形象款、引流款缺失', recommendedAction: '重新定义3款角色定位' },
  { dimension: '主推款覆盖', dimensionKey: 'hero', currentValue: 8, targetValue: 12, variance: 67, riskLevel: 'high_risk', deductionReason: 'Hero款数量严重不足，W1 影响最大', recommendedAction: '增加4款Hero款，优先W1波段' },
  { dimension: '新模控制', dimensionKey: 'new_mold', currentValue: 9, targetValue: 6, variance: 67, riskLevel: 'high_risk', deductionReason: '新模超出预算3款，开发成本风险高', recommendedAction: '合并3款相似鞋型，减少新模' },
  { dimension: '共楦共底效率', dimensionKey: 'platform', currentValue: 60, targetValue: 75, variance: 80, riskLevel: 'warning', deductionReason: '共楦率58%/共底率62%，低于目标75%', recommendedAction: '推进平台化策略，提升共底共楦率' },
  { dimension: '成本带匹配', dimensionKey: 'cost', currentValue: 78, targetValue: 100, variance: 78, riskLevel: 'warning', deductionReason: '部分款实际成本超出OTB成本带上限', recommendedAction: '材料降级或合并3款款型压缩成本' },
  { dimension: '波段匹配', dimensionKey: 'wave', currentValue: 88, targetValue: 100, variance: 88, riskLevel: 'healthy', recommendedAction: 'W1/W2款数分配基本合理，维持现有计划' },
  { dimension: '商品企划承接', dimensionKey: 'merch_input', currentValue: 72, targetValue: 100, variance: 72, riskLevel: 'warning', deductionReason: 'OTB与品类运营输入存在偏离', recommendedAction: '优先解决OTB超标和品类比例偏离问题' },
];

// ── 5. 产品角色结构 ───────────────────────────────────────────────────────────

export const PRODUCT_ROLE_MIX: ProductRoleMixItem[] = [
  { role: 'hero', roleLabel: 'Hero 主推款', plannedStyleCount: 12, currentStyleCount: 8, targetShare: 0.30, currentShare: 0.26, mainPriceBand: '¥499-799', targetConsumer: '核心目标客群', riskLevel: 'high_risk', recommendedAction: '增加4款Hero款，优先城市机能通勤和轻户外' },
  { role: 'core', roleLabel: 'Core 核心款', plannedStyleCount: 10, currentStyleCount: 11, targetShare: 0.25, currentShare: 0.35, mainPriceBand: '¥399-599', targetConsumer: '主流消费者', riskLevel: 'warning', recommendedAction: '核心款超出目标，将2款重新归类或削减' },
  { role: 'basic', roleLabel: 'Basic 基础款', plannedStyleCount: 4, currentStyleCount: 5, targetShare: 0.10, currentShare: 0.16, mainPriceBand: '¥199-299', targetConsumer: '价格敏感用户', riskLevel: 'warning', recommendedAction: '基础款占比过高，削减3款低差异款' },
  { role: 'image', roleLabel: 'Image 形象款', plannedStyleCount: 3, currentStyleCount: 2, targetShare: 0.08, currentShare: 0.06, mainPriceBand: '¥799-1299', targetConsumer: '高端消费者/PR', riskLevel: 'warning', recommendedAction: '补入1款形象款，提升品牌高端感知' },
  { role: 'trend', roleLabel: 'Trend 趋势款', plannedStyleCount: 3, currentStyleCount: 2, targetShare: 0.08, currentShare: 0.06, mainPriceBand: '¥399-699', targetConsumer: '时尚敏感用户', riskLevel: 'warning', recommendedAction: '加入可持续材料趋势款' },
  { role: 'test', roleLabel: 'Test 测试款', plannedStyleCount: 2, currentStyleCount: 4, targetShare: 0.05, currentShare: 0.13, mainPriceBand: '¥299-499', targetConsumer: '新客户测试', riskLevel: 'high_risk', recommendedAction: '测试款过多，将2款并入Core或取消' },
  { role: 'profit', roleLabel: 'Profit 利润款', plannedStyleCount: 2, currentStyleCount: 0, targetShare: 0.05, currentShare: 0, mainPriceBand: '¥599-999', targetConsumer: '成熟消费者', riskLevel: 'high_risk', recommendedAction: '缺少利润款，将1款Core升级为高毛利款' },
  { role: 'volume', roleLabel: 'Volume 走量款', plannedStyleCount: 3, currentStyleCount: 3, targetShare: 0.08, currentShare: 0.10, mainPriceBand: '¥199-399', targetConsumer: '大众用户', riskLevel: 'healthy', recommendedAction: '走量款结构合理，维持现有配置' },
  { role: 'entry', roleLabel: 'Entry 引流款', plannedStyleCount: 1, currentStyleCount: 0, targetShare: 0.02, currentShare: 0, mainPriceBand: '¥99-199', targetConsumer: '新客拉新', riskLevel: 'warning', recommendedAction: '考虑引入1款高性价比引流款' },
  { role: 'clearance', roleLabel: 'Clearance 清货款', plannedStyleCount: 0, currentStyleCount: 1, targetShare: 0, currentShare: 0.03, mainPriceBand: '¥99-199', targetConsumer: '促销用户', riskLevel: 'healthy', recommendedAction: '清货款数量合理，注意不要影响品牌形象' },
];

// ── 7. 架构缺口分析 ───────────────────────────────────────────────────────────

export const ARCH_GAP_ITEMS: ArchitectureGapItem[] = [
  { gapId: 'gap-001', gapType: '主推款缺口', gapObject: 'Hero款不足', gapReason: 'W1波段仅有1款Hero，目标3款，声量不足', affectedWave: 'W1', affectedSeries: '城市漫步·轻量机能', affectedConsumer: '核心通勤男性', expectedImpact: 'W1首波上市声量损失约30%', recommendedAction: '本周推进2款城市通勤鞋进入Hero评审流程', priority: 'P0' },
  { gapId: 'gap-002', gapType: '价格带缺口', gapObject: '¥699-999 区间空白', gapReason: '高价位无产品力支撑，品牌高端感知缺失', affectedWave: 'W1·W2', affectedSeries: '精工经典', affectedConsumer: '高端商务用户', expectedImpact: '失去高价位消费者，形象款拉升作用为零', recommendedAction: '精工系列补入1款¥799以上皮鞋作为形象款', priority: 'P0' },
  { gapId: 'gap-003', gapType: '鞋型缺口', gapObject: '轻户外越野鞋型', gapReason: '城市轻户外趋势高热但无对应鞋型', affectedWave: 'W2', affectedSeries: '运动光谱', affectedConsumer: '周末轻户外用户', expectedImpact: '错失轻户外增量市场，竞品抢占份额', recommendedAction: '运动光谱增加低帮越野休闲鞋×2', priority: 'P1' },
  { gapId: 'gap-004', gapType: '新模超额', gapObject: '新模超出限额3款', gapReason: '9款新模超出OTB限额6款，开发成本超标', affectedWave: 'W1·W2', affectedSeries: '全系列', expectedImpact: '开发成本增加约¥32万，交期风险高', recommendedAction: '合并3款相似底型，优先使用已有楦型', priority: 'P0' },
  { gapId: 'gap-005', gapType: '品类比例偏离', gapObject: '休闲鞋占比63%', gapReason: '超出品类运营目标8pp，功能和皮鞋覆盖不足', affectedWave: 'W1·W2', affectedSeries: '城市漫步', affectedConsumer: '商务功能需求用户', expectedImpact: '品类结构单一，增长天花板低', recommendedAction: '削减4款低差异休闲鞋，补充功能和皮鞋', priority: 'P1' },
  { gapId: 'gap-006', gapType: '功能卖点缺口', gapObject: '可持续材料款不足', gapReason: '仅1款使用环保材料，不满足趋势要求4款', affectedWave: 'W2', affectedSeries: '轻量机能', affectedConsumer: '环保意识用户', expectedImpact: '错失可持续用户群体，与竞品差距扩大', recommendedAction: '将3款基础款材料升级为再生/植物鞣革', priority: 'P2' },
  { gapId: 'gap-007', gapType: '系列角色缺口', gapObject: '利润款缺失', gapReason: '当前无专属利润款，整体毛利目标承压', affectedWave: 'W2', affectedSeries: '商务经典', expectedImpact: '毛利率预测低于目标2-3pp', recommendedAction: '将1款Core升级为高毛利利润款（¥599-799）', priority: 'P1' },
  { gapId: 'gap-008', gapType: '波段覆盖缺口', gapObject: 'W2未分配系列3款', gapReason: 'W2企划18款，3款尚未归属系列', affectedWave: 'W2', affectedSeries: '待分配', expectedImpact: 'W2开发任务无法生成，影响交期', recommendedAction: '本周完成3款波段分配，生成对应开发任务', priority: 'P1' },
];

// ── 8/9. 产品架构矩阵 & 款式卡片评审 ────────────────────────────────────────

const baseItems: ProductArchitectureMatrixItem[] = [
  { styleId: 'S001', styleName: '城市穿行低帮机能鞋', seriesName: '城市漫步', waveName: 'W1', category: '休闲鞋', shoeType: '低帮休闲', productRole: 'hero', targetConsumer: '通勤男性 25-35', priceBand: '¥499-599', costBand: '¥200-230', developmentStatus: 'proto', reviewStatus: 'in_progress', riskLevel: 'warning', riskReason: '楦型还未最终确认', recommendedAction: '本周锁定楦型，进入评审', sourceWavePlanId: 'WP-W1-001', isHero: true, isGapFill: false, isPendingTask: false },
  { styleId: 'S002', styleName: '精工植鞣皮质感德比鞋', seriesName: '精工经典', waveName: 'W1', category: '商务皮鞋', shoeType: '德比鞋', productRole: 'hero', targetConsumer: '商务男性 30-40', priceBand: '¥799-999', costBand: '¥300-360', developmentStatus: 'briefed', reviewStatus: 'pending', riskLevel: 'high_risk', riskReason: 'Hero款但方向未定案', recommendedAction: '立即推进方向评审', sourceWavePlanId: 'WP-W1-002', isHero: true, isGapFill: false, isPendingTask: true },
  { styleId: 'S003', styleName: '轻户外越野休闲鞋', seriesName: '运动光谱', waveName: 'W2', category: '功能鞋', shoeType: '越野休闲', productRole: 'hero', targetConsumer: '轻户外用户 28-38', priceBand: '¥599-799', costBand: '¥240-280', developmentStatus: 'not_started', reviewStatus: 'pending', riskLevel: 'high_risk', riskReason: '架构缺口补位款，尚未启动', recommendedAction: '本周启动设计简报', isHero: true, isGapFill: true, isPendingTask: true },
  { styleId: 'S004', styleName: '城市通勤低帮板鞋', seriesName: '城市漫步', waveName: 'W1', category: '休闲鞋', shoeType: '板鞋', productRole: 'core', targetConsumer: '都市通勤 22-32', priceBand: '¥399-499', costBand: '¥160-190', developmentStatus: 'sketching', reviewStatus: 'pending', riskLevel: 'healthy', recommendedAction: '按计划推进', sourceWavePlanId: 'WP-W1-004', isHero: false, isGapFill: false, isPendingTask: false },
  { styleId: 'S005', styleName: '机能轻量跑步休闲鞋', seriesName: '轻量机能', waveName: 'W1', category: '功能鞋', shoeType: '轻量跑鞋', productRole: 'hero', targetConsumer: '运动休闲 25-38', priceBand: '¥599-699', costBand: '¥240-270', developmentStatus: 'proto', reviewStatus: 'in_progress', riskLevel: 'healthy', recommendedAction: '确认中底缓震参数后锁定', isHero: true, isGapFill: false, isPendingTask: false },
  { styleId: 'S006', styleName: '基础平底休闲鞋 A', seriesName: '城市漫步', waveName: 'W2', category: '休闲鞋', shoeType: '平底休闲', productRole: 'basic', targetConsumer: '大众用户', priceBand: '¥199-299', costBand: '¥80-120', developmentStatus: 'confirmed', reviewStatus: 'approved', riskLevel: 'healthy', recommendedAction: '已定案，维持', isHero: false, isGapFill: false, isPendingTask: false },
  { styleId: 'S007', styleName: '测试款新型泡棉中底', seriesName: '轻量机能', waveName: 'W2', category: '功能鞋', shoeType: '低帮运动', productRole: 'test', targetConsumer: '技术早期采用者', priceBand: '¥399-499', costBand: '¥180-220', developmentStatus: 'proto', reviewStatus: 'in_progress', riskLevel: 'warning', riskReason: '测试款成本偏高', recommendedAction: '评估是否调整为Core或取消', isHero: false, isGapFill: false, isPendingTask: false },
  { styleId: 'S008', styleName: '高毛利精工皮质利润款', seriesName: '商务经典', waveName: 'W2', category: '商务皮鞋', shoeType: '德比鞋', productRole: 'profit', targetConsumer: '商务精英 35+', priceBand: '¥699-999', costBand: '¥260-340', developmentStatus: 'not_started', reviewStatus: 'pending', riskLevel: 'warning', riskReason: '缺口补位款，未启动', recommendedAction: '优先启动，提升毛利结构', isHero: false, isGapFill: true, isPendingTask: true },
];

export const ARCH_MATRIX_ITEMS: ProductArchitectureMatrixItem[] = baseItems;

export const STYLE_CARD_REVIEWS: StyleCardReviewItem[] = [
  { ...baseItems[0], decisionStatus: 'push_forward', decisionReason: 'Hero款定位清晰，架构匹配度高', architectureFit: 'high', brandFit: 'high', consumerFit: 'high', trendFit: 'medium', otbFit: 'high', costRisk: 'healthy', launchRisk: 'warning' },
  { ...baseItems[1], decisionStatus: 'needs_adjustment', decisionReason: '方向未定案，楦型和材料选择需本周决策', architectureFit: 'high', brandFit: 'high', consumerFit: 'medium', trendFit: 'medium', otbFit: 'medium', costRisk: 'high_risk', launchRisk: 'high_risk' },
  { ...baseItems[2], decisionStatus: 'generate_task', decisionReason: '缺口补位款已确认，需立即生成开发简报', architectureFit: 'high', brandFit: 'high', consumerFit: 'high', trendFit: 'high', otbFit: 'medium', costRisk: 'warning', launchRisk: 'high_risk' },
  { ...baseItems[3], decisionStatus: 'push_forward', decisionReason: 'Core款结构健康，按计划推进', architectureFit: 'high', brandFit: 'medium', consumerFit: 'high', trendFit: 'low', otbFit: 'high', costRisk: 'healthy', launchRisk: 'healthy' },
  { ...baseItems[6], decisionStatus: 'small_batch', decisionReason: '测试款成本偏高，建议小批量验证市场反应', architectureFit: 'medium', brandFit: 'medium', consumerFit: 'medium', trendFit: 'high', otbFit: 'medium', costRisk: 'warning', launchRisk: 'healthy' },
  { ...baseItems[7], decisionStatus: 'generate_task', decisionReason: '利润款结构需要，OTB有空间，立即启动', architectureFit: 'high', brandFit: 'high', consumerFit: 'medium', trendFit: 'low', otbFit: 'high', costRisk: 'warning', launchRisk: 'warning' },
];

// ── 10. 共楦共底新模效率 ─────────────────────────────────────────────────────

export const MOLD_EFFICIENCY: SharedLastSoleMoldEfficiency = {
  sharedLastRate: 0.62,
  sharedLastCount: 19,
  sharedLastTarget: 23,
  sharedSoleRate: 0.58,
  sharedSoleCount: 18,
  sharedSoleTarget: 23,
  newMoldCount: 9,
  moldBudget: 6,
  newMoldRisk: 'high_risk',
  platformReuseRate: 0.55,
  platformReuseTarget: 0.75,
  developmentCostImpact: '新模超标3款，估算额外开发成本约 ¥32万，可能导致2款交期延迟4-6周',
  launchDelayRisk: 'warning',
  recommendedAction: '合并S002与S008的德比楦型（差异小），将S007泡棉中底改为现有平台，可减少3个新模',
};

// ── 11. 架构风险与行动中心 ───────────────────────────────────────────────────

export const ARCH_RISKS: ArchitectureRiskActionItem[] = [
  { riskId: 'AR-001', riskObject: 'W1 Hero款 (S002)', riskType: 'insufficient_hero', riskReason: 'W1 Hero款方向未定案，距上市12周，设计评审尚未启动', affectedWave: 'W1', affectedSeries: '精工经典', affectedStyleCount: 1, expectedImpact: 'W1首波声量损失，门店主推款空缺', recommendedAction: '本周完成楦型&材料评审，生成设计任务', owner: '设计总监', dueDate: '2026-05-30', actionStatus: 'open', relatedRoute: '/design-review-center?tab=reviewDecisionCenter' },
  { riskId: 'AR-002', riskObject: '新模超标 (+3)', riskType: 'too_many_new_molds', riskReason: '9款新模超出OTB限额6款，开发成本超标约¥32万', affectedWave: 'W1·W2', affectedSeries: '全系列', affectedStyleCount: 3, expectedImpact: '成本超标11%，2款可能延迟上市4-6周', recommendedAction: '合并S002/S008楦型，S007改用现有平台', owner: '产品经理', dueDate: '2026-05-28', actionStatus: 'open', relatedRoute: '/design-review-center?tab=productArchitecture' },
  { riskId: 'AR-003', riskObject: 'OTB超标 (休闲+W2)', riskType: 'cost_overrun', riskReason: 'W2休闲鞋架构成本估算¥162万，超OTB预算¥145万', affectedWave: 'W2', affectedSeries: '城市漫步', affectedStyleCount: 4, expectedImpact: '预算超支¥17万，需要削减款数或降本', recommendedAction: '削减3款低差异休闲鞋，目标成本带降至¥140-220', owner: '企划总监', dueDate: '2026-06-05', actionStatus: 'in_progress' },
  { riskId: 'AR-004', riskObject: '¥699+ 价格带空白', riskType: 'price_congestion', riskReason: '高价位无产品支撑，品牌形象拉升无抓手', affectedWave: 'W1·W2', affectedSeries: '精工经典', affectedStyleCount: 0, expectedImpact: '高端消费者流失，品牌认知停留中低档位', recommendedAction: '精工系列补入1款¥799-999形象款', owner: '设计总监', dueDate: '2026-06-10', actionStatus: 'open' },
  { riskId: 'AR-005', riskObject: '品类运营承接偏离', riskType: 'unaccepted_merch_input', riskReason: '休闲鞋占比63%，超目标8pp；功能鞋和皮鞋覆盖不足', affectedWave: 'W1·W2', affectedSeries: '城市漫步', affectedStyleCount: 5, expectedImpact: '品类结构单一，整体销售天花板下降约15%', recommendedAction: '削减4款低差异休闲，补入2款功能和1款皮鞋', owner: '企划总监', dueDate: '2026-06-01', actionStatus: 'open' },
  { riskId: 'AR-006', riskObject: '测试款过多 (4款)', riskType: 'too_many_test', riskReason: '测试款占比13%，超出目标5%，消耗开发资源', affectedWave: 'W2', affectedSeries: '轻量机能', affectedStyleCount: 2, expectedImpact: '开发资源分散，核心款推进受影响', recommendedAction: '将2款测试款并入Core或建议取消', owner: '设计经理', dueDate: '2026-06-05', actionStatus: 'in_progress' },
];

// ── 12. 跨模块入口 ───────────────────────────────────────────────────────────

export const ARCH_RELATED_LINKS: ProductArchitectureRelatedModuleLink[] = [
  { linkId: 'int-001', label: '主题与系列策略', description: '查看各系列设计主题和产品方向', category: 'internal', actionLabel: '查看系列策略', jumpAction: 'themeStrategy', icon: 'layers' },
  { linkId: 'int-002', label: '开发任务池', description: '为架构缺口和Hero款生成开发任务', category: 'internal', actionLabel: '生成开发任务', jumpAction: 'developmentTaskPool', queryParams: { status: 'pending_task' }, icon: 'tasks' },
  { linkId: 'int-003', label: '波段研发节点', description: '校验款式开发节点与波段上市时间', category: 'internal', actionLabel: '进入 波段研发节点', jumpAction: 'developmentGateTable', icon: 'gate' },
  { linkId: 'int-004', label: '设计版本', description: '查看已进入方向评审的款式版本', category: 'internal', actionLabel: '生成设计版本', jumpAction: 'designVersionPreview', icon: 'preview' },
  { linkId: 'int-005', label: '评审决议', description: '提交Hero款和高风险款式进入评审', category: 'internal', actionLabel: '提交评审', jumpAction: 'reviewDecisionCenter', icon: 'review' },
  { linkId: 'ext-001', label: '品牌定位', description: '校准产品架构与品牌策略的一致性', category: 'external', actionLabel: '校准品牌定位', jumpAction: '/merch-planning/brand-positioning', queryParams: { deviationRisk: 'high' }, icon: 'brand' },
  { linkId: 'ext-002', label: '消费者画像', description: '查看目标消费者需求与使用场景', category: 'external', actionLabel: '查看消费者需求', jumpAction: '/merch-planning/consumer-profile', icon: 'consumer' },
  { linkId: 'ext-003', label: '竞品&趋势', description: '对照竞品趋势检查鞋型和价格缺口', category: 'external', actionLabel: '查看竞品趋势', jumpAction: '/merch-planning/trend-analysis', icon: 'trend' },
  { linkId: 'ext-004', label: '波段企划', description: '同步波段款数计划和上市节点', category: 'external', actionLabel: '同步波段计划', jumpAction: '/merch-planning/wave-plan', icon: 'wave' },
  { linkId: 'ext-005', label: 'OTB预算', description: '查看OTB约束和成本带限制', category: 'external', actionLabel: '查看 OTB 约束', jumpAction: '/merch-planning/otb', icon: 'otb' },
];
