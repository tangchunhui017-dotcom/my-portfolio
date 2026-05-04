# Dashboard 真实数据接入模板

## 1. 目的

这份文档用于后期接入真实销售数据时的字段对照与导入口径说明。

当前项目已经固定为两层结构：

1. 标准化基础数据层
2. 季节承接节奏图专用分析层

后续正确链路是：

1. 将真实数据映射到标准字段
2. 生成标准化的 `fact_sales`、`dim_sku`、`carryover_registry`
3. 由现有承接分析规则自动产出图表结果

不需要再单独维护一份“承接图最终结果表”。

## 2. 当前生效的数据表

### 2.1 `fact_sales`

销售事实表。页面筛选、承接分析、销售金额汇总都从这里取数。

### 2.2 `dim_sku`

SKU 维表。商品开发季、品类、常青属性等从这里取数。

### 2.3 `carryover_registry`

常青款白名单。常青款优先按这张表识别，缺失时才回退规则兜底。

## 3. `fact_sales` 标准字段

### 3.1 必填字段

| 标准字段 | 类型 | 示例 | 用途 |
| --- | --- | --- | --- |
| `record_id` | string | `TXN202404001` | 销售记录唯一标识 |
| `sku_id` | string | `S001` | 关联 SKU |
| `sale_year` | string/int | `2024` | 页面年筛选 |
| `sale_month` | int | `4` | 页面月筛选 |
| `sale_wave` | string | `W04` | 当前项目月粒度波段，默认与月份一一对应 |
| `sales_season_year` | string/int | `2023` | 销售归属货季年 |
| `sales_season` | string | `Q4` | 销售归属货季季别 |
| `unit_sold` | number | `35` | 销量 |
| `net_sales_amt` | number | `12480` | 净销售额 |
| `gross_profit_amt` | number | `4368` | 毛利额 |
| `cumulative_sell_through` | number | `0.72` | 累计售罄率 |

### 3.2 建议保留字段

| 标准字段 | 类型 | 示例 | 用途 |
| --- | --- | --- | --- |
| `channel_id` | string | `mall` | 渠道分析 |
| `gross_sales_amt` | number | `15600` | 折前销售额 |
| `discount_amt` | number | `3120` | 折扣额 |
| `discount_rate` | number | `0.2` | 折扣率 |
| `cogs_amt` | number | `8112` | 成本额 |
| `gross_margin_rate` | number | `0.35` | 毛利率 |
| `on_hand_unit` | number | `120` | 在手库存 |

### 3.3 常青款相关字段

这些字段允许直接落在 `fact_sales`，也可以由 `sku_id` 回表得到；当前项目两边都支持。

| 标准字段 | 允许值 | 用途 |
| --- | --- | --- |
| `product_track` | `seasonal` / `evergreen` | 区分季节货与常青款 |
| `is_carryover` | `true` / `false` | 常青款布尔标记 |
| `carryover_type` | `iconic` / `seasonal` / `null` | 常青子类 |
| `carryover_status` | `active` / `phasing_out` / `null` | 常青状态 |
| `carryover_protection_end` | `YYYY-MM-DD` / `null` | 保护期结束日 |
| `carryover_entry_source` | `manual_whitelist` / `rule_inferred` / 其他内部值 | 常青来源 |
| `monitor_mode` | `stock_water_level` / `sell_through` | 监控模式 |
| `non_main_reason` | 见第 6 节 | 非主承接原因码 |

## 4. `dim_sku` 标准字段

### 4.1 必填字段

| 标准字段 | 类型 | 示例 | 用途 |
| --- | --- | --- | --- |
| `sku_id` | string | `S001` | 主键 |
| `sku_name` | string | `Classic Runner` | SKU 名称 |
| `dev_season_year` | string/int | `2024` | 开发归属年 |
| `dev_season` | string | `Q2` | 开发归属季 |

### 4.2 建议保留字段

| 标准字段 | 示例 | 用途 |
| --- | --- | --- |
| `category_id` | `RUN` | 一级品类映射 |
| `category_name` | `跑鞋` | 品类展示 |
| `category_l1` | `运动鞋` | 大类分析 |
| `category_l2` | `跑鞋` | 二级类分析 |
| `product_line` | `专业跑步` | 产品线分析 |
| `price_band` | `PB3` | 价格带分析 |
| `msrp` | `399` | 吊牌价 |
| `launch_date` | `2024-03-05` | 上市日 |
| `launch_wave` | `W03` | 上市波段 |
| `lifecycle` | `新品` / `次新品` / `老品` | 当前库龄层级展示 |

