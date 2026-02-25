'use client';

import { useMemo } from 'react';
import { CompareMode, DashboardFilters, DEFAULT_FILTERS } from '@/hooks/useDashboardFilter';
import seasonWaveCalendarRaw from '@/../data/taxonomy/season_wave_calendar.json';
import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import {
    FOOTWEAR_CATEGORY_OPTIONS,
    FOOTWEAR_SUB_CATEGORY_BY_L1,
    FOOTWEAR_SUB_CATEGORY_OPTIONS,
} from '@/config/categoryMapping';
import { getPriceBandOptionList } from '@/config/priceBand';

interface FilterBarProps {
    filters: DashboardFilters;
    setFilters: (f: DashboardFilters) => void;
    filterSummary: string;
    compareMode: CompareMode;
    onCompareModeChange: (mode: CompareMode) => void;
}

const YEARS = [2025, 2024, 2023];
const SEASONS = ['Q1', 'Q2', 'Q3', 'Q4'];
const WAVES = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08', 'W09', 'W10', 'W11', 'W12'];
const CHANNEL_TYPES = ['电商', '直营', '加盟', 'KA'];
const PRICE_BANDS = getPriceBandOptionList();
const LIFECYCLES = ['新品', '常青', '清仓'];

interface SeasonWaveCalendarWave {
    code: string;
    label: string;
    month_range: [number, number];
    dashboard_wave_hints: string[];
}

interface SeasonWaveCalendarSeason {
    season_id: string;
    season_label: string;
    month_range: [number, number];
    cross_year: boolean;
    dashboard_season_hint: string;
    waves: SeasonWaveCalendarWave[];
}

interface SeasonWaveCalendarSchema {
    seasons: SeasonWaveCalendarSeason[];
}

interface DimSkuRecord {
    category_l2?: string;
}

const seasonWaveCalendar = seasonWaveCalendarRaw as unknown as SeasonWaveCalendarSchema;
const dimSku = dimSkuRaw as unknown as DimSkuRecord[];

const WAVE_OPTIONS_BY_SEASON_HINT: Record<string, string[]> = seasonWaveCalendar.seasons.reduce(
    (acc, season) => {
        const waveHints = season.waves.flatMap((wave) => wave.dashboard_wave_hints);
        acc[season.dashboard_season_hint] = Array.from(new Set(waveHints));
        return acc;
    },
    {} as Record<string, string[]>,
);

const LANDED_SUB_CATEGORY_SET = new Set(
    dimSku
        .map((row) => String(row.category_l2 || '').trim())
        .filter((value) => value.length > 0),
);

function buildSubCategoryOption(subCategory: string) {
    const landed = LANDED_SUB_CATEGORY_SET.has(subCategory);
    return {
        value: subCategory,
        label: landed ? `${subCategory} ·` : subCategory,
        landed,
    };
}

const SUB_CATEGORY_BY_CATEGORY: Record<string, { value: string; label: string; landed?: boolean }[]> = Object.entries(
    FOOTWEAR_SUB_CATEGORY_BY_L1,
).reduce((acc, [categoryL1, subCategories]) => {
    acc[categoryL1] = subCategories.map((subCategory) => buildSubCategoryOption(subCategory));
    return acc;
}, {} as Record<string, { value: string; label: string; landed?: boolean }[]>);

const ALL_SUB_CATEGORY_OPTIONS = FOOTWEAR_SUB_CATEGORY_OPTIONS.map((subCategory) =>
    buildSubCategoryOption(subCategory),
);

const COMPARE_MODE_OPTIONS: CompareMode[] = ['none', 'plan', 'mom', 'yoy'];
const COMPARE_MODE_LABELS: Record<CompareMode, string> = {
    none: '无对比',
    plan: 'vs 计划',
    mom: '环比上季',
    yoy: '同比去年',
};

