/**
 * arch-derivations.ts
 * 产品架构工作台 — 从 FilteredDesignReviewCenterData 派生的 9 个模块数据
 * 所有函数均为纯派生，不含静态 mock。
 */
import type { FilteredDesignReviewCenterData } from './selectors/filters';

// ─── MODULE 01: Landing Summary ────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'warning' | 'high_risk';

export interface ArchLandingSummary {
  skuTarget: number;
  styleDecomposed: number;
  taskGenerated: number;
  skuGap: number;
  heroCount: number;
  newCount: number;
  carryoverCount: number;
  newToolingCount: number;
  sharedSoleRate: number;
  sharedLastRate: number;
  healthStatus: HealthStatus;
  biggestRisk: string;
  mustDecideCount: number;
  recommendedAction: string;
}

export function buildProductArchLandingSummary(
  filtered: FilteredDesignReviewCenterData,
): ArchLandingSummary {
  const { architecture, styles, overview } = filtered;
  const activeStyles = styles.filter((s) => !s.style.cancelled);

  const skuTarget = architecture.summary.skuTarget;
  const styleDecomposed = activeStyles.length;
  const taskGenerated = activeStyles.filter(
    (s) => s.style.designStatus !== 'not_started',
  ).length;
  const skuGap = Math.max(0, skuTarget - styleDecomposed);
  const heroCount = activeStyles.filter((s) => s.style.leadStyle).length;
  const newCount = activeStyles.filter(
    (s) => s.style.developmentLevel === 'new_development',
  ).length;
  const carryoverCount = activeStyles.filter(
    (s) =>
      s.style.developmentLevel === 'reorder_optimization' ||
      s.style.developmentLevel === 'new_color_refresh',
  ).length;
  const sharedSoleRate = architecture.summary.sharedOutsoleRate;
  const sharedLastRate = architecture.summary.sharedLastRate;
  const newToolingCount = architecture.summary.newToolingCount;
  const highRiskCount = overview.highRiskStyles;

  const gapRate = skuTarget > 0 ? skuGap / skuTarget : 0;
  const heroRate = styleDecomposed > 0 ? heroCount / styleDecomposed : 0;
  let healthStatus: HealthStatus;
  if (highRiskCount > 3 || gapRate > 0.3 || heroRate < 0.05) {
    healthStatus = 'high_risk';
  } else if (highRiskCount > 0 || gapRate > 0.1 || heroRate < 0.1 || sharedSoleRate < 0.35) {
    healthStatus = 'warning';
  } else {
    healthStatus = 'healthy';
  }

  const riskParts: string[] = [];
  if (skuGap > 0) riskParts.push(`SKU 缺口 ${skuGap} 款`);
  if (heroCount < 2) riskParts.push('Hero 款不足');
  if (sharedSoleRate < 0.3) riskParts.push('共底率过低');
  if (highRiskCount > 0) riskParts.push(`${highRiskCount} 款高风险`);
  const biggestRisk = riskParts[0] ?? '无显著架构风险';

  const actionParts: string[] = [];
  if (skuGap > 0) actionParts.push(`补齐 ${skuGap} 款缺口`);
  else if (taskGenerated < styleDecomposed) actionParts.push('下发剩余设计任务包');
  else if (heroCount < 2) actionParts.push('指定 Hero 款');
  const recommendedAction = actionParts[0] ?? '提交架构评审';

  return {
    skuTarget,
    styleDecomposed,
    taskGenerated,
    skuGap,
    heroCount,
    newCount,
    carryoverCount,
    newToolingCount,
    sharedSoleRate,
    sharedLastRate,
    healthStatus,
    biggestRisk,
    mustDecideCount: overview.mustDecide.length,
    recommendedAction,
  };
}

// ─── MODULE 02: Merch Input Alignment ──────────────────────────────────────────

export type AlignStatus = 'aligned' | 'partial' | 'not_aligned' | 'deviated';

export interface ArchInputRow {
  id: string;
  dimension: string;
  inputSummary: string;
  archResult: string;
  alignStatus: AlignStatus;
  seriesCount: number;
  styleCount: number;
  taskCount: number;
  gap: string;
  recommendedAction: string;
  jumpModule: string;
}

