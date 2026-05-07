'use client';
/**
 * src/components/otb/CashflowSubView.tsx
 * 现金流预测子视图
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { useCashflow } from '@/hooks/useCashflow';
import type { CashflowSimulationOptions, MonthlyCashflow } from '@/hooks/useCashflow';
import { formatMoneyCny } from '@/config/numberFormat';
import InventoryCashPressurePanel from './InventoryCashPressurePanel';

type SimulationKey = 'base' | 'delay_otb' | 'reduce_first_otb' | 'clearance_cash' | 'add_cash';

const SIMULATIONS: { key: SimulationKey; label: string; desc: string }[] = [
    { key: 'base', label: '当前排期', desc: '不调整付款和资金' },
    { key: 'delay_otb', label: 'OTB付款后移1个月', desc: '模拟供应商账期谈判' },
    { key: 'reduce_first_otb', label: '首批OTB降20%', desc: '模拟降低首批下单压力' },
    { key: 'clearance_cash', label: '提前清货回款', desc: '模拟20%库存按5折在1月回款' },
    { key: 'add_cash', label: '增加备用金300万', desc: '模拟授信或股东借款' },
];

function alertBadge(level: MonthlyCashflow['alertLevel']) {
    if (level === 'danger') return <span className="text-[9px] font-bold text-white bg-rose-500 px-1.5 py-0.5 rounded-full">危险</span>;
    if (level === 'warning') return <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">预警</span>;
    return <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">安全</span>;
}

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

function CashflowChart({ monthly }: { monthly: MonthlyCashflow[] }) {
    const chartRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!chartRef.current || monthly.length === 0) return;
        let chart: { setOption: (opt: unknown) => void; resize: () => void; dispose: () => void } | null = null;
        const init = async () => {
            const echarts = await import('echarts') as unknown as { init: (el: HTMLElement) => typeof chart };
            if (!chartRef.current) return;
            chart = echarts.init(chartRef.current) as typeof chart;
            chart!.setOption({
                tooltip: { trigger: 'axis' },
                legend: { data: ['净现金流', '期末余额'], textStyle: { fontSize: 11 } },
                grid: { left: 70, right: 70, top: 36, bottom: 30 },
                xAxis: { type: 'category', data: monthly.map(m => m.label), axisLabel: { fontSize: 10 } },
                yAxis: [
                    { type: 'value', name: '净现金流', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
                    { type: 'value', name: '期末余额', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
                ],
                series: [
                    {
                        name: '净现金流',
                        type: 'bar',
                        data: monthly.map(m => ({
                            value: m.netCashflow,
                            itemStyle: { color: m.netCashflow >= 0 ? '#10b981' : '#f43f5e' },
                        })),
                        barMaxWidth: 28,
                    },
                    {
                        name: '期末余额',
                        type: 'line',
                        yAxisIndex: 1,
                        data: monthly.map(m => m.closingBalance),
                        lineStyle: { color: '#38bdf8', width: 2 },
                        symbol: 'circle',
                        symbolSize: 5,
                        itemStyle: { color: '#38bdf8' },
                        areaStyle: { color: 'rgba(56,189,248,0.08)' },
                    },
                ],
            });
        };
        init();
        const observer = new ResizeObserver(() => chart?.resize());
        if (chartRef.current) observer.observe(chartRef.current);
        return () => { observer.disconnect(); chart?.dispose(); };
    }, [monthly]);
    return <div ref={chartRef} style={{ height: 240 }} />;
}

function OtbPaymentChart({ monthly }: { monthly: MonthlyCashflow[] }) {
    const chartRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!chartRef.current || monthly.length === 0) return;
        let chart: { setOption: (opt: unknown) => void; resize: () => void; dispose: () => void } | null = null;
        const init = async () => {
            const echarts = await import('echarts') as unknown as { init: (el: HTMLElement) => typeof chart };
            if (!chartRef.current) return;
            chart = echarts.init(chartRef.current) as typeof chart;
            chart!.setOption({
                tooltip: { trigger: 'axis' },
                legend: { data: ['OTB定金', 'OTB尾款', '当月回款'], textStyle: { fontSize: 11 } },
                grid: { left: 70, right: 20, top: 36, bottom: 30 },
                xAxis: { type: 'category', data: monthly.map(m => m.label), axisLabel: { fontSize: 10 } },
                yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
                series: [
                    { name: 'OTB定金', type: 'bar', stack: 'payment', data: monthly.map(m => m.otbDeposit), itemStyle: { color: '#fb923c' }, barMaxWidth: 28 },
                    { name: 'OTB尾款', type: 'bar', stack: 'payment', data: monthly.map(m => m.otbBalance), itemStyle: { color: '#f97316' }, barMaxWidth: 28 },
                    { name: '当月回款', type: 'line', data: monthly.map(m => m.collection), lineStyle: { color: '#10b981', width: 2 }, symbol: 'circle', symbolSize: 5, itemStyle: { color: '#10b981' } },
                ],
            });
        };
        init();
        const observer = new ResizeObserver(() => chart?.resize());
        if (chartRef.current) observer.observe(chartRef.current);
        return () => { observer.disconnect(); chart?.dispose(); };
    }, [monthly]);
    return <div ref={chartRef} style={{ height: 220 }} />;
}

function ExpenseStackedChart({ monthly }: { monthly: MonthlyCashflow[] }) {
    const chartRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!chartRef.current || monthly.length === 0) return;
        let chart: { setOption: (opt: unknown) => void; resize: () => void; dispose: () => void } | null = null;
        const init = async () => {
            const echarts = await import('echarts') as unknown as { init: (el: HTMLElement) => typeof chart };
            if (!chartRef.current) return;
            chart = echarts.init(chartRef.current) as typeof chart;
            chart!.setOption({
                tooltip: { trigger: 'axis' },
                legend: { data: ['自动派生支出', '手工计划支出'], textStyle: { fontSize: 11 } },
                grid: { left: 70, right: 20, top: 36, bottom: 30 },
                xAxis: { type: 'category', data: monthly.map(m => m.label), axisLabel: { fontSize: 10 } },
                yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
                series: [
                    { name: '自动派生支出', type: 'bar', stack: 'expense', data: monthly.map(m => m.autoExpenses), itemStyle: { color: '#94a3b8' }, barMaxWidth: 28 },
                    { name: '手工计划支出', type: 'bar', stack: 'expense', data: monthly.map(m => m.manualExpenses), itemStyle: { color: '#f59e0b' }, barMaxWidth: 28 },
                ],
            });
        };
        init();
        const observer = new ResizeObserver(() => chart?.resize());
        if (chartRef.current) observer.observe(chartRef.current);
        return () => { observer.disconnect(); chart?.dispose(); };
    }, [monthly]);
    return <div ref={chartRef} style={{ height: 200 }} />;
}

export default function CashflowSubView() {
    const [simulation, setSimulation] = useState<SimulationKey>('base');
    const simulationOptions = useMemo<CashflowSimulationOptions>(() => {
        if (simulation === 'delay_otb') return { delayOtbPaymentsMonths: 1 };
        if (simulation === 'reduce_first_otb') return { reduceFirstOtbRate: 0.2 };
        if (simulation === 'clearance_cash') return { clearanceInventoryRate: 0.2, clearanceDiscount: 0.5, clearanceMonth: 1 };
        if (simulation === 'add_cash') return { extraOpeningCash: 3000000 };
        return {};
    }, [simulation]);
    const result = useCashflow('base', simulationOptions);

    return (
        <div className="space-y-6">
            {/* 动作模拟 */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="text-xs font-medium text-slate-400">动作模拟</span>
                {SIMULATIONS.map(item => (
                    <button
                        key={item.key}
                        onClick={() => setSimulation(item.key)}
                        title={item.desc}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${simulation === item.key ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {result ? (
                <>
                    {/* 库存占款压力 */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">库存占款 · 现金缺口 · 清货模拟</h3>
                        </div>
                        <div className="p-5">
                            <InventoryCashPressurePanel scenario="base" simulationOptions={simulationOptions} />
                        </div>
                    </div>

                    {/* 预警 Banner */}
                    {(result.dangerMonths.length > 0 || result.warningMonths.length > 0) && (
                        <div className={`rounded-xl border px-5 py-4 ${result.dangerMonths.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="flex items-start gap-3">
                                <span className="text-xl">{result.dangerMonths.length > 0 ? '🚨' : '⚠️'}</span>
                                <div>
                                    <div className={`text-sm font-bold ${result.dangerMonths.length > 0 ? 'text-rose-700' : 'text-amber-700'}`}>
                                        现金流预警
                                    </div>
                                    {result.dangerMonths.length > 0 && (
                                        <div className="text-xs text-rose-600 mt-1">
                                            危险月份：{result.dangerMonths.map(m => `${m}月`).join('、')} — 期末余额为负，建议提前安排备用金或调整下单节奏。
                                        </div>
                                    )}
                                    {result.warningMonths.length > 0 && (
                                        <div className="text-xs text-amber-600 mt-1">
                                            预警月份：{result.warningMonths.map(m => `${m}月`).join('、')} — 余额不足 50 万，建议提前协调回款。
                                        </div>
                                    )}
                                    <div className="text-xs text-slate-500 mt-2">
                                        可用右上方动作模拟按钮快速评估：OTB付款后移、首批下单压缩、增加备用资金。
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* KPI */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <KpiCard label="总回款" value={formatMoneyCny(result.totalCollection)} />
                        <KpiCard label="总支出" value={formatMoneyCny(result.totalExpenses)} tone="negative" />
                        <KpiCard label="净现金流" value={formatMoneyCny(result.netCashflow)} tone={result.netCashflow >= 0 ? 'positive' : 'negative'} />
                        <KpiCard label="年末余额" value={formatMoneyCny(result.yearEndBalance)} tone={result.yearEndBalance >= 500000 ? 'positive' : result.yearEndBalance >= 0 ? 'warning' : 'negative'} />
                        <KpiCard
                            label="最大缺口月"
                            value={result.maxGapMonth ? `${result.maxGapMonth}月` : '无'}
                            sub={result.maxGapAmount < 0 ? formatMoneyCny(result.maxGapAmount) : '现金流健康'}
                            tone={result.maxGapMonth ? 'negative' : 'positive'}
                        />
                    </div>

                    {/* OTB 联动摘要 */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">OTB联动现金流校验</h3>
                            <p className="text-xs text-slate-400 mt-0.5">读取 OTB 下单、到货、付款排期与销售回款，判断采购节奏对现金流的影响</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-5">
                            <KpiCard label="计划采购额" value={formatMoneyCny(result.otbPlannedPurchaseAmount)} />
                            <KpiCard label="已下单额" value={formatMoneyCny(result.otbOrderedAmount)} />
                            <KpiCard label="已到货额" value={formatMoneyCny(result.otbArrivedAmount)} />
                            <KpiCard label="OTB付款合计" value={formatMoneyCny(result.otbPaymentTotal)} tone={result.otbPaymentTotal > result.totalCollection ? 'negative' : 'default'} />
                            <KpiCard
                                label="付款/回款比"
                                value={result.paymentToCollectionRatio !== null ? `${(result.paymentToCollectionRatio * 100).toFixed(1)}%` : '--'}
                                tone={result.paymentToCollectionRatio !== null && result.paymentToCollectionRatio > 1 ? 'negative' : 'positive'}
                            />
                        </div>
                        {result.cashflowAdvice.length > 0 && (
                            <div className="mx-5 mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                                {result.cashflowAdvice.map((advice, index) => (
                                    <p key={index}>• {advice}</p>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 支出堆叠图 */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">支出结构：自动 vs 手工</h3>
                        </div>
                        <div className="p-4">
                            <ExpenseStackedChart monthly={result.monthly} />
                        </div>
                    </div>

                    {/* 手工支出Top 3提示 */}
                    {result.manualOutflowTop3Months.some(m => m.manualTotal > 0) && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
                            <p className="text-xs font-medium text-amber-700 mb-2">手工计划支出高峰月份（前3）</p>
                            <div className="flex gap-4">
                                {result.manualOutflowTop3Months.filter(m => m.manualTotal > 0).map(m => (
                                    <div key={m.month} className="text-sm">
                                        <span className="font-medium">{m.label}</span>
                                        <span className="text-amber-600 ml-1">{formatMoneyCny(m.manualTotal)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 净现金流图 */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">月度净现金流 + 期末余额</h3>
                        </div>
                        <div className="p-4">
                            <CashflowChart monthly={result.monthly} />
                        </div>
                    </div>

                    {/* OTB 付款排期图 */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">OTB 付款排期（定金 / 尾款 / 回款）</h3>
                            <p className="text-xs text-slate-400 mt-0.5">定金提前3个月支付，尾款提前1个月支付</p>
                        </div>
                        <div className="p-4">
                            <OtbPaymentChart monthly={result.monthly} />
                        </div>
                    </div>

                    {/* 月度现金流表 */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-50">
                            <h3 className="font-semibold text-slate-800">月度现金流明细</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs text-slate-700">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50">
                                        <th className="text-left py-2 px-3 font-medium text-slate-500 whitespace-nowrap">月份</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">期初余额</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">回款</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">OTB定金</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">OTB尾款</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">自动支出</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">手工支出</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">净现金流</th>
                                        <th className="text-right py-2 px-3 font-medium text-slate-500 whitespace-nowrap">期末余额</th>
                                        <th className="text-center py-2 px-3 font-medium text-slate-500 whitespace-nowrap">状态</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.monthly.map(m => (
                                        <tr key={m.month} className={`border-b border-slate-50 hover:bg-slate-50 ${m.alertLevel === 'danger' ? 'bg-rose-50/50' : m.alertLevel === 'warning' ? 'bg-amber-50/50' : ''}`}>
                                            <td className="py-2 px-3 font-medium">{m.label}</td>
                                            <td className="text-right py-2 px-3">{formatMoneyCny(m.openingBalance)}</td>
                                            <td className="text-right py-2 px-3 text-emerald-600">{formatMoneyCny(m.collection)}</td>
                                            <td className="text-right py-2 px-3 text-orange-500">{formatMoneyCny(m.otbDeposit)}</td>
                                            <td className="text-right py-2 px-3 text-orange-600">{formatMoneyCny(m.otbBalance)}</td>
                                            <td className="text-right py-2 px-3 text-slate-500">{formatMoneyCny(m.autoExpenses)}</td>
                                            <td className="text-right py-2 px-3 text-amber-600">{formatMoneyCny(m.manualExpenses)}</td>
                                            <td className={`text-right py-2 px-3 font-medium ${m.netCashflow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {formatMoneyCny(m.netCashflow)}
                                            </td>
                                            <td className={`text-right py-2 px-3 font-bold ${m.closingBalance >= 500000 ? 'text-emerald-600' : m.closingBalance >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                {formatMoneyCny(m.closingBalance)}
                                            </td>
                                            <td className="text-center py-2 px-3">{alertBadge(m.alertLevel)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-40 text-slate-400 text-sm">加载现金流数据中…</div>
            )}
        </div>
    );
}