export default function FilterBar({
    filters,
    setFilters,
    filterSummary,
    compareMode,
    onCompareModeChange,
}: FilterBarProps) {
    const waveOptions = useMemo(() => {
        if (filters.season === 'all') return WAVES;
        const mappedWaves = WAVE_OPTIONS_BY_SEASON_HINT[filters.season];
        if (!mappedWaves || mappedWaves.length === 0) return WAVES;
        return mappedWaves;
    }, [filters.season]);

    const subCategoryOptions = useMemo(() => {
        if (filters.category_id === 'all') return ALL_SUB_CATEGORY_OPTIONS;
        return SUB_CATEGORY_BY_CATEGORY[filters.category_id] || [];
    }, [filters.category_id]);

    const update = (key: keyof DashboardFilters, value: string | number | 'all') => {
        setFilters({ ...filters, [key]: value });
    };

    const updateSeason = (value: string) => {
        const nextWaveOptions = value === 'all' ? WAVES : WAVE_OPTIONS_BY_SEASON_HINT[value] || WAVES;
        const nextFilters: DashboardFilters = { ...filters, season: value };
        if (filters.wave !== 'all' && !nextWaveOptions.includes(filters.wave)) {
            nextFilters.wave = 'all';
        }
        setFilters(nextFilters);
    };

    const updateCategory = (value: string) => {
        const nextSubCategoryOptions =
            value === 'all' ? ALL_SUB_CATEGORY_OPTIONS : (SUB_CATEGORY_BY_CATEGORY[value] || []);

        const nextFilters: DashboardFilters = { ...filters, category_id: value };
        if (
            filters.sub_category !== 'all' &&
            !nextSubCategoryOptions.some((opt) => opt.value === filters.sub_category)
        ) {
            nextFilters.sub_category = 'all';
        }
        setFilters(nextFilters);
    };

    const reset = () => setFilters(DEFAULT_FILTERS);

    return (
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
            <div className="max-w-screen-2xl mx-auto px-6 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <FilterSelect
                            label="年度"
                            value={String(filters.season_year)}
                            onChange={(v) => update('season_year', v === 'all' ? 'all' : parseInt(v, 10))}
                            options={[{ value: 'all', label: '全年' }, ...YEARS.map((y) => ({ value: String(y), label: `${y}年` }))]}
                        />

                        <FilterSelect
                            label="季节"
                            value={filters.season}
                            onChange={updateSeason}
                            options={[{ value: 'all', label: '全季' }, ...SEASONS.map((s) => ({ value: s, label: `${s}季` }))]}
                        />

                        <FilterSelect
                            label="波段"
                            value={filters.wave}
                            onChange={(v) => update('wave', v)}
                            options={[{ value: 'all', label: '全波段' }, ...waveOptions.map((w) => ({ value: w, label: w }))]}
                        />

                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        <FilterSelect
                            label="品类"
                            value={filters.category_id}
                            onChange={updateCategory}
                            options={[{ value: 'all', label: '全品类' }, ...FOOTWEAR_CATEGORY_OPTIONS]}
                        />

                        <FilterSelect
                            label="二级品类"
                            value={filters.sub_category}
                            onChange={(v) => update('sub_category', v)}
                            options={[{ value: 'all', label: '全部二级品类' }, ...subCategoryOptions]}
                        />

                        <FilterSelect
                            label="渠道"
                            value={filters.channel_type}
                            onChange={(v) => update('channel_type', v)}
                            options={[{ value: 'all', label: '全渠道' }, ...CHANNEL_TYPES.map((c) => ({ value: c, label: c }))]}
                        />

                        <FilterSelect
                            label="价格带"
                            value={filters.price_band}
                            onChange={(v) => update('price_band', v)}
                            options={[{ value: 'all', label: '全价格带' }, ...PRICE_BANDS.map((b) => ({ value: b.id, label: b.label }))]}
                        />

                        <FilterSelect
                            label="生命周期"
                            value={filters.lifecycle}
                            onChange={(v) => update('lifecycle', v)}
                            options={[{ value: 'all', label: '全周期' }, ...LIFECYCLES.map((l) => ({ value: l, label: l }))]}
                        />

                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        <button
                            onClick={reset}
                            className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1"
                        >
                            <span>↻</span> 重置
                        </button>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                        {COMPARE_MODE_OPTIONS.map((mode) => (
                            <button
                                key={mode}
                                onClick={() => onCompareModeChange(mode)}
                                className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${
                                    compareMode === mode
                                        ? 'bg-white text-pink-600 shadow-sm font-semibold'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {COMPARE_MODE_LABELS[mode]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-400">当前筛选：</span>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{filterSummary}</span>
                </div>
            </div>
        </div>
    );
}

interface FilterSelectProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string; landed?: boolean }[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
    return (
        <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 whitespace-nowrap">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer transition-colors"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

