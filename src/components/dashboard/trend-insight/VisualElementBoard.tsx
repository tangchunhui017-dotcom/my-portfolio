'use client';

import type { TrendVisualElement } from '@/types/trendInsightTypes';
import VisualElementCard from './VisualElementCard';

const TONE_STYLES: Record<string, { border: string; label: string; dot: string }> = {
    color:      { border: 'border-amber-200',   label: 'bg-amber-50 text-amber-700',   dot: 'bg-amber-400' },
    material:   { border: 'border-slate-200',    label: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400' },
    pattern:    { border: 'border-violet-200',   label: 'bg-violet-50 text-violet-700', dot: 'bg-violet-400' },
    silhouette: { border: 'border-blue-200',     label: 'bg-blue-50 text-blue-700',     dot: 'bg-blue-400' },
    detail:     { border: 'border-rose-200',     label: 'bg-rose-50 text-rose-700',     dot: 'bg-rose-400' },
};

type VisualElementBoardProps = {
    title: string;
    description: string;
    elements: TrendVisualElement[];
    tone?: 'color' | 'material' | 'pattern' | 'silhouette' | 'detail';
};

export default function VisualElementBoard({
    title,
    description,
    elements,
    tone = 'material',
}: VisualElementBoardProps) {
    if (!elements || elements.length === 0) return null;

    const style = TONE_STYLES[tone];

    return (
        <div className={`rounded-lg border ${style.border} bg-white p-3`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`w-2 h-2 rounded-full ${style.dot} inline-block shrink-0`} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {tone.toUpperCase()}
                        </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${style.label}`}>
                    {elements.length} 个元素
                </span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {elements.map((el) => (
                    <VisualElementCard key={el.id} el={el} />
                ))}
            </div>
        </div>
    );
}
