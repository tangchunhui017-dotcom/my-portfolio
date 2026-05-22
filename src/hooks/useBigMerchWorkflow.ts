'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  WORKFLOW_GATES,
  WORKFLOW_NODES,
  detectDefaultSeason,
  getNodeDateRange,
  getSeasonT,
  isCollabBlocker,
  type ActionPlanRuntime,
  type Blocker,
  type DeliverableStatus,
  type Department,
  type GateRuntime,
  type NodeRuntime,
  type NodeStatus,
  type RiskLevel,
  type Season,
  type SeasonCycleState,
  type WorkflowComment,
  type WorkflowFilter,
  type WorkflowNodeDef,
  type WorkflowState,
} from '@/config/bigMerchWorkflow';

// ─── 常量 ────────────────────────────────────────────────────────────────────

const LS_STATE_KEY = 'bp:workflow:default:state';
const SCHEMA_VERSION = 1 as const;

// ─── 默认值工厂 ──────────────────────────────────────────────────────────────

function makeDefaultNodeRuntime(): NodeRuntime {
  return {
    tasks: {},
    actionPlans: {},
    deliverables: {},
    blockers: [],
    comments: [],
    footwearValues: {},
    questionsAnswered: {},
    lastUpdated: Date.now(),
  };
}

function makeDefaultCycleState(): SeasonCycleState {
  return { nodes: {}, gates: {} };
}

function makeDefaultState(today: Date): WorkflowState {
  const { season, year } = detectDefaultSeason(today);
  return {
    schemaVersion: SCHEMA_VERSION,
    active: { season, year },
    cycles: {},
    view: 'timeline',
    simulatedDate: undefined,
    filter: undefined,
  };
}

// ─── localStorage 工具 ────────────────────────────────────────────────────────

function loadState(today: Date): WorkflowState {
  if (typeof window === 'undefined') return makeDefaultState(today);
  try {
    const raw = window.localStorage.getItem(LS_STATE_KEY);
    if (!raw) return makeDefaultState(today);
    const parsed = JSON.parse(raw) as WorkflowState;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return makeDefaultState(today);
    return parsed;
  } catch {
    return makeDefaultState(today);
  }
}

