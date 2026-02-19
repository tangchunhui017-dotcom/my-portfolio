'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, Cell
} from 'recharts';
import wavePlanRaw from '@/../data/dashboard/dim_wave_plan.json';

interface WavePlan {
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
    units_plan: number;
    revenue_plan: number;
    category_mix: Record<string, number>;
}

const wavePlans = wavePlanRaw as unknown as WavePlan[];

const SEASON_COLORS: Record<string, string> = {
    '2024-SS': '#f9a8d4',
    '2024-AW': '#93c5fd',
    '2025-SS': '#86efac',
};

const CATEGORY_COLORS: Record<string, string> = {
    跑步: '#ec4899',
    训练: '#f59e0b',
    户外: '#10b981',
    休闲: '#6366f1',
    潮流: '#8b5cf6',
    童鞋: '#f97316',
};

const CATEGORIES = ['跑步', '训练', '户外', '休闲', '潮流', '童鞋'];

function fmt万(n: number) {
    if (n >= 1e8) return `¥${(n / 1e8).toFixed(2)}亿`;
    if (n >= 1e4) return `¥${(n / 1e4).toFixed(0)}万`;
    return `¥${n.toLocaleString()}`;
}

// 按季节分组
const seasons = [...new Set(wavePlans.map(w => w.season))];

