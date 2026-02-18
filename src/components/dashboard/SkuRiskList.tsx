'use client';

import { useState, useMemo } from 'react';

// 显式类型定义，避免大型 JSON 文件导致 TypeScript 推断失败
interface DimSkuRecord {
    sku_id: string;
    sku_name: string;
    category_id: string;
    category_name: string;
    season_year: string;
    season: string;
    price_band: string;
    msrp: number;
    lifecycle: string;
}

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

import dimSkuRaw from '@/../data/dashboard/dim_sku.json';
import factSalesRaw from '@/../data/dashboard/fact_sales.json';

const dimSku = dimSkuRaw as unknown as DimSkuRecord[];
const factSales = factSalesRaw as unknown as FactSalesRecord[];

interface SkuRiskRow {
    sku_id: string;
    sku_name: string;
    category_id: string;
    lifecycle: string;
    msrp: number;
    season: string;
    totalUnits: number;
    totalStockIn: number; // calculated: totalUnits + onHandUnit
    totalSales: number;
    avgSellThrough: number;
    avgDiscountDepth: number;
    avgMarginRate: number;
    onHandUnit: number;
    risks: string[];
}

type SortKey = keyof Pick<SkuRiskRow, 'msrp' | 'totalUnits' | 'totalStockIn' | 'avgSellThrough' | 'avgDiscountDepth' | 'avgMarginRate' | 'onHandUnit' | 'totalSales'>;

const RISK_STYLES: Record<string, string> = {
    '低售罄': 'bg-red-100 text-red-700',
    '高库存': 'bg-orange-100 text-orange-700',
    '低毛利': 'bg-yellow-100 text-yellow-700',
    '折扣异常': 'bg-purple-100 text-purple-700',
    '健康': 'bg-emerald-100 text-emerald-700',
};

