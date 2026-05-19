'use client';
/**
 * src/components/dashboard/channel/DistributionPnlMatrix.tsx
 * S5c: 直营/加盟/经销/电商分销 P&L 矩阵
 */
import pnlData from '../../../../data/planning/channel_distribution_pnl.json';

interface ChannelRow {
    channel: string;
    storeCount: number | null;
    netRevenue: number;
    grossMarginRate: number;
    contributionProfit: number;
    inventoryTurnover: number;
    judgment: 'add' | 'control' | 'clear' | 'maintain';
    judgmentLabel: string;
    detail: string;
}

const data = pnlData as {
    generatedAt: string;
    channels: ChannelRow[];
    summary: {
        totalRevenue: number;
        totalContributionProfit: number;
        blendedGrossMarginRate: number;
        keyInsight: string;
    };
};

const JUDGMENT_COLOR: Record<string, string> = {
    add: 'border-emerald-200 bg-emerald-50',
    control: 'border-amber-200 bg-amber-50',
    clear: 'border-rose-200 bg-rose-50',
    maintain: 'border-blue-200 bg-blue-50',
};

function fmtMoney(v: number): string {
    if (!Number.isFinite(v)) return '—';
    const abs = Math.abs(v);
    if (abs >= 1e8) return `¥${(abs / 1e8).toFixed(2)}亿`;
    if (abs >= 1e4) return `¥${(abs / 1e4).toFixed(0)}万`;
    return `¥${Math.round(abs).toLocaleString('zh-CN')}`;
}

function fmtPct(v: number): string {
    return `${(v * 100).toFixed(1)}%`;
}

function HealthBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-0.5">
            <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

export default function DistributionPnlMatrix() {
    const maxRevenue = Math.max(...data.channels.map(c => c.netRevenue));

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-5 rounded-full bg-violet-500 inline-block" />
                <h3 className="text-base font-bold text-slate-900">直营 / 加盟 / 经销 / 电商 P&L 矩阵</h3>
                <span className="ml-auto text-[10px] text-slate-400">{data.generatedAt} 更新</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
                鞋类多渠道分销结构差异大，必须独立分析。贡献利润 = 净收入 × (毛利率 − 渠道运营成本率)。
            </p>

            {/* 汇总条 */}
            <div className="mb-4 grid grid-cols-3 gap-2">
                {[
                    { label: '全渠道净收入', value: fmtMoney(data.summary.totalRevenue) },
                    { label: '综合毛利率', value: fmtPct(data.summary.blendedGrossMarginRate) },
                    { label: '总贡献利润', value: fmtMoney(data.summary.totalContributionProfit) },
                ].map(item => (
                    <div key={item.label} className="text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-[10px] text-slate-500 mb-0.5">{item.label}</div>
                        <div className="text-base font-bold text-slate-800">{item.value}</div>
                    </div>
                ))}
            </div>

            {/* 渠道卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {data.channels.map((ch) => (
                    <div key={ch.channel} className={`rounded-xl border p-3 ${JUDGMENT_COLOR[ch.judgment]}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-slate-800">{ch.channel}</span>
                            <span className="text-xs">{ch.judgmentLabel}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mb-2">
                            <div>
                                <span className="text-[10px] text-slate-500">门店数</span>
                                <div className="font-semibold text-slate-800">{ch.storeCount !== null ? `${ch.storeCount}家` : '电商'}</div>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500">净收入</span>
                                <div className="font-semibold text-slate-800">{fmtMoney(ch.netRevenue)}</div>
                                <HealthBar value={ch.netRevenue} max={maxRevenue} color="bg-blue-400" />
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500">毛利率</span>
                                <div className={`font-semibold ${ch.grossMarginRate >= 0.45 ? 'text-emerald-600' : ch.grossMarginRate >= 0.32 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {fmtPct(ch.grossMarginRate)}
                                </div>
                                <HealthBar value={ch.grossMarginRate * 100} max={60} color={ch.grossMarginRate >= 0.45 ? 'bg-emerald-400' : ch.grossMarginRate >= 0.32 ? 'bg-amber-400' : 'bg-rose-400'} />
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500">库存周转</span>
                                <div className={`font-semibold ${ch.inventoryTurnover >= 4.5 ? 'text-emerald-600' : ch.inventoryTurnover >= 3 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {ch.inventoryTurnover.toFixed(1)}×
                                </div>
                                <HealthBar value={ch.inventoryTurnover} max={7} color={ch.inventoryTurnover >= 4.5 ? 'bg-emerald-400' : ch.inventoryTurnover >= 3 ? 'bg-amber-400' : 'bg-rose-400'} />
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-600 bg-white/70 rounded-lg px-2 py-1.5 leading-relaxed">
                            {ch.detail}
                        </div>
                    </div>
                ))}
            </div>

            {/* 关键洞察 */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-xs text-violet-800">
                🔑 {data.summary.keyInsight}
            </div>
        </div>
    );
}
