'use client';
/**
 * src/hooks/useForecastMerchMix.ts
 * 销售预测货盘拆解 Hook — V3.0
 */
import { useMemo } from 'react';
import { useForecastMerchMixData } from './useDashboardData';
import { useForecast } from './useForecast';
import type { ForecastChannel, ForecastScenario } from './useForecast';
import { useForecastEngine } from './useForecastEngine';

// ---- 原始 JSON 类型 ----
interface RawCategory { key: string; label: string; sales_share: number; gross_margin_rate: number; growth_rate: number; }
interface RawPriceBand { key: string; label: string; sales_share: number; target_share: number; }
interface RawLifecycle { key: string; label: string; sales_share: number; target_share: number; }
interface RawWave { key: string; label: string; months: number[]; sales_share: number; }
interface RawMerchMix { categories: RawCategory[]; price_bands: RawPriceBand[]; lifecycle: RawLifecycle[]; waves: RawWave[]; }

// ---- 导出类型 ----
export interface MerchCategoryForecast {
    key: string;
    label: string;
    salesShare: number;
    grossMarginRate: number;
    growthRate: number;
    annualForecast: number;
    grossProfit: number;
    verdict: string;
}
export interface PriceBandForecast {
    key: string;
    label: string;
    salesShare: number;
    targetShare: number;
    shareGap: number;
    annualForecast: number;
    risk: string;
}
export interface LifecycleForecast {
    key: string;
    label: string;
    salesShare: number;
    targetShare: number;
    shareGap: number;
    annualForecast: number;
}
export interface WaveForecast {
    key: string;
    label: string;
    months: number[];
    salesShare: number;
    annualForecast: number;
    isPeak: boolean;
}
export interface MerchMixForecastResult {
    channel: ForecastChannel | 'brand';
    totalAnnualForecast: number;
    categories: MerchCategoryForecast[];
    priceBands: PriceBandForecast[];
    lifecycle: LifecycleForecast[];
    waves: WaveForecast[];
    // 业务结论
    topCategory: MerchCategoryForecast | null;
    priceBandIssue: string | null;
    newProductShortfall: number;
    peakWave: WaveForecast | null;
    otbStructureSuggestion: string;
}

