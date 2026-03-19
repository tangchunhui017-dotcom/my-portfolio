'use client';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterState {
  year: string;
  quarter: string;
  wave: string;
  series: string;
  owner: string;
  phase: string;
  showMine: boolean;
  showHighRiskOnly: boolean;
  showOverdueOnly: boolean;
  showThisWeekOnly: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  year: '',
  quarter: '',
  wave: '',
  series: '',
  owner: '',
  phase: '',
  showMine: false,
  showHighRiskOnly: false,
  showOverdueOnly: false,
  showThisWeekOnly: false,
};

interface FilterBarProps {
  years: FilterOption[];
  quarters: FilterOption[];
  waves: FilterOption[];
  series: FilterOption[];
  owners: FilterOption[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  currentOwnerLabel?: string;
  defaultYear?: string;
}

const PHASE_OPTIONS: FilterOption[] = [
  { value: 'planning', label: '规划中' },
  { value: 'concept', label: '概念阶段' },
  { value: 'prototype', label: '原型开发' },
  { value: 'prototype_review', label: '原型评审' },
  { value: 'sample_review', label: '样鞋评审' },
  { value: 'costing', label: '成本核算' },
  { value: 'costing_review', label: '成本评审' },
  { value: 'locked', label: '已锁定' },
  { value: 'completed', label: '已完成' },
];

function FilterSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 whitespace-nowrap">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-[132px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function createPresetTags(filters: FilterState, currentOwnerLabel?: string) {
  const tags: string[] = [];
  if (filters.showMine && currentOwnerLabel) tags.push(`只看我负责 / ${currentOwnerLabel}`);
  if (filters.showHighRiskOnly) tags.push('只看高风险');
  if (filters.showOverdueOnly) tags.push('只看逾期');
  if (filters.showThisWeekOnly) tags.push('本周待办');
  return tags;
}

export default function FilterBar({
  years,
  quarters,
  waves,
  series,
  owners,
  filters,
  onFilterChange,
  currentOwnerLabel,
  defaultYear = '',
}: FilterBarProps) {
  const handleFilterChange = (key: keyof FilterState, value: string | boolean) => {
    if (key === 'year') {
      onFilterChange({ ...filters, year: value as string, quarter: '', wave: '', series: '' });
      return;
    }

    if (key === 'quarter') {
      onFilterChange({ ...filters, quarter: value as string, wave: '', series: '' });
      return;
    }

    if (key === 'wave') {
      onFilterChange({ ...filters, wave: value as string, series: '' });
      return;
    }

    onFilterChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFilterChange({ ...DEFAULT_FILTERS, year: defaultYear });
  };

  const currentFilterTags = [
    filters.year ? `${filters.year}年` : null,
    filters.quarter || null,
    waves.find((option) => option.value === filters.wave)?.label ?? null,
    series.find((option) => option.value === filters.series)?.label ?? null,
    owners.find((option) => option.value === filters.owner)?.label ?? null,
    PHASE_OPTIONS.find((option) => option.value === filters.phase)?.label ?? null,
    ...createPresetTags(filters, currentOwnerLabel),
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <FilterSelect label="年度" value={filters.year} options={years} placeholder="全部年度" onChange={(value) => handleFilterChange('year', value)} />
        <div className="hidden h-6 w-px bg-slate-200 xl:block" />
        <FilterSelect label="季度" value={filters.quarter} options={quarters} placeholder="全部季度" onChange={(value) => handleFilterChange('quarter', value)} />
        <div className="hidden h-6 w-px bg-slate-200 xl:block" />
        <FilterSelect label="波段" value={filters.wave} options={waves} placeholder="全部波段" onChange={(value) => handleFilterChange('wave', value)} />
        <div className="hidden h-6 w-px bg-slate-200 xl:block" />
        <FilterSelect label="系列" value={filters.series} options={series} placeholder="全部系列" onChange={(value) => handleFilterChange('series', value)} />
        <div className="hidden h-6 w-px bg-slate-200 xl:block" />
        <FilterSelect label="阶段" value={filters.phase} options={PHASE_OPTIONS} placeholder="全部阶段" onChange={(value) => handleFilterChange('phase', value)} />
        <div className="hidden h-6 w-px bg-slate-200 xl:block" />
        <FilterSelect label="负责人" value={filters.owner} options={owners} placeholder="全部负责人" onChange={(value) => handleFilterChange('owner', value)} />
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ↻ 重置
        </button>
      </div>

      {currentFilterTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span className="font-medium">当前筛选：</span>
          {currentFilterTags.map((tag) => (
            <span key={tag} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
