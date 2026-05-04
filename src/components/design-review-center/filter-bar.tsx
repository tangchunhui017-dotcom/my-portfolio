'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { STAGE_LABELS } from '@/config/design-review-center/labels';
import type { DesignReviewFilterOption, DesignReviewFilters } from '@/lib/design-review-center/types';
import { DEFAULT_DESIGN_REVIEW_FILTERS } from '@/lib/design-review-center/selectors/filters';

export type FilterOption = DesignReviewFilterOption;
export type FilterState = DesignReviewFilters;

export const DEFAULT_FILTERS: FilterState = DEFAULT_DESIGN_REVIEW_FILTERS;

interface FilterBarProps {
  brands: FilterOption[];
  years: FilterOption[];
  quarters: FilterOption[];
  waves: FilterOption[];
  categoryL1s: FilterOption[];
  categoryL2s: FilterOption[];
  series: FilterOption[];
  owners: FilterOption[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  defaultYear?: string;
  hideTrigger?: boolean;
}

const STAGE_OPTIONS: FilterOption[] = Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label }));
const FILTER_BAR_PIN_STORAGE_KEY = 'design-review-filter-bar-pinned';
const FILTER_BAR_PIN_STORAGE_EVENT = 'design-review-filter-bar-pin-change';

const MIN_WIDTH_BY_LABEL: Record<string, number> = {
  品牌: 156,
  年度: 108,
  季度: 116,
  波段: 118,
  一级品类: 150,
  二级品类: 158,
  系列: 138,
  阶段: 126,
  负责人: 126,
};

function getSelectedLabel(value: string, options: FilterOption[], placeholder: string) {
  return options.find((option) => option.value === value)?.label ?? placeholder;
}

function getCharacterWeight(value: string) {
  return Array.from(value).reduce((total, char) => {
    if (/[\u4e00-\u9fff]/.test(char)) return total + 1;
    return total + 0.55;
  }, 0);
}

function getSelectWidthPx(label: string, value: string, options: FilterOption[], placeholder: string) {
  const displayLabel = getSelectedLabel(value, options, placeholder);
  const base = Math.round(38 + getCharacterWeight(displayLabel) * 18);
  return Math.min(Math.max(MIN_WIDTH_BY_LABEL[label] ?? 112, base), 220);
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
  if (typeof window === 'undefined') return () => {};

  const handleStoreChange = () => onStoreChange();
  window.addEventListener(FILTER_BAR_PIN_STORAGE_EVENT, handleStoreChange);
  window.addEventListener('storage', handleStoreChange);

  return () => {
    window.removeEventListener(FILTER_BAR_PIN_STORAGE_EVENT, handleStoreChange);
    window.removeEventListener('storage', handleStoreChange);
  };
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: FilterOption[];
  placeholder: string;
  onChange: (value: string) => void;
}

