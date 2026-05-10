'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import { useMerchMetricConfig } from '@/hooks/useMerchMetricConfig';
import { useOtbAnnualComparison } from '@/hooks/useOtbAnnualComparison';
import {
    calcAnnualOTB,
    calcWeightedSellThroughTarget,
    calcSeasonBalance,
    calcMaxSeasonShare,
    calcSensitivityImpact,
    formatCurrency,
    formatPct,
    type AnnualOTBInputs,
    type CurrencyUnit,
} from '@/utils/otbCalculations';
import { resolveBusinessThreshold } from '@/utils/merchMetricResolver';

import AnnualOTBDecisionSummary from './annual/AnnualOTBDecisionSummary';
import AnnualOTBDownstreamStatus from './annual/AnnualOTBDownstreamStatus';
import AnnualOTBGapAttribution from './annual/AnnualOTBGapAttribution';
import defaultData from '../../../../data/otb/otb_assumptions.json';

interface Props {
    currencyUnit: CurrencyUnit;
    filters: DashboardFilters;
    onComputedChange?: (ss: number, aw: number, fourSeasons: FourSeasonTargets, approvedBudget: number) => void;
    onScenarioSave?: (snapshot: AnnualOTBInputs) => void;
    onJumpToTab?: (tab: 'wave' | 'price' | 'category' | 'channel' | 'execution' | 'cashflow') => void;
    isLocked?: boolean;
    compareMode?: CompareMode;
}

export interface FourSeasonTargets {
    spring: number;
    summer: number;
    autumn: number;
    winter: number;
}

type Inputs = Omit<AnnualOTBInputs, 'maxCarryoverRatio' | 'defaultStockToSalesRatio' | 'defaultArrivalRate'> & {
    maxCarryoverRatio: number;
    defaultStockToSalesRatio: number;
    defaultArrivalRate: number;
};
type SeasonKey = keyof FourSeasonTargets;

const STORAGE_KEY = 'otb-annual-state';

const SEASON_META: Array<{
    key: SeasonKey;
    label: string;
    color: string;
    inputBg: string;
}> = [
    { key: 'spring', label: '春季', color: 'text-emerald-600', inputBg: 'bg-emerald-50 border-emerald-200' },
    { key: 'summer', label: '夏季', color: 'text-sky-600', inputBg: 'bg-sky-50 border-sky-200' },
    { key: 'autumn', label: '秋季', color: 'text-amber-600', inputBg: 'bg-amber-50 border-amber-200' },
    { key: 'winter', label: '冬季', color: 'text-rose-600', inputBg: 'bg-rose-50 border-rose-200' },
];

function loadSaved(): Partial<Inputs> | null {
    if (typeof window === 'undefined') return null;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? (JSON.parse(saved) as Partial<Inputs>) : null;
    } catch {
        return null;
    }
}

function buildInitialInputs(saved: Partial<Inputs> | null): Inputs {
    return {
        annualSalesTarget: saved?.annualSalesTarget ?? defaultData.annualSalesTarget,
        approvedBudget: saved?.approvedBudget ?? defaultData.approvedBudget,
        carryoverRatio: saved?.carryoverRatio ?? defaultData.carryoverRatio,
        springSalesRatio: saved?.springSalesRatio ?? defaultData.springSalesRatio,
        summerSalesRatio: saved?.summerSalesRatio ?? defaultData.summerSalesRatio,
        autumnSalesRatio: saved?.autumnSalesRatio ?? defaultData.autumnSalesRatio,
        winterSalesRatio: saved?.winterSalesRatio ?? defaultData.winterSalesRatio,
        springNewProductRatio: saved?.springNewProductRatio ?? defaultData.springNewProductRatio,
        summerNewProductRatio: saved?.summerNewProductRatio ?? defaultData.summerNewProductRatio,
        autumnNewProductRatio: saved?.autumnNewProductRatio ?? defaultData.autumnNewProductRatio,
        winterNewProductRatio: saved?.winterNewProductRatio ?? defaultData.winterNewProductRatio,
        springSellThroughTarget: saved?.springSellThroughTarget ?? defaultData.springSellThroughTarget,
        summerSellThroughTarget: saved?.summerSellThroughTarget ?? defaultData.summerSellThroughTarget,
        autumnSellThroughTarget: saved?.autumnSellThroughTarget ?? defaultData.autumnSellThroughTarget,
        winterSellThroughTarget: saved?.winterSellThroughTarget ?? defaultData.winterSellThroughTarget,
        maxCarryoverRatio: saved?.maxCarryoverRatio ?? defaultData.maxCarryoverRatio,
        defaultStockToSalesRatio: saved?.defaultStockToSalesRatio ?? defaultData.defaultStockToSalesRatio,
        defaultArrivalRate: saved?.defaultArrivalRate ?? defaultData.defaultArrivalRate,
    };
}

function seasonResultKey(key: SeasonKey, suffix: 'Target' | 'NPSales' | 'Carryover' | 'OTB') {
    return `${key}${suffix}` as const;
}