export function buildArchInputAlignmentRows(
  filtered: FilteredDesignReviewCenterData,
): ArchInputRow[] {
  const { series, styles, architecture } = filtered;
  const activeStyles = styles.filter((s) => !s.style.cancelled);
  const allCategories = [...new Set(activeStyles.map((s) => s.style.categoryName))];
  const allWaves = [...new Set(activeStyles.map((s) => s.style.waveId).filter(Boolean))];
  const leadStyles = activeStyles.filter((s) => s.style.leadStyle);
  const consumers = [...new Set(series.map((s) => s.series.targetConsumer).filter(Boolean))];
  const priceBands = [...new Set(series.map((s) => s.series.priceBand).filter(Boolean))];
  const allScenarios = [...new Set(series.flatMap((s) => s.series.usageScenarios))];
  const skuTarget = architecture.summary.skuTarget;
  const styleTarget = architecture.summary.styleTarget;
  const withCost = activeStyles.filter(
    (s) => (s.style.quotedCost ?? 0) > 0 && (s.style.targetCost ?? 0) > 0,
  );
  const costBreached = withCost.filter(
    (s) => (s.style.quotedCost ?? 0) > (s.style.targetCost ?? Infinity),
  );

  return [
    {
      id: 'consumer',
      dimension: '目标消费者',
      inputSummary: consumers.slice(0, 2).join('、') || '未设置',
      archResult: `${series.length} 个系列，${consumers.length} 类人群，${allScenarios.length} 种场景`,
      alignStatus: consumers.length > 0 && series.length > 0 ? 'aligned' : 'not_aligned',
      seriesCount: series.length,
      styleCount: activeStyles.length,
      taskCount: activeStyles.filter((s) => s.style.designStatus !== 'not_started').length,
      gap: consumers.length === 0 ? '消费者画像未设置' : '',
      recommendedAction: consumers.length === 0 ? '补充系列目标消费者' : '查看系列策略',
      jumpModule: 'themeStrategy',
    },
    {
      id: 'price',
      dimension: '主价格带',
      inputSummary: priceBands.join(' / ') || '未设置',
      archResult: `SKU 目标 ${skuTarget}，覆盖 ${priceBands.length} 个价格带`,
      alignStatus: priceBands.length > 0 ? 'aligned' : 'not_aligned',
      seriesCount: series.length,
      styleCount: activeStyles.length,
      taskCount: activeStyles.filter((s) => (s.style.targetCost ?? 0) > 0).length,
      gap: priceBands.length === 0 ? '价格带未配置' : '',
      recommendedAction: '校验价格分布与断层',
      jumpModule: 'productArchitecture',
    },
    {
      id: 'category',
      dimension: '品类结构',
      inputSummary: `${allCategories.length} 个品类，目标 ${styleTarget} 款 / ${skuTarget} SKU`,
      archResult: `已拆解 ${activeStyles.length} 款，覆盖 ${allCategories.length} 个品类`,
      alignStatus:
        activeStyles.length >= styleTarget
          ? 'aligned'
          : activeStyles.length > 0
            ? 'partial'
            : 'not_aligned',
      seriesCount: series.length,
      styleCount: activeStyles.length,
      taskCount: activeStyles.filter((s) => s.categoryPlan !== null).length,
      gap:
        activeStyles.length < styleTarget
          ? `缺口 ${styleTarget - activeStyles.length} 款`
          : '',
      recommendedAction:
        activeStyles.length < styleTarget ? '补齐款位拆解' : '查看架构矩阵',
      jumpModule: 'productArchitecture',
    },
    {
      id: 'wave',
      dimension: '波段结构',
      inputSummary:
        allWaves.length > 0
          ? `${allWaves.join(' / ')}，共 ${allWaves.length} 个波段`
          : '未分配波段',
      archResult: `${activeStyles.filter((s) => !!s.style.waveId).length} 款已分配波段`,
      alignStatus: allWaves.length > 0 ? 'aligned' : 'not_aligned',
      seriesCount: series.length,
      styleCount: activeStyles.filter((s) => !!s.style.waveId).length,
      taskCount: activeStyles.filter((s) => !s.style.waveId).length,
      gap: allWaves.length === 0 ? '波段未分配' : '',
      recommendedAction: '查看波段研发节点',
      jumpModule: 'developmentGateTable',
    },
    {
      id: 'otb',
      dimension: 'OTB / 毛利目标',
      inputSummary: `SKU 上限 ${skuTarget}，共底/楦目标已设置`,
      archResult:
        withCost.length > 0
          ? `${withCost.length} 款有报价，${costBreached.length} 款超标`
          : '成本报价待录入',
      alignStatus:
        costBreached.length > 0 ? 'deviated' : withCost.length > 0 ? 'aligned' : 'partial',
      seriesCount: series.length,
      styleCount: withCost.length,
      taskCount: costBreached.length,
      gap:
        costBreached.length > 0
          ? `${costBreached.length} 款成本超标`
          : withCost.length === 0
            ? '报价未录入'
            : '',
      recommendedAction:
        costBreached.length > 0 ? '重新评估材料等级' : '推进成本报价',
      jumpModule: 'productArchitecture',
    },
    {
      id: 'trend',
      dimension: '竞品机会 / 趋势方向',
      inputSummary: '详见系列方向策略',
      archResult: `Hero 款 ${leadStyles.length} 款，共 ${activeStyles.length} 款`,
      alignStatus:
        leadStyles.length >= 2
          ? 'aligned'
          : leadStyles.length >= 1
            ? 'partial'
            : 'not_aligned',
      seriesCount: series.length,
      styleCount: leadStyles.length,
      taskCount: leadStyles.filter((s) => s.style.designStatus !== 'not_started').length,
      gap:
        leadStyles.length < 2
          ? `Hero 款仅 ${leadStyles.length} 款，建议 ≥ 2`
          : '',
      recommendedAction:
        leadStyles.length < 2 ? '指定更多 Hero 款' : '查看系列策略',
      jumpModule: 'themeStrategy',
    },
  ];
}

