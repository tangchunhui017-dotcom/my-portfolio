'use client';
/**
 * src/components/profit-loss/StoreSandbox.tsx
 * S13: "模拟开店" 沙盒 — 输入 N 家各类店，输出年度增量 + 现金压力
 */
import { useState, useMemo } from 'react';
import storeAssRaw from '../../../data/planning/pnl_store_model_assumptions.json';
import { simulateNewStorePortfolio } from '@/utils/pnlV9';

type StoreAssumptions = typeof storeAssRaw;
const storeDefs = (storeAssRaw as StoreAssumptions).storeTypes;

function fmtCny(v: number) {
    if (v >= 1e8) return `¥${(v / 1e8).toFixed(2)}亿`;
    if (v >= 1e4) return `¥${(v / 10000).toFixed(0)}万`;
    return `¥${v.toLocaleString()}`;
}
function pct(v: number) { return (v * 100).toFixed(1) + '%'; }

export default function StoreSandbox({ onApplyToBrandPnl }: {
    onApplyToBrandPnl?: (data: { annualRevenue: number; annualNetProfit: number }) => void;
}) {
    const [counts, setCounts] = useState<Record<string, number>>({ mall_flagship: 2, mall_standard: 4, street: 6 });

    const simInputs = useMemo(() => storeDefs.map(def => {
        const monthlyNetProfit = def.targetMonthlyRevenue * def.grossMarginRate
            - def.fixedRentPerMonth - def.staffCount * def.staffAvgMonthlySalary
            - (def.fitoutAmortizationMonths > 0 ? def.fitoutInvestment / def.fitoutAmortizationMonths : 0)
            - def.targetMonthlyRevenue * (def.backendExpenseRate + def.taxRate);
        const totalOpex = def.fixedRentPerMonth + def.staffCount * def.staffAvgMonthlySalary
            + (def.fitoutAmortizationMonths > 0 ? def.fitoutInvestment / def.fitoutAmortizationMonths : 0)
            + def.targetMonthlyRevenue * (def.backendExpenseRate + def.taxRate);
        return {
            storeType: def.key, label: def.label,
            count: counts[def.key] ?? 0,
            monthlyRevenue: def.targetMonthlyRevenue,
            grossMarginRate: def.grossMarginRate,
            totalOpex,
            initialInvestment: def.fitoutInvestment + def.setupCost + def.firstBatchInventory,
        };
    }), [counts]);

    const result = useMemo(() => simulateNewStorePortfolio(simInputs), [simInputs]);
    const totalStores = Object.values(counts).reduce((s, v) => s + v, 0);

    return (
        <div className="space-y-4">
            <div className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
                🔬 <strong>模拟开店沙盒</strong>：设定各类门店数量，系统自动计算年度增量收入、净利润、初始投入和回本周期。
                结果可"应用到品牌年度 P&L"做联动预测。
            </div>
            {/* 数量输入 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {storeDefs.map(def => (
                    <div key={def.key} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
                        <div className="text-xs font-semibold text-slate-700">{def.label}</div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setCounts(c => ({ ...c, [def.key]: Math.max(0, (c[def.key] ?? 0) - 1) }))}
                                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-base hover:bg-slate-200 transition-colors">−</button>
                            <span className="flex-1 text-center text-2xl font-black text-slate-800">{counts[def.key] ?? 0}</span>
                            <button onClick={() => setCounts(c => ({ ...c, [def.key]: (c[def.key] ?? 0) + 1 }))}
                                className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 font-bold text-base hover:bg-sky-200 transition-colors">+</button>
                        </div>
                        <div className="text-[10px] text-slate-400 text-center">
                            单店月均 {fmtCny(def.targetMonthlyRevenue)} · 投入 {fmtCny(def.fitoutInvestment + def.setupCost + def.firstBatchInventory)}
                        </div>
                    </div>
                ))}
            </div>
            {/* 模拟结果 */}
            {totalStores > 0 && (
                <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-5 space-y-4">
                    <div className="text-sm font-bold text-slate-800">📈 模拟 {totalStores} 家新店 — 年度增量预测</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { l: '年度增量净收入', v: fmtCny(result.annualRevenue), tone: 'positive' },
                            { l: '年度增量净利润', v: fmtCny(result.annualNetProfit), tone: result.annualNetProfit >= 0 ? 'positive' : 'negative' },
                            { l: '综合净利率', v: pct(result.annualNetProfitRate), tone: result.annualNetProfitRate >= 0.08 ? 'positive' : 'warning' },
                            { l: '总初始投入', v: fmtCny(result.totalInitialInvestment), tone: 'neutral' },
                            { l: '加权回本周期', v: result.blendedPaybackMonths < 999 ? result.blendedPaybackMonths + '个月' : '亏损', tone: result.blendedPaybackMonths <= 36 ? 'positive' : 'warning' },
                            { l: '现金压力节点', v: result.cashPressureMonths.join(', '), tone: 'warning' },
                        ].map(k => {
                            const cls = k.tone === 'positive' ? 'text-emerald-700 bg-white border-emerald-100' : k.tone === 'negative' ? 'text-rose-600 bg-white border-rose-100' : k.tone === 'warning' ? 'text-amber-600 bg-white border-amber-100' : 'text-slate-700 bg-white border-slate-100';
                            return (
                                <div key={k.l} className={`rounded-xl border px-3 py-2.5 ${cls}`}>
                                    <div className="text-[10px] opacity-70">{k.l}</div>
                                    <div className="font-bold text-sm">{k.v}</div>
                                </div>
                            );
                        })}
                    </div>
                    {onApplyToBrandPnl && (
                        <button onClick={() => onApplyToBrandPnl({ annualRevenue: result.annualRevenue, annualNetProfit: result.annualNetProfit })}
                            className="text-xs text-sky-700 border border-sky-300 bg-white rounded-xl px-4 py-2 hover:bg-sky-50 transition-colors font-medium">
                            📊 将此模拟结果应用到品牌年度 P&L
                        </button>
                    )}
                </div>
            )}
            {totalStores === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">请设置各类门店数量以开始模拟</div>
            )}
        </div>
    );
}
