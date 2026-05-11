# planning 模拟业务数据

这些 JSON 是当前项目的统一虚拟业务数据层，用来模拟后续真实业务接入后的表结构。

- wave_plan_master.json：波段企划总表，所有页面统一使用 waveKey。
- wave_plan_brief.json：波段企划 Brief，维护场景、客群、渠道、设计和尺码策略。
- wave_development_progress.json：波段开发进度闸口，模拟飞书/PLM节点状态。
- wave_category_mix.json：波段 x 品类结构。
- sales_forecast_plan.json：销售预测计划，按波段/品类/渠道。
- sales_forecast_channel_driver.json：销售预测区域气候驱动，按区域校验实体店季节节奏。
- sales_forecast_store_grade.json：销售预测门店等级，按店效、坪效、客流和转化拆解实体店目标。
- sales_forecast_ecommerce_funnel.json：销售预测电商漏斗，按曝光、访客、转化、客单和退款拆解GMV。
- sales_forecast_campaign_calendar.json：销售预测活动日历，绑定大促、折扣、投放和承接波段。
- sales_forecast_new_store_plan.json：销售预测新店爬坡，维护新店首批货、开业投入和成熟曲线。
- sales_forecast_size_curve.json：销售预测尺码曲线，校验核心码覆盖、边缘码超备和断码风险。
- otb_budget_plan.json：OTB预算计划，按版本/波段/品类。
- purchase_payment_plan.json：采购付款排期，供现金流读取。
- inventory_target_plan.json：库存健康目标，反向约束企划和OTB。
- feishu_workflow_tasks.json：飞书任务进度模拟表。

真实接入时优先替换这些表的数据源，而不是让各页面分散读取企业系统。


- pnl_brand_annual.json：品牌年度总 P&L，承接净收入、毛利、费用、EBIT、净利润和月度趋势。
- pnl_channel_contribution.json：渠道贡献利润，拆解实体店、电商、新店、加盟等渠道真实利润质量。
- pnl_category_contribution.json：品类贡献利润，支撑鞋类品类结构、毛利和费用分摊判断。
- pnl_discount_erosion.json：折扣侵蚀，量化正价、活动折扣、清货折扣对毛利的影响。
- pnl_store_model_assumptions.json：单店损益模型假设，维护客流、转化、租金、物业、押金和开店投入。
