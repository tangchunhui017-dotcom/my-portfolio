'use client';

import type { TrendDesignOutput } from '@/types/trendInsightTypes';

export default function DesignBriefPanel({ output }: { output: TrendDesignOutput }) {
    return (
        <div className="space-y-4">
            {/* 主题故事 */}
            <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    主题故事
                </div>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
                    {output.themeStory}
                </p>
            </div>

            {/* 关键词 */}
            <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    关键词
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {output.keywords.map((kw) => (
                        <span key={kw} className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100 font-medium">
                            {kw}
                        </span>
                    ))}
                </div>
            </div>

            {/* 设计方向 4列 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                {[
                    { label: '色彩方向', values: output.colorDirection },
                    { label: '材料方向', values: output.materialDirection },
                    { label: '廓形方向', values: output.silhouetteDirection },
                    { label: '大底方向', values: output.outsoleDirection },
                ].map(({ label, values }) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-white p-2.5">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                            {label}
                        </div>
                        <ul className="space-y-1">
                            {values.map((v) => (
                                <li key={v} className="text-[11px] text-slate-700 flex items-start gap-1.5">
                                    <span className="text-slate-300 shrink-0 mt-0.5">•</span>
                                    {v}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* 细节方向 */}
            {output.detailDirection.length > 0 && (
                <div className="rounded-lg border border-slate-100 bg-white p-2.5">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                        细节方向
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {output.detailDirection.map((d) => (
                            <span key={d} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                {d}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Prompt */}
            {output.aiPrompt && (
                <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                        AI 图像提示词
                    </div>
                    <pre className="text-[11px] text-slate-600 bg-slate-100 rounded-lg p-3 whitespace-pre-wrap break-words font-mono leading-relaxed border border-slate-200">
                        {output.aiPrompt}
                    </pre>
                </div>
            )}

            {/* 任务 & 验收标准 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-slate-100 bg-white p-2.5">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                        开发任务
                    </div>
                    <ul className="space-y-1">
                        {output.tasks.map((t, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-slate-700">
                                <span className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded border border-slate-200 bg-slate-50 inline-block" />
                                {t}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-2.5">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                        验收标准
                    </div>
                    <ul className="space-y-1">
                        {output.reviewCriteria.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-slate-700">
                                <span className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded border border-emerald-300 bg-emerald-50 inline-block" />
                                {r}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
