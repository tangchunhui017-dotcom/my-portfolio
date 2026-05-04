import { STAGE_LABELS } from '@/config/design-review-center/labels';
import { loadActionItems, loadCategoryPlans, loadDesignAssets, loadGateNodes, loadOTBStructures, loadProjects, loadReviewRecords, loadSeries, loadStyleDevelopments, loadWaves } from './loader';
import { getNextGateByStyle } from './selectors/gates';
import { createOverview } from './selectors/overview';
import { getLatestActionByStyle, getLatestReviewByStyle, getOpenActionsByStyle } from './selectors/reviews';
import { buildProductArchitectureComputation } from './selectors/architecture';
import { getQuarterFromLaunchWindow, isPastDue, isSameWeek, pickLatestDate, uniqueValues } from './helpers/date';
import { resolveFootwearCategoryLevels } from './helpers/taxonomy';
import { isHighRisk, normalizeRiskLevel } from './helpers/status';
import type {
  ActionItem,
  ArchitectureSourceSummary,
  Asset,
  CategoryPlan,
  DesignAsset,
  DesignItem,
  DesignReviewFilterOptions,
  DesignReviewOverview,
  GateGroup,
  GateNode,
  Milestone,
  MilestoneCheckpointType,
  MilestoneTrack,
  OTBStructure,
  ProductArchitectureRecordView,
  ProductArchitectureView,
  Project,
  ReviewRecord,
  Risk,
  Series,
  SeriesAggregate,
  SeriesBrief,
  SeriesDevelopmentPlanRow,
  SeriesWithBrief,
  StyleAggregate,
  StyleDevelopment,
  StyleTaskRow,
  Task,
  ThemeStrategyRecord,
  Timeline,
  Wave,
  WaveAggregate,
} from './types';

export interface DesignReviewCenterDerived {
  overview: DesignReviewOverview;
  architecture: ProductArchitectureView;
  filterOptions: DesignReviewFilterOptions;
  bySeries: Record<string, SeriesAggregate>;
  byStyle: Record<string, StyleAggregate>;
  byWave: Record<string, WaveAggregate>;
}

export interface DesignReviewCenterData {
  referenceDate: string;
  projects: Project[];
  waves: Wave[];
  series: Series[];
  categoryPlans: CategoryPlan[];
  styles: StyleDevelopment[];
  otbStructures: OTBStructure[];
  gateNodes: GateNode[];
  assets: DesignAsset[];
  reviewRecords: ReviewRecord[];
  actionItems: ActionItem[];
  timeline: Timeline;
  derived: DesignReviewCenterDerived;
}

function parsePricePoint(priceBand: string) {
  const matched = priceBand.match(/(\d+)-(\d+)/);
  if (!matched) return 0;
  return Math.round((Number(matched[1]) + Number(matched[2])) / 2);
}

function mapGateTrack(group: GateGroup): MilestoneTrack {
  if (group === 'cost') return 'cost_track';
  if (group === 'development' || group === 'launch') return 'development_track';
  return 'design_track';
}

function mapGateCheckpoint(group: GateGroup): MilestoneCheckpointType {
  if (group === 'planning' || group === 'design') return 'review';
  if (group === 'cost') return 'cost';
  if (group === 'launch') return 'lock';
  return 'tooling';
}

function deriveMilestoneStatus(gate: GateNode): Milestone['status'] {
  if (gate.completed) return 'completed';
  if (gate.blocked) return 'at_risk';
  if (gate.delayed) return 'delayed';
  return 'in_progress';
}

function deriveMilestoneRisk(gate: GateNode): Milestone['riskLevel'] {
  if (gate.blocked) return 'blocking';
  if (gate.delayed) return 'high';
  if (gate.completed) return 'low';
  return 'medium';
}

function mapAssetType(assetType: DesignAsset['assetType']): Asset['assetType'] {
  if (assetType === 'material_board') return 'material';
  if (assetType === 'color_board') return 'color';
  if (assetType === 'outsole_board' || assetType === 'last_board') return 'outsole';
  return 'effect';
}

