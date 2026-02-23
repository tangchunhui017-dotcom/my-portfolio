export interface TerminologyMapItem {
    apparel: string;
    footwear: string;
    note?: string;
}

export const APPAREL_TO_FOOTWEAR_TERMS: TerminologyMapItem[] = [
    { apparel: '业绩', footwear: '净销售额（Net Sales）', note: '需明确含税/不含税口径' },
    { apparel: '零售成交额/结算额', footwear: '实收销售额', note: '扣券/补贴/退款口径需统一' },
    { apparel: '吊牌额', footwear: 'MSRP 金额（建议零售价金额）' },
    { apparel: '折扣/倍折动', footwear: '平均折扣率 / 折扣深度', note: '折扣率=Net Sales÷MSRP；折扣深度=1-折扣率' },
    { apparel: '销量/零售数量', footwear: '零售销量（双）' },
    { apparel: '发货量/发货数量', footwear: '配货量/出库量（双）', note: '直营/加盟/电商仓口径分开' },
    { apparel: '销售SKU', footwear: '动销SKU（有销量 SKU）' },
    { apparel: 'SKC平均销量', footwear: '色号动销（SKC销量）' },
    { apparel: '单款销量/单款销额', footwear: '单款深度（SPU/款号维度）' },
    { apparel: '单店销量/单店销额', footwear: '店效（店均销量/店均销售额）' },
    { apparel: '售罄', footwear: '售罄率（Sell-through%）' },
    { apparel: '销发比', footwear: '销售/配货比（Sell/Ship）' },
    { apparel: '上下装/外套内搭', footwear: '鞋类一级/二级品类结构' },
    { apparel: '黑标/红标', footwear: '常青款/新品/联名限量/高端线/清仓线' },
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
        note: '作为经营主指标，需声明含税/不含税口径。',
        category: '经营结果',
    },
    {
        id: 'received_sales',
        name: '实收销售额',
        english: 'Received Sales',
        formula: '实收销售额 = 成交额 - 优惠 - 退款',
        note: '与财务结算口径对齐，适合用于资金回款视角。',
        category: '经营结果',
    },
    {
        id: 'msrp_amount',
        name: 'MSRP金额（吊牌额）',
        english: 'MSRP Amount',
        formula: 'MSRP金额 = 吊牌价 × 销量',
        note: '用于衡量价格体系与折扣损失。',
        category: '价格折扣',
    },
    {
        id: 'discount_rate',
        name: '平均折扣率',
        english: 'Avg Discount Rate',
        formula: '平均折扣率 = Net Sales ÷ MSRP金额',
        note: '越高表示价格体系越稳健。',
        category: '价格折扣',
    },
    {
        id: 'discount_depth',
        name: '折扣深度',
        english: 'Discount Depth',
        formula: '折扣深度 = 1 - 平均折扣率',
        note: '越低越好；用于监控促销侵蚀。',
        category: '价格折扣',
    },
    {
        id: 'retail_qty',
        name: '零售销量（双）',
        english: 'Retail Pairs Sold',
        formula: '零售销量 = 周期内销量汇总',
        note: '用于衡量终端动销规模。',
        category: '经营结果',
    },
    {
        id: 'ship_qty',
        name: '配货量/出库量（双）',
        english: 'Ship Quantity',
        formula: '配货量 = 直营/加盟/电商仓出库汇总',
        note: '需在渠道维度区分口径。',
        category: '效率结构',
    },
    {
        id: 'active_sku',
        name: '动销SKU',
        english: 'Active SKU',
        formula: '动销SKU = 有销量记录的 SKU 数',
        note: '用于评估 SKU 效率与结构健康度。',
        category: '效率结构',
    },
    {
        id: 'skc_velocity',
        name: '色号动销（SKC销量）',
        english: 'SKC Velocity',
        formula: 'SKC动销 = 单色号销量汇总/均值',
        note: '用于颜色结构与补货优先级判断。',
        category: '效率结构',
    },
    {
        id: 'spu_depth',
        name: '单款深度（SPU）',
        english: 'SPU Depth',
        formula: '单款深度 = 单款销量或单款销额',
        note: '用于评估款式是否做深做透。',
        category: '效率结构',
    },
    {
        id: 'store_efficiency',
        name: '店效',
        english: 'Store Efficiency',
        formula: '店效 = 店均销量 / 店均销售额',
        note: '用于识别“店多不赚钱”问题。',
        category: '效率结构',
    },
    {
        id: 'sell_through',
        name: '售罄率',
        english: 'Sell-through',
        formula: '售罄率 = 累计销量 ÷ 期初库存',
        note: '可按波段、店态、区域分层观察。',
        category: '经营结果',
    },
    {
        id: 'sell_ship_ratio',
        name: '销售/配货比',
        english: 'Sell/Ship',
        formula: '销售/配货比 = 销量 ÷ 配货量',
        note: '衡量消化速度与配货合理性。',
        category: '效率结构',
    },
];

export interface FootwearCategoryTaxonomyItem {
    category_l1: string;
    category_l2: string[];
}

