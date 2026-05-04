# 真实数据接入规范 (Real Data Integration Spec)

当沙盘脱离 Mock（模拟）阶段，正式接驳真实的 BI、ERP 或数据中台时，我们需要要求后端/数据团队对 `factSales`（销售事实表）进行对应的字段扩容和规范，以真实支撑**折扣与毛利**的计算。

以下是具体的设定和对接指南：

---

### 1. 核心需求：底表需要新增 2 个关键数值
目前的 `factSales` 数据只有 `net_sales_amt`（净实销金额），要算出硬核的折扣与毛利，后端 API 的最小颗粒度（无论是明细还是按月聚合）必须抛出以下三个绝对数值：

1. **`net_sales_amt`（净销售额）**：实收的钱（已扣除券、满减等优惠）。
2. **`msrp_sales_amt`（吊牌总金额）**：卖出去的这些鞋，如果按原价算值多少钱。
3. **`cogs_amt`（销售成本 / Cost of Goods Sold）**：卖出去的这些鞋，工厂出厂价和固定成本一共是多少钱。

> **⚠️ 副官提醒各位数据架构师**：
> 强烈建议后端传输**绝对金额**，而不是直接传一个算好的百分比。因为前端经常需要做跨月汇总、跨渠道汇总，百分比是**不能直接相加求平均**的（只有 `(总利润A + 总利润B) / (总营收A + 总营收B)` 才是精确加权平均）。

---

### 2. 前端聚合引擎逻辑改造 (Frontend Aggregation Logic)

在未来接通真实数据后，组件内部的计算逻辑会从“情景模拟”无缝切换为“真实算盘”。改造极其简单，仅需替换掉现有代码中的一小段循环：

**切换前的现状（情景演练 Mock）：**
```typescript
// 当前代码：通过判断业绩超额幅度，反推模拟一个合理的折扣与毛利
if (row.achv !== null && row.achv > 1.05) {
  row.discountPct = baseDiscount - (row.achv - 1.0) * 0.3;
  row.marginPct = baseMargin - (row.achv - 1.0) * 0.4;
}
```

**切换后的真实逻辑（真实财报对账级）：**
```typescript
// 未来代码：完全依赖遍历数据中台传来的各行真实金额，进行科学聚合
currentYearSales.forEach((record) => {
  const month = getDashboardMonthByWave(record.wave);
  if (!month) return;
  
  rows[month - 1].actual += Number(record.net_sales_amt || 0); // 累计实际流水
  rows[month - 1].totalMsrp += Number(record.msrp_sales_amt || 0); // 累计原价总计
  rows[month - 1].totalCogs += Number(record.cogs_amt || 0); // 累计总成本
});

// 计算每月精确加权比率：
rows.forEach((row) => {
  // 实销平均折扣 = 净营收 ÷ 原价总合
  row.discountPct = row.totalMsrp > 0 ? (row.actual / row.totalMsrp) : baseDiscount;
  
  // 真实毛利率 = (净营收 - 成本) ÷ 净营收
  row.marginPct = row.actual > 0 ? ((row.actual - row.totalCogs) / row.actual) : baseMargin;
});
```

---

### 3. 数据层 JSON 契约示例 (API Response Schema)

以后只需把这份需求扔给公司的 IT 总监或数据团队，要求他们的接口返回这种格式即可（以 `fact_sales` 为例）：

```json
{
  "product_id": "SKU-9908",
  "channel_id": "CH-SZ-001",
  "sale_month": "2024-04",
  "qty_sold": 1500,               // 卖了1500双
  "net_sales_amt": 898500.00,     // 净营收到手 89.85万
  "msrp_sales_amt": 1498500.00,   // 原本按999吊牌价该卖 149.85万
  "cogs_amt": 419250.00           // 这批鞋拿货成本 41.92万
}
// 前端拿到后自动算出：本单折扣为 6.0折，毛利率为 53.3%。
```

### 4. 阈值与报警线设定 (Threshold Configuration)
关于我们在诊断卡里看到的报警线（例如：毛率 < 50% 报警），在真实上线时可以**脱离前端代码硬编码**：
我们可以在系统后台提供一个**“大盘阈值参数中心”**。作为总监，您可以在后台设置：
* 警戒毛利率红线 = `52%`
* 店铺良性 WOS = `4w ~ 10w`

网页初始化时拉取这些后台参数，所有的图表红绿灯、报警卡片就会像长了眼睛一样，严格遵照您的最新底线指标进行自动巡检！
