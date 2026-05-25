'use client';

import { useMemo, useState } from 'react';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import type { TrendFilterState, TrendStatus, TrendTheme } from '@/types/trendInsightTypes';
import { DASHBOARD_DEFAULT_BRAND } from '@/config/dashboardFilterStandards';
import { normalizePriceBandKey, PRICE_BAND_LABELS } from '@/config/priceBand';
import {
    MOCK_COLOR_SWATCHES,
    MOCK_HOTSPOTS,
    MOCK_INFO_SOURCES,
    MOCK_MATERIALS,
    MOCK_PATTERNS,
    MOCK_SILHOUETTE,
    MOCK_TREND_SOURCES,
    MOCK_TREND_THEMES,
    TREND_INSIGHT_DATASET_VERSION,
} from '@/data/trendInsightData';


function normalizeText(value: unknown) {
    return String(value ?? '').trim().toLowerCase();
}

function textIncludesAny(source: string, needles: Array<string | number | undefined | null>) {
    const normalizedSource = normalizeText(source);
    return needles.some((needle) => {
        const normalizedNeedle = normalizeText(needle);
        return normalizedNeedle.length > 0 && normalizedSource.includes(normalizedNeedle);
    });
}

function channelMatches(source: string, channel: DashboardFilters['channel_type']) {
    if (channel === 'all') return true;
    const normalizedSource = normalizeText(source);
    const selected = normalizeText(channel);
    if (normalizedSource.includes('全渠道')) return true;
    if (normalizedSource.includes(selected)) return true;
    if (channel === '电商') return /线上|天猫|小红书|抖音|直播/.test(source);
    if (channel === '直播') return /直播|抖音/.test(source);
    if (channel === '直营') return /旗舰|门店|直营/.test(source);
    return false;
}

function trendMatchesDashboardFilters(theme: TrendTheme, dashboardFilters?: DashboardFilters) {
    if (!dashboardFilters) return true;

    const planningText = theme.planningOutput
        .map((row) => `${row.brand} ${row.season} ${row.category} ${row.wave} ${row.productRole} ${row.priceBand} ${row.channel} ${row.skuDepth} ${row.action}`)
        .join(' ');
    const themeText = [
        theme.name,
        theme.subtitle,
        theme.designSuggestion,
        ...theme.keyWords,
        ...theme.shoeTypeApplication,
        ...theme.footwearTranslation.categories,
        ...theme.footwearTranslation.productRoles,
        planningText,
    ].join(' ');

    if (dashboardFilters.brand !== 'all' && dashboardFilters.brand !== DASHBOARD_DEFAULT_BRAND) {
        if (!textIncludesAny(planningText, [dashboardFilters.brand])) return false;
    }

    if (dashboardFilters.season !== 'all' && !textIncludesAny(planningText, [dashboardFilters.season])) return false;

    if (dashboardFilters.category_id !== 'all' && !textIncludesAny(themeText, [dashboardFilters.category_id])) return false;

    if (dashboardFilters.sub_category !== 'all' && !textIncludesAny(themeText, [dashboardFilters.sub_category])) return false;

    if (dashboardFilters.price_band !== 'all') {
        const selectedBand = normalizePriceBandKey(String(dashboardFilters.price_band));
        const selectedLabel = PRICE_BAND_LABELS[selectedBand];
        const hasMatchedBand = theme.planningOutput.some((row) => normalizePriceBandKey(row.priceBand) === selectedBand || row.priceBand.includes(selectedLabel));
        if (!hasMatchedBand) return false;
    }

    if (dashboardFilters.channel_type !== 'all') {
        const hasMatchedChannel = theme.planningOutput.some((row) => channelMatches(row.channel, dashboardFilters.channel_type));
        if (!hasMatchedChannel) return false;
    }

    return true;
}

function getDefaultTrendStatus(theme: TrendTheme): TrendStatus {
    return theme.trendType === '短时流行' ? '快反测试' : theme.defaultStatus;
}

export function useTrendInsightData(dashboardFilters?: DashboardFilters) {
    const [trendStatuses, setTrendStatuses] = useState<Record<string, TrendStatus>>(
        Object.fromEntries(MOCK_TREND_THEMES.map((t) => [t.id, getDefaultTrendStatus(t)]))
    );
    const [selectedThemeId, setSelectedThemeId] = useState<string>(MOCK_TREND_THEMES[0]?.id ?? '');
    const [filters, setFilters] = useState<TrendFilterState>({
        trendSource: '',
        trendCycle: '',
        trendType: '',
        adaptStatus: '',
    });

    function updateTrendStatus(id: string, status: TrendStatus) {
        setTrendStatuses((prev) => ({ ...prev, [id]: status }));
    }

    const filteredThemes = useMemo(() => {
        return MOCK_TREND_THEMES.filter((t) => {
            if (!trendMatchesDashboardFilters(t, dashboardFilters)) return false;
            if (filters.trendSource && t.sourceType !== filters.trendSource) return false;
            if (filters.trendCycle && t.trendCycle !== filters.trendCycle) return false;
            if (filters.trendType && t.trendType !== filters.trendType) return false;
            if (filters.adaptStatus && (trendStatuses[t.id] ?? t.defaultStatus) !== filters.adaptStatus) return false;
            return true;
        });
    }, [dashboardFilters, filters, trendStatuses]);

    const selectedTheme = useMemo<TrendTheme | null>(() => {
        return filteredThemes.find((t) => t.id === selectedThemeId) ?? filteredThemes[0] ?? null;
    }, [filteredThemes, selectedThemeId]);

    return {
        dataVersion: TREND_INSIGHT_DATASET_VERSION,
        // 全局层面数据
        trendSources: MOCK_TREND_SOURCES,
        colorSwatches: MOCK_COLOR_SWATCHES,
        silhouetteDirections: MOCK_SILHOUETTE,
        materialDirections: MOCK_MATERIALS,
        patternDetails: MOCK_PATTERNS,
        hotspots: MOCK_HOTSPOTS,
        infoSources: MOCK_INFO_SOURCES,
        // 趋势主题数据（TrendTheme 兼容 MacroTrend 接口）
        macroTrends: MOCK_TREND_THEMES,  // backward compat
        themes: MOCK_TREND_THEMES,
        filteredThemes,
        selectedThemeId,
        setSelectedThemeId,
        selectedTheme,
        // 筛选
        filters,
        setFilters,
        // 状态管理
        trendStatuses,
        updateTrendStatus,
    };
}
