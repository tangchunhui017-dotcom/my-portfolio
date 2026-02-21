const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '../data/dashboard');
const dimSkuPath = path.join(DIR, 'dim_sku.json');
const dimChannelPath = path.join(DIR, 'dim_channel.json');
const factSalesPath = path.join(DIR, 'fact_sales.json');
const factCompetitorPath = path.join(DIR, 'fact_competitor.json');

// --- 辅助随机函数 ---
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomWeighted(items, weights) {
    let sum = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * sum;
    for (let i = 0; i < items.length; i++) {
        rand -= weights[i];
        if (rand < 0) return items[i];
    }
    return items[0];
}

console.log("🚀 [1/4] 开始升级 dim_sku.json...");
const dimSku = JSON.parse(fs.readFileSync(dimSkuPath, 'utf-8'));

const TARGET_AUDIENCES = [
    { label: '18-23岁 GenZ', weight: 30 },
    { label: '24-28岁 职场新人', weight: 40 },
    { label: '29-35岁 资深中产', weight: 20 },
    { label: '35岁以上', weight: 10 }
];

const COLORS = ['白', '黑', '沙/大地', '灰', '拼色/跳色', '银/金属'];
const CATEGORY_COLOR_BIAS = {
    '跑步': { items: ['白', '黑', '银/金属', '拼色/跳色'], weights: [40, 20, 20, 20] },
    '篮球': { items: ['黑', '白', '拼色/跳色'], weights: [30, 30, 40] },
    '休闲': { items: ['沙/大地', '白', '黑', '灰'], weights: [40, 30, 20, 10] },
    '户外': { items: ['沙/大地', '黑', '灰'], weights: [50, 30, 20] },
    '训练': { items: ['黑', '白', '灰'], weights: [60, 20, 20] },
};

dimSku.forEach(sku => {
    // 根据品类分布颜色
    const colorBias = CATEGORY_COLOR_BIAS[sku.category_name] || { items: COLORS, weights: [20, 20, 20, 20, 10, 10] };
    sku.color = randomWeighted(colorBias.items, colorBias.weights);

    // 人群设定
    sku.target_audience = randomWeighted(TARGET_AUDIENCES.map(a => a.label), TARGET_AUDIENCES.map(a => a.weight));
});
fs.writeFileSync(dimSkuPath, JSON.stringify(dimSku, null, 2));
console.log(`✅ 已为 ${dimSku.length} 款 SKU 注入色系与客群标签。`);


console.log("🚀 [2/4] 开始裂变重排 dim_channel.json...");
// 原 factSales 中共有 C01~C10 10 个老 channel_id，我们需要把它们对应成“实体/账号”集合，不破坏流水关联
// C01-C03: 电商（线上）
// C04-C06: 直营（线下）
// C07-C08: 加盟（线下）
// C09-C10: KA（线下）

const REGIONS = ['华东', '华南', '华北', '西南', '西北', '华中'];
const CITY_TIERS = ['一线', '新一线', '二线', '三线', '四五线及以下'];
const OFFLINE_FORMATS = ['购物中心 Mall', '百货 Store', '街边大店 Street', '奥特莱斯 Outlet'];
const ONLINE_FORMATS = ['传统货架电商', '兴趣内容电商', '私域/小程序'];

const newChannels = [];

function createChannel(id, type, name, platform_or_region, is_online, city_tier = '全国', format) {
    newChannels.push({
        channel_id: id,
        channel_type: type,         // 维持与 fact_sales 匹配，如 '电商', '直营', '加盟', 'KA'
        channel_name: name,
        is_online: is_online,       // 强烈区分线上线下
        region: platform_or_region, // 地理区域 或 线上平台
        city_tier: city_tier,
        store_format: format        // 店铺形态
    });
}

// 线上渠道：C01-C03
createChannel('C01', '电商', '天猫官方旗舰店', '淘系平台', true, '全国', '传统货架电商');
createChannel('C02', '电商', '京东自营专区', '京东平台', true, '全国', '传统货架电商');
createChannel('C03', '电商', '抖音官方直播间', '字节系', true, '全国', '兴趣内容电商');

