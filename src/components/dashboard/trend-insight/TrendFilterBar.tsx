'use client';

import type { TrendFilterState, TrendType, TrendCycle, TrendSourceType, TrendStatus } from '@/types/trendInsightTypes';
import {
    TREND_ADAPT_STATUS_OPTIONS,
    TREND_CYCLE_OPTIONS,
    TREND_SOURCE_OPTIONS,
    TREND_TYPE_OPTIONS,
} from '@/config/trendInsight';

export default function TrendFilterBar({
    filters,
    onChange,
    resultCount,
}: {
    filters: TrendFilterState;
    onChange: (next: TrendFilterState) => void;
    resultCount: number;
}) {
    function update<K extends keyof TrendFilterState>(key: K, value: TrendFilterState[K]) {
        onChange({ ...filters, [key]: value });
    }

    const isFiltered =
        filters.trendSource !== '' ||
        filters.trendCycle !== '' ||
        filters.trendType !== '' ||
        filters.adaptStatus !== '';

    return (
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide shrink-0">
                趋势筛选
            </span>
            <div className="flex flex-wrap gap-2 flex-1">
                <select
                    value={filters.trendSource}
                    onChange={(e) => update('trendSource', e.target.value as TrendSourceType | '')}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                    {TREND_SOURCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <select
                    value={filters.trendCycle}
                    onChange={(e) => update('trendCycle', e.target.value as TrendCycle | '')}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                    {TREND_CYCLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <select
                    value={filters.trendType}
                    onChange={(e) => update('trendType', e.target.value as TrendType | '')}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                    {TREND_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <select
                    value={filters.adaptStatus}
                    onChange={(e) => update('adaptStatus', e.target.value as TrendStatus | '')}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                    {TREND_ADAPT_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0">
                {resultCount} 个趋势
            </span>
            {isFiltered && (
                <button
                    onClick={() => onChange({ trendSource: '', trendCycle: '', trendType: '', adaptStatus: '' })}
                    className="text-[11px] text-blue-500 hover:text-blue-700 shrink-0"
                >
                    重置
                </button>
            )}
        </div>
    );
}
