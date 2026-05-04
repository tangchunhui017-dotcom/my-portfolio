export const STAGE_VALUES = [
  'planning',
  'concept',
  'prototype',
  'prototype_review',
  'sample_review',
  'costing',
  'costing_review',
  'locked',
  'completed',
] as const;

export type Stage = (typeof STAGE_VALUES)[number];

export const RISK_LEVEL_VALUES = ['low', 'medium', 'high', 'blocking'] as const;

export type RiskLevel = (typeof RISK_LEVEL_VALUES)[number];

export const DEVELOPMENT_LEVEL_VALUES = [
  'new_development',
  'platform_extension',
  'new_upper_same_outsole',
  'new_color_refresh',
  'reorder_optimization',
] as const;

export type DevelopmentLevel = (typeof DEVELOPMENT_LEVEL_VALUES)[number];

export const ASSET_TYPE_VALUES = [
  'concept_sketch',
  'effect_render',
  'rendering',
  'first_sample_photo',
  'second_sample_photo',
  'final_sample_photo',
  'material_board',
  'color_board',
  'outsole_board',
  'last_board',
] as const;

export type AssetType = (typeof ASSET_TYPE_VALUES)[number];

export const REVIEW_CONCLUSION_VALUES = [
  'pass',
  'pass_with_changes',
  'hold',
  'cancel',
  'cost_down',
  'structure_adjust',
  'material_rework',
  'next_round',
] as const;

export type ReviewConclusion = (typeof REVIEW_CONCLUSION_VALUES)[number];

export const ACTION_STATUS_VALUES = ['pending', 'in_progress', 'completed', 'reviewed', 'closed'] as const;

export type ActionStatus = (typeof ACTION_STATUS_VALUES)[number];

export const REVIEW_TYPE_VALUES = ['concept_review', 'prototype_review', 'sample_review', 'cost_review', 'gate_review'] as const;

export type ReviewType = (typeof REVIEW_TYPE_VALUES)[number];

export const GATE_GROUP_VALUES = ['planning', 'design', 'development', 'cost', 'launch'] as const;

export type GateGroup = (typeof GATE_GROUP_VALUES)[number];

export const GATE_TYPE_VALUES = [
  'brief_lock',
  'wave_alignment',
  'series_direction',
  'concept_complete',
  'design_review',
  'prototype_confirm',
  'first_sample_review',
  'second_sample_adjustment',
  'last_confirm',
  'outsole_confirm',
  'structure_confirm',
  'tech_pack_output',
  'tooling_confirm',
  'target_cost_confirm',
  'sample_cost_review',
  'cost_down_action',
  'bom_lock',
  'long_lead_material_lock',
  'lead_style_lock',
  'marketing_sample_prepare',
  'launch_asset_prepare',
] as const;

export type GateType = (typeof GATE_TYPE_VALUES)[number];

export const EXECUTION_STATUS_VALUES = ['not_started', 'in_progress', 'pending_review', 'completed', 'blocked'] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUS_VALUES)[number];

export const PROJECT_STATUS_VALUES = ['planning', 'active', 'locked', 'completed', 'cancelled'] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];

export const SERIES_ROLE_VALUES = ['hero', 'image', 'basic', 'traffic'] as const;

export type SeriesRole = (typeof SERIES_ROLE_VALUES)[number];

export const REVIEW_STATUS_VALUES = ['pending', 'review', 'pass', 'fail'] as const;

export type ReviewStatus = (typeof REVIEW_STATUS_VALUES)[number];

export const SOURCE_VALUES = ['manual', 'openclaw'] as const;

export type SourceType = (typeof SOURCE_VALUES)[number];

export const SYNC_STATUS_VALUES = ['synced', 'pending', 'error'] as const;

export type SyncStatus = (typeof SYNC_STATUS_VALUES)[number];
