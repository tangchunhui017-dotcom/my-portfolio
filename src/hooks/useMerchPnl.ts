'use client';
/**
 * src/hooks/useMerchPnl.ts
 * 货盘损益计算 Hook — 接入统一预测引擎
 */
import { useMemo } from 'react';
import { usePnlMerchAssumptions, useForecastMerchMixData } from './useDashboardData';
import { useForecast } from './useForecast';
import { useForecastEngine } from './useForecastEngine';
import { useGlobalConfig } from '@/context/GlobalConfigContext';
import type { ForecastScenario } from './useForecast';

// ---- 原始 JSON 类型 ----
interface RawChannelCost { channel: string; label: string; marketing_rate: number; rent_rate?: number; labor_rate?: number; platform_rate?: number; refund_rate?: number; rebate_rate?: number; logistics_rate: number; }
interface RawMarkdownRule { discount_band: string; label: string; discount_rate_min: number; sales_share: number; }
interface RawCategoryOverride { key: string; extra_marketing_rate: number; }
interface RawPnlMerchAss { channel_cost_rates: RawChannelCost[]; markdown_rules: RawMarkdownRule[]; category_cost_overrides: RawCategoryOverride[]; }
interface RawCategory { key: string; label: string; sales_share: number; gross_margin_rate: number; growth_rate: number; }
interface RawMerchMix { categories: RawCategory[]; price_bands: unknown[]; lifecycle: unknown[]; waves: unknown[]; }

// ---- 导出类型 ----
export interface ChannelPnlRow {
    channel: string;
    label: string;
    revenue: number;
    grossProfit: number;
    channelOpex: number;
    contributionProfit: number;
    profitRate: number;
    verdict: string;
}
export interface CategoryPnlRow {
    key: string;
    label: string;
    revenue: number;
    grossProfit: number;
    grossMarginRate: number;
    opexAllocation: number;
    contributionProfit: number;
    profitRate: number;
    verdict: string;
}
export interface MarkdownLossRow {
    discountBand: string;
    label: string;
    salesShare: number;
    actualRevenue: number;
    fullPriceRevenue: number;
    markdownLoss: number;
    grossMarginAtActual: number;
}
export interface MerchPnlResult {
    totalRevenue: number;
    channels: ChannelPnlRow[];
    categories: CategoryPnlRow[];
    markdownRows: MarkdownLossRow[];
    totalMarkdownLoss: number;
    worstChannelByMargin: ChannelPnlRow | null;
    worstCategoryByContribution: CategoryPnlRow | null;
    clearanceErosion: number;
    totalContributionProfit: number;
}

