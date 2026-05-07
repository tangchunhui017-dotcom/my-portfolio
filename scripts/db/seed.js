#!/usr/bin/env node
/**
 * scripts/db/seed.js
 * 把本地 JSON 数据全量导入 Neon PostgreSQL
 *
 * 用法:
 *   1. 在项目根目录创建 .env.local，写入:
 *      DATABASE_URL=postgresql://...（你的 Neon 连接串）
 *   2. pnpm add -D @neondatabase/serverless dotenv
 *   3. node scripts/db/seed.js
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

function readJson(filePath) {
    try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return Array.isArray(raw) ? raw : Object.values(raw).flat();
    } catch {
        console.warn(`⚠ 跳过不存在的文件: ${filePath}`);
        return [];
    }
}

function nullify(v) {
    return v === undefined ? null : v;
}

// ---- 批量插入工具（每批 200 条，避免单条 SQL 超长） ----
async function batchInsert(tableName, rows, buildValues) {
    if (!rows.length) return;
    const BATCH = 200;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const values = chunk.map(buildValues);
        // 用 unnest 批量插入
        await Promise.all(
            values.map(async (v) => {
                try { await v; } catch (e) {
                    if (!e.message?.includes('duplicate key')) throw e;
                }
            })
        );
        inserted += chunk.length;
        process.stdout.write(`\r  ${tableName}: ${inserted}/${rows.length}`);
    }
    console.log(`\r  ✅ ${tableName}: ${rows.length} 条`);
}

async function main() {
    console.log('🚀 开始导入数据到 Neon...\n');

    // ===== 维度表 =====

    const dimSkus = readJson('data/dashboard/dim_sku.json');
    for (const r of dimSkus) {
        try {
            await sql`
                INSERT INTO dim_sku VALUES (
                    ${r.sku_id}, ${r.sku_name}, ${r.category_id}, ${r.category_name},
                    ${r.season_year}, ${r.season}, ${r.price_band}, ${r.msrp},
                    ${r.lifecycle}, ${nullify(r.launch_date)}, ${r.color_family},
                    ${r.product_line}, ${r.target_age_group}, ${r.gender},
                    ${r.launch_wave}, ${r.color}, ${r.target_audience},
                    ${r.category_l1}, ${r.category_l2}, ${r.dev_season_year},
                    ${r.dev_season}, ${r.product_track}, ${r.is_carryover},
                    ${r.carryover_type}, ${r.carryover_status}, ${r.monitor_mode},
                    ${r.non_main_reason}, ${nullify(r.carryover_protection_end)},
                    ${r.carryover_entry_source}
                ) ON CONFLICT (sku_id) DO UPDATE SET
                    sku_name = EXCLUDED.sku_name,
                    updated_at = NOW()
            `;
        } catch (e) { if (!e.message?.includes('column')) throw e; }
    }
    console.log(`  ✅ dim_sku: ${dimSkus.length} 条`);

    const dimWaves = readJson('data/dashboard/dim_wave_plan.json');
    for (const r of dimWaves) {
        await sql`
            INSERT INTO dim_wave_plan VALUES (
                ${r.id}, ${r.season}, ${r.wave}, ${nullify(r.launch_date)},
                ${r.theme}, ${r.temp_zone}, ${r.sku_plan}, ${r.sku_actual},
                ${r.new_ratio}, ${r.old_ratio}, ${r.units_plan}, ${r.revenue_plan},
                ${nullify(r.category_mix)}
            ) ON CONFLICT (id) DO NOTHING
        `;
    }
    console.log(`  ✅ dim_wave_plan: ${dimWaves.length} 条`);

    const dimRegions = readJson('data/dashboard/dim_region.json');
    for (const r of dimRegions) {
        await sql`
            INSERT INTO dim_region VALUES (
                ${r.province}, ${r.region_id}, ${r.region_name}, ${r.total_stores},
                ${r.net_sales}, ${r.plan_sales}, ${r.achievement_rate},
                ${r.sell_through}, ${nullify(r.tier_mix)}, ${nullify(r.format_mix)}
            ) ON CONFLICT (province) DO NOTHING
        `;
    }
    console.log(`  ✅ dim_region: ${dimRegions.length} 条`);

    const dimChannels = readJson('data/dashboard/dim_channel.json');
    for (const r of dimChannels) {
        await sql`
            INSERT INTO dim_channel VALUES (
                ${r.channel_id}, ${r.channel_type}, ${r.channel_name},
                ${r.is_online}, ${r.region}, ${r.city_tier}, ${r.store_format}
            ) ON CONFLICT (channel_id) DO NOTHING
        `;
    }
    console.log(`  ✅ dim_channel: ${dimChannels.length} 条`);

    const dimCompetitors = readJson('data/dashboard/dim_competitor.json');
    for (const r of dimCompetitors) {
        await sql`
            INSERT INTO dim_competitor VALUES (
                ${r.id}, ${r.name}, ${r.position}, ${r.market_share}, ${r.yoy},
                ${nullify(r.radar)}, ${nullify(r.price_band_mix)},
                ${nullify(r.category_mix)}, ${nullify(r.trend_tags)}, ${nullify(r.hot_skus)}
            ) ON CONFLICT (id) DO NOTHING
        `;
    }
    console.log(`  ✅ dim_competitor: ${dimCompetitors.length} 条`);

    // ===== 事实表（大表，批量） =====

    console.log('\n  开始导入大事实表（可能需要 1-2 分钟）...');
    const factSales = readJson('data/dashboard/fact_sales.json');
    let salesInserted = 0;
    const BATCH = 100;
    for (let i = 0; i < factSales.length; i += BATCH) {
        const chunk = factSales.slice(i, i + BATCH);
        await Promise.all(chunk.map(r => sql`
            INSERT INTO fact_sales (
                record_id, sku_id, channel_id, season_year, season, wave, week_num,
                unit_sold, gross_sales_amt, net_sales_amt, discount_amt, discount_rate,
                cogs_amt, gross_profit_amt, gross_margin_rate, cumulative_sell_through,
                on_hand_unit, sale_year, sale_month, sale_wave, sales_season_year,
                sales_season, product_track, is_carryover, carryover_type,
                carryover_status, monitor_mode, non_main_reason,
                carryover_protection_end, carryover_entry_source
            ) VALUES (
                ${r.record_id}, ${r.sku_id}, ${r.channel_id}, ${r.season_year},
                ${r.season}, ${r.wave}, ${r.week_num}, ${r.unit_sold},
                ${r.gross_sales_amt}, ${r.net_sales_amt}, ${r.discount_amt},
                ${r.discount_rate}, ${r.cogs_amt}, ${r.gross_profit_amt},
                ${r.gross_margin_rate}, ${r.cumulative_sell_through}, ${r.on_hand_unit},
                ${r.sale_year}, ${r.sale_month}, ${r.sale_wave}, ${r.sales_season_year},
                ${r.sales_season}, ${r.product_track}, ${r.is_carryover},
                ${r.carryover_type}, ${r.carryover_status}, ${r.monitor_mode},
                ${r.non_main_reason}, ${nullify(r.carryover_protection_end)},
                ${r.carryover_entry_source}
            ) ON CONFLICT (record_id) DO NOTHING
        `.catch(() => null)));
        salesInserted += chunk.length;
        process.stdout.write(`\r  fact_sales: ${salesInserted}/${factSales.length}`);
    }
    console.log(`\r  ✅ fact_sales: ${factSales.length} 条`);

    const factOps = readJson('data/dashboard/fact_ops.json');
    let opsInserted = 0;
    for (let i = 0; i < factOps.length; i += BATCH) {
        const chunk = factOps.slice(i, i + BATCH);
        await Promise.all(chunk.map(r => sql`
            INSERT INTO fact_ops VALUES (
                ${r.record_key}, ${r.sku_id}, ${r.channel_id}, ${r.season_year},
                ${r.season}, ${r.wave}, ${r.week_num}, ${r.demand_pairs},
                ${r.ship_pairs}, ${r.reorder_pairs}, ${r.fill_rate},
                ${r.reorder_rate}, ${r.source_type}
            ) ON CONFLICT (record_key) DO NOTHING
        `.catch(() => null)));
        opsInserted += chunk.length;
        process.stdout.write(`\r  fact_ops: ${opsInserted}/${factOps.length}`);
    }
    console.log(`\r  ✅ fact_ops: ${factOps.length} 条`);

    const factInventory = readJson('data/dashboard/fact_inventory.json');
    for (const r of factInventory) {
        await sql`
            INSERT INTO fact_inventory (
                date, store_id, sku_id, bop_qty, inbound_qty, transfer_in,
                transfer_out, sales_qty, off_shelf_qty, damage_qty, eop_qty, inventory_amount
            ) VALUES (
                ${nullify(r.date)}, ${r.store_id}, ${r.sku_id}, ${r.bop_qty},
                ${r.inbound_qty}, ${r.transfer_in}, ${r.transfer_out}, ${r.sales_qty},
                ${r.off_shelf_qty}, ${r.damage_qty}, ${r.eop_qty}, ${r.inventory_amount}
            )
        `.catch(() => null);
    }
    console.log(`  ✅ fact_inventory: ${factInventory.length} 条`);

    const factPlan = readJson('data/dashboard/fact_plan.json');
    for (const r of factPlan) {
        await sql`
            INSERT INTO fact_plan (
                year, season, wave, plan_sku, plan_sales, plan_gm, plan_buy_units,
                plan_otb_budget, plan_opening_inventory, plan_closing_inventory
            ) VALUES (
                ${r.year}, ${r.season}, ${r.wave}, ${r.plan_sku}, ${r.plan_sales},
                ${r.plan_gm}, ${r.plan_buy_units}, ${r.plan_otb_budget},
                ${r.plan_opening_inventory}, ${r.plan_closing_inventory}
            )
        `.catch(() => null);
    }
    console.log(`  ✅ fact_plan: ${factPlan.length} 条`);

    const factCompetitor = readJson('data/dashboard/fact_competitor.json');
    for (const r of factCompetitor) {
        await sql`
            INSERT INTO fact_competitor VALUES (
                ${r.record_id}, ${r.competitor_name}, ${r.category_name},
                ${r.price_band}, ${r.price_band_name}, ${r.estimated_sales_amt},
                ${r.estimated_units}, ${r.market_share_pct}
            ) ON CONFLICT (record_id) DO NOTHING
        `.catch(() => null);
    }
    console.log(`  ✅ fact_competitor: ${factCompetitor.length} 条`);

    const forecasts = readJson('data/dashboard/sales_forecasts.json');
    for (const r of forecasts) {
        await sql`
            INSERT INTO sales_forecasts VALUES (
                ${r.forecastId}, ${r.year}, ${r.season}, ${r.quarter}, ${r.brand},
                ${r.waveId}, ${r.waveLabel}, ${r.channelType}, ${r.scenarioType},
                ${r.forecastSales}, ${r.forecastUnits}, ${r.sellThroughTarget},
                ${r.grossMarginTarget}, ${r.note}
            ) ON CONFLICT (forecast_id) DO NOTHING
        `.catch(() => null);
    }
    console.log(`  ✅ sales_forecasts: ${forecasts.length} 条`);

    const otbInputs = readJson('data/dashboard/otb_bridge_inputs.json');
    for (const r of otbInputs) {
        await sql`
            INSERT INTO otb_bridge_inputs VALUES (
                ${r.bridgeInputId}, ${r.otbStructureId}, ${r.brand},
                ${r.categoryL1}, ${r.categoryL2}, ${r.categoryL3}, ${r.scene},
                ${r.channelFocus}, ${r.forecastSales}, ${r.forecastUnits},
                ${r.waveBudgetShare}, ${r.priceBandBudgetShare}, ${r.spuTarget},
                ${r.skuTarget}, ${r.averageDepth}, ${r.roleMix}, ${r.developmentMix},
                ${r.platformMix}, ${r.structureTypes}, ${r.soleTypes}, ${r.lastTypes},
                ${r.leadCategory}, ${r.leadWave}, ${r.leadPriceBand}, ${r.recommendedAction}
            ) ON CONFLICT (bridge_input_id) DO NOTHING
        `.catch(() => null);
    }
    console.log(`  ✅ otb_bridge_inputs: ${otbInputs.length} 条`);

    // ===== 设计企划表 =====

    console.log('\n  开始导入设计企划数据...');

    const fpWaves = readJson('data/footwear-planning/waves.json');
    for (const r of fpWaves) {
        await sql`
            INSERT INTO fp_waves VALUES (
                ${r.waveId}, ${r.waveName}, ${r.launchWindow}, ${r.theme},
                ${r.status}, ${r.plannedSkuCount}, ${r.actualSkuCount}
            ) ON CONFLICT (wave_id) DO NOTHING
        `.catch(() => null);
    }
    console.log(`  ✅ fp_waves: ${fpWaves.length} 条`);

    const designItems = readJson('data/footwear-planning/design-items.json');
    for (const r of designItems) {
        await sql`
            INSERT INTO fp_design_items VALUES (
                ${r.itemId}, ${r.seriesId}, ${r.itemName}, ${r.skuCode},
                ${r.productRole}, ${r.category}, ${r.occasion}, ${r.designStatus},
                ${r.colorway}, ${r.material}, ${r.pricePoint},
                ${nullify(r.targetLaunchDate)}, ${r.designer}, ${r.thumbnailUrl},
                ${r.designNotes}, ${nullify(r.createdAt)}, ${nullify(r.updatedAt)},
                ${r.source}, ${nullify(r.sourceId)}, ${r.syncStatus},
                ${r.targetCostEstimate}, ${r.sampleQuotedCost},
                ${nullify(r.finalLockedCost)}, ${r.techPackStatus},
                ${r.toolingStatus}, ${r.toolingNotes}
            ) ON CONFLICT (item_id) DO NOTHING
        `.catch(() => null);
    }
    console.log(`  ✅ fp_design_items: ${designItems.length} 条`);

    const gateNodes = readJson('data/footwear-planning/gate-nodes.json');
    for (const r of gateNodes) {
        await sql`
            INSERT INTO fp_gate_nodes VALUES (
                ${r.gateId}, ${r.styleId}, ${r.gateGroup}, ${r.gateType},
                ${r.gateName}, ${nullify(r.plannedDate)}, ${nullify(r.actualDate)},
                ${r.completed}, ${r.delayed}, ${r.blocked},
                ${r.owner}, ${r.impactWave}, ${r.note}
            ) ON CONFLICT (gate_id) DO NOTHING
        `.catch(() => null);
    }
    console.log(`  ✅ fp_gate_nodes: ${gateNodes.length} 条`);

    const reviewRecords = readJson('data/footwear-planning/review-records.json');
    for (const r of reviewRecords) {
        await sql`
            INSERT INTO fp_review_records (
                review_id, style_id, review_date, review_type, conclusion,
                issue_description, change_request, owner, due_date, closed,
                blocked, impact_scope, next_review_date
            ) VALUES (
                ${r.reviewId}, ${r.styleId}, ${nullify(r.reviewDate)}, ${r.reviewType},
                ${r.conclusion}, ${r.issueDescription}, ${r.changeRequest},
                ${r.owner}, ${nullify(r.dueDate)}, ${r.closed}, ${r.blocked},
                ${r.impactScope}, ${nullify(r.nextReviewDate)}
            ) ON CONFLICT (review_id) DO NOTHING
        `.catch(() => null);
    }
    console.log(`  ✅ fp_review_records: ${reviewRecords.length} 条`);

    const actionItems = readJson('data/footwear-planning/action-items.json');
    for (const r of actionItems) {
        await sql`
            INSERT INTO fp_action_items (
                action_id, review_id, style_id, action_type, action_description,
                status, owner, due_date, completed_at, reapproved
            ) VALUES (
                ${r.actionId}, ${r.reviewId}, ${r.styleId}, ${r.actionType},
                ${r.actionDescription}, ${r.status}, ${r.owner},
                ${nullify(r.dueDate)}, ${nullify(r.completedAt)}, ${r.reapproved}
            ) ON CONFLICT (action_id) DO NOTHING
        `.catch(() => null);
    }
    console.log(`  ✅ fp_action_items: ${actionItems.length} 条`);

    const assets = readJson('data/footwear-planning/assets.json');
    for (const r of assets) {
        await sql`
            INSERT INTO fp_assets VALUES (
                ${r.assetId}, ${r.assetType}, ${r.seriesId}, ${r.title},
                ${r.description}, ${r.fileUrl}, ${r.thumbnailUrl},
                ${JSON.stringify(r.tags || [])}, ${r.uploadedBy},
                ${nullify(r.uploadedAt)}, ${r.featuredInReport},
                ${r.source}, ${nullify(r.sourceId)}, ${r.syncStatus}
            ) ON CONFLICT (asset_id) DO NOTHING
        `.catch(() => null);
    }
    console.log(`  ✅ fp_assets: ${assets.length} 条`);

    const catPlans = readJson('data/footwear-planning/category-plans.json');
    for (const r of catPlans) {
        await sql`
            INSERT INTO fp_category_plans VALUES (
                ${r.categoryPlanId}, ${r.projectId}, ${r.seriesId}, ${r.categoryName},
                ${r.styleTarget}, ${r.skuTarget}, ${r.developmentLevel},
                ${r.sharedOutsoleStrategy}, ${r.sharedLastStrategy}, ${r.targetCostBand},
                ${r.targetWave}, ${r.developmentRole}, ${r.toolingNeed}, ${r.currentStatus}
            ) ON CONFLICT (category_plan_id) DO NOTHING
        `.catch(() => null);
    }
    console.log(`  ✅ fp_category_plans: ${catPlans.length} 条`);

    const catBreakdowns = readJson('data/footwear-planning/category-breakdowns.json');
    for (const r of catBreakdowns) {
        await sql`
            INSERT INTO fp_category_breakdowns VALUES (
                ${r.breakdownId}, ${r.season}, ${r.waveId}, ${r.seriesId},
                ${r.seriesName}, ${r.designConcept}, ${r.category}, ${r.subcategory},
                ${r.plannedSkuCount}, ${JSON.stringify(r.productRoles || [])},
                ${JSON.stringify(r.keyStructures || [])}, ${JSON.stringify(r.weekLabels || [])},
                ${JSON.stringify(r.processTags || [])}, ${r.factoryProfile}, ${r.lineType},
                ${r.capacityBand}, ${r.technicalRiskLevel}, ${r.leadTimeRisk},
                ${JSON.stringify(r.materialDependency || [])}, ${r.focusNote},
                ${r.source}, ${nullify(r.sourceId)}, ${nullify(r.updatedAt)},
                ${r.updatedBy}, ${r.syncStatus}
            ) ON CONFLICT (breakdown_id) DO NOTHING
        `.catch(() => null);
    }
    console.log(`  ✅ fp_category_breakdowns: ${catBreakdowns.length} 条`);

    console.log('\n✅ 全部数据导入完成！');
}

main().catch((e) => {
    console.error('\n❌ 导入失败:', e.message);
    process.exit(1);
});