// ─── MODULE 04: Style Slot Breakdown ────────────────────────────────────────────

export interface StyleSlot {
  slotId: string;
  slotName: string;
  skuCode: string;
  categoryName: string;
  seriesName: string;
  waveId: string;
  developmentRole: string;
  devLevel: string;
  isHero: boolean;
  targetPriceBand: string;
  targetCost: number | null;
  quotedCost: number | null;
  outsole: string;
  last: string;
  materials: string[];
  colors: string[];
  designStatus: string;
  riskLevel: string;
  blocked: boolean;
  canDispatch: boolean;
  missingConditions: string[];
  nextAction: string;
  owner: string;
  dueDate: string;
}

function devLevelLabel(level: string): string {
  const MAP: Record<string, string> = {
    new_development: '新款',
    platform_extension: '平台延伸',
    new_upper_same_outsole: '换帮同底',
    new_color_refresh: '配色升级',
    reorder_optimization: '续款',
  };
  return MAP[level] ?? level;
}

export function buildStyleSlotBreakdown(
  filtered: FilteredDesignReviewCenterData,
): StyleSlot[] {
  return filtered.styles
    .filter((s) => !s.style.cancelled)
    .map((agg) => {
      const style = agg.style;
      const missing: string[] = [];
      if (!style.outsole) missing.push('底型未定');
      if (!style.last) missing.push('楦型未定');
      if (style.materialPlan.length === 0) missing.push('材料待定');
      if (style.colorPlan.length === 0) missing.push('颜色待定');
      if ((style.targetCost ?? 0) === 0) missing.push('目标成本未设');
      return {
        slotId: style.styleId,
        slotName: style.styleDisplayName,
        skuCode: style.skuCode,
        categoryName: style.categoryName,
        seriesName: agg.series?.seriesName ?? '',
        waveId: style.waveId,
        developmentRole: style.developmentRole,
        devLevel: devLevelLabel(style.developmentLevel),
        isHero: style.leadStyle,
        targetPriceBand: agg.series?.priceBand ?? '',
        targetCost: style.targetCost,
        quotedCost: style.quotedCost,
        outsole: style.outsole,
        last: style.last,
        materials: style.materialPlan,
        colors: style.colorPlan,
        designStatus: style.designStatus,
        riskLevel: style.riskLevel,
        blocked: style.blocked,
        canDispatch: missing.length === 0,
        missingConditions: missing,
        nextAction: style.nextAction,
        owner: style.owner,
        dueDate: style.dueDate,
      };
    });
}

