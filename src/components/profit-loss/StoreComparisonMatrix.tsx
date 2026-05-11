'use client';
/**
 * src/components/profit-loss/StoreComparisonMatrix.tsx
 * S10: 单店对比矩阵 — 三类门店并排，4视图模式
 * 矩阵对比（默认）/ 单店编辑 / What-if沙盒 / 真实门店复盘
 */
import { useState, useMemo, useEffect } from 'react';
import storeAssRaw from '../../../data/planning/pnl_store_model_assumptions.json';
import gradingRaw from '../../../data/planning/pnl_store_grading_formula.json';
import assortmentRaw from '../../../data/planning/pnl_store_assortment_depth.json';
import { calcGradingScore } from '@/utils/pnlV9';
import GradingFormulaModal from './GradingFormulaModal';
import type { GradingResult } from '@/utils/pnlV9';

type StoreAssumptions = typeof storeAssRaw;
type GradingFormula = typeof gradingRaw;
type Assortment = typeof assortmentRaw;
const storeDefs = (storeAssRaw as StoreAssumptions).storeTypes;
const gradingFormula = gradingRaw as unknown as Parameters<typeof calcGradingScore>[1];
const assortment = assortmentRaw as Assortment;

type ViewMode = 'matrix' | 'edit' | 'whatif' | 'replay';
type StoreKey = 'mall_flagship' | 'mall_standard' | 'street';

function pct(v: number, signed = false) {
    const s = (v * 100).toFixed(1) + '%';
    return signed && v > 0 ? '+' + s : s;
}
function fmtCny(v: number) {
    if (v >= 1e7) return `¥${(v / 1e7).toFixed(1)}千万`;
    if (v >= 1e4) return `¥${(v / 10000).toFixed(1)}万`;
    return `¥${v.toLocaleString()}`;
}

interface StoreParams {
    key: StoreKey;
    label: string;
    area: number;
    monthlyRevenue: number;
    grossMarginRate: number;
    rentMode: 'fixed' | 'higher_of';
    fixedRentPerMonth: number;
    mallRevShareRate: number;
    staffCount: number;
    staffAvgMonthlySalary: number;
    fitoutInvestment: number;
    fitoutAmortizationMonths: number;
    setupCost: number;
    firstBatchInventory: number;
    backendExpenseRate: number;
    taxRate: number;
}

function calcResult(p: StoreParams) {
    const grossProfit = p.monthlyRevenue * p.grossMarginRate;
    const revShareRent = p.monthlyRevenue * p.mallRevShareRate;
    const effectiveRent = p.rentMode === 'higher_of' ? Math.max(p.fixedRentPerMonth, revShareRent) : p.fixedRentPerMonth;
    const staffCost = p.staffCount * p.staffAvgMonthlySalary;
    const fitoutAmort = p.fitoutAmortizationMonths > 0 ? p.fitoutInvestment / p.fitoutAmortizationMonths : 0;
    const backendCost = p.monthlyRevenue * p.backendExpenseRate;
    const tax = p.monthlyRevenue * p.taxRate;
    const totalOpex = effectiveRent + staffCost + fitoutAmort + backendCost + tax;
    const netProfit = grossProfit - totalOpex;
    const profitRate = p.monthlyRevenue > 0 ? netProfit / p.monthlyRevenue : 0;
    const salesPerSqm = p.area > 0 ? p.monthlyRevenue / p.area : 0;
    const totalInvestment = p.fitoutInvestment + p.setupCost + p.firstBatchInventory;
    const paybackMonths = netProfit > 0 ? Math.ceil(totalInvestment / netProfit) : 999;
    const grading = calcGradingScore({ profitRate, salesPerSqm, paybackMonths, investmentIntensity: totalInvestment }, gradingFormula);
    return { grossProfit, effectiveRent, staffCost, fitoutAmort, backendCost, tax, totalOpex, netProfit, profitRate, salesPerSqm, totalInvestment, paybackMonths, grading };
}

