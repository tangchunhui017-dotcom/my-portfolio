export type MerchPlanningTabKey =
    | 'planning'
    | 'forecast'
    | 'otb'
    | 'cashflow'
    | 'profit-loss'
    | 'inventory';

export type MerchDataLayer = 'dimension' | 'planning' | 'fact' | 'workflow' | 'config';
export type MerchUpdateCadence = 'static' | 'seasonal' | 'weekly' | 'daily' | 'near-real-time';

export interface MerchDataTableContract {
    id: string;
    label: string;
    layer: MerchDataLayer;
    grain: string;
    owner: string;
    sourceSystem: string;
    updateCadence: MerchUpdateCadence;
    primaryKeys: string[];
    requiredFields: string[];
    description: string;
}

export interface MerchPlanningFlowStep {
    tab: MerchPlanningTabKey;
    label: string;
    responsibility: string;
    reads: string[];
    writes: string[];
    upstreamTabs: MerchPlanningTabKey[];
    downstreamTabs: MerchPlanningTabKey[];
    dailyInputs: string[];
    feishuWorkflowInputs: string[];
    enterpriseSources: string[];
    validationRules: string[];
}

export const WAVE_KEY_FIELDS = ['fiscalYear', 'seasonCode', 'waveCode'] as const;
export const WAVE_KEY_FORMAT = 'YYYY-SEASON-WAVE';

export const PLANNING_MOCK_DATA_FILES = {
    wavePlanMaster: 'data/planning/wave_plan_master.json',
    wavePlanBrief: 'data/planning/wave_plan_brief.json',
    waveDevelopmentProgress: 'data/planning/wave_development_progress.json',
    waveCategoryMix: 'data/planning/wave_category_mix.json',
    salesForecastPlan: 'data/planning/sales_forecast_plan.json',
    salesForecastChannelDriver: 'data/planning/sales_forecast_channel_driver.json',
    salesForecastStoreGrade: 'data/planning/sales_forecast_store_grade.json',
    salesForecastEcommerceFunnel: 'data/planning/sales_forecast_ecommerce_funnel.json',
    salesForecastCampaignCalendar: 'data/planning/sales_forecast_campaign_calendar.json',
    salesForecastNewStorePlan: 'data/planning/sales_forecast_new_store_plan.json',
    salesForecastSizeCurve: 'data/planning/sales_forecast_size_curve.json',
    pnlBrandAnnual: 'data/planning/pnl_brand_annual.json',
    pnlChannelContribution: 'data/planning/pnl_channel_contribution.json',
    pnlCategoryContribution: 'data/planning/pnl_category_contribution.json',
    pnlDiscountErosion: 'data/planning/pnl_discount_erosion.json',
    pnlStoreModelAssumptions: 'data/planning/pnl_store_model_assumptions.json',
    otbBudgetPlan: 'data/planning/otb_budget_plan.json',
    purchasePaymentPlan: 'data/planning/purchase_payment_plan.json',
    inventoryTargetPlan: 'data/planning/inventory_target_plan.json',
    feishuWorkflowTasks: 'data/planning/feishu_workflow_tasks.json',
} as const;

export function normalizePlanningSeasonCode(season: string | undefined): string {
    const value = String(season || '').trim().toUpperCase();
    if (value.includes('SS') || value.includes('春夏')) return 'SS';
    if (value.includes('AW') || value.includes('秋冬')) return 'AW';
    return value || 'UNKNOWN';
}

export function normalizePlanningWaveCode(wave: string | undefined): string {
    const value = String(wave || '').trim().toUpperCase();
    if (!value) return 'UNKNOWN';
    return value.replace(/^W0?(\d+)/, '$1');
}

export function buildPlanningWaveKey(
    fiscalYear: number | string,
    seasonCode: string,
    waveCode: string,
): string {
    return [
        String(fiscalYear),
        normalizePlanningSeasonCode(seasonCode),
        normalizePlanningWaveCode(waveCode),
    ].join('-');
}

