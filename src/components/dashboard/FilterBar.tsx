'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CompareMode, DashboardFilters, getDefaultDashboardFilters } from '@/hooks/useDashboardFilter';
import type { DashboardCompareMeta } from '@/config/dashboardCompare';
import seasonWaveCalendarRaw from '@/../data/taxonomy/season_wave_calendar.json';
import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import { DASHBOARD_BRAND_OPTIONS, resolveDashboardCategoryL1 } from '@/config/dashboardFilterStandards';
import { FOOTWEAR_CATEGORY_HIERARCHY } from '@/config/footwearTaxonomy';
import { getPriceBandOptionList } from '@/config/priceBand';
import { getDashboardMonthByWave } from '@/config/dashboardTime';

interface FilterBarProps {
    filters: DashboardFilters;
    setFilters: (f: DashboardFilters) => void;
    filterSummary: string;
    compareMode: CompareMode;
    compareMeta: DashboardCompareMeta;
    onCompareModeChange: (mode: CompareMode) => void;
    hideTrigger?: boolean;
}

const YEARS = [2025, 2024, 2023];
const SEASONS = ['Q1', 'Q2', 'Q3', 'Q4'];
const WAVES = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08', 'W09', 'W10', 'W11', 'W12'];
const CHANNEL_TYPES = ['电商', '直营', '加盟', 'KA'];
const LIFECYCLES = ['新品', '次新品', '老品'];
const PRICE_BANDS = getPriceBandOptionList();

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
    category_id?: string;
    category_name?: string;
    category_l2?: string;
    gender?: string;
}

type FilterOption = {
    value: string;
    label: string;
    landed?: boolean;
};

const seasonWaveCalendar = seasonWaveCalendarRaw as unknown as SeasonWaveCalendarSchema;
const dimSku = dimSkuRaw as unknown as DimSkuRecord[];

const WAVE_OPTIONS_BY_SEASON_HINT: Record<string, string[]> = seasonWaveCalendar.seasons.reduce(
    (acc, season) => {
        acc[season.dashboard_season_hint] = Array.from(
            new Set(season.waves.flatMap((wave) => wave.dashboard_wave_hints)),
        );
        return acc;
    },
    {} as Record<string, string[]>,
);

const CATEGORY_L1_LANDED_SET = new Set(
    dimSku
        .map((row) => resolveDashboardCategoryL1(row.gender))
        .filter((value) => value && value !== '其他'),
);

const CATEGORY_L2_LANDED_SET = new Set(
    dimSku
        .map((row) => String(row.category_name || row.category_id || '').trim())
        .filter(Boolean),
);

const CATEGORY_L3_LANDED_SET = new Set(
    dimSku
        .map((row) => String(row.category_l2 || '').trim())
        .filter(Boolean),
);

function appendLandedDot(label: string, landed?: boolean) {
    return landed ? `${label} •` : label;
}

function createOption(value: string, landed = false): FilterOption {
    return {
        value,
        label: appendLandedDot(value, landed),
        landed,
    };
}

function createPlainOption(value: string, label: string): FilterOption {
    return { value, label };
}

function uniqueOptions(values: string[], landedSet?: Set<string>) {
    return Array.from(new Set(values)).map((value) => createOption(value, landedSet?.has(value) ?? false));
}

const BRAND_OPTION_OBJECTS = DASHBOARD_BRAND_OPTIONS.map((option) => createPlainOption(option.value, option.label));
const CATEGORY_L1_OPTION_OBJECTS = FOOTWEAR_CATEGORY_HIERARCHY.map((item) =>
    createOption(item.l1, CATEGORY_L1_LANDED_SET.has(item.l1)),
);
const CATEGORY_L2_BY_L1: Record<string, FilterOption[]> = {};
const CATEGORY_L3_BY_L1: Record<string, FilterOption[]> = {};
const CATEGORY_L3_BY_L2: Record<string, FilterOption[]> = {};

