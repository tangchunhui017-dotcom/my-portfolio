'use client';
/**
 * 库存四象限诊断
 */
import { calcQuadrantGroups, QUADRANTS, getCategoryLabel, getRiskBadgeStyle, getRiskLabel } from '@/utils/inventoryHealth';
import type { StyleRecord } from '@/utils/inventoryHealth';

interface Props { styles: StyleRecord[]; }

export default function InvQuadrant({ styles }: Props) {
    const groups = calcQuadrantGroups(styles);

    return (
        <div className="space-y-3">
            <div className="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-4 py-2.5">
                四象限诊断：以<strong className="text-slate-600"> 销售速度 × 库存水位 </strong>为轴，区分4类库存状态，精准匹配补货/清货/调拨/停补动作。
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUADRANTS.map(q => {
                    const items = groups[q.key];
                    return (
                        <div key={q.key} className={`rounded-2xl border ${q.borderClass} ${q.bgClass} p-4`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{q.icon}</span>
                                    <div>
                                        <div className={`text-xs font-bold ${q.textClass}`}>{q.label}</div>
                                        <div className="text-[10px] text-slate-400">{q.desc}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-base font-black ${q.textClass}`}>{items.length}</div>
                                    <div className="text-[10px] text-slate-400">款</div>
                                </div>
                            </div>
                            {items.length > 0 ? (
                                <div className="space-y-1.5">
                                    {items.slice(0, 4).map(s => (
                                        <div key={s.styleId} className="flex items-center justify-between bg-white/70 rounded-lg px-2.5 py-1.5">
                                            <div className="min-w-0 flex-1">
                                                <span className="text-[11px] font-medium text-slate-700 truncate block">{s.name}</span>
                                                <span className="text-[10px] text-slate-400">{getCategoryLabel(s.category)} · WOS {s.wos.toFixed(1)}W</span>
                                            </div>
                                            <div className="text-right ml-2 shrink-0">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getRiskBadgeStyle(s.riskType)}`}>{getRiskLabel(s.riskType)}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {items.length > 4 && <div className="text-[10px] text-slate-400 text-center pt-1">+{items.length - 4} 款</div>}
                                </div>
                            ) : (
                                <div className="text-[11px] text-slate-400 text-center py-3">暂无</div>
                            )}
                            <div className={`mt-3 pt-2.5 border-t border-current/10 text-[10px] font-semibold ${q.textClass}`}>推荐动作: {q.action}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
