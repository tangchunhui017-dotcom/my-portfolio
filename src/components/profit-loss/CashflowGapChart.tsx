'use client';
/**
 * src/components/profit-loss/CashflowGapChart.tsx
 * S9: 现金流时点视图 — 月度收付双柱 + 缺口预警 + DSO/DPO/CCC + OTB联动
 */
import { useRef, useEffect } from 'react';
import cashflowRaw from '../../../data/planning/pnl_cashflow_schedule.json';
import arApRaw from '../../../data/planning/pnl_ar_ap_account.json';

type Cashflow = typeof cashflowRaw;
const cf = cashflowRaw as Cashflow;
type ArAp = typeof arApRaw;
const arap = arApRaw as ArAp;

type ECharts = { setOption: (o: unknown) => void; resize: () => void; dispose: () => void };
type EChartsLib = { init: (el: HTMLElement) => ECharts };

function fmtCny(v: number) {
    const abs = Math.abs(v);
    if (abs >= 1e4) return `¥${(Math.abs(v) / 10000).toFixed(0)}万`;
    return `¥${Math.abs(v).toLocaleString()}`;
}

function CashflowChart() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        let chart: ECharts | null = null;
        const init = async () => {
            const ec = (await import('echarts')) as unknown as EChartsLib;
            if (!ref.current) return;
            chart = ec.init(ref.current);
            const months = cf.monthly;
            chart.setOption({
                tooltip: { trigger: 'axis', formatter: (p: Array<{ name: string; seriesName: string; value: number }>) => {
                    const m = months.find(x => x.label === p[0]?.name);
                    const base = p.map(x => `${x.seriesName}: ${fmtCny(x.value)}`).join('<br/>');
                    return m ? base + `<br/><span style="color:#94a3b8;font-size:10px">${m.note}</span>` : base;
                }},
                legend: { data: ['销售收款', '采购付款', '运营付款', '净现金流'], textStyle: { fontSize: 10 }, top: 4 },
                grid: { left: 60, right: 20, top: 36, bottom: 28 },
                xAxis: { type: 'category', data: months.map(m => m.label), axisLabel: { fontSize: 10 } },
                yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 9 } },
                series: [
                    { name: '销售收款', type: 'bar', stack: 'in', data: months.map(m => m.salesReceipt), barMaxWidth: 18, itemStyle: { color: '#10b981' } },
                    { name: '采购付款', type: 'bar', stack: 'out', data: months.map(m => -m.purchasePayment), barMaxWidth: 18, itemStyle: { color: '#f97316' } },
                    { name: '运营付款', type: 'bar', stack: 'out', data: months.map(m => -m.opexPayment), barMaxWidth: 18, itemStyle: { color: '#fb923c' } },
                    { name: '净现金流', type: 'line', data: months.map(m => m.netCashflow),
                        lineStyle: { color: '#38bdf8', width: 2.5 }, symbol: 'circle', symbolSize: 5,
                        itemStyle: { color: (p: { dataIndex: number }) => months[p.dataIndex]?.gapFlag ? '#f43f5e' : '#38bdf8' },
                        markPoint: {
                            data: months.filter(m => m.gapFlag).map(m => ({ coord: [m.label, m.netCashflow], symbol: 'triangle', symbolSize: 10, itemStyle: { color: '#f43f5e' } })),
                        },
                    },
                ],
            });
        };
        init();
        const obs = new ResizeObserver(() => chart?.resize());
        if (ref.current) obs.observe(ref.current);
        return () => { obs.disconnect(); chart?.dispose(); };
    }, []);
    return <div ref={ref} style={{ height: 280 }} />;
}

export default function CashflowGapChart() {
    const { summary, otbLinkage } = cf;
    const gapMonths = cf.monthly.filter(m => m.gapFlag);

    return (
        <div className="space-y-4">
            {/* 现金缺口月份预警 */}
            {gapMonths.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span>💰</span>
                        <span className="text-xs font-bold text-rose-800">现金缺口预警：共 {gapMonths.length} 个月净现金流为负</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {gapMonths.map(m => (
                            <span key={m.month} className="text-[11px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">
                                {m.label} ({fmtCny(m.netCashflow)})
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {/* 双柱图 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <CashflowChart />
            </div>
            {/* DSO/DPO/CCC + 应收应付 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { l: 'DSO（收款天数）', v: summary.dso + ' 天', tone: summary.dso <= 20 ? 'green' : 'amber' },
                    { l: 'DIO（库存天数）', v: summary.dio + ' 天', tone: summary.dio <= 90 ? 'green' : 'amber' },
                    { l: 'DPO（付款天数）', v: summary.dpo + ' 天', tone: 'neutral' },
                    { l: 'CCC（现金转化周期）', v: summary.ccc + ' 天', tone: summary.ccc <= 70 ? 'green' : 'red' },
                    { l: '应收账款余额', v: `¥${(summary.arBalance / 10000).toFixed(1)}万`, tone: 'neutral' },
                    { l: '应付账款余额', v: `¥${(summary.apBalance / 10000).toFixed(1)}万`, tone: 'neutral' },
                    { l: '缺口月份数', v: summary.totalGapMonths + ' 个月', tone: summary.totalGapMonths <= 3 ? 'green' : 'amber' },
                    { l: '最大缺口月', v: summary.peakGapMonth, tone: 'amber' },
                ].map(k => {
                    const cls = k.tone === 'green' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : k.tone === 'amber' ? 'text-amber-700 bg-amber-50 border-amber-100' : k.tone === 'red' ? 'text-rose-700 bg-rose-50 border-rose-100' : 'text-slate-700 bg-white border-slate-100';
                    return (
                        <div key={k.l} className={`rounded-xl border px-3 py-2.5 ${cls}`}>
                            <div className="text-[10px] opacity-70">{k.l}</div>
                            <div className="font-bold text-sm">{k.v}</div>
                        </div>
                    );
                })}
            </div>
            {/* OTB联动 */}
            <div className="bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-sky-50 text-xs font-semibold text-sky-700">🔗 OTB 采购现金联动</div>
                <div className="divide-y divide-slate-50">
                    {otbLinkage.map(o => (
                        <div key={o.quarter} className="flex items-start gap-3 px-4 py-3">
                            <span className="text-[11px] px-2 py-0.5 bg-sky-100 text-sky-700 rounded font-medium shrink-0">{o.quarter}</span>
                            <p className="text-[11px] text-slate-600 flex-1">{o.note}</p>
                            <span className="text-[11px] font-bold text-orange-600 shrink-0">¥{(o.otbAmount / 1e6).toFixed(0)}M</span>
                        </div>
                    ))}
                </div>
            </div>
            {/* 应收账期明细 */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 text-xs font-semibold text-slate-600">📋 各渠道应收账期</div>
                <div className="divide-y divide-slate-50">
                    {arap.arChannels.map(ch => (
                        <div key={ch.channel} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="text-xs font-medium text-slate-700 w-32">{ch.label}</span>
                            <span className="text-xs text-slate-500">账期 {ch.paymentTermDays} 天</span>
                            <span className="text-xs text-slate-500">余额 ¥{(ch.arBalance / 10000).toFixed(1)}万</span>
                            {ch.overdueAmount > 0 && (
                                <span className="text-[11px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded">超期 ¥{(ch.overdueAmount / 10000).toFixed(1)}万</span>
                            )}
                            <span className="text-[10px] text-slate-400 ml-auto">{ch.note}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
