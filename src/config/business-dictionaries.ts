export interface BusinessDictionaryItem {
    id: string;
    label: string;
    english: string;
    description: string;
}

export interface ColorRoleDictionaryItem extends BusinessDictionaryItem {
    recommendedShare: string;
}

export const PRODUCT_ROLE_OPTIONS: BusinessDictionaryItem[] = [
    {
        id: 'core-basic',
        label: '基础常青款',
        english: 'Core Basic',
        description: '承担稳定现金流与陈列底盘，要求高百搭、高补货确定性。',
    },
    {
        id: 'volume-driver',
        label: '跑量款',
        english: 'Volume Driver',
        description: '承接流量和规模目标，优先保证深度、现货率与快反能力。',
    },
    {
        id: 'margin-driver',
        label: '利润款',
        english: 'Margin Driver',
        description: '承担毛利目标，控制成本结构、折扣深度与渠道匹配。',
    },
    {
        id: 'image-builder',
        label: '形象款',
        english: 'Image Builder',
        description: '负责品牌表达和话题，不以高周转作为唯一考核指标。',
    },
    {
        id: 'trend-test',
        label: '趋势测试款',
        english: 'Trend Test',
        description: '用于验证新趋势，先小单测试，再依据生命周期决定是否放量。',
    },
    {
        id: 'drop-candidate',
        label: '淘汰候选款',
        english: 'Drop Candidate',
        description: '低毛利且低周转，应触发砍款、调拨、出清或降复杂度动作。',
    },
];

export const OCCASION_TAGS: BusinessDictionaryItem[] = [
    {
        id: 'urban-commute',
        label: '都市通勤',
        english: 'Urban Commute',
        description: '服务工作日高频通勤，强调舒适、稳定和跨服装搭配性。',
    },
    {
        id: 'smart-workplace',
        label: '时尚职场',
        english: 'Smart Workplace',
        description: '兼顾专业感与造型表达，适合一二线城市商务与出差场景。',
    },
    {
        id: 'weekend-casual',
        label: '周末休闲',
        english: 'Weekend Casual',
        description: '适配 City Walk、短途出行和低门槛穿搭需求。',
    },
    {
        id: 'sport-casual',
        label: '运动休闲',
        english: 'Sport Casual',
        description: '强调脚感、轻量与活力，适合年轻客群和高频生活方式。',
    },
    {
        id: 'light-outdoor',
        label: '轻户外',
        english: 'Light Outdoor',
        description: '适配周末外出、机能通勤与跨天气使用场景。',
    },
    {
        id: 'social-evening',
        label: '日常社交',
        english: 'Social Evening',
        description: '服务聚会、看展、聚餐等轻社交场景，承担搭配拉升功能。',
    },
    {
        id: 'formal-social',
        label: '正式社交',
        english: 'Formal Social',
        description: '服务宴会、礼赠或正式活动，开发比例应严格控制。',
    },
    {
        id: 'vacation-leisure',
        label: '度假休闲',
        english: 'Vacation Leisure',
        description: '偏季节性和目的地场景，受波段与气候影响更明显。',
    },
];

export const COLOR_ROLE_TYPES: ColorRoleDictionaryItem[] = [
    {
        id: 'theme',
        label: '主题色',
        english: 'Theme',
        description: '负责讲清本季故事，占据核心橱窗与视觉焦点。',
        recommendedShare: '50%',
    },
    {
        id: 'auxiliary',
        label: '辅助色',
        english: 'Auxiliary',
        description: '负责互搭性与利润贡献，是中腰部销售主力。',
        recommendedShare: '30%',
    },
    {
        id: 'core',
        label: '基础色',
        english: 'Core',
        description: '黑白灰和大地色等长期稳定颜色，承担安全库存与补单。',
        recommendedShare: '15%',
    },
    {
        id: 'accent',
        label: '点缀色',
        english: 'Accent',
        description: '负责引流和记忆点，建议更多落在鞋带、标识和局部细节。',
        recommendedShare: '5%',
    },
];