### 4.3 常青款字段

`dim_sku` 建议始终保留以下字段，作为常青款主识别入口：

| 标准字段 | 允许值 |
| --- | --- |
| `product_track` | `seasonal` / `evergreen` |
| `is_carryover` | `true` / `false` |
| `carryover_type` | `iconic` / `seasonal` / `null` |
| `carryover_status` | `active` / `phasing_out` / `null` |
| `carryover_protection_end` | `YYYY-MM-DD` / `null` |
| `carryover_entry_source` | `manual_whitelist` / `rule_inferred` / 其他内部值 |
| `monitor_mode` | `stock_water_level` / `sell_through` |
| `non_main_reason` | `carryover_active` / `carryover_protected` / `aged_tail` / `future_preheat` / `unclassified` / `null` |

## 5. `carryover_registry` 标准字段

这张表是常青款白名单，后续真实接数时建议人工维护。

### 5.1 最小字段

| 字段 | 类型 | 示例 | 说明 |
| --- | --- | --- | --- |
| `sku_id` | string | `S001` | 必填 |
| `sku_name` | string | `Classic Runner` | 建议填 |
| `is_carryover` | boolean | `true` | 是否常青 |
| `carryover_type` | string | `iconic` | 常青类型 |
| `carryover_status` | string | `active` | 常青状态 |
| `carryover_protection_end` | string/null | `2024-09-30` | 保护期结束日 |
| `carryover_entry_source` | string | `manual_whitelist` | 来源 |
| `monitor_mode` | string | `stock_water_level` | 监控模式 |
| `non_main_reason` | string | `carryover_active` | 原因码 |

### 5.2 当前建议

真实业务接入初期，先人工维护这张表，不做复杂自动准入。

## 6. 枚举值和口径规则

### 6.1 季节枚举

| 值 | 含义 |
| --- | --- |
| `Q1` | 春 |
| `Q2` | 夏 |
| `Q3` | 秋 |
| `Q4` | 冬 |

### 6.2 波段枚举

当前项目按月粒度使用：

| 值 | 含义 |
| --- | --- |
| `W01` | 1 月 |
| `W02` | 2 月 |
| `W03` | 3 月 |
| `W04` | 4 月 |
| `W05` | 5 月 |
| `W06` | 6 月 |
| `W07` | 7 月 |
| `W08` | 8 月 |
| `W09` | 9 月 |
| `W10` | 10 月 |
| `W11` | 11 月 |
| `W12` | 12 月 |

如果未来真实系统有周维度或更细颗粒度，仍建议在接入本项目时先汇总到月。

### 6.3 销售发生时间和销售归属货季必须分开

这是当前项目最重要的口径。

- `sale_year / sale_month / sale_wave`
  - 用于页面筛选
- `sales_season_year / sales_season`
  - 用于承接图归类
- `dev_season_year / dev_season`
  - 用于商品开发属性

示例：

- 一笔发生在 `2024-01` 的销售，如果卖的是 `冬23` 的货：
  - `sale_year = 2024`
  - `sale_month = 1`
  - `sale_wave = W01`
  - `sales_season_year = 2023`
  - `sales_season = Q4`

### 6.4 常青款最小规则

- `is_carryover = true`
  - 不走四季售罄率预警
  - 走库存水位 / 补货逻辑
- `is_carryover = false`
  - 严格走四季 5 阶段售罄率逻辑
- `carryover_status = phasing_out`
  - 视为退出常青通道，可重新回到季节货清货逻辑

### 6.5 非主承接原因码

当前项目建议使用：

| 值 | 含义 |
| --- | --- |
| `carryover_active` | 活跃常青款 |
| `carryover_protected` | 保护期内常青款 |
| `aged_tail` | 真正的前季尾货 / 老尾货 |
| `future_preheat` | 未来季前置销售 |
| `unclassified` | 季别缺失或异常数据 |

## 7. 推荐映射方式

### 7.1 ERP/BI 原始销售表 -> `fact_sales`

| 原系统字段 | 标准字段 | 备注 |
| --- | --- | --- |
| 交易单号 / 明细号 | `record_id` | 必须唯一 |
| 商品编码 | `sku_id` | 必填 |
| 销售日期 | `sale_year` / `sale_month` | 从日期拆出 |
| 销售日期 | `sale_wave` | 当前项目按月映射为 `W01-W12` |
| 销售货季年 | `sales_season_year` | 必填 |
| 销售货季季别 | `sales_season` | 必填 |
| 销量 | `unit_sold` | 必填 |
| 净销售额 | `net_sales_amt` | 必填 |
| 毛利额 | `gross_profit_amt` | 必填 |
| 累计售罄率 | `cumulative_sell_through` | 建议保留 |
| 渠道 | `channel_id` | 建议保留 |
| 在手库存 | `on_hand_unit` | 建议保留 |

