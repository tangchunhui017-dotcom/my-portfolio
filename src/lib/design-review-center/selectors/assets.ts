import { startOfDay } from '@/lib/design-review-center/helpers/date';
import type { AssetType, ReviewConclusion, RiskLevel, Stage, StyleAggregate } from '@/lib/design-review-center/types';

export type VersionDecisionStatus =
  | 'ready_for_review'
  | 'missing_assets'
  | 'revision_required'
  | 'blocked'
  | 'approved'
  | 'frozen'
  | 'rejected';

export interface BusinessImpact {
  visualImpact: boolean;
  materialImpact: boolean;
  costImpact: boolean;
  toolingImpact: boolean;
  launchImpact: boolean;
  supplierImpact: boolean;
}

export interface TechnicalCompleteness {
  visualReady: boolean;
  materialReady: boolean;
  outsoleReady: boolean;
  lastReady: boolean;
  bomReady: boolean;
  sampleReady: boolean;
  testReady: boolean;
}

export interface DesignVersionEntry {
  assetId: string;
  versionNumber: number;
  assetType: AssetType;
  imageUrl: string;
  materialPlan: string[];
  colorPlan: string[];
  outsole: string;
  last: string;
  uploadedAt: string;
  isLatest: boolean;
  summary: string;
  deltaNote: string | null;
  targetCost: number | null;
  currentStage: Stage;
  reviewConclusion: ReviewConclusion | null;
  riskLevel: RiskLevel;
  // ── Extended optional fields ──
  changeDriver?: 'design' | 'merch' | 'development' | 'cost' | 'cmf';
  changeDriverNote?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalMeeting?: string;
  physicalSampleUrl?: string | null;
  fitFeedback?: {
    score: number;
    comfort: string;
    appearance: string;
    fit: string;
    tester: string;
    testedAt: string;
  };
  specs?: {
    upperHeight?: number;
    lastGirth?: number;
    soleThickness?: number;
    stitchDensity?: number;
    weight?: number;
  };
  colorway?: {
    id: string;
    name: string;
    primaryColor: string;
    secondaryColors: string[];
  };
}

export interface DesignVersionChain {
  styleId: string;
  skuCode: string;
  styleName: string;
  seriesName: string;
  categoryName: string;
  waveId: string;
  targetCost: number | null;
  currentStage: Stage;
  reviewConclusion: ReviewConclusion | null;
  riskLevel: RiskLevel;
  blocked: boolean;
  latestVersionNumber: number;
  latestUpdatedAt: string | null;
  versions: DesignVersionEntry[];
  // ── Derived fields ──
  latestVersion: DesignVersionEntry | null;
  previousVersion: DesignVersionEntry | null;
  versionDecisionStatus: VersionDecisionStatus;
  versionReadinessScore: number;
  missingRequiredAssets: string[];
  changedFields: string[];
  businessImpact: BusinessImpact;
  technicalCompleteness: TechnicalCompleteness;
  reviewSubmitStatus: 'can_submit' | 'needs_data' | 'must_not_submit';
  recommendedNextAction: string;
}

