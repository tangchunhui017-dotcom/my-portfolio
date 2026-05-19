'use client';

import type { CompetitorTrendKpi, TrendStatusColor } from '@/types/competitorTrendTypes';

const STATUS_CONFIG: Record<TrendStatusColor, { bg: string; border: string; text: string; dot: string; label: string }> = {
    green:  { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700',  dot: 'bg-emerald-500',  label: '机会明确' },
    blue:   { bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-700',     dot: 'bg-blue-500',     label: '趋势上升' },
    orange: { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',    dot: 'bg-amber-500',    label: '需观察' },
    red:    { bg: 'bg-rose-50',     border: 'border-rose-200',    text: 'text-rose-700',     dot: 'bg-rose-500',     label: '高风险' },
    purple: { bg: 'bg-violet-50',   border: 'border-violet-200',  text: 'text-violet-700',   dot: 'bg-violet-500',   label: '设计机会' },
    gray:   { bg: 'bg-slate-50',    border: 'border-slate-200',   text: 'text-slate-500',    dot: 'bg-slate-400',    label: '低优先级' },
};

interface CompetitorTrendKpiStripProps {
    kpis: CompetitorTrendKpi[];
}

export default function CompetitorTrendKpiStrip({ kpis }: CompetitorTrendKpiStripProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            {kpis.slice(0, 8).map((kpi) => {
                const cfg = STATUS_CONFIG[kpi.statusColor];
                return (
                    <div
                        key={kpi.id}
                        className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3 flex flex-col gap-1.5 min-w-0`}
                    >
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] text-slate-500 leading-tight line-clamp-2">{kpi.label}</span>
                            <span className={`flex-shrink-0 w-2 h-2 rounded-full ${cfg.dot}`} />
                        </div>
                        <div className={`text-xl font-bold ${cfg.text} tabular-nums`}>
                            {kpi.value}{kpi.unit && <span className="text-sm font-normal ml-0.5">{kpi.unit}</span>}
                        </div>
                        {kpi.delta && (
                            <div className={`text-[11px] font-medium ${kpi.deltaPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {kpi.deltaPositive ? '↑' : '↓'} {kpi.delta}
                                {kpi.deltaType === 'mom' ? ' 环比' : kpi.deltaType === 'yoy' ? ' 同比' : ''}
                            </div>
                        )}
                        <div className={`text-[10px] ${cfg.text} px-1.5 py-0.5 rounded-full ${cfg.bg} border ${cfg.border} w-fit`}>
                            {cfg.label}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight line-clamp-2 mt-0.5">{kpi.explanation}</div>
                    </div>
                );
            })}
        </div>
    );
}
