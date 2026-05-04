import type { RiskLevel } from '@/config/design-review-center/enums';
import type { DesignPhase } from '@/lib/design-review-center/types';

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
export type DesignReviewGateCode = 'cost_over_target' | 'tooling_blocked' | 'techpack_blocked';

export interface DesignReviewGateReason {
  item_id: string;
  item_name: string;
  sku_code: string;
  code: DesignReviewGateCode;
  reason: string;
}

export interface DesignReviewPhaseTransitionGateContext {
  requestedItemIds?: string[];
  blockedReasons?: DesignReviewGateReason[];
}

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
    requested_item_ids: string[];
    blocked_reasons: DesignReviewGateReason[];
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
  'competitor-analysis': 'Run competitor analysis',
  'design-review': 'Run design review',
  'wave-review': 'Run wave review',
  'weekly-summary': 'Run weekly summary',
};

const DESIGN_REVIEW_ACTION_LABELS: Record<DesignReviewActionIntent['type'], string> = {
  'batch-phase-transition': 'Batch phase transition',
  'batch-owner-assignment': 'Batch owner assignment',
  'batch-next-review-date': 'Batch next review date',
  'batch-task-generation': 'Batch task generation',
};

const DESIGN_REVIEW_ACTION_STATUS_LABELS: Record<DesignReviewActionIntentStatus, string> = {
  pending_sync: 'Pending sync',
  synced: 'Synced',
  error: 'Sync error',
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
  gateContext: DesignReviewPhaseTransitionGateContext = {},
): DesignReviewPhaseTransitionIntent {
  return {
    ...createBaseIntent(itemIds, createdBy),
    type: 'batch-phase-transition',
    payload: {
      phase,
      requested_item_ids: gateContext.requestedItemIds ?? itemIds,
      blocked_reasons: gateContext.blockedReasons ?? [],
    },
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

function normalizeGateReasons(value: unknown): DesignReviewGateReason[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (reason): reason is Partial<DesignReviewGateReason> & Pick<DesignReviewGateReason, 'item_id' | 'code' | 'reason'> =>
        Boolean(
          reason &&
            typeof reason === 'object' &&
            typeof reason.item_id === 'string' &&
            typeof reason.code === 'string' &&
            typeof reason.reason === 'string',
        ),
    )
    .map((reason) => ({
      item_id: reason.item_id,
      item_name: typeof reason.item_name === 'string' ? reason.item_name : 'Unknown item',
      sku_code: typeof reason.sku_code === 'string' ? reason.sku_code : '--',
      code: reason.code as DesignReviewGateCode,
      reason: reason.reason,
    }));
}

export function parseStoredDesignReviewActionIntents(raw: string | null): DesignReviewActionIntent[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.reduce<DesignReviewActionIntent[]>((accumulator, entry) => {
      if (!entry || typeof entry !== 'object') return accumulator;

      const intent = entry as Partial<DesignReviewActionIntent> & { payload?: Record<string, unknown> };
      if (
        typeof intent.id !== 'string' ||
        intent.scope !== 'design-review-center' ||
        !Array.isArray(intent.item_ids) ||
        typeof intent.type !== 'string' ||
        !DESIGN_REVIEW_ACTION_TYPES.includes(intent.type as DesignReviewActionIntent['type']) ||
        typeof intent.created_at !== 'string' ||
        typeof intent.created_by !== 'string'
      ) {
        return accumulator;
      }

      const base: DesignReviewBaseActionIntent = {
        id: intent.id,
        scope: 'design-review-center',
        status: (intent.status ?? 'pending_sync') as DesignReviewActionIntentStatus,
        created_at: intent.created_at,
        created_by: intent.created_by,
        item_ids: intent.item_ids.filter((itemId): itemId is string => typeof itemId === 'string'),
        sync_attempts: typeof intent.sync_attempts === 'number' ? intent.sync_attempts : 0,
        last_synced_at: intent.last_synced_at ?? null,
        last_error: intent.last_error ?? null,
        export_batch_id: intent.export_batch_id ?? null,
        output_path: intent.output_path ?? null,
        source_system: 'portfolio-site',
      };

      if (intent.type === 'batch-phase-transition') {
        accumulator.push({
          ...base,
          type: 'batch-phase-transition',
          payload: {
            phase: ((intent.payload?.phase as DesignPhase | undefined) ?? 'sample_review') as DesignPhase,
            requested_item_ids: Array.isArray(intent.payload?.requested_item_ids)
              ? (intent.payload.requested_item_ids as unknown[]).filter((itemId): itemId is string => typeof itemId === 'string')
              : base.item_ids,
            blocked_reasons: normalizeGateReasons(intent.payload?.blocked_reasons),
          },
        });
        return accumulator;
      }

      if (intent.type === 'batch-owner-assignment') {
        accumulator.push({
          ...base,
          type: 'batch-owner-assignment',
          payload: {
            owner: typeof intent.payload?.owner === 'string' ? intent.payload.owner : '',
          },
        });
        return accumulator;
      }

      if (intent.type === 'batch-next-review-date') {
        accumulator.push({
          ...base,
          type: 'batch-next-review-date',
          payload: {
            nextReviewDate: typeof intent.payload?.nextReviewDate === 'string' ? intent.payload.nextReviewDate : '',
          },
        });
        return accumulator;
      }

      accumulator.push({
        ...base,
        type: 'batch-task-generation',
        payload: {
          title: typeof intent.payload?.title === 'string' ? intent.payload.title : '',
          description: typeof intent.payload?.description === 'string' ? intent.payload.description : '',
          dueDate: typeof intent.payload?.dueDate === 'string' ? intent.payload.dueDate : '',
          assignee: typeof intent.payload?.assignee === 'string' ? intent.payload.assignee : '',
          priority: (intent.payload?.priority as RiskLevel | undefined) ?? 'high',
          taskType: typeof intent.payload?.taskType === 'string' ? intent.payload.taskType : 'design',
        },
      });
      return accumulator;
    }, []);
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
