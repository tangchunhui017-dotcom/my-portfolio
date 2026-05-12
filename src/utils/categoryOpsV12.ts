/**
 * src/utils/categoryOpsV12.ts
 * 品类运营 V12 — 8个工具函数
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PortfolioScoreDimensions {
    salesContribution: number; // 0-100
    gmContribution: number;    // 0-100
    turnoverEfficiency: number; // 0-100
    riskControl: number;        // 0-100
}

export interface PortfolioScoreResult extends PortfolioScoreDimensions {
    total: number;
    grade: 'A' | 'B' | 'C' | 'D';
    weakDimensions: string[];
    suggestion: string;
}

export interface SeasonalItem {
    category: string;
    emoji: string;
    type: 'seasonal' | 'perennial';
    deadlineDate?: string;
    daysRemaining?: number;
    currentStock: number;
    weeklyVelocity: number;
    weeksToSell: number;
    urgencyLevel: 'good' | 'normal' | 'warning' | 'risk';
    recommendation: string;
}

export interface ParetoResult {
    coreSkuCount: number;
    totalSkuCount: number;
    longTailSkuCount: number;
    top20PctSkuSalesShare: number;
    longTailSalesShare: number;
    longTailInventoryAmount: number;
    conformsToPareto: boolean;
    paretoGap: number;
}

export interface SizeSupplyDemandRow {
    size: number;
    inventoryPct: number;
    salesPct: number;
    matchDiff: number;
    status: 'overstock' | 'risk_stockout' | 'balanced';
}

export interface FootwearStage {
    stage: string;
    label: string;
    description: string;
    skuCount: number;
    avgSellThrough: number | null;
    targetSellThrough: number | null;
    stuckDiagnosis: { type: string; stuckCount: number; message: string } | null;
    health: 'good' | 'warn' | 'risk' | 'neutral';
}

export interface CategoryFeedbackSignal {
    id: string;
    targetModule: 'otb' | 'planning' | 'forecast' | 'profit-loss';
    priority: 'P0' | 'P1' | 'P2';
    category: string;
    finding: string;
    recommendation: string;
    impactAmount: number;
    source: string;
}

// ─── 1. calcPortfolioScore ─────────────────────────────────────────────────

/**
 * 4维评分 → 综合得分（满分100）+ 评级 + 弱维度 + 改进建议
 * 权重：销售贡献30 + 毛利贡献30 + 周转效率20 + 风险防控20
 */
export function calcPortfolioScore(dims: PortfolioScoreDimensions): PortfolioScoreResult {
    const total = Math.round(
        dims.salesContribution * 0.30 +
        dims.gmContribution    * 0.30 +
        dims.turnoverEfficiency * 0.20 +
        dims.riskControl       * 0.20
    );
    const grade: PortfolioScoreResult['grade'] =
        total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : 'D';

    const dimensionMap: Array<[string, number]> = [
        ['销售贡献', dims.salesContribution],
        ['毛利贡献', dims.gmContribution],
        ['周转效率', dims.turnoverEfficiency],
        ['风险防控', dims.riskControl],
    ];
    const weakDimensions = dimensionMap
        .filter(([, v]) => v < 65)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 2)
        .map(([k]) => k);

    const lowestDim = dimensionMap.sort((a, b) => a[1] - b[1])[0];
    const suggestion = weakDimensions.length === 0
        ? '品类组合综合表现良好，维持当前策略。'
        : `${weakDimensions.join('、')}是主要拖后腿维度（最低：${lowestDim[0]} ${lowestDim[1]}分），建议优先改善。`;

    return { ...dims, total, grade, weakDimensions, suggestion };
}

// ─── 2. calcSeasonalPriority ──────────────────────────────────────────────────

/**
 * 计算季节性优先级 — 根据当前日期与截止日期推算天数/周数/紧急程度
 */
export function calcSeasonalPriority(
    today: Date,
    items: Array<Omit<SeasonalItem, 'daysRemaining' | 'weeksToSell' | 'urgencyLevel'>>
): SeasonalItem[] {
    return items.map((item) => {
        const daysRemaining = item.deadlineDate
            ? Math.ceil((new Date(item.deadlineDate).getTime() - today.getTime()) / 86400000)
            : undefined;
        const weeksToSell = item.weeklyVelocity > 0 ? item.currentStock / item.weeklyVelocity : 99;
        let urgencyLevel: SeasonalItem['urgencyLevel'] = 'good';
        if (item.type === 'seasonal' && daysRemaining !== undefined) {
            const weeksAvail = daysRemaining / 7;
            if (weeksToSell > weeksAvail * 1.5) urgencyLevel = 'risk';
            else if (weeksToSell > weeksAvail) urgencyLevel = 'warning';
            else if (weeksToSell > weeksAvail * 0.8) urgencyLevel = 'normal';
            else urgencyLevel = 'good';
        }
        return { ...item, daysRemaining, weeksToSell: Math.round(weeksToSell * 10) / 10, urgencyLevel };
    });
}

// ─── 3. calc80_20Pareto ───────────────────────────────────────────────────────

/**
 * 计算80/20分布合规性
 */
export function calc80_20Pareto(top20PctSalesShare: number, totalSkuCount: number, longTailSkuCount: number, longTailSalesShare: number, longTailInventoryAmount: number): ParetoResult {
    const coreSkuCount = Math.round(totalSkuCount * 0.20);
    const conformsToPareto = top20PctSalesShare >= 0.50; // top20% SKU 应贡献 50%+ 销售
    const paretoGap = conformsToPareto ? 0 : 0.50 - top20PctSalesShare;
    return {
        coreSkuCount,
        totalSkuCount,
        longTailSkuCount,
        top20PctSkuSalesShare: top20PctSalesShare,
        longTailSalesShare,
        longTailInventoryAmount,
        conformsToPareto,
        paretoGap,
    };
}