function saveState(state: WorkflowState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

// ─── 状态派生 ─────────────────────────────────────────────────────────────────

function deriveNodeStatus(
  node: WorkflowNodeDef,
  runtime: NodeRuntime | undefined,
  currentDate: Date,
  season: Season,
  year: number,
): NodeStatus {
  if (!runtime) return '未开始';

  const { end } = getNodeDateRange(node, season, year);

  // 1. 协同类 blocker
  if (runtime.blockers.some(isCollabBlocker)) return '待协同';

  // 2. 必填 deliverable rejected
  const hasRejected = node.deliverables
    .filter((d) => d.required)
    .some((d) => runtime.deliverables[d.id] === 'rejected');
  if (hasRejected) return '预警';

  // 4. 必填全 approved + 必填 actionPlans 全完成 => 已完成
  const allDelivApproved = node.deliverables
    .filter((d) => d.required)
    .every((d) => runtime.deliverables[d.id] === 'approved');
  const allPlansChecked = node.actionPlans
    .filter((ap) => ap.required)
    .every((ap) => runtime.actionPlans[ap.id]?.checked ?? false);
  if (allDelivApproved && allPlansChecked) return '已完成';

  // 3. 超期未完成
  if (currentDate > end) return '延期';

  // 5. 任一进度
  const hasProgress =
    Object.values(runtime.actionPlans).some((ap) => ap.progress > 0 || ap.checked) ||
    Object.values(runtime.deliverables).some(
      (s) => s === 'submitted' || s === 'approved',
    );
  if (hasProgress) return '进行中';

  return '未开始';
}

function deriveNodeRisk(
  node: WorkflowNodeDef,
  runtime: NodeRuntime | undefined,
  status: NodeStatus,
  currentDate: Date,
  season: Season,
  year: number,
  allStatuses: Record<string, NodeStatus>,
): RiskLevel {
  const { end } = getNodeDateRange(node, season, year);
  const T = getSeasonT(season, year);
  const daysToT = (T.getTime() - currentDate.getTime()) / 86400000;
  const daysToEnd = (end.getTime() - currentDate.getTime()) / 86400000;
  const nodeIndex = WORKFLOW_NODES.findIndex((n) => n.id === node.id);

  // 高风险
  if (currentDate > end && status !== '已完成') return '高';

  const downstreamProgressing = WORKFLOW_NODES.slice(nodeIndex + 1).some(
    (n) => allStatuses[n.id] === '进行中' || allStatuses[n.id] === '已完成',
  );
  if (downstreamProgressing && status !== '已完成') return '高';

  if ((node.ownerDept === 'material' || node.ownerDept === 'supply') && daysToT < 90) {
    const hasUnapproved = node.deliverables
      .filter((d) => d.required)
      .some((d) => !runtime || runtime.deliverables[d.id] !== 'approved');
    if (hasUnapproved) return '高';
  }

  if (node.ownerDept === 'finance') {
    const hasRejected = runtime
      ? node.deliverables
          .filter((d) => d.required)
          .some((d) => runtime.deliverables[d.id] === 'rejected')
      : false;
    if (hasRejected) return '高';
  }

  // 中风险
  const hasPendingRequired = node.deliverables
    .filter((d) => d.required)
    .some((d) => !runtime || !runtime.deliverables[d.id] || runtime.deliverables[d.id] === 'pending');
  if (hasPendingRequired && daysToEnd < 14 && daysToEnd >= 0) return '中';

  const now = Date.now();
  const hasOldBlocker = runtime?.blockers.some(
    (b) => !b.resolved && now - b.ts > 7 * 86400000,
  );
  if (hasOldBlocker) return '中';

  const salesPlans = node.actionPlans.filter(
    (ap) => ap.ownerDept === 'merch' || ap.ownerDept === 'merch_ops' || ap.ownerDept === 'finance',
  );
  if (salesPlans.length > 0) {
    const avg =
      salesPlans.reduce((s, ap) => s + (runtime?.actionPlans[ap.id]?.progress ?? 0), 0) /
      salesPlans.length;
    if (avg < 30 && status === '进行中') return '中';
  }

  return node.baselineRisk;
}

function identifyCurrentNodes(
  season: Season,
  year: number,
  currentDate: Date,
  nodeStatuses: Record<string, NodeStatus>,
): WorkflowNodeDef[] {
  const active = WORKFLOW_NODES.filter((n) => {
    const { start, end } = getNodeDateRange(n, season, year);
    return currentDate >= start && currentDate <= end;
  });
  if (active.length > 0) return active;

  // fallback: 最近未完成节点；如果全部完成，则返回空数组让驾驶舱显示完成态
  const firstIncomplete = WORKFLOW_NODES.find((n) => nodeStatuses[n.id] !== '已完成');
  return firstIncomplete ? [firstIncomplete] : [];
}

function deriveGateStatus(
  gateId: string,
  nodeStatuses: Record<string, NodeStatus>,
  gateRuntime?: GateRuntime,
): { passed: boolean; canPass: boolean; reason?: string } {
  if (gateRuntime?.passed) return { passed: true, canPass: true };
  const gate = WORKFLOW_GATES.find((g) => g.id === gateId);
  if (!gate) return { passed: false, canPass: false };
  const incomplete = gate.requiredNodeIds.filter((id) => nodeStatuses[id] !== '已完成');
  if (incomplete.length === 0) {
    return { passed: false, canPass: true, reason: `可通过 ${gateId} 以解锁下游阶段` };
  }
  return {
    passed: false,
    canPass: false,
    reason: `需先完成 ${gateId}：节点 ${incomplete.join('、')} 尚未完成`,
  };
}

// ─── 周期 key ────────────────────────────────────────────────────────────────

function cycleKey(season: Season, year: number): string {
  return `${season}${year}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseBigMerchWorkflowReturn {
  // 核心状态
  workflowState: WorkflowState;

  // 派生（不存储）
  currentNodes: WorkflowNodeDef[];
  nodeStatuses: Record<string, NodeStatus>;
  nodeRisks: Record<string, RiskLevel>;
  gateStatuses: Record<string, { passed: boolean; canPass: boolean; reason?: string }>;

  // 当前周期
  activeSeason: Season;
  activeYear: number;
  currentDate: Date;
  activeView: 'timeline' | 'by_dept';
  activeFilter: WorkflowFilter | null;

  // 控制
  setActiveSeason: (season: Season, year: number) => void;
  setSimulatedDate: (date: string) => void;
  clearSimulatedDate: () => void;
  setView: (view: 'timeline' | 'by_dept') => void;
  setFilter: (filter: WorkflowFilter | null) => void;

  // runtime mutations
  updateActionPlan: (nodeId: string, planId: string, update: Partial<ActionPlanRuntime>) => void;
  updateDeliverable: (nodeId: string, delivId: string, status: DeliverableStatus) => void;
  addBlocker: (nodeId: string, blocker: Omit<Blocker, 'id' | 'ts'>) => void;
  resolveBlocker: (nodeId: string, blockerId: string) => void;
  addComment: (nodeId: string, comment: Omit<WorkflowComment, 'id' | 'ts'>) => void;
  passGate: (gateId: string, passedBy: string, notes?: string) => void;
  updateFootwearValue: (nodeId: string, key: string, value: string) => void;
  updateQuestionAnswered: (nodeId: string, index: number, answered: boolean) => void;

  // helpers
  getNodeRuntime: (nodeId: string) => NodeRuntime;
  isGateLocked: (nodeId: string) => { locked: boolean; reason?: string };
}

export function useBigMerchWorkflow(): UseBigMerchWorkflowReturn {
  const today = useMemo(() => new Date(), []);

  // SSR 与 client 首次 render 都使用默认值，避免 hydration mismatch
  const [state, setStateRaw] = useState<WorkflowState>(() => makeDefaultState(today));

  // 持久化写入（带防抖）
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setState = useCallback((updater: (prev: WorkflowState) => WorkflowState) => {
    setStateRaw((prev) => {
      const next = updater(prev);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveState(next), 300);
      return next;
    });
  }, []);

  // 客户端挂载后从 localStorage 加载真实状态
  useEffect(() => {
    setStateRaw(loadState(today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当前日期（考虑模拟日期）
  const currentDate = useMemo<Date>(() => {
    if (state.simulatedDate) {
      const d = new Date(state.simulatedDate);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return today;
  }, [state.simulatedDate, today]);

  const { season: activeSeason, year: activeYear } = state.active;
  const ck = cycleKey(activeSeason, activeYear);
  const cycleState: SeasonCycleState = state.cycles[ck] ?? makeDefaultCycleState();

  // 获取节点 runtime
  const getNodeRuntime = useCallback(
    (nodeId: string): NodeRuntime => {
      return cycleState.nodes[nodeId] ?? makeDefaultNodeRuntime();
    },
    [cycleState.nodes],
  );

  // 派生节点状态
  const nodeStatuses = useMemo<Record<string, NodeStatus>>(() => {
    const result: Record<string, NodeStatus> = {};
    // 先全部算一遍（不含下游判断）
    for (const node of WORKFLOW_NODES) {
      const rt = cycleState.nodes[node.id];
      result[node.id] = deriveNodeStatus(node, rt, currentDate, activeSeason, activeYear);
    }
    return result;
  }, [cycleState.nodes, currentDate, activeSeason, activeYear]);

  // 派生节点风险
  const nodeRisks = useMemo<Record<string, RiskLevel>>(() => {
    const result: Record<string, RiskLevel> = {};
    for (const node of WORKFLOW_NODES) {
      const rt = cycleState.nodes[node.id];
      result[node.id] = deriveNodeRisk(
        node,
        rt,
        nodeStatuses[node.id],
        currentDate,
        activeSeason,
        activeYear,
        nodeStatuses,
      );
    }
    return result;
  }, [cycleState.nodes, nodeStatuses, currentDate, activeSeason, activeYear]);

  // 当前节点
  const currentNodes = useMemo(
    () => identifyCurrentNodes(activeSeason, activeYear, currentDate, nodeStatuses),
    [activeSeason, activeYear, currentDate, nodeStatuses],
  );

  // Gate 状态
  const gateStatuses = useMemo<Record<string, { passed: boolean; canPass: boolean; reason?: string }>>(() => {
    const result: Record<string, { passed: boolean; canPass: boolean; reason?: string }> = {};
    for (const gate of WORKFLOW_GATES) {
      result[gate.id] = deriveGateStatus(gate.id, nodeStatuses, cycleState.gates[gate.id]);
    }
    return result;
  }, [nodeStatuses, cycleState.gates]);

  // 判断节点是否被 Gate 锁定
  const isGateLocked = useCallback(
    (nodeId: string): { locked: boolean; reason?: string } => {
      const node = WORKFLOW_NODES.find((n) => n.id === nodeId);
      if (!node) return { locked: false };
      for (const gate of WORKFLOW_GATES) {
        // 下游节点属于 gate.toStage 或更后的阶段，且 gate 未通过
        const stageOrder: string[] = ['startup', 'revise', 'form', 'launch', 'review'];
        const gateToIdx = stageOrder.indexOf(gate.toStage);
        const nodeStageIdx = stageOrder.indexOf(node.stage);
        if (nodeStageIdx >= gateToIdx && !gateStatuses[gate.id]?.passed) {
          return { locked: true, reason: gateStatuses[gate.id]?.reason };
        }
      }
      return { locked: false };
    },
    [gateStatuses],
  );

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const mutateCycle = useCallback(
    (fn: (draft: SeasonCycleState) => SeasonCycleState) => {
      setState((prev) => {
        const key = cycleKey(prev.active.season, prev.active.year);
        const current = prev.cycles[key] ?? makeDefaultCycleState();
        return { ...prev, cycles: { ...prev.cycles, [key]: fn(current) } };
      });
    },
    [setState],
  );

  const mutateNodeRuntime = useCallback(
    (nodeId: string, fn: (rt: NodeRuntime) => NodeRuntime) => {
      mutateCycle((cycle) => {
        const rt = cycle.nodes[nodeId] ?? makeDefaultNodeRuntime();
        return { ...cycle, nodes: { ...cycle.nodes, [nodeId]: fn(rt) } };
      });
    },
    [mutateCycle],
  );

  const setActiveSeason = useCallback(
    (season: Season, year: number) => {
      setState((prev) => ({ ...prev, active: { season, year } }));
    },
    [setState],
  );

  const setSimulatedDate = useCallback(
    (date: string) => {
      setState((prev) => ({ ...prev, simulatedDate: date }));
    },
    [setState],
  );

  const clearSimulatedDate = useCallback(() => {
    setState((prev) => ({ ...prev, simulatedDate: undefined }));
  }, [setState]);

  const setView = useCallback(
    (view: 'timeline' | 'by_dept') => {
      setState((prev) => ({ ...prev, view }));
    },
    [setState],
  );

  const setFilter = useCallback(
    (filter: WorkflowFilter | null) => {
      setState((prev) => ({ ...prev, filter: filter ?? undefined }));
    },
    [setState],
  );

  const updateActionPlan = useCallback(
    (nodeId: string, planId: string, update: Partial<ActionPlanRuntime>) => {
      mutateNodeRuntime(nodeId, (rt) => ({
        ...rt,
        lastUpdated: Date.now(),
        actionPlans: {
          ...rt.actionPlans,
          [planId]: { ...(rt.actionPlans[planId] ?? { progress: 0, checked: false }), ...update },
        },
      }));
    },
    [mutateNodeRuntime],
  );

  const updateDeliverable = useCallback(
    (nodeId: string, delivId: string, status: DeliverableStatus) => {
      mutateNodeRuntime(nodeId, (rt) => ({
        ...rt,
        lastUpdated: Date.now(),
        deliverables: { ...rt.deliverables, [delivId]: status },
      }));
    },
    [mutateNodeRuntime],
  );

  const addBlocker = useCallback(
    (nodeId: string, blocker: Omit<Blocker, 'id' | 'ts'>) => {
      mutateNodeRuntime(nodeId, (rt) => ({
        ...rt,
        lastUpdated: Date.now(),
        blockers: [
          ...rt.blockers,
          { ...blocker, id: `blk-${Date.now()}`, ts: Date.now() },
        ],
      }));
    },
    [mutateNodeRuntime],
  );

  const resolveBlocker = useCallback(
    (nodeId: string, blockerId: string) => {
      mutateNodeRuntime(nodeId, (rt) => ({
        ...rt,
        lastUpdated: Date.now(),
        blockers: rt.blockers.map((b) => (b.id === blockerId ? { ...b, resolved: true } : b)),
      }));
    },
    [mutateNodeRuntime],
  );

  const addComment = useCallback(
    (nodeId: string, comment: Omit<WorkflowComment, 'id' | 'ts'>) => {
      mutateNodeRuntime(nodeId, (rt) => ({
        ...rt,
        lastUpdated: Date.now(),
        comments: [
          ...rt.comments,
          { ...comment, id: `cmt-${Date.now()}`, ts: Date.now() },
        ],
      }));
    },
    [mutateNodeRuntime],
  );

  const passGate = useCallback(
    (gateId: string, passedBy: string, notes?: string) => {
      mutateCycle((cycle) => ({
        ...cycle,
        gates: {
          ...cycle.gates,
          [gateId]: { passed: true, passedAt: Date.now(), passedBy, notes },
        },
      }));
    },
    [mutateCycle],
  );

  const updateFootwearValue = useCallback(
    (nodeId: string, key: string, value: string) => {
      mutateNodeRuntime(nodeId, (rt) => ({
        ...rt,
        lastUpdated: Date.now(),
        footwearValues: { ...rt.footwearValues, [key]: value },
      }));
    },
    [mutateNodeRuntime],
  );

  const updateQuestionAnswered = useCallback(
    (nodeId: string, index: number, answered: boolean) => {
      mutateNodeRuntime(nodeId, (rt) => ({
        ...rt,
        lastUpdated: Date.now(),
        questionsAnswered: { ...rt.questionsAnswered, [index]: answered },
      }));
    },
    [mutateNodeRuntime],
  );

  return {
    workflowState: state,
    currentNodes,
    nodeStatuses,
    nodeRisks,
    gateStatuses,
    activeSeason,
    activeYear,
    currentDate,
    activeView: state.view,
    activeFilter: state.filter ?? null,
    setActiveSeason,
    setSimulatedDate,
    clearSimulatedDate,
    setView,
    setFilter,
    updateActionPlan,
    updateDeliverable,
    addBlocker,
    resolveBlocker,
    addComment,
    passGate,
    updateFootwearValue,
    updateQuestionAnswered,
    getNodeRuntime,
    isGateLocked,
  };
}

// ─── 辅助 hooks ───────────────────────────────────────────────────────────────

/** 过滤后的节点列表（按 WorkflowFilter） */
export function useFilteredNodes(
  filter: WorkflowFilter | null,
  nodeStatuses: Record<string, NodeStatus>,
  nodeRisks: Record<string, RiskLevel>,
): WorkflowNodeDef[] {
  return useMemo(() => {
    if (!filter) return WORKFLOW_NODES;
    return WORKFLOW_NODES.filter((n) => {
      if (filter.stage && !filter.stage.includes(n.stage)) return false;
      if (filter.status && !filter.status.includes(nodeStatuses[n.id])) return false;
      if (filter.riskLevel && !filter.riskLevel.includes(nodeRisks[n.id])) return false;
      if (
        filter.dept &&
        !filter.dept.includes(n.ownerDept as Department) &&
        !filter.dept.some((d) => n.collaboratorDepts.includes(d as Department))
      )
        return false;
      return true;
    });
  }, [filter, nodeStatuses, nodeRisks]);
}