### 7.2 商品主数据 -> `dim_sku`

| 原系统字段 | 标准字段 | 备注 |
| --- | --- | --- |
| 商品编码 | `sku_id` | 必填 |
| 商品名称 | `sku_name` | 必填 |
| 开发年 | `dev_season_year` | 建议保留 |
| 开发季 | `dev_season` | 建议保留 |
| 一级/二级类目 | `category_l1` / `category_l2` | 建议保留 |
| 产品线 | `product_line` | 建议保留 |
| 上市日期 | `launch_date` | 建议保留 |
| 吊牌价 | `msrp` | 建议保留 |

### 7.3 商品规划白名单 -> `carryover_registry`

| 原系统字段 | 标准字段 | 备注 |
| --- | --- | --- |
| 商品编码 | `sku_id` | 必填 |
| 常青标记 | `is_carryover` | 必填 |
| 常青类型 | `carryover_type` | `iconic` / `seasonal` |
| 常青状态 | `carryover_status` | `active` / `phasing_out` |
| 保护期截止日 | `carryover_protection_end` | 可空 |

## 8. 最小样例

### 8.1 `fact_sales` 样例

```json
{
  "record_id": "TXN202404001",
  "sku_id": "S001",
  "channel_id": "mall",
  "sale_year": "2024",
  "sale_month": 4,
  "sale_wave": "W04",
  "sales_season_year": "2024",
  "sales_season": "Q2",
  "unit_sold": 35,
  "net_sales_amt": 12480,
  "gross_profit_amt": 4368,
  "cumulative_sell_through": 0.72,
  "product_track": "seasonal",
  "is_carryover": false,
  "carryover_type": null,
  "carryover_status": null,
  "carryover_protection_end": null,
  "carryover_entry_source": "rule_inferred",
  "monitor_mode": "sell_through",
  "non_main_reason": null
}
```

### 8.2 `dim_sku` 样例

```json
{
  "sku_id": "S001",
  "sku_name": "Classic Runner",
  "category_l1": "运动鞋",
  "category_l2": "跑鞋",
  "product_line": "专业跑步",
  "msrp": 399,
  "launch_date": "2024-03-05",
  "launch_wave": "W03",
  "lifecycle": "新品",
  "dev_season_year": "2024",
  "dev_season": "Q2",
  "product_track": "seasonal",
  "is_carryover": false,
  "carryover_type": null,
  "carryover_status": null,
  "carryover_protection_end": null,
  "carryover_entry_source": "rule_inferred",
  "monitor_mode": "sell_through",
  "non_main_reason": null
}
```

### 8.3 `carryover_registry` 样例

```json
{
  "sku_id": "S010",
  "sku_name": "Classic Court",
  "is_carryover": true,
  "carryover_type": "iconic",
  "carryover_status": "active",
  "carryover_protection_end": null,
  "carryover_entry_source": "manual_whitelist",
  "monitor_mode": "stock_water_level",
  "non_main_reason": "carryover_active"
}
```

## 9. 导入步骤建议

1. 从真实系统导出销售事实、商品主数据、常青白名单
2. 按本模板映射到标准字段
3. 运行 `npm run standardize:dashboard-schema`
4. 运行 `npm run check:season-transition`
5. 运行 `npm run build`
6. 核对 `2024/4` 这类关键月份的承接拆分是否与业务口径一致

## 10. 当前项目内的关键入口

- 承接规则入口：[dashboardSeasonTransition.ts](/f:/github-pnpm/portfolio-site/src/config/dashboardSeasonTransition.ts)
- 承接标准分析层：[dashboardSeasonTransitionStandard.ts](/f:/github-pnpm/portfolio-site/src/config/dashboardSeasonTransitionStandard.ts)
- 页面筛选入口：[useDashboardFilter.ts](/f:/github-pnpm/portfolio-site/src/hooks/useDashboardFilter.ts)
- 常青规则入口：[dashboardCarryover.ts](/f:/github-pnpm/portfolio-site/src/config/dashboardCarryover.ts)
- 常青白名单：[carryover_registry.json](/f:/github-pnpm/portfolio-site/data/dashboard/carryover_registry.json)

## 11. 结论

后期接入真实数据时，只要先把真实字段映射到这套标准 schema，就可以继续沿用当前这套承接分析链路，不需要重新设计图表数据结构。
