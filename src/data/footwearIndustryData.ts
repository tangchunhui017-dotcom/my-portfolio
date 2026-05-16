// AUTO-GENERATED from data/merch_config/_industry/footwear/ — do not edit manually
// This file exists to avoid Turbopack JSON-bundling issues with underscore-prefixed paths.

export const FOOTWEAR_INDUSTRY_DATA = {
  "industryMeta": {
    "id": "footwear",
    "label": "鞋类",
    "version": "1.0.0",
    "description": "鞋类商品企划行业模板",
    "supportedTabs": [
      "overview",
      "annual-control",
      "region-store",
      "consumer",
      "category-ops",
      "wave-planning",
      "otb",
      "cashflow",
      "forecast",
      "pnl",
      "competitor-trend",
      "inventory-health"
    ],
    "createdAt": "2026-05-14"
  },
  "metrics": [
    {
      "metricId": "salesAmount",
      "label": "销售额",
      "description": "实际成交金额（含折扣）",
      "unit": "currency",
      "formula": "salesPairs * avgSellingPrice",
      "defaultMetricType": "standard",
      "usedBy": [
        "overview",
        "annual-control",
        "region-store",
        "category-ops",
        "wave-planning",
        "otb",
        "forecast",
        "pnl",
        "inventory-health"
      ],
      "category": "sales",
      "source": "industry"
    },
    {
      "metricId": "netSalesAmount",
      "label": "净销售额",
      "description": "销售额扣减退货金额后的净值",
      "unit": "currency",
      "formula": "salesAmount - returnAmount",
      "defaultMetricType": "standard",
      "usedBy": [
        "pnl",
        "forecast"
      ],
      "category": "sales",
      "source": "industry"
    },
    {
      "metricId": "retailSalesAmount",
      "label": "吊牌销售额",
      "description": "按零售吊牌价计算的销售金额",
      "unit": "currency",
      "formula": "salesPairs * retailPrice",
      "defaultMetricType": "reference",
      "usedBy": [
        "category-ops",
        "otb",
        "inventory-health"
      ],
      "category": "sales",
      "source": "industry"
    },
    {
      "metricId": "salesPairs",
      "label": "销售双数",
      "description": "实际销售出库的商品双数",
      "unit": "pairs",
      "formula": "sum(outbound pairs)",
      "defaultMetricType": "standard",
      "usedBy": [
        "region-store",
        "category-ops",
        "wave-planning",
        "otb",
        "forecast"
      ],
      "category": "sales",
      "source": "industry"
    },
    {
      "metricId": "avgSellingPrice",
      "label": "平均成交价",
      "description": "销售额 / 销售双数",
      "unit": "currency",
      "formula": "salesAmount / salesPairs",
      "defaultMetricType": "standard",
      "usedBy": [
        "region-store",
        "consumer",
        "category-ops",
        "forecast",
        "competitor-trend"
      ],
      "category": "sales",
      "source": "industry"
    },
    {
      "metricId": "discountRate",
      "label": "折扣率",
      "description": "平均成交价 / 零售吊牌价，反映实际折扣力度",
      "unit": "percent",
      "formula": "avgSellingPrice / retailPrice",
      "defaultMetricType": "standard",
      "usedBy": [
        "region-store",
        "consumer",
        "otb",
        "forecast",
        "pnl",
        "competitor-trend"
      ],
      "category": "sales",
      "source": "industry"
    },
    {
      "metricId": "salesAchievementRate",
      "label": "销售达成率",
      "description": "实际销售 / 目标销售",
      "unit": "percent",
      "formula": "salesAmount / salesTarget",
      "defaultMetricType": "standard",
      "usedBy": [
        "overview",
        "annual-control",
        "region-store"
      ],
      "category": "performance",
      "source": "industry"
    },
    {
      "metricId": "yoyGrowth",
      "label": "同比增长",
      "description": "本期指标 vs 去年同期，增长幅度",
      "unit": "percent",
      "formula": "(current - lastYear) / lastYear",
      "defaultMetricType": "standard",
      "usedBy": [
        "overview",
        "forecast",
        "region-store"
      ],
      "category": "performance",
      "source": "industry"
    },
    {
      "metricId": "momGrowth",
      "label": "环比增长",
      "description": "本期指标 vs 上期，增长幅度",
      "unit": "percent",
      "formula": "(current - last) / last",
      "defaultMetricType": "standard",
      "usedBy": [
        "forecast",
        "region-store"
      ],
      "category": "performance",
      "source": "industry"
    },
    {
      "metricId": "sellThroughRate",
      "label": "售罄率",
      "description": "销售数量 / 上市可销数量，反映商品去化效率",
      "unit": "percent",
      "formula": "salesPairs / availableLaunchPairs",
      "defaultMetricType": "standard",
      "usedBy": [
        "category-ops",
        "wave-planning",
        "otb",
        "inventory-health",
        "region-store"
      ],
      "category": "inventory",
      "source": "industry"
    },
    {
      "metricId": "inventoryCost",
      "label": "库存成本",
      "description": "当前库存按采购成本价计算的金额",
      "unit": "currency",
      "formula": "inventoryPairs * costPrice",
      "defaultMetricType": "standard",
      "usedBy": [
        "overview",
        "annual-control",
        "region-store",
        "category-ops",
        "otb",
        "inventory-health"
      ],
      "category": "inventory",
      "source": "industry"
    },
    {
      "metricId": "inventoryRetail",
      "label": "吊牌库存",
      "description": "当前库存按零售吊牌价计算的金额",
      "unit": "currency",
      "formula": "inventoryPairs * retailPrice",
      "defaultMetricType": "reference",
      "usedBy": [
        "inventory-health",
        "category-ops"
      ],
      "category": "inventory",
      "source": "industry"
    },
    {
      "metricId": "sellableInventory",
      "label": "可售库存",
      "description": "排除残损、赠品后仍可销售的库存",
      "unit": "currency",
      "formula": "inventoryCost - damagedInventory - giftInventory",
      "defaultMetricType": "standard",
      "usedBy": [
        "inventory-health"
      ],
      "category": "inventory",
      "source": "industry"
    },
    {
      "metricId": "agedInventory",
      "label": "库龄库存",
      "description": "上市超过180天（秋冬90天）的滞销库存金额",
      "unit": "currency",
      "formula": "sum(inventoryCost where age > threshold)",
      "defaultMetricType": "standard",
      "usedBy": [
        "category-ops",
        "inventory-health"
      ],
      "category": "inventory",
      "source": "industry"
    },
    {
      "metricId": "weeksOfSupply",
      "label": "库存周数",
      "description": "当前库存 / 近4周平均销售速度，预估可销周数",
      "unit": "weeks",
      "formula": "inventoryPairs / avgWeeklySales",
      "defaultMetricType": "standard",
      "usedBy": [
        "region-store",
        "inventory-health"
      ],
      "category": "inventory",
      "source": "industry"
    },
    {
      "metricId": "stockToSalesRatio",
      "label": "存销比",
      "description": "月末库存 / 当月销售，反映库存压力",
      "unit": "ratio",
      "formula": "endingInventory / monthlySales",
      "defaultMetricType": "standard",
      "usedBy": [
        "region-store",
        "otb",
        "wave-planning",
        "inventory-health"
      ],
      "category": "inventory",
      "source": "industry"
    },
    {
      "metricId": "inventoryTurnover",
      "label": "库存周转",
      "description": "年化销售成本 / 平均库存成本",
      "unit": "times",
      "formula": "annualCOGS / avgInventoryCost",
      "defaultMetricType": "standard",
      "usedBy": [
        "category-ops",
        "inventory-health"
      ],
      "category": "inventory",
      "source": "industry"
    },
    {
      "metricId": "brokenSizeRate",
      "label": "断码率",
      "description": "尺码缺货SKU数 / 总在售SKU数",
      "unit": "percent",
      "formula": "brokenSizeSKU / totalActiveSKU",
      "defaultMetricType": "standard",
      "usedBy": [
        "region-store",
        "inventory-health"
      ],
      "category": "inventory",
      "source": "industry"
    },
    {
      "metricId": "skuCount",
      "label": "SKU数",
      "description": "款色码三级组合的在售SKU总数",
      "unit": "count",
      "formula": "count(distinct styleId + colorId + sizeId)",
      "defaultMetricType": "standard",
      "usedBy": [
        "category-ops",
        "otb"
      ],
      "category": "assortment",
      "source": "industry"
    },
    {
      "metricId": "skcCount",
      "label": "SKC数",
      "description": "款色二级组合的在售SKC总数（款×色）",
      "unit": "count",
      "formula": "count(distinct styleId + colorId)",
      "defaultMetricType": "standard",
      "usedBy": [
        "category-ops",
        "otb"
      ],
      "category": "assortment",
      "source": "industry"
    },
    {
      "metricId": "styleCount",
      "label": "款数",
      "description": "计划或在售的款式总数",
      "unit": "count",
      "formula": "count(distinct styleId)",
      "defaultMetricType": "standard",
      "usedBy": [
        "category-ops",
        "otb",
        "wave-planning"
      ],
      "category": "assortment",
      "source": "industry"
    },
    {
      "metricId": "colorCount",
      "label": "色数",
      "description": "每款平均配色数量",
      "unit": "count",
      "formula": "skcCount / styleCount",
      "defaultMetricType": "reference",
      "usedBy": [
        "category-ops",
        "otb"
      ],
      "category": "assortment",
      "source": "industry"
    },
    {
      "metricId": "averageDepth",
      "label": "均深",
      "description": "每SKC平均计划备货双数",
      "unit": "pairs",
      "formula": "plannedProductionPairs / skcCount",
      "defaultMetricType": "standard",
      "usedBy": [
        "category-ops",
        "otb",
        "wave-planning"
      ],
      "category": "assortment",
      "source": "industry"
    },
    {
      "metricId": "categorySalesRatio",
      "label": "品类销售占比",
      "description": "该品类销售 / 全品类销售合计",
      "unit": "percent",
      "formula": "categorySalesAmount / totalSalesAmount",
      "defaultMetricType": "standard",
      "usedBy": [
        "consumer",
        "category-ops",
        "forecast",
        "competitor-trend"
      ],
      "category": "assortment",
      "source": "industry"
    },
    {
      "metricId": "priceBandSalesRatio",
      "label": "价格带销售占比",
      "description": "该价格带销售 / 全价格带销售合计",
      "unit": "percent",
      "formula": "priceBandSalesAmount / totalSalesAmount",
      "defaultMetricType": "standard",
      "usedBy": [
        "consumer",
        "category-ops",
        "otb",
        "competitor-trend"
      ],
      "category": "assortment",
      "source": "industry"
    },
    {
      "metricId": "channelSalesRatio",
      "label": "渠道销售占比",
      "description": "该渠道销售 / 全渠道销售合计",
      "unit": "percent",
      "formula": "channelSalesAmount / totalSalesAmount",
      "defaultMetricType": "standard",
      "usedBy": [
        "overview",
        "region-store",
        "forecast",
        "otb"
      ],
      "category": "channel",
      "source": "industry"
    },
    {
      "metricId": "grossMarginRate",
      "label": "毛利率",
      "description": "（销售额 - 销售成本）/ 销售额",
      "unit": "percent",
      "formula": "(salesAmount - costOfGoods) / salesAmount",
      "defaultMetricType": "standard",
      "usedBy": [
        "overview",
        "annual-control",
        "pnl",
        "category-ops",
        "region-store"
      ],
      "category": "profitability",
      "source": "industry"
    },
    {
      "metricId": "otbBudget",
      "label": "OTB预算",
      "description": "本期可用采购预算 = 销售计划 + 期末库存目标 - 期初库存",
      "unit": "currency",
      "formula": "salesPlanCost + endingInventoryTarget - beginningInventory",
      "defaultMetricType": "standard",
      "usedBy": [
        "otb",
        "annual-control",
        "wave-planning"
      ],
      "category": "planning",
      "source": "industry"
    },
    {
      "metricId": "seasonSalesTarget",
      "label": "季节销售目标",
      "description": "全年销售目标按春夏/秋冬拆分后的季节目标额",
      "unit": "currency",
      "formula": "annualTarget * seasonRatio",
      "defaultMetricType": "standard",
      "usedBy": [
        "annual-control",
        "wave-planning",
        "otb"
      ],
      "category": "planning",
      "source": "industry"
    },
    {
      "metricId": "waveSalesTarget",
      "label": "波段销售目标",
      "description": "季节目标按波段拆分后的波段销售目标额",
      "unit": "currency",
      "formula": "seasonSalesTarget * waveSalesRatio",
      "defaultMetricType": "standard",
      "usedBy": [
        "wave-planning",
        "otb"
      ],
      "category": "planning",
      "source": "industry"
    },
    {
      "metricId": "discountDepth",
      "label": "折扣深度",
      "description": "1 - 折扣率，反映让利幅度",
      "unit": "percent",
      "formula": "1 - discountRate",
      "defaultMetricType": "derived",
      "usedBy": ["overview","pnl","competitor-trend","category-ops"],
      "category": "sales",
      "source": "industry"
    },
    {
      "metricId": "grossProfitAmount",
      "label": "毛利额",
      "description": "销售额 × 毛利率",
      "unit": "currency",
      "formula": "salesAmount * grossMarginRate",
      "defaultMetricType": "derived",
      "usedBy": ["overview","annual-control","pnl","category-ops"],
      "category": "profitability",
      "source": "industry"
    },
    {
      "metricId": "newProductRatio",
      "label": "新品占比",
      "description": "新品销售额 / 总销售额",
      "unit": "percent",
      "formula": "newProductSalesAmount / salesAmount",
      "defaultMetricType": "standard",
      "usedBy": ["category-ops","wave-planning","otb","competitor-trend"],
      "category": "assortment",
      "source": "industry"
    },
    {
      "metricId": "carryoverRatio",
      "label": "延续款占比",
      "description": "延续款销售额 / 总销售额",
      "unit": "percent",
      "formula": "carryoverSalesAmount / salesAmount",
      "defaultMetricType": "standard",
      "usedBy": ["category-ops","wave-planning","otb"],
      "category": "assortment",
      "source": "industry"
    },
    {
      "metricId": "plannedSkuCount",
      "label": "计划SKU数",
      "description": "本期计划在售或上市的 SKU 数量",
      "unit": "count",
      "formula": "count(planned SKU)",
      "defaultMetricType": "standard",
      "usedBy": ["category-ops","wave-planning","otb"],
      "category": "assortment",
      "source": "industry"
    },
    {
      "metricId": "activeSkuCount",
      "label": "动销SKU数",
      "description": "周期内有销售的 SKU 数量",
      "unit": "count",
      "formula": "count(distinct skuId where salesPairs > 0)",
      "defaultMetricType": "standard",
      "usedBy": ["category-ops","inventory-health","wave-planning"],
      "category": "assortment",
      "source": "industry"
    },
    {
      "metricId": "skuDepth",
      "label": "SKU深度",
      "description": "总采购双数 / SKU 数（款色码均深）",
      "unit": "pairs",
      "formula": "purchasePairs / skuCount",
      "defaultMetricType": "derived",
      "usedBy": ["category-ops","otb","wave-planning"],
      "category": "assortment",
      "source": "industry"
    },
    {
      "metricId": "inventoryPairs",
      "label": "库存双数",
      "description": "当前在库的商品双数合计",
      "unit": "pairs",
      "formula": "sum(on_hand_pairs)",
      "defaultMetricType": "standard",
      "usedBy": ["inventory-health","region-store","category-ops"],
      "category": "inventory",
      "source": "industry"
    },
    {
      "metricId": "fullSizeRate",
      "label": "齐码率",
      "description": "齐码 SKC 数 / 在售 SKC 数",
      "unit": "percent",
      "formula": "fullSizeSkc / activeSkc",
      "defaultMetricType": "standard",
      "usedBy": ["inventory-health","region-store"],
      "category": "inventory",
      "source": "industry"
    },
    {
      "metricId": "coreSizeSalesShare",
      "label": "核心尺码销量占比",
      "description": "核心尺码销售双数 / 总销售双数",
      "unit": "percent",
      "formula": "coreSizePairs / salesPairs",
      "defaultMetricType": "standard",
      "usedBy": ["inventory-health","region-store","consumer"],
      "category": "inventory",
      "source": "industry"
    },
    {
      "metricId": "sizeCurveFitRate",
      "label": "尺码配比达成率",
      "description": "实际尺码销售曲线对计划曲线的拟合度",
      "unit": "percent",
      "formula": "1 - sum(abs(actualSizeShare - plannedSizeShare)) / 2",
      "defaultMetricType": "derived",
      "usedBy": ["inventory-health","category-ops"],
      "category": "inventory",
      "source": "industry"
    },
    {
      "metricId": "otbUsed",
      "label": "已使用OTB",
      "description": "已下达采购订单占用的 OTB 金额",
      "unit": "currency",
      "formula": "sum(committedPurchaseAmount)",
      "defaultMetricType": "standard",
      "usedBy": ["otb","cashflow","annual-control"],
      "category": "planning",
      "source": "industry"
    },
    {
      "metricId": "otbRemaining",
      "label": "剩余OTB",
      "description": "OTB 预算 - 已使用 OTB",
      "unit": "currency",
      "formula": "otbBudget - otbUsed",
      "defaultMetricType": "derived",
      "usedBy": ["otb","cashflow","annual-control"],
      "category": "planning",
      "source": "industry"
    },
    {
      "metricId": "otbUsageRate",
      "label": "OTB使用率",
      "description": "已使用 OTB / OTB 预算",
      "unit": "percent",
      "formula": "otbUsed / otbBudget",
      "defaultMetricType": "derived",
      "usedBy": ["overview","otb","annual-control"],
      "category": "planning",
      "source": "industry"
    },
    {
      "metricId": "purchaseBudget",
      "label": "采购预算",
      "description": "本期可下达采购订单的金额上限（含未占用 OTB + 调整项）",
      "unit": "currency",
      "formula": "otbBudget + otbAdjustment",
      "defaultMetricType": "standard",
      "usedBy": ["otb","annual-control","cashflow"],
      "category": "planning",
      "source": "industry"
    },
    {
      "metricId": "netNewOtb",
      "label": "净新增OTB",
      "description": "本期净新增 OTB 预算（剔除上期结转）",
      "unit": "currency",
      "formula": "purchaseBudget - carryoverOtb",
      "defaultMetricType": "derived",
      "usedBy": ["otb","cashflow"],
      "category": "planning",
      "source": "industry"
    },
    {
      "metricId": "purchasePayment",
      "label": "采购付款",
      "description": "本期向供应商支付的采购货款",
      "unit": "currency",
      "formula": "sum(supplierPaymentAmount)",
      "defaultMetricType": "standard",
      "usedBy": ["cashflow","otb","pnl"],
      "category": "cashflow",
      "source": "industry"
    },
    {
      "metricId": "salesCollection",
      "label": "销售回款",
      "description": "本期收到的销售回款金额",
      "unit": "currency",
      "formula": "sum(channelCollectionAmount)",
      "defaultMetricType": "standard",
      "usedBy": ["cashflow","forecast","pnl"],
      "category": "cashflow",
      "source": "industry"
    },
    {
      "metricId": "netCashflow",
      "label": "净现金流",
      "description": "销售回款 - 采购付款 - 运营费用支付",
      "unit": "currency",
      "formula": "salesCollection - purchasePayment - opexPayment",
      "defaultMetricType": "derived",
      "usedBy": ["cashflow","overview","annual-control"],
      "category": "cashflow",
      "source": "industry"
    },
    {
      "metricId": "cashBalance",
      "label": "现金余额",
      "description": "期末现金及等价物余额",
      "unit": "currency",
      "formula": "openingCash + netCashflow",
      "defaultMetricType": "standard",
      "usedBy": ["cashflow","overview","annual-control"],
      "category": "cashflow",
      "source": "industry"
    },
    {
      "metricId": "cashGap",
      "label": "现金缺口",
      "description": "采购付款 + 运营费用 - 销售回款（为正表示有缺口）",
      "unit": "currency",
      "formula": "purchasePayment + opexPayment - salesCollection",
      "defaultMetricType": "derived",
      "usedBy": ["cashflow","otb","overview"],
      "category": "cashflow",
      "source": "industry"
    },
    {
      "metricId": "inventoryCapital",
      "label": "库存占款",
      "description": "当前库存占用资金（按库存成本计）",
      "unit": "currency",
      "formula": "inventoryCost",
      "defaultMetricType": "derived",
      "usedBy": ["cashflow","inventory-health","overview"],
      "category": "cashflow",
      "source": "industry"
    },
    {
      "metricId": "revenue",
      "label": "收入",
      "description": "确认收入金额（净销售额口径）",
      "unit": "currency",
      "formula": "netSalesAmount",
      "defaultMetricType": "standard",
      "usedBy": ["pnl","annual-control","forecast"],
      "category": "pnl",
      "source": "industry"
    },
    {
      "metricId": "cogs",
      "label": "销售成本",
      "description": "销售商品的采购成本合计",
      "unit": "currency",
      "formula": "salesPairs * unitCostPrice",
      "defaultMetricType": "standard",
      "usedBy": ["pnl","category-ops"],
      "category": "pnl",
      "source": "industry"
    },
    {
      "metricId": "opex",
      "label": "运营费用",
      "description": "本期运营费用（人力+租金+营销+物流等）",
      "unit": "currency",
      "formula": "sum(operatingExpense)",
      "defaultMetricType": "standard",
      "usedBy": ["pnl","annual-control"],
      "category": "pnl",
      "source": "industry"
    },
    {
      "metricId": "netProfit",
      "label": "净利润",
      "description": "收入 - 销售成本 - 运营费用 - 税费",
      "unit": "currency",
      "formula": "revenue - cogs - opex - tax",
      "defaultMetricType": "derived",
      "usedBy": ["pnl","overview","annual-control"],
      "category": "pnl",
      "source": "industry"
    },
    {
      "metricId": "netProfitRate",
      "label": "净利率",
      "description": "净利润 / 收入",
      "unit": "percent",
      "formula": "netProfit / revenue",
      "defaultMetricType": "derived",
      "usedBy": ["pnl","overview","annual-control"],
      "category": "pnl",
      "source": "industry"
    },
    {
      "metricId": "breakEvenSales",
      "label": "盈亏平衡销售额",
      "description": "覆盖运营费用的最低销售额（运营费用 / 毛利率）",
      "unit": "currency",
      "formula": "opex / grossMarginRate",
      "defaultMetricType": "derived",
      "usedBy": ["pnl","forecast"],
      "category": "pnl",
      "source": "industry"
    },
    { "metricId": "returnAmount", "label": "退货金额", "description": "销售退货金额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "retailPrice", "label": "吊牌价", "description": "商品零售吊牌价（单位）", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "costPrice", "label": "成本价", "description": "单位采购成本", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "unitCostPrice", "label": "单位销售成本价", "description": "销售成本核算用的单位成本", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "salesTarget", "label": "销售目标", "description": "计划期销售额目标", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "annualTarget", "label": "年度销售目标", "description": "本财年销售目标", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "seasonRatio", "label": "季节占比", "description": "季节销售目标占年度比例", "unit": "percent", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "waveSalesRatio", "label": "波段销售占比", "description": "波段销售占季节比例", "unit": "percent", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "availableLaunchPairs", "label": "上市可销双数", "description": "上市起累计可销售双数（产能 + 期初库存）", "unit": "pairs", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "damagedInventory", "label": "残损库存", "description": "残损未销售库存金额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "giftInventory", "label": "赠品库存", "description": "赠品占用库存金额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "avgWeeklySales", "label": "周均销售双数", "description": "近 4 周平均周销售双数", "unit": "pairs", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "monthlySales", "label": "月销售额", "description": "单月销售额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "endingInventory", "label": "期末库存", "description": "月末/期末库存金额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "beginningInventory", "label": "期初库存", "description": "期初库存金额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "endingInventoryTarget", "label": "期末库存目标", "description": "计划期末库存金额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "annualCOGS", "label": "年化销售成本", "description": "年度销售成本（COGS）", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "avgInventoryCost", "label": "平均库存成本", "description": "期初期末平均库存成本", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "brokenSizeSKU", "label": "断码 SKU 数", "description": "断码 SKU 数量", "unit": "count", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "totalActiveSKU", "label": "在售 SKU 数", "description": "在售 SKU 总数", "unit": "count", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "plannedProductionPairs", "label": "计划生产双数", "description": "计划备货双数合计", "unit": "pairs", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "categorySalesAmount", "label": "品类销售额", "description": "单品类销售额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "totalSalesAmount", "label": "全品类销售额", "description": "全品类销售额合计", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "priceBandSalesAmount", "label": "价格带销售额", "description": "单价格带销售额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "channelSalesAmount", "label": "渠道销售额", "description": "单渠道销售额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "newProductSalesAmount", "label": "新品销售额", "description": "新品销售额（含本季首次上市）", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "carryoverSalesAmount", "label": "延续款销售额", "description": "延续款销售额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "purchasePairs", "label": "采购双数", "description": "采购订单总双数", "unit": "pairs", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "activeSkc", "label": "在售 SKC 数", "description": "在售 SKC 数量", "unit": "count", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "fullSizeSkc", "label": "齐码 SKC 数", "description": "齐码 SKC 数量", "unit": "count", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "coreSizePairs", "label": "核心尺码销售双数", "description": "核心尺码销量合计", "unit": "pairs", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "actualSizeShare", "label": "实际尺码占比", "description": "尺码实际销售占比", "unit": "percent", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "plannedSizeShare", "label": "计划尺码占比", "description": "尺码计划销售占比", "unit": "percent", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "committedPurchaseAmount", "label": "已下达采购金额", "description": "已下采购订单金额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "otbAdjustment", "label": "OTB 调整金额", "description": "OTB 预算调整项", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "carryoverOtb", "label": "结转 OTB", "description": "上期结转 OTB 金额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "supplierPaymentAmount", "label": "供应商付款金额", "description": "向供应商支付金额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "channelCollectionAmount", "label": "渠道回款金额", "description": "渠道销售回款金额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "opexPayment", "label": "运营费用支付", "description": "实际支付的运营费用", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "openingCash", "label": "期初现金", "description": "期初现金及等价物余额", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "operatingExpense", "label": "运营费用项", "description": "单项运营费用（人力/租金/营销/物流等之一）", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "salesPlanCost", "label": "销售计划成本", "description": "计划销售额对应的销售成本", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" },
    { "metricId": "costOfGoods", "label": "销售商品成本", "description": "销售商品采购成本（按已销售商品）", "unit": "currency", "formula": "", "defaultMetricType": "reference", "usedBy": [], "category": "data-source", "source": "industry" }
  ],
  "dimensions": [
    {
      "dimensionId": "region",
      "label": "区域",
      "type": "region",
      "values": [
        {
          "id": "east",
          "label": "华东",
          "metadata": {
            "provinces": [
              "上海",
              "江苏",
              "浙江",
              "安徽"
            ]
          }
        },
        {
          "id": "south",
          "label": "华南",
          "metadata": {
            "provinces": [
              "广东",
              "广西",
              "海南",
              "福建"
            ]
          }
        },
        {
          "id": "north",
          "label": "华北",
          "metadata": {
            "provinces": [
              "北京",
              "天津",
              "河北",
              "山东",
              "山西"
            ]
          }
        },
        {
          "id": "central",
          "label": "华中",
          "metadata": {
            "provinces": [
              "湖北",
              "湖南",
              "河南",
              "江西"
            ]
          }
        },
        {
          "id": "southwest",
          "label": "西南",
          "metadata": {
            "provinces": [
              "四川",
              "重庆",
              "云南",
              "贵州"
            ]
          }
        },
        {
          "id": "northwest",
          "label": "西北",
          "metadata": {
            "provinces": [
              "陕西",
              "甘肃",
              "新疆",
              "宁夏"
            ]
          }
        },
        {
          "id": "northeast",
          "label": "东北",
          "metadata": {
            "provinces": [
              "辽宁",
              "吉林",
              "黑龙江",
              "内蒙古"
            ]
          }
        }
      ],
      "scope": [
        "region-store",
        "overview",
        "forecast",
        "annual-control"
      ]
    },
    {
      "dimensionId": "city_tier",
      "label": "城市能级",
      "type": "city_tier",
      "values": [
        {
          "id": "tier1",
          "label": "一线",
          "metadata": {
            "mappedCities": [
              "北京",
              "上海",
              "广州",
              "深圳"
            ],
            "candidateCities": [
              "北京",
              "上海",
              "广州",
              "深圳"
            ],
            "sourceType": "baseline_sample"
          }
        },
        {
          "id": "tier_new1",
          "label": "新一线",
          "metadata": {
            "mappedCities": [
              "成都",
              "杭州",
              "武汉",
              "西安",
              "南京"
            ],
            "candidateCities": [
              "成都",
              "杭州",
              "武汉",
              "西安",
              "南京",
              "苏州",
              "重庆",
              "天津",
              "郑州",
              "长沙",
              "东莞",
              "宁波",
              "青岛"
            ],
            "sourceType": "baseline_sample"
          }
        },
        {
          "id": "tier2",
          "label": "二线",
          "metadata": {
            "mappedCities": [
              "合肥",
              "福州",
              "哈尔滨",
              "沈阳"
            ],
            "candidateCities": [
              "合肥",
              "福州",
              "哈尔滨",
              "沈阳",
              "济南",
              "厦门",
              "大连",
              "佛山",
              "无锡",
              "长春",
              "昆明",
              "南昌"
            ],
            "sourceType": "baseline_sample"
          }
        },
        {
          "id": "tier3",
          "label": "三线",
          "metadata": {
            "mappedCities": [
              "温州",
              "南通",
              "徐州",
              "泉州",
              "绍兴"
            ],
            "candidateCities": [
              "温州",
              "南通",
              "徐州",
              "泉州",
              "绍兴",
              "珠海",
              "常州",
              "扬州",
              "金华",
              "嘉兴"
            ],
            "sourceType": "baseline_sample"
          }
        },
        {
          "id": "tier4",
          "label": "四线",
          "metadata": {
            "mappedCities": [
              "湖州",
              "泰州",
              "台州",
              "芜湖",
              "宜昌"
            ],
            "candidateCities": [
              "湖州",
              "泰州",
              "台州",
              "芜湖",
              "宜昌",
              "柳州",
              "绵阳",
              "襄阳",
              "九江",
              "德州"
            ],
            "sourceType": "baseline_sample"
          }
        },
        {
          "id": "tier5_plus",
          "label": "五线及以下",
          "metadata": {
            "mappedCities": [
              "丽水",
              "衢州",
              "黄山",
              "景德镇",
              "大理"
            ],
            "candidateCities": [
              "丽水",
              "衢州",
              "黄山",
              "景德镇",
              "大理",
              "安庆",
              "拉萨",
              "日照",
              "抚州",
              "六盘水"
            ],
            "sourceType": "baseline_sample"
          }
        }
      ],
      "scope": [
        "region-store",
        "forecast"
      ]
    },
    {
      "dimensionId": "fiscal_year",
      "label": "财年",
      "type": "fiscal_year",
      "values": [
        {
          "id": "FY2025",
          "label": "FY2025 复盘年",
          "metadata": {
            "year": 2025,
            "fiscalMonths": "1-12月",
            "status": "复盘年"
          }
        },
        {
          "id": "FY2026",
          "label": "FY2026 当前财年",
          "metadata": {
            "year": 2026,
            "fiscalMonths": "1-12月",
            "status": "当前财年"
          }
        },
        {
          "id": "FY2027",
          "label": "FY2027 规划年",
          "metadata": {
            "year": 2027,
            "fiscalMonths": "1-12月",
            "status": "规划年"
          }
        }
      ],
      "scope": [
        "overview",
        "annual-control",
        "region-store",
        "consumer",
        "category-ops",
        "wave-planning",
        "otb",
        "cashflow",
        "forecast",
        "pnl",
        "competitor-trend",
        "inventory-health"
      ]
    },
    {
      "dimensionId": "season",
      "label": "季节",
      "type": "season",
      "values": [
        {
          "id": "spring",
          "label": "春季",
          "metadata": {
            "monthRange": "3-5月",
            "planningMonths": [
              "3月",
              "4月",
              "5月"
            ],
            "mainCategories": [
              "板鞋",
              "跑鞋"
            ],
            "seasonGroup": "春夏"
          }
        },
        {
          "id": "summer",
          "label": "夏季",
          "metadata": {
            "monthRange": "6-8月",
            "planningMonths": [
              "6月",
              "7月",
              "8月"
            ],
            "mainCategories": [
              "凉鞋",
              "凉拖",
              "透气跑鞋"
            ],
            "seasonGroup": "春夏"
          }
        },
        {
          "id": "autumn",
          "label": "秋季",
          "metadata": {
            "monthRange": "9-11月",
            "planningMonths": [
              "9月",
              "10月",
              "11月"
            ],
            "mainCategories": [
              "跑鞋",
              "休闲",
              "篮球"
            ],
            "seasonGroup": "秋冬"
          }
        },
        {
          "id": "winter",
          "label": "冬季",
          "metadata": {
            "monthRange": "12-2月",
            "planningMonths": [
              "12月",
              "1月",
              "2月"
            ],
            "mainCategories": [
              "棉鞋",
              "短靴",
              "雪地靴"
            ],
            "seasonGroup": "秋冬"
          }
        }
      ],
      "scope": [
        "overview",
        "annual-control",
        "region-store",
        "category-ops",
        "wave-planning",
        "otb",
        "cashflow",
        "forecast",
        "pnl",
        "inventory-health"
      ]
    },
    {
      "dimensionId": "wave",
      "label": "波段",
      "type": "wave",
      "values": [
        {
          "id": "SS-1A",
          "label": "SS-1A 春季首波",
          "metadata": {
            "season": "春季",
            "launchWindow": "2月底",
            "mainCategories": [
              "板鞋",
              "跑鞋"
            ],
            "waveRole": "形象+主推"
          }
        },
        {
          "id": "SS-1B",
          "label": "SS-1B 春季加深",
          "metadata": {
            "season": "春季",
            "launchWindow": "3月底",
            "mainCategories": [
              "跑鞋",
              "休闲"
            ],
            "waveRole": "主推+走量"
          }
        },
        {
          "id": "SS-2A",
          "label": "SS-2A 夏季首波",
          "metadata": {
            "season": "夏季",
            "launchWindow": "4月底",
            "mainCategories": [
              "凉鞋",
              "透气跑鞋"
            ],
            "waveRole": "主推+形象"
          }
        },
        {
          "id": "SS-2B",
          "label": "SS-2B 夏季加深",
          "metadata": {
            "season": "夏季",
            "launchWindow": "5月底",
            "mainCategories": [
              "凉鞋",
              "凉拖"
            ],
            "waveRole": "走量"
          }
        },
        {
          "id": "SS-3A",
          "label": "SS-3A 夏末清货",
          "metadata": {
            "season": "夏季",
            "launchWindow": "6月底",
            "mainCategories": [
              "凉鞋"
            ],
            "waveRole": "清尾"
          }
        },
        {
          "id": "AW-1A",
          "label": "AW-1A 秋季首波",
          "metadata": {
            "season": "秋季",
            "launchWindow": "8月底",
            "mainCategories": [
              "跑鞋",
              "休闲"
            ],
            "waveRole": "形象+主推"
          }
        },
        {
          "id": "AW-1B",
          "label": "AW-1B 秋季加深",
          "metadata": {
            "season": "秋季",
            "launchWindow": "9月底",
            "mainCategories": [
              "跑鞋",
              "板鞋"
            ],
            "waveRole": "主推+走量"
          }
        },
        {
          "id": "AW-2A",
          "label": "AW-2A 冬季首波",
          "metadata": {
            "season": "冬季",
            "launchWindow": "10月底",
            "mainCategories": [
              "棉鞋",
              "短靴"
            ],
            "waveRole": "形象+主推"
          }
        },
        {
          "id": "AW-2B",
          "label": "AW-2B 冬季加深",
          "metadata": {
            "season": "冬季",
            "launchWindow": "11月底",
            "mainCategories": [
              "棉鞋",
              "雪地靴"
            ],
            "waveRole": "主推+走量"
          }
        },
        {
          "id": "AW-3A",
          "label": "AW-3A 冬末清货",
          "metadata": {
            "season": "冬季",
            "launchWindow": "1月底",
            "mainCategories": [
              "冬鞋"
            ],
            "waveRole": "清尾"
          }
        },
        {
          "id": "AW-3B",
          "label": "AW-3B 春前预热",
          "metadata": {
            "season": "春季",
            "launchWindow": "2月初",
            "mainCategories": [
              "板鞋",
              "跑鞋"
            ],
            "waveRole": "测试"
          }
        }
      ],
      "scope": [
        "category-ops",
        "wave-planning",
        "otb",
        "cashflow",
        "forecast",
        "pnl",
        "inventory-health"
      ]
    },
    {
      "dimensionId": "category",
      "label": "品类",
      "type": "category",
      "values": [
        {
          "id": "men",
          "label": "男鞋",
          "metadata": {
            "level": 1,
            "categoryLevel": "一级品类"
          }
        },
        {
          "id": "men_outdoor",
          "label": "户外鞋",
          "parentId": "men",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "men_outdoor_hiking",
          "label": "徒步登山",
          "parentId": "men_outdoor",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_outdoor_wading",
          "label": "溯溪鞋",
          "parentId": "men_outdoor",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_outdoor_trail",
          "label": "越野鞋",
          "parentId": "men_outdoor",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_outdoor_techwear",
          "label": "潮流机能",
          "parentId": "men_outdoor",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_street",
          "label": "休闲/街头",
          "parentId": "men",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "men_street_skate",
          "label": "板鞋",
          "parentId": "men_street",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_street_dad",
          "label": "老爹鞋",
          "parentId": "men_street",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_street_gat",
          "label": "德训鞋",
          "parentId": "men_street",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_street_cortez",
          "label": "阿甘鞋",
          "parentId": "men_street",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_street_canvas",
          "label": "帆布鞋",
          "parentId": "men_street",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_fashion_commute",
          "label": "时尚/通勤",
          "parentId": "men",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "men_fashion_pump",
          "label": "浅口单鞋",
          "parentId": "men_fashion_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_fashion_ballet",
          "label": "芭蕾舞鞋",
          "parentId": "men_fashion_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_fashion_mary_jane",
          "label": "玛丽珍鞋",
          "parentId": "men_fashion_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_formal_commute",
          "label": "正装/通勤",
          "parentId": "men",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "men_formal_loafer",
          "label": "乐福鞋",
          "parentId": "men_formal_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_formal_oxford",
          "label": "牛津鞋",
          "parentId": "men_formal_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_formal_derby",
          "label": "德比鞋",
          "parentId": "men_formal_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_formal_driver",
          "label": "豆豆鞋",
          "parentId": "men_formal_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_formal_monk",
          "label": "穆勒鞋",
          "parentId": "men_formal_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_boots",
          "label": "靴类",
          "parentId": "men",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "men_boots_ankle",
          "label": "裸靴",
          "parentId": "men_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_boots_chelsea",
          "label": "切尔西靴",
          "parentId": "men_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_boots_martin",
          "label": "马丁靴",
          "parentId": "men_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_boots_tall",
          "label": "长筒靴",
          "parentId": "men_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_boots_snow",
          "label": "雪地靴",
          "parentId": "men_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_boots_short",
          "label": "短靴",
          "parentId": "men_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_sandals_slippers",
          "label": "凉拖鞋",
          "parentId": "men",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "men_sandals_sandal",
          "label": "凉鞋",
          "parentId": "men_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_sandals_clog",
          "label": "洞洞鞋",
          "parentId": "men_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_sandals_slipper",
          "label": "拖鞋",
          "parentId": "men_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_sandals_open_toe",
          "label": "前空鞋",
          "parentId": "men_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_sandals_mid_open",
          "label": "中空鞋",
          "parentId": "men_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_sandals_back_open",
          "label": "后空鞋",
          "parentId": "men_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_accessories",
          "label": "配件",
          "parentId": "men",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "men_accessories_insole",
          "label": "鞋垫",
          "parentId": "men_accessories",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_accessories_lace",
          "label": "鞋带",
          "parentId": "men_accessories",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "men_accessories_socks",
          "label": "袜品",
          "parentId": "men_accessories",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women",
          "label": "女鞋",
          "metadata": {
            "level": 1,
            "categoryLevel": "一级品类"
          }
        },
        {
          "id": "women_outdoor",
          "label": "户外鞋",
          "parentId": "women",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "women_outdoor_hiking",
          "label": "徒步登山",
          "parentId": "women_outdoor",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_outdoor_wading",
          "label": "溯溪鞋",
          "parentId": "women_outdoor",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_outdoor_trail",
          "label": "越野鞋",
          "parentId": "women_outdoor",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_outdoor_techwear",
          "label": "潮流机能",
          "parentId": "women_outdoor",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_street",
          "label": "休闲/街头",
          "parentId": "women",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "women_street_skate",
          "label": "板鞋",
          "parentId": "women_street",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_street_dad",
          "label": "老爹鞋",
          "parentId": "women_street",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_street_gat",
          "label": "德训鞋",
          "parentId": "women_street",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_street_cortez",
          "label": "阿甘鞋",
          "parentId": "women_street",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_street_canvas",
          "label": "帆布鞋",
          "parentId": "women_street",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_fashion_commute",
          "label": "时尚/通勤",
          "parentId": "women",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "women_fashion_pump",
          "label": "浅口单鞋",
          "parentId": "women_fashion_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_fashion_ballet",
          "label": "芭蕾舞鞋",
          "parentId": "women_fashion_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_fashion_mary_jane",
          "label": "玛丽珍鞋",
          "parentId": "women_fashion_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_formal_commute",
          "label": "正装/通勤",
          "parentId": "women",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "women_formal_loafer",
          "label": "乐福鞋",
          "parentId": "women_formal_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_formal_oxford",
          "label": "牛津鞋",
          "parentId": "women_formal_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_formal_derby",
          "label": "德比鞋",
          "parentId": "women_formal_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_formal_driver",
          "label": "豆豆鞋",
          "parentId": "women_formal_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_formal_monk",
          "label": "穆勒鞋",
          "parentId": "women_formal_commute",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_boots",
          "label": "靴类",
          "parentId": "women",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "women_boots_ankle",
          "label": "裸靴",
          "parentId": "women_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_boots_chelsea",
          "label": "切尔西靴",
          "parentId": "women_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_boots_martin",
          "label": "马丁靴",
          "parentId": "women_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_boots_tall",
          "label": "长筒靴",
          "parentId": "women_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_boots_snow",
          "label": "雪地靴",
          "parentId": "women_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_boots_short",
          "label": "短靴",
          "parentId": "women_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_sandals_slippers",
          "label": "凉拖鞋",
          "parentId": "women",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "women_sandals_sandal",
          "label": "凉鞋",
          "parentId": "women_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_sandals_clog",
          "label": "洞洞鞋",
          "parentId": "women_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_sandals_slipper",
          "label": "拖鞋",
          "parentId": "women_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_sandals_open_toe",
          "label": "前空鞋",
          "parentId": "women_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_sandals_mid_open",
          "label": "中空鞋",
          "parentId": "women_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_sandals_back_open",
          "label": "后空鞋",
          "parentId": "women_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_accessories",
          "label": "配件",
          "parentId": "women",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "women_accessories_insole",
          "label": "鞋垫",
          "parentId": "women_accessories",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_accessories_lace",
          "label": "鞋带",
          "parentId": "women_accessories",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "women_accessories_socks",
          "label": "袜品",
          "parentId": "women_accessories",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids",
          "label": "童鞋",
          "metadata": {
            "level": 1,
            "categoryLevel": "一级品类"
          }
        },
        {
          "id": "kids_street",
          "label": "休闲/街头",
          "parentId": "kids",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "kids_street_skate",
          "label": "板鞋",
          "parentId": "kids_street",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids_street_gat",
          "label": "德训鞋",
          "parentId": "kids_street",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids_street_canvas",
          "label": "帆布鞋",
          "parentId": "kids_street",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids_outdoor",
          "label": "户外鞋",
          "parentId": "kids",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "kids_outdoor_hiking",
          "label": "徒步登山",
          "parentId": "kids_outdoor",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids_outdoor_trail",
          "label": "越野鞋",
          "parentId": "kids_outdoor",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids_boots",
          "label": "靴类",
          "parentId": "kids",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "kids_boots_short",
          "label": "短靴",
          "parentId": "kids_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids_boots_rain",
          "label": "雨靴",
          "parentId": "kids_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids_boots_snow",
          "label": "雪地靴",
          "parentId": "kids_boots",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids_sandals_slippers",
          "label": "凉拖鞋",
          "parentId": "kids",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "kids_sandals_sandal",
          "label": "凉鞋",
          "parentId": "kids_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids_sandals_clog",
          "label": "洞洞鞋",
          "parentId": "kids_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids_sandals_slipper",
          "label": "拖鞋",
          "parentId": "kids_sandals_slippers",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids_accessories",
          "label": "配件",
          "parentId": "kids",
          "metadata": {
            "level": 2,
            "categoryLevel": "二级品类"
          }
        },
        {
          "id": "kids_accessories_insole",
          "label": "鞋垫",
          "parentId": "kids_accessories",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids_accessories_lace",
          "label": "鞋带",
          "parentId": "kids_accessories",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        },
        {
          "id": "kids_accessories_socks",
          "label": "袜品",
          "parentId": "kids_accessories",
          "metadata": {
            "level": 3,
            "categoryLevel": "三级品类"
          }
        }
      ],
      "scope": [
        "overview",
        "annual-control",
        "consumer",
        "category-ops",
        "wave-planning",
        "otb",
        "forecast",
        "pnl",
        "competitor-trend",
        "inventory-health"
      ]
    },
    {
      "dimensionId": "store_format",
      "label": "店型",
      "type": "store_format",
      "values": [
        {
          "id": "mall",
          "label": "购物中心 Mall"
        },
        {
          "id": "department",
          "label": "百货 Store"
        },
        {
          "id": "street",
          "label": "街边大店 Street"
        },
        {
          "id": "outlet",
          "label": "奥特莱斯 Outlet"
        },
        {
          "id": "community",
          "label": "社区商业"
        },
        {
          "id": "transport_hub",
          "label": "交通枢纽店"
        },
        {
          "id": "shop_in_shop",
          "label": "集合店 / 店中店"
        }
      ],
      "scope": [
        "region-store"
      ]
    },
    {
      "dimensionId": "store_tier",
      "label": "门店等级",
      "type": "store_tier",
      "values": [
        {
          "id": "S",
          "label": "S 旗舰",
          "metadata": {
            "criteria": {
              "salesPerSqm": ">=5000"
            }
          }
        },
        {
          "id": "A",
          "label": "A 主力",
          "metadata": {
            "criteria": {
              "salesPerSqm": ">=3000"
            }
          }
        },
        {
          "id": "B",
          "label": "B 标准"
        },
        {
          "id": "outlet",
          "label": "奥莱"
        }
      ],
      "scope": [
        "region-store"
      ]
    },
    {
      "dimensionId": "last_type",
      "label": "楦型",
      "type": "last_type",
      "values": [
        {
          "id": "standard",
          "label": "标准楦"
        },
        {
          "id": "wide",
          "label": "宽脚楦"
        },
        {
          "id": "china",
          "label": "中国楦"
        },
        {
          "id": "european",
          "label": "欧版楦"
        },
        {
          "id": "kid",
          "label": "儿童楦"
        }
      ],
      "scope": [
        "category-ops",
        "region-store"
      ]
    },
    {
      "dimensionId": "price_band",
      "label": "价格带",
      "type": "price_band",
      "values": [
        {
          "id": "PB1",
          "label": "199-399 入门",
          "metadata": {
            "min": 199,
            "max": 399
          }
        },
        {
          "id": "PB2",
          "label": "400-599 走量",
          "metadata": {
            "min": 400,
            "max": 599
          }
        },
        {
          "id": "PB3",
          "label": "600-799 利润",
          "metadata": {
            "min": 600,
            "max": 799
          }
        },
        {
          "id": "PB4",
          "label": "800+ 形象",
          "metadata": {
            "min": 800
          }
        }
      ],
      "scope": [
        "category-ops",
        "otb",
        "pnl"
      ]
    },
    {
      "dimensionId": "size",
      "label": "尺码",
      "type": "size",
      "values": [
        {
          "id": "women_fashion",
          "label": "女鞋 · 时装休闲",
          "metadata": {
            "gender": "women",
            "lineType": "fashion_casual",
            "profileId": "P_W_FASHION",
            "bandDefinition": "WOMEN_FASHION",
            "sizeRange": [
              "34",
              "35",
              "36",
              "37",
              "38",
              "39"
            ],
            "allSizeRange": [
              "34",
              "35",
              "36",
              "37",
              "38",
              "39"
            ],
            "small": [
              "34",
              "35"
            ],
            "core": [
              "36",
              "37",
              "38"
            ],
            "large": [
              "39"
            ],
            "curves": {
              "standard": {
                "34": 0,
                "35": 1,
                "36": 2,
                "37": 4,
                "38": 2,
                "39": 1
              },
              "north": {
                "34": 0,
                "35": 0,
                "36": 1,
                "37": 3,
                "38": 4,
                "39": 2
              },
              "south": {
                "34": 1,
                "35": 2,
                "36": 3,
                "37": 3,
                "38": 1,
                "39": 0
              }
            }
          }
        },
        {
          "id": "women_sport",
          "label": "女鞋 · 运动休闲",
          "metadata": {
            "gender": "women",
            "lineType": "sport_casual",
            "profileId": "P_W_SPORT",
            "bandDefinition": "WOMEN_SPORT",
            "sizeRange": [
              "35",
              "36",
              "37",
              "38",
              "39",
              "40"
            ],
            "allSizeRange": [
              "35",
              "36",
              "37",
              "38",
              "39",
              "40"
            ],
            "small": [
              "35",
              "36"
            ],
            "core": [
              "37",
              "38",
              "39"
            ],
            "large": [
              "40"
            ],
            "curves": {
              "standard": {
                "35": 1,
                "36": 2,
                "37": 3,
                "38": 2,
                "39": 1,
                "40": 1
              },
              "north": {
                "35": 0,
                "36": 1,
                "37": 2,
                "38": 3,
                "39": 3,
                "40": 1
              },
              "south": {
                "35": 2,
                "36": 3,
                "37": 3,
                "38": 1,
                "39": 1,
                "40": 0
              }
            }
          }
        },
        {
          "id": "men_fashion",
          "label": "男鞋 · 时装休闲",
          "metadata": {
            "gender": "men",
            "lineType": "fashion_casual",
            "profileId": "P_M_FASHION",
            "bandDefinition": "MEN_FASHION",
            "sizeRange": [
              "38",
              "39",
              "40",
              "41",
              "42",
              "43"
            ],
            "allSizeRange": [
              "38",
              "39",
              "40",
              "41",
              "42",
              "43"
            ],
            "small": [
              "38",
              "39"
            ],
            "core": [
              "40",
              "41",
              "42"
            ],
            "large": [
              "43"
            ],
            "curves": {
              "standard": {
                "38": 0,
                "39": 1,
                "40": 2,
                "41": 4,
                "42": 2,
                "43": 1
              },
              "north": {
                "38": 0,
                "39": 0,
                "40": 1,
                "41": 3,
                "42": 4,
                "43": 2
              },
              "south": {
                "38": 1,
                "39": 2,
                "40": 3,
                "41": 3,
                "42": 1,
                "43": 0
              }
            }
          }
        },
        {
          "id": "men_sport",
          "label": "男鞋 · 运动休闲",
          "metadata": {
            "gender": "men",
            "lineType": "sport_casual",
            "profileId": "P_M_SPORT",
            "bandDefinition": "MEN_SPORT",
            "sizeRange": [
              "39",
              "40",
              "41",
              "42",
              "43",
              "44"
            ],
            "allSizeRange": [
              "39",
              "40",
              "41",
              "42",
              "43",
              "44"
            ],
            "small": [
              "39",
              "40"
            ],
            "core": [
              "41",
              "42",
              "43"
            ],
            "large": [
              "44"
            ],
            "curves": {
              "standard": {
                "39": 1,
                "40": 2,
                "41": 3,
                "42": 2,
                "43": 1,
                "44": 1
              },
              "north": {
                "39": 0,
                "40": 1,
                "41": 2,
                "42": 3,
                "43": 3,
                "44": 1
              },
              "south": {
                "39": 2,
                "40": 3,
                "41": 3,
                "42": 1,
                "43": 1,
                "44": 0
              }
            }
          }
        },
        {
          "id": "kids",
          "label": "童鞋",
          "metadata": {
            "gender": "kids",
            "enabled": false,
            "sizeRange": [],
            "allSizeRange": [],
            "standardStatus": "brand_extension",
            "note": "当前行业标准为成人鞋 EU34-44；童鞋尺码需要按品牌童鞋业务单独维护。"
          }
        }
      ],
      "scope": [
        "region-store",
        "inventory-health"
      ]
    },
    {
      "dimensionId": "channel",
      "label": "渠道",
      "type": "channel",
      "values": [
        {
          "id": "offline-direct",
          "label": "线下直营"
        },
        {
          "id": "offline-franchise",
          "label": "线下加盟"
        },
        {
          "id": "online-tmall",
          "label": "天猫旗舰"
        },
        {
          "id": "online-jd",
          "label": "京东自营"
        },
        {
          "id": "online-other",
          "label": "其他电商"
        }
      ],
      "scope": [
        "overview",
        "region-store",
        "forecast",
        "otb",
        "pnl",
        "cashflow"
      ]
    },
    {
      "dimensionId": "product_role",
      "label": "货品角色",
      "type": "product_role",
      "values": [
        {
          "id": "hero",
          "label": "主推款",
          "metadata": {
            "salesRatioTarget": 0.4
          }
        },
        {
          "id": "traffic",
          "label": "引流款",
          "metadata": {
            "salesRatioTarget": 0.2
          }
        },
        {
          "id": "image",
          "label": "形象款",
          "metadata": {
            "salesRatioTarget": 0.15
          }
        },
        {
          "id": "profit",
          "label": "利润款",
          "metadata": {
            "salesRatioTarget": 0.15
          }
        },
        {
          "id": "clearance",
          "label": "清尾款",
          "metadata": {
            "salesRatioTarget": 0.1
          }
        }
      ],
      "scope": [
        "category-ops",
        "otb",
        "wave-planning"
      ]
    },
    {
      "dimensionId": "lifecycle_stage",
      "label": "生命周期阶段",
      "type": "lifecycle_stage",
      "values": [
        {
          "id": "development",
          "label": "开发期",
          "metadata": {
            "ssRange": "-120天",
            "awRange": "-150天"
          }
        },
        {
          "id": "sample",
          "label": "样品期",
          "metadata": {
            "ssRange": "-90天",
            "awRange": "-120天"
          }
        },
        {
          "id": "warmup",
          "label": "预热期",
          "metadata": {
            "ssRange": "-30天",
            "awRange": "-45天"
          }
        },
        {
          "id": "rampup",
          "label": "爬坡期",
          "metadata": {
            "ssRange": "0-30天",
            "awRange": "0-45天"
          }
        },
        {
          "id": "peak",
          "label": "巅峰期",
          "metadata": {
            "ssRange": "30-90天",
            "awRange": "45-120天"
          }
        },
        {
          "id": "decline",
          "label": "衰退期",
          "metadata": {
            "ssRange": "90-150天",
            "awRange": "120-180天"
          }
        },
        {
          "id": "clearance",
          "label": "清货期",
          "metadata": {
            "ssRange": "150天+",
            "awRange": "180天+"
          }
        }
      ],
      "scope": [
        "category-ops",
        "wave-planning",
        "forecast",
        "inventory-health"
      ]
    },
    {
      "dimensionId": "inventory_age",
      "label": "库龄段",
      "type": "inventory_age",
      "values": [
        {
          "id": "new",
          "label": "新品",
          "metadata": {
            "ageRange": "0-59天",
            "targetSellThrough": "25%-50%",
            "inventoryAction": "维持正常配货"
          }
        },
        {
          "id": "near-new",
          "label": "次新品",
          "metadata": {
            "ageRange": "60-89天",
            "targetSellThrough": "50%-70%",
            "inventoryAction": "关注断码并及时调拨"
          }
        },
        {
          "id": "normal",
          "label": "正常品",
          "metadata": {
            "ageRange": "90-119天",
            "targetSellThrough": "65%-80%",
            "inventoryAction": "停止补货并消化存量"
          }
        },
        {
          "id": "watch",
          "label": "关注品",
          "metadata": {
            "ageRange": "120-179天",
            "targetSellThrough": "75%-90%",
            "inventoryAction": "向折扣渠道或线上投放"
          }
        },
        {
          "id": "aged",
          "label": "老品",
          "metadata": {
            "ageRange": "180-364天",
            "targetSellThrough": "90%-95%",
            "inventoryAction": "批量出清并计提减值"
          }
        },
        {
          "id": "clearance",
          "label": "清仓品",
          "metadata": {
            "ageRange": "365天+",
            "targetSellThrough": "95%-100%",
            "inventoryAction": "紧急出清或批量处理"
          }
        }
      ],
      "scope": [
        "category-ops",
        "otb",
        "cashflow",
        "pnl",
        "inventory-health"
      ]
    }
  ],
  "thresholds": [
    {
      "thresholdId": "sellThroughRate_health",
      "label": "售罄率健康线",
      "unit": "percent",
      "defaultValue": 0.7,
      "warningValue": 0.5,
      "criticalValue": 0.3,
      "comparator": "gte",
      "appliedTo": [
        "category-ops",
        "wave-planning",
        "inventory-health",
        "region-store"
      ]
    },
    {
      "thresholdId": "grossMarginRate_health",
      "label": "毛利率健康线",
      "unit": "percent",
      "defaultValue": 0.5,
      "warningValue": 0.38,
      "criticalValue": 0.25,
      "comparator": "gte",
      "appliedTo": [
        "pnl",
        "overview",
        "annual-control"
      ]
    },
    {
      "thresholdId": "weeksOfSupply_max",
      "label": "库存周数上限",
      "unit": "weeks",
      "defaultValue": 12,
      "warningValue": 16,
      "criticalValue": 20,
      "comparator": "lte",
      "appliedTo": [
        "region-store",
        "inventory-health"
      ]
    },
    {
      "thresholdId": "brokenSizeRate_max",
      "label": "断码率上限",
      "unit": "percent",
      "defaultValue": 0.05,
      "warningValue": 0.1,
      "criticalValue": 0.2,
      "comparator": "lte",
      "appliedTo": [
        "region-store",
        "inventory-health"
      ]
    },
    {
      "thresholdId": "stockToSalesRatio_max",
      "label": "存销比上限",
      "unit": "ratio",
      "defaultValue": 4,
      "warningValue": 6,
      "criticalValue": 8,
      "comparator": "lte",
      "appliedTo": [
        "region-store",
        "otb",
        "wave-planning",
        "inventory-health"
      ]
    },
    {
      "thresholdId": "agedInventoryRate_max",
      "label": "库龄库存占比上限",
      "unit": "percent",
      "defaultValue": 0.15,
      "warningValue": 0.25,
      "criticalValue": 0.35,
      "comparator": "lte",
      "appliedTo": [
        "inventory-health",
        "category-ops"
      ]
    },
    {
      "thresholdId": "productAgeThreshold_ss",
      "label": "春夏品货龄警戒线",
      "unit": "days",
      "defaultValue": 90,
      "warningValue": 120,
      "criticalValue": 150,
      "comparator": "lte",
      "appliedTo": [
        "inventory-health",
        "wave-planning"
      ]
    },
    {
      "thresholdId": "productAgeThreshold_aw",
      "label": "秋冬品货龄警戒线",
      "unit": "days",
      "defaultValue": 180,
      "warningValue": 210,
      "criticalValue": 240,
      "comparator": "lte",
      "appliedTo": [
        "inventory-health",
        "wave-planning"
      ]
    },
    {
      "thresholdId": "discountRate_floor",
      "label": "折扣率下限",
      "unit": "percent",
      "defaultValue": 0.7,
      "warningValue": 0.6,
      "criticalValue": 0.5,
      "comparator": "gte",
      "appliedTo": [
        "pnl",
        "category-ops",
        "region-store"
      ]
    },
    {
      "thresholdId": "otbBudgetUtilization",
      "label": "OTB预算使用率",
      "unit": "percent",
      "defaultValue": 0.95,
      "warningValue": 0.8,
      "criticalValue": 0.7,
      "comparator": "gte",
      "appliedTo": [
        "otb",
        "annual-control"
      ]
    }
  ],
  "tabs": {
    "annual_control": {
      "tabKey": "annual-control",
      "sections": [
        {
          "id": "annual-target",
          "label": "年度总目标",
          "enabled": true,
          "order": 1
        },
        {
          "id": "season-split",
          "label": "季节拆分",
          "enabled": true,
          "order": 2
        },
        {
          "id": "wave-split",
          "label": "波段拆分",
          "enabled": true,
          "order": 3
        },
        {
          "id": "category-budget",
          "label": "品类预算",
          "enabled": true,
          "order": 4
        },
        {
          "id": "channel-budget",
          "label": "渠道预算",
          "enabled": true,
          "order": 5
        }
      ],
      "customSettings": {
        "fiscalYear": 2026
      }
    },
    "cashflow": {
      "tabKey": "cashflow",
      "sections": [
        {
          "id": "cashflow-summary",
          "label": "现金流汇总",
          "enabled": true,
          "order": 1
        },
        {
          "id": "inflow",
          "label": "回款计划",
          "enabled": true,
          "order": 2
        },
        {
          "id": "outflow",
          "label": "支出计划",
          "enabled": true,
          "order": 3
        },
        {
          "id": "inventory-lock",
          "label": "库存占款",
          "enabled": true,
          "order": 4
        },
        {
          "id": "clearance-sim",
          "label": "清货模拟",
          "enabled": true,
          "order": 5,
          "collapsedByDefault": true
        }
      ]
    },
    "category_ops": {
      "tabKey": "category-ops",
      "sections": [
        {
          "id": "category-split",
          "label": "品类结构",
          "enabled": true,
          "order": 1
        },
        {
          "id": "price-band",
          "label": "价格带分布",
          "enabled": true,
          "order": 2
        },
        {
          "id": "product-role",
          "label": "货品角色",
          "enabled": true,
          "order": 3
        },
        {
          "id": "lifecycle-stage",
          "label": "生命周期7阶段",
          "enabled": true,
          "order": 4
        },
        {
          "id": "last-type",
          "label": "楦型分析",
          "enabled": true,
          "order": 5
        }
      ]
    },
    "competitor_trend": {
      "tabKey": "competitor-trend",
      "sections": [
        {
          "id": "competitor-list",
          "label": "竞品列表",
          "enabled": true,
          "order": 1
        },
        {
          "id": "price-compare",
          "label": "价格对标",
          "enabled": true,
          "order": 2
        },
        {
          "id": "trend-signal",
          "label": "趋势信号",
          "enabled": true,
          "order": 3
        }
      ]
    },
    "consumer": {
      "tabKey": "consumer",
      "sections": [
        {
          "id": "member-overview",
          "label": "会员概览",
          "enabled": true,
          "order": 1
        },
        {
          "id": "rfm",
          "label": "RFM分层",
          "enabled": true,
          "order": 2
        },
        {
          "id": "preference",
          "label": "偏好分析",
          "enabled": true,
          "order": 3
        },
        {
          "id": "lifecycle",
          "label": "会员生命周期",
          "enabled": true,
          "order": 4
        }
      ]
    },
    "forecast": {
      "tabKey": "forecast",
      "sections": [
        {
          "id": "forecast-summary",
          "label": "预测汇总",
          "enabled": true,
          "order": 1
        },
        {
          "id": "scenario",
          "label": "情景分析",
          "enabled": true,
          "order": 2
        },
        {
          "id": "by-channel",
          "label": "渠道预测",
          "enabled": true,
          "order": 3
        },
        {
          "id": "by-category",
          "label": "品类预测",
          "enabled": true,
          "order": 4
        }
      ],
      "customSettings": {
        "scenarios": [
          "conservative",
          "base",
          "optimistic"
        ],
        "defaultScenario": "base"
      }
    },
    "inventory_health": {
      "tabKey": "inventory-health",
      "sections": [
        {
          "id": "health-overview",
          "label": "库存健康概览",
          "enabled": true,
          "order": 1
        },
        {
          "id": "age-structure",
          "label": "库龄结构",
          "enabled": true,
          "order": 2
        },
        {
          "id": "broken-size",
          "label": "断码分析",
          "enabled": true,
          "order": 3
        },
        {
          "id": "transfer-suggestion",
          "label": "调拨建议",
          "enabled": true,
          "order": 4
        },
        {
          "id": "provision",
          "label": "计提规则",
          "enabled": true,
          "order": 5,
          "collapsedByDefault": true
        }
      ]
    },
    "otb": {
      "tabKey": "otb",
      "sections": [
        {
          "id": "otb-summary",
          "label": "OTB汇总",
          "enabled": true,
          "order": 1
        },
        {
          "id": "otb-by-wave",
          "label": "波段OTB",
          "enabled": true,
          "order": 2
        },
        {
          "id": "otb-by-category",
          "label": "品类OTB",
          "enabled": true,
          "order": 3
        },
        {
          "id": "approval-flow",
          "label": "审批流",
          "enabled": true,
          "order": 4,
          "collapsedByDefault": true
        }
      ]
    },
    "overview": {
      "tabKey": "overview",
      "sections": [
        {
          "id": "kpi-bar",
          "label": "顶部KPI卡片",
          "enabled": true,
          "order": 1
        },
        {
          "id": "trend-chart",
          "label": "销售趋势图",
          "enabled": true,
          "order": 2
        },
        {
          "id": "narrative",
          "label": "决策摘要",
          "enabled": true,
          "order": 3
        },
        {
          "id": "category-split",
          "label": "品类结构",
          "enabled": true,
          "order": 4
        }
      ],
      "customSettings": {
        "defaultDateRange": "ytd",
        "showYoyComparison": true
      }
    },
    "pnl": {
      "tabKey": "pnl",
      "sections": [
        {
          "id": "pnl-summary",
          "label": "损益汇总",
          "enabled": true,
          "order": 1
        },
        {
          "id": "gross-margin",
          "label": "毛利分析",
          "enabled": true,
          "order": 2
        },
        {
          "id": "channel-cost",
          "label": "渠道费用",
          "enabled": true,
          "order": 3
        },
        {
          "id": "markdown",
          "label": "折扣损失",
          "enabled": true,
          "order": 4
        }
      ]
    },
    "region_store": {
      "tabKey": "region-store",
      "sections": [
        {
          "id": "region-overview",
          "label": "大区概览",
          "enabled": true,
          "order": 1
        },
        {
          "id": "city-tier",
          "label": "城市线级",
          "enabled": true,
          "order": 2
        },
        {
          "id": "store-tier",
          "label": "门店分级",
          "enabled": true,
          "order": 3
        },
        {
          "id": "store-list",
          "label": "门店明细",
          "enabled": true,
          "order": 4
        },
        {
          "id": "terminal-health",
          "label": "终端体检",
          "enabled": true,
          "order": 5
        },
        {
          "id": "ops-chain",
          "label": "运营链路",
          "enabled": true,
          "order": 6
        }
      ]
    },
    "wave_planning": {
      "tabKey": "wave-planning",
      "sections": [
        {
          "id": "wave-calendar",
          "label": "波段日历",
          "enabled": true,
          "order": 1
        },
        {
          "id": "wave-target",
          "label": "波段目标",
          "enabled": true,
          "order": 2
        },
        {
          "id": "launch-rhythm",
          "label": "上市节奏",
          "enabled": true,
          "order": 3
        },
        {
          "id": "season-temp",
          "label": "季节温度窗口",
          "enabled": true,
          "order": 4
        }
      ],
      "customSettings": {
        "waves": [
          "SS-1A",
          "SS-1B",
          "SS-2A",
          "SS-2B",
          "AW-1A",
          "AW-1B",
          "AW-2A",
          "AW-2B",
          "AW-3A",
          "AW-3B"
        ]
      }
    }
  }
} as const;
