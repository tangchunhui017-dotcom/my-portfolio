/**
 * 重新按鞋类实际季节规律分配 SKU 的 season 字段
 * 规律：Q1(春)30% Q2(夏)20% Q3(秋)30% Q4(冬)20%
 * 运行: node scripts/redistribute-seasons.js
 */
const fs = require('fs');
const path = require('path');

const skuPath = path.join(__dirname, '../data/dashboard/dim_sku.json');
const skus = JSON.parse(fs.readFileSync(skuPath, 'utf8'));

const total = skus.length; // 300
// Q1:30% Q2:20% Q3:30% Q4:20%
const quotas = {
    Q1: Math.round(total * 0.30), // 90
    Q2: Math.round(total * 0.20), // 60
    Q3: Math.round(total * 0.30), // 90
    Q4: total - Math.round(total * 0.30) - Math.round(total * 0.20) - Math.round(total * 0.30), // 60
};

console.log('季节分配目标:', quotas);

// 按品类均匀分散到各季度（避免某品类全堆在一个季度）
// 策略：对 SKU 列表做循环分配，保证每个季度内品类均匀
const seasonOrder = [];
// 按配额展开成序列：[Q1,Q1,...90个, Q2,Q2,...60个, Q3,...90个, Q4,...60个]
// 但为了品类均匀，改用交错分配
const seasonPool = [];
Object.entries(quotas).forEach(([season, count]) => {
    for (let i = 0; i < count; i++) seasonPool.push(season);
});

// 交错排列：每4个一组按 Q1,Q2,Q3,Q4 顺序，最后剩余按比例填充
// 实际上直接按顺序分配即可，因为 dim_sku 本身已经按品类/价格带混排
// 为了让品类在各季度均匀，先按品类分组，再轮流分配季度
const categories = [...new Set(skus.map(s => s.category_id))];
console.log('品类列表:', categories);

// 按品类分组
const byCategory = {};
categories.forEach(cat => {
    byCategory[cat] = skus.filter(s => s.category_id === cat);
});

// 各季度的品类偏好权重（模拟真实规律）
// Q1春：跑步/休闲强  Q2夏：户外/训练强  Q3秋：全品类  Q4冬：篮球/休闲强
const SEASON_CATEGORY_WEIGHT = {
    Q1: { '跑步': 1.4, '休闲': 1.3, '篮球': 0.8, '训练': 1.0, '户外': 0.8 },
    Q2: { '跑步': 0.9, '休闲': 0.9, '篮球': 0.8, '训练': 1.2, '户外': 1.5 },
    Q3: { '跑步': 1.1, '休闲': 1.0, '篮球': 1.2, '训练': 1.0, '户外': 1.0 },
    Q4: { '跑步': 0.8, '休闲': 1.2, '篮球': 1.4, '训练': 0.9, '户外': 0.9 },
};

// 为每个 SKU 分配季度
// 方法：对每个 SKU，根据品类权重计算各季度的概率，再按配额约束分配
const seasonCounts = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
const seasons = ['Q1', 'Q2', 'Q3', 'Q4'];

// 打乱 SKU 顺序，避免系统性偏差
const shuffled = [...skus].sort(() => Math.random() - 0.5);

shuffled.forEach(sku => {
    // 计算各季度得分 = 权重 × 剩余配额
    const scores = seasons.map(s => {
        const remaining = quotas[s] - seasonCounts[s];
        if (remaining <= 0) return 0;
        const weight = SEASON_CATEGORY_WEIGHT[s][sku.category_id] ?? 1.0;
        return weight * remaining;
    });

    const totalScore = scores.reduce((a, b) => a + b, 0);
    if (totalScore === 0) {
        // 所有配额已满（理论上不会发生）
        sku.season = 'Q1';
        return;
    }

    // 按加权概率随机选择季度
    let rand = Math.random() * totalScore;
    let chosen = seasons[0];
    for (let i = 0; i < seasons.length; i++) {
        rand -= scores[i];
        if (rand <= 0) { chosen = seasons[i]; break; }
    }

    sku.season = chosen;
    seasonCounts[chosen]++;
});

// 验证总数
console.log('实际分配结果:', seasonCounts);
console.log('总计:', Object.values(seasonCounts).reduce((a, b) => a + b, 0));

// 按原始 sku_id 顺序恢复（保持 S001-S300 顺序）
const result = shuffled.sort((a, b) => {
    const na = parseInt(a.sku_id.replace('S', ''));
    const nb = parseInt(b.sku_id.replace('S', ''));
    return na - nb;
});

// 验证品类在各季度的分布
categories.forEach(cat => {
    const dist = {};
    seasons.forEach(s => {
        dist[s] = result.filter(sk => sk.category_id === cat && sk.season === s).length;
    });
    console.log(`  ${cat}:`, dist);
});

fs.writeFileSync(skuPath, JSON.stringify(result, null, 2));
console.log(`\n✅ dim_sku.json 已更新，共 ${result.length} 个 SKU`);
console.log('📌 下一步：运行 node scripts/generate-mock-data.js 重新生成 fact_sales.json');
