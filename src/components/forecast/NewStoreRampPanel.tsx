'use client';
/**
 * src/components/forecast/NewStoreRampPanel.tsx
 * 新店开店计划 + 爬坡模型 + 首铺货品结构
 */
import { useMemo, useState } from 'react';
import newStorePlanRaw from '../../../data/planning/sales_forecast_new_store_plan.json';

type NewStorePlan = {
    storeId: string; storeName: string; storeOpenMonth: string;
    storeType: string; storeTypeLabel: string;
    cityTier: string; cityTierLabel: string;
    storeAreaSqm: number; firstBatchBudgetCny: number; firstBatchSkuCount: number;
    openingEventBudgetCny: number; rampPeriodMonths: number;
    matureStoreMonthlySalesCny: number;
    rampCurve: number[]; breakEvenMonthlySalesCny: number;
    targetYear1AnnualCny: number;
    firstBatchNewStylePct: number; firstBatchBasicPct: number; firstBatchImagePct: number;
    sizeCompletenessRate: number; replenishmentCycleDays: number;
};

const RAMP_STAGE_LABELS = ['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'];
const TYPE_COLOR: Record<string, string> = {
    flagship_s: 'bg-amber-100 text-amber-800 border-amber-300',
    standard_a: 'bg-sky-100 text-sky-800 border-sky-300',
    standard_b: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};
const CITY_COLOR: Record<string, string> = {
    tier1: 'text-violet-600',
    tier2: 'text-sky-600',
    tier3_plus: 'text-slate-500',
};

function fmtCny(v: number) {
    return v >= 10000000 ? `${(v / 10000000).toFixed(2)}千万` : v >= 10000 ? `${(v / 10000).toFixed(1)}万` : String(v);
}
function pct(v: number) { return `${(v * 100).toFixed(0)}%`; }

type ViewTab = 'plan' | 'ramp' | 'assortment';

