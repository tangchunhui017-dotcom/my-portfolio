'use client';

import { useMemo } from 'react';
import wavePlanRaw from '@/../data/dashboard/dim_wave_plan.json';
import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import factSalesRaw from '@/../data/dashboard/fact_sales.json';
import factInventoryRaw from '@/../data/dashboard/fact_inventory.json';
import factPlanRaw from '@/../data/dashboard/fact_plan.json';

interface WavePlanRecord {
    id: string;
    season: string;
    wave: string;
    launch_date: string;
    theme: string;
    temp_zone?: string;
    sku_plan: number;
    sku_actual: number;
    new_ratio: number;
    old_ratio: number;
    units_plan?: number;
    revenue_plan?: number;
    category_mix: Record<string, number>;
}

interface DimSkuRecord {
    sku_id: string;
    sku_name?: string;
    category_id?: string;
    category_name?: string;
    price_band?: string;
    msrp?: number;
    launch_wave?: string;
    season_year?: string;
}

interface FactSalesRecord {
    sku_id: string;
    season_year?: string;
    wave?: string;
    week_num: number;
    unit_sold: number;
    net_sales_amt: number;
    gross_profit_amt?: number;
    gross_margin_rate?: number;
    cumulative_sell_through?: number;
    on_hand_unit?: number;
}

interface FactInventoryRecord {
    sku_id: string;
    inbound_qty?: number;
    transfer_in?: number;
    sales_qty?: number;
    eop_qty?: number;
}

interface FactPlanRecord {
    year: number;
    season: string;
    wave: string;
    plan_sku: number;
    plan_sales: number;
    plan_buy_units: number;
    plan_otb_budget: number;
}

interface SkuSalesAgg {
    units: number;
    netSales: number;
    grossProfit: number;
    stWeighted: number;
    stWeight: number;
    latestWeek: number;
    latestOnHand: number;
}

interface SkuInventoryAgg {
    shipQty: number;
    salesQty: number;
    eopQty: number;
}

interface WaveSkuSource {
    sku_id: string;
    category: string;
    msrp: number;
    price_band: string;
    units: number;
    net_sales: number;
    sell_through: number;
    inventory_units: number;
}

export interface WaveDrillRow {
    style_id: string;
    category: string;
    price_band: string;
    suggested_depth: number;
    forecast_units: number;
    forecast_sales: number;
    suggestion: string;
    sell_through: number;
    inventory_units: number;
}

export interface WaveSummary {
    id: string;
    season: string;
    wave: string;
    launch_date: string;
    theme: string;
    temp_zone: string;
    sku_plan: number;
    sku_actual: number;
    new_ratio: number;
    old_ratio: number;
    actual_units: number;
    actual_sales: number;
    avg_sell_through: number;
    avg_gm_rate: number;
    sell_ship_ratio: number | null;
    sell_ship_coverage: number;
    sell_ship_note: string;
    plan_buy_units: number;
    plan_sales: number;
    otb_budget: number;
    launch_window_days: number;
    temp_narrative: number;
    category_mix: Record<string, number>;
    drill_rows: WaveDrillRow[];
}

export interface WaveStackRow {
    wave_id: string;
    wave_label: string;
    launch_label: string;
    launch_window_days: number;
    temp_narrative: number;
    total_sku: number;
    category_values: Record<string, number>;
}

export type WaveTempStatus = '匹配' | '偏早' | '偏晚';

export interface RegionWaveCell {
    wave_id: string;
    wave_label: string;
    launch_label: string;
    launch_window_days: number;
    sku_capacity: number;
    temp_narrative: number;
    status: WaveTempStatus;
    reason: string;
    action: string;
}

export interface RegionTempRow {
    region: string;
    temp_range: string;
    cells: RegionWaveCell[];
}

const wavePlan = wavePlanRaw as WavePlanRecord[];
const dimSku = dimSkuRaw as DimSkuRecord[];
const factSales = factSalesRaw as FactSalesRecord[];
const factInventory = factInventoryRaw as FactInventoryRecord[];
const factPlan = factPlanRaw as FactPlanRecord[];

