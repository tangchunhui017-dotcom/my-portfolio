import { STAGE_LABELS } from '@/config/design-review-center/labels';
import { startOfDay } from '@/lib/design-review-center/helpers/date';
import type { AssetType, GateGroup, GateNode, GateType, RiskLevel, Stage, StyleAggregate } from '@/lib/design-review-center/types';

// ─── Public types ─────────────────────────────────────────────────────────────

export type NormalizedGateStatus =
  | 'completed'
  | 'on_track'
  | 'due_this_week'
  | 'delayed'
  | 'blocked'
  | 'needs_decision';

export type DecisionRecommendation =
  | 'pass'
  | 'conditional_pass'
  | 'hold'
  | 'rework'
  | 'escalate'
  | 'cancel';

export interface GateCriterion {
  id: string;
  label: string;
}

export interface GateDeliverable {
  id: string;
  label: string;
  required: boolean;
  available: boolean;
}

export interface BusinessImpact {
  launch: boolean;
  cost: boolean;
  bom: boolean;
  otb: boolean;
  tooling: boolean;
  sample: boolean;
}

export interface DependencySummary {
  blockedByCount: number;
  blocksCount: number;
  description: string;
}

// ─── Static derivation helpers ────────────────────────────────────────────────

const GATE_GROUP_DEPT: Record<GateGroup, string> = {
  planning: '商品企划',
  design: '设计',
  development: '开发',
  cost: '成本/采购',
  launch: '零售/市场',
};

const GATE_NEXT_ACTION: Partial<Record<GateType, string>> = {
  brief_lock:               '锁定企划 Brief，同步设计团队',
  wave_alignment:           '对齐波段任务，确认开发款数',
  series_direction:         '确认系列方向，发起配色方向讨论',
  concept_complete:         '概念图确认，推进设计初审',
  design_review:            '准备设计评审材料，通知相关方',
  prototype_confirm:        '安排原型确认会议',
  first_sample_review:      '推进首样制作，安排首样评审会',
  second_sample_adjustment: '跟进二样修改，确认验收',
  last_confirm:             '发送楦型方案，等待开发确认',
  outsole_confirm:          '发送底台方案，等待开发确认',
  structure_confirm:        '输出工艺结构说明，确认生产可行性',
  tech_pack_output:         '完善 Tech Pack，提交开发团队',
  tooling_confirm:          '确认开模决策，签署开模申请',
  target_cost_confirm:      '核对目标成本，反馈商品企划',
  sample_cost_review:       '推进首轮核价，对接供应商',
  cost_down_action:         '制定降本方案，明确路径',
  bom_lock:                 '锁定 BOM 清单，触发采购流程',
  long_lead_material_lock:  '锁定长交期材料，发起采购',
  lead_style_lock:          '确认主推款方案，反馈商品企划',
  marketing_sample_prepare: '安排拍摄样制作，对接市场团队',
  launch_asset_prepare:     '准备上市资料包，通知零售和电商',
};

const REVIEW_CONCLUSION_LABEL: Record<string, string> = {
  pass:             '通过',
  pass_with_changes:'附条件通过',
  hold:             '暂缓',
  cancel:           '取消',
  cost_down:        '需降本',
  structure_adjust: '结构调整',
  material_rework:  '材料返工',
  next_round:       '下轮审核',
};

const DECISION_RECOMMENDATION_LABEL: Record<DecisionRecommendation, string> = {
  pass:             '可通过',
  conditional_pass: '附条件通过',
  hold:             '暂缓，待完善',
  rework:           '需返工',
  escalate:         '升级决策',
  cancel:           '建议取消',
};

// ─── Gate criteria / deliverables config ─────────────────────────────────────

interface GateCriteriaConfig {
  entry: GateCriterion[];
  exit: GateCriterion[];
  deliverables: Omit<GateDeliverable, 'available'>[];
}

