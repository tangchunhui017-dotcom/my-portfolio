/**
 * 主题与系列策略页面 — 专用 Mock 数据
 * 为新增模块（主题总览、商品输入承接、资源分配、系列策略卡、风险决策、跨模块入口）提供结构化数据。
 */

import type {
  SeasonThemeStrategySummary,
  MerchandisingInputAlignment,
  WaveThemeBoardItem,
  SeriesStrategyCard,
  ThemeSeriesResourceAllocation,
  ThemeRiskDecisionItem,
  ThemeSeriesRelatedModuleLink,
  ThemeStrategyRecord,
  SeriesRoleMatrixRow,
  DesignLanguageRow,
  SeriesBusinessTask,
  SeriesDecisionStatus,
  SeriesRole2,
  SeasonThemeBanner,
  ColorAllocationItem,
} from './types';

// ── 1. 本季主题策略总览 ──────────────────────────────────────────────────────

export const SEASON_THEME_SUMMARY: SeasonThemeStrategySummary = {
  seasonTheme: '精工质朴 · 城市机能',
  designKeywords: ['精工', '轻量', '机能', '自然', '当代感'],
  targetConsumer: '25-38 岁都市男性，通勤 + 轻户外场景',
  coreScenario: '每日通勤 / 商务休闲 / 周末轻户外',
  trendSources: ['WGSN 2026 S/S 报告', '内部消费者调研（N=1,200）', '线下零售数据回顾'],
  merchandisingSources: ['品牌定位：趣味舒适质朴', '波段企划：W1 13款 / W2 18款', 'OTB预算：¥140-270成本带'],
  competitorSources: ['Clarks 高价位段', 'Veja 可持续路线', 'New Balance 城市运动'],
  waveCount: 2,
  seriesCount: 5,
  seriesInDevelopmentCount: 4,
  seriesPendingReviewCount: 2,
  cancelledSeriesCount: 0,
  themeHealthScore: 78,
  themeRiskLevel: 'warning',
  recommendedAction: '户外系列成本带偏高，需在材料替换或款数削减中二选一，本周完成决策',
  strategyRationale: '消费者从户外功能转向城市多场景穿着，品牌需要用更克制的机能语言承接通勤、轻户外和周末出行，同时与竞品在"城市感精工细节"上建立差异。',
  weeklyDecisions: [
    'Trail Lite 成本超标：削减 2 款 OR 申请豁免（负责人：陈总，截止 5/30）',
    'Core Craft Hero 款数量：是否新增 1 款 Hero（负责人：设计总监，截止 5/27）',
    'Sport Light 定位确认：是否继续小批量测试或并入 Urban Walk（负责人：品牌部，截止 6/1）',
  ],
  seriesStructure: { hero: 1, core: 2, support: 2 },
  totalSkuTarget: 31,
  mainPriceBand: '¥699-899',
  targetGrossMarginRate: 0.52,
  mainChannel: '门店 + 电商旗舰',
};

// ── 2. 商品企划输入承接 ──────────────────────────────────────────────────────

export const MERCH_INPUT_ALIGNMENTS: MerchandisingInputAlignment[] = [
  {
    inputSource: '品牌定位',
    inputSummary: '趣味、舒适、质朴',
    coreConclusion: '品牌 DNA 定义轻松廓形 + 质朴材料 + 低饱和配色，是本季主题选择的基础底线。',
    designTranslation: '轻松廓形 + 舒适楦型 + 低饱和配色',
    designRequirement: '所有系列材料主色不超过 3 个，帮面廓形偏简洁，拒绝堆砌装饰元素',
    skuImpact: '影响全部 5 个系列，是配色与楦型判断的基准线',
    alignmentStatus: 'aligned',
    generatedSeriesCount: 3,
    generatedTaskCount: 18,
    deviationRisk: 'none',
    deviation: '无',
    nextAction: '持续对标品牌 DNA，评审时检查装饰件是否符合质朴原则',
    recommendedAction: '持续对标品牌 DNA，避免装饰堆砌',
    jumpAction: '/design-review-center?tab=overview',
  },
  {
    inputSource: '消费者洞察',
    inputSummary: '25-35 岁潮流城市男性，日常通勤 + 轻量户外',
    coreConclusion: '主力消费者对"穿着多场景"诉求强烈，希望一双鞋同时适用通勤和周末休闲。',
    designTranslation: 'Urban Trail 系列（通勤轻户外）+ Core Craft 系列（精工都市）',
    designRequirement: '楦型需要宽容度，不能太窄或太运动；底型要有轻微防滑功能',
    skuImpact: '影响 Core Craft / Urban Walk 楦型开发方向',
    alignmentStatus: 'aligned',
    generatedSeriesCount: 2,
    generatedTaskCount: 14,
    deviationRisk: 'none',
    deviation: '无',
    nextAction: '确认 Sport Light 系列消费者是否与主群体区分',
    recommendedAction: '确认 Sport Light 系列消费者是否与主群体区分',
    jumpAction: '/design-review-center?tab=overview',
  },
  {
    inputSource: '竞品与趋势',
    inputSummary: '街头机能、山系户外复古跑鞋崛起；Clarks / Veja 在精工细节上有强势表现',
    coreConclusion: '竞品空白机会在"城市感精工户外"——既有精工细节又有户外耐用性，当前市场没有品牌完整占据。',
    designTranslation: 'Trail Lite 系列（山系外形 + 城市穿搭）',
    designRequirement: '加入趋势素材：城市山系配色 + 户外底型；设计评审须包含竞品对比',
    skuImpact: '影响 Trail Lite 竞品方向板，需补充 Salomon XT-6 / NB 1906 参考',
    alignmentStatus: 'partial',
    generatedSeriesCount: 1,
    generatedTaskCount: 6,
    deviationRisk: 'medium',
    deviation: '街头元素尚未落地为款式，趋势参考图缺口较大',
    nextAction: '加入趋势素材：街头元素尚未落地为款式，需补充参考图',
    recommendedAction: '加入趋势素材：街头元素尚未落地为款式，需补充参考图',
    jumpAction: '/design-review-center?tab=overview',
  },
  {
    inputSource: '品类运营',
    inputSummary: '健步鞋 / 乐福鞋 / 轻户外占比 60%+',
    coreConclusion: '健步与乐福是门店动销主力，轻户外是增长机会，正装商务维持保守配置。',
    designTranslation: 'Core Craft 系列主打健步 & 乐福，Trail Lite 承接户外类目',
    designRequirement: '健步鞋楦型需要宽楦标准；乐福鞋需要经典比例不变形',
    skuImpact: '正装商务系列（Business Classic）品类覆盖偏低',
    alignmentStatus: 'aligned',
    generatedSeriesCount: 2,
    generatedTaskCount: 11,
    deviationRisk: 'none',
    deviation: '正装商务配置偏保守，SKU 偏少',
    nextAction: '关注 Business Classic 品类覆盖是否满足渠道需求',
    recommendedAction: '正装商务系列（Business Classic）品类覆盖偏低，关注',
    jumpAction: '/design-review-center?tab=productArchitecture',
  },
  {
    inputSource: '波段企划',
    inputSummary: 'W1 需要 13 款，W2 需要 18 款，合计 31 款',
    coreConclusion: '5 个系列分摊波段任务，W1 以 Core Craft + Urban Walk 为主力，W2 承接户外与运动扩展。',
    designTranslation: '5 个系列分摊：W1 承接 13 款（2 系列），W2 承接 18 款（3 系列）',
    designRequirement: '设计完成节点须与波段上市倒排，W1 首批打样须在 6/30 前完成',
    skuImpact: 'W2 Trail Lite 款数仍缺口 2 款，须在本周确认填补方案',
    alignmentStatus: 'aligned',
    generatedSeriesCount: 5,
    generatedTaskCount: 31,
    deviationRisk: 'low',
    deviation: 'W2 Trail Lite 款数缺口 2 款',
    nextAction: '同步波段计划：W2 Trail Lite 款数仍缺口 2 款，待补充',
    recommendedAction: '同步波段计划：W2 Trail Lite 款数仍缺口 2 款，待补充',
    jumpAction: '/design-review-center?tab=developmentTaskPool',
  },
  {
    inputSource: 'OTB 预算',
    inputSummary: '成本带 ¥140-270，合计采购额 ¥1,850 万',
    coreConclusion: 'OTB 约束较紧，材料成本须严格控制，新开模总数不超过 4 副（当前规划 7 副，超标）。',
    designTranslation: '限制材料策略（低成本里布 + 共底共楦），控制新模总数 ≤ 4',
    designRequirement: '新模申请须通过成本委员会审批；所有系列须提交共底楦可行性报告',
    skuImpact: 'Trail Lite 预测成本 ¥418 超标 ¥360（+16%），需削减款数或材料替换',
    alignmentStatus: 'deviated',
    generatedSeriesCount: 1,
    generatedTaskCount: 0,
    deviationRisk: 'high',
    deviation: 'Trail Lite 成本超标 16%，新模数量超出预算 3 副',
    nextAction: 'Trail Lite 户外系列预测成本 ¥418（超目标 ¥360），需申请豁免或削减款数',
    recommendedAction: 'Trail Lite 户外系列预测成本 ¥418（超目标 ¥360），需申请豁免或削减款数',
    jumpAction: '/design-review-center?tab=overview',
  },
  {
    inputSource: '上季复盘结论',
    inputSummary: '上季 Trail 系列滞销，Core Craft 超卖；Urban Walk 渠道反馈好但 SKU 不足',
    coreConclusion: '轻户外系列在城市渠道动销有限，精工系列需要提升 Hero 款集中度；Urban Walk 供给不足需扩充。',
    designTranslation: '本季 Trail Lite 减量缩款；Core Craft 新增 Hero 款；Urban Walk 从 4 款扩至 5 款',
    designRequirement: '复盘数据显示：楦型舒适度是回购驱动首因，设计须优先宽楦选型',
    skuImpact: 'Urban Walk 增加 1 款 Core；Trail Lite 削减 2 款测试款',
    alignmentStatus: 'aligned',
    generatedSeriesCount: 2,
    generatedTaskCount: 8,
    deviationRisk: 'none',
    deviation: '无',
    nextAction: '确认 Urban Walk 新增款式的楦型与供应商，本周出初稿',
    recommendedAction: '确认 Urban Walk 新增款式的楦型与供应商',
    jumpAction: '/design-review-center?tab=overview',
  },
  {
    inputSource: '渠道反馈',
    inputSummary: '门店反馈：消费者在 ¥699-799 价格带接受度最高；电商需要更强视觉差异',
    coreConclusion: '主价格带确认为 ¥699-799；电商系列需要更高辨识度配色和 Hero 款强化。',
    designTranslation: '定价策略：Core Craft / Urban Walk 锚定 ¥699-899；电商专供配色加入高辨识度撞色',
    designRequirement: '电商上市系列需要独立 Hero 款，不能只上门店货盘',
    skuImpact: '影响 Core Craft 3 款、Urban Walk 2 款的电商版本规划',
    alignmentStatus: 'partial',
    generatedSeriesCount: 2,
    generatedTaskCount: 5,
    deviationRisk: 'low',
    deviation: '电商专供款尚未落地规划',
    nextAction: '明确电商 Hero 款配色方向，加入方向板',
    recommendedAction: '明确电商 Hero 款配色方向，加入方向板',
    jumpAction: '/design-review-center?tab=overview',
  },
  {
    inputSource: '成本与供应链',
    inputSummary: '防水皮料供应商交期 8 周；共底供应商 A 产能满载，需确认备用方案',
    coreConclusion: '供应链风险集中在 Trail Lite 的防水皮料和共底交期，若不确认备用供应商，W2 节点有风险。',
    designTranslation: '材料板须优先确认供应商；Trail Lite 防水皮料替换为可降级方案',
    designRequirement: '新底型开发须在 5/31 前确认工厂，否则无法赶上 W2 首批打样',
    skuImpact: '影响 Trail Lite 全系列 6 款及 Business Classic 植鞣皮供应',
    alignmentStatus: 'partial',
    generatedSeriesCount: 2,
    generatedTaskCount: 4,
    deviationRisk: 'medium',
    deviation: '共底供应商 A 产能满载，Trail Lite 防水皮料替换方案未确认',
    nextAction: '联系备用共底供应商，确认 5/28 前报价',
    recommendedAction: '联系备用共底供应商，确认 5/28 前报价',
    jumpAction: '/design-review-center?tab=overview',
  },
];

