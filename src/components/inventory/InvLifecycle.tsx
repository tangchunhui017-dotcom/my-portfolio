'use client';
/**
 * 波段生命周期库存复盘 + 商品企划反写建议
 */
import { fmtCny } from '@/utils/inventoryHealth';

interface LifecycleRow {
    lifecycle: string; label: string;
    wos: number; skuCount: number; stockAmount: number; avgSellThrough: number; action: string;
}

interface Props { lifecycleDistribution: LifecycleRow[]; }

const LIFECYCLE_COLORS: Record<string, { bg: string; border: string; text: string; bar: string }> = {
    '新品期': { bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-700', bar: 'bg-sky-400' },
    '成长期': { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-400' },
    '成熟期': { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', bar: 'bg-amber-400' },
    '清退期': { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', bar: 'bg-purple-400' },
};

const LIFECYCLE_WOS_TARGET: Record<string, [number, number]> = {
    '新品期': [4, 10], '成长期': [6, 12], '成熟期': [6, 10], '清退期': [0, 6],
};

export default function InvLifecycle({ lifecycleDistribution }: Props) {
    const maxAmount = Math.max(...lifecycleDistribution.map(l => l.stockAmount), 1);

    return (
        <div className="space-y-3">
            <div className="text-[11px] text-slate-400 bg-slate-50 px-4 py-2.5 rounded-xl">
                不同生命周期应使用不同 WOS 健康阈值：<strong className="text-slate-600">清退期目标 &lt;6W · 成长期目标 6–12W · 新品期关注速度</strong>。
                避免对所有商品套用同一标准。
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lifecycleDistribution.map(row => {
                    const c = LIFECYCLE_COLORS[row.lifecycle] ?? LIFECYCLE_COLORS['成熟期'];
                    const [minWos, maxWos] = LIFECYCLE_WOS_TARGET[row.lifecycle] ?? [6, 10];
                    const wosOk = row.wos >= minWos && row.wos <= maxWos;
                    const wosWarn = row.lifecycle === '清退期' ? row.wos > 12 : row.wos > maxWos * 1.5;
                    const barW = row.stockAmount / maxAmount * 100;
                    return (
                        <div key={row.lifecycle} className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className={`text-xs font-bold ${c.text}`}>{row.label}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">{row.skuCount} 款 · 库存 {fmtCny(row.stockAmount)}</div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-lg font-black ${wosWarn ? 'text-rose-600' : wosOk ? c.text : 'text-amber-600'}`}>{row.wos.toFixed(1)}W</div>
                                    <div className="text-[10px] text-slate-400">目标 {minWos}–{maxWos}W</div>
                                </div>
                            </div>
                            <div className="bg-white/60 rounded-lg h-3 overflow-hidden mb-2">
                                <div className={`h-full ${c.bar} rounded-lg transition-all`} style={{ width: `${barW}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-500">均售罄率 {(row.avgSellThrough * 100).toFixed(0)}%</span>
                                <span className={`font-semibold ${c.text}`}>{row.action}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* 商品企划反写建议 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="text-xs font-bold text-slate-700 mb-3">📋 商品企划反写建议</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {[
                        { icon: '📈', title: '下季加深', desc: '跑鞋/凉拖 成长期款，建议下季采购+15%，核心码加深优先' },
                        { icon: '📉', title: '减量控补', desc: '休闲鞋/板鞋 清退期款，下季停新、现有库存加速清理' },
                        { icon: '📐', title: '尺码曲线修正', desc: '训练鞋女款 36-39 系统性缺货，下季按女码倒三角加深' },
                        { icon: '💰', title: '价格带优化', desc: '500-799 价格带积压率偏高，建议下季降低该价格带新品比例' },
                    ].map(s => (
                        <div key={s.icon} className="flex gap-2.5 bg-slate-50 rounded-xl p-3">
                            <span className="text-base">{s.icon}</span>
                            <div>
                                <div className="font-semibold text-slate-700">{s.title}</div>
                                <div className="text-slate-500 mt-0.5">{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