const GATE_CRITERIA_MAP: Partial<Record<GateType, GateCriteriaConfig>> = {
  brief_lock: {
    entry: [
      { id: 'bf-e1', label: '商品企划输入已完成（波段/品类/价格带/目标客群）' },
      { id: 'bf-e2', label: '款式角色和开发优先级已确认' },
      { id: 'bf-e3', label: '目标成本和上市波段已对齐' },
    ],
    exit: [
      { id: 'bf-x1', label: '款式 Brief 已锁定并同步设计/开发' },
      { id: 'bf-x2', label: '开发边界、成本边界和风险边界已记录' },
      { id: 'bf-x3', label: '下一设计 Gate 和责任人已确认' },
    ],
    deliverables: [
      { id: 'bf-d1', label: '商品企划 Brief', required: true },
      { id: 'bf-d2', label: '目标成本/价格带输入', required: true },
      { id: 'bf-d3', label: '波段与品类角色说明', required: true },
    ],
  },
  wave_alignment: {
    entry: [
      { id: 'wa-e1', label: '年度/季度波段计划已确认' },
      { id: 'wa-e2', label: '波段 SKU 数、主推款和上市窗口已明确' },
    ],
    exit: [
      { id: 'wa-x1', label: '波段任务已分配到系列和款式' },
      { id: 'wa-x2', label: '开发节奏与上市节奏无冲突' },
      { id: 'wa-x3', label: '波段风险和替代款策略已记录' },
    ],
    deliverables: [
      { id: 'wa-d1', label: '波段企划表', required: true },
      { id: 'wa-d2', label: '主推/核心/引流款分配', required: true },
      { id: 'wa-d3', label: '上市窗口和关键节点', required: true },
    ],
  },
  series_direction: {
    entry: [
      { id: 'sd-e1', label: '品牌 DNA、消费者场景和趋势输入已确认' },
      { id: 'sd-e2', label: '系列角色、价格带和核心鞋型已明确' },
    ],
    exit: [
      { id: 'sd-x1', label: '系列方向、设计语言和材料/色彩方向已确认' },
      { id: 'sd-x2', label: '系列下款式开发任务已拆解' },
      { id: 'sd-x3', label: '偏离品牌/成本/波段目标的风险已记录' },
    ],
    deliverables: [
      { id: 'sd-d1', label: '系列方向说明', required: true },
      { id: 'sd-d2', label: '设计语言/材料/色彩方向', required: true },
      { id: 'sd-d3', label: '系列款式任务分解', required: true },
    ],
  },
  concept_complete: {
    entry: [
      { id: 'cc-e1', label: '已确认概念主题方向和目标客群' },
      { id: 'cc-e2', label: '已明确系列角色（主推/形象/引流/延展）' },
      { id: 'cc-e3', label: '已收到市场趋势和竞品参考' },
    ],
    exit: [
      { id: 'cc-x1', label: '初步效果图或草图已输出' },
      { id: 'cc-x2', label: '款式定位和系列角色已确认' },
      { id: 'cc-x3', label: '目标成本范围已初步对齐' },
    ],
    deliverables: [
      { id: 'cc-d1', label: '概念故事板/草图', required: true },
      { id: 'cc-d2', label: '款式定位说明', required: true },
      { id: 'cc-d3', label: '参考图册', required: false },
    ],
  },
  design_review: {
    entry: [
      { id: 'dr-e1', label: '已有完整设计版本（含配色和材料方向）' },
      { id: 'dr-e2', label: '已确认底台/楦型方向' },
      { id: 'dr-e3', label: '成本目标已明确' },
    ],
    exit: [
      { id: 'dr-x1', label: '评审结论已输出（通过/附条件/暂缓）' },
      { id: 'dr-x2', label: '修改意见已记录并分配责任人' },
      { id: 'dr-x3', label: '后续里程碑节点已确认' },
    ],
    deliverables: [
      { id: 'dr-d1', label: '设计版本文件', required: true },
      { id: 'dr-d2', label: '材料/配色方案', required: true },
      { id: 'dr-d3', label: '底台/楦型方向说明', required: true },
      { id: 'dr-d4', label: '评审结论记录', required: true },
    ],
  },
  prototype_confirm: {
    entry: [
      { id: 'pc-e1', label: '概念设计已通过或附条件通过' },
      { id: 'pc-e2', label: '原型图、底台比例和楦型方向已准备' },
      { id: 'pc-e3', label: '关键结构风险已预先识别' },
    ],
    exit: [
      { id: 'pc-x1', label: '原型比例、鞋头包覆和结构方向已确认' },
      { id: 'pc-x2', label: '进入首样或结构确认的条件已明确' },
      { id: 'pc-x3', label: '需要返工的设计项已形成任务' },
    ],
    deliverables: [
      { id: 'pc-d1', label: '原型图/效果图', required: true },
      { id: 'pc-d2', label: '底台与楦型方向', required: true },
      { id: 'pc-d3', label: '结构风险清单', required: true },
      { id: 'pc-d4', label: '原型评审结论', required: true },
    ],
  },
  first_sample_review: {
    entry: [
      { id: 'fs-e1', label: '首样已完成制作' },
      { id: 'fs-e2', label: 'Tech Pack 已提交给工厂' },
      { id: 'fs-e3', label: '评审参与方已确认出席' },
    ],
    exit: [
      { id: 'fs-x1', label: '首样问题清单已输出（结构/材料/工艺）' },
      { id: 'fs-x2', label: '试穿反馈已记录' },
      { id: 'fs-x3', label: '修改清单已分配责任人和截止日期' },
    ],
    deliverables: [
      { id: 'fs-d1', label: '首样照片（含细节）', required: true },
      { id: 'fs-d2', label: '试穿反馈记录', required: true },
      { id: 'fs-d3', label: '结构/材料问题清单', required: true },
      { id: 'fs-d4', label: '修改闭环计划', required: true },
    ],
  },
  second_sample_adjustment: {
    entry: [
      { id: 'sa-e1', label: '首样修改清单已完整执行' },
      { id: 'sa-e2', label: '二样已完成制作' },
    ],
    exit: [
      { id: 'sa-x1', label: '未关闭问题数 = 0 或已明确豁免' },
      { id: 'sa-x2', label: '是否可进成本核价已确认' },
      { id: 'sa-x3', label: '关键修改已验收（工艺/结构/材料）' },
    ],
    deliverables: [
      { id: 'sa-d1', label: '二样照片', required: true },
      { id: 'sa-d2', label: '修改闭环确认单', required: true },
      { id: 'sa-d3', label: '未关闭问题列表（含豁免说明）', required: true },
    ],
  },
  last_confirm: {
    entry: [
      { id: 'lc-e1', label: '楦型方案已准备' },
      { id: 'lc-e2', label: '试穿测试已完成' },
    ],
    exit: [
      { id: 'lc-x1', label: '楦型编号已锁定' },
      { id: 'lc-x2', label: '试穿反馈已确认（舒适/宽度/重量）' },
      { id: 'lc-x3', label: '舒适性风险已明确处理方案' },
    ],
    deliverables: [
      { id: 'lc-d1', label: '楦型编号和规格', required: true },
      { id: 'lc-d2', label: '试穿反馈记录', required: true },
      { id: 'lc-d3', label: '舒适性风险说明', required: false },
    ],
  },
  outsole_confirm: {
    entry: [
      { id: 'oc-e1', label: '底台方案已准备（材料/花纹/结构）' },
      { id: 'oc-e2', label: '开模策略已初步讨论' },
    ],
    exit: [
      { id: 'oc-x1', label: '底台编号已锁定' },
      { id: 'oc-x2', label: '开模策略已确认（新模/借模/共用）' },
      { id: 'oc-x3', label: '模具成本影响已对齐商品企划' },
    ],
    deliverables: [
      { id: 'oc-d1', label: '底台编号和规格', required: true },
      { id: 'oc-d2', label: '开模策略说明', required: true },
      { id: 'oc-d3', label: '模具成本估算', required: false },
    ],
  },
  structure_confirm: {
    entry: [
      { id: 'sc-e1', label: '设计版本和样品问题已明确' },
      { id: 'sc-e2', label: '工艺结构方案已由开发确认' },
    ],
    exit: [
      { id: 'sc-x1', label: '关键结构、工艺路径和风险点已锁定' },
      { id: 'sc-x2', label: '工厂可实现性和返工项已确认' },
      { id: 'sc-x3', label: 'Tech Pack 输出条件已满足' },
    ],
    deliverables: [
      { id: 'sc-d1', label: '结构工艺说明', required: true },
      { id: 'sc-d2', label: '工厂可行性确认', required: true },
      { id: 'sc-d3', label: '结构风险与修改清单', required: true },
    ],
  },
  tech_pack_output: {
    entry: [
      { id: 'tp-e1', label: '设计确认完成（配色/材料/楦底）' },
      { id: 'tp-e2', label: '结构工艺方向已对齐' },
    ],
    exit: [
      { id: 'tp-x1', label: 'Tech Pack 已提交开发团队' },
      { id: 'tp-x2', label: '结构说明和工艺要求已包含' },
      { id: 'tp-x3', label: '尺码范围/BOM 基础信息已包含' },
    ],
    deliverables: [
      { id: 'tp-d1', label: 'Tech Pack 文件', required: true },
      { id: 'tp-d2', label: '结构工艺说明', required: true },
      { id: 'tp-d3', label: 'BOM 基础信息', required: true },
    ],
  },
  tooling_confirm: {
    entry: [
      { id: 'tc-e1', label: '底台和楦型已确认' },
      { id: 'tc-e2', label: '开模供应商已评估' },
    ],
    exit: [
      { id: 'tc-x1', label: '开模申请已签署' },
      { id: 'tc-x2', label: '供应商已确定，交期已对齐' },
      { id: 'tc-x3', label: '模具费已纳入成本核算' },
    ],
    deliverables: [
      { id: 'tc-d1', label: '开模申请单', required: true },
      { id: 'tc-d2', label: '供应商确认函', required: true },
      { id: 'tc-d3', label: '模具费和交期说明', required: true },
    ],
  },
  target_cost_confirm: {
    entry: [
      { id: 'tcc-e1', label: '商品企划已给出目标成本' },
      { id: 'tcc-e2', label: '供应商初步报价已收集' },
    ],
    exit: [
      { id: 'tcc-x1', label: '目标成本与报价差异已说明' },
      { id: 'tcc-x2', label: '差异处理路径已明确（降本/调目标/取消）' },
    ],
    deliverables: [
      { id: 'tcc-d1', label: '目标成本确认单', required: true },
      { id: 'tcc-d2', label: '报价成本记录', required: true },
      { id: 'tcc-d3', label: '差异分析和处理路径', required: true },
    ],
  },
  sample_cost_review: {
    entry: [
      { id: 'scr-e1', label: '样品核价已启动' },
      { id: 'scr-e2', label: '供应商已收到完整 BOM 和 Tech Pack' },
    ],
    exit: [
      { id: 'scr-x1', label: '首轮核价已收回' },
      { id: 'scr-x2', label: '与目标成本的差异已明确' },
      { id: 'scr-x3', label: '谈判或降本路径已启动' },
    ],
    deliverables: [
      { id: 'scr-d1', label: '供应商报价单', required: true },
      { id: 'scr-d2', label: '成本差异分析', required: true },
    ],
  },
  cost_down_action: {
    entry: [
      { id: 'cda-e1', label: '目标成本与报价差距已明确' },
      { id: 'cda-e2', label: '可降本环节已初步识别' },
    ],
    exit: [
      { id: 'cda-x1', label: '降本路径已确认（材料/工艺/供应商）' },
      { id: 'cda-x2', label: '降本金额目标已锁定' },
      { id: 'cda-x3', label: '责任人和截止日期已分配' },
    ],
    deliverables: [
      { id: 'cda-d1', label: '降本方案说明', required: true },
      { id: 'cda-d2', label: '修改后目标成本', required: true },
    ],
  },
  bom_lock: {
    entry: [
      { id: 'bl-e1', label: '成本核价已通过' },
      { id: 'bl-e2', label: '所有材料规格已最终确认' },
    ],
    exit: [
      { id: 'bl-x1', label: 'BOM 清单已锁定并发采购' },
      { id: 'bl-x2', label: '所有材料供应商已确认' },
      { id: 'bl-x3', label: '采购 MOQ 和交期已对齐' },
    ],
    deliverables: [
      { id: 'bl-d1', label: '最终 BOM 清单', required: true },
      { id: 'bl-d2', label: '采购触发记录', required: true },
      { id: 'bl-d3', label: '供应商清单', required: true },
    ],
  },
  long_lead_material_lock: {
    entry: [
      { id: 'llm-e1', label: '长周期材料需求已识别' },
      { id: 'llm-e2', label: '替代材料已评估' },
    ],
    exit: [
      { id: 'llm-x1', label: '长周期材料已锁定' },
      { id: 'llm-x2', label: '供应商已确认，MOQ 和交期已锁定' },
      { id: 'llm-x3', label: '替代方案或风险缓冲已制定' },
    ],
    deliverables: [
      { id: 'llm-d1', label: '长周期材料清单', required: true },
      { id: 'llm-d2', label: '供应商确认单（含交期）', required: true },
      { id: 'llm-d3', label: '替代方案说明', required: false },
    ],
  },
  lead_style_lock: {
    entry: [
      { id: 'lsl-e1', label: '主推款角色和商品资源位已确认' },
      { id: 'lsl-e2', label: '设计、成本、样品和上市风险已复核' },
    ],
    exit: [
      { id: 'lsl-x1', label: '主推款方案已锁定' },
      { id: 'lsl-x2', label: '上市资源、拍摄样和备货节奏已确认' },
      { id: 'lsl-x3', label: '如不可锁定，已给出替代款或延期方案' },
    ],
    deliverables: [
      { id: 'lsl-d1', label: '主推款锁定决议', required: true },
      { id: 'lsl-d2', label: '商品资源位确认', required: true },
      { id: 'lsl-d3', label: '上市风险复核记录', required: true },
    ],
  },
  marketing_sample_prepare: {
    entry: [
      { id: 'msp-e1', label: '拍摄样需求已确认' },
      { id: 'msp-e2', label: '拍摄计划已制定' },
    ],
    exit: [
      { id: 'msp-x1', label: '拍摄样已制作完成' },
      { id: 'msp-x2', label: '市场团队已确认拍摄样规格' },
    ],
    deliverables: [
      { id: 'msp-d1', label: '拍摄样实物（或确认单）', required: true },
      { id: 'msp-d2', label: '拍摄计划和场景说明', required: true },
    ],
  },
  launch_asset_prepare: {
    entry: [
      { id: 'lap-e1', label: '拍摄样已完成并通过验收' },
      { id: 'lap-e2', label: '上市时间和渠道已确认' },
    ],
    exit: [
      { id: 'lap-x1', label: '上市图文内容已完成' },
      { id: 'lap-x2', label: '陈列/吊牌/零售资料已准备' },
      { id: 'lap-x3', label: '电商和零售上架资料已提交' },
    ],
    deliverables: [
      { id: 'lap-d1', label: '上市图文内容包', required: true },
      { id: 'lap-d2', label: '陈列和吊牌资料', required: true },
      { id: 'lap-d3', label: '零售/电商上架资料', required: true },
    ],
  },
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface GateTableRow {
  // ── Core gate fields ──
  gateId: string;
  styleId: string;
  seriesId: string;
  skuCode: string;
  styleName: string;
  seriesName: string;
  categoryName: string;
  waveId: string;
  waveName: string;
  gateGroup: GateGroup;
  gateType: GateNode['gateType'];
  gateName: string;
  plannedDate: string;
  actualDate: string | null;
  completed: boolean;
  delayed: boolean;
  blocked: boolean;
  owner: string;
  impactWave: string;
  note: string;
  currentStage: Stage;
  currentStageLabel: string;
  riskLevel: RiskLevel;
  // ── Computed date / status ──
  normalizedStatus: NormalizedGateStatus;
  dueInDays: number;
  delayDays: number;
  actualDelayDays: number;
  // ── Impact flags ──
  department: string;
  launchImpact: boolean;
  costImpact: boolean;
  otbImpact: boolean;
  bomImpact: boolean;
  feedbackRequired: boolean;
  businessImpact: BusinessImpact;
  // ── Risk / priority ──
  riskReason: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  escalationLevel: 'P0' | 'P1' | 'P2' | 'P3';
  // ── Gate readiness ──
  gateReadinessScore: number;
  entryCriteria: GateCriterion[];
  exitCriteria: GateCriterion[];
  requiredDeliverables: GateDeliverable[];
  missingDeliverables: GateDeliverable[];
  // ── Decision ──
  decisionRecommendation: DecisionRecommendation;
  decisionRecommendationLabel: string;
  decisionReason: string;
  nextAction: string;
  // ── Related data ──
  latestReviewDecision: string | null;
  relatedVersionStatus: string;
  openTaskCount: number;
  overdueTaskCount: number;
  completedTaskCount: number;
  evidenceSummary: string;
  dependencySummary: DependencySummary;
  // ── Legacy compat ──
  expectedDelayDays: number;
  relatedTaskCount: number;
}

export interface GateWaveGroup {
  waveId: string;
  waveName: string;
  total: number;
  completed: number;
  delayed: number;
  blocked: number;
  rows: GateTableRow[];
}

// ─── Helper for computing deliverable availability ─────────────────────────────

const CLOSED_ACTION_STATUSES = new Set(['completed', 'reviewed', 'closed']);
const SAMPLE_ASSET_TYPES: AssetType[] = [
  'first_sample_photo',
  'second_sample_photo',
  'final_sample_photo',
];

function isActionClosed(status: string) {
  return CLOSED_ACTION_STATUSES.has(status);
}

function isExecutionStarted(status: string) {
  return status !== 'not_started';
}

function isExecutionDone(status: string) {
  return status === 'completed';
}

function hasAsset(aggregate: StyleAggregate, assetTypes: AssetType[]) {
  return aggregate.assets.some((asset) => assetTypes.includes(asset.assetType));
}

function hasDesignVersion(aggregate: StyleAggregate) {
  return aggregate.assets.length > 0 || Boolean(aggregate.latestAsset);
}

function hasMaterialAndColor(aggregate: StyleAggregate) {
  return (
    aggregate.style.materialPlan.length > 0
    && aggregate.style.colorPlan.length > 0
  ) || hasAsset(aggregate, ['material_board', 'color_board']);
}

function hasOutsoleAndLast(aggregate: StyleAggregate) {
  return Boolean(aggregate.style.outsole && aggregate.style.last)
    || hasAsset(aggregate, ['outsole_board', 'last_board']);
}

function hasSampleAsset(aggregate: StyleAggregate, assetType?: AssetType) {
  return assetType
    ? hasAsset(aggregate, [assetType])
    : hasAsset(aggregate, SAMPLE_ASSET_TYPES);
}

interface DeliverableContext {
  aggregate: StyleAggregate;
  gate: GateNode;
  dueInDays: number;
  gateCompleted: boolean;
  gateBlocked: boolean;
  hasReview: boolean;
  openTaskCount: number;
  completedTaskCount: number;
}

function resolveDeliverableAvailability(deliverable: Omit<GateDeliverable, 'available'>, context: DeliverableContext) {
  const { aggregate, gate, hasReview, openTaskCount, completedTaskCount } = context;
  const { style, series, categoryPlan } = aggregate;
  const hasAnyVersion = hasDesignVersion(aggregate);
  const hasAnyAction = aggregate.actionItems.length > 0;
  const hasOpenOrClosedAction = openTaskCount > 0 || completedTaskCount > 0;

  if (context.gateCompleted) return true;

  switch (deliverable.id) {
    case 'bf-d1': return Boolean(style.designSummary || style.developmentRole || categoryPlan);
    case 'bf-d2': return style.targetCost !== null || Boolean(categoryPlan?.targetCostBand);
    case 'bf-d3': return Boolean(style.waveId && style.categoryName && style.developmentRole);

    case 'wa-d1': return Boolean(aggregate.wave);
    case 'wa-d2': return Boolean(style.developmentRole || style.leadStyle || series?.seriesRole);
    case 'wa-d3': return Boolean(aggregate.wave?.launchWindow || style.dueDate);

    case 'sd-d1': return Boolean(series?.themeDirection || series?.designTheme || style.designSummary);
    case 'sd-d2': return Boolean(
      (series?.designLanguages.length ?? 0) > 0
      || (series?.materialDirections.length ?? 0) > 0
      || (series?.colorDirections.length ?? 0) > 0
      || hasMaterialAndColor(aggregate),
    );
    case 'sd-d3': return hasAnyAction || aggregate.gateNodes.length > 1;

    case 'cc-d1': return hasAsset(aggregate, ['concept_sketch', 'effect_render', 'rendering']);
    case 'cc-d2': return Boolean(style.designSummary || style.developmentRole || style.categoryName);
    case 'cc-d3': return aggregate.assets.length > 0 || deliverable.required === false;

    case 'pc-d1': return hasAsset(aggregate, ['concept_sketch', 'effect_render', 'rendering']);
    case 'pc-d2': return hasOutsoleAndLast(aggregate);
    case 'pc-d3': return Boolean(gate.note || hasAnyAction);
    case 'pc-d4': return hasReview;

    case 'dr-d1': return hasAnyVersion;
    case 'dr-d2': return hasMaterialAndColor(aggregate);
    case 'dr-d3': return hasOutsoleAndLast(aggregate);
    case 'dr-d4': return hasReview;

    case 'fs-d1': return hasSampleAsset(aggregate, 'first_sample_photo');
    case 'fs-d2': return isExecutionStarted(style.sampleStatus) || hasReview;
    case 'fs-d3': return Boolean(gate.note || aggregate.latestReview?.issueDescription);
    case 'fs-d4': return hasOpenOrClosedAction;

    case 'sa-d1': return hasSampleAsset(aggregate, 'second_sample_photo');
    case 'sa-d2': return completedTaskCount > 0 || hasReview;
    case 'sa-d3': return Boolean(gate.note || !style.blocked);

    case 'lc-d1': return Boolean(style.last) || hasAsset(aggregate, ['last_board']);
    case 'lc-d2': return isExecutionStarted(style.sampleStatus) || hasReview;
    case 'lc-d3': return deliverable.required === false && (style.riskLevel !== 'blocking' || Boolean(gate.note));

    case 'oc-d1': return Boolean(style.outsole) || hasAsset(aggregate, ['outsole_board']);
    case 'oc-d2': return isExecutionStarted(style.toolingStatus) || Boolean(style.outsole);
    case 'oc-d3': return style.targetCost !== null || style.quotedCost !== null || deliverable.required === false;

    case 'sc-d1': return isExecutionStarted(style.techPackStatus) || gate.note.includes('结构');
    case 'sc-d2': return isExecutionStarted(style.technicalStatus) || Boolean(gate.note);
    case 'sc-d3': return Boolean(gate.note || hasAnyAction);

    case 'tp-d1': return isExecutionDone(style.techPackStatus);
    case 'tp-d2': return isExecutionStarted(style.techPackStatus);
    case 'tp-d3': return style.materialPlan.length > 0 && style.targetCost !== null;

    case 'tc-d1': return isExecutionStarted(style.toolingStatus);
    case 'tc-d2': return isExecutionDone(style.toolingStatus) || gate.completed;
    case 'tc-d3': return style.quotedCost !== null || style.lockedCost !== null || style.targetCost !== null;

    case 'tcc-d1': return style.targetCost !== null;
    case 'tcc-d2': return style.quotedCost !== null;
    case 'tcc-d3': return style.targetCost !== null && style.quotedCost !== null;

    case 'scr-d1': return style.quotedCost !== null;
    case 'scr-d2': return style.targetCost !== null && style.quotedCost !== null;

    case 'cda-d1': return aggregate.latestReview?.conclusion === 'cost_down' || hasAnyAction;
    case 'cda-d2': return style.targetCost !== null;

    case 'bl-d1': return style.bomLocked || style.materialPlan.length > 0;
    case 'bl-d2': return style.bomLocked;
    case 'bl-d3': return style.materialPlan.length > 0;

    case 'llm-d1': return style.materialPlan.length > 0;
    case 'llm-d2': return isExecutionStarted(style.materialStatus) || style.bomLocked;
    case 'llm-d3': return deliverable.required === false && (style.riskLevel !== 'high' || Boolean(gate.note));

    case 'lsl-d1': return style.leadStyle && hasReview;
    case 'lsl-d2': return style.leadStyle && Boolean(aggregate.wave?.launchWindow || style.dueDate);
    case 'lsl-d3': return style.leadStyle && Boolean(gate.note || hasReview);

    case 'msp-d1': return hasSampleAsset(aggregate, 'final_sample_photo');
    case 'msp-d2': return Boolean(gate.note || hasAnyAction);

    case 'lap-d1': return hasSampleAsset(aggregate, 'final_sample_photo');
    case 'lap-d2': return style.locked || style.leadStyle;
    case 'lap-d3': return style.locked && !style.cancelled;

    default:
      if (!deliverable.required) return context.dueInDays > 14 || Boolean(gate.note);
      return !context.gateBlocked && context.dueInDays > 7 && hasAnyVersion;
  }
}

function resolveDeliverables(
  criteria: GateCriteriaConfig,
  context: DeliverableContext,
): GateDeliverable[] {
  return criteria.deliverables.map((deliverable) => ({
    ...deliverable,
    available: resolveDeliverableAvailability(deliverable, context),
  }));
}

// ─── Utility exports ──────────────────────────────────────────────────────────

export function sortGateNodes(gateNodes: GateNode[]) {
  return [...gateNodes].sort((a, b) => startOfDay(a.plannedDate) - startOfDay(b.plannedDate));
}

export function getNextGateByStyle(styleId: string, gateNodes: GateNode[]) {
  return sortGateNodes(gateNodes).find((g) => g.styleId === styleId && !g.completed) ?? null;
}

export function summarizeGates(gateNodes: GateNode[]) {
  return {
    total: gateNodes.length,
    completed: gateNodes.filter((g) => g.completed).length,
    delayed: gateNodes.filter((g) => g.delayed).length,
    blocked: gateNodes.filter((g) => g.blocked).length,
  };
}

export function groupGateNodesByWave(
  gateNodes: GateNode[],
  styleWaveLookup: Record<string, string>,
) {
  return gateNodes.reduce<Record<string, GateNode[]>>((acc, gate) => {
    const waveId = styleWaveLookup[gate.styleId] ?? 'unknown';
    if (!acc[waveId]) acc[waveId] = [];
    acc[waveId].push(gate);
    return acc;
  }, {});
}

// ─── Core derivation ─────────────────────────────────────────────────────────

export function createGateTableRows(
  styleAggregates: StyleAggregate[],
  referenceDate: string,
): GateTableRow[] {
  const refMs = new Date(referenceDate).getTime();

  return styleAggregates
    .flatMap((aggregate) =>
      aggregate.gateNodes.map((gate): GateTableRow => {
        const plannedMs = new Date(gate.plannedDate).getTime();
        const actualMs = gate.actualDate ? new Date(gate.actualDate).getTime() : null;

        const dueInDays = Math.round((plannedMs - refMs) / 86400000);
        const delayDays = gate.completed
          ? 0
          : Math.max(0, Math.round((refMs - plannedMs) / 86400000));
        const actualDelayDays = actualMs
          ? Math.max(0, Math.round((actualMs - plannedMs) / 86400000))
          : 0;

        let normalizedStatus: NormalizedGateStatus;
        if (gate.completed) normalizedStatus = 'completed';
        else if (gate.blocked) normalizedStatus = 'blocked';
        else if (gate.delayed || dueInDays < 0) normalizedStatus = 'delayed';
        else if (dueInDays <= 7) normalizedStatus = 'due_this_week';
        else if (aggregate.latestReview?.conclusion === 'hold') normalizedStatus = 'needs_decision';
        else normalizedStatus = 'on_track';

        const launchImpact =
          gate.blocked ||
          (gate.delayed && gate.gateGroup === 'launch' && gate.impactWave !== '');
        const costImpact =
          (gate.gateGroup === 'cost' && (gate.blocked || gate.delayed)) ||
          gate.note.includes('成本') ||
          gate.note.includes('OTB');
        const otbImpact = gate.gateGroup === 'cost' && gate.blocked;
        const bomImpact = gate.gateType === 'bom_lock' && !gate.completed;
        const toolingImpact =
          gate.gateType === 'tooling_confirm' &&
          !gate.completed &&
          (gate.blocked || gate.delayed);
        const sampleImpact =
          ['first_sample_review', 'second_sample_adjustment', 'last_confirm'].includes(
            gate.gateType,
          ) &&
          !gate.completed &&
          (gate.blocked || gate.delayed);
        const feedbackRequired = (launchImpact || costImpact) && (gate.blocked || gate.delayed);

        const businessImpact: BusinessImpact = {
          launch: launchImpact,
          cost: costImpact,
          bom: bomImpact || gate.gateType === 'bom_lock',
          otb: otbImpact,
          tooling: toolingImpact,
          sample: sampleImpact,
        };

        let priority: 'P0' | 'P1' | 'P2' | 'P3';
        if (gate.blocked && launchImpact) priority = 'P0';
        else if ((gate.blocked || gate.delayed) && (costImpact || otbImpact || bomImpact))
          priority = 'P1';
        else if (
          (gate.blocked || gate.delayed) &&
          (gate.gateGroup === 'design' || gate.gateGroup === 'development')
        )
          priority = 'P2';
        else priority = 'P3';

        const criteriaConfig = GATE_CRITERIA_MAP[gate.gateType] ?? {
          entry: [],
          exit: [],
          deliverables: [],
        };
        const hasReview = aggregate.latestReview != null;
        const allTasks = aggregate.actionItems;
        const openTaskCount = allTasks.filter(
          (task) => !isActionClosed(task.status),
        ).length;
        const overdueTaskCount = allTasks.filter(
          (task) =>
            !isActionClosed(task.status) &&
            new Date(task.dueDate).getTime() < refMs,
        ).length;
        const completedTaskCount = allTasks.filter((task) => isActionClosed(task.status)).length;
        const requiredDeliverables = resolveDeliverables(
          criteriaConfig,
          {
            aggregate,
            gate,
            dueInDays,
            gateCompleted: gate.completed,
            gateBlocked: gate.blocked,
            hasReview,
            openTaskCount,
            completedTaskCount,
          },
        );
        const missingDeliverables = requiredDeliverables.filter((d) => d.required && !d.available);

        let gateReadinessScore: number;
        if (gate.completed) {
          gateReadinessScore = 100;
        } else if (gate.blocked) {
          gateReadinessScore = Math.max(0, 10 - Math.min(10, delayDays));
        } else {
          const total = requiredDeliverables.filter((d) => d.required).length;
          const available = requiredDeliverables.filter((d) => d.required && d.available).length;
          const baseScore = total > 0 ? Math.round((available / total) * 65) : 50;
          const timeBonus = dueInDays > 14 ? 25 : dueInDays > 7 ? 15 : dueInDays > 0 ? 5 : 0;
          const delayPenalty = Math.min(30, delayDays * 3);
          gateReadinessScore = Math.max(5, Math.min(95, baseScore + timeBonus - delayPenalty));
        }

        let decisionRecommendation: DecisionRecommendation;
        if (gate.completed) decisionRecommendation = 'pass';
        else if (gate.blocked && launchImpact) decisionRecommendation = 'escalate';
        else if (gate.blocked) decisionRecommendation = 'rework';
        else if (missingDeliverables.length > 0 && (gate.delayed || dueInDays < 0))
          decisionRecommendation = 'hold';
        else if (missingDeliverables.length > 0) decisionRecommendation = 'conditional_pass';
        else if (gateReadinessScore >= 75) decisionRecommendation = 'conditional_pass';
        else decisionRecommendation = 'hold';

        const reasonParts: string[] = [];
        if (gate.blocked) reasonParts.push('有阻塞项未解除');
        if (gate.delayed || dueInDays < 0) reasonParts.push(`逾期 ${delayDays} 天`);
        if (missingDeliverables.length > 0)
          reasonParts.push(`缺 ${missingDeliverables.length} 项必交付物`);
        if (launchImpact) reasonParts.push('影响上市节奏');
        if (costImpact) reasonParts.push('影响成本核算');
        const decisionReason =
          reasonParts.length > 0 ? reasonParts.join('，') : '推进中，建议跟进';

        const latestConclusion = aggregate.latestReview?.conclusion ?? null;
        const versionNum = aggregate.latestAsset?.versionNumber;
        const stageLabel =
          STAGE_LABELS[aggregate.style.currentStage] ?? aggregate.style.currentStage;
        const relatedVersionStatus =
          versionNum != null ? `v${versionNum} · ${stageLabel}` : stageLabel;

        const evidenceParts: string[] = [];
        if (versionNum != null) evidenceParts.push(`设计版本 v${versionNum}`);
        if (latestConclusion)
          evidenceParts.push(
            `评审: ${REVIEW_CONCLUSION_LABEL[latestConclusion] ?? latestConclusion}`,
          );
        if (allTasks.length > 0)
          evidenceParts.push(`任务 ${completedTaskCount}/${allTasks.length} 已完成`);
        const evidenceSummary =
          evidenceParts.length > 0 ? evidenceParts.join(' · ') : '暂无关联信息';

        const orderedGates = sortGateNodes(aggregate.gateNodes);
        const gateIndex = orderedGates.findIndex((item) => item.gateId === gate.gateId);
        const upstreamGates = gateIndex > 0 ? orderedGates.slice(0, gateIndex) : [];
        const downstreamGates = gateIndex >= 0 ? orderedGates.slice(gateIndex + 1) : [];
        const upstreamOpen = upstreamGates.filter((item) => !item.completed);
        const downstreamOpen = downstreamGates.filter((item) => !item.completed);
        const blockedByCount = upstreamOpen.length;
        const blocksCount = gate.completed ? 0 : downstreamOpen.length;
        const upstreamText = blockedByCount > 0
          ? `上游未关闭：${upstreamOpen.slice(0, 2).map((item) => item.gateName).join('、')}`
          : '上游 Gate 已满足';
        const downstreamText = blocksCount > 0
          ? `影响下游：${downstreamOpen.slice(0, 2).map((item) => item.gateName).join('、')}`
          : '暂无下游阻塞';
        const groupDependencyText =
          gate.gateGroup === 'design'
            ? '设计节点会影响原型、样品和后续成本核价'
            : gate.gateGroup === 'development'
            ? '开发节点会影响成本核价、BOM 锁定和样品进度'
            : gate.gateGroup === 'cost'
            ? '成本节点会影响 BOM、OTB 和上市资源投放'
            : gate.gateGroup === 'launch'
            ? '上市节点依赖成本锁定、样品完成和上市资料准备'
            : '企划节点会影响后续设计和开发资源排期';
        const dependencyDescription = `${upstreamText}；${downstreamText}；${groupDependencyText}`;

        return {
          gateId: gate.gateId,
          styleId: aggregate.style.styleId,
          seriesId: aggregate.style.seriesId,
          skuCode: aggregate.style.skuCode,
          styleName: aggregate.style.styleDisplayName,
          seriesName: aggregate.series?.seriesName ?? aggregate.style.seriesId,
          categoryName: aggregate.style.categoryName,
          waveId: aggregate.style.waveId,
          waveName: aggregate.wave?.waveName ?? aggregate.style.waveId.toUpperCase(),
          gateGroup: gate.gateGroup,
          gateType: gate.gateType,
          gateName: gate.gateName,
          plannedDate: gate.plannedDate,
          actualDate: gate.actualDate,
          completed: gate.completed,
          delayed: gate.delayed,
          blocked: gate.blocked,
          owner: gate.owner,
          impactWave: gate.impactWave,
          note: gate.note,
          currentStage: aggregate.style.currentStage,
          currentStageLabel: stageLabel,
          riskLevel: aggregate.style.riskLevel,
          normalizedStatus,
          dueInDays,
          delayDays,
          actualDelayDays,
          department: GATE_GROUP_DEPT[gate.gateGroup],
          launchImpact,
          costImpact,
          otbImpact,
          bomImpact,
          feedbackRequired,
          businessImpact,
          riskReason:
            gate.note ||
            (gate.blocked ? '阻塞原因待填写' : gate.delayed ? '延期原因待填写' : ''),
          priority,
          escalationLevel: priority,
          gateReadinessScore,
          entryCriteria: criteriaConfig.entry,
          exitCriteria: criteriaConfig.exit,
          requiredDeliverables,
          missingDeliverables,
          decisionRecommendation,
          decisionRecommendationLabel: DECISION_RECOMMENDATION_LABEL[decisionRecommendation],
          decisionReason,
          nextAction: GATE_NEXT_ACTION[gate.gateType] ?? '推进当前节点，更新状态',
          latestReviewDecision: latestConclusion
            ? (REVIEW_CONCLUSION_LABEL[latestConclusion] ?? latestConclusion)
            : null,
          relatedVersionStatus,
          openTaskCount,
          overdueTaskCount,
          completedTaskCount,
          evidenceSummary,
          dependencySummary: {
            blockedByCount,
            blocksCount,
            description: dependencyDescription,
          },
          expectedDelayDays: delayDays,
          relatedTaskCount: allTasks.length,
        };
      }),
    )
    .sort((a, b) => {
      const waveCmp = a.waveId.localeCompare(b.waveId);
      if (waveCmp !== 0) return waveCmp;
      return startOfDay(a.plannedDate) - startOfDay(b.plannedDate);
    });
}

export function createGateWaveGroups(
  styleAggregates: StyleAggregate[],
  referenceDate: string,
): GateWaveGroup[] {
  const rows = createGateTableRows(styleAggregates, referenceDate);
  const grouped = rows.reduce<Record<string, GateTableRow[]>>((acc, row) => {
    if (!acc[row.waveId]) acc[row.waveId] = [];
    acc[row.waveId].push(row);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([waveId, waveRows]) => ({
      waveId,
      waveName: waveRows[0]?.waveName ?? waveId.toUpperCase(),
      total: waveRows.length,
      completed: waveRows.filter((r) => r.completed).length,
      delayed: waveRows.filter((r) => r.normalizedStatus === 'delayed').length,
      blocked: waveRows.filter((r) => r.blocked).length,
      rows: waveRows,
    }))
    .sort((a, b) => a.waveId.localeCompare(b.waveId));
}