function FilterSelect({ label, value, options, placeholder, onChange }: FilterSelectProps) {
  const widthPx = getSelectWidthPx(label, value, options, placeholder);

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
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-slate-400">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 6.5L8 10L12 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export default function FilterBar({
  brands,
  years,
  quarters,
  waves,
  categoryL1s,
  categoryL2s,
  series,
  owners,
  filters,
  onFilterChange,
  defaultYear = '',
  hideTrigger = false,
}: FilterBarProps) {
  const isPinned = useSyncExternalStore(subscribeFilterBarPinnedState, getStoredFilterBarPinnedState, () => false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpen = isPinned || isExpanded;

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    if (key === 'year') {
      onFilterChange({ ...filters, year: value, quarter: '', wave: '', series: '' });
      return;
    }

    if (key === 'quarter') {
      onFilterChange({ ...filters, quarter: value, wave: '', series: '' });
      return;
    }

    if (key === 'wave') {
      onFilterChange({ ...filters, wave: value, series: '' });
      return;
    }

    if (key === 'categoryL1') {
      onFilterChange({ ...filters, categoryL1: value, categoryL2: '' });
      return;
    }

    onFilterChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFilterChange({ ...DEFAULT_FILTERS, year: defaultYear });
  };

  const currentFilterTags = useMemo(
    () => [
      brands.find((option) => option.value === filters.brand)?.label ?? null,
      filters.year ? `${filters.year}年` : null,
      quarters.find((option) => option.value === filters.quarter)?.label ?? null,
      waves.find((option) => option.value === filters.wave)?.label ?? null,
      categoryL1s.find((option) => option.value === filters.categoryL1)?.label ?? null,
      categoryL2s.find((option) => option.value === filters.categoryL2)?.label ?? null,
      series.find((option) => option.value === filters.series)?.label ?? null,
      owners.find((option) => option.value === filters.owner)?.label ?? null,
      STAGE_OPTIONS.find((option) => option.value === filters.stage)?.label ?? null,
    ].filter(Boolean) as string[],
    [brands, categoryL1s, categoryL2s, filters, owners, quarters, series, waves],
  );

  const currentFilterSummary = currentFilterTags.join(' / ');

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
    const filterBarBridge = window as Window & { __openDesignReviewFilterBar?: () => void };
    const handleOpenExternal = () => {
      cancelQueuedCollapse();
      setIsExpanded(true);
    };

    filterBarBridge.__openDesignReviewFilterBar = handleOpenExternal;
    window.addEventListener('open-design-review-filter-bar', handleOpenExternal);

    return () => {
      delete filterBarBridge.__openDesignReviewFilterBar;
      window.removeEventListener('open-design-review-filter-bar', handleOpenExternal);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="sticky top-[70px] z-40">
      <div className="mx-auto max-w-[1600px] px-6 py-2.5">
        <div className="flex justify-end">
          {!isOpen && !hideTrigger ? (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              aria-expanded={false}
              aria-label={`展开筛选器：${currentFilterSummary || '默认口径'}`}
              title={currentFilterSummary || '默认口径'}
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
                  <div className="flex items-start gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
                      <FilterSelect label="品牌" value={filters.brand} options={brands} placeholder="全部品牌" onChange={(value) => handleFilterChange('brand', value)} />
                      <FilterSelect label="年度" value={filters.year} options={years} placeholder="全部年度" onChange={(value) => handleFilterChange('year', value)} />
                      <FilterSelect label="季度" value={filters.quarter} options={quarters} placeholder="全部季度" onChange={(value) => handleFilterChange('quarter', value)} />
                      <FilterSelect label="波段" value={filters.wave} options={waves} placeholder="全部波段" onChange={(value) => handleFilterChange('wave', value)} />
                      <FilterSelect label="一级品类" value={filters.categoryL1} options={categoryL1s} placeholder="全部一级品类" onChange={(value) => handleFilterChange('categoryL1', value)} />
                      <FilterSelect label="二级品类" value={filters.categoryL2} options={categoryL2s} placeholder="全部二级品类" onChange={(value) => handleFilterChange('categoryL2', value)} />
                      <FilterSelect label="系列" value={filters.series} options={series} placeholder="全部系列" onChange={(value) => handleFilterChange('series', value)} />
                      <FilterSelect label="阶段" value={filters.stage} options={STAGE_OPTIONS} placeholder="全部阶段" onChange={(value) => handleFilterChange('stage', value)} />
                      <FilterSelect label="负责人" value={filters.owner} options={owners} placeholder="全部负责人" onChange={(value) => handleFilterChange('owner', value)} />
                      <div
                        title={currentFilterSummary || '默认口径'}
                        className="min-w-[260px] flex-1 rounded-[16px] border border-slate-200/80 bg-white/80 px-3.5 py-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.04)] ring-1 ring-inset ring-white/70"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">当前筛选</span>
                          <span className="truncate text-sm font-semibold text-slate-700">{currentFilterSummary || '默认口径'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 self-start">
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[16px] border border-slate-200/80 bg-white/90 px-3.5 text-sm font-medium text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition-all hover:border-slate-300 hover:text-slate-800 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M3.25 8A4.75 4.75 0 1 0 5 4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M3.5 2.75V5.25H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>重置</span>
                      </button>
                      <button
                        type="button"
                        onClick={togglePinned}
                        title={isPinned ? '取消固定' : '固定筛选栏'}
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border transition-all ${
                          isPinned
                            ? 'border-amber-300/80 bg-amber-50 text-amber-600 shadow-[0_8px_20px_rgba(217,119,6,0.12)]'
                            : 'border-slate-200/80 bg-white/90 text-slate-400 hover:border-slate-300 hover:text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)]'
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M7 7H17L16 12H18L12 22L6 12H8L7 7Z" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                      </button>
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
