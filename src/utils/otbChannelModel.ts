/**
 * src/utils/otbChannelModel.ts
 * 渠道模型诊断、汇总、角色定义工具函数
 */

import { type ChannelOTBRow, formatCurrency, type CurrencyUnit } from '@/utils/otbCalculations';

// ─── 渠道元数据 ────────────────────────────────────────────────────────────────

export interface ChannelMeta {
    channelId: string;
    channelName: string;
    channelType: string;
    defaultSellThroughTarget: number;
    defaultReturnRate: number;
    defaultDiscountRate: number;
    defaultStockToSalesRatio: number;
    salesWeight: number;
}

// ─── 维度换算工具（成本 vs 零售） ────────────────────────────────────────────

/** 月均销售（成本口径）= salesTarget × discountRate / markupRate / 3 */
export function monthlySalesAtCost(row: ChannelOTBRow): number {
    if (row.markupRate <= 0) return 0;
    return (row.salesTarget * row.discountRate) / row.markupRate / 3;
}

/** 实际库销比（同维度，月均） */
export function calcActualStockToSales(row: ChannelOTBRow): number {
    const monthly = monthlySalesAtCost(row);
    return monthly > 0 ? row.beginningInventoryCost / monthly : 0;
}

/** 期末预计库存（成本口径） = 期初 + 投入 × (1 - 有效售罄率) */
export function calcProjectedEndingInventory(row: ChannelOTBRow): number {
    const investment = row.theoreticalInvestmentAmount ?? 0;
    const effST      = row.effectiveSellThrough ?? 0;
    return row.beginningInventoryCost + investment * (1 - effST);
}

/** 毛利率 = 1 - 1 / (markupRate × discountRate) */
export function calcGrossMargin(row: ChannelOTBRow): number {
    const product = row.markupRate * row.discountRate;
    if (product <= 1) return 0;
    return 1 - 1 / product;
}

/** 毛利贡献金额 = 销售目标 × 毛利率 × 有效售罄率 */
export function calcGrossProfitContribution(row: ChannelOTBRow): number {
    const margin = calcGrossMargin(row);
    const effST  = row.effectiveSellThrough ?? 0;
    return row.salesTarget * margin * effST;
}

// ─── 渠道角色定义 ──────────────────────────────────────────────────────────────

export type ChannelRoleKey =
    | 'brand_image'
    | 'full_price'
    | 'traffic'
    | 'volume'
    | 'clearance'
    | 'special_order';

export interface ChannelRoleMeta {
    roleKey: ChannelRoleKey;
    roleLabel: string;
    mission: string;
    suggestedNewProductRatio: [number, number];
    suggestedDiscountRate: [number, number];
    suggestedReturnRate: [number, number];
    allowNewOTB: boolean;
}

export const CHANNEL_ROLE_MAP: Record<string, ChannelRoleMeta> = {
    'direct-store': {
        roleKey: 'brand_image',
        roleLabel: '品牌形象 · 全价成交',
        mission: '新品首发 + 形象陈列 + 全价成交 + 主推款引流',
        suggestedNewProductRatio: [0.55, 0.75],
        suggestedDiscountRate:    [0.82, 0.92],
        suggestedReturnRate:      [0.00, 0.03],
        allowNewOTB: true,
    },
    'franchise': {
        roleKey: 'volume',
        roleLabel: '规模分销 · 走量承接',
        mission: '分销扩大市场覆盖，承接主销款翻单和走量',
        suggestedNewProductRatio: [0.45, 0.65],
        suggestedDiscountRate:    [0.80, 0.88],
        suggestedReturnRate:      [0.00, 0.04],
        allowNewOTB: true,
    },
    'ecommerce': {
        roleKey: 'traffic',
        roleLabel: '流量放大 · 爆款承接',
        mission: '平台流量变现，爆款深度备货，全品类在线覆盖',
        suggestedNewProductRatio: [0.50, 0.70],
        suggestedDiscountRate:    [0.75, 0.85],
        suggestedReturnRate:      [0.05, 0.12],
        allowNewOTB: true,
    },
    'livestream': {
        roleKey: 'traffic',
        roleLabel: '短周期爆发 · 现货清货',
        mission: '直播短周期销售，以翻单/现货为主，新品需谨慎',
        suggestedNewProductRatio: [0.25, 0.45],
        suggestedDiscountRate:    [0.60, 0.72],
        suggestedReturnRate:      [0.08, 0.20],
        allowNewOTB: true,
    },
    'outlet': {
        roleKey: 'clearance',
        roleLabel: '库存消化 · 清仓尾货',
        mission: '消化滞销/旧品库存，不占用新品 OTB',
        suggestedNewProductRatio: [0.00, 0.20],
        suggestedDiscountRate:    [0.45, 0.62],
        suggestedReturnRate:      [0.00, 0.02],
        allowNewOTB: false,
    },
    'special': {
        roleKey: 'special_order',
        roleLabel: '批量特单 · 团购定制',
        mission: '批量团购订单，独立核算，低库存风险',
        suggestedNewProductRatio: [0.30, 0.60],
        suggestedDiscountRate:    [0.55, 0.68],
        suggestedReturnRate:      [0.00, 0.02],
        allowNewOTB: true,
    },
};

