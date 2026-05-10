'use strict';
/**
 * src/utils/otbWavePlanning.ts
 * 波段 OTB 拆解诊断、动作生成、预算汇总逻辑
 * 遵循 formatCurrency、safeNumber、safeDiv 防御性编程模式
 */

import { safeNumber, formatCurrency, type CurrencyUnit } from '@/utils/otbCalculations';

export type WaveRiskLevel = 'healthy' | 'warning' | 'danger';

export type WaveRiskType =
  | 'budget_overrun'
  | 'launch_delay'
  | 'arrival_delay'
  | 'category_mismatch'
  | 'role_mismatch'
  | 'depth_too_high'
  | 'depth_too_low'
  | 'style_count_too_high'
  | 'sell_through_too_low'
  | 'season_overlap'
  | 'cashflow_pressure';

export type WaveActionType =
  | '提前下单'
  | '推迟上市'
  | '调低款数'
  | '提升主推深度'
  | '降低非核心价格带预算'
  | '转移预算到主销波段'
  | '清尾让位'
  | '提交预算调整'
  | '触发现金流复核';

export interface WaveRisk {
  waveId: string;
  waveName: string;
  level: WaveRiskLevel;
  riskType: WaveRiskType;
  title: string;
  message: string;
  impactAmount: number;
  priority: '高' | '中' | '低';
}

export interface WaveAction {
  waveId: string;
  waveName: string;
  riskType: WaveRiskType;
  action: WaveActionType;
  owner: string;
  deadline: string;
  estimatedSavings: number;
}

export interface WaveBudgetSummary {
  annualSalesTarget: number;
  allocatedSales: number;
  salesGap: number;
  salesGapSign: 'allocated' | 'unallocated' | 'overallocated';
  annualOtbBudget: number;
  allocatedOtb: number;
  otbGap: number;
  otbGapSign: 'allocated' | 'surplus' | 'shortfall';
  highRiskWaveCount: number;
  nearestLaunchWave: { waveId: string; waveName: string; daysToLaunch: number } | null;
  seasonBreakdown: Record<string, { sales: number; otb: number; waveCount: number }>;
}

export interface WaveContext {
  annualSalesTarget: number;
  annualOtbBudget: number;
  allWaves: WaveRow[];
  currentDate: Date;
  currencyUnit: CurrencyUnit;
}

export interface WaveRow {
  waveId: string;
  waveName: string;
  season: string;
  waveRole?: 'traffic' | 'main_sales' | 'image' | 'testing' | 'repeat' | 'clearance';
  launchDate: string;
  arrivalMonth?: number;
  mainCategory?: string;
  planSalesAmount?: number;
  lySalesAmount?: number;
  forecastSalesAmount: number;
  planOtbBudget?: number;
  forecastOtbBudget: number;
  averageDepth: number;
  targetStyleCount: number;
  targetColorCount?: number;
  targetSkuCount?: number;
  newProductRatio: number;
  repeatRatio: number;
  oldProductRatio: number;
  sellThroughTarget: number;
  priceBandFocus?: string[];
  productRoleFocus?: string[];
  arrivalRateTarget?: number;
  orderDeadline?: string;
  warehouseDeadline?: string;
}

/**
 * 诊断波段风险
 * 规则来自 spec 第八部分
 */
