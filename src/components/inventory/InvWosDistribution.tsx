'use client';
/**
 * WOS 分布图 — 支持 SKU数/库存双数/库存金额 三种口径切换
 */
import { useState } from 'react';
import { calcWosDistribution, fmtCny } from '@/utils/inventoryHealth';
import type { StyleRecord, WosViewMode } from '@/utils/inventoryHealth';

interface Props { styles: StyleRecord[]; }

export default function InvWosDistribution({ styles }: Props) {
    const [viewMode, setViewMode] = useState<WosViewMode>('sku');
    const stats = calcWosDistribution(styles);

    const getValue = (s: typeof stats[0]) => {
        if (viewMode === 'sku') return s.skuCount;
        if (viewMode === 'qty') return s.totalQty;
        return s.totalAmount;
    };
    const formatValue = (v: number) => {
        if (viewMode === 'sku') return v + ' 款';
        if (viewMode === 'qty') return v.toLocaleString() + ' 双';
        return fmtCny(v);
    };
    const total = stats.reduce((s, b) => s + getValue(b), 0);
    const maxVal = Math.max(...stats.map(getValue), 1);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-700">WOS 分布</span>
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                    {([['sku','SKU 款数'],['qty','可售双数'],['amount','库存金额']] as [WosViewMode,string][]).map(([k,l]) => (
                        <button key={k} onClick={() => setViewMode(k)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${viewMode === k ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                {stats.map(s => {
                    const val = getValue(s);
                    const pct = total > 0 ? val / total * 100 : 0;
                    const barW = maxVal > 0 ? val / maxVal * 100 : 0;
                    return (
                        <div key={s.bucket.key} className="flex items-center gap-3">
                            <div className="w-16 text-right text-[11px] font-medium text-slate-500 shrink-0">{s.bucket.label}</div>
                            <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                                    style={{ width: `${Math.max(barW, 2)}%`, backgroundColor: s.bucket.color }}>
                                    {val > 0 && <span className="text-[9px] font-bold text-white">{formatValue(val)}</span>}
                                </div>
                            </div>
                            <div className="w-36 shrink-0 flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-slate-700">{pct.toFixed(0)}%</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${s.bucket.bgClass} ${s.bucket.textClass} ${s.bucket.borderClass}`}>{s.bucket.desc}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="text-[10px] text-slate-400 border-t border-slate-50 pt-2 flex flex-wrap gap-3">
                <span>WOS = 可售库存 / 周均销量</span>
                <span>健康目标：6–8 周占比 &gt; 40%</span>
                <span>当前健康占比: <strong className="text-slate-700">{total > 0 ? (getValue(stats.find(s => s.bucket.key === 'healthy') ?? stats[2]) / total * 100).toFixed(0) : 0}%</strong></span>
            </div>
        </div>
    );
}