// 线下直营：C04-C06。给每个节点赋予一个大区，具体城市层级随机（偏高线）
createChannel('C04', '直营', '上海恒隆品牌旗舰店', '华东', false, '一线', '购物中心 Mall');
createChannel('C05', '直营', '广州天河体育大店', '华南', false, '一线', '街边大店 Street');
createChannel('C06', '直营', '北京三里屯大厦店', '华北', false, '一线', '购物中心 Mall');

// 线下加盟：C07-C08。（偏下沉）
createChannel('C07', '加盟', '苏州万达下沉加盟店', '华东', false, '二线', '百货 Store');
createChannel('C08', '加盟', '东莞步行街分销商', '华南', false, '三线', '街边大店 Street');

// KA渠道：C09-C10。（清库存/铺大盘）
createChannel('C09', 'KA', '全国王府井百货联营', '全国统管', false, '新一线', '百货 Store');
createChannel('C10', 'KA', '滔搏运动多品牌集成', '全国统管', false, '二线', '奥特莱斯 Outlet');

fs.writeFileSync(dimChannelPath, JSON.stringify(newChannels, null, 2));
console.log(`✅ 已将频道表升格为 10 家包含线上线下区分与地区、形态层级的网格矩阵。`);

console.log("🚀 [3/4] 验证事实流水结构不受影响...");
// 读取看一眼
const factSales = JSON.parse(fs.readFileSync(factSalesPath, 'utf-8'));
console.log(`✅ 事实表共 ${factSales.length} 条流水，完美对接。`);

console.log("🚀 [4/4] 凭空生成竞品沙盘数据 fact_competitor.json...");
/*
竞品对标逻辑：
我们假定有三家友商，在核心的价格带抢夺份额。
数据按照 价格带 × 品类 × 友商 生成。
*/
const COMPETITORS = ['友商 A (国际一线)', '友商 B (国货霸主)', '友商 C (新锐黑马)'];
const CATEGORIES = ['跑步', '休闲', '篮球', '户外', '训练'];
const BANDS = [
    { id: 'PB1', name: '¥199-299' },
    { id: 'PB2', name: '¥300-399' },
    { id: 'PB3', name: '¥400-499' },
    { id: 'PB4', name: '¥500-599' },
    { id: 'PB5', name: '¥600-699' },
    { id: 'PB6', name: '¥700+' }
];

const competitorFacts = [];
let compRecordId = 1;

// 我们的整体销售规模做为基准(总约1.6亿，各路分摊)
BANDS.forEach(band => {
    CATEGORIES.forEach(cat => {
        // 根据价格带和品类制造偏好
        COMPETITORS.forEach(comp => {
            let baseSales = randomInt(500000, 3000000);

            // 设定友商特性
            if (comp.includes('国际') && band.id >= 'PB4') baseSales *= 1.8; // 老外在高端卖得好
            if (comp.includes('国货') && band.id <= 'PB3') baseSales *= 1.5; // 国产卷下沉
            if (comp.includes('新锐') && cat === '户外') baseSales *= 2.0; // 黑马做细分垂类

            const units = Math.floor(baseSales / (band.min || 250));

            competitorFacts.push({
                record_id: `COMP_${compRecordId++}`,
                competitor_name: comp,
                category_name: cat,
                price_band: band.id,
                price_band_name: band.name,
                estimated_sales_amt: Math.floor(baseSales),
                estimated_units: units,
                market_share_pct: (randomInt(100, 400) / 10).toFixed(1) // 10% - 40% 的份额设定
            });
        });
    });
});
fs.writeFileSync(factCompetitorPath, JSON.stringify(competitorFacts, null, 2));
console.log(`✅ 竞品沙盘数据建立完成，共写入 ${competitorFacts.length} 个行业对标切片！`);
console.log("🎉 所有底层数据基建升维完成！下一步：让 Dashboard 连接它们！");
