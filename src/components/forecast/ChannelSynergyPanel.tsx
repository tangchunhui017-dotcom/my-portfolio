'use client';
/**
 * src/components/forecast/ChannelSynergyPanel.tsx
 * S13 三渠道协同视图 — 占比堆叠图 + 客流转移 + 窜货风险
 */
import { useRef, useEffect } from 'react';
import { useForecast } from '@/hooks/useForecast';
import transferRaw from '../../../data/planning/sales_forecast_channel_transfer.json';
import { calcChannelTransfer } from '@/utils/salesForecastV8';

type TransferData = {
    physicalToOnline: { rate: number; avgOrderValue: number; repurchaseCycle: number };
    onlineToOffline: { rate: number; avgOrderValue: number; conversionLift: number };
    newStoreHaloEffect: { onlineSalesLift: number; brandAwarenessLift: number };
    priceArbitrageRisk: { physicalVsOnlinePriceGap: number; riskLevel: string; riskDescription: string; affectedCategories: string[] };
};

const transfer = transferRaw as TransferData;

type EChartsInstance = { setOption: (opt: unknown) => void; resize: () => void; dispose: () => void };
type EChartsLib = { init: (el: HTMLElement) => EChartsInstance };

const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

export default function ChannelSynergyPanel() {
    const physical = useForecast('physical', 'base');
    const ecommerce = useForecast('ecommerce', 'base');
    const newStore = useForecast('new_store', 'base');
    const stackRef = useRef<HTMLDivElement>(null);

    const totalAnnual = (physical?.annualForecast ?? 0) + (ecommerce?.annualForecast ?? 0) + (newStore?.annualForecast ?? 0);

    const transferResult = calcChannelTransfer(
        185, 1200, transfer.physicalToOnline.rate, transfer.onlineToOffline.rate,
        180000, transfer.priceArbitrageRisk.physicalVsOnlinePriceGap,
    );

    useEffect(() => {
        if (!stackRef.current || !physical || !ecommerce || !newStore) return;
        let chart: EChartsInstance | null = null;
        const init = async () => {
            const echarts = (await import('echarts')) as unknown as EChartsLib;
            if (!stackRef.current) return;
            chart = echarts.init(stackRef.current);
            chart.setOption({
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                legend: { data: ['实体店', '电商', '新店'], textStyle: { fontSize: 11 } },
                grid: { left: 60, right: 16, top: 36, bottom: 30 },
                xAxis: { type: 'category', data: MONTH_LABELS, axisLabel: { fontSize: 10 } },
                yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万`, fontSize: 10 } },
                series: [
                    { name: '实体店', type: 'bar', stack: 'total', data: physical.monthly.map(m => m.forecastRevenue), itemStyle: { color: '#38bdf8' }, barMaxWidth: 32 },
                    { name: '电商', type: 'bar', stack: 'total', data: ecommerce.monthly.map(m => m.forecastRevenue), itemStyle: { color: '#8b5cf6' } },
                    { name: '新店', type: 'bar', stack: 'total', data: newStore.monthly.map(m => m.forecastRevenue), itemStyle: { color: '#10b981' } },
                ],
            });
        };
        init();
        const observer = new ResizeObserver(() => chart?.resize());
        if (stackRef.current) observer.observe(stackRef.current);
        return () => { observer.disconnect(); chart?.dispose(); };
    }, [physical, ecommerce, newStore]);

    const riskCls = {
        low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        medium: 'bg-amber-100 text-amber-700 border-amber-200',
        high: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    const riskKey = transferResult.priceArbitrageRiskLevel;

    return (
        <div className="space-y-4">
            {/* 渠道占比摘要 */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: '实体店', v: physical?.annualForecast ?? 0, color: 'text-sky-600', bg: 'bg-sky-500' },
                    { label: '电商', v: ecommerce?.annualForecast ?? 0, color: 'text-violet-600', bg: 'bg-violet-500' },
                    { label: '新店', v: newStore?.annualForecast ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-500' },
                ].map(ch => {
                    const share = totalAnnual > 0 ? ch.v / totalAnnual : 0;
                    return (
                        <div key={ch.label} className="rounded-xl border border-slate-100 bg-white shadow-sm p-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-slate-500">{ch.label}</span>
                                <span className={`text-sm font-bold ${ch.color}`}>{(share * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${ch.bg}`} style={{ width: `${share * 100}%` }} />
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">¥{(ch.v / 10000000).toFixed(2)}千万</div>
                        </div>
                    );
                })}
            </div>

            {/* 堆叠图 */}
            <div ref={stackRef} style={{ height: 220 }} />

            {/* 渠道转移分析 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                    <div className="text-xs font-semibold text-sky-700 mb-2">🔄 渠道客流转移</div>
                    <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between"><span className="text-slate-500">实体→线上（入会复购）</span><span className="font-medium text-sky-600">{transferResult.physToOnlineMonthly.toLocaleString()}次/月</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">线上→实体（O2O试穿）</span><span className="font-medium text-violet-600">{transferResult.onlineToPhysMonthly.toLocaleString()}次/月</span></div>
                        <div className="flex justify-between border-t border-sky-100 pt-1.5 font-medium"><span className="text-slate-600">线上净增量</span><span className="text-emerald-600">+{transferResult.netOnlineGain.toLocaleString()}次/月</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">新店光环效应（线上提升）</span><span className="font-medium text-emerald-600">+{(transfer.newStoreHaloEffect.onlineSalesLift * 100).toFixed(0)}%</span></div>
                    </div>
                </div>
                <div className={`rounded-xl border p-3 ${riskCls[riskKey]}`}>
                    <div className="text-xs font-semibold mb-2">⚠️ 价格倒挂风险 — {transferResult.priceArbitrageRiskLevel === 'high' ? '高' : transferResult.priceArbitrageRiskLevel === 'medium' ? '中' : '低'}</div>
                    <p className="text-[11px] mb-2">{transfer.priceArbitrageRisk.riskDescription}</p>
                    <div className="text-[10px] opacity-75">受影响品类：{transfer.priceArbitrageRisk.affectedCategories.join(' / ')}</div>
                    <div className="text-[11px] mt-1.5">线上 vs 实体价差：<span className="font-bold">{(transfer.priceArbitrageRisk.physicalVsOnlinePriceGap * 100).toFixed(0)}%</span></div>
                </div>
            </div>
        </div>
    );
}
