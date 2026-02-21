'use client';

import { useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    Treemap,
    XAxis,
    YAxis,
} from 'recharts';
import { DashboardFilters } from '@/hooks/useDashboardFilter';
import { useProductAnalysis } from '@/hooks/useProductAnalysis';

type HeatMetric = 'net_sales' | 'sell_through' | 'gm_rate';
type TreemapAreaMetric = 'net_sales' | 'pairs_sold';
type TreemapColorMetric = 'sell_through' | 'gm_rate';
type TreemapColorMode = 'performance' | 'palette';

function fmtWan(value: number) {
    if (!Number.isFinite(value)) return '--';
    return `${(value / 10000).toFixed(1)}万`;
}

function fmtMoney(value: number) {
    if (!Number.isFinite(value)) return '--';
    if (value >= 10000) return `¥${(value / 10000).toFixed(1)}万`;
    return `¥${value.toFixed(0)}`;
}

function fmtPct(value: number) {
    if (!Number.isFinite(value)) return '--';
    return `${(value * 100).toFixed(1)}%`;
}

function safeDiv(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return numerator / denominator;
}

function getHeatColor(value: number, min: number, max: number, kind: HeatMetric) {
    if (!Number.isFinite(value) || max <= min) return '#f8fafc';
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
    if (kind === 'net_sales') return `rgba(37, 99, 235, ${0.12 + ratio * 0.6})`;
    if (kind === 'sell_through') return `rgba(16, 185, 129, ${0.12 + ratio * 0.6})`;
    return `rgba(244, 114, 182, ${0.12 + ratio * 0.6})`;
}

function hexToRgb(hex: string) {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) return { r: 148, g: 163, b: 184 };
    return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16),
    };
}

