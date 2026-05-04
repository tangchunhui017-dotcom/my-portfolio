export interface TerminologyMapItem {
    apparel: string;
    footwear: string;
    note?: string;
}

export const APPAREL_TO_FOOTWEAR_TERMS: TerminologyMapItem[] = [
    { apparel: '业绩', footwear: '净销售额（Net Sales）', note: '需标注含税/不含税口径' },
    { apparel: '零售成交额/结算额', footwear: '实收销售额', note: '扣券、补贴、退款后口径' },
    { apparel: '吊牌额', footwear: 'MSRP金额（建议零售价金额）' },
    { apparel: '折扣/倍折动', footwear: '平均折扣率 / 折扣深度', note: '折扣率=Net Sales/MSRP，折扣深度=1-折扣率' },
    { apparel: '销量/零售数量', footwear: '零售销量（双）' },
    { apparel: '发货量/发货数量', footwear: '配货量/出库量（双）', note: '直营/加盟/电商仓需拆分口径' },
    { apparel: '销售SKU', footwear: '动销SKU（周期内销量>0）' },
    { apparel: '单款销量/单款销额', footwear: '单款深度（按SPU/款号）' },
    { apparel: '单店销量/单店销额', footwear: '店效（店均销量/店均销额）' },
    { apparel: '售罄', footwear: '售罄率（Sell-through）' },
    { apparel: '销发比', footwear: '销售/配货比（Sell/Ship）' },
];

export interface FootwearMetricStandard {
    id: string;
    name: string;
    english: string;
    formula: string;
    note: string;
    category: '经营结果' | '价格折扣' | '效率结构';
}

export const FOOTWEAR_CORE_METRICS: FootwearMetricStandard[] = [
    {
        id: 'net_sales',
        name: '净销售额',
        english: 'Net Sales',
        formula: '净销售额 = 实收销售额（扣券/补贴/退款后）',
        note: '管理层主指标，必须统一税口径。',
        category: '经营结果',
    },
    {
        id: 'retail_qty',
        name: '零售销量（双）',
        english: 'Retail Pairs',
        formula: '零售销量 = 周期内销量汇总',
        note: '用于衡量终端动销规模。',
        category: '经营结果',
    },
    {
        id: 'gross_margin',
        name: '毛利额 / 毛利率',
        english: 'Gross Profit / GM%',
        formula: '毛利额 = 净销售额 - 成本；毛利率 = 毛利额 / 净销售额',
        note: '用于监控结构质量，不只看规模。',
        category: '经营结果',
    },
    {
        id: 'discount_rate',
        name: '平均折扣率',
        english: 'Avg Discount Rate',
        formula: '平均折扣率 = Net Sales / MSRP金额',
        note: '越高代表价格体系越稳定。',
        category: '价格折扣',
    },
    {
        id: 'discount_depth',
        name: '折扣深度',
        english: 'Discount Depth',
        formula: '折扣深度 = 1 - 平均折扣率',
        note: '越低越好，用于折扣侵蚀预警。',
        category: '价格折扣',
    },
    {
        id: 'sell_through',
        name: '售罄率',
        english: 'Sell-through',
        formula: '售罄率 = 累计销量 / 可售库存',
        note: '支持累计口径与有效口径切换。',
        category: '效率结构',
    },
    {
        id: 'sell_ship_ratio',
        name: '销售/配货比',
        english: 'Sell/Ship',
        formula: '销售/配货比 = 销量 / 配货量',
        note: '衡量配货合理性与消化速度。',
        category: '效率结构',
    },
    {
        id: 'size_full_rate',
        name: '齐码率',
        english: 'Full-size Rate',
        formula: '齐码率 = 有库存核心尺码数 / 核心尺码总数',
        note: '建议阈值：<75% 预警；越高代表货架可售尺码更完整。',
        category: '效率结构',
    },
    {
        id: 'size_stockout_rate',
        name: '断码率',
        english: 'Stockout Rate',
        formula: '断码率 = 缺货核心尺码数 / 核心尺码总数',
        note: '建议阈值：>25% 风险；优先补核心尺码与热区调拨。',
        category: '效率结构',
    },
    {
        id: 'core_size_sales_share',
        name: '核心尺码销量占比',
        english: 'Core Size Sales Share',
        formula: '核心尺码销量占比 = 核心尺码销量 / 总销量',
        note: '建议阈值：<60% 预警；用于判断尺码结构与需求匹配度。',
        category: '效率结构',
    },
    {
        id: 'size_curve_fit_rate',
        name: '尺码配比达成率',
        english: 'Size Curve Fit Rate',
        formula: '尺码配比达成率 = 1 - Σ|实际占比 - 目标占比| / 2',
        note: '越高越好，建议<80% 预警；用于评估首单尺码结构偏差。',
        category: '效率结构',
    },
    {
        id: 'active_sku',
        name: '动销SKU',
        english: 'Active SKU',
        formula: '动销SKU = 周期内销量>0的SKU数',
        note: '用于SKU效率与结构健康度。',
        category: '效率结构',
    },
    {
        id: 'spu_depth',
        name: '单款深度',
        english: 'SPU Depth',
        formula: '单款深度 = 单款销量或单款销额',
        note: '用于判断款式是否做深做透。',
        category: '效率结构',
    },
    {
        id: 'store_efficiency',
        name: '店效',
        english: 'Store Efficiency',
        formula: '店效 = 店均销量 / 店均销售额',
        note: '用于识别“店多不赚钱”的结构风险。',
        category: '效率结构',
    },
];

