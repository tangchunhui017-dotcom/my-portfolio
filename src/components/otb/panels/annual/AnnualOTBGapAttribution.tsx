'use client';

import type { AnnualOTBResult } from '@/utils/otbCalculations';
import { formatCurrency, formatPct, type CurrencyUnit } from '@/utils/otbCalculations';

interface GapInputs {
    approvedBudget: number;
    springSalesRatio: number;
    summerSalesRatio: number;
    autumnSalesRatio: number;
    winterSalesRatio: number;
    springSellThroughTarget: number;
    summerSellThroughTarget: number;
    autumnSellThroughTarget: number;
    winterSellThroughTarget: number;
    springNewProductRatio: number;
    summerNewProductRatio: number;
    autumnNewProductRatio: number;
    winterNewProductRatio: number;
    carryoverRatio: number;
    maxCarryoverRatio: number;
}

interface Props {
    result: AnnualOTBResult;
    inputs: GapInputs;
    currencyUnit: CurrencyUnit;
    sellThroughHealthyMin: number;
}

const SEASON_LABELS = {
    spring: '春季',
    summer: '夏季',
    autumn: '秋季',
    winter: '冬季',
} as const;

const SEASON_COLORS = {
    spring: 'text-emerald-700',
    summer: 'text-sky-700',
    autumn: 'text-amber-700',
    winter: 'text-rose-700',
} as const;

type SeasonKey = keyof typeof SEASON_LABELS;

export default function AnnualOTBGapAttribution({ result, inputs, currencyUnit, sellThroughHealthyMin }: Props) {
    const fc = (value: number | null | undefined) => formatCurrency(value, currencyUnit);
    const totalGap = result.budgetGap;
    if (totalGap === null) return null;

    const seasons: Array<{
        key: SeasonKey;
        otb: number | null;
        ratio: number;
        sellThrough: number;
        newProductRatio: number;
    }> = [
        { key: 'spring', otb: result.springOTB, ratio: inputs.springSalesRatio, sellThrough: inputs.springSellThroughTarget, newProductRatio: inputs.springNewProductRatio },
        { key: 'summer', otb: result.summerOTB, ratio: inputs.summerSalesRatio, sellThrough: inputs.summerSellThroughTarget, newProductRatio: inputs.summerNewProductRatio },
        { key: 'autumn', otb: result.autumnOTB, ratio: inputs.autumnSalesRatio, sellThrough: inputs.autumnSellThroughTarget, newProductRatio: inputs.autumnNewProductRatio },
        { key: 'winter', otb: result.winterOTB, ratio: inputs.winterSalesRatio, sellThrough: inputs.winterSellThroughTarget, newProductRatio: inputs.winterNewProductRatio },
    ];

    const seasonRows = seasons.map(item => {
        const budgetShare = inputs.approvedBudget * item.ratio;
        const gap = item.otb !== null ? item.otb - budgetShare : null;
        return { ...item, budgetShare, gap };
    });

    const maxGapSeason = seasonRows.reduce((max, item) => {
        const currentGap = item.gap ?? Number.NEGATIVE_INFINITY;
        const maxGap = max.gap ?? Number.NEGATIVE_INFINITY;
        return currentGap > maxGap ? item : max;
    }, seasonRows[0]);

    const attributionLabels: string[] = [];
    if (totalGap > 0) {
        attributionLabels.push('净OTB超出批准预算');
        if (inputs.carryoverRatio > inputs.maxCarryoverRatio) {
            attributionLabels.push('过季库存压力偏高，需先清货再追加');
        }
        const lowSellThrough = seasons
            .filter(item => item.sellThrough < sellThroughHealthyMin)
            .map(item => SEASON_LABELS[item.key]);
        if (lowSellThrough.length > 0) attributionLabels.push(`${lowSellThrough.join('、')}售罄目标偏低，推高毛OTB需求`);

        const highNewProduct = seasons
            .filter(item => item.newProductRatio > 0.75)
            .map(item => SEASON_LABELS[item.key]);
        if (highNewProduct.length > 0) attributionLabels.push(`${highNewProduct.join('、')}新品占比偏高，拉升采购预算`);
    } else {
        attributionLabels.push('批准预算覆盖当前净OTB需求');
    }

    const conclusion = totalGap > 0
        ? `预算缺口主要集中在${SEASON_LABELS[maxGapSeason.key]}（${fc(maxGapSeason.gap)}）。建议优先复核该季主推波段、价格带结构和售罄目标，再决定追加预算或压缩款数。`
        : `当前批准预算较净OTB有 ${fc(Math.abs(totalGap))} 余量，可保留为季中追单预算或投向高增长品类。`;

    const maxBarWidth = Math.max(...seasonRows.map(item => Math.abs(item.gap ?? 0)), 1);

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">预算缺口归因</h3>
                <p className="text-xs text-slate-400 mt-0.5">按四季预算份额拆解差异，正数代表缺口，负数代表冗余。</p>
            </div>

            <div className="px-5 py-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                    {attributionLabels.map(label => (
                        <span
                            key={label}
                            className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                                totalGap > 0
                                    ? 'bg-rose-50 border-rose-100 text-rose-700'
                                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            }`}
                        >
                            {label}
                        </span>
                    ))}
                </div>

                <div className="space-y-2.5">
                    {seasonRows.map(item => {
                        const gap = item.gap ?? 0;
                        const barPct = Math.min(Math.abs(gap) / maxBarWidth, 1) * 100;
                        const gapColor = gap > 0 ? 'text-rose-600' : gap < 0 ? 'text-emerald-600' : 'text-slate-400';

                        return (
                            <div key={item.key} className="flex items-center gap-3">
                                <div className={`flex-shrink-0 w-10 text-[11px] font-semibold ${SEASON_COLORS[item.key]}`}>
                                    {SEASON_LABELS[item.key]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${gap > 0 ? 'bg-rose-400' : 'bg-emerald-400'}`}
                                                style={{ width: `${barPct}%` }}
                                            />
                                        </div>
                                        <span className={`flex-shrink-0 text-[11px] font-semibold w-24 text-right ${gapColor}`}>
                                            {gap > 0 ? '▲' : gap < 0 ? '▼' : ''} {fc(Math.abs(gap))}
                                        </span>
                                        <span className="flex-shrink-0 text-[10px] text-slate-400 w-20 text-right">
                                            预算份额 {formatPct(item.ratio)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold ${
                    totalGap > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                    <span>年度总计{totalGap > 0 ? '缺口' : '冗余'}</span>
                    <span>{totalGap > 0 ? '▲' : '▼'} {fc(Math.abs(totalGap))}</span>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[12px] text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-700">结论：</span>
                    {conclusion}
                </div>
            </div>
        </div>
    );
}
