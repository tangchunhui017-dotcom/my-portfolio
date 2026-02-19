/**
 * 扩充 dim_sku.json，为每个 SKU 增加:
 *   - color_family   色系（黑/白/灰/彩色/彩色鲜艳/中性）
 *   - product_line   产品线（专业跑步/轻运动训练/户外机能/通勤轻商务/潮流休闲）
 *   - target_age_group  主力客群年龄段
 *   - gender            性别定向
 *   - launch_wave       上市波段（W1/W2/W3/W4）
 *   - wave_capacity     波段 SKU 计划量（双）
 *   - new_ratio         本款新品占波段比例
 *
 * 运行: node scripts/augment-sku.js
 */
const fs = require('fs');
const path = require('path');

const SKU_PATH = path.join(__dirname, '../data/dashboard/dim_sku.json');
const skus = JSON.parse(fs.readFileSync(SKU_PATH, 'utf8'));

// ── 色系规则（按品类偏好）──────────────────────────────────────────────
const COLOR_FAMILIES = ['黑色', '白色', '灰色', '彩色·柔', '彩色·鲜', '中性色'];

const CATEGORY_COLOR_WEIGHT = {
    '跑步': [0.35, 0.25, 0.15, 0.10, 0.10, 0.05],
    '训练': [0.30, 0.20, 0.20, 0.15, 0.10, 0.05],
    '户外': [0.20, 0.15, 0.25, 0.20, 0.10, 0.10],
    '休闲': [0.25, 0.30, 0.15, 0.15, 0.10, 0.05],
    '潮流': [0.20, 0.25, 0.10, 0.20, 0.20, 0.05],
    '童鞋': [0.15, 0.25, 0.10, 0.20, 0.25, 0.05],
    '篮球': [0.30, 0.30, 0.20, 0.10, 0.10, 0.00],
};

function weightedRandom(weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
    }
    return weights.length - 1;
}

function getColorFamily(category) {
    const weights = CATEGORY_COLOR_WEIGHT[category] || [0.25, 0.25, 0.20, 0.15, 0.10, 0.05];
    return COLOR_FAMILIES[weightedRandom(weights)];
}

// ── 产品线映射 ─────────────────────────────────────────────────────────
const CATEGORY_TO_PRODUCT_LINE = {
    '跑步': '专业跑步',
    '训练': '轻运动训练',
    '户外': '户外机能',
    '休闲': '通勤轻商务',
    '潮流': '潮流休闲',
    '童鞋': '童鞋系列',
    '篮球': '竞技篮球',
};

// ── 年龄段规则（按产品线 + 价格带）────────────────────────────────────
const AGE_GROUPS = ['18-25', '26-35', '36-45', '46+'];

function getAgeGroup(category, priceBand) {
    // 高价格带偏向中年成熟客群；潮流/跑步偏向年轻客群
    if (category === '潮流') {
        return weightedRandom([0.55, 0.30, 0.12, 0.03]) > 0 ? AGE_GROUPS[weightedRandom([0.55, 0.30, 0.12, 0.03])] : '18-25';
    }
    if (category === '童鞋') return '18-25'; // 家长购买

    const highPrice = ['PB5', 'PB6'].includes(priceBand);
    const midPrice = ['PB3', 'PB4'].includes(priceBand);

    if (highPrice) return AGE_GROUPS[weightedRandom([0.10, 0.35, 0.40, 0.15])];
    if (midPrice) return AGE_GROUPS[weightedRandom([0.25, 0.45, 0.25, 0.05])];
    return AGE_GROUPS[weightedRandom([0.40, 0.40, 0.15, 0.05])];
}

// ── 性别定向 ───────────────────────────────────────────────────────────
function getGender(category) {
    if (category === '潮流') return ['男', '中性', '女'][Math.floor(Math.random() * 3)];
    if (category === '训练') return Math.random() < 0.55 ? '男' : '女';
    if (category === '跑步') return Math.random() < 0.60 ? '男' : '女';
    if (category === '户外') return Math.random() < 0.65 ? '男' : '中性';
    return Math.random() < 0.50 ? '男' : '女';
}

// ── 上市波段 ───────────────────────────────────────────────────────────
const WAVES = ['W1', 'W2', 'W3', 'W4'];

function getLaunchWave(launchDate) {
    if (!launchDate) return WAVES[Math.floor(Math.random() * 4)];
    const month = parseInt(launchDate.split('-')[1], 10);
    // Q1: W1(1-2月) W2(3月) / Q2: W1(4月) W2(5月) W3(6月)...
    if (month <= 2) return 'W1';
    if (month <= 3) return 'W2';
    if (month <= 5) return 'W1';
    if (month <= 6) return 'W2';
    if (month <= 8) return 'W3';
    if (month <= 9) return 'W4';
    if (month <= 10) return 'W1';
    if (month <= 11) return 'W2';
    return 'W3';
}

// ── 主循环：填充扩展字段 ───────────────────────────────────────────────
const augmented = skus.map(sku => {
    const category = sku.category_id || sku.category_name || '休闲';
    return {
        ...sku,
        color_family: getColorFamily(category),
        product_line: CATEGORY_TO_PRODUCT_LINE[category] || '通勤轻商务',
        target_age_group: getAgeGroup(category, sku.price_band),
        gender: getGender(category),
        launch_wave: getLaunchWave(sku.launch_date),
    };
});

// ── 输出 ───────────────────────────────────────────────────────────────
fs.writeFileSync(SKU_PATH, JSON.stringify(augmented, null, 2));

// 统计
const colorDist = {};
const ageDist = {};
const lineDist = {};
augmented.forEach(s => {
    colorDist[s.color_family] = (colorDist[s.color_family] || 0) + 1;
    ageDist[s.target_age_group] = (ageDist[s.target_age_group] || 0) + 1;
    lineDist[s.product_line] = (lineDist[s.product_line] || 0) + 1;
});

console.log(`✅ 扩充完成：${augmented.length} 个 SKU`);
console.log('色系分布:', colorDist);
console.log('年龄段分布:', ageDist);
console.log('产品线分布:', lineDist);
console.log(`📁 已写入 data/dashboard/dim_sku.json`);
