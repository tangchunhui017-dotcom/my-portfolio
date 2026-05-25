'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import type { DesignPlanningRelatedModuleLink } from '@/lib/design-review-center/types';
import { GATE_GROUP_LABELS, GATE_TYPE_LABELS } from '@/config/design-review-center/labels';
import type {
  DecisionRecommendation,
  GateCriterion,
  GateDeliverable,
  GateTableRow,
  GateWaveGroup,
  NormalizedGateStatus,
} from '@/lib/design-review-center/selectors/gates';
import FloatingModuleNav from './floating-module-nav';
import {
  buildGanttItems,
  buildDependencyData,
  buildResourceLoads,
  buildSlaData,
} from '@/lib/design-review-center/gate-derivations';
import GateGanttChart from './gate/GateGanttChart';
import GateDependencyGraph from './gate/GateDependencyGraph';
import GateWorkCenter from './gate/GateWorkCenter';
import GateSlaPanel from './gate/GateSlaPanel';

// ─── Props ───────────────────────────────────────────────────────────────────

interface DevelopmentWaveTableProps {
  groups: GateWaveGroup[];
  referenceDate: string;
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<NormalizedGateStatus, { label: string; cls: string }> = {
  completed:      { label: '已完成',   cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  on_track:       { label: '推进中',   cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
  due_this_week:  { label: '本周到期', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  delayed:        { label: '已逾期',   cls: 'bg-red-50 text-red-700 border border-red-200' },
  blocked:        { label: '阻塞',     cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
  needs_decision: { label: '待决策',   cls: 'bg-violet-50 text-violet-700 border border-violet-200' },
};

const DECISION_BADGE: Record<DecisionRecommendation, { label: string; cls: string; icon: string }> = {
  pass:             { label: '可通过',     cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: '✓' },
  conditional_pass: { label: '附条件通过', cls: 'bg-sky-50 text-sky-700 border border-sky-200',           icon: '◐' },
  hold:             { label: '暂缓待完善', cls: 'bg-amber-50 text-amber-700 border border-amber-200',     icon: '⏸' },
  rework:           { label: '需返工',     cls: 'bg-orange-50 text-orange-700 border border-orange-200',  icon: '↩' },
  escalate:         { label: '升级决策',   cls: 'bg-rose-50 text-rose-700 border border-rose-200',        icon: '▲' },
  cancel:           { label: '建议取消',   cls: 'bg-slate-50 text-slate-600 border border-slate-200',        icon: '✕' },
};

const PRIORITY_BADGE: Record<string, { cls: string }> = {
  P0: { cls: 'bg-rose-50 text-rose-700 border border-rose-200 font-bold' },
  P1: { cls: 'bg-orange-50 text-orange-700 border border-orange-200 font-bold' },
  P2: { cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  P3: { cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};


function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-700">{score}</span>
    </div>
  );
}
function appendQueryParams(route: string, params: string) {
  if (!params) return route;
  return `${route}${route.includes('?') ? '&' : '?'}${params}`;
}


// ─── Section helpers ──────────────────────────────────────────────────────────

function SectionHeader({
  badge,
  title,
  sub,
}: {
  badge: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {badge}
      </span>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
      <div className="flex-1 border-t border-slate-100" />
    </div>
  );
}

// ─── Section A: Gate 指挥舱 (hero dark) ──────────────────────────────────────

function GateHeroCockpit({ rows }: { rows: GateTableRow[] }) {
  const p0Blocking = rows.filter((r) => !r.completed && r.priority === 'P0').length;
  const overdueLaunch = rows.filter((r) => !r.completed && r.businessImpact.launch && r.delayDays > 0).length;
  const newThisWeek = rows.filter((r) => !r.completed && r.dueInDays >= 0 && r.dueInDays <= 7).length;
  const p1Impact = rows.filter((r) => !r.completed && r.priority === 'P1').length;
  const missingDel = rows.filter((r) => !r.completed && r.missingDeliverables.length > 0).length;
  const cannotPass = rows.filter(
    (r) => !r.completed && ['hold', 'rework', 'escalate'].includes(r.decisionRecommendation),
  ).length;
  const canPass = rows.filter(
    (r) => !r.completed && ['pass', 'conditional_pass'].includes(r.decisionRecommendation),
  ).length;
  const mustDecide = rows.filter(
    (r) => !r.completed && ['due_this_week', 'needs_decision'].includes(r.normalizedStatus),
  ).length;
  const activePending = rows.filter((r) => !r.completed);
  const avgReadiness =
    activePending.length > 0
      ? Math.round(activePending.reduce((s, r) => s + r.gateReadinessScore, 0) / activePending.length)
      : 0;

  return (
    <div className="grid xl:grid-cols-[1.5fr_2.5fr_2fr] gap-3">
      {/* Hero P0 card */}
      <article className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-6">
        <div className="text-xs font-bold uppercase tracking-widest text-rose-500">P0 · BLOCKING</div>
        <div className="mt-3 text-5xl font-black tabular-nums text-rose-600">{p0Blocking}</div>
        <div className="mt-2 text-sm text-rose-700">P0 阻塞上市 · 立即决策</div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-rose-500">
          <span>逾期上市风险款 <strong className="text-rose-700">{overdueLaunch}</strong></span>
          <span>本周新增阻塞 <strong className="text-rose-700">{newThisWeek}</strong></span>
        </div>
      </article>
      {/* Secondary 4 KPI grid */}
      <article className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
        {[
          { label: 'P1 影响成本/BOM/OTB', value: p1Impact, warn: p1Impact > 2 },
          { label: '缺失交付物节点',        value: missingDel, warn: missingDel > 0 },
          { label: '不可过节点数',           value: cannotPass, warn: cannotPass > 3 },
          { label: '可过节点数',             value: canPass, good: canPass > 0 },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-xl border px-3 py-3 ${
              kpi.warn
                ? 'border-amber-200 bg-amber-50'
                : kpi.good
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-slate-200 bg-white'
            }`}
          >
            <div
              className={`text-2xl font-black tabular-nums ${
                kpi.warn ? 'text-amber-700' : kpi.good ? 'text-emerald-700' : 'text-slate-700'
              }`}
            >
              {kpi.value}
            </div>
            <div className="mt-0.5 text-[11px] leading-tight text-slate-500">{kpi.label}</div>
          </div>
        ))}
      </article>
      {/* 今日必拍板 + 平均准备度 */}
      <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 shadow-sm">
        <div
          className={`rounded-xl border px-4 py-3 ${
            mustDecide > 0 ? 'border-fuchsia-200 bg-fuchsia-50' : 'border-slate-200 bg-white'
          }`}
        >
          <div className={`text-3xl font-black tabular-nums ${mustDecide > 0 ? 'text-fuchsia-700' : 'text-slate-400'}`}>
            {mustDecide}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">今日 / 本周必拍板</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
          <div className="flex items-end gap-2">
            <span
              className={`text-3xl font-black tabular-nums ${
                avgReadiness >= 80 ? 'text-emerald-600' : avgReadiness >= 50 ? 'text-amber-600' : 'text-rose-600'
              }`}
            >
              {avgReadiness}
            </span>
            <span className="mb-1 text-xs text-slate-400">/ 100</span>
          </div>
          <div className="mt-0.5 text-xs text-slate-500">平均节点准备度</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${
                avgReadiness >= 80 ? 'bg-emerald-500' : avgReadiness >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${avgReadiness}%` }}
            />
          </div>
        </div>
      </article>
    </div>
  );
}

// ─── Section A’: Gate 管理判断 ─────────────────────────────────────────────────────

function deriveGateConclusion(rows: GateTableRow[], groups: GateWaveGroup[]) {
  const active = rows.filter((r) => !r.completed);
  const critical = active.filter((r) => r.priority === 'P0' || r.priority === 'P1' || r.blocked);

  if (critical.length === 0) {
    return {
      level: 'healthy' as const,
      mainRiskSummary: '当前无重大节点风险，所有关键节点按计划推进。',
      affectedWave: '—',
      affectedGateCount: 0,
      affectedStyleCount: 0,
      expectedDelayDays: 0,
      recommendedAction: '保持现有推进节奏，关注本周到期节点。',
    };
  }

  const waveRisk = groups
    .map((g) => {
      const blocked = g.rows.filter((r) => r.blocked && !r.completed);
      const delayed = g.rows.filter((r) => r.delayDays > 0 && !r.completed);
      const launchRows = g.rows.filter(
        (r) => r.businessImpact.launch && !r.completed && (r.blocked || r.delayDays > 0),
      );
      const maxDelay = Math.max(0, ...delayed.map((r) => r.delayDays));
      const styleIds = new Set([...blocked, ...delayed].map((r) => r.styleId));
      return {
        waveName: g.waveName,
        risk: blocked.length * 3 + launchRows.length * 2 + delayed.length,
        blockedCount: blocked.length,
        delayedCount: delayed.length,
        maxDelay,
        styleIds,
      };
    })
    .sort((a, b) => b.risk - a.risk);

  const worst = waveRisk[0]!;
  const maxDelay = Math.max(0, ...critical.map((r) => r.delayDays));
  const p0Count = active.filter((r) => r.priority === 'P0').length;
  const launchCount = active.filter((r) => r.businessImpact.launch && (r.blocked || r.delayDays > 0)).length;

  let mainRiskSummary: string;
  let recommendedAction: string;
  let level: 'critical' | 'warning' | 'info';

  if (p0Count > 0 && maxDelay >= 14) {
    const blockedNames = critical
      .filter((r) => r.blocked && r.priority === 'P0')
      .slice(0, 2)
      .map((r) => r.gateName)
      .join('、');
    mainRiskSummary = `${worst.waveName} 最高风险：${blockedNames || 'P0 节点'} 已逾期 ${maxDelay} 天，若 3 天内未解除将影响上市节奏。`;
    recommendedAction = '立即召开阻塞评审会，确认解除方案或提交替代路径，48 小时内反馈商品企划。';
    level = 'critical';
  } else if (launchCount > 0) {
    mainRiskSummary = `${worst.waveName} 有 ${launchCount} 个 节点影响上市节奏，最大逾期 ${maxDelay} 天，需本周优先推进。`;
    recommendedAction = '确认上市影响节点的最新进展，逐款核实可上市 SKU 数量，并反馈商品企划。';
    level = 'warning';
  } else {
    mainRiskSummary = `当前有 ${critical.length} 个节点需重点关注，${worst.waveName} 风险最高，建议本周内逐一过堂。`;
    recommendedAction = '按优先级安排节点评审，确认责任人和截止时间。';
    level = 'info';
  }

  return {
    level,
    mainRiskSummary,
    affectedWave: worst.waveName,
    affectedGateCount: worst.blockedCount + worst.delayedCount,
    affectedStyleCount: worst.styleIds.size,
    expectedDelayDays: worst.maxDelay,
    recommendedAction,
  };
}

function GateManagementConclusion({
  rows,
  groups,
}: {
  rows: GateTableRow[];
  groups: GateWaveGroup[];
}) {
  const c = useMemo(() => deriveGateConclusion(rows, groups), [rows, groups]);
  const borderCls =
    c.level === 'critical' ? 'border-rose-200' : c.level === 'warning' ? 'border-amber-200' : c.level === 'info' ? 'border-sky-200' : 'border-emerald-200';
  const bgCls =
    c.level === 'critical' ? 'bg-rose-50' : c.level === 'warning' ? 'bg-amber-50' : c.level === 'info' ? 'bg-sky-50' : 'bg-emerald-50';
  const textCls =
    c.level === 'critical' ? 'text-rose-800' : c.level === 'warning' ? 'text-amber-800' : c.level === 'info' ? 'text-sky-800' : 'text-emerald-800';
  const accentCls =
    c.level === 'critical' ? 'text-rose-600' : c.level === 'warning' ? 'text-amber-600' : c.level === 'info' ? 'text-sky-600' : 'text-emerald-600';

  return (
    <div id="gate-mgmt-conclusion" className={`scroll-mt-24 rounded-2xl border ${borderCls} ${bgCls} p-5`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          节点管理判断
        </span>
        <div className="flex-1 border-t border-white/50" />
      </div>
      <p className={`mb-3 text-sm font-medium leading-relaxed ${textCls}`}>{c.mainRiskSummary}</p>
      <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-4">
        {([
          { label: '主要影响波段', value: c.affectedWave },
          { label: '受影响节点', value: `${c.affectedGateCount} 个` },
          { label: '受影响款式', value: `${c.affectedStyleCount} 款` },
          { label: '预期最大逾期', value: c.expectedDelayDays > 0 ? `${c.expectedDelayDays} 天` : '—' },
        ] as const).map((item) => (
          <div key={item.label}>
            <div className="text-slate-500">{item.label}</div>
            <div className={`mt-0.5 font-semibold tabular-nums ${accentCls}`}>{item.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-white/60 bg-white/50 px-3 py-2">
        <span className="text-[11px] font-semibold text-slate-600">建议动作: </span>
        <span className={`text-xs ${textCls}`}>{c.recommendedAction}</span>
      </div>
    </div>
  );
}

// ─── Section B: 波段健康度矩阵 ────────────────────────────────────────────────

const GROUP_COLS = ['planning', 'design', 'development', 'cost', 'launch'] as const;
type GroupCol = (typeof GROUP_COLS)[number];

const GROUP_SHORT: Record<GroupCol, string> = {
  planning: '企划',
  design: '设计',
  development: '开发',
  cost: '成本',
  launch: '上市',
};

function pctColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (pct >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

function pctTextColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-700';
  if (pct >= 50) return 'text-amber-700';
  return 'text-rose-700';
}

function WaveHealthMatrix({ groups }: { groups: GateWaveGroup[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
      <SectionHeader badge="B" title="波段健康度矩阵" sub="≥80% 绿 / 50-79% 琥珀 / <50% 红 · 含上市建议" />
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2.5 text-left font-medium text-slate-500">波段</th>
              {GROUP_COLS.map((g) => (
                <th key={g} className="px-2 py-2.5 text-center font-medium text-slate-500">
                  {GROUP_SHORT[g]}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center font-medium text-slate-500">总完成率</th>
              <th className="px-3 py-2.5 text-left font-medium text-slate-500">上市建议</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const overall =
                group.total > 0 ? Math.round((group.completed / group.total) * 100) : 0;
              const blockedCount = group.rows.filter((r) => r.blocked).length;
              const launchPending = group.rows.filter(
                (r) => !r.completed && r.gateGroup === 'launch',
              ).length;
              const riskScore = [
                blockedCount > 0,
                group.delayed > 0,
                group.rows.some((r) => !r.completed && r.businessImpact.bom),
                launchPending > 0,
                overall < 50,
              ].filter(Boolean).length;

              const recommendation =
                blockedCount >= 2 && overall < 50
                  ? '建议延期 / 替代款'
                  : blockedCount > 0
                    ? '升级评审，立即决策'
                    : riskScore >= 3
                      ? '建议降本 / 重新排期'
                      : riskScore >= 1
                        ? '关注推进，保留计划'
                        : '正常上市';

              const recColor =
                blockedCount >= 2 && overall < 50
                  ? 'text-rose-700'
                  : blockedCount > 0 || riskScore >= 3
                    ? 'text-amber-700'
                    : 'text-emerald-700';

              return (
                <tr key={group.waveId} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{group.waveName}</div>
                    <div className="text-slate-400 text-[10px]">{group.total} 节点</div>
                  </td>
                  {GROUP_COLS.map((g) => {
                    const gRows = group.rows.filter((r) => r.gateGroup === g);
                    if (gRows.length === 0) {
                      return (
                        <td key={g} className="px-2 py-2.5 text-center text-slate-300">—</td>
                      );
                    }
                    const done = gRows.filter((r) => r.completed).length;
                    const pct = Math.round((done / gRows.length) * 100);
                    const gBlocked = gRows.filter((r) => r.blocked).length;
                    const gMissing = gRows.filter((r) => r.missingDeliverables.length > 0).length;
                    return (
                      <td key={g} className="px-2 py-1.5">
                        <div className={`rounded-lg border px-2 py-1.5 text-center ${pctColor(pct)}`}>
                          <div className="text-sm font-bold tabular-nums">{pct}%</div>
                          {(gBlocked > 0 || gMissing > 0) && (
                            <div className="mt-0.5 flex justify-center gap-1">
                              {gBlocked > 0 && <span className="text-[10px] text-rose-400">{gBlocked}阻</span>}
                              {gMissing > 0 && <span className="text-[10px] text-amber-400">{gMissing}缺</span>}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-base font-black tabular-nums ${pctTextColor(overall)}`}>
                      {overall}%
                    </span>
                    <div className="text-[10px] text-slate-400">{group.completed}/{group.total}</div>
                  </td>
                  <td className={`px-3 py-2.5 text-xs font-medium ${recColor}`}>{recommendation}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function SectionCard({
  id,
  badge,
  title,
  sub,
  children,
}: {
  id: string;
  badge: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
      <SectionHeader badge={badge} title={title} sub={sub} />
      {children}
    </div>
  );
}

// ─── Section F: Gate Drawer ───────────────────────────────────────────────────

function CriteriaList({ items, title }: { items: GateCriterion[]; title: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">{title}</h4>
      <ul className="space-y-1">
        {items.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-xs text-slate-700">
            <span className="text-slate-500 mt-0.5 flex-shrink-0">·</span>
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeliverableList({
  items,
  title,
}: {
  items: GateDeliverable[];
  title: string;
}) {
  if (items.length === 0) return null;
  const required = items.filter((d) => d.required);
  const optional = items.filter((d) => !d.required);
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">{title}</h4>
      <ul className="space-y-1.5">
        {required.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-xs">
            <span
              className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                d.available ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {d.available ? '✓' : '✕'}
            </span>
            <span className={d.available ? 'text-slate-700' : 'text-rose-700'}>{d.label}</span>
            {!d.available && (
              <span className="text-[10px] text-rose-500 bg-rose-50 px-1 rounded">缺失</span>
            )}
          </li>
        ))}
        {optional.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-xs opacity-60">
            <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-500">
              {d.available ? '✓' : '○'}
            </span>
            <span className="text-slate-600">{d.label}</span>
            <span className="text-[10px] text-slate-400">选填</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GateDrawer({
  row,
  onClose,
  referenceDate,
}: {
  row: GateTableRow | null;
  onClose: () => void;
  referenceDate: string;
}) {
  if (!row) return null;

  const db = DECISION_BADGE[row.decisionRecommendation];
  const pb = PRIORITY_BADGE[row.priority];
  const sb = STATUS_BADGE[row.normalizedStatus];

  const moduleLinks = GATE_MODULE_LINKS;

  const paramStr = new URLSearchParams({
    styleId: row.styleId,
    waveId: row.waveId,
    gateId: row.gateId,
    owner: row.owner,
    riskLevel: row.riskLevel,
    priority: row.priority,
  }).toString();

  // Structured business impact fields
  const launchImpactText = row.businessImpact.launch
    ? `影响 ${row.waveName} 上市节奏，建议同步商品企划确认可上市 SKU。`
    : '无直接上市影响。';
  const costImpactText =
    row.businessImpact.cost
      ? '成本核算阻塞，模具或样品核价无法完成。'
      : row.businessImpact.tooling
        ? '开模节点影响成本和交期。'
        : '无明确成本影响。';
  const otbImpactText = row.businessImpact.otb
    ? '若款式延期或划掉，需释放对应 OTB 预算。'
    : '无 OTB 影响。';
  const categoryImpactText = row.businessImpact.bom
    ? `BOM 未锁定将导致 ${row.categoryName} 可上市 SKU 减少。`
    : `${row.categoryName} 品类暂无直接影响。`;
  const planningActionText =
    row.nextAction ||
    (row.priority === 'P0'
      ? '立即升级处理，48 小时内同步决策结果。'
      : row.priority === 'P1'
        ? '本周内确认推进方案，反馈商品企划。'
        : '按计划推进，保持正常汇报节奏。');

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      {/* Overlay */}
      <div className="flex-1 bg-black/40" />
      {/* Panel */}
      <div
        className="w-[480px] max-w-full bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky decision header */}
        <div className={`flex-shrink-0 px-4 pt-4 pb-3 border-b border-slate-200 bg-white`}>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h2 className="text-base font-semibold text-slate-950 leading-tight">{row.gateName}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {row.styleName} · {row.seriesName} · {row.waveName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              ✕
            </button>
          </div>
          {/* Decision badge — prominent */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${db.cls}`}>
            <span className="text-lg">{db.icon}</span>
            <div>
              <div className="text-sm font-semibold">{db.label}</div>
              <div className="text-xs opacity-80 line-clamp-1">{row.decisionReason}</div>
            </div>
            <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${pb.cls}`}>
              {row.priority}
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* Gate summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Gate 摘要</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <span className="text-slate-500">Gate 类型</span>
              <span className="text-slate-900">{GATE_TYPE_LABELS[row.gateType] ?? row.gateType}</span>
              <span className="text-slate-500">所属阶段</span>
              <span className="text-slate-900">{GATE_GROUP_LABELS[row.gateGroup] ?? row.gateGroup}</span>
              <span className="text-slate-500">当前状态</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] w-fit ${sb.cls}`}>{sb.label}</span>
              <span className="text-slate-500">准备度评分</span>
              <ScoreBar score={row.gateReadinessScore} />
              <span className="text-slate-500">计划日期</span>
              <span className="text-slate-900 tabular-nums">{row.plannedDate}</span>
              {row.actualDate && (
                <>
                  <span className="text-slate-500">实际日期</span>
                  <span className="text-slate-900 tabular-nums">{row.actualDate}</span>
                </>
              )}
              {row.delayDays > 0 && (
                <>
                  <span className="text-slate-500">逾期天数</span>
                  <span className="text-rose-600 tabular-nums">{row.delayDays} 天</span>
                </>
              )}
              <span className="text-slate-500">负责部门</span>
              <span className="text-slate-900">{row.department}</span>
              <span className="text-slate-500">负责人</span>
              <span className="text-slate-900">{row.owner}</span>
              <span className="text-slate-500">关联版本</span>
              <span className="text-slate-900">{row.relatedVersionStatus}</span>
              <span className="text-slate-500">数据日期</span>
              <span className="text-slate-900 tabular-nums">{referenceDate}</span>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Entry / Exit criteria */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">准入 / 准出清单</h3>
            <CriteriaList items={row.entryCriteria} title="准入条件" />
            <CriteriaList items={row.exitCriteria} title="准出条件" />
          </div>

          <div className="border-t border-slate-100" />

          {/* Deliverables */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">必交付物</h3>
            <DeliverableList items={row.requiredDeliverables} title="" />
            {row.missingDeliverables.length > 0 && (
              <div className="mt-2 rounded-lg px-3 py-2 bg-rose-50 border border-rose-200">
                <p className="text-xs text-rose-700 font-medium">
                  缺失 {row.missingDeliverables.length} 项必交付物，Gate 无法关闭
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100" />

          {/* Risk / business impact — structured */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">风险与商业影响</h3>
            {row.riskReason && (
              <p className="text-xs text-slate-700 bg-slate-50 rounded p-2">{row.riskReason}</p>
            )}
            <div className="space-y-1.5">
              {([
                { label: '上市影响', value: launchImpactText, warn: row.businessImpact.launch },
                { label: '成本影响', value: costImpactText, warn: row.businessImpact.cost || row.businessImpact.tooling },
                { label: 'OTB 影响', value: otbImpactText, warn: row.businessImpact.otb },
                { label: '品类影响', value: categoryImpactText, warn: row.businessImpact.bom },
                { label: '商品企划建议', value: planningActionText, warn: false },
              ] as const).map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    item.warn
                      ? 'border border-rose-100 bg-rose-50'
                      : 'border border-slate-100 bg-slate-50'
                  }`}
                >
                  <span className={`font-semibold ${item.warn ? 'text-rose-700' : 'text-slate-600'}`}>
                    {item.label}:{' '}
                  </span>
                  <span className={item.warn ? 'text-rose-800' : 'text-slate-700'}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Evidence / related info */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">关联信息</h3>
            <p className="text-xs text-slate-600">{row.evidenceSummary}</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '开放任务', val: row.openTaskCount, cls: row.openTaskCount > 0 ? 'text-amber-700' : 'text-slate-500' },
                { label: '逾期任务', val: row.overdueTaskCount, cls: row.overdueTaskCount > 0 ? 'text-rose-700' : 'text-slate-500' },
                { label: '已完成', val: row.completedTaskCount, cls: 'text-emerald-600' },
              ].map((s) => (
                <div key={s.label} className="rounded bg-slate-50 px-2 py-1.5 text-center">
                  <div className={`text-lg font-bold tabular-nums ${s.cls}`}>{s.val}</div>
                  <div className="text-[10px] text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="text-slate-500">依赖关系: </span>
              {row.dependencySummary.description}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Next action */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">下一步动作</h3>
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
              <p className="text-sm text-slate-900">{row.nextAction}</p>
              <p className="text-xs text-slate-500 mt-1">截止: {row.plannedDate} · 负责人: {row.owner}</p>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Module links (contextual) */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">跳转入口</h3>
            <div className="grid grid-cols-2 gap-2">
              {moduleLinks.slice(0, 6).map((link) => (
                <a
                  key={link.linkId}
                  href={appendQueryParams(link.relatedRoute, paramStr)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-xs text-slate-700 hover:text-slate-950"
                >
                  <span>{link.icon ?? '→'}</span>
                  <span className="truncate">{link.label}</span>
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


// ─── FloatingModuleNav sections ───────────────────────────────────────────────

const GATE_MODULE_LINKS: DesignPlanningRelatedModuleLink[] = [
  { linkId: 'gate-overview',  label: '设计企划总览',   description: '季度健康度与关键决策',  actionLabel: '查看总览',   relatedRoute: '/design-review-center?tab=overview',              category: 'internal', icon: '📊' },
  { linkId: 'gate-theme',     label: '主题与系列策略', description: '系列方向与设计语言',    actionLabel: '查看主题',   relatedRoute: '/design-review-center?tab=themeStrategy',         category: 'internal', icon: '🎨' },
  { linkId: 'gate-arch',      label: '产品架构',       description: '品类/系列/款型架构',   actionLabel: '查看架构',   relatedRoute: '/design-review-center?tab=productArchitecture',   category: 'internal', icon: '🧱' },
  { linkId: 'gate-task',      label: '开发任务池',     description: '任务承接与执行进度',    actionLabel: '查看任务',   relatedRoute: '/design-review-center?tab=developmentTaskPool',   category: 'internal', icon: '📁' },
  { linkId: 'gate-version',   label: '设计版本',       description: '版本链与提交准备',     actionLabel: '查看版本',   relatedRoute: '/design-review-center?tab=designVersionPreview',  category: 'internal', icon: '🖼️' },
  { linkId: 'gate-review',    label: '评审决议',       description: '决议与动作闭环',       actionLabel: '查看评审',   relatedRoute: '/design-review-center?tab=reviewDecisionCenter',  category: 'internal', icon: '✅' },
];

const navIc = 'w-2.5 h-2.5';
const NAV_SECTIONS = [
  { anchor: '#gate-overview',         label: '指挥舱',     icon: (<svg viewBox="0 0 16 16" fill="none" className={navIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="9" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" opacity="0.4" /><rect x="6" y="5" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" opacity="0.7" /><rect x="11" y="1" width="3" height="14" rx="0.5" fill="currentColor" stroke="none" /></svg>) },
  { anchor: '#gate-mgmt-conclusion',  label: '管理判断',   icon: (<svg viewBox="0 0 16 16" fill="none" className={navIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1.5 14.5 13.5H1.5L8 1.5z" /><line x1="8" y1="6" x2="8" y2="9.5" /><circle cx="8" cy="11.5" r="0.6" fill="currentColor" stroke="none" /></svg>) },
  { anchor: '#gate-wave-health',      label: '波段健康',   icon: (<svg viewBox="0 0 16 16" fill="none" className={navIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,12 5,8 8.5,10 12,5 14,7" /></svg>) },
  { anchor: '#gate-critical-path',    label: '关键路径',   icon: (<svg viewBox="0 0 16 16" fill="none" className={navIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="8" x2="14" y2="8" /><circle cx="4" cy="8" r="1.5" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" /></svg>) },
  { anchor: '#gate-dependency',       label: '依赖关系',   icon: (<svg viewBox="0 0 16 16" fill="none" className={navIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="3" cy="8" r="2" /><circle cx="13" cy="4" r="2" /><circle cx="13" cy="12" r="2" /><line x1="4.5" y1="7" x2="11.5" y2="4.5" /><line x1="4.5" y1="9" x2="11.5" y2="11.5" /></svg>) },
  { anchor: '#gate-work-center',      label: '工单中心',   icon: (<svg viewBox="0 0 16 16" fill="none" className={navIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="12" rx="1.5" /><line x1="5" y1="6" x2="11" y2="6" /><line x1="5" y1="9" x2="11" y2="9" /><line x1="5" y1="12" x2="9" y2="12" /></svg>) },
  { anchor: '#gate-sla',              label: 'SLA 趋势',   icon: (<svg viewBox="0 0 16 16" fill="none" className={navIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6" /><polyline points="8,4 8,8 11,10" /></svg>) },
];

// ─── Main Export ─────────────────────────────────────────────────────────────

export default function DevelopmentWaveTable({
  groups,
  referenceDate,
}: DevelopmentWaveTableProps) {
  const [drawerRow, setDrawerRow] = useState<GateTableRow | null>(null);
  const scrollYRef = useRef(0);

  const openDrawer = useCallback((row: GateTableRow) => {
    scrollYRef.current = window.scrollY;
    setDrawerRow(row);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerRow(null);
    requestAnimationFrame(() => window.scrollTo(0, scrollYRef.current));
  }, []);

  const handleChartGateClick = useCallback(
    (gateId: string) => {
      const allRows = groups.flatMap((g) => g.rows);
      const row = allRows.find((r) => r.gateId === gateId);
      if (row) openDrawer(row);
    },
    [groups, openDrawer],
  );

  const allRows = useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const ganttItems = useMemo(() => buildGanttItems(groups), [groups]);
  const dependencyData = useMemo(() => buildDependencyData(groups), [groups]);
  const resourceLoads = useMemo(() => buildResourceLoads(groups), [groups]);
  const slaData = useMemo(() => buildSlaData(groups, referenceDate), [groups, referenceDate]);
  const moduleLinks = GATE_MODULE_LINKS;

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400 text-sm">
        暂无节点数据
      </div>
    );
  }

  return (
    <>
      <FloatingModuleNav moduleLinks={moduleLinks} pageSections={NAV_SECTIONS} />
      <div className="space-y-10">
        <div id="gate-overview" className="scroll-mt-24">
          <GateHeroCockpit rows={allRows} />
        </div>
        <GateManagementConclusion rows={allRows} groups={groups} />
        <div id="gate-wave-health" className="scroll-mt-24">
          <WaveHealthMatrix groups={groups} />
        </div>
        <SectionCard id="gate-critical-path" badge="C" title="关键路径甘特" sub="默认仅展示关键节点 · 点击条形打开详情 · 可切换视图">
          <GateGanttChart items={ganttItems} referenceDate={referenceDate} onGateClick={handleChartGateClick} />
        </SectionCard>
        <SectionCard id="gate-dependency" badge="D" title="节点依赖链路" sub="阻塞链路追踪 · 展开查看下游影响与建议动作 · 各波段完成度">
          <GateDependencyGraph data={dependencyData} onGateClick={handleChartGateClick} />
        </SectionCard>
        <SectionCard id="gate-work-center" badge="E" title="节点工单中心" sub="三视图：优先级 / 责任人 / 波段 · 点击行打开详情抽屉">
          <GateWorkCenter groups={groups} resourceLoads={resourceLoads} onGateClick={openDrawer} />
        </SectionCard>
        <SectionCard id="gate-sla" badge="F" title="节点 SLA 趋势" sub="平均逾期天数 · 各类节点逾期排行 · 6 周准时率趋势">
          <GateSlaPanel data={slaData} />
        </SectionCard>
      </div>
      <GateDrawer row={drawerRow} onClose={closeDrawer} referenceDate={referenceDate} />
    </>
  );
}