function mapVersionStage(assetType: DesignAsset['assetType']): Asset['versionStage'] {
  if (assetType === 'concept_sketch') return 'sketch';
  if (assetType === 'effect_render' || assetType === 'rendering') return 'render';
  if (assetType === 'first_sample_photo' || assetType === 'second_sample_photo') return 'first_sample';
  if (assetType === 'final_sample_photo') return 'final_sample';
  return null;
}

function mapTaskType(actionType: string): Task['taskType'] {
  if (actionType.includes('材料') || actionType.includes('工厂')) return 'sourcing';
  if (actionType.includes('样') || actionType.includes('评审')) return 'sample';
  return 'design';
}

function mapTaskGroup(actionType: string): Task['taskGroup'] {
  if (actionType.includes('成本')) return 'cost';
  if (actionType.includes('工厂') || actionType.includes('Tech Pack') || actionType.includes('结构')) return 'development';
  return 'design';
}

function mapTaskStatus(status: ActionItem['status']) {
  if (status === 'completed' || status === 'reviewed' || status === 'closed') return 'completed';
  if (status === 'in_progress') return 'in_progress';
  return 'pending';
}

function createSeriesBrief(series: Series, project: Project | null, categoryPlans: CategoryPlan[]): SeriesBrief {
  return {
    seriesId: series.seriesId,
    season: project?.season ?? project?.year ?? '',
    waveId: series.waveId,
    designConcept: series.themeDirection,
    consumerScene: series.usageScenarios.join(' / '),
    styleKeywords: series.styleKeywords,
    silhouetteDirections: series.lastDirections,
    upperConstructionKeywords: series.designLanguages,
    outsoleDirections: series.soleDirections,
    benchmarkReferences: series.themeKeywords.slice(0, 4),
    reviewFocus: [...series.designLanguages.slice(0, 2), ...series.materialDirections.slice(0, 2)],
    materialPackage: {
      primary: series.materialDirections.slice(0, 2),
      accent: series.materialDirections.slice(2, 4),
    },
    colorPackage: {
      base: series.colorDirections.slice(0, 2),
      accent: series.colorDirections.slice(2, 4),
    },
    plannedSkuCount: categoryPlans.reduce((total, item) => total + item.skuTarget, 0),
  };
}

function createLegacyAsset(style: StyleDevelopment, asset: DesignAsset): Asset {
  const tags = uniqueValues([...asset.materialPlan, ...asset.colorPlan, asset.outsole, asset.last]);

  return {
    assetId: asset.assetId,
    assetType: mapAssetType(asset.assetType),
    seriesId: style.seriesId,
    title: `${style.styleDisplayName} v${asset.versionNumber}`,
    description: asset.summary,
    fileUrl: asset.imageUrl,
    thumbnailUrl: asset.imageUrl,
    tags,
    uploadedBy: style.owner,
    uploadedAt: asset.uploadedAt,
    featuredInReport: style.leadStyle || asset.isLatest,
    relatedItemId: style.styleId,
    comparisonGroupId: style.styleId,
    versionStage: mapVersionStage(asset.assetType),
    versionNo: asset.versionNumber,
    capturedAt: asset.uploadedAt,
    selectedForReview: asset.isLatest,
    bomSummary: asset.materialPlan,
    cmfSummary: asset.colorPlan,
    estimatedCost: style.targetCost,
    source: style.source,
    sourceId: style.sourceId,
    syncStatus: style.syncStatus,
  };
}