// ── 3. 系列策略卡 ────────────────────────────────────────────────────────────

export const SERIES_STRATEGY_CARDS: SeriesStrategyCard[] = [
  {
    seriesId: 'S-CORE',
    seriesName: 'Core Craft',
    waveId: 'W1',
    targetConsumer: '28-38 岁都市男性，追求精工细节与穿着舒适',
    seriesRole: 'hero',
    relatedCategories: ['健步鞋', '乐福鞋', '工装休闲'],
    targetSkuCount: 8,
    heroStyleCount: 2,
    costBand: '¥248-280',
    targetPriceBand: '¥699-799',
    colorPalette: ['哑光黑', '象牙米', '驼色', '炭灰'],
    designKeywords: ['精工', '宽楦', '轻量', '当代感'],
    benchmarkBrands: ['Clarks', 'Paraboot', 'White\'s Boots'],
    decisionStatus: 'recommend_proceed',
    decisionReason: '消费者需求明确，竞品参考充分，成本可控',
    recommendedAction: '按计划推进，优先确认宽楦 Hero 款',
  },
  {
    seriesId: 'S-OUTDOOR',
    seriesName: 'Trail Lite',
    waveId: 'W2',
    targetConsumer: '28-40 岁轻户外爱好者，兼顾城市穿搭',
    seriesRole: 'image',
    relatedCategories: ['轻户外徒步', '防水休闲'],
    targetSkuCount: 6,
    heroStyleCount: 1,
    costBand: '¥360-420',
    targetPriceBand: '¥1,099-1,299',
    colorPalette: ['橄榄绿', '沙色', '炭灰蓝'],
    designKeywords: ['防护', '轻量', '山系廓形', '都市通勤'],
    benchmarkBrands: ['Salomon', 'Hoka', 'Merrell'],
    decisionStatus: 'needs_adjustment',
    decisionReason: '预测成本 ¥418 超目标 ¥360，需材料替换或款数削减',
    recommendedAction: '本周决策：削减 2 款 OR 申请成本豁免，否则建议延期至 W3',
  },
  {
    seriesId: 'S-URBAN',
    seriesName: 'Urban Walk',
    waveId: 'W1',
    targetConsumer: '25-35 岁都市通勤男性，注重日常便携',
    seriesRole: 'profit',
    relatedCategories: ['都市通勤', '轻量休闲'],
    targetSkuCount: 5,
    heroStyleCount: 1,
    costBand: '¥268-285',
    targetPriceBand: '¥799-899',
    colorPalette: ['黑', '米白', '深灰'],
    designKeywords: ['轻量', '通勤美学', '功能缓震'],
    benchmarkBrands: ['Cole Haan', 'Ecco'],
    decisionStatus: 'recommend_proceed',
    decisionReason: '成本健康，目标消费者清晰，供应链已确认',
    recommendedAction: '确认 BOM 并提交首版打样',
  },
  {
    seriesId: 'S-SPORT',
    seriesName: 'Sport Light',
    waveId: 'W2',
    targetConsumer: '22-30 岁轻量运动青年，追求性价比',
    seriesRole: 'traffic',
    relatedCategories: ['休闲运动', '轻量跑'],
    targetSkuCount: 7,
    heroStyleCount: 1,
    costBand: '¥168-185',
    targetPriceBand: '¥499-599',
    colorPalette: ['科技白', '撞色橙', '深海蓝'],
    designKeywords: ['轻量科技感', '撞色', '年轻化'],
    benchmarkBrands: ['Li-Ning 弦', 'Skechers Performance'],
    decisionStatus: 'small_batch',
    decisionReason: '目标消费者与主线品牌人群差距较大，先测试市场反应',
    recommendedAction: '建议小批量测试：先做 3 款，评估后再决策全系列',
  },
  {
    seriesId: 'S-FORMAL',
    seriesName: 'Business Classic',
    waveId: 'W2',
    targetConsumer: '30-45 岁商务男性，商务正式场合',
    seriesRole: 'base',
    relatedCategories: ['正装商务', '皮鞋'],
    targetSkuCount: 5,
    heroStyleCount: 1,
    costBand: '¥395-415',
    targetPriceBand: '¥1,199-1,499',
    colorPalette: ['经典黑', '棕', '深炭灰'],
    designKeywords: ['植鞣皮', '经典楦型', '当代正装'],
    benchmarkBrands: ['Allen Edmonds', 'Crockett & Jones'],
    decisionStatus: 'recommend_proceed',
    decisionReason: '成本已锁定，BOM 完整，历史销售稳定',
    recommendedAction: '可直接进入 Salesman Sample Gate',
  },
];

// ── 4. 资源分配 ──────────────────────────────────────────────────────────────

