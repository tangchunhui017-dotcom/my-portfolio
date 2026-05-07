/**
 * gen-2025-region-sales.mjs
 * 为非华东/线上区域生成 2025 年 fact_sales 数据
 * 思路：对每个已有 2024 数据的区域渠道，按 2025 华东的季节/波段/周次结构，
 *       以 2024 记录为基准放大 8% 生成 2025 记录
 */
import { neon } from '@neondatabase/serverless';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const env = readFileSync(path.join(root, '.env.local'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(env);

const factSales  = JSON.parse(readFileSync(path.join(root, 'data/dashboard/fact_sales.json'), 'utf8'));
const dimSku     = JSON.parse(readFileSync(path.join(root, 'data/dashboard/dim_sku.json'), 'utf8'));
const dimChannel = JSON.parse(readFileSync(path.join(root, 'data/dashboard/dim_channel.json'), 'utf8'));

const skuMap     = Object.fromEntries(dimSku.map(s => [s.sku_id, s]));
const channelMap = Object.fromEntries(dimChannel.map(c => [c.channel_id, c]));

// 在线/华东渠道（已有 2025 数据）
const onlineRegions = new Set(['淘系平台', '京东平台', '字节系', '全国统管']);
const coveredRegions2025 = new Set(['华东', '淘系平台', '京东平台', '字节系']);

// 2025 已有的 (season, wave, week_num) 组合（来自华东 + 线上）
const combos2025 = new Set();
factSales
  .filter(r => String(r.season_year) === '2025' && !String(r.record_id).startsWith('R'))
  .forEach(r => combos2025.add(`${r.season}__${r.wave}__${r.week_num}`));
console.log('2025 季节/波段/周次组合数:', combos2025.size);

// 各组合对应的 month
const comboMonthMap = {};
factSales
  .filter(r => String(r.season_year) === '2025' && !String(r.record_id).startsWith('R'))
  .forEach(r => {
    const k = `${r.season}__${r.wave}__${r.week_num}`;
    comboMonthMap[k] = r.sale_month;
  });

// 确定需要生成 2025 数据的渠道（有 2024 数据的非华东非线上渠道）
const need2025Channels = dimChannel.filter(c => {
  const region = c.region;
  return !coveredRegions2025.has(region);
});
console.log('需要生成 2025 数据的渠道:', need2025Channels.length);

// 找最大 record_id 序号
const maxId = factSales.reduce((m, r) => {
  const n = parseInt((r.record_id || '').replace(/\D/g, ''), 10);
  return isNaN(n) ? m : Math.max(m, n);
}, 0);
let idSeq = maxId + 1;

// 确定性随机
function detRand(seed) {
  const x = Math.sin(seed * 7919 + 12345) * 98765;
  return x - Math.floor(x);
}

const GROWTH = 1.08; // 8% YoY 增长

// 对每个渠道、每个 2025 season/wave/week 组合：
// 找到该渠道在 2024 对应 season/wave/week 的记录作为模板，按 GROWTH 放大
const newRecords = [];
let skipped = 0;

for (const channel of need2025Channels) {
  // 该渠道 2024 的所有记录，按 sku_id + season + wave + week_num 建索引
  const ch2024 = factSales.filter(r =>
    r.channel_id === channel.channel_id && String(r.season_year) === '2024'
  );
  if (ch2024.length === 0) { skipped++; continue; }

  // 建索引：sku_id → [records in 2024]
  const skuRecordMap = {};
  ch2024.forEach(r => {
    if (!skuRecordMap[r.sku_id]) skuRecordMap[r.sku_id] = [];
    skuRecordMap[r.sku_id].push(r);
  });
  const skuIds = Object.keys(skuRecordMap);

  // 对每个 2025 combo
  for (const combo of combos2025) {
    const [season, wave, weekNumStr] = combo.split('__');
    const week_num = Number(weekNumStr);
    const saleMonth = comboMonthMap[combo];

    // 找 2024 同 season/wave/week 的记录作为模板
    const templates = ch2024.filter(r =>
      r.season === season && r.wave === wave && r.week_num === week_num
    );

    if (templates.length === 0) {
      // 没有精确匹配：用该渠道 2024 同 season 的平均值估算
      const seasonRecords = ch2024.filter(r => r.season === season);
      if (seasonRecords.length === 0) continue;

      // 从同一季节随机取一条记录作为基准
      const seed = channel.channel_id.charCodeAt(1) * 31 + week_num * 7 + season.charCodeAt(0) * 13;
      const idx = Math.floor(detRand(seed) * seasonRecords.length);
      const base = seasonRecords[idx];
      const jitter = 0.9 + detRand(seed + 100) * 0.2;

      const unitSold = Math.max(1, Math.round(base.unit_sold * GROWTH * jitter));
      const grossSales = Math.round(unitSold * (base.gross_sales_amt / Math.max(1, base.unit_sold)));
      const discAmt = Math.round(grossSales * (base.discount_rate || 0.139));
      const netSales = grossSales - discAmt;
      const cogs = Math.round(netSales * (1 - (base.gross_margin_rate || 0.4)));
      const grossProfit = netSales - cogs;
      const gmRate = netSales > 0 ? Math.round(grossProfit / netSales * 1000) / 1000 : 0;
      const cst = Math.min(0.95, (base.cumulative_sell_through || 0.5) * 0.98 + detRand(seed + 200) * 0.04);
      const onHand = Math.max(0, Math.round((base.on_hand_unit || 100) * (0.7 + detRand(seed + 300) * 0.3)));

      newRecords.push({
        record_id: `X${String(idSeq++).padStart(6, '0')}`,
        sku_id: base.sku_id,
        channel_id: channel.channel_id,
        season_year: '2025',
        season,
        wave,
        week_num,
        unit_sold: unitSold,
        gross_sales_amt: grossSales,
        net_sales_amt: netSales,
        discount_amt: discAmt,
        discount_rate: base.discount_rate || 0.139,
        cogs_amt: cogs,
        gross_profit_amt: grossProfit,
        gross_margin_rate: gmRate,
        cumulative_sell_through: Math.round(cst * 1000) / 1000,
        on_hand_unit: onHand,
        sale_year: '2025',
        sale_month: saleMonth,
        sale_wave: wave,
        sales_season_year: '2025',
        sales_season: season,
        product_track: base.product_track || 'seasonal',
        is_carryover: false,
        carryover_type: null,
        carryover_status: null,
        monitor_mode: null,
        non_main_reason: null,
        carryover_protection_end: null,
        carryover_entry_source: null,
      });
    } else {
      // 有精确匹配，直接对这些记录按 GROWTH 放大
      for (const base of templates) {
        const seed = channel.channel_id.charCodeAt(1) * 31 + base.sku_id.charCodeAt(1) * 17 + week_num * 7;
        const jitter = 0.95 + detRand(seed) * 0.1;
        const unitSold = Math.max(1, Math.round(base.unit_sold * GROWTH * jitter));
        const grossSales = Math.round(unitSold * (base.gross_sales_amt / Math.max(1, base.unit_sold)));
        const discAmt = Math.round(grossSales * (base.discount_rate || 0.139));
        const netSales = grossSales - discAmt;
        const cogs = Math.round(netSales * (1 - (base.gross_margin_rate || 0.4)));
        const grossProfit = netSales - cogs;
        const gmRate = netSales > 0 ? Math.round(grossProfit / netSales * 1000) / 1000 : 0;
        const cst = Math.min(0.95, (base.cumulative_sell_through || 0.5) + detRand(seed + 200) * 0.03);
        const onHand = Math.max(0, Math.round((base.on_hand_unit || 100) * (0.6 + detRand(seed + 300) * 0.4)));

        newRecords.push({
          record_id: `X${String(idSeq++).padStart(6, '0')}`,
          sku_id: base.sku_id,
          channel_id: channel.channel_id,
          season_year: '2025',
          season,
          wave,
          week_num,
          unit_sold: unitSold,
          gross_sales_amt: grossSales,
          net_sales_amt: netSales,
          discount_amt: discAmt,
          discount_rate: base.discount_rate || 0.139,
          cogs_amt: cogs,
          gross_profit_amt: grossProfit,
          gross_margin_rate: gmRate,
          cumulative_sell_through: Math.round(cst * 1000) / 1000,
          on_hand_unit: onHand,
          sale_year: '2025',
          sale_month: saleMonth,
          sale_wave: wave,
          sales_season_year: '2025',
          sales_season: season,
          product_track: base.product_track || 'seasonal',
          is_carryover: false,
          carryover_type: null,
          carryover_status: null,
          monitor_mode: null,
          non_main_reason: null,
          carryover_protection_end: null,
          carryover_entry_source: null,
        });
      }
    }
  }
}

console.log(`生成 2025 新记录: ${newRecords.length}  跳过渠道: ${skipped}`);

// 区域分布
const byRegion = {};
newRecords.forEach(r => {
  const c = channelMap[r.channel_id];
  const reg = c ? c.region : '未知';
  byRegion[reg] = (byRegion[reg] || 0) + 1;
});
console.log('区域分布:', JSON.stringify(byRegion, null, 2));

// 批量导入到 DB
const BATCH = 500;
let imported = 0;
for (let i = 0; i < newRecords.length; i += BATCH) {
  const batch = newRecords.slice(i, i + BATCH);
  await sql`
    INSERT INTO fact_sales (
      record_id, sku_id, channel_id, season_year, season, wave, week_num,
      unit_sold, gross_sales_amt, net_sales_amt, discount_amt, discount_rate,
      cogs_amt, gross_profit_amt, gross_margin_rate,
      cumulative_sell_through, on_hand_unit,
      sale_year, sale_month, sale_wave, sales_season_year, sales_season,
      product_track, is_carryover, carryover_type, carryover_status,
      monitor_mode, non_main_reason, carryover_protection_end, carryover_entry_source
    )
    SELECT
      record_id, sku_id, channel_id, season_year, season, wave, week_num::int,
      unit_sold::int, gross_sales_amt::numeric, net_sales_amt::numeric,
      discount_amt::numeric, discount_rate::numeric,
      cogs_amt::numeric, gross_profit_amt::numeric, gross_margin_rate::numeric,
      cumulative_sell_through::numeric, on_hand_unit::int,
      sale_year, sale_month::int, sale_wave, sales_season_year, sales_season,
      product_track, is_carryover::boolean, carryover_type, carryover_status,
      monitor_mode, non_main_reason,
      NULLIF(carryover_protection_end, '')::date,
      carryover_entry_source
    FROM json_to_recordset(${JSON.stringify(batch)}) AS t (
      record_id TEXT, sku_id TEXT, channel_id TEXT, season_year TEXT, season TEXT,
      wave TEXT, week_num TEXT,
      unit_sold TEXT, gross_sales_amt TEXT, net_sales_amt TEXT,
      discount_amt TEXT, discount_rate TEXT,
      cogs_amt TEXT, gross_profit_amt TEXT, gross_margin_rate TEXT,
      cumulative_sell_through TEXT, on_hand_unit TEXT,
      sale_year TEXT, sale_month TEXT, sale_wave TEXT, sales_season_year TEXT, sales_season TEXT,
      product_track TEXT, is_carryover TEXT, carryover_type TEXT, carryover_status TEXT,
      monitor_mode TEXT, non_main_reason TEXT, carryover_protection_end TEXT,
      carryover_entry_source TEXT
    )
    ON CONFLICT (record_id) DO NOTHING
  `;
  imported += batch.length;
  process.stdout.write(`\r导入进度: ${imported}/${newRecords.length}`);
}
console.log(`\n✅ 导入完成: ${imported} 条`);

// 同步更新 JSON 文件
const merged = [...factSales, ...newRecords];
writeFileSync(path.join(root, 'data/dashboard/fact_sales.json'), JSON.stringify(merged, null, 2), 'utf8');
console.log(`fact_sales.json: ${factSales.length} → ${merged.length} 条`);

// 验证 DB
const r2025 = await sql`
  SELECT c.region, COUNT(*) as cnt, SUM(fs.net_sales_amt)::bigint as sales
  FROM fact_sales fs JOIN dim_channel c ON fs.channel_id = c.channel_id
  WHERE fs.season_year = '2025'
  GROUP BY c.region ORDER BY sales DESC
`;
console.log('\n2025年区域分布(DB):');
r2025.forEach(r => console.log(`  ${r.region}: ${r.cnt}条, ¥${r.sales}`));