export function getChannelRole(channelId: string): ChannelRoleMeta {
    return CHANNEL_ROLE_MAP[channelId] ?? {
        roleKey: 'full_price',
        roleLabel: '其他渠道',
        mission: '按渠道配置执行',
        suggestedNewProductRatio: [0.40, 0.70],
        suggestedDiscountRate:    [0.75, 0.90],
        suggestedReturnRate:      [0.00, 0.08],
        allowNewOTB: true,
    };
}

// ─── 诊断类型 ─────────────────────────────────────────────────────────────────

export type DiagLevel = 'danger' | 'warning' | 'info';
export type DiagPriority = 'P0' | 'P1' | 'P2';

export interface ChannelDiagnosis {
    id: string;
    channelId: string;
    channelLabel: string;
    quarter: string;
    level: DiagLevel;
    priority: DiagPriority;
    title: string;
    message: string;
    impactAmount: number;
    action: string;
}

// ─── 单行诊断 ──────────────────────────────────────────────────────────────────

export function diagnoseChannelRow(row: ChannelOTBRow): ChannelDiagnosis[] {
    const results: ChannelDiagnosis[] = [];
    const role = getChannelRole(row.channel);
    const netOTB = row.netNewOTB ?? 0;
    const theoretical = row.theoreticalInvestmentAmount ?? 0;

    if (row.ecomReturnDanger) {
        results.push({
            id: `${row.id}-return-danger`,
            channelId: row.channel,
            channelLabel: row.channelLabel,
            quarter: row.quarter,
            level: 'danger',
            priority: 'P0',
            title: '有效售罄率极低',
            message: `售罄率 ${(row.sellThroughTarget * 100).toFixed(0)}% - 退货率 ${(row.returnRate * 100).toFixed(0)}% ≤ 10%，有效售罄严重压缩，投入测算可能失真`,
            impactAmount: row.salesTarget,
            action: '立即降低退货率设置或提高售罄目标，否则 OTB 测算无效',
        });
    }

    if (!row.ecomReturnDanger && row.returnRate > 0.08) {
        results.push({
            id: `${row.id}-return-high`,
            channelId: row.channel,
            channelLabel: row.channelLabel,
            quarter: row.quarter,
            level: 'warning',
            priority: 'P1',
            title: '退货率偏高',
            message: `退货率 ${(row.returnRate * 100).toFixed(1)}% 超过 8%，净销售额承接减少`,
            impactAmount: row.salesTarget * row.returnRate,
            action: '降低投入数量约 8%，提高爆款候选款深，减少测试款',
        });
    }

    if (row.discountRate < 0.70 && row.newProductRatio > 0.50) {
        results.push({
            id: `${row.id}-margin-risk`,
            channelId: row.channel,
            channelLabel: row.channelLabel,
            quarter: row.quarter,
            level: 'warning',
            priority: 'P1',
            title: '新品毛利风险',
            message: `折扣率 ${(row.discountRate * 100).toFixed(0)}% 低于 70% 且新品占比 ${(row.newProductRatio * 100).toFixed(0)}%，新品以低折扣销售毛利受损`,
            impactAmount: row.newProductAmount * (0.70 - row.discountRate),
            action: `将新品占比从 ${(row.newProductRatio * 100).toFixed(0)}% 降至 40% 以下，增加翻单/旧品承接`,
        });
    }

    if (theoretical > 0 && row.beginningInventoryCost / theoretical > 0.60) {
        const ratio = row.beginningInventoryCost / theoretical;
        results.push({
            id: `${row.id}-inventory-pressure`,
            channelId: row.channel,
            channelLabel: row.channelLabel,
            quarter: row.quarter,
            level: ratio > 0.85 ? 'danger' : 'warning',
            priority: ratio > 0.85 ? 'P0' : 'P1',
            title: '库存压力偏高',
            message: `期初库存 / 理论投入 = ${(ratio * 100).toFixed(0)}%，库存已覆盖大部分需求`,
            impactAmount: row.beginningInventoryCost,
            action: '优先消化期初库存，控制净新增 OTB 规模',
        });
    }

    if (theoretical > 0 && netOTB > theoretical * 0.80 && row.beginningInventoryCost < theoretical * 0.10) {
        results.push({
            id: `${row.id}-procurement-pressure`,
            channelId: row.channel,
            channelLabel: row.channelLabel,
            quarter: row.quarter,
            level: 'warning',
            priority: 'P1',
            title: '新增采购压力高',
            message: `净新增 OTB 占理论投入 ${(netOTB / theoretical * 100).toFixed(0)}%，期初库存储备不足，依赖大量新采购`,
            impactAmount: netOTB,
            action: '检查是否有可调配翻单/旧品降低新采购依赖',
        });
    }

    const structureSum = row.newProductRatio + row.repeatOrderRatio + row.carryoverRatio;
    if (Math.abs(structureSum - 1.0) > 0.05) {
        results.push({
            id: `${row.id}-structure-sum`,
            channelId: row.channel,
            channelLabel: row.channelLabel,
            quarter: row.quarter,
            level: 'warning',
            priority: 'P2',
            title: '货盘结构比例异常',
            message: `新品 ${(row.newProductRatio * 100).toFixed(0)}% + 翻单 ${(row.repeatOrderRatio * 100).toFixed(0)}% + 旧品 ${(row.carryoverRatio * 100).toFixed(0)}% = ${(structureSum * 100).toFixed(0)}%（应为 100%）`,
            impactAmount: row.salesTarget,
            action: '调整三项占比使其合计为 100%',
        });
    }

    if (row.channel === 'outlet' && row.newProductRatio > 0.20) {
        results.push({
            id: `${row.id}-outlet-mismatch`,
            channelId: row.channel,
            channelLabel: row.channelLabel,
            quarter: row.quarter,
            level: 'warning',
            priority: 'P1',
            title: '奥莱渠道角色错配',
            message: `奥莱/清仓新品占比 ${(row.newProductRatio * 100).toFixed(0)}% 超过 20%，将压占新品 OTB 预算`,
            impactAmount: row.newProductAmount,
            action: '将奥莱新品占比降至 20% 以下，以旧品和滞销款为主',
        });
    }

    if (row.channel === 'livestream' && row.discountRate > 0.75) {
        results.push({
            id: `${row.id}-livestream-discount`,
            channelId: row.channel,
            channelLabel: row.channelLabel,
            quarter: row.quarter,
            level: 'warning',
            priority: 'P1',
            title: '直播折扣率偏高',
            message: `直播折扣率 ${(row.discountRate * 100).toFixed(0)}% 超过建议上限 72%，毛利受损`,
            impactAmount: row.salesTarget * (row.discountRate - 0.72),
            action: '直播渠道折扣率控制在 72% 以下，优先以翻单/现货控价',
        });
    }

    const [minNP, maxNP] = role.suggestedNewProductRatio;
    if (row.newProductRatio > maxNP + 0.05) {
        results.push({
            id: `${row.id}-np-ratio-high`,
            channelId: row.channel,
            channelLabel: row.channelLabel,
            quarter: row.quarter,
            level: 'info',
            priority: 'P2',
            title: '新品占比超出渠道建议',
            message: `${row.channelLabel} 新品占比 ${(row.newProductRatio * 100).toFixed(0)}%，超过该渠道建议上限 ${(maxNP * 100).toFixed(0)}%`,
            impactAmount: row.newProductAmount,
            action: `建议新品占比控制在 ${(minNP * 100).toFixed(0)}%-${(maxNP * 100).toFixed(0)}% 之间`,
        });
    }

    return results;
}

