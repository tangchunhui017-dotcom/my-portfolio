export const PHASE_MAP: Record<string, { label: string; bgColor: string; textColor: string }> = {
  planning: { label: '规划中', bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  concept: { label: '概念阶段', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  prototype: { label: '原型开发', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
  prototype_review: { label: '原型评审', bgColor: 'bg-violet-100', textColor: 'text-violet-700' },
  sample_review: { label: '样鞋评审', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  costing: { label: '成本核算', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  costing_review: { label: '成本评审', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
  locked: { label: '已锁定', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  completed: { label: '已完成', bgColor: 'bg-green-100', textColor: 'text-green-700' },
};

export const REVIEW_STATUS_MAP: Record<string, { label: string; bgColor: string; textColor: string }> = {
  pending: { label: '待评审', bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  pass: { label: '通过', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  review: { label: '待复审', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  fail: { label: '不通过', bgColor: 'bg-rose-100', textColor: 'text-rose-700' },
};

export const RISK_LEVEL_MAP: Record<string, { label: string; icon: string; bgColor: string; textColor: string }> = {
  low: { label: '低风险', icon: '●', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  medium: { label: '中风险', icon: '●', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  high: { label: '高风险', icon: '●', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  critical: { label: '严重风险', icon: '●', bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

export const MILESTONE_STATUS_MAP: Record<string, { label: string; bgColor: string; textColor: string }> = {
  not_started: { label: '未开始', bgColor: 'bg-slate-200', textColor: 'text-slate-700' },
  in_progress: { label: '进行中', bgColor: 'bg-blue-200', textColor: 'text-blue-700' },
  at_risk: { label: '有风险', bgColor: 'bg-amber-200', textColor: 'text-amber-700' },
  delayed: { label: '已延期', bgColor: 'bg-red-200', textColor: 'text-red-700' },
  completed: { label: '已完成', bgColor: 'bg-green-200', textColor: 'text-green-700' },
};

export const GATE_TYPE_MAP: Record<string, { label: string; icon: string }> = {
  concept_review: { label: '概念评审', icon: '💡' },
  target_cost_estimate: { label: '目标成本预估', icon: '💸' },
  prototype_review: { label: '原型评审', icon: '🧪' },
  tech_pack_handoff: { label: 'Tech Pack 移交', icon: '📦' },
  tooling_review: { label: '开模评审', icon: '🛠️' },
  sample_review: { label: '样鞋评审', icon: '👟' },
  sample_cost_review: { label: '样鞋核价', icon: '🧾' },
  costing_review: { label: '成本评审', icon: '💰' },
  final_bom_lock: { label: 'BOM 锁价', icon: '🔒' },
  final_lock: { label: '最终锁定', icon: '✅' },
};

export const MILESTONE_TRACK_MAP: Record<string, { label: string; accent: string; borderColor: string }> = {
  design_track: { label: '设计轨', accent: 'text-blue-700', borderColor: 'border-blue-200' },
  cost_track: { label: '成本轨', accent: 'text-amber-700', borderColor: 'border-amber-200' },
  development_track: { label: '开发轨', accent: 'text-emerald-700', borderColor: 'border-emerald-200' },
};