// ─── MODULE 05: Design Task Package ─────────────────────────────────────────────

export interface DesignTaskPackage {
  taskId: string;
  styleName: string;
  skuCode: string;
  categoryName: string;
  seriesName: string;
  waveId: string;
  isHero: boolean;
  shoeTypeRequirement: string;
  lastRequirement: string;
  outsoleRequirement: string;
  materialDirections: string[];
  colorDirections: string[];
  featureKeywords: string[];
  outputRequirements: string[];
  owner: string;
  dueDate: string;
  designStatus: string;
  riskLevel: string;
  blocked: boolean;
  canDispatch: boolean;
  missingConditions: string[];
  relatedGate: string | null;
}

export function buildDesignTaskPackages(
  filtered: FilteredDesignReviewCenterData,
): DesignTaskPackage[] {
  return filtered.styles
    .filter((s) => !s.style.cancelled)
    .map((agg) => {
      const style = agg.style;
      const missing: string[] = [];
      if (!style.outsole) missing.push('大底要求待定');
      if (!style.last) missing.push('楦型待定');
      if (style.materialPlan.length === 0) missing.push('材料方向待定');

      const outputs: string[] = ['草图'];
      if (style.designStatus !== 'not_started') outputs.push('效果图');
      if (style.sampleStatus !== 'not_started') outputs.push('材料板', '色彩板');
      if (style.bomLocked) outputs.push('BOM 初稿');

      return {
        taskId: `task-${style.styleId}`,
        styleName: style.styleDisplayName,
        skuCode: style.skuCode,
        categoryName: style.categoryName,
        seriesName: agg.series?.seriesName ?? '',
        waveId: style.waveId,
        isHero: style.leadStyle,
        shoeTypeRequirement: style.categoryName,
        lastRequirement: style.last || '待定',
        outsoleRequirement: style.outsole || '待定',
        materialDirections: style.materialPlan,
        colorDirections: style.colorPlan,
        featureKeywords: agg.series?.designLanguages ?? [],
        outputRequirements: outputs,
        owner: style.owner,
        dueDate: style.dueDate,
        designStatus: style.designStatus,
        riskLevel: style.riskLevel,
        blocked: style.blocked,
        canDispatch: missing.length === 0,
        missingConditions: missing,
        relatedGate: agg.nextGate?.gateName ?? null,
      };
    });
}

// ─── MODULE 06: Price / Cost / Margin ───────────────────────────────────────────

export interface PriceCostRow {
  id: string;
  label: string;
  priceBand: string;
  skuTarget: number;
  skuActual: number;
  targetCostAvg: number | null;
  quotedCostAvg: number | null;
  overCostCount: number;
  marginRisk: 'ok' | 'warning' | 'high_risk';
  priceGap: string;
  recommendedActions: string[];
  grossMarginRate: number | null;
  targetGrossMarginRate: number;
}

