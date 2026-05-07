/**
 * gen-region-inventory.mjs
 * 为缺失的渠道生成 fact_inventory 月末快照记录
 * 基于 fact_sales 的销售节奏推算库存
 */
import { neon } from '@neondatabase/serverless';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const env = readFileSync(path.join(root, '.env.local'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(env);

const factInventory = JSON.parse(readFileSync(path.join(root, 'data/dashboard/fact_inventory.json'), 'utf8'));
const factSales     = JSON.parse(readFileSync(path.join(root, 'data/dashboard/fact_sales.json'), 'utf8'));
const dimSku        = JSON.parse(readFileSync(path.join(root, 'data/dashboard/dim_sku.json'), 'utf8'));
const dimChannel    = JSON.parse(readFileSync(path.join(root, 'data/dashboard/dim_channel.json'), 'utf8'));

const skuMap     = Object.fromEntries(dimSku.map(s => [s.sku_id, s]));
const channelMap = Object.fromEntries(dimChannel.map(c => [c.channel_id, c]));

// 已有库存数据的 store_id
const coveredStores = new Set(factInventory.map(r => r.store_id));
const SNAPSHOT_DATES = ['2025-01-31', '2025-02-28'];

// 计算每个渠道、每个月的销售量（用 sale_month 过滤）
// 月1 = 1月份销售, 月2 = 2月份销售
function buildSalesQtyMap(channel_id, month) {
  return factSales
    .filter(r => r.channel_id === channel_id && Number(r.sale_month) === month)
    .reduce((sum, r) => sum + (r.unit_sold || 0), 0);
}

// 确定性伪随机
function detRand(seed) {
  const x = Math.sin(seed * 7919 + 12345) * 98765;
  return x - Math.floor(x);
}

const newRecords = [];
let idSeq = factInventory.length;

// 获取每个渠道实际有销售数据的 SKU
const channelSkuMap = {};  // channel_id → Set<sku_id>
factSales.forEach(r => {
  if (!channelSkuMap[r.channel_id]) channelSkuMap[r.channel_id] = new Set();
  channelSkuMap[r.channel_id].add(r.sku_id);
});

// 对每个未覆盖渠道生成库存快照
const missingChannels = dimChannel.filter(c => !coveredStores.has(c.channel_id));
console.log(`未覆盖渠道: ${missingChannels.length}`);

for (const channel of missingChannels) {
  const skusForChannel = [...(channelSkuMap[channel.channel_id] || new Set())].slice(0, 15); // 限制每个渠道最多 15 个 SKU
  if (skusForChannel.length === 0) {
    // 如果该渠道在 fact_sales 里也没有数据，取 dim_sku 前 8 个
    skusForChannel.push(...dimSku.slice(0, 8).map(s => s.sku_id));
  }

  SNAPSHOT_DATES.forEach((date, dateIdx) => {
    const month = dateIdx + 1; // 1月 or 2月
    const totalChannelSalesQty = buildSalesQtyMap(channel.channel_id, month);
    const perSkuSales = skusForChannel.length > 0 ? Math.ceil(totalChannelSalesQty / skusForChannel.length) : 50;

    skusForChannel.forEach((sku_id, skuIdx) => {
      const sku = skuMap[sku_id];
      if (!sku) return;

      // 基础库存量：参考该渠道规模和区域特征
      const regionScale = {
        '华南': 1.0, '华北': 0.85, '西南': 0.65, '西北': 0.55, '东北': 0.45, '全国统管': 1.2,
      }[channel.region] ?? 0.7;

      const seed = channel.channel_id.charCodeAt(1) * 31 + sku_id.charCodeAt(1) * 17 + dateIdx * 7;
      const jitter = 0.8 + detRand(seed) * 0.4;  // 0.8 ~ 1.2x

      const bop_qty = Math.round(200 * regionScale * jitter);
      const inbound_qty = Math.round(80 * regionScale * jitter);
      const transfer_in = Math.round(15 * regionScale * jitter);
      const transfer_out = Math.round(10 * regionScale * jitter);
      const sales_qty = Math.max(1, Math.round(perSkuSales * jitter * 0.5)); // 每 SKU 分摊
      const off_shelf_qty = Math.max(0, Math.round(3 * regionScale * jitter));
      const damage_qty = Math.max(0, Math.round(1 * regionScale * jitter));
      const eop_qty = Math.max(0, bop_qty + inbound_qty + transfer_in - transfer_out - sales_qty - off_shelf_qty - damage_qty);
      const inventory_amount = Math.round(eop_qty * (sku.msrp || 500) * 0.6); // 按进价估算

      newRecords.push({
        date,
        store_id: channel.channel_id,
        sku_id,
        bop_qty,
        inbound_qty,
        transfer_in,
        transfer_out,
        sales_qty,
        off_shelf_qty,
        damage_qty,
        eop_qty,
        inventory_amount,
      });
      idSeq++;
    });
  });
}

console.log(`生成新库存记录: ${newRecords.length}`);

// 导入到 DB
const BATCH = 500;
let imported = 0;
for (let i = 0; i < newRecords.length; i += BATCH) {
  const batch = newRecords.slice(i, i + BATCH);
  await sql`
    INSERT INTO fact_inventory (date, store_id, sku_id, bop_qty, inbound_qty, transfer_in,
      transfer_out, sales_qty, off_shelf_qty, damage_qty, eop_qty, inventory_amount)
    SELECT
      date::date, store_id, sku_id,
      bop_qty::int, inbound_qty::int, transfer_in::int, transfer_out::int,
      sales_qty::int, off_shelf_qty::int, damage_qty::int, eop_qty::int,
      inventory_amount::numeric
    FROM json_to_recordset(${JSON.stringify(batch)}) AS t (
      date TEXT, store_id TEXT, sku_id TEXT,
      bop_qty TEXT, inbound_qty TEXT, transfer_in TEXT, transfer_out TEXT,
      sales_qty TEXT, off_shelf_qty TEXT, damage_qty TEXT, eop_qty TEXT,
      inventory_amount TEXT
    )
    ON CONFLICT DO NOTHING
  `;
  imported += batch.length;
  process.stdout.write(`\r导入进度: ${imported}/${newRecords.length}`);
}

console.log(`\n✅ 导入 ${imported} 条`);

// 更新 JSON 文件
const merged = [...factInventory, ...newRecords];
writeFileSync(path.join(root, 'data/dashboard/fact_inventory.json'), JSON.stringify(merged, null, 2), 'utf8');
console.log(`fact_inventory.json: ${factInventory.length} → ${merged.length} 条`);

const [{ cnt }] = await sql`SELECT COUNT(*) as cnt FROM fact_inventory`;
console.log(`DB fact_inventory 最终: ${cnt} 条`);

const byRegion = await sql`
  SELECT c.region, COUNT(*) as cnt
  FROM fact_inventory fi JOIN dim_channel c ON fi.store_id = c.channel_id
  GROUP BY c.region ORDER BY cnt DESC
`;
console.log('区域分布:', JSON.stringify(byRegion));
