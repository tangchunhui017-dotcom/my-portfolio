'use client';

import { useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useCompetitorAnalysis } from '@/hooks/useCompetitorAnalysis';

function fmtPct(value: number) {
    if (!Number.isFinite(value)) return '--';
    return `${(value * 100).toFixed(1)}%`;
}

function fmtPct100(value: number) {
    if (!Number.isFinite(value)) return '--';
    return `${value.toFixed(1)}%`;
}

function fmtWan(value: number) {
    if (!Number.isFinite(value)) return '--';
    return `${(value / 10000).toFixed(1)}万`;
}

function gradientBySeed(seed: string) {
    const gradients = [
        'linear-gradient(135deg, #0ea5e9 0%, #2563eb 55%, #312e81 100%)',
        'linear-gradient(135deg, #22c55e 0%, #16a34a 55%, #14532d 100%)',
        'linear-gradient(135deg, #f59e0b 0%, #ea580c 55%, #7c2d12 100%)',
        'linear-gradient(135deg, #ec4899 0%, #a855f7 55%, #4c1d95 100%)',
        'linear-gradient(135deg, #14b8a6 0%, #0d9488 55%, #134e4a 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash += seed.charCodeAt(i);
    return gradients[Math.abs(hash) % gradients.length];
}

function galleryBackground(imageUrl: string) {
    if (/^https?:\/\//i.test(imageUrl)) {
        return {
            backgroundImage: `linear-gradient(to top, rgba(15,23,42,0.45), rgba(15,23,42,0.08)), url("${imageUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        } as const;
    }
    return { background: gradientBySeed(imageUrl) } as const;
}

const CATEGORY_COLORS = ['#2563eb', '#06b6d4', '#22c55e', '#f59e0b', '#a855f7', '#e11d48', '#64748b'];

export default function CompetitorTrendPanel() {
    const {
        brands,
        categories,
        brandSummary,
        skuStructureRows,
        skuStructureChartData,
        galleryItems,
        waveOptions,
        regionOptions,
        priceBandBenchmarkRows,
    } = useCompetitorAnalysis();

    const [selectedBrand, setSelectedBrand] = useState<string>('all');
    const [selectedWave, setSelectedWave] = useState<string>('all');
    const [selectedRegion, setSelectedRegion] = useState<string>('all');

    const filteredRows = useMemo(() => {
        if (selectedBrand === 'all') return skuStructureRows;
        return skuStructureRows.filter((row) => row.comp_brand === selectedBrand);
    }, [selectedBrand, skuStructureRows]);

    const filteredBrandSummary = useMemo(() => {
        if (selectedBrand === 'all') return brandSummary;
        return brandSummary.filter((row) => row.comp_brand === selectedBrand);
    }, [brandSummary, selectedBrand]);

    const filteredSkuStructureChartData = useMemo(() => {
        if (selectedBrand === 'all') return skuStructureChartData;
        return skuStructureChartData.filter((row) => row.comp_brand === selectedBrand);
    }, [selectedBrand, skuStructureChartData]);

    const filteredGallery = useMemo(() => {
        return galleryItems.filter((item) => {
            if (selectedBrand !== 'all' && item.comp_brand !== selectedBrand) return false;
            if (selectedWave !== 'all' && item.wave !== selectedWave) return false;
            if (selectedRegion !== 'all' && item.region !== selectedRegion) return false;
            return true;
        });
    }, [galleryItems, selectedBrand, selectedWave, selectedRegion]);

    const topGapInsight = useMemo(() => {
        const ourBrand = skuStructureRows.filter((row) => row.comp_brand === '本品牌');
        if (!ourBrand.length) return '暂无本品牌对照数据';
        const ourMap = new Map(ourBrand.map((row) => [row.category_l2, row.sku_share]));
        const candidates = categories.map((category) => {
            const ourShare = ourMap.get(category) || 0;
            const topShare = skuStructureRows
                .filter((row) => row.category_l2 === category)
                .reduce((max, row) => Math.max(max, row.sku_share), 0);
            return { category, gap: topShare - ourShare };
        }).sort((a, b) => b.gap - a.gap);
        const top = candidates[0];
        if (!top) return '暂无可比较的结构缺口';
        return `${top.category} 是当前最大结构缺口，建议在下一波段补齐 ${fmtPct(top.gap)} 的 SKU 份额。`;
    }, [categories, skuStructureRows]);

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">4.8 Competitor Mix</div>
                        <h2 className="text-lg font-bold text-slate-900">竞品 SKU 结构对比</h2>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <span>口径：SKU结构（非销售额）</span>
                            <span
                                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500 cursor-help"
                                title="完整字段：竞品品牌 / 二级品类 / SKU数量 / SKU结构占比 / SKU同比"
                            >
                                i
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {['all', ...brands].map((brand) => (
                            <button
                                key={brand}
                                onClick={() => setSelectedBrand(brand)}
                                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                                    selectedBrand === brand
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {brand === 'all' ? '全部品牌' : brand}
                            </button>
                        ))}
                        <span className="text-xs text-slate-400 ml-1">
                            当前筛选：{selectedBrand === 'all' ? '全部品牌' : selectedBrand}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
                    {filteredBrandSummary.map((brand) => (
                        <div key={brand.comp_brand} className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                            <div className="text-sm font-semibold text-slate-900">{brand.comp_brand}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{brand.position}</div>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                <div>
                                    <div className="text-slate-500">市占</div>
                                    <div className="font-semibold text-slate-800">{fmtPct(brand.market_share)}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500">SKU数</div>
                                    <div className="font-semibold text-slate-800">{brand.sku_total}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500">同比</div>
                                    <div className={`font-semibold ${brand.sku_yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {fmtPct(brand.sku_yoy)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-slate-100 p-4 mb-4">
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={filteredSkuStructureChartData} margin={{ top: 8, right: 18, left: 8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="comp_brand" tick={{ fontSize: 11, fill: '#475569' }} />
                            <YAxis yAxisId="left" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip
                                formatter={(value: number | string | undefined) => {
                                    const numeric = typeof value === 'number' ? value : Number(value ?? 0);
                                    return `${numeric.toFixed(1)}%`;
                                }}
                            />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                            {categories.map((category, idx) => (
                                <Bar key={category} yAxisId="left" dataKey={category} stackId="sku" fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                            ))}
                            <Line yAxisId="right" type="monotone" dataKey="sku_yoy" name="SKU同比" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-slate-100 overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-3 py-2 text-slate-500 font-semibold">品牌</th>
                                <th className="text-left px-3 py-2 text-slate-500 font-semibold">品类</th>
                                <th className="text-right px-3 py-2 text-slate-500 font-semibold">SKU数</th>
                                <th className="text-right px-3 py-2 text-slate-500 font-semibold">SKU占比</th>
                                <th className="text-right px-3 py-2 text-slate-500 font-semibold">SKU同比</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map((row) => (
                                <tr key={`${row.comp_brand}-${row.category_l2}`} className="border-t border-slate-100">
                                    <td className="px-3 py-2 text-slate-700">{row.comp_brand}</td>
                                    <td className="px-3 py-2 text-slate-600">{row.category_l2}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{row.sku_cnt}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{fmtPct(row.sku_share)}</td>
                                    <td className={`px-3 py-2 text-right font-medium ${row.sku_yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {fmtPct(row.sku_yoy)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 text-xs text-slate-500">{topGapInsight}</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">竞品波段市调画廊</div>
                        <h3 className="text-base font-bold text-slate-900">品牌 / 波段 / 区域 / 温度 标签沉淀</h3>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <span>口径：竞品素材标签沉淀</span>
                            <span
                                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500 cursor-help"
                                title="完整字段：竞品品牌 / 波段 / 区域 / 温度带 / 图片链接 / 标签"
                            >
                                i
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={selectedWave}
                            onChange={(e) => setSelectedWave(e.target.value)}
                            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700"
                        >
                            <option value="all">全部波段</option>
                            {waveOptions.map((wave) => (
                                <option key={wave} value={wave}>{wave}</option>
                            ))}
                        </select>
                        <select
                            value={selectedRegion}
                            onChange={(e) => setSelectedRegion(e.target.value)}
                            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700"
                        >
                            <option value="all">全部区域</option>
                            {regionOptions.map((region) => (
                                <option key={region} value={region}>{region}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredGallery.map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div
                                className="h-32 px-3 py-2 flex items-end justify-between text-white"
                                style={galleryBackground(item.image_url)}
                            >
                                <span className="text-xs bg-white/20 backdrop-blur px-2 py-1 rounded-full">{item.comp_brand}</span>
                                <span className="text-xs bg-black/25 px-2 py-1 rounded-full">{item.wave}</span>
                            </div>
                            <div className="p-3">
                                <div className="text-sm font-semibold text-slate-900 line-clamp-1">{item.title}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {item.region} · {item.temp_range} · {item.category}
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs">
                                    <span className="text-slate-500">售罄</span>
                                    <span className="font-semibold text-emerald-600">{fmtPct(item.sell_through)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs mt-1">
                                    <span className="text-slate-500">热度分</span>
                                    <span className="font-semibold text-slate-700">{item.buzz_score}</span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {item.tags.map((tag) => (
                                        <span key={`${item.id}-${tag}`} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="mb-3">
                    <div className="text-xs uppercase tracking-wide text-slate-400">价格带对标补充</div>
                    <h3 className="text-base font-bold text-slate-900">竞品价格带份额（辅助定价视角）</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-3 py-2 text-slate-500 font-semibold">品牌</th>
                                <th className="text-left px-3 py-2 text-slate-500 font-semibold">品类</th>
                                <th className="text-left px-3 py-2 text-slate-500 font-semibold">价格带</th>
                                <th className="text-right px-3 py-2 text-slate-500 font-semibold">销售额</th>
                                <th className="text-right px-3 py-2 text-slate-500 font-semibold">带内占比</th>
                            </tr>
                        </thead>
                        <tbody>
                            {priceBandBenchmarkRows.slice(0, 24).map((row) => (
                                <tr key={`${row.comp_brand}-${row.category}-${row.price_band}`} className="border-t border-slate-100">
                                    <td className="px-3 py-2 text-slate-700">{row.comp_brand}</td>
                                    <td className="px-3 py-2 text-slate-600">{row.category}</td>
                                    <td className="px-3 py-2 text-slate-600">{row.price_band_name}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{fmtWan(row.net_sales)}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{fmtPct100(row.sales_share * 100)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