export function diagnoseWaveRisk(wave: WaveRow, context: WaveContext): WaveRisk[] {
  const risks: WaveRisk[] = [];
  const daysToLaunch = Math.floor((new Date(wave.launchDate).getTime() - context.currentDate.getTime()) / (1000 * 60 * 60 * 24));
  const forecastOtb = safeNumber(wave.forecastOtbBudget) ?? 0;
  const planOtb = safeNumber(wave.planOtbBudget) ?? 0;
  const annualOtb = safeNumber(context.annualOtbBudget) ?? 0;

  // 1. budget_overrun: OTB预算 > 计划预算 * 110%
  if (planOtb > 0 && forecastOtb > planOtb * 1.1) {
    const overage = forecastOtb - planOtb;
    risks.push({
      waveId: wave.waveId,
      waveName: wave.waveName,
      level: 'danger',
      riskType: 'budget_overrun',
      title: '预算超支',
      message: `OTB预算超过计划 ${formatCurrency(overage, context.currencyUnit)}`,
      impactAmount: overage,
      priority: '高',
    });
  }

  // 2. launch_delay: 距上市 < 60 天 且 到货月份未确认
  if (daysToLaunch < 60 && !wave.arrivalMonth) {
    risks.push({
      waveId: wave.waveId,
      waveName: wave.waveName,
      level: 'danger',
      riskType: 'launch_delay',
      title: '上市延迟风险',
      message: `距离上市 ${daysToLaunch} 天，到货月份未确认`,
      impactAmount: 0,
      priority: '高',
    });
  }

  // 3. arrival_delay: 距上市 < 90 天 且 主推品类未明确
  if (daysToLaunch < 90 && !wave.mainCategory) {
    risks.push({
      waveId: wave.waveId,
      waveName: wave.waveName,
      level: 'warning',
      riskType: 'arrival_delay',
      title: '商品结构风险',
      message: `距离上市 ${daysToLaunch} 天，主推品类未明确`,
      impactAmount: 0,
      priority: '中',
    });
  }

  // 4. depth_too_low: 均深 < 300
  if (wave.averageDepth < 300) {
    risks.push({
      waveId: wave.waveId,
      waveName: wave.waveName,
      level: 'warning',
      riskType: 'depth_too_low',
      title: '款数过多',
      message: `均深 ${wave.averageDepth}，低于300，提示款数过多或深度不足`,
      impactAmount: 0,
      priority: '中',
    });
  }

  // 5. depth_too_high: 均深 > 1200
  if (wave.averageDepth > 1200) {
    risks.push({
      waveId: wave.waveId,
      waveName: wave.waveName,
      level: 'warning',
      riskType: 'depth_too_high',
      title: '深度过高',
      message: `均深 ${wave.averageDepth}，超过1200，库存风险`,
      impactAmount: 0,
      priority: '中',
    });
  }

  // 6. style_count_too_high: 款数过多（基于style数 / depth计算）
  const impliedStyleCount = wave.averageDepth < 50 ? 1000 : Math.ceil(wave.targetStyleCount);
  if (impliedStyleCount > 50) {
    risks.push({
      waveId: wave.waveId,
      waveName: wave.waveName,
      level: 'warning',
      riskType: 'style_count_too_high',
      title: '款数过多',
      message: `计划款数 ${wave.targetStyleCount}，管理复杂度高`,
      impactAmount: 0,
      priority: '中',
    });
  }

  // 7. 新品占比低于 50%：sell_through_too_low（新鲜度不足）
  const newRatio = safeNumber(wave.newProductRatio) ?? 0;
  if (newRatio < 0.5) {
    risks.push({
      waveId: wave.waveId,
      waveName: wave.waveName,
      level: 'warning',
      riskType: 'sell_through_too_low',
      title: '波段新鲜度不足',
      message: `新品占比 ${((newRatio || 0) * 100).toFixed(1)}%，低于50%`,
      impactAmount: 0,
      priority: '中',
    });
  }

  // 8. 翻单占比高于 40%
  const repeatRatio = safeNumber(wave.repeatRatio) ?? 0;
  if (repeatRatio > 0.4) {
    risks.push({
      waveId: wave.waveId,
      waveName: wave.waveName,
      level: 'warning',
      riskType: 'role_mismatch',
      title: '创新不足',
      message: `翻单占比 ${((repeatRatio || 0) * 100).toFixed(1)}%，超过40%`,
      impactAmount: 0,
      priority: '中',
    });
  }

  // 9. 旧品占比高于 25%
  const oldRatio = safeNumber(wave.oldProductRatio) ?? 0;
  if (oldRatio > 0.25) {
    risks.push({
      waveId: wave.waveId,
      waveName: wave.waveName,
      level: 'warning',
      riskType: 'role_mismatch',
      title: '清尾压力',
      message: `旧品占比 ${((oldRatio || 0) * 100).toFixed(1)}%，超过25%`,
      impactAmount: 0,
      priority: '低',
    });
  }

  // 10. 消化率目标低于 75%
  const sellThrough = safeNumber(wave.sellThroughTarget) ?? 0.75;
  if (sellThrough < 0.75) {
    risks.push({
      waveId: wave.waveId,
      waveName: wave.waveName,
      level: 'warning',
      riskType: 'sell_through_too_low',
      title: '库存风险',
      message: `消化率目标 ${((sellThrough || 0) * 100).toFixed(1)}%，低于75%`,
      impactAmount: 0,
      priority: '中',
    });
  }

  // 11. category_mismatch：形象波段销售占比过高 或 清尾波段新品占比过高
  if (wave.waveRole === 'image') {
    const salesRatio = (safeNumber(wave.forecastSalesAmount) ?? 0) / (safeNumber(context.annualSalesTarget) ?? 1);
    if (salesRatio > 0.15) {
      risks.push({
        waveId: wave.waveId,
        waveName: wave.waveName,
        level: 'warning',
        riskType: 'category_mismatch',
        title: '形象波段销售占比过高',
        message: `形象波段销售占比 ${(salesRatio * 100).toFixed(1)}%，库存风险`,
        impactAmount: 0,
        priority: '中',
      });
    }
  }

  if (wave.waveRole === 'clearance' && (newRatio || 0) > 0.3) {
    risks.push({
      waveId: wave.waveId,
      waveName: wave.waveName,
      level: 'warning',
      riskType: 'category_mismatch',
      title: '清尾波段结构不匹配',
      message: `清尾承接波段新品占比 ${(((newRatio || 0) * 100).toFixed(1))}%，超过30%`,
      impactAmount: 0,
      priority: '中',
    });
  }

  // 12. 波段集中付款可能带来现金流压力
  if (annualOtb > 0 && forecastOtb / annualOtb > 0.22 && daysToLaunch < 120) {
    risks.push({
      waveId: wave.waveId,
      waveName: wave.waveName,
      level: 'warning',
      riskType: 'cashflow_pressure',
      title: '现金流压力',
      message: `该波段OTB占年度预算 ${(forecastOtb / annualOtb * 100).toFixed(1)}%，且距离上市不足120天，需复核付款节奏`,
      impactAmount: forecastOtb,
      priority: '中',
    });
  }

  // 13. 不同季节波段上市日期过近，提示季节承接压力
  const hasCloseDifferentSeasonWave = context.allWaves.some((other: WaveRow) => {
    if (!other || other.waveId === wave.waveId || other.season === wave.season || !other.launchDate) return false;
    const diffDays = Math.abs((new Date(other.launchDate).getTime() - new Date(wave.launchDate).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 45;
  });

  if (hasCloseDifferentSeasonWave) {
    risks.push({
      waveId: wave.waveId,
      waveName: wave.waveName,
      level: 'warning',
      riskType: 'season_overlap',
      title: '季节承接压力',
      message: '相邻季节波段上市间隔小于45天，可能挤压陈列、仓位和清尾节奏',
      impactAmount: 0,
      priority: '中',
    });
  }

  return risks;
}

/**
 * 根据风险生成动作建议
 */
export function generateWaveActions(wave: WaveRow, risks: WaveRisk[]): WaveAction[] {
  const actions: WaveAction[] = [];
  const daysToLaunch = Math.floor((new Date(wave.launchDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  for (const risk of risks) {
    let action: WaveActionType | null = null;
    let owner = '商品';
    let deadline = '立即';
    let estimatedSavings = 0;

    switch (risk.riskType) {
      case 'budget_overrun':
        action = '提交预算调整';
        owner = '企划';
        deadline = daysToLaunch < 30 ? '3天内' : '7天内';
        estimatedSavings = risk.impactAmount;
        break;

      case 'launch_delay':
        action = '提前下单';
        owner = '采购';
        deadline = '立即';
        estimatedSavings = 0;
        break;

      case 'arrival_delay':
        action = '推迟上市';
        owner = '商品';
        deadline = '7天内';
        estimatedSavings = 0;
        break;

      case 'depth_too_low':
        action = '提升主推深度';
        owner = '商品';
        deadline = '14天内';
        estimatedSavings = 0;
        break;

      case 'depth_too_high':
        action = '降低非核心价格带预算';
        owner = '商品';
        deadline = '7天内';
        estimatedSavings = 0;
        break;

      case 'style_count_too_high':
        action = '调低款数';
        owner = '商品';
        deadline = '14天内';
        estimatedSavings = 0;
        break;

      case 'sell_through_too_low':
        if (wave.newProductRatio < 0.5) {
          action = '提升主推深度';
        } else {
          action = '转移预算到主销波段';
        }
        owner = '企划';
        deadline = '7天内';
        estimatedSavings = 0;
        break;

      case 'season_overlap':
        action = '清尾让位';
        owner = '商品';
        deadline = '14天内';
        estimatedSavings = 0;
        break;

      case 'cashflow_pressure':
        action = '触发现金流复核';
        owner = '财务';
        deadline = '3天内';
        estimatedSavings = 0;
        break;

      case 'category_mismatch':
      case 'role_mismatch':
        action = '降低非核心价格带预算';
        owner = '商品';
        deadline = '7天内';
        estimatedSavings = 0;
        break;
    }

    if (action) {
      actions.push({
        waveId: wave.waveId,
        waveName: wave.waveName,
        riskType: risk.riskType,
        action,
        owner,
        deadline,
        estimatedSavings,
      });
    }
  }

  return actions;
}

/**
 * 计算波段预算汇总
 * 包含年度→四季→波段的业务链路汇总
 */
export function calcWaveBudgetSummary(
  waves: WaveRow[],
  annualSalesTarget: number,
  annualOtbBudget: number,
  context: WaveContext
): WaveBudgetSummary {
  const allocatedSales = waves.reduce((sum, w) => sum + ((safeNumber(w.forecastSalesAmount) ?? 0)), 0);
  const allocatedOtb = waves.reduce((sum, w) => sum + ((safeNumber(w.forecastOtbBudget) ?? 0)), 0);
  const salesGap = annualSalesTarget - allocatedSales;
  const otbGap = annualOtbBudget - allocatedOtb;

  let salesGapSign: 'allocated' | 'unallocated' | 'overallocated' = 'allocated';
  if (salesGap > 100000) salesGapSign = 'unallocated';
  if (salesGap < -100000) salesGapSign = 'overallocated';

  let otbGapSign: 'allocated' | 'surplus' | 'shortfall' = 'allocated';
  if (otbGap > 100000) otbGapSign = 'surplus';
  if (otbGap < -100000) otbGapSign = 'shortfall';

  const risks = waves.flatMap(w => diagnoseWaveRisk(w, context));
  const highRiskWaveCount = new Set(risks.filter(r => r.level === 'danger').map(r => r.waveId)).size;

  const nearestLaunchWave = waves
    .map(w => ({
      waveId: w.waveId,
      waveName: w.waveName,
      daysToLaunch: Math.floor((new Date(w.launchDate).getTime() - context.currentDate.getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter(w => w.daysToLaunch > 0)
    .sort((a, b) => a.daysToLaunch - b.daysToLaunch)[0] ?? null;

  // 按季节分组
  const seasonBreakdown: Record<string, { sales: number; otb: number; waveCount: number }> = {};
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const seasonWaves = waves.filter(w => w.season === season);
    seasonBreakdown[season] = {
      sales: seasonWaves.reduce((sum, w) => sum + ((safeNumber(w.forecastSalesAmount) ?? 0)), 0),
      otb: seasonWaves.reduce((sum, w) => sum + ((safeNumber(w.forecastOtbBudget) ?? 0)), 0),
      waveCount: seasonWaves.length,
    };
  }

  return {
    annualSalesTarget,
    allocatedSales,
    salesGap,
    salesGapSign,
    annualOtbBudget,
    allocatedOtb,
    otbGap,
    otbGapSign,
    highRiskWaveCount,
    nearestLaunchWave,
    seasonBreakdown,
  };
}

// ─── 波段健康度评分 ──────────────────────────────────────────────

export interface WaveHealthBreakdown {
    salesAchievement: number;   // 销售达成度 25 分
    procurementPace: number;    // 采购节奏合规 25 分
    marginCompliance: number;   // 毛利合规 25 分
    riskCount: number;          // 风险反向计分 25 分
}

export interface WaveHealthScore {
    total: number;             // 0-100
    breakdown: WaveHealthBreakdown;
    tier: 'healthy' | 'warning' | 'danger';
}

export function calcWaveHealthScore(
    wave: WaveRow,
    context: WaveContext,
    risks: WaveRisk[],
): WaveHealthScore {
    // 1. 销售达成度（25分）：预测/计划占比接近 1.0 得满分
    const plan = safeNumber(wave.planSalesAmount) ?? wave.forecastSalesAmount;
    const forecast = safeNumber(wave.forecastSalesAmount) ?? 0;
    const salesRatio = plan > 0 ? forecast / plan : 1;
    const salesScore = Math.min(25, Math.max(0, Math.round(
        salesRatio >= 0.95 && salesRatio <= 1.15 ? 25 :
        salesRatio >= 0.85 && salesRatio <= 1.25 ? 18 :
        salesRatio >= 0.70 ? 10 : 0
    )));

    // 2. 采购节奏合规（25分）：距上市天数与采购周期对比
    const daysToLaunch = Math.floor(
        (new Date(wave.launchDate).getTime() - context.currentDate.getTime()) / 86400000
    );
    const hasOrderDeadline = Boolean(wave.orderDeadline);
    let procurementScore = 20; // 默认 20 分
    if (hasOrderDeadline && wave.orderDeadline) {
        const daysToOrder = Math.floor(
            (new Date(wave.orderDeadline).getTime() - context.currentDate.getTime()) / 86400000
        );
        if (daysToOrder < -7) procurementScore = 0;       // 已逾期
        else if (daysToOrder < 0) procurementScore = 8;   // 轻微逾期
        else if (daysToOrder <= 14) procurementScore = 15; // 临近截止
        else procurementScore = 25;                        // 充裕
    } else if (daysToLaunch < 0) {
        procurementScore = 25; // 已上市，视为合规
    } else if (daysToLaunch < 45) {
        procurementScore = 10; // 临近上市但未知截止日
    }

    // 3. 毛利合规（25分）：基于售罄率和深度
    const sellThrough = safeNumber(wave.sellThroughTarget) ?? 0.8;
    const avgDepth = safeNumber(wave.averageDepth) ?? 0;
    let marginScore = 25;
    if (sellThrough < 0.65) marginScore = 0;
    else if (sellThrough < 0.75) marginScore = 12;
    else if (sellThrough < 0.85) marginScore = 20;
    if (avgDepth > 2000) marginScore = Math.max(0, marginScore - 8);

    // 4. 风险反向计分（25分）
    const dangerCount = risks.filter(r => r.level === 'danger').length;
    const warningCount = risks.filter(r => r.level === 'warning').length;
    const riskScore = Math.max(0, 25 - dangerCount * 10 - warningCount * 4);

    const total = salesScore + procurementScore + marginScore + riskScore;
    return {
        total,
        breakdown: {
            salesAchievement: salesScore,
            procurementPace: procurementScore,
            marginCompliance: marginScore,
            riskCount: riskScore,
        },
        tier: total >= 80 ? 'healthy' : total >= 60 ? 'warning' : 'danger',
    };
}

// ─── OTB 超额归因 ─────────────────────────────────────────────────

export interface OtbOverrunContribution {
    factor: string;
    amount: number;
    share: number;
    description: string;
}

export interface OtbOverrunResult {
    isOverrun: boolean;
    totalOverrun: number;
    contributions: OtbOverrunContribution[];
}

export function attributeOtbOverrun(waves: WaveRow[], context: WaveContext): OtbOverrunResult {
    const allocated = waves.reduce((s, w) => s + (safeNumber(w.forecastOtbBudget) ?? 0), 0);
    const budget = context.annualOtbBudget;
    const overrun = allocated - budget;
    const isOverrun = overrun > budget * 0.05;

    if (!isOverrun) return { isOverrun: false, totalOverrun: overrun, contributions: [] };

    // 简化归因：基于全部波段的平均假设参数
    const avgSellThrough = waves.reduce((s, w) => s + (safeNumber(w.sellThroughTarget) ?? 0.8), 0) / Math.max(1, waves.length);
    const avgDepth = waves.reduce((s, w) => s + (safeNumber(w.averageDepth) ?? 600), 0) / Math.max(1, waves.length);
    const totalSales = waves.reduce((s, w) => s + (safeNumber(w.forecastSalesAmount) ?? 0), 0);
    const salesOvershoot = Math.max(0, totalSales - context.annualSalesTarget);

    // 销售目标过激进贡献
    const salesContrib = Math.min(overrun * 0.35, salesOvershoot > 0 ? overrun * 0.30 : 0);
    // 售罄率偏低贡献（每低 5pp 贡献约 15%）
    const sellThroughContrib = avgSellThrough < 0.80 ? overrun * Math.min(0.35, (0.80 - avgSellThrough) / 0.05 * 0.07) : 0;
    // 均深偏高贡献
    const depthContrib = avgDepth > 1000 ? overrun * Math.min(0.20, (avgDepth - 1000) / 500 * 0.10) : 0;
    // 其余归因折扣率/倍率
    const residual = Math.max(0, overrun - salesContrib - sellThroughContrib - depthContrib);

    const contributions: OtbOverrunContribution[] = [];
    if (salesContrib > 0) contributions.push({
        factor: '销售目标过激进',
        amount: Math.round(salesContrib),
        share: salesContrib / overrun,
        description: `年度销售目标 ${formatCurrency(context.annualSalesTarget, context.currencyUnit)} 已被超额分配`,
    });
    if (sellThroughContrib > 0) contributions.push({
        factor: `售罄率假设偏低 (${(avgSellThrough * 100).toFixed(0)}% vs 行业 80%)`,
        amount: Math.round(sellThroughContrib),
        share: sellThroughContrib / overrun,
        description: '较低的售罄率目标导致需要更多库存备货',
    });
    if (depthContrib > 0) contributions.push({
        factor: `加权均深偏高 (${Math.round(avgDepth)}双)`,
        amount: Math.round(depthContrib),
        share: depthContrib / overrun,
        description: '各波段均深偏高，建议部分转追单策略',
    });
    if (residual > 0) contributions.push({
        factor: '折扣/倍率假设差异',
        amount: Math.round(residual),
        share: residual / overrun,
        description: '折扣率或加价倍率假设与年度预算基准存在偏差',
    });

    return { isOverrun, totalOverrun: overrun, contributions };
}

// ─── 采购截止日扫描 ──────────────────────────────────────────────

export interface UpcomingDeadlineItem {
    wave: WaveRow;
    type: '下单截止' | '入仓截止';
    days: number;
    date: string;
}

export function scanUpcomingDeadlines(
    waves: WaveRow[],
    today: Date,
    withinDays: number = 14,
): UpcomingDeadlineItem[] {
    const results: UpcomingDeadlineItem[] = [];
    for (const wave of waves) {
        const check = (rawDate: string | undefined, type: '下单截止' | '入仓截止') => {
            if (!rawDate) return;
            const d = Math.floor((new Date(rawDate).getTime() - today.getTime()) / 86400000);
            if (d >= -3 && d <= withinDays) {
                results.push({ wave, type, days: d, date: rawDate });
            }
        };
        check(wave.orderDeadline, '下单截止');
        check(wave.warehouseDeadline, '入仓截止');
    }
    return results.sort((a, b) => a.days - b.days);
}

// ─── 已上市波段复盘 ──────────────────────────────────────────────

export interface ClosedWaveAchievement {
    waveId: string;
    waveName: string;
    daysLaunched: number;
    planSales: number;
    actualSales: number | null;
    achievementPct: number | null;
}

export function calcClosedWaveAchievement(
    waves: WaveRow[],
    today: Date,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    executionData?: any[],
): ClosedWaveAchievement[] {
    return waves
        .filter(w => {
            const d = Math.floor((new Date(w.launchDate).getTime() - today.getTime()) / 86400000);
            return d < 0;
        })
        .map(w => {
            const daysLaunched = Math.abs(
                Math.floor((new Date(w.launchDate).getTime() - today.getTime()) / 86400000)
            );
            const planSales = safeNumber(w.planSalesAmount) ?? safeNumber(w.forecastSalesAmount) ?? 0;
            // 尝试从 executionData 找实际销售
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const execRecord = executionData?.find((r: any) => r.waveId === w.waveId || r.wave === w.waveName);
            const actualSales: number | null = execRecord
                ? (safeNumber(execRecord.actualSalesAmount) ?? safeNumber(execRecord.actualSales) ?? null)
                : null;
            const achievementPct = planSales > 0 && actualSales !== null ? actualSales / planSales : null;
            return { waveId: w.waveId, waveName: w.waveName, daysLaunched, planSales, actualSales, achievementPct };
        })
        .sort((a, b) => a.daysLaunched - b.daysLaunched);
}