export function useMerchPnl(scenario: ForecastScenario): MerchPnlResult | null {
    const { data: pnlAss } = usePnlMerchAssumptions() as { data: RawPnlMerchAss | undefined };
    // P3: 统一预测引擎为主要收入/品类来源
    const engine = useForecastEngine(scenario);
    // V3 备用来源（引擎未就绪时源数据依然可用）
    const { data: mix } = useForecastMerchMixData() as { data: RawMerchMix | undefined };
    const physForecast = useForecast('physical', scenario);
    const ecomForecast = useForecast('ecommerce', scenario);
    const { config: globalConfig } = useGlobalConfig();

    return useMemo(() => {
        if (!pnlAss) return null;
        // 引擎未就绪时，必须有 V3 备用数据
        if (!engine && (!physForecast || !ecomForecast || !mix)) return null;

        const grossMarginRate = globalConfig.brand.grossMarginRate;

        // 收入：引擎为权威来源，备用 useForecast
        const physRevenue = engine?.channelMix.find(c => c.channel === 'physical')?.forecastSales
            ?? physForecast?.annualForecast ?? 0;
        const ecomRevenue = engine?.channelMix.find(c => c.channel === 'ecommerce')?.forecastSales
            ?? ecomForecast?.annualForecast ?? 0;
        const newStoreRevenue = engine?.channelMix.find(c => c.channel === 'new_store')?.forecastSales ?? 0;
        const franRevenue = 0;
        const totalRevenue = engine?.totals.annualSalesForecast ?? (physRevenue + ecomRevenue + newStoreRevenue + franRevenue);

        // ---- 渠道损益 ----
        const revenueByChannel: Record<string, number> = {
            physical: physRevenue,
            ecommerce: ecomRevenue,
            new_store: newStoreRevenue,
            franchise: franRevenue,
        };

        const physicalCost = pnlAss.channel_cost_rates.find(ch => ch.channel === 'physical');
        const channelCostRates = newStoreRevenue > 0 && !pnlAss.channel_cost_rates.some(ch => ch.channel === 'new_store') && physicalCost
            ? [...pnlAss.channel_cost_rates, { ...physicalCost, channel: 'new_store', label: '新店' }]
            : pnlAss.channel_cost_rates;

        const channels: ChannelPnlRow[] = channelCostRates.map(ch => {
            const revenue = revenueByChannel[ch.channel] ?? 0;
            const grossProfit = revenue * grossMarginRate;
            const opexRate = (ch.marketing_rate ?? 0)
                + (ch.rent_rate ?? 0)
                + (ch.labor_rate ?? 0)
                + (ch.platform_rate ?? 0)
                + (ch.rebate_rate ?? 0)
                + (ch.logistics_rate ?? 0)
                // ecommerce refund reduces net revenue so we model as opex proxy
                + (ch.refund_rate ?? 0) * grossMarginRate;
            const channelOpex = revenue * opexRate;
            const contributionProfit = grossProfit - channelOpex;
            const profitRate = revenue > 0 ? contributionProfit / revenue : 0;
            const verdict = revenue <= 0 ? '暂无预测收入'
                : profitRate >= 0.15 ? '利润健康'
                : profitRate >= 0.08 ? '利润偏低，关注费用率'
                    : '亏损风险，需重新审视费用结构';
            return { channel: ch.channel, label: ch.label, revenue, grossProfit, channelOpex, contributionProfit, profitRate, verdict };
        });

        // ---- 品类损益 ----
        const baseOpexRate = 0.22;
        let categories: CategoryPnlRow[];
        if (engine) {
            // P3：优先使用引擎已归一化的品类 mix
            categories = engine.categoryMix.map(cat => {
                const revenue = cat.forecastSales;
                const grossProfit = cat.grossProfit;
                const extraRate = pnlAss.category_cost_overrides.find(o => o.key === cat.key)?.extra_marketing_rate ?? 0;
                const opexAllocation = revenue * (baseOpexRate + extraRate);
                const contributionProfit = grossProfit - opexAllocation;
                const profitRate = revenue > 0 ? contributionProfit / revenue : 0;
                const verdict = profitRate >= 0.20 ? '贡献利润优秀'
                    : profitRate >= 0.10 ? '贡献利润正常'
                    : '高销售低利润，需优化结构';
                return { key: cat.key, label: cat.label, revenue, grossProfit, grossMarginRate: cat.grossMarginRate, opexAllocation, contributionProfit, profitRate, verdict };
            });
        } else {
            // V3 备用：直接使用 forecast_merch_mix.json
            const rawMix = mix!;
            const categoryWeightTotal = rawMix.categories.reduce((sum, cat) => sum + cat.sales_share * (1 + cat.growth_rate), 0);
            categories = rawMix.categories.map(cat => {
                const adjustedShare = categoryWeightTotal > 0
                    ? (cat.sales_share * (1 + cat.growth_rate)) / categoryWeightTotal
                    : cat.sales_share;
                const revenue = totalRevenue * adjustedShare;
                const grossProfit = revenue * cat.gross_margin_rate;
                const extraRate = pnlAss.category_cost_overrides.find(o => o.key === cat.key)?.extra_marketing_rate ?? 0;
                const opexAllocation = revenue * (baseOpexRate + extraRate);
                const contributionProfit = grossProfit - opexAllocation;
                const profitRate = revenue > 0 ? contributionProfit / revenue : 0;
                const verdict = profitRate >= 0.20 ? '贡献利润优秀'
                    : profitRate >= 0.10 ? '贡献利润正常'
                    : '高销售低利润，需优化结构';
                return { key: cat.key, label: cat.label, revenue, grossProfit, grossMarginRate: cat.gross_margin_rate, opexAllocation, contributionProfit, profitRate, verdict };
            });
        }

        // ---- 折扣损失 ----
        const markdownRows: MarkdownLossRow[] = pnlAss.markdown_rules.map(rule => {
            const actualRevenue = totalRevenue * rule.sales_share;
            // 假设定价=1，实售=discount_rate_min，全价=1
            const fullPriceRevenue = actualRevenue / rule.discount_rate_min;
            const markdownLoss = fullPriceRevenue - actualRevenue;
            const grossMarginAtActual = actualRevenue * grossMarginRate;
            return { discountBand: rule.discount_band, label: rule.label, salesShare: rule.sales_share, actualRevenue, fullPriceRevenue, markdownLoss, grossMarginAtActual };
        });
        const totalMarkdownLoss = markdownRows.reduce((s, r) => s + r.markdownLoss, 0);

        // 清货侵蚀估算：清货折扣损失 / 总毛利
        const clearanceRow = markdownRows.find(r => r.discountBand === 'clearance');
        const totalGrossProfit = totalRevenue * grossMarginRate;
        const clearanceErosion = clearanceRow && totalGrossProfit > 0 ? clearanceRow.markdownLoss / totalGrossProfit : 0;

        // 汇总
        const totalContributionProfit = channels.reduce((s, ch) => s + ch.contributionProfit, 0);
        const worstChannelByMargin = channels.filter(ch => ch.revenue > 0).sort((a, b) => a.profitRate - b.profitRate)[0] ?? null;
        const worstCategoryByContribution = categories.filter(c => c.revenue > totalRevenue * 0.10).sort((a, b) => a.profitRate - b.profitRate)[0] ?? null;

        return { totalRevenue, channels, categories, markdownRows, totalMarkdownLoss, worstChannelByMargin, worstCategoryByContribution, clearanceErosion, totalContributionProfit };
    }, [pnlAss, engine, mix, physForecast, ecomForecast, globalConfig.brand.grossMarginRate]);
}