FOOTWEAR_CATEGORY_HIERARCHY.forEach((group) => {
    CATEGORY_L2_BY_L1[group.l1] = uniqueOptions(group.items.map((item) => item.l2), CATEGORY_L2_LANDED_SET);
    CATEGORY_L3_BY_L1[group.l1] = uniqueOptions(group.items.flatMap((item) => item.l3), CATEGORY_L3_LANDED_SET);

    group.items.forEach((item) => {
        const existingValues = (CATEGORY_L3_BY_L2[item.l2] || []).map((option) => option.value);
        CATEGORY_L3_BY_L2[item.l2] = uniqueOptions([...existingValues, ...item.l3], CATEGORY_L3_LANDED_SET);
    });
});

const ALL_CATEGORY_L2_OPTIONS = uniqueOptions(
    FOOTWEAR_CATEGORY_HIERARCHY.flatMap((group) => group.items.map((item) => item.l2)),
    CATEGORY_L2_LANDED_SET,
);

const ALL_CATEGORY_L3_OPTIONS = uniqueOptions(
    FOOTWEAR_CATEGORY_HIERARCHY.flatMap((group) => group.items.flatMap((item) => item.l3)),
    CATEGORY_L3_LANDED_SET,
);

const COMPARE_MODE_OPTIONS: Array<Exclude<CompareMode, 'none'>> = ['plan', 'mom', 'yoy'];
const COMPARE_MODE_LABELS: Record<Exclude<CompareMode, 'none'>, string> = {
    plan: 'vs 计划',
    mom: '环比',
    yoy: '同比',
};
const FILTER_BAR_PIN_STORAGE_KEY = 'dashboard-filter-bar-pinned';
const FILTER_BAR_PIN_STORAGE_EVENT = 'dashboard-filter-bar-pin-change';

const MIN_WIDTH_BY_LABEL: Record<string, number> = {
    品牌: 156,
    一级品类: 144,
    二级品类: 152,
    三级品类: 168,
    年度: 106,
    季节: 96,
    月份: 104,
    渠道: 104,
    价格带: 118,
    库龄层级: 126,
};

function getSelectedLabel(value: string, options: FilterOption[]) {
    return options.find((option) => option.value === value)?.label ?? '';
}

function getCharacterWeight(value: string) {
    return Array.from(value).reduce((total, char) => {
        if (/[\u4e00-\u9fff]/.test(char)) return total + 1;
        return total + 0.55;
    }, 0);
}

function getSelectWidthPx(label: string, value: string, options: FilterOption[]) {
    const displayLabel = getSelectedLabel(value, options) || '全部';
    const base = Math.round(38 + getCharacterWeight(displayLabel) * 18);
    return Math.min(Math.max(MIN_WIDTH_BY_LABEL[label] ?? 104, base), 220);
}

function getCategoryL3Options(categoryL1: DashboardFilters['category_l1'], categoryId: DashboardFilters['category_id']) {
    if (categoryId !== 'all') return CATEGORY_L3_BY_L2[categoryId] || [];
    if (categoryL1 !== 'all') return CATEGORY_L3_BY_L1[categoryL1] || [];
    return ALL_CATEGORY_L3_OPTIONS;
}

function getStoredFilterBarPinnedState() {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(FILTER_BAR_PIN_STORAGE_KEY) === 'true';
}

function setStoredFilterBarPinnedState(nextPinned: boolean) {
    if (typeof window === 'undefined') return;

    if (nextPinned) {
        window.localStorage.setItem(FILTER_BAR_PIN_STORAGE_KEY, 'true');
    } else {
        window.localStorage.removeItem(FILTER_BAR_PIN_STORAGE_KEY);
    }

    window.dispatchEvent(new Event(FILTER_BAR_PIN_STORAGE_EVENT));
}

function subscribeFilterBarPinnedState(onStoreChange: () => void) {
    if (typeof window === 'undefined') return () => { };

    const handleStoreChange = () => onStoreChange();
    window.addEventListener(FILTER_BAR_PIN_STORAGE_EVENT, handleStoreChange);
    window.addEventListener('storage', handleStoreChange);

    return () => {
        window.removeEventListener(FILTER_BAR_PIN_STORAGE_EVENT, handleStoreChange);
        window.removeEventListener('storage', handleStoreChange);
    };
}

