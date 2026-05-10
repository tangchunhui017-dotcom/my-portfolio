'use client';

import type { CompareMode } from '@/hooks/useDashboardFilter';
import type { OtbAnnualComparison } from '@/hooks/useOtbAnnualComparison';
import type { AnnualOTBResult } from '@/utils/otbCalculations';
import {
    formatCurrency,
    formatPct,
    calcWeightedSellThroughTarget,
    calcSeasonBalance,
    calcMaxSeasonShare,
    type CurrencyUnit,
    type AnnualOTBInputs,
} from '@/utils/otbCalculations';

interface Props {
    result: AnnualOTBResult;
    inputs: AnnualOTBInputs;
    currencyUnit: CurrencyUnit;
    compareMode: Exclude<CompareMode, 'mom'>;
    comparison: OtbAnnualComparison;
    sellThroughHealthyMin: number;
    savedAt: string | null;
    isLocked: boolean;
    versionName?: string;
    diagnoses?: Array<{ level: 'warn' | 'danger'; message: string }>;
}

const SEASON_LABEL: Record<string, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

export default function AnnualOTBDecisionSummary({
    result,
    inputs,
    currencyUnit,
    compareMode,
    comparison,
    sellThroughHealthyMin,
    savedAt,
    isLocked,
    versionName,
    diagnoses = [],
}: Props) {
    const fc = (v: number | null | undefined) => formatCurrency(v, currencyUnit);

    // Derived metrics
    const weightedST = calcWeightedSellThroughTarget(inputs);
    const { ssShare, balance } = calcSeasonBalance(result);
    const awShare = 1 - ssShare;
    const { share: maxShare, key: maxKey } = calcMaxSeasonShare(result);

    const netOtb = result.annualNewProductInvestmentBudget;
    const otbToSalesRatio = inputs.annualSalesTarget > 0 && netOtb !== null ? netOtb / inputs.annualSalesTarget : null;

    // Budget gap display
    const budgetGapLabel =
        result.budgetGap === null ? '-'
        : result.budgetGap > 0 ? `▲ ${fc(result.budgetGap)}`
        : `▼ ${fc(Math.abs(result.budgetGap))}`;
    const budgetGapColor =
        result.budgetGap === null ? 'text-slate-500'
        : result.budgetGap > 0 ? 'text-rose-600'
        : 'text-emerald-600';

    // LY sub-line
    const lySalesText = comparison.hasHistoryData && comparison.lySalesActual !== null
        ? `LY ¥${fc(comparison.lySalesActual)}`
        : null;
    const salesDeltaRate = comparison.salesDeltaRate;
    const salesYoyText = salesDeltaRate !== null
        ? `${salesDeltaRate >= 0 ? '+' : ''}${formatPct(salesDeltaRate)} YoY`
        : null;

    const lyOtbText = comparison.hasHistoryData && comparison.lyOtbBudget !== null
        ? `LY OTB ${fc(comparison.lyOtbBudget)}`
        : null;

    // ST per season sub-line
    const stSubLine = `春${formatPct(inputs.springSellThroughTarget)}/夏${formatPct(inputs.summerSellThroughTarget)}/秋${formatPct(inputs.autumnSellThroughTarget)}/冬${formatPct(inputs.winterSellThroughTarget)}`;

    // Season balance display
    const ssRatioDisplay = `${Math.round(ssShare * 100)}:${Math.round(awShare * 100)}`;
    const balanceColor = balance === 'ok' ? 'text-emerald-600' : balance === 'warn' ? 'text-amber-600' : 'text-rose-600';
    const balanceMark = balance === 'ok' ? '✓' : balance === 'warn' ? '⚠' : '✗';

    // Risk card
    const p0Count = diagnoses.filter(d => d.level === 'danger').length;
    const warnCount = diagnoses.filter(d => d.level === 'warn').length;
    const riskColor = p0Count > 0 ? 'text-rose-600' : warnCount > 0 ? 'text-amber-600' : 'text-emerald-600';
    const riskMark = p0Count > 0 ? '✗' : warnCount > 0 ? '⚠' : '✓';
    const riskLabel = p0Count > 0
        ? `P0×${p0Count} P1×${warnCount}`
        : warnCount > 0 ? `P1×${warnCount}` : '无异常';

    const compareModeLabel = compareMode !== 'none'
        ? (compareMode === 'plan' ? 'vs 计划' : '同比')
        : null;

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-800">年度OTB决策摘要</h3>
                    {compareModeLabel && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-100 font-medium">
                            {compareModeLabel}模式
                        </span>
                    )}
                    {isLocked && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                            锁定：{versionName ?? '当前版本'}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {savedAt && <span className="text-[10px] text-emerald-600">最近保存 {savedAt}</span>}
                    <span className="text-[10px] text-slate-400">
                        {compareMode === 'yoy' ? comparison.sourceLabel : '实时测算'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-slate-100">
                {/* Card 1: 年度销售目标 */}
                <div className="px-4 py-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">年度销售目标</p>
                    <p className="text-sm font-bold text-slate-800 leading-tight">{fc(inputs.annualSalesTarget)}</p>
                    {(lySalesText || salesYoyText) && (
                        <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                            {[lySalesText, salesYoyText].filter(Boolean).join(' · ')}
                        </p>
                    )}
                </div>

                {/* Card 2: 批准采购预算 */}
                <div className="px-4 py-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">批准采购预算</p>
                    <p className="text-sm font-bold text-slate-600 leading-tight">{fc(inputs.approvedBudget)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">当前计划上限</p>
                </div>

                {/* Card 3: 测算净OTB */}
                <div className="px-4 py-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">测算净OTB</p>
                    <p className="text-sm font-bold text-slate-800 leading-tight">{fc(netOtb)}</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        占目标 {otbToSalesRatio !== null ? formatPct(otbToSalesRatio) : '-'}
                        {lyOtbText ? ` · ${lyOtbText}` : ''}
                    </p>
                </div>

                {/* Card 4: 预算缺口/冗余 */}
                <div className="px-4 py-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">预算缺口 / 冗余</p>
                    <p className={`text-sm font-bold leading-tight ${budgetGapColor}`}>{budgetGapLabel}</p>
                    {result.budgetGap !== null && inputs.approvedBudget > 0 && (
                        <p className="text-[10px] text-slate-400 mt-1">
                            {result.budgetGap > 0 ? '超出' : '余量'} {formatPct(Math.abs(result.budgetGap) / inputs.approvedBudget)}
                        </p>
                    )}
                </div>

                {/* Card 5: 加权售罄目标 */}
                <div className="px-4 py-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">加权售罄目标</p>
                    <p className={`text-sm font-bold leading-tight ${weightedST < sellThroughHealthyMin ? 'text-amber-600' : 'text-slate-800'}`}>
                        {formatPct(weightedST)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">{stSubLine}</p>
                </div>

                {/* Card 6: 季节平衡度 */}
                <div className="px-4 py-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">季节平衡度</p>
                    <p className={`text-sm font-bold leading-tight ${balanceColor}`}>
                        {balanceMark} {ssRatioDisplay}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                        春夏:秋冬 · 最大单季 {SEASON_LABEL[maxKey]}{formatPct(maxShare)}
                    </p>
                </div>

                {/* Card 7: 风险与建议 */}
                <div className="px-4 py-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">风险与建议</p>
                    <p className={`text-sm font-bold leading-tight ${riskColor}`}>
                        {riskMark} {riskLabel}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                        {diagnoses.length > 0 ? `共 ${diagnoses.length} 项待处理` : '结构健康'}
                    </p>
                </div>
            </div>

            {compareMode === 'yoy' && !comparison.hasHistoryData && !comparison.isLoading && (
                <div className="px-5 py-2.5 border-t border-slate-100 bg-amber-50 text-[11px] text-amber-700">
                    当前筛选口径下缺少上一年历史销售数据，年度同比暂不展示替代估算。
                </div>
            )}
        </div>
    );
}
