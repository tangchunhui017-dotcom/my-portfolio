import { getDashboardSeasonByWave, type DashboardSeason } from '@/config/dashboardTime';

export type DashboardLifecycleLabel = '新品' | '次新品' | '老品';

export type DashboardLifecycleFilters = {
    season_year: number | 'all';
    season: string | 'all';
    wave?: string | 'all';
};

export type DashboardLifecycleSkuScope = {
    season_year?: string | number | null;
    season?: string | null;
    lifecycle?: string | null;
};

export const DASHBOARD_LIFECYCLE_OPTIONS: DashboardLifecycleLabel[] = ['新品', '次新品', '老品'];

function parseSkuYear(value: string | number | null | undefined) {
    const year = Number(value);
    return Number.isFinite(year) ? year : null;
}

function resolveAnchorSeason(filters: DashboardLifecycleFilters) {
    if (filters.season !== 'all') return filters.season as DashboardSeason;
    return getDashboardSeasonByWave(filters.wave);
}

function resolveLegacyFallback(rawLifecycle?: string | null): DashboardLifecycleLabel {
    const normalized = String(rawLifecycle || '').toLowerCase();
    if (normalized.includes('新') || normalized.includes('new')) return '新品';
    if (normalized.includes('常青') || normalized.includes('core') || normalized.includes('carry') || normalized.includes('old')) return '老品';
    if (normalized.includes('次新') || normalized.includes('carry') || normalized.includes('过季')) return '次新品';
    return '次新品';
}

export function resolveDashboardLifecycleLabel(
    filters: DashboardLifecycleFilters,
    sku: DashboardLifecycleSkuScope,
): DashboardLifecycleLabel {
    const anchorYear = filters.season_year === 'all' ? 2025 : Number(filters.season_year);
    const anchorSeason = resolveAnchorSeason(filters);
    const skuYear = parseSkuYear(sku.season_year);
    const skuSeason = (sku.season || '') as DashboardSeason | '';

    if (!skuYear) return resolveLegacyFallback(sku.lifecycle);
    if (skuYear <= anchorYear - 2) return '老品';
    if (skuYear === anchorYear - 1) return '次新品';
    if (anchorSeason && skuSeason) {
        return skuSeason === anchorSeason ? '新品' : '次新品';
    }
    return '新品';
}