function lerpColor(from: string, to: string, ratio: number, alpha = 0.92) {
    const t = Math.max(0, Math.min(1, ratio));
    const a = hexToRgb(from);
    const b = hexToRgb(to);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

function getTreemapMetricColor(value: number, min: number, max: number, metric: TreemapColorMetric) {
    if (!Number.isFinite(value) || max <= min) return 'rgba(148,163,184,0.35)';
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
    if (metric === 'sell_through') return lerpColor('#ef4444', '#10b981', ratio);
    return lerpColor('#f97316', '#2563eb', ratio);
}

function getColorFamilySwatch(colorFamily: string) {
    if (colorFamily.includes('黑')) return '#111827';
    if (colorFamily.includes('白')) return '#94a3b8';
    if (colorFamily.includes('灰')) return '#64748b';
    if (colorFamily.includes('中性')) return '#a3a3a3';
    if (colorFamily.includes('鲜')) return '#22c55e';
    if (colorFamily.includes('柔')) return '#a78bfa';
    return '#60a5fa';
}

function getColorFromPayload(payload: unknown) {
    if (!payload || typeof payload !== 'object') return '';
    return (payload as { name?: string }).name || '';
}

function getAgeLabel(age: string) {
    if (age === '46+') return '46+';
    return age;
}

const AGE_COLORS: Record<string, string> = {
    '18-25': '#38bdf8',
    '26-35': '#2563eb',
    '36-45': '#7c3aed',
    '46+': '#c026d3',
    未知: '#94a3b8',
};

const METRIC_LABEL: Record<HeatMetric, string> = {
    net_sales: '销售占比',
    sell_through: '售罄率',
    gm_rate: '毛利率',
};

const AGE_STACK_TICKS = [0, 20, 40, 60, 80, 100];

export default function ProductAnalysisPanel({
    filters,
    setFilters,
}: {
    filters: DashboardFilters;
    setFilters: (f: DashboardFilters) => void;
}) {
    const {
        totals,
        ageLineCells,
        agePriceCells,
        colorStats,
        colorCategoryCells,
        ageGroups,
        productLines,
        priceBands,
        categories,
        colorFamilies,
        ageGroupTotals,
        skuDrillRows,
    } = useProductAnalysis(filters);

    const [ageHeatMetric, setAgeHeatMetric] = useState<HeatMetric>('net_sales');
    const [colorHeatMetric, setColorHeatMetric] = useState<HeatMetric>('net_sales');
    const [treemapAreaMetric, setTreemapAreaMetric] = useState<TreemapAreaMetric>('net_sales');
    const [treemapColorMetric, setTreemapColorMetric] = useState<TreemapColorMetric>('sell_through');
    const [treemapColorMode, setTreemapColorMode] = useState<TreemapColorMode>('performance');

    const ageStackData = useMemo(() => {
        return productLines.map((line) => {
            const lineCells = ageLineCells.filter((cell) => cell.product_line === line);
            const lineSales = lineCells.reduce((sum, cell) => sum + cell.net_sales, 0);
            const row: Record<string, number | string> = { product_line: line };
            ageGroups.forEach((age) => {
                const hit = lineCells.find((cell) => cell.age_group === age);
                const ageSales = hit?.net_sales || 0;
                row[age] = safeDiv(ageSales, lineSales) * 100;
            });
            row.total_sales = lineSales;
            return row;
        });
    }, [ageGroups, ageLineCells, productLines]);

    const ageSummary = useMemo(() => {
        return ageGroups.map((age) => {
            const item = ageGroupTotals[age] || { net_sales: 0, pairs_sold: 0 };
            return {
                age_group: age,
                net_sales: item.net_sales,
                pairs_sold: item.pairs_sold,
                sales_share: safeDiv(item.net_sales, totals.net_sales),
                pairs_share: safeDiv(item.pairs_sold, totals.pairs_sold),
                asp: safeDiv(item.net_sales, item.pairs_sold),
            };
        }).sort((a, b) => b.net_sales - a.net_sales);
    }, [ageGroupTotals, ageGroups, totals.net_sales, totals.pairs_sold]);

    const agePriceMap = useMemo(() => {
        const map = new Map<string, (typeof agePriceCells)[number]>();
        agePriceCells.forEach((cell) => {
            map.set(`${cell.age_group}__${cell.price_band}`, cell);
        });
        return map;
    }, [agePriceCells]);

    const ageHeatRange = useMemo(() => {
        const values = agePriceCells
            .map((cell) => cell[ageHeatMetric])
            .filter((value) => Number.isFinite(value) && value >= 0);
        if (values.length === 0) return { min: 0, max: 1 };
        return { min: Math.min(...values), max: Math.max(...values) };
    }, [ageHeatMetric, agePriceCells]);

    const treemapData = useMemo(() => {
        const values = colorStats.map((item) => item[treemapColorMetric]).filter((value) => Number.isFinite(value));
        const min = values.length ? Math.min(...values) : 0;
        const max = values.length ? Math.max(...values) : 1;
        return colorStats.map((item) => ({
            name: item.color_family,
            size: treemapAreaMetric === 'net_sales' ? item.net_sales : item.pairs_sold,
            metricValue: item[treemapColorMetric],
            pairs_sold: item.pairs_sold,
            net_sales: item.net_sales,
            sell_through: item.sell_through,
            gm_rate: item.gm_rate,
            skc_cnt: item.skc_cnt,
            fill: treemapColorMode === 'palette'
                ? getColorFamilySwatch(item.color_family)
                : getTreemapMetricColor(item[treemapColorMetric], min, max, treemapColorMetric),
        }));
    }, [colorStats, treemapAreaMetric, treemapColorMetric, treemapColorMode]);

    const colorCategoryMap = useMemo(() => {
        const map = new Map<string, (typeof colorCategoryCells)[number]>();
        colorCategoryCells.forEach((cell) => {
            map.set(`${cell.color_family}__${cell.category}`, cell);
        });
        return map;
    }, [colorCategoryCells]);

    const colorHeatRange = useMemo(() => {
        const values = colorCategoryCells
            .map((cell) => cell[colorHeatMetric])
            .filter((value) => Number.isFinite(value) && value >= 0);
        if (values.length === 0) return { min: 0, max: 1 };
        return { min: Math.min(...values), max: Math.max(...values) };
    }, [colorCategoryCells, colorHeatMetric]);

    const highlightAge = (age: string) => {
        if (filters.target_audience === age) {
            setFilters({ ...filters, target_audience: 'all' });
            return;
        }
        setFilters({ ...filters, target_audience: age });
    };

    const ageInsight = useMemo(() => {
        if (ageSummary.length === 0) {
            return {
                finding: '暂无年龄段贡献数据',
                decision: '补充客群标签后再观察价格带偏好',
            };
        }
        const topAge = ageSummary[0];
        const topAgePrice = agePriceCells
            .filter((cell) => cell.age_group === topAge.age_group)
            .sort((a, b) => b.net_sales - a.net_sales)[0];

        const highPriceCells = agePriceCells.filter((cell) => {
            const match = cell.price_band.match(/\d+/);
            return match ? Number(match[0]) >= 5 : false;
        });
        const highPriceLeader = Object.values(
            highPriceCells.reduce<Record<string, { age_group: string; sales: number }>>((acc, cell) => {
                if (!acc[cell.age_group]) acc[cell.age_group] = { age_group: cell.age_group, sales: 0 };
                acc[cell.age_group].sales += cell.net_sales;
                return acc;
            }, {})
        ).sort((a, b) => b.sales - a.sales)[0];

        return {
            finding: `主力客群为 ${topAge.age_group}（销售占比 ${fmtPct(topAge.sales_share)}），主偏好价格带 ${topAgePrice?.price_band || '--'}。`,
            decision: highPriceLeader
                ? `高价带主要由 ${highPriceLeader.age_group} 支撑，建议将该客群重点资源投向高毛利产品线。`
                : '高价带客群贡献不稳定，建议先做价格带 A/B 测试。',
        };
    }, [agePriceCells, ageSummary]);

    const colorInsight = useMemo(() => {
        if (colorStats.length === 0) {
            return {
                finding: '暂无色系表现数据',
                decision: '补充 SKC 数据后再判断基础色盘健康度',
            };
        }
        const baseColors = new Set(['黑色', '白色', '灰色', '中性色']);
        const totalSales = colorStats.reduce((sum, item) => sum + item.net_sales, 0);
        const baseSales = colorStats.filter((item) => baseColors.has(item.color_family)).reduce((sum, item) => sum + item.net_sales, 0);
        const riskColor = colorStats
            .filter((item) => !baseColors.has(item.color_family))
            .sort((a, b) => (b.net_sales * Math.max(0.75 - b.sell_through, 0)) - (a.net_sales * Math.max(0.75 - a.sell_through, 0)))[0];

        return {
            finding: `基础色盘贡献 ${fmtPct(safeDiv(baseSales, totalSales))}，当前色盘结构${safeDiv(baseSales, totalSales) >= 0.55 ? '稳健' : '偏弱'}。`,
            decision: riskColor && riskColor.sell_through < 0.7
                ? `${riskColor.color_family} 需列入库存预警，建议收缩该色在低动销品类中的配比。`
                : '彩色盘整体健康，可继续在高动销品类放大差异化配色。',
        };
    }, [colorStats]);

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">4.4 Consumer Segment</div>
                        <h2 className="text-lg font-bold text-slate-900">消费者年龄段 / 人群画像</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            图1 年龄段占比堆叠条（按产品线），图2 年龄段 × 价格带偏好热力。
                        </p>
                    </div>
                    {filters.target_audience !== 'all' && (
                        <button
                            onClick={() => setFilters({ ...filters, target_audience: 'all' })}
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-md transition-colors"
                        >
                            清除年龄筛选 {filters.target_audience}
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <div className="xl:col-span-2 rounded-xl border border-slate-100 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-semibold text-slate-700">年龄段占比堆叠条（产品线）</div>
                            <div className="text-xs text-slate-400">单位：各产品线内销售占比 %</div>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={ageStackData}
                                layout="vertical"
                                barSize={20}
                                margin={{ top: 6, right: 20, left: 10, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    ticks={AGE_STACK_TICKS}
                                    allowDecimals={false}
                                    tickFormatter={(value) => `${Math.round(Number(value))}%`}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                />
                                <YAxis type="category" dataKey="product_line" width={86} tick={{ fontSize: 11, fill: '#334155' }} />
                                <Tooltip
                                    formatter={(value: number | string | undefined, name: string | undefined) => {
                                        const numeric = typeof value === 'number' ? value : Number(value ?? 0);
                                        return [`${numeric.toFixed(1)}%`, `${getAgeLabel(String(name ?? ''))} 占比`];
                                    }}
                                    labelFormatter={(label) => `产品线：${label}`}
                                />
                                {ageGroups.map((age, idx) => (
                                    <Bar
                                        key={age}
                                        dataKey={age}
                                        stackId="age"
                                        fill={AGE_COLORS[age] || '#94a3b8'}
                                        radius={idx === ageGroups.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                                        opacity={filters.target_audience === 'all' || filters.target_audience === age ? 1 : 0.35}
                                        onClick={() => highlightAge(age)}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {ageGroups.map((age) => (
                                <button
                                    key={age}
                                    onClick={() => highlightAge(age)}
                                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                        filters.target_audience === age
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {getAgeLabel(age)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-4">
                        <div className="text-sm font-semibold text-slate-700 mb-3">主力客群结构</div>
                        <div className="space-y-3">
                            {ageSummary.map((item) => (
                                <button
                                    key={item.age_group}
                                    onClick={() => highlightAge(item.age_group)}
                                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                                        filters.target_audience === item.age_group
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">{getAgeLabel(item.age_group)}</span>
                                        <span className="text-xs">{fmtPct(item.sales_share)}</span>
                                    </div>
                                    <div className={`mt-1 text-xs ${filters.target_audience === item.age_group ? 'text-slate-200' : 'text-slate-500'}`}>
                                        销售占比 {fmtPct(item.sales_share)} · 双数占比 {fmtPct(item.pairs_share)}
                                    </div>
                                    <div className={`text-xs ${filters.target_audience === item.age_group ? 'text-slate-200' : 'text-slate-500'}`}>
                                        ASP {fmtMoney(item.asp)} · 销售额 {fmtWan(item.net_sales)}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">人群结论</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                        <div className="text-xs text-slate-500 mb-1">核心发现</div>
                        <div className="text-slate-700">{ageInsight.finding}</div>
                    </div>
                    <div className="rounded-lg border border-blue-200 p-3 bg-blue-50/70">
                        <div className="text-xs text-blue-500 mb-1">建议动作</div>
                        <div className="text-slate-700">{ageInsight.decision}</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">年龄段 × 价格带</div>
                        <h3 className="text-base font-bold text-slate-900">偏好热力图（销售 / 售罄 / 毛利）</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {(['net_sales', 'sell_through', 'gm_rate'] as HeatMetric[]).map((metric) => (
                            <button
                                key={metric}
                                onClick={() => setAgeHeatMetric(metric)}
                                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                                    ageHeatMetric === metric
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {METRIC_LABEL[metric]}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-1">
                        <thead>
                            <tr>
                                <th className="text-left text-xs text-slate-500 font-semibold px-2 py-1">年龄段</th>
                                {priceBands.map((band) => (
                                    <th key={band} className="text-center text-xs text-slate-500 font-semibold px-2 py-1">{band}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ageGroups.map((age) => (
                                <tr key={age}>
                                    <td className="text-sm font-medium text-slate-700 px-2 py-1">{age}</td>
                                    {priceBands.map((band) => {
                                        const cell = agePriceMap.get(`${age}__${band}`);
                                        const value = cell?.[ageHeatMetric] || 0;
                                        return (
                                            <td key={`${age}-${band}`} className="px-1 py-1">
                                                <button
                                                    onClick={() => {
                                                        const nextAge = filters.target_audience === age ? 'all' : age;
                                                        const nextBand = filters.price_band === band ? 'all' : band;
                                                        setFilters({ ...filters, target_audience: nextAge, price_band: nextBand });
                                                    }}
                                                    className="w-full rounded-md px-2 py-2 text-[11px] font-medium transition-transform hover:scale-[1.02]"
                                                    style={{
                                                        background: getHeatColor(value, ageHeatRange.min, ageHeatRange.max, ageHeatMetric),
                                                        color: ageHeatMetric === 'net_sales' && value > (ageHeatRange.max * 0.45) ? '#ffffff' : '#0f172a',
                                                    }}
                                                >
                                                    {ageHeatMetric === 'net_sales' ? fmtWan(value) : fmtPct(value)}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                    点击任意格子可联动筛选 `年龄段 + 价格带`，用于定位年轻人低价偏好或高价带支撑客群。
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">4.5 Color Performance</div>
                        <h2 className="text-lg font-bold text-slate-900">颜色分析</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Treemap 面积可切换「销量/销售额」，颜色支持「表现热度」与「色系本色」两种模式。
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
                            {(['performance', 'palette'] as TreemapColorMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setTreemapColorMode(mode)}
                                    className={`text-xs px-2 py-1 rounded ${
                                        treemapColorMode === mode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {mode === 'performance' ? '颜色=表现热度' : '颜色=色系本色'}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
                            {(['net_sales', 'pairs_sold'] as TreemapAreaMetric[]).map((metric) => (
                                <button
                                    key={metric}
                                    onClick={() => setTreemapAreaMetric(metric)}
                                    className={`text-xs px-2 py-1 rounded ${
                                        treemapAreaMetric === metric ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {metric === 'net_sales' ? '面积=销售额' : '面积=销量'}
                                </button>
                            ))}
                        </div>
                        <div className={`flex items-center gap-1 rounded-md border border-slate-200 p-1 ${treemapColorMode === 'palette' ? 'opacity-50' : ''}`}>
                            {(['sell_through', 'gm_rate'] as TreemapColorMetric[]).map((metric) => (
                                <button
                                    key={metric}
                                    onClick={() => setTreemapColorMetric(metric)}
                                    disabled={treemapColorMode === 'palette'}
                                    className={`text-xs px-2 py-1 rounded ${
                                        treemapColorMetric === metric ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {metric === 'sell_through' ? '颜色=售罄' : '颜色=毛利'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mb-3 text-xs text-slate-500">
                    {treemapColorMode === 'performance'
                        ? (treemapColorMetric === 'sell_through'
                            ? '色块含义：红 = 售罄低，绿 = 售罄高'
                            : '色块含义：橙 = 毛利低，蓝 = 毛利高')
                        : '色块含义：按色系本色展示（黑/白/灰/彩色），用于直观看颜色结构'}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <div className="xl:col-span-2 rounded-xl border border-slate-100 p-4 relative">
                        {filters.color !== 'all' && (
                            <button
                                onClick={() => setFilters({ ...filters, color: 'all' })}
                                className="absolute top-4 right-4 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors"
                            >
                                清除颜色筛选 {filters.color}
                            </button>
                        )}
                        <ResponsiveContainer width="100%" height={320}>
                            <Treemap
                                data={treemapData}
                                dataKey="size"
                                stroke="#ffffff"
                                aspectRatio={4 / 3}
                                onClick={(payload: unknown) => {
                                    const color = getColorFromPayload(payload);
                                    if (!color) return;
                                    if (filters.color === color) setFilters({ ...filters, color: 'all' });
                                    else setFilters({ ...filters, color });
                                }}
                            >
                                <Tooltip
                                    formatter={(_value, _name, item) => {
                                        const payload = item?.payload as {
                                            pairs_sold: number;
                                            net_sales: number;
                                            sell_through: number;
                                            gm_rate: number;
                                        };
                                        return [
                                            `销量 ${payload.pairs_sold.toLocaleString()} 双 · 销售 ${fmtWan(payload.net_sales)} · 售罄 ${fmtPct(payload.sell_through)} · 毛利 ${fmtPct(payload.gm_rate)}`,
                                            '颜色表现',
                                        ];
                                    }}
                                />
                            </Treemap>
                        </ResponsiveContainer>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-4">
                        <div className="text-sm font-semibold text-slate-700 mb-3">色系排行榜</div>
                        <div className="space-y-2">
                            {colorStats.map((item, index) => (
                                <button
                                    key={item.color_family}
                                    onClick={() => {
                                        if (filters.color === item.color_family) setFilters({ ...filters, color: 'all' });
                                        else setFilters({ ...filters, color: item.color_family });
                                    }}
                                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                                        filters.color === item.color_family
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium">{index + 1}. {item.color_family}</span>
                                        <span className="text-xs">{fmtWan(item.net_sales)}</span>
                                    </div>
                                    <div className={`mt-1 text-[11px] ${filters.color === item.color_family ? 'text-slate-200' : 'text-slate-500'}`}>
                                        销量 {item.pairs_sold.toLocaleString()} 双 · SKC {item.skc_cnt}
                                    </div>
                                    <div className={`text-[11px] ${filters.color === item.color_family ? 'text-slate-200' : 'text-slate-500'}`}>
                                        售罄 {fmtPct(item.sell_through)} · 毛利 {fmtPct(item.gm_rate)}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">颜色结论</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                        <div className="text-xs text-slate-500 mb-1">核心发现</div>
                        <div className="text-slate-700">{colorInsight.finding}</div>
                    </div>
                    <div className="rounded-lg border border-pink-200 p-3 bg-pink-50/70">
                        <div className="text-xs text-pink-500 mb-1">建议动作</div>
                        <div className="text-slate-700">{colorInsight.decision}</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">色系 × 品类</div>
                        <h3 className="text-base font-bold text-slate-900">颜色错配热力图</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {(['net_sales', 'sell_through'] as HeatMetric[]).map((metric) => (
                            <button
                                key={metric}
                                onClick={() => setColorHeatMetric(metric)}
                                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                                    colorHeatMetric === metric
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {metric === 'net_sales' ? '销售额' : '售罄率'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-1">
                        <thead>
                            <tr>
                                <th className="text-left text-xs text-slate-500 font-semibold px-2 py-1">色系</th>
                                {categories.map((category) => (
                                    <th key={category} className="text-center text-xs text-slate-500 font-semibold px-2 py-1">{category}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {colorFamilies.map((color) => (
                                <tr key={color}>
                                    <td className="text-sm font-medium text-slate-700 px-2 py-1">{color}</td>
                                    {categories.map((category) => {
                                        const cell = colorCategoryMap.get(`${color}__${category}`);
                                        const value = cell?.[colorHeatMetric] || 0;
                                        return (
                                            <td key={`${color}-${category}`} className="px-1 py-1">
                                                <button
                                                    onClick={() => {
                                                        const nextColor = filters.color === color ? 'all' : color;
                                                        const nextCategory = filters.category_id === category ? 'all' : category;
                                                        setFilters({ ...filters, color: nextColor, category_id: nextCategory });
                                                    }}
                                                    className="w-full rounded-md px-2 py-2 text-[11px] font-medium transition-transform hover:scale-[1.02]"
                                                    style={{
                                                        background: getHeatColor(value, colorHeatRange.min, colorHeatRange.max, colorHeatMetric),
                                                        color: colorHeatMetric === 'net_sales' && value > (colorHeatRange.max * 0.45) ? '#ffffff' : '#0f172a',
                                                    }}
                                                >
                                                    {colorHeatMetric === 'net_sales' ? fmtWan(value) : fmtPct(value)}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                    用于识别“正确颜色是否打在正确品类”，点击格子可联动 `色系 + 品类` 筛选。
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">下钻明细</div>
                        <h3 className="text-base font-bold text-slate-900">客群/颜色 → SKU 清单</h3>
                    </div>
                    <div className="text-xs text-slate-500">当前筛选下 Top20</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">SKU</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">客群</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">品类/产品线</th>
                                <th className="text-left px-2 py-2 text-slate-500 font-semibold">价格带/色系</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">销售额</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">售罄</th>
                                <th className="text-right px-2 py-2 text-slate-500 font-semibold">毛利</th>
                            </tr>
                        </thead>
                        <tbody>
                            {skuDrillRows.slice(0, 20).map((row) => (
                                <tr key={row.sku_id} className="border-t border-slate-100">
                                    <td className="px-2 py-2 text-slate-700">
                                        <div className="font-medium">{row.sku_name}</div>
                                        <div className="text-[11px] text-slate-400">{row.sku_id}</div>
                                    </td>
                                    <td className="px-2 py-2 text-slate-600">{row.age_group}</td>
                                    <td className="px-2 py-2 text-slate-600">{row.category} / {row.product_line}</td>
                                    <td className="px-2 py-2 text-slate-600">{row.price_band} / {row.color_family}</td>
                                    <td className="px-2 py-2 text-right text-slate-700">{fmtWan(row.net_sales)}</td>
                                    <td className="px-2 py-2 text-right text-slate-700">{fmtPct(row.sell_through)}</td>
                                    <td className="px-2 py-2 text-right text-slate-700">{fmtPct(row.gm_rate)}</td>
                                </tr>
                            ))}
                            {skuDrillRows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-2 py-4 text-slate-400">当前筛选下暂无 SKU 明细。</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