export const MERCH_DATA_TABLES: MerchDataTableContract[] = [
    {
        id: 'dim_wave',
        label: '波段主维表',
        layer: 'dimension',
        grain: '财年 x 大季 x 波段',
        owner: '商品企划',
        sourceSystem: '企划中台/飞书表格，后续可由PLM或MDM同步',
        updateCadence: 'seasonal',
        primaryKeys: ['fiscalYear', 'seasonCode', 'waveCode'],
        requiredFields: ['waveKey', 'launchDate', 'launchMonth', 'waveRole', 'seasonLabel'],
        description: '统一所有页面的波段编码、上市日期、波段角色和季节归属。',
    },
    {
        id: 'dim_product_sku',
        label: '商品SKU主数据',
        layer: 'dimension',
        grain: 'SKU',
        owner: '商品资料/主数据',
        sourceSystem: 'ERP/PLM/MDM',
        updateCadence: 'daily',
        primaryKeys: ['skuId'],
        requiredFields: ['skuId', 'styleId', 'categoryId', 'priceBand', 'lifecycle'],
        description: '承接企业系统里的款、色、码、品类、吊牌价、生命周期等基础资料。',
    },
    {
        id: 'dim_category',
        label: '品类层级维表',
        layer: 'dimension',
        grain: '品类节点',
        owner: '商品运营',
        sourceSystem: 'MDM/类目中心',
        updateCadence: 'static',
        primaryKeys: ['categoryId'],
        requiredFields: ['categoryId', 'categoryName', 'categoryLevel'],
        description: '统一波段企划、销售预测、OTB、库存健康的品类口径。',
    },
    {
        id: 'dim_channel_store',
        label: '渠道门店维表',
        layer: 'dimension',
        grain: '渠道/门店',
        owner: '渠道运营',
        sourceSystem: '门店系统/CRM/电商后台',
        updateCadence: 'daily',
        primaryKeys: ['channelId', 'storeId'],
        requiredFields: ['channelType', 'region', 'cityTier', 'storeFormat'],
        description: '支撑区域门店、销售预测、现金流回款和渠道损益。',
    },
    {
        id: 'plan_wave_master',
        label: '波段企划总表',
        layer: 'planning',
        grain: '财年 x 大季 x 波段',
        owner: '商品企划',
        sourceSystem: PLANNING_MOCK_DATA_FILES.wavePlanMaster,
        updateCadence: 'weekly',
        primaryKeys: ['waveKey'],
        requiredFields: ['waveKey', 'plannedStyleCount', 'targetSkuCount', 'mainCategory', 'sellThroughTarget'],
        description: '维护波段、上市日期、主题、主推品类、款数、SKU、深度、售罄目标等结构性计划。',
    },
    {
        id: 'plan_wave_brief',
        label: '波段企划Brief表',
        layer: 'planning',
        grain: 'waveKey',
        owner: '商品企划/设计',
        sourceSystem: PLANNING_MOCK_DATA_FILES.wavePlanBrief,
        updateCadence: 'weekly',
        primaryKeys: ['waveKey'],
        requiredFields: ['waveKey', 'consumerScene', 'targetAudience', 'channelFocus', 'designTheme', 'coreSizeRange'],
        description: '维护每个波段的消费场景、目标客群、渠道重点、设计主题、颜色材质和核心尺码段。',
    },
    {
        id: 'plan_wave_category_mix',
        label: '波段品类结构表',
        layer: 'planning',
        grain: 'waveKey x categoryId',
        owner: '商品企划',
        sourceSystem: PLANNING_MOCK_DATA_FILES.waveCategoryMix,
        updateCadence: 'weekly',
        primaryKeys: ['waveKey', 'categoryId'],
        requiredFields: ['plannedStyleCount', 'plannedSkuCount', 'salesShare'],
        description: '把波段企划拆到品类，供销售预测、OTB和库存目标使用。',
    },
    {
        id: 'plan_sales_forecast',
        label: '销售预测计划表',
        layer: 'planning',
        grain: 'month x channel x category x waveKey',
        owner: '经营分析/商品计划',
        sourceSystem: PLANNING_MOCK_DATA_FILES.salesForecastPlan,
        updateCadence: 'weekly',
        primaryKeys: ['forecastVersion', 'month', 'channelId', 'categoryId', 'waveKey'],
        requiredFields: ['forecastSalesAmount', 'forecastUnits', 'scenario'],
        description: '输出未来销售额、销量和情景版本，是OTB、现金流、损益的共同上游。',
    },
    {
        id: 'plan_sales_forecast_channel_driver',
        label: '销售预测区域气候驱动表',
        layer: 'planning',
        grain: 'forecastVersion x scenario x channelType x region',
        owner: '经营分析/渠道运营',
        sourceSystem: PLANNING_MOCK_DATA_FILES.salesForecastChannelDriver,
        updateCadence: 'weekly',
        primaryKeys: ['forecastVersion', 'scenario', 'channelType', 'region'],
        requiredFields: ['avgMonthlyTempC', 'mainCategoryByMonth', 'forecastMonthlyCny', 'tempMatchStatus'],
        description: '支撑实体店预测，把区域气温、主推品类和月度销售节奏绑定，避免全国同一上市节奏套用到所有区域。',
    },
    {
        id: 'plan_sales_forecast_store_grade',
        label: '销售预测门店等级表',
        layer: 'planning',
        grain: 'forecastVersion x scenario x channelType x storeGrade',
        owner: '经营分析/零售运营',
        sourceSystem: PLANNING_MOCK_DATA_FILES.salesForecastStoreGrade,
        updateCadence: 'weekly',
        primaryKeys: ['forecastVersion', 'scenario', 'channelType', 'storeGrade'],
        requiredFields: ['storeCount', 'salesPerStoreMonthlyCny', 'forecastAnnualCny', 'salesPerSqmMonthly'],
        description: '按门店等级拆解实体店销售目标，用店效、坪效、客流、转化率和客单价校验预测可达性。',
    },
    {
        id: 'plan_sales_forecast_ecommerce_funnel',
        label: '销售预测电商漏斗表',
        layer: 'planning',
        grain: 'forecastVersion x scenario x channelType x platform x month',
        owner: '经营分析/电商运营',
        sourceSystem: PLANNING_MOCK_DATA_FILES.salesForecastEcommerceFunnel,
        updateCadence: 'weekly',
        primaryKeys: ['forecastVersion', 'scenario', 'channelType', 'platform', 'month'],
        requiredFields: ['impressions', 'visitors', 'conversionRate', 'avgOrderValue', 'netSalesCny', 'refundRate'],
        description: '把电商GMV拆成曝光、访客、转化、客单、退款、费用率，防止只用同比增速粗暴外推。',
    },
    {
        id: 'plan_sales_forecast_campaign_calendar',
        label: '销售预测活动日历表',
        layer: 'planning',
        grain: 'forecastVersion x scenario x channelType x campaignName',
        owner: '经营分析/电商运营/商品企划',
        sourceSystem: PLANNING_MOCK_DATA_FILES.salesForecastCampaignCalendar,
        updateCadence: 'weekly',
        primaryKeys: ['forecastVersion', 'scenario', 'channelType', 'campaignName'],
        requiredFields: ['month', 'targetGmvCny', 'discountRate', 'adBudgetCny', 'waveKey'],
        description: '维护大促目标、折扣、投放和承接波段，用统一waveKey把营销节点、货盘和OTB串起来。',
    },
    {
        id: 'plan_sales_forecast_new_store',
        label: '销售预测新店爬坡表',
        layer: 'planning',
        grain: 'forecastVersion x scenario x storeId',
        owner: '经营分析/拓展/零售运营',
        sourceSystem: PLANNING_MOCK_DATA_FILES.salesForecastNewStorePlan,
        updateCadence: 'weekly',
        primaryKeys: ['forecastVersion', 'scenario', 'storeId'],
        requiredFields: ['storeOpenMonth', 'storeType', 'firstBatchBudgetCny', 'rampCurve', 'targetYear1AnnualCny'],
        description: '维护新店首批货预算、SKU宽度、开业费用、成熟店模型和月度爬坡曲线。',
    },
    {
        id: 'plan_sales_forecast_size_curve',
        label: '销售预测尺码曲线表',
        layer: 'planning',
        grain: 'forecastVersion x scenario x waveKey x channelType x categoryId x sizeSegment',
        owner: '商品企划/商品运营',
        sourceSystem: PLANNING_MOCK_DATA_FILES.salesForecastSizeCurve,
        updateCadence: 'weekly',
        primaryKeys: ['forecastVersion', 'scenario', 'waveKey', 'channelType', 'categoryId', 'sizeSegment'],
        requiredFields: ['sizes', 'coreSizeCoverageRate', 'edgeSizeOverweightRisk', 'breakSizeRisk'],
        description: '用尺码预测和库存占比校验核心码覆盖、边缘码超备和断码风险，并回写到波段货量建议。',
    },
    {
        id: 'plan_otb_budget',
        label: 'OTB预算表',
        layer: 'planning',
        grain: 'version x waveKey x categoryId',
        owner: '商品计划/采购',
        sourceSystem: PLANNING_MOCK_DATA_FILES.otbBudgetPlan,
        updateCadence: 'weekly',
        primaryKeys: ['otbVersion', 'waveKey', 'categoryId'],
        requiredFields: ['plannedPurchaseAmount', 'approvedPurchaseAmount', 'sellThroughTarget'],
        description: '维护采购预算、审批预算、预算差异和采购约束。',
    },
    {
        id: 'plan_purchase_payment',
        label: '采购付款排期表',
        layer: 'planning',
        grain: 'waveKey x supplierId x paymentNode',
        owner: '采购/财务',
        sourceSystem: PLANNING_MOCK_DATA_FILES.purchasePaymentPlan,
        updateCadence: 'daily',
        primaryKeys: ['waveKey', 'supplierId', 'paymentNode'],
        requiredFields: ['paymentMonth', 'paymentAmount', 'paymentRatio'],
        description: '现金流读取的采购付款来源，真实业务中应由采购订单和合同账期回写。',
    },
    {
        id: 'plan_cashflow_monthly',
        label: '现金流预测表',
        layer: 'planning',
        grain: 'month x scenario',
        owner: '财务',
        sourceSystem: '现金流引擎/财务修正，当前由统一planning表推导',
        updateCadence: 'daily',
        primaryKeys: ['month', 'scenario'],
        requiredFields: ['cashInFromSales', 'cashOutForPurchase', 'endingCashBalance'],
        description: '汇总销售回款、采购付款、费用支出和资金缺口。',
    },
    {
        id: 'plan_pnl_monthly',
        label: '损益预测表',
        layer: 'planning',
        grain: 'month x channel x category',
        owner: '财务/经营分析',
        sourceSystem: '损益引擎/财务口径',
        updateCadence: 'weekly',
        primaryKeys: ['month', 'channelId', 'categoryId', 'scenario'],
        requiredFields: ['netSalesAmount', 'grossProfit', 'operatingExpense', 'netProfit'],
        description: '承接销售预测、毛利口径和费用率，输出渠道/品类贡献利润。',
    },
    {
        id: 'plan_pnl_brand_annual',
        label: '品牌年度损益规划表',
        layer: 'planning',
        grain: 'brand x fiscalYear',
        owner: '财务总监/商品企划负责人',
        sourceSystem: PLANNING_MOCK_DATA_FILES.pnlBrandAnnual,
        updateCadence: 'weekly',
        primaryKeys: ['brandId', 'fiscalYear'],
        requiredFields: ['grossRevenue', 'netRevenue', 'grossProfit', 'ebit', 'netProfit', 'monthlyBreakdown', 'waterfallItems'],
        description: '统一承接品牌年度 P&L，从吊牌 GMV、折扣、退货、COGS、毛利、费用到 EBIT 和净利润，并提供月度趋势和预算差异。',
    },
    {
        id: 'plan_pnl_channel_contribution',
        label: '渠道贡献利润规划表',
        layer: 'planning',
        grain: 'brand x fiscalYear x channel',
        owner: '渠道经营负责人/财务BP',
        sourceSystem: PLANNING_MOCK_DATA_FILES.pnlChannelContribution,
        updateCadence: 'weekly',
        primaryKeys: ['brandId', 'fiscalYear', 'channelId'],
        requiredFields: ['netRevenue', 'grossProfit', 'channelExpense', 'contributionProfit', 'judgement'],
        description: '拆解实体店、电商、新店、加盟等渠道的净收入、毛利、费用和贡献利润，用于判断渠道真实利润质量。',
    },
    {
        id: 'plan_pnl_category_contribution',
        label: '品类贡献利润规划表',
        layer: 'planning',
        grain: 'brand x fiscalYear x category',
        owner: '品类负责人/商品企划负责人',
        sourceSystem: PLANNING_MOCK_DATA_FILES.pnlCategoryContribution,
        updateCadence: 'weekly',
        primaryKeys: ['brandId', 'fiscalYear', 'categoryId'],
        requiredFields: ['salesMix', 'grossMarginRate', 'allocatedExpense', 'contributionProfit', 'merchandisingAction'],
        description: '拆解鞋类核心品类的销售占比、毛利率、费用分摊和贡献利润，支撑品类结构、价格带和促销动作调整。',
    },
    {
        id: 'plan_pnl_discount_erosion',
        label: '折扣侵蚀规划表',
        layer: 'planning',
        grain: 'brand x fiscalYear x discountBand',
        owner: '商品运营/财务BP',
        sourceSystem: PLANNING_MOCK_DATA_FILES.pnlDiscountErosion,
        updateCadence: 'weekly',
        primaryKeys: ['brandId', 'fiscalYear', 'discountBand'],
        requiredFields: ['salesShare', 'fullPriceEquivalent', 'discountLoss', 'actualGrossProfit'],
        description: '按正价、活动折扣和清货折扣拆解全价等效销售、折扣损失和实际毛利，识别清货促销对利润的侵蚀。',
    },
    {
        id: 'plan_pnl_store_model_assumptions',
        label: '单店损益模型假设表',
        layer: 'planning',
        grain: 'storeType',
        owner: '零售运营/财务BP/拓展负责人',
        sourceSystem: PLANNING_MOCK_DATA_FILES.pnlStoreModelAssumptions,
        updateCadence: 'weekly',
        primaryKeys: ['storeTypeId'],
        requiredFields: ['trafficPerMonth', 'conversionRate', 'avgTicket', 'pairsPerOrder', 'fixedRentPerMonth', 'propertyFee', 'deposit', 'fitoutInvestment', 'firstBatchInventory'],
        description: '维护旗舰店、标准店、街铺的客流、转化、客单、连带、租金、物业、押金、装修和首批货假设，驱动单店盈亏平衡测算。',
    },
    {
        id: 'plan_inventory_target',
        label: '库存目标表',
        layer: 'planning',
        grain: 'waveKey x categoryId x channelId',
        owner: '商品运营/库存计划',
        sourceSystem: PLANNING_MOCK_DATA_FILES.inventoryTargetPlan,
        updateCadence: 'weekly',
        primaryKeys: ['waveKey', 'categoryId', 'channelId'],
        requiredFields: ['targetWos', 'targetEndingInventory', 'clearanceAction'],
        description: '维护库存周转目标、期末库存和清货动作，反向约束OTB。',
    },
    {
        id: 'fact_sales_daily',
        label: '日销售事实表',
        layer: 'fact',
        grain: 'date x skuId x store/channel',
        owner: '数据平台',
        sourceSystem: 'POS/电商订单',
        updateCadence: 'daily',
        primaryKeys: ['date', 'skuId', 'channelId'],
        requiredFields: ['netSalesAmount', 'soldUnits', 'grossProfitAmount'],
        description: '销售预测、损益、库存健康的每日事实来源。',
    },
    {
        id: 'fact_inventory_daily',
        label: '日库存事实表',
        layer: 'fact',
        grain: 'date x skuId x warehouse/store',
        owner: '数据平台',
        sourceSystem: 'WMS/门店库存',
        updateCadence: 'daily',
        primaryKeys: ['date', 'skuId', 'stockLocationId'],
        requiredFields: ['onHandUnits', 'inventoryAmount', 'ageDays'],
        description: '库存健康、OTB预算修正、清货现金流的每日事实来源。',
    },
    {
        id: 'fact_purchase_order',
        label: '采购订单事实表',
        layer: 'fact',
        grain: 'purchaseOrderId x skuId',
        owner: '采购/数据平台',
        sourceSystem: 'ERP/采购系统',
        updateCadence: 'daily',
        primaryKeys: ['purchaseOrderId', 'skuId'],
        requiredFields: ['waveKey', 'orderedAmount', 'orderedUnits', 'orderDate'],
        description: '执行跟踪、现金流付款和预算占用的真实采购来源。',
    },
    {
        id: 'fact_inbound',
        label: '入仓事实表',
        layer: 'fact',
        grain: 'inboundId x skuId',
        owner: '仓储/数据平台',
        sourceSystem: 'WMS',
        updateCadence: 'daily',
        primaryKeys: ['inboundId', 'skuId'],
        requiredFields: ['waveKey', 'inboundDate', 'inboundUnits', 'inboundAmount'],
        description: '到货执行率、库存健康和上市履约的真实来源。',
    },
    {
        id: 'workflow_feishu_task',
        label: '飞书任务进度表',
        layer: 'workflow',
        grain: 'taskId',
        owner: 'PMO/各业务负责人',
        sourceSystem: PLANNING_MOCK_DATA_FILES.feishuWorkflowTasks,
        updateCadence: 'near-real-time',
        primaryKeys: ['taskId'],
        requiredFields: ['waveKey', 'owner', 'taskStatus', 'dueDate', 'sourceTab'],
        description: '承接设计、核价、下单、入仓、审批等业务进度，驱动各TAB状态。',
    },
    {
        id: 'workflow_wave_development_progress',
        label: '波段开发进度闸口表',
        layer: 'workflow',
        grain: 'waveKey x taskType',
        owner: '商品企划/设计/采购/物流',
        sourceSystem: PLANNING_MOCK_DATA_FILES.waveDevelopmentProgress,
        updateCadence: 'daily',
        primaryKeys: ['waveKey', 'taskType'],
        requiredFields: ['waveKey', 'taskType', 'deadline', 'status', 'progress', 'owner'],
        description: '维护企划确认、设计稿、样品评审、核价、下单、入仓、上市和复盘节点，供波段企划风险行动板读取。',
    },
    {
        id: 'dq_exception',
        label: '数据质量异常表',
        layer: 'workflow',
        grain: 'exceptionId',
        owner: '数据治理/业务Owner',
        sourceSystem: '数据校验任务',
        updateCadence: 'daily',
        primaryKeys: ['exceptionId'],
        requiredFields: ['tableId', 'businessKey', 'severity', 'message', 'owner'],
        description: '记录缺波段、缺品类、预算不平、日期倒挂等异常，避免业务表越维护越乱。',
    },
];