export interface FootwearCategoryTaxonomyItem {
    category_l1: string;
    category_l2: string[];
}

export const FOOTWEAR_CATEGORY_TAXONOMY: FootwearCategoryTaxonomyItem[] = [
    { category_l1: '户外鞋', category_l2: ['徒步登山', '溯溪鞋', '越野鞋', '潮流机能'] },
    { category_l1: '休闲/街头', category_l2: ['板鞋', '老爹鞋', '德训鞋', '阿甘鞋', '帆布鞋'] },
    { category_l1: '时尚/通勤', category_l2: ['浅口单鞋', '芭蕾舞鞋', '玛丽珍鞋'] },
    { category_l1: '正装/通勤', category_l2: ['乐福鞋', '牛津鞋', '德比鞋', '豆豆鞋', '穆勒鞋'] },
    { category_l1: '靴类', category_l2: ['裸靴', '切尔西靴', '马丁靴', '长筒靴', '雪地靴', '短靴'] },
    { category_l1: '凉拖鞋', category_l2: ['凉鞋', '洞洞鞋', '拖鞋', '前空鞋', '中空鞋', '后空鞋'] },
];

export interface FootwearSeriesPositioningItem {
    series: string;
    description: string;
}

export const FOOTWEAR_SERIES_POSITIONING: FootwearSeriesPositioningItem[] = [
    { series: '常青款（Core）', description: '稳定走量与现金流底盘。' },
    { series: '新品（Newness）', description: '承担增量流量与趋势测试。' },
    { series: '联名/限量（Collab）', description: '拉升品牌声量与溢价。' },
    { series: '高端线（Premium）', description: '提升客单与毛利天花板。' },
    { series: '清仓线（Clearance）', description: '用于库存回收与尾货处置。' },
];

export const DEMO_TO_STANDARD_CATEGORY_MAP: Record<string, { category_l1: string; category_l2: string }> = {
    跑步: { category_l1: '休闲/街头', category_l2: '阿甘鞋' },
    训练: { category_l1: '休闲/街头', category_l2: '德训鞋' },
    篮球: { category_l1: '休闲/街头', category_l2: '板鞋' },
    户外: { category_l1: '户外鞋', category_l2: '徒步登山' },
    休闲: { category_l1: '休闲/街头', category_l2: '板鞋' },
    潮流: { category_l1: '休闲/街头', category_l2: '老爹鞋' },
    通勤: { category_l1: '正装/通勤', category_l2: '乐福鞋' },
    靴: { category_l1: '靴类', category_l2: '短靴' },
};

export interface FootwearAnalysisModule {
    id: string;
    title: string;
    excelSource: string;
    focus: string[];
}

