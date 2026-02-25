/**
 * 企划口径中心（P0）
 * 说明：
 * 1) 统一“季节 / 波段 / 生命周期 / 渠道 / 指标公式”口径定义。
 * 2) 当前项目筛选仍使用 Q1~Q4 + W01~W12，本文件提供鞋类业务季节映射标准，供后续 hook 聚合引用。
 */

export type PlanningSeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type DashboardSeasonCode = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface PlanningSeasonDefinition {
    id: PlanningSeasonId;
    label: string;
    monthRange: [number, number];
    crossYear?: boolean;
    dashboardSeasonHint: DashboardSeasonCode;
    note: string;
}

export interface PlanningWaveDefinition {
    code: string;
    label: string;
    seasonId: PlanningSeasonId;
    monthRange: [number, number];
    dashboardWaveHints: string[];
    note?: string;
}

export interface LifecycleDefinition {
    id: 'new' | 'core' | 'clearance';
    label: string;
    weekRange: [number, number];
    note: string;
}

export interface MetricDefinition {
    id: string;
    label: string;
    unit: '%' | 'pp' | '元' | '双' | '周' | '天' | '个';
    formula: string;
    numerator?: string;
    denominator?: string;
    filterScope: string;
    note?: string;
}

export const DASHBOARD_WAVE_CODES = [
    'W01',
    'W02',
    'W03',
    'W04',
    'W05',
    'W06',
    'W07',
    'W08',
    'W09',
    'W10',
    'W11',
    'W12',
] as const;

export const PLANNING_SEASON_DEFINITIONS: PlanningSeasonDefinition[] = [
    {
        id: 'spring',
        label: '春季',
        monthRange: [2, 4],
        dashboardSeasonHint: 'Q1',
        note: '主打轻量通勤、休闲与春季户外，偏上新导入。',
    },
    {
        id: 'summer',
        label: '夏季',
        monthRange: [5, 8],
        dashboardSeasonHint: 'Q2',
        note: '凉拖鞋、溯溪鞋与透气材质高峰季，关注补单效率。',
    },
    {
        id: 'autumn',
        label: '秋季',
        monthRange: [9, 10],
        dashboardSeasonHint: 'Q3',
        note: '换季关键窗口，街头/通勤/户外共同发力。',
    },
    {
        id: 'winter',
        label: '冬季',
        monthRange: [11, 1],
        crossYear: true,
        dashboardSeasonHint: 'Q4',
        note: '靴类主战季，强调保暖、防滑与库存深度管理。',
    },
];

export const PLANNING_WAVE_DEFINITIONS: PlanningWaveDefinition[] = [
    { code: 'S1', label: '春1波', seasonId: 'spring', monthRange: [2, 2], dashboardWaveHints: ['W01', 'W02', 'W03', 'W04'] },
    { code: 'S2', label: '春2波', seasonId: 'spring', monthRange: [3, 3], dashboardWaveHints: ['W05', 'W06', 'W07', 'W08'] },
    { code: 'S3', label: '春3波', seasonId: 'spring', monthRange: [4, 4], dashboardWaveHints: ['W09', 'W10', 'W11', 'W12'] },
    { code: 'U1', label: '夏1波', seasonId: 'summer', monthRange: [5, 5], dashboardWaveHints: ['W01', 'W02', 'W03', 'W04'] },
    { code: 'U2', label: '夏2波', seasonId: 'summer', monthRange: [6, 7], dashboardWaveHints: ['W05', 'W06', 'W07', 'W08'] },
    { code: 'U3', label: '夏3波', seasonId: 'summer', monthRange: [8, 8], dashboardWaveHints: ['W09', 'W10', 'W11', 'W12'] },
    { code: 'A1', label: '秋1波', seasonId: 'autumn', monthRange: [9, 9], dashboardWaveHints: ['W01', 'W02', 'W03', 'W04'] },
    { code: 'A2', label: '秋2波', seasonId: 'autumn', monthRange: [9, 10], dashboardWaveHints: ['W05', 'W06', 'W07', 'W08'] },
    { code: 'A3', label: '秋3波', seasonId: 'autumn', monthRange: [10, 10], dashboardWaveHints: ['W09', 'W10', 'W11', 'W12'] },
    { code: 'W1', label: '冬1波', seasonId: 'winter', monthRange: [11, 11], dashboardWaveHints: ['W01', 'W02', 'W03', 'W04'] },
    { code: 'W2', label: '冬2波', seasonId: 'winter', monthRange: [12, 12], dashboardWaveHints: ['W05', 'W06', 'W07', 'W08'] },
    { code: 'W3', label: '冬3波', seasonId: 'winter', monthRange: [1, 1], dashboardWaveHints: ['W09', 'W10', 'W11', 'W12'] },
];

