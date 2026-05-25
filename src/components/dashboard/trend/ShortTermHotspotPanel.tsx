'use client';

import type { ShortTermHotspot } from '@/types/trendInsightTypes';

const HEAT_STYLES: Record<string, string> = {
    爆款: 'bg-rose-50 text-rose-700 border-rose-200',
    上升: 'bg-amber-50 text-amber-700 border-amber-200',
    观察: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function ShortTermHotspotPanel({ hotspots }: { hotspots: ShortTermHotspot[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {hotspots.map((hs) => (
                <div
                    key={hs.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-2"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span
                            className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${HEAT_STYLES[hs.heatLevel]}`}
                        >
                            {hs.heatLevel}
                        </span>
                    </div>
                    <div className="font-semibold text-slate-800 text-sm">{hs.name}</div>
                    <div className="text-xs text-slate-500">
                        {hs.platform} / 峰值窗口：{hs.peakWindow}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{hs.footwearOpportunity}</p>
                    <div className="mt-auto pt-1">
                        <span className="text-[10px] text-slate-400 border border-dashed border-slate-300 rounded px-2 py-0.5">
                            参考关键词：{hs.referenceKeyword}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
