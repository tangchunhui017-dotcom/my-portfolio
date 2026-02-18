/**
 * 生成模拟销售数据脚本 - 企业级版本
 * 目标：300 SKU，总销售额 9000万-1亿，线下 70% / 线上 30%
 * 运行: node scripts/generate-mock-data.js
 */
const fs = require('fs');
const path = require('path');

const skus = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/dashboard/dim_sku.json'), 'utf8'));

// ============================================================
// 1. 渠道配置
// 线上 30%: C01天猫(15%) C02京东(10%) C03抖音(5%)
// 线下 70%: C04直营华东(15%) C05直营华南(10%) C06直营华北(10%)
//           C07加盟华东(15%) C08加盟华南(10%) C09百货KA(5%) C10运动连锁KA(5%)
// ============================================================
const CHANNEL_MIX_BASE = {
    // 线上 30%
    C01: 0.15,  // 天猫旗舰店
    C02: 0.10,  // 京东自营
    C03: 0.05,  // 抖音直播
    // 线下 70%
    C04: 0.15,  // 直营华东
    C05: 0.10,  // 直营华南
    C06: 0.10,  // 直营华北
    C07: 0.15,  // 加盟华东
    C08: 0.10,  // 加盟华南
    C09: 0.05,  // 百货KA
    C10: 0.05,  // 运动连锁KA
};

// 不同生命周期的渠道偏好（在基础比例上微调）
function getChannelMix(lifecycle, priceBand) {
    const mix = { ...CHANNEL_MIX_BASE };

    if (lifecycle === '清仓') {
        // 清仓款：电商比例提升（线上清库存），KA 比例提升
        mix.C01 += 0.05; mix.C02 += 0.03; mix.C03 += 0.02;
        mix.C09 += 0.03; mix.C10 += 0.03;
        mix.C04 -= 0.04; mix.C05 -= 0.04; mix.C06 -= 0.04; mix.C07 -= 0.02; mix.C08 -= 0.02;
    } else if (lifecycle === '新品') {
        // 新品：直营比例提升（保价），电商略低
        mix.C04 += 0.04; mix.C05 += 0.03; mix.C06 += 0.03;
        mix.C01 -= 0.03; mix.C02 -= 0.03; mix.C03 -= 0.02; mix.C09 -= 0.01; mix.C10 -= 0.01;
    }

    if (priceBand === 'PB5' || priceBand === 'PB6') {
        // 高价带：直营占比更高（品牌体验），电商略低
        mix.C04 += 0.03; mix.C05 += 0.02; mix.C06 += 0.02;
        mix.C01 -= 0.03; mix.C02 -= 0.02; mix.C03 -= 0.02;
    }

    // 归一化确保总和为 1
    const total = Object.values(mix).reduce((a, b) => a + b, 0);
    Object.keys(mix).forEach(k => mix[k] = Math.round(mix[k] / total * 1000) / 1000);
    return mix;
}

// ============================================================
// 2. 按价格带和生命周期推算 SKU 基础参数
// 目标总销售额：9000万-1亿
// 300 SKU × 平均净销售额 ≈ 30万/SKU（加权后）
// ============================================================
const PRICE_BAND_CONFIG = {
    //  价格带    MSRP   库存深度   毛利率   售罄目标
    PB1: { msrp: 249, baseUnits: 2100, marginRate: 0.40, stTarget: 0.82 },  // ¥199-299 走量款
    PB2: { msrp: 349, baseUnits: 1600, marginRate: 0.44, stTarget: 0.80 },  // ¥300-399 主力款
    PB3: { msrp: 449, baseUnits: 1200, marginRate: 0.47, stTarget: 0.78 },  // ¥400-499 主力款
    PB4: { msrp: 549, baseUnits: 800, marginRate: 0.50, stTarget: 0.75 },  // ¥500-599 形象款
    PB5: { msrp: 649, baseUnits: 500, marginRate: 0.53, stTarget: 0.70 },  // ¥600-699 形象款
    PB6: { msrp: 799, baseUnits: 280, marginRate: 0.56, stTarget: 0.65 },  // ¥700+   创新款
};

const LIFECYCLE_MODIFIER = {
    '常青': { unitsMult: 1.3, stMult: 1.05, marginMult: 1.02 },  // 常青款：销量大、售罄率高
    '新品': { unitsMult: 1.0, stMult: 1.00, marginMult: 1.00 },  // 新品：基准
    '清仓': { unitsMult: 0.7, stMult: 0.85, marginMult: 0.80 },  // 清仓款：折扣深、毛利低
};

