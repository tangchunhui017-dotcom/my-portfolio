import type {
  ActionStatus,
  AssetType,
  DevelopmentLevel,
  ExecutionStatus,
  GateGroup,
  GateType,
  ProjectStatus,
  ReviewConclusion,
  ReviewStatus,
  ReviewType,
  RiskLevel,
  SeriesRole,
  Stage,
} from './enums';

export const STAGE_LABELS: Record<Stage, string> = {
  planning: '规划中',
  concept: '概念阶段',
  prototype: '原型开发',
  prototype_review: '原型评审',
  sample_review: '样鞋评审',
  costing: '成本核算',
  costing_review: '成本评审',
  locked: '已锁定',
  completed: '已完成',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
  blocking: '阻塞',
};

export const DEVELOPMENT_LEVEL_LABELS: Record<DevelopmentLevel, string> = {
  new_development: '新底',
  platform_extension: '继承底',
  new_upper_same_outsole: '继承底',
  new_color_refresh: '旧面新色',
  reorder_optimization: '返单优化',
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  concept_sketch: '概念草图',
  effect_render: '效果图',
  rendering: '渲染图',
  first_sample_photo: '首样照片',
  second_sample_photo: '二样照片',
  final_sample_photo: '定样照片',
  material_board: '材料板',
  color_board: '配色板',
  outsole_board: '底台图',
  last_board: '楦型图',
};

export const REVIEW_CONCLUSION_LABELS: Record<ReviewConclusion, string> = {
  pass: '通过',
  pass_with_changes: '修改后通过',
  hold: '暂缓',
  cancel: '取消',
  cost_down: '需降本',
  structure_adjust: '需调结构',
  material_rework: '需补材料方案',
  next_round: '转下轮复审',
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  pending: '待处理',
  in_progress: '处理中',
  completed: '已完成',
  reviewed: '已复审',
  closed: '已关闭',
};

export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  pending_review: '待评审',
  completed: '已完成',
  blocked: '阻塞',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: '筹备中',
  active: '进行中',
  locked: '已锁定',
  completed: '已完成',
  cancelled: '已取消',
};

export const SERIES_ROLE_LABELS: Record<SeriesRole, string> = {
  hero: '主推系列',
  image: '形象系列',
  basic: '基础系列',
  traffic: '引流系列',
};

export const ARCHITECTURE_ROLE_LABELS = {
  basic: '基本款',
  lead: '主推款',
  image: '形象款',
  traffic: '引流款',
  functional: '功能款',
} as const;

export const ARCHITECTURE_DIMENSION_LABELS = {
  quantity: '数量',
  styleRole: '风格角色',
  structureType: '结构类型',
  soleType: '底型 / 跟型',
  lastType: '楦型 / 鞋头',
  developmentAttribute: '开发属性',
  platformStrategy: '平台策略',
} as const;

export const REVIEW_TYPE_LABELS: Record<ReviewType, string> = {
  concept_review: '概念评审',
  prototype_review: '原型评审',
  sample_review: '样鞋评审',
  cost_review: '成本评审',
  gate_review: 'Gate 复盘',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: '待评审',
  review: '待复审',
  pass: '通过',
  fail: '不通过',
};

export const GATE_GROUP_LABELS: Record<GateGroup, string> = {
  planning: '企划前置',
  design: '设计节点',
  development: '技术开发节点',
  cost: '成本采购节点',
  launch: '上市承接节点',
};

export const GATE_TYPE_LABELS: Record<GateType, string> = {
  brief_lock: '企划 Brief 锁定',
  wave_alignment: '波段任务确认',
  series_direction: '系列方向确认',
  concept_complete: '概念图完成',
  design_review: '设计初审',
  prototype_confirm: '原型确认',
  first_sample_review: '首样评审',
  second_sample_adjustment: '二样修正',
  last_confirm: '楦型确认',
  outsole_confirm: '底台确认',
  structure_confirm: '工艺结构确认',
  tech_pack_output: 'Tech Pack 输出',
  tooling_confirm: '开模确认',
  target_cost_confirm: '目标成本确认',
  sample_cost_review: '首轮核价',
  cost_down_action: '降本动作',
  bom_lock: 'BOM 锁定',
  long_lead_material_lock: '长交期材料锁定',
  lead_style_lock: '主推款锁定',
  marketing_sample_prepare: '拍摄样/陈列样准备',
  launch_asset_prepare: '上市资料准备',
};