// ─── 库销比合规检查 ────────────────────────────────────────────────────────────

export interface InventoryComplianceWarning {
    rowId: string;
    channelId: string;
    channelLabel: string;
    quarter: string;
    actualRatio: number;
    targetRatio: number;
    deviation: number;        // (实际 - 目标) / 目标
    isOver: boolean;          // true = 积压，false = 紧张
}

/**
 * 检测各渠道实际库销比 vs 目标偏差超 30% 的项
 */
export function calcInventoryComplianceWarnings(
    rows: ChannelOTBRow[],
    channels: ChannelMeta[],
): InventoryComplianceWarning[] {
    const channelMap = new Map(channels.map(c => [c.channelId, c]));
    const warnings: InventoryComplianceWarning[] = [];
    for (const row of rows) {
        const meta = channelMap.get(row.channel);
        if (!meta) continue;
        const target = meta.defaultStockToSalesRatio;
        const actual = calcActualStockToSales(row);
        if (target <= 0 || actual <= 0) continue;
        const dev = (actual - target) / target;
        if (Math.abs(dev) > 0.30) {
            warnings.push({
                rowId: row.id,
                channelId: row.channel,
                channelLabel: row.channelLabel,
                quarter: row.quarter,
                actualRatio: actual,
                targetRatio: target,
                deviation: dev,
                isOver: dev > 0,
            });
        }
    }
    return warnings.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
}

