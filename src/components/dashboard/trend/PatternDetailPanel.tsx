'use client';

import type { PatternDetail } from '@/types/trendInsightTypes';

const CATEGORIES: PatternDetail['category'][] = ['图案', '工艺细节', '功能件'];

const CATEGORY_STYLES: Record<string, { text: string; badge: string }> = {
    图案: { text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
    工艺细节: { text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
    功能件: { text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
};

// 按 pattern.id 映射参考图
const PATTERN_IMAGE_MAP: Record<string, string> = {
    PD01: 'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?auto=format&fit=crop&w=400&q=70',
    PD02: 'https://images.unsplash.com/photo-1485053329739-67ae50df0f7e?auto=format&fit=crop&w=400&q=70',
    PD03: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=400&q=70',
    PD04: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=400&q=70',
    PD05: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=400&q=70',
    PD06: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=400&q=70',
    PD07: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=70',
    PD08: 'https://images.unsplash.com/photo-1519338381761-c7523edc1f46?auto=format&fit=crop&w=400&q=70',
};
const PATTERN_IMAGE_FALLBACK =
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=70';

export default function PatternDetailPanel({ patterns }: { patterns: PatternDetail[] }) {
    const grouped = CATEGORIES.reduce<Record<string, PatternDetail[]>>((acc, cat) => {
        acc[cat] = patterns.filter((p) => p.category === cat);
        return acc;
    }, {});

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => {
                const style = CATEGORY_STYLES[cat];
                return (
                    <div key={cat}>
                        <div className={`text-xs font-semibold mb-2 ${style.text}`}>{cat}</div>
                        <div className="grid grid-cols-1 gap-3">
                            {grouped[cat].map((pattern) => (
                                <div
                                    key={pattern.id}
                                    className="rounded-lg border border-slate-100 bg-white overflow-hidden"
                                >
                                    {/* 4:3 图片区 */}
                                    <div className="relative bg-slate-100" style={{ paddingBottom: '75%' }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={PATTERN_IMAGE_MAP[pattern.id] ?? PATTERN_IMAGE_FALLBACK}
                                            alt={pattern.name}
                                            loading="lazy"
                                            className="absolute inset-0 w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                        <span
                                            className={`absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded border font-medium ${style.badge}`}
                                        >
                                            {cat}
                                        </span>
                                    </div>
                                    <div className="p-2">
                                        <div className="text-xs font-semibold text-slate-700 mb-0.5">
                                            {pattern.name}
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                                            {pattern.description}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                                            {pattern.shoeApplication}
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {pattern.keyBrands.map((b) => (
                                                <span
                                                    key={b}
                                                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500"
                                                >
                                                    {b}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
