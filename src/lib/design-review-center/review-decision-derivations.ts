import type { ReviewActionRow, ReviewDecisionRow } from './selectors/reviews';

// ─── Industry experience coefficients (行业经验系数) ────────────────────────
const COEF = {
  launchDelayPerStyleWan: 30,    // 上市阻塞：每款约影响 30 万销售机会
  costDeltaPerStyleWan: 8,       // 成本超标：每款约 8 万 OTB 预算偏差
  newToolingPerMoldWan: 5,       // 新模/新楦：5 万/模
  cancelledSkuWan: 12,           // 取消款款位补款估算：12 万/款
  supplyDelayWan: 2,             // 供应链延期机会成本：2 万/款
  openReviewUncertaintyWan: 0.5, // 未关闭评审架构不确定性：0.5 万/款
} as const;

// ─── Impact with money ───────────────────────────────────────────────────────

export type DrilldownFilter = 'open' | 'blocking' | 'revision' | 'rereview' | 'all' | null;

export interface ImpactDimensionWithMoney {
  id: string;
  title: string;
  icon: string;
  count: number;
  moneyWan: number;
  severity: 'critical' | 'high' | 'medium' | 'none';
  detail: string;
  affectedItems: string[];
  drilldownFilter: DrilldownFilter;
}

export function buildImpactWithMoney(
  reviews: ReviewDecisionRow[],
  actions: ReviewActionRow[],
): ImpactDimensionWithMoney[] {
  void actions;

  const launchBlocked = reviews.filter((r) => r.blocked && !r.closed);
  const costIssues    = reviews.filter((r) => r.conclusion === 'cost_down' && !r.closed);
  const cancelled     = reviews.filter((r) => r.conclusion === 'cancel');
  const moldIssues    = reviews.filter((r) => r.conclusion === 'structure_adjust' && !r.closed);
  const matIssues     = reviews.filter((r) => r.conclusion === 'material_rework' && !r.closed);
  const openReviews   = reviews.filter((r) => !r.closed);

  return [
    {
      id: 'launch',
      title: '对波段上市的影响',
      icon: '📅',
      count: launchBlocked.length,
      moneyWan: launchBlocked.length * COEF.launchDelayPerStyleWan,
      severity: launchBlocked.length > 2 ? 'critical' : launchBlocked.length > 0 ? 'high' : 'none',
      detail: launchBlocked.length > 0
        ? `${launchBlocked.length} 款阻塞影响 ${[...new Set(launchBlocked.map((r) => r.waveId.toUpperCase()))].join('、')} 上市节点，按行业经验每款约 ${COEF.launchDelayPerStyleWan} 万销售机会。`
        : '当前无上市阻塞项，各波段上市节点正常推进。',
      affectedItems: launchBlocked.map((r) => `${r.skuCode} ${r.styleName}`),
      drilldownFilter: 'blocking',
    },
    {
      id: 'cost',
      title: '对成本毛利的影响',
      icon: '💰',
      count: costIssues.length,
      moneyWan: costIssues.length * COEF.costDeltaPerStyleWan,
      severity: costIssues.length > 2 ? 'critical' : costIssues.length > 0 ? 'high' : 'none',
      detail: costIssues.length > 0
        ? `${costIssues.length} 款降本决议未关闭，OTB 成本预测偏差，每款预估 ${COEF.costDeltaPerStyleWan} 万成本影响，毛利率有下滑风险。`
        : '成本决议均已关闭，毛利率预测可信度高。',
      affectedItems: costIssues.map((r) => `${r.skuCode} ${r.styleName}`),
      drilldownFilter: 'revision',
    },
    {
      id: 'sku-arch',
      title: '对 SKU 结构的影响',
      icon: '📊',
      count: cancelled.length,
      moneyWan: cancelled.length * COEF.cancelledSkuWan,
      severity: cancelled.length > 1 ? 'high' : cancelled.length > 0 ? 'medium' : 'none',
      detail: cancelled.length > 0
        ? `${cancelled.length} 款已取消，款位空缺补款预估 ${COEF.cancelledSkuWan} 万/款，需商品企划评估补款方案。`
        : '无取消款，波段 SKU 结构完整。',
      affectedItems: cancelled.map((r) => `${r.skuCode} ${r.styleName}`),
      drilldownFilter: 'all',
    },
    {
      id: 'mold',
      title: '对新模 / 新楦预算的影响',
      icon: '🔧',
      count: moldIssues.length,
      moneyWan: moldIssues.length * COEF.newToolingPerMoldWan,
      severity: moldIssues.length > 0 ? 'high' : 'none',
      detail: moldIssues.length > 0
        ? `${moldIssues.length} 款需调结构，按 ${COEF.newToolingPerMoldWan} 万/模估算新模预算，同步影响开模周期和样品节点。`
        : '当前无需调结构款式，新模/新楦预算不受影响。',
      affectedItems: moldIssues.map((r) => `${r.skuCode} ${r.styleName}`),
      drilldownFilter: 'revision',
    },
    {
      id: 'supply',
      title: '对供应链交期的影响',
      icon: '🏭',
      count: matIssues.length + launchBlocked.length,
      moneyWan: (matIssues.length + launchBlocked.length) * COEF.supplyDelayWan,
      severity: (matIssues.length + launchBlocked.length) > 2
        ? 'critical'
        : (matIssues.length + launchBlocked.length) > 0 ? 'high' : 'none',
      detail: matIssues.length > 0 || launchBlocked.length > 0
        ? `${matIssues.length} 款材料待确认 + ${launchBlocked.length} 款阻塞，合计影响 ${matIssues.length + launchBlocked.length} 款供应链排期，每款延期机会成本约 ${COEF.supplyDelayWan} 万。`
        : '供应链节点无重大风险。',
      affectedItems: [...matIssues, ...launchBlocked].map((r) => `${r.skuCode} ${r.styleName}`),
      drilldownFilter: 'blocking',
    },
    {
      id: 'arch-completeness',
      title: '对商品架构完整性的影响',
      icon: '🏗️',
      count: openReviews.length,
      moneyWan: openReviews.length * COEF.openReviewUncertaintyWan,
      severity: openReviews.length > 5 ? 'medium' : 'none',
      detail: openReviews.length > 0
        ? `${openReviews.length} 条评审尚未关闭，波段选款架构相关款式状态待确认，含 ${(openReviews.length * COEF.openReviewUncertaintyWan).toFixed(0)} 万不确定性。`
        : '所有评审已关闭，商品架构完整性良好。',
      affectedItems: openReviews.slice(0, 5).map((r) => `${r.skuCode} ${r.styleName}`),
      drilldownFilter: 'open',
    },
  ];
}

