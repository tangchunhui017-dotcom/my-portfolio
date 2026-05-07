'use client';
/**
 * src/components/forecast/ForecastTab.tsx
 * 销售预测 Tab — v2.1
 */
import { useState, useRef, useEffect } from 'react';
import { useForecast } from '@/hooks/useForecast';
import type { ForecastChannel, ForecastScenario } from '@/hooks/useForecast';
import { formatMoneyCny } from '@/config/numberFormat';
import { useGlobalConfig } from '@/context/GlobalConfigContext';
import ForecastMethodSwitcher from './ForecastMethodSwitcher';
import ForecastDriverPanel from './ForecastDriverPanel';
import ForecastMonthlyTable from './ForecastMonthlyTable';
import EcommerceCostPanel from './EcommerceCostPanel';
import NewStoreValidationPanel from './NewStoreValidationPanel';
import MerchMixForecastPanel from './MerchMixForecastPanel';

// 动态加载 ECharts 以避免 SSR 问题
type EChartsInstance = { setOption: (opt: unknown) => void; resize: () => void; dispose: () => void };
type EChartsLib = { init: (el: HTMLElement) => EChartsInstance };

function useMiniChart(ref: React.RefObject<HTMLDivElement | null>, option: unknown, deps: unknown[]) {
    useEffect(() => {
        if (!ref.current) return;
        let chart: EChartsInstance | null = null;
        const init = async () => {
            const echarts = (await import('echarts')) as unknown as EChartsLib;
            if (!ref.current) return;
            chart = echarts.init(ref.current);
            chart.setOption(option as object);
        };
        init();
        const observer = new ResizeObserver(() => chart?.resize());
        if (ref.current) observer.observe(ref.current);
        return () => {
            observer.disconnect();
            chart?.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

const CHANNELS: { key: ForecastChannel; label: string; icon: string }[] = [
    { key: 'physical', label: '实体店', icon: '🏪' },
    { key: 'ecommerce', label: '电商', icon: '🛒' },
    { key: 'new_store', label: '新店', icon: '🆕' },
];

const SCENARIOS: { key: ForecastScenario; label: string; color: string }[] = [
    { key: 'conservative', label: '保守', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { key: 'base', label: '基准', color: 'text-sky-600 bg-sky-50 border-sky-200' },
    { key: 'optimistic', label: '乐观', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
];

function KpiCard({ label, value, sub, tone = 'default' }: { label: string; value: string; sub?: string; tone?: 'positive' | 'negative' | 'warning' | 'default' }) {
    const toneClass = tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-rose-600' : tone === 'warning' ? 'text-amber-600' : 'text-slate-800';
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <div className="text-xs text-slate-400 mb-1">{label}</div>
            <div className={`text-lg font-bold ${toneClass}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
        </div>
    );
}

function MonthlyForecastChart({ channel, scenario }: { channel: ForecastChannel; scenario: ForecastScenario }) {
    const result = useForecast(channel, scenario);
    const chartRef = useRef<HTMLDivElement>(null);

    const option = result ? {
        tooltip: { trigger: 'axis', formatter: (params: Array<{ name: string; seriesName: string; value: number }>) => params.map(p => `${p.seriesName}: ${formatMoneyCny(p.value)}`).join('<br/>') },
        legend: { data: ['基准年', '预测年'], textStyle: { fontSize: 11 } },
        grid: { left: 60, right: 20, top: 32, bottom: 30 },
        xAxis: { type: 'category', data: result.monthly.map(m => m.label), axisLabel: { fontSize: 10 } },
        yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
        series: [
            { name: '基准年', type: 'bar', data: result.monthly.map(m => m.baseRevenue), barMaxWidth: 24, itemStyle: { color: '#cbd5e1' } },
            { name: '预测年', type: 'line', data: result.monthly.map(m => m.forecastRevenue), lineStyle: { color: '#38bdf8', width: 2 }, symbol: 'circle', symbolSize: 5, itemStyle: { color: '#38bdf8' } },
        ],
    } : null;

    useMiniChart(chartRef, option, [result]);

    return <div ref={chartRef} style={{ height: 220 }} />;
}

function ScenarioCompareTable({ channel }: { channel: ForecastChannel }) {
    const conservative = useForecast(channel, 'conservative');
    const base = useForecast(channel, 'base');
    const optimistic = useForecast(channel, 'optimistic');
    const rows = [
        { key: 'conservative', label: '保守', data: conservative },
        { key: 'base', label: '基准', data: base },
        { key: 'optimistic', label: '乐观', data: optimistic },
    ];
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-slate-700">
                <thead>
                    <tr className="border-b border-slate-100">
                        <th className="text-left py-2 px-3 font-medium text-slate-500">情景</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-500">年度预测</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-500">YoY</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-500">月均</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-500">预测双数</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ key, label, data }) => (
                        <tr key={key} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-2 px-3 font-medium">{label}</td>
                            <td className="text-right py-2 px-3">{data ? formatMoneyCny(data.annualForecast) : '-'}</td>
                            <td className={`text-right py-2 px-3 ${data && data.annualYoY >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {data ? `${data.annualYoY >= 0 ? '+' : ''}${(data.annualYoY * 100).toFixed(1)}%` : '-'}
                            </td>
                            <td className="text-right py-2 px-3">{data ? formatMoneyCny(data.monthlyAvg) : '-'}</td>
                            <td className="text-right py-2 px-3">{data ? data.forecastPairs.toLocaleString() : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function ForecastTab() {
    const [channel, setChannel] = useState<ForecastChannel>('physical');
    const [scenario, setScenario] = useState<ForecastScenario>('base');
    const [driverOpen, setDriverOpen] = useState(true);
    const result = useForecast(channel, scenario);
    const { config, updateForecast } = useGlobalConfig();

    return (
        <div className="space-y-6">
            {/* 1. 渠道切换 */}
            <div className="flex items-center gap-2 flex-wrap">
                {CHANNELS.map(c => (
                    <button
                        key={c.key}
                        onClick={() => setChannel(c.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${channel === c.key ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'}`}
                    >
                        <span>{c.icon}</span>
                        <span>{c.label}</span>
                    </button>
                ))}
            </div>

            {/* 2. 预测方法切换 */}
            <div className="flex items-center gap-4 flex-wrap">
                <ForecastMethodSwitcher
                    method={config.forecast.method}
                    onChange={m => updateForecast({ method: m })}
                />
                {/* 3. 情景切换 */}
                <div className="flex items-center gap-1.5 ml-auto">
                    {SCENARIOS.map(s => (
                        <button
                            key={s.key}
                            onClick={() => setScenario(s.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${scenario === s.key ? s.color + ' shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 4. 驱动参数面板 */}
            <div>
                <button
                    className="text-xs text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700"
                    onClick={() => setDriverOpen(o => !o)}
                >
                    <span>{driverOpen ? '▼' : '▶'}</span>
                    <span>驱动参数设置</span>
                </button>
                {driverOpen && <ForecastDriverPanel channel={channel} />}
            </div>

            {/* KPI 指标行 */}
            {result ? (
                <>
                    {result.isEstimated && (
                        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                            <span>⚠️</span>
                            <span>基准数据来自假设参数（未与事实销售匹配），以下预测为估算值。</span>
                        </div>
                    )}
                    {/* 5. KPI */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <KpiCard label="年度预测额" value={formatMoneyCny(result.annualForecast)} />
                        <KpiCard
                            label="YoY"
                            value={`${result.annualYoY >= 0 ? '+' : ''}${(result.annualYoY * 100).toFixed(1)}%`}
                            tone={result.annualYoY >= 0 ? 'positive' : 'negative'}
                        />
                        <KpiCard label="月均销售" value={formatMoneyCny(result.monthlyAvg)} />
                        <KpiCard label="预测双数" value={result.forecastPairs.toLocaleString()} sub="双" />
                        <KpiCard
                            label="损益平衡差额"
                            value={formatMoneyCny(result.breakEvenGap)}
                            tone={result.breakEvenGap >= 0 ? 'positive' : 'negative'}
                            sub={result.breakEvenGap >= 0 ? '高于平衡点' : '低于平衡点'}
                        />
                        <KpiCard label="渠道" value={CHANNELS.find(c => c.key === channel)?.label ?? ''} />
                    </div>

                    {/* 6. 月度预测图 */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">月度预测（基准年 vs 预测年）</h3>
                        </div>
                        <div className="p-4">
                            <MonthlyForecastChart channel={channel} scenario={scenario} />
                        </div>
                    </div>

                    {/* 7. 月度明细表 */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">月度预测明细</h3>
                        </div>
                        <div className="p-4">
                            <ForecastMonthlyTable result={result} />
                        </div>
                    </div>

                    {/* 8. 电商成本面板 */}
                    {channel === 'ecommerce' && result.ecommerceDriverRows && result.ecommerceDriverRows.length > 0 && (
                        <EcommerceCostPanel rows={result.ecommerceDriverRows} />
                    )}

                    {/* 9. 新店验证面板 */}
                    {channel === 'new_store' && result.newStoreValidation && (
                        <NewStoreValidationPanel data={result.newStoreValidation} />
                    )}

                    {/* 货盘拆解 */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">货盘预测拆解</h3>
                            <p className="text-xs text-slate-400 mt-0.5">品类 · 价格带 · 新老品 · 波段结构</p>
                        </div>
                        <div className="p-5">
                            <MerchMixForecastPanel scenario={scenario} channel={channel} />
                        </div>
                    </div>

                    {/* 10. 情景对比表 */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">情景对比</h3>
                        </div>
                        <ScenarioCompareTable channel={channel} />
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-40 text-slate-400 text-sm">加载预测数据中…</div>
            )}
        </div>
    );
}