function createLegacyItem(style: StyleDevelopment, series: Series | null, project: Project | null): DesignItem {
  const createdAt = new Date(new Date(style.updatedAt).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    itemId: style.styleId,
    seriesId: style.seriesId,
    seriesName: series?.seriesName,
    waveId: style.waveId,
    itemName: style.styleDisplayName,
    skuCode: style.skuCode,
    productRole: style.developmentRole,
    category: style.categoryName,
    occasion: series?.occasion ?? series?.usageScenarios?.join(' / ') ?? '',
    designStatus: style.currentStage,
    reviewStatus: style.reviewStatus,
    riskLevel: style.riskLevel,
    nextReviewDate: style.nextReviewDate,
    updatedBy: style.owner,
    outputPath: null,
    reviewSummary: style.designSummary,
    targetCostEstimate: style.targetCost,
    sampleQuotedCost: style.quotedCost,
    finalLockedCost: style.lockedCost,
    techPackStatus: style.techPackStatus === 'pending_review' ? 'in_progress' : style.techPackStatus,
    toolingStatus: style.toolingStatus === 'pending_review' ? 'in_progress' : style.toolingStatus,
    toolingNotes: style.nextAction,
    colorway: style.colorPlan.join(' / '),
    material: style.materialPlan.join(' / '),
    pricePoint: parsePricePoint(series?.priceBand ?? ''),
    targetLaunchDate: project?.targetLaunchDate ?? style.dueDate,
    designer: style.owner,
    thumbnailUrl: style.thumbnailUrl,
    designNotes: style.designSummary,
    createdAt,
    updatedAt: style.updatedAt,
    source: style.source,
    sourceId: style.sourceId,
    syncStatus: style.syncStatus,
  };
}

function createLegacyDevelopmentPlan(style: StyleDevelopment, assetIds: string[]): SeriesDevelopmentPlanRow {
  return {
    rowId: `plan-${style.styleId}`,
    seriesId: style.seriesId,
    weekLabel: style.waveId.toUpperCase(),
    skuCode: style.skuCode,
    itemName: style.styleDisplayName,
    category: style.categoryName,
    productRole: style.developmentRole,
    silhouette: style.last,
    upperConstruction: style.materialPlan.join(' / '),
    outsoleDirection: style.outsole,
    materialFocus: style.materialPlan.join(' / '),
    colorDirection: style.colorPlan.join(' / '),
    referenceAssetIds: assetIds,
    reviewFocus: style.nextAction,
    phase: style.currentStage,
  };
}

function createArchitectureSourceSummary(platformSummary: string, styleTarget: number, skuTarget: number, budgetShare: number, themeColorHex: string): ArchitectureSourceSummary {
  return {
    styleTarget,
    skuTarget,
    platformSummary,
    budgetShare,
    themeColorHex,
  };
}

function createStyleTaskRow(
  styleAggregate: Omit<StyleAggregate, 'taskRow'>,
  referenceDate: string,
  architectureSource: ArchitectureSourceSummary | null,
): StyleTaskRow {
  const latestAction = getLatestActionByStyle(styleAggregate.style.styleId, styleAggregate.actionItems);
  const overdue = isPastDue(styleAggregate.style.dueDate, referenceDate) || styleAggregate.openActions.some((item) => isPastDue(item.dueDate, referenceDate));
  const dueThisWeek = isSameWeek(styleAggregate.style.dueDate, referenceDate) || styleAggregate.openActions.some((item) => isSameWeek(item.dueDate, referenceDate));
  const pendingReview = styleAggregate.reviewRecords.some((record) => !record.closed) || styleAggregate.style.reviewStatus === 'review';

  return {
    styleId: styleAggregate.style.styleId,
    skuCode: styleAggregate.style.skuCode,
    styleName: styleAggregate.style.styleDisplayName,
    seriesId: styleAggregate.style.seriesId,
    seriesName: styleAggregate.series?.seriesName ?? styleAggregate.style.seriesId,
    categoryName: styleAggregate.style.categoryName,
    waveId: styleAggregate.style.waveId,
    developmentRole: styleAggregate.style.developmentRole,
    developmentLevel: styleAggregate.style.developmentLevel,
    currentStage: styleAggregate.style.currentStage,
    designStatus: styleAggregate.style.designStatus,
    sampleStatus: styleAggregate.style.sampleStatus,
    materialStatus: styleAggregate.style.materialStatus,
    costStatus: styleAggregate.style.costStatus,
    technicalStatus: styleAggregate.style.technicalStatus,
    owner: styleAggregate.style.owner,
    riskLevel: styleAggregate.style.riskLevel,
    blocked: styleAggregate.style.blocked,
    nextAction: latestAction?.actionDescription ?? styleAggregate.style.nextAction,
    dueDate: styleAggregate.style.dueDate,
    nextReviewDate: styleAggregate.style.nextReviewDate,
    latestAction,
    nextGate: styleAggregate.nextGate,
    latestReview: styleAggregate.latestReview,
    overdue,
    dueThisWeek,
    pendingReview,
    targetCost: styleAggregate.style.targetCost,
    quotedCost: styleAggregate.style.quotedCost,
    lockedCost: styleAggregate.style.lockedCost,
    thumbnailUrl: styleAggregate.style.thumbnailUrl,
    architectureSource,
  };
}