// ─── 渠道健康度评分 ────────────────────────────────────────────────────────────

export interface ChannelHealthBreakdown {
    inventory: number;          // 库存健康度（30%）
    marginCompliance: number;   // 毛利合规（25%）
    structureCompliance: number;// 货盘结构合规（25%）
    riskCount: number;          // 风险计数反向（20%）
}

export interface ChannelHealthScore {
    total: number;
    breakdown: ChannelHealthBreakdown;
}

/**
 * 单渠道健康度评分（0-100）
 * - inventory:     基于该渠道全部季度的实际库销比 vs 目标偏差
 * - margin:        基于折扣率是否在 role.suggestedDiscountRate 区间内
 * - structure:     基于新品占比是否在 role.suggestedNewProductRatio 区间内
 * - risk:          基于诊断条目反向（P0×3 + P1×2 + P2×1）
 */
export function calcChannelHealthScore(
    channelRows: ChannelOTBRow[],
    targetStockToSales: number,
    diagnoses: ChannelDiagnosis[],
): ChannelHealthScore {
    if (channelRows.length === 0) {
        return { total: 0, breakdown: { inventory: 0, marginCompliance: 0, structureCompliance: 0, riskCount: 0 } };
    }
    const role = getChannelRole(channelRows[0].channel);

    // 1. 库存健康度
    const inventoryDevs = channelRows.map(r => {
        const actual = calcActualStockToSales(r);
        return targetStockToSales > 0 ? Math.abs(actual - targetStockToSales) / targetStockToSales : 1;
    });
    const avgInvDev = inventoryDevs.reduce((s, d) => s + d, 0) / inventoryDevs.length;
    const inventory = Math.max(0, Math.min(100, 100 - avgInvDev * 200)); // 偏差 50% → 0 分

    // 2. 毛利合规
    const [minDR, maxDR] = role.suggestedDiscountRate;
    const marginScores = channelRows.map(r => {
        if (r.discountRate >= minDR && r.discountRate <= maxDR) return 100;
        const dev = r.discountRate < minDR ? minDR - r.discountRate : r.discountRate - maxDR;
        return Math.max(0, 100 - dev * 500);
    });
    const marginCompliance = marginScores.reduce((s, v) => s + v, 0) / marginScores.length;

    // 3. 货盘结构合规
    const [minNP, maxNP] = role.suggestedNewProductRatio;
    const structScores = channelRows.map(r => {
        if (r.newProductRatio >= minNP && r.newProductRatio <= maxNP) return 100;
        const dev = r.newProductRatio < minNP ? minNP - r.newProductRatio : r.newProductRatio - maxNP;
        return Math.max(0, 100 - dev * 300);
    });
    const structureCompliance = structScores.reduce((s, v) => s + v, 0) / structScores.length;

    // 4. 风险计数反向
    const riskWeight = diagnoses.reduce((s, d) =>
        s + (d.priority === 'P0' ? 3 : d.priority === 'P1' ? 2 : 1), 0);
    const riskCount = Math.max(0, 100 - riskWeight * 8);

    const total = inventory * 0.30 + marginCompliance * 0.25 + structureCompliance * 0.25 + riskCount * 0.20;

    return {
        total: Math.round(total),
        breakdown: {
            inventory: Math.round(inventory),
            marginCompliance: Math.round(marginCompliance),
            structureCompliance: Math.round(structureCompliance),
            riskCount: Math.round(riskCount),
        },
    };
}

