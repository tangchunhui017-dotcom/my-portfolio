import type { StyleTaskRow } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TaskHistoryEvent {
  date: string;
  action: string;
  note?: string;
  type: 'created' | 'progressed' | 'blocked' | 'review' | 'completed';
}

export type DepStatus = 'not_started' | 'in_progress' | 'at_risk' | 'done' | 'blocked';

export interface TaskDependencies {
  design: DepStatus;
  sample: DepStatus;
  material: DepStatus;
  cost: DepStatus;
  tech: DepStatus;
}

export interface SampleSubStatus {
  materialConfirmed: boolean;
  sampleShipped: boolean;
  fitTested: boolean;
  revisionRound: number;
}

export interface OwnerLoad {
  owner: string;
  activeCount: number;
  capacity: number;
  overloaded: boolean;
  warning: boolean;
  blockedCount: number;
  overdueCount: number;
  dueThisWeekCount: number;
  criticalTasks: { skuCode: string; styleName: string; statusBadge: string }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function execToDepStatus(s: string): DepStatus {
  if (s === 'blocked') return 'blocked';
  if (s === 'completed') return 'done';
  if (s === 'pending_review') return 'at_risk';
  if (s === 'in_progress') return 'in_progress';
  return 'not_started';
}

// ── Derivation builders ───────────────────────────────────────────────────────

export function deriveTaskDependencies(row: StyleTaskRow): TaskDependencies {
  return {
    design: execToDepStatus(row.designStatus),
    sample: execToDepStatus(row.sampleStatus),
    material: execToDepStatus(row.materialStatus),
    cost: execToDepStatus(row.costStatus),
    tech: execToDepStatus(row.technicalStatus),
  };
}

export function deriveSampleSubStatus(row: StyleTaskRow): SampleSubStatus {
  const materialActive = row.materialStatus !== 'not_started';
  const sampleActive =
    row.sampleStatus === 'in_progress' ||
    row.sampleStatus === 'pending_review' ||
    row.sampleStatus === 'completed';
  const hasReview = row.latestReview !== null;
  const isSampleReview = row.latestReview?.reviewType === 'sample_review';
  return {
    materialConfirmed: materialActive,
    sampleShipped: sampleActive,
    fitTested: hasReview && isSampleReview,
    revisionRound: isSampleReview ? 1 : 0,
  };
}

export function deriveTaskHistory(row: StyleTaskRow): TaskHistoryEvent[] {
  const events: TaskHistoryEvent[] = [];
  const dueMs = new Date(row.dueDate).getTime();
  const W = 7 * 24 * 3600 * 1000;

  events.push({
    date: new Date(dueMs - 6 * W).toISOString().slice(0, 10),
    action: '任务创建',
    note: row.architectureSource ? '来自产品架构拆解' : '手动录入任务池',
    type: 'created',
  });

  if (row.designStatus !== 'not_started') {
    events.push({
      date: new Date(dueMs - 5 * W).toISOString().slice(0, 10),
      action: '设计工作启动',
      type: 'progressed',
    });
  }

  if (row.sampleStatus !== 'not_started') {
    events.push({
      date: new Date(dueMs - 4 * W).toISOString().slice(0, 10),
      action: '进入打样阶段',
      type: 'progressed',
    });
  }

  if (row.latestReview) {
    events.push({
      date: row.latestReview.reviewDate,
      action: '评审记录',
      note: row.latestReview.issueDescription || undefined,
      type: 'review',
    });
  }

  if (row.blocked) {
    events.push({
      date: new Date(dueMs - 1 * W).toISOString().slice(0, 10),
      action: '任务进入阻塞状态',
      note: row.nextAction,
      type: 'blocked',
    });
  }

  if (row.latestAction) {
    events.push({
      date: row.latestAction.dueDate,
      action: row.latestAction.actionDescription,
      type: 'progressed',
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function deriveOwnerLoads(rows: StyleTaskRow[]): OwnerLoad[] {
  const CAPACITY = 5;
  const map = new Map<string, StyleTaskRow[]>();
  rows.forEach((r) => {
    if (!map.has(r.owner)) map.set(r.owner, []);
    map.get(r.owner)!.push(r);
  });

  return Array.from(map.entries())
    .map(([owner, ownedRows]) => {
      const activeCount = ownedRows.length;
      const blocked = ownedRows.filter((r) => r.blocked);
      const overdue = ownedRows.filter((r) => r.overdue);
      const dueThisWeek = ownedRows.filter((r) => r.dueThisWeek && !r.overdue);
      const overloaded = activeCount > CAPACITY;
      const warning = activeCount === CAPACITY;
      const critical = [...blocked, ...overdue]
        .filter((r, i, arr) => arr.findIndex((x) => x.styleId === r.styleId) === i)
        .slice(0, 3)
        .map((r) => ({
          skuCode: r.skuCode,
          styleName: r.styleName,
          statusBadge: r.blocked ? '阻塞' : '逾期',
        }));
      return {
        owner,
        activeCount,
        capacity: CAPACITY,
        overloaded,
        warning,
        blockedCount: blocked.length,
        overdueCount: overdue.length,
        dueThisWeekCount: dueThisWeek.length,
        criticalTasks: critical,
      };
    })
    .sort((a, b) => {
      if (a.overloaded !== b.overloaded) return a.overloaded ? -1 : 1;
      if (a.warning !== b.warning) return a.warning ? -1 : 1;
      return b.activeCount - a.activeCount;
    });
}
