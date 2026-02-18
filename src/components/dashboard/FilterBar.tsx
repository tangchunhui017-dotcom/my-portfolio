'use client';

import { DashboardFilters, DEFAULT_FILTERS } from '@/hooks/useDashboardFilter';

interface FilterBarProps {
    filters: DashboardFilters;
    setFilters: (f: DashboardFilters) => void;
    filterSummary: string;
}

const YEARS = [2024, 2023];
const SEASONS = ['Q1', 'Q2', 'Q3', 'Q4'];
const WAVES = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08', 'W09', 'W10', 'W11', 'W12'];
const CATEGORIES = ['跑步', '篮球', '训练', '休闲', '户外'];
const CHANNEL_TYPES = ['电商', '直营', '加盟', 'KA'];
const PRICE_BANDS = [
    { id: 'PB1', label: '¥199-299' },
    { id: 'PB2', label: '¥300-399' },
    { id: 'PB3', label: '¥400-499' },
    { id: 'PB4', label: '¥500-599' },
    { id: 'PB5', label: '¥600-699' },
    { id: 'PB6', label: '¥700+' },
];
const LIFECYCLES = ['新品', '常青', '清仓'];

export default function FilterBar({ filters, setFilters, filterSummary }: FilterBarProps) {
    const update = (key: keyof DashboardFilters, value: string | number | 'all') => {
        setFilters({ ...filters, [key]: value });
    };

    const reset = () => setFilters(DEFAULT_FILTERS);

    return (
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
            <div className="max-w-screen-2xl mx-auto px-6 py-3">
                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Year */}
                    <FilterSelect
                        label="年度"
                        value={String(filters.season_year)}
                        onChange={v => update('season_year', v === 'all' ? 'all' : parseInt(v))}
                        options={[{ value: 'all', label: '全年' }, ...YEARS.map(y => ({ value: String(y), label: `${y}年` }))]}
                    />

                    {/* Season */}
                    <FilterSelect
                        label="季节"
                        value={filters.season}
                        onChange={v => update('season', v)}
                        options={[{ value: 'all', label: '全季' }, ...SEASONS.map(s => ({ value: s, label: `${s}季` }))]}
                    />

                    {/* Wave */}
                    <FilterSelect
                        label="波段"
                        value={filters.wave}
                        onChange={v => update('wave', v)}
                        options={[{ value: 'all', label: '全波段' }, ...WAVES.map(w => ({ value: w, label: w }))]}
                    />

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    {/* Category */}
                    <FilterSelect
                        label="品类"
                        value={filters.category_id}
                        onChange={v => update('category_id', v)}
                        options={[{ value: 'all', label: '全品类' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
                    />

                    {/* Channel */}
                    <FilterSelect
                        label="渠道"
                        value={filters.channel_type}
                        onChange={v => update('channel_type', v)}
                        options={[{ value: 'all', label: '全渠道' }, ...CHANNEL_TYPES.map(c => ({ value: c, label: c }))]}
                    />

                    {/* Price Band */}
                    <FilterSelect
                        label="价格带"
                        value={filters.price_band}
                        onChange={v => update('price_band', v)}
                        options={[{ value: 'all', label: '全价格带' }, ...PRICE_BANDS.map(b => ({ value: b.id, label: b.label }))]}
                    />

                    {/* Lifecycle */}
                    <FilterSelect
                        label="生命周期"
                        value={filters.lifecycle}
                        onChange={v => update('lifecycle', v)}
                        options={[{ value: 'all', label: '全周期' }, ...LIFECYCLES.map(l => ({ value: l, label: l }))]}
                    />

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    {/* Reset */}
                    <button
                        onClick={reset}
                        className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1"
                    >
                        <span>↺</span> 重置
                    </button>
                </div>

                {/* Filter Summary */}
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-400">当前筛选：</span>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {filterSummary}
                    </span>
                </div>
            </div>
        </div>
    );
}

interface FilterSelectProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
    return (
        <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 whitespace-nowrap">{label}</span>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer transition-colors"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}