// ─── 全渠道汇总 ────────────────────────────────────────────────────────────────

export interface ChannelSummary {
    totalSalesTarget: number;
    totalNetOTB: number;
    totalInvestmentPairs: number;
    avgEffectiveSellThrough: number | null;
    avgReturnRate: number;
    totalProjectedEndingInventory: number;
    totalGrossProfitContribution: number;
    budgetBalance: number;
    highRiskChannelCount: number;
    allDiagnoses: ChannelDiagnosis[];
}

export function calcChannelSummary(rows: ChannelOTBRow[]): ChannelSummary {
    const diagnoses = rows.flatMap(r => diagnoseChannelRow(r));
    const highRiskChannels = new Set(
        diagnoses.filter(d => d.level === 'danger' || d.priority === 'P0').map(d => d.channelId)
    );

    const totalSalesTarget = rows.reduce((s, r) => s + r.salesTarget, 0);
    const totalNetOTB = rows.reduce((s, r) => s + (r.netNewOTB ?? 0), 0);
    const totalInvestmentPairs = rows.reduce((s, r) => s + (r.investmentPairs ?? 0), 0);
    const totalBeginningInventory = rows.reduce((s, r) => s + r.beginningInventoryCost, 0);
    const totalProjectedEndingInventory = rows.reduce((s, r) => s + calcProjectedEndingInventory(r), 0);
    const totalGrossProfitContribution = rows.reduce((s, r) => s + calcGrossProfitContribution(r), 0);

    const stRows = rows.filter(r => r.effectiveSellThrough !== null);
    const avgEffectiveSellThrough = stRows.length > 0
        ? stRows.reduce((s, r) => s + (r.effectiveSellThrough ?? 0), 0) / stRows.length
        : null;

    const avgReturnRate = totalSalesTarget > 0
        ? rows.reduce((s, r) => s + r.returnRate * r.salesTarget, 0) / totalSalesTarget
        : 0;

    return {
        totalSalesTarget,
        totalNetOTB,
        totalInvestmentPairs,
        avgEffectiveSellThrough,
        avgReturnRate,
        totalProjectedEndingInventory,
        totalGrossProfitContribution,
        budgetBalance: totalNetOTB - totalBeginningInventory,
        highRiskChannelCount: highRiskChannels.size,
        allDiagnoses: diagnoses,
    };
}

// ─── 渠道 × 季度矩阵 ───────────────────────────────────────────────────────────

export type CellRiskLevel = 'healthy' | 'attention' | 'risk';

export interface MatrixCell {
    channelId: string;
    channelLabel: string;
    quarter: string;
    salesTarget: number;
    netOTB: number;
    investmentPairs: number;
    effectiveSellThrough: number | null;
    /** 售罄健康度 = effectiveSellThrough / 该渠道目标售罄率，反映扣除退货后是否达成渠道基准 */
    sellThroughAchievement: number | null;
    projectedEndingInventory: number;
    grossMargin: number;
    grossProfitContribution: number;
    riskLevel: CellRiskLevel;
    diagnoses: ChannelDiagnosis[];
}

