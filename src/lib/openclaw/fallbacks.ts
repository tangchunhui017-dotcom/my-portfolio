import type { SyncStatus } from './schema';

export function withFallback<T>(loader: () => T, fallback: T): T {
  try {
    return loader();
  } catch {
    return fallback;
  }
}

export const EMPTY_SYNC_STATUS: SyncStatus = {
  schema_version: '1.1.0',
  source_system: 'openclaw',
  export_batch_id: null,
  last_sync: '',
  agents: [],
  status: 'unknown',
};