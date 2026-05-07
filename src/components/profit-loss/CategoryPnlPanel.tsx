'use client';
/**
 * src/components/profit-loss/CategoryPnlPanel.tsx
 * 品类损益面板 — V3.1
 */
import { useMerchPnl } from '@/hooks/useMerchPnl';
import type { ForecastScenario } from '@/hooks/useForecast';
import { formatMoneyCny } from '@/config/numberFormat';

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }

export default function CategoryPnlPanel({ scenario }: { scenario: ForecastScenario }) {
    const result = useMerchPnl(scenario);
    if (!result) return <div className="flex items-center justify-center h-24 text-slate-400 text-sm">加载品类损益中…</div>;

    const { categories, worstCategoryByContribution, totalRevenue } = result;

    return (
        <div className="space-y-4">
            {/* 业务结论 */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 space-y-1">
                <p className="text-xs font-semibold text-amber-800">品类损益结论</p>
                {worstCategoryByContribution && (
                    <p className="text-xs text-slate-700">
                        ⚠️ <strong>{worstCategoryByContribution.label}</strong>销售占比{pct(worstCategoryByContribution.revenue / totalRevenue)}，但贡献利润率仅{pct(worstCategoryByContribution.profitRate)}。{worstCategoryByContribution.verdict}
                    </p>
                )}
                <p className="text-xs text-slate-500">建议：高销售低利润品类优先审查折扣政策和费用结构，考虑提高吊牌价或减少促销力度。</p>
            </div>

            {/* 表格 */}
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-slate-700">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                            <th className="text-left py-2 px-3 font-medium whitespace-nowrap">品类</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">销售收入</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">销售占比</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">毛利率</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">毛利润</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">费用分摊</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">贡献利润</th>
                            <th className="text-right py-2 px-3 font-medium whitespace-nowrap">利润率</th>
                            <th className="text-left py-2 px-3 font-medium whitespace-nowrap">判断</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(cat => (
                            <tr key={cat.key} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="py-2 px-3 font-medium">{cat.label}</td>
                                <td className="text-right py-2 px-3">{formatMoneyCny(cat.revenue)}</td>
                                <td className="text-right py-2 px-3">{pct(cat.revenue / totalRevenue)}</td>
                                <td className={`text-right py-2 px-3 ${cat.grossMarginRate >= 0.60 ? 'text-emerald-600' : cat.grossMarginRate >= 0.55 ? 'text-slate-600' : 'text-amber-600'}`}>{pct(cat.grossMarginRate)}</td>
                                <td className="text-right py-2 px-3 text-emerald-600">{formatMoneyCny(cat.grossProfit)}</td>
                                <td className="text-right py-2 px-3 text-rose-400">{formatMoneyCny(cat.opexAllocation)}</td>
                                <td className={`text-right py-2 px-3 font-semibold ${cat.contributionProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatMoneyCny(cat.contributionProfit)}</td>
                                <td className={`text-right py-2 px-3 font-semibold ${cat.profitRate >= 0.20 ? 'text-emerald-600' : cat.profitRate >= 0.10 ? 'text-amber-600' : 'text-rose-600'}`}>{pct(cat.profitRate)}</td>
                                <td className="py-2 px-3 text-slate-500">{cat.verdict}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
