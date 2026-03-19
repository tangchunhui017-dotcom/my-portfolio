export interface SOPStep {
    order: number;
    title: string;
    description: string;
    duration?: string;
}

export interface SOPDecisionNode {
    condition: string;
    yesAction: string;
    noAction: string;
}

export interface SOPOutputTemplate {
    name: string;
    description: string;
}

export interface SOPDocument {
    id: string;
    title: string;
    subtitle: string;
    steps: SOPStep[];
    thresholds: string[];
    decisionNodes: SOPDecisionNode[];
    outputTemplates: SOPOutputTemplate[];
}

export const SOP_DOCUMENTS: SOPDocument[] = [
    {
        id: 'otb-simulation',
        title: 'OTB 推演流程',
        subtitle: '从目标销售额到采购预算的量化推演闭环',
        steps: [
            { order: 1, title: '锁定目标销售额', description: '按品类/渠道拆解季度销售目标，确认增长率假设', duration: '1-2天' },
            { order: 2, title: '盘点期初库存', description: '统计现有库存量、在途未到货、预计到货时间', duration: '1天' },
            { order: 3, title: '设定期末库存目标', description: '根据售罄率目标和安全库存天数反推期末库存', duration: '0.5天' },
            { order: 4, title: '计算采购预算', description: 'OTB = 预期销��量 + 期末目标库存 - 期初库存 - 在途', duration: '0.5天' },
            { order: 5, title: '宽深推演校验', description: '用目标款数、单价、售罄率和深度交叉验证预算合理性', duration: '1天' },
            { order: 6, title: '预算审批与锁定', description: '提交财务审批，锁定最终OTB并分配到各波段', duration: '2天' },
        ],
        thresholds: [
            '售罄率目标 >= 80%',
            '期末库存周转天数 <= 90天',
            '单波段预算偏差 <= 10%',
            '宽深推演误差 <= 5%',
        ],
        decisionNodes: [
            { condition: '预算超出财务红线', yesAction: '优先砍宽度，保单款深度', noAction: '进入波段分配' },
            { condition: 'MOQ 与预算冲突', yesAction: '调整交期或合并订单', noAction: '按计划下单' },
            { condition: '期初库存高于安全线', yesAction: '先消化库存再追加采购', noAction: '正常执行OTB' },
        ],
        outputTemplates: [
            { name: 'OTB 预算总表', description: '按品类/波段的采购量和金额汇总' },
            { name: '宽深推演表', description: '目标款数、单款深度、预算分配明细' },
            { name: '波段预算分配表', description: '各波段的预算额度和上市节奏' },
        ],
    },
    {
        id: 'wave-planning',
        title: '波段企划 SOP',
        subtitle: '从季节规划到波段落地的系统化企划流程',
        steps: [
            { order: 1, title: '季节主题定义', description: '确定季节故事线、核心色盘和材质方向', duration: '3天' },
            { order: 2, title: '波段节奏排布', description: '按上市时间窗口划分波段，锁定各波段主题', duration: '2天' },
            { order: 3, title: '系列-场合矩阵', description: '为每个波段分配系列和场合坑位，检查覆盖完整性', duration: '2天' },
            { order: 4, title: '角色分配与宽度锁定', description: '确定各坑位的产品角色和开发款数上限', duration: '1天' },
            { order: 5, title: '色盘与材质企划', description: '按波段生成色彩角色分布和材质组合方案', duration: '2天' },
            { order: 6, title: '虚拟鞋墙校验', description: '用陈列模拟验证波段整盘的视觉平衡和故事完整性', duration: '1天' },
        ],
        thresholds: [
            '核心场合覆盖率 >= 85%',
            '单波段 SKU 数 <= OTB 宽度上限',
            '色盘主题色占比 25-35%',
            '基础色占比 >= 30%',
        ],
        decisionNodes: [
            { condition: '场合矩阵存在盲区', yesAction: '补充缺口坑位或合并相近场合', noAction: '进入角色分配' },
            { condition: '鞋墙校验发现色彩冲突', yesAction: '调整色盘分配或替换冲突款', noAction: '锁定波段企划' },
            { condition: '开发款数超出宽度上限', yesAction: '按角色优先级砍款', noAction: '提交设计简报' },
        ],
        outputTemplates: [
            { name: '波段企划书', description: '含主题、色盘、材质、场合矩阵的完整企划文档' },
            { name: '系列-场合矩阵表', description: '各波段的系列与场合交叉分布' },
            { name: '设计简报包', description: '给设计团队的约束条件和开发方向' },
        ],
    },
    {
        id: 'design-review',
        title: '设计评审 SOP',
        subtitle: '从样鞋提交到评审闭环的标准化流程',
        steps: [
            { order: 1, title: '样鞋资料提交', description: '设计团队提交样鞋图片、BOM、楦型和结构信息', duration: '持续' },
            { order: 2, title: '企划合规预检', description: '检查是否符合波段色盘、材质规则和成本上限', duration: '0.5天' },
            { order: 3, title: '评审会议执行', description: '多维度评分：品牌DNA、场合匹配、成本、共模率', duration: '0.5天' },
            { order: 4, title: '评审结论判定', description: '形成 Pass / Review / Revise / Fail 四级结论', duration: '当天' },
            { order: 5, title: '修改单下发', description: '对 Revise 款下发修改单，明确改稿内容和责任人', duration: '1天' },
            { order: 6, title: '复审与归档', description: '修改款复审通过后归档，Fail 款记录原因供复盘', duration: '1-2天' },
        ],
        thresholds: [
            '单次评审通过率目标 >= 60%',
            'BOM 成本偏差 <= 8%',
            '共模率目标 >= 40%',
            '修改单响应周期 <= 5个工作日',
        ],
        decisionNodes: [
            { condition: '预检不合规', yesAction: '退回设计团队补充资料', noAction: '进入评审会议' },
            { condition: '评审结论为 Revise', yesAction: '下发修改单并排期复审', noAction: 'Pass 归档或 Fail 记录' },
            { condition: '修改单超期未响应', yesAction: '升级至设计总监介入', noAction: '按计划复审' },
        ],
        outputTemplates: [
            { name: '评审记录表', description: '含评分、结论、评委意见的完整评审记录' },
            { name: '修改单', description: '明确改稿内容、责任人、截止时间' },
            { name: '评审通过清单', description: '进入开发的最终确认款号列表' },
        ],
    },
    {
        id: 'launch-execution',
        title: '上市执行 SOP',
        subtitle: '从订单确认到上市复盘的全链路执行流程',
        steps: [
            { order: 1, title: '订单确认与排产', description: '锁定最终订单量，确认工厂排产计划和交期', duration: '3天' },
            { order: 2, title: '配货方案制定', description: '按区域、门店层级和历史数据制定首批配货方案', duration: '2天' },
            { order: 3, title: '上市陈列指引', description: '输出各波段的陈列故事、主推位和搭配建议', duration: '2天' },
            { order: 4, title: '首周销售监控', description: '跟踪首周售罄率、区域差异和尺码断码情况', duration: '持续' },
            { order: 5, title: '快反与补货决策', description: '根据销售数据决定加单、调拨或砍款', duration: '持续' },
            { order: 6, title: '波段复盘', description: '汇总售罄、毛利、属性表现，更新红黑榜', duration: '波段结束后3天' },
        ],
        thresholds: [
            '首周售罄率 >= 15%',
            '配货准确率 >= 90%',
            '断码率预警线 <= 25%',
            '快反响应周期 <= 14天',
        ],
        decisionNodes: [
            { condition: '首周售罄低于预警线', yesAction: '启动促销或调拨方案', noAction: '维持正常销售节奏' },
            { condition: '核心尺码断码', yesAction: '紧急补货或跨区调拨', noAction: '按计划补货' },
            { condition: '波段整体售罄超预期', yesAction: '评估加单可行性和交期', noAction: '记录正向案例供复盘' },
        ],
        outputTemplates: [
            { name: '配货方案表', description: '按门店/区域的首批配货量和尺码分配' },
            { name: '周度销售追踪表', description: '售罄率、折扣深度、断码率的周度监控' },
            { name: '波段复盘报告', description: '含属性分析、红黑榜更新的完整复盘文档' },
        ],
    },
];