function createSeriesRisks(series: Series, styleAggregates: StyleAggregate[]): Risk[] {
  const risks: Risk[] = [];

  styleAggregates.forEach((aggregate) => {
    const style = aggregate.style;
    if (isHighRisk(style.riskLevel) || style.blocked) {
      risks.push({
        riskId: `risk-${style.styleId}`,
        seriesId: series.seriesId,
        riskType: style.blocked ? 'supply_chain' : 'design',
        priority: normalizeRiskLevel(style.riskLevel),
        title: `${style.styleDisplayName} 风险预警`,
        description: style.designSummary,
        impact: aggregate.nextGate?.gateName ?? '影响后续评审与波段节奏',
        likelihood: style.blocked ? '高' : '中',
        mitigation: style.nextAction,
        owner: style.owner,
        status: style.blocked ? 'in_progress' : 'monitoring',
        identifiedAt: style.updatedAt,
        dueDate: style.dueDate,
        updatedAt: style.updatedAt,
        source: style.source,
        sourceId: style.sourceId,
        syncStatus: style.syncStatus,
      });
    }

    aggregate.gateNodes.filter((gate) => gate.delayed).forEach((gate) => {
      risks.push({
        riskId: `risk-${gate.gateId}`,
        seriesId: series.seriesId,
        riskType: 'development',
        priority: 'high',
        title: `${gate.gateName} 延期`,
        description: gate.note,
        impact: gate.impactWave,
        likelihood: '高',
        mitigation: '重新排期并确认责任人',
        owner: gate.owner,
        status: 'open',
        identifiedAt: gate.plannedDate,
        dueDate: gate.plannedDate,
        updatedAt: gate.plannedDate,
        source: style.source,
        sourceId: style.sourceId,
        syncStatus: style.syncStatus,
      });
    });
  });

  return risks;
}

function createSeriesTasks(series: Series, styleAggregates: StyleAggregate[]): Task[] {
  return styleAggregates.flatMap((aggregate) =>
    aggregate.actionItems.map((action) => ({
      taskId: action.actionId,
      seriesId: series.seriesId,
      taskType: mapTaskType(action.actionType),
      taskGroup: mapTaskGroup(action.actionType),
      priority: aggregate.style.blocked ? 'blocking' : aggregate.style.riskLevel,
      title: action.actionType,
      description: action.actionDescription,
      assignee: action.owner,
      status: mapTaskStatus(action.status),
      dueDate: action.dueDate,
      estimatedHours: 8,
      actualHours: action.completedAt ? 6 : 0,
      dependencies: [],
      tags: [aggregate.style.skuCode, aggregate.style.categoryName],
      createdAt: aggregate.latestReview?.reviewDate ?? aggregate.style.updatedAt,
      completedAt: action.completedAt ?? undefined,
      updatedAt: action.completedAt ?? aggregate.style.updatedAt,
      source: aggregate.style.source,
      sourceId: aggregate.style.sourceId,
      syncStatus: aggregate.style.syncStatus,
    })),
  );
}

