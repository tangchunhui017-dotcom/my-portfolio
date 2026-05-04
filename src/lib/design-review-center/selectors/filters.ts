import { STAGE_LABELS } from '@/config/design-review-center/labels';
import type { DesignReviewCenterData } from '@/lib/design-review-center/assembler';
import { getQuarterFromLaunchWindow, uniqueValues } from '@/lib/design-review-center/helpers/date';
import { resolveFootwearCategoryLevels } from '@/lib/design-review-center/helpers/taxonomy';
import { buildProductArchitectureComputation } from '@/lib/design-review-center/selectors/architecture';
import { createOverview } from '@/lib/design-review-center/selectors/overview';
import type { DesignReviewFilterOptions, DesignReviewFilters, ProductArchitectureView, SeriesAggregate, StyleAggregate } from '@/lib/design-review-center/types';

export const DEFAULT_DESIGN_REVIEW_FILTERS: DesignReviewFilters = {
  brand: '',
  year: '',
  quarter: '',
  wave: '',
  categoryL1: '',
  categoryL2: '',
  series: '',
  owner: '',
  stage: '',
};

export interface FilteredDesignReviewCenterData {
  projects: DesignReviewCenterData['projects'];
  waves: DesignReviewCenterData['waves'];
  series: SeriesAggregate[];
  styles: StyleAggregate[];
  categoryPlans: DesignReviewCenterData['categoryPlans'];
  otbStructures: DesignReviewCenterData['otbStructures'];
  gateNodes: DesignReviewCenterData['gateNodes'];
  assets: DesignReviewCenterData['assets'];
  reviewRecords: DesignReviewCenterData['reviewRecords'];
  actionItems: DesignReviewCenterData['actionItems'];
  overview: ReturnType<typeof createOverview>;
  architecture: ProductArchitectureView;
  filterOptions: DesignReviewFilterOptions;
}

function matchesCategoryFilters(style: StyleAggregate, filters: DesignReviewFilters) {
  const category = resolveFootwearCategoryLevels(style.style.categoryName);
  if (filters.categoryL1 && category.categoryL1 !== filters.categoryL1) return false;
  if (filters.categoryL2 && category.categoryL2 !== filters.categoryL2) return false;
  return true;
}

function getScopedStyleAggregates(data: DesignReviewCenterData, filters: DesignReviewFilters) {
  return Object.values(data.derived.byStyle).filter((aggregate) => {
    const projectYear = aggregate.project?.year ?? '';
    const projectQuarter = aggregate.project?.quarter ?? getQuarterFromLaunchWindow(aggregate.wave?.launchWindow ?? '');

    if (filters.brand && aggregate.project?.brandName !== filters.brand) return false;
    if (filters.year && projectYear !== filters.year) return false;
    if (filters.quarter && projectQuarter !== filters.quarter) return false;
    if (filters.wave && aggregate.style.waveId !== filters.wave) return false;
    if (filters.series && aggregate.style.seriesId !== filters.series) return false;
    if (!matchesCategoryFilters(aggregate, filters)) return false;
    if (filters.owner && aggregate.style.owner !== filters.owner && aggregate.series?.owner !== filters.owner) return false;
    if (filters.stage && aggregate.style.currentStage !== filters.stage) return false;

    return true;
  });
}

function mapCategoryOption(style: StyleAggregate) {
  return resolveFootwearCategoryLevels(style.style.categoryName);
}

