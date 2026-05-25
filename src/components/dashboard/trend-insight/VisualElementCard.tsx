'use client';

import type { TrendVisualElement } from '@/types/trendInsightTypes';

const RISK_STYLES: Record<string, string> = {
    low: 'bg-emerald-500 text-white',
    medium: 'bg-amber-500 text-white',
    high: 'bg-rose-500 text-white',
};
const RISK_LABELS: Record<string, string> = { low: '低风险', medium: '中风险', high: '高风险' };

export default function VisualElementCard({ el }: { el: TrendVisualElement }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden flex flex-col">
            {/* Image area — fixed 4:3 aspect ratio */}
            <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                <img
                    src={el.image}
                    alt={el.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.img-fallback')) {
                            const fb = document.createElement('div');
                            fb.className = 'img-fallback absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center';
                            fb.innerHTML = '<span style="font-size:24px">🖼</span>';
                            parent.appendChild(fb);
                        }
                    }}
                />
                {/* Product role badge — top left */}
                <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-semibold bg-slate-900/70 text-white px-2 py-0.5 rounded backdrop-blur-sm leading-tight">
                        {el.productRole}
                    </span>
                </div>
                {/* Risk badge — top right */}
                {el.risk && (
                    <div className="absolute top-2 right-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded leading-tight ${RISK_STYLES[el.risk]}`}>
                            {RISK_LABELS[el.risk]}
                        </span>
                    </div>
                )}
                {/* Title overlay — bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pt-4 pb-2">
                    <div className="text-xs font-semibold text-white leading-snug line-clamp-2">
                        {el.title}
                    </div>
                </div>
            </div>

            {/* Content area */}
            <div className="p-2.5 flex flex-col gap-2 flex-1">
                {/* Tags */}
                {el.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {el.tags.map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Description */}
                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                    {el.description}
                </p>

                {/* Visual signal */}
                <div className="flex gap-1.5 items-start">
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0 mt-0.5 uppercase tracking-wide">信号</span>
                    <span className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{el.visualSignal}</span>
                </div>

                {/* Footwear application */}
                <div className="flex gap-1.5 items-start mt-auto pt-1 border-t border-slate-100">
                    <span className="text-[10px] font-semibold text-blue-500 shrink-0 mt-0.5 uppercase tracking-wide">鞋类</span>
                    <span className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">{el.footwearApplication}</span>
                </div>

                {/* Suitable categories */}
                {el.suitableCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {el.suitableCategories.map((cat) => (
                            <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                {cat}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