export function calcChannelQuarterMatrix(rows: ChannelOTBRow[]): MatrixCell[] {
    return rows.map(row => {
        const diagnoses = diagnoseChannelRow(row);
        const hasDanger = diagnoses.some(d => d.level === 'danger');
        const hasWarning = diagnoses.some(d => d.level === 'warning');
        const target = row.sellThroughTarget;
        const sellThroughAchievement = (row.effectiveSellThrough !== null && target > 0)
            ? row.effectiveSellThrough / target
            : null;
        return {
            channelId: row.channel,
            channelLabel: row.channelLabel,
            quarter: row.quarter,
            salesTarget: row.salesTarget,
            netOTB: row.netNewOTB ?? 0,
            investmentPairs: row.investmentPairs ?? 0,
            effectiveSellThrough: row.effectiveSellThrough,
            sellThroughAchievement,
            projectedEndingInventory: calcProjectedEndingInventory(row),
            grossMargin: calcGrossMargin(row),
            grossProfitContribution: calcGrossProfitContribution(row),
            riskLevel: hasDanger ? 'risk' : hasWarning ? 'attention' : 'healthy',
            diagnoses,
        };
    });
}

// ─── 行动项生成 ────────────────────────────────────────────────────────────────

export function generateChannelActions(rows: ChannelOTBRow[]): ChannelDiagnosis[] {
    return rows
        .flatMap(r => diagnoseChannelRow(r))
        .sort((a, b) => {
            const priorityOrder = { P0: 0, P1: 1, P2: 2 };
            const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (pDiff !== 0) return pDiff;
            return b.impactAmount - a.impactAmount;
        });
}

/**
 * 风险按渠道分组（UI 渲染用）
 */
export interface ChannelRiskGroup {
    channelId: string;
    channelLabel: string;
    p0Count: number;
    p1Count: number;
    p2Count: number;
    totalImpact: number;
    topPriority: DiagPriority;
    items: ChannelDiagnosis[];
}

export function groupActionsByChannel(actions: ChannelDiagnosis[]): ChannelRiskGroup[] {
    const map = new Map<string, ChannelRiskGroup>();
    for (const action of actions) {
        const existing = map.get(action.channelId);
        if (existing) {
            existing.items.push(action);
            existing.totalImpact += action.impactAmount;
            if (action.priority === 'P0') existing.p0Count++;
            else if (action.priority === 'P1') existing.p1Count++;
            else existing.p2Count++;
        } else {
            map.set(action.channelId, {
                channelId: action.channelId,
                channelLabel: action.channelLabel,
                p0Count: action.priority === 'P0' ? 1 : 0,
                p1Count: action.priority === 'P1' ? 1 : 0,
                p2Count: action.priority === 'P2' ? 1 : 0,
                totalImpact: action.impactAmount,
                topPriority: action.priority,
                items: [action],
            });
        }
    }
    // 计算每组 topPriority
    for (const group of map.values()) {
        group.topPriority = group.p0Count > 0 ? 'P0' : group.p1Count > 0 ? 'P1' : 'P2';
    }
    return Array.from(map.values()).sort((a, b) => {
        if (a.p0Count !== b.p0Count) return b.p0Count - a.p0Count;
        if (a.p1Count !== b.p1Count) return b.p1Count - a.p1Count;
        return b.totalImpact - a.totalImpact;
    });
}

// ─── 预算分配汇总（按渠道） ──────────────────────────────────────────────────────

export interface ChannelAllocationRow {
    channelId: string;
    channelLabel: string;
    salesTarget: number;
    salesRatio: number;
    netOTB: number;
    otbRatio: number;
    investmentPairs: number;
    pairsRatio: number;
    newProductAmount: number;
    newProductShare: number;
    newProductRatio: number;
    avgEffectiveSellThrough: number | null;
    avgReturnRate: number;
    avgDiscountRate: number;
    grossMargin: number;
    grossProfitContribution: number;
    grossProfitShare: number;
    targetStockToSales: number;
    actualStockToSales: number;
    healthScore: number;
    healthBreakdown: ChannelHealthBreakdown;
    riskLevel: CellRiskLevel;
}