export function getScopedFilterOptions(data: DesignReviewCenterData, filters: DesignReviewFilters): DesignReviewFilterOptions {
  const allStyles = Object.values(data.derived.byStyle);
  const brandScoped = allStyles.filter((aggregate) => !filters.brand || aggregate.project?.brandName === filters.brand);
  const yearScoped = brandScoped.filter((aggregate) => !filters.year || aggregate.project?.year === filters.year);
  const quarterScoped = yearScoped.filter((aggregate) => !filters.quarter || (aggregate.project?.quarter ?? getQuarterFromLaunchWindow(aggregate.wave?.launchWindow ?? '')) === filters.quarter);
  const waveScoped = quarterScoped.filter((aggregate) => !filters.wave || aggregate.style.waveId === filters.wave);
  const seriesScoped = waveScoped.filter((aggregate) => !filters.series || aggregate.style.seriesId === filters.series);
  const categoryL1Scoped = seriesScoped.filter((aggregate) => !filters.categoryL1 || mapCategoryOption(aggregate).categoryL1 === filters.categoryL1);
  const categoryL2Scoped = categoryL1Scoped.filter((aggregate) => !filters.categoryL2 || mapCategoryOption(aggregate).categoryL2 === filters.categoryL2);

  return {
    brands: uniqueValues(data.projects.map((project) => project.brandName)).map((value) => ({ value, label: value })),
    years: uniqueValues(brandScoped.map((aggregate) => aggregate.project?.year ?? '')).filter(Boolean).sort().map((value) => ({ value, label: `${value}年` })),
    quarters: uniqueValues(yearScoped.map((aggregate) => aggregate.project?.quarter ?? getQuarterFromLaunchWindow(aggregate.wave?.launchWindow ?? '')))
      .filter(Boolean)
      .sort()
      .map((value) => ({ value, label: value })),
    waves: uniqueValues(quarterScoped.map((aggregate) => aggregate.style.waveId)).map((value) => ({
      value,
      label: data.waves.find((wave) => wave.waveId === value)?.waveName ?? value,
    })),
    categoryL1s: uniqueValues(seriesScoped.map((aggregate) => mapCategoryOption(aggregate).categoryL1)).map((value) => ({ value, label: value })),
    categoryL2s: uniqueValues(categoryL1Scoped.map((aggregate) => mapCategoryOption(aggregate).categoryL2)).map((value) => ({ value, label: value })),
    series: uniqueValues(waveScoped.map((aggregate) => aggregate.style.seriesId)).map((value) => ({
      value,
      label: data.series.find((series) => series.seriesId === value)?.seriesName ?? value,
    })),
    owners: uniqueValues(categoryL2Scoped.flatMap((aggregate) => [aggregate.style.owner, aggregate.series?.owner].filter(Boolean) as string[])).map((value) => ({ value, label: value })),
    stages: Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label })),
  };
}

export function filterDesignReviewCenterData(
  data: DesignReviewCenterData,
  filters: DesignReviewFilters,
): FilteredDesignReviewCenterData {
  const styles = getScopedStyleAggregates(data, filters);
  const styleIds = new Set(styles.map((aggregate) => aggregate.style.styleId));
  const seriesIds = new Set(styles.map((aggregate) => aggregate.style.seriesId));
  const projectIds = new Set(styles.map((aggregate) => aggregate.style.projectId));
  const categoryPlanIds = new Set(styles.map((aggregate) => aggregate.style.categoryPlanId));
  const categoryNames = new Set(styles.map((aggregate) => aggregate.style.categoryName));
  const waveIds = new Set(styles.map((aggregate) => aggregate.style.waveId));
  const rawSeries = data.series.filter((series) => seriesIds.has(series.seriesId));
  const rawCategoryPlans = data.categoryPlans.filter((plan) => categoryPlanIds.has(plan.categoryPlanId));
  const rawStyles = styles.map((aggregate) => aggregate.style);
  const rawWaves = data.waves.filter((wave) => waveIds.has(wave.waveId));
  const rawProjects = data.projects.filter((project) => projectIds.has(project.projectId));
  const rawOTBStructures = data.otbStructures.filter((record) => seriesIds.has(record.seriesId) && categoryNames.has(record.categoryName));
  const filteredGateNodes = data.gateNodes.filter((gate) => styleIds.has(gate.styleId));
  const filteredReviewRecords = data.reviewRecords.filter((record) => styleIds.has(record.styleId));
  const filteredActionItems = data.actionItems.filter((item) => styleIds.has(item.styleId));
  const architecture = buildProductArchitectureComputation({
    otbStructures: rawOTBStructures,
    projects: rawProjects,
    waves: rawWaves,
    series: rawSeries,
    categoryPlans: rawCategoryPlans,
    styles: rawStyles,
  }).view;

  return {
    projects: rawProjects,
    waves: rawWaves,
    series: Object.values(data.derived.bySeries).filter((aggregate) => seriesIds.has(aggregate.series.seriesId)),
    styles,
    categoryPlans: rawCategoryPlans,
    otbStructures: rawOTBStructures,
    gateNodes: filteredGateNodes,
    assets: data.assets.filter((asset) => styleIds.has(asset.styleId)),
    reviewRecords: filteredReviewRecords,
    actionItems: filteredActionItems,
    overview: createOverview(rawStyles, filteredGateNodes, filteredReviewRecords, filteredActionItems, data.referenceDate, architecture.summary),
    architecture,
    filterOptions: getScopedFilterOptions(data, filters),
  };
}
