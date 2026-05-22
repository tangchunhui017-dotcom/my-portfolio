'use client';
/**
 * src/components/forecast/SalesForecastDownstreamOutputV2.tsx
 * S18 预测输出口 V2 — 推送状态徽章 + 一键推送 + 版本冻结
 */
import { useState } from 'react';
import type { ForecastChannel } from '@/hooks/useForecast';
import { useOtbParams } from '@/context/MerchConfigContext';

interface DownstreamOutputProps {
    channel: ForecastChannel;
    annualForecast: number;
    grossMarginRate?: number;
    refundRate?: number;
    forecastVersion?: string;
}

type SyncStatus = 'synced' | 'pending' | 'failed' | 'locked';

const STATUS_CFG: Record<SyncStatus, { icon: string; label: string; cls: string }> = {
    synced:  { icon: '✅', label: '已同步', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    pending: { icon: '🟡', label: '待推送', cls: 'text-amber-600 bg-amber-50 border-amber-200' },
    failed:  { icon: '🔴', label: '同步失败', cls: 'text-rose-600 bg-rose-50 border-rose-200' },
    locked:  { icon: '🔒', label: '已冻结', cls: 'text-slate-600 bg-slate-100 border-slate-200' },
};

function fmtCny(v: number) {
    return v >= 1e8 ? `¥${(v / 1e8).toFixed(2)}亿` : v >= 1e7 ? `¥${(v / 1e7).toFixed(2)}千万` : v >= 1e4 ? `¥${(v / 1e4).toFixed(1)}万` : `¥${v}`;
}
function pct(v: number) { return (v * 100).toFixed(1) + '%'; }

export default function SalesForecastDownstreamOutputV2({
    channel, annualForecast, grossMarginRate = 0.46, refundRate = 0, forecastVersion = 'forecast_2026_base_v1',
}: DownstreamOutputProps) {
    const otbParams = useOtbParams();
    const [statuses, setStatuses] = useState<Record<string, SyncStatus>>({
        otb: 'pending', cashflow: 'pending', pnl: 'pending', inventory: 'pending',
    });
    const [isFrozen, setIsFrozen] = useState(false);
    const [isPushing, setIsPushing] = useState(false);

    const cp = otbParams.channelCostParams[channel] ?? otbParams.channelCostParams['physical'] ?? { markupRate: 4.2, discountRate: 0.90, returnRate: 0.04, sellThroughTarget: 0.82 };
    const markup = cp.markupRate;
    const discount = cp.discountRate;
    const sellThrough = cp.sellThroughTarget;
    const effectiveRefundRate = (refundRate ?? 0) > 0 ? (refundRate ?? 0) : cp.returnRate;
    const netSales = channel === 'ecommerce' ? annualForecast * (1 - effectiveRefundRate) : annualForecast;
    const grossProfit = netSales * grossMarginRate;
    const reqRetailInventory = netSales / Math.max(sellThrough - (channel === 'ecommerce' ? effectiveRefundRate : 0), 0.1);
    const reqCostInventory = reqRetailInventory / Math.max(discount, 0.1) / Math.max(markup, 1);
    const targetEndingInventory = reqRetailInventory * (1 - sellThrough);
    const cashflowPayable = reqCostInventory * 0.65;

    const handlePushAll = async () => {
        if (isFrozen) return;
        setIsPushing(true);
        // Simulate push
        await new Promise(r => setTimeout(r, 1200));
        setStatuses({ otb: 'synced', cashflow: 'synced', pnl: 'synced', inventory: 'synced' });
        setIsPushing(false);
    };

    const handleFreeze = () => setIsFrozen(f => !f);

    const outputs = [
        {
            id: 'otb', target: 'OTB 预算', icon: '💰',
            bg: 'bg-sky-50 border-sky-100', titleCls: 'text-sky-700',
            items: [
                { l: '预测净销售额', v: fmtCny(netSales) },
                { l: '目标售罄率', v: pct(sellThrough) },
                { l: '所需成本货值', v: fmtCny(reqCostInventory), bold: true },
                { l: '加价倍率', v: `${markup}×` },
                { l: channel === 'ecommerce' ? '退货率（渠道）' : '退货率', v: pct(effectiveRefundRate) },
            ],
        },
        {
            id: 'cashflow', target: '现金流', icon: '🏦',
            bg: 'bg-emerald-50 border-emerald-100', titleCls: 'text-emerald-700',
            items: [
                { l: '净销售额', v: fmtCny(netSales) },
                { l: '预计回款', v: fmtCny(netSales * 0.65) },
                { l: '采购应付款', v: fmtCny(cashflowPayable), bold: true },
                { l: '净现金流缺口', v: fmtCny(netSales * 0.65 - cashflowPayable) },
            ],
        },
        {
            id: 'pnl', target: '损益', icon: '📊',
            bg: 'bg-amber-50 border-amber-100', titleCls: 'text-amber-700',
            items: [
                { l: '净销售额', v: fmtCny(netSales) },
                { l: '毛利率', v: pct(grossMarginRate) },
                { l: '毛利额', v: fmtCny(grossProfit), bold: true },
                { l: '渠道净利润估算', v: fmtCny(grossProfit * 0.55) },
            ],
        },
        {
            id: 'inventory', target: '库存健康', icon: '📦',
            bg: 'bg-violet-50 border-violet-100', titleCls: 'text-violet-700',
            items: [
                { l: '目标期末库存', v: fmtCny(targetEndingInventory) },
                { l: '目标售罄率', v: pct(sellThrough) },
                { l: '所需铺货量', v: fmtCny(reqRetailInventory), bold: true },
                { l: '安全库存建议', v: fmtCny(reqRetailInventory * 0.15) },
            ],
        },
    ];

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h3 className="font-bold text-slate-900 text-sm">🔗 预测输出口径</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        版本：<span className="font-mono">{forecastVersion}</span>
                        {isFrozen && <span className="ml-2 text-slate-600 font-medium">· 🔒 已冻结，下游不可覆盖</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleFreeze}
                        className={`text-[11px] px-3 py-1.5 rounded-lg border transition-all ${isFrozen ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
                        {isFrozen ? '🔒 解除冻结' : '🔓 冻结版本'}
                    </button>
                    {!isFrozen && (
                        <button onClick={handlePushAll} disabled={isPushing}
                            className={`text-[11px] px-3 py-1.5 rounded-lg transition-colors ${isPushing ? 'bg-slate-300 text-slate-500' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
                            {isPushing ? '推送中…' : '一键推送全部 →'}
                        </button>
                    )}
                </div>
            </div>

            {/* Output Cards */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {outputs.map(o => {
                    const status = statuses[o.id] ?? 'pending';
                    const sCfg = STATUS_CFG[isFrozen ? 'locked' : status];
                    return (
                        <div key={o.id} className={`rounded-xl border p-3.5 ${o.bg}`}>
                            <div className="flex items-center justify-between mb-2.5">
                                <div className={`text-[11px] font-bold ${o.titleCls}`}>{o.icon} {o.target}</div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${sCfg.cls}`}>
                                    {sCfg.icon} {sCfg.label}
                                </span>
                            </div>
                            {o.items.map(it => (
                                <div key={it.l} className="flex justify-between text-[11px] py-0.5 border-b border-white/40 last:border-0">
                                    <span className="text-slate-500 shrink-0">{it.l}</span>
                                    <span className={`text-right ml-2 ${it.bold ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{it.v}</span>
                                </div>
                            ))}
                            {!isFrozen && status !== 'synced' && (
                                <button onClick={() => setStatuses(s => ({ ...s, [o.id]: 'synced' }))}
                                    className="mt-2 w-full text-[10px] text-center py-1 rounded border border-current opacity-60 hover:opacity-100 transition-opacity">
                                    单独推送
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {!isFrozen && Object.values(statuses).some(s => s !== 'synced') && (
                <div className="px-5 py-2.5 bg-amber-50 border-t border-amber-100 text-[11px] text-amber-700">
                    ⚠ 草稿未冻结，请确认预测数字后冻结版本再推送，防止下游多版本混用。
                </div>
            )}
            {isFrozen && (
                <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500">
                    🔒 版本已冻结，所有输出数字已锁定，下游模块只读该版本。
                </div>
            )}
        </div>
    );
}
