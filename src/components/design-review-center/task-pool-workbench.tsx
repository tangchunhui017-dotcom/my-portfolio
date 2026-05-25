'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { STAGE_MAP, EXECUTION_STATUS_MAP } from '@/config/design-review-center/status-map';
import { formatDate } from '@/lib/design-review-center/helpers/date';
import type { StyleTaskRow, DesignPlanningRelatedModuleLink } from '@/lib/design-review-center/types';
import TaskDetailDrawer from './task-detail-drawer';
import ResourceLoadBoard from './task-pool/ResourceLoadBoard';
import TaskWorkOrderCenter from './task-pool/TaskWorkOrderCenter';
import FloatingModuleNav from './floating-module-nav';
import {
  deriveTaskPriority,
  deriveGateImpact,
  deriveLaunchImpact,
  deriveCostRisk,
  TASK_SOURCE_ALIGNMENTS,
  type TaskFilter,
  type TaskPriority,
} from '@/lib/design-review-center/task-pool-mock-data';
import { deriveOwnerLoads } from '@/lib/design-review-center/task-pool-derivations';

interface Props {
  rows: StyleTaskRow[];
  referenceDate: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const MODULE_LINKS: DesignPlanningRelatedModuleLink[] = [
  {
    linkId: 'tp-overview',
    label: '总览',
    description: '驾驶舱总盘',
    actionLabel: '查看总览',
    relatedRoute: '/design-review-center?tab=overview',
    category: 'internal',
    icon: '📊',
  },
  {
    linkId: 'tp-arch',
    label: '产品架构',
    description: '承接任务来源',
    actionLabel: '查看产品架构',
    relatedRoute: '/design-review-center?tab=productArchitecture',
    category: 'internal',
    icon: '🧱',
  },
  {
    linkId: 'tp-gate',
    label: '波段研发节点',
    description: '节点驱动任务',
    actionLabel: '查看节点',
    relatedRoute: '/design-review-center?tab=developmentGateTable',
    category: 'internal',
    icon: '🗓️',
  },
  {
    linkId: 'tp-review',
    label: '评审决议',
    description: '动作闭环追踪',
    actionLabel: '查看评审',
    relatedRoute: '/design-review-center?tab=reviewDecisionCenter',
    category: 'internal',
    icon: '✅',
  },
  {
    linkId: 'tp-design-version',
    label: '设计版本',
    description: '版本链查看',
    actionLabel: '查看版本',
    relatedRoute: '/design-review-center?tab=designVersionPreview',
    category: 'internal',
    icon: '🖼️',
  },
];

const navIc = 'w-2.5 h-2.5';
const PAGE_SECTIONS = [
  { anchor: '#section-kpi',         label: '总览',     icon: (<svg viewBox="0 0 16 16" fill="none" className={navIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="9" width="3" height="6" rx="0.5" fill="currentColor" stroke="none" opacity="0.4" /><rect x="6" y="5" width="3" height="10" rx="0.5" fill="currentColor" stroke="none" opacity="0.7" /><rect x="11" y="1" width="3" height="14" rx="0.5" fill="currentColor" stroke="none" /></svg>) },
  { anchor: '#section-source',      label: '任务来源', icon: (<svg viewBox="0 0 16 16" fill="none" className={navIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8h12M9 4l4 4-4 4" /></svg>) },
  { anchor: '#section-resource',    label: '资源负荷', icon: (<svg viewBox="0 0 16 16" fill="none" className={navIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2" /><circle cx="11" cy="6" r="2" /><path d="M2 14a3 3 0 016 0M8 14a3 3 0 016 0" /></svg>) },
  { anchor: '#section-work-orders', label: '工单中心', icon: (<svg viewBox="0 0 16 16" fill="none" className={navIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="12" rx="1.5" /><line x1="5" y1="6" x2="11" y2="6" /><line x1="5" y1="9" x2="11" y2="9" /><line x1="5" y1="12" x2="9" y2="12" /></svg>) },
  { anchor: '#section-task-list',   label: '任务列表', icon: (<svg viewBox="0 0 16 16" fill="none" className={navIc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" /><circle cx="0.5" cy="4" r="0.6" fill="currentColor" stroke="none" /><circle cx="0.5" cy="8" r="0.6" fill="currentColor" stroke="none" /><circle cx="0.5" cy="12" r="0.6" fill="currentColor" stroke="none" /></svg>) },
];

const PRIORITY_META: Record<TaskPriority, { bg: string; text: string; border: string; label: string }> = {
  P0: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'P0' },
  P1: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'P1' },
  P2: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'P2' },
  P3: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', label: 'P3' },
};

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({
  id,
  label,
  title,
  subtitle,
  children,
}: {
  id?: string;
  label: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id}>
      <div className="mb-4 flex items-baseline gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-900 text-[11px] font-bold text-white">
          {label}
        </span>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle ? <span className="text-xs text-slate-400">{subtitle}</span> : null}
        <div className="flex-1 border-t border-slate-100" />
      </div>
      {children}
    </section>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition',
        active
          ? 'bg-slate-900 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      ].join(' ')}
    >
      {label}
      {count !== undefined ? (
        <span
          className={[
            'rounded-full px-1.5 py-0 text-[10px] font-bold tabular-nums',
            active ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700',
          ].join(' ')}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function AlignmentBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    aligned: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已承接' },
    partial: { bg: 'bg-amber-100', text: 'text-amber-700', label: '部分承接' },
    unaligned: { bg: 'bg-rose-100', text: 'text-rose-700', label: '未承接' },
    deviated: { bg: 'bg-orange-100', text: 'text-orange-700', label: '存在偏离' },
  };
  const m = map[status] ?? map.partial;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

// ── Task Table ──────────────────────────────────────────────────────────────

function TaskTable({
  rows,
  priorities,
  onRowClick,
}: {
  rows: StyleTaskRow[];
  priorities: Map<string, TaskPriority>;
  onRowClick: (row: StyleTaskRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
        当前筛选条件下没有任务记录。
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="p-3">优先级</th>
              <th className="p-3">款号 / 款名</th>
              <th className="p-3">系列 / 波段</th>
              <th className="p-3">当前阶段</th>
              <th className="p-3">设计 / 样鞋 / 材料</th>
              <th className="p-3">负责人</th>
              <th className="p-3">下步动作</th>
              <th className="p-3">截止</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const priority = priorities.get(row.styleId) ?? 'P3';
              const pm = PRIORITY_META[priority];
              const stageMeta = STAGE_MAP[row.currentStage];
              const designMeta = EXECUTION_STATUS_MAP[row.designStatus];
              const sampleMeta = EXECUTION_STATUS_MAP[row.sampleStatus];
              const materialMeta = EXECUTION_STATUS_MAP[row.materialStatus];

              return (
                <tr
                  key={row.styleId}
                  className="cursor-pointer text-sm text-slate-700 transition hover:bg-slate-50"
                  onClick={() => onRowClick(row)}
                >
                  <td className="p-3">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${pm.bg} ${pm.text} ${pm.border}`}>
                      {pm.label}
                    </span>
                    {row.blocked ? (
                      <div className="mt-1 text-[11px] font-semibold text-rose-600">阻塞中</div>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">{row.skuCode}</div>
                    <div className="text-xs text-slate-500">{row.styleName}</div>
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    <div>{row.seriesName}</div>
                    <div className="text-slate-400">{row.categoryName} · <span className="uppercase">{row.waveId}</span></div>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${stageMeta.bgColor} ${stageMeta.textColor}`}>
                      {stageMeta.label}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 text-xs">
                      <span className={`rounded-full px-2 py-0.5 ${designMeta.bgColor} ${designMeta.textColor}`}>
                        设计 {designMeta.label}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 ${sampleMeta.bgColor} ${sampleMeta.textColor}`}>
                        样鞋 {sampleMeta.label}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 ${materialMeta.bgColor} ${materialMeta.textColor}`}>
                        材料 {materialMeta.label}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-slate-600">{row.owner}</td>
                  <td className="p-3 text-xs">
                    <div className="font-medium text-slate-800">{row.nextAction}</div>
                    {row.nextGate ? (
                      <div className="mt-0.5 text-indigo-600">→ {row.nextGate.gateName}</div>
                    ) : null}
                  </td>
                  <td className="p-3 text-xs">
                    <div className={row.overdue ? 'font-semibold text-rose-600' : row.dueThisWeek ? 'font-medium text-amber-600' : 'text-slate-500'}>
                      {formatDate(row.dueDate)}
                    </div>
                    {row.overdue ? <div className="text-[11px] text-rose-500">已逾期</div> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Workbench ──────────────────────────────────────────────────────────

export default function TaskPoolWorkbench({ rows, referenceDate }: Props) {
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');
  const [selectedRow, setSelectedRow] = useState<StyleTaskRow | null>(null);
  const urlStateRestoredRef = useRef(false);

  // Restore state from URL on mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const urlFilter = params.get('taskFilter');
      const urlTaskId = params.get('taskId');
      if (urlFilter) setActiveFilter(urlFilter as TaskFilter);
      if (urlTaskId) {
        const found = rows.find((r) => r.styleId === urlTaskId);
        if (found) setSelectedRow(found);
      }
      urlStateRestoredRef.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [rows]);

  // Sync state to URL (without navigation)
  useEffect(() => {
    if (!urlStateRestoredRef.current) return;
    const params = new URLSearchParams(window.location.search);
    params.set('taskFilter', activeFilter);
    if (selectedRow) {
      params.set('taskId', selectedRow.styleId);
    } else {
      params.delete('taskId');
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [activeFilter, selectedRow]);

  const priorities = useMemo(() => {
    const map = new Map<string, TaskPriority>();
    rows.forEach((r) => map.set(r.styleId, deriveTaskPriority(r)));
    return map;
  }, [rows]);

  const summary = useMemo(() => {
    const blocked = rows.filter((r) => r.blocked).length;
    const overdue = rows.filter((r) => r.overdue).length;
    const pendingReview = rows.filter((r) => r.pendingReview).length;
    const dueSoon = rows.filter((r) => r.dueThisWeek && !r.overdue).length;
    const highRisk = rows.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'blocking').length;
    const gateImpact = rows.filter(deriveGateImpact).length;
    const launchImpact = rows.filter(deriveLaunchImpact).length;
    const costRisk = rows.filter(deriveCostRisk).length;
    const archLinked = rows.filter((r) => r.architectureSource !== null).length;
    return { blocked, overdue, pendingReview, dueSoon, highRisk, gateImpact, launchImpact, costRisk, archLinked };
  }, [rows]);

  const ownerLoads = useMemo(() => deriveOwnerLoads(rows), [rows]);

  const filteredRows = useMemo(() => {
    switch (activeFilter) {
      case 'blocked': return rows.filter((r) => r.blocked);
      case 'pendingReview': return rows.filter((r) => r.pendingReview);
      case 'dueSoon': return rows.filter((r) => r.dueThisWeek);
      case 'highRisk': return rows.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'blocking');
      case 'gateImpact': return rows.filter(deriveGateImpact);
      case 'launchImpact': return rows.filter(deriveLaunchImpact);
      case 'costRisk': return rows.filter(deriveCostRisk);
      default: return rows;
    }
  }, [rows, activeFilter]);

  const sortedRows = useMemo(() => {
    const priorityOrder: Record<TaskPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return [...filteredRows].sort((a, b) => {
      const pa = priorityOrder[priorities.get(a.styleId) ?? 'P3'];
      const pb = priorityOrder[priorities.get(b.styleId) ?? 'P3'];
      if (pa !== pb) return pa - pb;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [filteredRows, priorities]);

  const handleOpenDrawer = useCallback((row: StyleTaskRow) => setSelectedRow(row), []);
  const handleCloseDrawer = useCallback(() => setSelectedRow(null), []);
  const handleFilter = useCallback(
    (filter: TaskFilter) => setActiveFilter((prev) => (prev === filter ? 'all' : filter)),
    [],
  );

  const heroCount = summary.blocked + summary.overdue;

  return (
    <>
      <FloatingModuleNav moduleLinks={MODULE_LINKS} pageSections={PAGE_SECTIONS} />

      <div className="space-y-10">

        {/* ── A · 任务池总览 ─────────────────────────────────────────────── */}
        <SectionCard
          id="section-kpi"
          label="A"
          title="任务池总览"
          subtitle={`共 ${rows.length} 款在研 · ${formatDate(referenceDate)}`}
        >
          <div className="grid gap-3 xl:grid-cols-[1.5fr_2.5fr_2fr]">
            {/* Hero red card */}
            <article className="flex flex-col justify-center rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-white p-6">
              <div className="text-xs font-bold uppercase tracking-widest text-rose-500">阻塞 + 逾期</div>
              <div className="mt-3 text-5xl font-black tabular-nums text-rose-600">{heroCount}</div>
              <div className="mt-2 text-sm text-slate-700">需立即关注的任务</div>
              <div className="mt-3 flex gap-4 text-sm">
                <span>阻塞 <span className="font-bold text-rose-600">{summary.blocked}</span></span>
                <span>逾期 <span className="font-bold text-rose-600">{summary.overdue}</span></span>
              </div>
            </article>

            {/* 4 secondary KPIs */}
            <article className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {[
                { label: '当前在研', value: rows.length, filter: 'all' as TaskFilter, color: 'text-slate-700' },
                { label: '待评审', value: summary.pendingReview, filter: 'pendingReview' as TaskFilter, color: summary.pendingReview > 0 ? 'text-amber-600' : 'text-slate-700' },
                { label: '本周到期', value: summary.dueSoon, filter: 'dueSoon' as TaskFilter, color: summary.dueSoon > 0 ? 'text-amber-600' : 'text-slate-700' },
                { label: '节点风险', value: summary.gateImpact, filter: 'gateImpact' as TaskFilter, color: summary.gateImpact > 0 ? 'text-indigo-600' : 'text-slate-700' },
              ].map((kpi) => (
                <button
                  key={kpi.label}
                  type="button"
                  onClick={() => handleFilter(kpi.filter)}
                  className={`rounded-xl border px-3 py-3 text-left transition hover:shadow-sm ${activeFilter === kpi.filter ? 'border-slate-300 bg-white ring-2 ring-slate-300' : 'border-slate-200 bg-white'}`}
                >
                  <div className={`text-2xl font-black tabular-nums ${kpi.color}`}>{kpi.value}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{kpi.label}</div>
                </button>
              ))}
            </article>

            {/* 3 impact chips */}
            <article className="flex flex-col justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              {[
                { label: '上市影响', value: summary.launchImpact, filter: 'launchImpact' as TaskFilter, color: summary.launchImpact > 0 ? 'text-rose-600' : 'text-slate-400' },
                { label: '成本超标', value: summary.costRisk, filter: 'costRisk' as TaskFilter, color: summary.costRisk > 0 ? 'text-amber-600' : 'text-slate-400' },
                { label: '架构可追溯', value: summary.archLinked, filter: 'all' as TaskFilter, color: 'text-emerald-600' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleFilter(item.filter)}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 transition hover:bg-slate-100"
                >
                  <span className="text-xs text-slate-600">{item.label}</span>
                  <span className={`text-lg font-black tabular-nums ${item.color}`}>{item.value}</span>
                </button>
              ))}
            </article>
          </div>
        </SectionCard>

        {/* ── B · 任务来源承接 ────────────────────────────────────────────── */}
        <SectionCard
          id="section-source"
          label="B"
          title="任务来源承接"
          subtitle="各模块输入与执行任务分发情况"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {TASK_SOURCE_ALIGNMENTS.map((src) => {
              const riskColor =
                src.riskLevel === 'high'
                  ? 'text-rose-600'
                  : src.riskLevel === 'medium'
                    ? 'text-amber-600'
                    : 'text-slate-500';
              return (
                <article key={src.sourceId} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900">{src.sourceName}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">{src.sourceModule}</div>
                    </div>
                    <AlignmentBadge status={src.alignmentStatus} />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black tabular-nums text-slate-900">
                      {src.tasksGenerated}
                    </span>
                    {src.tasksPending > 0 ? (
                      <span className={`text-sm ${riskColor}`}>/ {src.tasksPending} 待处理</span>
                    ) : (
                      <span className="text-sm text-slate-400">/ 全部处理</span>
                    )}
                  </div>
                  <div className="mt-1.5 text-xs text-slate-500">{src.inputSummary}</div>
                  <div className="mt-2 text-[11px] text-slate-400">{src.recommendedAction}</div>
                  <a
                    href={`/design-review-center?tab=${src.relatedTabKey}`}
                    className="mt-3 inline-flex rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    查看 →
                  </a>
                </article>
              );
            })}
          </div>
        </SectionCard>

        {/* ── C · 责任人资源饱和度 ─────────────────────────────────────── */}
        <SectionCard
          id="section-resource"
          label="C"
          title="责任人资源饱和度"
          subtitle="按责任人统计在研任务数 + 工作饱和度"
        >
          <ResourceLoadBoard loads={ownerLoads} />
        </SectionCard>

        {/* ── D · 任务工单中心 ─────────────────────────────────────────── */}
        <SectionCard
          id="section-work-orders"
          label="D"
          title="任务工单中心"
          subtitle="按优先级 / 责任人 / 阶段三视图 · 点击行打开任务详情"
        >
          <TaskWorkOrderCenter
            rows={rows}
            priorities={priorities}
            ownerLoads={ownerLoads}
            onRowClick={handleOpenDrawer}
          />
        </SectionCard>

        {/* ── E · 任务列表全量明细 ─────────────────────────────────────── */}
        <SectionCard
          id="section-task-list"
          label="E"
          title="任务列表 · 全量明细"
          subtitle={`${sortedRows.length} / ${rows.length} 款`}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterChip label="全部" count={rows.length} active={activeFilter === 'all'} onClick={() => handleFilter('all')} />
            <FilterChip label="阻塞中" count={summary.blocked} active={activeFilter === 'blocked'} onClick={() => handleFilter('blocked')} />
            <FilterChip label="本周到期" count={summary.dueSoon} active={activeFilter === 'dueSoon'} onClick={() => handleFilter('dueSoon')} />
            <FilterChip label="高风险" count={summary.highRisk} active={activeFilter === 'highRisk'} onClick={() => handleFilter('highRisk')} />
          </div>
          <TaskTable rows={sortedRows} priorities={priorities} onRowClick={handleOpenDrawer} />
        </SectionCard>

      </div>

      <TaskDetailDrawer
        row={selectedRow}
        priority={selectedRow ? (priorities.get(selectedRow.styleId) ?? null) : null}
        onClose={handleCloseDrawer}
      />
    </>
  );
}
