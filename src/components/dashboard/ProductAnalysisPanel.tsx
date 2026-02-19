'use client';

import { useMemo } from 'react';
import {
    Treemap, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
    Cell,
} from 'recharts';
import { useProductAnalysis } from '@/hooks/useProductAnalysis';

// ─── 格式化函数 ────────────────────────────────────────────────────────
function fmt万(n: number) {
    if (n >= 1e8) return `¥${(n / 1e8).toFixed(2)}亿`;
    if (n >= 1e4) return `¥${(n / 1e4).toFixed(0)}万`;
    return `¥${n.toLocaleString()}`;
}
function fmtPct(n: number) { return `${(n * 100).toFixed(1)}%`; }

// ─── 色系颜色映射（UI 颜色） ────────────────────────────────────────────
const COLOR_UI: Record<string, string> = {
    '黑色': '#1e293b',
    '白色': '#94a3b8',
    '灰色': '#64748b',
    '彩色·柔': '#f472b6',
    '彩色·鲜': '#ec4899',
    '中性色': '#a78bfa',
    '未知': '#cbd5e1',
};

const AGE_COLORS = ['#f9a8d4', '#ec4899', '#be185d', '#6b21a8'];

// ─── 自定义 Tooltip ────────────────────────────────────────────────────
function ColorTooltip({ active, payload }: { active?: boolean; payload?: { payload: { color_family: string; netSales: number; units: number; skcCount: number; sellThrough: number; marginRate: number } }[] }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1">
            <div className="font-bold text-slate-800 mb-1">{d.color_family}</div>
            <div className="flex gap-3">
                <span className="text-slate-500">销售额</span>
                <span className="font-semibold text-slate-900">{fmt万(d.netSales)}</span>
            </div>
            <div className="flex gap-3">
                <span className="text-slate-500">销量</span>
                <span className="font-semibold">{d.units.toLocaleString()} 双</span>
            </div>
            <div className="flex gap-3">
                <span className="text-slate-500">款数</span>
                <span className="font-semibold">{d.skcCount} SKU</span>
            </div>
            <div className="flex gap-3">
                <span className="text-slate-500">售罄率</span>
                <span className={`font-semibold ${d.sellThrough > 0.70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {fmtPct(d.sellThrough)}
                </span>
            </div>
        </div>
    );
}

// ─── 色系 Treemap 自定义内容 ──────────────────────────────────────────
function ColorTreemapContent(props: {
    x?: number; y?: number; width?: number; height?: number; depth?: number;
    name?: string; netSales?: number; skcCount?: number; sellThrough?: number;
}) {
    const { x = 0, y = 0, width = 0, height = 0, name = '', skcCount = 0, sellThrough = 0 } = props;
    const color = COLOR_UI[name] || '#94a3b8';
    const isLight = name === '白色' || name === '灰色';
    const textColor = isLight ? '#1e293b' : '#ffffff';

    if (width < 40 || height < 30) return <g />;

    // 售罄率健康度：在色块右下角显示小点
    const stGood = sellThrough > 0.70;

    return (
        <g>
            <rect x={x} y={y} width={width} height={height} fill={color} stroke="#fff" strokeWidth={2} rx={6} />
            {/* 底部灰色蒙层（让文字更清晰）*/}
            {height > 50 && (
                <rect x={x} y={y + height - 36} width={width} height={36}
                    fill="rgba(0,0,0,0.35)" rx={6} />
            )}
            <text x={x + 10} y={y + 22} fill={textColor} fontSize={13} fontWeight="700">
                {name}
            </text>
            {height > 50 && (
                <>
                    <text x={x + 10} y={y + height - 20} fill="rgba(255,255,255,0.85)" fontSize={10}>
                        {skcCount} SKU
                    </text>
                    <circle cx={x + width - 12} cy={y + height - 12} r={5}
                        fill={stGood ? '#22c55e' : '#f59e0b'} />
                </>
            )}
        </g>
    );
}

export default function ProductAnalysisPage() {
    const { colorStats, ageStats, ageTotals, lineStats } = useProductAnalysis();

    // 年龄段堆叠条形图数据
    const productLines = [...new Set(ageStats.map(a => a.product_line))];
    const ageGroups = ['18-25', '26-35', '36-45', '46+'];

    const ageBarData = useMemo(() => {
        return productLines.map(pl => {
            const row: Record<string, number | string> = { product_line: pl };
            ageGroups.forEach(ag => {
                const found = ageStats.find(a => a.product_line === pl && a.age_group === ag);
                row[ag] = found ? Math.round(found.netSales / 10000) : 0; // 万元
            });
            return row;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ageStats]);

    // Treemap 数据
    const treemapData = {
        name: '色系',
        children: colorStats.map(c => ({
            name: c.color_family,
            size: c.netSales, // 面积 = 销售额
            netSales: c.netSales,
            units: c.units,
            skcCount: c.skcCount,
            sellThrough: c.sellThrough,
            marginRate: c.marginRate,
        })),
    };

    return (
        <div className="space-y-8">
            {/* ── Section 1: 色系分析 ─────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1 h-5 rounded-full bg-pink-400 inline-block" />
                    <h2 className="text-base font-bold text-slate-900">色系销售分布</h2>
                    <span className="text-xs text-slate-400 ml-1">— Treemap 面积 = 净销售额，● 绿色=售罄健康 ● 黄色=需关注</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Treemap */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <ResponsiveContainer width="100%" height={320}>
                            <Treemap
                                data={treemapData.children}
                                dataKey="size"
                                aspectRatio={4 / 3}
                                content={<ColorTreemapContent />}
                            >
                                <Tooltip content={<ColorTooltip />} />
                            </Treemap>
                        </ResponsiveContainer>
                    </div>

                    {/* 右侧排行榜 */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                            色系排行 · 净销售额
                        </div>
                        <div className="space-y-2">
                            {colorStats.map((c, i) => (
                                <div key={c.color_family} className="flex items-center gap-3">
                                    <span className="text-xs text-slate-300 w-4 text-right font-mono">{i + 1}</span>
                                    <span
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ background: COLOR_UI[c.color_family] || '#94a3b8' }}
                                    />
                                    <span className="text-sm text-slate-700 flex-1">{c.color_family}</span>
                                    <span className="text-xs font-semibold text-slate-900">{fmt万(c.netSales)}</span>
                                    <span className={`text-xs font-medium w-14 text-right ${c.sellThrough > 0.70 ? 'text-emerald-600' : 'text-amber-500'}`}>
                                        {fmtPct(c.sellThrough)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Section 2: 年龄段 × 产品线 ─────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1 h-5 rounded-full bg-pink-400 inline-block" />
                    <h2 className="text-base font-bold text-slate-900">人群画像 × 产品线</h2>
                    <span className="text-xs text-slate-400 ml-1">— 堆叠条形 = 各年龄段净销售额（万元），单位：万</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* 堆叠条形图 */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={ageBarData} layout="vertical" barSize={18}
                                margin={{ left: 12, right: 20, top: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `¥${v}万`} />
                                <YAxis type="category" dataKey="product_line" tick={{ fontSize: 11, fill: '#475569' }} width={72} />
                                <Tooltip formatter={(v) => [`¥${Number(v)}万`, '']} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                {ageGroups.map((ag, i) => (
                                    <Bar key={ag} dataKey={ag} stackId="a" fill={AGE_COLORS[i]}
                                        radius={i === ageGroups.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 年龄段销售占比 */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                            年龄段销售贡献
                        </div>
                        <div className="space-y-3">
                            {ageGroups.map((ag, i) => {
                                const t = ageTotals[ag] || { units: 0, netSales: 0 };
                                const total = Object.values(ageTotals).reduce((s, v: { units: number; netSales: number }) => s + v.netSales, 0);
                                const pct = total > 0 ? t.netSales / total : 0;
                                return (
                                    <div key={ag}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium text-slate-700">{ag} 岁</span>
                                            <span className="text-slate-500">{fmtPct(pct)}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full"
                                                style={{ width: `${pct * 100}%`, background: AGE_COLORS[i] }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                                产品线效率排行
                            </div>
                            {lineStats.slice(0, 5).map(l => (
                                <div key={l.product_line} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                                    <span className="text-xs text-slate-700 flex-1">{l.product_line}</span>
                                    <span className={`text-xs font-semibold ${l.sellThrough > 0.70 ? 'text-emerald-600' : 'text-amber-500'}`}>
                                        {fmtPct(l.sellThrough)}
                                    </span>
                                    <span className="text-xs text-slate-400">{l.skcCount} SKU</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