export interface ReviewStatusItem extends BusinessDictionaryItem {
    color: string;
    bgColor: string;
}

export const REVIEW_STATUSES: ReviewStatusItem[] = [
    {
        id: 'pass',
        label: '通过',
        english: 'Pass',
        description: '样鞋满足所有评审维度要求，可进入下一阶段。',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50 border-emerald-200',
    },
    {
        id: 'review',
        label: '待复审',
        english: 'Review',
        description: '存在需要确认的问题，但不影响整体方向，安排复审。',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50 border-amber-200',
    },
    {
        id: 'revise',
        label: '需修改',
        english: 'Revise',
        description: '存在明确的修改项，需出修改单并在下次评审前完成。',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50 border-blue-200',
    },
    {
        id: 'fail',
        label: '不通过',
        english: 'Fail',
        description: '样鞋存在根本性问题（成本超标、结构不可行等），建议终止。',
        color: 'text-red-700',
        bgColor: 'bg-red-50 border-red-200',
    },
];

export const PUBLISH_LEVELS: BusinessDictionaryItem[] = [
    {
        id: 'internal',
        label: '内部',
        english: 'Internal',
        description: '仅团队内部可见，包含敏感数据和未定稿内容。',
    },
    {
        id: 'dashboard',
        label: '看板',
        english: 'Dashboard',
        description: '可在决策驾驶舱中展示，已脱敏但保留业务细节。',
    },
    {
        id: 'portfolio',
        label: '作品集',
        english: 'Portfolio',
        description: '可对外展示，用于面试、汇报等场景，已做适当抽象。',
    },
    {
        id: 'public',
        label: '公开',
        english: 'Public',
        description: '完全公开，不含任何敏感信息。',
    },
];

export const SAMPLE_STAGES: BusinessDictionaryItem[] = [
    {
        id: 'proto',
        label: '原型样',
        english: 'Proto',
        description: '首次打样，验证鞋楦、轮廓和基本结构。',
    },
    {
        id: 'sms',
        label: '销售样',
        english: 'SMS',
        description: '销售确认样，验证材质、配色和成本。',
    },
    {
        id: 'pp',
        label: '产前样',
        english: 'PP',
        description: '产前确认样，验证量产工艺和品质标准。',
    },
    {
        id: 'top',
        label: '量产样',
        english: 'TOP',
        description: '量产首件确认，最终品质把关。',
    },
];

export const RISK_LEVELS: BusinessDictionaryItem[] = [
    {
        id: 'low',
        label: '低风险',
        english: 'Low',
        description: '各维度均在安全范围内。',
    },
    {
        id: 'medium',
        label: '中风险',
        english: 'Medium',
        description: '存在需要关注的预警项。',
    },
    {
        id: 'high',
        label: '高风险',
        english: 'High',
        description: '存在可能影响上市或成本的严重问题。',
    },
];

export const TREND_SOURCE_OPTIONS: BusinessDictionaryItem[] = [
    {
        id: 'historical-archive',
        label: '历史档案',
        english: 'Historical Archive',
        description: '用于验证相似属性在本品牌中的真实表现和避坑经验。',
    },
    {
        id: 'competitor',
        label: '竞品镜像',
        english: 'Competitor Mirror',
        description: '用于识别结构缺口、橱窗主推和材质/颜色变化。',
    },
    {
        id: 'social',
        label: '社交媒体',
        english: 'Social Media',
        description: '用于捕捉圈层扩散、热词和真实穿着场景变化。',
    },
    {
        id: 'store-observation',
        label: '门店观察',
        english: 'Store Observation',
        description: '把店员和巡店观察转成结构化数据，而不是停留在口头反馈。',
    },
    {
        id: 'trend-report',
        label: '趋势报告',
        english: 'Trend Report',
        description: '只作为原始输入源，必须经过品牌 DNA 与历史数据过滤。',
    },
];
