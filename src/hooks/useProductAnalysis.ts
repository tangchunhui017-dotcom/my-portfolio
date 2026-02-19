'use client';

import { useMemo } from 'react';
import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import factSalesRaw from '@/../data/dashboard/fact_sales.json';

interface DimSku {
    sku_id: string;
    sku_name: string;
    category_id: string;
    category_name: string;
    price_band: string;
    msrp: number;
    lifecycle: string;
    launch_date?: string;
    color_family?: string;
    product_line?: string;
    target_age_group?: string;
    gender?: string;
    launch_wave?: string;
}

interface FactSalesRecord {
    sku_id: string;
    unit_sold: number;
    net_sales_amt: number;
    gross_profit_amt: number;
    gross_margin_rate: number;
    cumulative_sell_through: number;
    week_num: number;
}

const dimSku = dimSkuRaw as unknown as DimSku[];
const factSales = factSalesRaw as unknown as FactSalesRecord[];

// ── 辅助：销售汇总 (by sku_id) ────────────────────────────────────────
function buildSkuSalesMap() {
    const map: Record<string, {
        units: number;
        netSales: number;
        grossProfit: number;
        marginSum: number;
        stSum: number;
        count: number;
    }> = {};

    factSales.forEach(r => {
        if (!map[r.sku_id]) {
            map[r.sku_id] = { units: 0, netSales: 0, grossProfit: 0, marginSum: 0, stSum: 0, count: 0 };
        }
        const m = map[r.sku_id];
        m.units += r.unit_sold;
        m.netSales += r.net_sales_amt;
        m.grossProfit += r.gross_profit_amt;
        m.marginSum += r.gross_margin_rate;
        m.stSum += r.cumulative_sell_through;
        m.count += 1;
    });

    return map;
}

// ── 色系分析 ──────────────────────────────────────────────────────────
export interface ColorStat {
    color_family: string;
    units: number;
    netSales: number;
    sellThrough: number;  // 平均售罄率
    marginRate: number;   // 平均毛利率
    skcCount: number;     // 款数
}

// ── 年龄段分析 ────────────────────────────────────────────────────────
export interface AgeStat {
    age_group: string;
    product_line: string;
    units: number;
    netSales: number;
    sellThrough: number;
    asp: number;          // 平均销售单价
}

// ── 产品线分析 ────────────────────────────────────────────────────────
export interface ProductLineStat {
    product_line: string;
    units: number;
    netSales: number;
    marginRate: number;
    sellThrough: number;
    skcCount: number;
}

