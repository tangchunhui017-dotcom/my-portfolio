/**
 * src/config/bigMerchWorkflow.ts
 * 大商品企划推进式时间工作流 — 核心配置
 * 5阶段 22节点 3个评审门
 */

// ─── 类型定义 ───────────────────────────────────────────────────────────────

export type WorkflowStage = 'startup' | 'revise' | 'form' | 'launch' | 'review';
export type NodeStatus = '未开始' | '进行中' | '待协同' | '已完成' | '延期' | '预警';
export type RiskLevel = '低' | '中' | '高';
export type Season = 'SS' | 'FW';
export type DeliverableStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export type Department =
  | 'customer'
  | 'design'
  | 'material'
  | 'merch'
  | 'merch_ops'
  | 'brand'
  | 'finance'
  | 'supply'
  | 'display_market'
  | 'agent_vip'
  | 'channel';

// relatedTabs 复用现有 AnnualControlPanel JumpTab
export type WorkflowJumpTab = 'category' | 'planning' | 'otb' | 'channel' | 'inventory';

export interface FootwearField {
  key: string;
  label: string;
  hint: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
}

export interface FootwearAugment {
  fields: FootwearField[];
}

export interface ActionPlanDef {
  id: string;
  title: string;
  ownerDept: Department;
  collaboratorDepts: Department[];
  metric?: string;
  required: boolean;
  followUpMethod?: string;  // 如何跟进及评估
  resourceNeeds?: string;   // 资源需求
}

export interface DeliverableDef {
  id: string;
  title: string;
  required: boolean;
  reviewOwnerDept?: Department;
}

export interface WorkflowNodeDef {
  id: string;
  index: number;
  title: string;
  stage: WorkflowStage;
  /** 相对 T 的月数，负数=T之前 */
  relStartMonth: number;
  relEndMonth: number;
  ownerDept: Department;
  collaboratorDepts: Department[];
  workGoal: string;
  keyQuestions: string[];
  inputMaterials: string[];
  actionPlans: ActionPlanDef[];
  deliverables: DeliverableDef[];
  completionCriteria: string[];
  relatedTabs: WorkflowJumpTab[];
  nextNodeIds: string[];
  baselineRisk: RiskLevel;
  footwearAugment?: FootwearAugment;
}

export interface WorkflowGateDef {
  id: string;
  title: string;
  description: string;
  requiredNodeIds: string[];
  fromStage: WorkflowStage;
  toStage: WorkflowStage;
}

// ─── Runtime 类型（存储层） ──────────────────────────────────────────────────

export interface TaskRuntime {
  checked: boolean;
  due?: string;
  assignee?: string;
}

export interface ActionPlanRuntime {
  progress: number; // 0-100
  checked: boolean;
  note?: string;
  due?: string;
  assignee?: string;
}

export interface Blocker {
  id: string;
  raisedBy: Department;
  blockedBy: Department;
  desc: string;
  action: string;
  resolved: boolean;
  ts: number;
}

export interface WorkflowComment {
  id: string;
  author: string;
  mentions: Department[];
  body: string;
  ts: number;
}

export interface NodeRuntime {
  tasks: Record<string, TaskRuntime>;
  actionPlans: Record<string, ActionPlanRuntime>;
  deliverables: Record<string, DeliverableStatus>;
  blockers: Blocker[];
  comments: WorkflowComment[];
  footwearValues: Record<string, string>;
  questionsAnswered: Record<number, boolean>;  // 关键问题解答状态，key为问题序号(0起)
  lastUpdated: number;
}

export interface GateRuntime {
  passed: boolean;
  passedAt?: number;
  passedBy?: string;
  notes?: string;
}

export interface SeasonCycleState {
  nodes: Record<string, NodeRuntime>;
  gates: Record<string, GateRuntime>;
}

export interface WorkflowFilter {
  riskLevel?: RiskLevel[];
  status?: NodeStatus[];
  dept?: Department[];
  stage?: WorkflowStage[];
}

export interface WorkflowState {
  schemaVersion: 1;
  active: { season: Season; year: number };
  cycles: Record<string, SeasonCycleState>;
  view: 'timeline' | 'by_dept';
  filter?: WorkflowFilter;
  simulatedDate?: string;
}

// ─── 常量 ───────────────────────────────────────────────────────────────────

export const DEPT_LABELS: Record<Department, string> = {
  customer: '客服/客户管理',
  design: '设计研发',
  material: '材料工艺',
  merch: '商品企划',
  merch_ops: '商品运营',
  brand: '品牌推广',
  finance: '财务',
  supply: '生产供应',
  display_market: '陈列市场',
  agent_vip: '代理/VIP/一线',
  channel: '渠道管理',
};

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  startup: '启动期',
  revise: '修正期',
  form: '形成期',
  launch: '上市执行期',
  review: '复盘期',
};

export const STAGE_RANGE: Record<WorkflowStage, string> = {
  startup: 'T-12 ~ T-9',
  revise: 'T-9 ~ T-5',
  form: 'T-5 ~ T-1',
  launch: 'T ~ T+3',
  review: 'T+3 ~ T+6',
};

export const STATUS_TONE: Record<NodeStatus, string> = {
  '未开始': 'slate',
  '进行中': 'sky',
  '待协同': 'amber',
  '已完成': 'emerald',
  '延期': 'rose',
  '预警': 'rose',
};

export const RISK_TONE: Record<RiskLevel, string> = {
  '低': 'emerald',
  '中': 'amber',
  '高': 'rose',
};

// ─── Gate 配置 ───────────────────────────────────────────────────────────────

export const WORKFLOW_GATES: WorkflowGateDef[] = [
  {
    id: 'G1',
    title: 'G1 启动→修正',
    description: '启动期全部完成后进入修正期',
    requiredNodeIds: ['N01', 'N02', 'N03', 'N04', 'N05', 'N06'],
    fromStage: 'startup',
    toStage: 'revise',
  },
  {
    id: 'G2',
    title: 'G2 修正→形成',
    description: '修正期全部完成后进入形成期',
    requiredNodeIds: ['N07', 'N08', 'N09', 'N09a', 'N10', 'N11', 'N12'],
    fromStage: 'revise',
    toStage: 'form',
  },
  {
    id: 'G3',
    title: 'G3 形成→上市',
    description: '形成期全部完成后进入上市执行期',
    requiredNodeIds: ['N13', 'N14', 'N15', 'N16', 'N17'],
    fromStage: 'form',
    toStage: 'launch',
  },
];

// ─── 22 节点配置 ─────────────────────────────────────────────────────────────

