import { z } from 'zod/v4';

export const PublishLevel = z.enum(['internal', 'dashboard', 'portfolio', 'public']);
export const AgentType = z.enum(['planner', 'design-review', 'research', 'director', 'ops-merch']);
export const ProductRole = z.enum(['core-basic', 'volume-driver', 'margin-driver', 'image-builder', 'trend-test', 'drop-candidate']);
export const OccasionTag = z.enum(['urban-commute', 'smart-workplace', 'weekend-casual', 'sport-casual', 'light-outdoor', 'social-evening', 'formal-social', 'vacation-leisure']);
export const ReviewConclusion = z.enum(['Pass', 'Review', 'Revise', 'Fail']);
export const SampleStage = z.enum(['Proto', 'SMS', 'PP', 'TOP']);
export const RiskLevel = z.enum(['low', 'medium', 'high']);
export const RecordSyncStatus = z.enum(['pending', 'synced', 'error']);
export const ExportMode = z.enum(['full', 'delta']);

export const OpenClawRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  schema_version: z.string().default('1.0.0'),
  external_id: z.string().nullable().default(null),
  source_system: z.string().default('openclaw'),
  sync_status: RecordSyncStatus.default('synced'),
  last_synced_at: z.string().nullable().default(null),
  export_batch_id: z.string().nullable().default(null),
  checksum: z.string().nullable().default(null),
  season: z.string(),
  wave: z.string(),
  category: z.string().optional(),
  product_role: ProductRole.optional(),
  occasion_tag: OccasionTag.optional(),
  agent: AgentType,
  owner: z.string(),
  updated_at: z.string(),
  publish_level: PublishLevel,
  summary: z.string(),
  source_type: z.string(),
  source_file: z.string(),
});

export const SummaryRecordSchema = OpenClawRecordSchema.extend({
  kpi_snapshot: z.object({
    net_sales: z.number(),
    sell_through: z.number(),
    margin_rate: z.number(),
    active_skus: z.number(),
  }).optional(),
  key_issues: z.array(z.string()).optional(),
  key_actions: z.array(z.string()).optional(),
  wave_status: z.string().optional(),
});

export const OTBReportRecordSchema = OpenClawRecordSchema.extend({
  otb_total: z.number(),
  otb_used: z.number(),
  otb_remaining: z.number(),
  category_allocation: z.array(z.object({ category: z.string(), amount: z.number(), pct: z.number() })).optional(),
  wave_allocation: z.array(z.object({ wave: z.string(), amount: z.number(), pct: z.number() })).optional(),
  budget_variance: z.number().optional(),
  risk_alerts: z.array(z.string()).optional(),
});

export const ReviewDimensionSchema = z.object({
  score: z.number().optional(),
  comment: z.string(),
  risk: RiskLevel.optional(),
});

export const DesignReviewRecordSchema = OpenClawRecordSchema.extend({
  style_number: z.string(),
  series: z.string().optional(),
  stage: SampleStage,
  review_date: z.string(),
  reviewer: z.string(),
  conclusion: ReviewConclusion,
  risk_level: RiskLevel,
  price_band: z.string().optional(),
  dimensions: z.object({
    last: ReviewDimensionSchema.optional(),
    upper: ReviewDimensionSchema.optional(),
    outsole: ReviewDimensionSchema.optional(),
    material: ReviewDimensionSchema.optional(),
    bom: ReviewDimensionSchema.optional(),
    mold_reuse: ReviewDimensionSchema.optional(),
  }).optional(),
  change_actions: z.array(z.object({ type: z.string(), detail: z.string(), responsible: z.string() })).optional(),
  next_review_date: z.string().optional(),
  version_history: z.array(z.object({ version: z.string(), date: z.string(), summary: z.string() })).optional(),
});

export const TrendInsightRecordSchema = OpenClawRecordSchema.extend({
  trend_keywords: z.array(z.object({ keyword: z.string(), heat: z.number(), source: z.string() })).optional(),
  competitor_summary: z.array(z.object({ brand: z.string(), insight: z.string() })).optional(),
  translation_results: z.array(z.object({ trend: z.string(), action: z.string(), confidence: z.number() })).optional(),
});

export const DesignSignalRecordSchema = OpenClawRecordSchema.extend({
  pass_rate: z.number(),
  high_risk_materials: z.array(z.string()).optional(),
  high_risk_outsoles: z.array(z.string()).optional(),
  high_return_signals: z.array(z.string()).optional(),
  top_revision_reasons: z.array(z.object({ reason: z.string(), count: z.number() })).optional(),
});

export const ChangeOrderRecordSchema = OpenClawRecordSchema.extend({
  style_number: z.string(),
  change_type: z.string(),
  change_detail: z.string(),
  responsible: z.string(),
  deadline: z.string(),
  status: z.string(),
});

export const CaseStudyRecordSchema = OpenClawRecordSchema.extend({
  background: z.string(),
  inputs: z.string(),
  planning_judgement: z.string(),
  design_judgement: z.string(),
  key_actions: z.array(z.string()),
  data_results: z.object({ before: z.record(z.string(), z.unknown()), after: z.record(z.string(), z.unknown()) }).optional(),
  postmortem: z.string(),
  reusable_methods: z.array(z.string()).optional(),
  case_type: z.string().optional(),
});

export const MaterialSignalRecordSchema = OpenClawRecordSchema.extend({
  risk_materials: z.array(z.object({ material: z.string(), risk: z.string(), suggestion: z.string() })).optional(),
  cost_alerts: z.array(z.object({ item: z.string(), variance: z.number(), note: z.string() })).optional(),
  availability_issues: z.array(z.object({ material: z.string(), issue: z.string() })).optional(),
});

export const SyncStatusSchema = z.object({
  schema_version: z.string().default('1.0.0'),
  source_system: z.string().default('openclaw'),
  export_batch_id: z.string().nullable().default(null),
  last_sync: z.string(),
  agents: z.array(z.object({
    name: z.string(),
    last_export: z.string(),
    record_count: z.number(),
    last_batch_id: z.string().nullable().default(null),
    mode: ExportMode.default('full'),
  })),
  status: z.string(),
});

export const ExportManifestSchema = z.object({
  schema_version: z.string().default('1.0.0'),
  source_system: z.string().default('openclaw'),
  export_batch_id: z.string(),
  exported_at: z.string(),
  mode: ExportMode,
  status: z.enum(['healthy', 'warning', 'error']).default('healthy'),
  files: z.array(z.object({
    path: z.string(),
    record_type: z.string(),
    record_count: z.number(),
    checksum: z.string().nullable().default(null),
  })),
  notes: z.array(z.string()).default([]),
});

export type OpenClawRecord = z.infer<typeof OpenClawRecordSchema>;
export type SummaryRecord = z.infer<typeof SummaryRecordSchema>;
export type OTBReportRecord = z.infer<typeof OTBReportRecordSchema>;
export type DesignReviewRecord = z.infer<typeof DesignReviewRecordSchema>;
export type TrendInsightRecord = z.infer<typeof TrendInsightRecordSchema>;
export type DesignSignalRecord = z.infer<typeof DesignSignalRecordSchema>;
export type ChangeOrderRecord = z.infer<typeof ChangeOrderRecordSchema>;
export type CaseStudyRecord = z.infer<typeof CaseStudyRecordSchema>;
export type MaterialSignalRecord = z.infer<typeof MaterialSignalRecordSchema>;
export type SyncStatus = z.infer<typeof SyncStatusSchema>;
export type ExportManifest = z.infer<typeof ExportManifestSchema>;