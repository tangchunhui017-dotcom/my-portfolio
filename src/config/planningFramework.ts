export interface PlanningPrinciple {
    id: string;
    title: string;
    summary: string;
    impact: string;
}

export interface PlanningWorkflowStep {
    id: string;
    title: string;
    description: string;
    inputs: string[];
    judgement: string;
    outputs: string[];
    openClawAgents: string[];
}

export interface PlanningFormula {
    id: string;
    title: string;
    formula: string;
    description: string;
}

export interface PlanningFieldDefinition {
    field: string;
    label: string;
    description: string;
    usedIn: string[];
}

export const PLANNING_PRINCIPLES: PlanningPrinciple[] = [
    {
        id: 'wave-series-occasion',
        title: '波段先于款式',
        summary: '企划顺序应是波段 > 系列 > 场合 > 单款，而不是先出图再凑结构。',
        impact: '先锁坑位和上市节奏，再让设计填空，能显著减少重复开发和上市错位。',
    },
    {
        id: 'occasion-over-style',
        title: '场合大于风格',
        summary: '风格是表达层，场合才是真正驱动购买和库存周转的业务层。',
        impact: '用场合矩阵规划 SKU，可避免同风格下功能重叠，提升单款产出率。',
    },
    {
        id: 'width-depth-balance',
        title: '宽度深度联动',
        summary: '开发宽度增加时，单款深度会被稀释，必须由 OTB 和 MOQ 反向约束。',
        impact: '能更早暴露预算超标、供应链压力和库存碎片化风险。',
    },
    {
        id: 'trend-filter',
        title: '趋势必须过滤',
        summary: '趋势不能直接进入开发，必须先过品牌 DNA 与历史销售验证。',
        impact: '把“跟风风险”前置成审批与评分，而不是在季末用折扣买教训。',
    },
    {
        id: 'mirror-benchmark',
        title: '镜像市调先大后小',
        summary: '先看竞品橱窗、鞋墙结构和场景占比，再拆单品材质、闭合方式和细节。',
        impact: '让市调从“看热闹”变成“发现缺口和机会”的结构化输入。',
    },
    {
        id: 'vm-backward-planning',
        title: '陈列反推设计',
        summary: '虚拟鞋墙与波段故事是最终约束，单款设计要能回到整盘陈列中成立。',
        impact: '可在打样前发现色彩冲突、材质失衡和场景缺口，降低返工。',
    },
];

export const PLANNING_WORKFLOW_STEPS: PlanningWorkflowStep[] = [
    {
        id: 'market-mirror',
        title: '镜像市调与基准建立',
        description: '先建立品牌镜像，而不是直接扒款；把竞品、橱窗和巡店观察转成结构化输入。',
        inputs: ['竞品鞋墙/橱窗', '历史畅滞销属性', '门店观察标签', '趋势报告与社媒热词'],
        judgement: '识别结构缺口、主推色变化、热卖属性与黑榜属性，过滤噪音数据。',
        outputs: ['Market Macro Structure', '红黑榜属性库', 'Opportunity 列表'],
        openClawAgents: ['research', 'director'],
    },
    {
        id: 'trend-scene-translation',
        title: '趋势转场景与品牌过滤',
        description: '把趋势从“视觉概念”翻译为“适合谁、在哪穿、是否像我们”的开发判断。',
        inputs: ['趋势来源', '品牌 DNA', '历史属性表现', '目标人群与圈层'],
        judgement: '低于品牌匹配阈值或命中黑榜属性的趋势直接拦截。',
        outputs: ['Trend Score', 'DNA Match', 'Trend Test 清单'],
        openClawAgents: ['research', 'director'],
    },
    {
        id: 'wave-matrix',
        title: '波段-系列-场合矩阵',
        description: '先锁定各波段需要覆盖的系列和场合，补齐盲区，再确定每个坑位的角色。',
        inputs: ['季节波段表', '系列规划', '场合占比', '门店层级差异'],
        judgement: '检查通勤、休闲、社交、度假等核心场合是否失衡或重复开发。',
        outputs: ['Wave Matrix', '场合缺口', 'SKU 角色分布'],
        openClawAgents: ['planner', 'director'],
    },
    {
        id: 'otb-width-depth',
        title: 'OTB 与宽深推演',
        description: '用底向上的颗粒度计算预算，拒绝平均值乘法；让 OTB 真正约束开发数。',
        inputs: ['目标销售额', '期初库存', '期末库存目标', 'SKU 单价与折扣曲线', 'MOQ 与交期'],
        judgement: '当款数、预算、MOQ 或库存安全线冲突时，优先砍宽度或调整节奏。',
        outputs: ['Unit OTB', 'Financial OTB', 'SKU Width/Depth Target'],
        openClawAgents: ['planner', 'ops-merch'],
    },
    {
        id: 'design-brief',
        title: '设计简报与约束生成',
        description: '设计不是自由抽卡，而是带着角色、波段、场合、成本和共模率约束去生成。',
        inputs: ['产品角色', '场合标签', '色盘', '材质企划', 'BOM 上限', '共用大底目标'],
        judgement: '不符合波段色盘、材料规则或快反能力的方案不进入评审。',
        outputs: ['设计简报', 'Prompt Tree', '样鞋候选池'],
        openClawAgents: ['design-review', 'planner'],
    },
    {
        id: 'review-chain',
        title: '评审与修改单闭环',
        description: '把评审做成完整判断链，而不是一句“好看/不好看”。',
        inputs: ['样鞋图/照片', '楦型与结构信息', '大底/材质/BOM', '共模率', '风险信号'],
        judgement: '形成 Pass/Review/Revise/Fail，并明确修改单、责任人和下一次评审时间。',
        outputs: ['Design Review Record', 'Change Orders', 'Material Signals'],
        openClawAgents: ['design-review', 'director'],
    },
    {
        id: 'launch-postmortem',
        title: '上市、快反与复盘',
        description: '上市后要看售罄曲线、补货能力和属性级正负样本，驱动下一轮模型。',
        inputs: ['售罄率', '折扣深度', '补货时效', '区域温度', '门店层级', '退货/改款原因'],
        judgement: '判断是加单、延后、砍款、调拨还是经典款翻新。',
        outputs: ['Wave Review', 'Reorder Actions', 'Red/Black Attribute Refresh'],
        openClawAgents: ['ops-merch', 'planner', 'director'],
    },
];

