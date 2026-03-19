import type { DesignPhase, RiskLevel } from '@/lib/design-review-center/types';

export interface OpenClawTask {
  id: string;
  type: 'competitor-analysis' | 'design-review' | 'wave-review' | 'weekly-summary';
  status: 'pending' | 'processing' | 'done';
  created_at: string;
  params: Record<string, string>;
}

export interface DesignReviewTaskDraft {
  title: string;
  description: string;
  dueDate: string;
  assignee: string;
  priority: RiskLevel;
  taskType: string;
}

export type DesignReviewActionIntentStatus = 'pending_sync' | 'synced' | 'error';

interface DesignReviewBaseActionIntent {
  id: string;
  scope: 'design-review-center';
  status: DesignReviewActionIntentStatus;
  created_at: string;
  created_by: string;
  item_ids: string[];
  sync_attempts: number;
  last_synced_at: string | null;
  last_error: string | null;
  export_batch_id: string | null;
  output_path: string | null;
  source_system: 'portfolio-site';
}

export interface DesignReviewPhaseTransitionIntent extends DesignReviewBaseActionIntent {
  type: 'batch-phase-transition';
  payload: {
    phase: DesignPhase;
  };
}

export interface DesignReviewOwnerAssignmentIntent extends DesignReviewBaseActionIntent {
  type: 'batch-owner-assignment';
  payload: {
    owner: string;
  };
}

export interface DesignReviewNextReviewIntent extends DesignReviewBaseActionIntent {
  type: 'batch-next-review-date';
  payload: {
    nextReviewDate: string;
  };
}

export interface DesignReviewTaskGenerationIntent extends DesignReviewBaseActionIntent {
  type: 'batch-task-generation';
  payload: DesignReviewTaskDraft;
}

export type DesignReviewActionIntent =
  | DesignReviewPhaseTransitionIntent
  | DesignReviewOwnerAssignmentIntent
  | DesignReviewNextReviewIntent
  | DesignReviewTaskGenerationIntent;

export const DESIGN_REVIEW_ACTION_STORAGE_KEY = 'openclaw-design-review-intents-v1';

const TASK_LABELS: Record<OpenClawTask['type'], string> = {
  'competitor-analysis': '\u53d1\u8d77\u7ade\u54c1\u5206\u6790',
  'design-review': '\u53d1\u8d77\u6837\u978b\u8bc4\u5ba1',
  'wave-review': '\u53d1\u8d77\u6ce2\u6bb5\u590d\u76d8',
  'weekly-summary': '\u53d1\u8d77\u5468\u62a5\u6c47\u603b',
};

const DESIGN_REVIEW_ACTION_LABELS: Record<DesignReviewActionIntent['type'], string> = {
  'batch-phase-transition': '\u6279\u91cf\u6539\u9636\u6bb5',
  'batch-owner-assignment': '\u6279\u91cf\u6539\u8d1f\u8d23\u4eba',
  'batch-next-review-date': '\u6279\u91cf\u6539\u4e0b\u6b21\u8bc4\u5ba1\u65f6\u95f4',
  'batch-task-generation': '\u6279\u91cf\u751f\u6210\u5f85\u529e',
};

const DESIGN_REVIEW_ACTION_STATUS_LABELS: Record<DesignReviewActionIntentStatus, string> = {
  pending_sync: '\u5f85\u540c\u6b65',
  synced: '\u5df2\u540c\u6b65',
  error: '\u540c\u6b65\u5931\u8d25',
};

const DESIGN_REVIEW_ACTION_TYPES: DesignReviewActionIntent['type'][] = [
  'batch-phase-transition',
  'batch-owner-assignment',
  'batch-next-review-date',
  'batch-task-generation',
];

export function createTask(type: OpenClawTask['type'], params: Record<string, string> = {}): OpenClawTask {
  return {
    id: `task-${Date.now()}`,
    type,
    status: 'pending',
    created_at: new Date().toISOString(),
    params,
  };
}

