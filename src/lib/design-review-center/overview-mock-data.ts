/**
 * 设计企划总控工作台 — 模拟数据
 * 为新增模块提供结构化样本数据，真实数据接入后替换即可。
 */
import type {
  DesignPlanningExecutiveSummary,
  MerchandiseInputAlignment,
  SeasonDesignStrategy,
  DesignPlanningWorkflowNode,
  DesignRiskBlocker,
  WeeklyDecisionItem,
  ThreeTrackSummaryData,
  DesignPlanningRelatedModuleLink,
  DesignReviewOverview,
  PlanningExecutiveSummaryCards,
  DesignPlanningOverallStatus,
  BusinessInputTargets,
  SkuArchitectureRow,
  EngineeringFeasibilityData,
  EngineeringItemStatus,
  EngineeringOutsolePlatform,
  CostMarginRow,
  SeriesAggregate,
  TrendDirectionSnapshot,
  NewCarryoverSummary,
  ProtoStatus,
  MaterialStrategySnapshot,
  OTBConfirmationStatus,
} from './types';

/** 从 overview 推导执行摘要 */
export function deriveExecutiveSummary(
  overview: DesignReviewOverview,
): DesignPlanningExecutiveSummary {
  const arch = overview.architectureSummary;
  const highRisk = overview.highRiskStyles;
  const delayed = overview.delayedGateCount;
  const bomRate = overview.bomLockRate;
  const leadRate = overview.leadLockRate;

  let overallStatus: DesignPlanningExecutiveSummary['overallStatus'];
  if (highRisk > 3 || delayed > 2 || bomRate < 0.4) {
    overallStatus = 'high_risk';
  } else if (highRisk > 0 || delayed > 0 || leadRate < 0.5) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'healthy';
  }

  const riskParts: string[] = [];
  if (arch && arch.sharedOutsoleRate < 0.4 && arch.sharedLastRate < 0.4) {
    riskParts.push('共底共楦效率低');
  }
  if (arch && arch.newToolingRate > 0.3) riskParts.push('新模过多');
  if (leadRate < 0.15) riskParts.push('主推覆盖不足');
  if (delayed > 0) riskParts.push(`${delayed} 个 Gate 延期`);
  if (highRisk > 0) riskParts.push(`${highRisk} 款高风险`);
  const biggestRisk =
    riskParts.length > 0 ? riskParts.join('、') : '当前无显著风险';

  const oppParts: string[] = [];
  if (bomRate > 0.7) oppParts.push('BOM锁定率良好，可提前锁价');
  if (arch && arch.sharedOutsoleRate > 0.6) oppParts.push('共底率高，可压缩成本');
  if (leadRate > 0.7) oppParts.push('主推款覆盖充分，可加推资源');
  const biggestOpportunity = oppParts.length > 0 ? oppParts[0] : '提升共底共楦率可有效降本';

  const merchandiseInputStatus: DesignPlanningExecutiveSummary['merchandiseInputStatus'] =
    overview.totalStyles > 0 ? 'partial' : 'unassigned';

  const impactWave =
    delayed > 0 ? `AW-4 波段存在延期风险` : '当前波段上市节奏可控';

  const suggestedParts: string[] = [];
  if (arch && arch.newToolingRate > 0.3) suggestedParts.push('减少新开底立项');
  if (leadRate < 0.15) suggestedParts.push('补齐主推款覆盖');
  if (bomRate < 0.5) suggestedParts.push('优先推进 BOM 材料锁价');
  const suggestedAction =
    suggestedParts.length > 0 ? suggestedParts.join('，') + '。' : '持续跟进高风险款进展。';

  return {
    overallStatus,
    biggestRisk,
    biggestOpportunity,
    mustDecideCount: overview.mustDecide.length,
    merchandiseInputStatus,
    waveImpact: impactWave,
    suggestedAction,
  };
}

/** 从 overview 推导三轨摘要 */
export function deriveThreeTrackSummary(
  overview: DesignReviewOverview,
): ThreeTrackSummaryData {
  const [pendingStr, highRiskStr] = overview.designTrackSummary.match(/\d+/g) ?? ['0', '0'];
  const [overTargetStr, unlockedBomStr] = overview.costTrackSummary.match(/\d+/g) ?? ['0', '0'];
  const [delayedGateStr, techRiskStr] = overview.developmentTrackSummary.match(/\d+/g) ?? ['0', '0'];

  return {
    design: {
      pendingReviewCount: Number(pendingStr),
      highRiskStyleCount: Number(highRiskStr),
      directionDeviationCount: Math.max(0, overview.highRiskStyles - Number(highRiskStr)),
      mustDecideCount: overview.mustDecide.length,
    },
    cost: {
      overTargetCount: Number(overTargetStr),
      unlockedBomCount: Number(unlockedBomStr),
      marginRiskCount: Math.round(overview.totalStyles * 0.08),
      costReviewCount: Math.round(overview.totalStyles * 0.12),
    },
    development: {
      delayedGateCount: Number(delayedGateStr),
      delayedSampleCount: Math.round(overview.totalStyles * (1 - overview.sampleCompletionRate) * 0.3),
      technicalRiskCount: Number(techRiskStr),
      readyToLaunchSkuCount: overview.lockedStyles,
    },
  };
}

/** 商品企划输入承接 — 静态样本 */
export const MERCHANDISE_INPUT_ALIGNMENTS: MerchandiseInputAlignment[] = [
  {
    id: 'mia-brand',
    sourceModule: '品牌定位',
    inputType: '设计语言 / DNA 关键词',
    inputSummary: '精工感、轻量化、都市功能，不做无功能的装饰性设计',
    alignmentStatus: 'aligned',
    generatedTaskCount: 6,
    unassignedInputCount: 0,
    deviationRisk: 'none',
    recommendedAction: '查看输入',
    relatedRoute: '/dashboard?tab=brand-positioning',
  },
  {
    id: 'mia-consumer',
    sourceModule: '消费者画像',
    inputType: '目标人群 / 使用场景',
    inputSummary: '25-35岁都市通勤男性，追求舒适不失型格，场景覆盖通勤+轻运动',
    alignmentStatus: 'partial',
    generatedTaskCount: 4,
    unassignedInputCount: 2,
    deviationRisk: 'medium',
    recommendedAction: '生成设计任务',
    relatedRoute: '/dashboard?tab=consumer-profiling',
  },
  {
    id: 'mia-trend',
    sourceModule: '竞品 & 趋势',
    inputType: '趋势方向 / 竞品空白',
    inputSummary: '宽楦舒适鞋型上升，竞品低覆盖宽楦健步品类，可建立差异化',
    alignmentStatus: 'partial',
    generatedTaskCount: 3,
    unassignedInputCount: 3,
    deviationRisk: 'medium',
    recommendedAction: '校准设计方向',
    relatedRoute: '/dashboard?tab=competitor',
  },
  {
    id: 'mia-category',
    sourceModule: '品类运营',
    inputType: '品类结构 / 目标款数',
    inputSummary: '休闲运动鞋 60% / 功能户外 25% / 正装商务 15%，合计 48 款',
    alignmentStatus: 'aligned',
    generatedTaskCount: 8,
    unassignedInputCount: 0,
    deviationRisk: 'low',
    recommendedAction: '查看输入',
    relatedRoute: '/dashboard?tab=category-ops',
  },
  {
    id: 'mia-wave',
    sourceModule: '波段企划',
    inputType: '波段节奏 / 上市时间',
    inputSummary: 'AW-1 至 AW-5，共 5 个波段，首波 9 月上市',
    alignmentStatus: 'partial',
    generatedTaskCount: 5,
    unassignedInputCount: 4,
    deviationRisk: 'high',
    recommendedAction: '跳转商品企划',
    relatedRoute: '/dashboard?tab=wave-planning',
  },
  {
    id: 'mia-otb',
    sourceModule: 'OTB 预算',
    inputType: '开发预算 / SKU 限额',
    inputSummary: '总预算 ¥420W，单款目标成本 ≤¥380，各品类有独立 SKU 上限',
    alignmentStatus: 'deviated',
    generatedTaskCount: 2,
    unassignedInputCount: 5,
    deviationRisk: 'high',
    recommendedAction: '查看 OTB 限制',
    relatedRoute: '/dashboard?tab=otb',
  },
];