const CATEGORY_ALIAS: Record<string, string> = {
    潮流: '休闲',
    综训: '训练',
};

const CATEGORY_ORDER = ['跑步', '训练', '篮球', '户外', '休闲', '童鞋', '其他'];
const MONTH_TEMP = [6, 8, 13, 19, 24, 28, 31, 30, 25, 18, 12, 7];
const REGION_ORDER = ['华北', '华东', '华南', '全国统管'];
const REGION_TEMP_RULES: Record<string, { temp_range: string; temp_shift: number; target_min: number; target_max: number }> = {
    华北: { temp_range: '冷凉带 5-18°C', temp_shift: -3.2, target_min: 8, target_max: 20 },
    华东: { temp_range: '温和带 10-24°C', temp_shift: 0, target_min: 12, target_max: 24 },
    华南: { temp_range: '暖热带 18-32°C', temp_shift: 4.2, target_min: 18, target_max: 30 },
    全国统管: { temp_range: '多温域混合', temp_shift: 0.5, target_min: 10, target_max: 28 },
};

function safeDiv(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return numerator / denominator;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function normalizeWaveCode(wave: string | undefined) {
    if (!wave) return '';
    const match = wave.match(/\d+/);
    if (!match) return wave.toUpperCase();
    return `W${Number(match[0])}`;
}

function normalizeCategory(category: string | undefined) {
    if (!category) return '其他';
    const trimmed = category.trim();
    return CATEGORY_ALIAS[trimmed] || trimmed;
}

function parseDateMs(dateStr: string) {
    const ms = Number(new Date(dateStr));
    return Number.isFinite(ms) ? ms : 0;
}

function deriveStyleId(skuId: string) {
    const numeric = skuId.replace(/\D/g, '');
    if (!numeric) return skuId;
    return `ST${numeric.padStart(4, '0')}`;
}

function estimateTempByDate(dateStr: string) {
    const date = new Date(dateStr);
    const month = date.getMonth();
    const base = MONTH_TEMP[month] ?? 20;
    const noise = ((date.getDate() % 5) - 2) * 0.4;
    return Number((base + noise).toFixed(1));
}

function pickSuggestion(sellThrough: number, inventoryUnits: number, forecastUnits: number) {
    if (sellThrough >= 0.72 && inventoryUnits <= Math.max(1200, Math.round(forecastUnits * 0.8))) {
        return '补货加深度，防断码';
    }
    if (sellThrough <= 0.45 && inventoryUnits >= 1600) {
        return '降价清货并转奥莱';
    }
    if (sellThrough <= 0.55) {
        return '控补货，做组合促销';
    }
    return '维持节奏，观察周转';
}

function formatMonthDay(dateStr: string) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
}

function evaluateWaveTempStatus(
    temp: number,
    targetMin: number,
    targetMax: number,
): { status: WaveTempStatus; reason: string; action: string } {
    if (temp < targetMin) {
        return {
            status: '偏早',
            reason: `温度 ${temp.toFixed(1)}°C 低于建议区间 ${targetMin}-${targetMax}°C`,
            action: '建议小单试销，延后上量窗口',
        };
    }
    if (temp > targetMax) {
        return {
            status: '偏晚',
            reason: `温度 ${temp.toFixed(1)}°C 高于建议区间 ${targetMin}-${targetMax}°C`,
            action: '建议提前预热并加速主推节奏',
        };
    }
    return {
        status: '匹配',
        reason: `温度 ${temp.toFixed(1)}°C 处于建议区间 ${targetMin}-${targetMax}°C`,
        action: '按计划执行上市节奏',
    };
}