function createThemeStrategyRecord(series: Series, project: Project | null, categoryPlans: CategoryPlan[], styleAggregates: StyleAggregate[]): ThemeStrategyRecord {
  const heroAsset = styleAggregates.flatMap((item) => item.assets).find((asset) => asset.isLatest) ?? null;
  const latestAssets = styleAggregates
    .flatMap((item) => item.assets)
    .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime())
    .slice(0, 4);

  const benchmarkReferences = series.themeKeywords ? series.themeKeywords.slice(0, 4) : [];
  const skuTarget = categoryPlans.reduce((total, item) => total + item.skuTarget, 0);
  const targetCostBand = categoryPlans[0]?.targetCostBand ?? series.priceBand ?? '';
  
  let quotedCostAvg = 0;
  let costDriftAlert = '';
  const maxTargetCostMatched = targetCostBand.match(/(\d+)-(\d+)/);
  const maxTargetCost = maxTargetCostMatched ? Number(maxTargetCostMatched[2]) : 0;
  
  const stylesWithCost = styleAggregates.filter(s => (s.style.quotedCost ?? 0) > 0);
  if (stylesWithCost.length > 0) {
    quotedCostAvg = stylesWithCost.reduce((sum, s) => sum + (s.style.quotedCost ?? 0), 0) / stylesWithCost.length;
    if (maxTargetCost > 0 && quotedCostAvg > maxTargetCost) {
      costDriftAlert = `+¥${Math.round(quotedCostAvg - maxTargetCost)}`;
    }
  }

  const seriesProgress = {
    planning: 'pending', design: 'pending', material: 'pending', sample: 'pending'
  } as ThemeStrategyRecord['seriesProgress'];
  
  if (['completed', 'locked', 'costing_review', 'costing', 'sample_review'].includes(series.currentStatus)) {
    seriesProgress!.planning = 'done';
    seriesProgress!.design = 'done';
    seriesProgress!.material = 'done';
    seriesProgress!.sample = ['completed', 'locked'].includes(series.currentStatus) ? 'done' : 'active';
  } else if (['prototype_review', 'prototype'].includes(series.currentStatus)) {
    seriesProgress!.planning = 'done';
    seriesProgress!.design = 'done';
    seriesProgress!.material = 'active';
  } else if (['concept'].includes(series.currentStatus)) {
    seriesProgress!.planning = 'done';
    seriesProgress!.design = 'active';
  } else {
    seriesProgress!.planning = 'active';
  }
  
  const hasInProgress = styleAggregates.some((s) => s.style.reviewStatus === 'review' || s.style.designStatus === 'in_progress');
  const allApproved = styleAggregates.length > 0 && styleAggregates.every((s) => s.style.reviewStatus === 'pass');
  const reviewDecisionStatus = hasInProgress ? 'in_progress' : allApproved ? 'approved' : 'pending';

  return {
    seriesId: series.seriesId,
    projectId: project?.projectId ?? series.projectId,
    seriesName: series.seriesName,
    themeDirection: series.themeDirection,
    targetConsumer: series.targetConsumer,
    usageScenarios: series.usageScenarios,
    priceBand: series.priceBand,
    targetWave: series.targetWave,
    seriesRole: series.seriesRole,
    categories: uniqueValues(categoryPlans.map((item) => item.categoryName)),
    designLanguages: series.designLanguages,
    materialDirections: series.materialDirections,
    colorDirections: series.colorDirections,
    soleDirections: series.soleDirections,
    lastDirections: series.lastDirections,
    heroAsset,
    latestAssets,
    benchmarkReferences,
    skuTarget,
    targetCostBand,
    reviewDecisionStatus,
    brandName: project?.brandName,
    year: project?.year,
    quarter: project?.quarter,
    owner: series.owner,
    quotedCostAverage: quotedCostAvg,
    costDriftAlert,
    seriesProgress,
  };
}