export default function WavePlanningPanel() {
    // SKU 计划 vs 实际 数据
    const skuBarData = wavePlans.map(w => ({
        name: `${w.season.replace('20', '')}\n${w.wave}`,
        fullName: `${w.season} ${w.wave}`,
        计划SKU: w.sku_plan,
        实际SKU: w.sku_actual,
        达成率: Math.round(w.sku_actual / w.sku_plan * 100),
        season: w.season,
    }));

    // 新旧货比例数据
    const ratioBarData = wavePlans.map(w => ({
        name: `${w.season.replace('20', '')} ${w.wave}`,
        新品: Math.round(w.new_ratio * 100),
        旧款延续: Math.round(w.old_ratio * 100),
        season: w.season,
    }));

    // 品类 × 波段矩阵
    const matrixData = wavePlans.map(w => {
        const row: Record<string, string | number> = {
            wave: `${w.season.replace('20', '')} ${w.wave}`,
            total: w.sku_plan,
        };
        CATEGORIES.forEach(cat => {
            row[cat] = w.category_mix[cat] || 0;
        });
        return row;
    });

    return (
        <div className="space-y-8">

            {/* ── Section 1: 上市日历 ────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1 h-5 rounded-full bg-pink-400 inline-block" />
                    <h2 className="text-base font-bold text-slate-900">上市节奏日历</h2>
                    <span className="text-xs text-slate-400 ml-1">— 每杆波段上市时间 · 主题 · 覆盖区域</span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex gap-3 mb-4">
                        {seasons.map(s => (
                            <span key={s} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: SEASON_COLORS[s] }} />
                                {s}
                            </span>
                        ))}
                    </div>

                    <div className="relative">
                        {/* 时间轴线 */}
                        <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-100" />

                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {wavePlans.map((w) => {
                                const date = new Date(w.launch_date);
                                const month = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
                                const bgColor = SEASON_COLORS[w.season] || '#e2e8f0';
                                const achvRate = Math.round(w.sku_actual / w.sku_plan * 100);

                                return (
                                    <div key={w.id} className="flex-shrink-0 w-36">
                                        {/* 时间点 */}
                                        <div className="flex flex-col items-center mb-3">
                                            <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm z-10"
                                                style={{ background: bgColor }} />
                                            <div className="text-[10px] text-slate-400 mt-1">{month}</div>
                                        </div>

                                        {/* 卡片 */}
                                        <div className="rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all"
                                            style={{ borderTop: `3px solid ${bgColor}` }}>
                                            <div className="text-xs font-bold text-slate-800 mb-0.5">
                                                {w.season} {w.wave}
                                            </div>
                                            <div className="text-[11px] text-pink-600 font-medium mb-2">{w.theme}</div>
                                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                                                <span>SKU 计划</span>
                                                <span className="font-semibold text-slate-800">{w.sku_plan}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                                                <span>实际落地</span>
                                                <span className={`font-semibold ${achvRate >= 90 ? 'text-emerald-600' : 'text-amber-500'}`}>
                                                    {w.sku_actual} ({achvRate}%)
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                                                <span>新品占比</span>
                                                <span className="font-semibold text-slate-700">{Math.round(w.new_ratio * 100)}%</span>
                                            </div>
                                            {/* 新旧货进度条 */}
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-pink-400"
                                                    style={{ width: `${w.new_ratio * 100}%` }} />
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1.5">
                                                📍 {w.temp_zone}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Section 2: SKU 计划 vs 实际 ──────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1 h-5 rounded-full bg-pink-400 inline-block" />
                    <h2 className="text-base font-bold text-slate-900">波段 SKU 容量：计划 vs 实际</h2>
                    <span className="text-xs text-slate-400 ml-1">— 实际落地率 ≥ 90% 视为达标</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* 计划 vs 实际 分组条形 */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={skuBarData} barGap={4} barSize={14}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <Tooltip
                                    formatter={(v, name) => [v, name]}
                                    labelFormatter={(l) => skuBarData.find(d => d.name === l)?.fullName || l}
                                />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="计划SKU" fill="#fce7f3" radius={[3, 3, 0, 0]}>
                                    {skuBarData.map((d, i) => (
                                        <Cell key={i} fill={SEASON_COLORS[d.season] || '#fce7f3'} opacity={0.5} />
                                    ))}
                                </Bar>
                                <Bar dataKey="实际SKU" fill="#ec4899" radius={[3, 3, 0, 0]}>
                                    {skuBarData.map((d, i) => (
                                        <Cell key={i} fill={SEASON_COLORS[d.season]?.replace('9a', '4a') || '#ec4899'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 新旧货堆叠比例 */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                            新品 vs 旧款延续 占比 (%)
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={ratioBarData} barSize={20} layout="vertical"
                                margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} width={80} />
                                <Tooltip formatter={(v) => [`${v}%`, '']} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="新品" stackId="a" fill="#ec4899" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="旧款延续" stackId="a" fill="#e2e8f0" radius={[0, 3, 3, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── Section 3: 品类 × 波段 SKU 矩阵 ─────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1 h-5 rounded-full bg-pink-400 inline-block" />
                    <h2 className="text-base font-bold text-slate-900">品类 × 波段 SKU 需求矩阵</h2>
                    <span className="text-xs text-slate-400 ml-1">— 堆叠柱 = 各品类 SKU 数量</span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={matrixData} barSize={28}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="wave" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                            {CATEGORIES.map((cat, i) => (
                                <Bar key={cat} dataKey={cat} stackId="cat"
                                    fill={CATEGORY_COLORS[cat]}
                                    radius={i === CATEGORIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Section 4: 波段快览卡 ─────────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1 h-5 rounded-full bg-pink-400 inline-block" />
                    <h2 className="text-base font-bold text-slate-900">波段快览</h2>
                    <span className="text-xs text-slate-400 ml-1">— 按季节分组</span>
                </div>

                <div className="space-y-4">
                    {seasons.map(season => {
                        const waves = wavePlans.filter(w => w.season === season);
                        const totalSku = waves.reduce((s, w) => s + w.sku_plan, 0);
                        const totalRev = waves.reduce((s, w) => s + w.revenue_plan, 0);
                        const avgNew = waves.reduce((s, w) => s + w.new_ratio, 0) / waves.length;

                        return (
                            <div key={season} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full"
                                            style={{ background: SEASON_COLORS[season] }} />
                                        <span className="font-bold text-slate-900">{season}</span>
                                        <span className="text-xs text-slate-400">{waves.length} 个波段</span>
                                    </div>
                                    <div className="flex gap-4 text-xs">
                                        <span className="text-slate-500">合计 SKU <strong className="text-slate-900">{totalSku}</strong></span>
                                        <span className="text-slate-500">计划销售额 <strong className="text-slate-900">{fmt万(totalRev)}</strong></span>
                                        <span className="text-slate-500">平均新品率 <strong className="text-pink-600">{Math.round(avgNew * 100)}%</strong></span>
                                    </div>
                                </div>

                                <div className="flex gap-2 flex-wrap">
                                    {waves.map(w => (
                                        <div key={w.id}
                                            className="flex-1 min-w-[100px] rounded-xl p-3 border border-slate-100"
                                            style={{ background: `${SEASON_COLORS[w.season]}22` }}>
                                            <div className="text-xs font-bold text-slate-700">{w.wave}</div>
                                            <div className="text-[10px] text-pink-600 mb-1.5">{w.theme}</div>
                                            <div className="text-xl font-bold text-slate-900">{w.sku_plan}</div>
                                            <div className="text-[10px] text-slate-400">SKU 计划</div>
                                            <div className="h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                                <div className="h-full bg-pink-400 rounded-full"
                                                    style={{ width: `${w.new_ratio * 100}%` }} />
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1">
                                                新品 {Math.round(w.new_ratio * 100)}%
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
