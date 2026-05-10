/**
 * src/utils/otbRuleResolver.ts
 * OTB 规则匹配引擎 —— 带回退链的规则解析器
 *
 * 回退优先级（从精确到宽泛）：
 * 1. brandId + channelId + season + categoryId + priceBandId + productRoleId
 * 2. brandId + channelId + season + categoryId + priceBandId
 * 3. brandId + channelId + season + categoryId
 * 4. brandId + channelId + categoryId
 * 5. channelId + categoryId
 * 6. categoryId (only)
 * 7. channelId (only)
 * 8. global 'all' match
 * 9. hardcoded default
 *
 * 每个候选规则的 brandId / channelId / season / categoryId / priceBandId
 * 字段若为 'all'，则作为通配符，可匹配任意值。
 */

import { RuleSourceType, RuleWithSource } from './otbPriceStructure';

// ─── 规则行基础类型 ──────────────────────────────────────────────

export interface PriceBandStrategyRow {
    brandId: string;
    channelId: string;
    season: string;
    categoryId: string;
    priceBandId: string;
    priceBandLabel: string;
    minPrice: number;
    maxPrice: number;
    role: string;
    targetSalesRatio: number;
    targetStyleRatio: number;
    targetSkuRatio: number;
    targetGrossMargin: number;
    targetMarkupRate: number;
}

export interface CategoryStructureRuleRow {
    brandId: string;
    channelId: string;
    season: string;
    categoryLevel1: string;
    categoryLevel2: string;
    targetSalesRatio: number;
    targetStyleRatio: number;
    defaultSellThroughTarget: number;
    defaultGrossMarginTarget: number;
    defaultDepthRange: [number, number];
    seasonFit: string[];
    riskRule: string;
}

export interface ProductRoleStrategyRow {
    roleId: string;
    roleName: string;
    description: string;
    defaultStyleRatio: number;
    defaultDepthMultiplier: number;
    riskRule: string;
    canBeHeroProduct: boolean;
    allowRepeatOrder: boolean;
    maxSalesRatioWarning: number;
    minSalesRatioDanger: number;
}

// ─── 上下文类型 ─────────────────────────────────────────────────

export interface OtbRuleContext {
    brandId?: string;
    channelId?: string;
    season?: string;
    categoryId?: string;
    priceBandId?: string;
    productRoleId?: string;
    categoryLevel1?: string;
    categoryLevel2?: string;
}

// ─── 通用匹配函数 ────────────────────────────────────────────────

/**
 * 判断规则字段是否与上下文值匹配
 * 规则字段为 'all' 时作为通配符，可匹配任意值
 */
function fieldMatches(ruleField: string | undefined, contextValue: string | undefined): boolean {
    if (!ruleField || ruleField === 'all') return true;
    if (!contextValue || contextValue === 'all') return true;
    return ruleField.toLowerCase() === contextValue.toLowerCase();
}

/**
 * 计算规则匹配的精确度分数（越高越精确）
 * 精确匹配 = 2分，通配符匹配 = 1分，不参与 = 0分
 */
function matchScore(ruleField: string | undefined, contextValue: string | undefined): number {
    if (!ruleField || ruleField === 'all') return 1;
    if (!contextValue || contextValue === 'all') return 1;
    return ruleField.toLowerCase() === contextValue.toLowerCase() ? 2 : 0;
}

// ─── 价格带策略解析 ──────────────────────────────────────────────

export function resolvePriceBandStrategy(
    rows: PriceBandStrategyRow[],
    context: OtbRuleContext,
    priceBandId: string,
): RuleWithSource<PriceBandStrategyRow> | null {
    const candidates = rows.filter(r =>
        fieldMatches(r.brandId, context.brandId) &&
        fieldMatches(r.channelId, context.channelId) &&
        fieldMatches(r.season, context.season) &&
        fieldMatches(r.categoryId, context.categoryId) &&
        fieldMatches(r.priceBandId, priceBandId),
    );

    if (candidates.length === 0) return null;

    // 按精确度排序，取最精确的
    const scored = candidates.map(r => ({
        row: r,
        score:
            matchScore(r.brandId, context.brandId) * 10000 +
            matchScore(r.channelId, context.channelId) * 1000 +
            matchScore(r.season, context.season) * 100 +
            matchScore(r.categoryId, context.categoryId) * 10 +
            matchScore(r.priceBandId, priceBandId),
    }));

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].row;

    const isFallback =
        (best.brandId === 'all' || !best.brandId) &&
        (best.channelId === 'all' || !best.channelId);

    let source: RuleSourceType = 'exact_match';
    if (isFallback) source = 'global_default';
    else if (best.brandId === 'all') source = 'channel_category';
    else if (best.channelId === 'all') source = 'brand_category';

    return {
        value: best,
        source,
        sourceLabel: isFallback ? '全局默认' : `${best.brandId}/${best.channelId}`,
        isFallback,
    };
}

