import type { StyleTaskRow } from './types';

export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type TaskFilter =
  | 'all'
  | 'blocked'
  | 'pendingReview'
  | 'dueSoon'
  | 'highRisk'
  | 'gateImpact'
  | 'launchImpact'
  | 'costRisk';

export type TaskViewMode = 'card' | 'table';

export interface TaskSourceAlignment {
  sourceId: string;
  sourceName: string;
  sourceModule: string;
  inputSummary: string;
  tasksGenerated: number;
  tasksPending: number;
  alignmentStatus: 'aligned' | 'partial' | 'unaligned' | 'deviated';
  riskLevel: 'low' | 'medium' | 'high';
  recommendedAction: string;
  relatedTabKey: string;
}

export const TASK_SOURCE_ALIGNMENTS: TaskSourceAlignment[] = [
  {
    sourceId: 'src-001',
    sourceName: 'OTB 预算',
    sourceModule: '商品企划 > OTB 预算',
    inputSummary: 'W2 跑步品类 SKU 目标 18 款，成本带 399–799',
    tasksGenerated: 14,
    tasksPending: 4,
    alignmentStatus: 'partial',
    riskLevel: 'medium',
    recommendedAction: '补全 W2 剩余 4 款设计任务并确认成本区间',
    relatedTabKey: 'overview',
  },
  {
    sourceId: 'src-002',
    sourceName: '产品架构',
    sourceModule: '设计企划 > 产品架构',
    inputSummary: 'Comfort Flex 系列 Hero × 2、Core × 4、Filler × 2 拆解完成',
    tasksGenerated: 8,
    tasksPending: 0,
    alignmentStatus: 'aligned',
    riskLevel: 'low',
    recommendedAction: '持续跟进 Hero 款首样进度',
    relatedTabKey: 'productArchitecture',
  },
  {
    sourceId: 'src-003',
    sourceName: '评审决议',
    sourceModule: '设计企划 > 评审决议',
    inputSummary: '本季 3 款收到材料返工决议，需重新打样',
    tasksGenerated: 3,
    tasksPending: 1,
    alignmentStatus: 'partial',
    riskLevel: 'high',
    recommendedAction: '确认材料返工任务责任人，2 周内完成',
    relatedTabKey: 'reviewDecisionCenter',
  },
  {
    sourceId: 'src-004',
    sourceName: '波段研发节点',
    sourceModule: '设计企划 > 波段研发节点',
    inputSummary: 'W2 首样 Gate 截止 2026-06-15，4 款尚未完成评审准备',
    tasksGenerated: 4,
    tasksPending: 4,
    alignmentStatus: 'unaligned',
    riskLevel: 'high',
    recommendedAction: '立即确认 4 款首样进度，指定推进人和截止时间',
    relatedTabKey: 'developmentGateTable',
  },
  {
    sourceId: 'src-005',
    sourceName: '主题与系列策略',
    sourceModule: '设计企划 > 主题与系列策略',
    inputSummary: 'Street Flow 系列方向确认，设计任务待拆解',
    tasksGenerated: 6,
    tasksPending: 2,
    alignmentStatus: 'partial',
    riskLevel: 'low',
    recommendedAction: '完成 Street Flow 剩余 2 款款位拆解',
    relatedTabKey: 'themeStrategy',
  },
];

export function deriveTaskPriority(row: StyleTaskRow): TaskPriority {
  if ((row.blocked || row.riskLevel === 'blocking') && (row.overdue || row.nextGate !== null)) return 'P0';
  if (row.riskLevel === 'blocking') return 'P0';
  if (row.riskLevel === 'high' || row.overdue) return 'P1';
  if (row.pendingReview || row.dueThisWeek || row.riskLevel === 'medium') return 'P2';
  return 'P3';
}

export function deriveGateImpact(row: StyleTaskRow): boolean {
  return row.nextGate !== null && !row.nextGate.completed;
}

export function deriveLaunchImpact(row: StyleTaskRow): boolean {
  return row.blocked || row.overdue;
}

export function deriveCostRisk(row: StyleTaskRow): boolean {
  if (row.targetCost === null || row.quotedCost === null) return false;
  return row.quotedCost > row.targetCost * 1.1;
}