export function useProductAnalysis() {
    return useMemo(() => {
        const salesMap = buildSkuSalesMap();

        // ── 1. 色系聚合 ──────────────────────────────────────────────
        const colorMap: Record<string, {
            units: number; netSales: number; gpSum: number;
            stSum: number; stCount: number; marginSum: number; mCount: number; sku: number;
        }> = {};

        dimSku.forEach(sku => {
            const cf = sku.color_family || '未知';
            const s = salesMap[sku.sku_id];
            if (!s) return;
            if (!colorMap[cf]) colorMap[cf] = { units: 0, netSales: 0, gpSum: 0, stSum: 0, stCount: 0, marginSum: 0, mCount: 0, sku: 0 };
            const c = colorMap[cf];
            c.units += s.units;
            c.netSales += s.netSales;
            c.gpSum += s.grossProfit;
            c.stSum += s.stSum;
            c.stCount += s.count;
            c.marginSum += s.marginSum;
            c.mCount += s.count;
            c.sku += 1;
        });

        const colorStats: ColorStat[] = Object.entries(colorMap).map(([cf, v]) => ({
            color_family: cf,
            units: v.units,
            netSales: v.netSales,
            sellThrough: v.stCount > 0 ? v.stSum / v.stCount : 0,
            marginRate: v.mCount > 0 ? v.marginSum / v.mCount : 0,
            skcCount: v.sku,
        })).sort((a, b) => b.netSales - a.netSales);

        // ── 2. 年龄段 × 产品线聚合 ──────────────────────────────────
        const ageLineMap: Record<string, {
            units: number; netSales: number; stSum: number; stCount: number; aspSum: number; aspCount: number;
        }> = {};

        dimSku.forEach(sku => {
            const age = sku.target_age_group || '未知';
            const line = sku.product_line || '未知';
            const key = `${age}__${line}`;
            const s = salesMap[sku.sku_id];
            if (!s) return;
            if (!ageLineMap[key]) ageLineMap[key] = { units: 0, netSales: 0, stSum: 0, stCount: 0, aspSum: 0, aspCount: 0 };
            const m = ageLineMap[key];
            m.units += s.units;
            m.netSales += s.netSales;
            m.stSum += s.stSum;
            m.stCount += s.count;
            m.aspSum += sku.msrp;
            m.aspCount += 1;
        });

        const ageStats: AgeStat[] = Object.entries(ageLineMap).map(([key, v]) => {
            const [age_group, product_line] = key.split('__');
            return {
                age_group,
                product_line,
                units: v.units,
                netSales: v.netSales,
                sellThrough: v.stCount > 0 ? v.stSum / v.stCount : 0,
                asp: v.aspCount > 0 ? v.aspSum / v.aspCount : 0,
            };
        }).sort((a, b) => b.netSales - a.netSales);

        // 年龄段汇总（去掉产品线维度）
        const ageTotals: Record<string, { units: number; netSales: number }> = {};
        ageStats.forEach(a => {
            if (!ageTotals[a.age_group]) ageTotals[a.age_group] = { units: 0, netSales: 0 };
            ageTotals[a.age_group].units += a.units;
            ageTotals[a.age_group].netSales += a.netSales;
        });

        // ── 3. 产品线聚合 ────────────────────────────────────────────
        const lineMap: Record<string, {
            units: number; netSales: number; gpSum: number;
            stSum: number; stCount: number; marginSum: number; mCount: number; sku: number;
        }> = {};

        dimSku.forEach(sku => {
            const line = sku.product_line || '未知';
            const s = salesMap[sku.sku_id];
            if (!s) return;
            if (!lineMap[line]) lineMap[line] = { units: 0, netSales: 0, gpSum: 0, stSum: 0, stCount: 0, marginSum: 0, mCount: 0, sku: 0 };
            const m = lineMap[line];
            m.units += s.units;
            m.netSales += s.netSales;
            m.gpSum += s.grossProfit;
            m.stSum += s.stSum;
            m.stCount += s.count;
            m.marginSum += s.marginSum;
            m.mCount += s.count;
            m.sku += 1;
        });

        const lineStats: ProductLineStat[] = Object.entries(lineMap).map(([pl, v]) => ({
            product_line: pl,
            units: v.units,
            netSales: v.netSales,
            marginRate: v.mCount > 0 ? v.marginSum / v.mCount : 0,
            sellThrough: v.stCount > 0 ? v.stSum / v.stCount : 0,
            skcCount: v.sku,
        })).sort((a, b) => b.netSales - a.netSales);

        // ── 4. 色系 × 品类热力数据 ──────────────────────────────────
        interface CatColorCell { color: string; category: string; netSales: number; sellThrough: number; }
        const catColorMap: Record<string, { netSales: number; stSum: number; stCount: number }> = {};
        dimSku.forEach(sku => {
            const key = `${sku.color_family || '未知'}__${sku.category_id || '未知'}`;
            const s = salesMap[sku.sku_id];
            if (!s) return;
            if (!catColorMap[key]) catColorMap[key] = { netSales: 0, stSum: 0, stCount: 0 };
            catColorMap[key].netSales += s.netSales;
            catColorMap[key].stSum += s.stSum;
            catColorMap[key].stCount += s.count;
        });
        const catColorCells: CatColorCell[] = Object.entries(catColorMap).map(([key, v]) => {
            const [color, category] = key.split('__');
            return {
                color, category,
                netSales: v.netSales,
                sellThrough: v.stCount > 0 ? v.stSum / v.stCount : 0,
            };
        });

        return {
            colorStats,
            ageStats,
            ageTotals,
            lineStats,
            catColorCells,
        };
    }, []);
}
