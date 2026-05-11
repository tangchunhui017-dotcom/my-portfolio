'use client';
/**
 * 尺码健康 + 渠道/区域库存分布
 */
import { useState } from 'react';

interface SizeCategoryHealth {
    key: string; label: string;
    coreSizes: string[]; womenCoreSizes: string[];
    avgCoverRate: number; brokenSizeRate: number; marginalOverstockRate: number;
    topBrokenSizes: string[]; topOverstockSizes: string[];
}

interface ChannelDist {
    channel: string; label: string; stockAmount: number; onHandQty: number;
    wos: number; healthyPct: number; overstockPct: number; stockoutPct: number; region: string;
}

interface Props { sizeHealth: { categories: SizeCategoryHealth[] }; channelDistribution: ChannelDist[]; }

function pct(v: number) { return (v * 100).toFixed(0) + '%'; }
function fmtCny(v: number) {
    const a = Math.abs(v);
    if (a >= 1e8) return '¥' + (a / 1e8).toFixed(1) + '亿';
    if (a >= 1e4) return '¥' + (a / 1e4).toFixed(0) + '万';
    return '¥' + a.toLocaleString();
}

export default function InvSizeChannel({ sizeHealth, channelDistribution }: Props) {
    const [view, setView] = useState<'size' | 'channel'>('size');

    return (
        <div className="space-y-3">
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg w-fit">
                {([['size','尺码健康'],['channel','渠道分布']] as ['size'|'channel', string][]).map(([k,l]) => (
                    <button key={k} onClick={() => setView(k)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${view === k ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        {l}
                    </button>
                ))}
            </div>

            {view === 'size' && (
                <div className="space-y-3">
                    <div className="text-[11px] text-slate-400 bg-slate-50 px-4 py-2.5 rounded-xl">
                        尺码健康 = 核心码覆盖率 / 断码率 / 边缘码积压率。鞋类核心码：男鞋 39-43，女鞋 36-39。断码率 &gt; 20% 触发补货预警。
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sizeHealth.categories.map(cat => {
                            const coverOk = cat.avgCoverRate >= 0.88;
                            const brokenWarn = cat.brokenSizeRate > 0.15;
                            const overstockWarn = cat.marginalOverstockRate > 0.12;
                            return (
                                <div key={cat.key} className={`bg-white rounded-2xl border p-4 ${brokenWarn ? 'border-orange-200' : 'border-slate-100'} shadow-sm`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-slate-800">{cat.label}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${coverOk ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            覆盖率 {pct(cat.avgCoverRate)}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-[11px]">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">断码率</span>
                                            <span className={`font-semibold ${brokenWarn ? 'text-rose-600' : 'text-emerald-600'}`}>{pct(cat.brokenSizeRate)} {brokenWarn ? '⚠️' : '✅'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">边缘码积压率</span>
                                            <span className={`font-semibold ${overstockWarn ? 'text-amber-600' : 'text-slate-600'}`}>{pct(cat.marginalOverstockRate)}</span>
                                        </div>
                                        {cat.topBrokenSizes.length > 0 && (
                                            <div className="pt-1 border-t border-slate-50">
                                                <span className="text-slate-400">断货核心码: </span>
                                                <span className="text-rose-600 font-medium">{cat.topBrokenSizes.join(', ')}</span>
                                            </div>
                                        )}
                                        {cat.topOverstockSizes.length > 0 && (
                                            <div>
                                                <span className="text-slate-400">积压边缘码: </span>
                                                <span className="text-purple-600 font-medium">{cat.topOverstockSizes.join(', ')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {view === 'channel' && (
                <div className="space-y-3">
                    {channelDistribution.map(ch => {
                        const healthyBar = ch.healthyPct * 100;
                        const overstockBar = ch.overstockPct * 100;
                        const stockoutBar = ch.stockoutPct * 100;
                        return (
                            <div key={ch.channel} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="text-xs font-bold text-slate-800">{ch.label}</span>
                                        <span className="ml-2 text-[10px] text-slate-400">{ch.region}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px]">
                                        <span className="text-slate-500">WOS {ch.wos.toFixed(1)}W</span>
                                        <span className="font-semibold text-slate-700">{fmtCny(ch.stockAmount)}</span>
                                        <span className="text-slate-400">{ch.onHandQty.toLocaleString()} 双</span>
                                    </div>
                                </div>
                                <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                                    <div title={`健康 ${pct(ch.healthyPct)}`} className="bg-emerald-400 transition-all" style={{ width: pct(ch.healthyPct) }} />
                                    <div title={`断货 ${pct(ch.stockoutPct)}`} className="bg-red-400 transition-all" style={{ width: pct(ch.stockoutPct) }} />
                                    <div title={`积压 ${pct(ch.overstockPct)}`} className="bg-purple-400 transition-all" style={{ width: pct(ch.overstockPct) }} />
                                    <div className="bg-slate-200 flex-1" />
                                </div>
                                <div className="flex gap-3 mt-2 text-[10px] text-slate-400">
                                    <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />健康 {pct(healthyBar/100)}</span>
                                    <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />断货 {pct(stockoutBar/100)}</span>
                                    <span><span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-1" />积压 {pct(overstockBar/100)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
