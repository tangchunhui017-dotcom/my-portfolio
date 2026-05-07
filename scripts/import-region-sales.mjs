/**
 * import-region-sales.mjs
 * 将新生成的区域 fact_sales 记录追加到 Neon DB
 * 只导入 record_id 不在现有 DB 中的新记录（幂等）
 */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// 读取 DB 连接串
const envText = readFileSync(path.join(root, '.env.local'), 'utf8');
const dbMatch = envText.match(/DATABASE_URL=(.+)/);
if (!dbMatch) throw new Error('DATABASE_URL not found in .env.local');
const DATABASE_URL = dbMatch[1].trim();

const sql = neon(DATABASE_URL);

// 读取完整 fact_sales（已含新生成的记录）
const allSales = JSON.parse(readFileSync(path.join(root, 'data/dashboard/fact_sales.json'), 'utf8'));

// 查询 DB 中已有的 record_id
console.log('查询数据库现有记录数...');
const [{ count }] = await sql`SELECT COUNT(*) as count FROM fact_sales`;
console.log(`DB 现有 fact_sales: ${count} 条`);

// 只取 record_id 以 R 开头的新记录（原来是 H 开头）
const newRecords = allSales.filter(r => r.record_id.startsWith('R'));
console.log(`待导入新记录: ${newRecords.length} 条`);

// 分批导入，每批 500 条
const BATCH = 500;
let imported = 0;
let errCount = 0;

for (let i = 0; i < newRecords.length; i += BATCH) {
  const batch = newRecords.slice(i, i + BATCH);
  try {
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
    process.stdout.write(`\r进度: ${imported}/${newRecords.length}`);
  } catch (e) {
    console.error(`\n批次 ${i} 错误:`, e.message);
    errCount++;
    if (errCount > 10) { console.error('错误过多，中止'); break; }
  }
}

console.log(`\n导入完成: ${imported} 条 (错误批次: ${errCount})`);

// 验证最终数
const [{ count: finalCount }] = await sql`SELECT COUNT(*) as count FROM fact_sales`;
const byRegion = await sql`
  SELECT c.region, COUNT(*) as cnt, SUM(fs.net_sales_amt)::bigint as total_sales
  FROM fact_sales fs
  JOIN dim_channel c ON fs.channel_id = c.channel_id
  GROUP BY c.region
  ORDER BY total_sales DESC
`;
console.log(`DB fact_sales 最终: ${finalCount} 条`);
console.log('区域分布:');
byRegion.forEach(r => console.log(`  ${r.region}: ${r.cnt} 条, 销售额 ${r.total_sales}`));
