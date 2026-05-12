'use client';
/**
 * src/components/otb/panels/wave/WaveOutputBridgePanel.tsx
 * 波段输出联动 — 可视化数据流 + 状态 + 跳转
 */

import React from 'react';
import type { WaveRow } from '@/utils/otbWavePlanning';
import { formatCurrency, type CurrencyUnit } from '@/utils/otbCalculations';

interface WaveOutputBridgePanelProps {
    waves: WaveRow[];
    currencyUnit: CurrencyUnit;
    onJumpToTab?: (tab: 'price' | 'category' | 'execution') => void;
}

const BRIDGE_BUSINESS_DATE = new Date('2026-05-09T00:00:00');

export default function WaveOutputBridgePanel({
    waves,
    currencyUnit,
    onJumpToTab,
}: WaveOutputBridgePanelProps) {
    const waveCount = waves.length;
    const totalOtb = waves.reduce((sum, w) => sum + (w.forecastOtbBudget || 0), 0);
    const totalStyleCount = waves.reduce((sum, w) => sum + (w.targetStyleCount || 0), 0);
    const launchedCount = waves.filter(w => {
        const d = Math.floor((new Date(w.launchDate).getTime() - BRIDGE_BUSINESS_DATE.getTime()) / 86400000);
        return d < 0;
    }).length;

    const flowNodes = [
        {
            id: 'wave' as const,
            label: '波段预算',
            status: '当前',
            statusTone: 'sky' as const,
            detail: `${waveCount} 波段`,
            sub: formatCurrency(totalOtb, currencyUnit),
            clickable: false,
        },
        {
            id: 'price' as const,
            label: '价格&结构',
            status: '待完善',
            statusTone: 'amber' as const,
            detail: formatCurrency(totalOtb, currencyUnit),
            sub: `${totalStyleCount} 款`,
            clickable: true,
        },
        {
            id: 'category' as const,
            label: '品类款深',
            status: '待生成',
            statusTone: 'slate' as const,
            detail: `${totalStyleCount} 款`,
            sub: '--',
            clickable: true,
        },
        {
            id: 'execution' as const,
            label: '执行跟踪',
            status: launchedCount > 0 ? `${launchedCount} 波已上市` : '上市后',
            statusTone: launchedCount > 0 ? ('emerald' as const) : ('slate' as const),
            detail: launchedCount > 0 ? `${launchedCount} 波已上市` : '--',
            sub: launchedCount > 0 ? '查看复盘' : '--',
            clickable: launchedCount > 0,
        },
    ];

    const toneClass = {
        sky:     { bg: 'bg-sky-50 border-sky-200', badge: 'bg-sky-100 text-sky-700', btn: 'bg-sky-500 text-white hover:bg-sky-600', label: 'text-sky-700', val: 'text-sky-800 font-semibold' },
        amber:   { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', btn: 'bg-amber-500 text-white hover:bg-amber-600', label: 'text-amber-600', val: 'text-amber-800 font-semibold' },
        emerald: { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-500 text-white hover:bg-emerald-600', label: 'text-emerald-600', val: 'text-emerald-800 font-semibold' },
        slate:   { bg: 'bg-slate-50 border-slate-200', badge: 'bg-slate-100 text-slate-500', btn: 'bg-slate-300 text-slate-600 cursor-not-allowed', label: 'text-slate-500', val: 'text-slate-500' },
    };

    return (
        <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700">波段预算输出联动</div>

            {/* 箭头流程图 */}
            <div className="flex items-center gap-0 overflow-x-auto">
                {flowNodes.map((node, idx) => {
                    const t = toneClass[node.statusTone];
                    const isLast = idx === flowNodes.length - 1;
                    const tabId = node.id !== 'wave' ? node.id : null;
                    return (
                        <React.Fragment key={node.id}>
                            <div
                                className={`flex-1 min-w-[120px] rounded-xl border ${t.bg} p-3 space-y-1.5 ${node.clickable && onJumpToTab ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
                                onClick={() => {
                                    if (node.clickable && onJumpToTab && tabId) {
                                        onJumpToTab(tabId as 'price' | 'category' | 'execution');
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold ${t.label}`}>{node.label}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.badge}`}>{node.status}</span>
                                </div>
                                <div className={`text-sm ${t.val}`}>{node.detail}</div>
                                <div className="text-[10px] text-slate-400">{node.sub}</div>
                                {node.clickable && onJumpToTab && tabId && (
                                    <div className={`text-[10px] text-center mt-1 rounded px-1.5 py-0.5 ${t.btn} transition-colors`}>
                                        跳转 ↗
                                    </div>
                                )}
                            </div>
                            {!isLast && (
                                <div className="flex-shrink-0 w-8 flex items-center justify-center">
                                    <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
                                        <path d="M0 8h22M18 4l6 4-6 4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* 详情区 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* 输出到价格&结构 */}
                <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-3 space-y-2">
                    <div className="text-xs font-semibold text-sky-700">→ 价格&结构 输出</div>
                    <div className="space-y-1 text-xs">
                        {[
                            { label: 'OTB 预算', value: formatCurrency(totalOtb, currencyUnit) },
                            { label: '波段数', value: `${waveCount} 个` },
                            { label: '主推品类', value: Array.from(new Set(waves.map(w => w.mainCategory).filter(Boolean))).slice(0, 3).join(' / ') || '--' },
                            { label: '价格带重点', value: Array.from(new Set(waves.flatMap(w => w.priceBandFocus ?? []))).slice(0, 3).join(' / ') || '--' },
                        ].map((item, i) => (
                            <div key={i} className="flex justify-between">
                                <span className="text-slate-500">{item.label}</span>
                                <span className="font-medium text-slate-700">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 输出到品类/款深 */}
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 space-y-2">
                    <div className="text-xs font-semibold text-emerald-700">→ 品类款深 输出</div>
                    <div className="space-y-1 text-xs">
                        {[
                            { label: '计划款数', value: `${totalStyleCount} 款` },
                            { label: '计划色数', value: `${waves.reduce((s, w) => s + (w.targetColorCount ?? 2), 0)} 色` },
                            { label: '计划 SKU', value: `${waves.reduce((s, w) => s + (w.targetSkuCount ?? 0), 0)} SKU` },
                            { label: '均深', value: `${Math.round(waves.reduce((s, w) => s + (w.averageDepth ?? 0), 0) / Math.max(1, waveCount))} 双` },
                        ].map((item, i) => (
                            <div key={i} className="flex justify-between">
                                <span className="text-slate-500">{item.label}</span>
                                <span className="font-medium text-slate-700">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 输出到执行跟踪 */}
                <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3 space-y-2">
                    <div className="text-xs font-semibold text-amber-700">→ 执行跟踪 输出</div>
                    <div className="space-y-1 text-xs">
                        {[
                            { label: '上市日期范围', value: (() => { const dates = waves.map(w => w.launchDate).filter(Boolean).sort(); return dates.length ? `${dates[0]} ~ ${dates[dates.length - 1]}` : '--'; })() },
                            { label: '到货月份', value: Array.from(new Set(waves.map(w => w.arrivalMonth).filter(Boolean))).sort().map(m => `${m}月`).join(' ') || '--' },
                            { label: '最近下单截止', value: waves.map(w => w.orderDeadline).filter(Boolean).sort()[0] ?? '--' },
                            { label: '已上市波段', value: `${launchedCount} 个` },
                        ].map((item, i) => (
                            <div key={i} className="flex justify-between">
                                <span className="text-slate-500">{item.label}</span>
                                <span className="font-medium text-slate-700">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