export default function NewStoreRampPanel() {
    const [view, setView] = useState<ViewTab>('plan');
    const [selectedStore, setSelectedStore] = useState(0);
    const plans = newStorePlanRaw as NewStorePlan[];
    const store = plans[selectedStore] ?? plans[0];

    const totalYear1 = useMemo(() => plans.reduce((s, p) => s + p.targetYear1AnnualCny, 0), [plans]);
    const totalFirstBatch = useMemo(() => plans.reduce((s, p) => s + p.firstBatchBudgetCny, 0), [plans]);

    return (
        <div className="space-y-4">
            {/* ── 总览 KPI ── */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="text-xs font-semibold text-emerald-800 mb-3">🆕 新店增量贡献</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { l: '本年新开店数', v: String(plans.length) },
                        { l: '新店Year1预测', v: fmtCny(totalYear1) },
                        { l: '首铺采购预算', v: fmtCny(totalFirstBatch) },
                        { l: '开业活动预算', v: fmtCny(plans.reduce((s, p) => s + p.openingEventBudgetCny, 0)) },
                    ].map(k => (
                        <div key={k.l} className="rounded-xl bg-white border border-emerald-100 px-3 py-2.5 text-center">
                            <div className="text-[10px] text-emerald-500 mb-1">{k.l}</div>
                            <div className="font-bold text-emerald-800 text-sm">{k.v}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Tab切换 ── */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
                {([['plan', '开店计划'], ['ramp', '爬坡模型'], ['assortment', '首铺结构']] as [ViewTab, string][]).map(([k, l]) => (
                    <button key={k} onClick={() => setView(k)}
                        className={`px-3 py-1.5 rounded-md transition-colors ${view === k ? 'bg-white text-slate-800 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}>
                        {l}
                    </button>
                ))}
            </div>

            {/* ── 开店计划表 ── */}
            {view === 'plan' && (
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    {['门店名称','开店月','店型','城市能级','面积','首铺预算','首铺SKU','开业活动','爬坡周期','Year1预测','盈亏平衡'].map(h => (
                                        <th key={h} className={`py-2 px-3 font-medium text-slate-500 whitespace-nowrap ${h === '门店名称' ? 'text-left' : 'text-right'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {plans.map((p, i) => (
                                    <tr key={p.storeId} className="border-t border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedStore(i)}>
                                        <td className="py-2 px-3 font-medium text-slate-700">{p.storeName}</td>
                                        <td className="py-2 px-3 text-right text-slate-600">{p.storeOpenMonth}</td>
                                        <td className="py-2 px-3 text-right">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${TYPE_COLOR[p.storeType] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {p.storeTypeLabel}
                                            </span>
                                        </td>
                                        <td className={`py-2 px-3 text-right font-medium ${CITY_COLOR[p.cityTier] ?? ''}`}>{p.cityTierLabel}</td>
                                        <td className="py-2 px-3 text-right text-slate-500">{p.storeAreaSqm}㎡</td>
                                        <td className="py-2 px-3 text-right text-slate-600">{fmtCny(p.firstBatchBudgetCny)}</td>
                                        <td className="py-2 px-3 text-right text-slate-500">{p.firstBatchSkuCount}</td>
                                        <td className="py-2 px-3 text-right text-slate-500">{fmtCny(p.openingEventBudgetCny)}</td>
                                        <td className="py-2 px-3 text-right text-slate-500">{p.rampPeriodMonths}个月</td>
                                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">{fmtCny(p.targetYear1AnnualCny)}</td>
                                        <td className="py-2 px-3 text-right text-slate-500">{fmtCny(p.breakEvenMonthlySalesCny)}/月</td>
                                    </tr>
                                ))}
                                <tr className="border-t border-slate-200 bg-slate-50">
                                    <td className="py-2 px-3 font-bold text-slate-700">合计</td>
                                    <td colSpan={4} />
                                    <td className="py-2 px-3 text-right font-bold text-slate-700">{fmtCny(totalFirstBatch)}</td>
                                    <td className="py-2 px-3 text-right font-bold text-slate-700">{plans.reduce((s, p) => s + p.firstBatchSkuCount, 0)}</td>
                                    <td className="py-2 px-3 text-right font-bold text-slate-700">{fmtCny(plans.reduce((s, p) => s + p.openingEventBudgetCny, 0))}</td>
                                    <td />
                                    <td className="py-2 px-3 text-right font-bold text-emerald-700">{fmtCny(totalYear1)}</td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── 爬坡模型 ── */}
            {view === 'ramp' && store && (
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">爬坡模型</span>
                        <div className="flex gap-1">
                            {plans.map((p, i) => (
                                <button key={p.storeId} onClick={() => setSelectedStore(i)}
                                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${i === selectedStore ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                    {p.storeName.length > 8 ? p.storeName.slice(0, 8) + '…' : p.storeName}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-[11px]">
                            <div className="font-bold text-emerald-800 mb-2">{store.storeName}</div>
                            <div className="grid grid-cols-2 gap-1">
                                {[
                                    ['成熟店月均', fmtCny(store.matureStoreMonthlySalesCny)],
                                    ['盈亏平衡', fmtCny(store.breakEvenMonthlySalesCny) + '/月'],
                                    ['爬坡周期', store.rampPeriodMonths + ' 个月'],
                                    ['Year1 预测', fmtCny(store.targetYear1AnnualCny)],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between text-emerald-700 py-0.5">
                                        <span className="text-emerald-500">{l}</span>
                                        <span className="font-medium">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Visual ramp bar */}
                        <div>
                            <div className="text-[11px] font-medium text-slate-600 mb-2">月度爬坡进度（vs 成熟店）</div>
                            <div className="space-y-1.5">
                                {store.rampCurve.slice(0, 6).map((r, i) => {
                                    const monthlySales = Math.round(r * store.matureStoreMonthlySalesCny);
                                    const isBreakEven = monthlySales >= store.breakEvenMonthlySalesCny;
                                    return (
                                        <div key={i} className="flex items-center gap-2 text-[11px]">
                                            <span className="text-slate-400 w-6">{RAMP_STAGE_LABELS[i]}</span>
                                            <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${isBreakEven ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                                    style={{ width: `${r * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-slate-600 w-8">{pct(r)}</span>
                                            <span className="text-slate-500 w-16 text-right">{fmtCny(monthlySales)}</span>
                                            {!isBreakEven && <span className="text-[10px] text-amber-500">未盈亏</span>}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-2 text-[10px] text-slate-400">
                                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500 mr-1" />已过盈亏平衡
                                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400 mr-1 ml-3" />未过盈亏平衡
                            </div>
                        </div>
                    </div>

                    {/* Monthly forecast table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left py-2 px-3 font-medium text-slate-500">开业后</th>
                                    {store.rampCurve.map((_, i) => (
                                        <th key={i} className="text-right py-2 px-3 font-medium text-slate-500">{RAMP_STAGE_LABELS[i]}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t border-slate-50">
                                    <td className="py-2 px-3 font-medium text-slate-600">爬坡系数</td>
                                    {store.rampCurve.map((r, i) => (
                                        <td key={i} className="py-2 px-3 text-right text-slate-500">{pct(r)}</td>
                                    ))}
                                </tr>
                                <tr className="border-t border-slate-50">
                                    <td className="py-2 px-3 font-medium text-slate-600">预测月销</td>
                                    {store.rampCurve.map((r, i) => {
                                        const v = Math.round(r * store.matureStoreMonthlySalesCny);
                                        return (
                                            <td key={i} className={`py-2 px-3 text-right font-medium ${v >= store.breakEvenMonthlySalesCny ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {fmtCny(v)}
                                            </td>
                                        );
                                    })}
                                </tr>
                                <tr className="border-t border-slate-50">
                                    <td className="py-2 px-3 font-medium text-slate-600">盈亏状态</td>
                                    {store.rampCurve.map((r, i) => {
                                        const v = Math.round(r * store.matureStoreMonthlySalesCny);
                                        return (
                                            <td key={i} className="py-2 px-3 text-right text-[10px]">
                                                {v >= store.breakEvenMonthlySalesCny
                                                    ? <span className="text-emerald-600">✓盈利</span>
                                                    : <span className="text-amber-500">亏损</span>
                                                }
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── 首铺货品结构 ── */}
            {view === 'assortment' && (
                <div className="space-y-3">
                    {plans.map(p => (
                        <div key={p.storeId} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <span className="font-semibold text-slate-800 text-sm">{p.storeName}</span>
                                    <span className="ml-2 text-[11px] text-slate-400">{p.storeTypeLabel} · {p.cityTierLabel} · {p.storeAreaSqm}㎡</span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    首铺预算 <strong className="text-slate-700">{fmtCny(p.firstBatchBudgetCny)}</strong>
                                    · SKU <strong className="text-slate-700">{p.firstBatchSkuCount}</strong>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                                {[
                                    { l: '新款占比', v: pct(p.firstBatchNewStylePct), bar: p.firstBatchNewStylePct, color: 'bg-sky-500' },
                                    { l: '基础款占比', v: pct(p.firstBatchBasicPct), bar: p.firstBatchBasicPct, color: 'bg-slate-400' },
                                    { l: '形象款占比', v: pct(p.firstBatchImagePct), bar: p.firstBatchImagePct, color: 'bg-violet-500' },
                                    { l: '尺码完整率', v: pct(p.sizeCompletenessRate), bar: p.sizeCompletenessRate, color: p.sizeCompletenessRate >= 0.9 ? 'bg-emerald-500' : 'bg-amber-400' },
                                ].map(item => (
                                    <div key={item.l} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                                        <div className="text-slate-400 mb-1">{item.l}</div>
                                        <div className="font-bold text-slate-700 mb-1.5">{item.v}</div>
                                        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.bar * 100}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500">
                                <span>补货周期：<strong className="text-slate-700">{p.replenishmentCycleDays}天</strong></span>
                                <span>清尾款禁止进入首铺</span>
                                {p.sizeCompletenessRate < 0.90 && (
                                    <span className="text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">
                                        ⚠ 尺码完整率低于90%，需补货
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
