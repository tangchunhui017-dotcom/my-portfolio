#!/usr/bin/env node
/**
 * scripts/db/generate-seed-sql.js
 *
 * 纯本地：读取 JSON → 生成 seed-data.sql（不发任何网络请求）
 * 用法：node scripts/db/generate-seed-sql.js
 * 生成文件：scripts/db/seed-data.sql（粘贴到 Neon SQL Editor 执行一次）
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUTPUT = path.join(__dirname, 'seed-data.sql');

// ---- 工具函数 ----

function readJson(relPath) {
    const full = path.join(ROOT, relPath);
    if (!fs.existsSync(full)) { console.warn(`⚠ 跳过: ${relPath}`); return []; }
    const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
    return Array.isArray(raw) ? raw : Object.values(raw).flat();
}

/** 校验日期字符串，非法日期（如 2025-02-29）返回 null */
function safeDate(v) {
    if (v === null || v === undefined) return null;
    const str = String(v).split('T')[0];
    const parts = str.split('-').map(Number);
    if (parts.length < 3) return null;
    const [year, month, day] = parts;
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month || d.getDate() !== day) return null;
    return v;
}

/** 把 JS 值转成 SQL 字面量 */
function lit(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'object') {
        // JSON 对象/数组 → 带 ::jsonb 转换
        return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
    }
    // 字符串：转义单引号
    return `'${String(v).replace(/'/g, "''")}'`;
}

/** 生成一张表的 INSERT 语句（批量 VALUES，每 500 行一条 INSERT） */
function genInserts(table, rows, getRow, conflictClause = 'ON CONFLICT DO NOTHING') {
    if (!rows.length) return '';
    const BATCH = 500;
    let sql = '';
    for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const valueLines = chunk.map(r => `  (${getRow(r).map(lit).join(', ')})`).join(',\n');
        sql += `INSERT INTO ${table} VALUES\n${valueLines}\n${conflictClause};\n\n`;
    }
    return sql;
}

// ---- 收集所有 SQL ----

let out = `-- seed-data.sql  (自动生成，勿手动编辑)
-- 生成时间: ${new Date().toISOString()}
-- 用法: 粘贴到 Neon SQL Editor，点 Run 执行
--       ON CONFLICT DO NOTHING 保证幂等，可重复执行
--       无事务包装：每条 INSERT 独立执行，单条失败不影响其他

`;

// ===== 维度表 =====

console.log('处理 dim_sku...');
const dimSkus = readJson('data/dashboard/dim_sku.json');
out += `-- dim_sku (${dimSkus.length} 条)\n`;
out += genInserts('dim_sku', dimSkus, r => [
    r.sku_id, r.sku_name, r.category_id, r.category_name,
    r.season_year, r.season, r.price_band, r.msrp,
    r.lifecycle, safeDate(r.launch_date), r.color_family,
    r.product_line, r.target_age_group, r.gender,
    r.launch_wave, r.color, r.target_audience,
    r.category_l1, r.category_l2, r.dev_season_year,
    r.dev_season, r.product_track, r.is_carryover,
    r.carryover_type, r.carryover_status, r.monitor_mode,
    r.non_main_reason, safeDate(r.carryover_protection_end),
    r.carryover_entry_source
], 'ON CONFLICT (sku_id) DO NOTHING');

console.log('处理 dim_wave_plan...');
const dimWaves = readJson('data/dashboard/dim_wave_plan.json');
out += `-- dim_wave_plan (${dimWaves.length} 条)\n`;
out += genInserts('dim_wave_plan', dimWaves, r => [
    r.id, r.season, r.wave, safeDate(r.launch_date),
    r.theme, r.temp_zone, r.sku_plan, r.sku_actual,
    r.new_ratio, r.old_ratio, r.units_plan, r.revenue_plan,
    r.category_mix ?? null
], 'ON CONFLICT (id) DO NOTHING');