/** 本季设计策略 — 从系列数据推导的样本 */
export function buildSeasonDesignStrategies(
  themeStrategies: Array<{
    seriesId: string;
    seriesName: string;
    themeDirection: string;
    targetConsumer: string;
    usageScenarios: string[];
    designLanguages: string[];
    materialDirections: string[];
    colorDirections: string[];
    soleDirections: string[];
    lastDirections: string[];
    categories: string[];
  }>,
  skuRows: SkuArchitectureRow[] = [],
  businessTargets?: BusinessInputTargets,
): SeasonDesignStrategy[] {
  if (themeStrategies.length === 0) return FALLBACK_SEASON_STRATEGIES;
  const primaryChannels = (businessTargets?.channels ?? BUSINESS_INPUT_TARGETS.channels)
    .filter((channel) => channel.priority === 'primary')
    .map((channel) => channel.name);

  return themeStrategies.slice(0, 4).map((s) => {
    const skuRow = skuRows.find((row) => row.seriesId === s.seriesId || row.seriesName === s.seriesName);
    // 按系列 ID 映射趋势标签（轻量映射）
    const SERIES_TREND_TAGS: Record<string, string[]> = {
      'S-CORE':    ['城市机能', '精工质朴'],
      'S-OUTDOOR': ['自然质朴', '科技布料'],
      'S-URBAN':   ['轻量运动', '复古简约'],
      'S-SPORT':   ['轻量运动', '城市机能'],
      'S-FORMAL':  ['精工质朴', '经典商务'],
    };
    const SERIES_COMPETITOR_DIFF: Record<string, string> = {
      'S-CORE':    '宽楦舒适 + 精工细节，对标 Clarks 高价位段但 FOB 更优',
      'S-OUTDOOR': '轻量防护一体化，差异于重功能户外品牌的都市化表达',
      'S-URBAN':   '通勤美学融合功能缓震，区别于同价位纯时尚品牌',
      'S-SPORT':   '轻量科技感配色，性价比高于竞品同类 SKU 约 15%',
      'S-FORMAL':  '植鞣皮 + 当代楦型，对标轻奢正装但价格亲民',
    };
    return {
      seriesId: s.seriesId,
      seasonTheme: s.seriesName,
      designKeywords: s.designLanguages.slice(0, 4),
      coreSeries: [s.seriesName],
      heroStyles: s.categories.slice(0, 3).map((c) => `${c}主推款`),
      mainShoeTypes: s.lastDirections.slice(0, 3),
      colorStory: s.colorDirections.slice(0, 3).join(' / ') || '自然色系',
      materialDirection: s.materialDirections.slice(0, 2).join(' + ') || '头层牛皮 + 再生环保材料',
      functionBenefits: ['轻量化', '透气缓震', '防滑耐磨'],
      targetConsumer: s.targetConsumer,
      scenario: s.usageScenarios.slice(0, 2).join(' / ') || '通勤 / 休闲',
      designBoundary: '不做纯装饰性元素，功能与美学必须统一',
      dontRules: ['禁用亮片、铆钉等明显装饰配件', '避免超薄底台（< 8mm）', '禁止无功能性凑款'],
      riskNote: s.designLanguages.length < 2 ? '设计方向较模糊，建议补充关键词' : undefined,
      priceBand: skuRow?.priceBand,
      channels: primaryChannels,
      trendTags: SERIES_TREND_TAGS[s.seriesId] ?? [],
      competitorDiff: SERIES_COMPETITOR_DIFF[s.seriesId],
      strategyBasis: '消费者调研 + 销售数据回顾',
    };
  });
}

const FALLBACK_SEASON_STRATEGIES: SeasonDesignStrategy[] = [
  {
    seriesId: 'S-CORE',
    seasonTheme: '精工轻量 · 都市通勤',
    designKeywords: ['精工', '轻量', '功能', '当代感'],
    coreSeries: ['Core Craft', 'Urban Walk'],
    heroStyles: ['宽楦健步鞋', '精工乐福', '轻量运动'],
    mainShoeTypes: ['宽楦健步', '乐福', '工装休闲'],
    colorStory: '黑 / 米 / 驼 · 机会色：橄榄绿',
    materialDirection: '头层牛皮 + TPU 轻量中底',
    functionBenefits: ['轻量化 < 400g', '回弹缓震', '宽楦舒适'],
    targetConsumer: '25-35 岁都市男性，通勤 + 休闲场景',
    scenario: '每日通勤 / 商务休闲 / 轻量户外',
    designBoundary: '功能与美学统一，避免纯装饰性设计',
    dontRules: [
      '禁用亮片、铆钉等明显装饰',
      '避免超薄底台（< 8mm）',
      '不做无差异凑款',
    ],
  },
  {
    seriesId: 'S-OUTDOOR',
    seasonTheme: '功能防护 · 轻户外',
    designKeywords: ['防护', '耐磨', '自然', '轻量'],
    coreSeries: ['Trail Lite', 'Outdoor Pro'],
    heroStyles: ['轻户外徒步鞋', '防水休闲鞋'],
    mainShoeTypes: ['轻户外徒步', '防水低帮'],
    colorStory: '橄榄绿 / 沙色 / 炭灰',
    materialDirection: '防水尼龙 + 橡胶大底',
    functionBenefits: ['防水 IPX4', '防滑耐磨大底', '快干内里'],
    targetConsumer: '28-40 岁轻户外爱好者',
    scenario: '周末轻徒步 / 城市户外',
    designBoundary: '户外功能为主，保持简洁廓形',
    dontRules: ['不做过度科技感外观', '避免大 LOGO 堆砌'],
  },
];

