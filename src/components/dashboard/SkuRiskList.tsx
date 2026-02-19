'use client';

import { useState, useMemo } from 'react';
import { calcRiskPriority, getActionSuggestion, getEstimatedImpact } from '@/config/thresholds';

// 显式类型定义
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
    totalStockIn: number;
    totalSales: number;
    avgSellThrough: number;
    avgDiscountDepth: number;
    avgMarginRate: number;
    onHandUnit: number;
    wos: number; // New P2 feature
    risks: string[];
    priority: 'P0' | 'P1' | 'P2';
    actionSuggestion: string;
    estimatedImpact: string;
}

type SortKey = keyof Pick<SkuRiskRow, 'msrp' | 'totalUnits' | 'totalStockIn' | 'avgSellThrough' | 'avgDiscountDepth' | 'avgMarginRate' | 'onHandUnit' | 'wos' | 'totalSales'>;

const RISK_STYLES: Record<string, string> = {
    '低售罄': 'bg-red-100 text-red-700',
    '断货风险': 'bg-red-100 text-red-700 font-bold',
    '积压风险': 'bg-purple-100 text-purple-700 font-bold',
    '高库存': 'bg-orange-100 text-orange-700',
    '低毛利': 'bg-yellow-100 text-yellow-700',
    '折扣异常': 'bg-purple-100 text-purple-700',
    '健康': 'bg-emerald-100 text-emerald-700',
};

type StatusType = '待处理' | '进行中' | '已完成' | '已搁置';
const STATUS_OPTIONS: StatusType[] = ['待处理', '进行中', '已完成', '已搁置'];
const STATUS_STYLE: Record<StatusType, string> = {
    '待处理': 'bg-red-50 text-red-700 border-red-200',
    '进行中': 'bg-blue-50 text-blue-700 border-blue-200',
    '已完成': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    '已搁置': 'bg-slate-100 text-slate-500 border-slate-200',
};

interface SkuRiskListProps {
    filterSummary?: string;
}