// ─── SLA Metrics ─────────────────────────────────────────────────────────────

export interface SlaWeekBucket {
  weekLabel: string;
  total: number;
  passed: number;
  overdue: number;
}

export interface SlaMetrics {
  avgSlaDays: number;
  slaCompliantCount: number;
  slaTotal: number;
  slaRate: number;
  weeklyBuckets: SlaWeekBucket[];
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'W??';
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
  return `W${week}`;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function buildSlaMetrics(reviews: ReviewDecisionRow[]): SlaMetrics {
  if (reviews.length === 0) {
    return { avgSlaDays: 0, slaCompliantCount: 0, slaTotal: 0, slaRate: 100, weeklyBuckets: [] };
  }

  const slaDaysArr = reviews
    .map((r) => daysBetween(r.reviewDate, r.dueDate))
    .filter((d) => d > 0);
  const avgSlaDays = slaDaysArr.length > 0
    ? Math.round(slaDaysArr.reduce((s, d) => s + d, 0) / slaDaysArr.length)
    : 0;

  const slaCompliantCount = reviews.filter((r) => !r.overdue).length;
  const slaTotal = reviews.length;
  const slaRate = Math.round((slaCompliantCount / slaTotal) * 100);

  const weekMap = new Map<string, { total: number; passed: number; overdue: number }>();
  for (const r of reviews) {
    const wk = getWeekLabel(r.reviewDate);
    if (!weekMap.has(wk)) weekMap.set(wk, { total: 0, passed: 0, overdue: 0 });
    const b = weekMap.get(wk)!;
    b.total++;
    if (r.conclusion === 'pass' || r.conclusion === 'pass_with_changes') b.passed++;
    if (r.overdue) b.overdue++;
  }

  const weeklyBuckets: SlaWeekBucket[] = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([weekLabel, v]) => ({ weekLabel, ...v }));

  return { avgSlaDays, slaCompliantCount, slaTotal, slaRate, weeklyBuckets };
}

// ─── History Trail ────────────────────────────────────────────────────────────

export interface StyleTrailEntry {
  reviewId: string;
  reviewDate: string;
  reviewType: string;
  conclusion: string;
  issueDescription: string;
  changeRequest: string;
  owner: string;
  closed: boolean;
  blocked: boolean;
  roundNumber: number;
  participants: string[];
}

export interface StyleReviewHistory {
  styleId: string;
  skuCode: string;
  styleName: string;
  seriesName: string;
  waveId: string;
  rounds: StyleTrailEntry[];
}

const PARTICIPANTS_BY_TYPE: Record<string, string[]> = {
  concept_review:   ['商品企划', '设计总监'],
  prototype_review: ['设计总监', '开发总监', '商品企划'],
  sample_review:    ['设计总监', '开发总监', '商品企划', '品质'],
  cost_review:      ['成本核算', '供应链', '商品企划'],
  gate_review:      ['商品总监', '设计总监', '开发总监', '供应链', '财务'],
};

export function buildHistoryTrail(reviews: ReviewDecisionRow[]): StyleReviewHistory[] {
  const styleMap = new Map<string, StyleReviewHistory>();
  for (const r of reviews) {
    if (!styleMap.has(r.styleId)) {
      styleMap.set(r.styleId, {
        styleId: r.styleId,
        skuCode: r.skuCode,
        styleName: r.styleName,
        seriesName: r.seriesName,
        waveId: r.waveId,
        rounds: [],
      });
    }
    styleMap.get(r.styleId)!.rounds.push({
      reviewId: r.reviewId,
      reviewDate: r.reviewDate,
      reviewType: r.reviewType,
      conclusion: r.conclusion,
      issueDescription: r.issueDescription,
      changeRequest: r.changeRequest,
      owner: r.owner,
      closed: r.closed,
      blocked: r.blocked,
      roundNumber: 0,
      participants: PARTICIPANTS_BY_TYPE[r.reviewType] ?? ['商品企划', '设计总监', '开发总监'],
    });
  }

  const result: StyleReviewHistory[] = [];
  for (const hist of styleMap.values()) {
    hist.rounds.sort((a, b) => a.reviewDate.localeCompare(b.reviewDate));
    hist.rounds.forEach((r, i) => { r.roundNumber = i + 1; });
    result.push(hist);
  }

  return result.sort((a, b) => b.rounds.length - a.rounds.length);
}
