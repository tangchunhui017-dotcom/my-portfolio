/**
 * gen-region-sales.mjs
 * 根据 fact_ops.json 为所有缺失区域生成 fact_sales 记录
 * 现有 fact_sales 只有华东 + 3 个线上平台，此脚本补全东北/华北/华南/西北/西南以及华东未覆盖的渠道
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const factSalesRaw = JSON.parse(readFileSync(path.join(root, 'data/dashboard/fact_sales.json'), 'utf8'));
const factOpsRaw   = JSON.parse(readFileSync(path.join(root, 'data/dashboard/fact_ops.json'), 'utf8'));
const dimSku       = JSON.parse(readFileSync(path.join(root, 'data/dashboard/dim_sku.json'), 'utf8'));
const dimChannel   = JSON.parse(readFileSync(path.join(root, 'data/dashboard/dim_channel.json'), 'utf8'));

// ── helpers ───────────────────────────────────────────────────────────────────

const skuMap = Object.fromEntries(dimSku.map(s => [s.sku_id, s]));
const channelMap = Object.fromEntries(dimChannel.map(c => [c.channel_id, c]));

// wave → calendar month 映射 (W01=1, W02=2, …, W12=12, W13=12)
function waveToMonth(wave) {
  const n = parseInt(wave.replace('W', ''), 10);
  return Math.min(n, 12);
}

// Q1=SS, Q2=SS延续, Q3=AW, Q4=AW延续 → sale_year 通常等于 season_year
function resolveCalendarYear(seasonYear, season, wave) {
  const y = Number(seasonYear);
  if (season === 'Q1' || season === 'Q2') return y; // 春夏
  if (season === 'Q3' || season === 'Q4') return y; // 秋冬
  return y;
}

// 区域折扣率差异（轻微变化使数据更真实）
const REGION_DISCOUNT = {
  '华东': 0.138, '华南': 0.141, '华北': 0.143, '西南': 0.149,
  '西北': 0.152, '东北': 0.155, '全国统管': 0.130,
  '淘系平台': 0.139, '京东平台': 0.139, '字节系': 0.140,
};
const REGION_MARGIN = {
  '华东': 0.400, '华南': 0.395, '华北': 0.398, '西南': 0.385,
  '西北': 0.382, '东北': 0.380, '全国统管': 0.405,
  '淘系平台': 0.392, '京东平台': 0.390, '字节系': 0.388,
};

// 伪随机（确定性，可重复）
function deterministicRandom(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// ── 找出 fact_sales 已覆盖的 channel_id ──────────────────────────────────────

const coveredChannels = new Set(factSalesRaw.map(r => r.channel_id));
console.log(`已覆盖渠道数: ${coveredChannels.size}`);
console.log(`未覆盖渠道数: ${dimChannel.length - coveredChannels.size}`);

// 所有 fact_ops 中未被 fact_sales 覆盖的渠道
const missingOpsRecords = factOpsRaw.filter(r => !coveredChannels.has(r.channel_id));
console.log(`待生成 fact_ops 记录数: ${missingOpsRecords.length}`);

// ── 按 sku+channel+season 预计算 cumulative_sell_through ─────────────────────

// 对每个 (sku_id, channel_id, season_year, season) 组合，按 week_num 排序，
// 累积计算 sell_through
const groupKey = r => `${r.sku_id}|${r.channel_id}|${r.season_year}|${r.season}`;
const groups = {};
missingOpsRecords.forEach(r => {
  const k = groupKey(r);
  if (!groups[k]) groups[k] = [];
  groups[k].push(r);
});
Object.values(groups).forEach(g => g.sort((a, b) => a.week_num - b.week_num));

// 为每条 ops 记录计算当周的累计售罄率
const cstMap = {}; // record_key → cumulative_sell_through
Object.values(groups).forEach(rows => {
  // 使用 fill_rate 作为近似，随 week 递增
  const maxWeek = Math.max(...rows.map(r => r.week_num));
  rows.forEach((r, i) => {
    // 累计售罄率：从前几周的已发货量估算
    // fill_rate 是单周维度的 ship/demand，用滚动累积近似
    const progress = (i + 1) / rows.length;            // 本 SKU 在该季节的进度
    const baseSt   = r.fill_rate * 0.88;                // fill_rate 作为上限参考
    const cst      = Math.min(0.95, baseSt * progress + 0.05);
    const seed     = r.sku_id.charCodeAt(1) * 100 + r.channel_id.charCodeAt(1) + r.week_num;
    const jitter   = (deterministicRandom(seed) - 0.5) * 0.04; // ±2%
    cstMap[r.record_key || `${r.season_year}__${r.season}__${r.wave}__${r.week_num}__${r.sku_id}__${r.channel_id}`] =
      Math.max(0.03, Math.min(0.96, cst + jitter));
  });
});

// ── 为每个 (sku_id, channel_id) 估算初始库存，用于推算 on_hand_unit ──────────

const initialInventory = {};  // `${sku_id}|${channel_id}|${season_year}|${season}` → initial_units
Object.entries(groups).forEach(([key, rows]) => {
  // 初始库存 ≈ 所有周的 demand_pairs 之和（demand_pairs ≈ weekly planned qty）
  const totalDemand = rows.reduce((s, r) => s + (r.demand_pairs || 0), 0);
  const sku = skuMap[rows[0].sku_id];
  const msrp = sku ? sku.msrp : 500;
  // 按 msrp 档次调整库存量级（贵的 SKU 备货少）
  const stockFactor = msrp > 2000 ? 0.8 : msrp > 800 ? 1.0 : 1.3;
  initialInventory[key] = Math.round(totalDemand * stockFactor * 1.4);
});

// ── 生成 fact_sales 记录 ─────────────────────────────────────────────────────

// 最大已用 record_id 数字
const maxId = factSalesRaw.reduce((m, r) => {
  const n = parseInt((r.record_id || '').replace(/\D/g, ''), 10);
  return isNaN(n) ? m : Math.max(m, n);
}, 0);
let idCounter = maxId + 1;

// product_track assignment: evergreen for carryover-style, seasonal otherwise
function getProductTrack(sku) {
  if (!sku) return 'seasonal';
  const lc = (sku.lifecycle || '').toLowerCase();
  if (lc === 'core' || lc === 'classic') return 'evergreen';
  return 'seasonal';
}

const newRecords = [];
let skipCount = 0;

missingOpsRecords.forEach(r => {
  const sku = skuMap[r.sku_id];
  const channel = channelMap[r.channel_id];
  if (!sku || !channel) { skipCount++; return; }

  const msrp = sku.msrp || 500;
  const region = channel.region || '未分区';
  const discRate = REGION_DISCOUNT[region] ?? 0.140;
  const marginRate = REGION_MARGIN[region] ?? 0.395;

  // unit_sold：ship_pairs * 1.3 倍（ops是对数，sales是实际）+ 确定性抖动
  const seed1 = r.sku_id.charCodeAt(0) * 17 + r.channel_id.charCodeAt(1) * 31 + r.week_num * 7;
  const ratio = 1.15 + deterministicRandom(seed1) * 0.35;  // 1.15 ~ 1.50
  const unitSold = Math.max(1, Math.round(r.ship_pairs * ratio));

  const grossSales = Math.round(unitSold * msrp);
  const discAmt    = Math.round(grossSales * discRate);
  const netSales   = grossSales - discAmt;
  const cogs       = Math.round(netSales * (1 - marginRate));
  const grossProfit = netSales - cogs;
  const gmRate     = netSales > 0 ? Math.round((grossProfit / netSales) * 1000) / 1000 : 0;

  const rKey = r.record_key || `${r.season_year}__${r.season}__${r.wave}__${r.week_num}__${r.sku_id}__${r.channel_id}`;
  const cst  = cstMap[rKey] ?? 0.5;

  // on_hand_unit: 随周次递减
  const invKey = `${r.sku_id}|${r.channel_id}|${r.season_year}|${r.season}`;
  const initInv = initialInventory[invKey] || 200;
  const groupRows = groups[groupKey(r)];
  const weekIdx = groupRows.findIndex(x => x.week_num === r.week_num);
  const totalWeeks = groupRows.length;
  const soldSoFar = groupRows.slice(0, weekIdx + 1).reduce((s, x) => s + Math.round(x.ship_pairs * 1.3), 0);
  const onHand = Math.max(0, initInv - soldSoFar);

  const saleMonth = waveToMonth(r.wave);
  const saleYear  = resolveCalendarYear(r.season_year, r.season, r.wave);
  const track     = getProductTrack(sku);

  newRecords.push({
    record_id: `R${String(idCounter++).padStart(6, '0')}`,
    sku_id: r.sku_id,
    channel_id: r.channel_id,
    season_year: r.season_year,
    season: r.season,
    wave: r.wave,
    week_num: r.week_num,
    unit_sold: unitSold,
    gross_sales_amt: grossSales,
    net_sales_amt: netSales,
    discount_amt: discAmt,
    discount_rate: discRate,
    cogs_amt: cogs,
    gross_profit_amt: grossProfit,
    gross_margin_rate: gmRate,
    cumulative_sell_through: Math.round(cst * 1000) / 1000,
    on_hand_unit: onHand,
    sale_year: String(saleYear),
    sale_month: saleMonth,
    sale_wave: r.wave,
    sales_season_year: r.season_year,
    sales_season: r.season,
    product_track: track,
    is_carryover: false,
    carryover_type: null,
    carryover_status: null,
    monitor_mode: null,
    non_main_reason: null,
    carryover_protection_end: null,
    carryover_entry_source: null,
  });
});

console.log(`生成新记录: ${newRecords.length}  跳过: ${skipCount}`);

// 验证区域分布
const newByRegion = {};
newRecords.forEach(r => {
  const c = channelMap[r.channel_id];
  const reg = c ? c.region : '未知';
  newByRegion[reg] = (newByRegion[reg] || 0) + 1;
});
console.log('新记录区域分布:', JSON.stringify(newByRegion, null, 2));

// 合并并写回
const merged = [...factSalesRaw, ...newRecords];
writeFileSync(path.join(root, 'data/dashboard/fact_sales.json'), JSON.stringify(merged, null, 2), 'utf8');
console.log(`✅ fact_sales.json 更新完成: ${factSalesRaw.length} → ${merged.length} 条`);
