import type { DesignItem, Task } from '@/lib/design-review-center/types';
import type { DesignReviewActionIntent, DesignReviewGateReason } from '@/lib/openclaw/tasks';

interface ApplyDesignReviewActionIntentsInput {
  baseItems: DesignItem[];
  baseTasks: Task[];
  intents: DesignReviewActionIntent[];
}

export interface DesignReviewCommittedState {
  designItems: DesignItem[];
  tasks: Task[];
  committed_at: string | null;
  export_batch_id: string | null;
}

export interface DesignReviewPhaseTransitionEvaluation {
  allowedItemIds: string[];
  blockedReasons: DesignReviewGateReason[];
}

export const DESIGN_REVIEW_COMMITTED_STATE_STORAGE_KEY = 'openclaw-design-review-committed-state-v1';

function resolveTaskGroup(taskType: string): Task['taskGroup'] {
  if (taskType === 'design') return 'design';
  if (taskType === 'sample' || taskType === 'testing') return 'development';
  if (taskType === 'sourcing') return 'cost';
  return 'planning';
}

function roundCost(value: number) {
  return Math.round(value * 100) / 100;
}

function buildGateReason(
  item: DesignItem,
  code: DesignReviewGateReason['code'],
  reason: string,
): DesignReviewGateReason {
  return {
    item_id: item.itemId,
    item_name: item.itemName,
    sku_code: item.skuCode,
    code,
    reason,
  };
}

function getBlockedItemCount(blockedReasons: DesignReviewGateReason[]) {
  return new Set(blockedReasons.map((reason) => reason.item_id)).size;
}

export function evaluateDesignReviewPhaseTransition(items: DesignItem[]): DesignReviewPhaseTransitionEvaluation {
  const blockedReasons = items.flatMap((item) => {
    const reasons: DesignReviewGateReason[] = [];

    if (
      typeof item.targetCostEstimate === 'number' &&
      typeof item.sampleQuotedCost === 'number' &&
      item.targetCostEstimate > 0 &&
      item.sampleQuotedCost > item.targetCostEstimate * 1.1
    ) {
      const variance = roundCost(((item.sampleQuotedCost - item.targetCostEstimate) / item.targetCostEstimate) * 100);
      reasons.push(
        buildGateReason(
          item,
          'cost_over_target',
          `预估成本 ${roundCost(item.sampleQuotedCost)} 超出目标成本 ${roundCost(item.targetCostEstimate)} 的 ${variance}%，需特批后再流转。`,
        ),
      );
    }

    if (item.techPackStatus === 'blocked') {
      reasons.push(buildGateReason(item, 'techpack_blocked', 'Tech Pack 当前阻塞，需先完成工艺包与工厂交接。'));
    }

    if (item.toolingStatus === 'blocked') {
      reasons.push(buildGateReason(item, 'tooling_blocked', '开模状态阻塞，需先解除模具问题后再进入下一阶段。'));
    }

    return reasons;
  });

  const blockedIds = new Set(blockedReasons.map((reason) => reason.item_id));

  return {
    allowedItemIds: items.filter((item) => !blockedIds.has(item.itemId)).map((item) => item.itemId),
    blockedReasons,
  };
}

export function summarizeDesignReviewPhaseTransitionEvaluation(
  evaluation: DesignReviewPhaseTransitionEvaluation,
): string {
  const blockedCount = getBlockedItemCount(evaluation.blockedReasons);

  if (blockedCount === 0) {
    return `已加入动作队列：${evaluation.allowedItemIds.length} 款单款待批量改阶段。`;
  }

  if (evaluation.allowedItemIds.length === 0) {
    return `本次流转被门禁拦截：${blockedCount} 款单款需先解除成本、Tech Pack 或开模阻塞。`;
  }

  return `已加入动作队列：${evaluation.allowedItemIds.length} 款允许流转，${blockedCount} 款因门禁被拦截。`;
}

export function createDesignReviewCommittedState(baseItems: DesignItem[], baseTasks: Task[]): DesignReviewCommittedState {
  return {
    designItems: [...baseItems],
    tasks: [...baseTasks],
    committed_at: null,
    export_batch_id: null,
  };
}

export function getDesignReviewActionMessage(intent: DesignReviewActionIntent): string {
  if (intent.type === 'batch-phase-transition') {
    return summarizeDesignReviewPhaseTransitionEvaluation({
      allowedItemIds: intent.item_ids,
      blockedReasons: intent.payload.blocked_reasons,
    });
  }

  if (intent.type === 'batch-owner-assignment') {
    return `已加入动作队列：${intent.item_ids.length} 款单款待批量改负责人。`;
  }

  if (intent.type === 'batch-next-review-date') {
    return `已加入动作队列：${intent.item_ids.length} 款单款待批量设置下次评审时间。`;
  }

  return `已加入动作队列：${intent.item_ids.length} 款单款待批量生成任务。`;
}

