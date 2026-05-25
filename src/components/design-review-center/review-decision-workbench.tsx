'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { REVIEW_TYPE_LABELS } from '@/config/design-review-center/labels';
import { ACTION_STATUS_MAP } from '@/config/design-review-center/status-map';
import { formatDate } from '@/lib/design-review-center/helpers/date';
import type {
  ReviewActionRow,
  ReviewDecisionCenterSummary,
  ReviewDecisionRow,
} from '@/lib/design-review-center/selectors/reviews';
import {
  buildImpactWithMoney,
  type ImpactDimensionWithMoney,
} from '@/lib/design-review-center/review-decision-derivations';
import ReviewSlaPanel from './review/ReviewSlaPanel';
import ReviewHistoryTrail from './review/ReviewHistoryTrail';
import FloatingModuleNav from './floating-module-nav';
import type { DesignPlanningRelatedModuleLink } from '@/lib/design-review-center/types';

const rdcIc = 'w-2.5 h-2.5';
const RDC_PAGE_SECTIONS = [
  {
    anchor: '#rdc-overview',
    label: '决议总览',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={rdcIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="9" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" opacity="0.4" />
        <rect x="6" y="5" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" opacity="0.7" />
        <rect x="11" y="1" width="3" height="14" rx="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    anchor: '#rdc-risk',
    label: '风险预警',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={rdcIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1.5 14.5 13.5H1.5L8 1.5z" />
        <line x1="8" y1="6" x2="8" y2="9.5" />
        <circle cx="8" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    anchor: '#rdc-work-orders',
    label: '决议工单',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={rdcIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="12" height="12" rx="1.5" />
        <line x1="5" y1="6" x2="11" y2="6" />
        <line x1="5" y1="9" x2="11" y2="9" />
        <line x1="5" y1="12" x2="9" y2="12" />
      </svg>
    ),
  },
  {
    anchor: '#rdc-impact',
    label: '经营影响',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={rdcIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6.5" />
        <text x="8" y="11" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">¥</text>
      </svg>
    ),
  },
  {
    anchor: '#rdc-stage-matrix',
    label: '阶段矩阵',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={rdcIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    anchor: '#rdc-sla',
    label: 'SLA 趋势',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={rdcIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2,12 5,8 8.5,10 12,5 14,7" />
        <polyline points="11,4 14,4 14,7" />
      </svg>
    ),
  },
  {
    anchor: '#rdc-trail',
    label: '追溯历史',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className={rdcIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6" />
        <polyline points="8,4 8,8 11,10" />
      </svg>
    ),
  },
];

const REVIEW_MODULE_LINKS: DesignPlanningRelatedModuleLink[] = [
  {
    linkId: 'rdc-overview',
    label: '设计企划总览',
    description: '回顾季度健康度与关键决策',
    actionLabel: '查看总览',
    relatedRoute: '/design-review-center?tab=overview',
    category: 'internal',
    icon: '📊',
  },
  {
    linkId: 'rdc-theme',
    label: '主题与系列策略',
    description: '系列方向与设计语言',
    actionLabel: '查看主题',
    relatedRoute: '/design-review-center?tab=themeStrategy',
    category: 'internal',
    icon: '🎨',
  },
  {
    linkId: 'rdc-arch',
    label: '产品架构',
    description: '品类 / 系列 / 款型架构',
    actionLabel: '查看架构',
    relatedRoute: '/design-review-center?tab=productArchitecture',
    category: 'internal',
    icon: '🧱',
  },
  {
    linkId: 'rdc-dev-pool',
    label: '开发任务池',
    description: '单款设计 brief 与下发状态',
    actionLabel: '查看任务',
    relatedRoute: '/design-review-center?tab=developmentTaskPool',
    category: 'internal',
    icon: '📁',
  },
  {
    linkId: 'rdc-gate',
    label: '波段研发节点',
    description: '波段节点跟踪',
    actionLabel: '查看节点',
    relatedRoute: '/design-review-center?tab=developmentGateTable',
    category: 'internal',
    icon: '🗓️',
  },
  {
    linkId: 'rdc-version',
    label: '设计版本',
    description: '材料配色判断',
    actionLabel: '查看版本',
    relatedRoute: '/design-review-center?tab=designVersionPreview',
    category: 'internal',
    icon: '🖼️',
  },
];

// =============================================================================
// Domain types
// =============================================================================

type ReviewDecisionStatus =
  | 'blocking'
  | 'revision'
  | 'rereview'
  | 'delayed'
  | 'cancelled'
  | 'conditional'
  | 'approved';

type CardFilterKey = 'open' | 'blocking' | 'revision' | 'rereview' | 'all';

interface BusinessImpactFlags {
  launch: boolean;
  cost: boolean;
  mold: boolean;
  material: boolean;
  supply: boolean;
}

interface StyleDecisionCard extends ReviewDecisionRow {
  decisionStatus: ReviewDecisionStatus;
  businessImpact: BusinessImpactFlags;
  priority: number;
  closingQuestion: string;
}

interface RiskAlert {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium';
  affectedStyles: string[];
  affectedCount: number;
  affectedWaves: string[];
  responsibleDept: string;
  recommendedAction: string;
}

interface StageMatrixRow {
  styleId: string;
  skuCode: string;
  styleName: string;
  stages: Record<string, 'not_started' | 'passed' | 'conditional' | 'rereview' | 'blocking' | 'revision'>;
  hasOpenItems: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DECISION_STATUS_META: Record<
  ReviewDecisionStatus,
  { label: string; bgColor: string; textColor: string; borderColor: string; priority: number }
> = {
  blocking:    { label: '阻塞上市',   bgColor: 'bg-rose-100',    textColor: 'text-rose-700',    borderColor: 'border-rose-200',    priority: 1 },
  revision:    { label: '待修改',     bgColor: 'bg-amber-100',   textColor: 'text-amber-700',   borderColor: 'border-amber-200',   priority: 3 },
  rereview:    { label: '待复审',     bgColor: 'bg-blue-100',    textColor: 'text-blue-700',    borderColor: 'border-blue-200',    priority: 4 },
  delayed:     { label: '暂缓',       bgColor: 'bg-orange-100',  textColor: 'text-orange-700',  borderColor: 'border-orange-200',  priority: 5 },
  cancelled:   { label: '取消',       bgColor: 'bg-slate-200',   textColor: 'text-slate-600',   borderColor: 'border-slate-200',   priority: 6 },
  conditional: { label: '修改后通过', bgColor: 'bg-cyan-100',    textColor: 'text-cyan-700',    borderColor: 'border-cyan-200',    priority: 6 },
  approved:    { label: '通过',       bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-emerald-100', priority: 7 },
};

const STAGE_ORDER = [
  'concept_review',
  'prototype_review',
  'sample_review',
  'cost_review',
  'gate_review',
] as const;

const STAGE_LABELS_MAP: Record<string, string> = {
  concept_review:   '概念评审',
  prototype_review: '原型评审',
  sample_review:    '样鞋评审',
  cost_review:      '成本评审',
  gate_review:      '产前确认',
};

const STAGE_CELL: Record<string, { bg: string; text: string; label: string }> = {
  passed:      { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '通过' },
  conditional: { bg: 'bg-cyan-50',    text: 'text-cyan-700',    label: '条件通过' },
  rereview:    { bg: 'bg-blue-50',    text: 'text-blue-700',    label: '待复审' },
  blocking:    { bg: 'bg-rose-100',   text: 'text-rose-700',    label: '阻塞' },
  revision:    { bg: 'bg-amber-50',   text: 'text-amber-700',   label: '待改' },
  not_started: { bg: 'bg-slate-50',   text: 'text-slate-300',   label: '—' },
};

const SEVERITY_STYLE = {
  critical: {
    border: 'border-rose-300',
    bg: 'bg-rose-50',
    badge: 'bg-rose-600 text-white',
    title: 'text-rose-900',
    ring: 'ring-2 ring-rose-300/60 shadow-rose-100',
  },
  high: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    title: 'text-amber-900',
    ring: '',
  },
  medium: {
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    title: 'text-blue-900',
    ring: '',
  },
};

const SEVERITY_LABEL = { critical: '紧急', high: '高风险', medium: '中风险' };

const DIM_SEVERITY_BORDER: Record<ImpactDimensionWithMoney['severity'], string> = {
  critical: 'border-rose-200 bg-rose-50',
  high:     'border-amber-200 bg-amber-50',
  medium:   'border-blue-100 bg-blue-50',
  none:     'border-slate-200 bg-white',
};

const DIM_SEVERITY_VALUE: Record<ImpactDimensionWithMoney['severity'], string> = {
  critical: 'text-rose-600',
  high:     'text-amber-600',
  medium:   'text-blue-600',
  none:     'text-slate-400',
};

// =============================================================================
// Derivation helpers
// =============================================================================

function deriveDecisionStatus(row: ReviewDecisionRow): ReviewDecisionStatus {
  if (row.blocked && !row.closed) return 'blocking';
  if (row.conclusion === 'cancel') return 'cancelled';
  if (row.conclusion === 'pass') return 'approved';
  if (row.conclusion === 'pass_with_changes') return 'conditional';
  if (row.conclusion === 'next_round') return 'rereview';
  if (row.conclusion === 'hold') return row.nextReviewDate ? 'rereview' : 'delayed';
  return 'revision';
}

function deriveImpact(row: ReviewDecisionRow): BusinessImpactFlags {
  return {
    launch:   row.blocked || !!(row.impactScope && (row.impactScope.includes('上市') || row.impactScope.includes('波段'))),
    cost:     row.conclusion === 'cost_down',
    mold:     row.conclusion === 'structure_adjust',
    material: row.conclusion === 'material_rework',
    supply:   row.blocked || row.overdue,
  };
}

function derivePriority(status: ReviewDecisionStatus, overdue: boolean, costRisk: boolean): number {
  if (status === 'blocking') return 1;
  if (overdue) return 2;
  if (costRisk) return 3;
  if (status === 'rereview' || status === 'revision') return 4;
  if (status === 'delayed') return 5;
  if (status === 'conditional' || status === 'cancelled') return 6;
  return 7;
}

function deriveClosingQuestion(row: ReviewDecisionRow, status: ReviewDecisionStatus): string {
  if (status === 'blocking')               return '是否解除阻塞并重新确认上市排期？';
  if (row.conclusion === 'cost_down')      return '是否接受目标成本调整方案？换料、改结构还是吃毛利？';
  if (row.conclusion === 'structure_adjust') return '新结构方案是否具备开发可实现性？是否需要开模审批？';
  if (row.conclusion === 'material_rework')  return '替代材料方案是否已确认？供应商能否在节点内到样？';
  if (status === 'rereview')               return '复审日期是否已排定？修改方向和版本冻结点是否已明确？';
  if (status === 'delayed')                return '是否继续推进此款？若保留，延后到哪个波段？若取消，款位如何处理？';
  if (status === 'cancelled')              return '款位空缺是否需要补款？对波段 SKU 结构有何影响？';
  return '确认通过，是否开始下一开发阶段？资源和节点是否已落实？';
}

function buildStyleDecisionCards(reviews: ReviewDecisionRow[]): StyleDecisionCard[] {
  return reviews
    .map((row) => {
      const status   = deriveDecisionStatus(row);
      const impact   = deriveImpact(row);
      const priority = derivePriority(status, row.overdue, impact.cost);
      return { ...row, decisionStatus: status, businessImpact: impact, priority, closingQuestion: deriveClosingQuestion(row, status) };
    })
    .sort((a, b) => a.priority !== b.priority ? a.priority - b.priority : a.dueDate.localeCompare(b.dueDate));
}

function buildRiskAlerts(reviews: ReviewDecisionRow[], actions: ReviewActionRow[]): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  const launchBlocked = reviews.filter((r) => r.blocked && !r.closed);
  if (launchBlocked.length > 0) {
    alerts.push({
      id: 'launch-delay', title: '上市延期风险',
      severity: 'critical',
      affectedStyles: launchBlocked.map((r) => r.styleName),
      affectedCount: launchBlocked.length,
      affectedWaves: [...new Set(launchBlocked.map((r) => r.waveId.toUpperCase()))],
      responsibleDept: '商品企划 + 设计研发',
      recommendedAction: '立即安排阻塞款专项评审会，3 个工作日内明确通过、修改或取消的最终决议。',
    });
  }

  const costIssues = reviews.filter((r) => r.conclusion === 'cost_down' && !r.closed);
  if (costIssues.length > 0) {
    alerts.push({
      id: 'cost-overrun', title: '成本超标风险',
      severity: costIssues.length > 2 ? 'critical' : 'high',
      affectedStyles: costIssues.map((r) => r.styleName),
      affectedCount: costIssues.length,
      affectedWaves: [...new Set(costIssues.map((r) => r.waveId.toUpperCase()))],
      responsibleDept: '成本核算 + 供应链',
      recommendedAction: '明确降本方向：换料、改结构还是接受毛利下滑。OTB 成本预算需同步更新。',
    });
  }

  const moldIssues = reviews.filter((r) => r.conclusion === 'structure_adjust' && !r.closed);
  if (moldIssues.length > 0) {
    alerts.push({
      id: 'new-mold', title: '新模 / 新楦风险',
      severity: 'high',
      affectedStyles: moldIssues.map((r) => r.styleName),
      affectedCount: moldIssues.length,
      affectedWaves: [...new Set(moldIssues.map((r) => r.waveId.toUpperCase()))],
      responsibleDept: '开发团队 + 供应商',
      recommendedAction: '评估是否涉及开模，同步预算审批流程和开模周期，防止影响样品节点。',
    });
  }

  const materialIssues = reviews.filter((r) => r.conclusion === 'material_rework' && !r.closed);
  if (materialIssues.length > 0) {
    alerts.push({
      id: 'material', title: '材料未确认风险',
      severity: 'high',
      affectedStyles: materialIssues.map((r) => r.styleName),
      affectedCount: materialIssues.length,
      affectedWaves: [...new Set(materialIssues.map((r) => r.waveId.toUpperCase()))],
      responsibleDept: '物料开发 + 工厂',
      recommendedAction: '推进替代材料确认，明确到样和测试节点，防止影响长备料和 BOM 锁定。',
    });
  }

  const multiActionStyles = reviews.filter((r) => !r.closed && r.openActionCount >= 2);
  if (multiActionStyles.length > 0) {
    alerts.push({
      id: 'design-alignment', title: '设计方向不一致风险',
      severity: 'medium',
      affectedStyles: multiActionStyles.map((r) => r.styleName),
      affectedCount: multiActionStyles.length,
      affectedWaves: [...new Set(multiActionStyles.map((r) => r.waveId.toUpperCase()))],
      responsibleDept: '设计总监 + 商品团队',
      recommendedAction: '明确设计方向和版本冻结时间，避免反复修改浪费样品资源和开发工时。',
    });
  }

  const archGap = reviews.filter((r) => r.conclusion === 'cancel' || (r.conclusion === 'hold' && !r.nextReviewDate));
  if (archGap.length > 0) {
    alerts.push({
      id: 'arch-mismatch', title: '商品架构不匹配风险',
      severity: 'medium',
      affectedStyles: archGap.map((r) => r.styleName),
      affectedCount: archGap.length,
      affectedWaves: [...new Set(archGap.map((r) => r.waveId.toUpperCase()))],
      responsibleDept: '商品企划',
      recommendedAction: '确认取消或暂缓款是否需补款，同步商品架构表和波段 SKU 总量。',
    });
  }

  const supplyRiskActions = actions.filter((a) => a.overdue && a.blocked);
  if (supplyRiskActions.length > 0) {
    alerts.push({
      id: 'supply-chain', title: '供应链可实现性风险',
      severity: supplyRiskActions.length > 2 ? 'critical' : 'high',
      affectedStyles: [...new Set(supplyRiskActions.map((a) => a.styleName))],
      affectedCount: new Set(supplyRiskActions.map((a) => a.styleId)).size,
      affectedWaves: [...new Set(supplyRiskActions.map((a) => a.waveId.toUpperCase()))],
      responsibleDept: '供应链 + 工厂',
      recommendedAction: '与供应商确认关键动作可否在节点内完成，必要时启动备用供应商方案。',
    });
  }

  return alerts;
}

function buildStageMatrix(reviews: ReviewDecisionRow[]): StageMatrixRow[] {
  const map = new Map<string, StageMatrixRow>();
  for (const r of reviews) {
    if (!map.has(r.styleId)) {
      map.set(r.styleId, { styleId: r.styleId, skuCode: r.skuCode, styleName: r.styleName, stages: {}, hasOpenItems: false });
    }
    const row = map.get(r.styleId)!;
    let s: StageMatrixRow['stages'][string] = 'not_started';
    if (r.blocked && !r.closed) s = 'blocking';
    else if (r.closed && r.conclusion === 'pass') s = 'passed';
    else if (r.closed && r.conclusion === 'pass_with_changes') s = 'conditional';
    else if (!r.closed && (r.conclusion === 'next_round' || r.conclusion === 'hold')) s = 'rereview';
    else if (!r.closed) s = 'revision';
    else s = 'passed';
    row.stages[r.reviewType] = s;
    if (!r.closed || r.blocked) row.hasOpenItems = true;
  }
  return [...map.values()]
    .sort((a, b) => (b.hasOpenItems ? 1 : 0) - (a.hasOpenItems ? 1 : 0))
    .slice(0, 12);
}

// =============================================================================
// Small reusable UI
// =============================================================================

function SectionHeader({ label, title, subtitle, id }: { label: string; title: string; subtitle?: string; id?: string }) {
  return (
    <div id={id} className="mt-10 mb-5 flex items-start gap-3 scroll-mt-24">
      <span className="mt-0.5 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
        {label}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <div className="flex-1 border-t border-slate-100" />
        </div>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

function DecisionBadge({ status }: { status: ReviewDecisionStatus }) {
  const m = DECISION_STATUS_META[status];
  return (
    <span className={['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', m.bgColor, m.textColor].join(' ')}>
      {m.label}
    </span>
  );
}

function ImpactTags({ impact }: { impact: BusinessImpactFlags }) {
  const tags: { label: string; cls: string }[] = [];
  if (impact.launch)   tags.push({ label: '影响上市', cls: 'bg-rose-50 text-rose-600 border border-rose-200' });
  if (impact.cost)     tags.push({ label: '成本风险', cls: 'bg-amber-50 text-amber-600 border border-amber-200' });
  if (impact.mold)     tags.push({ label: '开模风险', cls: 'bg-violet-50 text-violet-600 border border-violet-200' });
  if (impact.material) tags.push({ label: '材料待确认', cls: 'bg-teal-50 text-teal-600 border border-teal-200' });
  if (impact.supply)   tags.push({ label: '供应链风险', cls: 'bg-orange-50 text-orange-600 border border-orange-200' });
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t.label} className={['rounded px-1.5 py-0.5 text-[10px] font-semibold', t.cls].join(' ')}>
          {t.label}
        </span>
      ))}
    </div>
  );
}

