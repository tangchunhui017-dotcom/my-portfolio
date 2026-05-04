'use client';

import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { deriveVirtualDashboardSizeFacts } from '@/config/dashboardSizeFacts';

interface DashboardSalesRecord {
    sku_id: string;
    channel_id: string;
    season_year?: string | number;
    season?: string;
    wave?: string;
    week_num: number;
    unit_sold: number;
    net_sales_amt: number;
    cumulative_sell_through: number;
    on_hand_unit: number;
}

interface DashboardSkuMeta {
    sku_id: string;
    sku_name?: string;
    category_name?: string;
    category_l2?: string;
    product_line?: string;
    gender?: string;
    season_year?: string | number;
    season?: string;
    lifecycle?: string;
}

type RiskStatus = 'danger_stockout' | 'danger_overstock' | 'warning' | 'healthy';

interface RiskSkuNode {
    skuId: string;
    sku: string;
    category: string;
    wos: number;
    onHand: number;
    sellThrough: number;
    riskStatus: RiskStatus;
}

interface SizeDepthNode {
    category: string;
    sizes: {
        size39: number;
        size40: number;
        size41: number;
        size42: number;
        size43: number;
        size44: number;
    };
    focusSizes: string[];
    fillRate: number;
    gapRate: number;
}

interface Props {
    records?: DashboardSalesRecord[];
    skuMap?: Record<string, DashboardSkuMeta | undefined>;
}

