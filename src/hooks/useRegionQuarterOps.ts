'use client';

import { useMemo } from 'react';
import factSalesRaw from '@/../data/dashboard/fact_sales.json';
import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import dimChannelRaw from '@/../data/dashboard/dim_channel.json';
import dimPlanRaw from '@/../data/dashboard/dim_plan.json';
import type { DashboardFilters } from '@/hooks/useDashboardFilter';

interface FactSalesRecord {
    sku_id: string;
    channel_id: string;
    season_year: string | number;
    season: string;
    wave: string;
    week_num: number;
    unit_sold: number;
    net_sales_amt: number;
    cumulative_sell_through: number;
    on_hand_unit: number;
}

interface DimSku {
    sku_id: string;
    category_id: string;
    msrp: number;
    lifecycle: string;
    target_audience?: string;
    target_age_group?: string;
    color?: string;
    color_family?: string;
}

interface DimChannel {
    channel_id: string;
    channel_type: string;
    is_online: boolean;
    region: string;
    city_tier: string;
    store_format: string;
}

interface DimPlan {
    season_year?: number;
    overall_plan?: {
        plan_total_sales?: number;
    };
}

interface RegionDerivedStats {
    actual_amt: number;
    demand: number;
    ship: number;
    fill_rate: number;
    reorder_rate: number;
    store_avg_demand: number;
    store_avg_ship: number;
}

interface BaselineConfig {
    year?: number;
    season?: string | 'all';
}

interface RegionAccumulator {
    actual_amt: number;
    units: number;
    on_hand: number;
    st_weighted: number;
    st_weight: number;
    stores: Set<string>;
}

export type OpsSystemMode = 'all' | 'offline' | 'online';

export interface OpsFilterScope {
    system: OpsSystemMode;
    platform: string | 'all';
}

const DEFAULT_OPS_SCOPE: OpsFilterScope = {
    system: 'all',
    platform: 'all',
};

export interface RegionQuarterOpsRow {
    season: string;
    region: string;
    target_amt: number;
    actual_amt: number;
    achv: number;
    ly_amt: number;
    yoy: number;
    demand: number;
    demand_ly: number;
    demand_yoy: number;
    demand_mom: number;
    ship: number;
    ship_ly: number;
    ship_yoy: number;
    ship_mom: number;
    fill_rate: number;
    fill_rate_ly: number;
    fill_gap: number;
    fill_rate_mom: number;
    reorder_rate: number;
    reorder_rate_ly: number;
    reorder_gap: number;
    reorder_rate_mom: number;
    store_avg_demand: number;
    store_avg_demand_ly: number;
    store_avg_demand_yoy: number;
    store_avg_demand_mom: number;
    store_avg_ship: number;
    store_avg_ship_ly: number;
    store_avg_ship_yoy: number;
    store_avg_ship_mom: number;
    risk_tags: string[];
    strategy: string;
}

export interface RegionQuarterOpsTotals {
    demand: number;
    demand_ly: number;
    demand_yoy: number;
    demand_mom: number;
    ship: number;
    ship_ly: number;
    ship_yoy: number;
    ship_mom: number;
    fill_rate: number;
    fill_rate_ly: number;
    fill_gap: number;
    fill_rate_mom: number;
    reorder_rate: number;
    reorder_rate_ly: number;
    reorder_gap: number;
    reorder_rate_mom: number;
    store_avg_demand: number;
    store_avg_demand_ly: number;
    store_avg_demand_yoy: number;
    store_avg_demand_mom: number;
    store_avg_ship: number;
    store_avg_ship_ly: number;
    store_avg_ship_yoy: number;
    store_avg_ship_mom: number;
}

export interface RegionQuarterOpsInsight {
    id: string;
    tone: 'good' | 'warn' | 'risk';
    text: string;
}

export interface RegionQuarterOpsAction {
    id: string;
    priority: '高' | '中';
    text: string;
}

const salesRecords = factSalesRaw as FactSalesRecord[];
const skuRecords = dimSkuRaw as DimSku[];
const channelRecords = dimChannelRaw as DimChannel[];
const dimPlan = dimPlanRaw as DimPlan;
const ONLINE_REGION_SET = new Set(
    channelRecords.filter((channel) => channel.is_online).map((channel) => channel.region),
);

