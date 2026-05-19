'use client';

import { useState } from 'react';
import type { CompetitorMaterialItem, MaterialCategory, TrendStatusColor } from '@/types/competitorTrendTypes';

const MATERIAL_CATEGORIES: MaterialCategory[] = [
    '高热趋势', '价格带机会', '设计参考', '材质参考',
    '颜色参考', '功能卖点', '竞品爆款', '风险趋势',
];

const STATUS_DOT: Record<TrendStatusColor, string> = {
    green:  'bg-emerald-500',
    blue:   'bg-blue-500',
    orange: 'bg-amber-500',
    red:    'bg-rose-500',
    purple: 'bg-violet-500',
    gray:   'bg-slate-400',
};

function gradientBySeed(seed: string) {
    const gradients = [
        'linear-gradient(135deg, #334155 0%, #1f2937 100%)',
        'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
        'linear-gradient(135deg, #0f766e 0%, #0f172a 100%)',
        'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
        'linear-gradient(135deg, #4c1d95 0%, #581c87 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash += seed.charCodeAt(i);
    return gradients[Math.abs(hash) % gradients.length];
}

function cardBackground(imageUrl: string) {
    if (/^https?:\/\//i.test(imageUrl)) {
        return {
            backgroundImage: `linear-gradient(to top, rgba(15,23,42,0.55), rgba(15,23,42,0.1)), url("${imageUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        } as const;
    }
    return { background: gradientBySeed(imageUrl) } as const;
}

interface CompetitorMaterialGalleryProps {
    materials: CompetitorMaterialItem[];
    onJumpToDesign?: (item: CompetitorMaterialItem, action: string) => void;
    onJumpToPlanning?: (item: CompetitorMaterialItem) => void;
}

export default function CompetitorMaterialGallery({
    materials,
    onJumpToDesign,
    onJumpToPlanning,
}: CompetitorMaterialGalleryProps) {
    const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | 'all'>('all');
    const [showAll, setShowAll] = useState(false);

    const filtered = selectedCategory === 'all'
        ? materials
        : materials.filter((m) => m.materialCategory === selectedCategory);

    const TOP_N = 12;
    const visible = showAll ? filtered : filtered.slice(0, TOP_N);
    const hasMore = filtered.length > TOP_N;

    return (
        <div>
            {/* 分类过滤 */}
            <div className="flex flex-wrap gap-1.5 mb-4">
                <button
                    onClick={() => { setSelectedCategory('all'); setShowAll(false); }}
                    className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                        selectedCategory === 'all'
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    全部 ({materials.length})
                </button>
                {MATERIAL_CATEGORIES.map((cat) => {
                    const count = materials.filter((m) => m.materialCategory === cat).length;
                    if (count === 0) return null;
                    return (
                        <button
                            key={cat}
                            onClick={() => { setSelectedCategory(cat); setShowAll(false); }}
                            className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                                selectedCategory === cat
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {cat} ({count})
                        </button>
                    );
                })}
            </div>

            {/* 素材卡片网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {visible.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
                        {/* 图片区 */}
                        <div
                            className="h-36 px-3 py-2 flex flex-col justify-between"
                            style={cardBackground(item.imageUrl)}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`w-2 h-2 rounded-full mt-1 ${STATUS_DOT[item.statusColor]}`} />
                                <span className="text-[10px] bg-black/30 text-white px-2 py-0.5 rounded-full">
                                    {item.materialCategory}
                                </span>
                            </div>
                            <div className="flex items-end justify-between">
                                <span className="text-xs text-white/90 font-medium bg-black/25 px-2 py-0.5 rounded-full">
                                    {item.competitorBrand}
                                </span>
                                <span className="text-[10px] text-white/80 bg-black/20 px-2 py-0.5 rounded-full">
                                    热度 {item.heatScore}
                                </span>
                            </div>
                        </div>

                        {/* 信息区 */}
                        <div className="p-3">
                            <div className="text-xs font-semibold text-slate-800 line-clamp-1">{item.competitorSeries}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                                {item.year} {item.season} · {item.category} · {item.shoeType}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">¥{item.price}</div>

                            {/* 标签 */}
                            <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.map((tag) => (
                                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            {/* 可借鉴点 */}
                            <div className="text-[11px] text-emerald-600 mt-2 leading-relaxed line-clamp-2">
                                ✓ {item.learnable}
                            </div>

                            {/* 风险点 */}
                            {item.riskPoint && (
                                <div className="text-[11px] text-rose-500 mt-1 leading-relaxed line-clamp-1">
                                    ⚠ {item.riskPoint}
                                </div>
                            )}

                            {/* 动作按钮 */}
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-100">
                                {onJumpToDesign && (
                                    <>
                                        <button
                                            onClick={() => onJumpToDesign(item, '加入设计灵感池')}
                                            className="text-[10px] px-2 py-1 rounded bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
                                        >
                                            加入灵感池
                                        </button>
                                        <button
                                            onClick={() => onJumpToDesign(item, '生成竞品对标Brief')}
                                            className="text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                                        >
                                            生成Brief
                                        </button>
                                    </>
                                )}
                                {onJumpToPlanning && (
                                    <button
                                        onClick={() => onJumpToPlanning(item)}
                                        className="text-[10px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                    >
                                        加入波段
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 展开/折叠 */}
            {hasMore && (
                <div className="text-center mt-4">
                    <button
                        onClick={() => setShowAll((prev) => !prev)}
                        className="text-sm text-slate-600 border border-slate-200 rounded-full px-5 py-2 hover:bg-slate-50 transition-colors"
                    >
                        {showAll ? '收起' : `查看全部 ${filtered.length} 张素材`}
                    </button>
                </div>
            )}

            {visible.length === 0 && (
                <div className="text-center text-sm text-slate-400 py-10">当前分类暂无素材</div>
            )}
        </div>
    );
}
