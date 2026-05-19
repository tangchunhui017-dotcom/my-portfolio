/**
 * src/config/merchBusinessLoop.ts
 * 12 个业务模块的闭环数据契约 — 上下游依赖、必备指标、输出指标、健康检查项。
 *
 * 用途：
 * 1. 业务侧 useMerchBusinessModule(tabKey) 直接消费，渲染"上游/下游模块"提示条。
 * 2. 配置侧 MerchBusinessLoopPanel 渲染整个闭环图。
 * 3. merchConfigHealth.ts 检查每个模块的 requiredMetrics 是否在指标库里都能找到。
 *
 * 仅引用已存在于 metrics.json 的 metricId；新增指标请先写到 metrics.json 再回到此处引用。
 */
import type { TabKey } from '@/types/merchConfig';
import type { DashboardTab } from '@/config/dashboardTabMap';
import { CONFIG_TAB_TO_DASHBOARD_TAB } from '@/config/dashboardTabMap';

export interface MerchBusinessModule {
    tabKey: TabKey;
    dashboardKey: DashboardTab;
    label: string;
    icon: string;
    role: string;
    requiredMetrics: string[];
    outputMetrics: string[];
    requiredDimensions: string[];
    upstreamTabs: TabKey[];
    downstreamTabs: TabKey[];
    businessQuestions: string[];
    healthChecks: string[];
}

const overview: MerchBusinessModule = {
    tabKey: 'overview',
    dashboardKey: 'overview',
    label: '总览',
    icon: '📊',
    role: '经营驾驶舱：汇总年度目标、销售、库存、OTB、毛利与现金风险',
    requiredMetrics: [
        'salesAmount', 'salesAchievementRate', 'grossMarginRate', 'inventoryCost',
        'otbUsageRate', 'sellThroughRate', 'cashGap', 'netProfitRate',
    ],
    outputMetrics: [],
    requiredDimensions: ['region', 'channel'],
    upstreamTabs: [
        'annual-control', 'region-store', 'category-ops', 'wave-planning',
        'otb', 'cashflow', 'forecast', 'pnl', 'inventory-health',
    ],
    downstreamTabs: ['annual-control', 'otb', 'inventory-health', 'forecast'],
    businessQuestions: [
        '本年度销售/毛利/利润是否达成目标？',
        '哪些品类、渠道、波段在拖累整体表现？',
        '现金流是否健康？OTB 使用进度是否匹配销售节奏？',
    ],
    healthChecks: ['全部上游模块都能产出关键指标', '风险卡片可链接到具体 Tab'],
};

const annualControl: MerchBusinessModule = {
    tabKey: 'annual-control',
    dashboardKey: 'annual-control',
    label: '年度总控',
    icon: '🗺️',
    role: '锁定年度销售/毛利/库存/OTB 总盘 → 拆解到季节、品类、渠道',
    requiredMetrics: [
        'salesAchievementRate', 'seasonSalesTarget', 'grossMarginRate', 'otbBudget', 'opex',
    ],
    outputMetrics: [
        'seasonSalesTarget', 'otbBudget', 'grossMarginRate', 'inventoryCost',
    ],
    requiredDimensions: ['season', 'channel', 'category'],
    upstreamTabs: [],
    downstreamTabs: ['wave-planning', 'otb', 'forecast', 'pnl', 'region-store'],
    businessQuestions: [
        '年度销售目标如何按季节/品类/渠道拆分？',
        '年度毛利与库存上限的安全边界在哪里？',
        'OTB 总盘如何在四季节/上下半年分配？',
    ],
    healthChecks: ['年度目标 > 0', '至少有一个季节/品类拆分维度被填充'],
};

const brandPositioning: MerchBusinessModule = {
    tabKey: 'brand-positioning',
    dashboardKey: 'brand-positioning',
    label: '品牌定位',
    icon: '🧬',
    role: '品牌身份、DNA 关键词、层级、系列结构、价格架构 → 输出企划判断边界',
    requiredMetrics: [
        'categorySalesRatio', 'priceBandSalesRatio', 'grossMarginRate', 'discountRate',
        'avgSellingPrice', 'newProductRatio',
    ],
    outputMetrics: [],
    requiredDimensions: ['category', 'price_band', 'consumer_persona'],
    upstreamTabs: ['annual-control'],
    downstreamTabs: [
        'consumer', 'competitor-trend', 'category-ops', 'wave-planning', 'otb', 'pnl',
    ],
    businessQuestions: [
        '品牌定位是否清晰？商品企划/波段/OTB 是否偏离品牌 DNA？',
        '系列结构（创意先锋 / 当季流行 / 经典舒适）的目标占比是否匹配？',
        '价格架构是否守住品牌层级底线？',
    ],
    healthChecks: [
        '品牌 DNA 关键词 ≥ 3 个',
        '系列结构占比合计在 95%-105% 区间',
        '主力价格带与品牌层级对齐',
    ],
};