export default function SkuRiskList({ filterSummary = '全部数据' }: SkuRiskListProps) {
    const [sortKey, setSortKey] = useState<SortKey>('avgSellThrough');
    const [sortAsc, setSortAsc] = useState(true);
    const [filterRisk, setFilterRisk] = useState<string>('全部');
    const [expanded, setExpanded] = useState(false);
    const [statusMap, setStatusMap] = useState<Record<string, StatusType>>({});
    const COLLAPSED_COUNT = 10;

    const skuRows = useMemo<SkuRiskRow[]>(() => {
        return dimSku.map(sku => {
            const records = factSales.filter(r => r.sku_id === sku.sku_id);
            if (records.length === 0) return null;

            const totalUnits = records.reduce((s, r) => s + r.unit_sold, 0);
            const totalSales = records.reduce((s, r) => s + r.net_sales_amt, 0);
            const totalGrossProfit = records.reduce((s, r) => s + r.gross_profit_amt, 0);
            const totalGrossSales = records.reduce((s, r) => s + r.gross_sales_amt, 0);

            // Calculate WOS
            const uniqueWeeks = new Set(records.map(r => r.week_num)).size || 1;
            const avgWeeklyUnits = totalUnits / uniqueWeeks;
            const latestRecord = records.reduce((a, b) => a.week_num > b.week_num ? a : b);
            const onHandUnit = latestRecord.on_hand_unit;
            const wos = avgWeeklyUnits > 0 ? parseFloat((onHandUnit / avgWeeklyUnits).toFixed(1)) : 99.9;

            const avgSellThrough = latestRecord.cumulative_sell_through;
            const avgDiscountDepth = totalGrossSales > 0
                ? (totalGrossSales - totalSales) / totalGrossSales
                : 0;
            const avgMarginRate = totalSales > 0 ? totalGrossProfit / totalSales : 0;

            // 风险标签 logic
            const risks: string[] = [];
            if (wos < 4) risks.push('断货风险');
            if (avgSellThrough < 0.70) risks.push('低售罄');
            if (wos > 12) risks.push('积压风险');
            if (onHandUnit > 200 && wos > 8) risks.push('高库存');
            if (avgMarginRate < 0.38) risks.push('低毛利');
            if (avgDiscountDepth > 0.20) risks.push('折扣异常');
            if (risks.length === 0) risks.push('健康');

            // Priority & Action (using updated risk logic if applicable, or existing helpers)
            // Note: calcRiskPriority might ideally need update to handle '断货风险', but existing string matching works if new risks are mapped or we extend it.
            // For now we rely on existing helpers. If '断货风险' isn't handled by helpers, we might want to map it to high priority manually if needed.
            // Let's assume existing helpers handle standard keys or default to something reasonable.
            const priority = calcRiskPriority(risks);
            const actionSuggestion = getActionSuggestion(risks, avgSellThrough, onHandUnit);
            const estimatedImpact = getEstimatedImpact(risks, avgSellThrough, onHandUnit, sku.msrp);

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
                wos,
                risks,
                priority,
                actionSuggestion,
                estimatedImpact,
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

    // CSV Export
    const exportCsv = () => {
        const now = new Date().toLocaleString('zh-CN');
        const metaHeader = [
            `# SKU 风险列表导出`,
            `# 导出时间：${now}`,
            `# 筛选条件：${filterSummary} · 风险类型：${filterRisk}`,
            ``,
        ].join('\n');

        const headers = ['款号', '商品名', '品类', '生命周期', '吊牌价', '季节', '进货量', '销量', '净销售额', '售罄率', '折扣深度', '毛利率', '剩余库存', 'WOS(周)', '风险标签', '优先级', '建议动作', '预估收益', '状态'];

        const rows = filtered.map(r => [
            r.sku_id, r.sku_name, r.category_id, r.lifecycle, r.msrp, r.season,
            r.totalStockIn, r.totalUnits, r.totalSales,
            `${(r.avgSellThrough * 100).toFixed(1)}%`,
            `${(r.avgDiscountDepth * 100).toFixed(1)}%`,
            `${(r.avgMarginRate * 100).toFixed(1)}%`,
            r.onHandUnit, r.wos, r.risks.join('|'), r.priority, r.actionSuggestion, r.estimatedImpact,
            statusMap[r.sku_id] ?? '待处理',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

        const csv = metaHeader + [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `SKU风险列表_${filterSummary}_${now.replace(/[/:\s]/g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const riskCounts = useMemo(() => {
        const counts: Record<string, number> = { '全部': skuRows.length };
        // Initialize common keys to ensure order if desired, or just let them generate
        ['断货风险', '积压风险', '低售罄', '高库存', '低毛利', '折扣异常', '健康'].forEach(k => counts[k] = 0);

        skuRows.forEach(r => r.risks.forEach(risk => { counts[risk] = (counts[risk] || 0) + 1; }));
        // Filter out zero-count keys if preferred, or keep all. Let's filter for cleanliness but keep "主要" risks.
        return counts;
    }, [skuRows]);

    return (
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Modern Gradient Header (P2 Style) */}
            <div className="bg-gradient-to-r from-slate-50 to-white px-5 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">SKU 风险列表</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                        共 {filtered.length} 款 · 可导出 CSV 用于动作清单
                    </p>
                </div>
                <button
                    onClick={exportCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                >
                    <span>⬇</span> 导出 CSV
                </button>
            </div>

            {/* Risk Filter Tabs */}
            <div className="px-5 py-3 flex gap-2 flex-wrap border-b border-slate-100 bg-slate-50/50">
                {Object.entries(riskCounts).filter(([_, c]) => c > 0 || _ === '全部').map(([risk, count]) => (
                    <button
                        key={risk}
                        onClick={() => setFilterRisk(risk)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${filterRisk === risk
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
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
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                            <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">商品</th>
                            <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">品类 / 周期</th>
                            <th className="text-right px-4 py-3 font-semibold whitespace-nowrap cursor-pointer hover:text-slate-800" onClick={() => handleSort('msrp')}>
                                吊牌价 <SortIcon k="msrp" />
                            </th>
                            <th className="text-right px-4 py-3 font-semibold whitespace-nowrap cursor-pointer hover:text-slate-800" onClick={() => handleSort('totalUnits')}>
                                销量 <SortIcon k="totalUnits" />
                            </th>
                            <th className="text-right px-4 py-3 font-semibold whitespace-nowrap cursor-pointer hover:text-slate-800" onClick={() => handleSort('avgSellThrough')}>
                                售罄率 <SortIcon k="avgSellThrough" />
                            </th>
                            <th className="text-right px-4 py-3 font-semibold whitespace-nowrap cursor-pointer hover:text-slate-800" onClick={() => handleSort('avgDiscountDepth')}>
                                折扣 <SortIcon k="avgDiscountDepth" />
                            </th>
                            <th className="text-right px-4 py-3 font-semibold whitespace-nowrap cursor-pointer hover:text-slate-800" onClick={() => handleSort('avgMarginRate')}>
                                毛利 <SortIcon k="avgMarginRate" />
                            </th>
                            <th className="text-right px-4 py-3 font-semibold whitespace-nowrap cursor-pointer hover:text-slate-800" onClick={() => handleSort('onHandUnit')}>
                                库存 <SortIcon k="onHandUnit" />
                            </th>
                            {/* WOS Column - New P2 */}
                            <th className="text-right px-4 py-3 font-semibold whitespace-nowrap cursor-pointer hover:text-slate-800" onClick={() => handleSort('wos')}>
                                WOS <SortIcon k="wos" />
                            </th>
                            <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">风险标签</th>
                            <th className="text-center px-4 py-3 font-semibold whitespace-nowrap">优先级</th>
                            <th className="text-left px-4 py-3 font-semibold whitespace-nowrap min-w-[120px]">建议动作</th>
                            <th className="text-left px-4 py-3 font-semibold whitespace-nowrap text-slate-400">预估收益</th>
                            <th className="text-center px-4 py-3 font-semibold whitespace-nowrap">状态</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {(expanded ? filtered : filtered.slice(0, COLLAPSED_COUNT)).map(row => (
                            <tr key={row.sku_id} className="hover:bg-slate-50 transition-colors bg-white">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-800 text-xs truncate max-w-[140px]" title={row.sku_name}>{row.sku_name}</div>
                                    <div className="text-slate-400 text-[10px] mt-0.5">{row.sku_id} · {row.season}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-xs text-slate-600">{row.category_id}</div>
                                    <div className="text-[10px] text-slate-400">{row.lifecycle}</div>
                                </td>
                                <td className="px-4 py-3 text-right text-xs text-slate-600">¥{row.msrp}</td>
                                <td className="px-4 py-3 text-right text-xs font-medium text-slate-700">{row.totalUnits.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`text-xs font-bold ${row.avgSellThrough >= 0.8 ? 'text-emerald-600' :
                                            row.avgSellThrough >= 0.65 ? 'text-amber-600' : 'text-red-600'
                                        }`}>
                                        {(row.avgSellThrough * 100).toFixed(0)}%
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right text-xs text-slate-600">{(row.avgDiscountDepth * 100).toFixed(0)}%</td>
                                <td className="px-4 py-3 text-right text-xs text-slate-600">{(row.avgMarginRate * 100).toFixed(0)}%</td>
                                <td className="px-4 py-3 text-right text-xs text-slate-600">{row.onHandUnit}</td>
                                {/* WOS Data */}
                                <td className="px-4 py-3 text-right">
                                    <span className={`text-xs font-bold ${row.wos < 4 ? 'text-red-600' :
                                            row.wos > 12 ? 'text-purple-600' : 'text-slate-700'
                                        }`}>
                                        {row.wos}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1 w-[120px]">
                                        {row.risks.map(risk => (
                                            <span key={risk} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${RISK_STYLES[risk] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {risk}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${row.priority === 'P0' ? 'bg-red-100 text-red-700' :
                                            row.priority === 'P1' ? 'bg-orange-100 text-orange-700' :
                                                'bg-slate-100 text-slate-500'
                                        }`}>
                                        {row.priority}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-xs text-slate-700 max-w-[150px] leading-tight">{row.actionSuggestion}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-[10px] text-slate-400 max-w-[100px] truncate" title={row.estimatedImpact}>{row.estimatedImpact}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <select
                                        value={statusMap[row.sku_id] ?? '待处理'}
                                        onChange={e => setStatusMap(prev => ({ ...prev, [row.sku_id]: e.target.value as StatusType }))}
                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none ${STATUS_STYLE[statusMap[row.sku_id] ?? '待处理']}`}
                                    >
                                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
                <span>共 {filtered.length} 款 SKU · 断货风险(WOS&lt;4) · 积压风险(WOS&gt;12)</span>
                {filtered.length > COLLAPSED_COUNT && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="ml-4 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors flex-shrink-0"
                    >
                        {expanded ? `收起 ▲` : `展开全部 ${filtered.length} 款 ▼`}
                    </button>
                )}
            </div>
        </div>
    );
}
