'use client';
/**
 * src/components/dashboard/channel/TemperatureMatrixPanel.tsx
 * S5b: 区域 × 温度敏感品类热力图（7区域 × 7品类 + 自动建议）
 */
import { useState } from 'react';
import matrixData from '../../../../data/planning/channel_temperature_matrix.json';

interface CellData {
    category: string;
    salesContrib: number;
    climateMatch: number;
    suggestion: string | null;
}

interface RegionData {
    region: string;
    data: CellData[];
}

const data = matrixData as {
    generatedAt: string;
    categories: string[];
    regions: string[];
    matrix: RegionData[];
    autoSuggestions: string[];
};

type HeatMode = 'climateMatch' | 'salesContrib';

function getHeatColor(value: number, mode: HeatMode): string {
    // 0-1 range
    if (mode === 'climateMatch') {
        if (value >= 0.85) return 'bg-emerald-500 text-white';
        if (value >= 0.70) return 'bg-emerald-300 text-emerald-900';
        if (value >= 0.55) return 'bg-amber-200 text-amber-900';
        if (value >= 0.40) return 'bg-orange-300 text-orange-900';
        return 'bg-rose-400 text-white';
    } else {
        if (value >= 0.22) return 'bg-blue-500 text-white';
        if (value >= 0.16) return 'bg-blue-300 text-blue-900';
        if (value >= 0.10) return 'bg-sky-200 text-sky-900';
        if (value >= 0.06) return 'bg-slate-200 text-slate-700';
        return 'bg-slate-100 text-slate-400';
    }
}

export default function TemperatureMatrixPanel() {
    const [mode, setMode] = useState<HeatMode>('climateMatch');
    const [hoveredCell, setHoveredCell] = useState<{ region: string; category: string; suggestion: string } | null>(null);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-5 rounded-full bg-orange-400 inline-block" />
                <h3 className="text-base font-bold text-slate-900">区域 × 温度敏感品类热力图 🌡️</h3>
                <div className="ml-auto flex gap-1">
                    <button
                        onClick={() => setMode('climateMatch')}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${mode === 'climateMatch' ? 'bg-orange-500 text-white border-orange-400' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        气候适配度
                    </button>
                    <button
                        onClick={() => setMode('salesContrib')}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${mode === 'salesContrib' ? 'bg-blue-500 text-white border-blue-400' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        销售贡献
                    </button>
                </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">
                鞋类业务核心维度：南方常温（凉鞋/板鞋）vs 北方四季（棉鞋/短靴）。
                Hover 格子查看建议。{mode === 'climateMatch' ? '🟢高适配 🟡中 🔴低适配' : '🔵高销售贡献 → 浅=低'}
            </p>

            {/* 热力图 */}
            <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0.5 text-[11px]">
                    <thead>
                        <tr>
                            <th className="text-left text-[10px] text-slate-400 font-normal px-2 py-1 w-14">大区</th>
                            {data.categories.map(cat => (
                                <th key={cat} className="text-center text-[10px] text-slate-600 font-medium px-1 py-1 min-w-12">
                                    {cat}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.matrix.map(row => (
                            <tr key={row.region}>
                                <td className="text-[11px] font-semibold text-slate-700 px-2 py-1">{row.region}</td>
                                {data.categories.map(cat => {
                                    const cell = row.data.find(d => d.category === cat);
                                    if (!cell) return <td key={cat} className="bg-slate-100 rounded px-1 py-1.5 text-center text-slate-300">—</td>;
                                    const val = mode === 'climateMatch' ? cell.climateMatch : cell.salesContrib;
                                    const colorCls = getHeatColor(val, mode);
                                    const hasAlert = !!cell.suggestion;
                                    return (
                                        <td
                                            key={cat}
                                            className={`rounded px-1 py-1.5 text-center font-medium cursor-pointer transition-transform hover:scale-105 relative ${colorCls}`}
                                            onMouseEnter={() => cell.suggestion && setHoveredCell({ region: row.region, category: cat, suggestion: cell.suggestion! })}
                                            onMouseLeave={() => setHoveredCell(null)}
                                        >
                                            {mode === 'climateMatch'
                                                ? `${Math.round(val * 100)}%`
                                                : `${Math.round(val * 100)}%`}
                                            {hasAlert && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full border border-white" />}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Hover 提示 */}
            {hoveredCell && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    💡 <strong>{hoveredCell.region} · {hoveredCell.category}</strong>：{hoveredCell.suggestion}
                </div>
            )}

            {/* 自动建议 */}
            <div className="mt-3 space-y-1.5">
                <div className="text-[10px] font-semibold text-slate-600 mb-1">🤖 自动建议</div>
                {data.autoSuggestions.map((s, i) => (
                    <div key={i} className="text-[11px] text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100">
                        → {s}
                    </div>
                ))}
            </div>

            {/* 图例 */}
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-500">
                {mode === 'climateMatch' ? (
                    <>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />≥85%高适配</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block" />55-70%中等</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-400 inline-block" />&lt;40%低适配</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block border border-white" />有建议</span>
                    </>
                ) : (
                    <>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" />≥22%高贡献</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-200 inline-block" />10-16%中等</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 inline-block" />&lt;6%低贡献</span>
                    </>
                )}
            </div>
        </div>
    );
}