// ─── 4. calcSizeSupplyDemand ──────────────────────────────────────────────────

/**
 * 尺码段供需匹配分析
 */
export function calcSizeSupplyDemand(
    sizes: number[],
    inventoryPct: number[],
    salesPct: number[]
): SizeSupplyDemandRow[] {
    return sizes.map((size, i) => {
        const inv = inventoryPct[i] ?? 0;
        const sal = salesPct[i] ?? 0;
        const diff = inv - sal;
        const status: SizeSupplyDemandRow['status'] =
            diff > 3  ? 'overstock' :
            diff < -3 ? 'risk_stockout' : 'balanced';
        return { size, inventoryPct: inv, salesPct: sal, matchDiff: Math.round(diff * 10) / 10, status };
    });
}

// ─── 5. mapToFootwear7Stages ──────────────────────────────────────────────────

/**
 * 将后端生命周期标签映射到鞋类7阶段枚举
 */
export function mapToFootwear7Stages(lifecycle: string): FootwearStage['stage'] {
    const map: Record<string, string> = {
        '新品':   'rampup',
        '次新品': 'peak',
        '老品':   'decline',
        '淘汰':   'clearance',
        '其他':   'decline',
    };
    return map[lifecycle] ?? 'rampup';
}

// ─── 6. detectStageStuckSkus ──────────────────────────────────────────────────

/**
 * 检测卡阶段 SKU（当前阶段低于目标售罄）
 */
export function detectStageStuckSkus(
    stages: Array<{ stage: string; skuCount: number; avgSellThrough: number | null; targetSellThrough: number | null }>
): Array<{ stage: string; stuckCount: number; message: string }> {
    const STAGE_LABELS: Record<string, string> = {
        rampup:    '爬坡期',
        peak:      '巅峰期',
        decline:   '衰退期',
        clearance: '清货期',
    };
    return stages
        .filter((s) => s.avgSellThrough !== null && s.targetSellThrough !== null && s.avgSellThrough < s.targetSellThrough)
        .map((s) => {
            const stuckCount = Math.round(s.skuCount * ((s.targetSellThrough! - s.avgSellThrough!) / s.targetSellThrough!));
            const label = STAGE_LABELS[s.stage] ?? s.stage;
            const action = s.stage === 'rampup' ? '推广不力，建议加强渠道陈列与流量' :
                           s.stage === 'clearance' ? '清货不力，建议加大折扣力度与渠道转移' :
                           '建议加速促销去化';
            return { stage: s.stage, stuckCount, message: `${stuckCount}款卡在${label} → ${action}` };
        });
}

// ─── 7. generateCategoryFeedbackSignals ──────────────────────────────────────

/**
 * 根据品类运营指标自动生成对上游模块的反馈信号
 */
export function generateCategoryFeedbackSignals(
    categories: Array<{ name: string; sellThrough: number; momentum: number; gmRate: number; netSales: number }>
): CategoryFeedbackSignal[] {
    const signals: CategoryFeedbackSignal[] = [];
    let idx = 0;

    categories.forEach((cat) => {
        if (cat.sellThrough < 0.30 && cat.netSales > 500_000) {
            signals.push({
                id: `cat-gen-${++idx}`,
                targetModule: 'otb',
                priority: 'P1',
                category: cat.name,
                finding: `${cat.name}售罄率仅${(cat.sellThrough * 100).toFixed(0)}%，库存过剩`,
                recommendation: `下季${cat.name} OTB 建议下调 15-20%`,
                impactAmount: cat.netSales * 0.15,
                source: '品类运营（自动生成）',
            });
        }
        if (cat.momentum > 0.10 && cat.gmRate > 0.50) {
            signals.push({
                id: `cat-gen-${++idx}`,
                targetModule: 'forecast',
                priority: 'P1',
                category: cat.name,
                finding: `${cat.name}连续增速 +${(cat.momentum * 100).toFixed(0)}%，超出预测`,
                recommendation: `下季${cat.name}销售预测建议上调 10-15%`,
                impactAmount: cat.netSales * 0.12,
                source: '品类运营（自动生成）',
            });
        }
        if (cat.gmRate < 0.12) {
            signals.push({
                id: `cat-gen-${++idx}`,
                targetModule: 'profit-loss',
                priority: 'P0',
                category: cat.name,
                finding: `${cat.name}贡献利润率仅${(cat.gmRate * 100).toFixed(0)}%，严重低于要求`,
                recommendation: `减少${cat.name} SKU 数 + 提价，或转移折扣渠道止损`,
                impactAmount: cat.netSales * 0.08,
                source: '品类运营（自动生成）',
            });
        }
    });
    return signals;
}

// ─── 8. calcVsLyComparison ────────────────────────────────────────────────────

/**
 * 计算本年 vs 去年同期对比
 */
export function calcVsLyComparison(
    current: number,
    ly: number
): { diff: number; diffPct: number; direction: 'up' | 'down' | 'flat'; label: string } {
    if (ly === 0) return { diff: 0, diffPct: 0, direction: 'flat', label: '—' };
    const diff = current - ly;
    const diffPct = diff / ly;
    const direction = diffPct > 0.01 ? 'up' : diffPct < -0.01 ? 'down' : 'flat';
    const sign = diffPct >= 0 ? '+' : '';
    const label = `${sign}${(diffPct * 100).toFixed(1)}%`;
    return { diff, diffPct, direction, label };
}