function safeDiv(numerator: number, denominator: number) {
    return denominator === 0 ? 0 : numerator / denominator;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function fmtPct(value: number | null | undefined, digits = 0) {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    return `${(value * 100).toFixed(digits)}%`;
}

function resolveCategoryLabel(sku?: DashboardSkuMeta) {
    return sku?.category_l2 || sku?.category_name || sku?.product_line || sku?.sku_name || '未分类';
}

function resolveRiskStatus(wos: number, sellThrough: number): RiskStatus {
    if (wos <= 4 && sellThrough >= 0.72) return 'danger_stockout';
    if (wos >= 12 && sellThrough <= 0.45) return 'danger_overstock';
    if (wos < 6 || wos > 10 || sellThrough < 0.52) return 'warning';
    return 'healthy';
}

function buildVirtualSizeNode(category: string, mode: 'gap' | 'balanced'): SizeDepthNode {
    if (mode === 'gap') {
        return {
            category: `${category} (虚拟缺口群)`,
            sizes: {
                size39: 74,
                size40: 79,
                size41: 48,
                size42: 42,
                size43: 68,
                size44: 72,
            },
            focusSizes: ['41', '42'],
            fillRate: 0.63,
            gapRate: 0.29,
        };
    }

    return {
        category: `${category} (虚拟平稳群)`,
        sizes: {
            size39: 78,
            size40: 84,
            size41: 88,
            size42: 86,
            size43: 80,
            size44: 76,
        },
        focusSizes: ['41', '42'],
        fillRate: 0.82,
        gapRate: 0.12,
    };
}

function riskScore(node: RiskSkuNode) {
    if (node.riskStatus === 'danger_stockout') return 300 + Math.max(0, 4 - node.wos) * 22 + node.sellThrough * 100;
    if (node.riskStatus === 'danger_overstock') return 280 + Math.max(0, node.wos - 12) * 10 + (1 - node.sellThrough) * 100 + node.onHand / 60;
    if (node.riskStatus === 'warning') return 120 + Math.abs(node.wos - 8) * 8 + Math.max(0, 0.58 - node.sellThrough) * 60;
    return 10 + node.sellThrough * 10;
}

const RADAR_SIZE_CODES = ['39', '40', '41', '42', '43', '44'] as const;
type RadarSizeCode = (typeof RADAR_SIZE_CODES)[number];

type SizeDepthSummary = {
    sizeData: SizeDepthNode[];
    riskySizeNode: SizeDepthNode;
    stableSizeNode: SizeDepthNode;
};

function buildSizeDepthNodes(records: DashboardSalesRecord[], skuMap: Record<string, DashboardSkuMeta | undefined>): SizeDepthSummary {
    const sizeFacts = deriveVirtualDashboardSizeFacts(records, skuMap);
    const fallbackCategory = records[0] ? resolveCategoryLabel(skuMap[records[0].sku_id]) : '核心品类';

    if (!sizeFacts.length) {
        const riskyFallback = buildVirtualSizeNode(fallbackCategory, 'gap');
        const stableFallback = buildVirtualSizeNode(fallbackCategory, 'balanced');
        return {
            sizeData: [riskyFallback, stableFallback],
            riskySizeNode: riskyFallback,
            stableSizeNode: stableFallback,
        };
    }

    const categoryBuckets = new Map<string, {
        category: string;
        weight: number;
        fillWeighted: number;
        gapWeighted: number;
        sizeStats: Map<RadarSizeCode, { weight: number; fillWeighted: number; gapWeighted: number }>;
    }>();

    sizeFacts.forEach((fact) => {
        const bucket = categoryBuckets.get(fact.category_label) || {
            category: fact.category_label,
            weight: 0,
            fillWeighted: 0,
            gapWeighted: 0,
            sizeStats: new Map<RadarSizeCode, { weight: number; fillWeighted: number; gapWeighted: number }>(),
        };
        const weight = Math.max(fact.estimated_demand_units, fact.sales_units, fact.on_hand_units, 1);
        bucket.weight += weight;
        bucket.fillWeighted += fact.fill_rate * weight;
        bucket.gapWeighted += fact.gap_rate * weight;

        if ((RADAR_SIZE_CODES as readonly string[]).includes(fact.size_code)) {
            const sizeCode = fact.size_code as RadarSizeCode;
            const sizeBucket = bucket.sizeStats.get(sizeCode) || { weight: 0, fillWeighted: 0, gapWeighted: 0 };
            sizeBucket.weight += weight;
            sizeBucket.fillWeighted += fact.fill_rate * weight;
            sizeBucket.gapWeighted += fact.gap_rate * weight;
            bucket.sizeStats.set(sizeCode, sizeBucket);
        }

        categoryBuckets.set(fact.category_label, bucket);
    });

    const categoryRows = Array.from(categoryBuckets.values())
        .map((bucket) => {
            const avgFill = safeDiv(bucket.fillWeighted, bucket.weight);
            const avgGap = safeDiv(bucket.gapWeighted, bucket.weight);
            const slotMetrics = RADAR_SIZE_CODES.map((sizeCode) => {
                const stat = bucket.sizeStats.get(sizeCode);
                const fill = stat ? safeDiv(stat.fillWeighted, stat.weight) : avgFill;
                const gap = stat ? safeDiv(stat.gapWeighted, stat.weight) : clamp(avgGap + ((sizeCode === '41' || sizeCode === '42') ? 0.03 : 0), 0.02, 0.65);
                return { sizeCode, fill, gap };
            });
            const focusSizes = [...slotMetrics]
                .sort((a, b) => b.gap - a.gap || a.fill - b.fill)
                .slice(0, 2)
                .map((item) => item.sizeCode);

            return {
                category: bucket.category,
                fillRate: avgFill,
                gapRate: avgGap,
                focusSizes,
                sizes: {
                    size39: clamp(Math.round(slotMetrics[0].fill * 100), 8, 98),
                    size40: clamp(Math.round(slotMetrics[1].fill * 100), 8, 98),
                    size41: clamp(Math.round(slotMetrics[2].fill * 100), 8, 98),
                    size42: clamp(Math.round(slotMetrics[3].fill * 100), 8, 98),
                    size43: clamp(Math.round(slotMetrics[4].fill * 100), 8, 98),
                    size44: clamp(Math.round(slotMetrics[5].fill * 100), 8, 98),
                },
            };
        })
        .sort((a, b) => b.gapRate - a.gapRate || a.fillRate - b.fillRate);

    const riskyBase = categoryRows[0] || null;
    const stableBase = [...categoryRows]
        .sort((a, b) => b.fillRate - a.fillRate)
        .find((item) => item.category !== riskyBase?.category) || null;

    const riskySizeNode = riskyBase
        ? {
            category: `${riskyBase.category} (缺口组)`,
            sizes: riskyBase.sizes,
            focusSizes: riskyBase.focusSizes,
            fillRate: riskyBase.fillRate,
            gapRate: riskyBase.gapRate,
        }
        : buildVirtualSizeNode(fallbackCategory, 'gap');

    const stableSizeNode = stableBase
        ? {
            category: `${stableBase.category} (平稳组)`,
            sizes: stableBase.sizes,
            focusSizes: stableBase.focusSizes,
            fillRate: stableBase.fillRate,
            gapRate: stableBase.gapRate,
        }
        : buildVirtualSizeNode(riskyBase?.category || fallbackCategory, 'balanced');
return {
        sizeData: [riskySizeNode, stableSizeNode],
        riskySizeNode,
        stableSizeNode,
    };
}

function deriveInventoryData(records: DashboardSalesRecord[], skuMap: Record<string, DashboardSkuMeta | undefined>) {
    const skuBuckets = new Map<string, { skuId: string; sku: string; category: string; units: number; weeks: Set<number>; stWeighted: number; stWeight: number; onHand: number }>();
    const latestSkuChannel = new Map<string, { skuId: string; week: number; onHand: number }>();

    records.forEach((record) => {
        const sku = skuMap[record.sku_id];
        const category = resolveCategoryLabel(sku);
        const units = Math.max(0, Number(record.unit_sold || 0));
        const weight = Math.max(units, Number(record.net_sales_amt || 0), 1);
        const week = Number(record.week_num || 0);

        const skuBucket = skuBuckets.get(record.sku_id) || {
            skuId: record.sku_id,
            sku: sku?.sku_name || record.sku_id,
            category,
            units: 0,
            weeks: new Set<number>(),
            stWeighted: 0,
            stWeight: 0,
            onHand: 0,
        };
        skuBucket.units += units;
        if (week > 0) skuBucket.weeks.add(week);
        skuBucket.stWeighted += Number(record.cumulative_sell_through || 0) * weight;
        skuBucket.stWeight += weight;
        skuBuckets.set(record.sku_id, skuBucket);

        const snapshotKey = `${record.sku_id}__${record.channel_id}`;
        const snapshot = latestSkuChannel.get(snapshotKey);
        if (!snapshot || week > snapshot.week) {
            latestSkuChannel.set(snapshotKey, {
                skuId: record.sku_id,
                week,
                onHand: Math.max(0, Number(record.on_hand_unit || 0)),
            });
        }
    });

    latestSkuChannel.forEach((snapshot) => {
        const skuBucket = skuBuckets.get(snapshot.skuId);
        if (skuBucket) skuBucket.onHand += snapshot.onHand;
    });

    const riskData = Array.from(skuBuckets.values())
        .map((bucket) => {
            const avgWeekly = safeDiv(bucket.units, Math.max(bucket.weeks.size, 1));
            const wos = avgWeekly > 0 ? bucket.onHand / avgWeekly : 0;
            const sellThrough = safeDiv(bucket.stWeighted, bucket.stWeight);
            return {
                skuId: bucket.skuId,
                sku: bucket.sku,
                category: bucket.category,
                wos: Number(wos.toFixed(1)),
                onHand: Math.round(bucket.onHand),
                sellThrough,
                riskStatus: resolveRiskStatus(wos, sellThrough),
            } satisfies RiskSkuNode;
        })
        .filter((node) => node.onHand > 0 || node.wos > 0)
        .sort((a, b) => riskScore(b) - riskScore(a));

    const { sizeData, riskySizeNode, stableSizeNode } = buildSizeDepthNodes(records, skuMap);

    return {
        riskData: riskData.slice(0, 8),
        sizeData,
        stockoutAlert: riskData.find((node) => node.riskStatus === 'danger_stockout') || null,
        overstockAlert: riskData.find((node) => node.riskStatus === 'danger_overstock') || null,
        riskySizeNode,
        stableSizeNode,
    };
}
export default function InventoryRadarPanel({ records = [], skuMap = {} }: Props) {
    const [activeTab, setActiveTab] = useState<'pulse' | 'radar'>('pulse');
    const { riskData, sizeData, stockoutAlert, overstockAlert, riskySizeNode, stableSizeNode } = useMemo(
        () => deriveInventoryData(records, skuMap),
        [records, skuMap],
    );

    const hasRiskData = riskData.length > 0;
    const hasSizeData = sizeData.length > 0;
    const maxWos = Math.max(20, ...riskData.map((item) => Math.ceil(item.wos + 2)));
    const maxOnHand = Math.max(4000, ...riskData.map((item) => Math.ceil(item.onHand / 500) * 500));

    const pulseOption = useMemo<EChartsOption>(() => {
        const scatterBase = riskData.filter((item) => item.riskStatus === 'healthy' || item.riskStatus === 'warning').map((item) => ({
            name: item.sku,
            value: [item.wos, item.onHand, item.sellThrough],
            itemStyle: { color: item.riskStatus === 'healthy' ? 'rgba(16, 185, 129, 0.6)' : 'rgba(245, 158, 11, 0.6)' },
        }));
        const scatterEffect = riskData.filter((item) => item.riskStatus === 'danger_stockout' || item.riskStatus === 'danger_overstock').map((item) => {
            const isStockout = item.riskStatus === 'danger_stockout';
            return {
                name: item.sku,
                value: [item.wos, item.onHand, item.sellThrough],
                itemStyle: { color: isStockout ? 'rgba(244, 63, 94, 0.9)' : 'rgba(139, 92, 246, 0.9)', shadowBlur: 20, shadowColor: isStockout ? '#f43f5e' : '#8b5cf6' },
            };
        });

        return {
            backgroundColor: 'transparent',
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: 'rgba(0, 0, 0, 0.05)',
                textStyle: { color: '#0F172A', fontSize: 13 },
                formatter: (params: any) => {
                    const data = params.data;
                    return `<div style="font-weight:600; font-size:14px; margin-bottom:6px; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:4px;">${data.name}</div>WOS: <span style="color:#475569; font-weight:600;">${data.value[0].toFixed(1)} 周</span><br/>当前库存: <span style="color:#475569; font-weight:600;">${Math.round(data.value[1])} 件</span><br/>累计售罄率: <span style="color:#475569; font-weight:600;">${(data.value[2] * 100).toFixed(0)}%</span>`;
                },
            },
            grid: { top: 60, left: 60, right: 40, bottom: 40, containLabel: false },
            xAxis: { type: 'value', name: '周转周期 WOS', nameTextStyle: { color: '#64748B', align: 'center', padding: [10, 0, 0, 0] }, nameLocation: 'middle', splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.03)', type: 'dashed' } }, axisLine: { lineStyle: { color: '#E2E8F0' } }, axisLabel: { color: '#94A3B8' }, min: 0, max: maxWos },
            yAxis: { type: 'value', name: '在手库存 (件)', nameTextStyle: { color: '#64748B', padding: [0, 0, 15, 0] }, splitLine: { show: true, lineStyle: { color: 'rgba(0,0,0,0.03)', type: 'dashed' } }, axisLine: { lineStyle: { color: '#E2E8F0' } }, axisLabel: { color: '#94A3B8' }, max: maxOnHand },
            markArea: { silent: true, itemStyle: { opacity: 0.05 }, data: [[{ xAxis: 0, itemStyle: { color: '#ef4444' } }, { xAxis: 4 }], [{ xAxis: 12, itemStyle: { color: '#8b5cf6' } }, { xAxis: maxWos }]] },
            markLine: { silent: true, symbol: 'none', lineStyle: { type: 'solid', color: 'rgba(0,0,0,0.1)', width: 1 }, label: { color: '#64748B', position: 'start' }, data: [{ xAxis: 4, label: { formatter: '补货预警线 (4周)' } }, { xAxis: 12, label: { formatter: '积压预警线 (12周)' } }] },
            series: [{ name: '常规状态', type: 'scatter', symbolSize: (data: number[]) => Math.max(10, data[1] / 60), data: scatterBase }, { name: '高风险点', type: 'effectScatter', rippleEffect: { brushType: 'stroke', period: 3, scale: 4 }, symbolSize: (data: number[]) => Math.max(15, data[1] / 60), data: scatterEffect, label: { show: true, formatter: '{b}', position: 'top', color: '#475569', fontSize: 10 } }],
        };
    }, [maxOnHand, maxWos, riskData]);

    const radarOption = useMemo<EChartsOption>(() => ({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(0, 0, 0, 0.05)', textStyle: { color: '#0F172A' } },
        legend: { data: sizeData.map((item) => item.category), textStyle: { color: '#64748B' }, bottom: 0 },
        radar: {
            radius: '65%',
            center: ['50%', '45%'],
            splitNumber: 5,
            axisName: { color: '#64748B', fontSize: 12, fontWeight: 'bold' },
            splitArea: { areaStyle: { color: ['rgba(0,0,0,0.01)', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.03)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0.05)'] } },
            axisLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
            splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
            indicator: [{ name: 'EU39', max: 100 }, { name: 'EU40', max: 100 }, { name: 'EU41', max: 100 }, { name: 'EU42', max: 100 }, { name: 'EU43', max: 100 }, { name: 'EU44', max: 100 }],
        },
        series: [{ name: '尺码深度', type: 'radar', symbol: 'circle', symbolSize: 6, data: sizeData.map((item, index) => ({ value: [item.sizes.size39, item.sizes.size40, item.sizes.size41, item.sizes.size42, item.sizes.size43, item.sizes.size44], name: item.category, itemStyle: { color: index === 0 ? '#f43f5e' : '#10b981' }, lineStyle: { width: 2, type: index === 0 ? 'solid' : 'dashed' }, areaStyle: { color: index === 0 ? 'rgba(244, 63, 94, 0.18)' : 'rgba(16, 185, 129, 0.12)' } })) }],
    }), [sizeData]);

    return (
        <div className="w-full relative mb-6 overflow-hidden rounded-[24px] bg-white ring-1 ring-slate-200 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <div className="relative px-8 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-20">
                <div>
                    <h2 className="text-xl font-semibold tracking-wide text-slate-900 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-gradient-to-b from-rose-400 to-purple-500 rounded-full" />
                        存货战列与尺码履约雷达
                        <span className="text-[10px] font-mono tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200"><span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse mr-1"></span>RADAR ACTIVE</span>
                    </h2>
                    <p className="mt-2 text-xs text-slate-500 max-w-2xl">高危警报区：监测断码的利润失血点与吃资金的长尾库存。尺码雷达当前为同源数据代理估算，后续可替换为真实尺码事实表。</p>
                </div>
                <div className="flex bg-slate-50 p-1 rounded-xl ring-1 ring-slate-200 shadow-inner">
                    <button onClick={() => setActiveTab('pulse')} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'pulse' ? 'bg-white text-rose-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>滞销双向脉冲</button>
                    <button onClick={() => setActiveTab('radar')} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'radar' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>尺码履约缺口</button>
                </div>
            </div>
            <div className="p-8 pb-0 relative">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 relative z-10">
                    <div className="h-[460px] relative w-full bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden shadow-inner">
                        {activeTab === 'pulse' ? (
                            hasRiskData ? <ReactECharts key="inventory-pulse" option={pulseOption} notMerge={true} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} /> : <div className="h-full flex items-center justify-center text-sm text-slate-400">当前筛选下暂无库存脉冲数据</div>
                        ) : (
                            hasSizeData ? <ReactECharts key="inventory-radar" option={radarOption} notMerge={true} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} /> : <div className="h-full flex items-center justify-center text-sm text-slate-400">当前筛选下缺少可用于尺码雷达的结构信号</div>
                        )}
                        {activeTab === 'pulse' && hasRiskData && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-rose-500/10 to-transparent h-[100%] animate-[scan_6s_linear_infinite] pointer-events-none" />}
                    </div>
                    <div className="flex flex-col gap-4">
                        {activeTab === 'pulse' ? (
                            <>
                                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-100 shadow-sm relative overflow-hidden group">
                                    <h4 className="text-sm font-semibold text-rose-600 mb-1 relative flex items-center justify-between">极度断码报警 <span className="text-xs bg-rose-500 text-white px-1.5 py-0.5 rounded mr-1">PRIORITY 1</span></h4>
                                    <p className="text-xl font-light text-slate-900 font-mono mt-2">{stockoutAlert?.sku || '当前无高危断码 SKU'}</p>
                                    <div className="mt-2 text-xs text-slate-600 leading-relaxed font-sans">{stockoutAlert ? `当前在手库存 ${stockoutAlert.onHand} 件，WOS ${stockoutAlert.wos.toFixed(1)} 周，累计售罄 ${fmtPct(stockoutAlert.sellThrough)}。建议优先补单并跨区调拨。` : '当前筛选下暂无满足断码高危阈值的 SKU，可继续关注接近 4 周线的款式。'}</div>
                                    <button className="mt-4 w-full py-2 bg-white hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg transition-colors border border-rose-200">优先处理补单调拨</button>
                                </div>
                                <div className="p-5 rounded-2xl bg-purple-50 border border-purple-100 shadow-sm relative overflow-hidden group mt-2">
                                    <h4 className="text-sm font-semibold text-purple-600 mb-1 relative flex items-center justify-between">深度资金锁死报警 <span className="text-xs bg-purple-500 text-white px-1.5 py-0.5 rounded mr-1">PRIORITY 2</span></h4>
                                    <p className="text-xl font-light text-slate-900 font-mono mt-2">{overstockAlert?.sku || '当前无高危积压 SKU'}</p>
                                    <div className="mt-2 text-xs text-slate-600 leading-relaxed font-sans">{overstockAlert ? `库存 ${overstockAlert.onHand} 件，WOS ${overstockAlert.wos.toFixed(1)} 周，累计售罄 ${fmtPct(overstockAlert.sellThrough)}。建议尽快收缩补货并制定清理节奏。` : '当前筛选下暂无满足积压高危阈值的 SKU，可继续关注 10-12 周区间的尾部款。'}</div>
                                    <button className="mt-4 w-full py-2 bg-white hover:bg-purple-100 text-purple-600 text-xs font-semibold rounded-lg transition-colors border border-purple-200">下发清货与去化动作</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="p-5 rounded-2xl bg-white shadow-sm border border-slate-200 relative">
                                    <div className="absolute left-[-1px] top-1/2 -translate-y-1/2 w-[3px] h-12 bg-rose-500 rounded-full" />
                                    <h4 className="text-sm font-semibold text-rose-500 mb-1">击穿核心履约层</h4>
                                    <div className="text-3xl font-light text-slate-900 font-mono my-2 mt-3">{riskySizeNode?.focusSizes.join('/') || '--'}</div>
                                    <div className="mt-2 text-xs text-slate-500 leading-relaxed font-sans">{riskySizeNode ? `${riskySizeNode.category} 的代理齐码率 ${fmtPct(riskySizeNode.fillRate)}，断码风险 ${fmtPct(riskySizeNode.gapRate)}，建议优先补齐 ${riskySizeNode.focusSizes.join('/')} 核心尺码。` : '当前筛选下暂无足够的尺码结构信号，建议后续补齐尺码事实表。'}</div>
                                </div>
                                <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">行动建议</h4>
                                    <ul className="text-xs text-slate-600 space-y-2 font-sans list-disc list-inside">
                                        <li>{riskySizeNode ? `先保障 ${riskySizeNode.category} 的 ${riskySizeNode.focusSizes.join('/')} 核心尺码深度，避免高动销门店先断码。` : '补齐尺码事实表前，不建议将当前雷达直接用于采购下单。'}</li>
                                        <li>{stableSizeNode ? `以 ${stableSizeNode.category} 作为对标样本，复盘配码结构与调拨逻辑。` : '后续接入真实尺码销量与库存后，再把该模块升级为真实履约雷达。'}</li>
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <style>{`@keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }`}</style>
        </div>
    );
}