const regionStore: MerchBusinessModule = {
    tabKey: 'region-store',
    dashboardKey: 'channel',
    label: '区域&门店',
    icon: '🏪',
    role: '区域、渠道、门店等级、城市能级 → 输出店效、铺货、调拨能力',
    requiredMetrics: [
        'salesPairs', 'salesAchievementRate', 'sellThroughRate', 'channelSalesRatio',
        'weeksOfSupply', 'brokenSizeRate',
    ],
    outputMetrics: [
        'channelSalesRatio', 'weeksOfSupply', 'brokenSizeRate', 'fullSizeRate',
    ],
    requiredDimensions: ['region', 'city_tier', 'channel', 'store_tier'],
    upstreamTabs: ['annual-control', 'consumer'],
    downstreamTabs: ['category-ops', 'wave-planning', 'otb', 'forecast', 'inventory-health'],
    businessQuestions: [
        '哪些区域/门店等级/渠道在拖累达成？',
        '断码、齐码、库存周数是否在合理区间？',
        '哪些门店需要补货、调拨或减货？',
    ],
    healthChecks: ['区域 + 渠道 + 门店等级三个维度同时存在', '至少一个店效/铺货指标可计算'],
};

const consumer: MerchBusinessModule = {
    tabKey: 'consumer',
    dashboardKey: 'consumer',
    label: '消费者画像',
    icon: '🧑‍🤝‍🧑',
    role: '人群、价格接受度、风格、场景 → 反馈给品类与波段企划',
    requiredMetrics: [
        'avgSellingPrice', 'discountRate', 'categorySalesRatio', 'priceBandSalesRatio',
        'coreSizeSalesShare',
    ],
    outputMetrics: [
        'categorySalesRatio', 'priceBandSalesRatio', 'coreSizeSalesShare',
    ],
    requiredDimensions: ['consumer_persona', 'price_band'],
    upstreamTabs: ['region-store', 'competitor-trend'],
    downstreamTabs: ['category-ops', 'wave-planning', 'forecast', 'competitor-trend'],
    businessQuestions: [
        '主要消费人群的价格接受度落在哪个价格带？',
        '风格/场景偏好是否与现有品类结构匹配？',
        '哪些客群正在向竞品流失？',
    ],
    healthChecks: ['价格带维度有值', '至少一个客群维度被定义'],
};

const categoryOps: MerchBusinessModule = {
    tabKey: 'category-ops',
    dashboardKey: 'category',
    label: '品类运营',
    icon: '📋',
    role: '品类结构、价格带、商品角色、款宽款深',
    requiredMetrics: [
        'categorySalesRatio', 'priceBandSalesRatio', 'plannedSkuCount', 'activeSkuCount',
        'skuDepth', 'sellThroughRate', 'newProductRatio', 'carryoverRatio',
    ],
    outputMetrics: [
        'categorySalesRatio', 'plannedSkuCount', 'skuDepth', 'newProductRatio',
    ],
    requiredDimensions: ['category', 'price_band', 'product_role'],
    upstreamTabs: ['annual-control', 'consumer', 'region-store'],
    downstreamTabs: ['wave-planning', 'otb', 'forecast', 'inventory-health', 'pnl'],
    businessQuestions: [
        '各品类的销售/毛利/SKU 数是否符合企划？',
        '新品 vs 延续款的占比是否健康？',
        '主力价格带的款宽款深是否到位？',
    ],
    healthChecks: ['品类维度 ≥ 3 个值', '价格带维度 ≥ 3 个值'],
};