export function buildPriceCostMarginRows(
  filtered: FilteredDesignReviewCenterData,
): PriceCostRow[] {
  const { series, styles } = filtered;
  const activeStyles = styles.filter((s) => !s.style.cancelled);

  return series.map((sa) => {
    const skuTarget = sa.architectureRows.reduce((sum, r) => sum + r.skuTarget, 0);
    const seriesStyles = activeStyles.filter((s) => s.style.seriesId === sa.series.seriesId);
    const withQuote = seriesStyles.filter((s) => (s.style.quotedCost ?? 0) > 0);
    const withTarget = seriesStyles.filter((s) => (s.style.targetCost ?? 0) > 0);
    const overCost = withQuote.filter(
      (s) => (s.style.quotedCost ?? 0) > (s.style.targetCost ?? Infinity),
    );
    const targetAvg =
      withTarget.length > 0
        ? withTarget.reduce((sum, s) => sum + (s.style.targetCost ?? 0), 0) / withTarget.length
        : null;
    const quotedAvg =
      withQuote.length > 0
        ? withQuote.reduce((sum, s) => sum + (s.style.quotedCost ?? 0), 0) / withQuote.length
        : null;
    const midPrice = parseMidPrice(sa.series.priceBand);
    const grossMarginRate =
      midPrice != null && quotedAvg != null && midPrice > 0
        ? (midPrice - quotedAvg) / midPrice
        : null;

    // marginRisk 改为以毛利率为准（与列展示口径一致），无数据时降级为成本超标款数比例
    let marginRisk: PriceCostRow['marginRisk'] = 'ok';
    if (grossMarginRate != null) {
      if (grossMarginRate < 0.35) marginRisk = 'high_risk';
      else if (grossMarginRate < 0.45) marginRisk = 'warning';
    } else {
      const breachRate = overCost.length / Math.max(1, seriesStyles.length);
      if (breachRate > 0.4) marginRisk = 'high_risk';
      else if (overCost.length > 0) marginRisk = 'warning';
    }

    const actions: string[] = [];
    if (overCost.length > 0) actions.push('降低材料等级', '共用大底');
    if (seriesStyles.length > skuTarget) actions.push('合并相似款');
    if (seriesStyles.length < skuTarget) actions.push(`补齐 ${skuTarget - seriesStyles.length} 款缺口`);

    return {
      id: sa.series.seriesId,
      label: sa.series.seriesName,
      priceBand: sa.series.priceBand,
      skuTarget,
      skuActual: seriesStyles.length,
      targetCostAvg: targetAvg,
      quotedCostAvg: quotedAvg,
      overCostCount: overCost.length,
      marginRisk,
      priceGap: seriesStyles.length === 0 ? '款位缺失' : '',
      recommendedActions: actions,
      grossMarginRate,
      targetGrossMarginRate: 0.45,
    };
  });
}

function parseMidPrice(band: string): number | null {
  const m = band.match(/(\d+)\s*[-\u2013~]\s*(\d+)/);
  if (m) return (Number(m[1]) + Number(m[2])) / 2;
  const single = band.match(/(\d+)/);
  return single ? Number(single[1]) : null;
}

// ─── Wave Launch Plan ─────────────────────────────────────────────────────────

export interface WaveLaunchSlot {
  slotId: string;
  styleName: string;
  isHero: boolean;
  isNew: boolean;
  colorCount: number;
}

export interface WaveLaunchGroup {
  wave: string;
  styleCount: number;
  skuCount: number;
  daysUntilLaunch: number | null;
  categoryCounts: { name: string; count: number }[];
  slots: WaveLaunchSlot[];
}

export function buildWaveLaunchPlan(
  filtered: FilteredDesignReviewCenterData,
): WaveLaunchGroup[] {
  const slots = buildStyleSlotBreakdown(filtered);
  const waves = [...new Set(slots.map((s) => s.waveId).filter(Boolean))].sort();
  return waves.map((wave) => {
    const inWave = slots.filter((s) => s.waveId === wave);
    const categoryMap = new Map<string, number>();
    inWave.forEach((s) =>
      categoryMap.set(s.categoryName, (categoryMap.get(s.categoryName) ?? 0) + 1),
    );
    return {
      wave: wave.toUpperCase(),
      styleCount: inWave.length,
      skuCount: inWave.reduce((sum, s) => sum + Math.max(s.colors.length, 1), 0),
      daysUntilLaunch: null,
      categoryCounts: Array.from(categoryMap, ([name, count]) => ({ name, count })),
      slots: inWave.map((s) => ({
        slotId: s.slotId,
        styleName: s.slotName,
        isHero: s.isHero,
        isNew: s.devLevel === '\u65b0\u6b3e',
        colorCount: s.colors.length,
      })),
    };
  });
}