export const LIFECYCLE_DEFINITIONS: LifecycleDefinition[] = [
    { id: 'new', label: '新品期', weekRange: [0, 8], note: '上新导入与测试窗口，重点看补单与断码。' },
    { id: 'core', label: '成熟期', weekRange: [9, 16], note: '规模销售主段，重点看售罄、毛利和店效。' },
    { id: 'clearance', label: '清仓期', weekRange: [17, 24], note: '结构收敛与库存回笼，重点控折扣深度。' },
];

export const CHANNEL_STANDARD_TYPES = ['直营', '加盟', '电商', 'KA', '奥莱'] as const;

export const METRIC_DEFINITIONS: MetricDefinition[] = [
    {
        id: 'achv_rate',
        label: '达成率',
        unit: '%',
        formula: 'actual_sales / target_sales',
        numerator: '实际销售额',
        denominator: '目标销售额',
        filterScope: '按当前筛选口径聚合',
    },
    {
        id: 'yoy_rate',
        label: '同比',
        unit: '%',
        formula: '(current - last_year_same_period) / last_year_same_period',
        numerator: '本期值 - 去年同期值',
        denominator: '去年同期值',
        filterScope: '同维度、同周期对比',
    },
    {
        id: 'mom_rate',
        label: '环比',
        unit: '%',
        formula: '(current - previous_period) / previous_period',
        numerator: '本期值 - 上期值',
        denominator: '上期值',
        filterScope: '同维度、相邻周期对比',
    },
    {
        id: 'sell_through_rate',
        label: '售罄率（基础）',
        unit: '%',
        formula: 'sales_qty / beginning_sellable_inventory',
        numerator: '累计销量',
        denominator: '期初可售库存',
        filterScope: 'SKU/品类/波段可下钻',
    },
    {
        id: 'effective_sell_through_rate',
        label: '有效售罄率',
        unit: '%',
        formula: 'sales_qty / (beginning_sellable_inventory - off_shelf - transfer_out - damage)',
        numerator: '累计销量',
        denominator: '有效可售库存',
        filterScope: 'SKU/品类/波段可下钻',
        note: '当前可用 v0 因子近似，接入真实库存后切换到事实口径。',
    },
    {
        id: 'sell_ship_ratio',
        label: '销发比',
        unit: '%',
        formula: 'sales_qty / ship_qty',
        numerator: '销售数量',
        denominator: '配货出库数量',
        filterScope: '区域/渠道/品类均可计算',
    },
    {
        id: 'wos',
        label: '库存周转周数 WOS',
        unit: '周',
        formula: 'ending_inventory / average_weekly_sales',
        numerator: '期末库存',
        denominator: '周均销量',
        filterScope: '建议按品类、渠道、区域分层看',
    },
    {
        id: 'dos',
        label: '库存可售天数 DOS',
        unit: '天',
        formula: 'wos * 7',
        numerator: '库存周转周数',
        denominator: '常量 7',
        filterScope: '跟随 WOS 口径',
    },
];

export function getSeasonDefinition(seasonId: PlanningSeasonId) {
    return PLANNING_SEASON_DEFINITIONS.find((item) => item.id === seasonId) || null;
}

export function getWaveDefinitionsBySeason(seasonId: PlanningSeasonId) {
    return PLANNING_WAVE_DEFINITIONS.filter((wave) => wave.seasonId === seasonId);
}

export function getBusinessSeasonByMonth(month: number): PlanningSeasonId {
    if ([2, 3, 4].includes(month)) return 'spring';
    if ([5, 6, 7, 8].includes(month)) return 'summer';
    if ([9, 10].includes(month)) return 'autumn';
    return 'winter';
}

