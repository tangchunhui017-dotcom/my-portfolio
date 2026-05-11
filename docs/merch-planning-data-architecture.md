# 商品企划到经营测算数据架构方案

## 目标

当前项目仍在使用虚拟数据，适合先把真实业务的数据边界和流转关系固定下来。后期接入企业系统、飞书多维表格或数据库时，页面不应该再各自维护一套波段、品类、预算和进度字段，而是通过统一数据契约读取。

核心原则：

- 所有业务表都必须使用统一 `waveKey = YYYY-SEASON-WAVE`，例如 `2026-SS-1A`。
- 基础主数据从企业系统读取，业务进度从飞书/审批/任务流同步，页面只做计算、校验和展示。
- 计划表按版本维护，事实表按日期追加，不覆盖历史。
- 波段企划负责结构，OTB负责预算，现金流负责收付款，销售预测负责收入，损益负责利润，库存健康负责库存约束和反向修正。

## 六个 TAB 的业务流转

实际业务不是单向瀑布，而是一个闭环：

1. **波段企划** 定义波段、上市节奏、品类结构、款数、SKU、深度和节点。
2. **销售预测** 读取波段结构、历史销售、渠道目标，输出月度/渠道/品类/波段预测。
3. **OTB预算** 读取销售预测、库存目标和波段结构，形成采购预算、审批预算、采购付款排期。
4. **现金流** 读取销售回款和采购付款，检查资金缺口、付款压力和授信需求。
5. **损益** 读取销售预测、采购成本、毛利和费用率，判断利润是否达标。
6. **库存健康** 读取库存、销售、入仓和波段计划，输出断货/积压/清货/补货动作，并反向约束下一轮波段企划和OTB。

因此 UI 上虽然按 `波段企划 -> OTB预算 -> 现金流 -> 销售预测 -> 损益 -> 库存健康` 展示，但计算关系里 `销售预测` 和 `库存健康` 都会反向影响 OTB。

## 推荐表结构

### 主数据层

- `dim_wave`：波段维表，唯一维护 `fiscalYear / seasonCode / waveCode / waveKey / launchDate`。
- `dim_product_sku`：款色码、品类、价格带、生命周期、吊牌价。
- `dim_category`：品类层级。
- `dim_channel_store`：渠道、区域、门店、城市级别。
- `dim_supplier`：供应商、账期、付款条件。
- `dim_calendar`：自然日、财年、周、月、节假日、销售季。

### 计划层

- `plan_wave_master`：波段企划总表，维护波段结构、主题、款数、SKU、深度、主推品类、目标售罄。
- `plan_wave_brief`：波段企划 Brief，维护消费场景、目标客群、渠道重点、设计主题、颜色材质和核心尺码段。
- `plan_wave_category_mix`：波段 x 品类结构。
- `plan_sales_forecast`：月度/渠道/品类/波段销售预测。
- `plan_sales_forecast_channel_driver`：区域气候、品类节奏和实体店月度预测。
- `plan_sales_forecast_store_grade`：门店等级、店效、坪效、客流、转化和客单拆解。
- `plan_sales_forecast_ecommerce_funnel`：电商曝光、访客、转化、客单、退款和费用率漏斗。
- `plan_sales_forecast_campaign_calendar`：大促目标、折扣、投放、库存风险和承接波段。
- `plan_sales_forecast_new_store`：新店首批货、开业投入、成熟店模型和爬坡曲线。
- `plan_sales_forecast_size_curve`：波段/品类/尺码段的核心码覆盖、边缘码超备和断码风险。
- `plan_otb_budget`：版本 x 波段 x 品类采购预算。
- `plan_purchase_payment`：采购付款排期。
- `plan_cashflow_monthly`：月度现金流预测。
- `plan_pnl_monthly`：月度/渠道/品类损益预测。
- `plan_pnl_brand_annual`：品牌年度总 P&L，统一承接吊牌 GMV、折扣、退货、净收入、COGS、毛利、费用、EBIT 和净利润。
- `plan_pnl_channel_contribution`：渠道贡献利润，拆解实体店、电商、新店、加盟等渠道净收入、毛利、费用和贡献利润。
- `plan_pnl_category_contribution`：品类贡献利润，拆解鞋类品类销售占比、毛利率、费用分摊和商品动作。
- `plan_pnl_discount_erosion`：折扣侵蚀，量化正价、活动折扣、清货折扣对销售额和毛利的侵蚀。
- `plan_pnl_store_model_assumptions`：单店损益模型假设，维护客流、转化、客单、连带、租金、物业、押金、装修和首批货投入。
- `plan_inventory_target`：库存目标、WOS、清货/补货动作。

