/**
 * src/utils/channelOpsV13.ts
 * 区域&门店 V13 业务逻辑工具函数
 */

// ─── S1.5 季度区域组合评分 ────────────────────────────────────

export interface RegionScoreDimensions {
    salesContribution: number;    // 0-100
    grossMarginContribution: number; // 0-100
    turnoverEfficiency: number;    // 0-100
    riskControl: number;           // 0-100
}

export interface RegionPortfolioScore {
    region: string;
    score: number;
    grade: 'A' | 'B' | 'C' | 'D';
    dimensions: RegionScoreDimensions;
    quarterTrend: number[];
    industryBenchmark: number;
    suggestion: string;
}

const SCORE_WEIGHTS = {
    salesContribution: 0.30,
    grossMarginContribution: 0.25,
    turnoverEfficiency: 0.25,
    riskControl: 0.20,
};

export function calcChannelPortfolioScore(dims: RegionScoreDimensions): number {
    return Math.round(
        dims.salesContribution * SCORE_WEIGHTS.salesContribution +
        dims.grossMarginContribution * SCORE_WEIGHTS.grossMarginContribution +
        dims.turnoverEfficiency * SCORE_WEIGHTS.turnoverEfficiency +
        dims.riskControl * SCORE_WEIGHTS.riskControl
    );
}

export function getScoreGrade(score: number): 'A' | 'B' | 'C' | 'D' {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    return 'D';
}

// ─── S5b 区域温度匹配度 ───────────────────────────────────────

export interface TempMatchResult {
    region: string;
    category: string;
    climateMatch: number;    // 0-1
    salesContrib: number;    // 0-1
    score: number;           // climateMatch * 100
    suggestion: string | null;
}

export function calcRegionTempMatch(climateMatch: number, salesContrib: number): number {
    // 适配度 = 历史售罄率 × 温度匹配系数
    return Math.round(climateMatch * salesContrib * 100 + climateMatch * 60);
}

// ─── S5c 分销 P&L 计算 ───────────────────────────────────────

export interface DistributionChannel {
    channel: string;
    netRevenue: number;
    grossMarginRate: number;
    contributionProfit: number;
    inventoryTurnover: number;
}

export function calcDistributionPnl(channels: DistributionChannel[]) {
    const total = channels.reduce((sum, ch) => sum + ch.netRevenue, 0);
    return channels.map(ch => ({
        ...ch,
        revenueShare: total > 0 ? ch.netRevenue / total : 0,
        contributionMarginRate: ch.netRevenue > 0 ? ch.contributionProfit / ch.netRevenue : 0,
    }));
}

// ─── S6b 区域销售目标进度 ─────────────────────────────────────

export type AchievementStatus = 'green' | 'yellow' | 'red';

export function calcSalesTargetProgress(actual: number, target: number): {
    rate: number;
    status: AchievementStatus;
} {
    const rate = target > 0 ? actual / target : 0;
    const status: AchievementStatus = rate >= 1.0 ? 'green' : rate >= 0.85 ? 'yellow' : 'red';
    return { rate, status };
}

export function getAchievementColor(status: AchievementStatus): string {
    switch (status) {
        case 'green': return 'text-emerald-600 bg-emerald-50';
        case 'yellow': return 'text-amber-600 bg-amber-50';
        case 'red': return 'text-rose-600 bg-rose-50';
    }
}

// ─── S7b 鞋类试穿漏斗 ────────────────────────────────────────

export interface FittingFunnelInput {
    traffic: number;
    fittingCount: number;
    conversionCount: number;
}

export interface FittingFunnelResult {
    fittingRate: number;
    fittingConversionRate: number;
    overallConversionRate: number;
    fittingStatus: 'healthy' | 'warning' | 'risk';
    conversionStatus: 'healthy' | 'warning' | 'risk';
    diagnosis: string;
}

export function calcFittingFunnel(input: FittingFunnelInput): FittingFunnelResult {
    const fittingRate = input.traffic > 0 ? input.fittingCount / input.traffic : 0;
    const fittingConversionRate = input.fittingCount > 0 ? input.conversionCount / input.fittingCount : 0;
    const overallConversionRate = input.traffic > 0 ? input.conversionCount / input.traffic : 0;

    const fittingStatus = fittingRate >= 0.35 ? 'healthy' : fittingRate >= 0.28 ? 'warning' : 'risk';
    const conversionStatus = fittingConversionRate >= 0.25 ? 'healthy' : fittingConversionRate >= 0.18 ? 'warning' : 'risk';

    let diagnosis = '';
    if (fittingStatus === 'risk' && conversionStatus === 'risk') {
        diagnosis = '试穿率低且转化率低 → 陈列与选款双重问题';
    } else if (fittingStatus === 'healthy' && conversionStatus !== 'healthy') {
        diagnosis = '试穿率高但转化率低 → 选款问题，需调整款式结构';
    } else if (fittingStatus !== 'healthy') {
        diagnosis = '试穿率偏低 → 陈列问题，需优化陈列方式';
    } else {
        diagnosis = '试穿漏斗健康';
    }

    return { fittingRate, fittingConversionRate, overallConversionRate, fittingStatus, conversionStatus, diagnosis };
}

// ─── S11b 区域消费者偏好 ─────────────────────────────────────

export interface ConsumerPreferenceInput {
    region: string;
    scores: number[];  // 6 dimensions, 0-100
    dimensions: string[];
}

export function calcConsumerPreference(input: ConsumerPreferenceInput) {
    const avg = input.scores.reduce((a, b) => a + b, 0) / input.scores.length;
    const topDimIndex = input.scores.indexOf(Math.max(...input.scores));
    const bottomDimIndex = input.scores.indexOf(Math.min(...input.scores));
    return {
        ...input,
        avgScore: Math.round(avg),
        topDimension: input.dimensions[topDimIndex],
        bottomDimension: input.dimensions[bottomDimIndex],
    };
}

// ─── S15 反馈信号生成器 ───────────────────────────────────────

export interface ChannelMetrics {
    region: string;
    achievementRate: number;
    distributionChannelHealth: string;
    topIssue: string;
    impactAmount: number;
}

export function generateChannelFeedbackSignals(metrics: ChannelMetrics[]) {
    return metrics
        .filter(m => m.achievementRate < 0.9 || m.distributionChannelHealth !== 'healthy')
        .map(m => ({
            region: m.region,
            signal: m.topIssue,
            impact: m.impactAmount,
        }));
}

// ─── 格式化工具 ───────────────────────────────────────────────

export function formatWan(value: number, digits = 1): string {
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1e8) return `${sign}¥${(abs / 1e8).toFixed(2)}亿`;
    if (abs >= 1e4) return `${sign}¥${(abs / 1e4).toFixed(digits)}万`;
    return `${sign}¥${Math.round(abs).toLocaleString('zh-CN')}`;
}

export function formatPct(value: number, digits = 1): string {
    if (!Number.isFinite(value)) return '—';
    return `${(value * 100).toFixed(digits)}%`;
}