export default function FilterBar({
    filters,
    setFilters,
    filterSummary,
    compareMode,
    compareMeta,
    onCompareModeChange,
    hideTrigger = false,
}: FilterBarProps) {
    const isPinned = useSyncExternalStore(subscribeFilterBarPinnedState, getStoredFilterBarPinnedState, () => false);
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isOpen = isPinned || isExpanded;

    const waveOptions = useMemo(() => {
        if (filters.season === 'all') return WAVES;
        return WAVE_OPTIONS_BY_SEASON_HINT[filters.season] || WAVES;
    }, [filters.season]);

    const categoryL2Options = useMemo(() => {
        if (filters.category_l1 === 'all') return ALL_CATEGORY_L2_OPTIONS;
        return CATEGORY_L2_BY_L1[filters.category_l1] || [];
    }, [filters.category_l1]);

    const categoryL3Options = useMemo(
        () => getCategoryL3Options(filters.category_l1, filters.category_id),
        [filters.category_l1, filters.category_id],
    );

    const brandOptions: FilterOption[] = [{ value: 'all', label: '全部品牌' }, ...BRAND_OPTION_OBJECTS];
    const categoryL1Options: FilterOption[] = [{ value: 'all', label: '全部一级品类' }, ...CATEGORY_L1_OPTION_OBJECTS];
    const categoryL2OptionObjects: FilterOption[] = [{ value: 'all', label: '全部二级品类' }, ...categoryL2Options];
    const categoryL3OptionObjects: FilterOption[] = [{ value: 'all', label: '全部三级品类' }, ...categoryL3Options];
    const yearOptions: FilterOption[] = [
        { value: 'all', label: '全部年度' },
        ...YEARS.map((year) => ({ value: String(year), label: `${year}年` })),
    ];
    const seasonOptions: FilterOption[] = [
        { value: 'all', label: '全年' },
        ...SEASONS.map((season) => ({ value: season, label: season })),
    ];
    const waveOptionObjects: FilterOption[] = [
        { value: 'all', label: '全部月份' },
        ...waveOptions.map((wave) => ({
            value: wave,
            label: (() => {
                const month = getDashboardMonthByWave(wave);
                return month ? `${month}月` : wave;
            })(),
        })),
    ];
    const channelOptions: FilterOption[] = [
        { value: 'all', label: '全渠道' },
        ...CHANNEL_TYPES.map((channel) => ({ value: channel, label: channel })),
    ];
    const priceBandOptions: FilterOption[] = [
        { value: 'all', label: '全价格带' },
        ...PRICE_BANDS.map((band) => ({ value: band.id, label: band.label })),
    ];
    const lifecycleOptions: FilterOption[] = [
        { value: 'all', label: '全库龄层级' },
        ...LIFECYCLES.map((lifecycle) => ({ value: lifecycle, label: lifecycle })),
    ];


    const queueCollapse = () => {
        if (isPinned) return;
        if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = setTimeout(() => setIsExpanded(false), 140);
    };

    const cancelQueuedCollapse = () => {
        if (collapseTimerRef.current) {
            clearTimeout(collapseTimerRef.current);
            collapseTimerRef.current = null;
        }
    };

    const togglePinned = () => {
        const nextPinned = !isPinned;
        if (nextPinned) cancelQueuedCollapse();
        setIsExpanded(true);
        setStoredFilterBarPinnedState(nextPinned);
    };

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

    const updateCategoryL1 = (value: string) => {
        const nextCategoryL2Options = value === 'all' ? ALL_CATEGORY_L2_OPTIONS : CATEGORY_L2_BY_L1[value] || [];
        const nextFilters: DashboardFilters = { ...filters, category_l1: value };

        if (filters.category_id !== 'all' && !nextCategoryL2Options.some((option) => option.value === filters.category_id)) {
            nextFilters.category_id = 'all';
        }

        const nextCategoryL3Options = getCategoryL3Options(value, nextFilters.category_id);
        if (filters.sub_category !== 'all' && !nextCategoryL3Options.some((option) => option.value === filters.sub_category)) {
            nextFilters.sub_category = 'all';
        }

        setFilters(nextFilters);
    };

    const updateCategoryL2 = (value: string) => {
        const nextCategoryL3Options = getCategoryL3Options(filters.category_l1, value);
        const nextFilters: DashboardFilters = { ...filters, category_id: value };

        if (filters.sub_category !== 'all' && !nextCategoryL3Options.some((option) => option.value === filters.sub_category)) {
            nextFilters.sub_category = 'all';
        }

        setFilters(nextFilters);
    };

    const reset = () => {
        setFilters(getDefaultDashboardFilters());
        onCompareModeChange('none');
    };


    useEffect(() => {
        if (!isOpen || isPinned) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (containerRef.current.contains(event.target as Node)) return;
            setIsExpanded(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsExpanded(false);
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, isPinned]);

    useEffect(() => {
        const filterBarBridge = window as Window & { __openDashboardFilterBar?: () => void };
        const handleOpenExternal = () => {
            cancelQueuedCollapse();
            setIsExpanded(true);
        };

        filterBarBridge.__openDashboardFilterBar = handleOpenExternal;
        window.addEventListener('open-filter-bar', handleOpenExternal);
        return () => {
            delete filterBarBridge.__openDashboardFilterBar;
            window.removeEventListener('open-filter-bar', handleOpenExternal);
            if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
        };
    }, []);

    return (
        <div ref={containerRef} className="sticky top-[70px] z-40">
            <div className="mx-auto max-w-screen-2xl px-6 py-2.5">
                <div className="flex justify-end">
                    {!isOpen && !hideTrigger ? (
                        <button
                            type="button"
                            onClick={() => setIsExpanded(true)}
                            aria-expanded={false}
                            aria-label={`展开筛选器：${filterSummary}`}
                            title={filterSummary}
                            className="group inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(243,247,252,0.94)_100%)] text-slate-500 shadow-[0_12px_28px_rgba(15,23,42,0.08)] ring-1 ring-inset ring-slate-200/70 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-700"
                        >
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                <path d="M4 5H16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                <path d="M6.5 10H13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                <path d="M8.5 15H11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            </svg>
                        </button>
                    ) : null}
                </div>

                <div
                    className="grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out"
                    style={{
                        gridTemplateRows: isOpen ? '1fr' : '0fr',
                        opacity: isOpen ? 1 : 0,
                        transform: isOpen ? 'translateY(0)' : 'translateY(-10px)',
                    }}
                >
                    <div className="overflow-hidden">
                        <div
                            onMouseEnter={cancelQueuedCollapse}
                            onMouseLeave={queueCollapse}
                            className="overflow-hidden rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,252,0.96)_100%)] shadow-[0_20px_48px_rgba(15,23,42,0.08)] ring-1 ring-inset ring-slate-200/70"
                        >


                            <div className="px-4 pb-4 pt-3">
                                <div className="rounded-[24px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,252,0.96)_100%)] p-3 shadow-[0_18px_42px_rgba(15,23,42,0.06)] ring-1 ring-inset ring-slate-200/70">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:flex-nowrap">
                                        <FilterSelect label="品牌" value={filters.brand} options={brandOptions} onChange={(value) => update('brand', value)} />
                                        <FilterSelect label="一级品类" value={filters.category_l1} options={categoryL1Options} onChange={updateCategoryL1} />
                                        <FilterSelect label="二级品类" value={filters.category_id} options={categoryL2OptionObjects} onChange={updateCategoryL2} />
                                        <FilterSelect label="三级品类" value={filters.sub_category} options={categoryL3OptionObjects} onChange={(value) => update('sub_category', value)} />
                                        <FilterSelect label="价格带" value={filters.price_band} options={priceBandOptions} onChange={(value) => update('price_band', value)} />
                                        <FilterSelect label="库龄层级" value={filters.lifecycle} options={lifecycleOptions} onChange={(value) => update('lifecycle', value)} />
                                        <div className="ml-auto flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={reset}
                                                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[16px] border border-slate-200/80 bg-white/90 px-3.5 text-sm font-medium text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition-all hover:border-slate-300 hover:text-slate-800 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                                    <path
                                                        d="M3.25 8A4.75 4.75 0 1 0 5 4.35"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                    <path
                                                        d="M3.5 2.75V5.25H6"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                                <span>重置</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={togglePinned}
                                                title={isPinned ? '取消固定' : '固定筛选栏'}
                                                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border transition-all ${isPinned
                                                    ? 'border-amber-300/80 bg-amber-50 text-amber-600 shadow-[0_8px_20px_rgba(217,119,6,0.12)]'
                                                    : 'border-slate-200/80 bg-white/90 text-slate-400 hover:border-slate-300 hover:text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)]'
                                                    }`}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 2L12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                                    <path d="M7 7H17L16 12H18L12 22L6 12H8L7 7Z" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-2 lg:flex-nowrap">
                                        <FilterSelect
                                            label="年度"
                                            value={String(filters.season_year)}
                                            options={yearOptions}
                                            onChange={(value) => update('season_year', value === 'all' ? 'all' : parseInt(value, 10))}
                                        />
                                        <FilterSelect label="季节" value={filters.season} options={seasonOptions} onChange={updateSeason} />
                                        <FilterSelect label="月份" value={filters.wave} options={waveOptionObjects} onChange={(value) => update('wave', value)} />
                                        <FilterSelect label="渠道" value={filters.channel_type} options={channelOptions} onChange={(value) => update('channel_type', value)} />
                                        <div
                                            title={filterSummary}
                                            className="min-w-0 flex-1 rounded-[16px] border border-slate-200/80 bg-white/80 px-3.5 py-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.04)] ring-1 ring-inset ring-white/70"
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">当前筛选</span>
                                                <span className="truncate text-sm font-semibold text-slate-700">{filterSummary}</span>
                                            </div>
                                        </div>
                                        <div className="ml-auto inline-flex shrink-0 rounded-[16px] border border-slate-200/80 bg-white/75 p-1 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                                            {COMPARE_MODE_OPTIONS.map((mode) => {
                                                const isActive = compareMode === mode;
                                                const isDisabled =
                                                    (mode === 'mom' && !compareMeta.momAvailable) ||
                                                    (mode === 'plan' && !compareMeta.planAvailable);
                                                const disabledReason =
                                                    mode === 'plan' ? compareMeta.planDisabledReason : compareMeta.disabledReason;
                                                const buttonLabel = COMPARE_MODE_LABELS[mode];

                                                return (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        disabled={isDisabled}
                                                        title={isDisabled ? disabledReason : buttonLabel}
                                                        onClick={() => {
                                                            if (isDisabled) return;
                                                            onCompareModeChange(isActive ? 'none' : mode);
                                                        }}
                                                        className={`rounded-[12px] px-3 py-2 text-sm font-semibold transition-all ${isDisabled
                                                            ? 'cursor-not-allowed text-slate-300'
                                                            : isActive
                                                                ? 'bg-[var(--slate-900)] text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]'
                                                                : 'text-slate-500 hover:bg-white hover:text-slate-800'
                                                            }`}
                                                    >
                                                        {buttonLabel}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface FilterSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
    const widthPx = getSelectWidthPx(label, value, options);

    return (
        <div className="inline-flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-slate-400">{label}</span>
            <div className="relative shrink-0">
                <select
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    style={{ width: `${widthPx}px` }}
                    className="h-10 appearance-none rounded-[15px] border border-slate-200/80 bg-white/90 pl-3.5 pr-8 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] outline-none transition-all hover:border-slate-300 focus:border-[var(--brand-300)] focus:ring-4 focus:ring-[rgba(242,78,123,0.12)]"
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-slate-400">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path
                            d="M4 6.5L8 10L12 6.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
            </div>
        </div>
    );
}


