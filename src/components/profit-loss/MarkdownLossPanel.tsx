'use client';
/**
 * src/components/profit-loss/MarkdownLossPanel.tsx
 * 折扣损失面板 — V3.1
 */
import { useMerchPnl } from '@/hooks/useMerchPnl';
import type { ForecastScenario } from '@/hooks/useForecast';
import { formatMoneyCny } from '@/config/numberFormat';

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }

const BAND_COLOR: Record<string, string> = {
    full_price: 'text-emerald-600 bg-emerald-50',
    promo: 'text-amber-600 bg-amber-50',
    clearance: 'text-rose-600 bg-rose-50',
};

export default function MarkdownLossPanel({ scenario }: { scenario: ForecastScenario }) {
    const result = useMerchPnl(scenario);
    if (!result) return <div className="flex items-center justify-center h-24 text-slate-400 text-sm">加载折扣损失中…</div>;

    const { markdownRows, totalMarkdownLoss, clearanceErosion, totalRevenue } = result;

    return (
        <div className="space-y-4">
            {/* 业务结论 */}
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-5 py-4 space-y-2">
                <p className="text-xs font-semibold text-rose-800">折扣损失结论</p>
                <p className="text-xs text-slate-700">
                    📉 全年折扣让利合计 <strong>{formatMoneyCny(totalMarkdownLoss)}</strong>（占全价收入 {pct(totalMarkdownLoss / (markdownRows.reduce((s, r) => s + r.fullPriceRevenue, 0) || 1))}）
                </p>
                {clearanceErosion > 0.10 && (
                    <p className="text-xs text-rose-700">
                        🔴 清货折扣侵蚀毛利 {pct(clearanceErosion)}，超过 10% 警戒线。建议控制清货款入场比例，加强正价销售管控。
                    </p>
                )}
                <ul className="text-xs text-slate-600 space-y-0.5 mt-1">
                    <li>✅ 建议：提高正价销售占比至60%以上；活动折扣严格执行最低折扣限制；清货款占比控制在15%以内。</li>
                </ul>
            </div>

            {/* 汇总KPI */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 text-center">
                    <div className="text-xs text-slate-400">总折扣让利</div>
                    <div className="text-base font-bold text-rose-600 mt-1">{formatMoneyCny(totalMarkdownLoss)}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 text-center">
                    <div className="text-xs text-slate-400">实际销售额</div>
                    <div className="text-base font-bold text-slate-800 mt-1">{formatMoneyCny(totalRevenue)}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 text-center">
                    <div className="text-xs text-slate-400">清货侵蚀毛利</div>
                    <div className={`text-base font-bold mt-1 ${clearanceErosion > 0.10 ? 'text-rose-600' : 'text-amber-600'}`}>{pct(clearanceErosion)}</div>
                </div>
            </div>

            {/* 表格 */}
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-slate-700">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                            <th className="text-left py-2 px-3 font-medium whitespace-nowrap">折扣带</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">实售占比</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">实际销售额</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">全价等效额</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">折扣让利</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">实售毛利润</th>
                        </tr>
                    </thead>
                    <tbody>
                        {markdownRows.map(row => (
                            <tr key={row.discountBand} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="py-2 px-3">
                                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${BAND_COLOR[row.discountBand] ?? 'text-slate-600 bg-slate-50'}`}>{row.label}</span>
                                </td>
                                <td className="text-right py-2 px-3">{pct(row.salesShare)}</td>
                                <td className="text-right py-2 px-3">{formatMoneyCny(row.actualRevenue)}</td>
                                <td className="text-right py-2 px-3 text-slate-400">{formatMoneyCny(row.fullPriceRevenue)}</td>
                                <td className="text-right py-2 px-3 text-rose-500 font-semibold">{formatMoneyCny(row.markdownLoss)}</td>
                                <td className="text-right py-2 px-3 text-emerald-600">{formatMoneyCny(row.grossMarginAtActual)}</td>
                            </tr>
                        ))}
                        <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                            <td className="py-2 px-3">合计</td>
                            <td className="text-right py-2 px-3">{pct(markdownRows.reduce((s, r) => s + r.salesShare, 0))}</td>
                            <td className="text-right py-2 px-3">{formatMoneyCny(totalRevenue)}</td>
                            <td className="text-right py-2 px-3 text-slate-400">{formatMoneyCny(markdownRows.reduce((s, r) => s + r.fullPriceRevenue, 0))}</td>
                            <td className="text-right py-2 px-3 text-rose-600">{formatMoneyCny(totalMarkdownLoss)}</td>
                            <td className="text-right py-2 px-3 text-emerald-600">{formatMoneyCny(markdownRows.reduce((s, r) => s + r.grossMarginAtActual, 0))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
