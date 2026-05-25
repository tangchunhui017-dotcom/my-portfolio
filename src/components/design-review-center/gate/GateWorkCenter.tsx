'use client';

import { useMemo, useState } from 'react';
import type { GateTableRow, GateWaveGroup } from '@/lib/design-review-center/selectors/gates';
import type { ResourceLoad } from '@/lib/design-review-center/gate-derivations';

interface Props {
  groups: GateWaveGroup[];
  resourceLoads: ResourceLoad[];
  onGateClick: (row: GateTableRow) => void;
}

type ViewMode = 'priority' | 'owner' | 'wave';

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-rose-50 border-rose-200 text-rose-700',
  P1: 'bg-amber-50 border-amber-200 text-amber-700',
  P2: 'bg-sky-50 border-sky-200 text-sky-700',
  P3: 'bg-slate-100 border-slate-200 text-slate-600',
};

const PRIORITY_DOT: Record<string, string> = {
  P0: 'bg-rose-500',
  P1: 'bg-amber-500',
  P2: 'bg-sky-500',
  P3: 'bg-slate-400',
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-emerald-600',
  on_track: 'text-sky-600',
  due_this_week: 'text-amber-600',
  delayed: 'text-rose-600',
  blocked: 'text-red-600',
  needs_decision: 'text-fuchsia-600',
};

const STATUS_LABEL: Record<string, string> = {
  completed: '已完成',
  on_track: '正常',
  due_this_week: '本周到期',
  delayed: '逾期',
  blocked: '阻塞',
  needs_decision: '待决策',
};

const ACTION_TYPE: Partial<Record<string, string>> = {
  pass: '确认通过',
  conditional_pass: '条件通过',
  rework: '安排返工',
  escalate: '升级决策',
  hold: '暂缓推进',
  cancel: '标记取消',
};

function ReadinessBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-8 text-right text-xs tabular-nums text-slate-500">{score}</span>
    </div>
  );
}

