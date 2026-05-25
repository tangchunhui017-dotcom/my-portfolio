'use client';

import type { VisualLanguage } from '@/types/trendInsightTypes';

const DIMENSIONS: { key: keyof VisualLanguage; label: string; color: string }[] = [
    { key: 'styleKeywords', label: '风格关键词', color: 'bg-slate-100 text-slate-700' },
    { key: 'colors', label: '色彩', color: 'bg-yellow-50 text-yellow-700' },
    { key: 'materials', label: '材料', color: 'bg-amber-50 text-amber-700' },
    { key: 'silhouettes', label: '造型', color: 'bg-blue-50 text-blue-700' },
    { key: 'structures', label: '结构', color: 'bg-indigo-50 text-indigo-700' },
    { key: 'patterns', label: '图案', color: 'bg-violet-50 text-violet-700' },
    { key: 'details', label: '细节', color: 'bg-rose-50 text-rose-700' },
    { key: 'functions', label: '功能', color: 'bg-emerald-50 text-emerald-700' },
    { key: 'emotions', label: '情绪', color: 'bg-pink-50 text-pink-700' },
];

export default function VisualLanguageMatrix({ vl }: { vl: VisualLanguage }) {
    return (
        <div className="space-y-3">
            {/* 色彩比例单独一行 */}
            {vl.colorRatio && (
                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <span className="font-medium text-slate-600">色彩比例：</span>{vl.colorRatio}
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {DIMENSIONS.map(({ key, label, color }) => {
                    const values = vl[key];
                    if (Array.isArray(values) && values.length === 0) return null;
                    return (
                        <div key={key} className="rounded-lg border border-slate-100 bg-white p-2.5">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                                {label}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {(values as string[]).map((v) => (
                                    <span
                                        key={v}
                                        className={`text-[11px] px-2 py-0.5 rounded-full ${color}`}
                                    >
                                        {v}
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
