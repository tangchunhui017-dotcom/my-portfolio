'use client';
/**
 * src/components/dashboard/channel/SalesTargetProgressPanel.tsx
 * S6b: 区域销售完成度 vs 目标进度卡（7区域 × 4季度）
 */
import targetData from '../../../../data/planning/channel_sales_target_progress.json';

interface QuarterData {
    quarter: string;
    actual: number;
    target: number;
    achievementRate: number;
}

interface RegionProgress {
    region: string;
    quarters: QuarterData[];
    ytdActual: number;
    ytdTarget: number;
    ytdRate: number;
}

const data = targetData as {
    generatedAt: string;
    regions: RegionProgress[];
    laggingRegions: string[];
    sprintSuggestions: string[];
};

function fmtMoney(v: number): string {
    const abs = Math.abs(v);
    if (abs >= 1e8) return `¥${(abs / 1e8).toFixed(1)}亿`;
    if (abs >= 1e6) return `¥${(abs / 1e6).toFixed(0)}M`;
    if (abs >= 1e4) return `¥${(abs / 1e4).toFixed(0)}万`;
    return `¥${Math.round(abs).toLocaleString()}`;
}

function fmtPct(v: number, digits = 1): string {
    return `${(v * 100).toFixed(digits)}%`;
}

type AchStatus = 'green' | 'yellow' | 'red';

function getStatus(rate: number): AchStatus {
    if (rate >= 1.0) return 'green';
    if (rate >= 0.85) return 'yellow';
    return 'red';
}

const STATUS_CLS: Record<AchStatus, string> = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-400',
    red: 'bg-rose-500',
};

const STATUS_TEXT_CLS: Record<AchStatus, string> = {
    green: 'text-emerald-600',
    yellow: 'text-amber-600',
    red: 'text-rose-600',
};

const STATUS_BG: Record<AchStatus, string> = {
    green: 'bg-emerald-50 border-emerald-100',
    yellow: 'bg-amber-50 border-amber-100',
    red: 'bg-rose-50 border-rose-100',
};

function QuarterBar({ quarter, actual, target, achievementRate }: QuarterData) {
    const rate = achievementRate;
    const status = getStatus(rate);
    const barWidth = Math.min(rate * 100, 120);
    return (
        <div className="flex items-center gap-2 text-[10px]">
            <span className="w-5 text-slate-500 font-medium">{quarter}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-3 relative overflow-hidden">
                {/* 目标线 */}
                <div className="absolute top-0 h-3 w-px bg-slate-400 left-[100%]" style={{ transform: 'translateX(-50%)' }} />
                {/* 实际条 */}
                <div
                    className={`h-3 rounded-full transition-all ${STATUS_CLS[status]}`}
                    style={{ width: `${Math.min(barWidth, 100)}%` }}
                />
            </div>
            <span className={`w-12 text-right font-semibold ${STATUS_TEXT_CLS[status]}`}>
                {fmtPct(rate, 0)}
            </span>
            <span className="w-14 text-right text-slate-500">{fmtMoney(actual)}</span>
        </div>
    );
}

export default function SalesTargetProgressPanel() {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-5 rounded-full bg-emerald-500 inline-block" />
                <h3 className="text-base font-bold text-slate-900">区域销售完成度 vs 目标 🎯</h3>
                <span className="ml-auto text-[10px] text-slate-400">{data.generatedAt} 更新</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
                7 个大区 × 4 季度销售目标完成度。
                <span className="text-emerald-600 font-medium ml-1">绿≥100%</span>
                <span className="text-amber-600 font-medium ml-1">黄85-100%</span>
                <span className="text-rose-600 font-medium ml-1">红&lt;85%</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {data.regions.map((r) => {
                    const ytdStatus = getStatus(r.ytdRate);
                    return (
                        <div key={r.region} className={`rounded-xl border p-3 ${STATUS_BG[ytdStatus]}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-slate-800">{r.region}</span>
                                <div className="text-right">
                                    <span className={`text-base font-black ${STATUS_TEXT_CLS[ytdStatus]}`}>
                                        {fmtPct(r.ytdRate, 0)}
                                    </span>
                                    <div className="text-[9px] text-slate-400">YTD达成</div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                {r.quarters.map((q) => (
                                    <QuarterBar key={q.quarter} {...q} />
                                ))}
                            </div>
                            <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                                <span>YTD实际 <strong className="text-slate-700">{fmtMoney(r.ytdActual)}</strong></span>
                                <span>目标 <strong className="text-slate-700">{fmtMoney(r.ytdTarget)}</strong></span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 拖后腿区域 */}
            {data.laggingRegions.length > 0 && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <div className="text-xs font-semibold text-rose-700 mb-1">
                        🚨 拖后腿区域 Top {data.laggingRegions.length}：{data.laggingRegions.join(' / ')}
                    </div>
                    <div className="space-y-1">
                        {data.sprintSuggestions.map((s, i) => (
                            <div key={i} className="text-[11px] text-rose-700">→ {s}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