function getSkuParams(sku) {
    const bandConfig = PRICE_BAND_CONFIG[sku.price_band] || PRICE_BAND_CONFIG['PB2'];
    const lcMod = LIFECYCLE_MODIFIER[sku.lifecycle] || LIFECYCLE_MODIFIER['新品'];

    // 加入随机扰动（±15%），让数据更真实
    const noise = () => 0.85 + Math.random() * 0.30;

    return {
        baseUnits: Math.round(bandConfig.baseUnits * lcMod.unitsMult * noise()),
        sellThroughTarget: Math.min(0.95, bandConfig.stTarget * lcMod.stMult * noise()),
        marginRate: Math.min(0.65, bandConfig.marginRate * lcMod.marginMult),
        channelMix: getChannelMix(sku.lifecycle, sku.price_band),
    };
}

// ============================================================
// 3. 售罄率 S 型曲线（12周上市节奏）
// ============================================================
function getSellThroughCurve(week, targetST) {
    // S 型增长曲线，第12周达到目标售罄率
    const curves = [0.08, 0.18, 0.30, 0.42, 0.54, 0.63, 0.71, 0.77, 0.82, 0.86, 0.89, 0.91];
    return Math.min(curves[Math.min(week - 1, 11)] * (targetST / 0.91), 1.0);
}

// ============================================================
// 4. 折扣曲线（随周期加深）
// ============================================================
function getDiscountRate(week, lifecycle) {
    if (lifecycle === '清仓') return Math.max(0.50, 0.72 - (week * 0.015));
    if (lifecycle === '常青') return Math.max(0.82, 0.92 - (week * 0.005));
    // 新品：前4周保价，后续逐步折扣
    if (week <= 4) return 0.98;
    return Math.max(0.78, 0.98 - (week - 4) * 0.015);
}

// ============================================================
// 5. 生成记录
// ============================================================
const records = [];
let recordId = 1;

// 固定随机种子效果（通过预生成参数）
const skuParamsCache = {};
skus.forEach(sku => {
    skuParamsCache[sku.sku_id] = getSkuParams(sku);
});

skus.forEach(sku => {
    const params = skuParamsCache[sku.sku_id];
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
            if (ratio <= 0) return;
            const channelUnits = Math.round(weekSold * ratio);
            if (channelUnits === 0) return;

            const grossSales = channelUnits * sku.msrp;
            const netSales = channelUnits * netPrice;
            const discountAmt = grossSales - netSales;
            const cogs = netSales * (1 - params.marginRate);
            const grossProfit = netSales - cogs;

            records.push({
                record_id: `F${String(recordId++).padStart(6, '0')}`,
                sku_id: sku.sku_id,
                channel_id: channelId,
                season_year: sku.season_year,
                season: sku.season,
                wave: `W${String(week).padStart(2, '0')}`,
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
                on_hand_unit: Math.max(0, totalInventory - cumulativeSold),
            });
        });
    }
});

// ============================================================
// 6. 输出统计
// ============================================================
const totalNetSales = records.reduce((sum, r) => sum + r.net_sales_amt, 0);
const totalUnits = records.reduce((sum, r) => sum + r.unit_sold, 0);
const onlineSales = records
    .filter(r => ['C01', 'C02', 'C03'].includes(r.channel_id))
    .reduce((sum, r) => sum + r.net_sales_amt, 0);
const offlineSales = totalNetSales - onlineSales;

console.log(`✅ 生成完成：${records.length} 条销售记录`);
console.log(`📦 SKU 数量：${skus.length} 个`);
console.log(`💰 总净销售额：¥${(totalNetSales / 10000).toFixed(0)} 万`);
console.log(`👟 总销量：${totalUnits.toLocaleString()} 双`);
console.log(`🌐 线上占比：${(onlineSales / totalNetSales * 100).toFixed(1)}%`);
console.log(`🏪 线下占比：${(offlineSales / totalNetSales * 100).toFixed(1)}%`);

fs.writeFileSync(
    path.join(__dirname, '../data/dashboard/fact_sales.json'),
    JSON.stringify(records, null, 2)
);
console.log(`📁 已写入 data/dashboard/fact_sales.json`);