function computeDerivedChainFields(
  versions: DesignVersionEntry[],
  blocked: boolean,
  reviewConclusion: ReviewConclusion | null,
): Omit<DesignVersionChain, 'styleId' | 'skuCode' | 'styleName' | 'seriesName' | 'categoryName' | 'waveId' | 'targetCost' | 'currentStage' | 'reviewConclusion' | 'riskLevel' | 'blocked' | 'latestVersionNumber' | 'latestUpdatedAt' | 'versions'> {
  const lv = versions.find((v) => v.isLatest) ?? versions[0] ?? null;
  const prev = versions.length > 1 ? versions[1] : null;

  // versionDecisionStatus
  let versionDecisionStatus: VersionDecisionStatus;
  if (blocked) versionDecisionStatus = 'blocked';
  else if (reviewConclusion === 'cancel') versionDecisionStatus = 'rejected';
  else if (reviewConclusion === 'hold') versionDecisionStatus = 'frozen';
  else if (reviewConclusion === 'cost_down' || reviewConclusion === 'structure_adjust' || reviewConclusion === 'material_rework') versionDecisionStatus = 'revision_required';
  else if (reviewConclusion === 'pass' || reviewConclusion === 'pass_with_changes') versionDecisionStatus = 'approved';
  else if (!lv?.imageUrl || (lv?.materialPlan.length ?? 0) === 0) versionDecisionStatus = 'missing_assets';
  else versionDecisionStatus = 'ready_for_review';

  // versionReadinessScore (weighted: effect 15, material/color 15, outsole/last 20, cost/BOM 20, sample/test 20, deltaNote 10)
  let versionReadinessScore = 0;
  if (lv?.imageUrl) versionReadinessScore += 15;
  if ((lv?.materialPlan.length ?? 0) > 0) versionReadinessScore += 7;
  if ((lv?.colorPlan.length ?? 0) > 0) versionReadinessScore += 8;
  if (lv?.outsole) versionReadinessScore += 10;
  if (lv?.last) versionReadinessScore += 10;
  if (lv?.targetCost !== null && lv?.targetCost !== undefined) versionReadinessScore += 20;
  if (versions.some((v) => v.assetType === 'first_sample_photo')) versionReadinessScore += 20;
  if (versions.length <= 1 || lv?.deltaNote) versionReadinessScore += 10;

  // missingRequiredAssets
  const missingRequiredAssets: string[] = [];
  if (!lv?.imageUrl) missingRequiredAssets.push('效果图');
  if ((lv?.materialPlan.length ?? 0) === 0) missingRequiredAssets.push('材料方案');
  if ((lv?.colorPlan.length ?? 0) === 0) missingRequiredAssets.push('配色方案');
  if (!lv?.outsole) missingRequiredAssets.push('底台信息');
  if (!lv?.last) missingRequiredAssets.push('楦型信息');
  if (lv?.targetCost === null || lv?.targetCost === undefined) missingRequiredAssets.push('目标成本');

  // changedFields
  const changedFields: string[] = [];
  if (prev && lv) {
    if (lv.materialPlan.join('|') !== prev.materialPlan.join('|')) changedFields.push('material');
    if (lv.colorPlan.join('|') !== prev.colorPlan.join('|')) changedFields.push('color');
    if (lv.outsole !== prev.outsole) changedFields.push('outsole');
    if (lv.last !== prev.last) changedFields.push('last');
    if (lv.targetCost !== prev.targetCost) changedFields.push('cost');
  }

  // businessImpact
  const businessImpact: BusinessImpact = {
    visualImpact: changedFields.includes('color') || changedFields.includes('outsole'),
    materialImpact: changedFields.includes('material'),
    costImpact: changedFields.includes('cost') || reviewConclusion === 'cost_down',
    toolingImpact: changedFields.includes('outsole') || changedFields.includes('last'),
    launchImpact: blocked || reviewConclusion === 'hold',
    supplierImpact: changedFields.includes('material') || changedFields.includes('outsole'),
  };

  // technicalCompleteness
  const technicalCompleteness: TechnicalCompleteness = {
    visualReady: !!(lv?.imageUrl) || versions.some((v) => v.assetType === 'effect_render' || v.assetType === 'rendering'),
    materialReady: (lv?.materialPlan.length ?? 0) > 0,
    outsoleReady: !!(lv?.outsole) || versions.some((v) => v.assetType === 'outsole_board'),
    lastReady: !!(lv?.last) || versions.some((v) => v.assetType === 'last_board'),
    bomReady: lv?.targetCost !== null && lv?.targetCost !== undefined,
    sampleReady: versions.some((v) => v.assetType === 'first_sample_photo'),
    testReady: false,
  };

  // reviewSubmitStatus
  const criticalMissing = blocked || !lv || !lv.imageUrl || (lv.targetCost === null || lv.targetCost === undefined);
  const softMissing = (lv?.materialPlan.length ?? 0) === 0 || (lv?.colorPlan.length ?? 0) === 0 || (!lv?.deltaNote && versions.length > 1);
  const reviewSubmitStatus: 'can_submit' | 'needs_data' | 'must_not_submit' = criticalMissing ? 'must_not_submit' : softMissing ? 'needs_data' : 'can_submit';

  // recommendedNextAction
  const actionMap: Record<VersionDecisionStatus, string> = {
    blocked: '解除阻塞项，重新评估波段排期',
    rejected: '确认驳回，触发补款流程',
    frozen: '解冻前确认商品企划方向',
    revision_required: '按评审意见修改，重新上版',
    missing_assets: '补充缺失评审资料后提交',
    approved: '生成开发任务，推进样品节点',
    ready_for_review: '提交至评审决议',
  };

  return {
    latestVersion: lv,
    previousVersion: prev,
    versionDecisionStatus,
    versionReadinessScore,
    missingRequiredAssets,
    changedFields,
    businessImpact,
    technicalCompleteness,
    reviewSubmitStatus,
    recommendedNextAction: actionMap[versionDecisionStatus],
  };
}

export function createDesignVersionChains(styleAggregates: StyleAggregate[]): DesignVersionChain[] {
  return styleAggregates
    .filter((aggregate) => aggregate.assets.length > 0)
    .map((aggregate) => {
      const versions = [...aggregate.assets]
        .sort((left, right) => {
          if (right.versionNumber !== left.versionNumber) return right.versionNumber - left.versionNumber;
          return startOfDay(right.uploadedAt) - startOfDay(left.uploadedAt);
        })
        .map((asset) => ({
          assetId: asset.assetId,
          versionNumber: asset.versionNumber,
          assetType: asset.assetType,
          imageUrl: asset.imageUrl,
          materialPlan: asset.materialPlan,
          colorPlan: asset.colorPlan,
          outsole: asset.outsole,
          last: asset.last,
          uploadedAt: asset.uploadedAt,
          isLatest: asset.isLatest,
          summary: asset.summary,
          deltaNote: asset.deltaNote ?? null,
          targetCost: aggregate.style.targetCost,
          currentStage: aggregate.style.currentStage,
          reviewConclusion: aggregate.latestReview?.conclusion ?? null,
          riskLevel: aggregate.style.riskLevel,
        }));

      const reviewConclusion = aggregate.latestReview?.conclusion ?? null;
      const blocked = aggregate.style.blocked;
      const derived = computeDerivedChainFields(versions, blocked, reviewConclusion);

      return {
        styleId: aggregate.style.styleId,
        skuCode: aggregate.style.skuCode,
        styleName: aggregate.style.styleDisplayName,
        seriesName: aggregate.series?.seriesName ?? aggregate.style.seriesId,
        categoryName: aggregate.style.categoryName,
        waveId: aggregate.style.waveId,
        targetCost: aggregate.style.targetCost,
        currentStage: aggregate.style.currentStage,
        reviewConclusion,
        riskLevel: aggregate.style.riskLevel,
        blocked,
        latestVersionNumber: versions[0]?.versionNumber ?? 0,
        latestUpdatedAt: versions[0]?.uploadedAt ?? null,
        versions,
        ...derived,
      };
    })
    .sort((left, right) => {
      if (left.blocked !== right.blocked) return left.blocked ? -1 : 1;
      return startOfDay(right.latestUpdatedAt) - startOfDay(left.latestUpdatedAt);
    });
}
