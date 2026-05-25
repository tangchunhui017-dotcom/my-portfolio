'use client';

import { useState } from 'react';
import { STAGE_MAP } from '@/config/design-review-center/status-map';
import { formatDate } from '@/lib/design-review-center/helpers/date';
import type { StyleTaskRow } from '@/lib/design-review-center/types';
import type { TaskPriority } from '@/lib/design-review-center/task-pool-mock-data';
import type { OwnerLoad } from '@/lib/design-review-center/task-pool-derivations';

type WorkOrderView = 'priority' | 'owner' | 'stage';

const PRIORITY_META: Record<
  TaskPriority,
  { bg: string; text: string; border: string; badge: string; label: string }
> = {
  P0: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    badge: 'bg-rose-600 text-white',
    label: 'P0 · 立即处理',
  },
  P1: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    badge: 'bg-orange-500 text-white',
    label: 'P1 · 本周跟进',
  },
  P2: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    badge: 'bg-amber-500 text-white',
    label: 'P2 · 计划推进',
  },
  P3: {
    bg: 'bg-slate-50',
    text: 'text-slate-500',
    border: 'border-slate-200',
    badge: 'bg-slate-400 text-white',
    label: 'P3 · 正常',
  },
};

const STAGE_GROUPS: { key: string; label: string; stages: string[] }[] = [
  { key: 'design', label: '企划 / 设计', stages: ['planning', 'concept'] },
  { key: 'sample', label: '打样', stages: ['prototype', 'prototype_review'] },
  { key: 'review', label: '样品评审', stages: ['sample_review'] },
  { key: 'cost', label: '成本核算', stages: ['costing', 'costing_review'] },
  { key: 'lock', label: '锁定 / 完成', stages: ['locked', 'completed'] },
];

interface Props {
  rows: StyleTaskRow[];
  priorities: Map<string, TaskPriority>;
  ownerLoads: OwnerLoad[];
  onRowClick: (row: StyleTaskRow) => void;
}

function TaskRowItem({
  row,
  priority,
  onClick,
}: {
  row: StyleTaskRow;
  priority: TaskPriority;
  onClick: () => void;
}) {
  const pm = PRIORITY_META[priority];
  const stageMeta = STAGE_MAP[row.currentStage];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg bg-white px-3 py-2 text-left shadow-sm transition hover:shadow-md"
    >
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${pm.bg} ${pm.text} ${pm.border}`}
      >
        {priority}
      </span>
      <span className="shrink-0 font-mono text-xs font-semibold text-slate-700">{row.skuCode}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{row.styleName}</span>
      {stageMeta && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${stageMeta.bgColor} ${stageMeta.textColor}`}
        >
          {stageMeta.label}
        </span>
      )}
      {row.blocked && (
        <span className="shrink-0 text-[11px] font-semibold text-rose-600">阻塞</span>
      )}
      {row.overdue && !row.blocked && (
        <span className="shrink-0 text-[11px] font-semibold text-rose-600">逾期</span>
      )}
      <span className="shrink-0 text-[11px] text-slate-400">{row.owner}</span>
      <span
        className={`shrink-0 text-[11px] ${
          row.overdue
            ? 'font-semibold text-rose-600'
            : row.dueThisWeek
              ? 'font-medium text-amber-600'
              : 'text-slate-400'
        }`}
      >
        {formatDate(row.dueDate)}
      </span>
      <span className="shrink-0 text-slate-300">→</span>
    </button>
  );
}

export default function TaskWorkOrderCenter({ rows, priorities, ownerLoads, onRowClick }: Props) {
  const [view, setView] = useState<WorkOrderView>('priority');

  const VIEWS: { key: WorkOrderView; label: string }[] = [
    { key: 'priority', label: '优先级' },
    { key: 'owner', label: '按责任人' },
    { key: 'stage', label: '按阶段' },
  ];

  const sortedRows = [...rows].sort((a, b) => {
    const pOrder: Record<TaskPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const pa = pOrder[priorities.get(a.styleId) ?? 'P3'];
    const pb = pOrder[priorities.get(b.styleId) ?? 'P3'];
    if (pa !== pb) return pa - pb;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              view === v.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Priority view */}
      {view === 'priority' && (
        <div className="space-y-3">
          {(['P0', 'P1', 'P2'] as const).map((p) => {
            const pRows = sortedRows.filter((r) => (priorities.get(r.styleId) ?? 'P3') === p);
            if (pRows.length === 0) return null;
            const pm = PRIORITY_META[p];
            return (
              <div key={p} className={`rounded-xl border ${pm.border} ${pm.bg} p-4`}>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${pm.badge}`}>
                    {pm.label}
                  </span>
                  <span className="text-xs text-slate-500">{pRows.length} 款</span>
                </div>
                <div className="space-y-1.5">
                  {pRows.map((r) => (
                    <TaskRowItem
                      key={r.styleId}
                      row={r}
                      priority={p}
                      onClick={() => onRowClick(r)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {sortedRows.length > 0 &&
            sortedRows.every((r) => (priorities.get(r.styleId) ?? 'P3') === 'P3') && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                当前无高优先级任务，所有任务均为 P3 正常推进。
              </div>
            )}
        </div>
      )}

      {/* Owner view */}
      {view === 'owner' && (
        <div className="space-y-3">
          {ownerLoads.map((load) => {
            const ownedRows = sortedRows.filter((r) => r.owner === load.owner);
            if (ownedRows.length === 0) return null;
            return (
              <div
                key={load.owner}
                className={`rounded-xl border p-4 ${
                  load.overloaded ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{load.owner}</span>
                  {load.overloaded && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                      超载
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{ownedRows.length} 款在研</span>
                </div>
                <div className="space-y-1.5">
                  {ownedRows.map((r) => (
                    <TaskRowItem
                      key={r.styleId}
                      row={r}
                      priority={priorities.get(r.styleId) ?? 'P3'}
                      onClick={() => onRowClick(r)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stage view */}
      {view === 'stage' && (
        <div className="space-y-3">
          {STAGE_GROUPS.map((group) => {
            const groupRows = sortedRows.filter((r) => group.stages.includes(r.currentStage));
            if (groupRows.length === 0) return null;
            return (
              <div key={group.key} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="font-semibold text-slate-700">{group.label}</span>
                  <span className="text-xs text-slate-400">{groupRows.length} 款</span>
                </div>
                <div className="space-y-1.5">
                  {groupRows.map((r) => (
                    <TaskRowItem
                      key={r.styleId}
                      row={r}
                      priority={priorities.get(r.styleId) ?? 'P3'}
                      onClick={() => onRowClick(r)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
