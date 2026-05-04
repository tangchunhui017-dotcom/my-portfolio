'use client';

type ChartMetricTone = 'slate' | 'pink' | 'amber' | 'emerald';
type ChartMetricDetailTone = 'neutral' | 'positive' | 'warning';

export interface ChartMetricStripItem {
    label: string;
    value: string;
    detail?: string;
    tone?: ChartMetricTone;
    detailTone?: ChartMetricDetailTone;
}

interface ChartMetricStripProps {
    items: ChartMetricStripItem[];
}

const CARD_TONES: Record<ChartMetricTone, string> = {
    slate: 'border-slate-200 bg-slate-50/80',
    pink: 'border-pink-100 bg-pink-50/70',
    amber: 'border-amber-100 bg-amber-50/80',
    emerald: 'border-emerald-100 bg-emerald-50/75',
};

const DETAIL_TONES: Record<ChartMetricDetailTone, string> = {
    neutral: 'text-slate-500',
    positive: 'text-emerald-600',
    warning: 'text-amber-600',
};

export default function ChartMetricStrip({ items }: ChartMetricStripProps) {
    if (items.length === 0) return null;

    return (
        <div className="px-5 py-4">
            <div className="flex flex-wrap gap-3">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className={`${items.length === 1 ? 'w-[220px]' : 'min-w-[148px] flex-1'} rounded-xl border px-3.5 py-3 ${CARD_TONES[item.tone ?? 'slate']}`}
                    >
                        <div className="text-[11px] font-medium text-slate-400">{item.label}</div>
                        <div className="mt-1 text-xl font-bold text-slate-900">{item.value}</div>
                        {item.detail ? (
                            <div className={`mt-1 text-xs font-medium ${DETAIL_TONES[item.detailTone ?? 'neutral']}`}>
                                {item.detail}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}