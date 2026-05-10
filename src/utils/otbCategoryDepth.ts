/**
 * src/utils/otbCategoryDepth.ts
 * 品类/款深测算工具函数 — 汇总、诊断、容量校验、首铺需求、波段生命周期
 */
import type { CategoryDepthRow } from './otbCalculations';

// ─── 波段生命周期 ─────────────────────────────────────────────────────────────

export type WaveLifecycle = 'closed' | 'current' | 'planning';

/**
 * 根据上市日期和当前日期计算波段生命周期。
 *
 * closed   : 上市月份早于业务当前月份，视为已上市复盘
 * current  : 上市月份等于业务当前月份，视为当前滚动
 * planning : 上市月份晚于业务当前月份，视为未来可规划
 */
export function resolveWaveLifecycle(params: {
    launchDate: string;
    currentDate: Date;
}): WaveLifecycle {
    const { launchDate, currentDate } = params;
    if (!launchDate) return 'planning';
    const launch = new Date(launchDate);
    if (isNaN(launch.getTime())) return 'planning';

    const launchMonthIndex = launch.getFullYear() * 12 + launch.getMonth();
    const currentMonthIndex = currentDate.getFullYear() * 12 + currentDate.getMonth();

    if (launchMonthIndex < currentMonthIndex) return 'closed';
    if (launchMonthIndex === currentMonthIndex) return 'current';
    return 'planning';
}

// ─── GroupBy ─────────────────────────────────────────────────────────────────

export type GroupByKey = 'season' | 'wave' | 'category' | 'priceBand' | 'productRole';

// ─── 汇总计算 ─────────────────────────────────────────────────────────────────

export interface CategoryDepthSummary {
    groupKey: string;
    groupLabel: string;
    salesTarget: number;
    styleCount: number;
    colorCount: number;
    skuCount: number;
    averageDepth: number;
    productionPairs: number;
    productionAmount: number;
    grossMarginRate: number;
    otbRatio: number;
    warningCount: number;
    dangerCount: number;
}

export function resolveSeasonLabel(seasonLabel: string | undefined, season: string) {
    const label = seasonLabel?.trim();
    if (label) return label;
    if (season === 'SS') return '春夏';
    if (season === 'AW') return '秋冬';
    return season;
}

export function calcCategoryDepthSummary(
    rows: CategoryDepthRow[],
    groupBy: GroupByKey,
): CategoryDepthSummary[] {
    const totalProductionAmount = rows.reduce((s, r) => s + (r.productionAmount ?? 0), 0);

    const groups = new Map<string, CategoryDepthRow[]>();
    for (const row of rows) {
        let key: string;
        switch (groupBy) {
            case 'season':      key = resolveSeasonLabel(row.seasonLabel, row.season); break;
            case 'wave':        key = `${row.season}-${row.wave}`; break;
            case 'category':    key = row.category; break;
            case 'priceBand':   key = row.priceBandId ?? 'unknown'; break;
            case 'productRole': key = row.productRoleId ?? 'unknown'; break;
        }
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
    }

    return Array.from(groups.entries()).map(([key, groupRows]) => {
        const salesTarget      = groupRows.reduce((s, r) => s + r.categorySalesTarget, 0);
        const styleCount       = groupRows.reduce((s, r) => s + r.plannedStyleCount, 0);
        const colorCount       = groupRows.reduce((s, r) => s + r.plannedColorCount, 0);
        const skuCount         = groupRows.reduce((s, r) => s + r.plannedSkuCount, 0);
        const productionPairs  = groupRows.reduce((s, r) => s + (r.plannedProductionPairs ?? 0), 0);
        const productionAmount = groupRows.reduce((s, r) => s + (r.productionAmount ?? 0), 0);
        const averageDepth     = skuCount > 0 ? productionPairs / skuCount : 0;

        // 加权平均毛利率（按销售双数加权）
        const totalSalesPairs = groupRows.reduce((s, r) => s + (r.plannedSalesPairs ?? 0), 0);
        const grossMarginRate = totalSalesPairs > 0
            ? groupRows.reduce((s, r) => {
                if (r.grossMargin == null || r.plannedSalesPairs == null) return s;
                return s + r.grossMargin * r.plannedSalesPairs;
            }, 0) / totalSalesPairs
            : 0;

        const otbRatio = totalProductionAmount > 0 ? productionAmount / totalProductionAmount : 0;

        const warningCount = groupRows.filter(r => r.diagnosisLevel === 'warn').length;
        const dangerCount  = groupRows.filter(r => r.diagnosisLevel === 'danger').length;

        const groupLabel = (() => {
            switch (groupBy) {
                case 'season':      return key;
                case 'wave':        return groupRows[0] ? `${resolveSeasonLabel(groupRows[0].seasonLabel, groupRows[0].season)} ${groupRows[0].wave}` : key;
                case 'category':    return groupRows[0]?.categoryLabel ?? key;
                case 'priceBand':   return groupRows[0]?.priceBandLabel ?? key;
                case 'productRole': return groupRows[0]?.productRoleName ?? key;
            }
        })();

        return {
            groupKey: key,
            groupLabel,
            salesTarget,
            styleCount,
            colorCount,
            skuCount,
            averageDepth,
            productionPairs,
            productionAmount,
            grossMarginRate,
            otbRatio,
            warningCount,
            dangerCount,
        };
    });
}