function createArchitectureRows(series: Series, categoryPlans: CategoryPlan[], styleAggregates: StyleAggregate[]): ProductArchitectureRecordView[] {
  return categoryPlans.map((plan) => {
    const matchedStyles = styleAggregates.filter((item) => item.style.categoryPlanId === plan.categoryPlanId && !item.style.cancelled);

    return {
      seriesId: series.seriesId,
      seriesName: series.seriesName,
      categoryPlanId: plan.categoryPlanId,
      categoryName: plan.categoryName,
      styleTarget: plan.styleTarget,
      skuTarget: plan.skuTarget,
      priceBand: series.priceBand,
      developmentRole: plan.developmentRole,
      developmentLevel: plan.developmentLevel,
      sharedOutsoleStrategy: plan.sharedOutsoleStrategy,
      sharedLastStrategy: plan.sharedLastStrategy,
      toolingNeed: plan.toolingNeed,
      targetWave: plan.targetWave,
      currentStatus: plan.currentStatus,
      activeStyleCount: matchedStyles.length,
      lockedStyleCount: matchedStyles.filter((item) => item.style.locked).length,
      leadStyleCount: matchedStyles.filter((item) => item.style.leadStyle).length,
    };
  });
}

function createFilterOptions(projects: Project[], waves: Wave[], series: Series[], styles: StyleDevelopment[]): DesignReviewFilterOptions {
  const owners = uniqueValues([
    ...projects.map((project) => project.projectOwner),
    ...series.map((record) => record.owner),
  ]);
  const resolvedCategories = styles.map((style) => resolveFootwearCategoryLevels(style.categoryName));

  return {
    brands: uniqueValues(projects.map((project) => project.brandName)).map((value) => ({ value, label: value })),
    years: uniqueValues(projects.map((project) => project.year)).sort().map((value) => ({ value, label: `${value}年` })),
    quarters: uniqueValues([...projects.map((project) => project.quarter), ...waves.map((wave) => getQuarterFromLaunchWindow(wave.launchWindow))])
      .sort()
      .map((value) => ({ value, label: value })),
    waves: waves.map((wave) => ({ value: wave.waveId, label: wave.waveName })),
    categoryL1s: uniqueValues(resolvedCategories.map((item) => item.categoryL1)).map((value) => ({ value, label: value })),
    categoryL2s: uniqueValues(resolvedCategories.map((item) => item.categoryL2)).map((value) => ({ value, label: value })),
    series: series.map((record) => ({ value: record.seriesId, label: record.seriesName })),
    owners: owners.map((value) => ({ value, label: value })),
    stages: Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label })),
  };
}

