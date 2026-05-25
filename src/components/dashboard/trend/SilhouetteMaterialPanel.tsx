'use client';

import type { SilhouetteDirection, MaterialDirection } from '@/types/trendInsightTypes';

const SIGNAL_STYLES: Record<string, string> = {
    上升: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    稳定: 'bg-blue-50 text-blue-700 border-blue-200',
    下降: 'bg-rose-50 text-rose-700 border-rose-200',
};

// 每种材质对应的 Unsplash 参考图
const MATERIAL_IMAGE_MAP: Record<string, string> = {
    绒面革: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=300&q=70',
    麂皮: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=300&q=70',
    'TPU': 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=300&q=70',
    编织网布: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=70',
    网布: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=70',
    帆布: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae75?auto=format&fit=crop&w=300&q=70',
    漆皮: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=300&q=70',
    再生: 'https://images.unsplash.com/photo-1584735175315-9d5df23be4be?auto=format&fit=crop&w=300&q=70',
    环保: 'https://images.unsplash.com/photo-1584735175315-9d5df23be4be?auto=format&fit=crop&w=300&q=70',
};
const MATERIAL_IMAGE_FALLBACK =
    'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=300&q=70';

function getMaterialImage(type: string): string {
    for (const [key, url] of Object.entries(MATERIAL_IMAGE_MAP)) {
        if (type.includes(key)) return url;
    }
    return MATERIAL_IMAGE_FALLBACK;
}

// 每个廓形维度对应的 Unsplash 参考图
const SILHOUETTE_IMAGE_MAP: Record<string, string> = {
    底厚: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=70',
    楦型: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=200&q=70',
    帮高: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=200&q=70',
    整体廓形: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=200&q=70',
};
const SILHOUETTE_IMAGE_FALLBACK =
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=200&q=70';

function getSilhouetteImage(dimension: string): string {
    return SILHOUETTE_IMAGE_MAP[dimension] ?? SILHOUETTE_IMAGE_FALLBACK;
}

export default function SilhouetteMaterialPanel({
    silhouettes,
    materials,
}: {
    silhouettes: SilhouetteDirection[];
    materials: MaterialDirection[];
}) {
    return (
        <div className="flex flex-col gap-6">
            {/* 廓形方向 */}
            <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">廓形方向</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {silhouettes.map((s) => (
                        <div
                            key={s.id}
                            className="flex gap-3 rounded-lg border border-slate-100 bg-white p-2"
                        >
                            <div className="w-14 h-14 shrink-0 rounded-md overflow-hidden bg-slate-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={getSilhouetteImage(s.dimension)}
                                    alt={s.dimension}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-xs font-semibold text-slate-700 shrink-0">{s.dimension}</span>
                                    <span className="text-[10px] text-blue-600 line-clamp-1">{s.trendDirection}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-1">
                                    {s.keyPoints.slice(0, 2).map((kp) => (
                                        <span
                                            key={kp}
                                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600"
                                        >
                                            {kp}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-500 line-clamp-2">{s.brandRecommendation}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 材质信号 */}
            <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">材质信号</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {materials.map((m) => (
                        <div key={m.id} className="rounded-lg border border-slate-100 bg-white overflow-hidden">
                            <div className="relative bg-slate-100" style={{ paddingBottom: '75%' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={getMaterialImage(m.materialType)}
                                    alt={m.materialType}
                                    loading="lazy"
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                                <span
                                    className={`absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${SIGNAL_STYLES[m.trendSignal]}`}
                                >
                                    {m.trendSignal}
                                </span>
                            </div>
                            <div className="p-2">
                                <div className="text-xs font-semibold text-slate-700 mb-1">{m.materialType}</div>
                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                                    {m.description}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{m.brandApplication}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