console.log('处理 dim_region...');
const dimRegions = readJson('data/dashboard/dim_region.json');
out += `-- dim_region (${dimRegions.length} 条)\n`;
out += genInserts('dim_region', dimRegions, r => [
    r.province, r.region_id, r.region_name, r.total_stores,
    r.net_sales, r.plan_sales, r.achievement_rate,
    r.sell_through, r.tier_mix ?? null, r.format_mix ?? null
], 'ON CONFLICT (province) DO NOTHING');

console.log('处理 dim_channel...');
const dimChannels = readJson('data/dashboard/dim_channel.json');
out += `-- dim_channel (${dimChannels.length} 条)\n`;
out += genInserts('dim_channel', dimChannels, r => [
    r.channel_id, r.channel_type, r.channel_name,
    r.is_online, r.region, r.city_tier, r.store_format
], 'ON CONFLICT (channel_id) DO NOTHING');

console.log('处理 dim_competitor...');
const dimCompetitors = readJson('data/dashboard/dim_competitor.json');
out += `-- dim_competitor (${dimCompetitors.length} 条)\n`;
out += genInserts('dim_competitor', dimCompetitors, r => [
    r.id, r.name, r.position, r.market_share, r.yoy,
    r.radar ?? null, r.price_band_mix ?? null,
    r.category_mix ?? null, r.trend_tags ?? null, r.hot_skus ?? null
], 'ON CONFLICT (id) DO NOTHING');

// ===== 事实表 =====

console.log('处理 fact_sales (大表，请稍候)...');
const factSales = readJson('data/dashboard/fact_sales.json');
out += `-- fact_sales (${factSales.length} 条)\n`;
out += genInserts('fact_sales', factSales, r => [
    r.record_id, r.sku_id, r.channel_id, r.season_year,
    r.season, r.wave, r.week_num, r.unit_sold,
    r.gross_sales_amt, r.net_sales_amt, r.discount_amt,
    r.discount_rate, r.cogs_amt, r.gross_profit_amt,
    r.gross_margin_rate, r.cumulative_sell_through, r.on_hand_unit,
    r.sale_year, r.sale_month, r.sale_wave, r.sales_season_year,
    r.sales_season, r.product_track, r.is_carryover,
    r.carryover_type, r.carryover_status, r.monitor_mode,
    r.non_main_reason, safeDate(r.carryover_protection_end),
    r.carryover_entry_source
], 'ON CONFLICT (record_id) DO NOTHING');

console.log('处理 fact_ops (大表，请稍候)...');
const factOps = readJson('data/dashboard/fact_ops.json');
out += `-- fact_ops (${factOps.length} 条)\n`;
out += genInserts('fact_ops', factOps, r => [
    r.record_key, r.sku_id, r.channel_id, r.season_year,
    r.season, r.wave, r.week_num, r.demand_pairs,
    r.ship_pairs, r.reorder_pairs, r.fill_rate,
    r.reorder_rate, r.source_type
], 'ON CONFLICT (record_key) DO NOTHING');

console.log('处理 fact_inventory...');
const factInventory = readJson('data/dashboard/fact_inventory.json');
out += `-- fact_inventory (${factInventory.length} 条)\n`;
out += genInserts('fact_inventory(date,store_id,sku_id,bop_qty,inbound_qty,transfer_in,transfer_out,sales_qty,off_shelf_qty,damage_qty,eop_qty,inventory_amount)', factInventory, r => [
    safeDate(r.date), r.store_id, r.sku_id, r.bop_qty,
    r.inbound_qty, r.transfer_in, r.transfer_out, r.sales_qty,
    r.off_shelf_qty, r.damage_qty, r.eop_qty, r.inventory_amount
]);

console.log('处理 fact_plan...');
const factPlan = readJson('data/dashboard/fact_plan.json');
out += `-- fact_plan (${factPlan.length} 条)\n`;
out += genInserts('fact_plan(year,season,wave,plan_sku,plan_sales,plan_gm,plan_buy_units,plan_otb_budget,plan_opening_inventory,plan_closing_inventory)', factPlan, r => [
    r.year, r.season, r.wave, r.plan_sku, r.plan_sales,
    r.plan_gm, r.plan_buy_units, r.plan_otb_budget,
    r.plan_opening_inventory, r.plan_closing_inventory
]);