export async function assembleDesignReviewCenter(): Promise<DesignReviewCenterData> {
  const [projects, waves, series, categoryPlans, styles, otbStructures, gateNodes, assets, reviewRecords, actionItems] = await Promise.all([
    loadProjects(),
    loadWaves(),
    loadSeries(),
    loadCategoryPlans(),
    loadStyleDevelopments(),
    loadOTBStructures(),
    loadGateNodes(),
    loadDesignAssets(),
    loadReviewRecords(),
    loadActionItems(),
  ]);

  const referenceDate = pickLatestDate([
    ...styles.map((style) => style.updatedAt),
    ...assets.map((asset) => asset.uploadedAt),
    ...reviewRecords.map((record) => record.reviewDate),
    ...actionItems.map((item) => item.completedAt ?? item.dueDate),
  ]);

  const architectureComputation = buildProductArchitectureComputation({
    otbStructures,
    projects,
    waves,
    series,
    categoryPlans,
    styles,
  });

  const projectById = Object.fromEntries(projects.map((record) => [record.projectId, record]));
  const seriesById = Object.fromEntries(series.map((record) => [record.seriesId, record]));
  const categoryPlanById = Object.fromEntries(categoryPlans.map((record) => [record.categoryPlanId, record]));
  const waveById = Object.fromEntries(waves.map((record) => [record.waveId, record]));

  const gatesByStyleId = gateNodes.reduce<Record<string, GateNode[]>>((accumulator, gate) => {
    if (!accumulator[gate.styleId]) accumulator[gate.styleId] = [];
    accumulator[gate.styleId].push(gate);
    return accumulator;
  }, {});

  const assetsByStyleId = assets.reduce<Record<string, DesignAsset[]>>((accumulator, asset) => {
    if (!accumulator[asset.styleId]) accumulator[asset.styleId] = [];
    accumulator[asset.styleId].push(asset);
    return accumulator;
  }, {});

  const reviewsByStyleId = reviewRecords.reduce<Record<string, ReviewRecord[]>>((accumulator, record) => {
    if (!accumulator[record.styleId]) accumulator[record.styleId] = [];
    accumulator[record.styleId].push(record);
    return accumulator;
  }, {});

  const actionsByStyleId = actionItems.reduce<Record<string, ActionItem[]>>((accumulator, action) => {
    if (!accumulator[action.styleId]) accumulator[action.styleId] = [];
    accumulator[action.styleId].push(action);
    return accumulator;
  }, {});

  const styleAggregates = styles.map((style) => {
    const project = projectById[style.projectId] ?? null;
    const parentSeries = seriesById[style.seriesId] ?? null;
    const categoryPlan = categoryPlanById[style.categoryPlanId] ?? null;
    const wave = waveById[style.waveId] ?? null;
    const relatedGateNodes = gatesByStyleId[style.styleId] ?? [];
    const relatedAssets = assetsByStyleId[style.styleId] ?? [];
    const relatedReviewRecords = reviewsByStyleId[style.styleId] ?? [];
    const relatedActionItems = actionsByStyleId[style.styleId] ?? [];
    const latestAsset = [...relatedAssets].sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime())[0] ?? null;
    const latestReview = getLatestReviewByStyle(style.styleId, relatedReviewRecords);
    const nextGate = getNextGateByStyle(style.styleId, relatedGateNodes);
    const openActions = getOpenActionsByStyle(style.styleId, relatedActionItems);
    const architectureInput = architectureComputation.byCategoryPlanId[style.categoryPlanId] ?? architectureComputation.bySeriesCategory[`${style.seriesId}:${style.categoryName}`] ?? null;
    const architectureSource = architectureInput
      ? createArchitectureSourceSummary(
          architectureInput.platformStrategies.map((item) => item.label).slice(0, 3).join(' / ') || '平台策略待补充',
          architectureInput.styleTarget,
          architectureInput.skuTarget,
          architectureInput.budgetShare,
          architectureInput.seriesColorHex,
        )
      : null;

    const baseAggregate = {
      style,
      project,
      series: parentSeries,
      categoryPlan,
      wave,
      gateNodes: relatedGateNodes,
      assets: relatedAssets,
      reviewRecords: relatedReviewRecords,
      actionItems: relatedActionItems,
      latestAsset,
      latestReview,
      nextGate,
      openActions,
      legacyItem: createLegacyItem(style, parentSeries, project),
    };

    return {
      ...baseAggregate,
      taskRow: createStyleTaskRow(baseAggregate, referenceDate, architectureSource),
    } satisfies StyleAggregate;
  });

  const styleAggregateById = Object.fromEntries(styleAggregates.map((aggregate) => [aggregate.style.styleId, aggregate]));

  const seriesAggregates = series.map((seriesRecord) => {
    const project = projectById[seriesRecord.projectId] ?? null;
    const wave = waveById[seriesRecord.waveId] ?? null;
    const relatedCategoryPlans = categoryPlans.filter((item) => item.seriesId === seriesRecord.seriesId);
    const relatedStyles = styleAggregates.filter((item) => item.style.seriesId === seriesRecord.seriesId);
    const relatedGateNodes = relatedStyles.flatMap((item) => item.gateNodes);
    const relatedAssets = relatedStyles.flatMap((item) => item.assets);
    const relatedReviewRecords = relatedStyles.flatMap((item) => item.reviewRecords);
    const relatedActionItems = relatedStyles.flatMap((item) => item.actionItems);
    const legacyAssets = relatedStyles.flatMap((item) => item.assets.map((asset) => createLegacyAsset(item.style, asset)));
    const developmentPlan = relatedStyles.map((item) => createLegacyDevelopmentPlan(item.style, item.assets.map((asset) => asset.assetId)));
    const legacySeries: SeriesWithBrief = {
      ...seriesRecord,
      brief: createSeriesBrief(seriesRecord, project, relatedCategoryPlans),
      assets: legacyAssets,
      designItems: relatedStyles.map((item) => item.legacyItem),
      risks: createSeriesRisks(seriesRecord, relatedStyles),
      tasks: createSeriesTasks(seriesRecord, relatedStyles),
      developmentPlan,
    };

    return {
      series: seriesRecord,
      project,
      wave,
      categoryPlans: relatedCategoryPlans,
      styles: relatedStyles,
      gateNodes: relatedGateNodes,
      assets: relatedAssets,
      reviewRecords: relatedReviewRecords,
      actionItems: relatedActionItems,
      themeStrategy: createThemeStrategyRecord(seriesRecord, project, relatedCategoryPlans, relatedStyles),
      architectureRows: createArchitectureRows(seriesRecord, relatedCategoryPlans, relatedStyles),
      legacySeries,
    } satisfies SeriesAggregate;
  });

  const bySeries = Object.fromEntries(seriesAggregates.map((aggregate) => [aggregate.series.seriesId, aggregate]));

  const byWave = Object.fromEntries(
    waves.map((wave) => {
      const relatedSeries = series.filter((record) => record.waveId === wave.waveId);
      const relatedStyles = styles.filter((record) => record.waveId === wave.waveId);
      const relatedStyleIds = new Set(relatedStyles.map((record) => record.styleId));
      return [
        wave.waveId,
        {
          wave,
          series: relatedSeries,
          styles: relatedStyles,
          gateNodes: gateNodes.filter((gate) => relatedStyleIds.has(gate.styleId)),
          reviewRecords: reviewRecords.filter((record) => relatedStyleIds.has(record.styleId)),
          actionItems: actionItems.filter((item) => relatedStyleIds.has(item.styleId)),
        } satisfies WaveAggregate,
      ];
    }),
  );

  const timeline: Timeline = {
    milestones: gateNodes.map((gate) => ({
      milestoneId: gate.gateId,
      title: gate.gateName,
      gateType: gate.gateType,
      track: mapGateTrack(gate.gateGroup),
      checkpointType: mapGateCheckpoint(gate.gateGroup),
      plannedDate: gate.plannedDate,
      actualDate: gate.actualDate,
      status: deriveMilestoneStatus(gate),
      owner: gate.owner,
      riskLevel: deriveMilestoneRisk(gate),
      dependsOn: [],
      source: 'manual',
      sourceId: null,
      updatedBy: gate.owner,
      syncStatus: 'synced',
      outputPath: null,
    })),
  };

  return {
    referenceDate,
    projects,
    waves,
    series,
    categoryPlans,
    styles,
    otbStructures,
    gateNodes,
    assets,
    reviewRecords,
    actionItems,
    timeline,
    derived: {
      overview: createOverview(styles, gateNodes, reviewRecords, actionItems, referenceDate, architectureComputation.view.summary),
      architecture: architectureComputation.view,
      filterOptions: createFilterOptions(projects, waves, series, styles),
      bySeries,
      byStyle: styleAggregateById,
      byWave,
    },
  };
}


