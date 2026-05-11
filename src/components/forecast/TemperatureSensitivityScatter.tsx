'use client';
/**
 * src/components/forecast/TemperatureSensitivityScatter.tsx
 * S10a 气温-销售相关性散点图 + 拟合线 + What-if 滑块
 */
import { useRef, useEffect, useState } from 'react';
import tempRaw from '../../../data/planning/sales_forecast_temperature_sensitivity.json';
import { calcTemperatureSensitivity } from '@/utils/salesForecastV8';

type RegionData = { region: string; monthlyTemp: number[]; monthlySales: number[] };
type Correlation = { categoryId: string; categoryLabel: string; sensitivityPerDegree: number; correlationWithTemp: number };
type TempData = { historicalByRegion: RegionData[]; correlations: Correlation[]; whatIfScenarios: Array<{ label: string; tempAdjustment: number; salesImpact: number; affectedCategories?: string[] }> };

const data = tempRaw as TempData;

type EChartsInstance = { setOption: (opt: unknown) => void; resize: () => void; dispose: () => void };
type EChartsLib = { init: (el: HTMLElement) => EChartsInstance };

const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

export default function TemperatureSensitivityScatter() {
    const chartRef = useRef<HTMLDivElement>(null);
    const [activeRegion, setActiveRegion] = useState(data.historicalByRegion[0]?.region ?? '华东');
    const [tempDelta, setTempDelta] = useState(0);

    const regionData = data.historicalByRegion.find(r => r.region === activeRegion) ?? data.historicalByRegion[0];
    const sensitivity = calcTemperatureSensitivity(tempDelta, data.correlations);

    useEffect(() => {
        if (!chartRef.current || !regionData) return;
        let chart: EChartsInstance | null = null;
        const init = async () => {
            const echarts = (await import('echarts')) as unknown as EChartsLib;
            if (!chartRef.current) return;
            chart = echarts.init(chartRef.current);

            const scatterData = regionData.monthlyTemp.map((temp, i) => ({
                value: [temp + tempDelta, regionData.monthlySales[i]],
                name: MONTH_LABELS[i],
            }));

            // Simple linear regression for trendline
            const xs = scatterData.map(d => (d.value as number[])[0] ?? 0);
            const ys = scatterData.map(d => (d.value as number[])[1] ?? 0);
            const n = xs.length;
            const mx = xs.reduce((s, x) => s + x, 0) / n;
            const my = ys.reduce((s, y) => s + y, 0) / n;
            const slope = xs.reduce((s, x, i) => s + (x - mx) * ((ys[i] ?? 0) - my), 0) /
                xs.reduce((s, x) => s + (x - mx) ** 2, 0);
            const intercept = my - slope * mx;
            const minT = Math.min(...xs) - 2, maxT = Math.max(...xs) + 2;
            const trendLine = [
                [minT, slope * minT + intercept],
                [maxT, slope * maxT + intercept],
            ];

            chart.setOption({
                tooltip: {
                    trigger: 'item',
                    formatter: (p: { name?: string; value?: number[] }) =>
                        `${p.name}<br/>气温: ${((p.value?.[0] ?? 0) as number).toFixed(1)}℃<br/>月销: ¥${(((p.value?.[1] ?? 0) as number) / 10000).toFixed(0)}万`,
                },
                grid: { left: 65, right: 20, top: 24, bottom: 36 },
                xAxis: { type: 'value', name: '月均气温(℃)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10, formatter: (v: number) => v + '℃' } },
                yAxis: { type: 'value', name: '月销售额', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10, formatter: (v: number) => `${(v / 10000).toFixed(0)}万` } },
                series: [
                    {
                        type: 'scatter', data: scatterData, symbolSize: 18,
                        label: { show: true, formatter: (p: { name?: string }) => p.name ?? '', fontSize: 9, position: 'top' },
                        itemStyle: { color: '#0ea5e9', opacity: 0.85 },
                    },
                    {
                        type: 'line', data: trendLine, smooth: false,
                        lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' },
                        symbol: 'none', z: 2,
                    },
                ],
            });
        };
        init();
        const observer = new ResizeObserver(() => chart?.resize());
        if (chartRef.current) observer.observe(chartRef.current);
        return () => { observer.disconnect(); chart?.dispose(); };
    }, [regionData, tempDelta]);

    return (
        <div className="space-y-4">
            {/* Region Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                {data.historicalByRegion.map(r => (
                    <button key={r.region} onClick={() => setActiveRegion(r.region)}
                        className={`px-3 py-1 text-[11px] rounded-full border transition-colors ${activeRegion === r.region ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-600 border-slate-200'}`}>
                        {r.region}
                    </button>
                ))}
            </div>

            {/* Scatter Chart */}
            <div ref={chartRef} style={{ height: 240 }} />

            {/* What-if 气温情景滑块 */}
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-sky-700">🌡️ What-if: 气温偏差</span>
                    <span className={`text-xs font-bold ${tempDelta > 0 ? 'text-rose-600' : tempDelta < 0 ? 'text-sky-600' : 'text-slate-500'}`}>
                        {tempDelta > 0 ? '+' : ''}{tempDelta}℃
                    </span>
                </div>
                <input type="range" min={-5} max={5} step={0.5} value={tempDelta}
                    onChange={e => setTempDelta(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none bg-sky-200 cursor-pointer" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>-5℃ 极寒</span><span>正常年份</span><span>+5℃ 极暖</span>
                </div>
                {tempDelta !== 0 && (
                    <div className="mt-2 space-y-1">
                        {sensitivity.affectedCategoryImpacts.filter(c => Math.abs(c.impact) > 0.01).map(c => (
                            <div key={c.category} className="flex justify-between text-[11px]">
                                <span className="text-slate-600">{c.category}</span>
                                <span className={`font-medium ${c.impact > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {c.impact > 0 ? '+' : ''}{(c.impact * 100).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                        <div className="border-t border-sky-100 pt-1 flex justify-between text-[11px] font-medium">
                            <span className="text-sky-700">综合销售影响</span>
                            <span className={`${sensitivity.salesImpact > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {sensitivity.salesImpact > 0 ? '+' : ''}{(sensitivity.salesImpact * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* 品类相关系数 */}
            <div className="rounded-xl border border-slate-100 bg-white p-3">
                <div className="text-xs font-semibold text-slate-500 mb-2">各品类气温相关系数</div>
                <div className="grid grid-cols-2 gap-2">
                    {data.correlations.map(c => (
                        <div key={c.categoryId} className="flex items-center gap-2 text-[11px]">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${c.correlationWithTemp > 0 ? 'bg-sky-400' : 'bg-rose-400'}`}
                                    style={{ width: `${Math.abs(c.correlationWithTemp) * 100}%` }} />
                            </div>
                            <span className="text-slate-500 w-16 text-right">{c.categoryLabel}</span>
                            <span className={`font-medium w-10 text-right ${c.correlationWithTemp > 0.5 ? 'text-sky-600' : c.correlationWithTemp < -0.5 ? 'text-rose-600' : 'text-slate-500'}`}>
                                {c.correlationWithTemp.toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