### 事实层

- `fact_sales_daily`：POS/电商销售事实，按日追加。
- `fact_inventory_daily`：WMS/门店库存快照，按日追加。
- `fact_purchase_order`：ERP采购订单事实。
- `fact_inbound`：WMS入仓事实。
- `fact_cash_receipt_payment`：回款/付款事实。
- `fact_expense`：费用事实。

### 工作流层

- `workflow_feishu_task`：飞书进度、责任人、截止日期、审批状态。
- `workflow_wave_development_progress`：波段开发进度闸口，维护企划、设计、样品、核价、下单、入仓、上市、复盘等节点。
- `workflow_approval`：预算审批、变更审批。
- `sync_job_log`：企业系统/飞书同步日志。
- `dq_exception`：数据质量异常，如缺波段、预算不平、日期倒挂、品类不匹配。

## 维护方式

真实业务每天写入时建议按下面分工：

- 企业系统自动同步：SKU、品类、门店、销售、库存、采购订单、入仓、财务收付款。
- 飞书人工维护：波段企划任务进度、设计开发进度、核价状态、审批状态、节点确认。
- 系统计算生成：销售预测、OTB预算、现金流、损益、库存健康结论。
- 业务人工修正：只能写入计划表的新版本或变更申请，不能直接改事实表。

所有人工修改建议带字段：

- `version`
- `status`
- `owner`
- `updatedAt`
- `sourceSystem`
- `sourceRecordId`
- `approvalStatus`

## 当前代码落地

本次先在代码中固化两层：

- `src/config/merchPlanningDataArchitecture.ts`：定义六个TAB的表契约、读写关系和校验规则。
- `src/utils/wavePlanMaster.ts`：读取 `data/planning/wave_plan_master.json`，统一输出给波段企划、OTB预算、执行跟踪和现金流。
- `src/hooks/useCashflow.ts`：优先读取 `data/planning/purchase_payment_plan.json` 作为采购付款排期，缺失或模拟账期调整时再回退到波段预算推导。

当前已统一的虚拟业务表在 `data/planning/`：

- `wave_plan_master.json`：波段企划总表。
- `wave_plan_brief.json`：波段企划 Brief。
- `wave_development_progress.json`：波段开发进度闸口。
- `wave_category_mix.json`：波段 x 品类结构。
- `sales_forecast_plan.json`：销售预测计划。
- `sales_forecast_channel_driver.json`：销售预测区域气候驱动。
- `sales_forecast_store_grade.json`：销售预测门店等级。
- `sales_forecast_ecommerce_funnel.json`：销售预测电商漏斗。
- `sales_forecast_campaign_calendar.json`：销售预测活动日历。
- `sales_forecast_new_store_plan.json`：销售预测新店爬坡。
- `sales_forecast_size_curve.json`：销售预测尺码曲线。
- `pnl_brand_annual.json`：品牌年度总 P&L。
- `pnl_channel_contribution.json`：渠道贡献利润。
- `pnl_category_contribution.json`：品类贡献利润。
- `pnl_discount_erosion.json`：折扣侵蚀。
- `pnl_store_model_assumptions.json`：单店损益模型假设。
- `otb_budget_plan.json`：OTB预算计划。
- `purchase_payment_plan.json`：采购付款排期。
- `inventory_target_plan.json`：库存健康目标。
- `feishu_workflow_tasks.json`：飞书任务进度模拟表。

这些文件由 `scripts/generate-planning-mock-data.js` 生成，保证当前虚拟数据和后续真实数据接入的表结构一致。后续接真实数据时，优先替换 `data/planning/` 的来源，不需要让每个页面分别读取飞书或企业系统。