export const RESOURCE_ALLOCATIONS: ThemeSeriesResourceAllocation[] = [
  {
    waveId: 'W1',
    seriesId: 'S-CORE',
    seriesName: 'Core Craft',
    targetSkuCount: 8,
    heroStyleCount: 2,
    coreStyleCount: 5,
    testStyleCount: 1,
    imageStyleCount: 0,
    newMoldCount: 2,
    sharedLastRate: 0.75,
    sharedSoleRate: 0.62,
    costBand: '¥248-280',
    developmentPriority: 'high',
    otbConstraint: '¥248 成本上限，不得超过 2 副新模',
    riskLevel: 'low',
    recommendedAction: '按计划进行，监控新模周期',
  },
  {
    waveId: 'W1',
    seriesId: 'S-URBAN',
    seriesName: 'Urban Walk',
    targetSkuCount: 5,
    heroStyleCount: 1,
    coreStyleCount: 3,
    testStyleCount: 1,
    imageStyleCount: 0,
    newMoldCount: 0,
    sharedLastRate: 0.80,
    sharedSoleRate: 0.80,
    costBand: '¥268-285',
    developmentPriority: 'medium',
    otbConstraint: '全线共底，禁止开新外底模',
    riskLevel: 'low',
    recommendedAction: '优先确认共底供应商交期',
  },
  {
    waveId: 'W2',
    seriesId: 'S-OUTDOOR',
    seriesName: 'Trail Lite',
    targetSkuCount: 6,
    heroStyleCount: 1,
    coreStyleCount: 3,
    testStyleCount: 2,
    imageStyleCount: 1,
    newMoldCount: 3,
    sharedLastRate: 0.33,
    sharedSoleRate: 0.17,
    costBand: '¥360-420',
    developmentPriority: 'high',
    otbConstraint: '成本超标，需削减新模或改材料',
    riskLevel: 'high',
    recommendedAction: '立即决策：削减 2 款 OR 申请豁免，否则影响上市节点',
  },
  {
    waveId: 'W2',
    seriesId: 'S-SPORT',
    seriesName: 'Sport Light',
    targetSkuCount: 3,
    heroStyleCount: 1,
    coreStyleCount: 2,
    testStyleCount: 0,
    imageStyleCount: 0,
    newMoldCount: 1,
    sharedLastRate: 0.67,
    sharedSoleRate: 0.67,
    costBand: '¥168-185',
    developmentPriority: 'low',
    otbConstraint: '小批量测试，款数上限 3 款',
    riskLevel: 'medium',
    recommendedAction: '小批量推进，等测试数据再决策',
  },
  {
    waveId: 'W2',
    seriesId: 'S-FORMAL',
    seriesName: 'Business Classic',
    targetSkuCount: 5,
    heroStyleCount: 1,
    coreStyleCount: 3,
    testStyleCount: 0,
    imageStyleCount: 1,
    newMoldCount: 1,
    sharedLastRate: 0.80,
    sharedSoleRate: 1.0,
    costBand: '¥395-415',
    developmentPriority: 'medium',
    otbConstraint: '全线共底（已有底型），1副楦型更新',
    riskLevel: 'low',
    recommendedAction: '正常推进，关注植鞣皮供应商交期',
  },
];

// ── 5. 主题风险与决策中心 ────────────────────────────────────────────────────

export const THEME_RISK_DECISIONS: ThemeRiskDecisionItem[] = [
  {
    riskId: 'TR-001',
    riskObject: 'Trail Lite 系列成本超标',
    riskType: 'cost_overrun',
    riskReason: '防水工艺 + 新底型开模共摊 ¥18W，预测 FOB ¥418 超目标 ¥360（+16%）',
    affectedWave: 'W2',
    affectedSeries: 'Trail Lite',
    affectedStyleCount: 6,
    expectedImpact: '毛利率跌至 42%，低于公司下限 50%；或延期进入 W3',
    decisionNeeded: '本周决策：① 削减 2 款共摊成本 ② 申请成本豁免 ③ 延至 W3',
    recommendedAction: '建议削减 2 款测试款，专注 Hero + Core 4 款',
    owner: '陈总',
    dueDate: '2026-05-30',
    actionStatus: 'open',
  },
  {
    riskId: 'TR-002',
    riskObject: 'Sport Light 消费者定位模糊',
    riskType: 'unclear_consumer',
    riskReason: '目标人群 22-30 岁与主线品牌 28-38 岁存在重叠，可能稀释品牌调性',
    affectedWave: 'W2',
    affectedSeries: 'Sport Light',
    affectedStyleCount: 3,
    expectedImpact: '品牌调性稀释，或与现有 Urban Walk 渠道竞争',
    decisionNeeded: '是否继续推进小批量？或合并至 Urban Walk 系列？',
    recommendedAction: '先完成 3 款小批量测试，6 月中旬评估数据后决策',
    owner: '品牌部',
    dueDate: '2026-06-15',
    actionStatus: 'in_progress',
  },
  {
    riskId: 'TR-003',
    riskObject: 'Trail Lite 新模数量超标',
    riskType: 'too_many_new_molds',
    riskReason: '当前 Trail Lite 系列规划 3 副新模，超出 OTB 约束的 2 副上限',
    affectedWave: 'W2',
    affectedSeries: 'Trail Lite',
    affectedStyleCount: 4,
    expectedImpact: '新模费用超出 ¥8W，影响整体成本结构',
    decisionNeeded: '削减 1 副新模（合并底型）或提高价格带覆盖成本',
    recommendedAction: '与工程团队讨论是否可将 2 款鞋型共用同一底型',
    owner: '工程部',
    dueDate: '2026-05-28',
    actionStatus: 'open',
  },
  {
    riskId: 'TR-004',
    riskObject: 'Core Craft 主推款不足',
    riskType: 'insufficient_hero',
    riskReason: 'Core Craft 8 款中仅 2 款为 Hero，低于系列目标的 30%（需 2.4 款）',
    affectedWave: 'W1',
    affectedSeries: 'Core Craft',
    affectedStyleCount: 2,
    expectedImpact: '缺少主打点，营销资源难以集中，动销效率降低',
    decisionNeeded: '是否将某款 Core 款提升为 Hero，或重新定义 Hero 标准',
    recommendedAction: '本周组织小型评审，确认 Hero 款标准和数量',
    owner: '设计总监',
    dueDate: '2026-05-27',
    actionStatus: 'open',
  },
  {
    riskId: 'TR-005',
    riskObject: 'Trail Lite 竞品参考不足',
    riskType: 'insufficient_benchmark',
    riskReason: '方向板仅有 3 个 benchmark 参考，缺少山系城市结合风格的对标案例',
    affectedWave: 'W2',
    affectedSeries: 'Trail Lite',
    affectedStyleCount: 6,
    expectedImpact: '方向板通过率低，设计评审可能被退回',
    decisionNeeded: '补充 benchmark 或接受当前方向板',
    recommendedAction: '加入趋势素材：补充 Salomon XT-6 / New Balance 1906 城市版本',
    owner: '设计师 A',
    dueDate: '2026-05-26',
    actionStatus: 'open',
  },
  {
    riskId: 'TR-006',
    riskObject: 'W1 上市节点风险',
    riskType: 'wave_launch_risk',
    riskReason: '打样进度：Core Craft 宽楦 Hero 款延误 12 天，可能影响 W1 上市节奏',
    affectedWave: 'W1',
    affectedSeries: 'Core Craft',
    affectedStyleCount: 2,
    expectedImpact: 'W1 上市时间后推 2-4 周，影响春季首批铺货',
    decisionNeeded: '是否采用备选款顶替，或压缩后续流程时间',
    recommendedAction: '联系工厂确认最快打样周期，并同步备选款方案',
    owner: '开发经理',
    dueDate: '2026-05-25',
    actionStatus: 'in_progress',
  },
];

// ── 6. 跨模块入口 ────────────────────────────────────────────────────────────

