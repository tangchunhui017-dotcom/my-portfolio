export interface TerminologyMapItem {
    apparel: string;
    footwear: string;
    note?: string;
}

export const APPAREL_TO_FOOTWEAR_TERMS: TerminologyMapItem[] = [
    { apparel: '大类', footwear: '鞋品类（跑步/篮球/训练/休闲/户外）' },
    { apparel: '上下装', footwear: '鞋型层级（功能鞋/生活方式鞋）' },
    { apparel: '零售数量', footwear: '销量（双）' },
    { apparel: '零售成交额', footwear: '净销售额（含税口径）' },
    { apparel: '平均单价', footwear: 'ASP（成交均价）' },
    { apparel: '发货量', footwear: '配发量/到仓量（双）' },
    { apparel: '销售SKU', footwear: '动销SKU（色码）' },
    { apparel: '单款销量深度', footwear: '单款销售深度（双/款）' },
    { apparel: '销发比', footwear: 'Sell-out / Sell-in 比' },
    { apparel: '店铺形态', footwear: '渠道形态（直营/加盟/电商/KA/奥莱）' },
    { apparel: '城市级别', footwear: '城市层级（新一线/二线/三线等）' },
    { apparel: '色系', footwear: '配色系列（主色+点缀色）' },
    { apparel: '款式需求与企划', footwear: '鞋款需求与企划（SPU/SKC/SKU）' },
    { apparel: '波段策略', footwear: '波段上市节奏（9C/10A/10B/10C/11A/11B/12A）' },
];

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
        focus: ['波段节奏', '上市窗口', '企划SKU', '20VS19对比'],
    },
    {
        id: 'consumer-color',
        title: '人群与配色策略',
        excelSource: '消费年龄段分析 / 颜色分析',
        focus: ['年龄段结构', '主色系效率', '配色占比', '售罄差异'],
    },
];
