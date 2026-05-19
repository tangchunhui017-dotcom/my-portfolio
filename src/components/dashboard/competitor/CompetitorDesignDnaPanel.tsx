'use client';

import { useState } from 'react';
import type { CompetitorDesignDna } from '@/types/competitorTrendTypes';

interface CompetitorDesignDnaPanelProps {
    dnaList: CompetitorDesignDna[];
    onJumpToDesign?: (dna: CompetitorDesignDna) => void;
}

export default function CompetitorDesignDnaPanel({ dnaList, onJumpToDesign }: CompetitorDesignDnaPanelProps) {
    const [selectedId, setSelectedId] = useState<string>(dnaList[0]?.id || '');
    const selected = dnaList.find((d) => d.id === selectedId) || dnaList[0];

    return (
        <div className="flex flex-col xl:flex-row gap-4">
            {/* 竞品列表 */}
            <div className="xl:w-56 flex-shrink-0 space-y-1.5">
                {dnaList.map((dna) => (
                    <button
                        key={dna.id}
                        onClick={() => setSelectedId(dna.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-colors ${
                            selectedId === dna.id
                                ? 'border-blue-300 bg-blue-50 text-blue-800'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <div className="font-semibold">{dna.competitorBrand}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{dna.competitorSeries}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{dna.shoeType}</div>
                    </button>
                ))}
            </div>

            {/* DNA 详情 */}
            {selected && (
                <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 基础设计 */}
                        <div className="space-y-2.5">
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">设计语言</div>
                            {[
                                { label: '廓形', value: selected.silhouette },
                                { label: '楦型', value: selected.lastShape },
                                { label: '鞋底结构', value: selected.soleStructure },
                                { label: '鞋面材质', value: selected.upperMaterial },
                                { label: '颜色故事', value: selected.colorStory },
                                { label: '工艺细节', value: selected.craftDetail },
                                { label: '功能卖点', value: selected.functionKeypoint },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex gap-2 text-xs">
                                    <span className="text-slate-400 flex-shrink-0 w-16">{label}</span>
                                    <span className="text-slate-700">{value}</span>
                                </div>
                            ))}
                            <div className="flex gap-2 text-xs">
                                <span className="text-slate-400 flex-shrink-0 w-16">视觉关键词</span>
                                <div className="flex flex-wrap gap-1">
                                    {selected.visualKeywords.map((kw) => (
                                        <span key={kw} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">#{kw}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 可借鉴 & 避免 */}
                        <div className="space-y-4">
                            <div>
                                <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mb-2">可借鉴点</div>
                                <ul className="space-y-1.5">
                                    {selected.learnable.map((item, i) => (
                                        <li key={i} className="flex gap-1.5 text-xs text-slate-600">
                                            <span className="text-emerald-500 flex-shrink-0">✓</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wide mb-2">避免点</div>
                                <ul className="space-y-1.5">
                                    {selected.avoidPoints.map((item, i) => (
                                        <li key={i} className="flex gap-1.5 text-xs text-slate-600">
                                            <span className="text-rose-500 flex-shrink-0">✗</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                {onJumpToDesign && (
                                    <button
                                        onClick={() => onJumpToDesign(selected)}
                                        className="text-xs px-3 py-1.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
                                    >
                                        加入设计灵感池
                                    </button>
                                )}
                                {onJumpToDesign && (
                                    <button
                                        onClick={() => onJumpToDesign(selected)}
                                        className="text-xs px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                                    >
                                        生成竞品对标Brief
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