/** 设计企划流程节点（10 步 Gate 流程） */
export const DESIGN_PLANNING_WORKFLOW_NODES: DesignPlanningWorkflowNode[] = [
  {
    nodeId: 'wf-business-input',
    nodeName: '业务输入确认',
    completionRate: 1.0,
    blockedCount: 0,
    riskLevel: 'none',
    owner: '商品企划',
    dueDate: '2026-02-28',
    status: 'completed',
    relatedRoute: '/design-review-center?tab=overview',
  },
  {
    nodeId: 'wf-trend',
    nodeName: '趋势与消费者',
    completionRate: 1.0,
    blockedCount: 0,
    riskLevel: 'none',
    owner: '设计企划',
    dueDate: '2026-03-15',
    status: 'completed',
    relatedRoute: '/design-review-center?tab=themeStrategy',
  },
  {
    nodeId: 'wf-arch',
    nodeName: '产品线架构',
    completionRate: 0.95,
    blockedCount: 0,
    riskLevel: 'none',
    owner: '商品企划',
    dueDate: '2026-04-01',
    status: 'completed',
    relatedRoute: '/design-review-center?tab=productArchitecture',
  },
  {
    nodeId: 'wf-brief',
    nodeName: '设计 Brief',
    completionRate: 0.75,
    blockedCount: 1,
    riskLevel: 'low',
    owner: '设计总监',
    dueDate: '2026-04-30',
    status: 'in_progress',
    relatedRoute: '/design-review-center?tab=themeStrategy',
  },
  {
    nodeId: 'wf-draft',
    nodeName: '初稿评审',
    completionRate: 0.55,
    blockedCount: 2,
    riskLevel: 'medium',
    owner: '设计总监',
    dueDate: '2026-05-20',
    status: 'in_progress',
    relatedRoute: '/design-review-center?tab=reviewDecisionCenter',
  },
  {
    nodeId: 'wf-material',
    nodeName: '材料/底台确认',
    completionRate: 0.35,
    blockedCount: 4,
    riskLevel: 'high',
    owner: '材料经理',
    dueDate: '2026-06-10',
    status: 'at_risk',
    relatedRoute: '/design-review-center?tab=developmentTaskPool',
  },
  {
    nodeId: 'wf-sample',
    nodeName: '样品开发',
    completionRate: 0.2,
    blockedCount: 3,
    riskLevel: 'high',
    owner: '开发工程师',
    dueDate: '2026-07-01',
    status: 'at_risk',
    relatedRoute: '/design-review-center?tab=developmentTaskPool',
  },
  {
    nodeId: 'wf-fitting',
    nodeName: '试穿与测试',
    completionRate: 0,
    blockedCount: 0,
    riskLevel: 'none',
    owner: '开发工程师',
    dueDate: '2026-07-20',
    status: 'not_started',
    relatedRoute: '/design-review-center?tab=developmentGateTable',
  },
  {
    nodeId: 'wf-cost',
    nodeName: '成本复盘',
    completionRate: 0,
    blockedCount: 0,
    riskLevel: 'none',
    owner: '开发主管',
    dueDate: '2026-08-01',
    status: 'not_started',
    relatedRoute: '/design-review-center?tab=developmentGateTable',
  },
  {
    nodeId: 'wf-launch',
    nodeName: '上市交付',
    completionRate: 0,
    blockedCount: 0,
    riskLevel: 'none',
    owner: '运营团队',
    dueDate: '2026-09-01',
    status: 'not_started',
    relatedRoute: '/design-review-center',
  },
];

/** 关键风险与阻塞 */
export const DESIGN_RISK_BLOCKERS: DesignRiskBlocker[] = [
  {
    riskId: 'risk-001',
    riskType: 'new_mold_excess',
    riskObject: '运动休闲品类整体',
    riskReason: '本季新开底台已达 8 款，超出 6 款阈值，成本压力上升',
    affectedWave: 'AW-3 / AW-4',
    expectedImpact: '单款模具费用增加约 ¥3-5W，影响毛利 2-3%',
    owner: '产品部',
    dueDate: '2026-06-01',
    recommendedAction: '减少 2 款新开底，优先复用现有平台底台',
    actionStatus: 'open',
  },
  {
    riskId: 'risk-002',
    riskType: 'hero_style_low',
    riskObject: '主推款 CF-001 / CF-002',
    riskReason: '2 款主推款设计方向未锁定，BOM 未完成，影响资源集中',
    affectedWave: 'AW-2',
    affectedStyle: 'CF-001, CF-002',
    affectedLaunchDate: '2026-08-15',
    expectedImpact: '主推款可能延期进入节点评审，影响首波资源投放',
    owner: '设计总监',
    dueDate: '2026-05-28',
    recommendedAction: '本周召开主推款方向评审，锁定 CF-001-BLK 材料',
    actionStatus: 'open',
  },
  {
    riskId: 'risk-003',
    riskType: 'bom_unlocked',
    riskObject: 'CF-001-BLK / TL-003-OLV 材料',
    riskReason: '两款主力 SKU 面料供应商未确认，BOM 无法锁定',
    affectedWave: 'AW-2',
    expectedImpact: '延迟 BOM 锁定将影响核价和工厂排期',
    owner: '材料经理',
    dueDate: '2026-05-30',
    recommendedAction: '优先确认 CF-001-BLK 面料供应商，启动备选方案',
    actionStatus: 'in_progress',
  },
  {
    riskId: 'risk-004',
    riskType: 'sample_delay',
    riskObject: '户外系列头版样品',
    riskReason: '工厂档期紧张，户外系列头版延期 10 天',
    affectedWave: 'AW-3',
    expectedImpact: '若样品无法按期完成，Gate 评审可能顺延，影响 AW-3 上市',
    owner: '开发工程师',
    dueDate: '2026-06-10',
    recommendedAction: '协调第二工厂承接部分样品，或调整 AW-3 波段节奏',
    actionStatus: 'in_progress',
  },
  {
    riskId: 'risk-005',
    riskType: 'shared_sole_low',
    riskObject: '正装品类底台复用',
    riskReason: '正装品类共底率仅 28%，每款均独立开底，成本偏高',
    affectedWave: 'AW-1 至 AW-5',
    expectedImpact: '整体新模成本增加约 ¥20W，压缩品类毛利空间',
    owner: '产品架构师',
    dueDate: '2026-06-15',
    recommendedAction: '审查正装品类底台方案，推进 2 款底台共用整合',
    actionStatus: 'open',
  },
];

function addDays(dateValue: string | undefined, dayCount: number) {
  const base = dateValue && !Number.isNaN(Date.parse(dateValue)) ? new Date(dateValue) : new Date('2026-05-23');
  base.setDate(base.getDate() + dayCount);
  return base.toISOString().slice(0, 10);
}

/** 从 SKU 架构状态生成当前筛选范围内的风险项。 */
export function buildDesignRiskBlockers(
  rows: SkuArchitectureRow[] = SKU_ARCHITECTURE_ROWS,
  referenceDate?: string,
): DesignRiskBlocker[] {
  const riskRows = rows.filter((row) => row.riskStatus !== 'normal' || row.skuCount < row.skuTarget);

  return riskRows.map((row, index) => {
    const missingSku = Math.max(0, row.skuTarget - row.skuCount);
    const hasToolingRisk = row.outsolePlatform.includes('新') || row.outsolePlatform.includes('模');
    const riskType: DesignRiskBlocker['riskType'] = hasToolingRisk
      ? 'new_mold_excess'
      : row.devStatus === 'at_risk'
        ? 'sample_delay'
        : 'design_direction';

    return {
      riskId: `sku-risk-${row.seriesId || index}`,
      riskType,
      riskObject: `${row.seriesName} / ${row.category}`,
      riskReason: missingSku > 0
        ? `${missingSku} 个目标 SKU 尚未定义或确认，当前 ${row.skuCount}/${row.skuTarget}`
        : `${row.seriesName} 已进入风险状态，需要复核设计、成本或开发承接`,
      affectedWave: '当前筛选范围',
      affectedStyle: row.seriesName,
      expectedImpact: missingSku > 0
        ? `可能影响 ${missingSku} 个 SKU 的设计 Brief、样品排期和成本核价`
        : '可能影响下一 Gate 准入与上市交付节奏',
      owner: '设计企划 / 开发',
      dueDate: addDays(referenceDate, row.riskStatus === 'high_risk' ? 5 : 10),
      recommendedAction: hasToolingRisk
        ? '复核新开模必要性，优先寻找可复用底台或共模方案'
        : '补齐 SKU 定义、设计 Brief、材料和成本责任项',
      actionStatus: row.riskStatus === 'high_risk' ? 'open' : 'in_progress',
    };
  });
}