export function calcChannelAllocation(
    rows: ChannelOTBRow[],
    channels: ChannelMeta[] = [],
): ChannelAllocationRow[] {
    const totalSales = rows.reduce((s, r) => s + r.salesTarget, 0);
    const totalOTB   = rows.reduce((s, r) => s + (r.netNewOTB ?? 0), 0);
    const totalPairs = rows.reduce((s, r) => s + (r.investmentPairs ?? 0), 0);
    const totalNewProductAmount = rows.reduce((s, r) => s + r.newProductAmount, 0);
    const totalGP    = rows.reduce((s, r) => s + calcGrossProfitContribution(r), 0);

    const channelMap = new Map(channels.map(c => [c.channelId, c]));
    const byChannel = new Map<string, ChannelOTBRow[]>();
    for (const row of rows) {
        if (!byChannel.has(row.channel)) byChannel.set(row.channel, []);
        byChannel.get(row.channel)!.push(row);
    }

    return Array.from(byChannel.entries()).map(([channelId, channelRows]) => {
        const salesTarget = channelRows.reduce((s, r) => s + r.salesTarget, 0);
        const netOTB      = channelRows.reduce((s, r) => s + (r.netNewOTB ?? 0), 0);
        const pairs       = channelRows.reduce((s, r) => s + (r.investmentPairs ?? 0), 0);
        const newAmt      = channelRows.reduce((s, r) => s + r.newProductAmount, 0);
        const beginInv    = channelRows.reduce((s, r) => s + r.beginningInventoryCost, 0);
        const monthlyAtCostSum = channelRows.reduce((s, r) => s + monthlySalesAtCost(r), 0);
        const avgMonthlyAtCost = channelRows.length > 0 ? monthlyAtCostSum / channelRows.length : 0;
        const grossProfit  = channelRows.reduce((s, r) => s + calcGrossProfitContribution(r), 0);
        const diagnoses    = channelRows.flatMap(r => diagnoseChannelRow(r));
        const hasDanger    = diagnoses.some(d => d.level === 'danger');
        const hasWarning   = diagnoses.some(d => d.level === 'warning');
        const stRows       = channelRows.filter(r => r.effectiveSellThrough !== null);
        const avgST        = stRows.length > 0
            ? stRows.reduce((s, r) => s + (r.effectiveSellThrough ?? 0), 0) / stRows.length
            : null;

        const avgReturnRate = salesTarget > 0
            ? channelRows.reduce((s, r) => s + r.returnRate * r.salesTarget, 0) / salesTarget
            : 0;
        const avgDiscountRate = salesTarget > 0
            ? channelRows.reduce((s, r) => s + r.discountRate * r.salesTarget, 0) / salesTarget
            : 0;
        const grossMarginAvg = salesTarget > 0
            ? channelRows.reduce((s, r) => s + calcGrossMargin(r) * r.salesTarget, 0) / salesTarget
            : 0;

        const meta = channelMap.get(channelId);
        const targetStockToSales = meta?.defaultStockToSalesRatio ?? 2.5;
        const actualStockToSales = avgMonthlyAtCost > 0
            ? (beginInv / channelRows.length) / avgMonthlyAtCost
            : 0;

        const healthScoreObj = calcChannelHealthScore(channelRows, targetStockToSales, diagnoses);

        return {
            channelId,
            channelLabel: channelRows[0].channelLabel,
            salesTarget,
            salesRatio: totalSales > 0 ? salesTarget / totalSales : 0,
            netOTB,
            otbRatio: totalOTB > 0 ? netOTB / totalOTB : 0,
            investmentPairs: pairs,
            pairsRatio: totalPairs > 0 ? pairs / totalPairs : 0,
            newProductAmount: newAmt,
            newProductShare: totalNewProductAmount > 0 ? newAmt / totalNewProductAmount : 0,
            newProductRatio: salesTarget > 0 ? newAmt / salesTarget : 0,
            avgEffectiveSellThrough: avgST,
            avgReturnRate,
            avgDiscountRate,
            grossMargin: grossMarginAvg,
            grossProfitContribution: grossProfit,
            grossProfitShare: totalGP > 0 ? grossProfit / totalGP : 0,
            targetStockToSales,
            actualStockToSales,
            healthScore: healthScoreObj.total,
            healthBreakdown: healthScoreObj.breakdown,
            riskLevel: hasDanger ? 'risk' : hasWarning ? 'attention' : 'healthy',
        };
    });
}

export { formatCurrency, type CurrencyUnit };