export const PLANNING_FORMULAS: PlanningFormula[] = [
    {
        id: 'otb',
        title: 'OTB 采购预算',
        formula: 'OTB = 预期销售量 + 期末目标库存 - 期初现有库存 - 在途未到货',
        description: '必须按品类或 SKU 自下而上汇总，不能用总量乘平均单价替代。',
    },
    {
        id: 'wave-sku-count',
        title: '波段目标开发数',
        formula: '波段目标开发数 = 目标销售额 / (平均单价 × 目标售罄率 × 单款平均深度)',
        description: '用来反推该波段到底该做多少款，而不是先出图再补预算。',
    },
    {
        id: 'development-score',
        title: '开发推荐分',
        formula: '开发推荐分 = 趋势热度×0.3 + 品牌 DNA 匹配度×0.4 + 历史属性成功率×0.3',
        description: '低于阈值的趋势不应进入开发池，避免浪费研发预算。',
    },
    {
        id: 'opportunity-index',
        title: '结构机会指数',
        formula: 'Opportunity Index = (竞品结构占比 - 本品牌结构占比) × 市场增长率',
        description: '用于竞品镜像和结构缺口识别，而不是简单跟款。',
    },
    {
        id: 'revamp-priority',
        title: '经典款翻新优先级',
        formula: 'Revamp Priority = (历史售罄率 × 毛利率) / 新材料成本',
        description: '帮助识别哪些经典鞋楦值得用新色、新材质、新功能去翻新。',
    },
];

export const REQUIRED_PLANNING_FIELDS: PlanningFieldDefinition[] = [
    {
        field: 'delivery_wave_id',
        label: '波段 ID',
        description: '精确到波段或双周的上市节奏，用于所有波段规划与复盘。',
        usedIn: ['Dashboard', 'Playbook', 'Design Review'],
    },
    {
        field: 'series_tag',
        label: '系列标签',
        description: '定义产品属于哪个系列或风格线，不能和场合标签混用。',
        usedIn: ['Dashboard', 'Case Studies', 'Playbook'],
    },
    {
        field: 'primary_occasion_tag',
        label: '核心场合标签',
        description: '定义鞋款真实服务的穿着场景，是规划、铺货和推荐的主轴。',
        usedIn: ['Dashboard', 'Design Review', 'Playbook'],
    },
    {
        field: 'product_role',
        label: '产品角色',
        description: '区分基础常青、跑量、利润、形象、趋势测试和淘汰候选。',
        usedIn: ['Dashboard', 'Playbook', 'Design Review'],
    },
    {
        field: 'sku_width_target',
        label: '宽度目标',
        description: '该波段计划开发的 SPU 数，用于约束开发数量。',
        usedIn: ['Dashboard', 'Playbook'],
    },
    {
        field: 'sku_depth_target',
        label: '深度目标',
        description: '单款计划的颜色、尺码和备货深度，用于约束库存分散风险。',
        usedIn: ['Dashboard', 'Playbook'],
    },
    {
        field: 'display_capacity_index',
        label: '陈列容积指数',
        description: '衡量单款占用鞋墙和陈列资源的物理宽度。',
        usedIn: ['Dashboard', 'Planning Models'],
    },
    {
        field: 'replenishment_potential',
        label: '快反潜力',
        description: '结合公模共用率、交期和材料可得性，判断是否适合做跑量款。',
        usedIn: ['Dashboard', 'Design Review'],
    },
    {
        field: 'color_role_type',
        label: '色彩角色',
        description: '区分主题色、辅助色、基础色和点缀色，保证色盘结构健康。',
        usedIn: ['Playbook', 'Design Review'],
    },
    {
        field: 'design_attribute_tags',
        label: '设计属性标签',
        description: '把鞋头、底量感、材质肌理、闭合方式等非结构化元素转成可复盘数据。',
        usedIn: ['Design Review', 'Case Studies', 'Trend Analysis'],
    },
    {
        field: 'cross_match_score',
        label: '百搭指数',
        description: '衡量一款鞋在一个波段内与其他单品或场景的互搭能力。',
        usedIn: ['Dashboard', 'Planning Models'],
    },
    {
        field: 'target_sell_through_curve',
        label: '目标售罄曲线',
        description: '用于周度偏差监控、快反触发和上市复盘。',
        usedIn: ['Dashboard', 'Review & Actions'],
    },
];