const wavePlanning: MerchBusinessModule = {
    tabKey: 'wave-planning',
    dashboardKey: 'planning',
    label: '波段企划',
    icon: '📅',
    role: '季节波段、上市节奏、波段角色、波段 SKU 与 OTB 占用',
    requiredMetrics: [
        'waveSalesTarget', 'plannedSkuCount', 'skuDepth', 'sellThroughRate',
        'newProductRatio', 'carryoverRatio',
    ],
    outputMetrics: [
        'waveSalesTarget', 'plannedSkuCount', 'newProductRatio',
    ],
    requiredDimensions: ['season', 'wave', 'category'],
    upstreamTabs: ['annual-control', 'category-ops', 'region-store', 'consumer'],
    downstreamTabs: ['otb', 'cashflow', 'forecast', 'inventory-health'],
    businessQuestions: [
        '每个波段的销售目标/SKU/OTB 是否落实？',
        '上市节奏与生命周期阶段是否匹配？',
        '哪些波段会挤占下一波 OTB 与库存空间？',
    ],
    healthChecks: ['季节 + 波段维度都有值', '至少一个波段销售目标 > 0'],
};

const otb: MerchBusinessModule = {
    tabKey: 'otb',
    dashboardKey: 'otb',
    label: 'OTB预算',
    icon: '💰',
    role: '年度/季节/波段/渠道/品类采购预算 → 净新增 OTB',
    requiredMetrics: [
        'otbBudget', 'otbUsed', 'otbRemaining', 'otbUsageRate', 'purchaseBudget',
        'netNewOtb', 'sellThroughRate', 'inventoryCost',
    ],
    outputMetrics: [
        'otbBudget', 'otbUsed', 'otbRemaining', 'purchaseBudget', 'netNewOtb',
    ],
    requiredDimensions: ['season', 'wave', 'category', 'channel'],
    upstreamTabs: ['annual-control', 'category-ops', 'wave-planning', 'forecast', 'inventory-health'],
    downstreamTabs: ['cashflow', 'pnl', 'inventory-health'],
    businessQuestions: [
        'OTB 预算是否按销售/库存目标分配到位？',
        '已使用/剩余 OTB 是否需要在波段/品类间调剂？',
        '净新增 OTB 是否会引发现金流压力？',
    ],
    healthChecks: ['otbBudget 与 otbUsed 同时存在', '与现金流和库存健康有可见联动'],
};

const cashflow: MerchBusinessModule = {
    tabKey: 'cashflow',
    dashboardKey: 'cashflow',
    label: '现金流',
    icon: '💧',
    role: '采购付款、销售回款、现金缺口、库存占款',
    requiredMetrics: [
        'purchasePayment', 'salesCollection', 'netCashflow', 'cashBalance',
        'cashGap', 'inventoryCapital',
    ],
    outputMetrics: [
        'cashGap', 'cashBalance', 'inventoryCapital',
    ],
    requiredDimensions: ['month', 'channel'],
    upstreamTabs: ['otb', 'forecast', 'inventory-health'],
    downstreamTabs: ['annual-control', 'otb', 'pnl'],
    businessQuestions: [
        '未来 3-6 个月是否会出现现金缺口？',
        '采购付款节奏与销售回款节奏是否匹配？',
        '库存占款是否过度挤压现金？',
    ],
    healthChecks: ['采购付款 + 销售回款指标都存在', '现金缺口可计算'],
};

const forecast: MerchBusinessModule = {
    tabKey: 'forecast',
    dashboardKey: 'forecast',
    label: '销售预测',
    icon: '📈',
    role: '销售预测、场景模拟、预测准确率',
    requiredMetrics: [
        'salesAmount', 'salesPairs', 'avgSellingPrice', 'yoyGrowth', 'momGrowth',
        'salesAchievementRate',
    ],
    outputMetrics: [
        'salesAmount', 'salesPairs', 'salesAchievementRate',
    ],
    requiredDimensions: ['month', 'wave', 'category', 'channel'],
    upstreamTabs: ['annual-control', 'region-store', 'category-ops', 'wave-planning', 'competitor-trend'],
    downstreamTabs: ['otb', 'cashflow', 'pnl', 'inventory-health'],
    businessQuestions: [
        '当前销售节奏能否完成季度/年度目标？',
        '不同情景（保守/中性/激进）下的预测差异？',
        '哪些品类/渠道存在显著低/超预期风险？',
    ],
    healthChecks: ['存在年度/季度目标', '预测周期 ≥ 3 个月'],
};