function GateRow({
  row,
  onClick,
}: {
  row: GateTableRow;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50"
    >
      <span
        className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${PRIORITY_COLORS[row.priority] ?? ''}`}
      >
        {row.priority}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-800">{row.gateName}</span>
          <span
            className={`shrink-0 text-xs ${STATUS_COLORS[row.normalizedStatus] ?? 'text-slate-400'}`}
          >
            {STATUS_LABEL[row.normalizedStatus] ?? row.normalizedStatus}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
          <span className="truncate">{row.styleName}</span>
          <span>{row.waveName}</span>
          {row.delayDays > 0 && (
            <span className="text-rose-600">逾期 {row.delayDays}d</span>
          )}
          {row.missingDeliverables.length > 0 && (
            <span className="text-amber-600">缺 {row.missingDeliverables.length} 项</span>
          )}
        </div>
        {(row.businessImpact.launch || row.businessImpact.cost || row.businessImpact.bom || row.businessImpact.otb || row.businessImpact.sample || row.businessImpact.tooling || row.feedbackRequired) && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {row.businessImpact.launch && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700">上市</span>}
            {row.businessImpact.cost && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">成本</span>}
            {row.businessImpact.tooling && <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] text-orange-700">开模</span>}
            {row.businessImpact.bom && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700">BOM</span>}
            {row.businessImpact.otb && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-700">OTB</span>}
            {row.businessImpact.sample && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">样品</span>}
            {ACTION_TYPE[row.decisionRecommendation] && (
              <span className="ml-0.5 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">→ {ACTION_TYPE[row.decisionRecommendation]}</span>
            )}
            {row.feedbackRequired && (
              <span className="rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] text-orange-700">需反馈</span>
            )}
          </div>
        )}
      </div>
      <ReadinessBar score={row.gateReadinessScore} />
    </button>
  );
}

function PriorityView({
  groups,
  onGateClick,
}: {
  groups: GateWaveGroup[];
  onGateClick: (row: GateTableRow) => void;
}) {
  const byPriority = useMemo(() => {
    const all = groups.flatMap((g) => g.rows);
    return (['P0', 'P1', 'P2', 'P3'] as const).map((p) => ({
      priority: p,
      rows: all.filter((r) => r.priority === p && !r.completed).sort((a, b) => {
          if (a.blocked !== b.blocked) return a.blocked ? -1 : 1;
          if (a.delayDays !== b.delayDays) return b.delayDays - a.delayDays;
          if (a.businessImpact.launch !== b.businessImpact.launch) return a.businessImpact.launch ? -1 : 1;
          return new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime();
        }),
    }));
  }, [groups]);

  return (
    <div className="space-y-4">
      {byPriority.map(({ priority, rows }) => {
        if (rows.length === 0) return null;
        return (
          <div key={priority}>
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[priority]}`} />
              <span className="text-sm font-semibold text-slate-700">{priority}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {rows.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {rows.map((row) => (
                <GateRow key={row.gateId} row={row} onClick={() => onGateClick(row)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OwnerView({
  resourceLoads,
  onGateClick,
}: {
  resourceLoads: ResourceLoad[];
  onGateClick: (row: GateTableRow) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {resourceLoads.map((load) => {
        const isExpanded = expanded === load.owner;
        const barColor =
          load.loadPct >= 100
            ? 'bg-rose-500'
            : load.loadPct >= 80
              ? 'bg-amber-500'
              : 'bg-emerald-500';

        return (
          <div key={load.owner} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
              onClick={() => setExpanded(isExpanded ? null : load.owner)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                {load.owner.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{load.owner}</span>
                  {load.overdueGateCount > 0 && (
                    <span className="rounded border border-rose-200 bg-rose-50 px-1.5 text-xs text-rose-700">
                      逾期 {load.overdueGateCount}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.min(100, load.loadPct)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {load.activeGateCount}/{load.capacity} · {load.loadPct}%
                  </span>
                </div>
              </div>
              <div className="flex gap-3 text-xs text-slate-500">
                <span>{load.activeGateCount} 进行中</span>
                <span>{load.completedGateCount} 已完</span>
              </div>
              <svg
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isExpanded && load.gates.length > 0 && (
              <div className="border-t border-slate-100 px-4 pb-3 pt-2 space-y-1.5">
                {load.gates.map((row) => (
                  <GateRow key={row.gateId} row={row} onClick={() => onGateClick(row)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WaveView({
  groups,
  onGateClick,
}: {
  groups: GateWaveGroup[];
  onGateClick: (row: GateTableRow) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(groups[0]?.waveId ?? null);

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isExpanded = expanded === group.waveId;
        const rate = group.total > 0 ? Math.round((group.completed / group.total) * 100) : 0;
        const healthColor =
          rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-rose-600';
        const activePending = group.rows.filter((r) => !r.completed);

        return (
          <div key={group.waveId} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
              onClick={() => setExpanded(isExpanded ? null : group.waveId)}
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-slate-900">{group.waveName}</span>
                <div className="mt-0.5 flex gap-3 text-xs text-slate-500">
                  <span>共 {group.total}</span>
                  <span className="text-emerald-600">完 {group.completed}</span>
                  {group.delayed > 0 && <span className="text-rose-600">逾期 {group.delayed}</span>}
                  {group.blocked > 0 && <span className="text-red-600">阻塞 {group.blocked}</span>}
                </div>
              </div>
              <span className={`text-lg font-black tabular-nums ${healthColor}`}>{rate}%</span>
              <svg
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isExpanded && activePending.length > 0 && (
              <div className="border-t border-slate-100 px-4 pb-3 pt-2 space-y-1.5">
                {activePending.map((row) => (
                  <GateRow key={row.gateId} row={row} onClick={() => onGateClick(row)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function GateWorkCenter({ groups, resourceLoads, onGateClick }: Props) {
  const [view, setView] = useState<ViewMode>('priority');

  const VIEWS: { key: ViewMode; label: string }[] = [
    { key: 'priority', label: '优先级' },
    { key: 'owner', label: '责任人' },
    { key: 'wave', label: '波段' },
  ];

  return (
    <div>
      {/* View switcher */}
      <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              view === v.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'priority' && <PriorityView groups={groups} onGateClick={onGateClick} />}
      {view === 'owner' && <OwnerView resourceLoads={resourceLoads} onGateClick={onGateClick} />}
      {view === 'wave' && <WaveView groups={groups} onGateClick={onGateClick} />}
    </div>
  );
}
