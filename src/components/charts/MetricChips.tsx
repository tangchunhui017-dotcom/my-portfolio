'use client';
/**
 * src/components/charts/MetricChips.tsx
 * 图表卡片顶部的 KPI 小卡条（替代旧版 ChartMetricStrip）。
 *
 * 设计：极浅灰底 + 顶部色点指示 tone，避免过度彩色背景抢眼。
 * 用法：在 <ChartCard metricStrip={<MetricChips items={...} />} />
 */

export type MetricChipTone = 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
export type MetricChipDetailTone = 'neutral' | 'positive' | 'warning' | 'danger';

export interface MetricChipItem {
    label: string;
    value: string;
    detail?: string;
    tone?: MetricChipTone;
    detailTone?: MetricChipDetailTone;
}

interface Props {
    items: MetricChipItem[];
    /** 单 chip 时是否限制宽度（默认 true） */
    compactSingle?: boolean;
}

const TONE_DOT: Record<MetricChipTone, string> = {
    sky:     'bg-sky-500',
    emerald: 'bg-emerald-500',
    amber:   'bg-amber-500',
    rose:    'bg-rose-500',
    violet:  'bg-violet-500',
    slate:   'bg-slate-400',
};

const DETAIL_TONE: Record<MetricChipDetailTone, string> = {
    neutral:  'text-slate-500',
    positive: 'text-emerald-600',
    warning:  'text-amber-600',
    danger:   'text-rose-600',
};

export default function MetricChips({ items, compactSingle = true }: Props) {
    if (items.length === 0) return null;

    const single = items.length === 1;

    return (
        <div className="flex flex-wrap gap-2.5">
            {items.map((item) => (
                <div
                    key={item.label}
                    className={`${single && compactSingle ? 'w-[220px]' : 'min-w-[140px] flex-1'} rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5`}
                >
                    <div className="flex items-center gap-1.5">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${TONE_DOT[item.tone ?? 'slate']}`} />
                        <span className="text-[11px] font-medium text-slate-500">{item.label}</span>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900 leading-tight">{item.value}</div>
                    {item.detail && (
                        <div className={`mt-0.5 text-[11px] font-medium ${DETAIL_TONE[item.detailTone ?? 'neutral']}`}>
                            {item.detail}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