function createBaseIntent(itemIds: string[], createdBy: string): DesignReviewBaseActionIntent {
  return {
    id: `intent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    scope: 'design-review-center',
    status: 'pending_sync',
    created_at: new Date().toISOString(),
    created_by: createdBy,
    item_ids: itemIds,
    sync_attempts: 0,
    last_synced_at: null,
    last_error: null,
    export_batch_id: null,
    output_path: null,
    source_system: 'portfolio-site',
  };
}

export function createDesignReviewPhaseTransitionIntent(
  itemIds: string[],
  phase: DesignPhase,
  createdBy: string,
): DesignReviewPhaseTransitionIntent {
  return {
    ...createBaseIntent(itemIds, createdBy),
    type: 'batch-phase-transition',
    payload: { phase },
  };
}

export function createDesignReviewOwnerAssignmentIntent(
  itemIds: string[],
  owner: string,
  createdBy: string,
): DesignReviewOwnerAssignmentIntent {
  return {
    ...createBaseIntent(itemIds, createdBy),
    type: 'batch-owner-assignment',
    payload: { owner },
  };
}

export function createDesignReviewNextReviewIntent(
  itemIds: string[],
  nextReviewDate: string,
  createdBy: string,
): DesignReviewNextReviewIntent {
  return {
    ...createBaseIntent(itemIds, createdBy),
    type: 'batch-next-review-date',
    payload: { nextReviewDate },
  };
}

export function createDesignReviewTaskGenerationIntent(
  itemIds: string[],
  draft: DesignReviewTaskDraft,
  createdBy: string,
): DesignReviewTaskGenerationIntent {
  return {
    ...createBaseIntent(itemIds, createdBy),
    type: 'batch-task-generation',
    payload: draft,
  };
}

export function queueDesignReviewActionIntent(
  queue: DesignReviewActionIntent[],
  intent: DesignReviewActionIntent,
): DesignReviewActionIntent[] {
  return [...queue, intent];
}

export function markDesignReviewActionIntentsSynced(
  queue: DesignReviewActionIntent[],
  intentIds: string[],
  exportBatchId: string,
  syncedAt = new Date().toISOString(),
): DesignReviewActionIntent[] {
  const targetIds = new Set(intentIds);
  return queue.map((intent) => {
    if (!targetIds.has(intent.id)) return intent;
    return {
      ...intent,
      status: 'synced',
      sync_attempts: intent.sync_attempts + 1,
      last_synced_at: syncedAt,
      last_error: null,
      export_batch_id: exportBatchId,
      output_path: `local://openclaw/design-review-center/intents/${intent.id}.json`,
    };
  });
}

export function markDesignReviewActionIntentError(
  queue: DesignReviewActionIntent[],
  intentId: string,
  errorMessage: string,
): DesignReviewActionIntent[] {
  return queue.map((intent) => {
    if (intent.id !== intentId) return intent;
    return {
      ...intent,
      status: 'error',
      sync_attempts: intent.sync_attempts + 1,
      last_error: errorMessage,
    };
  });
}

export function retryFailedDesignReviewActionIntents(
  queue: DesignReviewActionIntent[],
  intentIds?: string[],
): DesignReviewActionIntent[] {
  const retrySet = intentIds ? new Set(intentIds) : null;
  return queue.map((intent) => {
    if (intent.status !== 'error') return intent;
    if (retrySet && !retrySet.has(intent.id)) return intent;
    return {
      ...intent,
      status: 'pending_sync',
      last_error: null,
    };
  });
}

export function clearSyncedDesignReviewActionIntents(queue: DesignReviewActionIntent[]): DesignReviewActionIntent[] {
  return queue.filter((intent) => intent.status !== 'synced');
}

export function getDesignReviewActionCounts(queue: DesignReviewActionIntent[]) {
  return queue.reduce(
    (counts, intent) => {
      counts[intent.status] += 1;
      return counts;
    },
    {
      pending_sync: 0,
      synced: 0,
      error: 0,
    } as Record<DesignReviewActionIntentStatus, number>,
  );
}

export function getTaskLabel(type: OpenClawTask['type']): string {
  return TASK_LABELS[type] ?? type;
}

export function getDesignReviewActionLabel(intent: DesignReviewActionIntent): string {
  return DESIGN_REVIEW_ACTION_LABELS[intent.type] ?? intent.type;
}

export function getDesignReviewActionStatusLabel(status: DesignReviewActionIntentStatus): string {
  return DESIGN_REVIEW_ACTION_STATUS_LABELS[status] ?? status;
}

export function parseStoredDesignReviewActionIntents(raw: string | null): DesignReviewActionIntent[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Partial<DesignReviewActionIntent>[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (intent): intent is Partial<DesignReviewActionIntent> & { id: string; type: DesignReviewActionIntent['type']; item_ids: string[]; created_at: string; created_by: string } =>
          Boolean(
            intent &&
              typeof intent.id === 'string' &&
              intent.scope === 'design-review-center' &&
              Array.isArray(intent.item_ids) &&
              typeof intent.type === 'string' &&
              DESIGN_REVIEW_ACTION_TYPES.includes(intent.type as DesignReviewActionIntent['type']) &&
              typeof intent.created_at === 'string' &&
              typeof intent.created_by === 'string',
          ),
      )
      .map((intent) => ({
        ...intent,
        status: intent.status ?? 'pending_sync',
        sync_attempts: typeof intent.sync_attempts === 'number' ? intent.sync_attempts : 0,
        last_synced_at: intent.last_synced_at ?? null,
        last_error: intent.last_error ?? null,
        export_batch_id: intent.export_batch_id ?? null,
        output_path: intent.output_path ?? null,
        source_system: 'portfolio-site' as const,
      })) as DesignReviewActionIntent[];
  } catch {
    return [];
  }
}

export function loadDesignReviewActionIntents(): DesignReviewActionIntent[] {
  if (typeof window === 'undefined') return [];
  return parseStoredDesignReviewActionIntents(window.localStorage.getItem(DESIGN_REVIEW_ACTION_STORAGE_KEY));
}

export function saveDesignReviewActionIntents(intents: DesignReviewActionIntent[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DESIGN_REVIEW_ACTION_STORAGE_KEY, JSON.stringify(intents));
}