// ─── MODULE 07: Platform / Mold Constraint ──────────────────────────────────────

export interface PlatformMoldItem {
  categoryName: string;
  outsoles: string[];
  lasts: string[];
  sharedSole: number;
  sharedLast: number;
  sharedSoleRate: number;
  sharedLastRate: number;
  newTooling: number;
  styleCount: number;
  skuCount: number;
  recommendedActions: string[];
}

export interface PlatformMoldSummary {
  sharedSoleRate: number;
  sharedLastRate: number;
  platformReuseRate: number;
  newToolingCount: number;
  newToolingBudget: number;
  overBudget: boolean;
  costImpact: string;
  items: PlatformMoldItem[];
}

export function buildPlatformMoldConstraint(
  filtered: FilteredDesignReviewCenterData,
): PlatformMoldSummary {
  const { architecture, styles } = filtered;
  const activeStyles = styles.filter((s) => !s.style.cancelled);

  // Group by category
  const catMap = new Map<
    string,
    {
      sharedSole: number;
      sharedLast: number;
      newTooling: number;
      styleCount: number;
      skuCount: number;
      outsoles: Set<string>;
      lasts: Set<string>;
    }
  >();

  architecture.inputs.forEach((input) => {
    const catStyles = activeStyles.filter(
      (s) => s.style.categoryName === input.categoryName,
    );
    const existing = catMap.get(input.categoryName);
    if (existing) {
      existing.sharedSole += input.sharedOutsoleStyleCount;
      existing.sharedLast += input.sharedLastStyleCount;
      existing.newTooling += input.newToolingCount;
      existing.styleCount += input.styleTarget;
      existing.skuCount += input.skuTarget;
      catStyles.forEach((s) => {
        if (s.style.outsole) existing.outsoles.add(s.style.outsole);
        if (s.style.last) existing.lasts.add(s.style.last);
      });
    } else {
      const outsoles = new Set<string>();
      const lasts = new Set<string>();
      catStyles.forEach((s) => {
        if (s.style.outsole) outsoles.add(s.style.outsole);
        if (s.style.last) lasts.add(s.style.last);
      });
      catMap.set(input.categoryName, {
        sharedSole: input.sharedOutsoleStyleCount,
        sharedLast: input.sharedLastStyleCount,
        newTooling: input.newToolingCount,
        styleCount: input.styleTarget,
        skuCount: input.skuTarget,
        outsoles,
        lasts,
      });
    }
  });

  const items: PlatformMoldItem[] = [...catMap.entries()].map(
    ([categoryName, data]) => {
      const sharedSoleRate =
        data.styleCount > 0 ? data.sharedSole / data.styleCount : 0;
      const sharedLastRate =
        data.styleCount > 0 ? data.sharedLast / data.styleCount : 0;
      const actions: string[] = [];
      if (sharedSoleRate < 0.4) actions.push('建议共底');
      if (sharedLastRate < 0.4) actions.push('建议共楦');
      if (data.newTooling > 2) actions.push('申请新模预算');
      return {
        categoryName,
        outsoles: [...data.outsoles],
        lasts: [...data.lasts],
        sharedSole: data.sharedSole,
        sharedLast: data.sharedLast,
        sharedSoleRate,
        sharedLastRate,
        newTooling: data.newTooling,
        styleCount: data.styleCount,
        skuCount: data.skuCount,
        recommendedActions: actions,
      };
    },
  );

  const newToolingBudget = 6;
  const totalNewTooling = architecture.summary.newToolingCount;
  const overBudget = totalNewTooling > newToolingBudget;

  return {
    sharedSoleRate: architecture.summary.sharedOutsoleRate,
    sharedLastRate: architecture.summary.sharedLastRate,
    platformReuseRate: architecture.summary.platformReuseRate,
    newToolingCount: totalNewTooling,
    newToolingBudget,
    overBudget,
    costImpact: overBudget
      ? `超出预算 ${totalNewTooling - newToolingBudget} 套，预计影响 ¥${(totalNewTooling - newToolingBudget) * 15}W`
      : '新模数量在预算范围内',
    items,
  };
}

