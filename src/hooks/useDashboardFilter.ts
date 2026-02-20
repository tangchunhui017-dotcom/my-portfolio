'use client';

import { useState, useMemo, useCallback } from 'react';

export type CompareMode = 'none' | 'plan' | 'yoy' | 'mom';

// 显式类型定义，避免大型 JSON 文件导致 TypeScript 推断失败
interface FactSalesRecord {
    record_id: string;
    sku_id: string;
    channel_id: string;
    season_year: string;
    season: string;
    wave: string;
    week_num: number;
    unit_sold: number;
    gross_sales_amt: number;
    net_sales_amt: number;
    discount_amt: number;
    discount_rate: number;
    cogs_amt: number;
    gross_profit_amt: number;
    gross_margin_rate: number;
    cumulative_sell_through: number;
    on_hand_unit: number;
}

interface DimSku {
    sku_id: string;
    sku_name: string;
    category_id: string;
    category_name: string;
    season_year: string;
    season: string;
    price_band: string;
    msrp: number;
    lifecycle: string;
    launch_date?: string;  // 上市日期，格式 YYYY-MM-DD
}

interface DimChannel {
    channel_id: string;
    channel_type: string;
    channel_name: string;
    region_id: string;
}

import factSalesRaw from '@/../data/dashboard/fact_sales.json';
import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import dimChannelRaw from '@/../data/dashboard/dim_channel.json';
import dimPlanRaw from '@/../data/dashboard/dim_plan.json';

const factSales = factSalesRaw as unknown as FactSalesRecord[];
const dimSku = dimSkuRaw as unknown as DimSku[];
const dimChannel = dimChannelRaw as unknown as DimChannel[];

interface DimPlan {
    season_year: number;
    category_plan: { category_id: string; plan_sales_amt: number; plan_units: number; plan_sell_through: number; plan_margin_rate: number; plan_sku_count: number }[];
    channel_plan: { channel_type: string; plan_sales_amt: number; plan_sell_through: number; plan_margin_rate: number; plan_sales_share: number }[];
    overall_plan: { plan_total_sales: number; plan_total_units: number; plan_avg_sell_through: number; plan_avg_margin_rate: number; plan_avg_discount_depth: number; plan_active_skus: number; plan_ending_inventory_units: number; plan_ending_inventory_amt: number; plan_wos: number };
}
const dimPlan = dimPlanRaw as unknown as DimPlan;

export interface DashboardFilters {
    season_year: number | 'all';
    season: string | 'all';
    wave: string | 'all';
    category_id: string | 'all';   // 匹配 dim_sku.json 的字段名
    channel_type: string | 'all';
    price_band: string | 'all';
    lifecycle: string | 'all';
}

export const DEFAULT_FILTERS: DashboardFilters = {
    season_year: 2024,
    season: 'all',
    wave: 'all',
    category_id: 'all',
    channel_type: 'all',
    price_band: 'all',
    lifecycle: 'all',
};

const PRICE_BANDS = [
    { id: 'PB1', min: 199, max: 299 },
    { id: 'PB2', min: 300, max: 399 },
    { id: 'PB3', min: 400, max: 499 },
    { id: 'PB4', min: 500, max: 599 },
    { id: 'PB5', min: 600, max: 699 },
    { id: 'PB6', min: 700, max: 9999 },
];

