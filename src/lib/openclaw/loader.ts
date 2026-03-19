import fs from 'fs';
import path from 'path';
import type { ZodType } from 'zod/v4';
import {
  SummaryRecordSchema,
  OTBReportRecordSchema,
  DesignReviewRecordSchema,
  TrendInsightRecordSchema,
  DesignSignalRecordSchema,
  ChangeOrderRecordSchema,
  CaseStudyRecordSchema,
  MaterialSignalRecordSchema,
  SyncStatusSchema,
  ExportManifestSchema,
} from './schema';
import type {
  SummaryRecord,
  OTBReportRecord,
  DesignReviewRecord,
  TrendInsightRecord,
  DesignSignalRecord,
  ChangeOrderRecord,
  CaseStudyRecord,
  MaterialSignalRecord,
  SyncStatus,
  ExportManifest,
} from './schema';

const DATA_ROOT = path.join(process.cwd(), 'data', 'openclaw');

function readJsonFile(fullPath: string) {
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const normalized = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(normalized);
}

function loadDirectory<T>(subdir: string, schema: ZodType<T>): T[] {
  const dir = path.join(DATA_ROOT, subdir);
  if (!fs.existsSync(dir)) return [];
  const results: T[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = readJsonFile(path.join(dir, file));
      const parsed = schema.parse(raw);
      results.push(parsed);
    } catch (e) {
      console.warn(`[openclaw/loader] skip ${subdir}/${file}:`, e instanceof Error ? e.message : e);
    }
  }
  return results;
}

function loadSingle<T>(filePath: string, schema: ZodType<T>): T | null {
  const full = path.join(DATA_ROOT, filePath);
  if (!fs.existsSync(full)) return null;
  try {
    return schema.parse(readJsonFile(full));
  } catch {
    return null;
  }
}

export function loadSummaries(): SummaryRecord[] { return loadDirectory('summaries', SummaryRecordSchema); }
export function loadOTBReports(): OTBReportRecord[] { return loadDirectory('otb-reports', OTBReportRecordSchema); }
export function loadDesignReviews(): DesignReviewRecord[] { return loadDirectory('design-review', DesignReviewRecordSchema); }
export function loadTrendInsights(): TrendInsightRecord[] { return loadDirectory('trend-insights', TrendInsightRecordSchema); }
export function loadDesignSignals(): DesignSignalRecord[] { return loadDirectory('design-signals', DesignSignalRecordSchema); }
export function loadChangeOrders(): ChangeOrderRecord[] { return loadDirectory('change-orders', ChangeOrderRecordSchema); }
export function loadCaseStudies(): CaseStudyRecord[] { return loadDirectory('case-studies', CaseStudyRecordSchema); }
export function loadMaterialSignals(): MaterialSignalRecord[] { return loadDirectory('material-signals', MaterialSignalRecordSchema); }
export function loadSyncStatus(): SyncStatus | null { return loadSingle('meta/sync-status.json', SyncStatusSchema); }
export function loadExportManifest(): ExportManifest | null { return loadSingle('meta/export-manifest.json', ExportManifestSchema); }

export function loadDesignReviewById(id: string): DesignReviewRecord | null {
  return loadDesignReviews().find((record) => record.id === id) ?? null;
}