function FilterBar<T extends string>({
  options,
  value,
  onChange,
  count,
}: {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  count?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={[
            'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
            value === key
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
      {count !== undefined && (
        <span className="ml-auto text-xs text-slate-400">{count} 条</span>
      )}
    </div>
  );
}

const ACTION_CLOSURE_KEYWORDS: [string, string][] = [
  ['改设计',       '重新提交效果图并通过设计评审确认'],
  ['改材料',       '替代材料样品到样并完成技术确认'],
  ['改配色',       '新配色方案提交并获商品团队书面确认'],
  ['改底',         '新底台技术确认及样品完成评审'],
  ['改楦',         '新楦型技术确认及样品完成评审'],
  ['改结构',       '结构修改方案完成技术确认，改样通过评审'],
  ['重新报价',     '目标成本范围内报价单已书面确认'],
  ['补样',         '新版样鞋到样并完成评审，结论为通过'],
  ['技术确认',     '工厂技术规格确认单已签署完成'],
  ['商品重新定位', '商品总监确认款位与波段归属，并更新商品架构表'],
];

function getClosureCriteria(actionType: string): string {
  for (const [keyword, criteria] of ACTION_CLOSURE_KEYWORDS) {
    if (actionType.includes(keyword)) return criteria;
  }
  return '按动作描述完成后，由责任人提交确认，经评审会认可后关闭';
}

// =============================================================================
// Filter options
// =============================================================================

const CARD_FILTER_OPTIONS = [
  { key: 'open' as const,     label: '全部未关闭' },
  { key: 'blocking' as const, label: '阻塞上市' },
  { key: 'revision' as const, label: '待修改' },
  { key: 'rereview' as const, label: '待复审 / 暂缓' },
  { key: 'all' as const,      label: '全部' },
];

// =============================================================================
// Props + Main component
// =============================================================================

interface ReviewDecisionWorkbenchProps {
  reviews: ReviewDecisionRow[];
  actions: ReviewActionRow[];
  summary: ReviewDecisionCenterSummary;
}

export default function ReviewDecisionWorkbench({ reviews, actions }: ReviewDecisionWorkbenchProps) {
  const [cardFilter, setCardFilter] = useState<CardFilterKey>('open');
  const [viewMode, setViewMode]     = useState<'card' | 'list'>('card');
  const workOrdersRef               = useRef<HTMLDivElement>(null);

  const allCards   = useMemo(() => buildStyleDecisionCards(reviews), [reviews]);
  const riskAlerts = useMemo(() => buildRiskAlerts(reviews, actions), [reviews, actions]);
  const stageMatrix = useMemo(() => buildStageMatrix(reviews), [reviews]);
  const impactDims  = useMemo(() => buildImpactWithMoney(reviews, actions), [reviews, actions]);

  const mustDecide = useMemo(
    () => allCards.filter((c) => !c.closed && c.priority <= 3).slice(0, 5),
    [allCards],
  );

  const filteredCards = useMemo(() => {
    switch (cardFilter) {
      case 'blocking': return allCards.filter((c) => c.decisionStatus === 'blocking');
      case 'revision': return allCards.filter((c) => c.decisionStatus === 'revision');
      case 'rereview': return allCards.filter((c) => c.decisionStatus === 'rereview' || c.decisionStatus === 'delayed');
      case 'open':     return allCards.filter((c) => !c.closed);
      default:         return allCards;
    }
  }, [allCards, cardFilter]);

  // KPI counters
  const kpiPending     = allCards.filter((c) => !c.closed && c.dueThisWeek).length;
  const kpiApproved    = allCards.filter((c) => c.decisionStatus === 'approved' || c.decisionStatus === 'conditional').length;
  const kpiRevision    = allCards.filter((c) => c.decisionStatus === 'revision' && !c.closed).length;
  const kpiRereview    = allCards.filter((c) => (c.decisionStatus === 'rereview' || c.decisionStatus === 'delayed') && !c.closed).length;
  const kpiCancelled   = allCards.filter((c) => c.decisionStatus === 'cancelled').length;
  const kpiCostRisk    = allCards.filter((c) => c.businessImpact.cost && !c.closed).length;
  const kpiLaunchBlock = allCards.filter((c) => c.businessImpact.launch && !c.closed).length;
  const kpiOverdue     = actions.filter((a) => a.overdue).length;
  const totalCards     = allCards.length;
  const passRate       = totalCards > 0 ? Math.round((kpiApproved / totalCards) * 100) : 0;
  const heroCount      = kpiLaunchBlock + kpiOverdue;

  return (
    <div className="mt-6 space-y-1 pb-20">

      {/* ── A: 决议总览 ─────────────────────────────────────────────────── */}
      <SectionHeader
        id="rdc-overview"
        label="A"
        title="决议总览"
        subtitle="本轮评审关键决策指标，商品总监 30 秒内判断本周核心推进事项"
      />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_2fr_1.6fr]">
        {/* Hero: 阻塞 + 逾期 */}
        <article className={[
          'rounded-2xl border-2 p-6 shadow-md transition',
          heroCount > 0 ? 'border-rose-300 bg-gradient-to-br from-rose-50 to-white' : 'border-slate-200 bg-white',
        ].join(' ')}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-rose-400">BLOCKING · OVERDUE</div>
          <div className={[
            'mt-3 text-5xl font-black tabular-nums',
            heroCount > 0 ? 'text-rose-600' : 'text-slate-300',
          ].join(' ')}>
            {heroCount}
          </div>
          <div className="mt-2 text-sm text-slate-600">阻塞 / 逾期 · 需立即处理</div>
          <div className="mt-4 flex gap-5 text-xs">
            <span className="text-slate-600">
              阻塞上市{' '}
              <strong className={kpiLaunchBlock > 0 ? 'text-rose-600' : 'text-slate-400'}>
                {kpiLaunchBlock}
              </strong>
            </span>
            <span className="text-slate-600">
              逾期动作{' '}
              <strong className={kpiOverdue > 0 ? 'text-rose-600' : 'text-slate-400'}>
                {kpiOverdue}
              </strong>
            </span>
          </div>
        </article>

        {/* Secondary 2×2 */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '通过',   value: kpiApproved,  color: kpiApproved > 0  ? 'text-emerald-600' : 'text-slate-300', sub: '含修改后通过' },
            { label: '待修改', value: kpiRevision,  color: kpiRevision > 0  ? 'text-amber-600'   : 'text-slate-300', sub: '降本/调结构/补料' },
            { label: '待复审', value: kpiRereview,  color: kpiRereview > 0  ? 'text-blue-600'    : 'text-slate-300', sub: '下轮复审队列中' },
            { label: '取消',   value: kpiCancelled, color: kpiCancelled > 0 ? 'text-slate-600'   : 'text-slate-300', sub: '需确认款位补款' },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-400">{item.label}</div>
              <div className={['mt-1.5 text-3xl font-semibold tabular-nums', item.color].join(' ')}>
                {item.value}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">{item.sub}</div>
            </article>
          ))}
        </div>

        {/* Chip zone */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">辅助指标</div>
          <div className="space-y-3">
            {[
              { label: '待拍板',   value: kpiPending,  suffix: ' 款', color: kpiPending > 0  ? 'text-amber-600'   : 'text-slate-300', desc: '本周截止' },
              { label: '成本超标', value: kpiCostRisk, suffix: ' 款', color: kpiCostRisk > 0 ? 'text-amber-600'   : 'text-slate-300', desc: '影响 OTB' },
              { label: '总评审款', value: totalCards,  suffix: ' 条', color: 'text-slate-700', desc: '本轮' },
              { label: '通过率',   value: passRate,    suffix: '%',   color: passRate >= 70 ? 'text-emerald-600' : passRate >= 50 ? 'text-amber-600' : 'text-rose-600', desc: '本轮' },
            ].map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-slate-500">{item.label}</span>
                <div className="flex-shrink-0 text-right">
                  <span className={['text-xl font-semibold tabular-nums', item.color].join(' ')}>
                    {item.value}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.suffix}</span>
                  <span className="ml-1 text-[10px] text-slate-400">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* 管理层必须拍板 */}
      {mustDecide.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-semibold text-amber-900">⚡ 管理层本周必须拍板</span>
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {mustDecide.length} 项
            </span>
          </div>
          <div className="space-y-2">
            {mustDecide.map((item, idx) => (
              <div key={item.reviewId} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-900 text-[10px] font-bold text-white">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={'/design-review-center/item/' + item.styleId}
                      className="text-sm font-semibold text-slate-900 hover:text-slate-600"
                    >
                      {item.skuCode} {item.styleName}
                    </Link>
                    <DecisionBadge status={item.decisionStatus} />
                    <span className="text-xs text-slate-400">{item.seriesName} · {item.waveId.toUpperCase()}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">{item.closingQuestion}</div>
                </div>
                <div className="shrink-0 text-xs text-slate-400">截止 {formatDate(item.dueDate)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── B: 关键风险预警 ────────────────────────────────────────────── */}
      {riskAlerts.length > 0 && (
        <>
          <SectionHeader
            id="rdc-risk"
            label="B"
            title="关键风险预警"
            subtitle="按鞋类真实业务风险分类，每项附风险对象、影响波段、责任部门和建议决策"
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {riskAlerts.map((alert) => {
              const s = SEVERITY_STYLE[alert.severity];
              const isCritical = alert.severity === 'critical';
              return (
                <article
                  key={alert.id}
                  className={[
                    'rounded-2xl border-2 p-5 shadow-sm transition hover:-translate-y-0.5',
                    s.border, s.bg,
                    isCritical ? s.ring : '',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={['text-sm font-semibold', s.title].join(' ')}>{alert.title}</div>
                    <span className={['shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold', s.badge].join(' ')}>
                      {SEVERITY_LABEL[alert.severity]}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <div className="text-slate-400">风险对象</div>
                      <div className="mt-0.5 font-medium leading-4 text-slate-700">
                        {alert.affectedStyles.slice(0, 2).join('、')}
                        {alert.affectedStyles.length > 2 && ` 等 ${alert.affectedStyles.length} 款`}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">影响波段</div>
                      <div className="mt-0.5 font-medium text-slate-700">{alert.affectedWaves.join(' / ') || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">责任部门</div>
                      <div className="mt-0.5 font-medium leading-4 text-slate-700">{alert.responsibleDept}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">影响款数</div>
                      <div className="mt-0.5 text-lg font-semibold text-slate-900">{alert.affectedCount}</div>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-white/60 pt-2.5 text-xs text-slate-600">
                    <span className="font-medium text-slate-500">建议决策：</span>
                    {alert.recommendedAction}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* ── C: 款式决议工单 ────────────────────────────────────────────── */}
      <SectionHeader
        id="rdc-work-orders"
        label="C"
        title="款式决议工单"
        subtitle="决议 + 待办动作 + 关闭标准一张卡，按优先级排序；卡片 / 列表视图切换"
      />

      <div ref={workOrdersRef} className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar options={CARD_FILTER_OPTIONS} value={cardFilter} onChange={setCardFilter} count={filteredCards.length} />
        <div className="flex overflow-hidden rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={[
              'px-3 py-1.5 text-xs font-medium transition',
              viewMode === 'card' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            卡片
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={[
              'border-l border-slate-200 px-3 py-1.5 text-xs font-medium transition',
              viewMode === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            列表
          </button>
        </div>
      </div>

      {/* List view */}
      {viewMode === 'list' && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {filteredCards.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">当前筛选条件下无款式评审记录</div>
          ) : (
            filteredCards.map((card) => (
              <div
                key={card.reviewId}
                className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0 hover:bg-slate-50"
              >
                <DecisionBadge status={card.decisionStatus} />
                <Link
                  href={'/design-review-center/item/' + card.styleId}
                  className="min-w-0 flex-1 text-sm font-medium text-slate-900 hover:text-slate-600"
                >
                  {card.skuCode} {card.styleName}
                </Link>
                <span className="text-xs text-slate-400">{card.waveId.toUpperCase()}</span>
                {card.overdue && !card.closed && (
                  <span className="text-xs font-medium text-rose-600">逾期</span>
                )}
                <span className="text-xs text-slate-400">
                  {actions.filter((a) => a.styleId === card.styleId && a.status !== 'closed').length} 待办
                </span>
                <span className="shrink-0 text-xs text-slate-400">截止 {formatDate(card.dueDate)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Card view */}
      {viewMode === 'card' && (
        <div className="mt-4 space-y-4">
          {filteredCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
              当前筛选条件下无款式评审记录
            </div>
          ) : (
            filteredCards.map((card) => {
              const sm = DECISION_STATUS_META[card.decisionStatus];
              const styleActions = actions.filter(
                (a) => a.styleId === card.styleId && a.status !== 'closed' && a.status !== 'reviewed',
              );
              return (
                <article key={card.reviewId} className={['rounded-2xl border bg-white p-5 shadow-sm', sm.borderColor].join(' ')}>
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <Link
                          href={'/design-review-center/item/' + card.styleId}
                          className="text-base font-semibold text-slate-900 hover:text-slate-600"
                        >
                          {card.skuCode} {card.styleName}
                        </Link>
                        <span className={['text-sm font-semibold', sm.textColor].join(' ')}>· {sm.label}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {card.seriesName} · {card.categoryName} · {card.waveId.toUpperCase()}
                        {' · '}{REVIEW_TYPE_LABELS[card.reviewType as keyof typeof REVIEW_TYPE_LABELS] ?? card.reviewType}
                        {' · 评审日 '}{formatDate(card.reviewDate)}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <DecisionBadge status={card.decisionStatus} />
                      {card.overdue && !card.closed && (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-600">逾期</span>
                      )}
                      {card.dueThisWeek && !card.closed && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">本周待拍板</span>
                      )}
                    </div>
                  </div>

                  {/* 评审意见 + 修改要求 */}
                  <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                    {card.issueDescription && (
                      <div>
                        <div className="mb-0.5 font-medium text-slate-500">核心评审意见</div>
                        <div className="leading-5 text-slate-700">{card.issueDescription}</div>
                      </div>
                    )}
                    {card.changeRequest && (
                      <div>
                        <div className="mb-0.5 font-medium text-slate-500">必改项</div>
                        <div className="leading-5 text-slate-700">{card.changeRequest}</div>
                      </div>
                    )}
                  </div>

                  {/* 嵌入待办动作 */}
                  {styleActions.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <div className="text-xs font-medium text-slate-500">待办动作（{styleActions.length} 条）</div>
                      {styleActions.map((action) => {
                        const statusMeta = ACTION_STATUS_MAP[action.status];
                        return (
                          <div key={action.actionId} className="flex flex-wrap items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                            <span className={['rounded px-1.5 py-0.5 text-[10px] font-semibold', statusMeta.bgColor, statusMeta.textColor].join(' ')}>
                              {statusMeta.label}
                            </span>
                            <span className="font-medium text-slate-700">{action.actionType}</span>
                            {action.overdue && <span className="text-rose-500">逾期</span>}
                            {action.blocked && <span className="text-rose-600 font-semibold">阻塞上市</span>}
                            <span className="ml-auto text-slate-400">{action.owner} · 截止 {formatDate(action.dueDate)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 管理层拍板问题 */}
                  {!card.closed && (
                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-xs">
                      <span className="font-medium text-slate-500">管理层待拍板：</span>
                      <span className="text-slate-700">{card.closingQuestion}</span>
                    </div>
                  )}

                  <div className="mt-3"><ImpactTags impact={card.businessImpact} /></div>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-400">
                    <span>决策人：{card.owner}</span>
                    <span>截止：{formatDate(card.dueDate)}</span>
                    {card.nextReviewDate && (
                      <span className="font-medium text-blue-500">下次复审：{formatDate(card.nextReviewDate)}</span>
                    )}
                    {card.impactScope && <span>影响范围：{card.impactScope}</span>}
                    {card.openActionCount > 0 && (
                      <span className="font-medium text-amber-600">待办动作 {card.openActionCount} 条</span>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* ── D: 决议对经营目标的影响 ─────────────────────────────────────── */}
      <SectionHeader
        id="rdc-impact"
        label="D"
        title="决议对经营目标的影响"
        subtitle="按行业经验系数量化各维度金额影响，点击查看相关款式工单"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {impactDims.map((dim) => (
          <article key={dim.id} className={['rounded-2xl border p-5', DIM_SEVERITY_BORDER[dim.severity]].join(' ')}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{dim.icon}</span>
              <div className="text-sm font-semibold text-slate-900">{dim.title}</div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={['text-3xl font-black tabular-nums', DIM_SEVERITY_VALUE[dim.severity]].join(' ')}>
                ¥{dim.moneyWan.toFixed(0)}
              </span>
              <span className="text-xs text-slate-500">万</span>
              <span className="ml-auto text-xs text-slate-400">
                {dim.count > 0 ? dim.count + ' 款' : '无影响'}
              </span>
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-600">{dim.detail}</div>
            {dim.affectedItems.length > 0 && (
              <div className="mt-1.5 text-[11px] text-slate-400">
                {dim.affectedItems.slice(0, 3).join('、')}
                {dim.affectedItems.length > 3 && (' 等 ' + dim.affectedItems.length + ' 款')}
              </div>
            )}
            {dim.drilldownFilter && dim.count > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCardFilter(dim.drilldownFilter as CardFilterKey);
                  setTimeout(() => workOrdersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                }}
                className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                查看相关款 →
              </button>
            )}
          </article>
        ))}
      </div>

      {/* ── E: 款式 × 阶段评审矩阵（折叠）─────────────────────────────── */}
      {stageMatrix.length > 0 && (
        <>
          <SectionHeader
            id="rdc-stage-matrix"
            label="E"
            title="款式 × 阶段评审矩阵"
            subtitle="追溯各款式在每个评审阶段的决议状态，默认折叠，用于复盘与追溯"
          />
          <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <span>查看 {stageMatrix.length} 款 × {STAGE_ORDER.length} 阶段决议矩阵</span>
              <span className="text-xs text-slate-400">点击展开 · 适合复盘与追溯</span>
            </summary>
            <div className="border-t border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-left font-medium text-slate-500" style={{ minWidth: 160 }}>款式</th>
                      {STAGE_ORDER.map((stage) => (
                        <th key={stage} className="px-3 py-3 text-center font-medium text-slate-500" style={{ minWidth: 84 }}>
                          {STAGE_LABELS_MAP[stage]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stageMatrix.map((row) => (
                      <tr key={row.styleId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link href={'/design-review-center/item/' + row.styleId} className="font-medium text-slate-900 hover:text-slate-600">
                            {row.styleName}
                          </Link>
                          <div className="text-slate-400">{row.skuCode}</div>
                        </td>
                        {STAGE_ORDER.map((stage) => {
                          const status = row.stages[stage] ?? 'not_started';
                          const s = STAGE_CELL[status] ?? STAGE_CELL['not_started'];
                          return (
                            <td key={stage} className="px-3 py-3 text-center">
                              <span className={['inline-block rounded px-2 py-0.5 font-medium', s.bg, s.text].join(' ')}>{s.label}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-4 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">
                {Object.entries(STAGE_CELL).map(([, s]) => (
                  <div key={s.label} className="flex items-center gap-1">
                    <span className={['inline-block rounded px-1.5 py-0.5 font-medium', s.bg, s.text].join(' ')}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </>
      )}

      {/* ── F: 决议 SLA 与趋势 ───────────────────────────────────────────── */}
      <SectionHeader
        id="rdc-sla"
        label="F"
        title="决议 SLA 与趋势"
        subtitle="平均决议时长 · SLA 达标率 · 近 8 周评审趋势"
      />
      <ReviewSlaPanel reviews={reviews} />

      {/* ── G: 决议追溯历史 ─────────────────────────────────────────────── */}
      <SectionHeader
        id="rdc-trail"
        label="G"
        title="决议追溯历史"
        subtitle="选择款式查看该款的多轮评审决议链，了解为什么改了又改"
      />
      <p className="mb-4 text-xs text-slate-400">
        按评审轮次展示每款的决议演变，多轮评审款式自动置顶。
      </p>
      <ReviewHistoryTrail reviews={reviews} />

      <FloatingModuleNav
        moduleLinks={REVIEW_MODULE_LINKS}
        pageSections={RDC_PAGE_SECTIONS}
      />
    </div>
  );
}