export const FOOTWEAR_ANALYSIS_MODULES: FootwearAnalysisModule[] = [
    {
        id: 'annual-performance',
        title: '年度业绩达成',
        excelSource: '年度业绩分析',
        focus: ['净销售额', '售罄率', '毛利率', '月度节奏'],
    },
    {
        id: 'region-channel',
        title: '区域与渠道效率',
        excelSource: '区域业绩分析 / 渠道业绩分析 / 城市店铺业绩分析',
        focus: ['区域贡献', '渠道结构', '城市层级', '店效分布'],
    },
    {
        id: 'category-quarter',
        title: '季度商品结构',
        excelSource: '季度商品业绩分析 / 年度商品销售分析',
        focus: ['品类占比', '单款深度', '销发比', '动销SKU'],
    },
    {
        id: 'wave-plan',
        title: '波段企划执行',
        excelSource: '波段策略 / 款式需求与企划',
        focus: ['波段节奏', '上市窗口', 'SKU容量', '新旧货占比'],
    },
    {
        id: 'consumer-color',
        title: '人群与色彩策略',
        excelSource: '消费年龄段分析 / 颜色分析',
        focus: ['年龄结构', '色系效率', '配色占比', '售罄差异'],
    },
];

export interface FootwearPlanningCubeAxisItem {
    axis: 'X' | 'Y' | 'Z';
    title: string;
    english: string;
    coreLogic: string;
    values: Array<{
        code: string;
        label: string;
        scope: string;
        planningFocus: string;
    }>;
}

export const FOOTWEAR_PLANNING_CUBE_AXES: FootwearPlanningCubeAxisItem[] = [
    {
        axis: 'X',
        title: '气候与波段',
        english: 'Region & Climate Matrix',
        coreLogic: '按气候与季节轮动分配波段，不做全国均值铺货。',
        values: [
            { code: 'EAST', label: '华东', scope: '沪苏浙皖', planningFocus: '趋势试验田，换季快，优先新材质。' },
            { code: 'SOUTH', label: '华南', scope: '粤闽琼桂', planningFocus: '长夏无冬，凉拖与透气款占比更高。' },
            { code: 'NORTH', label: '华北', scope: '京津冀鲁晋', planningFocus: '春秋防风耐脏，秋冬保暖前置。' },
            { code: 'MID', label: '华中', scope: '鄂湘赣', planningFocus: '湿冷与酷热并存，季节切换需更平滑。' },
            { code: 'SW', label: '西南', scope: '川渝云贵', planningFocus: '耐磨抓地与缓震舒适优先。' },
            { code: 'NW', label: '西北', scope: '陕甘宁青新', planningFocus: '温差大，秋冬波段提前，防风防尘。' },
            { code: 'NE', label: '东北', scope: '辽吉黑', planningFocus: '极寒长冬，防滑与高保暖深度优先。' },
        ],
    },
    {
        axis: 'Y',
        title: '商业能级',
        english: 'City Tier & Commercial Level',
        coreLogic: '按城市商业能级切分价格带与款式结构。',
        values: [
            { code: 'S', label: 'S级（一线/新一线）', scope: '高能级商业城市', planningFocus: '首发与形象阵地，承担高溢价与实验款。' },
            { code: 'A', label: 'A级（二线/三线）', scope: '省会与强地级市', planningFocus: '利润中枢，走量款与形象款保持7:3。' },
            { code: 'B', label: 'B级（四/五线）', scope: '下沉市场', planningFocus: '现金流底盘，强调耐穿与性价比。' },
        ],
    },
    {
        axis: 'Z',
        title: '店态调性',
        english: 'Store Format & Channel Vibe',
        coreLogic: '按消费场景调性定义SKU宽度与风格深度。',
        values: [
            { code: 'Type A', label: '高能级潮流', scope: '核心MALL/标杆百货', planningFocus: '可投高颜值、限量配色和创新工艺。' },
            { code: 'Type B', label: '大众生活方式', scope: '社区MALL/步行街专卖', planningFocus: '高频百搭与舒适体感优先。' },
            { code: 'Type C', label: '下沉高频刚需', scope: '社区街边/普通百货', planningFocus: '耐穿耐脏与价格敏感，严控娇贵材质。' },
        ],
    },
];

export interface FootwearExecutionMandate {
    id: string;
    title: string;
    detail: string;
}

export const FOOTWEAR_EXECUTION_MANDATES: FootwearExecutionMandate[] = [
    {
        id: 'mdm-required-fields',
        title: '主数据强校验字段',
        detail: '终端必须维护：地理大区（X）/ 商业能级（Y）/ 渠道调性（Z）。',
    },
    {
        id: 'otb-coordinate',
        title: 'OTB下单坐标',
        detail: '每个SKU下单需绑定魔方坐标，禁止“一盘货推全国”。',
    },
    {
        id: 'benchmark-rule',
        title: '店效对标规则',
        detail: '只做同店态调性的横向对比，避免错误关店与错误扩张。',
    },
];

