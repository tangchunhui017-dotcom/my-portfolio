/**
 * 生成模拟销售数据脚本
 * 运行: node scripts/generate-mock-data.js
 */
const fs = require('fs');
const path = require('path');

const skus = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/dashboard/dim_sku.json'), 'utf8'));
const channels = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/dashboard/dim_channel.json'), 'utf8'));

// 每个SKU的基础参数（模拟真实业务逻辑）
const skuParams = {
    'S001': { baseUnits: 120, sellThroughTarget: 0.88, marginRate: 0.52, channelMix: { C01: 0.55, C02: 0.15, C04: 0.15, C07: 0.10, C09: 0.05 } },
    'S002': { baseUnits: 90, sellThroughTarget: 0.82, marginRate: 0.50, channelMix: { C01: 0.50, C02: 0.20, C04: 0.15, C07: 0.10, C09: 0.05 } },
    'S003': { baseUnits: 100, sellThroughTarget: 0.85, marginRate: 0.53, channelMix: { C01: 0.60, C03: 0.15, C04: 0.10, C07: 0.10, C09: 0.05 } },
    'S004': { baseUnits: 80, sellThroughTarget: 0.78, marginRate: 0.51, channelMix: { C01: 0.55, C03: 0.20, C04: 0.10, C07: 0.10, C09: 0.05 } },
    'S005': { baseUnits: 200, sellThroughTarget: 0.90, marginRate: 0.55, channelMix: { C01: 0.45, C02: 0.15, C04: 0.15, C07: 0.15, C09: 0.10 } },
    'S006': { baseUnits: 180, sellThroughTarget: 0.88, marginRate: 0.54, channelMix: { C01: 0.45, C02: 0.15, C04: 0.15, C07: 0.15, C09: 0.10 } },
    'S007': { baseUnits: 250, sellThroughTarget: 0.92, marginRate: 0.58, channelMix: { C01: 0.50, C02: 0.10, C04: 0.15, C07: 0.15, C09: 0.10 } },
    'S008': { baseUnits: 70, sellThroughTarget: 0.75, marginRate: 0.48, channelMix: { C01: 0.40, C02: 0.20, C04: 0.15, C07: 0.15, C10: 0.10 } },
    'S009': { baseUnits: 60, sellThroughTarget: 0.70, marginRate: 0.46, channelMix: { C01: 0.40, C02: 0.20, C04: 0.15, C07: 0.15, C10: 0.10 } },
    'S010': { baseUnits: 45, sellThroughTarget: 0.65, marginRate: 0.44, channelMix: { C01: 0.35, C02: 0.15, C04: 0.20, C07: 0.15, C10: 0.15 } },
    'S011': { baseUnits: 150, sellThroughTarget: 0.60, marginRate: 0.35, channelMix: { C01: 0.60, C02: 0.20, C04: 0.10, C07: 0.10 } },
    'S012': { baseUnits: 120, sellThroughTarget: 0.55, marginRate: 0.32, channelMix: { C01: 0.65, C02: 0.15, C04: 0.10, C07: 0.10 } },
    'S013': { baseUnits: 35, sellThroughTarget: 0.72, marginRate: 0.50, channelMix: { C01: 0.35, C02: 0.15, C04: 0.20, C09: 0.15, C10: 0.15 } },
    'S014': { baseUnits: 160, sellThroughTarget: 0.80, marginRate: 0.56, channelMix: { C01: 0.55, C03: 0.20, C04: 0.10, C07: 0.15 } },
    'S015': { baseUnits: 30, sellThroughTarget: 0.68, marginRate: 0.45, channelMix: { C01: 0.30, C02: 0.15, C04: 0.20, C09: 0.15, C10: 0.20 } },
};

// 售罄率曲线（S型增长，模拟12周上市节奏）
function getSellThroughCurve(week, targetST) {
    const curves = [0.08, 0.18, 0.30, 0.42, 0.54, 0.63, 0.71, 0.77, 0.82, 0.86, 0.89, 0.91];
    return Math.min(curves[week - 1] * (targetST / 0.91), 1.0);
}

// 折扣曲线（随周期加深）
function getDiscountRate(week, lifecycle) {
    if (lifecycle === '清仓') return 0.55 + (week * 0.02);
    if (lifecycle === '常青') return 0.88 - (week * 0.005);
    // 新品：前4周保价，后续逐步折扣
    if (week <= 4) return 0.98;
    return Math.max(0.75, 0.98 - (week - 4) * 0.015);
}

const records = [];
let recordId = 1;

skus.forEach(sku => {
    const params = skuParams[sku.sku_id];
    if (!params) return;

    const totalInventory = params.baseUnits;
    let cumulativeSold = 0;

    for (let week = 1; week <= 12; week++) {
        const cumulativeST = getSellThroughCurve(week, params.sellThroughTarget);
        const targetCumulativeSold = Math.round(totalInventory * cumulativeST);
        const weekSold = Math.max(0, targetCumulativeSold - cumulativeSold);
        cumulativeSold = targetCumulativeSold;

        if (weekSold === 0) continue;

        const discountRate = getDiscountRate(week, sku.lifecycle);
        const netPrice = sku.msrp * discountRate;

        // 按渠道分配
        Object.entries(params.channelMix).forEach(([channelId, ratio]) => {
            const channelUnits = Math.round(weekSold * ratio);
            if (channelUnits === 0) return;

            const grossSales = channelUnits * sku.msrp;
            const netSales = channelUnits * netPrice;
            const discountAmt = grossSales - netSales;
            const cogs = netSales * (1 - params.marginRate);
            const grossProfit = netSales - cogs;

            records.push({
                record_id: `F${String(recordId++).padStart(5, '0')}`,
                sku_id: sku.sku_id,
                channel_id: channelId,
                season_year: sku.season_year,
                season: sku.season,
                wave: `W${week}`,
                week_num: week,
                unit_sold: channelUnits,
                gross_sales_amt: Math.round(grossSales),
                net_sales_amt: Math.round(netSales),
                discount_amt: Math.round(discountAmt),
                discount_rate: Math.round((1 - discountRate) * 100) / 100,
                cogs_amt: Math.round(cogs),
                gross_profit_amt: Math.round(grossProfit),
                gross_margin_rate: Math.round(params.marginRate * 100) / 100,
                cumulative_sell_through: Math.round(cumulativeST * 100) / 100,
                on_hand_unit: Math.max(0, totalInventory - cumulativeSold)
            });
        });
    }
});

fs.writeFileSync(
    path.join(__dirname, '../data/dashboard/fact_sales.json'),
    JSON.stringify(records, null, 2)
);

console.log(`✅ 生成完成：${records.length} 条销售记录`);
