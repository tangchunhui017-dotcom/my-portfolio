import { startOfDay } from '@/lib/design-review-center/helpers/date';
import type { AssetType, ReviewConclusion, RiskLevel, Stage, StyleAggregate } from '@/lib/design-review-center/types';

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

      return {
        styleId: aggregate.style.styleId,
        skuCode: aggregate.style.skuCode,
        styleName: aggregate.style.styleDisplayName,
        seriesName: aggregate.series?.seriesName ?? aggregate.style.seriesId,
        categoryName: aggregate.style.categoryName,
        waveId: aggregate.style.waveId,
        targetCost: aggregate.style.targetCost,
        currentStage: aggregate.style.currentStage,
        reviewConclusion: aggregate.latestReview?.conclusion ?? null,
        riskLevel: aggregate.style.riskLevel,
        blocked: aggregate.style.blocked,
        latestVersionNumber: versions[0]?.versionNumber ?? 0,
        latestUpdatedAt: versions[0]?.uploadedAt ?? null,
        versions,
      };
    })
    .sort((left, right) => {
      if (left.blocked !== right.blocked) return left.blocked ? -1 : 1;
      return startOfDay(right.latestUpdatedAt) - startOfDay(left.latestUpdatedAt);
    });
}