export const FOOTWEAR_CATEGORY_TAXONOMY: FootwearCategoryTaxonomyItem[] = [
    { category_l1: '运动鞋', category_l2: ['跑步', '训练', '篮球', '综训'] },
    { category_l1: '休闲鞋', category_l2: ['板鞋', '老爹', '乐福', '德训'] },
    { category_l1: '户外鞋', category_l2: ['徒步', '越野', '机能'] },
    { category_l1: '皮鞋/通勤鞋', category_l2: ['商务正装', '商务休闲'] },
    { category_l1: '靴类', category_l2: ['马丁靴', '雪地靴'] },
    { category_l1: '凉鞋/拖鞋', category_l2: ['凉鞋', '拖鞋'] },
    { category_l1: '童鞋', category_l2: ['跑步童鞋', '校园童鞋', '户外童鞋'] },
    { category_l1: '配件', category_l2: ['鞋垫', '鞋带', '袜品'] },
];

export interface FootwearSeriesPositioningItem {
    series: string;
    description: string;
}

export const FOOTWEAR_SERIES_POSITIONING: FootwearSeriesPositioningItem[] = [
    { series: '常青款（Core/Carryover）', description: '稳定走量与现金流底盘' },
    { series: '新品（Newness）', description: '承担新增流量与趋势测试' },
    { series: '联名/限量（Collab/Limited）', description: '品牌声量与高溢价拉动' },
    { series: '高端线（Premium）', description: '提升客单与毛利天花板' },
    { series: '清仓线（Clearance）', description: '用于库存回收与尾货处置' },
];

export const DEMO_TO_STANDARD_CATEGORY_MAP: Record<string, { category_l1: string; category_l2: string }> = {
    跑步: { category_l1: '运动鞋', category_l2: '跑步' },
    训练: { category_l1: '运动鞋', category_l2: '训练' },
    篮球: { category_l1: '运动鞋', category_l2: '篮球' },
    户外: { category_l1: '户外鞋', category_l2: '徒步' },
    休闲: { category_l1: '休闲鞋', category_l2: '板鞋' },
    潮流: { category_l1: '休闲鞋', category_l2: '老爹' },
    童鞋: { category_l1: '童鞋', category_l2: '校园童鞋' },
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
        title: '季度品类结构',
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
        title: '人群与配色策略',
        excelSource: '消费年龄段分析 / 颜色分析',
        focus: ['年龄段结构', '主色系效率', '配色占比', '售罄差异'],
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
        coreLogic: '以季节轮动与脚型偏好定义波段，不以行政管理线做均值铺货。',
        values: [
            { code: 'EAST', label: '华东', scope: '上海/江苏/浙江/安徽', planningFocus: '趋势试验田，换季快，主推新材质与快反节奏。' },
            { code: 'SOUTH', label: '华南', scope: '广东/福建/海南/广西', planningFocus: '长夏无冬，透气网面/凉拖高占比，冬季加绒需求低。' },
            { code: 'NORTH', label: '华北', scope: '北京/天津/河北/山东/山西', planningFocus: '春秋防风耐脏，易打理材质需求更高。' },
            { code: 'MID', label: '华中', scope: '湖北/湖南/江西', planningFocus: '湿冷与酷热交替，冬季保暖防水与夏季透气并重。' },
            { code: 'SW', label: '西南', scope: '四川/重庆/贵州/云南', planningFocus: '地形复杂步行强度高，强调抓地/耐磨/缓震。' },
            { code: 'NW', label: '西北', scope: '陕西/甘肃/新疆/青海/宁夏', planningFocus: '秋冬提前，防风防尘与保暖鞋款周期更长。' },
            { code: 'NE', label: '东北', scope: '辽宁/吉林/黑龙江', planningFocus: '极寒长冬，10月前置备货防滑与厚保暖品类。' },
        ],
    },
    {
        axis: 'Y',
        title: '定价与成本',
        english: 'City Tier & Commercial Level',
        coreLogic: '按商业能级划分 SKU 结构和价格带，不按行政级别粗分。',
        values: [
            { code: 'S', label: 'S级（一线/新一线）', scope: '北上广深/成都/杭州等高能级城市', planningFocus: '形象与首发阵地，高溢价产品（约599-899）与先锋款主导。' },
            { code: 'A', label: 'A级（二线/三线）', scope: '省会与强地级市', planningFocus: '利润中枢，走量款与形象款保持7:3。' },
            { code: 'B', label: 'B级（四线/五线及以下）', scope: '下沉县镇市场', planningFocus: '现金流底盘，主打耐穿高性价比（约199-399）。' },
        ],
    },
    {
        axis: 'Z',
        title: '宽度与风格',
        english: 'Store Format & Channel Vibe',
        coreLogic: '按消费场景调性定义下发宽度，什么店态配什么商品。',
        values: [
            { code: 'Type A', label: '高能级潮流', scope: '核心MALL/标杆百货/旗舰店', planningFocus: '可投高颜值与新工艺，允许限量配色和实验款。' },
            { code: 'Type B', label: '大众生活方式', scope: '社区MALL/市级步行街专卖/连锁百货', planningFocus: '高频百搭与舒适优先，品牌基本盘主投放。' },
            { code: 'Type C', label: '下沉高频刚需', scope: '普通百货/社区街边店', planningFocus: '耐穿耐脏与价格敏感，严控娇贵材质。' },
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
        detail: '新增终端必须维护：地理大区（X）/商业能级（Y）/渠道调性（Z），缺一不可。',
    },
    {
        id: 'otb-coordinate',
        title: 'OTB下单坐标',
        detail: '每个SKU下单需绑定魔方坐标（如：华北-A级-TypeB 通勤靴），禁止全国均值分货。',
    },
    {
        id: 'benchmark-rule',
        title: '业绩体检对标规则',
        detail: '店效对比仅在同渠道调性内进行（Type A只和Type A比），避免错误关店/扩张。',
    },
];