const PRICE_BANDS = [
    { id: 'PB1', min: 199, max: 299 },
    { id: 'PB2', min: 300, max: 399 },
    { id: 'PB3', min: 400, max: 499 },
    { id: 'PB4', min: 500, max: 599 },
    { id: 'PB5', min: 600, max: 699 },
    { id: 'PB6', min: 700, max: 9999 },
];

const AUDIENCE_TO_AGE_GROUP: Record<string, string[]> = {
    '18-23岁 GenZ': ['18-25'],
    '24-28岁 职场新人': ['26-35'],
    '29-35岁 资深中产': ['26-35'],
    '35岁以上': ['36-45', '46+'],
};

const SEASON_ORDER = ['Q1', 'Q2', 'Q3', 'Q4'];

function safeDiv(numerator: number, denominator: number) {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
    return numerator / denominator;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function toPp(value: number) {
    return value * 100;
}

function matchesTargetAudience(sku: DimSku, selectedAudience: string | 'all') {
    if (selectedAudience === 'all') return true;
    if (sku.target_audience === selectedAudience) return true;
    if (sku.target_age_group === selectedAudience) return true;

    if (sku.target_age_group) {
        const mappedAgeGroups = AUDIENCE_TO_AGE_GROUP[selectedAudience];
        if (mappedAgeGroups?.includes(sku.target_age_group)) return true;
    }
    return false;
}

function matchesColor(sku: DimSku, selectedColor: string | 'all') {
    if (selectedColor === 'all') return true;
    return sku.color === selectedColor || sku.color_family === selectedColor;
}

function matchesPriceBand(msrp: number, selectedPriceBand: string | 'all') {
    if (selectedPriceBand === 'all') return true;
    const band = PRICE_BANDS.find((item) => item.id === selectedPriceBand);
    if (!band) return true;
    return msrp >= band.min && msrp <= band.max;
}

function getLatestYear(records: FactSalesRecord[]) {
    let latest = 0;
    records.forEach((record) => {
        const yearNum = Number(record.season_year);
        if (Number.isFinite(yearNum) && yearNum > latest) latest = yearNum;
    });
    return latest || 2024;
}

function shouldIncludeRecord(
    sale: FactSalesRecord,
    sku: DimSku,
    channel: DimChannel,
    filters: DashboardFilters,
    baseline?: BaselineConfig,
    scope: OpsFilterScope = DEFAULT_OPS_SCOPE,
) {
    if (baseline?.year !== undefined) {
        if (Number(sale.season_year) !== baseline.year) return false;
    } else if (filters.season_year !== 'all' && String(sale.season_year) !== String(filters.season_year)) {
        return false;
    }

    if (baseline?.season !== undefined) {
        if (baseline.season !== 'all' && sale.season !== baseline.season) return false;
    } else if (filters.season !== 'all' && sale.season !== filters.season) {
        return false;
    }

    if (scope.system === 'online' && !channel.is_online) return false;
    if (scope.system === 'offline' && channel.is_online) return false;
    if (scope.system === 'online' && scope.platform !== 'all' && channel.region !== scope.platform) return false;

    if (filters.wave !== 'all' && sale.wave !== filters.wave) return false;
    if (filters.category_id !== 'all' && sku.category_id !== filters.category_id) return false;
    if (filters.channel_type !== 'all' && channel.channel_type !== filters.channel_type) return false;
    if (filters.lifecycle !== 'all' && sku.lifecycle !== filters.lifecycle) return false;
    if (filters.region !== 'all') {
        const isOnlineRegionFilter = ONLINE_REGION_SET.has(filters.region);
        const shouldIgnoreRegionFilter =
            scope.system === 'online' ||
            (scope.system === 'offline' && isOnlineRegionFilter);
        if (!shouldIgnoreRegionFilter && channel.region !== filters.region) return false;
    }
    if (filters.city_tier !== 'all' && channel.city_tier !== filters.city_tier) return false;
    if (filters.store_format !== 'all' && channel.store_format !== filters.store_format) return false;
    if (!matchesTargetAudience(sku, filters.target_audience)) return false;
    if (!matchesColor(sku, filters.color)) return false;
    if (!matchesPriceBand(sku.msrp, filters.price_band)) return false;

    return true;
}

function buildRegionStats(
    records: FactSalesRecord[],
    filters: DashboardFilters,
    skuMap: Record<string, DimSku>,
    channelMap: Record<string, DimChannel>,
    baseline?: BaselineConfig,
    scope: OpsFilterScope = DEFAULT_OPS_SCOPE,
) {
    const accMap: Record<string, RegionAccumulator> = {};

    records.forEach((sale) => {
        const sku = skuMap[sale.sku_id];
        const channel = channelMap[sale.channel_id];
        if (!sku || !channel) return;
        if (!shouldIncludeRecord(sale, sku, channel, filters, baseline, scope)) return;

        const region = channel.region || '未分区';
        if (!accMap[region]) {
            accMap[region] = {
                actual_amt: 0,
                units: 0,
                on_hand: 0,
                st_weighted: 0,
                st_weight: 0,
                stores: new Set<string>(),
            };
        }
        const acc = accMap[region];
        const units = Math.max(0, sale.unit_sold || 0);
        const onHand = Math.max(0, sale.on_hand_unit || 0);
        const st = clamp(sale.cumulative_sell_through || 0, 0, 1);
        const weight = Math.max(units, 1);

        acc.actual_amt += sale.net_sales_amt || 0;
        acc.units += units;
        acc.on_hand += onHand;
        acc.st_weighted += st * weight;
        acc.st_weight += weight;
        acc.stores.add(channel.channel_id);
    });

    const result: Record<string, RegionDerivedStats> = {};
    Object.entries(accMap).forEach(([region, acc]) => {
        const storeCount = Math.max(acc.stores.size, 1);
        const avgSt = acc.st_weight > 0 ? acc.st_weighted / acc.st_weight : 0;
        const demand = acc.units + acc.on_hand * 0.25;
        const ship = acc.units + acc.on_hand * 0.22;
        const fillRate = safeDiv(ship, demand);
        const inventoryPressure = safeDiv(acc.on_hand, acc.units + 1);
        const reorderRate = clamp(0.08 + avgSt * 0.18 - Math.min(0.08, inventoryPressure * 0.06), 0.05, 0.3);

        result[region] = {
            actual_amt: acc.actual_amt,
            demand,
            ship,
            fill_rate: fillRate,
            reorder_rate: reorderRate,
            store_avg_demand: safeDiv(demand, storeCount),
            store_avg_ship: safeDiv(ship, storeCount),
        };
    });

    return result;
}

function getMomBaseline(filters: DashboardFilters, latestYear: number) {
    const currentYear = filters.season_year === 'all' ? latestYear : Number(filters.season_year);
    const currentSeasonIdx = filters.season !== 'all' ? SEASON_ORDER.indexOf(filters.season) : -1;

    if (currentSeasonIdx === -1) {
        return { year: currentYear - 1, season: 'all' as const };
    }
    if (currentSeasonIdx === 0) {
        return { year: currentYear - 1, season: 'Q4' as const };
    }
    return { year: currentYear, season: SEASON_ORDER[currentSeasonIdx - 1] };
}

function computeRiskTags(row: RegionQuarterOpsRow) {
    const tags: string[] = [];
    if (row.fill_gap < -0.05 && row.reorder_gap > 0.05) {
        tags.push('供给不足（优先补货调拨）');
    }
    if (row.demand_yoy > 0.3 && row.fill_rate < 0.9) {
        tags.push('需求爆发（提前加深备货）');
    }
    if (row.demand_yoy < 0 && row.store_avg_demand_yoy < 0) {
        tags.push('需求疲软（控库存防折扣）');
    }
    if (row.store_avg_ship_yoy > 0.15 && row.fill_rate >= 0.9) {
        tags.push('店效突破（复制成功陈列）');
    }
    if (!tags.length) {
        tags.push('供需平衡（持续跟踪）');
    }
    return tags;
}

function computeStrategy(tags: string[]) {
    if (tags.includes('供给不足（优先补货调拨）')) {
        return '优先从高满足区域调拨核心款，72小时内补齐配货缺口。';
    }
    if (tags.includes('需求爆发（提前加深备货）')) {
        return '提前锁定追加订货额度，主推款加深配货，防断码。';
    }
    if (tags.includes('需求疲软（控库存防折扣）')) {
        return '减少次主推配货，转向组合促销去化，压降库存风险。';
    }
    if (tags.includes('店效突破（复制成功陈列）')) {
        return '复制高店效陈列打法，扩展到同线级门店。';
    }
    return '维持当前节奏，周度复盘执行率与补单率。';
}

export function useRegionQuarterOps(
    filters: DashboardFilters,
    scope: OpsFilterScope = DEFAULT_OPS_SCOPE,
) {
    const latestYear = useMemo(() => getLatestYear(salesRecords), []);
    const skuMap = useMemo(() => Object.fromEntries(skuRecords.map((sku) => [sku.sku_id, sku])), []);
    const channelMap = useMemo(
        () => Object.fromEntries(channelRecords.map((channel) => [channel.channel_id, channel])),
        [],
    );

    return useMemo(() => {
        const currentYear = filters.season_year === 'all' ? latestYear : Number(filters.season_year);
        const yoyYear = currentYear - 1;
        const momBaseline = getMomBaseline(filters, latestYear);
        const seasonLabel =
            filters.season === 'all'
                ? `${currentYear}-All`
                : `${currentYear}-${filters.season}`;

        const currentStats = buildRegionStats(salesRecords, filters, skuMap, channelMap, undefined, scope);
        const yoyStats = buildRegionStats(salesRecords, filters, skuMap, channelMap, {
            year: yoyYear,
            season: filters.season,
        }, scope);
        const momStats = buildRegionStats(salesRecords, filters, skuMap, channelMap, momBaseline, scope);

        const currentRegionOrder = Object.entries(currentStats)
            .sort((a, b) => b[1].actual_amt - a[1].actual_amt)
            .map(([region]) => region);
        const fallbackRegions = Array.from(
            new Set([...Object.keys(currentStats), ...Object.keys(yoyStats), ...Object.keys(momStats)]),
        )
            .filter((region) => !currentRegionOrder.includes(region))
            .sort((a, b) => a.localeCompare(b, 'zh-CN'));
        const allRegions = [...currentRegionOrder, ...fallbackRegions];

        const totalActual = allRegions.reduce(
            (sum, region) => sum + (currentStats[region]?.actual_amt || 0),
            0,
        );
        const fallbackPlan = totalActual * 1.06;
        const rawPlan = dimPlan.season_year === currentYear ? dimPlan.overall_plan?.plan_total_sales : undefined;
        const planTotal = Number(rawPlan || fallbackPlan || 0);

        const rows: RegionQuarterOpsRow[] = allRegions.map((region) => {
            const current = currentStats[region] || {
                actual_amt: 0,
                demand: 0,
                ship: 0,
                fill_rate: 0,
                reorder_rate: 0,
                store_avg_demand: 0,
                store_avg_ship: 0,
            };
            const yoy = yoyStats[region];
            const mom = momStats[region];

            const actualAmt = current.actual_amt;
            const lyAmt = yoy?.actual_amt || 0;
            const share = totalActual > 0 ? actualAmt / totalActual : allRegions.length > 0 ? 1 / allRegions.length : 0;
            const targetAmt = planTotal > 0 ? planTotal * share : 0;

            const demandLy = yoy?.demand || 0;
            const shipLy = yoy?.ship || 0;
            const fillLy = yoy?.fill_rate || 0;
            const reorderLy = yoy?.reorder_rate || 0;
            const storeDemandLy = yoy?.store_avg_demand || 0;
            const storeShipLy = yoy?.store_avg_ship || 0;

            const rowWithoutTags: RegionQuarterOpsRow = {
                season: seasonLabel,
                region,
                target_amt: targetAmt,
                actual_amt: actualAmt,
                achv: safeDiv(actualAmt, targetAmt),
                ly_amt: lyAmt,
                yoy: safeDiv(actualAmt - lyAmt, lyAmt),
                demand: current.demand,
                demand_ly: demandLy,
                demand_yoy: safeDiv(current.demand - demandLy, demandLy),
                demand_mom: mom?.demand || 0,
                ship: current.ship,
                ship_ly: shipLy,
                ship_yoy: safeDiv(current.ship - shipLy, shipLy),
                ship_mom: mom?.ship || 0,
                fill_rate: current.fill_rate,
                fill_rate_ly: fillLy,
                fill_gap: current.fill_rate - fillLy,
                fill_rate_mom: mom?.fill_rate || 0,
                reorder_rate: current.reorder_rate,
                reorder_rate_ly: reorderLy,
                reorder_gap: current.reorder_rate - reorderLy,
                reorder_rate_mom: mom?.reorder_rate || 0,
                store_avg_demand: current.store_avg_demand,
                store_avg_demand_ly: storeDemandLy,
                store_avg_demand_yoy: safeDiv(current.store_avg_demand - storeDemandLy, storeDemandLy),
                store_avg_demand_mom: mom?.store_avg_demand || 0,
                store_avg_ship: current.store_avg_ship,
                store_avg_ship_ly: storeShipLy,
                store_avg_ship_yoy: safeDiv(current.store_avg_ship - storeShipLy, storeShipLy),
                store_avg_ship_mom: mom?.store_avg_ship || 0,
                risk_tags: [],
                strategy: '',
            };

            const riskTags = computeRiskTags(rowWithoutTags);
            return {
                ...rowWithoutTags,
                risk_tags: riskTags,
                strategy: computeStrategy(riskTags),
            };
        });

        const demand = rows.reduce((sum, row) => sum + row.demand, 0);
        const demandLy = rows.reduce((sum, row) => sum + row.demand_ly, 0);
        const demandMom = rows.reduce((sum, row) => sum + row.demand_mom, 0);
        const ship = rows.reduce((sum, row) => sum + row.ship, 0);
        const shipLy = rows.reduce((sum, row) => sum + row.ship_ly, 0);
        const shipMom = rows.reduce((sum, row) => sum + row.ship_mom, 0);
        const reorderNumerator = rows.reduce((sum, row) => sum + row.reorder_rate * row.demand, 0);
        const reorderLyNumerator = rows.reduce((sum, row) => sum + row.reorder_rate_ly * row.demand_ly, 0);
        const reorderMomNumerator = rows.reduce((sum, row) => sum + row.reorder_rate_mom * row.demand_mom, 0);

        const average = (values: number[]) => {
            if (!values.length) return 0;
            return values.reduce((sum, value) => sum + value, 0) / values.length;
        };

        const totals: RegionQuarterOpsTotals = {
            demand,
            demand_ly: demandLy,
            demand_yoy: safeDiv(demand - demandLy, demandLy),
            demand_mom: demandMom,
            ship,
            ship_ly: shipLy,
            ship_yoy: safeDiv(ship - shipLy, shipLy),
            ship_mom: shipMom,
            fill_rate: safeDiv(ship, demand),
            fill_rate_ly: safeDiv(shipLy, demandLy),
            fill_gap: safeDiv(ship, demand) - safeDiv(shipLy, demandLy),
            fill_rate_mom: safeDiv(shipMom, demandMom),
            reorder_rate: safeDiv(reorderNumerator, demand),
            reorder_rate_ly: safeDiv(reorderLyNumerator, demandLy),
            reorder_gap: safeDiv(reorderNumerator, demand) - safeDiv(reorderLyNumerator, demandLy),
            reorder_rate_mom: safeDiv(reorderMomNumerator, demandMom),
            store_avg_demand: average(rows.map((row) => row.store_avg_demand)),
            store_avg_demand_ly: average(rows.map((row) => row.store_avg_demand_ly).filter((value) => value > 0)),
            store_avg_demand_yoy: safeDiv(
                average(rows.map((row) => row.store_avg_demand)) -
                    average(rows.map((row) => row.store_avg_demand_ly).filter((value) => value > 0)),
                average(rows.map((row) => row.store_avg_demand_ly).filter((value) => value > 0)),
            ),
            store_avg_demand_mom: average(rows.map((row) => row.store_avg_demand_mom).filter((value) => value > 0)),
            store_avg_ship: average(rows.map((row) => row.store_avg_ship)),
            store_avg_ship_ly: average(rows.map((row) => row.store_avg_ship_ly).filter((value) => value > 0)),
            store_avg_ship_yoy: safeDiv(
                average(rows.map((row) => row.store_avg_ship)) -
                    average(rows.map((row) => row.store_avg_ship_ly).filter((value) => value > 0)),
                average(rows.map((row) => row.store_avg_ship_ly).filter((value) => value > 0)),
            ),
            store_avg_ship_mom: average(rows.map((row) => row.store_avg_ship_mom).filter((value) => value > 0)),
        };

        const topDemandGrow = [...rows].sort((a, b) => b.demand_yoy - a.demand_yoy)[0];
        const worstFillGap = [...rows].sort((a, b) => a.fill_gap - b.fill_gap)[0];
        const bestStoreShip = [...rows].sort((a, b) => b.store_avg_ship_yoy - a.store_avg_ship_yoy)[0];

        const insights: RegionQuarterOpsInsight[] = rows.length
            ? [
                  {
                      id: 'insight-demand',
                      tone: 'warn',
                      text: `${topDemandGrow.region} 订货需求同比 +${toPp(topDemandGrow.demand_yoy).toFixed(1)}%，是本季需求拉升主引擎。`,
                  },
                  {
                      id: 'insight-fill',
                      tone: worstFillGap.fill_gap < 0 ? 'risk' : 'good',
                      text: `${worstFillGap.region} 执行率差异 ${toPp(worstFillGap.fill_gap).toFixed(1)}pp，当前供给满足是关键瓶颈。`,
                  },
                  {
                      id: 'insight-store',
                      tone: 'good',
                      text: `${bestStoreShip.region} 店均发货同比 +${toPp(bestStoreShip.store_avg_ship_yoy).toFixed(1)}%，可作为店效复制样板。`,
                  },
              ]
            : [
                  { id: 'insight-1', tone: 'warn', text: '暂无区域运营链路数据。' },
                  { id: 'insight-2', tone: 'risk', text: '请检查筛选条件或补充基础事实数据。' },
                  { id: 'insight-3', tone: 'good', text: '恢复数据后将自动生成区域诊断。' },
              ];

        const actionPool: RegionQuarterOpsAction[] = [];
        if (rows.some((row) => row.fill_gap < -0.05 && row.reorder_gap > 0.05)) {
            actionPool.push({
                id: 'action-supply',
                priority: '高',
                text: '对“低执行+高补单”区域启动调拨，先保核心尺码，48小时回传补货闭环。',
            });
        }
        if (rows.some((row) => row.demand_yoy > 0.3 && row.fill_rate < 0.9)) {
            actionPool.push({
                id: 'action-demand',
                priority: '高',
                text: '对需求爆发区域追加订货深度，主推款按波段提前一周锁单。',
            });
        }
        if (rows.some((row) => row.demand_yoy < 0 && row.store_avg_demand_yoy < 0)) {
            actionPool.push({
                id: 'action-weak',
                priority: '中',
                text: '对需求疲软区域执行“控库存+控折扣”，减少次主推款配发并转促销去化。',
            });
        }
        if (rows.some((row) => row.store_avg_ship_yoy > 0.15 && row.fill_rate >= 0.9)) {
            actionPool.push({
                id: 'action-store',
                priority: '中',
                text: '将店效突破区域的陈列与配货节奏模板复制到同线级门店。',
            });
        }
        actionPool.push({
            id: 'action-review',
            priority: '中',
            text: '建立周度“订货需求→配货出库→执行率→补单率”复盘看板，异常区域连续追踪4周。',
        });

        while (actionPool.length < 3) {
            actionPool.push({
                id: `action-fallback-${actionPool.length + 1}`,
                priority: '中',
                text: '持续追踪区域链路效率，并按周调整补单与调拨节奏。',
            });
        }

        return {
            rows,
            totals,
            insights,
            actions: actionPool.slice(0, 5),
            thresholds: {
                fill_rate: totals.fill_rate,
                reorder_rate: totals.reorder_rate,
            },
        };
    }, [channelMap, filters, latestYear, scope, skuMap]);
}
