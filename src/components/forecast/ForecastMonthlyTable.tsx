'use client';
/**
 * src/components/forecast/ForecastMonthlyTable.tsx
 */
import { useGlobalConfig } from '@/context/GlobalConfigContext';
import type { ForecastResult } from '@/hooks/useForecast';

interface Props {
    result: ForecastResult;
}

function fmt(v: number) {
    return Math.abs(v) >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toFixed(0);
}
function pct(v: number | undefined) {
    if (v === undefined) return '—';
    return `${(v * 100).toFixed(1)}%`;
}

function NewStoreMonthlyTable({ result }: { result: ForecastResult }) {
    const validation = result.newStoreValidation;
    if (!validation) return null;

    const annualForecast = result.monthly.reduce((sum, m) => sum + m.forecastRevenue, 0);
    const recommendedAnnual = validation.recommendedMonthly * 12;
    const gapAnnual = annualForecast - recommendedAnnual;

    return (
        <div className="space-y-3">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                新店没有历史实际数据，月度明细改用“三法验证 + 月度预测分摊”。坪效法、客流法、平衡点法用于校准目标，最终预测仍跟随当前预测方法。
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm text-slate-700 whitespace-nowrap">
                    <thead>
                        <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                            <th className="px-3 py-2 text-left sticky left-0 bg-slate-50">月份</th>
                            <th className="px-3 py-2 text-right">坪效法月销</th>
                            <th className="px-3 py-2 text-right">客流法月销</th>
                            <th className="px-3 py-2 text-right">平衡点月销</th>
                            <th className="px-3 py-2 text-right">三法中值</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-700">最终预测</th>
                            <th className="px-3 py-2 text-right">vs中值</th>
                            <th className="px-3 py-2 text-right">经营判断</th>
                        </tr>
                    </thead>
                    <tbody>
                        {result.monthly.map(m => {
                            const gap = m.forecastRevenue - validation.recommendedMonthly;
                            const aboveBreakeven = m.forecastRevenue >= validation.angle3Monthly;
                            return (
                                <tr key={m.month} className="border-b border-slate-50 hover:bg-slate-50/60">
                                    <td className="px-3 py-2 font-medium sticky left-0 bg-white">{m.label}</td>
                                    <td className="px-3 py-2 text-right text-slate-500">{fmt(validation.angle1Monthly)}</td>
                                    <td className="px-3 py-2 text-right text-slate-500">{fmt(validation.angle2Monthly)}</td>
                                    <td className="px-3 py-2 text-right text-slate-500">{fmt(validation.angle3Monthly)}</td>
                                    <td className="px-3 py-2 text-right font-medium text-slate-700">{fmt(validation.recommendedMonthly)}</td>
                                    <td className="px-3 py-2 text-right font-semibold">{fmt(m.forecastRevenue)}</td>
                                    <td className={`px-3 py-2 text-right text-xs ${gap >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {gap >= 0 ? '+' : ''}{fmt(gap)}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${aboveBreakeven ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {aboveBreakeven ? '高于平衡点' : '低于平衡点'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-50 text-xs font-semibold text-slate-700">
                            <td className="px-3 py-2 sticky left-0 bg-slate-50">年度合计</td>
                            <td className="px-3 py-2 text-right">{fmt(validation.angle1Monthly * 12)}</td>
                            <td className="px-3 py-2 text-right">{fmt(validation.angle2Monthly * 12)}</td>
                            <td className="px-3 py-2 text-right">{fmt(validation.angle3Monthly * 12)}</td>
                            <td className="px-3 py-2 text-right">{fmt(recommendedAnnual)}</td>
                            <td className="px-3 py-2 text-right">{fmt(annualForecast)}</td>
                            <td className={`px-3 py-2 text-right ${gapAnnual >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {gapAnnual >= 0 ? '+' : ''}{fmt(gapAnnual)}
                            </td>
                            <td className="px-3 py-2 text-right">-</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

export default function ForecastMonthlyTable({ result }: Props) {
    const { config, updateMonthlyGrowthRate } = useGlobalConfig();
    const years = result.monthly[0]?.history ? Object.keys(result.monthly[0].history).sort() : [];
    const showDriverCol = result.method !== 'growth_based';

    if (result.channel === 'new_store') {
        return <NewStoreMonthlyTable result={result} />;
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm text-slate-700 whitespace-nowrap">
                <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                        <th className="px-3 py-2 text-left sticky left-0 bg-slate-50">月份</th>
                        {years.map(y => (
                            <th key={y} className="px-3 py-2 text-right">{y}实际</th>
                        ))}
                        <th className="px-3 py-2 text-right">加权基准</th>
                        <th className="px-3 py-2 text-right">增长率</th>
                        <th className="px-3 py-2 text-right">增长率预测</th>
                        {showDriverCol && <th className="px-3 py-2 text-right">驱动预测</th>}
                        <th className="px-3 py-2 text-right font-semibold text-slate-700">最终预测</th>
                        <th className="px-3 py-2 text-right">YoY</th>
                    </tr>
                </thead>
                <tbody>
                    {result.monthly.map((m, i) => {
                        const growthPct = config.forecast.growthRateMode === 'monthly_custom'
                            ? config.forecast.monthlyGrowthRates[i]
                            : (m.growthRate ?? 0);

                        // Growth-based forecast is always baseRevenue * (1 + growthRate)
                        const growthForecast = result.channel === 'physical' && result.physicalDriverRows?.[i]
                            ? result.physicalDriverRows[i].growthForecastSales
                            : result.channel === 'ecommerce' && result.ecommerceDriverRows?.[i]
                            ? result.ecommerceDriverRows[i].grossSales
                            : m.forecastRevenue;

                        const driverForecast = result.channel === 'physical' && result.physicalDriverRows?.[i]
                            ? result.physicalDriverRows[i].driverForecastSales
                            : result.channel === 'ecommerce' && result.ecommerceDriverRows?.[i]
                            ? result.ecommerceDriverRows[i].netSales
                            : m.forecastRevenue;

                        return (
                            <tr key={m.month} className="border-b border-slate-50 hover:bg-slate-50/60">
                                <td className="px-3 py-2 font-medium sticky left-0 bg-white">{m.label}</td>
                                {years.map(y => (
                                    <td key={y} className="px-3 py-2 text-right text-slate-400">
                                        {fmt(m.history?.[y] ?? 0)}
                                    </td>
                                ))}
                                <td className="px-3 py-2 text-right text-slate-500">{fmt(m.weightedBase ?? m.baseRevenue)}</td>
                                <td className="px-3 py-2 text-right">
                                    {config.forecast.growthRateMode === 'monthly_custom' ? (
                                        <input
                                            type="number"
                                            step={0.1}
                                            value={+(growthPct * 100).toFixed(1)}
                                            onChange={e => {
                                                const v = parseFloat(e.target.value);
                                                if (!isNaN(v)) updateMonthlyGrowthRate(i, v / 100);
                                            }}
                                            className="w-16 border border-slate-200 rounded px-1 py-0.5 text-right text-xs"
                                        />
                                    ) : (
                                        <span>{pct(growthPct)}</span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-right">{fmt(growthForecast)}</td>
                                {showDriverCol && (
                                    <td className="px-3 py-2 text-right text-violet-600">{fmt(driverForecast)}</td>
                                )}
                                <td className="px-3 py-2 text-right font-semibold">{fmt(m.forecastRevenue)}</td>
                                <td className={`px-3 py-2 text-right text-xs ${(m.yoyVsLastYear ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {pct(m.yoyVsLastYear)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
