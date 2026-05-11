'use client';
/**
 * 今日优先处理行动队列
 */
import { useState } from 'react';
import { getCategoryLabel, getChannelLabel, getRiskBadgeStyle, getRiskLabel, fmtCny } from '@/utils/inventoryHealth';
import type { RiskType } from '@/utils/inventoryHealth';

interface ActionItem {
    id: string; priority: number; riskType: string; styleId: string; styleName: string;
    category: string; channel: string; action: string; owner: string; deadline: string;
    financialImpact: number; actionLink: string | null; desc: string;
}

interface Props { items: ActionItem[]; }

const ACTION_LINK_LABELS: Record<string, string> = { otb: '→ OTB', pnl: '→ 损益', transfer: '→ 调拨', forecast: '→ 预测' };

export default function InvActionQueue({ items }: Props) {
    const [filter, setFilter] = useState<'all' | 'stockout' | 'overstock' | 'high'>('all');

    const filtered = filter === 'all' ? items : items.filter(i => i.riskType === filter);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div>
                    <span className="text-xs font-bold text-slate-800">今日优先处理行动队列</span>
                    <span className="ml-2 text-[10px] text-slate-400">按影响金额排序 · 共 {items.length} 条</span>
                </div>
                <div className="flex gap-1">
                    {[['all','全部'], ['stockout','断货'], ['overstock','积压'], ['high','偏高']] .map(([k,l]) => (
                        <button key={k} onClick={() => setFilter(k as typeof filter)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${filter === k ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>
            <div className="divide-y divide-slate-50">
                {filtered.map(item => {
                    const riskCls = getRiskBadgeStyle(item.riskType as RiskType);
                    const isOpportunityLoss = ['stockout', 'tight'].includes(item.riskType);
                    const impactTone = isOpportunityLoss || item.financialImpact < 0 ? 'text-rose-600' : 'text-emerald-600';
                    return (
                        <div key={item.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{item.priority}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <span className="text-xs font-semibold text-slate-800">{item.styleName}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${riskCls}`}>{getRiskLabel(item.riskType as RiskType)}</span>
                                    <span className="text-[10px] text-slate-400">{getCategoryLabel(item.category)} · {getChannelLabel(item.channel)}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mb-1">{item.desc}</p>
                                <div className="flex items-center gap-3 flex-wrap text-[10px]">
                                    <span className="bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded font-medium">✦ {item.action}</span>
                                    <span className="text-slate-400">负责人: {item.owner}</span>
                                    <span className="text-slate-400">截止: {item.deadline}</span>
                                    {item.actionLink && <span className="text-sky-500 font-medium">{ACTION_LINK_LABELS[item.actionLink]}</span>}
                                </div>
                            </div>
                            {item.financialImpact !== 0 && (
                                <div className="text-right shrink-0">
                                    <div className={`text-xs font-bold ${impactTone}`}>
                                        {fmtCny(Math.abs(item.financialImpact))}
                                    </div>
                                    <div className="text-[10px] text-slate-400">{isOpportunityLoss ? '机会损失' : '毛利影响'}</div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {filtered.length === 0 && <div className="px-5 py-8 text-center text-sm text-slate-400">✅ 当前筛选下无待处理动作</div>}
            </div>
        </div>
    );
}
