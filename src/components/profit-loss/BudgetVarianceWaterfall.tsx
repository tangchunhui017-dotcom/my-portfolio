'use client';
/**
 * src/components/profit-loss/BudgetVarianceWaterfall.tsx
 * S3: 预算偏差归因 — 瀑布图 + Top5 超支归因表
 */
import { useRef, useEffect } from 'react';
import bvaRaw from '../../../data/planning/pnl_budget_variance_attribution.json';

type BvaData = typeof bvaRaw;
const bva = bvaRaw as BvaData;

type ECharts = { setOption: (o: unknown) => void; resize: () => void; dispose: () => void };
type EChartsLib = { init: (el: HTMLElement) => ECharts };

function fmtCny(v: number) {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : v > 0 ? '+' : '';
    if (abs >= 1e4) return `${sign}¥${(abs / 10000).toFixed(0)}万`;
    return `${sign}¥${abs.toLocaleString()}`;
}

function BvaWaterfallChart() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        let chart: ECharts | null = null;
        const init = async () => {
            const ec = (await import('echarts')) as unknown as EChartsLib;
            if (!ref.current) return;
            chart = ec.init(ref.current);
            const items = bva.varianceItems;
            const names = ['预算净利润', ...items.map(i => i.item), '实际净利润'];
            const values = [bva.summary.budgetNetProfit, ...items.map(i => i.variance), bva.summary.actualNetProfit];
            const colors = values.map((v, idx) => {
                if (idx === 0 || idx === values.length - 1) return v >= 0 ? '#10b981' : '#f43f5e';
                return v >= 0 ? '#38bdf8' : '#fb923c';
            });
            chart.setOption({
                tooltip: { trigger: 'axis', formatter: (params: Array<{ name: string; dataIndex: number }>) => {
                    const idx = params[0]?.dataIndex ?? 0;
                    const item = bva.varianceItems[idx - 1];
                    return item ? `${item.item}<br/>${fmtCny(item.variance)}<br/><span style="color:#94a3b8;font-size:11px">${item.attribution}</span>` : `${names[idx]}: ${fmtCny(values[idx])}`;
                }},
                grid: { left: 12, right: 12, top: 20, bottom: 60, containLabel: true },
                xAxis: { type: 'category', data: names, axisLabel: { fontSize: 9, interval: 0, rotate: 25 } },
                yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 9 } },
                series: [{ type: 'bar', data: values.map((v, i) => ({ value: Math.abs(v), itemStyle: { color: colors[i] } })), barMaxWidth: 32,
                    label: { show: true, position: 'top', fontSize: 8, formatter: (p: { dataIndex: number }) => fmtCny(values[p.dataIndex] ?? 0) } }],
            });
        };
        init();
        const obs = new ResizeObserver(() => chart?.resize());
        if (ref.current) obs.observe(ref.current);
        return () => { obs.disconnect(); chart?.dispose(); };
    }, []);
    return <div ref={ref} style={{ height: 280 }} />;
}

const PRIORITY_CLS: Record<string, string> = {
    P0: 'bg-rose-100 text-rose-700',
    P1: 'bg-amber-100 text-amber-700',
    P2: 'bg-slate-100 text-slate-500',
};

export default function BudgetVarianceWaterfall() {
    const { summary, top5Overspend } = bva;
    const profitVariance = summary.profitVariance;
    return (
        <div className="space-y-4">
            {/* 预警条 */}
            <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${profitVariance < 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <span className="text-base shrink-0">{profitVariance < 0 ? '🔴' : '✅'}</span>
                <div className="text-xs">
                    <span className="font-bold text-slate-800">净利润 vs 预算: {fmtCny(profitVariance)}</span>
                    <span className="text-slate-500 ml-2">净收入 {fmtCny(summary.revenueVariance)}</span>
                    <span className="text-slate-400 ml-1 text-[10px]">（费用超支拖累利润）</span>
                </div>
            </div>
            {/* 瀑布图 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <BvaWaterfallChart />
                <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded bg-sky-400 inline-block" />节省/增收</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded bg-orange-400 inline-block" />超支</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded bg-emerald-500 inline-block" />利润小计</span>
                </div>
            </div>
            {/* Top5 超支归因表 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 text-xs font-semibold text-slate-700">📋 Top 5 超支项归因</div>
                <div className="divide-y divide-slate-50">
                    {top5Overspend.map(row => (
                        <div key={row.rank} className="flex items-start gap-3 px-4 py-3">
                            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center justify-center shrink-0">{row.rank}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-semibold text-slate-800">{row.item}</span>
                                    <span className="text-[11px] font-bold text-rose-600">{fmtCny(row.variance)}</span>
                                </div>
                                <p className="text-[11px] text-slate-500">{row.attribution}</p>
                            </div>
                            {row.otbLink && (
                                <button className="text-[10px] text-sky-600 border border-sky-200 rounded px-2 py-0.5 hover:bg-sky-50 whitespace-nowrap shrink-0">
                                    → OTB {row.otbLink}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