// ─── 首铺需求 ─────────────────────────────────────────────────────────────────

export interface InitialAllocationDemand {
    initialAllocationPairs: number;
    safetyStockPairs: number;
    totalInitialDemand: number;
}

export function calcInitialAllocationDemand(params: {
    storeCount: number;
    skuCount: number;
    avgDisplayPairsPerSku: number;
    safetyStockPairsPerSku: number;
}): InitialAllocationDemand {
    const { storeCount, skuCount, avgDisplayPairsPerSku, safetyStockPairsPerSku } = params;
    const initialAllocationPairs = storeCount * skuCount * avgDisplayPairsPerSku;
    const safetyStockPairs       = storeCount * skuCount * safetyStockPairsPerSku;
    return {
        initialAllocationPairs,
        safetyStockPairs,
        totalInitialDemand: initialAllocationPairs + safetyStockPairs,
    };
}

// ─── 容量校验 ─────────────────────────────────────────────────────────────────

export interface CapacityCheckResult {
    isSkuOverCapacity: boolean;
    isInitialShort: boolean;
    isInventoryPressure: boolean;
}

export function calcCapacityCheck(params: {
    skuCount: number;
    productionPairs: number;
    totalSkuCapacity: number;
    initialDemand: number;
}): CapacityCheckResult {
    const { skuCount, productionPairs, totalSkuCapacity, initialDemand } = params;
    return {
        isSkuOverCapacity:  skuCount > totalSkuCapacity,
        isInitialShort:     initialDemand > 0 && productionPairs < initialDemand,
        isInventoryPressure: initialDemand > 0 && productionPairs > initialDemand * 3,
    };
}

// ─── 行级诊断 ─────────────────────────────────────────────────────────────────

export interface DepthDiagnosis {
    level: 'healthy' | 'warning' | 'danger';
    title: string;
    message: string;
    action?: string;
}

export function diagnoseCategoryDepthRow(
    row: CategoryDepthRow,
    initialAllocationDemand?: number,
): DepthDiagnosis[] {
    const diags: DepthDiagnosis[] = [];
    const depth = row.averageDepth;
    const gm    = row.grossMargin;
    const gmTarget = row.grossMarginTarget ?? 0.4;

    if (depth !== null) {
        if (depth < 300) {
            diags.push({
                level: 'warning', title: '均深偏低',
                message: `均深 ${Math.round(depth)} 双，低于建议 300 双`,
                action: '减少款数或增加投产量',
            });
        } else if (depth > 1200) {
            diags.push({
                level: 'warning', title: '均深偏高',
                message: `均深 ${Math.round(depth)} 双，超过建议 1200 双`,
                action: '增加款数或减少投产量',
            });
        }
    }

    if (gm !== null && gm < gmTarget) {
        diags.push({
            level: gm < 0.35 ? 'danger' : 'warning', title: '毛利不足',
            message: `毛利率 ${(gm * 100).toFixed(1)}%，低于目标 ${(gmTarget * 100).toFixed(0)}%`,
            action: '重算成本或调整吊牌价',
        });
    }

    if (row.costCeiling !== undefined && row.costPrice > row.costCeiling) {
        diags.push({
            level: 'danger', title: '成本超限',
            message: `成本均价 ${Math.round(row.costPrice)} 高于上限 ${Math.round(row.costCeiling)}`,
            action: '重算成本、调整材料方案或提高吊牌价',
        });
    }

    if (initialAllocationDemand != null
        && row.plannedProductionPairs != null
        && row.plannedProductionPairs < initialAllocationDemand) {
        diags.push({
            level: 'warning', title: '首铺不足',
            message: `投产 ${Math.round(row.plannedProductionPairs)} 双，低于首铺需求 ${Math.round(initialAllocationDemand)} 双`,
            action: '增加投产量',
        });
    }

    if (row.productRoleId === 'test' && depth !== null && depth > 400) {
        diags.push({
            level: 'warning', title: '测试款深度过高',
            message: `测试款均深 ${Math.round(depth)} 双，超过建议 400 双`,
            action: '降低测试款投产量',
        });
    }

    if (row.productRoleId === 'image' && (row.productRoleSalesRatio ?? 0) > 0.15) {
        diags.push({
            level: 'warning', title: '形象款库存风险',
            message: `形象款占比 ${((row.productRoleSalesRatio ?? 0) * 100).toFixed(0)}%，投产过高`,
            action: '控制形象款投产量',
        });
    }

    if (row.productRoleId === 'hero' && depth !== null && depth < 800) {
        diags.push({
            level: 'warning', title: '爆款候选深度不足',
            message: `爆款候选均深 ${Math.round(depth)} 双，低于建议 800 双`,
            action: '增加爆款候选投产量',
        });
    }

    if (diags.length === 0) {
        diags.push({ level: 'healthy', title: '结构健康', message: '款深、毛利、投产量均在正常范围' });
    }
    return diags;
}

