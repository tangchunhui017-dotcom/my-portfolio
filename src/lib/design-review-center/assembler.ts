import type {
  CategoryBreakdownRecord,
  DevelopmentWaveRecord,
  ProductArchitectureRecord,
  SeasonOverview,
  SyncConfig,
  ThemeDirectionRecord,
  Timeline,
  Wave,
  WeeklySnapshot,
  SeriesWithBrief,
} from './types';
import {
  loadAssets,
  loadCategoryBreakdowns,
  loadDesignItemReviews,
  loadDesignItems,
  loadDevelopmentWaveRows,
  loadProductArchitectures,
  loadRisks,
  loadSeasonOverview,
  loadSeries,
  loadSeriesBriefs,
  loadSeriesDevelopmentPlans,
  loadSyncConfig,
  loadTasks,
  loadThemeDirections,
  loadTimeline,
  loadWaves,
  loadWeeklySnapshot,
} from './loader';

export interface DesignReviewCenterData {
  seasonOverview: SeasonOverview;
  timeline: Timeline;
  waves: Wave[];
  weeklySnapshot: WeeklySnapshot;
  syncConfig: SyncConfig;
  series: SeriesWithBrief[];
  themeDirections: ThemeDirectionRecord[];
  productArchitectures: ProductArchitectureRecord[];
  categoryBreakdowns: CategoryBreakdownRecord[];
  developmentWaveRows: DevelopmentWaveRecord[];
}

export async function assembleDesignReviewCenter(): Promise<DesignReviewCenterData> {
  const [
    seasonOverview,
    timeline,
    waves,
    weeklySnapshot,
    syncConfig,
    series,
    seriesBriefs,
    assets,
    designItems,
    designItemReviews,
    risks,
    tasks,
    developmentPlans,
    themeDirections,
    productArchitectures,
    categoryBreakdowns,
    developmentWaveRows,
  ] = await Promise.all([
    loadSeasonOverview(),
    loadTimeline(),
    loadWaves(),
    loadWeeklySnapshot(),
    loadSyncConfig(),
    loadSeries(),
    loadSeriesBriefs(),
    loadAssets(),
    loadDesignItems(),
    loadDesignItemReviews(),
    loadRisks(),
    loadTasks(),
    loadSeriesDevelopmentPlans(),
    loadThemeDirections(),
    loadProductArchitectures(),
    loadCategoryBreakdowns(),
    loadDevelopmentWaveRows(),
  ]);

  const reviewByItemId = new Map(designItemReviews.map((review) => [review.itemId, review]));

  const seriesWithBriefs: SeriesWithBrief[] = series.map((seriesRecord) => {
    const brief = seriesBriefs.find((briefRecord) => briefRecord.seriesId === seriesRecord.seriesId);
    const seriesAssets = assets.filter((asset) => asset.seriesId === seriesRecord.seriesId);
    const seriesDesignItems = designItems
      .filter((item) => item.seriesId === seriesRecord.seriesId)
      .map((item) => ({
        ...item,
        ...reviewByItemId.get(item.itemId),
        seriesName: seriesRecord.seriesName,
        waveId: seriesRecord.waveId,
      }));
    const seriesRisks = risks.filter((risk) => risk.seriesId === seriesRecord.seriesId);
    const seriesTasks = tasks.filter((task) => task.seriesId === seriesRecord.seriesId);
    const seriesDevelopmentPlan = developmentPlans.filter((plan) => plan.seriesId === seriesRecord.seriesId);

    return {
      ...seriesRecord,
      brief,
      assets: seriesAssets,
      designItems: seriesDesignItems,
      risks: seriesRisks,
      tasks: seriesTasks,
      developmentPlan: seriesDevelopmentPlan,
    };
  });

  return {
    seasonOverview,
    timeline,
    waves,
    weeklySnapshot,
    syncConfig,
    series: seriesWithBriefs,
    themeDirections,
    productArchitectures,
    categoryBreakdowns,
    developmentWaveRows,
  };
}