/** 本周拍板事项 */
export const WEEKLY_DECISION_ITEMS: WeeklyDecisionItem[] = [
  {
    decisionId: 'dec-001',
    decisionObject: 'CF-001-BLK 面料',
    decisionType: 'material',
    currentProblem: '原选面料供应商无法按期供货，需在本周确认替代方案',
    options: ['切换至 B 供应商头层牛皮（成本 +¥8/双）', '降级使用 PU 面料（成本 -¥12/双，质感下降）', '等待原供应商恢复（延期 15 天）'],
    recommendedOption: '切换至 B 供应商头层牛皮，保持质感并控制延期风险',
    affectedScope: 'AW-2 主推款，预计影响 3000 双',
    owner: '设计总监 + 材料经理',
    dueDate: '2026-05-28',
    actionStatus: 'open',
  },
  {
    decisionId: 'dec-002',
    decisionObject: '户外系列新开底台数量',
    decisionType: 'outsole',
    currentProblem: '户外系列当前规划 4 款新开底，超出 2 款阈值',
    options: ['砍减至 2 款新开底，其余复用现有平台底', '维持 4 款，申请成本豁免', '延期 2 款至下一季'],
    recommendedOption: '砍减至 2 款，TL-002 和 TL-004 优先复用 CF-Base-01 底台',
    affectedScope: 'AW-3 户外系列，影响成本约 ¥10W',
    owner: '产品部总监',
    dueDate: '2026-05-30',
    actionStatus: 'open',
  },
  {
    decisionId: 'dec-003',
    decisionObject: '主推款 CF-002 配色方向',
    decisionType: 'colorway',
    currentProblem: 'CF-002 当前规划 4 色，市场反馈黑白双色即可，其余 2 色销售预期低',
    options: ['保留 4 色（黑 / 白 / 米 / 驼）', '砍减至 2 色（黑 / 白），节省备货', '砍减至 3 色（黑 / 白 / 米）'],
    recommendedOption: '砍减至 3 色，驼色留待下个波段机会时追加',
    affectedScope: 'AW-2，影响 OTB 预算约 ¥5W',
    owner: '商品企划',
    dueDate: '2026-05-29',
    actionStatus: 'open',
  },
  {
    decisionId: 'dec-004',
    decisionObject: 'TL-005 是否进入节点评审-2',
    decisionType: 'gate_entry',
    currentProblem: 'TL-005 样品未完成但时间节点到达，是否先进入节点评审 评审',
    options: ['允许进入节点评审，以现有状态评审', '暂缓 Gate，等样品完成后再评（延期 2 周）', '取消该款，资源转移至 TL-003'],
    recommendedOption: '暂缓 Gate 2 周，同时加速样品打样进度',
    affectedScope: 'AW-3，影响波段节奏约 2 周',
    owner: '开发主管',
    dueDate: '2026-06-01',
    actionStatus: 'open',
  },
];

