/**
 * generate-historical-data.js
 * 生成 2023 年历史销售数据（YoY 基线），追加到 fact_sales.json
 *
 * 业务场景假设（2023 vs 2024）：
 *  - 整体规模：2023 年总销售额约为 2024 年的 87%（YoY 增长 +15%）
 *  - 电商渠道：2023 年电商占比 32%，低于 2024 年的 38%（DTC 渗透率逐年提升）
 *  - KA 渠道：2023 年 KA 占比 18%，略高于 2024 年的 14%（KA 萎缩趋势）
 *  - 折扣深度：2023 年整体折扣深度 13.5%，高于 2024 年的 12%（库存管理持续改善）
 *  - 售罄节奏：2023 年售罄节奏偏慢（慢 2-3 周达到同样累计售罄率）
 *  - 跑步品类：2023 年弱（YoY+18% 增速最快），篮球品类 2023 年强（YoY-5%）
 *  - 高价带 PB5/PB6：2023 年 SKU 更少，销售贡献更低（品类升级趋势）
 *  - 毛利率：2023 年整体毛利率 39%，低于 2024 年 41%（折扣改善 + 产品结构升级）
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── 路径配置 ────────────────────────────────────────────────────
const FACT_SALES_PATH = path.resolve(__dirname, '../data/dashboard/fact_sales.json');
const DIM_SKU_PATH = path.resolve(__dirname, '../data/dashboard/dim_sku.json');

// ── 业务场景参数 ─────────────────────────────────────────────────
// 品类维度的 2023 增长因子（2023 / 2024 = X，即 2023 年是 2024 年的 X 倍）
// <1 表示 2023 比 2024 差（YoY 是正增长）
const CATEGORY_SCALE = {
    '跑步': 0.84,   // 2024比2023好16%（跑步热潮爆发）
    '篮球': 1.04,   // 2023比2024略强（篮球景气度下滑）
    '训练': 0.91,   // 训练品类稳定增长
    '休闲': 0.88,   // 休闲品类持续增长
    '户外': 0.80,   // 户外品类爆发（2023→2024增长25%）
};

// 渠道维度的 2023 增长因子
const CHANNEL_SCALE = {
    '电商': 0.78,   // 2023电商渗透率更低，但2024增速强
    '直营': 0.90,
    '加盟': 0.94,
    'KA': 1.10,   // 2023 KA渠道还更强，逐年萎缩
};

// 价格带因子（2023 高价带更弱）
const PRICE_BAND_SCALE = {
    'PB1': 1.02, 'PB2': 0.98,
    'PB3': 0.92, 'PB4': 0.88,
    'PB5': 0.80, 'PB6': 0.74,
};

// 2023 整体毛利率更低（折扣深度更高）
const MARGIN_BASE_2023 = 0.39;
const DISCOUNT_DEPTH_2023 = 0.135; // 13.5%

// 售罄节奏慢（同周数卖出更少，售罄曲线更平缓）
const ST_SPEED_FACTOR = 0.88;  // 2023 同周累计售罄率 = 2024 × 0.88

// ── 工具函数 ─────────────────────────────────────────────────────
function rand(min, max) {
    return min + Math.random() * (max - min);
}
function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}
// 柔化随机数（更接近均值）
function softRand(center, spread) {
    return center + (Math.random() - 0.5) * spread * 2;
}

// ── 读取原始数据 ─────────────────────────────────────────────────
console.log('📂 读取 fact_sales.json...');
const factSales2024 = JSON.parse(fs.readFileSync(FACT_SALES_PATH, 'utf8'));
const dimSku = JSON.parse(fs.readFileSync(DIM_SKU_PATH, 'utf8'));

// 检查是否已存在 2023 年数据
const existing2023 = factSales2024.filter(r => r.season_year === '2023');
if (existing2023.length > 0) {
    console.log(`⚠️  已发现 ${existing2023.length} 条 2023 年数据，将先清除再重新生成...`);
}
const data2024 = factSales2024.filter(r => r.season_year === '2024');
console.log(`✅ 读取到 ${data2024.length} 条 2024 年记录`);

// 构建 SKU Map
const skuMap = {};
dimSku.forEach(s => { skuMap[s.sku_id] = s; });

// ── 识别渠道 ID 和渠道类型的映射 ─────────────────────────────────
// 从 2024 数据中提取 channel_id 的分组规律
// C01-C10，对应 channel_type 信息从 dim_channel.json 获取
// 此处直接从 dim_channel.json 读取
const DIM_CHANNEL_PATH = path.resolve(__dirname, '../data/dashboard/dim_channel.json');
const dimChannel = JSON.parse(fs.readFileSync(DIM_CHANNEL_PATH, 'utf8'));
const channelMap = {};
dimChannel.forEach(c => { channelMap[c.channel_id] = c; });

// ── 统计各 SKU 在 2024 年的最大周数（用于控制 2023 年数据范围）
const skuMaxWeek = {};
data2024.forEach(r => {
    if (!skuMaxWeek[r.sku_id] || r.week_num > skuMaxWeek[r.sku_id]) {
        skuMaxWeek[r.sku_id] = r.week_num;
    }
});

// ── 统计 2024 年各 SKU 的最终售罄率（用于生成 2023 的更低售罄）
const sku2024FinalST = {};
data2024.forEach(r => {
    if (!sku2024FinalST[r.sku_id] || r.week_num > (sku2024FinalST[r.sku_id]?._week || 0)) {
        sku2024FinalST[r.sku_id] = { st: r.cumulative_sell_through, _week: r.week_num };
    }
});

// ── 生成 2023 年数据 ─────────────────────────────────────────────
console.log('\n⚙️  开始生成 2023 年历史数据...');

const records2023 = [];
let newRecordId = data2024.length + 1;

// 获取 2024 年唯一的 SKU+渠道+波段+季度组合
// 按 sku_id + channel_id + week_num 分组（已是最细粒度）
// 对每条 2024 年记录，生成对应的 2023 年记录

data2024.forEach(record24 => {
    const sku = skuMap[record24.sku_id];
    const channel = channelMap[record24.channel_id];
    if (!sku || !channel) return;

    const category = sku.category_id;
    const channelType = channel.channel_type;
    const priceBand = sku.price_band;

    // 计算综合缩放因子
    const catScale = CATEGORY_SCALE[category] ?? 0.90;
    const chScale = CHANNEL_SCALE[channelType] ?? 0.90;
    const pbScale = PRICE_BAND_SCALE[priceBand] ?? 0.90;
    // 综合因子（取几何平均，避免极端值叠加）
    const combinedScale = Math.pow(catScale * chScale * pbScale, 1 / 3);

    // 加入随机扰动（±5%），模拟真实业务波动
    const noise = softRand(1.0, 0.05);
    const finalScale = combinedScale * noise;

    // 销售额缩放
    const gross2023 = Math.round(record24.gross_sales_amt * finalScale);
    const net2023 = Math.round(gross2023 * (1 - DISCOUNT_DEPTH_2023 + (Math.random() - 0.5) * 0.01));
    const discount2023 = gross2023 - net2023;
    const discountRate2023 = gross2023 > 0 ? parseFloat((discount2023 / gross2023).toFixed(2)) : 0;

    // 毛利（2023 整体更低）
    const marginRate2023 = parseFloat(softRand(MARGIN_BASE_2023, 0.015).toFixed(2));
    const grossProfit2023 = Math.round(net2023 * marginRate2023);
    const cogs2023 = net2023 - grossProfit2023;

    // 销量（对应缩放）
    const units2023 = Math.max(1, Math.round(record24.unit_sold * finalScale));

    // 售罄率（2023 节奏更慢）
    const st2024 = record24.cumulative_sell_through;
    // 在早期周，2023 年节奏更慢；到后期趋于收敛
    const weekRatio = record24.week_num / (skuMaxWeek[record24.sku_id] || 12);
    // 早期（weekRatio < 0.5）差距更大，后期收敛
    const stFactor = ST_SPEED_FACTOR + (1 - ST_SPEED_FACTOR) * weekRatio * 0.6;
    const st2023 = parseFloat(Math.min(0.98, Math.max(0.02, st2024 * stFactor)).toFixed(2));

    // 期末库存（2023 库存更多，库管效率更低）
    const inventory2023 = Math.round(record24.on_hand_unit * (1 / finalScale + rand(0.02, 0.08)));

    const record2023 = {
        record_id: `H${String(newRecordId++).padStart(6, '0')}`,
        sku_id: record24.sku_id,
        channel_id: record24.channel_id,
        season_year: '2023',
        season: record24.season,
        wave: record24.wave,
        week_num: record24.week_num,
        unit_sold: units2023,
        gross_sales_amt: gross2023,
        net_sales_amt: net2023,
        discount_amt: discount2023,
        discount_rate: discountRate2023,
        cogs_amt: cogs2023,
        gross_profit_amt: grossProfit2023,
        gross_margin_rate: marginRate2023,
        cumulative_sell_through: st2023,
        on_hand_unit: Math.max(0, inventory2023),
    };

    records2023.push(record2023);
});

console.log(`✅ 生成 ${records2023.length} 条 2023 年记录`);

// ── 合并并写入 ───────────────────────────────────────────────────
const merged = [...data2024, ...records2023];
console.log(`\n💾 写入 fact_sales.json（共 ${merged.length} 条）...`);
fs.writeFileSync(FACT_SALES_PATH, JSON.stringify(merged, null, 2), 'utf8');
console.log('✅ 完成！');

// ── 验证摘要 ─────────────────────────────────────────────────────
const total2024Sales = data2024.reduce((s, r) => s + r.net_sales_amt, 0);
const total2023Sales = records2023.reduce((s, r) => s + r.net_sales_amt, 0);
const yoyGrowth = ((total2024Sales - total2023Sales) / total2023Sales * 100).toFixed(1);
console.log('\n📊 数据验证摘要：');
console.log(`  2024 净销售额：¥${(total2024Sales / 1e6).toFixed(2)}M`);
console.log(`  2023 净销售额：¥${(total2023Sales / 1e6).toFixed(2)}M`);
console.log(`  同比增长（YoY）：+${yoyGrowth}%`);
const avg2024ST = data2024.reduce((s, r) => s + r.cumulative_sell_through, 0) / data2024.length;
const avg2023ST = records2023.reduce((s, r) => s + r.cumulative_sell_through, 0) / records2023.length;
console.log(`  2024 平均售罄率：${(avg2024ST * 100).toFixed(1)}%`);
console.log(`  2023 平均售罄率：${(avg2023ST * 100).toFixed(1)}%`);
const avg2024Margin = data2024.reduce((s, r) => s + r.gross_margin_rate, 0) / data2024.length;
const avg2023Margin = records2023.reduce((s, r) => s + r.gross_margin_rate, 0) / records2023.length;
console.log(`  2024 平均毛利率：${(avg2024Margin * 100).toFixed(1)}%`);
console.log(`  2023 平均毛利率：${(avg2023Margin * 100).toFixed(1)}%`);
console.log('\n🎉 2023 年历史数据生成完毕！可用于 YoY 同比分析。');
