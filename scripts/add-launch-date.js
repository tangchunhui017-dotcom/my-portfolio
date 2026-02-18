/**
 * 为 dim_sku.json 中每个 SKU 添加 launch_date 字段
 * 规则：根据 season 和 sku_id 尾号生成错峰上市日期
 * Q1: 2024-02-01 起，每 2 SKU 错开 3 天
 * Q2: 2024-05-01 起
 * Q3: 2024-08-01 起
 * Q4: 2024-11-01 起
 * 运行: node scripts/add-launch-date.js
 */
const fs = require('fs');
const path = require('path');

const skuPath = path.join(__dirname, '../data/dashboard/dim_sku.json');
const skus = JSON.parse(fs.readFileSync(skuPath, 'utf8'));

const SEASON_START = {
  Q1: new Date('2024-02-01'),
  Q2: new Date('2024-05-01'),
  Q3: new Date('2024-08-01'),
  Q4: new Date('2024-11-01'),
};

// 按季度分组，然后按 sku_id 排序
const bySeasonSorted = {};
['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => { bySeasonSorted[q] = []; });
skus.forEach(sku => {
  const q = sku.season || 'Q1';
  if (bySeasonSorted[q]) bySeasonSorted[q].push(sku);
});
Object.keys(bySeasonSorted).forEach(q => {
  bySeasonSorted[q].sort((a, b) => {
    const na = parseInt(a.sku_id.replace('S', ''));
    const nb = parseInt(b.sku_id.replace('S', ''));
    return na - nb;
  });
});

// 为每个 SKU 分配 launch_date
// 每季度最多 90 款，分 6 波上市（每波 15 款，间隔 2 周）
const skuLaunchMap = {};
Object.entries(bySeasonSorted).forEach(([season, seasonSkus]) => {
  const baseDate = SEASON_START[season];
  seasonSkus.forEach((sku, idx) => {
    // 每 15 款一波，每波间隔 14 天
    const waveIndex = Math.floor(idx / 15);
    const launchDate = new Date(baseDate);
    launchDate.setDate(launchDate.getDate() + waveIndex * 14);
    skuLaunchMap[sku.sku_id] = launchDate.toISOString().split('T')[0];
  });
});

// 写入 dim_sku.json
const result = skus.map(sku => ({
  ...sku,
  launch_date: skuLaunchMap[sku.sku_id] || '2024-02-01',
}));

fs.writeFileSync(skuPath, JSON.stringify(result, null, 2));
console.log(`✅ 已为 ${result.length} 个 SKU 添加 launch_date`);

// 验证：打印各季度的上市波次分布
['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
  const dates = bySeasonSorted[q].map(s => skuLaunchMap[s.sku_id]);
  const unique = [...new Set(dates)].sort();
  console.log(`${q}: ${bySeasonSorted[q].length} 款，${unique.length} 个上市日期: ${unique.join(', ')}`);
});
