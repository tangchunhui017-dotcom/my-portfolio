/**
 * 生成波段企划 Mock 数据
 * 输出：data/dashboard/dim_wave_plan.json
 *
 * 字段说明：
 * - season / wave: 季节+波段
 * - launch_date: 上市日
 * - sku_plan: 计划 SKU 数
 * - sku_actual: 实际上架 SKU 数
 * - new_ratio: 新品占比 (0-1)
 * - old_ratio: 旧款延续占比
 * - units_plan: 计划铺货量（双）
 * - revenue_plan: 计划销售额（元）
 * - category_mix: 品类结构 {品类: SKU数}
 *
 * 运行: node scripts/generate-wave-plan.js
 */
const fs = require('fs');
const path = require('path');

const WAVES = [
    // 2024 Spring
    { season: '2024-SS', wave: 'W1', launch_date: '2024-02-10', theme: '春日轻运动', temp_zone: '全国' },
    { season: '2024-SS', wave: 'W2', launch_date: '2024-03-20', theme: '户外机能', temp_zone: '华北/华东先' },
    { season: '2024-SS', wave: 'W3', launch_date: '2024-04-28', theme: '夏日潮流', temp_zone: '全国' },
    // 2024 Autumn/Winter
    { season: '2024-AW', wave: 'W1', launch_date: '2024-08-10', theme: '开学返校', temp_zone: '华东先' },
    { season: '2024-AW', wave: 'W2', launch_date: '2024-09-18', theme: '秋季训练', temp_zone: '全国' },
    { season: '2024-AW', wave: 'W3', launch_date: '2024-10-20', theme: '双11主推', temp_zone: '全国' },
    { season: '2024-AW', wave: 'W4', launch_date: '2024-11-28', theme: '年底清仓', temp_zone: '电商为主' },
    // 2025 Spring
    { season: '2025-SS', wave: 'W1', launch_date: '2025-02-08', theme: '新春首发', temp_zone: '华南先' },
    { season: '2025-SS', wave: 'W2', launch_date: '2025-03-22', theme: '马拉松季', temp_zone: '全国' },
];

const CATEGORIES = ['跑步', '训练', '户外', '休闲', '潮流', '童鞋'];

// 品类 SKU 比例（按季节略有不同）
function getCategoryMix(wave) {
    const season = wave.season;
    if (season.includes('SS')) {
        return { 跑步: 5, 训练: 3, 户外: 4, 休闲: 4, 潮流: 3, 童鞋: 1 };
    }
    return { 跑步: 3, 训练: 5, 户外: 6, 休闲: 3, 潮流: 2, 童鞋: 1 };
}

function noise(base, pct = 0.15) {
    return Math.round(base * (1 - pct + Math.random() * pct * 2));
}

const wavePlans = WAVES.map(w => {
    const catMix = getCategoryMix(w);
    const totalCatSku = Object.values(catMix).reduce((a, b) => a + b, 0);
    const isWinter = w.season.includes('AW');
    const baseSku = w.wave === 'W1' ? 60 : w.wave === 'W2' ? 80 : w.wave === 'W3' ? 70 : 40;
    const skuPlan = noise(baseSku);
    const skuActual = noise(Math.round(skuPlan * 0.90), 0.10); // 实际落地率约90%

    // 新品/旧款比例
    const newRatio = w.wave === 'W1' ? 0.75 : w.wave === 'W2' ? 0.70 : 0.55;
    const oldRatio = 1 - newRatio;

    // 铺货量与销售额（基于 MSRP 推算）
    const avgMsrp = isWinter ? 429 : 349;
    const avgUnitsPerSku = w.wave === 'W4' ? 500 : 900;
    const unitsPlan = noise(skuPlan * avgUnitsPerSku, 0.1);
    const revenuePlan = Math.round(unitsPlan * avgMsrp * 0.85); // 85% 折扣

    // 品类结构（按比例分配 SKU 数）
    const categoryMixDetail = {};
    let allocated = 0;
    CATEGORIES.forEach((cat, idx) => {
        const ratio = catMix[cat] / totalCatSku;
        if (idx === CATEGORIES.length - 1) {
            categoryMixDetail[cat] = skuPlan - allocated;
        } else {
            const count = Math.round(skuPlan * ratio);
            categoryMixDetail[cat] = count;
            allocated += count;
        }
    });

    return {
        id: `${w.season}-${w.wave}`,
        season: w.season,
        wave: w.wave,
        launch_date: w.launch_date,
        theme: w.theme,
        temp_zone: w.temp_zone,
        sku_plan: skuPlan,
        sku_actual: skuActual,
        new_ratio: Math.round(newRatio * 100) / 100,
        old_ratio: Math.round(oldRatio * 100) / 100,
        units_plan: unitsPlan,
        revenue_plan: revenuePlan,
        category_mix: categoryMixDetail,
    };
});

fs.writeFileSync(
    path.join(__dirname, '../data/dashboard/dim_wave_plan.json'),
    JSON.stringify(wavePlans, null, 2)
);

console.log(`✅ 波段企划数据生成：${wavePlans.length} 个波段`);
wavePlans.forEach(w => {
    console.log(`  ${w.id}  上市:${w.launch_date}  SKU计划:${w.sku_plan}  新品:${w.new_ratio * 100}%`);
});
