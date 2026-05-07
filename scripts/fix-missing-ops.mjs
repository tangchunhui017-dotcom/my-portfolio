/**
 * fix-missing-ops.mjs
 * 检查并补充 fact_ops DB 中缺失的记录
 */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8').match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(env);

const factOps = JSON.parse(readFileSync('data/dashboard/fact_ops.json', 'utf8'));
console.log(`JSON fact_ops: ${factOps.length} 条`);

// 查询 DB 中已有的 record_key
const dbKeys = await sql`SELECT record_key FROM fact_ops`;
const dbKeySet = new Set(dbKeys.map(r => r.record_key));
console.log(`DB fact_ops: ${dbKeySet.size} 条`);

const missing = factOps.filter(r => {
  const k = r.record_key || `${r.season_year}__${r.season}__${r.wave}__${r.week_num}__${r.sku_id}__${r.channel_id}`;
  return !dbKeySet.has(k);
});
console.log(`缺失: ${missing.length} 条`);

if (missing.length === 0) { console.log('✅ 无需修复'); process.exit(0); }

// 批量导入缺失记录
const BATCH = 500;
let imported = 0;
for (let i = 0; i < missing.length; i += BATCH) {
  const batch = missing.slice(i, i + BATCH);
  await sql`
    INSERT INTO fact_ops (
      record_key, sku_id, channel_id, season_year, season, wave, week_num,
      demand_pairs, ship_pairs, reorder_pairs, fill_rate, reorder_rate, source_type
    )
    SELECT
      record_key, sku_id, channel_id, season_year, season, wave, week_num::int,
      demand_pairs::numeric, ship_pairs::numeric, reorder_pairs::numeric,
      fill_rate::numeric, reorder_rate::numeric, source_type
    FROM json_to_recordset(${JSON.stringify(batch)}) AS t (
      record_key TEXT, sku_id TEXT, channel_id TEXT, season_year TEXT, season TEXT,
      wave TEXT, week_num TEXT, demand_pairs TEXT, ship_pairs TEXT, reorder_pairs TEXT,
      fill_rate TEXT, reorder_rate TEXT, source_type TEXT
    )
    ON CONFLICT (record_key) DO NOTHING
  `;
  imported += batch.length;
  process.stdout.write(`\r进度: ${imported}/${missing.length}`);
}
console.log(`\n✅ 补充 ${imported} 条`);
const [{ cnt }] = await sql`SELECT COUNT(*) as cnt FROM fact_ops`;
console.log(`DB fact_ops 最终: ${cnt} 条`);