const pnl: MerchBusinessModule = {
    tabKey: 'pnl',
    dashboardKey: 'profit-loss',
    label: '损益表',
    icon: '💹',
    role: '收入、成本、毛利、费用、利润',
    requiredMetrics: [
        'revenue', 'cogs', 'opex', 'grossMarginRate', 'netProfit', 'netProfitRate',
        'breakEvenSales', 'discountRate',
    ],
    outputMetrics: [
        'revenue', 'netProfit', 'netProfitRate', 'breakEvenSales',
    ],
    requiredDimensions: ['month', 'category', 'channel'],
    upstreamTabs: ['forecast', 'otb', 'cashflow', 'region-store'],
    downstreamTabs: ['annual-control', 'category-ops', 'overview'],
    businessQuestions: [
        '净利率是否达到年度目标？',
        '哪些品类/渠道在侵蚀整体毛利？',
        '盈亏平衡销售额与当前预测的差距？',
    ],
    healthChecks: ['收入 + 销售成本 + 运营费用都有数据', '毛利率 > 0'],
};

const competitorTrend: MerchBusinessModule = {
    tabKey: 'competitor-trend',
    dashboardKey: 'competitor',
    label: '竞品&趋势',
    icon: '🧭',
    role: '竞品价格、折扣、热销、市场机会',
    requiredMetrics: [
        'avgSellingPrice', 'discountRate', 'newProductRatio', 'priceBandSalesRatio',
        'categorySalesRatio',
    ],
    outputMetrics: [
        'avgSellingPrice', 'discountRate', 'newProductRatio',
    ],
    requiredDimensions: ['competitor', 'price_band', 'category'],
    upstreamTabs: [],
    downstreamTabs: ['consumer', 'category-ops', 'wave-planning', 'forecast'],
    businessQuestions: [
        '我们的价格带与折扣力度相对竞品如何？',
        '竞品热销款集中在哪些价格带与品类？',
        '哪些趋势机会值得在下一波段切入？',
    ],
    healthChecks: ['竞品维度有 ≥ 2 个值', '至少一个价格带可对比'],
};

const inventoryHealth: MerchBusinessModule = {
    tabKey: 'inventory-health',
    dashboardKey: 'inventory',
    label: '库存健康',
    icon: '📦',
    role: '库存结构、WOS、售罄率、断码、库龄、清货',
    requiredMetrics: [
        'inventoryCost', 'inventoryPairs', 'sellThroughRate', 'weeksOfSupply',
        'brokenSizeRate', 'fullSizeRate', 'agedInventory', 'inventoryTurnover',
    ],
    outputMetrics: [
        'inventoryCost', 'sellThroughRate', 'weeksOfSupply', 'brokenSizeRate', 'agedInventory',
    ],
    requiredDimensions: ['region', 'channel', 'category', 'season'],
    upstreamTabs: ['forecast', 'otb', 'category-ops', 'wave-planning'],
    downstreamTabs: ['otb', 'cashflow', 'category-ops', 'annual-control'],
    businessQuestions: [
        '哪些品类/区域库存周转过慢？',
        '断码与齐码情况是否影响销售？',
        '清货建议与 OTB 调整应该在哪些 SKU 上落地？',
    ],
    healthChecks: ['库存指标 ≥ 4 个有数据', '与 OTB / 现金流可联动'],
};

export const MERCH_BUSINESS_MODULES: Record<TabKey, MerchBusinessModule> = {
    'overview':          overview,
    'annual-control':    annualControl,
    'brand-positioning': brandPositioning,
    'region-store':      regionStore,
    'consumer':          consumer,
    'category-ops':      categoryOps,
    'wave-planning':     wavePlanning,
    'otb':               otb,
    'cashflow':          cashflow,
    'forecast':          forecast,
    'pnl':               pnl,
    'competitor-trend':  competitorTrend,
    'inventory-health':  inventoryHealth,
};

export const MERCH_BUSINESS_MODULE_LIST: MerchBusinessModule[] = [
    overview, annualControl, brandPositioning, regionStore, consumer, categoryOps,
    wavePlanning, otb, cashflow, forecast, pnl, competitorTrend, inventoryHealth,
];

export function getModule(tabKey: TabKey): MerchBusinessModule {
    return MERCH_BUSINESS_MODULES[tabKey];
}

export function getDashboardKeyForModule(tabKey: TabKey): DashboardTab {
    return CONFIG_TAB_TO_DASHBOARD_TAB[tabKey];
}