function formatSignedCurrency(value: number | null, unit: CurrencyUnit) {
    if (value === null) return '-';
    const sign = value >= 0 ? '▲' : '▼';
    return `${sign} ${formatCurrency(Math.abs(value), unit)}`;
}

function formatSignedPct(value: number | null) {
    if (value === null) return '-';
    const sign = value >= 0 ? '+' : '-';
    return `${sign}${formatPct(Math.abs(value))}`;
}

export default function AnnualOTBControlPanel({
    currencyUnit,
    filters,
    onComputedChange,
    onScenarioSave,
    onJumpToTab,
    isLocked = false,
    compareMode = 'none',
}: Props) {
    const saved = useMemo(() => loadSaved(), []);
    const initialInputs = useMemo(() => buildInitialInputs(saved), [saved]);

    const [inputs, setInputs] = useState<Inputs>(() => initialInputs);
    const [savedAt, setSavedAt] = useState<string | null>(() => (saved ? '本地缓存' : null));
    const [savedFingerprint, setSavedFingerprint] = useState<string | null>(() => (saved ? JSON.stringify(initialInputs) : null));
    const [helpOpen, setHelpOpen] = useState(false);
    const [sensitivityST, setSensitivityST] = useState(0);
    const [sensitivityCarryover, setSensitivityCarryover] = useState(0);
    const [sensitivitySales, setSensitivitySales] = useState(0);
    const [showSensitivity, setShowSensitivity] = useState(false);

    const merchMetricConfig = useMerchMetricConfig();
    const sellThroughThreshold = resolveBusinessThreshold('sellThroughRate', merchMetricConfig).value;
    const sellThroughHealthyMin = sellThroughThreshold?.rules.find(rule => rule.status === 'health' && rule.condition === '>=')?.value ?? 0.75;

    const result = useMemo(() => calcAnnualOTB(inputs), [inputs]);
    const comparison = useOtbAnnualComparison(filters, inputs, result);
    const annualCompareMode: Exclude<CompareMode, 'mom'> = compareMode === 'mom' ? 'none' : compareMode;

    const currentFingerprint = JSON.stringify(inputs);
    const hasUnsavedChanges = savedFingerprint !== null && savedFingerprint !== currentFingerprint;

    const set = useCallback(<K extends keyof Inputs>(key: K, value: number) => {
        setInputs(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleSave = useCallback(() => {
        const fingerprint = JSON.stringify(inputs);
        try {
            localStorage.setItem(STORAGE_KEY, fingerprint);
            setSavedFingerprint(fingerprint);
            setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
        } catch {
            // localStorage may be unavailable in privacy mode.
        }
        onScenarioSave?.(inputs);
    }, [inputs, onScenarioSave]);

    useEffect(() => {
        onComputedChange?.(result.ssSalesTarget, result.awSalesTarget, {
            spring: result.springTarget,
            summer: result.summerTarget,
            autumn: result.autumnTarget,
            winter: result.winterTarget,
        }, inputs.approvedBudget);
    }, [inputs.approvedBudget, result, onComputedChange]);

    const fc = (value: number | null | undefined) => formatCurrency(value, currencyUnit);

    const seasonRatioSum = inputs.springSalesRatio + inputs.summerSalesRatio + inputs.autumnSalesRatio + inputs.winterSalesRatio;
    const seasonRatioOk = Math.abs(seasonRatioSum - 1) < 0.001;
    const annualNewProductRatio = inputs.annualSalesTarget > 0
        ? (result.springNPSales + result.summerNPSales + result.autumnNPSales + result.winterNPSales) / inputs.annualSalesTarget
        : 0;

    // Derived annual metrics
    const weightedST = calcWeightedSellThroughTarget(inputs);
    const { ssShare, balance } = calcSeasonBalance(result);
    const { share: maxSeasonShare, key: maxSeasonKey } = calcMaxSeasonShare(result);
    const netOtb = result.annualNewProductInvestmentBudget ?? 0;
    const otbToSalesRatio = inputs.annualSalesTarget > 0 ? netOtb / inputs.annualSalesTarget : 0;
    const salesYoyDelta = comparison.salesDeltaRate ?? 0;
    const SEASON_LABEL_MAP: Record<string, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

    // Sensitivity simulation
    const sensitivityResult = useMemo(() => calcSensitivityImpact(inputs, {
        sellThrough: sensitivityST / 100,
        carryover: sensitivityCarryover / 100,
        salesTarget: sensitivitySales / 100,
    }), [inputs, sensitivityST, sensitivityCarryover, sensitivitySales]);

    const diagnoses: Array<{ level: 'warn' | 'danger'; message: string }> = [];
    if (!seasonRatioOk) {
        diagnoses.push({ level: 'danger', message: `四季销售占比合计 ${formatPct(seasonRatioSum)}，应等于100%。` });
    }
    if (inputs.carryoverRatio > inputs.maxCarryoverRatio) {
        diagnoses.push({ level: 'danger', message: `过季货品占比 ${formatPct(inputs.carryoverRatio)} 超过警戒线 ${formatPct(inputs.maxCarryoverRatio)}，库存压力偏高。` });
    }
    SEASON_META.forEach(item => {
        const st = inputs[`${item.key}SellThroughTarget` as keyof Inputs] as number;
        if (st < sellThroughHealthyMin) {
            diagnoses.push({ level: 'warn', message: `${item.label}售罄目标 ${formatPct(st)} 低于健康线 ${formatPct(sellThroughHealthyMin)}，会推高毛OTB需求。` });
        }
    });
    if (result.budgetGap !== null && result.budgetGap > 0) {
        diagnoses.push({ level: 'warn', message: `测算净OTB超出批准预算 ${fc(result.budgetGap)}，需要追加预算或压缩结构。` });
    }

    // Decision recommendation text
    let recommendation: string;
    let recommendationLevel: 'ok' | 'warn' | 'danger';
    if (result.budgetGap !== null && result.budgetGap > 0) {
        recommendation = `净OTB高于批准预算 ${fc(result.budgetGap)}，优先复核主推波段、提高售罄目标或提交追加预算申请。`;
        recommendationLevel = 'danger';
    } else if (inputs.carryoverRatio > inputs.maxCarryoverRatio) {
        recommendation = `过季结转超警戒线（${formatPct(inputs.carryoverRatio)} > ${formatPct(inputs.maxCarryoverRatio)}），建议先制定清货计划，再决定是否追加新品采购。`;
        recommendationLevel = 'danger';
    } else if (diagnoses.some(d => d.level === 'warn' && d.message.includes('售罄'))) {
        recommendation = `部分季节售罄目标偏低（加权 ${formatPct(weightedST)}），需同步检查价格带结构、款数和清货节奏。`;
        recommendationLevel = 'warn';
    } else if (Math.abs(salesYoyDelta) > 0.30) {
        recommendation = `销售目标vs去年涨幅 ${formatPct(salesYoyDelta)}，激进目标需配套渠道扩张/产能确认。`;
        recommendationLevel = 'warn';
    } else if (Math.abs(ssShare - 0.5) > 0.10) {
        recommendation = `春夏:秋冬 ${Math.round(ssShare * 100)}:${Math.round((1 - ssShare) * 100)}，季节失衡，建议复核结构占比是否符合品牌节奏。`;
        recommendationLevel = 'warn';
    } else if (maxSeasonShare > 0.35) {
        recommendation = `${SEASON_LABEL_MAP[maxSeasonKey]}季OTB占年度 ${formatPct(maxSeasonShare)}，单季集中度偏高，注意账期与现金流压力。`;
        recommendationLevel = 'warn';
    } else if (otbToSalesRatio > 0.50) {
        recommendation = `净OTB占销售目标 ${formatPct(otbToSalesRatio)}，投产比偏高，售罄假设需谨慎复核。`;
        recommendationLevel = 'warn';
    } else {
        recommendation = `整体结构健康，年度OTB测算结果在预算内，四季占比和售罄目标暂无明显异常，重点跟踪到货节奏与新品转化。`;
        recommendationLevel = 'ok';
    }

    // Annual profile banner text
    const profileSSRatio = `${Math.round(ssShare * 100)}:${Math.round((1 - ssShare) * 100)}`;
    const balanceMark = balance === 'ok' ? '✓' : '⚠';

    return (
        <div className="space-y-4">
            {/* Annual profile banner */}
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-xs text-sky-800 flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-sky-700">2026 年度规划</span>
                <span>销售 {fc(inputs.annualSalesTarget)}</span>
                {comparison.salesDeltaRate !== null && (
                    <span className={comparison.salesDeltaRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        ({comparison.salesDeltaRate >= 0 ? '+' : ''}{formatPct(comparison.salesDeltaRate)} YoY)
                    </span>
                )}
                <span className="text-sky-400">·</span>
                <span>净OTB {fc(result.annualNewProductInvestmentBudget)}</span>
                <span className="text-sky-400">·</span>
                <span>占目标 {formatPct(otbToSalesRatio)}</span>
                <span className="text-sky-400">·</span>
                <span>春夏:秋冬 {profileSSRatio} {balanceMark}</span>
                <span className="text-sky-400">·</span>
                <span>新品占比 {formatPct(annualNewProductRatio)}</span>
            </div>

            <AnnualOTBDecisionSummary
                result={result}
                inputs={inputs}
                currencyUnit={currencyUnit}
                compareMode={annualCompareMode}
                comparison={comparison}
                sellThroughHealthyMin={sellThroughHealthyMin}
                savedAt={savedAt}
                isLocked={isLocked}
                diagnoses={diagnoses}
            />

            {/* Decision recommendation bar */}
            <div className={`rounded-xl border px-4 py-3 text-xs font-medium flex items-start gap-2 ${
                recommendationLevel === 'danger' ? 'bg-rose-50 border-rose-100 text-rose-700'
                : recommendationLevel === 'warn' ? 'bg-amber-50 border-amber-100 text-amber-700'
                : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}>
                <span className="flex-shrink-0 font-bold">
                    {recommendationLevel === 'danger' ? '✗' : recommendationLevel === 'warn' ? '⚠' : '✓'}
                </span>
                <span>{recommendation}</span>
            </div>

            {/* History trend mini chart (LY → current year, 2 points; placeholder for 5-year extension) */}
            {comparison.hasHistoryData && (
                <AnnualHistoryTrendChart
                    points={[
                        { year: comparison.previousYear, sales: comparison.lySalesActual, otb: comparison.lyOtbBudget },
                        { year: comparison.currentYear, sales: inputs.annualSalesTarget, otb: result.annualNewProductInvestmentBudget },
                    ]}
                    currencyUnit={currencyUnit}
                    salesYoyRate={comparison.salesDeltaRate}
                    otbYoyRate={comparison.otbDeltaRate}
                />
            )}

            {/* Diagnoses (moved up, near decision bar) */}
            {diagnoses.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {diagnoses.map((item, index) => (
                        <div
                            key={`${item.message}-${index}`}
                            className={`flex items-start gap-2 px-4 py-3 rounded-xl text-xs border ${
                                item.level === 'danger'
                                    ? 'bg-rose-50 border-rose-100 text-rose-700'
                                    : 'bg-amber-50 border-amber-100 text-amber-700'
                            }`}
                        >
                            {item.message}
                        </div>
                    ))}
                </div>
            )}

            {/* Params — 2-column layout */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-800">年度参数设定</h3>
                        <span className="text-[10px] text-slate-400">{isLocked ? '版本已锁定，只读' : '编辑后实时重算'}</span>
                        {hasUnsavedChanges && <span className="text-[10px] text-amber-600">有未保存变更</span>}
                        {savedAt && !hasUnsavedChanges && <span className="text-[10px] text-emerald-600">已保存 {savedAt}</span>}
                    </div>
                    {!isLocked && (
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-medium hover:bg-sky-600 transition-colors"
                            type="button"
                        >
                            保存方案
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                    {/* Left col: core targets + annual NP ratio */}
                    <div className="px-5 py-4">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">核心目标</p>
                        <div className="space-y-3">
                            <NumberField
                                label="年度销售目标（元）"
                                value={inputs.annualSalesTarget}
                                step={100000}
                                readOnly={isLocked}
                                helper={fc(inputs.annualSalesTarget)}
                                onChange={value => set('annualSalesTarget', value)}
                            />
                            <NumberField
                                label="批准预算（元）"
                                value={inputs.approvedBudget}
                                step={100000}
                                readOnly={isLocked}
                                helper={fc(inputs.approvedBudget)}
                                onChange={value => set('approvedBudget', value)}
                            />
                            <div className="space-y-1">
                                <p className="text-[10px] text-slate-500">年度新品占比</p>
                                <div className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-500">
                                    {formatPct(annualNewProductRatio)}
                                </div>
                                <p className="text-[10px] text-slate-400">由四季新品销售目标加权生成，只读。</p>
                            </div>
                        </div>
                    </div>

                    {/* Right col: risk params */}
                    <div className="px-5 py-4">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">风控参数</p>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <PercentField
                                    label="过季实际占比"
                                    value={inputs.carryoverRatio}
                                    readOnly={isLocked}
                                    helper={`警戒线 ${formatPct(inputs.maxCarryoverRatio)}`}
                                    onChange={value => set('carryoverRatio', value)}
                                />
                                <PercentField
                                    label="过季警戒线"
                                    value={inputs.maxCarryoverRatio}
                                    readOnly={isLocked}
                                    onChange={value => set('maxCarryoverRatio', value)}
                                />
                            </div>
                            <NumberField
                                label="默认存销比（月）"
                                value={inputs.defaultStockToSalesRatio}
                                step={0.5}
                                readOnly={isLocked}
                                onChange={value => set('defaultStockToSalesRatio', value)}
                            />
                            <PercentField
                                label="默认到货率"
                                value={inputs.defaultArrivalRate}
                                readOnly={isLocked}
                                onChange={value => set('defaultArrivalRate', value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Four-season OTB table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-800">四季OTB拆解</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            年度 → 四季 → 波段；净OTB = 新品销售目标 ÷ 售罄目标 - 可抵扣过季库存。
                        </p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${seasonRatioOk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        合计 {formatPct(seasonRatioSum)}
                    </span>
                </div>

                {!seasonRatioOk && (
                    <div className="mx-5 mt-3 text-xs px-3 py-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-700">
                        四季销售占比合计应等于 100%，否则年度目标无法完整分配。
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-max w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80">
                                {[
                                    '季节',
                                    '销售占比',
                                    '销售目标',
                                    '净OTB成本预算',
                                    '售罄目标',
                                    '新品占比',
                                    '新品销售目标',
                                    '可抵扣过季库存',
                                    'LY占比',
                                    'LY售罄',
                                    ...(annualCompareMode === 'plan' ? ['批准份额', '预算差异', '差异率'] : []),
                                    ...(annualCompareMode === 'yoy' ? ['LY销售额', '销售同比', 'LY OTB', 'OTB同比'] : []),
                                ].map((header, index) => (
                                    <th key={header} className={`py-2.5 px-4 text-slate-400 font-medium whitespace-nowrap ${index > 0 ? 'text-right' : 'text-left'}`}>
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {SEASON_META.map(item => {
                                const ratioKey = `${item.key}SalesRatio` as keyof Inputs;
                                const npKey = `${item.key}NewProductRatio` as keyof Inputs;
                                const stKey = `${item.key}SellThroughTarget` as keyof Inputs;
                                const seasonTarget = result[seasonResultKey(item.key, 'Target') as keyof typeof result] as number;
                                const seasonNPSales = result[seasonResultKey(item.key, 'NPSales') as keyof typeof result] as number;
                                const seasonCarryover = result[seasonResultKey(item.key, 'Carryover') as keyof typeof result] as number;
                                const seasonOTB = result[seasonResultKey(item.key, 'OTB') as keyof typeof result] as number | null;
                                const baseline = comparison.seasonBaselines[item.key];
                                const budgetShare = inputs.approvedBudget * (inputs[ratioKey] as number);
                                const planGap = seasonOTB !== null ? seasonOTB - budgetShare : null;
                                const planGapRate = planGap !== null && budgetShare > 0 ? planGap / budgetShare : null;
                                const lySales = baseline.salesAmount;
                                const salesYoy = lySales !== null ? seasonTarget - lySales : null;
                                const salesYoyRate = lySales !== null && lySales > 0 ? salesYoy! / lySales : null;
                                const lyOtb = comparison.lyOtbBudget !== null && baseline.salesRatio !== null
                                    ? comparison.lyOtbBudget * baseline.salesRatio
                                    : null;
                                const otbYoy = lyOtb !== null && seasonOTB !== null ? seasonOTB - lyOtb : null;
                                const otbYoyRate = lyOtb !== null && lyOtb > 0 && otbYoy !== null ? otbYoy / lyOtb : null;
                                // Deviation ⚠ when season ratio deviates >5pp from LY
                                const lyRatio = baseline.salesRatio;
                                const currentRatio = inputs[ratioKey] as number;
                                const hasRatioDeviation = lyRatio !== null && Math.abs(currentRatio - lyRatio) > 0.05;

                                return (
                                    <tr key={item.key} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center gap-1.5 font-bold text-sm ${item.color}`}>
                                                <span className="w-2 h-2 rounded-full bg-current" />
                                                {item.label}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <PercentInput
                                                    value={inputs[ratioKey] as number}
                                                    disabled={isLocked}
                                                    className={item.inputBg}
                                                    onChange={value => set(ratioKey, value)}
                                                />
                                                {hasRatioDeviation && <span className="text-amber-500 text-[10px]" title={`LY: ${formatPct(lyRatio)}`}>⚠</span>}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-semibold text-slate-700">{fc(seasonTarget)}</td>
                                        <td className={`py-3 px-4 text-right font-bold text-base ${item.color}`}>{fc(seasonOTB)}</td>
                                        <td className="py-2.5 px-3 text-right">
                                            <PercentInput
                                                value={inputs[stKey] as number}
                                                disabled={isLocked}
                                                className={item.inputBg}
                                                onChange={value => set(stKey, value)}
                                            />
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                            <PercentInput
                                                value={inputs[npKey] as number}
                                                disabled={isLocked}
                                                className={item.inputBg}
                                                onChange={value => set(npKey, value)}
                                            />
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-500">{fc(seasonNPSales)}</td>
                                        <td className="py-3 px-4 text-right text-amber-600 font-medium">{fc(seasonCarryover)}</td>
                                        <td className="py-3 px-4 text-right text-slate-400">
                                            {lyRatio !== null ? formatPct(lyRatio) : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-400">
                                            {baseline.sellThroughRate !== null ? formatPct(baseline.sellThroughRate) : '-'}
                                        </td>

                                        {annualCompareMode === 'plan' && (
                                            <>
                                                <td className="py-3 px-4 text-right text-slate-400">{fc(budgetShare)}</td>
                                                <td className={`py-3 px-4 text-right font-semibold ${planGap === null ? 'text-slate-400' : planGap > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {formatSignedCurrency(planGap, currencyUnit)}
                                                </td>
                                                <td className={`py-3 px-4 text-right text-xs ${planGapRate === null ? 'text-slate-400' : planGapRate > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {formatSignedPct(planGapRate)}
                                                </td>
                                            </>
                                        )}

                                        {annualCompareMode === 'yoy' && (
                                            <>
                                                <td className="py-3 px-4 text-right text-slate-400">{fc(lySales)}</td>
                                                <td className={`py-3 px-4 text-right font-semibold ${salesYoy === null ? 'text-slate-400' : salesYoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {formatSignedCurrency(salesYoy, currencyUnit)}
                                                    <span className="ml-1 text-[10px] text-slate-400">{formatSignedPct(salesYoyRate)}</span>
                                                </td>
                                                <td className="py-3 px-4 text-right text-slate-400">{fc(lyOtb)}</td>
                                                <td className={`py-3 px-4 text-right font-semibold ${otbYoy === null ? 'text-slate-400' : otbYoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {formatSignedCurrency(otbYoy, currencyUnit)}
                                                    <span className="ml-1 text-[10px] text-slate-400">{formatSignedPct(otbYoyRate)}</span>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-slate-50/80 border-t-2 border-slate-200">
                            <tr>
                                <td className="py-3 px-4 font-bold text-slate-700 text-sm">年度合计</td>
                                <td className="py-3 px-3 text-right font-semibold text-slate-700">{formatPct(seasonRatioSum)}</td>
                                <td className="py-3 px-4 text-right font-bold text-slate-800">{fc(inputs.annualSalesTarget)}</td>
                                <td className="py-3 px-4 text-right font-bold text-slate-800 text-base">{fc(result.annualNewProductInvestmentBudget)}</td>
                                <td className="py-3 px-3 text-right text-slate-400">-</td>
                                <td className="py-3 px-3 text-right font-semibold text-slate-700">{formatPct(annualNewProductRatio)}</td>
                                <td className="py-3 px-4 text-right font-semibold text-slate-700">{fc(result.springNPSales + result.summerNPSales + result.autumnNPSales + result.winterNPSales)}</td>
                                <td className="py-3 px-4 text-right font-semibold text-amber-600">{fc(result.springCarryover + result.summerCarryover + result.autumnCarryover + result.winterCarryover)}</td>
                                <td className="py-3 px-4 text-right text-slate-400">{comparison.hasHistoryData ? '100.0%' : '-'}</td>
                                <td className="py-3 px-4 text-right text-slate-400">-</td>
                                {annualCompareMode === 'plan' && (
                                    <>
                                        <td className="py-3 px-4 text-right font-semibold text-slate-500">{fc(inputs.approvedBudget)}</td>
                                        <td className={`py-3 px-4 text-right font-bold ${result.budgetGap === null ? 'text-slate-400' : result.budgetGap > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {formatSignedCurrency(result.budgetGap, currencyUnit)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-400">-</td>
                                    </>
                                )}
                                {annualCompareMode === 'yoy' && (
                                    <>
                                        <td className="py-3 px-4 text-right font-semibold text-slate-500">{fc(comparison.lySalesActual)}</td>
                                        <td className={`py-3 px-4 text-right font-bold ${comparison.salesDelta === null ? 'text-slate-400' : comparison.salesDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatSignedCurrency(comparison.salesDelta, currencyUnit)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-semibold text-slate-500">{fc(comparison.lyOtbBudget)}</td>
                                        <td className={`py-3 px-4 text-right font-bold ${comparison.otbDelta === null ? 'text-slate-400' : comparison.otbDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatSignedCurrency(comparison.otbDelta, currencyUnit)}
                                        </td>
                                    </>
                                )}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <AnnualOTBGapAttribution
                result={result}
                inputs={inputs}
                currencyUnit={currencyUnit}
                sellThroughHealthyMin={sellThroughHealthyMin}
            />

            <AnnualOTBDownstreamStatus
                result={result}
                currencyUnit={currencyUnit}
                savedAt={savedAt}
                hasUnsavedChanges={hasUnsavedChanges}
                onJumpToTab={onJumpToTab}
            />

            {/* Sensitivity analysis (collapsible) */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                <button
                    type="button"
                    onClick={() => setShowSensitivity(prev => !prev)}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-left"
                >
                    <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-800">敏感度分析</h3>
                        <span className="text-[10px] text-slate-400">调整参数查看净OTB变化</span>
                    </div>
                    <span className="text-slate-400 text-sm">{showSensitivity ? '▲' : '▼'}</span>
                </button>
                {showSensitivity && (
                    <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <p className="text-[10px] text-slate-500 mb-1">售罄率 ± pp</p>
                                <div className="flex items-center gap-2">
                                    <input type="range" min={-15} max={15} step={1} value={sensitivityST}
                                        onChange={e => setSensitivityST(Number(e.target.value))}
                                        className="flex-1 accent-sky-500" />
                                    <span className="text-xs font-mono w-8 text-right">{sensitivityST > 0 ? '+' : ''}{sensitivityST}pp</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 mb-1">过季占比 ± pp</p>
                                <div className="flex items-center gap-2">
                                    <input type="range" min={-15} max={15} step={1} value={sensitivityCarryover}
                                        onChange={e => setSensitivityCarryover(Number(e.target.value))}
                                        className="flex-1 accent-amber-500" />
                                    <span className="text-xs font-mono w-8 text-right">{sensitivityCarryover > 0 ? '+' : ''}{sensitivityCarryover}pp</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 mb-1">销售目标 ± %</p>
                                <div className="flex items-center gap-2">
                                    <input type="range" min={-20} max={20} step={1} value={sensitivitySales}
                                        onChange={e => setSensitivitySales(Number(e.target.value))}
                                        className="flex-1 accent-emerald-500" />
                                    <span className="text-xs font-mono w-8 text-right">{sensitivitySales > 0 ? '+' : ''}{sensitivitySales}%</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                            <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                                <p className="text-[10px] text-slate-400">调整后净OTB</p>
                                <p className="text-sm font-bold text-slate-800">{fc(sensitivityResult.netOtb)}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    vs 当前 {fc(netOtb)} &nbsp;
                                    <span className={sensitivityResult.netOtb > netOtb ? 'text-rose-500' : 'text-emerald-500'}>
                                        ({sensitivityResult.netOtb > netOtb ? '+' : ''}{fc(sensitivityResult.netOtb - netOtb)})
                                    </span>
                                </p>
                            </div>
                            <div className={`px-3 py-2 rounded-lg border ${sensitivityResult.budgetGap > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                <p className="text-[10px] text-slate-400">预算缺口 / 冗余</p>
                                <p className={`text-sm font-bold ${sensitivityResult.budgetGap > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {sensitivityResult.budgetGap > 0 ? '▲' : '▼'} {fc(Math.abs(sensitivityResult.budgetGap))}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ? Help popup trigger */}
            <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="fixed bottom-6 right-6 w-9 h-9 rounded-full bg-sky-500 text-white text-sm font-bold shadow-lg hover:bg-sky-600 transition-colors z-40 flex items-center justify-center"
            >
                ?
            </button>
            {helpOpen && (
                <div className="fixed bottom-16 right-6 w-80 bg-sky-50 border border-sky-100 rounded-xl shadow-xl p-4 z-50 text-xs text-sky-900 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-sm text-sky-800">年度总控 — 公式说明</p>
                        <button type="button" onClick={() => setHelpOpen(false)} className="text-sky-400 hover:text-sky-600 font-bold text-base leading-none">×</button>
                    </div>
                    <p><strong>净OTB</strong> = 新品销售目标 ÷ 售罄目标 − 可抵扣过季库存</p>
                    <p><strong>新品销售目标</strong> = 季节销售目标 × 新品占比</p>
                    <p><strong>可抵扣过季库存</strong> = 季节销售目标 × 过季占比</p>
                    <p><strong>预算缺口</strong> = 年度净OTB − 批准采购预算</p>
                    <p><strong>加权售罄目标</strong> = Σ（季节销售占比 × 季节售罄目标）</p>
                    <p><strong>季节平衡度</strong> = 春夏OTB ÷ 年度净OTB（健康区间 40~60%）</p>
                    <p className="text-sky-600 pt-1 border-t border-sky-100">批准预算不影响净OTB计算，仅用于差异对比。</p>
                </div>
            )}
        </div>
    );
}

// ─── 历史趋势 mini chart ─────────────────────────────────────────

interface HistoryTrendPoint {
    year: number;
    sales: number | null;
    otb: number | null;
}

function AnnualHistoryTrendChart({
    points,
    currencyUnit,
    salesYoyRate,
    otbYoyRate,
}: {
    points: HistoryTrendPoint[];
    currencyUnit: CurrencyUnit;
    salesYoyRate: number | null;
    otbYoyRate: number | null;
}) {
    const validPoints = points.filter(p => p.sales !== null || p.otb !== null);
    if (validPoints.length < 2) return null;

    const W = 280;
    const H = 80;
    const PAD_X = 24;
    const PAD_Y = 14;
    const innerW = W - PAD_X * 2;
    const innerH = H - PAD_Y * 2;

    const allSales = points.map(p => p.sales ?? 0);
    const allOtb = points.map(p => p.otb ?? 0);
    const maxValue = Math.max(...allSales, ...allOtb, 1);

    const xPos = (i: number) => PAD_X + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const yPos = (v: number) => PAD_Y + innerH - (v / maxValue) * innerH;

    const salesPath = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${p.sales !== null ? yPos(p.sales) : yPos(0)}`)
        .join(' ');
    const otbPath = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${p.otb !== null ? yPos(p.otb) : yPos(0)}`)
        .join(' ');

    const fmtDelta = (rate: number | null) => {
        if (rate === null) return '--';
        const sign = rate >= 0 ? '+' : '';
        return `${sign}${formatPct(rate)}`;
    };
    const deltaTone = (rate: number | null) =>
        rate === null ? 'text-slate-400' : rate >= 0 ? 'text-emerald-600' : 'text-rose-600';

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">历史趋势</span>
                    <span className="text-[10px] text-slate-400">{points[0].year} → {points[points.length - 1].year}</span>
                </div>
                <div className="flex gap-3 text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-sky-500" />销售
                        <span className={deltaTone(salesYoyRate)}>{fmtDelta(salesYoyRate)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />净OTB
                        <span className={deltaTone(otbYoyRate)}>{fmtDelta(otbYoyRate)}</span>
                    </span>
                </div>
            </div>
            <div className="flex items-start gap-3">
                <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
                    {/* Baseline */}
                    <line x1={PAD_X} y1={H - PAD_Y} x2={W - PAD_X} y2={H - PAD_Y} stroke="#e2e8f0" strokeWidth="1" />
                    {/* Sales line + points */}
                    <path d={salesPath} fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
                    {points.map((p, i) => p.sales !== null && (
                        <circle key={`s-${i}`} cx={xPos(i)} cy={yPos(p.sales)} r="3" fill="#0ea5e9">
                            <title>{p.year} 销售 {formatCurrency(p.sales, currencyUnit)}</title>
                        </circle>
                    ))}
                    {/* OTB line + points */}
                    <path d={otbPath} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
                    {points.map((p, i) => p.otb !== null && (
                        <circle key={`o-${i}`} cx={xPos(i)} cy={yPos(p.otb)} r="3" fill="#f59e0b">
                            <title>{p.year} 净OTB {formatCurrency(p.otb, currencyUnit)}</title>
                        </circle>
                    ))}
                    {/* Year labels */}
                    {points.map((p, i) => (
                        <text
                            key={`y-${i}`}
                            x={xPos(i)}
                            y={H - 2}
                            fontSize="9"
                            fill="#94a3b8"
                            textAnchor="middle"
                        >
                            {p.year}
                        </text>
                    ))}
                </svg>
                <div className="flex-1 text-[11px] text-slate-500 space-y-1 min-w-0">
                    <div>
                        <div className="text-[10px] text-slate-400">{points[0].year}（实际）</div>
                        <div className="text-slate-700">销售 {formatCurrency(points[0].sales ?? 0, currencyUnit)}</div>
                        <div className="text-slate-500">净OTB {formatCurrency(points[0].otb ?? 0, currencyUnit)}</div>
                    </div>
                    <div className="pt-1 border-t border-slate-100">
                        <div className="text-[10px] text-slate-400">{points[points.length - 1].year}（计划）</div>
                        <div className="text-slate-700 font-semibold">销售 {formatCurrency(points[points.length - 1].sales ?? 0, currencyUnit)}</div>
                        <div className="text-slate-500">净OTB {formatCurrency(points[points.length - 1].otb ?? 0, currencyUnit)}</div>
                    </div>
                </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
                数据：去年 fact_sales 实际 + 今年规划值。完整 5 年历史接入后将自动展开。
            </p>
        </div>
    );
}

function NumberField({
    label,
    value,
    step,
    readOnly,
    helper,
    onChange,
}: {
    label: string;
    value: number;
    step: number;
    readOnly: boolean;
    helper?: string;
    onChange: (value: number) => void;
}) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] text-slate-500">{label}</p>
            <input
                type="number"
                step={step}
                readOnly={readOnly}
                value={value}
                onChange={event => onChange(parseFloat(event.target.value) || 0)}
                className={`w-full text-sm font-semibold border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                    readOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white border-slate-200'
                }`}
            />
            {helper && <p className="text-[10px] text-slate-400">{helper}</p>}
        </div>
    );
}

function PercentField({
    label,
    value,
    readOnly,
    helper,
    onChange,
}: {
    label: string;
    value: number;
    readOnly: boolean;
    helper?: string;
    onChange: (value: number) => void;
}) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] text-slate-500">{label}</p>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    step={0.1}
                    readOnly={readOnly}
                    value={parseFloat((value * 100).toFixed(1))}
                    onChange={event => onChange((parseFloat(event.target.value) || 0) / 100)}
                    className={`w-full text-sm font-semibold border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                        readOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white border-slate-200'
                    }`}
                />
                <span className="text-xs text-slate-400 flex-shrink-0">%</span>
            </div>
            {helper && <p className="text-[10px] text-slate-400">{helper}</p>}
        </div>
    );
}

function PercentInput({
    value,
    disabled,
    className,
    onChange,
}: {
    value: number;
    disabled: boolean;
    className: string;
    onChange: (value: number) => void;
}) {
    return (
        <div className="flex items-center justify-end gap-1">
            <input
                type="number"
                step={0.5}
                disabled={disabled}
                value={parseFloat((value * 100).toFixed(1))}
                onChange={event => onChange((parseFloat(event.target.value) || 0) / 100)}
                className={`w-16 text-right text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-300 ${
                    disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : className
                }`}
            />
            <span className="text-slate-400">%</span>
        </div>
    );
}
