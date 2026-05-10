/**
 * src/utils/otbSizeDepth.ts
 * 鞋类尺码深度规划工具函数
 *
 * 关键约束：
 *   calcSizeDepthDistribution 返回的所有 plannedPairs 之和
 *   必须严格等于 totalProductionPairs（通过 rebalanceRoundedPairs 保证）
 */

export interface SizeGroup {
    sizeGroupId: string;
    sizeGroupLabel: string;
    sizes: string[];
    weightRatios: number[];
    peakSizes: string[];
    edgeSizes: string[];
}

export interface SizeDepthRow {
    sizeId: string;
    sizeLabel: string;
    weightRatio: number;       // 归一化后的权重占比（0-1）
    plannedPairs: number;      // 计划配对双数（总数守恒）
    displayPairs: number;      // 陈列双数（plannedPairs × 0.4，取整）
    safetyStockPairs: number;  // 安全库存双数（max(1, plannedPairs × 0.1)）
    isCoreSize: boolean;
    isEdgeSize: boolean;
    discontinuityRisk: 'low' | 'mid' | 'high';
}

/**
 * 按小数部分从大到小补足差额，保证合计严格等于 targetTotal
 * 解决 Math.round 累加误差导致总数不守恒的问题
 */
function rebalanceRoundedPairs(
    sizes: string[],
    rawPairs: number[],  // 每个尺码的原始精确双数（可为小数）
    targetTotal: number,
): number[] {
    // 先全部 floor
    const floored = rawPairs.map(v => Math.floor(v));
    const currentTotal = floored.reduce((s, v) => s + v, 0);
    const remainder = targetTotal - currentTotal;  // 需要补足的双数

    // 按小数部分从大到小排序，取前 remainder 个索引补 1
    const fractions = sizes.map((_, i) => ({ i, frac: rawPairs[i] - Math.floor(rawPairs[i]) }));
    fractions.sort((a, b) => b.frac - a.frac);

    const result = [...floored];
    for (let k = 0; k < remainder; k++) {
        result[fractions[k].i] += 1;
    }
    return result;
}

/**
 * 计算尺码深度分布
 * @param totalProductionPairs 计划投产总双数
 * @param sizeGroupId 尺码组ID（men / women / unisex / kids）
 * @param sizeGroups 尺码组配置数据
 * @param overrides 手动覆盖各尺码权重（key=sizeId, value=0-1 原始权重，会重新归一化）
 */
export function calcSizeDepthDistribution(
    totalProductionPairs: number,
    sizeGroupId: string,
    sizeGroups: SizeGroup[],
    overrides?: Record<string, number>,
): SizeDepthRow[] {
    const group = sizeGroups.find(g => g.sizeGroupId === sizeGroupId);
    if (!group) return [];

    // 合并覆盖权重
    const baseWeights = Object.fromEntries(
        group.sizes.map((s, i) => [s, group.weightRatios[i]]),
    );
    const mergedWeights = overrides ? { ...baseWeights, ...overrides } : baseWeights;

    // 重新归一化
    const total = Object.values(mergedWeights).reduce((s, v) => s + v, 0);
    const normalizedWeights = Object.fromEntries(
        Object.entries(mergedWeights).map(([k, v]) => [k, v / (total || 1)]),
    );

    // 精确双数（含小数）
    const rawPairs = group.sizes.map(s => totalProductionPairs * (normalizedWeights[s] ?? 0));

    // 守恒取整
    const roundedPairs = rebalanceRoundedPairs(group.sizes, rawPairs, totalProductionPairs);

    return group.sizes.map((sizeId, idx) => {
        const weight = normalizedWeights[sizeId] ?? 0;
        const pairs = roundedPairs[idx];
        const isEdge = group.edgeSizes.includes(sizeId);
        return {
            sizeId,
            sizeLabel: sizeId,
            weightRatio: weight,
            plannedPairs: pairs,
            displayPairs: Math.round(pairs * 0.4),
            safetyStockPairs: Math.max(1, Math.round(pairs * 0.1)),
            isCoreSize: group.peakSizes.includes(sizeId),
            isEdgeSize: isEdge,
            discontinuityRisk: isEdge && weight > 0.12 ? 'high' : isEdge ? 'mid' : 'low',
        };
    });
}

/**
 * 诊断尺码分布问题，返回警告文字列表
 */
export function diagnoseSizeDistribution(rows: SizeDepthRow[]): string[] {
    const warnings: string[] = [];
    const edgeTotal = rows.filter(r => r.isEdgeSize).reduce((s, r) => s + r.weightRatio, 0);
    if (edgeTotal > 0.20) {
        warnings.push(`边码合计占比 ${(edgeTotal * 100).toFixed(1)}% 超过20%，清货风险高`);
    }
    const highRiskEdges = rows.filter(r => r.discontinuityRisk === 'high');
    if (highRiskEdges.length > 0) {
        warnings.push(`尺码 ${highRiskEdges.map(r => r.sizeId).join('/')} 配比偏高，有断码积压风险`);
    }
    const coreTotal = rows.filter(r => r.isCoreSize).reduce((s, r) => s + r.weightRatio, 0);
    if (coreTotal < 0.40) {
        warnings.push(`核心码合计占比 ${(coreTotal * 100).toFixed(1)}% 低于40%，供货充分率可能不足`);
    }
    return warnings;
}