export const THEME_RELATED_LINKS: ThemeSeriesRelatedModuleLink[] = [
  // 内部链接
  {
    linkId: 'int-001',
    label: '产品架构',
    description: '查看 SKU 结构、底楦平台与开发属性分配',
    relatedRoute: '/design-review-center?tab=productArchitecture',
    category: 'internal',
    actionLabel: '生成产品架构',
    icon: '🗂️',
  },
  {
    linkId: 'int-002',
    label: '开发任务池',
    description: '查看所有款式的开发任务与进度',
    relatedRoute: '/design-review-center?tab=developmentTaskPool',
    category: 'internal',
    actionLabel: '生成开发任务',
    icon: '🔧',
  },
  {
    linkId: 'int-003',
    label: '波段研发节点',
    description: '查看节点计划与 Gate 完成状态',
    relatedRoute: '/design-review-center?tab=developmentGateTable',
    category: 'internal',
    actionLabel: '进入 波段研发节点',
    icon: '📅',
  },
  {
    linkId: 'int-004',
    label: '设计版本',
    description: '查看各款式的设计版本与情绪板',
    relatedRoute: '/design-review-center?tab=designVersionPreview',
    category: 'internal',
    actionLabel: '生成设计版本',
    icon: '🎨',
  },
  {
    linkId: 'int-005',
    label: '评审决议',
    description: '提交评审、跟踪决议状态',
    relatedRoute: '/design-review-center?tab=reviewDecisionCenter',
    category: 'internal',
    actionLabel: '提交评审',
    icon: '✅',
  },
  // 外部链接（商品企划）
  {
    linkId: 'ext-001',
    label: '品牌定位',
    description: '查看品牌 DNA 与设计语言定义',
    relatedRoute: '/design-review-center?tab=overview',
    category: 'external',
    actionLabel: '校准品牌 DNA',
    icon: '🏷️',
  },
  {
    linkId: 'ext-002',
    label: '消费者画像',
    description: '查看目标人群画像与购买驱动',
    relatedRoute: '/design-review-center?tab=overview',
    category: 'external',
    actionLabel: '查看目标人群',
    icon: '👤',
  },
  {
    linkId: 'ext-003',
    label: '竞品 & 趋势',
    description: '查看竞品分析与市场趋势信号',
    relatedRoute: '/design-review-center?tab=overview',
    category: 'external',
    actionLabel: '加入趋势素材',
    icon: '📊',
  },
  {
    linkId: 'ext-004',
    label: '波段企划',
    description: '查看波段计划与款数目标',
    relatedRoute: '/design-review-center?tab=overview',
    category: 'external',
    actionLabel: '同步波段计划',
    icon: '📆',
  },
  {
    linkId: 'ext-005',
    label: 'OTB 预算',
    description: '查看 OTB 采购约束与成本带',
    relatedRoute: '/design-review-center?tab=overview',
    category: 'external',
    actionLabel: '查看 OTB 约束',
    icon: '💰',
  },
];

const WAVE_ORDER = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];

const WAVE_LAUNCH_DATES: Record<string, string> = {
  W1: '2026-07-15',
  W2: '2026-09-01',
  W3: '2026-11-01',
  W4: '2027-01-15',
};

const SERIES_ROLE_TO_CARD_ROLE: Record<ThemeStrategyRecord['seriesRole'], SeriesRole2> = {
  hero: 'hero',
  image: 'image',
  basic: 'base',
  traffic: 'traffic',
};

function normalizeWaveId(wave: string): string {
  return wave.toUpperCase();
}

function sortByWaveAndRole<T extends { waveId?: string; targetWave?: string; seriesRole?: string; seriesName: string }>(records: T[]): T[] {
  const roleOrder: Record<string, number> = { hero: 0, image: 1, basic: 2, base: 2, profit: 2, traffic: 3, test: 4 };

  return [...records].sort((a, b) => {
    const waveA = normalizeWaveId(a.waveId ?? a.targetWave ?? '');
    const waveB = normalizeWaveId(b.waveId ?? b.targetWave ?? '');
    const idxA = WAVE_ORDER.indexOf(waveA);
    const idxB = WAVE_ORDER.indexOf(waveB);
    if (idxA !== idxB) return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    const roleA = roleOrder[a.seriesRole ?? ''] ?? 9;
    const roleB = roleOrder[b.seriesRole ?? ''] ?? 9;
    if (roleA !== roleB) return roleA - roleB;
    return a.seriesName.localeCompare(b.seriesName);
  });
}