export default function SkuRiskList() {
    const [sortKey, setSortKey] = useState<SortKey>('avgSellThrough');
    const [sortAsc, setSortAsc] = useState(true);
    const [filterRisk, setFilterRisk] = useState<string>('全部');

    const skuRows = useMemo<SkuRiskRow[]>(() => {
        return dimSku.map(sku => {
            const records = factSales.filter(r => r.sku_id === sku.sku_id);
            if (records.length === 0) return null;

            const totalUnits = records.reduce((s, r) => s + r.unit_sold, 0);
            const totalSales = records.reduce((s, r) => s + r.net_sales_amt, 0);
            const totalGrossProfit = records.reduce((s, r) => s + r.gross_profit_amt, 0);
            const totalGrossSales = records.reduce((s, r) => s + r.gross_sales_amt, 0);

            // 最新周售罄率
            const latestRecord = records.reduce((a, b) => a.week_num > b.week_num ? a : b);
            const avgSellThrough = latestRecord.cumulative_sell_through;

            const avgDiscountDepth = totalGrossSales > 0
                ? (totalGrossSales - totalSales) / totalGrossSales
                : 0;
            const avgMarginRate = totalSales > 0 ? totalGrossProfit / totalSales : 0;
            const onHandUnit = latestRecord.on_hand_unit;

            // 风险标签（阈值按企业级体量调整）
            const risks: string[] = [];
            if (avgSellThrough < 0.70) risks.push('低售罄');
            if (onHandUnit > 200) risks.push('高库存');   // 企业级：200双以上才算高库存
            if (avgMarginRate < 0.38) risks.push('低毛利');
            if (avgDiscountDepth > 0.20) risks.push('折扣异常');
            if (risks.length === 0) risks.push('健康');

            return {
                sku_id: sku.sku_id,
                sku_name: sku.sku_name,
                category_id: sku.category_id,
                lifecycle: sku.lifecycle,
                msrp: sku.msrp,
                season: sku.season,
                totalUnits,
                totalStockIn: totalUnits + onHandUnit,
                totalSales,
                avgSellThrough,
                avgDiscountDepth,
                avgMarginRate,
                onHandUnit,
                risks,
            };
        }).filter(Boolean) as SkuRiskRow[];
    }, []);

    const filtered = useMemo(() => {
        const rows = filterRisk === '全部' ? skuRows : skuRows.filter(r => r.risks.includes(filterRisk));
        return [...rows].sort((a, b) => {
            const diff = a[sortKey] - b[sortKey];
            return sortAsc ? diff : -diff;
        });
    }, [skuRows, sortKey, sortAsc, filterRisk]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(!sortAsc);
        else { setSortKey(key); setSortAsc(true); }
    };

    const SortIcon = ({ k }: { k: SortKey }) => (
        <span className="ml-1 text-slate-300">
            {sortKey === k ? (sortAsc ? '↑' : '↓') : '↕'}
        </span>
    );

    // CSV 导出
    const exportCsv = () => {
        const headers = ['款号', '商品名', '品类', '生命周期', '吊牌价', '季节', '进货量', '销量', '净销售额', '售罄率', '折扣深度', '毛利率', '剩余库存', '风险标签'];
        const rows = filtered.map(r => [
            r.sku_id, r.sku_name, r.category_id, r.lifecycle, r.msrp, r.season,
            r.totalStockIn, r.totalUnits, r.totalSales,
            `${(r.avgSellThrough * 100).toFixed(1)}%`,
            `${(r.avgDiscountDepth * 100).toFixed(1)}%`,
            `${(r.avgMarginRate * 100).toFixed(1)}%`,
            r.onHandUnit, r.risks.join('|'),
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'sku_risk_list.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const riskCounts = useMemo(() => {
        const counts: Record<string, number> = { '全部': skuRows.length, '低售罄': 0, '高库存': 0, '低毛利': 0, '折扣异常': 0, '健康': 0 };
        skuRows.forEach(r => r.risks.forEach(risk => { counts[risk] = (counts[risk] || 0) + 1; }));
        return counts;
    }, [skuRows]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 className="text-base font-bold text-slate-900">SKU 风险列表</h3>
                    <p className="text-xs text-slate-400 mt-0.5">点击列标题排序 · 可导出 CSV 用于动作清单</p>
                </div>
                <button
                    onClick={exportCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <span>↓</span> 导出 CSV
                </button>
            </div>

            {/* Risk Filter Tabs */}
            <div className="px-6 py-3 flex gap-2 flex-wrap border-b border-slate-100 bg-slate-50">
                {Object.entries(riskCounts).map(([risk, count]) => (
                    <button
                        key={risk}
                        onClick={() => setFilterRisk(risk)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterRisk === risk
                            ? 'bg-slate-800 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
                            }`}
                    >
                        {risk} <span className="opacity-60">({count})</span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">商品</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">品类 / 周期</th>
                            <th
                                className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800"
                                onClick={() => handleSort('msrp')}
                            >
                                吊牌价 <SortIcon k="msrp" />
                            </th>
                            <th
                                className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800"
                                onClick={() => handleSort('totalStockIn')}
                            >
                                进货量 <SortIcon k="totalStockIn" />
                            </th>
                            <th
                                className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800"
                                onClick={() => handleSort('totalUnits')}
                            >
                                销量 <SortIcon k="totalUnits" />
                            </th>
                            <th
                                className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800"
                                onClick={() => handleSort('avgSellThrough')}
                            >
                                售罄率 <SortIcon k="avgSellThrough" />
                            </th>
                            <th
                                className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800"
                                onClick={() => handleSort('avgDiscountDepth')}
                            >
                                折扣深度 <SortIcon k="avgDiscountDepth" />
                            </th>
                            <th
                                className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800"
                                onClick={() => handleSort('avgMarginRate')}
                            >
                                毛利率 <SortIcon k="avgMarginRate" />
                            </th>
                            <th
                                className="text-right px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-800"
                                onClick={() => handleSort('onHandUnit')}
                            >
                                剩余库存 <SortIcon k="onHandUnit" />
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">风险标签</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.map(row => (
                            <tr key={row.sku_id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-900 text-xs">{row.sku_name}</div>
                                    <div className="text-slate-400 text-xs mt-0.5">{row.sku_id} · {row.season}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-xs text-slate-600">{row.category_id}</div>
                                    <div className="text-xs text-slate-400">{row.lifecycle}</div>
                                </td>
                                <td className="px-4 py-3 text-right text-xs font-medium text-slate-700">¥{row.msrp}</td>
                                <td className="px-4 py-3 text-right text-xs text-slate-600">{row.totalStockIn.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-xs text-slate-600">{row.totalUnits.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`text-xs font-bold ${row.avgSellThrough >= 0.80 ? 'text-emerald-600' :
                                        row.avgSellThrough >= 0.65 ? 'text-amber-600' : 'text-red-600'
                                        }`}>
                                        {(row.avgSellThrough * 100).toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`text-xs ${row.avgDiscountDepth > 0.20 ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                        {(row.avgDiscountDepth * 100).toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`text-xs ${row.avgMarginRate >= 0.50 ? 'text-emerald-600' : row.avgMarginRate >= 0.38 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {(row.avgMarginRate * 100).toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`text-xs font-medium ${row.onHandUnit > 200 ? 'text-orange-600' : 'text-slate-600'}`}>
                                        {row.onHandUnit.toLocaleString()} 双
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                        {row.risks.map(risk => (
                                            <span key={risk} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${RISK_STYLES[risk] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {risk}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
                共 {filtered.length} 款 SKU · 风险判断标准：售罄率&lt;70% | 剩余库存&gt;200双 | 毛利率&lt;38% | 折扣深度&gt;20%
            </div>
        </div>
    );
}
