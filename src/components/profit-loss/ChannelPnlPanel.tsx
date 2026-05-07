'use client';
/**
 * src/components/profit-loss/ChannelPnlPanel.tsx
 * 渠道损益面板 — V3.1
 */
import { useMerchPnl } from '@/hooks/useMerchPnl';
import type { ForecastScenario } from '@/hooks/useForecast';
import { formatMoneyCny } from '@/config/numberFormat';

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }

export default function ChannelPnlPanel({ scenario }: { scenario: ForecastScenario }) {
    const result = useMerchPnl(scenario);
    if (!result) return <div className="flex items-center justify-center h-24 text-slate-400 text-sm">加载渠道损益中…</div>;

    const { channels, worstChannelByMargin } = result;

    return (
        <div className="space-y-4">
            {/* 业务结论 */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 space-y-1">
                <p className="text-xs font-semibold text-amber-800">渠道损益结论</p>
                {worstChannelByMargin && (
                    <p className="text-xs text-slate-700">
                        ⚠️ <strong>{worstChannelByMargin.label}</strong>贡献利润率最低（{pct(worstChannelByMargin.profitRate)}），{worstChannelByMargin.verdict}。
                    </p>
                )}
                <ul className="space-y-0.5 text-xs text-slate-600">
                    {channels.map(ch => (
                        <li key={ch.channel}>
                            {ch.profitRate < 0.08 ? '🔴' : ch.profitRate < 0.15 ? '🟡' : '🟢'} {ch.label}：贡献利润 {formatMoneyCny(ch.contributionProfit)}，利润率 {pct(ch.profitRate)}
                        </li>
                    ))}
                </ul>
            </div>

            {/* 表格 */}
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-slate-700">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                            <th className="text-left py-2 px-3 font-medium whitespace-nowrap">渠道</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">销售收入</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">毛利润</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">渠道费用</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">贡献利润</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">利润率</th>
                            <th className="text-left py-2 px-3 font-medium whitespace-nowrap">判断</th>
                        </tr>
                    </thead>
                    <tbody>
                        {channels.map(ch => (
                            <tr key={ch.channel} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="py-2 px-3 font-medium">{ch.label}</td>
                                <td className="text-right py-2 px-3">{formatMoneyCny(ch.revenue)}</td>
                                <td className="text-right py-2 px-3 text-emerald-600">{formatMoneyCny(ch.grossProfit)}</td>
                                <td className="text-right py-2 px-3 text-rose-500">{formatMoneyCny(ch.channelOpex)}</td>
                                <td className={`text-right py-2 px-3 font-semibold ${ch.contributionProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatMoneyCny(ch.contributionProfit)}</td>
                                <td className={`text-right py-2 px-3 font-semibold ${ch.profitRate >= 0.15 ? 'text-emerald-600' : ch.profitRate >= 0.08 ? 'text-amber-600' : 'text-rose-600'}`}>{pct(ch.profitRate)}</td>
                                <td className="py-2 px-3 text-slate-500">{ch.verdict}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