export const WORKFLOW_NODES: WorkflowNodeDef[] = [
  // ── 启动期 T-12 ~ T-9 ──────────────────────────────────────────────────────
  {
    id: 'N01',
    index: 1,
    title: '年度复盘',
    stage: 'startup',
    relStartMonth: -12,
    relEndMonth: -11,
    ownerDept: 'merch',
    collaboratorDepts: ['finance', 'design', 'merch_ops', 'supply'],
    workGoal: '总结上一年度各鞋型系列经营结果，梳理品类缺失与产品补充需求，提炼商品策略教训，为新季企划提供数据与策略基础。',
    keyQuestions: [
      '上年度哪些鞋型系列完成目标？哪些价格带表现不及预期、原因是什么？',
      '各鞋型系列的售罄率和毛利率是否达标？哪些系列存在产品结构缺失需要补充？',
      '上一年度商品策略（新旧品比例、价格带分布）的实现程度如何？',
      '上一年度未能落地的设计/工艺/材料方向，下一年度是否有条件重新推进？',
      '哪些鞋型是值得翻单的经典款？翻单时是否需要微调楦型、颜色或材质？',
    ],
    inputMaterials: [
      '上年度销售数据报告',
      '全年库存与周转数据',
      '毛利结算与折扣分析',
      '门店/代理反馈汇总',
      '上一年度各鞋型系列售罄率数据',
      '上一年度设计企划执行复盘',
    ],
    actionPlans: [
      {
        id: 'N01-A1',
        title: '整理年度销售与库存数据',
        ownerDept: 'merch',
        collaboratorDepts: ['finance'],
        metric: '数据完整性 100%',
        required: true,
      },
      {
        id: 'N01-A2',
        title: '组织年度复盘会议',
        ownerDept: 'merch',
        collaboratorDepts: ['merch_ops', 'supply', 'design'],
        required: true,
      },
      {
        id: 'N01-A3',
        title: '输出经典翻单候选清单',
        ownerDept: 'merch',
        collaboratorDepts: ['merch_ops'],
        required: false,
      },
    ],
    deliverables: [
      { id: 'N01-D1', title: '年度经营复盘报告（含各系列售罄率/毛利率分析）', required: true, reviewOwnerDept: 'finance' },
      { id: 'N01-D2', title: '经典款翻单候选清单', required: false, reviewOwnerDept: 'merch' },
      { id: 'N01-D3', title: '下一年度商品策略方向建议', required: true, reviewOwnerDept: 'merch' },
    ],
    completionCriteria: [
      '年度复盘报告已审批，含各系列售罄率与毛利率完整数据',
      '经典款翻单候选清单已整理完毕',
      '下一年度商品策略方向建议已输出并与核心团队对齐',
    ],
    relatedTabs: ['planning', 'inventory'],
    nextNodeIds: ['N02'],
    baselineRisk: '低',
  },
  {
    id: 'N02',
    index: 2,
    title: '品牌定位确认',
    stage: 'startup',
    relStartMonth: -11,
    relEndMonth: -10.5,
    ownerDept: 'brand',
    collaboratorDepts: ['merch', 'design'],
    workGoal: '确认新季品牌主题词、目标消费场景和鞋履系列的情感表达与风格定调，为设计企划和商品企划提供方向约束。',
    keyQuestions: [
      '新季品牌主题词是什么？对应的核心消费场景是哪个（通勤/轻户外/节庆/正式场合）？',
      '目标消费者的穿鞋偏好（鞋型/功能/风格）本季是否有变化？',
      '竞品品牌本季的定位调整对我方有何影响？',
      '品牌主题对设计企划（鞋型廓形/颜色基调）和商品企划（品类占比）有哪些方向约束？',
    ],
    inputMaterials: ['市场趋势报告', '消费者调研结果', '上季品牌执行复盘', '上一季品牌活动执行效果复盘'],
    actionPlans: [
      {
        id: 'N02-A1',
        title: '制定品牌季度主题方案',
        ownerDept: 'brand',
        collaboratorDepts: ['design', 'merch'],
        required: true,
      },
      {
        id: 'N02-A2',
        title: '品牌定位评审会',
        ownerDept: 'brand',
        collaboratorDepts: ['merch'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N02-D1', title: '品牌季度定位文件', required: true, reviewOwnerDept: 'brand' },
    ],
    completionCriteria: ['品牌定位文件已审批', '核心团队对主题方向达成共识'],
    relatedTabs: ['planning'],
    nextNodeIds: ['N03'],
    baselineRisk: '低',
  },
  {
    id: 'N03',
    index: 3,
    title: '客户需求分析',
    stage: 'startup',
    relStartMonth: -10.5,
    relEndMonth: -10,
    ownerDept: 'customer',
    collaboratorDepts: ['merch', 'agent_vip'],
    workGoal: '分析存量客户的用鞋偏好变化与增量市场容量机会，为商品企划提供消费者洞察与品类空白输入。',
    keyQuestions: [
      '存量客户复购率最高的鞋型/品类是哪些？最近一季的退换货原因主要集中在哪里？',
      '存量客户的穿鞋场景和偏好（楦型/功能/价格带/颜色）出现了哪些新变化？',
      '增量市场的目标容量有多大？新客群的穿鞋习惯与存量客户的主要差异是什么？',
      '代理商/门店反馈哪些品类存在供给空白？哪些鞋型需求长期未被满足？',
      '线上与线下消费者在鞋型偏好/价格带/颜色选择上是否有显著差异？',
    ],
    inputMaterials: [
      '客户满意度调研',
      '客户复购数据与退换货原因分析',
      '代理商/门店反馈汇总',
      '线上评论与消费数据分析',
    ],
    actionPlans: [
      {
        id: 'N03-A1',
        title: '整理代理商和终端反馈',
        ownerDept: 'customer',
        collaboratorDepts: ['agent_vip'],
        required: true,
      },
      {
        id: 'N03-A2',
        title: '分析线上消费数据和评论',
        ownerDept: 'merch',
        collaboratorDepts: ['merch_ops'],
        required: false,
      },
    ],
    deliverables: [
      { id: 'N03-D1', title: '存量市场客户分析报告（顾客素描：年龄/职业/用鞋场景/偏好变化 + 竞品消费分析）', required: true, reviewOwnerDept: 'merch' },
      { id: 'N03-D2', title: '增量市场客户分析报告（目标容量 + 新客群用鞋画像 + 竞品分析）', required: true, reviewOwnerDept: 'merch' },
    ],
    completionCriteria: [
      '存量市场与增量市场分析报告均完成',
      '关键消费者用鞋偏好变化已传达给设计和企划团队',
    ],
    relatedTabs: ['channel'],
    nextNodeIds: ['N04'],
    baselineRisk: '低',
  },
  {
    id: 'N04',
    index: 4,
    title: '趋势与竞品研究',
    stage: 'startup',
    relStartMonth: -10,
    relEndMonth: -9.5,
    ownerDept: 'merch',
    collaboratorDepts: ['design', 'brand'],
    workGoal: '分析国际鞋履流行趋势（鞋型廓形/楦型方向/颜色材质趋势）和竞品动态，明确品牌与流行趋势的结合点，为设计企划和商品企划提供方向参考。',
    keyQuestions: [
      '国际流行趋势中，鞋型廓形（楦头形状/后跟高度/鞋面轮廓）有哪些主要变化？',
      '下一季的主流颜色方向和鞋面材质纹理趋势是什么？',
      '竞品在主推鞋型品类和价格带上有哪些值得关注的策略调整？',
      '国际流行趋势与我品牌的结合点在哪里？哪些趋势适合承接，哪些不适合？',
      '哪些功能性卖点（缓震/防水/轻量化/抓地）会成为消费者的新关注焦点？',
    ],
    inputMaterials: ['行业趋势报告', '竞品产品线分析', '秀场/展会资料'],
    actionPlans: [
      {
        id: 'N04-A1',
        title: '完成竞品与趋势调研',
        ownerDept: 'merch',
        collaboratorDepts: ['design'],
        required: true,
      },
      {
        id: 'N04-A2',
        title: '输出趋势关键词和设计方向建议',
        ownerDept: 'design',
        collaboratorDepts: ['brand'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N04-D1', title: '国际鞋履趋势报告（廓形/颜色/材质/品类方向）', required: true, reviewOwnerDept: 'merch' },
      { id: 'N04-D2', title: '品牌趋势结合点建议（品牌可承接的趋势方向 + 设计方向输入）', required: true, reviewOwnerDept: 'design' },
    ],
    completionCriteria: ['趋势报告已输出并作为设计企划的输入'],
    relatedTabs: ['category'],
    nextNodeIds: ['N05'],
    baselineRisk: '低',
  },
  {
    id: 'N05',
    index: 5,
    title: '材料工艺前置研发',
    stage: 'startup',
    relStartMonth: -9.5,
    relEndMonth: -9.2,
    ownerDept: 'material',
    collaboratorDepts: ['design', 'supply'],
    workGoal: '启动鞋面材料、里料、底部材料和特种工艺的前置研发与测试，修正上一年度楦型/工艺问题，为后续开发周期扫清障碍。',
    keyQuestions: [
      '上一年度哪些鞋面材料/工艺因技术问题未能落地？本季是否有条件重新开发？',
      '有哪些进口皮革/面料可以转国内替代开发以降低成本？',
      '鞋楦库版本是否满足新季设计方向？哪些楦型需要修改或新开发？',
      '特种工艺（压花/镭射切割/特殊缝制/金属五金）的前置测试是否完成？',
      '初版试穿的脚感、包裹性、弯折测试结果是否达标？',
    ],
    inputMaterials: ['趋势研究结果', '设计方向初稿', '供应商材料样品', '上一年度未实现材料/工艺清单'],
    actionPlans: [
      {
        id: 'N05-A1',
        title: '确认鞋楦库版本及适用性',
        ownerDept: 'material',
        collaboratorDepts: ['supply'],
        required: true,
      },
      {
        id: 'N05-A2',
        title: '大底/中底材料测试',
        ownerDept: 'material',
        collaboratorDepts: ['design'],
        required: true,
      },
      {
        id: 'N05-A3',
        title: '进口材料国内替代方案研究',
        ownerDept: 'material',
        collaboratorDepts: ['supply'],
        required: false,
        followUpMethod: '每两周与供应商对接进度，T-8月前完成方案评估',
        resourceNeeds: '国内替代供应商名录及样品评审',
      },
    ],
    deliverables: [
      { id: 'N05-D1', title: '材料测试报告', required: true, reviewOwnerDept: 'material' },
      { id: 'N05-D2', title: '鞋楦版本确认单', required: true, reviewOwnerDept: 'supply' },
    ],
    completionCriteria: ['核心材料测试通过', '鞋楦版本已确认'],
    relatedTabs: ['category'],
    nextNodeIds: ['N06'],
    baselineRisk: '中',
    footwearAugment: {
      fields: [
        { key: 'shoe_last_version', label: '鞋楦库版本', hint: '确认本季使用的鞋楦版本号及适用鞋型范围', type: 'text' },
        { key: 'sole_material_test', label: '大底/中底材料测试', hint: '耐磨、防滑、弯折测试进度及结论', type: 'text' },
        { key: 'fit_feedback_initial', label: '试穿与脚感初测', hint: '初版试穿反馈：脚感、包裹性、重量感评分', type: 'text' },
      ],
    },
  },
  {
    id: 'N06',
    index: 6,
    title: '商品企划初稿 + 设计企划/K Look确认',
    stage: 'startup',
    relStartMonth: -9.2,
    relEndMonth: -9,
    ownerDept: 'merch',
    collaboratorDepts: ['design', 'brand', 'finance'],
    workGoal: '输出商品企划初稿（含各鞋型系列产品结构、售罄率预估、毛利率/毛利额框架），同时确认各系列设计企划方向和 KEY LOOK 核心鞋型形象（每系列3-5套）。',
    keyQuestions: [
      '各鞋型品类分配比例（靴类/凉鞋/运动休闲/正装）是否符合年度战略？',
      '各系列的价格带分布是否合理？引流款/主推款/形象款 SKU 占比是否平衡？',
      '各鞋型系列的售罄率预估和毛利率/毛利额框架是否与财务目标对齐？',
      '每系列 KEY LOOK（3-5套核心鞋型搜配形象）是否清晰传达品牌季度主题？',
      '初稿 OTB 与财务预算是否匹配？新款与翻单款比例是否合理（建议新款≥ 60%）？',
    ],
    inputMaterials: ['客户需求分析', '趋势研究报告', '上年度数据', '财务预算框架', '客户需求分析报告（含存量/增量市场）', '品牌趋势结合点建议'],
    actionPlans: [
      {
        id: 'N06-A1',
        title: '编写商品企划初稿',
        ownerDept: 'merch',
        collaboratorDepts: ['finance'],
        required: true,
      },
      {
        id: 'N06-A2',
        title: '设计企划与K Look确认评审',
        ownerDept: 'design',
        collaboratorDepts: ['brand', 'merch'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N06-D1', title: '商品企划初稿（含各系列产品结构：品类/鞋面材质方向/价格带/首单深度预估/投入金额/售罄率预估/毛利率/毛利额）', required: true, reviewOwnerDept: 'merch' },
      { id: 'N06-D2', title: 'KEY LOOK 形象确认文件（每系列3-5套核心鞋型搭配 + 颜色方案 + 核心卖点）', required: true, reviewOwnerDept: 'brand' },
    ],
    completionCriteria: [
      '商品企划初稿已审批，含完整的售罄率预估和毛利率框架',
      '每系列 KEY LOOK（3-5套核心搜配）已确认',
    ],
    relatedTabs: ['otb', 'category', 'planning'],
    nextNodeIds: ['N07'],
    baselineRisk: '中',
  },

  // ── 修正期 T-9 ~ T-5 ───────────────────────────────────────────────────────
  {
    id: 'N07',
    index: 7,
    title: '销售策略企划',
    stage: 'revise',
    relStartMonth: -9,
    relEndMonth: -8,
    ownerDept: 'merch_ops',
    collaboratorDepts: ['merch', 'channel', 'agent_vip'],
    workGoal: '制定季度销售业绩目标（整体/各月/各渠道分解）、渠道配货原则、全年营销活动计划，以及往季尾货库存消化计划（消化目标/折扣红线/清货方案）。',
    keyQuestions: [
      '整体销售目标和各月份业绩目标如何分解到各渠道和品牌？',
      '直营与代理的配货策略差异是什么？哪些区域需要重点资源投入？',
      '往季尾货库存水位多少？消化目标、折扣红线（最低折扣线）和销售方案如何设定？',
      '全年有哪些重要销售型活动？货品准备需求和活动预算是多少？',
      'VIP 维护与拓展计划中，需要哪些鞋型品类的特别货品准备？',
    ],
    inputMaterials: ['商品企划初稿', '渠道历史数据', '区域需求反馈'],
    actionPlans: [
      {
        id: 'N07-A1',
        title: '制定渠道销售目标分解方案',
        ownerDept: 'merch_ops',
        collaboratorDepts: ['merch', 'channel'],
        required: true,
      },
      {
        id: 'N07-A2',
        title: '区域差异化配货策略',
        ownerDept: 'merch_ops',
        collaboratorDepts: ['agent_vip'],
        required: true,
      },
      {
        id: 'N07-A3',
        title: '制定往季尾货库存消化方案',
        ownerDept: 'merch_ops',
        collaboratorDepts: ['finance', 'agent_vip'],
        required: true,
        metric: '往季库存消化率目标及折扣红线确定',
        followUpMethod: '月度库存消化进度追踪报告',
        resourceNeeds: '历史库存数据、各渠道清货承接能力评估',
      },
    ],
    deliverables: [
      { id: 'N07-D1', title: '销售策略企划文件（含销售目标分解/渠道配货原则/全年活动计划）', required: true, reviewOwnerDept: 'merch_ops' },
      { id: 'N07-D2', title: '渠道配货原则', required: true, reviewOwnerDept: 'merch' },
      { id: 'N07-D3', title: '往季库存消化计划（消化目标/折扣设定/销售方案/目标清仓时间）', required: true, reviewOwnerDept: 'finance' },
    ],
    completionCriteria: ['销售策略已与渠道部确认', '区域配货原则已输出'],
    relatedTabs: ['channel', 'planning'],
    nextNodeIds: ['N08'],
    baselineRisk: '低',
  },
  {
    id: 'N08',
    index: 8,
    title: '品牌推广企划',
    stage: 'revise',
    relStartMonth: -8,
    relEndMonth: -7.5,
    ownerDept: 'brand',
    collaboratorDepts: ['merch', 'display_market'],
    workGoal: '制定品牌传播计划和各系列主推鞋型推广节奏，明确推广活动对商品品类的具体需求（含礼品鞋/配件开发需求），并输出推广物资清单。',
    keyQuestions: [
      '核心传播渠道和 KOL 方向如何与新季鞋型主题匹配？',
      '门店陈列逻辑是否与商品结构对齐（引流款在外/主推款居中/形象款置高）？',
      '推广活动中是否需要特定鞋型或品类的专属货品准备？',
      '品牌推广是否需要礼品鞋或配件（帆布袋/礼品盒/特定配色鞋带）的单独开发与备货？',
      '营销节点（节假日/新品发布/大促）与波段上市计划是否完全对齐？',
    ],
    inputMaterials: ['销售策略企划', '品牌定位文件', '波段上市节奏'],
    actionPlans: [
      {
        id: 'N08-A1',
        title: '制定品牌推广计划',
        ownerDept: 'brand',
        collaboratorDepts: ['merch'],
        required: true,
      },
      {
        id: 'N08-A2',
        title: '陈列展示方向策划',
        ownerDept: 'display_market',
        collaboratorDepts: ['brand'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N08-D1', title: '品牌推广企划文件', required: true, reviewOwnerDept: 'brand' },
      { id: 'N08-D2', title: '推广物资清单（货品品类/数量/价格预算/分批到位时间节点）', required: false, reviewOwnerDept: 'brand' },
    ],
    completionCriteria: ['推广计划与商品企划时间节点对齐'],
    relatedTabs: ['planning'],
    nextNodeIds: ['N09'],
    baselineRisk: '低',
  },
  {
    id: 'N09',
    index: 9,
    title: '材料工艺企划',
    stage: 'revise',
    relStartMonth: -7.5,
    relEndMonth: -7,
    ownerDept: 'material',
    collaboratorDepts: ['design', 'supply'],
    workGoal: '基于上一年度材料使用回顾，确认本季鞋面/里料/底部物料方案，梳理库存材料改造再利用方向，推进鞋楦最终化与模具开模计划。',
    keyQuestions: [
      '上一年度哪些鞋面/里料/底部材料市场接受度高、值得延续？',
      '哪些库存材料可以通过改色、改纹理或重新组合方式再利用？',
      '上季接受度低的材料（如特定皮革纹理）本季如何规避或替代？',
      '鞋面/大底/中底物料方案是否全部确认？供应商供货稳定性如何？',
      '鞋底模具开模周期（60-120天）是否在上市时间线内？是否与订货月节点冲突？',
    ],
    inputMaterials: ['材料测试报告', '设计初稿', '供应商产能确认', '上一年度材料使用回顾报告（接受度高/低的材料总结）'],
    actionPlans: [
      {
        id: 'N09-A1',
        title: '鞋面/大底/中底物料全面确认',
        ownerDept: 'material',
        collaboratorDepts: ['design', 'supply'],
        required: true,
      },
      {
        id: 'N09-A2',
        title: '鞋楦最终化与开模计划',
        ownerDept: 'supply',
        collaboratorDepts: ['material'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N09-D1', title: '材料工艺企划确认单（鞋面/里料/底部材料选定 + 颜色方案）', required: true, reviewOwnerDept: 'material' },
      { id: 'N09-D2', title: '模具开模计划表', required: true, reviewOwnerDept: 'supply' },
      { id: 'N09-D3', title: '库存材料改造再利用方案（可改造材料清单 + 改造方向 + 成本评估）', required: false, reviewOwnerDept: 'material' },
    ],
    completionCriteria: ['所有主推款材料已确认', '开模计划已锁定'],
    relatedTabs: ['category'],
    nextNodeIds: ['N10'],
    baselineRisk: '高',
    footwearAugment: {
      fields: [
        { key: 'upper_sole_material', label: '鞋面/大底/中底物料确认', hint: '各物料供应商确认状态及备货量', type: 'text' },
        { key: 'shoe_last_final', label: '鞋楦最终化', hint: '鞋楦型号、宽度、楦型最终确认状态', type: 'select', options: ['待确认', '进行中', '已锁定'] },
        { key: 'mold_cycle', label: '鞋底模具周期', hint: '开模启动日期、完成日期及风险备注', type: 'text' },
        { key: 'inventory_material_reuse', label: '库存材料改造再利用', hint: '可改色/改纹理延续的库存皮革/面料/底材及改造方向与成本评估', type: 'text' },
        { key: 'material_risk_list', label: '规避材料清单', hint: '上季接受度低的材料名称及本季规避/替代方案', type: 'text' },
      ],
    },
  },
  {
    id: 'N09a',
    index: 9.5,
    title: '鞋楦/模具开发确认',
    stage: 'revise',
    relStartMonth: -7,
    relEndMonth: -6.8,
    ownerDept: 'material',
    collaboratorDepts: ['supply', 'design', 'finance'],
    workGoal: '锁定本季新开鞋楦版本与鞋底模具开发排期，确保前置最长（60-120 天）的开模环节不撞订货月。',
    keyQuestions: [
      '哪些主推鞋型需要新开模？老模复用比例是多少？',
      '模具厂排期是否撞订货月（最晚 T-3 月需启动开模）？',
      '鞋楦版本如何与设计头版联动？是否需要二次修楦？',
      '模具成本是否纳入本季财务预算？',
    ],
    inputMaterials: ['前置材料测试报告', '设计初稿', '上一季模具复用清单', '模具厂产能档期'],
    actionPlans: [
      {
        id: 'N09a-A1',
        title: '梳理新开模款清单与排期',
        ownerDept: 'material',
        collaboratorDepts: ['supply'],
        required: true,
      },
      {
        id: 'N09a-A2',
        title: '与模具厂确认档期 + 启动开模',
        ownerDept: 'supply',
        collaboratorDepts: ['material'],
        metric: '所有新开模款 100% 进厂',
        required: true,
      },
      {
        id: 'N09a-A3',
        title: '鞋楦版本最终化',
        ownerDept: 'material',
        collaboratorDepts: ['design'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N09a-D1', title: '新开模款清单与排期表', required: true, reviewOwnerDept: 'supply' },
      { id: 'N09a-D2', title: '鞋楦版本最终确认单', required: true, reviewOwnerDept: 'material' },
      { id: 'N09a-D3', title: '模具成本备案', required: false, reviewOwnerDept: 'finance' },
    ],
    completionCriteria: ['所有需开模款锁定模具厂 + 启动开模', '鞋楦版本已最终化', '模具成本已并入财务预算'],
    relatedTabs: ['category'],
    nextNodeIds: ['N10'],
    baselineRisk: '高',
    footwearAugment: {
      fields: [
        { key: 'shoe_last_version', label: '鞋楦版本', hint: '本季使用鞋楦版本号及覆盖鞋型范围', type: 'text' },
        { key: 'new_mold_count', label: '新开模数量', hint: '本季需要新开的鞋底模具数量及对应主推款', type: 'number' },
        { key: 'mold_factory', label: '模具厂确认', hint: '模具厂名称 + 排期 + 交付承诺日期', type: 'text' },
        { key: 'mold_cycle_days', label: '开模周期(天)', hint: '从启动到模具到位的天数（典型 60-120 天）', type: 'number' },
        { key: 'old_mold_reuse_pct', label: '老模复用比例', hint: '可复用老模款数 / 总款数 × 100%', type: 'number' },
      ],
    },
  },
  {
    id: 'N10',
    index: 10,
    title: '财务成本预算',
    stage: 'revise',
    relStartMonth: -7,
    relEndMonth: -6,
    ownerDept: 'finance',
    collaboratorDepts: ['merch', 'supply'],
    workGoal: '制定季度 OTB 预算框架，明确各鞋型品类的完整产品成本构成（含开模成本摧销），以及销售活动、推广活动、VIP 活动的专项预算，确保成本控制目标传达到各部门和供应链。',
    keyQuestions: [
      '各鞋型品类的 OTB 预算如何分配？毛利目标是否与商品结构匹配？',
      '各品类产品成本如何构成？（鞋面材料/里料/底部材料/开模成本/生产成本/特殊工艺成本）',
      '开模成本是否已纳入各款成本核算？新开模款的成本摧销如何分担？',
      '销售活动、推广活动、VIP 活动的货品与物资成本如何与销售预算对齐？',
      '成本控制红线是否已明确传达到供应链和设计团队？',
    ],
    inputMaterials: ['商品企划修正稿', '供应商报价', '年度财务目标'],
    actionPlans: [
      {
        id: 'N10-A1',
        title: '制定OTB预算方案',
        ownerDept: 'finance',
        collaboratorDepts: ['merch'],
        metric: '品类OTB误差<5%',
        required: true,
      },
      {
        id: 'N10-A2',
        title: '成本控制标准输出',
        ownerDept: 'finance',
        collaboratorDepts: ['supply'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N10-D1', title: 'OTB 预算分配表（含各品类预算）', required: true, reviewOwnerDept: 'finance' },
      { id: 'N10-D2', title: '成本控制标准文件（含各品类成本目标与毛利红线）', required: true, reviewOwnerDept: 'finance' },
      { id: 'N10-D3', title: '各类活动成本预算表（销售/推广/VIP 活动的货品+物资成本）', required: false, reviewOwnerDept: 'finance' },
    ],
    completionCriteria: ['OTB预算已批准', '毛利目标与品类结构对齐'],
    relatedTabs: ['otb'],
    nextNodeIds: ['N11'],
    baselineRisk: '中',
  },
  {
    id: 'N11',
    index: 11,
    title: '商品企划一次修正',
    stage: 'revise',
    relStartMonth: -6,
    relEndMonth: -5.5,
    ownerDept: 'merch',
    collaboratorDepts: ['design', 'finance', 'merch_ops'],
    workGoal: '根据销售策略、品牌推广需求和财务约束，修正各鞋型系列的产品结构，明确售罄率预估、毛利率/毛利额目标和毛利增量方向，输出含完整财务指标的一修版。',
    keyQuestions: [
      '修正后各鞋型系列的品类占比和价格带分布是否合理平衡？',
      '各系列售罄率预估是否符合目标（如主推系列≥ 75%）？',
      '毛利率/毛利额修正后是否达到年度财务目标？毛利增量方向是否清晰？',
      '新旧品占比（新款 vs 翻单款）和各季度投入分解（各季销售占比）是否合理平衡？',
      '设计研发周期是否能支撑修正后的品类结构需求？',
    ],
    inputMaterials: ['商品企划初稿', 'OTB预算', '销售策略文件'],
    actionPlans: [
      {
        id: 'N11-A1',
        title: '品类结构修正与审核',
        ownerDept: 'merch',
        collaboratorDepts: ['finance', 'merch_ops'],
        required: true,
      },
      {
        id: 'N11-A2',
        title: '价格带分配优化',
        ownerDept: 'merch',
        collaboratorDepts: ['design'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N11-D1', title: '商品企划一修版（含各系列完整财务指标：投入深度/价格预计/投入金额/售罄率预估/毛利率/毛利额/毛利增量）', required: true, reviewOwnerDept: 'merch' },
    ],
    completionCriteria: [
      '一修版含各系列完整财务指标，经财务部和商品运营团队认可',
      '新旧品占比和各季投入分解已明确',
    ],
    relatedTabs: ['otb', 'category', 'planning'],
    nextNodeIds: ['N12'],
    baselineRisk: '中',
  },
  {
    id: 'N12',
    index: 12,
    title: '设计头版评审',
    stage: 'revise',
    relStartMonth: -5.5,
    relEndMonth: -5,
    ownerDept: 'design',
    collaboratorDepts: ['merch', 'brand', 'customer'],
    workGoal: '评审第一版设计稿，确认主推鞋型、舒适功能卖点、尺码段和颜色配比。',
    keyQuestions: [
      '设计方向是否满足销售目标和品牌季度主题？',
      '各系列 KEY LOOK 能否清晰传达品牌主题形象（每系列3-5套核心鞋型搭配）？',
      '楦型评审是否覆盖舒适性全维度（脚感/包裹性/弯折/承重/重量感）测试？',
      '核心功能性卖点（如缓震/防水/轻量化）是否在头版中清晰呈现且可传播？',
      '尺码段深度和颜色配比是否符合市场需求和历史销售规律？',
    ],
    inputMaterials: ['商品企划一修版', '材料工艺企划确认单', '消费者反馈'],
    actionPlans: [
      {
        id: 'N12-A1',
        title: '组织设计头版评审会',
        ownerDept: 'design',
        collaboratorDepts: ['merch', 'brand'],
        required: true,
      },
      {
        id: 'N12-A2',
        title: '汇总评审意见并修正',
        ownerDept: 'design',
        collaboratorDepts: ['merch'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N12-D1', title: '设计头版评审报告', required: true, reviewOwnerDept: 'merch' },
      { id: 'N12-D2', title: '头版修正确认单', required: true, reviewOwnerDept: 'design' },
    ],
    completionCriteria: ['头版评审完成并输出修正建议', '主推鞋型和颜色配比已确认'],
    relatedTabs: ['category'],
    nextNodeIds: ['N13'],
    baselineRisk: '中',
    footwearAugment: {
      fields: [
        { key: 'comfort_features', label: '舒适性/功能性卖点', hint: '确认主推鞋型的核心功能卖点及差异化亮点', type: 'text' },
        { key: 'size_range_depth', label: '尺码段深度', hint: '各品类尺码段规划及重点尺码备货比例', type: 'text' },
        { key: 'color_ratio', label: '颜色配比', hint: '主色/撞色/基础色的SKU占比及优先级排序', type: 'text' },
      ],
    },
  },

  // ── 形成期 T-5 ~ T-1 ───────────────────────────────────────────────────────
  {
    id: 'N13',
    index: 13,
    title: '商品企划二次修正 - 经典翻单',
    stage: 'form',
    relStartMonth: -5,
    relEndMonth: -4,
    ownerDept: 'merch',
    collaboratorDepts: ['design', 'merch_ops', 'finance', 'supply'],
    workGoal: '确认经典翻单鞋型清单（含毛利率/毛利额数据），明确翻单款的楦型/颜色/材质是否需要微调以保持市场新鲜感，完成商品企划二修版。',
    keyQuestions: [
      '现有设计款数量是否满足销售目标？基础款缺口是否需要翻单补位？',
      '新款与经典翻单款的比例是否合理（建议新款 60%/翻单 40%）？',
      '翻单鞋型的毛利率是否达到目标？',
      '翻单款是否需要微调楦型/颜色/材质保持新鲜感（而非原版复刻）？',
      '供应链对翻单款的产能支撑是否充足？翻单款交货周期是否比新款更短？',
    ],
    inputMaterials: ['设计头版评审报告', '经典款历史数据', '供应商产能数据'],
    actionPlans: [
      {
        id: 'N13-A1',
        title: '确认经典翻单清单',
        ownerDept: 'merch',
        collaboratorDepts: ['supply'],
        required: true,
      },
      {
        id: 'N13-A2',
        title: '新款占比与品类补位优化',
        ownerDept: 'merch',
        collaboratorDepts: ['design', 'finance'],
        required: true,
      },
      {
        id: 'N13-A3',
        title: '输出商品企划二修版',
        ownerDept: 'merch',
        collaboratorDepts: ['merch_ops'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N13-D1', title: '经典翻单确认清单（翻单品类/价格/投入金额/投入深度/毛利率/毛利额）', required: true, reviewOwnerDept: 'supply' },
      { id: 'N13-D2', title: '商品企划二修版', required: true, reviewOwnerDept: 'merch' },
    ],
    completionCriteria: ['翻单清单已与供应链确认', '二修版经财务认可'],
    relatedTabs: ['otb', 'category', 'planning'],
    nextNodeIds: ['N14'],
    baselineRisk: '中',
  },
  {
    id: 'N14',
    index: 14,
    title: '设计二版 + 核心品类确认',
    stage: 'form',
    relStartMonth: -4,
    relEndMonth: -3,
    ownerDept: 'design',
    collaboratorDepts: ['merch', 'customer', 'agent_vip'],
    workGoal: '完成第二版设计，锁定核心品类商品结构，确认主推鞋型并收口试穿反馈。',
    keyQuestions: [
      '设计二版是否解决了头版评审问题？',
      '主推鞋型是否经过充分试穿验证？',
      '核心品类的商品结构是否最终确定？',
      '核心鞋型系列的楦型廓形（楦头形状/后跟弧度）是否在二版中得到充分且一致的体现？',
    ],
    inputMaterials: ['设计头版修正单', '商品企划二修版', '试穿测试结果'],
    actionPlans: [
      {
        id: 'N14-A1',
        title: '完成设计二版并内部评审',
        ownerDept: 'design',
        collaboratorDepts: ['merch'],
        required: true,
      },
      {
        id: 'N14-A2',
        title: '主推鞋型试穿反馈收口',
        ownerDept: 'design',
        collaboratorDepts: ['customer', 'agent_vip'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N14-D1', title: '设计二版确认文件', required: true, reviewOwnerDept: 'merch' },
      { id: 'N14-D2', title: '核心品类结构锁定表', required: true, reviewOwnerDept: 'merch' },
    ],
    completionCriteria: ['设计二版审批通过', '主推鞋型试穿通过'],
    relatedTabs: ['category'],
    nextNodeIds: ['N15'],
    baselineRisk: '中',
    footwearAugment: {
      fields: [
        { key: 'main_shoe_final', label: '主推鞋型最终确认', hint: '主推款款号、配色、尺码段最终锁定状态', type: 'select', options: ['待确认', '进行中', '已锁定'] },
        { key: 'fit_feedback_final', label: '试穿反馈收口', hint: '试穿评分、脚感综合结论及修改确认记录', type: 'text' },
      ],
    },
  },
  {
    id: 'N15',
    index: 15,
    title: '订货会准备',
    stage: 'form',
    relStartMonth: -3,
    relEndMonth: -2.5,
    ownerDept: 'merch',
    collaboratorDepts: ['merch_ops', 'supply', 'display_market'],
    workGoal: '准备订货会鞋型展示方案（锁定各系列主推色板/主推款/搞配形式），制定订货政策，明确各品类交货周期差异（靴类约60天/凉鞋约45天），确保楦型产能满足订货量需求。',
    keyQuestions: [
      '各系列主推色板是否已锁定？谢季色板和主承色板比例如何？',
      '展示序列逻辑（引流款→主推款→形象款）是否清晰？',
      '靴类/凉鞋/运动休闲等各品类交货周期差异是否已包含在订货政策中？',
      '楦型产能是否已确认可支撑预期订货量？',
      '区域差异化主推需求是否已在订货政策中体现？',
    ],
    inputMaterials: ['设计二版确认文件', '供应商产能数据', '历史订货数据'],
    actionPlans: [
      {
        id: 'N15-A1',
        title: '准备订货会展示方案',
        ownerDept: 'merch',
        collaboratorDepts: ['display_market'],
        required: true,
      },
      {
        id: 'N15-A2',
        title: '确认靴类/凉鞋供货周期',
        ownerDept: 'supply',
        collaboratorDepts: ['merch'],
        required: true,
      },
      {
        id: 'N15-A3',
        title: '制定订货政策和配货建议',
        ownerDept: 'merch_ops',
        collaboratorDepts: ['merch', 'finance'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N15-D1', title: '订货会鞋型展示方案（锁定主推色板/主推款/搭配形式）', required: true, reviewOwnerDept: 'merch' },
      { id: 'N15-D2', title: '品类交货周期确认表（靴类/凉鞋/运动休闲各品类标准交期）', required: true, reviewOwnerDept: 'supply' },
      { id: 'N15-D3', title: '区域差异化订货指引', required: false, reviewOwnerDept: 'merch_ops' },
    ],
    completionCriteria: ['订货会方案就绪', '品类供货周期已确认'],
    relatedTabs: ['planning', 'otb'],
    nextNodeIds: ['N16'],
    baselineRisk: '中',
    footwearAugment: {
      fields: [
        { key: 'boot_cycle_90d', label: '靴类 90 天交货周期', hint: '靴类各款开发节点及最晚下单时间', type: 'text' },
        { key: 'sandal_cycle_45d', label: '凉鞋 45 天交货周期', hint: '凉鞋品类产能节奏及备货窗口确认', type: 'text' },
        { key: 'last_capacity', label: '鞋楦产能确认', hint: '订货会预计总量下的鞋楦产能瓶颈评估', type: 'text' },
      ],
    },
  },
  {
    id: 'N16',
    index: 16,
    title: '订货会执行',
    stage: 'form',
    relStartMonth: -2.5,
    relEndMonth: -2,
    ownerDept: 'merch_ops',
    collaboratorDepts: ['merch', 'channel', 'agent_vip', 'finance'],
    workGoal: '执行订货会，明确各系列主推色/主推款/区域差异化主推产品设定（含活动产品订货深度要求），收集代理/门店订单，并完成订货量与 OTB 的偏差分析。',
    keyQuestions: [
      '各系列主推色/主推款是否已清晰传达到代理商和门店订货团队？',
      '区域差异化主推款设定是否已落实到各区订单？',
      '活动产品订货深度是否按订货政策要求执行？',
      '代理商订单结构（品类/系列/价格带）是否有异常偏差需要处理？',
      '订货量与 OTB 的偏差超过多少触发调整流程？',
    ],
    inputMaterials: ['订货会展示方案', '区域历史数据', 'OTB预算分配表'],
    actionPlans: [
      {
        id: 'N16-A1',
        title: '执行订货会并收集订单',
        ownerDept: 'merch_ops',
        collaboratorDepts: ['agent_vip', 'channel'],
        required: true,
      },
      {
        id: 'N16-A2',
        title: '订单汇总与OTB对比分析',
        ownerDept: 'finance',
        collaboratorDepts: ['merch'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N16-D1', title: '订货会汇总订单', required: true, reviewOwnerDept: 'merch_ops' },
      { id: 'N16-D2', title: '订货量 vs OTB 对比分析报告（含订货偏差分类说明）', required: true, reviewOwnerDept: 'finance' },
      { id: 'N16-D3', title: '区域主推鞋型订货分析', required: false, reviewOwnerDept: 'merch' },
    ],
    completionCriteria: ['订货会完成', '订单与OTB偏差分析已输出'],
    relatedTabs: ['otb', 'category', 'channel'],
    nextNodeIds: ['N17'],
    baselineRisk: '中',
  },
  {
    id: 'N17',
    index: 17,
    title: '订货反馈收集 + 商品企划三次修正',
    stage: 'form',
    relStartMonth: -2,
    relEndMonth: -1,
    ownerDept: 'merch',
    collaboratorDepts: ['merch_ops', 'agent_vip', 'finance', 'supply'],
    workGoal: '收集订货反馈，最终修正商品结构和OTB，确认生产订单。',
    keyQuestions: [
      '订货量偏差超出阈値的品类是否已确定调整方案？',
      '订货结构与商品企划二修版是否存在系列层面差异？',
      '商品结构需要如何调整（增减品类/调节价格带/局部翻单）？',
      'OTB 缺口或超顾如何处理？供应链排期如何调整？',
      '供应链交期排期是否需要局部优化？',
    ],
    inputMaterials: ['订货会汇总订单', 'OTB对比分析', '代理反馈'],
    actionPlans: [
      {
        id: 'N17-A1',
        title: '收集整理订货反馈',
        ownerDept: 'merch',
        collaboratorDepts: ['merch_ops', 'agent_vip'],
        required: true,
      },
      {
        id: 'N17-A2',
        title: '输出商品企划三修版并确认生产',
        ownerDept: 'merch',
        collaboratorDepts: ['finance', 'supply'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N17-D1', title: '商品企划三修版（终版）', required: true, reviewOwnerDept: 'merch' },
      { id: 'N17-D2', title: '生产订单确认单', required: true, reviewOwnerDept: 'supply' },
    ],
    completionCriteria: ['终版企划已审批', '生产订单已下达'],
    relatedTabs: ['planning', 'otb', 'category'],
    nextNodeIds: ['N17a'],
    baselineRisk: '高',
  },
  {
    id: 'N17a',
    index: 17.5,
    title: '大货生产监控',
    stage: 'launch',
    relStartMonth: -1,
    relEndMonth: 2,
    ownerDept: 'supply',
    collaboratorDepts: ['material', 'merch', 'merch_ops'],
    workGoal: '订货后到大货到仓的 2-4 个月生产监控期，追踪批次验货合格率、延期款、补救方案。',
    keyQuestions: [
      '各批次生产进度是否达成排期？哪些款会延期上市？',
      '验货合格率是否达标（目标 ≥98%）？哪些 SKU 需要返工？',
      '延期款是否有替代主推方案？对上市波段配货节奏的影响如何评估与应对？',
    ],
    inputMaterials: ['订货清单 + 排期表', '验厂验货标准', '工厂周报', '物流到仓表'],
    actionPlans: [
      {
        id: 'N17a-A1',
        title: '分批次验厂验货跟进',
        ownerDept: 'supply',
        collaboratorDepts: ['material'],
        metric: '验货合格率 ≥ 98%',
        required: true,
      },
      {
        id: 'N17a-A2',
        title: '延期款救场方案制定',
        ownerDept: 'merch',
        collaboratorDepts: ['supply', 'merch_ops'],
        required: true,
      },
      {
        id: 'N17a-A3',
        title: '到仓配货协调',
        ownerDept: 'merch_ops',
        collaboratorDepts: ['supply', 'channel'],
        required: false,
      },
    ],
    deliverables: [
      { id: 'N17a-D1', title: '分批次生产进度表', required: true, reviewOwnerDept: 'supply' },
      { id: 'N17a-D2', title: '验货合格率报告', required: true, reviewOwnerDept: 'supply' },
      { id: 'N17a-D3', title: '延期款救场方案', required: false, reviewOwnerDept: 'merch' },
    ],
    completionCriteria: ['所有订货款 ≥ 80% 已到仓', '延期款救场方案已落地', '首批上市配货完成'],
    relatedTabs: ['inventory'],
    nextNodeIds: ['N18'],
    baselineRisk: '中',
    footwearAugment: {
      fields: [
        { key: 'qc_pass_rate', label: '验货合格率(%)', hint: '各批次平均合格率，目标 ≥98%', type: 'number' },
        { key: 'delay_sku_count', label: '延期 SKU 数', hint: '当前预测延期上市的 SKU 数量', type: 'number' },
        { key: 'arrival_rate', label: '到仓率(%)', hint: '截至本周累计到仓数 / 订货总数', type: 'number' },
        { key: 'reserve_plan', label: '救场方案', hint: '延期款的替代主推 / 提前补单 / 推迟上市方案', type: 'text' },
      ],
    },
  },

  // ── 上市执行期 T ~ T+3 ─────────────────────────────────────────────────────
  {
    id: 'N18',
    index: 18,
    title: '波段上市与陈列切换',
    stage: 'launch',
    relStartMonth: 0,
    relEndMonth: 1,
    ownerDept: 'display_market',
    collaboratorDepts: ['merch_ops', 'supply', 'channel'],
    workGoal: '执行新品波段上市计划，完成门店陈列切换，确保到货节奏与计划一致。',
    keyQuestions: [
      '新品到货率是否达标？',
      '陈列切换是否按计划执行？',
      '各渠道首周销售节奏是否正常？',
      '首周售罄率预警线设定为多少（建议：低于15%触发快反调货）？监控机制是否已建立？',
      '陈列是否按引流款（入口位）→主推款（主陈列区）→形象款（橱窗/高展位）的展示逻辑执行到位？',
    ],
    inputMaterials: ['生产订单确认单', '陈列指引', '波段上市计划'],
    actionPlans: [
      {
        id: 'N18-A1',
        title: '监控新品到货与陈列执行',
        ownerDept: 'display_market',
        collaboratorDepts: ['supply', 'channel'],
        required: true,
      },
      {
        id: 'N18-A2',
        title: '首周销售追踪与快反',
        ownerDept: 'merch_ops',
        collaboratorDepts: ['display_market'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N18-D1', title: '上市执行报告（到货率/陈列率）', required: true, reviewOwnerDept: 'merch_ops' },
    ],
    completionCriteria: [
      '新品到货率≥90%',
      '门店陈列切换完成率≥85%',
      '首周售罄率监控机制已建立，预警线已与销售团队确认',
    ],
    relatedTabs: ['planning', 'inventory'],
    nextNodeIds: ['N19'],
    baselineRisk: '高',
  },
  {
    id: 'N19',
    index: 19,
    title: '主推款拉量 + 节日营销',
    stage: 'launch',
    relStartMonth: 1,
    relEndMonth: 2,
    ownerDept: 'brand',
    collaboratorDepts: ['merch_ops', 'channel', 'display_market'],
    workGoal: '推进主推款销售拉量，配合节假日营销活动，提升售罄速度。',
    keyQuestions: [
      '主推款售罄是否达到阶段目标？',
      '节日营销活动效果如何？',
      '是否需要调整折扣策略？',
      '各波段分阶段售罄率目标是多少（建议：上市第4周≥30%、第8周≥55%）？当前进度是否符合节奏？',
    ],
    inputMaterials: ['首周销售报告', '营销活动计划', '库存分布数据'],
    actionPlans: [
      {
        id: 'N19-A1',
        title: '执行主推款拉量策略',
        ownerDept: 'merch_ops',
        collaboratorDepts: ['channel'],
        metric: '主推款售罄率≥60%',
        required: true,
      },
      {
        id: 'N19-A2',
        title: '节日营销活动执行',
        ownerDept: 'brand',
        collaboratorDepts: ['display_market', 'channel'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N19-D1', title: '阶段销售追踪报告', required: true, reviewOwnerDept: 'merch_ops' },
    ],
    completionCriteria: ['主推款售罄率达到阶段目标', '营销活动执行完成'],
    relatedTabs: ['category', 'channel'],
    nextNodeIds: ['N20'],
    baselineRisk: '中',
  },
  {
    id: 'N20',
    index: 20,
    title: '补货 / 退市 / 清货',
    stage: 'launch',
    relStartMonth: 2,
    relEndMonth: 3,
    ownerDept: 'merch_ops',
    collaboratorDepts: ['supply', 'channel', 'finance'],
    workGoal: '管理补货节奏推进主推款深度，同时推进尾货退市和冷码清货计划。',
    keyQuestions: [
      '哪些鞋型需要优先补货？',
      '冷码尺码段如何清货？',
      '退市产品的库存处理方案是什么？',
      'WOS（周转周数）超过多少周触发加速清货流程（建议：WOS≥12周启动）？',
      '清货折扣设定是否与 N07 制定的往季库存消化折扣红线一致？超过最低折扣线是否需要财务审批？',
    ],
    inputMaterials: ['销售追踪报告', '库存分布数据', '供应链产能'],
    actionPlans: [
      {
        id: 'N20-A1',
        title: '执行补货计划',
        ownerDept: 'supply',
        collaboratorDepts: ['merch_ops'],
        required: true,
      },
      {
        id: 'N20-A2',
        title: '推进退市与清货方案',
        ownerDept: 'merch_ops',
        collaboratorDepts: ['channel', 'finance'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N20-D1', title: '补货执行记录', required: true, reviewOwnerDept: 'supply' },
      { id: 'N20-D2', title: '清货/退市方案', required: true, reviewOwnerDept: 'finance' },
    ],
    completionCriteria: ['补货已按计划执行', '退市清单已确认'],
    relatedTabs: ['inventory', 'category', 'channel'],
    nextNodeIds: ['N21'],
    baselineRisk: '中',
    footwearAugment: {
      fields: [
        { key: 'restock_priority', label: '鞋型补货优先级', hint: '按售罄速度排列主推鞋型补货优先级及数量', type: 'text' },
        { key: 'cold_size_clearance', label: '冷码尺码段清货', hint: '冷码段（小码/大码）库存清货策略及目标清空时间', type: 'text' },
      ],
    },
  },

  // ── 复盘期 T+3 ~ T+6 ─────────────────────────────────────────────────────
  {
    id: 'N21',
    index: 21,
    title: '波段 + 品类 + 主推款复盘',
    stage: 'review',
    relStartMonth: 3,
    relEndMonth: 4.5,
    ownerDept: 'merch',
    collaboratorDepts: ['design', 'merch_ops', 'brand', 'finance'],
    workGoal: '复盘波段执行效果、品类贡献和主推款表现，提炼下季企划优化方向。',
    keyQuestions: [
      '哪些品类超额完成目标？哪些落后？原因是什么？',
      '主推款的售罄速度和毛利是否符合预期？',
      '波段上市节奏是否优化了销售节奏？',
      '哪些楦型/底部结构/材料工艺本季被市场验证，值得延续或升级迭代到下季？',
    ],
    inputMaterials: ['全季销售数据', '品类贡献报告', '主推款售罄数据'],
    actionPlans: [
      {
        id: 'N21-A1',
        title: '组织波段与品类复盘会议',
        ownerDept: 'merch',
        collaboratorDepts: ['merch_ops', 'design'],
        required: true,
      },
      {
        id: 'N21-A2',
        title: '输出主推款优化建议',
        ownerDept: 'design',
        collaboratorDepts: ['merch'],
        required: false,
      },
    ],
    deliverables: [
      { id: 'N21-D1', title: '季度波段复盘报告（含计划vs实际对比）', required: true, reviewOwnerDept: 'merch' },
      { id: 'N21-D2', title: '爆款/滞销款清单（各3-5款含成因分析）', required: true, reviewOwnerDept: 'merch' },
    ],
    completionCriteria: [
      '复盘报告完成并输出关键教训',
      '爆款/滞销款成因分析已完成并传达给设计研发团队',
    ],
    relatedTabs: ['planning', 'category', 'inventory'],
    nextNodeIds: ['N22'],
    baselineRisk: '低',
  },
  {
    id: 'N22',
    index: 22,
    title: '库存 + 毛利复盘，回流下一年企划输入',
    stage: 'review',
    relStartMonth: 4.5,
    relEndMonth: 6,
    ownerDept: 'finance',
    collaboratorDepts: ['merch', 'supply', 'merch_ops'],
    workGoal: '完成库存和毛利全季复盘（含各品类毛利率与基准对比），提炼数据洞察，将关键结论回流至 N01 形成下一年度企划闭环。',
    keyQuestions: [
      '季末最终 WOS 水位是否健康（目标≤ 8 周）？超标品类如何处理？',
      '各品类毛利率与目标基准对比如何？',
      '季度整体毛利额是否达成年度财务目标？',
      '哪些数据和结论应该回流至 N01 （年度市场分析）成为下一年度企划入口？',
    ],
    inputMaterials: ['季度复盘报告', '全季财务结算', '库存结清数据'],
    actionPlans: [
      {
        id: 'N22-A1',
        title: '完成库存与毛利结算复盘',
        ownerDept: 'finance',
        collaboratorDepts: ['merch', 'supply'],
        required: true,
      },
      {
        id: 'N22-A2',
        title: '输出下季企划参考文件',
        ownerDept: 'merch',
        collaboratorDepts: ['finance'],
        required: true,
      },
    ],
    deliverables: [
      { id: 'N22-D1', title: '库存毛利复盘报告（含各品类实际毛利率vs目标基准对比）', required: true, reviewOwnerDept: 'finance' },
      { id: 'N22-D2', title: '下季企划参考输入文件（回流至N01）', required: true, reviewOwnerDept: 'merch' },
    ],
    completionCriteria: ['财务复盘报告审批完成', '下季企划参考文件已传达'],
    relatedTabs: ['inventory', 'otb'],
    nextNodeIds: [],
    baselineRisk: '低',
    footwearAugment: {
      fields: [
        { key: 'gross_margin_by_category', label: '各品类实际毛利率', hint: '靴类/凉鞋/运动休闲/正装各品类本季实际毛利率与目标基准对比', type: 'text' },
        { key: 'wos_final', label: '季末 WOS 水位', hint: '季末实际周转周数（WOS），目标健康值 ≤8周，超标品类需备注', type: 'number' },
        { key: 'next_season_input', label: '下季企划核心输入建议', hint: '基于本季复盘，对下季商品企划最重要的3条方向建议', type: 'text' },
      ],
    },
  },
];

// ─── 工具函数 ────────────────────────────────────────────────────────────────

/** SS → T = year-03-01, FW → T = year-09-01 */
export function getSeasonT(season: Season, year: number): Date {
  if (season === 'SS') return new Date(year, 2, 1); // March 1
  return new Date(year, 8, 1); // September 1
}

/** 为日期加上小数月数（正/负） */
export function addFractionalMonths(base: Date, months: number): Date {
  const d = new Date(base);
  const wholeMonths = Math.trunc(months);
  const fraction = months - wholeMonths;
  d.setMonth(d.getMonth() + wholeMonths);
  if (Math.abs(fraction) > 0.001) {
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(d.getDate() + Math.round(fraction * daysInMonth));
  }
  return d;
}

/** 获取节点的实际起止日期 */
export function getNodeDateRange(node: WorkflowNodeDef, season: Season, year: number) {
  const T = getSeasonT(season, year);
  return {
    start: addFractionalMonths(T, node.relStartMonth),
    end: addFractionalMonths(T, node.relEndMonth),
    T,
  };
}

/** 判断是否为协同类 Blocker */
export function isCollabBlocker(blocker: Blocker): boolean {
  if (blocker.resolved) return false;
  const keywords = ['协同', '确认', '待', '补充', '反馈'];
  return keywords.some((k) => blocker.action.includes(k));
}

/** 根据当前日期自动推断默认 season/year */
export function detectDefaultSeason(today: Date): { season: Season; year: number } {
  const month = today.getMonth() + 1; // 1-12
  const year = today.getFullYear();
  if (month >= 9) {
    // Sep-Dec: FW 已上市，SS 下一年 form 期
    return { season: 'SS', year: year + 1 };
  } else if (month >= 3) {
    // Mar-Aug: SS 已上市，FW 本年 form 期
    return { season: 'FW', year };
  } else {
    // Jan-Feb: SS 本年即将上市
    return { season: 'SS', year };
  }
}

/** 格式化季节标签，如 "SS27" */
export function formatSeasonLabel(season: Season, year: number): string {
  return `${season}${String(year).slice(-2)}`;
}

/** 格式化相对月数为标签，如 "T-10" */
export function formatRelMonth(rel: number): string {
  if (rel === 0) return 'T';
  if (rel > 0) return `T+${rel}`;
  return `T${rel}`;
}