export type FootwearMerchKeyRole = '基本款' | '主推款' | '形象款' | '引流款' | '节庆/主题款';

export const FOOTWEAR_KEY_ROLE_OPTIONS: Array<{
    id: FootwearMerchKeyRole;
    description: string;
}> = [
    { id: '基本款', description: '承担稳定走量与结构底盘。' },
    { id: '主推款', description: '承担当期波段的经营重心与销量目标。' },
    { id: '形象款', description: '承担品牌形象升级与陈列拉升。' },
    { id: '引流款', description: '承担客流转化与活动引爆。' },
    { id: '节庆/主题款', description: '承担节庆活动、主题场景与限定曝光。' },
];

export interface FootwearPriceBandPositioning {
    id: 'PB1' | 'PB2' | 'PB3' | 'PB4';
    label: string;
    range: string;
    role: string;
}

export const FOOTWEAR_PRICE_BAND_POSITIONING: FootwearPriceBandPositioning[] = [
    { id: 'PB1', label: '入门带', range: '199-399', role: '引流与基础走量，强调性价比与耐穿。' },
    { id: 'PB2', label: '核心走量带', range: '399-599', role: '品牌成交中枢，兼顾规模、毛利与复购。' },
    { id: 'PB3', label: '形象升级带', range: '599-799', role: '承接趋势款、联名款与高感知设计。' },
    { id: 'PB4', label: '高端形象带', range: '800+', role: '承担品牌高度、材料升级与门店形象展示。' },
];

export interface FootwearSceneOption {
    id: string;
    label: string;
    description: string;
    suggestedCategories: string[];
    defaultKeyRole: FootwearMerchKeyRole;
}

export const FOOTWEAR_SCENE_OPTIONS: FootwearSceneOption[] = [
    { id: 'commute', label: '通勤', description: '聚焦舒适、易搭配与全天候穿着。', suggestedCategories: ['乐福鞋', '玛丽珍', '德训鞋'], defaultKeyRole: '基本款' },
    { id: 'holiday-travel', label: '假日出行', description: '强调轻量、舒适与多场景切换。', suggestedCategories: ['复古跑', '凉鞋', '户外/机能'], defaultKeyRole: '主推款' },
    { id: 'light-outdoor', label: '轻户外', description: '强调抓地、防滑、耐磨与城市户外兼容。', suggestedCategories: ['户外/机能', '复古跑'], defaultKeyRole: '主推款' },
    { id: 'season-shift', label: '换季过渡', description: '承接新旧货切换与温差波动。', suggestedCategories: ['德训鞋', '复古跑', '短靴'], defaultKeyRole: '主推款' },
    { id: 'summer-cooling', label: '清凉夏日', description: '聚焦透气、清凉与假日场景。', suggestedCategories: ['凉鞋', '玛丽珍'], defaultKeyRole: '引流款' },
    { id: 'festival-gifting', label: '节庆送礼', description: '聚焦成套感、礼赠感与节日主题表达。', suggestedCategories: ['形象款', '节庆/主题款'], defaultKeyRole: '节庆/主题款' },
    { id: 'autumn-warmth', label: '秋冬保暖', description: '聚焦保暖、防滑与耐脏材质。', suggestedCategories: ['短靴', '长靴', '户外/机能'], defaultKeyRole: '主推款' },
    { id: 'year-end-party', label: '年底聚会', description: '聚焦造型感、节庆氛围与社交曝光。', suggestedCategories: ['玛丽珍', '长靴', '形象款'], defaultKeyRole: '形象款' },
];

export interface FootwearLifecycleDefinition {
    id: string;
    label: string;
    english: string;
    rule: string;
    note: string;
}

export const FOOTWEAR_LIFECYCLE_DEFINITIONS: FootwearLifecycleDefinition[] = [
    {
        id: 'new',
        label: '新品',
        english: 'Newness',
        rule: '以当前筛选的年/季为锚点，归属当前季的商品计为新品。',
        note: '用于观察当季新品承接效率与上新节奏。',
    },
    {
        id: 'carryover',
        label: '次新品',
        english: 'Recent Carryover',
        rule: '以上一季商品，以及去年同季仍在售的延续商品为主，统一归入次新品承接池。',
        note: '用于观察承接去化与新旧货切换压力。',
    },
    {
        id: 'legacy',
        label: '老品',
        english: 'Legacy / Core',
        rule: '两年及以上仍在售的商品，统一归为老品基盘。',
        note: '用于观察现金流底盘、老货占压与长期库存风险。',
    },
];
export interface FootwearMetricLensDefinition {
    id: string;
    label: string;
    english: string;
    formula: string;
    note: string;
}