// ─── 页面总诊断 ───────────────────────────────────────────────────────────────

export interface CategoryDepthInsight {
    level: 'healthy' | 'warning' | 'danger';
    title: string;
    message: string;
    action?: string;
    affectedCount?: number;
}

export function generateCategoryDepthInsights(rows: CategoryDepthRow[]): CategoryDepthInsight[] {
    const insights: CategoryDepthInsight[] = [];

    const lowDepthRows  = rows.filter(r => r.averageDepth !== null && r.averageDepth < 300);
    const highDepthRows = rows.filter(r => r.averageDepth !== null && r.averageDepth > 1200);
    const lowGmRows     = rows.filter(r => r.grossMargin !== null && r.grossMargin < (r.grossMarginTarget ?? 0.4));
    const costLimitRows = rows.filter(r => r.costCeiling !== undefined && r.costPrice > r.costCeiling);
    const highTestRows  = rows.filter(r => r.productRoleId === 'test' && r.averageDepth !== null && r.averageDepth > 400);
    const highImageRows = rows.filter(r => r.productRoleId === 'image' && (r.productRoleSalesRatio ?? 0) > 0.15);
    const lowHeroRows   = rows.filter(r => r.productRoleId === 'hero' && r.averageDepth !== null && r.averageDepth < 800);

    if (lowDepthRows.length > 0) {
        insights.push({
            level: 'warning', title: '均深偏低',
            message: `${lowDepthRows.length} 个品类均深低于 300 双，首铺可能不足`,
            action: '减少款数或增加投产量', affectedCount: lowDepthRows.length,
        });
    }
    if (highDepthRows.length > 0) {
        insights.push({
            level: 'warning', title: '均深偏高',
            message: `${highDepthRows.length} 个品类均深超过 1200 双，款数可能偏少`,
            action: '增加款数或减少投产量', affectedCount: highDepthRows.length,
        });
    }
    if (lowGmRows.length > 0) {
        const dangerGm = lowGmRows.filter(r => r.grossMargin !== null && r.grossMargin < 0.35);
        insights.push({
            level: dangerGm.length > 0 ? 'danger' : 'warning', title: '毛利不足',
            message: `${lowGmRows.length} 个品类毛利率低于目标${dangerGm.length > 0 ? `，其中 ${dangerGm.length} 个低于 35%` : ''}`,
            action: '重算成本或调整吊牌价', affectedCount: lowGmRows.length,
        });
    }
    if (costLimitRows.length > 0) {
        insights.push({
            level: 'danger', title: '成本超限',
            message: `${costLimitRows.length} 个款深组合成本高于价格带上限`,
            action: '优先复核材料成本、倍率和吊牌价', affectedCount: costLimitRows.length,
        });
    }
    if (highTestRows.length > 0) {
        insights.push({
            level: 'warning', title: '测试款深度过高',
            message: `${highTestRows.length} 个测试款均深超过 400 双，试销库存风险偏高`,
            action: '降低测试款投产量', affectedCount: highTestRows.length,
        });
    }
    if (highImageRows.length > 0) {
        insights.push({
            level: 'warning', title: '形象款占比过高',
            message: `${highImageRows.length} 个品类形象款销售占比超过 15%，库存风险较高`,
            action: '控制形象款投产量', affectedCount: highImageRows.length,
        });
    }
    if (lowHeroRows.length > 0) {
        insights.push({
            level: 'warning', title: '爆款候选深度不足',
            message: `${lowHeroRows.length} 个爆款候选均深低于 800 双，主推承接可能不足`,
            action: '增加爆款候选投产量', affectedCount: lowHeroRows.length,
        });
    }

    return insights;
}

// ─── KPI 聚合（驾驶舱 9 项）────────────────────────────────────────────────────

export interface CategoryDepthKPI {
    totalStyles: number;
    totalColors: number;
    totalSku: number;
    avgDepth: number;
    avgGrossMargin: number | null;
    mainProductRatio: number | null;
    totalAmt: number;
    capacityRiskCount: number;
    sizeRiskCount: number;
    issueCount: number;
}

// 严重度分级
export type SeverityTier = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * 0 = 容量超限（无法上市最紧急）
 * 1 = 尺码覆盖率 < 80%
 * 2 = 波段超预算
 * 3 = 毛利异常
 * 4 = danger 级诊断
 * 5 = warning / 其他
 */
export function calcSeverityTier(params: {
    hasCapacityRisk: boolean;
    sizeCoverageRate: number | null;
    waveBudgetGapPositive: boolean;
    grossMarginBelowTarget: boolean;
    diagnosisLevel: string;
}): SeverityTier {
    if (params.hasCapacityRisk) return 0;
    if (params.sizeCoverageRate !== null && params.sizeCoverageRate < 0.8) return 1;
    if (params.waveBudgetGapPositive) return 2;
    if (params.grossMarginBelowTarget) return 3;
    if (params.diagnosisLevel === 'danger') return 4;
    return 5;
}
