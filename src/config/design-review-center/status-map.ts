import {
  ACTION_STATUS_LABELS,
  EXECUTION_STATUS_LABELS,
  GATE_GROUP_LABELS,
  GATE_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  REVIEW_CONCLUSION_LABELS,
  REVIEW_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  STAGE_LABELS,
} from './labels';

type ToneMeta = {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
  icon?: string;
};

export const STAGE_MAP: Record<string, ToneMeta> = {
  planning: { label: STAGE_LABELS.planning, bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  concept: { label: STAGE_LABELS.concept, bgColor: 'bg-sky-100', textColor: 'text-sky-700' },
  prototype: { label: STAGE_LABELS.prototype, bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
  prototype_review: { label: STAGE_LABELS.prototype_review, bgColor: 'bg-violet-100', textColor: 'text-violet-700' },
  sample_review: { label: STAGE_LABELS.sample_review, bgColor: 'bg-fuchsia-100', textColor: 'text-fuchsia-700' },
  costing: { label: STAGE_LABELS.costing, bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  costing_review: { label: STAGE_LABELS.costing_review, bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
  locked: { label: STAGE_LABELS.locked, bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  completed: { label: STAGE_LABELS.completed, bgColor: 'bg-green-100', textColor: 'text-green-700' },
};

export const PHASE_MAP = STAGE_MAP;

export const RISK_LEVEL_MAP: Record<string, ToneMeta> = {
  low: { label: RISK_LEVEL_LABELS.low, icon: '●', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-emerald-200' },
  medium: { label: RISK_LEVEL_LABELS.medium, icon: '●', bgColor: 'bg-amber-100', textColor: 'text-amber-700', borderColor: 'border-amber-200' },
  high: { label: RISK_LEVEL_LABELS.high, icon: '●', bgColor: 'bg-orange-100', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
  blocking: { label: RISK_LEVEL_LABELS.blocking, icon: '●', bgColor: 'bg-rose-100', textColor: 'text-rose-700', borderColor: 'border-rose-200' },
  critical: { label: RISK_LEVEL_LABELS.blocking, icon: '●', bgColor: 'bg-rose-100', textColor: 'text-rose-700', borderColor: 'border-rose-200' },
};

export const REVIEW_CONCLUSION_MAP: Record<string, ToneMeta> = {
  pass: { label: REVIEW_CONCLUSION_LABELS.pass, bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  pass_with_changes: { label: REVIEW_CONCLUSION_LABELS.pass_with_changes, bgColor: 'bg-cyan-100', textColor: 'text-cyan-700' },
  hold: { label: REVIEW_CONCLUSION_LABELS.hold, bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  cancel: { label: REVIEW_CONCLUSION_LABELS.cancel, bgColor: 'bg-rose-100', textColor: 'text-rose-700' },
  cost_down: { label: REVIEW_CONCLUSION_LABELS.cost_down, bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  structure_adjust: { label: REVIEW_CONCLUSION_LABELS.structure_adjust, bgColor: 'bg-violet-100', textColor: 'text-violet-700' },
  material_rework: { label: REVIEW_CONCLUSION_LABELS.material_rework, bgColor: 'bg-teal-100', textColor: 'text-teal-700' },
  next_round: { label: REVIEW_CONCLUSION_LABELS.next_round, bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
};

export const REVIEW_STATUS_MAP: Record<string, ToneMeta> = {
  pending: { label: REVIEW_STATUS_LABELS.pending, bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  review: { label: REVIEW_STATUS_LABELS.review, bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  pass: { label: REVIEW_STATUS_LABELS.pass, bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  fail: { label: REVIEW_STATUS_LABELS.fail, bgColor: 'bg-rose-100', textColor: 'text-rose-700' },
};

export const ACTION_STATUS_MAP: Record<string, ToneMeta> = {
  pending: { label: ACTION_STATUS_LABELS.pending, bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  in_progress: { label: ACTION_STATUS_LABELS.in_progress, bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  completed: { label: ACTION_STATUS_LABELS.completed, bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  reviewed: { label: ACTION_STATUS_LABELS.reviewed, bgColor: 'bg-cyan-100', textColor: 'text-cyan-700' },
  closed: { label: ACTION_STATUS_LABELS.closed, bgColor: 'bg-slate-200', textColor: 'text-slate-700' },
};

export const EXECUTION_STATUS_MAP: Record<string, ToneMeta> = {
  not_started: { label: EXECUTION_STATUS_LABELS.not_started, bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  in_progress: { label: EXECUTION_STATUS_LABELS.in_progress, bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  pending_review: { label: EXECUTION_STATUS_LABELS.pending_review, bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  completed: { label: EXECUTION_STATUS_LABELS.completed, bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  blocked: { label: EXECUTION_STATUS_LABELS.blocked, bgColor: 'bg-rose-100', textColor: 'text-rose-700' },
};

export const PROJECT_STATUS_MAP: Record<string, ToneMeta> = {
  planning: { label: PROJECT_STATUS_LABELS.planning, bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  active: { label: PROJECT_STATUS_LABELS.active, bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  locked: { label: PROJECT_STATUS_LABELS.locked, bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  completed: { label: PROJECT_STATUS_LABELS.completed, bgColor: 'bg-green-100', textColor: 'text-green-700' },
  cancelled: { label: PROJECT_STATUS_LABELS.cancelled, bgColor: 'bg-rose-100', textColor: 'text-rose-700' },
};

export const GATE_TYPE_MAP: Record<string, { label: string; icon: string }> = {
  brief_lock: { label: GATE_TYPE_LABELS.brief_lock, icon: 'B' },
  wave_alignment: { label: GATE_TYPE_LABELS.wave_alignment, icon: 'W' },
  series_direction: { label: GATE_TYPE_LABELS.series_direction, icon: 'S' },
  concept_complete: { label: GATE_TYPE_LABELS.concept_complete, icon: 'C' },
  design_review: { label: GATE_TYPE_LABELS.design_review, icon: 'D' },
  prototype_confirm: { label: GATE_TYPE_LABELS.prototype_confirm, icon: 'P' },
  first_sample_review: { label: GATE_TYPE_LABELS.first_sample_review, icon: '1' },
  second_sample_adjustment: { label: GATE_TYPE_LABELS.second_sample_adjustment, icon: '2' },
  last_confirm: { label: GATE_TYPE_LABELS.last_confirm, icon: 'L' },
  outsole_confirm: { label: GATE_TYPE_LABELS.outsole_confirm, icon: 'O' },
  structure_confirm: { label: GATE_TYPE_LABELS.structure_confirm, icon: 'T' },
  tech_pack_output: { label: GATE_TYPE_LABELS.tech_pack_output, icon: 'P' },
  tooling_confirm: { label: GATE_TYPE_LABELS.tooling_confirm, icon: 'M' },
  target_cost_confirm: { label: GATE_TYPE_LABELS.target_cost_confirm, icon: 'C' },
  sample_cost_review: { label: GATE_TYPE_LABELS.sample_cost_review, icon: '$' },
  cost_down_action: { label: GATE_TYPE_LABELS.cost_down_action, icon: '-' },
  bom_lock: { label: GATE_TYPE_LABELS.bom_lock, icon: 'B' },
  long_lead_material_lock: { label: GATE_TYPE_LABELS.long_lead_material_lock, icon: 'M' },
  lead_style_lock: { label: GATE_TYPE_LABELS.lead_style_lock, icon: '*' },
  marketing_sample_prepare: { label: GATE_TYPE_LABELS.marketing_sample_prepare, icon: 'P' },
  launch_asset_prepare: { label: GATE_TYPE_LABELS.launch_asset_prepare, icon: 'A' },
};

export const GATE_GROUP_MAP: Record<string, { label: string; accent: string; borderColor: string }> = {
  planning: { label: GATE_GROUP_LABELS.planning, accent: 'text-slate-700', borderColor: 'border-slate-200' },
  design: { label: GATE_GROUP_LABELS.design, accent: 'text-blue-700', borderColor: 'border-blue-200' },
  development: { label: GATE_GROUP_LABELS.development, accent: 'text-emerald-700', borderColor: 'border-emerald-200' },
  cost: { label: GATE_GROUP_LABELS.cost, accent: 'text-amber-700', borderColor: 'border-amber-200' },
  launch: { label: GATE_GROUP_LABELS.launch, accent: 'text-fuchsia-700', borderColor: 'border-fuchsia-200' },
};

export const MILESTONE_STATUS_MAP: Record<string, ToneMeta> = {
  not_started: { label: '未开始', bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  in_progress: { label: '进行中', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  at_risk: { label: '有风险', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  delayed: { label: '已延期', bgColor: 'bg-rose-100', textColor: 'text-rose-700' },
  completed: { label: '已完成', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
};

export const MILESTONE_TRACK_MAP: Record<string, { label: string; accent: string; borderColor: string }> = {
  design_track: { label: '设计轨', accent: 'text-blue-700', borderColor: 'border-blue-200' },
  cost_track: { label: '成本轨', accent: 'text-amber-700', borderColor: 'border-amber-200' },
  development_track: { label: '开发轨', accent: 'text-emerald-700', borderColor: 'border-emerald-200' },
};