export function applyDesignReviewActionIntents({
  baseItems,
  baseTasks,
  intents,
}: ApplyDesignReviewActionIntentsInput) {
  let nextItems = [...baseItems];
  let generatedTasks: Task[] = [];

  intents.forEach((intent) => {
    const selectedSet = new Set(intent.item_ids);

    if (intent.type === 'batch-phase-transition') {
      nextItems = nextItems.map((item) => {
        if (!selectedSet.has(item.itemId)) return item;
        return {
          ...item,
          designStatus: intent.payload.phase,
          updatedAt: intent.created_at,
          updatedBy: intent.created_by,
          syncStatus: 'pending',
        };
      });
      return;
    }

    if (intent.type === 'batch-owner-assignment') {
      nextItems = nextItems.map((item) => {
        if (!selectedSet.has(item.itemId)) return item;
        return {
          ...item,
          designer: intent.payload.owner,
          updatedAt: intent.created_at,
          updatedBy: intent.created_by,
          syncStatus: 'pending',
        };
      });
      return;
    }

    if (intent.type === 'batch-next-review-date') {
      nextItems = nextItems.map((item) => {
        if (!selectedSet.has(item.itemId)) return item;
        return {
          ...item,
          nextReviewDate: intent.payload.nextReviewDate,
          updatedAt: intent.created_at,
          updatedBy: intent.created_by,
          syncStatus: 'pending',
        };
      });
      return;
    }

    const selectedItems = nextItems.filter((item) => selectedSet.has(item.itemId));

    generatedTasks = [
      ...selectedItems.map((item) => ({
        taskId: `${intent.id}-${item.itemId}`,
        seriesId: item.seriesId,
        taskType: intent.payload.taskType,
        taskGroup: resolveTaskGroup(intent.payload.taskType),
        priority: intent.payload.priority,
        title: `${intent.payload.title} / ${item.itemName}`,
        description: intent.payload.description
          ? `${intent.payload.description}（关联款号 ${item.skuCode}）`
          : `关联款号 ${item.skuCode}，请按评审结论继续推进。`,
        assignee: intent.payload.assignee || item.designer,
        status: 'pending',
        dueDate: intent.payload.dueDate,
        estimatedHours: 4,
        actualHours: 0,
        dependencies: [item.itemId],
        tags: ['ActionIntent', intent.payload.taskType, item.skuCode],
        createdAt: intent.created_at,
        updatedAt: intent.created_at,
        source: 'manual' as const,
        sourceId: intent.id,
        syncStatus: 'pending' as const,
      })),
      ...generatedTasks,
    ];

    nextItems = nextItems.map((item) => {
      if (!selectedSet.has(item.itemId)) return item;
      return {
        ...item,
        updatedAt: intent.created_at,
        updatedBy: intent.created_by,
        syncStatus: 'pending',
      };
    });
  });

  return {
    designItems: nextItems,
    tasks: [...generatedTasks, ...baseTasks],
  };
}

export function commitDesignReviewActionIntents(
  baseState: DesignReviewCommittedState,
  intents: DesignReviewActionIntent[],
  exportBatchId: string,
  committedAt = new Date().toISOString(),
): DesignReviewCommittedState {
  const projected = applyDesignReviewActionIntents({
    baseItems: baseState.designItems,
    baseTasks: baseState.tasks,
    intents,
  });

  return {
    designItems: projected.designItems,
    tasks: projected.tasks,
    committed_at: committedAt,
    export_batch_id: exportBatchId,
  };
}

export function parseStoredDesignReviewCommittedState(raw: string | null): DesignReviewCommittedState | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DesignReviewCommittedState>;
    if (!parsed || !Array.isArray(parsed.designItems) || !Array.isArray(parsed.tasks)) return null;
    return {
      designItems: parsed.designItems as DesignItem[],
      tasks: parsed.tasks as Task[],
      committed_at: parsed.committed_at ?? null,
      export_batch_id: parsed.export_batch_id ?? null,
    };
  } catch {
    return null;
  }
}

export function loadDesignReviewCommittedState(): DesignReviewCommittedState | null {
  if (typeof window === 'undefined') return null;
  return parseStoredDesignReviewCommittedState(window.localStorage.getItem(DESIGN_REVIEW_COMMITTED_STATE_STORAGE_KEY));
}

export function saveDesignReviewCommittedState(state: DesignReviewCommittedState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DESIGN_REVIEW_COMMITTED_STATE_STORAGE_KEY, JSON.stringify(state));
}