function paramsFromDef(def: StoreAssumptions['storeTypes'][number]): StoreParams {
    return {
        key: def.key as StoreKey, label: def.label,
        area: def.area, monthlyRevenue: def.targetMonthlyRevenue, grossMarginRate: def.grossMarginRate,
        rentMode: def.rentMode as 'fixed' | 'higher_of', fixedRentPerMonth: def.fixedRentPerMonth,
        mallRevShareRate: def.mallRevShareRate, staffCount: def.staffCount, staffAvgMonthlySalary: def.staffAvgMonthlySalary,
        fitoutInvestment: def.fitoutInvestment, fitoutAmortizationMonths: def.fitoutAmortizationMonths,
        setupCost: def.setupCost, firstBatchInventory: def.firstBatchInventory,
        backendExpenseRate: def.backendExpenseRate, taxRate: def.taxRate,
    };
}

const GRADE_STYLE: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    A: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-500 text-white' },
    B: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-500 text-white' },
    C: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-500 text-white' },
    Loss: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-500 text-white' },
};

// ── 矩阵行组件 ─────────────────────────────────────────────────────────────────
function MatrixRow({ label, values, isHeader, bold, tone }: {
    label: string; values: string[]; isHeader?: boolean; bold?: boolean;
    tone?: 'neutral' | 'positive' | 'negative';
}) {
    const tc = tone === 'positive' ? 'text-emerald-700' : tone === 'negative' ? 'text-rose-600' : 'text-slate-700';
    return (
        <tr className={`border-b border-slate-50 ${isHeader ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}>
            <td className={`py-2.5 px-3 text-xs ${isHeader ? 'font-semibold text-slate-500 uppercase tracking-wide' : 'text-slate-500'}`}>{label}</td>
            {values.map((v, i) => (
                <td key={i} className={`py-2.5 px-3 text-xs text-center ${bold ? 'font-bold ' + tc : tc}`}>{v}</td>
            ))}
        </tr>
    );
}

// ── 单列编辑面板（折叠）──────────────────────────────────────────────────────
function StoreEditor({ params, onChange }: { params: StoreParams; onChange: (p: StoreParams) => void }) {
    const up = <K extends keyof StoreParams>(key: K, val: StoreParams[K]) => onChange({ ...params, [key]: val });
    const sliders: Array<{ l: string; k: keyof StoreParams; min: number; max: number; step: number; fmt: (v: number) => string }> = [
        { l: '月销售额', k: 'monthlyRevenue', min: 50000, max: 2000000, step: 10000, fmt: fmtCny },
        { l: '门店面积(㎡)', k: 'area', min: 30, max: 500, step: 5, fmt: v => v + '㎡' },
        { l: '商品毛利率', k: 'grossMarginRate', min: 0.20, max: 0.70, step: 0.01, fmt: pct },
        { l: '固定租金/月', k: 'fixedRentPerMonth', min: 0, max: 200000, step: 1000, fmt: fmtCny },
        { l: '员工人数', k: 'staffCount', min: 1, max: 20, step: 1, fmt: v => v + '人' },
        { l: '人均月薪', k: 'staffAvgMonthlySalary', min: 3000, max: 20000, step: 500, fmt: fmtCny },
        { l: '装修投入', k: 'fitoutInvestment', min: 0, max: 2000000, step: 10000, fmt: fmtCny },
        { l: '首批铺货', k: 'firstBatchInventory', min: 0, max: 5000000, step: 50000, fmt: fmtCny },
    ];
    return (
        <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">⚙️ 调整 {params.label} 参数</div>
            {sliders.map(s => (
                <div key={s.k as string}>
                    <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-slate-500">{s.l}</span>
                        <span className="font-bold text-slate-700">{s.fmt(params[s.k] as number)}</span>
                    </div>
                    <input type="range" min={s.min} max={s.max} step={s.step} value={params[s.k] as number}
                        onChange={e => up(s.k, Number(e.target.value) as StoreParams[typeof s.k])}
                        className="w-full h-1 rounded appearance-none bg-slate-200 cursor-pointer" />
                </div>
            ))}
        </div>
    );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function StoreComparisonMatrix({ onLinkToBrandPnl }: { onLinkToBrandPnl?: (data: { annualRevenue: number; annualNetProfit: number }) => void }) {
    const [viewMode, setViewMode] = useState<ViewMode>('matrix');
    const [editingKey, setEditingKey] = useState<StoreKey | null>(null);
    const [gradingModal, setGradingModal] = useState<{ result: GradingResult; label: string } | null>(null);
    const [inheritBrandBaseline, setInheritBrandBaseline] = useState(true);

    // 品牌年度 P&L 基线（来自 pnl_brand_annual.json 的毛利/税率）
    const BRAND_BASELINE = { grossMarginRate: 0.49, taxRate: 0.025 };

    const [storeParams, setStoreParams] = useState<StoreParams[]>(() => storeDefs.map(paramsFromDef));

    // 当继承开关切到 true，把所有店型的毛利率/税率同步为品牌基线
    useEffect(() => {
        if (inheritBrandBaseline) {
            setStoreParams(prev => prev.map(p => ({ ...p, grossMarginRate: BRAND_BASELINE.grossMarginRate, taxRate: BRAND_BASELINE.taxRate })));
        }
    }, [inheritBrandBaseline]);

    const results = useMemo(() => storeParams.map(calcResult), [storeParams]);

    const updateStore = (key: StoreKey, updated: StoreParams) => {
        setStoreParams(prev => prev.map(p => p.key === key ? updated : p));
    };

    const VIEW_MODES: { key: ViewMode; label: string; icon: string }[] = [
        { key: 'matrix', label: '矩阵对比', icon: '📊' },
        { key: 'edit', label: '单店编辑', icon: '✏️' },
        { key: 'whatif', label: 'What-if 沙盒', icon: '🔬' },
        { key: 'replay', label: '真实复盘', icon: '🏪' },
    ];

    return (
        <div className="space-y-4">
            {/* 视图切换 */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    {VIEW_MODES.map(m => (
                        <button key={m.key} onClick={() => setViewMode(m.key)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                viewMode === m.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}>
                            <span>{m.icon}</span><span>{m.label}</span>
                        </button>
                    ))}
                </div>
                <button onClick={() => setInheritBrandBaseline(v => !v)}
                    className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${
                        inheritBrandBaseline
                            ? 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                    title={inheritBrandBaseline ? '已继承品牌年度毛利率/税率，可点击切换为独立设定' : '点击启用品牌基线继承'}>
                    <span className={`inline-block w-3 h-3 rounded-full border ${inheritBrandBaseline ? 'bg-sky-500 border-sky-500' : 'bg-white border-slate-300'}`}>
                        {inheritBrandBaseline && <span className="block w-1.5 h-1.5 rounded-full bg-white m-[3px]" />}
                    </span>
                    继承品牌基线 {inheritBrandBaseline ? '（毛利49% · 税2.5%）' : '（独立设定）'}
                </button>
            </div>

            {/* ── 矩阵对比视图 ── */}
            {viewMode === 'matrix' && (
                <div className="space-y-3">
                    {/* 推荐评级行 */}
                    <div className="grid grid-cols-3 gap-3">
                        {storeParams.map((p, i) => {
                            const r = results[i];
                            const gs = GRADE_STYLE[r.grading.finalGrade] ?? GRADE_STYLE.Loss;
                            return (
                                <div key={p.key} className={`rounded-2xl border ${gs.border} ${gs.bg} p-4`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-800">{p.label}</span>
                                        <button className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${gs.badge}`}
                                            onClick={() => setGradingModal({ result: r.grading, label: p.label })}>
                                            {r.grading.finalGrade}
                                        </button>
                                    </div>
                                    <div className={`text-xl font-black ${gs.text}`}>{fmtCny(r.netProfit)}<span className="text-xs font-normal opacity-70">/月</span></div>
                                    <div className="text-xs text-slate-500 mt-1">净利率 {pct(r.profitRate)} · 回本 {r.paybackMonths < 999 ? r.paybackMonths + '月' : '亏损'}</div>
                                    <div className={`text-[11px] ${gs.text} mt-1 font-medium`}>{r.grading.recommendation}</div>
                                    <button onClick={() => { setEditingKey(p.key); setViewMode('edit'); }}
                                        className="mt-2 text-[10px] text-slate-400 hover:text-slate-600 underline">展开调整 ↓</button>
                                </div>
                            );
                        })}
                    </div>
                    {/* 矩阵数据表 */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left py-2.5 px-3 font-medium text-slate-500 w-36">指标</th>
                                    {storeParams.map(p => (
                                        <th key={p.key} className="py-2.5 px-3 text-center font-semibold text-slate-700">{p.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <MatrixRow label="── 销售驱动 ──" values={storeParams.map(() => '')} isHeader />
                                <MatrixRow label="月销售额" values={results.map((_, i) => fmtCny(storeParams[i].monthlyRevenue))} />
                                <MatrixRow label="门店面积" values={storeParams.map(p => p.area + '㎡')} />
                                <MatrixRow label="月坪效" values={results.map(r => fmtCny(r.salesPerSqm) + '/㎡')} />
                                <MatrixRow label="商品毛利率" values={storeParams.map(p => pct(p.grossMarginRate))} />
                                <MatrixRow label="── 成本结构 ──" values={storeParams.map(() => '')} isHeader />
                                <MatrixRow label="月租金成本" values={results.map(r => fmtCny(r.effectiveRent))} />
                                <MatrixRow label="月人工成本" values={results.map(r => fmtCny(r.staffCost))} />
                                <MatrixRow label="月装修摊销" values={results.map(r => fmtCny(r.fitoutAmort))} />
                                <MatrixRow label="月总费用" values={results.map(r => fmtCny(r.totalOpex))} bold tone="negative" />
                                <MatrixRow label="── 盈利结果 ──" values={storeParams.map(() => '')} isHeader />
                                <MatrixRow label="月净利润" values={results.map(r => fmtCny(r.netProfit))} bold tone={undefined} />
                                <MatrixRow label="月净利率" values={results.map(r => pct(r.profitRate))} bold />
                                <MatrixRow label="回本周期" values={results.map(r => r.paybackMonths < 999 ? r.paybackMonths + '个月' : '亏损')} />
                                <MatrixRow label="初始总投入" values={results.map(r => fmtCny(r.totalInvestment))} />
                                <MatrixRow label="── 货品深度 ──" values={storeParams.map(() => '')} isHeader />
                                {(() => {
                                    const assTypes = assortment.storeTypes;
                                    return (<>
                                        <MatrixRow label="首铺SKU数" values={storeParams.map(p => {
                                            const a = assTypes.find(x => x.key === p.key);
                                            return a ? a.initialSkuCount + ' SKU' : '-';
                                        })} />
                                        <MatrixRow label="平均备货深度" values={storeParams.map(p => {
                                            const a = assTypes.find(x => x.key === p.key);
                                            return a ? a.avgDepthPerSku + ' 双/SKU' : '-';
                                        })} />
                                        <MatrixRow label="尺码完整率" values={storeParams.map(p => {
                                            const a = assTypes.find(x => x.key === p.key);
                                            return a ? pct(a.sizeCompletion) : '-';
                                        })} />
                                        <MatrixRow label="月断码次数" values={storeParams.map(p => {
                                            const a = assTypes.find(x => x.key === p.key);
                                            return a ? a.sizeStockoutPerMonth + ' 次' : '-';
                                        })} />
                                    </>);
                                })()}
                                <MatrixRow label="── 综合评级 ──" values={storeParams.map(() => '')} isHeader />
                                <MatrixRow label="综合评分" values={results.map(r => r.grading.totalScore.toFixed(0) + '分')} bold />
                                <MatrixRow label="评级" values={results.map(r => r.grading.finalGrade)} bold />
                                <MatrixRow label="决策建议" values={results.map(r => r.grading.recommendation)} />
                            </tbody>
                        </table>
                    </div>
                    {/* 联动品牌P&L */}
                    {onLinkToBrandPnl && (
                        <button className="text-xs text-sky-600 border border-sky-200 rounded-xl px-4 py-2 hover:bg-sky-50 transition-colors"
                            onClick={() => onLinkToBrandPnl({
                                annualRevenue: results.reduce((s, r, i) => s + storeParams[i].monthlyRevenue * 12, 0),
                                annualNetProfit: results.reduce((s, r) => s + r.netProfit * 12, 0),
                            })}>
                            📊 将模拟结果应用到品牌年度 P&L
                        </button>
                    )}
                </div>
            )}

            {/* ── 单店编辑视图 ── */}
            {viewMode === 'edit' && (
                <div className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                        {storeParams.map(p => (
                            <button key={p.key} onClick={() => setEditingKey(p.key)}
                                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${editingKey === p.key ? 'bg-sky-500 text-white border-sky-500 shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {editingKey && (() => {
                        const idx = storeParams.findIndex(p => p.key === editingKey);
                        if (idx === -1) return null;
                        const r = results[idx];
                        const gs = GRADE_STYLE[r.grading.finalGrade] ?? GRADE_STYLE.Loss;
                        return (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <StoreEditor params={storeParams[idx]} onChange={p => updateStore(editingKey, p)} />
                                <div className={`rounded-2xl border ${gs.border} ${gs.bg} p-5 space-y-3`}>
                                    <div className="text-sm font-bold text-slate-800">📈 实时结果</div>
                                    {[
                                        { l: '月净利润', v: fmtCny(r.netProfit), bold: true },
                                        { l: '净利率', v: pct(r.profitRate), bold: true },
                                        { l: '月坪效', v: fmtCny(r.salesPerSqm) + '/㎡' },
                                        { l: '回本周期', v: r.paybackMonths < 999 ? r.paybackMonths + '个月' : '亏损' },
                                        { l: '综合评级', v: r.grading.finalGrade + ' — ' + r.grading.recommendation, bold: true },
                                    ].map(k => (
                                        <div key={k.l} className="flex justify-between text-xs">
                                            <span className="text-slate-500">{k.l}</span>
                                            <span className={`${k.bold ? 'font-bold ' + gs.text : 'text-slate-700'}`}>{k.v}</span>
                                        </div>
                                    ))}
                                    <button onClick={() => setGradingModal({ result: r.grading, label: storeParams[idx].label })}
                                        className="text-[11px] text-slate-400 hover:text-slate-600 underline mt-2">查看评分详情 →</button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* ── What-if 沙盒 / 真实复盘 ── */}
            {(viewMode === 'whatif' || viewMode === 'replay') && (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center text-sm text-slate-400">
                    {viewMode === 'whatif'
                        ? '🔬 What-if 沙盒：选择基准店型，自由调整两套参数对比优化前后结果（切换到「单店编辑」后点击「另存副本对比」）'
                        : '🏪 真实复盘：输入真实门店数据与模型预测对比，识别效率偏差原因'}
                    <br />
                    <button onClick={() => setViewMode('edit')} className="mt-3 text-sky-600 text-xs underline">→ 切换到单店编辑开始</button>
                </div>
            )}

            {/* 评级弹窗 */}
            {gradingModal && (
                <GradingFormulaModal result={gradingModal.result} onClose={() => setGradingModal(null)} />
            )}
        </div>
    );
}