export const FOOTWEAR_LIFECYCLE_STRUCTURE_METRICS: FootwearMetricLensDefinition[] = [
    {
        id: 'new-sales-share',
        label: '新品销售占比',
        english: 'Newness Sales Share',
        formula: '新品销售额 /（新品 + 次新品 + 老品销售额）',
        note: '用于判断当期销售结构是否已由当季新品主导，是库龄层级销售结构图的核心观察指标。',
    },
    {
        id: 'carryover-sales-share',
        label: '次新品销售占比',
        english: 'Recent Carryover Sales Share',
        formula: '次新品销售额 /（新品 + 次新品 + 老品销售额）',
        note: '用于观察上一季商品及去年同季延续商品是否仍在压盘，评估新旧货切换压力。',
    },
    {
        id: 'legacy-sales-share',
        label: '老品销售占比',
        english: 'Legacy Sales Share',
        formula: '老品销售额 /（新品 + 次新品 + 老品销售额）',
        note: '用于判断两年及以上基盘款是否过度占压陈列、预算与销售结构。',
    },
    {
        id: 'newness-dominance-line',
        label: '新品主导生命线',
        english: '50% Newness Dominance Line',
        formula: '新品销售占比 >= 50%',
        note: '当新品销售占比越过 50% 时，视为当期销售结构进入新品主导区，是判断上新节奏是否真正落地的生命线。',
    },
    {
        id: 'transition-rhythm-index',
        label: '承接节奏指数',
        english: 'Transition Rhythm Index',
        formula: '新品销售额 /（次新品销售额 + 老品销售额）',
        note: '大于 1 表示新品销售规模已超过旧货总和，承接进入主动区；小于 1 则说明旧货仍在主导销售结果。',
    },
];

export const FOOTWEAR_SEASON_TRANSITION_METRICS: FootwearMetricLensDefinition[] = [
    {
        id: 'season-stage',
        label: '季节阶段',
        english: 'Season Stage',
        formula: '以销售发生时间为准，按春 / 夏 / 秋 / 冬货季定义预热测款、上新爬坡、主销爆发、尾段平销、清货出清五段节奏',
        note: '总周期中的“30号 / 月末”属于经营记忆锚点，实际按对应月份最后一天映射，避免页面另起一套时间骨架。',
    },
    {
        id: 'new-structure-plan',
        label: '新品结构计划',
        english: 'Newness Structure Plan',
        formula: '年度总控货盘切换层设定的当期新品结构目标',
        note: '用于表达管理层预期的新品切入节奏，例如某个上新爆发周应达到的新品占比或新品结构目标。',
    },
    {
        id: 'new-structure-actual',
        label: '新品结构实际',
        english: 'Newness Structure Actual',
        formula: '当期新品实际销售额 / 当期总销售额',
        note: '用于验证终端是否真正按计划主推新品，判断上新、陈列和主推动作是否兑现。',
    },
    {
        id: 'legacy-discount-plan',
        label: '老货折扣计划',
        english: 'Legacy Discount Plan',
        formula: '年度总控货盘切换层设定的旧货折扣率、折扣深度或清货节奏目标',
        note: '用于控制上一季与老货的退出节奏，避免旧货折扣过慢压住新品，或过快损伤毛利。',
    },
    {
        id: 'legacy-discount-actual',
        label: '老货折扣实际',
        english: 'Legacy Discount Actual',
        formula: '旧货当期实际折扣率、促销深度或清货进度',
        note: '用于与计划对比，判断旧货是否按计划退出，以及是否因异常折扣支撑了表面销售达成。',
    },
    {
        id: 'transition-deviation',
        label: '承接偏差',
        english: 'Transition Deviation',
        formula: '实际值 - 计划值（按新品结构或旧货折扣节奏计算）',
        note: '用于判断季节切换是否跑偏。常见偏差包括新品结构低于计划、老货折扣慢于计划或清货提前/滞后。',
    },
];
