'use client';
/**
 * src/components/otb/panels/AnnualOTBControlPanel.tsx
 * 年度OTB总控 — 年度 → 季度 → 四季 → SS/AW 拆解
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { calcAnnualOTB, formatCurrency, formatPct, type CurrencyUnit } from '@/utils/otbCalculations';
import defaultData from '../../../../data/otb/otb_assumptions.json';

interface Props {
    currencyUnit: CurrencyUnit;
    onComputedChange?: (ss: number, aw: number, fourSeasons: FourSeasonTargets) => void;
}

export interface FourSeasonTargets {
    spring: number; summer: number; autumn: number; winter: number;
}

interface Inputs {
    annualSalesTarget: number;
    janToSepSalesTarget: number;
    janToSepSalesRatio: number;
    newProductRatio: number;
    carryoverRatio: number;
    ssNewProductRatio: number;
    awNewProductRatio: number;
    ssSellThroughTarget: number;
    awSellThroughTarget: number;
    maxCarryoverRatio: number;
    defaultStockToSalesRatio: number;
    defaultArrivalRate: number;
    approvedBudget: number;
    // 季度拆解
    q1SalesRatio: number;
    q2SalesRatio: number;
    q3SalesRatio: number;
    q4SalesRatio: number;
    // 四季拆解
    springSalesRatio: number;
    summerSalesRatio: number;
    autumnSalesRatio: number;
    winterSalesRatio: number;
    springNewProductRatio: number;
    summerNewProductRatio: number;
    autumnNewProductRatio: number;
    winterNewProductRatio: number;
    springSellThroughTarget: number;
    summerSellThroughTarget: number;
    autumnSellThroughTarget: number;
    winterSellThroughTarget: number;
}

function InputRow({ label, value, onChange, isPercent = false, hint, suffix = '元', readonly = false }: {
    label: string; value: number; onChange?: (v: number) => void; isPercent?: boolean;
    hint?: string; suffix?: string; readonly?: boolean;
}) {
    return (
        <div className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
            <span className="text-xs text-slate-500 w-36 flex-shrink-0">{label}</span>
            <div className="flex items-center gap-1 flex-1">
                <input
                    type="number"
                    value={isPercent ? parseFloat((value * 100).toFixed(2)) : value}
                    step={isPercent ? 0.1 : 100000}
                    readOnly={readonly}
                    onChange={e => {
                        const v = parseFloat(e.target.value) || 0;
                        onChange?.(isPercent ? v / 100 : v);
                    }}
                    className={`w-full text-right text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-300 ${readonly ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                />
                <span className="text-xs text-slate-400 w-6">{isPercent ? '%' : suffix}</span>
            </div>
            {hint && <span className="text-[10px] text-slate-400 w-20 text-right">{hint}</span>}
        </div>
    );
}

function KpiCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'positive' | 'negative' | 'warning' | 'neutral' }) {
    const toneClass = tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-rose-600' : tone === 'warning' ? 'text-amber-600' : 'text-slate-800';
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-xs text-slate-400">{label}</p>
            <p className={`text-lg font-bold mt-1 ${toneClass}`}>{value}</p>
            {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
    );
}

function SectionHeader({ label, expanded, onToggle }: { label: string; expanded: boolean; onToggle: () => void }) {
    return (
        <button onClick={onToggle}
            className="w-full flex items-center justify-between py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-600 transition-colors">
            <span>{label}</span>
            <span>{expanded ? '▲' : '▼'}</span>
        </button>
    );
}

const SEASON_META = [
    { key: 'spring' as const, name: '春', color: 'text-emerald-600', dot: 'bg-emerald-400' },
    { key: 'summer' as const, name: '夏', color: 'text-sky-600',     dot: 'bg-sky-400' },
    { key: 'autumn' as const, name: '秋', color: 'text-amber-600',   dot: 'bg-amber-400' },
    { key: 'winter' as const, name: '冬', color: 'text-rose-600',    dot: 'bg-rose-400' },
] as const;

export default function AnnualOTBControlPanel({ currencyUnit, onComputedChange }: Props) {
    const d = defaultData as typeof defaultData & {
        q1SalesRatio?: number; q2SalesRatio?: number; q3SalesRatio?: number; q4SalesRatio?: number;
        springSalesRatio?: number; summerSalesRatio?: number; autumnSalesRatio?: number; winterSalesRatio?: number;
        springNewProductRatio?: number; summerNewProductRatio?: number; autumnNewProductRatio?: number; winterNewProductRatio?: number;
        springSellThroughTarget?: number; summerSellThroughTarget?: number; autumnSellThroughTarget?: number; winterSellThroughTarget?: number;
    };

    const [inputs, setInputs] = useState<Inputs>({
        annualSalesTarget: d.annualSalesTarget,
        janToSepSalesTarget: d.janToSepSalesTarget ?? d.annualSalesTarget * d.janToSepSalesRatio,
        janToSepSalesRatio: d.janToSepSalesRatio,
        newProductRatio: d.newProductRatio,
        carryoverRatio: d.carryoverRatio,
        ssNewProductRatio: d.ssNewProductRatio,
        awNewProductRatio: d.awNewProductRatio,
        ssSellThroughTarget: d.ssSellThroughTarget,
        awSellThroughTarget: d.awSellThroughTarget,
        maxCarryoverRatio: d.maxCarryoverRatio,
        defaultStockToSalesRatio: d.defaultStockToSalesRatio,
        defaultArrivalRate: d.defaultArrivalRate,
        approvedBudget: d.approvedBudget,
        q1SalesRatio: d.q1SalesRatio ?? 0.20,
        q2SalesRatio: d.q2SalesRatio ?? 0.28,
        q3SalesRatio: d.q3SalesRatio ?? 0.28,
        q4SalesRatio: d.q4SalesRatio ?? 0.24,
        springSalesRatio: d.springSalesRatio ?? 0.20,
        summerSalesRatio: d.summerSalesRatio ?? 0.28,
        autumnSalesRatio: d.autumnSalesRatio ?? 0.22,
        winterSalesRatio: d.winterSalesRatio ?? 0.30,
        springNewProductRatio: d.springNewProductRatio ?? 0.65,
        summerNewProductRatio: d.summerNewProductRatio ?? 0.70,
        autumnNewProductRatio: d.autumnNewProductRatio ?? 0.60,
        winterNewProductRatio: d.winterNewProductRatio ?? 0.55,
        springSellThroughTarget: d.springSellThroughTarget ?? 0.80,
        summerSellThroughTarget: d.summerSellThroughTarget ?? 0.82,
        autumnSellThroughTarget: d.autumnSellThroughTarget ?? 0.80,
        winterSellThroughTarget: d.winterSellThroughTarget ?? 0.78,
    });

    const [showQ, setShowQ]       = useState(true);
    const [showSeason, setShowSeason] = useState(true);
    const [showRisk, setShowRisk]  = useState(false);

    const set = useCallback(<K extends keyof Inputs>(key: K, val: number) => {
        setInputs(prev => ({ ...prev, [key]: val }));
    }, []);

    const setAnnualTarget = useCallback((val: number) => {
        setInputs(prev => ({
            ...prev,
            annualSalesTarget: val,
            janToSepSalesTarget: val * prev.janToSepSalesRatio,
        }));
    }, []);

    const setJanToSepTarget = useCallback((val: number) => {
        setInputs(prev => ({
            ...prev,
            janToSepSalesTarget: val,
            janToSepSalesRatio: prev.annualSalesTarget > 0 ? val / prev.annualSalesTarget : prev.janToSepSalesRatio,
        }));
    }, []);

    const setJanToSepRatio = useCallback((val: number) => {
        setInputs(prev => ({
            ...prev,
            janToSepSalesRatio: val,
            janToSepSalesTarget: prev.annualSalesTarget * val,
        }));
    }, []);

    const result = useMemo(() => calcAnnualOTB(inputs), [inputs]);

    // 四季计算
    const fourSeasons = useMemo(() => {
        const annual = inputs.annualSalesTarget;
        const calc = (ratio: number, npRatio: number, stTarget: number) => {
            const target = annual * ratio;
            const npSales = target * npRatio;
            const otb = stTarget > 0 ? npSales / stTarget : null;
            return { target, npSales, otb };
        };
        return {
            spring: calc(inputs.springSalesRatio, inputs.springNewProductRatio, inputs.springSellThroughTarget),
            summer: calc(inputs.summerSalesRatio, inputs.summerNewProductRatio, inputs.summerSellThroughTarget),
            autumn: calc(inputs.autumnSalesRatio, inputs.autumnNewProductRatio, inputs.autumnSellThroughTarget),
            winter: calc(inputs.winterSalesRatio, inputs.winterNewProductRatio, inputs.winterSellThroughTarget),
        };
    }, [inputs]);

    // 季度计算
    const quarterly = useMemo(() => {
        const annual = inputs.annualSalesTarget;
        return {
            Q1: annual * inputs.q1SalesRatio,
            Q2: annual * inputs.q2SalesRatio,
            Q3: annual * inputs.q3SalesRatio,
            Q4: annual * inputs.q4SalesRatio,
        };
    }, [inputs]);

    // 占比校验
    const qSum    = inputs.q1SalesRatio + inputs.q2SalesRatio + inputs.q3SalesRatio + inputs.q4SalesRatio;
    const sSum    = inputs.springSalesRatio + inputs.summerSalesRatio + inputs.autumnSalesRatio + inputs.winterSalesRatio;
    const qOk     = Math.abs(qSum - 1) < 0.001;
    const sOk     = Math.abs(sSum - 1) < 0.001;

    useEffect(() => {
        const ss = fourSeasons.spring.target + fourSeasons.summer.target;
        const aw = fourSeasons.autumn.target + fourSeasons.winter.target;
        const targets: FourSeasonTargets = {
            spring: fourSeasons.spring.target,
            summer: fourSeasons.summer.target,
            autumn: fourSeasons.autumn.target,
            winter: fourSeasons.winter.target,
        };
        onComputedChange?.(ss, aw, targets);
    }, [fourSeasons, onComputedChange]);

    const fc = (v: number | null | undefined) => formatCurrency(v, currencyUnit);

    const diagnoses: { level: 'warn' | 'danger' | 'ok'; msg: string }[] = [];
    if (!qOk) diagnoses.push({ level: 'danger', msg: `Q1-Q4占比合计 ${(qSum * 100).toFixed(1)}%，不等于100%，请检查季度结构` });
    if (!sOk) diagnoses.push({ level: 'danger', msg: `四季占比合计 ${(sSum * 100).toFixed(1)}%，不等于100%，请检查季节结构` });
    const carryoverPct = result.janToSepSalesTarget > 0 ? result.carryoverSalesTarget / result.janToSepSalesTarget : 0;
    if (carryoverPct > (inputs.maxCarryoverRatio ?? 0.35)) diagnoses.push({ level: 'danger', msg: `过季货品占比 ${formatPct(carryoverPct)} 超警戒线` });
    if (inputs.ssSellThroughTarget < 0.75) diagnoses.push({ level: 'warn', msg: `春夏消化率 ${formatPct(inputs.ssSellThroughTarget)} 低于75%，库存风险偏高` });
    if (inputs.awSellThroughTarget < 0.75) diagnoses.push({ level: 'warn', msg: `秋冬消化率 ${formatPct(inputs.awSellThroughTarget)} 低于75%，库存风险偏高` });
    if (result.budgetGap !== null && result.budgetGap > 0) {
        diagnoses.push({ level: 'warn', msg: `投入预算超批准预算 ${fc(result.budgetGap)}，需申请追加` });
    }

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 参数输入区 */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800">年度参数设定</h3>
                        <p className="text-xs text-slate-400 mt-0.5">编辑后立即重算</p>
                    </div>
                    <div className="px-5 py-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">销售目标 &amp; 预算</p>
                        <InputRow label="年度销售目标（元）" value={inputs.annualSalesTarget} onChange={setAnnualTarget} hint={fc(inputs.annualSalesTarget)} />
                        <InputRow label="1-9月销售目标（元）" value={inputs.janToSepSalesTarget} onChange={setJanToSepTarget} hint={fc(inputs.janToSepSalesTarget)} />
                        <InputRow label="1-9月销售占比" value={inputs.janToSepSalesRatio} onChange={setJanToSepRatio} isPercent />
                        <InputRow label="批准预算（元）" value={inputs.approvedBudget} onChange={v => set('approvedBudget', v)} hint={fc(inputs.approvedBudget)} />

                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-4">结构占比（SS/AW）</p>
                        <InputRow label="新品销售占比" value={inputs.newProductRatio} onChange={v => set('newProductRatio', v)} isPercent />
                        <InputRow label="过季货品占比" value={inputs.carryoverRatio} onChange={v => set('carryoverRatio', v)} isPercent />
                        <InputRow label="春夏新品占比(of 1-9月)" value={inputs.ssNewProductRatio} onChange={v => set('ssNewProductRatio', v)} isPercent />
                        <InputRow label="秋冬新品占比(of 1-9月)" value={inputs.awNewProductRatio} onChange={v => set('awNewProductRatio', v)} isPercent />

                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-4">消化率目标（SS/AW）</p>
                        <InputRow label="春夏预计消化率" value={inputs.ssSellThroughTarget} onChange={v => set('ssSellThroughTarget', v)} isPercent />
                        <InputRow label="秋冬预计消化率" value={inputs.awSellThroughTarget} onChange={v => set('awSellThroughTarget', v)} isPercent />

                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-4">风控默认参数</p>
                        <InputRow label="过季警戒线" value={inputs.maxCarryoverRatio} onChange={v => set('maxCarryoverRatio', v)} isPercent />
                        <InputRow label="默认存销比（月）" value={inputs.defaultStockToSalesRatio} onChange={v => set('defaultStockToSalesRatio', v)} suffix="月" />
                        <InputRow label="默认到货率" value={inputs.defaultArrivalRate} onChange={v => set('defaultArrivalRate', v)} isPercent />
                    </div>
                </div>

                {/* 推导链路 */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-800">公式推导链路（SS/AW）</h3>
                        </div>
                        <table className="min-w-full text-xs">
                            <tbody>
                                {[
                                    { label: '年度销售目标',           value: fc(inputs.annualSalesTarget),                   bold: true },
                                    { label: '1-9月销售目标',           value: fc(result.janToSepSalesTarget),                 sub: `占年度 ${formatPct(result.janToSepSalesRatio)}` },
                                    { label: '新品业绩目标',            value: fc(result.janToSepNewProductSales),             sub: `× 新品占比 ${formatPct(inputs.newProductRatio)}` },
                                    { label: '过季货品目标',            value: fc(result.carryoverSalesTarget),               sub: `× 过季占比 ${formatPct(inputs.carryoverRatio)}` },
                                    { label: '── 春夏新品销售',         value: fc(result.ssNewProductSales),                  sub: `× SS占比 ${formatPct(inputs.ssNewProductRatio)}` },
                                    { label: '── 秋冬新品销售',         value: fc(result.awNewProductSales),                  sub: `× AW占比 ${formatPct(inputs.awNewProductRatio)}` },
                                    { label: '春夏投入预算',            value: fc(result.ssInvestmentBudget),                 sub: `÷ 消化率 ${formatPct(inputs.ssSellThroughTarget)}` },
                                    { label: '秋冬投入预算',            value: fc(result.awInvestmentBudget),                 sub: `÷ 消化率 ${formatPct(inputs.awSellThroughTarget)}` },
                                    { label: '年度新品投入预算',        value: fc(result.annualNewProductInvestmentBudget),   bold: true },
                                    { label: '预算缺口/冗余',           value: result.budgetGap !== null ? (result.budgetGap > 0 ? `▲ ${fc(result.budgetGap)}` : `▼ ${fc(Math.abs(result.budgetGap))}`) : '--', tone: result.budgetGap !== null ? (result.budgetGap > 0 ? 'negative' as const : 'positive' as const) : 'neutral' as const },
                                ].map((row, i) => (
                                    <tr key={i} className={`border-b border-slate-50 ${row.bold ? 'bg-sky-50/40' : ''}`}>
                                        <td className="py-2 px-4 text-slate-500">{row.label}</td>
                                        <td className={`py-2 px-4 text-right font-medium ${row.tone === 'negative' ? 'text-rose-600' : row.tone === 'positive' ? 'text-emerald-600' : row.bold ? 'text-sky-700' : 'text-slate-800'}`}>{row.value}</td>
                                        <td className="py-2 px-4 text-right text-slate-400">{('sub' in row) ? row.sub ?? '' : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* KPI 摘要 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="年度销售目标" value={fc(inputs.annualSalesTarget)} />
                <KpiCard label="春夏投入预算(SS)" value={fc(result.ssInvestmentBudget)} tone="positive" sub={`消化率 ${formatPct(inputs.ssSellThroughTarget)}`} />
                <KpiCard label="秋冬投入预算(AW)" value={fc(result.awInvestmentBudget)} tone="positive" sub={`消化率 ${formatPct(inputs.awSellThroughTarget)}`} />
                <KpiCard label="年度总投入预算" value={fc(result.annualNewProductInvestmentBudget)} tone={result.budgetGap !== null && result.budgetGap > 0 ? 'negative' : 'neutral'} sub={result.budgetGap !== null ? (result.budgetGap > 0 ? `超批 ${fc(result.budgetGap)}` : `余 ${fc(Math.abs(result.budgetGap))}`) : ''} />
            </div>

            {/* ── 季度拆解 ── */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                    <SectionHeader label="季度拆解（Q1–Q4）" expanded={showQ} onToggle={() => setShowQ(p => !p)} />
                </div>
                {showQ && (
                    <div className="p-5 space-y-4">
                        {!qOk && (
                            <div className="text-xs px-3 py-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-700">
                                ⚠️ Q1-Q4 占比合计 {(qSum * 100).toFixed(1)}%，应等于 100%
                            </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => {
                                const key = `${q}SalesRatio` as keyof Inputs;
                                const target = quarterly[`Q${i + 1}` as keyof typeof quarterly];
                                return (
                                    <div key={q} className="bg-slate-50 rounded-xl p-3 space-y-2">
                                        <p className="text-xs font-semibold text-slate-600">{q.toUpperCase()}</p>
                                        <div className="flex items-center gap-1">
                                            <input type="number" value={parseFloat((inputs[key] as number * 100).toFixed(1))} step={0.5}
                                                onChange={e => set(key, (parseFloat(e.target.value) || 0) / 100)}
                                                className="w-full text-right text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300" />
                                            <span className="text-xs text-slate-400">%</span>
                                        </div>
                                        <p className="text-xs font-bold text-sky-700">{fc(target)}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-slate-400">合计：{(qSum * 100).toFixed(1)}% {qOk ? '✅' : '❌'}</p>
                    </div>
                )}
            </div>

            {/* ── 四季拆解 ── */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                    <SectionHeader label="四季拆解（春 / 夏 / 秋 / 冬）" expanded={showSeason} onToggle={() => setShowSeason(p => !p)} />
                </div>
                {showSeason && (
                    <div className="p-5 space-y-4">
                        {!sOk && (
                            <div className="text-xs px-3 py-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-700">
                                ⚠️ 四季占比合计 {(sSum * 100).toFixed(1)}%，应等于 100%
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="min-w-max w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        {['季节', '销售占比', '销售目标', '新品占比', '新品销售额', '消化率目标', 'OTB预算'].map((h, i) => (
                                            <th key={i} className={`pb-2 px-3 text-slate-400 font-medium whitespace-nowrap ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {SEASON_META.map(s => {
                                        const ratioKey = `${s.key}SalesRatio` as keyof Inputs;
                                        const npKey    = `${s.key}NewProductRatio` as keyof Inputs;
                                        const stKey    = `${s.key}SellThroughTarget` as keyof Inputs;
                                        const data     = fourSeasons[s.key];
                                        return (
                                            <tr key={s.key} className="border-b border-slate-50 hover:bg-slate-50/60">
                                                <td className="py-2.5 px-3">
                                                    <span className={`font-bold text-sm ${s.color}`}>{s.name}</span>
                                                </td>
                                                <td className="py-2 px-2 text-right">
                                                    <input type="number" value={parseFloat((inputs[ratioKey] as number * 100).toFixed(1))} step={0.5}
                                                        onChange={e => set(ratioKey, (parseFloat(e.target.value) || 0) / 100)}
                                                        className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                                    <span className="ml-1 text-slate-400">%</span>
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-medium text-slate-700">{fc(data.target)}</td>
                                                <td className="py-2 px-2 text-right">
                                                    <input type="number" value={parseFloat((inputs[npKey] as number * 100).toFixed(1))} step={0.5}
                                                        onChange={e => set(npKey, (parseFloat(e.target.value) || 0) / 100)}
                                                        className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                                    <span className="ml-1 text-slate-400">%</span>
                                                </td>
                                                <td className="py-2.5 px-3 text-right text-slate-600">{fc(data.npSales)}</td>
                                                <td className="py-2 px-2 text-right">
                                                    <input type="number" value={parseFloat((inputs[stKey] as number * 100).toFixed(1))} step={0.5}
                                                        onChange={e => set(stKey, (parseFloat(e.target.value) || 0) / 100)}
                                                        className="w-14 text-right text-xs bg-sky-50 border border-sky-200 rounded px-1.5 py-1 focus:outline-none" />
                                                    <span className="ml-1 text-slate-400">%</span>
                                                </td>
                                                <td className={`py-2.5 px-3 text-right font-semibold ${s.color}`}>{fc(data.otb)}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* SS/AW 汇总行 */}
                                    <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold">
                                        <td className="py-2 px-3 text-slate-500">SS（春+夏）</td>
                                        <td className="py-2 px-3 text-right text-slate-600">{((inputs.springSalesRatio + inputs.summerSalesRatio) * 100).toFixed(1)}%</td>
                                        <td className="py-2 px-3 text-right text-sky-700">{fc(fourSeasons.spring.target + fourSeasons.summer.target)}</td>
                                        <td colSpan={2} />
                                        <td />
                                        <td className="py-2 px-3 text-right text-sky-700">{fc((fourSeasons.spring.otb ?? 0) + (fourSeasons.summer.otb ?? 0))}</td>
                                    </tr>
                                    <tr className="bg-slate-50/80 text-xs font-semibold">
                                        <td className="py-2 px-3 text-slate-500">AW（秋+冬）</td>
                                        <td className="py-2 px-3 text-right text-slate-600">{((inputs.autumnSalesRatio + inputs.winterSalesRatio) * 100).toFixed(1)}%</td>
                                        <td className="py-2 px-3 text-right text-sky-700">{fc(fourSeasons.autumn.target + fourSeasons.winter.target)}</td>
                                        <td colSpan={2} />
                                        <td />
                                        <td className="py-2 px-3 text-right text-sky-700">{fc((fourSeasons.autumn.otb ?? 0) + (fourSeasons.winter.otb ?? 0))}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-[10px] text-slate-400">四季合计：{(sSum * 100).toFixed(1)}% {sOk ? '✅' : '❌'} | SS {((inputs.springSalesRatio + inputs.summerSalesRatio) * 100).toFixed(0)}% / AW {((inputs.autumnSalesRatio + inputs.winterSalesRatio) * 100).toFixed(0)}%</p>
                    </div>
                )}
            </div>

            {/* ── 风控参数（折叠）── */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                    <SectionHeader label="风控 &amp; 库存默认参数" expanded={showRisk} onToggle={() => setShowRisk(p => !p)} />
                </div>
                {showRisk && (
                    <div className="px-5 py-3">
                        <InputRow label="过季警戒线" value={inputs.maxCarryoverRatio} onChange={v => set('maxCarryoverRatio', v)} isPercent />
                        <InputRow label="默认存销比（月）" value={inputs.defaultStockToSalesRatio} onChange={v => set('defaultStockToSalesRatio', v)} suffix="月" />
                        <InputRow label="默认到货率" value={inputs.defaultArrivalRate} onChange={v => set('defaultArrivalRate', v)} isPercent />
                    </div>
                )}
            </div>

            {/* 诊断区 */}
            {diagnoses.length > 0 && (
                <div className="space-y-2">
                    {diagnoses.map((d, i) => (
                        <div key={i} className={`flex items-start gap-2 px-4 py-3 rounded-xl text-xs border ${d.level === 'danger' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                            {d.msg}
                        </div>
                    ))}
                </div>
            )}
            {diagnoses.length === 0 && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs bg-emerald-50 border border-emerald-100 text-emerald-700">
                    ✅ 年度OTB参数健康，季度/四季结构均正常
                </div>
            )}
        </div>
    );
}