function uniqueValues(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function flattenUnique(strategies: ThemeStrategyRecord[], selector: (record: ThemeStrategyRecord) => string[]): string[] {
  return uniqueValues(strategies.flatMap(selector));
}

function getMostCommon(values: string[], fallback: string): string {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

function extractNumbers(value: string): number[] {
  return (value.match(/\d+(?:,\d{3})*/g) ?? []).map((num) => Number(num.replace(/,/g, ''))).filter((num) => Number.isFinite(num));
}

function summarizePriceBand(records: ThemeStrategyRecord[]): string {
  const numbers = records.flatMap((record) => extractNumbers(record.priceBand));
  if (numbers.length >= 2) {
    return `¥${Math.min(...numbers)}-${Math.max(...numbers)}`;
  }

  return getMostCommon(records.map((record) => record.priceBand), SEASON_THEME_SUMMARY.mainPriceBand ?? '待确认');
}

function getCostBandMax(costBand: string): number | null {
  const numbers = extractNumbers(costBand);
  return numbers.length ? Math.max(...numbers) : null;
}

function inferSeriesRole(record: ThemeStrategyRecord): SeriesRole2 {
  return SERIES_ROLE_TO_CARD_ROLE[record.seriesRole] ?? 'base';
}

function inferBusinessTasks(role: SeriesRole2): SeriesBusinessTask[] {
  if (role === 'hero') return ['volume', 'margin'];
  if (role === 'image') return ['brand_image', 'acquisition'];
  if (role === 'traffic') return ['acquisition', 'test_market'];
  if (role === 'profit') return ['margin', 'volume'];
  if (role === 'test') return ['test_market'];
  return ['margin', 'channel_exclusive'];
}

function inferHeroStyleCount(record: ThemeStrategyRecord): number {
  if (record.skuTarget <= 0) return 0;
  const ratio = record.seriesRole === 'hero' ? 0.25 : record.seriesRole === 'image' ? 0.18 : 0.14;
  return Math.max(1, Math.min(record.skuTarget, Math.ceil(record.skuTarget * ratio)));
}

function inferMainChannels(record: ThemeStrategyRecord): string[] {
  const text = `${record.seriesName} ${record.categories.join(' ')} ${record.usageScenarios.join(' ')}`;
  if (/户外|trail|outdoor|徒步|防水/i.test(text)) return ['专业户外渠道', '电商种草'];
  if (/运动|跑|traffic|流量/i.test(text) || record.seriesRole === 'traffic') return ['电商主推', '快闪渠道'];
  if (/商务|正装|formal|classic/i.test(text) || record.seriesRole === 'basic') return ['门店精品区', '企业大客户'];
  if (record.seriesRole === 'hero') return ['门店主推', '电商旗舰'];
  return ['门店', '电商旗舰'];
}

function inferMainScenario(record: ThemeStrategyRecord): string {
  return record.usageScenarios.slice(0, 2).join(' / ') || '待补充核心穿着场景';
}

function inferDecisionStatus(record: ThemeStrategyRecord): SeriesDecisionStatus {
  if (record.costDriftAlert) return 'needs_adjustment';
  if (record.reviewDecisionStatus === 'approved') return 'recommend_proceed';
  if (record.seriesRole === 'traffic') return 'small_batch';
  return 'pending_review';
}

function inferDecisionReason(record: ThemeStrategyRecord): string {
  if (record.costDriftAlert) return `成本偏离：${record.costDriftAlert}`;
  if (record.reviewDecisionStatus === 'approved') return '消费者、价格带、设计语言和成本带已形成闭环，可按计划推进';
  if (record.reviewDecisionStatus === 'in_progress') return '方向已进入评审推进中，仍需补齐材料、底楦或样品确认';
  return '方向板尚未定案，需补齐核心判断后再进入开发任务';
}

function inferRecommendedAction(record: ThemeStrategyRecord): string {
  if (record.costDriftAlert) return '本周决策：材料降级、削减款数或申请成本豁免三选一';
  if (record.reviewDecisionStatus === 'approved') return '按计划推进，优先锁定 Hero 款和首批打样任务';
  if (record.reviewDecisionStatus === 'in_progress') return '补齐方向板评审意见，推动进入开发任务池';
  return '补充竞品、色材底楦判断后提交评审';
}

function inferResourceRisk(record: ThemeStrategyRecord): ThemeSeriesResourceAllocation['riskLevel'] {
  const maxCost = getCostBandMax(record.targetCostBand);
  const isCostOver = Boolean(record.quotedCostAverage && maxCost && record.quotedCostAverage > maxCost);
  if (record.costDriftAlert || isCostOver) return 'high';
  if (record.reviewDecisionStatus !== 'approved') return 'medium';
  return 'low';
}

function joinOrFallback(values: string[], fallback: string): string {
  return values.length ? values.join(' / ') : fallback;
}

export function deriveSeasonThemeStrategySummary(strategies: ThemeStrategyRecord[]): SeasonThemeStrategySummary {
  if (!strategies.length) return SEASON_THEME_SUMMARY;

  const sorted = sortByWaveAndRole(strategies);
  const waveIds = uniqueValues(sorted.map((record) => normalizeWaveId(record.targetWave)));
  const costAlertCount = sorted.filter((record) => Boolean(record.costDriftAlert)).length;
  const pendingCount = sorted.filter((record) => record.reviewDecisionStatus === 'pending').length;
  const inProgressCount = sorted.filter((record) => record.reviewDecisionStatus === 'in_progress').length;
  const approvedCount = sorted.filter((record) => record.reviewDecisionStatus === 'approved').length;
  const totalSkuTarget = sorted.reduce((sum, record) => sum + record.skuTarget, 0);
  const designKeywords = flattenUnique(sorted, (record) => [...record.designLanguages, ...record.materialDirections, ...record.colorDirections]).slice(0, 5);
  const benchmarkSources = flattenUnique(sorted, (record) => record.benchmarkReferences).slice(0, 3);
  const healthScore = Math.max(45, Math.min(96, 82 + approvedCount * 3 - inProgressCount * 4 - pendingCount * 7 - costAlertCount * 12));
  const themeRiskLevel: SeasonThemeStrategySummary['themeRiskLevel'] = costAlertCount > 0 ? 'high_risk' : pendingCount + inProgressCount > 0 ? 'warning' : 'healthy';
  const costAlertRecord = sorted.find((record) => record.costDriftAlert);

  const weeklyDecisions = [
    ...sorted
      .filter((record) => record.costDriftAlert)
      .map((record) => `${record.seriesName} 成本偏离：${record.costDriftAlert}，本周确认材料替换 / 款数削减 / 成本豁免`),
    ...sorted
      .filter((record) => record.reviewDecisionStatus === 'pending')
      .map((record) => `${record.seriesName} 方向未定案：补齐色材底楦判断并提交评审`),
    ...sorted
      .filter((record) => record.reviewDecisionStatus === 'in_progress')
      .map((record) => `${record.seriesName} 评审推进中：锁定 Hero 款与首版打样任务`),
  ].slice(0, 3);

  return {
    ...SEASON_THEME_SUMMARY,
    designKeywords: designKeywords.length ? designKeywords : SEASON_THEME_SUMMARY.designKeywords,
    targetConsumer: getMostCommon(sorted.map((record) => record.targetConsumer), SEASON_THEME_SUMMARY.targetConsumer),
    coreScenario: flattenUnique(sorted, (record) => record.usageScenarios).slice(0, 3).join(' / ') || SEASON_THEME_SUMMARY.coreScenario,
    trendSources: benchmarkSources.length
      ? ['当前筛选系列方向板', ...benchmarkSources]
      : SEASON_THEME_SUMMARY.trendSources,
    merchandisingSources: [
      `波段企划：${waveIds.map((wave) => `${wave} ${sorted.filter((record) => normalizeWaveId(record.targetWave) === wave).reduce((sum, record) => sum + record.skuTarget, 0)}款`).join(' / ')}`,
      `系列结构：${sorted.length} 个系列 / ${totalSkuTarget} 款`,
      `成本带：${summarizePriceBand(sorted)}`,
    ],
    competitorSources: benchmarkSources.length ? benchmarkSources : SEASON_THEME_SUMMARY.competitorSources,
    waveCount: waveIds.length,
    seriesCount: sorted.length,
    seriesInDevelopmentCount: inProgressCount,
    seriesPendingReviewCount: pendingCount,
    cancelledSeriesCount: 0,
    themeHealthScore: healthScore,
    themeRiskLevel,
    recommendedAction: costAlertRecord
      ? `${costAlertRecord.seriesName} 存在成本偏离，需在材料替换、款数削减或成本豁免中完成决策`
      : pendingCount > 0
        ? `${pendingCount} 个系列待评审，优先补齐方向板和开发任务入口`
        : '主题、波段、系列角色和开发约束已对齐，按计划推进',
    strategyRationale: `当前筛选下共 ${sorted.length} 个系列、${totalSkuTarget} 款，围绕 ${getMostCommon(sorted.map((record) => record.targetConsumer), '目标消费者')} 建立 ${summarizePriceBand(sorted)} 的系列表达，并以波段上市节奏约束设计决策。`,
    weeklyDecisions: weeklyDecisions.length ? weeklyDecisions : ['本周无强制决策项，按波段计划推进方向板和打样任务'],
    seriesStructure: {
      hero: sorted.filter((record) => record.seriesRole === 'hero').length,
      core: sorted.filter((record) => record.seriesRole === 'image' || record.seriesRole === 'basic').length,
      support: sorted.filter((record) => record.seriesRole === 'traffic').length,
    },
    totalSkuTarget,
    mainPriceBand: summarizePriceBand(sorted),
    mainChannel: uniqueValues(sorted.flatMap(inferMainChannels)).slice(0, 3).join(' + '),
  };
}

export function deriveMerchInputAlignments(strategies: ThemeStrategyRecord[]): MerchandisingInputAlignment[] {
  if (!strategies.length) return MERCH_INPUT_ALIGNMENTS;

  const sorted = sortByWaveAndRole(strategies);
  const totalSkuTarget = sorted.reduce((sum, record) => sum + record.skuTarget, 0);
  const waveSummary = uniqueValues(sorted.map((record) => normalizeWaveId(record.targetWave)))
    .map((wave) => `${wave} ${sorted.filter((record) => normalizeWaveId(record.targetWave) === wave).reduce((sum, record) => sum + record.skuTarget, 0)}款`)
    .join(' / ');
  const costAlertRecords = sorted.filter((record) => record.costDriftAlert);

  return MERCH_INPUT_ALIGNMENTS.map((input) => {
    if (input.inputSource === '波段企划') {
      return {
        ...input,
        inputSummary: `${waveSummary}，合计 ${totalSkuTarget} 款`,
        designTranslation: `${sorted.length} 个系列分摊：${waveSummary}`,
        generatedSeriesCount: sorted.length,
        generatedTaskCount: totalSkuTarget,
        deviation: costAlertRecords.length ? `${costAlertRecords.length} 个系列因成本或评审状态影响波段落位` : '无',
        nextAction: costAlertRecords.length ? '先完成高风险系列决策，再锁定波段任务池' : '同步波段计划，进入开发任务池',
        recommendedAction: costAlertRecords.length ? '高风险系列决策后再冻结波段款数' : '波段款数与系列结构已对齐',
      };
    }

    if (input.inputSource === 'OTB 预算') {
      return {
        ...input,
        alignmentStatus: costAlertRecords.length ? 'deviated' : 'aligned',
        generatedSeriesCount: costAlertRecords.length || sorted.length,
        generatedTaskCount: costAlertRecords.reduce((sum, record) => sum + record.skuTarget, 0),
        deviationRisk: costAlertRecords.length ? 'high' : 'none',
        deviation: costAlertRecords.length
          ? costAlertRecords.map((record) => `${record.seriesName}: ${record.costDriftAlert}`).join('；')
          : '无',
        nextAction: costAlertRecords.length ? '逐系列确认材料替换、款数削减或成本豁免' : '维持当前成本带，进入打样成本跟踪',
        recommendedAction: costAlertRecords.length ? '存在成本偏离，需先完成 OTB 决策' : 'OTB 与系列策略暂时匹配',
      };
    }

    return {
      ...input,
      generatedSeriesCount: Math.min(input.generatedSeriesCount, sorted.length),
      generatedTaskCount: Math.min(input.generatedTaskCount, totalSkuTarget),
    };
  });
}

export function deriveSeriesStrategyCards(strategies: ThemeStrategyRecord[]): SeriesStrategyCard[] {
  return sortByWaveAndRole(strategies).map((record) => ({
    seriesId: record.seriesId,
    seriesName: record.seriesName,
    waveId: normalizeWaveId(record.targetWave),
    targetConsumer: record.targetConsumer,
    seriesRole: inferSeriesRole(record),
    relatedCategories: record.categories,
    targetSkuCount: record.skuTarget,
    heroStyleCount: inferHeroStyleCount(record),
    costBand: record.targetCostBand ? `¥${record.targetCostBand.replace(/[¥]/g, '')}` : '待确认',
    targetPriceBand: record.priceBand,
    mainChannels: inferMainChannels(record),
    colorPalette: record.colorDirections,
    designKeywords: record.designLanguages,
    benchmarkBrands: record.benchmarkReferences,
    decisionStatus: inferDecisionStatus(record),
    decisionReason: inferDecisionReason(record),
    recommendedAction: inferRecommendedAction(record),
  }));
}

export function deriveSeriesRoleMatrix(strategies: ThemeStrategyRecord[]): SeriesRoleMatrixRow[] {
  return sortByWaveAndRole(strategies).map((record) => {
    const seriesRole = inferSeriesRole(record);

    return {
      seriesId: record.seriesId,
      seriesName: record.seriesName,
      waveId: normalizeWaveId(record.targetWave),
      seriesRole,
      businessTasks: inferBusinessTasks(seriesRole),
      targetConsumer: record.targetConsumer,
      mainScenario: inferMainScenario(record),
      mainPriceBand: record.priceBand,
      skuTarget: record.skuTarget,
      heroStyleCount: inferHeroStyleCount(record),
      keyShoeTypes: record.categories,
      designKeywords: record.designLanguages,
      mainChannels: inferMainChannels(record),
      currentDecision: inferRecommendedAction(record),
      decisionStatus: inferDecisionStatus(record),
    };
  });
}

export function deriveThemeResourceAllocations(strategies: ThemeStrategyRecord[]): ThemeSeriesResourceAllocation[] {
  return sortByWaveAndRole(strategies).map((record) => {
    const heroStyleCount = inferHeroStyleCount(record);
    const imageStyleCount = record.seriesRole === 'image' ? 1 : 0;
    const testStyleCount = record.seriesRole === 'traffic' ? Math.min(2, Math.max(1, record.skuTarget - heroStyleCount)) : record.reviewDecisionStatus === 'pending' ? 1 : 0;
    const coreStyleCount = Math.max(record.skuTarget - heroStyleCount - imageStyleCount - testStyleCount, 0);
    const newMoldCount = record.costDriftAlert ? 3 : record.seriesRole === 'hero' || record.seriesRole === 'image' ? 2 : 1;
    const sharedLastRate = record.lastDirections.length <= 1 ? 0.8 : Math.max(0.35, 1 / record.lastDirections.length);
    const sharedSoleRate = record.soleDirections.length <= 1 ? 0.8 : Math.max(0.25, 1 / record.soleDirections.length);
    const riskLevel = inferResourceRisk(record);

    return {
      waveId: normalizeWaveId(record.targetWave),
      seriesId: record.seriesId,
      seriesName: record.seriesName,
      targetSkuCount: record.skuTarget,
      heroStyleCount,
      coreStyleCount,
      testStyleCount,
      imageStyleCount,
      newMoldCount,
      sharedLastRate,
      sharedSoleRate,
      costBand: record.targetCostBand ? `¥${record.targetCostBand.replace(/[¥]/g, '')}` : '待确认',
      developmentPriority: riskLevel === 'high' || record.seriesRole === 'hero' || record.seriesRole === 'image' ? 'high' : record.seriesRole === 'traffic' ? 'low' : 'medium',
      otbConstraint: riskLevel === 'high'
        ? record.costDriftAlert ?? '成本或新模超出预算，需要业务决策'
        : `成本带 ${record.targetCostBand || '待确认'}，新模控制在 ${newMoldCount} 副内`,
      riskLevel,
      recommendedAction: inferRecommendedAction(record),
    };
  });
}

export function deriveDesignLanguageMatrix(strategies: ThemeStrategyRecord[]): DesignLanguageRow[] {
  return sortByWaveAndRole(strategies).map((record) => ({
    seriesId: record.seriesId,
    seriesName: record.seriesName,
    silhouette: `${record.themeDirection}；关键鞋型：${joinOrFallback(record.categories, '待定义')}`,
    lastType: joinOrFallback(record.lastDirections, '楦型方向待确认'),
    outsole: joinOrFallback(record.soleDirections, '底型方向待确认'),
    material: joinOrFallback(record.materialDirections, '材料方向待确认'),
    color: joinOrFallback(record.colorDirections, '色彩方向待确认'),
    craft: joinOrFallback(record.designLanguages, '设计语言待确认'),
    functionalHighlight: `${inferMainScenario(record)}；${record.designLanguages[0] ?? '以舒适和场景适配为核心'}`,
    forbidden: record.seriesRole === 'traffic'
      ? '避免过度商务化和高成本材料'
      : record.seriesRole === 'image'
        ? '避免只做户外符号堆叠，必须保留城市穿搭适配'
        : '避免装饰堆砌和与品牌 DNA 无关的孤立元素',
    benchmark: joinOrFallback(record.benchmarkReferences, '待补充竞品参照'),
    hasBrief: Boolean(record.heroAsset || record.latestAssets.length || record.reviewDecisionStatus === 'approved'),
    affectedSkuCount: record.skuTarget,
  }));
}

export function deriveThemeRiskDecisions(strategies: ThemeStrategyRecord[]): ThemeRiskDecisionItem[] {
  const risks: ThemeRiskDecisionItem[] = [];
  let index = 1;

  sortByWaveAndRole(strategies).forEach((record) => {
    const wave = normalizeWaveId(record.targetWave);

    if (record.costDriftAlert) {
      risks.push({
        riskId: `TR-DYN-${String(index++).padStart(3, '0')}`,
        riskObject: `${record.seriesName} 成本偏离`,
        riskType: 'cost_overrun',
        riskReason: record.costDriftAlert,
        affectedWave: wave,
        affectedSeries: record.seriesName,
        affectedStyleCount: record.skuTarget,
        expectedImpact: '毛利率、OTB 和上市节奏均可能受到影响',
        decisionNeeded: '材料降级、削减款数或申请成本豁免',
        recommendedAction: inferRecommendedAction(record),
        owner: record.owner ?? '设计负责人',
        dueDate: '2026-05-30',
        actionStatus: 'open',
      });
    }

    if (record.reviewDecisionStatus === 'pending') {
      risks.push({
        riskId: `TR-DYN-${String(index++).padStart(3, '0')}`,
        riskObject: `${record.seriesName} 方向未定案`,
        riskType: 'review_rejected',
        riskReason: '系列仍处于待评审状态，尚未形成可下发开发任务的方向判断',
        affectedWave: wave,
        affectedSeries: record.seriesName,
        affectedStyleCount: record.skuTarget,
        expectedImpact: '开发任务池无法冻结，可能挤压首版样品周期',
        decisionNeeded: '补齐方向板、价格带、材料和底楦判断后提交评审',
        recommendedAction: inferRecommendedAction(record),
        owner: record.owner ?? '设计负责人',
        dueDate: '2026-05-27',
        actionStatus: 'open',
      });
    }

    if (record.benchmarkReferences.length < 2) {
      risks.push({
        riskId: `TR-DYN-${String(index++).padStart(3, '0')}`,
        riskObject: `${record.seriesName} 竞品参照不足`,
        riskType: 'insufficient_benchmark',
        riskReason: '方向板缺少足够竞品和标杆拆解，难以判断设计差异是否成立',
        affectedWave: wave,
        affectedSeries: record.seriesName,
        affectedStyleCount: record.skuTarget,
        expectedImpact: '评审时容易回到主观审美判断，影响设计效率',
        decisionNeeded: '补充至少 2 个同价格带竞品和 1 个设计标杆',
        recommendedAction: '补充竞品拆解后再冻结材料、色彩和底型方向',
        owner: record.owner ?? '设计负责人',
        dueDate: '2026-05-26',
        actionStatus: record.reviewDecisionStatus === 'approved' ? 'in_progress' : 'open',
      });
    }
  });

  return risks.slice(0, 8);
}

// ── 工具函数：从 ThemeStrategyRecord[] 派生 WaveThemeBoardItem[] ─────────────

export function deriveWaveThemeBoardItems(strategies: ThemeStrategyRecord[]): WaveThemeBoardItem[] {
  const waveMap = new Map<string, ThemeStrategyRecord[]>();
  strategies.forEach((s) => {
    const wave = s.targetWave.toUpperCase();
    if (!waveMap.has(wave)) waveMap.set(wave, []);
    waveMap.get(wave)!.push(s);
  });

  return Array.from(waveMap.entries())
    .sort(([a], [b]) => {
      const ia = WAVE_ORDER.indexOf(a);
      const ib = WAVE_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return a.localeCompare(b);
    })
    .map(([waveId, records]) => {
      const targetStyleCount = records.reduce((s, r) => s + r.skuTarget, 0);
      const confirmedStyleCount = records.filter((r) => r.reviewDecisionStatus === 'approved').reduce((s, r) => s + r.skuTarget, 0);
      const statusDistribution = {
        approved: records.filter((r) => r.reviewDecisionStatus === 'approved').length,
        in_progress: records.filter((r) => r.reviewDecisionStatus === 'in_progress').length,
        pending: records.filter((r) => r.reviewDecisionStatus === 'pending').length,
      };
      const hasCostAlert = records.some((r) => !!r.costDriftAlert);
      const hasInProgress = records.some((r) => r.reviewDecisionStatus === 'in_progress');

      // Cost progress calculation
      let totalQuote = 0;
      let totalTarget = 0;
      let counted = 0;
      records.forEach((r) => {
        if (r.quotedCostAverage && r.targetCostBand) {
          const parts = r.targetCostBand.replace(/[¥,]/g, '').split('-');
          const maxTarget = parts.length > 1 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
          if (!isNaN(maxTarget) && !isNaN(r.quotedCostAverage)) {
            totalQuote += r.quotedCostAverage;
            totalTarget += maxTarget;
            counted++;
          }
        }
      });
      const costProgress = counted > 0 && totalTarget > 0 ? Math.round((totalQuote / totalTarget) * 100) : 0;

      const themeHealth: WaveThemeBoardItem['themeHealth'] = hasCostAlert
        ? 'warning'
        : statusDistribution.approved === records.length
          ? 'healthy'
          : hasInProgress
            ? 'warning'
            : 'healthy';

      const heroSeries = records
        .filter((record) => record.seriesRole === 'hero' || record.seriesRole === 'image')
        .map((record) => record.seriesName)
        .slice(0, 3);
      const pendingNames = records.filter((record) => record.reviewDecisionStatus === 'pending').map((record) => record.seriesName);
      const costAlertNames = records.filter((record) => record.costDriftAlert).map((record) => record.seriesName);

      return {
        waveId,
        waveName: `${waveId} 波段`,
        waveRole: waveId === 'W1' ? '核心主推盘' : waveId === 'W2' ? '延续补充盘' : '季末收尾盘',
        includedSeriesCount: records.length,
        targetStyleCount,
        confirmedStyleCount,
        costProgress,
        costBudget: totalTarget > 0 ? Math.round(totalTarget / Math.max(counted, 1)) : 0,
        statusDistribution,
        launchDate: WAVE_LAUNCH_DATES[waveId] ?? '待定',
        themeHealth,
        riskLevel: hasCostAlert ? 'high' : hasInProgress ? 'medium' : 'low',
        recommendedAction: hasCostAlert
          ? '存在成本超标，本周内完成决策'
          : statusDistribution.pending > 0
            ? `${statusDistribution.pending} 个系列待评审`
            : '波段状态健康，按计划推进',
        waveGoal: `${waveId} 承接 ${records.map((record) => record.seriesName).join(' / ')}，锁定 ${targetStyleCount} 款的主题表达、价格带和开发约束`,
        heroSeries: heroSeries.length ? heroSeries : records.slice(0, 2).map((record) => record.seriesName),
        mainPriceBand: summarizePriceBand(records),
        keyDeliverable: waveId === 'W1'
          ? `${records[0]?.seriesName ?? waveId} Hero 款首版打样（截止 6/30）`
          : `${records[0]?.seriesName ?? waveId} 方向板与成本决策（截止 5/30）`,
        weeklyAction: hasCostAlert
          ? `${costAlertNames.join('、')} 成本偏离：本周完成削减 OR 豁免决策`
          : statusDistribution.pending > 0
            ? `推进 ${pendingNames.join('、')} 进入评审`
            : '本周正常推进打样和方向板确认',
      };
    });
}

// ── 7. 系列角色矩阵 ──────────────────────────────────────────────────────────

export const SERIES_ROLE_MATRIX: SeriesRoleMatrixRow[] = [
  {
    seriesId: 'S-CORE',
    seriesName: 'Core Craft',
    waveId: 'W1',
    seriesRole: 'hero',
    businessTasks: ['volume', 'margin'],
    targetConsumer: '28-38 岁都市精工男性',
    mainScenario: '日常通勤 / 商务休闲',
    mainPriceBand: '¥699-799',
    skuTarget: 8,
    heroStyleCount: 2,
    keyShoeTypes: ['健步鞋', '乐福鞋'],
    designKeywords: ['精工细节', '宽楦舒适', '质朴配色'],
    mainChannels: ['门店主推', '电商旗舰'],
    currentDecision: '按计划推进，优先确认宽楦 Hero 款打样',
    decisionStatus: 'recommend_proceed',
  },
  {
    seriesId: 'S-OUTDOOR',
    seriesName: 'Trail Lite',
    waveId: 'W2',
    seriesRole: 'image',
    businessTasks: ['brand_image', 'acquisition'],
    targetConsumer: '28-40 岁轻户外爱好者',
    mainScenario: '周末轻户外 / 城市穿搭兼顾',
    mainPriceBand: '¥1,099-1,299',
    skuTarget: 6,
    heroStyleCount: 1,
    keyShoeTypes: ['轻户外徒步', '防水休闲'],
    designKeywords: ['山系廓形', '防护机能', '城市适配'],
    mainChannels: ['专业户外渠道', '电商种草'],
    currentDecision: '成本超标 16%，本周必须决策：削减 2 款 OR 申请豁免',
    decisionStatus: 'needs_adjustment',
  },
  {
    seriesId: 'S-URBAN',
    seriesName: 'Urban Walk',
    waveId: 'W1',
    seriesRole: 'profit',
    businessTasks: ['volume', 'margin'],
    targetConsumer: '25-35 岁都市通勤男性',
    mainScenario: '日常通勤 / 轻量日常',
    mainPriceBand: '¥799-899',
    skuTarget: 5,
    heroStyleCount: 1,
    keyShoeTypes: ['都市通勤鞋', '轻量休闲鞋'],
    designKeywords: ['轻量感', '通勤美学', '功能缓震'],
    mainChannels: ['门店', '电商旗舰', '企业采购'],
    currentDecision: '供应链已确认，可提交首版 BOM',
    decisionStatus: 'recommend_proceed',
  },
  {
    seriesId: 'S-SPORT',
    seriesName: 'Sport Light',
    waveId: 'W2',
    seriesRole: 'traffic',
    businessTasks: ['acquisition', 'test_market'],
    targetConsumer: '22-30 岁运动休闲青年',
    mainScenario: '轻量运动 / 日常休闲',
    mainPriceBand: '¥499-599',
    skuTarget: 3,
    heroStyleCount: 1,
    keyShoeTypes: ['休闲运动鞋', '轻量跑鞋'],
    designKeywords: ['轻量科技感', '年轻撞色', '运动潮流'],
    mainChannels: ['电商主推', '快闪渠道'],
    currentDecision: '小批量 3 款先行，6 月中评估是否扩款',
    decisionStatus: 'small_batch',
  },
  {
    seriesId: 'S-FORMAL',
    seriesName: 'Business Classic',
    waveId: 'W2',
    seriesRole: 'base',
    businessTasks: ['margin', 'channel_exclusive'],
    targetConsumer: '30-45 岁商务男性',
    mainScenario: '正式商务场合',
    mainPriceBand: '¥1,199-1,499',
    skuTarget: 5,
    heroStyleCount: 1,
    keyShoeTypes: ['正装皮鞋', '商务休闲'],
    designKeywords: ['植鞣皮', '经典楦型', '当代正装'],
    mainChannels: ['门店精品区', '企业大客户'],
    currentDecision: 'BOM 已锁，可进入 Salesman Sample Gate',
    decisionStatus: 'recommend_proceed',
  },
];

// ── 8. 设计语言拆解矩阵 ──────────────────────────────────────────────────────

export const DESIGN_LANGUAGE_MATRIX: DesignLanguageRow[] = [
  {
    seriesId: 'S-CORE',
    seriesName: 'Core Craft',
    silhouette: '低帮圆头，中等鞋面高度，轮廓简洁不夸张',
    lastType: '宽楦（D/E宽），前掌宽容，后跟包裹稳固',
    outsole: '轻量橡胶大底，自然纹理防滑，鞋跟高差 12-15mm',
    material: '全粒面牛皮主材，里布透气网布，加固跟部',
    color: '低饱和主色（驼/米白/炭灰），点缀色控制在 10% 以内',
    craft: '可见缝线工艺（Golf welt 或 Blake），帮面简洁无装饰件堆砌',
    functionalHighlight: '宽楦全天穿着舒适，防滑橡胶底适合城市地面',
    forbidden: '禁止使用反光材料、大面积织带装饰、夸张鞋舌或侧标',
    benchmark: 'Clarks Desert Boot / Paraboot Michael',
    hasBrief: true,
    affectedSkuCount: 8,
  },
  {
    seriesId: 'S-OUTDOOR',
    seriesName: 'Trail Lite',
    silhouette: '中帮为主，底型体量感强，侧边防护包裹明显',
    lastType: '标准楦（B/D宽），前掌留余量，后跟稳固包裹',
    outsole: '户外橡胶大底，高抓地纹路，防水处理，鞋跟高差 20-25mm',
    material: '防水尼龙 + 磨砂皮拼接，Gore-Tex 内衬（或替代防水膜）',
    color: '大地色系（橄榄绿/沙色/炭灰蓝），允许 1-2 款高辨识度撞色',
    craft: '外缝线强调结构，保留功能细节（系带孔、包边），避免过度时装化',
    functionalHighlight: '防水防泥，轻量化底型，城市户外两用穿着',
    forbidden: '禁止使用内增高、过高鞋跟、纯装饰性外包边',
    benchmark: 'Salomon XT-6 / New Balance 1906 城市版',
    hasBrief: false,
    affectedSkuCount: 6,
  },
  {
    seriesId: 'S-URBAN',
    seriesName: 'Urban Walk',
    silhouette: '低帮，体量轻薄，轮廓精简，适合快步行走',
    lastType: '中等楦型，前掌略宽，舒适感优先',
    outsole: '轻量 EVA 中底 + 橡胶外底，鞋跟高差 10-12mm，全天缓震',
    material: '磨砂皮或帆布主材，轻量里布，底边缘处理简洁',
    color: '黑/米白/深灰三色为主，允许季节性点缀（如橄榄/焦糖）',
    craft: '帮面流线处理，避免过多拼接，鞋舌薄且贴合',
    functionalHighlight: '轻量通勤，全天舒适，多场景穿着兼容性强',
    forbidden: '禁止过厚鞋底、过多外接部件、装饰性拉链',
    benchmark: 'Cole Haan ZeroGrand / Ecco Soft 7',
    hasBrief: true,
    affectedSkuCount: 5,
  },
  {
    seriesId: 'S-SPORT',
    seriesName: 'Sport Light',
    silhouette: '低帮流线型，运动感轮廓，前掌微翘',
    lastType: '运动楦型，偏窄，前掌弧度较大',
    outsole: '轻量 EVA 大底，运动纹路，重量控制在 260g 以内',
    material: '工程网布 + 少量 TPU 覆盖件，里布轻量',
    color: '科技白为主，搭配 1 款高饱和撞色（橙/蓝），保持年轻感',
    craft: '热压成型，减少缝线，TPU 覆盖件做结构补强',
    functionalHighlight: '超轻量，弹性回弹好，适合日常运动通勤',
    forbidden: '禁止厚重底型，禁止全皮帮面，避免商务感设计语言',
    benchmark: 'Li-Ning 弦 / New Balance FuelCell',
    hasBrief: false,
    affectedSkuCount: 3,
  },
  {
    seriesId: 'S-FORMAL',
    seriesName: 'Business Classic',
    silhouette: '低帮经典正装廓形，楦头圆润，鞋面高度适中',
    lastType: '经典商务楦，前掌标准，后跟修长',
    outsole: '皮革大底 + 橡胶前掌防滑贴，鞋跟高差 15-18mm（含跟型）',
    material: '植鞣牛皮（主）+ 光面牛皮（饰边），羊皮内里',
    color: '经典黑 / 深棕 / 咖棕，三色为主，无花纹或极简压纹',
    craft: 'Goodyear Welt 缝合或 Blake Rapid，可修底，细节针脚均匀',
    functionalHighlight: '可修复底型，耐用植鞣皮随时间形成使用痕迹，适合商务场合',
    forbidden: '禁止运动底，禁止亮色搭配，禁止橡胶全底（保留修底传统）',
    benchmark: 'Allen Edmonds Park Avenue / Crockett & Jones Connaught',
    hasBrief: true,
    affectedSkuCount: 5,
  },
];

// ── 本季主题宣言横幅数据 ──────────────────────────────────────────────────────

export const SEASON_THEME_BANNER: SeasonThemeBanner = {
  themeName: '精工质朴 · 城市机能',
  conceptStatement: '用城市作为新的自然，把功能穿进日常',
  brandTag: 'Brand · 2026 S/S',
  seasonTag: 'W1–W2 · 本季总览',
  trendCascade: {
    macroTrends: ['极简机能', '复古户外', '可持续材料'],
    brandInterpretation: '用精工质朴重新定义城市功能美学',
    seriesDirections: [
      { seriesName: '精工经典', trendBasis: '复古户外 · 手工匠艺' },
      { seriesName: '轻量机能', trendBasis: '极简机能 · 轻量运动' },
      { seriesName: '城市漫步', trendBasis: '城市步行 · 休闲通勤' },
      { seriesName: '运动光谱', trendBasis: '极简机能 · 功能导向' },
      { seriesName: '商务经典', trendBasis: '经典正装 · 都市精英' },
    ],
  },
};

// ── 跨系列色彩分配矩阵 ────────────────────────────────────────────────────────

export const CROSS_SERIES_COLOR_ALLOCATION: ColorAllocationItem[] = [
  {
    colorName: '经典黑',
    hex: '#1A1A2E',
    role: 'primary',
    isNew: false,
    seriesOwnership: [
      { seriesName: '精工经典', allocation: 'shared', colorRole: 'primary' },
      { seriesName: '轻量机能', allocation: 'shared', colorRole: 'secondary' },
      { seriesName: '城市漫步', allocation: 'shared', colorRole: 'primary' },
      { seriesName: '运动光谱', allocation: 'exclusive', colorRole: 'primary' },
      { seriesName: '商务经典', allocation: 'shared', colorRole: 'primary' },
    ],
  },
  {
    colorName: '质朴米白',
    hex: '#EFE8D6',
    role: 'primary',
    isNew: false,
    seriesOwnership: [
      { seriesName: '精工经典', allocation: 'shared', colorRole: 'primary' },
      { seriesName: '轻量机能', allocation: 'shared', colorRole: 'accent' },
      { seriesName: '城市漫步', allocation: 'shared', colorRole: 'secondary' },
      { seriesName: '运动光谱', allocation: 'none', colorRole: 'accent' },
      { seriesName: '商务经典', allocation: 'shared', colorRole: 'secondary' },
    ],
  },
  {
    colorName: '城市岩灰',
    hex: '#78716C',
    role: 'secondary',
    isNew: false,
    seriesOwnership: [
      { seriesName: '精工经典', allocation: 'shared', colorRole: 'secondary' },
      { seriesName: '轻量机能', allocation: 'shared', colorRole: 'primary' },
      { seriesName: '城市漫步', allocation: 'shared', colorRole: 'primary' },
      { seriesName: '运动光谱', allocation: 'shared', colorRole: 'secondary' },
      { seriesName: '商务经典', allocation: 'shared', colorRole: 'secondary' },
    ],
  },
  {
    colorName: '深植鞣棕',
    hex: '#7C4A2D',
    role: 'primary',
    isNew: false,
    seriesOwnership: [
      { seriesName: '精工经典', allocation: 'exclusive', colorRole: 'primary' },
      { seriesName: '轻量机能', allocation: 'none', colorRole: 'accent' },
      { seriesName: '城市漫步', allocation: 'none', colorRole: 'accent' },
      { seriesName: '运动光谱', allocation: 'none', colorRole: 'accent' },
      { seriesName: '商务经典', allocation: 'shared', colorRole: 'accent' },
    ],
  },
  {
    colorName: '轻量氧化绿',
    hex: '#556B2F',
    role: 'accent',
    isNew: true,
    seriesOwnership: [
      { seriesName: '精工经典', allocation: 'none', colorRole: 'accent' },
      { seriesName: '轻量机能', allocation: 'exclusive', colorRole: 'accent' },
      { seriesName: '城市漫步', allocation: 'shared', colorRole: 'accent' },
      { seriesName: '运动光谱', allocation: 'none', colorRole: 'accent' },
      { seriesName: '商务经典', allocation: 'none', colorRole: 'accent' },
    ],
  },
  {
    colorName: '功能橙红',
    hex: '#C2410C',
    role: 'accent',
    isNew: true,
    seriesOwnership: [
      { seriesName: '精工经典', allocation: 'none', colorRole: 'accent' },
      { seriesName: '轻量机能', allocation: 'shared', colorRole: 'accent' },
      { seriesName: '城市漫步', allocation: 'none', colorRole: 'accent' },
      { seriesName: '运动光谱', allocation: 'exclusive', colorRole: 'accent' },
      { seriesName: '商务经典', allocation: 'none', colorRole: 'accent' },
    ],
  },
  {
    colorName: '驼色暖沙',
    hex: '#C19A6B',
    role: 'secondary',
    isNew: false,
    seriesOwnership: [
      { seriesName: '精工经典', allocation: 'shared', colorRole: 'secondary' },
      { seriesName: '轻量机能', allocation: 'none', colorRole: 'accent' },
      { seriesName: '城市漫步', allocation: 'shared', colorRole: 'secondary' },
      { seriesName: '运动光谱', allocation: 'none', colorRole: 'accent' },
      { seriesName: '商务经典', allocation: 'exclusive', colorRole: 'primary' },
    ],
  },
];