// ─── MODULE 08: Architecture Risk Decisions ──────────────────────────────────────

export type ArchRiskType =
  | '商品输入未承接'
  | '款位未拆解'
  | '设计任务未生成'
  | 'SKU 缺口'
  | 'Hero 款不足'
  | '价格带冲突'
  | '成本超标'
  | '新模超预算'
  | '缺少底型'
  | '缺少楦型'
  | '缺少材料方向'
  | '波段上市风险';

export type ArchRiskDecisionStatus = 'open' | 'in_progress' | 'resolved';

export interface ArchRiskDecisionItem {
  riskId: string;
  riskType: ArchRiskType;
  riskObject: string;
  affectedSeries: string;
  affectedCategory: string;
  affectedSlots: number;
  affectedSkus: number;
  decisionOptions: string[];
  recommendedOption: string;
  owner: string;
  dueDate: string;
  status: ArchRiskDecisionStatus;
  jumpModule: string;
}

export function buildArchRiskDecisions(
  filtered: FilteredDesignReviewCenterData,
): ArchRiskDecisionItem[] {
  const { styles, architecture, overview, gateNodes } = filtered;
  const activeStyles = styles.filter((s) => !s.style.cancelled);
  const items: ArchRiskDecisionItem[] = [];

  // SKU gap
  const skuGap = Math.max(0, architecture.summary.skuTarget - activeStyles.length);
  if (skuGap > 0) {
    items.push({
      riskId: 'risk-sku-gap',
      riskType: 'SKU 缺口',
      riskObject: `款位拆解缺口 ${skuGap} 款`,
      affectedSeries: '全局',
      affectedCategory: '全品类',
      affectedSlots: skuGap,
      affectedSkus: skuGap,
      decisionOptions: ['补充款位拆解', '降低 SKU 目标', '合并品类计划'],
      recommendedOption: '补充款位拆解',
      owner: '产品架构负责人',
      dueDate: overview.mustDecide[0]?.dueDate ?? '',
      status: 'open',
      jumpModule: 'productArchitecture',
    });
  }

  // Hero gap
  const heroCount = activeStyles.filter((s) => s.style.leadStyle).length;
  if (heroCount < 2) {
    items.push({
      riskId: 'risk-hero-gap',
      riskType: 'Hero 款不足',
      riskObject: `当前 Hero 款 ${heroCount} 款，建议 ≥ 2`,
      affectedSeries: '全局',
      affectedCategory: '全品类',
      affectedSlots: heroCount,
      affectedSkus: heroCount,
      decisionOptions: ['指定更多 Hero 款', '提升主推款资源', '重新评估角色分配'],
      recommendedOption: '指定更多 Hero 款',
      owner: '设计总监',
      dueDate: '',
      status: 'open',
      jumpModule: 'productArchitecture',
    });
  }

  // Cost breach
  const costBreached = activeStyles.filter(
    (s) =>
      (s.style.quotedCost ?? 0) > (s.style.targetCost ?? Infinity) &&
      (s.style.targetCost ?? 0) > 0,
  );
  if (costBreached.length > 0) {
    const uniqueSeries = [
      ...new Set(costBreached.map((s) => s.series?.seriesName ?? '').filter(Boolean)),
    ].join('、');
    items.push({
      riskId: 'risk-cost-breach',
      riskType: '成本超标',
      riskObject: `${costBreached.length} 款报价超出目标成本`,
      affectedSeries: uniqueSeries || '多个系列',
      affectedCategory: [
        ...new Set(costBreached.map((s) => s.style.categoryName)),
      ].join('、'),
      affectedSlots: costBreached.length,
      affectedSkus: costBreached.length,
      decisionOptions: [
        '降低材料等级',
        '共用大底',
        '提高目标价格带',
        '申请成本豁免',
      ],
      recommendedOption: '共用大底',
      owner: '成本控制',
      dueDate: '',
      status: 'open',
      jumpModule: 'productArchitecture',
    });
  }

  // New tooling over budget
  const newToolingBudget = 6;
  if (architecture.summary.newToolingCount > newToolingBudget) {
    items.push({
      riskId: 'risk-tooling',
      riskType: '新模超预算',
      riskObject: `新开模 ${architecture.summary.newToolingCount} 套超预算 ${newToolingBudget} 套`,
      affectedSeries: '全局',
      affectedCategory: '全品类',
      affectedSlots: architecture.summary.newToolingCount,
      affectedSkus: architecture.summary.newToolingCount,
      decisionOptions: [
        '延后低优先级新模',
        '共用现有底型',
        '合并鞋型',
        '申请新模',
      ],
      recommendedOption: '共用现有底型',
      owner: '开发负责人',
      dueDate: '',
      status: 'open',
      jumpModule: 'productArchitecture',
    });
  }

  // Missing outsole
  const noOutsole = activeStyles.filter((s) => !s.style.outsole);
  if (noOutsole.length > 0) {
    items.push({
      riskId: 'risk-outsole',
      riskType: '缺少底型',
      riskObject: `${noOutsole.length} 款尚未指定底型`,
      affectedSeries: '多系列',
      affectedCategory: [
        ...new Set(noOutsole.map((s) => s.style.categoryName)),
      ].join('、'),
      affectedSlots: noOutsole.length,
      affectedSkus: noOutsole.length,
      decisionOptions: ['从现有底型平台选择', '立项新底型', '延后款位'],
      recommendedOption: '从现有底型平台选择',
      owner: '产品开发',
      dueDate: '',
      status: 'open',
      jumpModule: 'productArchitecture',
    });
  }

  // Missing last
  const noLast = activeStyles.filter((s) => !s.style.last);
  if (noLast.length > 0) {
    items.push({
      riskId: 'risk-last',
      riskType: '缺少楦型',
      riskObject: `${noLast.length} 款尚未指定楦型`,
      affectedSeries: '多系列',
      affectedCategory: [
        ...new Set(noLast.map((s) => s.style.categoryName)),
      ].join('、'),
      affectedSlots: noLast.length,
      affectedSkus: noLast.length,
      decisionOptions: ['从现有楦型平台选择', '立项新楦型', '合并楦型'],
      recommendedOption: '从现有楦型平台选择',
      owner: '产品开发',
      dueDate: '',
      status: 'open',
      jumpModule: 'productArchitecture',
    });
  }

  // Delayed gates → wave risk
  const delayedGates = gateNodes.filter((g) => g.delayed && !g.completed);
  if (delayedGates.length > 0) {
    items.push({
      riskId: 'risk-wave',
      riskType: '波段上市风险',
      riskObject: `${delayedGates.length} 个 Gate 延期`,
      affectedSeries: '多系列',
      affectedCategory: '全品类',
      affectedSlots: delayedGates.length,
      affectedSkus: delayedGates.length,
      decisionOptions: ['重新排期', '减少输出物要求', '延后波段', '加派资源'],
      recommendedOption: '重新排期',
      owner: 'PMC',
      dueDate: delayedGates[0]?.plannedDate ?? '',
      status: 'in_progress',
      jumpModule: 'developmentGateTable',
    });
  }

  // Blocked styles
  const blocked = activeStyles.filter((s) => s.style.blocked);
  if (blocked.length > 0) {
    items.push({
      riskId: 'risk-blocked',
      riskType: '设计任务未生成',
      riskObject: `${blocked.length} 款被阻塞，设计任务无法推进`,
      affectedSeries: [
        ...new Set(
          blocked
            .map((s) => s.series?.seriesName ?? '')
            .filter(Boolean),
        ),
      ].join('、'),
      affectedCategory: [
        ...new Set(blocked.map((s) => s.style.categoryName)),
      ].join('、'),
      affectedSlots: blocked.length,
      affectedSkus: blocked.length,
      decisionOptions: ['解除阻塞原因', '重新指定负责人', '取消款位'],
      recommendedOption: '解除阻塞原因',
      owner: blocked[0]?.style.owner ?? '—',
      dueDate: blocked[0]?.style.dueDate ?? '',
      status: 'open',
      jumpModule: 'developmentTaskPool',
    });
  }

  return items;
}