export function useForecastMerchMix(scenario: ForecastScenario, channel: ForecastChannel | 'brand' = 'brand'): MerchMixForecastResult | null {
    const { data: mix } = useForecastMerchMixData() as { data: RawMerchMix | undefined };
    const physForecast = useForecast('physical', scenario);
    const ecomForecast = useForecast('ecommerce', scenario);
    const newStoreForecast = useForecast('new_store', scenario);
    const engine = useForecastEngine(scenario);

    return useMemo(() => {
        if (!mix || !physForecast || !ecomForecast || !newStoreForecast) return null;

        const engineChannelTotal = channel === 'brand'
            ? engine?.totals.annualSalesForecast
            : engine?.channelMix.find(row => row.channel === channel)?.forecastSales;

        const totalAnnualForecast = engineChannelTotal ?? (channel === 'physical'
            ? physForecast.annualForecast
            : channel === 'ecommerce'
            ? ecomForecast.annualForecast
            : channel === 'new_store'
            ? newStoreForecast.annualForecast
            : physForecast.annualForecast + ecomForecast.annualForecast + newStoreForecast.annualForecast);

        if (engine) {
            const categories: MerchCategoryForecast[] = engine.categoryMix.map(cat => {
                const annualForecast = totalAnnualForecast * cat.finalShare;
                const grossProfit = annualForecast * cat.grossMarginRate;
                const verdict = cat.grossMarginRate >= 0.60 ? '高毛利，重点投入'
                    : cat.grossMarginRate >= 0.55 ? '毛利健康，保持结构'
                    : '毛利偏低，控制占比';
                return {
                    key: cat.key,
                    label: cat.label,
                    salesShare: cat.finalShare,
                    grossMarginRate: cat.grossMarginRate,
                    growthRate: cat.growthRate,
                    annualForecast,
                    grossProfit,
                    verdict,
                };
            });

            const priceBands: PriceBandForecast[] = engine.priceBandMix.map(pb => {
                const shareGap = pb.finalShare - pb.targetShare;
                const risk = pb.risk === 'over_weight' ? '超配，关注库存积压风险'
                    : pb.risk === 'under_weight' ? '欠配，价格段缺货风险'
                    : '结构健康';
                return {
                    key: pb.key,
                    label: pb.label,
                    salesShare: pb.finalShare,
                    targetShare: pb.targetShare,
                    shareGap,
                    annualForecast: totalAnnualForecast * pb.finalShare,
                    risk,
                };
            });

            const lifecycle: LifecycleForecast[] = engine.lifecycleMix.map(lc => ({
                key: lc.key,
                label: lc.label,
                salesShare: lc.finalShare,
                targetShare: lc.targetShare,
                shareGap: lc.finalShare - lc.targetShare,
                annualForecast: totalAnnualForecast * lc.finalShare,
            }));

            const waves: WaveForecast[] = engine.waveMix.map(w => ({
                key: w.key,
                label: w.label,
                months: w.months,
                salesShare: w.finalShare,
                annualForecast: totalAnnualForecast * w.finalShare,
                isPeak: w.finalShare >= 0.20,
            }));

            const topCategory = [...categories].sort((a, b) => b.annualForecast - a.annualForecast)[0] ?? null;
            const lowBandShare = priceBands.filter(pb => pb.key === '299-' || pb.key === '300-399').reduce((s, pb) => s + pb.salesShare, 0);
            const priceBandIssue = lowBandShare > 0.40
                ? '低价带（≤399）占比超40%，整体均价偏低，建议提升400-500档占比'
                : null;
            const newLc = lifecycle.find(lc => lc.key === 'new');
            const newProductShortfall = newLc ? newLc.salesShare - newLc.targetShare : 0;
            const peakWave = [...waves].sort((a, b) => b.annualForecast - a.annualForecast)[0] ?? null;
            const otbStructureSuggestion = peakWave
                ? `${peakWave.label}为销售峰值（${(peakWave.salesShare * 100).toFixed(0)}%），该波段 OTB 到货率建议不低于预测额 110%；清货波段可适度压缩预算。`
                : 'OTB 结构建议参照波段销售占比配置。';

            return { channel, totalAnnualForecast, categories, priceBands, lifecycle, waves, topCategory, priceBandIssue, newProductShortfall, peakWave, otbStructureSuggestion };
        }

        const categoryWeightTotal = mix.categories.reduce((sum, cat) => sum + cat.sales_share * (1 + cat.growth_rate), 0);

        const categories: MerchCategoryForecast[] = mix.categories.map(cat => {
            const adjustedShare = categoryWeightTotal > 0
                ? (cat.sales_share * (1 + cat.growth_rate)) / categoryWeightTotal
                : cat.sales_share;
            const annualForecast = totalAnnualForecast * adjustedShare;
            const grossProfit = annualForecast * cat.gross_margin_rate;
            const verdict = cat.gross_margin_rate >= 0.60 ? '高毛利，重点投入'
                : cat.gross_margin_rate >= 0.55 ? '毛利健康，保持结构'
                    : '毛利偏低，控制占比';
            return { key: cat.key, label: cat.label, salesShare: adjustedShare, grossMarginRate: cat.gross_margin_rate, growthRate: cat.growth_rate, annualForecast, grossProfit, verdict };
        });

        const priceBands: PriceBandForecast[] = mix.price_bands.map(pb => {
            const annualForecast = totalAnnualForecast * pb.sales_share;
            const shareGap = pb.sales_share - pb.target_share;
            const risk = shareGap > 0.03 ? '超配，关注库存积压风险'
                : shareGap < -0.03 ? '欠配，价格段缺货风险'
                    : '结构健康';
            return { key: pb.key, label: pb.label, salesShare: pb.sales_share, targetShare: pb.target_share, shareGap, annualForecast, risk };
        });

        const lifecycle: LifecycleForecast[] = mix.lifecycle.map(lc => {
            const annualForecast = totalAnnualForecast * lc.sales_share;
            const shareGap = lc.sales_share - lc.target_share;
            return { key: lc.key, label: lc.label, salesShare: lc.sales_share, targetShare: lc.target_share, shareGap, annualForecast };
        });

        const waves: WaveForecast[] = mix.waves.map(w => {
            const annualForecast = totalAnnualForecast * w.sales_share;
            return { key: w.key, label: w.label, months: w.months, salesShare: w.sales_share, annualForecast, isPeak: w.sales_share >= 0.20 };
        });

        // 业务结论
        const topCategory = [...categories].sort((a, b) => b.annualForecast - a.annualForecast)[0] ?? null;

        const lowBandShare = priceBands.filter(pb => pb.key === '299-' || pb.key === '300-399').reduce((s, pb) => s + pb.salesShare, 0);
        const priceBandIssue = lowBandShare > 0.40
            ? '低价带（≤399）占比超40%，整体均价偏低，建议提升400-500档占比'
            : null;

        const newLc = lifecycle.find(lc => lc.key === 'new');
        const newProductShortfall = newLc ? newLc.salesShare - newLc.targetShare : 0;

        const peakWave = [...waves].sort((a, b) => b.annualForecast - a.annualForecast)[0] ?? null;

        const otbStructureSuggestion = peakWave
            ? `${peakWave.label}为销售峰值（${(peakWave.salesShare * 100).toFixed(0)}%），该波段 OTB 到货率建议不低于预测额 110%；清货波段可适度压缩预算。`
            : 'OTB 结构建议参照波段销售占比配置。';

        return { channel, totalAnnualForecast, categories, priceBands, lifecycle, waves, topCategory, priceBandIssue, newProductShortfall, peakWave, otbStructureSuggestion };
    }, [mix, physForecast, ecomForecast, newStoreForecast, engine, channel]);
}
