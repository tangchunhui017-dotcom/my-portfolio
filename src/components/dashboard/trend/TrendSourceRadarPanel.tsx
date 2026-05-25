'use client';

import type { TrendSourceFactor } from '@/types/trendInsightTypes';

export default function TrendSourceRadarPanel({ sources }: { sources: TrendSourceFactor[] }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {sources.map((src) => {
                const filled = (src.heatScore / 10) * 100;
                const barColor =
                    src.heatScore >= 8
                        ? 'bg-emerald-500'
                        : src.heatScore >= 5
                        ? 'bg-amber-400'
                        : 'bg-slate-300';

                return (
                    <div
                        key={src.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-2"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{src.icon}</span>
                            <span className="font-semibold text-slate-800 text-sm">{src.name}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded overflow-hidden">
                            <div
                                className={`h-full rounded ${barColor}`}
                                style={{ width: `${filled}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-[1.5]">{src.footwearImpact}</p>
                    </div>
                );
            })}
        </div>
    );
}
