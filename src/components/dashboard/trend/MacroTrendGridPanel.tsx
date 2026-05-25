'use client';

import type { MacroTrend, TrendStatus } from '@/types/trendInsightTypes';
import { TREND_STATUS_OPTIONS, TREND_STATUS_STYLES } from '@/config/trendInsight';

const PRIORITY_STYLES: Record<string, string> = {
    H: 'bg-rose-500 text-white',
    M: 'bg-amber-400 text-white',
    L: 'bg-slate-300 text-slate-700',
};

const STATUS_IDLE = 'bg-white border border-slate-200 text-slate-400 opacity-60';

function coverStyle(url?: string) {
    if (!url) return undefined;
    return {
        backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.02), rgba(15, 23, 42, 0.58)), url("${url}")`,
    };
}

export default function MacroTrendGridPanel({
    trends,
    statuses,
    onStatusChange,
    selectedId,
    onSelect,
}: {
    trends: MacroTrend[];
    statuses: Record<string, TrendStatus>;
    onStatusChange: (id: string, status: TrendStatus) => void;
    selectedId?: string;
    onSelect?: (id: string) => void;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trends.map((trend) => {
                const currentStatus = statuses[trend.id] ?? trend.defaultStatus;
                const isSelected = selectedId === trend.id;
                return (
                    <div
                        key={trend.id}
                        onClick={() => onSelect?.(trend.id)}
                        className={`relative overflow-hidden rounded-xl border bg-white flex flex-col transition-all ${
                            isSelected
                                ? 'border-blue-400 border-2 shadow-md'
                                : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        } ${onSelect ? 'cursor-pointer' : ''}`}
                    >
                        {isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 z-10 w-1 bg-blue-500 rounded-l-xl" />
                        )}
                        <div
                            className="relative h-40 bg-slate-100 bg-cover bg-center"
                            style={coverStyle(trend.coverImage)}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                            {isSelected && (
                                <span className="absolute left-3 top-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500 text-white">
                                    当前查看
                                </span>
                            )}
                            <span
                                className={`absolute right-3 top-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[trend.priority]}`}
                            >
                                {trend.priority}
                            </span>
                            <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                                <div className="mb-1 flex flex-wrap gap-1">
                                    {(trend.moodImages ?? []).slice(0, 2).map((image) => (
                                        <span
                                            key={image.label}
                                            className="rounded-full bg-white/18 px-2 py-0.5 text-[10px] font-medium ring-1 ring-white/20"
                                        >
                                            {image.layer}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-sm font-semibold">{trend.name}</div>
                            </div>
                        </div>

                        {/* Header */}
                        <div className="flex flex-1 flex-col gap-3 p-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-semibold text-slate-900">{trend.name}</h4>
                                <span
                                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${trend.tagColor} ${trend.tagTextColor}`}
                                >
                                    {trend.name}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">{trend.subtitle}</p>
                        </div>

                        {/* Keywords */}
                        <div className="flex flex-wrap gap-1.5">
                            {trend.keyWords.map((kw) => (
                                <span
                                    key={kw}
                                    className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                                >
                                    {kw}
                                </span>
                            ))}
                        </div>

                        {/* Shoe types */}
                        <div>
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                                本季适合鞋型
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {trend.shoeTypeApplication.map((st) => (
                                    <span
                                        key={st}
                                        className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600"
                                    >
                                        {st}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Design suggestion */}
                        <p className="text-xs text-slate-600 leading-relaxed">{trend.designSuggestion}</p>

                        {/* Status switcher */}
                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                            {TREND_STATUS_OPTIONS.map((opt) => (
                                <button
                                    key={opt}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onStatusChange(trend.id, opt);
                                    }}
                                    className={`text-xs py-1 rounded-lg font-medium transition-colors ${
                                        currentStatus === opt ? TREND_STATUS_STYLES[opt] : STATUS_IDLE
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
