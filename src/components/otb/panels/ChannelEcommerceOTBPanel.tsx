'use client';
/**
 * src/components/otb/panels/ChannelEcommerceOTBPanel.tsx
 * 渠道/电商模型 — 对应 Excel《OTB预算电商》
 */
import { useState, useMemo, useCallback } from 'react';
import { calcChannelOTB, formatCurrency, formatPct, formatQty, type CurrencyUnit, type ChannelOTBInput } from '@/utils/otbCalculations';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';
import defaultData from '../../../../data/otb/channel_otb_plan.json';
import channelsRaw from '../../../../data/otb/channels.json';

interface Props {
    currencyUnit: CurrencyUnit;
    filters: DashboardFilters;
}

interface ChannelRecord {
    channelId: string;
    channelName: string;
    channelType: string;
    defaultSellThroughTarget: number;
    defaultReturnRate: number;
    defaultDiscountRate: number;
    defaultStockToSalesRatio: number;
    salesWeight: number;
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

function getChannels() {
    return (channelsRaw as ChannelRecord[]).filter(channel => channel.channelId !== 'omni-channel');
}

function normalizeInitialRows(): ChannelOTBInput[] {
    const rawRows = defaultData as ChannelOTBInput[];
    const channels = getChannels();
    const directRows = rawRows.filter(row => row.channel === 'physical');
    const ecomRows = rawRows.filter(row => row.channel === 'ecommerce');

    return channels.flatMap(channel => {
        const sourceRows = channel.channelType === 'online' ? ecomRows : directRows;
        const sourceWeight = channel.channelType === 'online' ? 0.28 : 0.38;
        const scale = sourceWeight > 0 ? channel.salesWeight / sourceWeight : channel.salesWeight;

        return QUARTERS.map((quarter, index) => {
            const source = sourceRows[index] ?? directRows[index] ?? ecomRows[index];
            return {
                ...source,
                id: `${channel.channelId}-${quarter}`,
                channel: channel.channelId,
                channelLabel: channel.channelName,
                quarter,
                quarterLabel: source?.quarterLabel ?? quarter,
                salesTarget: Math.round((source?.salesTarget ?? 0) * scale),
                sellThroughTarget: channel.defaultSellThroughTarget,
                returnRate: channel.defaultReturnRate,
                discountRate: channel.defaultDiscountRate,
                beginningInventoryCost: Math.round((source?.beginningInventoryCost ?? 0) * scale),
            } as ChannelOTBInput;
        });
    });
}

function resolveChannelScope(channelType: DashboardFilters['channel_type']): string[] {
    if (channelType === 'all') return getChannels().map(channel => channel.channelId);
    if (channelType === '电商') return ['ecommerce'];
    if (channelType === '直营') return ['direct-store'];
    if (channelType === '加盟') return ['franchise'];
    if (channelType === 'KA') return ['special'];
    return ['direct-store'];
}

function resolveChannelScopeLabel(channelType: DashboardFilters['channel_type']) {
    if (channelType === 'all') return '全渠道';
    return channelType;
}

export default function ChannelEcommerceOTBPanel({ currencyUnit, filters }: Props) {
    const [rows, setRows] = useState<ChannelOTBInput[]>(() => normalizeInitialRows());

    const update = useCallback((idx: number, field: keyof ChannelOTBInput, value: number) => {
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    }, []);

    const activeChannels = useMemo(() => resolveChannelScope(filters.channel_type), [filters.channel_type]);
    const filtered = rows.filter(r => activeChannels.includes(r.channel));
    const computed = useMemo(() => filtered.map(r => calcChannelOTB(r)), [filtered]);

    const fc = (v: number | null | undefined) => formatCurrency(v, currencyUnit);

    const totalSales = computed.reduce((s, r) => s + r.salesTarget, 0);
    const totalNetOTB = computed.reduce((s, r) => s + (r.netNewOTB ?? 0), 0);
    const totalInvPairs = computed.reduce((s, r) => s + (r.investmentPairs ?? 0), 0);

    const channelScopeLabel = resolveChannelScopeLabel(filters.channel_type);

    return (
        <div className="space-y-5">
            {/* 继承全局渠道口径 */}
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                当前渠道口径：<span className="font-semibold text-slate-800">{channelScopeLabel}</span>
                <span className="ml-2 text-slate-400">渠道筛选由商品企划全局筛选控制，OTB 内部不再单独切换渠道。</span>
            </div>

            {/* 汇总卡片 */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
                    <p className="text-xs text-slate-400">{channelScopeLabel} 销售目标</p>
                    <p className="text-lg font-bold text-slate-800 mt-1">{fc(totalSales)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
                    <p className="text-xs text-slate-400">净新增OTB（成本）</p>
                    <p className="text-lg font-bold text-sky-700 mt-1">{fc(totalNetOTB)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
                    <p className="text-xs text-slate-400">投入总数量（双）</p>
                    <p className="text-lg font-bold text-emerald-600 mt-1">{formatQty(totalInvPairs)}</p>
                </div>
            </div>

            {/* 电商退货率风险提示 */}
            {computed.some(r => r.ecomReturnDanger) && (
                <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700">
                    🔴 部分季度电商退货率过高（售罄目标 - 退货率 ≤ 10%），有效售罄率极低，投入金额计算可能失真，请检查退货率设置。
                </div>
            )}

            {/* 季度明细表 */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">{channelScopeLabel} · 季度OTB测算</h3>
                    <p className="text-xs text-slate-400 mt-0.5">蓝底单元格可编辑</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-max text-xs w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                {['渠道', '季度', '销售目标', '投入售罄率', '退货率', '折扣率', '加价倍率',
                                    '均价(零售)', '均价(成本)', '期初库存成本',
                                    '有效售罄率', '理论投入金额', '期初库存',
                                    '净新增OTB', '投入数量(双)',
                                    '新品占比', '翻单占比', '旧品占比', '新品金额', '翻单金额', '旧品金额'].map((h, i) => (
                                    <th key={i} className={`py-2 px-3 text-slate-400 font-medium whitespace-nowrap ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {computed.map((row, fi) => {
                                const globalIdx = rows.indexOf(filtered[fi]);
                                return (
                                    <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                                        <td className="py-2 px-3 font-medium text-slate-700 whitespace-nowrap">{row.channelLabel}</td>
                                        <td className="py-2 px-3 font-medium text-slate-700 whitespace-nowrap">{row.quarterLabel}</td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={row.salesTarget} step={500000}
                                                onChange={e => update(globalIdx, 'salesTarget', parseFloat(e.target.value) || 0)}
                                                className="w-20 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={parseFloat((row.sellThroughTarget * 100).toFixed(1))} step={1}
                                                onChange={e => update(globalIdx, 'sellThroughTarget', (parseFloat(e.target.value) || 0) / 100)}
                                                className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={parseFloat((row.returnRate * 100).toFixed(1))} step={0.5}
                                                onChange={e => update(globalIdx, 'returnRate', (parseFloat(e.target.value) || 0) / 100)}
                                                className={`w-14 text-right text-xs border rounded px-1.5 py-1 focus:outline-none ${row.ecomReturnDanger ? 'bg-rose-50 border-rose-300' : 'bg-sky-50 border-sky-200'}`} />
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={parseFloat((row.discountRate * 100).toFixed(1))} step={0.5}
                                                onChange={e => update(globalIdx, 'discountRate', (parseFloat(e.target.value) || 0) / 100)}
                                                className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={row.markupRate} step={0.1}
                                                onChange={e => update(globalIdx, 'markupRate', parseFloat(e.target.value) || 0)}
                                                className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={row.averageRetailPrice} step={10}
                                                onChange={e => update(globalIdx, 'averageRetailPrice', parseFloat(e.target.value) || 0)}
                                                className="w-16 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={row.averageCostPrice} step={5}
                                                onChange={e => update(globalIdx, 'averageCostPrice', parseFloat(e.target.value) || 0)}
                                                className="w-16 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={row.beginningInventoryCost} step={100000}
                                                onChange={e => update(globalIdx, 'beginningInventoryCost', parseFloat(e.target.value) || 0)}
                                                className="w-20 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className={`py-2 px-3 text-right font-medium ${row.ecomReturnDanger ? 'text-rose-600' : 'text-slate-700'}`}>{formatPct(row.effectiveSellThrough)}</td>
                                        <td className="py-2 px-3 text-right">{fc(row.theoreticalInvestmentAmount)}</td>
                                        <td className="py-2 px-3 text-right text-slate-500">{fc(row.beginningInventoryCost)}</td>
                                        <td className="py-2 px-3 text-right font-semibold text-sky-700">{fc(row.netNewOTB)}</td>
                                        <td className="py-2 px-3 text-right text-emerald-700">{formatQty(row.investmentPairs)}</td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={parseFloat((row.newProductRatio * 100).toFixed(1))} step={1}
                                                onChange={e => update(globalIdx, 'newProductRatio', (parseFloat(e.target.value) || 0) / 100)}
                                                className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={parseFloat((row.repeatOrderRatio * 100).toFixed(1))} step={1}
                                                onChange={e => update(globalIdx, 'repeatOrderRatio', (parseFloat(e.target.value) || 0) / 100)}
                                                className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <input type="number" value={parseFloat((row.carryoverRatio * 100).toFixed(1))} step={1}
                                                onChange={e => update(globalIdx, 'carryoverRatio', (parseFloat(e.target.value) || 0) / 100)}
                                                className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                        </td>
                                        <td className="py-2 px-3 text-right">{fc(row.newProductAmount)}</td>
                                        <td className="py-2 px-3 text-right">{fc(row.repeatOrderAmount)}</td>
                                        <td className="py-2 px-3 text-right text-slate-500">{fc(row.carryoverAmount)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-sky-50 font-semibold text-xs">
                                <td className="py-2.5 px-3 text-slate-700" colSpan={2}>合计</td>
                                <td className="py-2.5 px-3 text-right">{fc(totalSales)}</td>
                                <td colSpan={10} />
                                <td className="py-2.5 px-3 text-right text-sky-700">{fc(totalNetOTB)}</td>
                                <td className="py-2.5 px-3 text-right text-emerald-700">{formatQty(totalInvPairs)}</td>
                                <td colSpan={6} />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* 注释说明 */}
            <div className="text-[10px] text-slate-400 space-y-1 px-1">
                <p>• 理论投入金额 = 销售目标 ÷（售罄率 - 退货率）÷ 折扣率 ÷ 加价倍率</p>
                <p>• 净新增OTB = max(0, 理论投入金额 - 期初库存成本)</p>
                <p>• 投入数量 = 净新增OTB ÷ 平均成本价</p>
                <p>• 电商退货率仅影响有效售罄率，线下退货率通常可忽略（设置为0.02以下）</p>
            </div>
        </div>
    );
}