// ─── 品类结构规则解析 ────────────────────────────────────────────

export function resolveCategoryStructureRule(
    rows: CategoryStructureRuleRow[],
    context: OtbRuleContext,
): RuleWithSource<CategoryStructureRuleRow> | null {
    const candidates = rows.filter(r =>
        fieldMatches(r.brandId, context.brandId) &&
        fieldMatches(r.channelId, context.channelId) &&
        fieldMatches(r.season, context.season) &&
        (
            fieldMatches(r.categoryLevel1, context.categoryLevel1) ||
            fieldMatches(r.categoryLevel2, context.categoryLevel2)
        ),
    );

    if (candidates.length === 0) return null;

    const scored = candidates.map(r => ({
        row: r,
        score:
            matchScore(r.brandId, context.brandId) * 10000 +
            matchScore(r.channelId, context.channelId) * 1000 +
            matchScore(r.season, context.season) * 100 +
            matchScore(r.categoryLevel2, context.categoryLevel2) * 10 +
            matchScore(r.categoryLevel1, context.categoryLevel1),
    }));

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].row;

    const isFallback =
        (best.brandId === 'all' || !best.brandId) &&
        (best.channelId === 'all' || !best.channelId);

    return {
        value: best,
        source: isFallback ? 'global_default' : 'exact_match',
        sourceLabel: isFallback ? '全局默认' : `${best.brandId}/${best.channelId}/${best.season}`,
        isFallback,
    };
}

// ─── 货品角色查找 ────────────────────────────────────────────────

export function resolveProductRole(
    rows: ProductRoleStrategyRow[],
    roleId: string,
): RuleWithSource<ProductRoleStrategyRow> | null {
    const found = rows.find(r => r.roleId === roleId);
    if (!found) return null;
    return {
        value: found,
        source: 'exact_match',
        sourceLabel: '标准角色定义',
        isFallback: false,
    };
}

// ─── 批量解析辅助 ────────────────────────────────────────────────

export interface ResolvedPriceBandEntry {
    priceBandId: string;
    priceBandLabel: string;
    minPrice: number;
    maxPrice: number;
    role: string;
    targetSalesRatio: number;
    targetStyleRatio: number;
    targetSkuRatio: number;
    targetGrossMargin: number;
    targetMarkupRate: number;
    ruleSource: string;
    isFallback: boolean;
}

/**
 * 解析某品类下所有价格带的策略，返回带来源标记的记录
 */
export function resolveAllPriceBands(
    priceBandRows: PriceBandStrategyRow[],
    context: OtbRuleContext,
): ResolvedPriceBandEntry[] {
    // 找出与该品类相关的所有价格带 id
    const allPriceBandIds = Array.from(
        new Set(
            priceBandRows
                .filter(r =>
                    fieldMatches(r.categoryId, context.categoryId) ||
                    fieldMatches(r.channelId, context.channelId),
                )
                .map(r => r.priceBandId),
        ),
    );

    return allPriceBandIds
        .map(pbId => {
            const resolved = resolvePriceBandStrategy(priceBandRows, context, pbId);
            if (!resolved) return null;
            return {
                priceBandId: pbId,
                priceBandLabel: resolved.value.priceBandLabel,
                minPrice: resolved.value.minPrice,
                maxPrice: resolved.value.maxPrice,
                role: resolved.value.role,
                targetSalesRatio: resolved.value.targetSalesRatio,
                targetStyleRatio: resolved.value.targetStyleRatio,
                targetSkuRatio: resolved.value.targetSkuRatio,
                targetGrossMargin: resolved.value.targetGrossMargin,
                targetMarkupRate: resolved.value.targetMarkupRate,
                ruleSource: resolved.sourceLabel,
                isFallback: resolved.isFallback,
            };
        })
        .filter((e): e is ResolvedPriceBandEntry => e !== null);
}