export function useWavePlanning() {
    return useMemo(() => {
        const orderedWaves = [...wavePlan].sort((a, b) => parseDateMs(a.launch_date) - parseDateMs(b.launch_date));

        const skuMap = new Map<string, DimSkuRecord>();
        dimSku.forEach((sku) => {
            skuMap.set(sku.sku_id, sku);
        });

        const salesBySku = new Map<string, SkuSalesAgg>();
        factSales.forEach((row) => {
            const current = salesBySku.get(row.sku_id) || {
                units: 0,
                netSales: 0,
                grossProfit: 0,
                stWeighted: 0,
                stWeight: 0,
                latestWeek: -1,
                latestOnHand: 0,
            };
            const unit = row.unit_sold || 0;
            const netSales = row.net_sales_amt || 0;
            const grossProfit = typeof row.gross_profit_amt === 'number'
                ? row.gross_profit_amt
                : netSales * (row.gross_margin_rate || 0);
            const stWeight = Math.max(unit, 1);
            current.units += unit;
            current.netSales += netSales;
            current.grossProfit += grossProfit;
            current.stWeighted += (row.cumulative_sell_through || 0) * stWeight;
            current.stWeight += stWeight;
            if (row.week_num >= current.latestWeek) {
                current.latestWeek = row.week_num;
                current.latestOnHand = row.on_hand_unit || 0;
            }
            salesBySku.set(row.sku_id, current);
        });

        const inventoryBySku = new Map<string, SkuInventoryAgg>();
        factInventory.forEach((row) => {
            const current = inventoryBySku.get(row.sku_id) || {
                shipQty: 0,
                salesQty: 0,
                eopQty: 0,
            };
            current.shipQty += (row.inbound_qty || 0) + (row.transfer_in || 0);
            current.salesQty += row.sales_qty || 0;
            current.eopQty += row.eop_qty || 0;
            inventoryBySku.set(row.sku_id, current);
        });

        const hasInboundField = factInventory.some((row) => typeof row.inbound_qty === 'number' || typeof row.transfer_in === 'number');
        const hasSalesField = factInventory.some((row) => typeof row.sales_qty === 'number');

        const planBySeasonWave = new Map<string, FactPlanRecord>();
        factPlan.forEach((row) => {
            planBySeasonWave.set(`${row.season}__${normalizeWaveCode(row.wave)}`, row);
        });

        const waveSummaries: WaveSummary[] = orderedWaves.map((wave, index) => {
            const waveCode = normalizeWaveCode(wave.wave);
            const waveYear = wave.season.slice(0, 4);
            let waveSkus = dimSku.filter(
                (sku) => normalizeWaveCode(sku.launch_wave) === waveCode && (!waveYear || sku.season_year === waveYear),
            );
            if (!waveSkus.length) {
                waveSkus = dimSku.filter((sku) => normalizeWaveCode(sku.launch_wave) === waveCode);
            }

            let actualUnits = 0;
            let actualSales = 0;
            let grossProfit = 0;
            let stWeighted = 0;
            let stWeight = 0;

            waveSkus.forEach((sku) => {
                const hit = salesBySku.get(sku.sku_id);
                if (!hit) return;
                actualUnits += hit.units;
                actualSales += hit.netSales;
                grossProfit += hit.grossProfit;
                stWeighted += hit.stWeighted;
                stWeight += hit.stWeight;
            });

            const avgSellThrough = safeDiv(stWeighted, stWeight);
            const avgGmRate = safeDiv(grossProfit, actualSales);

            const planRow = planBySeasonWave.get(`${wave.season}__${waveCode}`);
            const planBuyUnits = planRow?.plan_buy_units || wave.units_plan || Math.round(wave.sku_plan * 900);
            const planSales = planRow?.plan_sales || wave.revenue_plan || Math.round(planBuyUnits * 399);
            const otbBudget = planRow?.plan_otb_budget || 0;

            const normalizedMix: Record<string, number> = {};
            Object.entries(wave.category_mix || {}).forEach(([raw, value]) => {
                const category = normalizeCategory(raw);
                normalizedMix[category] = (normalizedMix[category] || 0) + (value || 0);
            });

            const mixTotal = Object.values(normalizedMix).reduce((sum, value) => sum + value, 0);
            const categoryPlanUnits: Record<string, number> = {};
            Object.entries(normalizedMix).forEach(([category, mixValue]) => {
                categoryPlanUnits[category] = Math.round(planBuyUnits * safeDiv(mixValue, mixTotal || 1));
            });

            const styleCountByCategory: Record<string, number> = {};
            waveSkus.forEach((sku) => {
                const category = normalizeCategory(sku.category_id || sku.category_name);
                styleCountByCategory[category] = (styleCountByCategory[category] || 0) + 1;
            });

            const storeBase = 10;
            const drillSourceRows: WaveSkuSource[] = waveSkus.map((sku) => {
                const category = normalizeCategory(sku.category_id || sku.category_name);
                const salesAgg = salesBySku.get(sku.sku_id);
                const invAgg = inventoryBySku.get(sku.sku_id);
                return {
                    sku_id: sku.sku_id,
                    category,
                    msrp: sku.msrp || 0,
                    price_band: sku.price_band || '未分层',
                    units: salesAgg?.units || 0,
                    net_sales: salesAgg?.netSales || 0,
                    sell_through: safeDiv(salesAgg?.stWeighted || 0, salesAgg?.stWeight || 0),
                    inventory_units: salesAgg?.latestOnHand || invAgg?.eopQty || 0,
                };
            });

            const drillRows: WaveDrillRow[] = drillSourceRows
                .map((row) => {
                    const categoryStyles = styleCountByCategory[row.category] || 1;
                    const fallbackUnits = Math.round(planBuyUnits / Math.max(waveSkus.length, 1));
                    const forecastUnits = Math.round(
                        (categoryPlanUnits[row.category] || fallbackUnits) / categoryStyles,
                    );
                    const effectiveMsrp = row.msrp > 0 ? row.msrp : Math.round(safeDiv(planSales, planBuyUnits || 1));
                    const forecastSales = Math.round(forecastUnits * effectiveMsrp * 0.88);
                    const suggestedDepth = Math.max(1, Math.round(forecastUnits / storeBase));
                    return {
                        style_id: deriveStyleId(row.sku_id),
                        category: row.category,
                        price_band: row.price_band,
                        suggested_depth: suggestedDepth,
                        forecast_units: forecastUnits,
                        forecast_sales: forecastSales,
                        suggestion: pickSuggestion(row.sell_through, row.inventory_units, forecastUnits),
                        sell_through: row.sell_through,
                        inventory_units: row.inventory_units,
                    };
                })
                .sort((a, b) => b.forecast_sales - a.forecast_sales)
                .slice(0, 18);

            const matchedInventoryRows = waveSkus.filter((sku) => inventoryBySku.has(sku.sku_id));
            const coverage = safeDiv(matchedInventoryRows.length, waveSkus.length || 1);
            let sellShipRatio: number | null = null;
            let sellShipNote = '';

            if (!hasInboundField || !hasSalesField) {
                sellShipNote = '当前口径缺少到货或销售字段，销发比暂显示 —';
            } else if (!waveSkus.length) {
                sellShipNote = '当前波段无SKU映射，销发比暂显示 —';
            } else {
                let shipQty = 0;
                let salesQty = 0;
                matchedInventoryRows.forEach((sku) => {
                    const inv = inventoryBySku.get(sku.sku_id);
                    shipQty += inv?.shipQty || 0;
                    salesQty += inv?.salesQty || 0;
                });
                if (shipQty <= 0) {
                    sellShipNote = '当前波段到货量为 0，销发比暂显示 —';
                } else if (coverage < 0.3) {
                    sellShipNote = `库存样本覆盖仅 ${(coverage * 100).toFixed(0)}%，销发比暂显示 —`;
                } else {
                    sellShipRatio = salesQty / shipQty;
                    sellShipNote = `样本覆盖 ${(coverage * 100).toFixed(0)}%，口径：销量 / (入库+调拨入)`;
                }
            }

            const launchMs = parseDateMs(wave.launch_date);
            const nextLaunchMs = parseDateMs(orderedWaves[index + 1]?.launch_date || '');
            const defaultWindow = 28;
            const diffDays = nextLaunchMs > launchMs ? Math.round((nextLaunchMs - launchMs) / (24 * 3600 * 1000)) : defaultWindow;
            const launchWindowDays = Math.max(14, Math.min(diffDays, 56));

            return {
                id: wave.id,
                season: wave.season,
                wave: wave.wave,
                launch_date: wave.launch_date,
                theme: wave.theme,
                temp_zone: wave.temp_zone || '全国',
                sku_plan: wave.sku_plan || 0,
                sku_actual: wave.sku_actual || 0,
                new_ratio: wave.new_ratio || 0,
                old_ratio: wave.old_ratio || 0,
                actual_units: actualUnits,
                actual_sales: actualSales,
                avg_sell_through: avgSellThrough,
                avg_gm_rate: avgGmRate,
                sell_ship_ratio: sellShipRatio,
                sell_ship_coverage: coverage,
                sell_ship_note: sellShipNote,
                plan_buy_units: planBuyUnits,
                plan_sales: planSales,
                otb_budget: otbBudget,
                launch_window_days: launchWindowDays,
                temp_narrative: estimateTempByDate(wave.launch_date),
                category_mix: normalizedMix,
                drill_rows: drillRows,
            };
        });

        const categorySet = new Set<string>();
        waveSummaries.forEach((wave) => {
            Object.keys(wave.category_mix).forEach((category) => categorySet.add(category));
        });

        const stackCategories = [...categorySet].sort((a, b) => {
            const aIndex = CATEGORY_ORDER.indexOf(a);
            const bIndex = CATEGORY_ORDER.indexOf(b);
            if (aIndex < 0 && bIndex < 0) return a.localeCompare(b, 'zh-CN');
            if (aIndex < 0) return 1;
            if (bIndex < 0) return -1;
            return aIndex - bIndex;
        });

        const stackRows: WaveStackRow[] = waveSummaries.map((wave) => ({
            wave_id: wave.id,
            wave_label: `${wave.season}-${wave.wave}`,
            launch_label: formatMonthDay(wave.launch_date),
            launch_window_days: wave.launch_window_days,
            temp_narrative: wave.temp_narrative,
            total_sku: wave.sku_plan,
            category_values: stackCategories.reduce<Record<string, number>>((acc, category) => {
                acc[category] = wave.category_mix[category] || 0;
                return acc;
            }, {}),
        }));

        const regionTempRows: RegionTempRow[] = REGION_ORDER.map((region) => {
            const rule = REGION_TEMP_RULES[region];
            const cells: RegionWaveCell[] = waveSummaries.map((wave) => {
                const regionTemp = clamp(Number((wave.temp_narrative + rule.temp_shift).toFixed(1)), -5, 40);
                const statusInfo = evaluateWaveTempStatus(regionTemp, rule.target_min, rule.target_max);
                return {
                    wave_id: wave.id,
                    wave_label: `${wave.season}-${wave.wave}`,
                    launch_label: formatMonthDay(wave.launch_date),
                    launch_window_days: wave.launch_window_days,
                    sku_capacity: wave.sku_plan,
                    temp_narrative: regionTemp,
                    status: statusInfo.status,
                    reason: statusInfo.reason,
                    action: statusInfo.action,
                };
            });
            return {
                region,
                temp_range: rule.temp_range,
                cells,
            };
        });

        const regionSeriesMap = regionTempRows.reduce<Record<string, RegionWaveCell[]>>((acc, row) => {
            acc[row.region] = row.cells;
            return acc;
        }, {});
        const regionOptions = regionTempRows.map((row) => row.region);
        const defaultRegion = regionOptions.includes('全国统管') ? '全国统管' : (regionOptions[0] || '');

        const salesYears = Array.from(new Set(factSales.map((row) => row.season_year).filter(Boolean))).sort();
        const planYears = Array.from(new Set(factPlan.map((row) => String(row.year)))).sort();
        const dataScopeHint = `样本口径：fact_sales ${salesYears.join('/')}；fact_plan ${planYears.join('/')}。跨年比较仅用于演示。`;

        return {
            waveSummaries,
            stackCategories,
            stackRows,
            regionTempRows,
            regionSeriesMap,
            regionOptions,
            defaultRegion,
            dataScopeHint,
        };
    }, []);
}