console.log('处理 fact_competitor...');
const factCompetitor = readJson('data/dashboard/fact_competitor.json');
out += `-- fact_competitor (${factCompetitor.length} 条)\n`;
out += genInserts('fact_competitor', factCompetitor, r => [
    r.record_id, r.competitor_name, r.category_name,
    r.price_band, r.price_band_name, r.estimated_sales_amt,
    r.estimated_units, r.market_share_pct
], 'ON CONFLICT (record_id) DO NOTHING');

console.log('处理 sales_forecasts...');
const forecasts = readJson('data/dashboard/sales_forecasts.json');
out += `-- sales_forecasts (${forecasts.length} 条)\n`;
out += genInserts('sales_forecasts', forecasts, r => [
    r.forecastId, r.year, r.season, r.quarter, r.brand,
    r.waveId, r.waveLabel, r.channelType, r.scenarioType,
    r.forecastSales, r.forecastUnits, r.sellThroughTarget,
    r.grossMarginTarget, r.note
], 'ON CONFLICT (forecast_id) DO NOTHING');

console.log('处理 otb_bridge_inputs...');
const otbInputs = readJson('data/dashboard/otb_bridge_inputs.json');
out += `-- otb_bridge_inputs (${otbInputs.length} 条)\n`;
out += genInserts('otb_bridge_inputs', otbInputs, r => [
    r.bridgeInputId, r.otbStructureId, r.brand,
    r.categoryL1, r.categoryL2, r.categoryL3, r.scene,
    r.channelFocus, r.forecastSales, r.forecastUnits,
    r.waveBudgetShare, r.priceBandBudgetShare, r.spuTarget,
    r.skuTarget, r.averageDepth, r.roleMix, r.developmentMix,
    r.platformMix, r.structureTypes, r.soleTypes, r.lastTypes,
    r.leadCategory, r.leadWave, r.leadPriceBand, r.recommendedAction
], 'ON CONFLICT (bridge_input_id) DO NOTHING');

// ===== 设计企划表 =====

console.log('处理 fp_waves...');
const fpWaves = readJson('data/footwear-planning/waves.json');
out += `-- fp_waves (${fpWaves.length} 条)\n`;
out += genInserts('fp_waves', fpWaves, r => [
    r.waveId, r.waveName, r.launchWindow, r.theme,
    r.status, r.plannedSkuCount, r.actualSkuCount
], 'ON CONFLICT (wave_id) DO NOTHING');

console.log('处理 fp_design_items...');
const designItems = readJson('data/footwear-planning/design-items.json');
out += `-- fp_design_items (${designItems.length} 条)\n`;
out += genInserts('fp_design_items', designItems, r => [
    r.itemId, r.seriesId, r.itemName, r.skuCode,
    r.productRole, r.category, r.occasion, r.designStatus,
    r.colorway, r.material, r.pricePoint,
    safeDate(r.targetLaunchDate), r.designer, r.thumbnailUrl,
    r.designNotes, safeDate(r.createdAt), safeDate(r.updatedAt),
    r.source, r.sourceId ?? null, r.syncStatus,
    r.targetCostEstimate, r.sampleQuotedCost,
    r.finalLockedCost ?? null, r.techPackStatus,
    r.toolingStatus, r.toolingNotes
], 'ON CONFLICT (item_id) DO NOTHING');

console.log('处理 fp_gate_nodes...');
const gateNodes = readJson('data/footwear-planning/gate-nodes.json');
out += `-- fp_gate_nodes (${gateNodes.length} 条)\n`;
out += genInserts('fp_gate_nodes', gateNodes, r => [
    r.gateId, r.styleId, r.gateGroup, r.gateType,
    r.gateName, safeDate(r.plannedDate), safeDate(r.actualDate),
    r.completed, r.delayed, r.blocked,
    r.owner, r.impactWave, r.note
], 'ON CONFLICT (gate_id) DO NOTHING');