/** 跨模块入口 */
export const RELATED_MODULE_LINKS: DesignPlanningRelatedModuleLink[] = [
  // 设计企划内部
  {
    linkId: 'int-theme',
    label: '主题与系列策略',
    description: '查看本季系列方向、设计关键词与人群定位',
    actionLabel: '查看主题策略',
    relatedRoute: '/design-review-center?tab=themeStrategy',
    category: 'internal',
    icon: '🎨',
  },
  {
    linkId: 'int-arch',
    label: '产品架构',
    description: '调整品类结构、底楦方案和平台策略',
    actionLabel: '调整产品架构',
    relatedRoute: '/design-review-center?tab=productArchitecture',
    category: 'internal',
    icon: '🧱',
  },
  {
    linkId: 'int-task',
    label: '开发任务池',
    description: '查看单款推进状态、样品和材料进度',
    actionLabel: '查看开发任务',
    relatedRoute: '/design-review-center?tab=developmentTaskPool',
    category: 'internal',
    icon: '📁',
  },
  {
    linkId: 'int-gate',
    label: '波段研发节点',
    description: '跟踪 Gate 节点、延期风险和责任人',
    actionLabel: '查看节点风险',
    relatedRoute: '/design-review-center?tab=developmentGateTable',
    category: 'internal',
    icon: '🗓️',
  },
  {
    linkId: 'int-version',
    label: '设计版本',
    description: '查看版本链、配色和材料评审历史',
    actionLabel: '查看设计版本',
    relatedRoute: '/design-review-center?tab=designVersionPreview',
    category: 'internal',
    icon: '🖼️',
  },
  {
    linkId: 'int-review',
    label: '评审决议',
    description: '推进未关闭评审、动作和阻塞项',
    actionLabel: '查看评审决议',
    relatedRoute: '/design-review-center?tab=reviewDecisionCenter',
    category: 'internal',
    icon: '✅',
  },
  // 商品企划外部
  {
    linkId: 'ext-brand',
    label: '品牌定位',
    description: '校准设计方向与品牌 DNA 的一致性',
    actionLabel: '校准商品企划输入',
    relatedRoute: '/dashboard?tab=brand-positioning',
    category: 'external',
    icon: '🏷️',
  },
  {
    linkId: 'ext-consumer',
    label: '消费者画像',
    description: '验证目标人群和使用场景的设计承接',
    actionLabel: '查看人群洞察',
    relatedRoute: '/dashboard?tab=consumer-profiling',
    category: 'external',
    icon: '👤',
  },
  {
    linkId: 'ext-trend',
    label: '竞品 & 趋势',
    description: '查看趋势方向和竞品空白机会',
    actionLabel: '查看趋势输入',
    relatedRoute: '/dashboard?tab=competitor',
    category: 'external',
    icon: '📊',
  },
  {
    linkId: 'ext-wave',
    label: '波段企划',
    description: '查看波段节奏和上市时间影响',
    actionLabel: '查看波段影响',
    relatedRoute: '/dashboard?tab=wave-planning',
    category: 'external',
    icon: '🌊',
  },
  {
    linkId: 'ext-otb',
    label: 'OTB 预算',
    description: '查看开发预算限制和 SKU 上限',
    actionLabel: '查看 OTB 限制',
    relatedRoute: '/dashboard?tab=otb',
    category: 'external',
    icon: '💰',
  },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(targetDate: string, referenceDate?: string) {
  if (!referenceDate) return 23;
  const target = Date.parse(targetDate);
  const reference = Date.parse(referenceDate);
  if (Number.isNaN(target) || Number.isNaN(reference)) return 23;
  return Math.max(0, Math.ceil((target - reference) / MS_PER_DAY));
}

function isPastDue(dueDate: string, referenceDate?: string) {
  if (!referenceDate) return false;
  const due = Date.parse(dueDate);
  const reference = Date.parse(referenceDate);
  if (Number.isNaN(due) || Number.isNaN(reference)) return false;
  return due < reference;
}

function average(values: number[], fallback: number) {
  if (values.length === 0) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** 新版 6 卡片执行摘要 — 从 overview + SKU 架构推导 */
export function derivePlanningExecutiveSummaryCards(
  overview: DesignReviewOverview,
  skuRows: SkuArchitectureRow[] = [],
  decisionItems: WeeklyDecisionItem[] = [],
  costRows: CostMarginRow[] = [],
  referenceDate?: string,
): PlanningExecutiveSummaryCards {
  const arch = overview.architectureSummary;
  const highRiskSeriesCount = skuRows.filter((row) => row.riskStatus === 'high_risk').length;
  const highRisk = Math.max(overview.highRiskStyles, highRiskSeriesCount);
  const delayed = overview.delayedGateCount;
  const bomRate = overview.bomLockRate;
  const nextGateDate = '2026-06-15';
  const plannedSku = skuRows.reduce((sum, row) => sum + row.skuTarget, 0) || arch?.skuTarget || overview.totalStyles;
  const definedSku = skuRows.reduce((sum, row) => sum + row.skuCount, 0) || overview.inDevelopmentStyles + overview.lockedStyles;
  const heroCount = skuRows.reduce((sum, row) => sum + row.heroCount, 0) || arch?.leadStyleCount || Math.max(1, Math.round(overview.totalStyles * 0.1));
  const coreCount = skuRows.reduce((sum, row) => sum + row.coreCount, 0) || Math.round(plannedSku * 0.45);
  const supportCount = Math.max(0, plannedSku - heroCount - coreCount);
  const skuInDevelopment = skuRows.reduce(
    (sum, row) => (row.devStatus === 'in_progress' || row.devStatus === 'at_risk' ? sum + row.skuCount : sum),
    0,
  ) || overview.inDevelopmentStyles;
  const openDecisionCount = decisionItems.filter((item) => item.actionStatus !== 'decided').length;
  const overdueDecisionCount =
    decisionItems.filter((item) => item.actionStatus !== 'decided' && isPastDue(item.dueDate, referenceDate)).length
    + overview.mustDecide.filter((item) => isPastDue(item.dueDate, referenceDate)).length;
  const targetMarginRate = average(costRows.map((row) => row.targetMarginRate), 0.52);
  const forecastMarginRate = average(costRows.map((row) => row.forecastMarginRate), Math.max(0.3, 0.52 - highRisk * 0.012));
  const targetFob = Math.round(average(costRows.map((row) => row.targetFob), 280));
  const forecastFob = Math.round(average(costRows.map((row) => row.forecastFob), 280 + highRisk * 6));

  const overallStatus: DesignPlanningOverallStatus =
    highRisk > 3 || delayed > 2 || bomRate < 0.4 || forecastMarginRate < targetMarginRate - 0.04
      ? 'high_risk'
      : highRisk > 0 || delayed > 0 || overview.leadLockRate < 0.5 || forecastMarginRate < targetMarginRate
        ? 'warning'
        : 'healthy';

  return {
    overallStatus,
    gate: {
      currentGate: 'Gate-3',
      currentGateLabel: '材料 / 底台确认',
      nextGateName: '样品开发启动',
      nextGateDate,
      daysLeft: daysUntil(nextGateDate, referenceDate),
    },
    sku: {
      planned: plannedSku,
      defined: definedSku,
      unconfirmed: Math.max(0, plannedSku - definedSku),
    },
    keyStyle: {
      heroCount,
      coreCount,
      supportCount,
      totalTarget: plannedSku,
    },
    sampleDev: {
      inDevelopment: skuInDevelopment,
      pendingFitting: Math.max(0, Math.round(plannedSku * (1 - overview.sampleCompletionRate) * 0.4)),
      pendingConfirmation: Math.max(0, Math.round(plannedSku * overview.sampleCompletionRate * 0.25)),
      blocked: Math.max(overview.blockers.length, highRiskSeriesCount),
    },
    costMargin: {
      targetMarginRate,
      forecastMarginRate,
      overCostCount: costRows.filter((row) => row.status === 'over_target' || row.forecastFob > row.targetFob).length
        || Math.max(0, Math.round(plannedSku * (1 - bomRate) * 0.12)),
      targetFob,
      forecastFob,
    },
    riskDecision: {
      highRiskCount: highRisk,
      overdueDecisionCount,
      thisWeekMustHandle: openDecisionCount + overview.mustDecide.length,
    },
  };
}

/** 本季业务输入与企划目标 */
export const BUSINESS_INPUT_TARGETS: BusinessInputTargets = {
  consumer: {
    ageRange: '25–38 岁',
    gender: '男性为主 / 女性延展',
    scenes: ['每日通勤', '商务休闲', '轻量户外', '周末出行'],
    priceSensitivity: '中高价格敏感，追求品质感与功能性价比',
  },
  channels: [
    { name: '电商自营', share: 35, priority: 'primary' },
    { name: '品牌直营门店', share: 28, priority: 'primary' },
    { name: '经销商', share: 20, priority: 'secondary' },
    { name: '奥莱折扣', share: 10, priority: 'secondary' },
    { name: '海外 / 跨境', share: 7, priority: 'secondary' },
  ],
  businessTargets: {
    salesAmount: '¥ 8,400 万元',
    salesVolume: '21 万双',
    marginTarget: '≥ 52%',
    launchWindow: '2026-09（AW-1）至 2027-03（AW-5）',
  },
  categoryMix: [
    { category: '休闲运动', share: 45, skuCount: 22 },
    { category: '功能户外', share: 29, skuCount: 14 },
    { category: '都市通勤', share: 18, skuCount: 9 },
    { category: '正装商务', share: 8, skuCount: 4 },
  ],
  priceBands: [
    { band: '入门款', label: '引流 / 大众', msrpRange: '¥299 – ¥499', targetSkus: 10 },
    { band: '主价格带', label: '核心销量担当', msrpRange: '¥599 – ¥899', targetSkus: 21 },
    { band: '高端款', label: '形象 / 利润', msrpRange: '¥999 – ¥1,599', targetSkus: 18 },
  ],
};

/** 产品线 / SKU 架构矩阵 */
export const SKU_ARCHITECTURE_ROWS: SkuArchitectureRow[] = [
  {
    seriesId: 'S-CORE',
    seriesName: 'Core Craft',
    category: '休闲运动',
    targetConsumer: '25–35 岁都市男性',
    priceBand: '¥599–¥899',
    skuCount: 9,
    skuTarget: 12,
    heroCount: 2,
    coreCount: 6,
    supportCount: 4,
    scenario: '通勤 / 商务休闲',
    outsolePlatform: 'CF-Base-01（沿用）',
    last: 'L-Wide-02（宽楦）',
    devStatus: 'in_progress',
    riskStatus: 'warning',
  },
  {
    seriesId: 'S-URBAN',
    seriesName: 'Urban Walk',
    category: '都市通勤',
    targetConsumer: '28–40 岁都市女性',
    priceBand: '¥699–¥999',
    skuCount: 6,
    skuTarget: 9,
    heroCount: 1,
    coreCount: 5,
    supportCount: 3,
    scenario: '办公 / 轻社交',
    outsolePlatform: 'CF-Base-01（沿用）',
    last: 'L-Slim-04（细楦）',
    devStatus: 'in_progress',
    riskStatus: 'normal',
  },
  {
    seriesId: 'S-OUTDOOR',
    seriesName: 'Trail Lite',
    category: '功能户外',
    targetConsumer: '28–42 岁轻户外爱好者',
    priceBand: '¥899–¥1,299',
    skuCount: 5,
    skuTarget: 14,
    heroCount: 1,
    coreCount: 4,
    supportCount: 9,
    scenario: '周末徒步 / 城市户外',
    outsolePlatform: 'TL-Trail-01（新开模）',
    last: 'L-Trail-01（新开模）',
    devStatus: 'at_risk',
    riskStatus: 'high_risk',
  },
  {
    seriesId: 'S-SPORT',
    seriesName: 'Sport Light',
    category: '休闲运动',
    targetConsumer: '20–32 岁运动生活方式人群',
    priceBand: '¥399–¥699',
    skuCount: 7,
    skuTarget: 10,
    heroCount: 1,
    coreCount: 5,
    supportCount: 4,
    scenario: '健身 / 日常运动',
    outsolePlatform: 'SP-Flex-02（改模）',
    last: 'L-Sport-03（沿用）',
    devStatus: 'in_progress',
    riskStatus: 'normal',
  },
  {
    seriesId: 'S-FORMAL',
    seriesName: 'Business Classic',
    category: '正装商务',
    targetConsumer: '30–45 岁商务男性',
    priceBand: '¥999–¥1,599',
    skuCount: 3,
    skuTarget: 4,
    heroCount: 1,
    coreCount: 2,
    supportCount: 1,
    scenario: '正式商务 / 重要场合',
    outsolePlatform: 'BS-Classic-02（沿用）',
    last: 'L-Business-01（沿用）',
    devStatus: 'planning',
    riskStatus: 'warning',
  },
];

function uniqueNonEmpty(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

function parseFirstAmount(value: string | undefined | null) {
  const match = value?.match(/[\d,]+/);
  if (!match) return null;
  return Number(match[0].replace(/,/g, ''));
}

function getPriceBandBucket(priceBand: string) {
  const firstAmount = parseFirstAmount(priceBand);
  if (firstAmount === null) return '主价格带';
  if (firstAmount < 599) return '入门款';
  if (firstAmount < 999) return '主价格带';
  return '高端款';
}

function getPriceBandMeta(band: string) {
  if (band === '入门款') return { label: '引流 / 大众', msrpRange: '¥299 – ¥499' };
  if (band === '高端款') return { label: '形象 / 利润', msrpRange: '¥999 – ¥1,599' };
  return { label: '核心销量担当', msrpRange: '¥599 – ¥899' };
}

function distributeShare(items: Array<{ category: string; skuCount: number }>) {
  const total = items.reduce((sum, item) => sum + item.skuCount, 0);
  let usedShare = 0;
  return items.map((item, index) => {
    const share = index === items.length - 1
      ? Math.max(0, 100 - usedShare)
      : Math.round((item.skuCount / Math.max(total, 1)) * 100);
    usedShare += share;
    return { ...item, share };
  });
}

function summarizeArchitectureValue(values: string[], fallback: string) {
  const uniqueValues = uniqueNonEmpty(values);
  if (uniqueValues.length === 0) return fallback;
  return uniqueValues.slice(0, 2).join(' / ');
}

/** 从真实筛选后的系列聚合生成 SKU 架构行；无数据时回退到样例行。 */
export function buildSkuArchitectureRows(seriesAggregates: SeriesAggregate[]): SkuArchitectureRow[] {
  if (seriesAggregates.length === 0) return SKU_ARCHITECTURE_ROWS;

  return seriesAggregates.map((aggregate) => {
    const strategy = aggregate.themeStrategy;
    const architectureRows = aggregate.architectureRows;
    const skuTarget = architectureRows.reduce((sum, row) => sum + row.skuTarget, 0)
      || strategy.skuTarget
      || aggregate.styles.length;
    const skuCount = architectureRows.reduce((sum, row) => sum + row.activeStyleCount, 0)
      || aggregate.styles.length;
    const heroCount = architectureRows.reduce((sum, row) => sum + row.leadStyleCount, 0)
      || Math.max(1, Math.round(skuTarget * 0.12));
    const coreCount = Math.max(0, Math.min(skuTarget - heroCount, Math.round(skuTarget * 0.52)));
    const supportCount = Math.max(0, skuTarget - heroCount - coreCount);
    const hasBlockingRisk = aggregate.styles.some((item) => item.taskRow.blocked || item.taskRow.riskLevel === 'blocking' || item.taskRow.riskLevel === 'high');
    const hasWarningRisk = aggregate.styles.some((item) => item.taskRow.riskLevel === 'medium' || item.taskRow.pendingReview || item.taskRow.overdue);
    const devStatus: SkuArchitectureRow['devStatus'] = strategy.reviewDecisionStatus === 'approved'
      ? 'completed'
      : hasBlockingRisk
        ? 'at_risk'
        : skuCount > 0
          ? 'in_progress'
          : 'planning';
    const riskStatus: SkuArchitectureRow['riskStatus'] = hasBlockingRisk
      ? 'high_risk'
      : hasWarningRisk
        ? 'warning'
        : 'normal';

    return {
      seriesId: strategy.seriesId,
      seriesName: strategy.seriesName,
      category: uniqueNonEmpty([
        ...architectureRows.map((row) => row.categoryName),
        ...strategy.categories,
      ]).join(' / ') || '未分配品类',
      targetConsumer: strategy.targetConsumer || '待确认',
      priceBand: strategy.priceBand || architectureRows[0]?.priceBand || '待定',
      skuCount,
      skuTarget,
      heroCount,
      coreCount,
      supportCount,
      scenario: strategy.usageScenarios.slice(0, 2).join(' / ') || strategy.targetWave || '待确认',
      outsolePlatform: summarizeArchitectureValue(
        architectureRows.map((row) => row.sharedOutsoleStrategy || row.toolingNeed),
        strategy.soleDirections[0] || '底台待确认',
      ),
      last: summarizeArchitectureValue(
        architectureRows.map((row) => row.sharedLastStrategy),
        strategy.lastDirections[0] || '楦型待确认',
      ),
      devStatus,
      riskStatus,
    };
  });
}

/** 用同一套 SKU 架构行回填业务输入，确保品类结构、价格带与矩阵口径一致。 */
export function deriveBusinessInputTargets(rows: SkuArchitectureRow[] = SKU_ARCHITECTURE_ROWS): BusinessInputTargets {
  const sourceRows = rows.length > 0 ? rows : SKU_ARCHITECTURE_ROWS;
  const categoryMap = new Map<string, number>();
  const priceBandMap = new Map<string, number>();

  sourceRows.forEach((row) => {
    categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + row.skuTarget);
    const priceBand = getPriceBandBucket(row.priceBand);
    priceBandMap.set(priceBand, (priceBandMap.get(priceBand) ?? 0) + row.skuTarget);
  });

  const categoryMix = distributeShare(
    Array.from(categoryMap.entries()).map(([category, skuCount]) => ({ category, skuCount })),
  );
  const priceBands = ['入门款', '主价格带', '高端款']
    .map((band) => {
      const meta = getPriceBandMeta(band);
      return {
        band,
        label: meta.label,
        msrpRange: meta.msrpRange,
        targetSkus: priceBandMap.get(band) ?? 0,
      };
    })
    .filter((item) => item.targetSkus > 0);

  return {
    ...BUSINESS_INPUT_TARGETS,
    categoryMix,
    priceBands,
    consumer: {
      ...BUSINESS_INPUT_TARGETS.consumer,
      purchaseDrivers: ['功能导向', '颜值优先', '品牌忠诚', '性价比'],
    },
    businessTargets: {
      ...BUSINESS_INPUT_TARGETS.businessTargets,
      launchPhases: [
        { label: '首批', date: '2026-07-15' },
        { label: '主销', date: '2026-09-01' },
        { label: '末期', date: '2026-11-15' },
      ],
    },
  };
}

/** 从真实系列聚合生成成本毛利行；缺失成本时使用价格带和目标成本带估算。 */
export function buildCostMarginRows(seriesAggregates: SeriesAggregate[]): CostMarginRow[] {
  if (seriesAggregates.length === 0) return COST_MARGIN_ROWS;

  return seriesAggregates.map((aggregate) => {
    const strategy = aggregate.themeStrategy;
    const msrp = parseFirstAmount(strategy.priceBand) ?? 699;
    const targetFob = parseFirstAmount(strategy.targetCostBand) ?? Math.round(msrp * 0.36);
    const quotedCosts = aggregate.styles
      .map((item) => item.taskRow.quotedCost ?? item.taskRow.targetCost)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const forecastFob = Math.round(strategy.quotedCostAverage ?? average(quotedCosts, targetFob));
    const targetMarginRate = 0.52;
    const overRate = targetFob > 0 ? (forecastFob - targetFob) / targetFob : 0;
    const forecastMarginRate = Math.max(0.3, Math.min(0.62, targetMarginRate - Math.max(0, overRate) * 0.25));
    const status: CostMarginRow['status'] = overRate > 0.08 ? 'over_target' : overRate > 0 ? 'warning' : 'normal';

    return {
      seriesId: strategy.seriesId,
      seriesName: strategy.seriesName,
      category: strategy.categories[0] ?? aggregate.architectureRows[0]?.categoryName ?? '未分配品类',
      msrp,
      targetFob,
      forecastFob,
      targetMarginRate,
      forecastMarginRate,
      overTargetReason: status === 'normal' ? undefined : strategy.costDriftAlert ?? '预测 FOB 高于目标成本带',
      optimizationSuggestion: status === 'normal' ? undefined : '复核材料替代、底台复用和非主推 SKU 宽度',
      status,
    };
  });
}

/** 开发可行性与工程承接 */
export const ENGINEERING_FEASIBILITY_DATA: EngineeringFeasibilityData = {
  lastStatuses: [
    {
      lastCode: 'L-Wide-02',
      lastName: '宽楦健步楦',
      status: 'confirmed',
      fitTrial: '2026-03-20 试穿通过',
      affectedSeries: ['Core Craft', 'Urban Walk'],
    },
    {
      lastCode: 'L-Trail-01',
      lastName: '轻户外功能楦',
      status: 'pending_fitting',
      fitTrial: '2026-06-05 安排中',
      affectedSeries: ['Trail Lite'],
      note: '新开楦型，试穿结果影响 AW-3 节奏',
    },
    {
      lastCode: 'L-Sport-03',
      lastName: '运动低帮楦',
      status: 'confirmed',
      fitTrial: '2026-04-10 试穿通过',
      affectedSeries: ['Sport Light'],
    },
    {
      lastCode: 'L-Business-01',
      lastName: '商务精工楦',
      status: 'needs_adjustment',
      fitTrial: '2026-04-28 需调整内衬宽度',
      affectedSeries: ['Business Classic'],
      note: '第二次修楦预计 2026-06-01',
    },
  ],
  outsolePlatforms: [
    {
      platformCode: 'CF-Base-01',
      platformName: 'Core 平台底（沿用）',
      strategy: 'carry_over',
      affectedSeries: ['Core Craft', 'Urban Walk'],
      estimatedCost: '¥0（沿用）',
      status: 'confirmed',
    },
    {
      platformCode: 'TL-Trail-01',
      platformName: 'Trail 防滑橡胶大底（新开）',
      strategy: 'new_tooling',
      affectedSeries: ['Trail Lite'],
      estimatedCost: '¥18W / 套',
      status: 'at_risk',
    },
    {
      platformCode: 'SP-Flex-02',
      platformName: 'Sport 弯折中底（改模）',
      strategy: 'modify_tooling',
      affectedSeries: ['Sport Light'],
      estimatedCost: '¥4.5W / 套',
      status: 'pending_fitting',
    },
    {
      platformCode: 'BS-Classic-02',
      platformName: 'Business 皮底（沿用）',
      strategy: 'carry_over',
      affectedSeries: ['Business Classic'],
      estimatedCost: '¥0（沿用）',
      status: 'confirmed',
    },
  ],
  materialItems: [
    { materialRole: 'upper', materialName: '头层牛皮（主材）', supplier: 'A 供应商', status: 'confirmed', moq: '500 张', leadTime: '45 天', },
    { materialRole: 'upper', materialName: '防水尼龙（Trail 系列）', supplier: 'B 供应商', status: 'at_risk', moq: '800M', leadTime: '60 天', risk: '供应商备货不足，需备选方案' },
    { materialRole: 'lining', materialName: '透气速干内里', supplier: 'C 供应商', status: 'confirmed', moq: '1000M', leadTime: '30 天' },
    { materialRole: 'insole', materialName: 'EVA 回弹鞋垫', supplier: 'D 供应商', status: 'pending_fitting', moq: '3000 双', leadTime: '25 天' },
    { materialRole: 'outsole', materialName: 'TR 橡胶大底', supplier: 'E 供应商', status: 'confirmed', moq: '2000 双', leadTime: '35 天' },
    { materialRole: 'outsole', materialName: '新开 Trail 大底', supplier: '待定', status: 'not_started', moq: '未知', leadTime: '90 天', risk: '供应商尚未确认' },
  ],
  craftRisks: [
    { craftType: '无车缝一体成型', riskLevel: 'medium', affectedStyleCount: 4, description: '工厂首次批量生产，需提前确认良品率目标' },
    { craftType: 'TPU 热压贴合', riskLevel: 'low', affectedStyleCount: 6, description: '工艺成熟，已有量产经验' },
    { craftType: '防水胶条封合', riskLevel: 'high', affectedStyleCount: 5, description: 'Trail 系列防水工艺需第三方测试验证，当前无测试报告' },
    { craftType: '发泡 EVA 中底', riskLevel: 'low', affectedStyleCount: 8, description: '工厂有量产能力，无风险' },
  ],
  supplyChainItems: [
    { supplier: 'A 供应商（皮革）', category: '面料', confirmed: true, moq: '500 张/批', leadTime: '45 天', hasAlternative: true },
    { supplier: 'B 供应商（防水尼龙）', category: '面料', confirmed: false, moq: '800M', leadTime: '60 天', hasAlternative: false },
    { supplier: 'E 供应商（大底）', category: '鞋底', confirmed: true, moq: '2000 双', leadTime: '35 天', hasAlternative: true },
    { supplier: 'Trail 大底供应商', category: '鞋底', confirmed: false, moq: '未定', leadTime: '90 天', hasAlternative: false },
    { supplier: 'F 供应商（金属配件）', category: '辅料', confirmed: true, moq: '5000 个', leadTime: '20 天', hasAlternative: true },
  ],
  testItems: [
    { testType: '试穿舒适度', status: 'in_progress', affectedCount: 18 },
    { testType: '耐折 10 万次', status: 'passed', affectedCount: 12 },
    { testType: '止滑测试', status: 'pending', affectedCount: 10 },
    { testType: '耐磨测试', status: 'in_progress', affectedCount: 8 },
    { testType: '防水 IPX4', status: 'pending', affectedCount: 5 },
    { testType: '色牢度', status: 'passed', affectedCount: 20 },
  ],
};

function engineeringStatusFromRow(row: SkuArchitectureRow): EngineeringItemStatus {
  if (row.riskStatus === 'high_risk' || row.devStatus === 'at_risk') return 'at_risk';
  if (row.riskStatus === 'warning') return 'pending_fitting';
  if (row.devStatus === 'planning') return 'not_started';
  return 'confirmed';
}

function toolingStrategyFromPlatform(platform: string): EngineeringOutsolePlatform['strategy'] {
  if (platform.includes('新')) return 'new_tooling';
  if (platform.includes('改')) return 'modify_tooling';
  return 'carry_over';
}

function upsertByCode<T extends { code: string }>(items: T[]) {
  const map = new Map<string, T>();
  items.forEach((item) => {
    if (!map.has(item.code)) map.set(item.code, item);
  });
  return Array.from(map.values());
}

/** 用 SKU 架构生成楦型、底台承接状态，材料/供应链/测试沿用默认检查清单。 */
export function deriveEngineeringFeasibilityData(
  rows: SkuArchitectureRow[] = SKU_ARCHITECTURE_ROWS,
): EngineeringFeasibilityData {
  const sourceRows = rows.length > 0 ? rows : SKU_ARCHITECTURE_ROWS;
  const totalTarget = sourceRows.reduce((sum, row) => sum + row.skuTarget, 0);
  const lastStatuses = upsertByCode(
    sourceRows.map((row) => ({
      code: row.last,
      lastCode: row.last,
      lastName: row.last,
      status: engineeringStatusFromRow(row),
      fitTrial: row.riskStatus === 'high_risk' ? '需优先安排试穿复核' : '按 Gate 节点跟进',
      affectedSeries: [row.seriesName],
      note: row.skuCount < row.skuTarget ? `还有 ${row.skuTarget - row.skuCount} 个 SKU 未定义` : undefined,
    })),
  ).map((item) => ({
    lastCode: item.lastCode,
    lastName: item.lastName,
    status: item.status,
    fitTrial: item.fitTrial,
    affectedSeries: item.affectedSeries,
    note: item.note,
  }));
  const outsolePlatforms = upsertByCode(
    sourceRows.map((row) => ({
      code: row.outsolePlatform,
      platformCode: row.outsolePlatform,
      platformName: row.outsolePlatform,
      strategy: toolingStrategyFromPlatform(row.outsolePlatform),
      affectedSeries: [row.seriesName],
      estimatedCost: row.outsolePlatform.includes('新') ? '需核算模具投入' : '沿用 / 改模预算',
      status: engineeringStatusFromRow(row),
    })),
  ).map((item) => ({
    platformCode: item.platformCode,
    platformName: item.platformName,
    strategy: item.strategy,
    affectedSeries: item.affectedSeries,
    estimatedCost: item.estimatedCost,
    status: item.status,
  }));

  return {
    ...ENGINEERING_FEASIBILITY_DATA,
    lastStatuses,
    outsolePlatforms,
    craftRisks: ENGINEERING_FEASIBILITY_DATA.craftRisks.map((risk) => ({
      ...risk,
      affectedStyleCount: Math.min(totalTarget, risk.affectedStyleCount),
    })),
    testItems: ENGINEERING_FEASIBILITY_DATA.testItems.map((item) => ({
      ...item,
      affectedCount: Math.min(totalTarget, item.affectedCount),
    })),
  };
}

/** 成本、价格带与毛利健康 */
export const COST_MARGIN_ROWS: CostMarginRow[] = [
  {
    seriesId: 'S-CORE',
    seriesName: 'Core Craft',
    category: '休闲运动',
    msrp: 699,
    targetFob: 248,
    forecastFob: 262,
    targetMarginRate: 0.55,
    forecastMarginRate: 0.50,
    overTargetReason: 'CF-001-BLK 面料供应商切换导致成本上涨 ¥14/双',
    optimizationSuggestion: '优先锁定 B 供应商，或在配色上减少非主色 SKU',
    status: 'warning',
  },
  {
    seriesId: 'S-URBAN',
    seriesName: 'Urban Walk',
    category: '都市通勤',
    msrp: 799,
    targetFob: 268,
    forecastFob: 270,
    targetMarginRate: 0.52,
    forecastMarginRate: 0.52,
    status: 'normal',
  },
  {
    seriesId: 'S-OUTDOOR',
    seriesName: 'Trail Lite',
    category: '功能户外',
    msrp: 1099,
    targetFob: 360,
    forecastFob: 418,
    targetMarginRate: 0.50,
    forecastMarginRate: 0.42,
    overTargetReason: '新开底台 ¥18W + 防水工艺额外成本，平摊超标',
    optimizationSuggestion: '削减 2 款 SKU 共摊模具费，或申请成本豁免',
    status: 'over_target',
  },
  {
    seriesId: 'S-SPORT',
    seriesName: 'Sport Light',
    category: '休闲运动',
    msrp: 499,
    targetFob: 168,
    forecastFob: 172,
    targetMarginRate: 0.50,
    forecastMarginRate: 0.49,
    overTargetReason: '改模费用平摊导致轻微超标',
    status: 'warning',
  },
  {
    seriesId: 'S-FORMAL',
    seriesName: 'Business Classic',
    category: '正装商务',
    msrp: 1199,
    targetFob: 398,
    forecastFob: 398,
    lockedFob: 395,
    targetMarginRate: 0.53,
    forecastMarginRate: 0.54,
    status: 'normal',
  },
];

// ── V2 新增：趋势、打样、材料战略等快照数据 ─────────────────────────────────

export const TREND_DIRECTION_SNAPSHOT: TrendDirectionSnapshot = {
  tags: ['城市机能', '轻量运动', '自然质朴', '科技布料', '复古简约'],
  colorStory: [
    { name: '哑光黑', hex: '#1E1E1E' },
    { name: '象牙米', hex: '#F5EDD6' },
    { name: '橄榄绿', hex: '#5A6641' },
    { name: '炭灰蓝', hex: '#3B4B5C' },
  ],
  silhouetteDirection: '以宽楦低帮为核心，局部高帮增加层次；廓形偏功能饱满感',
  materialDirection: '头层牛皮 + 可持续纱线里布；大底以轻量 EVA 复合橡胶为主',
  source: 'WGSN 2026 S/S + 内部消费者调研（N=1,200）',
};

export const MATERIAL_STRATEGY_SNAPSHOT: MaterialStrategySnapshot = {
  strategicMaterials: [
    { name: '可持续纱线里布', description: '占比目标 40%，当前 28%，已锁定 A 供应商' },
    { name: '轻量 EVA 复合大底', description: '平台底型可沿用 3 个系列，降低模具成本' },
    { name: '头层植鞣牛皮', description: '专属开发纹路，独占供应周期 6 个月' },
  ],
  sustainableRatio: { current: 0.28, target: 0.40 },
  keySupplierRisks: [
    { supplierName: '利联皮革（广州）', isExclusive: true, riskLevel: 'medium' },
    { supplierName: '华鑫橡胶', isExclusive: false, riskLevel: 'low' },
    { supplierName: '博远环保纺织', isExclusive: false, riskLevel: 'high' },
  ],
  platformReuseRate: 0.62,
};

export const PROTO_STATUS_MOCK: ProtoStatus = {
  totalStyles: 42,
  protoCompleted: 18,
  protoInProgress: 14,
  protoNotStarted: 10,
  delayedItems: [
    { styleCode: 'CF-001-BLK', plannedDate: '2026-04-15', delayDays: 12, reason: 'material' },
    { styleCode: 'TL-003-OLV', plannedDate: '2026-04-20', delayDays: 8, reason: 'factory' },
    { styleCode: 'UW-002-GRY', plannedDate: '2026-05-01', delayDays: 5, reason: 'design_change' },
  ],
  nextGateName: 'Salesman Sample Gate',
  daysToNextGate: 28,
};

export const OTB_CONFIRMATION_STATUS: OTBConfirmationStatus = {
  status: 'pending',
  lastAlignedDate: '2026-05-10',
  conflictSummary: '户外系列 SKU 数超编 4 款，需商品总监审批',
};

/** 从 SKU 架构行推导新续款汇总 */
export function deriveNewCarryoverSummary(rows: SkuArchitectureRow[]): NewCarryoverSummary {
  const sourceRows = rows.length > 0 ? rows : SKU_ARCHITECTURE_ROWS;
  let totalNew = 0;
  let totalCarryover = 0;
  const byProductLine = sourceRows.map((row) => {
    const target = row.skuTarget || row.skuCount || 0;
    // newCount / carryoverCount 优先用接口字段，否则按 60%/40% 粗估
    const newCount = row.newCount ?? Math.round(target * 0.6);
    const carryoverCount = row.carryoverCount ?? (target - Math.round(target * 0.6));
    totalNew += newCount;
    totalCarryover += carryoverCount;
    const newRate = (newCount + carryoverCount) > 0 ? newCount / (newCount + carryoverCount) : 0;
    return { name: row.seriesName, newCount, carryoverCount, newRate };
  });
  const total = totalNew + totalCarryover;
  return {
    newCount: totalNew,
    carryoverCount: totalCarryover,
    newRate: total > 0 ? totalNew / total : 0,
    targetNewRate: 0.60,
    byProductLine,
  };
}