export const MERCH_PLANNING_FLOW: MerchPlanningFlowStep[] = [
    {
        tab: 'planning',
        label: '波段企划',
        responsibility: '定义上市节奏、波段角色、品类结构、款数、SKU、深度和关键节点。',
        reads: ['dim_wave', 'dim_category', 'dim_product_sku', 'fact_sales_daily', 'fact_inventory_daily'],
        writes: ['plan_wave_master', 'plan_wave_brief', 'plan_wave_category_mix', 'workflow_wave_development_progress', 'workflow_feishu_task'],
        upstreamTabs: ['forecast', 'inventory'],
        downstreamTabs: ['forecast', 'otb', 'inventory'],
        dailyInputs: ['新增/调整波段', '款数/SKU/品类结构变更', '上市日期或节点调整'],
        feishuWorkflowInputs: ['设计开发完成率', '核价完成率', '样品评审状态', '企划审批状态'],
        enterpriseSources: ['PLM款式资料', '历史销售', '历史库存'],
        validationRules: [
            'waveKey必须唯一',
            '波段品类结构合计必须等于波段计划SKU或款数',
            '上市日期、下单截止、入仓截止必须符合先后顺序',
        ],
    },
    {
        tab: 'forecast',
        label: '销售预测',
        responsibility: '把历史销售、渠道目标和波段结构转为月度/渠道/品类/波段销售预测。',
        reads: ['plan_wave_master', 'plan_wave_category_mix', 'fact_sales_daily', 'dim_channel_store'],
        writes: [
            'plan_sales_forecast',
            'plan_sales_forecast_channel_driver',
            'plan_sales_forecast_store_grade',
            'plan_sales_forecast_ecommerce_funnel',
            'plan_sales_forecast_campaign_calendar',
            'plan_sales_forecast_new_store',
            'plan_sales_forecast_size_curve',
        ],
        upstreamTabs: ['planning', 'inventory'],
        downstreamTabs: ['otb', 'cashflow', 'profit-loss'],
        dailyInputs: ['预测版本切换', '增长率/季节指数调整', '渠道计划修正'],
        feishuWorkflowInputs: ['预测确认状态', '渠道反馈', '经营会修正意见'],
        enterpriseSources: ['POS销售', '电商订单', '门店计划'],
        validationRules: [
            '预测版本必须冻结后才能进入正式OTB',
            '月度预测合计必须等于年度/季节目标',
            '渠道与品类拆分占比必须合计为100%',
        ],
    },
    {
        tab: 'otb',
        label: 'OTB预算',
        responsibility: '把销售预测、库存目标和波段结构转为采购预算、审批预算和采购付款计划。',
        reads: ['plan_wave_master', 'plan_wave_category_mix', 'plan_sales_forecast', 'plan_inventory_target'],
        writes: ['plan_otb_budget', 'plan_purchase_payment', 'workflow_feishu_task'],
        upstreamTabs: ['planning', 'forecast', 'inventory'],
        downstreamTabs: ['cashflow', 'profit-loss', 'inventory'],
        dailyInputs: ['预算版本', '采购金额调整', '订单/到货节点变更', '供应商账期'],
        feishuWorkflowInputs: ['预算审批状态', '采购下单状态', '变更申请'],
        enterpriseSources: ['ERP采购订单', '预算系统', '供应商合同'],
        validationRules: [
            'OTB预算必须绑定waveKey和版本',
            '审批预算不能直接覆盖企划款数/SKU',
            '采购付款排期合计必须等于审批采购预算或订单金额',
        ],
    },
    {
        tab: 'cashflow',
        label: '现金流',
        responsibility: '用销售回款、采购付款和费用支出预测资金缺口与授信需求。',
        reads: ['plan_sales_forecast', 'plan_purchase_payment', 'fact_purchase_order', 'fact_inbound'],
        writes: ['plan_cashflow_monthly'],
        upstreamTabs: ['forecast', 'otb'],
        downstreamTabs: ['otb', 'profit-loss'],
        dailyInputs: ['采购付款节点', '回款账期', '费用支出', '清货回款模拟'],
        feishuWorkflowInputs: ['付款审批', '授信审批', '清货动作确认'],
        enterpriseSources: ['ERP应付', '银行流水', '财务费用台账'],
        validationRules: [
            '付款月份必须来自订单、合同或OTB付款计划',
            '现金流缺口需要回写OTB风险',
            '清货回款模拟不得覆盖真实销售回款',
        ],
    },
    {
        tab: 'profit-loss',
        label: '损益',
        responsibility: '用销售预测、毛利、折扣、费用率和采购成本预测利润贡献。',
        reads: ['plan_sales_forecast', 'plan_otb_budget', 'fact_sales_daily', 'dim_channel_store'],
        writes: [
            'plan_pnl_monthly',
            'plan_pnl_brand_annual',
            'plan_pnl_channel_contribution',
            'plan_pnl_category_contribution',
            'plan_pnl_discount_erosion',
            'plan_pnl_store_model_assumptions',
        ],
        upstreamTabs: ['forecast', 'otb', 'cashflow'],
        downstreamTabs: ['otb', 'inventory'],
        dailyInputs: ['毛利率口径', '渠道费用率', '折扣/清货规则', '费用调整'],
        feishuWorkflowInputs: ['经营会利润目标确认', '费用审批状态'],
        enterpriseSources: ['财务总账', '渠道费用', '采购成本'],
        validationRules: [
            '销售收入口径必须与预测版本一致',
            '毛利率与采购成本不能混用不同版本',
            '损益低于阈值时必须生成预算或结构调整建议',
        ],
    },
    {
        tab: 'inventory',
        label: '库存健康',
        responsibility: '监控WOS、库龄、断码、积压和清货动作，反向约束下一轮波段与OTB。',
        reads: ['fact_inventory_daily', 'fact_sales_daily', 'fact_inbound', 'plan_wave_master', 'plan_otb_budget'],
        writes: ['plan_inventory_target', 'workflow_feishu_task'],
        upstreamTabs: ['planning', 'otb', 'forecast'],
        downstreamTabs: ['planning', 'forecast', 'otb', 'cashflow'],
        dailyInputs: ['库存快照', '入仓进度', '断码状态', '清货动作进度'],
        feishuWorkflowInputs: ['清货任务', '调拨任务', '补货建议确认'],
        enterpriseSources: ['WMS库存', 'POS销售', 'ERP入库'],
        validationRules: [
            '库存事实必须按日期保留快照，不覆盖历史',
            '库存健康动作必须绑定SKU/品类/波段',
            '积压清货金额要同步现金流模拟，不能重复计入销售预测',
        ],
    },
];

const TABLE_BY_ID = new Map(MERCH_DATA_TABLES.map((table) => [table.id, table]));
const FLOW_BY_TAB = new Map(MERCH_PLANNING_FLOW.map((step) => [step.tab, step]));

export function getMerchDataTableContract(tableId: string): MerchDataTableContract | undefined {
    return TABLE_BY_ID.get(tableId);
}

export function getMerchPlanningFlowStep(tab: MerchPlanningTabKey): MerchPlanningFlowStep {
    const step = FLOW_BY_TAB.get(tab);
    if (!step) throw new Error(`Unknown merch planning tab: ${tab}`);
    return step;
}

export function getMerchPlanningTablesForTab(tab: MerchPlanningTabKey): MerchDataTableContract[] {
    const step = getMerchPlanningFlowStep(tab);
    return [...new Set([...step.reads, ...step.writes])]
        .map((tableId) => TABLE_BY_ID.get(tableId))
        .filter((table): table is MerchDataTableContract => Boolean(table));
}

export function getMerchPlanningDownstreamTabs(tab: MerchPlanningTabKey): MerchPlanningTabKey[] {
    return getMerchPlanningFlowStep(tab).downstreamTabs;
}
