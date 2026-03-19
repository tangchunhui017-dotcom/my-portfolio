import type { DesignItem, Task } from '@/lib/design-review-center/types';
import type { DesignReviewActionIntent } from '@/lib/openclaw/tasks';

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

export const DESIGN_REVIEW_COMMITTED_STATE_STORAGE_KEY = 'openclaw-design-review-committed-state-v1';

function resolveTaskGroup(taskType: string): Task['taskGroup'] {
  if (taskType === 'design') return 'design';
  if (taskType === 'sample' || taskType === 'testing') return 'development';
  if (taskType === 'sourcing') return 'cost';
  return 'planning';
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
    return `\u5df2\u52a0\u5165\u52a8\u4f5c\u961f\u5217\uff1a${intent.item_ids.length} \u6b3e\u5355\u6b3e\u5f85\u6279\u91cf\u6539\u9636\u6bb5\u3002`;
  }

  if (intent.type === 'batch-owner-assignment') {
    return `\u5df2\u52a0\u5165\u52a8\u4f5c\u961f\u5217\uff1a${intent.item_ids.length} \u6b3e\u5355\u6b3e\u5f85\u6279\u91cf\u6539\u8d1f\u8d23\u4eba\u3002`;
  }

  if (intent.type === 'batch-next-review-date') {
    return `\u5df2\u52a0\u5165\u52a8\u4f5c\u961f\u5217\uff1a${intent.item_ids.length} \u6b3e\u5355\u6b3e\u5f85\u6279\u91cf\u8bbe\u7f6e\u4e0b\u6b21\u8bc4\u5ba1\u65f6\u95f4\u3002`;
  }

  return `\u5df2\u52a0\u5165\u52a8\u4f5c\u961f\u5217\uff1a${intent.item_ids.length} \u6b3e\u5355\u6b3e\u5f85\u6279\u91cf\u751f\u6210\u4efb\u52a1\u3002`;
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
          ? `${intent.payload.description}\uff08\u5173\u8054\u6b3e\u53f7 ${item.skuCode}\uff09`
          : `\u5173\u8054\u6b3e\u53f7 ${item.skuCode}\uff0c\u8bf7\u6309\u8bc4\u5ba1\u7ed3\u8bba\u7ee7\u7eed\u63a8\u8fdb\u3002`,
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
