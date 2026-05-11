'use client';
/**
 * src/components/forecast/ForecastMonthlyTable.tsx
 */
import { useGlobalConfig } from '@/context/GlobalConfigContext';
import type { ForecastResult, ForecastChannel } from '@/hooks/useForecast';
import seasonalRaw from '../../../data/planning/sales_forecast_seasonal_index.json';
import lifecycleRaw from '../../../data/planning/sales_forecast_lifecycle_stage.json';

type SeasonalData = Record<string, number[] | unknown> & {
    physical: number[]; ecommerce: number[]; new_store: number[]; anomalyThreshold: number;
};
type LifecycleMonth = { month: number; newStyle: number; carryover: number; replenishment: number; clearance: number };
const seasonalIdx = seasonalRaw as unknown as SeasonalData;
const lifecycleByMonth = (lifecycleRaw as { byMonth: LifecycleMonth[] }).byMonth;

// 鞋类专属基准（每个渠道的尺码完整率 / 连带率参考值）
const FOOTWEAR_BENCHMARK: Record<ForecastChannel, { sizeCoverage: number; pairsPerOrder: number }> = {
    physical: { sizeCoverage: 0.915, pairsPerOrder: 1.82 },
    ecommerce: { sizeCoverage: 0.88, pairsPerOrder: 1.45 },
    new_store: { sizeCoverage: 0.88, pairsPerOrder: 1.70 },
};

interface Props {
    result: ForecastResult;
    channel?: ForecastChannel;
}

function fmt(v: number) {
    return Math.abs(v) >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toFixed(0);
}
function pct(v: number | undefined) {
    if (v === undefined) return '—';
    return `${(v * 100).toFixed(1)}%`;
}

function LifecycleBar({ m }: { m: LifecycleMonth }) {
    const segs = [
        { v: m.newStyle, c: 'bg-sky-500', label: `新${(m.newStyle * 100).toFixed(0)}%` },
        { v: m.carryover, c: 'bg-slate-400', label: `延${(m.carryover * 100).toFixed(0)}%` },
        { v: m.replenishment, c: 'bg-amber-400', label: `翻${(m.replenishment * 100).toFixed(0)}%` },
        { v: m.clearance, c: 'bg-rose-400', label: `清${(m.clearance * 100).toFixed(0)}%` },
    ];
    const tip = segs.map(s => s.label).join(' · ');
    return (
        <div className="flex h-2 w-16 rounded-full overflow-hidden bg-slate-100" title={tip}>
            {segs.map((s, i) => <div key={i} className={s.c} style={{ width: `${s.v * 100}%` }} />)}
        </div>
    );
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

export default function ForecastMonthlyTable({ result, channel: channelProp }: Props) {
    const { config, updateMonthlyGrowthRate } = useGlobalConfig();
    const years = result.monthly[0]?.history ? Object.keys(result.monthly[0].history).sort() : [];
    const showDriverCol = result.method !== 'growth_based';
    const channel: ForecastChannel = channelProp ?? result.channel ?? 'physical';
    const seasonal = seasonalIdx[channel] as number[] | undefined ?? [];
    const benchmark = FOOTWEAR_BENCHMARK[channel];
    const anomalyThreshold = seasonalIdx.anomalyThreshold ?? 0.15;

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
                        <th className="px-3 py-2 text-right text-amber-600" title="鞋类月度销售季节系数（1.0=年均）">季节系数</th>
                        <th className="px-3 py-2 text-right text-sky-600" title="预测期内核心尺码段可售比例">尺码完整率</th>
                        <th className="px-3 py-2 text-right text-violet-600" title="预测期每单平均买双数">连带率</th>
                        <th className="px-3 py-2 text-right">生命周期</th>
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

                        const seasonCoef = seasonal[i] ?? 1;
                        const expectedFromSeason = (m.weightedBase ?? m.baseRevenue) * seasonCoef;
                        const seasonDeviation = expectedFromSeason > 0 ? (m.forecastRevenue - expectedFromSeason) / expectedFromSeason : 0;
                        const isSeasonAnomaly = Math.abs(seasonDeviation) > anomalyThreshold;
                        // 鞋类专属预测值：以渠道基准为锚，按月度规模微调（旺季略降、淡季略升）
                        const monthlyScale = (m.weightedBase ?? m.baseRevenue) > 0
                            ? m.forecastRevenue / (m.weightedBase ?? m.baseRevenue) : 1;
                        const sizeCoverage = Math.max(0.7, Math.min(1, benchmark.sizeCoverage * (2 - Math.max(0.8, Math.min(1.4, seasonCoef)) / 1.1)));
                        const pairsPerOrder = benchmark.pairsPerOrder * (0.95 + (monthlyScale - 1) * 0.1);
                        const lifecycle = lifecycleByMonth[i];

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
                                <td className={`px-3 py-2 text-right text-xs ${isSeasonAnomaly ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}
                                    title={isSeasonAnomaly ? `偏离季节系数 ${(seasonDeviation * 100).toFixed(1)}%` : '季节基准内'}>
                                    {seasonCoef.toFixed(2)}{isSeasonAnomaly && ' ⚠'}
                                </td>
                                <td className={`px-3 py-2 text-right text-xs ${sizeCoverage < 0.85 ? 'text-amber-600' : 'text-sky-600'}`}>
                                    {pct(sizeCoverage)}
                                </td>
                                <td className="px-3 py-2 text-right text-xs text-violet-600">
                                    {pairsPerOrder.toFixed(2)}
                                </td>
                                <td className="px-3 py-2"><div className="flex justify-end"><LifecycleBar m={lifecycle} /></div></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