console.log('处理 fp_review_records...');
const reviewRecords = readJson('data/footwear-planning/review-records.json');
out += `-- fp_review_records (${reviewRecords.length} 条)\n`;
out += genInserts('fp_review_records', reviewRecords, r => [
    r.reviewId, r.styleId, safeDate(r.reviewDate), r.reviewType,
    r.conclusion, r.issueDescription, r.changeRequest,
    r.owner, safeDate(r.dueDate), r.closed, r.blocked,
    r.impactScope, safeDate(r.nextReviewDate)
], 'ON CONFLICT (review_id) DO NOTHING');

console.log('处理 fp_action_items...');
const actionItems = readJson('data/footwear-planning/action-items.json');
out += `-- fp_action_items (${actionItems.length} 条)\n`;
out += genInserts('fp_action_items', actionItems, r => [
    r.actionId, r.reviewId, r.styleId, r.actionType,
    r.actionDescription, r.status, r.owner,
    safeDate(r.dueDate), safeDate(r.completedAt), r.reapproved
], 'ON CONFLICT (action_id) DO NOTHING');

console.log('处理 fp_assets...');
const assets = readJson('data/footwear-planning/assets.json');
out += `-- fp_assets (${assets.length} 条)\n`;
out += genInserts('fp_assets', assets, r => [
    r.assetId, r.assetType, r.seriesId, r.title,
    r.description, r.fileUrl, r.thumbnailUrl,
    r.tags || [], r.uploadedBy,
    safeDate(r.uploadedAt), r.featuredInReport,
    r.source, r.sourceId ?? null, r.syncStatus
], 'ON CONFLICT (asset_id) DO NOTHING');

console.log('处理 fp_category_plans...');
const catPlans = readJson('data/footwear-planning/category-plans.json');
out += `-- fp_category_plans (${catPlans.length} 条)\n`;
out += genInserts('fp_category_plans', catPlans, r => [
    r.categoryPlanId, r.projectId, r.seriesId, r.categoryName,
    r.styleTarget, r.skuTarget, r.developmentLevel,
    r.sharedOutsoleStrategy, r.sharedLastStrategy, r.targetCostBand,
    r.targetWave, r.developmentRole, r.toolingNeed, r.currentStatus
], 'ON CONFLICT (category_plan_id) DO NOTHING');

console.log('处理 fp_category_breakdowns...');
const catBreakdowns = readJson('data/footwear-planning/category-breakdowns.json');
out += `-- fp_category_breakdowns (${catBreakdowns.length} 条)\n`;
out += genInserts('fp_category_breakdowns', catBreakdowns, r => [
    r.breakdownId, r.season, r.waveId, r.seriesId,
    r.seriesName, r.designConcept, r.category, r.subcategory,
    r.plannedSkuCount, r.productRoles || [],
    r.keyStructures || [], r.weekLabels || [],
    r.processTags || [], r.factoryProfile, r.lineType,
    r.capacityBand, r.technicalRiskLevel, r.leadTimeRisk,
    r.materialDependency || [], r.focusNote,
    r.source, r.sourceId ?? null, safeDate(r.updatedAt),
    r.updatedBy, r.syncStatus
], 'ON CONFLICT (breakdown_id) DO NOTHING');

// ---- 收尾 ----
out += `-- 完成！共涵盖所有维度表和事实表。\n`;

fs.writeFileSync(OUTPUT, out, 'utf8');
const kb = Math.round(fs.statSync(OUTPUT).size / 1024);
console.log(`\n✅ 生成完成！`);
console.log(`   文件：${OUTPUT}`);
console.log(`   大小：${kb} KB`);
console.log(`\n📋 下一步：`);
console.log(`   1. 打开 https://console.neon.tech`);
console.log(`   2. 进入你的项目 → SQL Editor`);
console.log(`   3. 粘贴 seed-data.sql 内容，点 Run`);
console.log(`   4. 等待执行完毕（云端执行，无本地负担）`);