export function useDashboardFilter(compareMode: CompareMode = 'none') {
    const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

    const skuMap = useMemo(() => {
        const map: Record<string, DimSku> = {};
        dimSku.forEach(s => { map[s.sku_id] = s; });
        return map;
    }, []);

    const channelMap = useMemo(() => {
        const map: Record<string, DimChannel> = {};
        dimChannel.forEach(c => { map[c.channel_id] = c; });
        return map;
    }, []);

    const filteredRecords = useMemo(() => {
        return factSales.filter(record => {
            const sku = skuMap[record.sku_id];
            const channel = channelMap[record.channel_id];
            if (!sku || !channel) return false;

            // season_year: JSON 存为字符串，筛选器可能是数字，统一转字符串比较
            if (filters.season_year !== 'all' && String(record.season_year) !== String(filters.season_year)) return false;
            if (filters.season !== 'all' && record.season !== filters.season) return false;
            if (filters.wave !== 'all' && record.wave !== filters.wave) return false;
            if (filters.category_id !== 'all' && sku.category_id !== filters.category_id) return false;
            if (filters.channel_type !== 'all' && channel.channel_type !== filters.channel_type) return false;
            if (filters.lifecycle !== 'all' && sku.lifecycle !== filters.lifecycle) return false;

            if (filters.price_band !== 'all') {
                const band = PRICE_BANDS.find(b => b.id === filters.price_band);
                if (band && (sku.msrp < band.min || sku.msrp > band.max)) return false;
            }

            return true;
        });
    }, [filters, skuMap, channelMap]);

    // ── KPI 计算 ──────────────────────────────────────────────
    const kpis = useMemo(() => {
        if (filteredRecords.length === 0) return null;

        const totalNetSales = filteredRecords.reduce((s, r) => s + r.net_sales_amt, 0);
        const totalGrossSales = filteredRecords.reduce((s, r) => s + r.gross_sales_amt, 0);
        const totalUnits = filteredRecords.reduce((s, r) => s + r.unit_sold, 0);
        const totalGrossProfit = filteredRecords.reduce((s, r) => s + r.gross_profit_amt, 0);
        const totalDiscountAmt = filteredRecords.reduce((s, r) => s + r.discount_amt, 0);

        // 售罄率：取各SKU最新周的累计售罄率均值
        const skuLatestST: Record<string, number> = {};
        filteredRecords.forEach(r => {
            if (!skuLatestST[r.sku_id] || r.week_num > (skuLatestST[r.sku_id + '_week'] ?? 0)) {
                skuLatestST[r.sku_id] = r.cumulative_sell_through;
                (skuLatestST as Record<string, number>)[r.sku_id + '_week'] = r.week_num;
            }
        });
        const skuIds = Object.keys(skuLatestST).filter(k => !k.includes('_week'));
        const avgSellThrough = skuIds.length > 0
            ? skuIds.reduce((s, id) => s + skuLatestST[id], 0) / skuIds.length
            : 0;

        const avgMarginRate = totalNetSales > 0 ? totalGrossProfit / totalNetSales : 0;
        const avgDiscountDepth = totalGrossSales > 0 ? totalDiscountAmt / totalGrossSales : 0;

        // 动销 SKU 数（有销售记录的唯一SKU）
        const activeSKUs = new Set(filteredRecords.map(r => r.sku_id)).size;

        // 渠道结构
        const channelSales: Record<string, number> = {};
        filteredRecords.forEach(r => {
            const ch = channelMap[r.channel_id];
            if (ch) {
                channelSales[ch.channel_type] = (channelSales[ch.channel_type] || 0) + r.net_sales_amt;
            }
        });

        // 价格带结构
        const priceBandSales: Record<string, { units: number; sales: number; grossProfit: number; onHandUnits: number }> = {};
        filteredRecords.forEach(r => {
            const sku = skuMap[r.sku_id];
            if (!sku) return;
            const band = PRICE_BANDS.find(b => sku.msrp >= b.min && sku.msrp <= b.max);
            if (band) {
                if (!priceBandSales[band.id]) priceBandSales[band.id] = { units: 0, sales: 0, grossProfit: 0, onHandUnits: 0 };
                priceBandSales[band.id].units += r.unit_sold;
                priceBandSales[band.id].sales += r.net_sales_amt;
                priceBandSales[band.id].grossProfit += r.gross_profit_amt;
                // 只取最新周的库存（取最大周号的库存数）
                priceBandSales[band.id].onHandUnits = Math.max(priceBandSales[band.id].onHandUnits, r.on_hand_unit);
            }
        });

        // 热力图数据（品类 × 价格带）
        const heatmapData: Record<string, { skus: Set<string>; sales: number; st: number }> = {};
        // 预初始化所有格子
        const CATEGORIES = ['跑步', '篮球', '训练', '休闲', '户外'];
        const BANDS = ['PB1', 'PB2', 'PB3', 'PB4', 'PB5', 'PB6'];
        CATEGORIES.forEach(cat => {
            BANDS.forEach(band => {
                heatmapData[`${cat}_${band}`] = { skus: new Set(), sales: 0, st: 0 };
            });
        });

        filteredRecords.forEach(r => {
            const sku = skuMap[r.sku_id];
            if (!sku) return;
            const band = PRICE_BANDS.find(b => sku.msrp >= b.min && sku.msrp <= b.max);
            if (!band) return;

            const key = `${sku.category_id}_${band.id}`;
            if (heatmapData[key]) {
                heatmapData[key].skus.add(sku.sku_id);
                heatmapData[key].sales += r.net_sales_amt;
            }
        });

        // 计算热力图各自售罄率（该格子内所有SKU的加权售罄）
        Object.keys(heatmapData).forEach(key => {
            const skuIds = Array.from(heatmapData[key].skus);
            if (skuIds.length === 0) return;
            const stSum = skuIds.reduce((sum, id) => sum + (skuLatestST[id] || 0), 0);
            heatmapData[key].st = stSum / skuIds.length;
        });

        // Formatted Heatmap Data for Chart
        const heatmapChartData = {
            skuCounts: [] as [number, number, number][],
            sales: [] as [number, number, number][],
            sellThrough: [] as [number, number, number][],
        };

        CATEGORIES.forEach((cat, yIndex) => {
            BANDS.forEach((bandId, xIndex) => {
                const key = `${cat}_${bandId}`;
                const data = heatmapData[key];
                heatmapChartData.skuCounts.push([xIndex, yIndex, data.skus.size]);
                heatmapChartData.sales.push([xIndex, yIndex, Math.round(data.sales / 10000)]); // 万
                heatmapChartData.sellThrough.push([xIndex, yIndex, Math.round(data.st * 100)]); // %
            });
        });

        // 周售罄曲线（用于折线图）
        const weeklyData: Record<number, { units: number; sales: number; st: number; marginRate: number }> = {};
        filteredRecords.forEach(r => {
            if (!weeklyData[r.week_num]) weeklyData[r.week_num] = { units: 0, sales: 0, st: 0, marginRate: 0 };
            weeklyData[r.week_num].units += r.unit_sold;
            weeklyData[r.week_num].sales += r.net_sales_amt;
        });
        // 累计售罄（用最新周均值）
        Object.keys(weeklyData).forEach(w => {
            const week = parseInt(w);
            const weekRecords = filteredRecords.filter(r => r.week_num === week);
            const stVals = weekRecords.map(r => r.cumulative_sell_through);
            weeklyData[week].st = stVals.length > 0 ? stVals.reduce((a, b) => a + b, 0) / stVals.length : 0;
            // 计算该周的毛利率
            const weekSales = weekRecords.reduce((s, r) => s + r.net_sales_amt, 0);
            const weekProfit = weekRecords.reduce((s, r) => s + r.gross_profit_amt, 0);
            weeklyData[week].marginRate = weekSales > 0 ? weekProfit / weekSales : 0;
        });

        // ── 三种口径的售罄率曲线 ──────────────────────────────────
        // 1. Cohort（同期群）：按上市时间分组，只看同一批次的 SKU
        const cohortData: Record<number, { st: number; skuCount: number }> = {};
        const skuLaunchWeek: Record<string, number> = {};

        // 计算每个 SKU 的上市周（基于 launch_date）
        // 季度对应的基准日期（用于计算周龄）
        const SEASON_BASE: Record<string, string> = {
            Q1: '2024-02-01', Q2: '2024-05-01',
            Q3: '2024-08-01', Q4: '2024-11-01',
        };
        Object.values(skuMap).forEach(sku => {
            const launchDate = sku.launch_date;
            if (launchDate) {
                const launch = new Date(launchDate);
                // 以该 SKU 所属季度的基准日期计算周龄
                const seasonBase = SEASON_BASE[sku.season] || '2024-02-01';
                const seasonStart = new Date(seasonBase);
                const diffDays = Math.floor((launch.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
                skuLaunchWeek[sku.sku_id] = Math.max(1, Math.floor(diffDays / 7) + 1);
            }
        });

        filteredRecords.forEach(r => {
            const launchWeek = skuLaunchWeek[r.sku_id] || 1;
            const weeksSinceLaunch = r.week_num - launchWeek + 1;
            if (weeksSinceLaunch > 0) {
                if (!cohortData[weeksSinceLaunch]) cohortData[weeksSinceLaunch] = { st: 0, skuCount: 0 };
            }
        });

        Object.keys(cohortData).forEach(w => {
            const weekAge = parseInt(w);
            const records = filteredRecords.filter(r => {
                const launchWeek = skuLaunchWeek[r.sku_id] || 1;
                return r.week_num - launchWeek + 1 === weekAge;
            });
            const stVals = records.map(r => r.cumulative_sell_through);
            cohortData[weekAge].st = stVals.length > 0 ? stVals.reduce((a, b) => a + b, 0) / stVals.length : 0;
            cohortData[weekAge].skuCount = new Set(records.map(r => r.sku_id)).size;
        });

        // 2. Active（在售）：每周所有在售 SKU 的平均售罄率
        const activeData: Record<number, { st: number; skuCount: number }> = {};
        Object.keys(weeklyData).forEach(w => {
            const week = parseInt(w);
            const weekRecords = filteredRecords.filter(r => r.week_num === week);
            const stVals = weekRecords.map(r => r.cumulative_sell_through);
            activeData[week] = {
                st: stVals.length > 0 ? stVals.reduce((a, b) => a + b, 0) / stVals.length : 0,
                skuCount: new Set(weekRecords.map(r => r.sku_id)).size,
            };
        });

        // 3. Stage（分阶段）：按生命周期阶段分组
        const stageData: Record<number, { st: number; skuCount: number }> = {};
        Object.keys(weeklyData).forEach(w => {
            const week = parseInt(w);
            const weekRecords = filteredRecords.filter(r => r.week_num === week);
            // 只看"新品"阶段的 SKU（前 8 周）
            const newSkuRecords = weekRecords.filter(r => {
                const sku = skuMap[r.sku_id];
                return sku && sku.lifecycle === '新品';
            });
            const stVals = newSkuRecords.map(r => r.cumulative_sell_through);
            stageData[week] = {
                st: stVals.length > 0 ? stVals.reduce((a, b) => a + b, 0) / stVals.length : 0,
                skuCount: new Set(newSkuRecords.map(r => r.sku_id)).size,
            };
        });

        // Top SKU
        const skuSales: Record<string, number> = {};
        filteredRecords.forEach(r => {
            skuSales[r.sku_id] = (skuSales[r.sku_id] || 0) + r.net_sales_amt;
        });
        const sortedSkus = Object.entries(skuSales).sort((a, b) => b[1] - a[1]);
        const top10Sales = sortedSkus.slice(0, 10).reduce((s, [, v]) => s + v, 0);
        const top10Concentration = totalNetSales > 0 ? top10Sales / totalNetSales : 0;

        // ── 散点图数据（方案A：只展示需关注的 SKU）──────────────────
        // 按 SKU 聚合：售罄率 × 价格 × 销量
        const skuAggMap: Record<string, {
            price: number; sellThrough: number; units: number;
            name: string; lifecycle: string;
        }> = {};

        filteredRecords.forEach(r => {
            const sku = skuMap[r.sku_id];
            if (!sku) return;
            if (!skuAggMap[r.sku_id]) {
                skuAggMap[r.sku_id] = {
                    price: sku.msrp,
                    sellThrough: 0,
                    units: 0,
                    name: sku.sku_name,
                    lifecycle: sku.lifecycle,
                };
            }
            skuAggMap[r.sku_id].units += r.unit_sold;
        });

        // 取每个 SKU 最新周的累计售罄率
        filteredRecords.forEach(r => {
            const agg = skuAggMap[r.sku_id];
            if (!agg) return;
            if (r.cumulative_sell_through > agg.sellThrough) {
                agg.sellThrough = r.cumulative_sell_through;
            }
        });

        const allSkuPoints = Object.values(skuAggMap);
        const totalSkuCount = allSkuPoints.length;

        // 筛选"需关注"SKU（方案A逻辑）
        const atRiskSkus = allSkuPoints.filter(s =>
            s.sellThrough < 0.70 ||                          // 低动销风险
            s.sellThrough > 0.92 ||                          // 缺货风险
            (s.price >= 600 && s.sellThrough < 0.75)         // 高价滞销
        );

        // 如果需关注款不足 20 个，补充售罄率最低的款（保证图表有足够数据点）
        let scatterSkus = atRiskSkus;
        if (scatterSkus.length < 20) {
            const sorted = [...allSkuPoints].sort((a, b) => a.sellThrough - b.sellThrough);
            scatterSkus = sorted.slice(0, Math.min(60, sorted.length));
        }
        // 最多展示 80 个点（最佳视觉密度）
        scatterSkus = scatterSkus.slice(0, 80);

        // ── 在库存货（取各SKU最新周库存，用于WOS/DOS计算）
        const skuLatestInventory: Record<string, { units: number; msrp: number }> = {};
        filteredRecords.forEach(r => {
            const sku = skuMap[r.sku_id];
            if (!sku) return;
            const existing = skuLatestInventory[r.sku_id];
            if (!existing || r.week_num > (existing as any)._week) {
                (skuLatestInventory[r.sku_id] as any) = { units: r.on_hand_unit, msrp: sku.msrp, _week: r.week_num };
            }
        });
        const totalOnHandUnits = Object.values(skuLatestInventory).reduce((s, v) => s + v.units, 0);
        const totalOnHandAmt = Object.values(skuLatestInventory).reduce((s, v) => s + v.units * v.msrp * 0.6, 0); // 按60%成本估算

        // WOS（周转周数）：期末库存 / 周均销量
        const weekCount = Object.keys(weeklyData).length || 1;
        const avgWeeklySales = totalNetSales / weekCount;
        const avgWeeklyUnits = totalUnits / weekCount;
        const wos = avgWeeklyUnits > 0 ? Math.round((totalOnHandUnits / avgWeeklyUnits) * 10) / 10 : 0;
        const dos = wos * 7; // 周转天数

        // ── 品类实际销售数据（用于计划vs实际）
        const categoryActual: Record<string, { actual_sales: number; actual_units: number; actual_sell_through: number; actual_margin_rate: number; sku_count: number }> = {};
        filteredRecords.forEach(r => {
            const sku = skuMap[r.sku_id];
            if (!sku) return;
            if (!categoryActual[sku.category_id]) categoryActual[sku.category_id] = { actual_sales: 0, actual_units: 0, actual_sell_through: 0, actual_margin_rate: 0, sku_count: 0 };
            categoryActual[sku.category_id].actual_sales += r.net_sales_amt;
            categoryActual[sku.category_id].actual_units += r.unit_sold;
        });
        // 填充品类售罄率和毛利率
        Object.keys(categoryActual).forEach(cat => {
            const catRecords = filteredRecords.filter(r => skuMap[r.sku_id]?.category_id === cat);
            const catSkuIds = [...new Set(catRecords.map(r => r.sku_id))];
            const latestSTs = catSkuIds.map(id => skuLatestST[id] || 0);
            categoryActual[cat].actual_sell_through = latestSTs.length > 0 ? latestSTs.reduce((a, b) => a + b, 0) / latestSTs.length : 0;
            const catSales = catRecords.reduce((s, r) => s + r.net_sales_amt, 0);
            const catProfit = catRecords.reduce((s, r) => s + r.gross_profit_amt, 0);
            categoryActual[cat].actual_margin_rate = catSales > 0 ? catProfit / catSales : 0;
            categoryActual[cat].sku_count = catSkuIds.length;
        });

        // ── 渠道实际销售数据（用于计划vs实际）
        const channelActual: Record<string, { actual_sales: number; actual_sell_through: number; actual_margin_rate: number }> = {};
        filteredRecords.forEach(r => {
            const ch = channelMap[r.channel_id];
            if (!ch) return;
            if (!channelActual[ch.channel_type]) channelActual[ch.channel_type] = { actual_sales: 0, actual_sell_through: 0, actual_margin_rate: 0 };
            channelActual[ch.channel_type].actual_sales += r.net_sales_amt;
        });
        Object.keys(channelActual).forEach(chType => {
            const chRecords = filteredRecords.filter(r => channelMap[r.channel_id]?.channel_type === chType);
            const chSkuIds = [...new Set(chRecords.map(r => r.sku_id))];
            const latestSTs = chSkuIds.map(id => skuLatestST[id] || 0);
            channelActual[chType].actual_sell_through = latestSTs.length > 0 ? latestSTs.reduce((a, b) => a + b, 0) / latestSTs.length : 0;
            const chSales = chRecords.reduce((s, r) => s + r.net_sales_amt, 0);
            const chProfit = chRecords.reduce((s, r) => s + r.gross_profit_amt, 0);
            channelActual[chType].actual_margin_rate = chSales > 0 ? chProfit / chSales : 0;
        });

        return {
            totalNetSales,
            totalGrossSales,
            totalUnits,
            totalGrossProfit,
            avgSellThrough,
            avgMarginRate,
            avgDiscountDepth,
            activeSKUs,
            channelSales,
            priceBandSales,
            heatmapChartData,
            weeklyData,
            // 三种口径的售罄率曲线数据
            cohortData,
            activeData,
            stageData,
            top10Concentration,
            scatterSkus,
            totalSkuCount,
            // 新增：库存健康 KPI
            totalOnHandUnits,
            totalOnHandAmt,
            wos,
            dos,
            // 新增：计划 vs 实际
            categoryActual,
            channelActual,
            planData: dimPlan,
            sortedSkus: sortedSkus.slice(0, 10).map(([id, sales]) => ({
                sku: skuMap[id],
                sales,
                pct: totalNetSales > 0 ? sales / totalNetSales : 0,
            })),
        };
    }, [filteredRecords, skuMap, channelMap]);


    // ── 历史基线记录（用于 YoY / MoM 对比）────────────────────────
    const baselineRecords = useMemo(() => {
        if (compareMode === 'none' || compareMode === 'plan') return [];

        // 确定基线期的年份/季度
        const SEASON_ORDER = ['Q1', 'Q2', 'Q3', 'Q4'];
        const currentYear = filters.season_year !== 'all' ? Number(filters.season_year) : 2024;
        const currentSeasonIdx = filters.season !== 'all' ? SEASON_ORDER.indexOf(filters.season) : -1;

        let baselineYear: number;
        let baselineSeason: string | 'all';

        if (compareMode === 'yoy') {
            // 同比：去年同季度
            baselineYear = currentYear - 1;
            baselineSeason = filters.season;
        } else {
            // 环比：上一季度（MoM = 上一季）
            if (currentSeasonIdx <= 0) {
                baselineYear = currentYear - 1;
                baselineSeason = currentSeasonIdx === 0 ? 'Q4' : 'all';
            } else {
                baselineYear = currentYear;
                baselineSeason = SEASON_ORDER[currentSeasonIdx - 1];
            }
        }

        return factSales.filter(record => {
            const sku = skuMap[record.sku_id];
            const channel = channelMap[record.channel_id];
            if (!sku || !channel) return false;

            if (String(record.season_year) !== String(baselineYear)) return false;
            if (baselineSeason !== 'all' && record.season !== baselineSeason) return false;

            // 复用其余筛选条件（品类/渠道/价格带/生命周期）
            if (filters.category_id !== 'all' && sku.category_id !== filters.category_id) return false;
            if (filters.channel_type !== 'all' && channel.channel_type !== filters.channel_type) return false;
            if (filters.lifecycle !== 'all' && sku.lifecycle !== filters.lifecycle) return false;
            if (filters.price_band !== 'all') {
                const band = PRICE_BANDS.find(b => b.id === filters.price_band);
                if (band && (sku.msrp < band.min || sku.msrp > band.max)) return false;
            }
            return true;
        });
    }, [compareMode, filters, skuMap, channelMap]);

    // ── 基线 KPI 计算（与 kpis 同构，供 delta 计算使用）────────────
    const baselineKpis = useMemo(() => {
        if (baselineRecords.length === 0) return null;

        const totalNetSales = baselineRecords.reduce((s, r) => s + r.net_sales_amt, 0);
        const totalGrossSales = baselineRecords.reduce((s, r) => s + r.gross_sales_amt, 0);
        const totalUnits = baselineRecords.reduce((s, r) => s + r.unit_sold, 0);
        const totalGrossProfit = baselineRecords.reduce((s, r) => s + r.gross_profit_amt, 0);
        const totalDiscountAmt = baselineRecords.reduce((s, r) => s + r.discount_amt, 0);

        const skuLatestST: Record<string, number> = {};
        baselineRecords.forEach(r => {
            if (!skuLatestST[r.sku_id] || r.week_num > (skuLatestST[r.sku_id + '_week'] ?? 0)) {
                skuLatestST[r.sku_id] = r.cumulative_sell_through;
                (skuLatestST as Record<string, number>)[r.sku_id + '_week'] = r.week_num;
            }
        });
        const skuIds = Object.keys(skuLatestST).filter(k => !k.includes('_week'));
        const avgSellThrough = skuIds.length > 0
            ? skuIds.reduce((s, id) => s + skuLatestST[id], 0) / skuIds.length : 0;

        const avgMarginRate = totalNetSales > 0 ? totalGrossProfit / totalNetSales : 0;
        const avgDiscountDepth = totalGrossSales > 0 ? totalDiscountAmt / totalGrossSales : 0;
        const activeSKUs = new Set(baselineRecords.map(r => r.sku_id)).size;

        const skuLatestInventory: Record<string, { units: number; msrp: number }> = {};
        baselineRecords.forEach(r => {
            const sku = skuMap[r.sku_id];
            if (!sku) return;
            const existing = skuLatestInventory[r.sku_id];
            if (!existing || r.week_num > (existing as any)._week) {
                (skuLatestInventory[r.sku_id] as any) = { units: r.on_hand_unit, msrp: sku.msrp, _week: r.week_num };
            }
        });
        const totalOnHandUnits = Object.values(skuLatestInventory).reduce((s, v) => s + v.units, 0);
        const weekCount = new Set(baselineRecords.map(r => r.week_num)).size || 1;
        const avgWeeklyUnits = totalUnits / weekCount;
        const wos = avgWeeklyUnits > 0 ? Math.round((totalOnHandUnits / avgWeeklyUnits) * 10) / 10 : 0;

        return { totalNetSales, totalGrossSales, totalUnits, totalGrossProfit, avgSellThrough, avgMarginRate, avgDiscountDepth, activeSKUs, totalOnHandUnits, wos };
    }, [baselineRecords, skuMap]);

    const filterSummary = useMemo(() => {
        const parts: string[] = [];
        if (filters.season_year !== 'all') parts.push(`${filters.season_year}年`);
        if (filters.season !== 'all') parts.push(`${filters.season}季`);
        if (filters.wave !== 'all') parts.push(filters.wave);
        if (filters.category_id !== 'all') parts.push(filters.category_id);
        if (filters.channel_type !== 'all') parts.push(filters.channel_type);
        if (filters.lifecycle !== 'all') parts.push(filters.lifecycle);
        if (filters.price_band !== 'all') {
            const band = PRICE_BANDS.find(b => b.id === filters.price_band);
            if (band) parts.push(`¥${band.min}-${band.max === 9999 ? '700+' : band.max}`);
        }
        return parts.length > 0 ? parts.join(' · ') : '全部数据';
    }, [filters]);

    return {
        filters,
        setFilters,
        filteredRecords,
        kpis,
        baselineKpis,
        filterSummary,
        skuMap,
        channelMap,
    };
}
