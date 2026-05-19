'use client';
/**
 * src/components/dashboard/channel/ConsumerPreferenceRadar.tsx
 * S11b: 区域消费者偏好雷达图（6维度）
 */
import { useState } from 'react';
import preferenceData from '../../../../data/planning/channel_consumer_preference.json';

interface RegionPreference {
    region: string;
    scores: number[];
    topCategory: string;
    insight: string;
}

const data = preferenceData as {
    generatedAt: string;
    dimensions: string[];
    regions: RegionPreference[];
};

// SVG 雷达图实现
function RadarChart({ scores, dimensions, size = 120 }: { scores: number[]; dimensions: string[]; size?: number }) {
    const n = dimensions.length;
    const cx = size / 2;
    const cy = size / 2;
    const r = (size / 2) * 0.72;
    const labelR = (size / 2) * 0.92;

    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2;

    function polarToXY(angle: number, radius: number) {
        return {
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle),
        };
    }

    // 网格线（3层）
    const gridLevels = [0.33, 0.66, 1.0];

    // 数据多边形
    const dataPoints = scores.map((score, i) => {
        const angle = startAngle + i * angleStep;
        const ratio = Math.min(score / 100, 1);
        return polarToXY(angle, r * ratio);
    });
    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

    return (
        <svg width={size} height={size} className="overflow-visible">
            {/* 网格 */}
            {gridLevels.map((level) => {
                const pts = Array.from({ length: n }, (_, i) => {
                    const angle = startAngle + i * angleStep;
                    const p = polarToXY(angle, r * level);
                    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                });
                return (
                    <polygon
                        key={level}
                        points={pts.join(' ')}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                    />
                );
            })}
            {/* 轴线 */}
            {Array.from({ length: n }, (_, i) => {
                const angle = startAngle + i * angleStep;
                const end = polarToXY(angle, r);
                return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#e2e8f0" strokeWidth="1" />;
            })}
            {/* 数据面 */}
            <path d={dataPath} fill="rgba(99,102,241,0.20)" stroke="#6366f1" strokeWidth="1.5" />
            {/* 数据点 */}
            {dataPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#6366f1" />
            ))}
            {/* 维度标签 */}
            {dimensions.map((dim, i) => {
                const angle = startAngle + i * angleStep;
                const lp = polarToXY(angle, labelR);
                const anchor = lp.x < cx - 4 ? 'end' : lp.x > cx + 4 ? 'start' : 'middle';
                return (
                    <text
                        key={dim}
                        x={lp.x}
                        y={lp.y + 2}
                        textAnchor={anchor}
                        fontSize="8"
                        fill="#64748b"
                        fontWeight="500"
                    >
                        {dim}
                    </text>
                );
            })}
        </svg>
    );
}

const SCORE_LABELS: Record<number, string> = {
    90: '极强',
    80: '强',
    70: '中强',
    60: '中',
    50: '弱中',
};

function getScoreLabel(score: number): string {
    if (score >= 90) return '极强';
    if (score >= 80) return '强';
    if (score >= 70) return '中强';
    if (score >= 60) return '中';
    return '弱';
}

export default function ConsumerPreferenceRadar() {
    const [selected, setSelected] = useState<string | null>(null);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-5 rounded-full bg-indigo-500 inline-block" />
                <h3 className="text-base font-bold text-slate-900">区域消费者偏好雷达图</h3>
                <span className="ml-auto text-[10px] text-slate-400">{data.generatedAt} 更新</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
                每区域 6 维消费者偏好雷达（0-100分）。用于反馈设计 Tab 做"区域专属设计建议"。
                点击卡片查看详细解读。
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {data.regions.map((r) => {
                    const topIdx = r.scores.indexOf(Math.max(...r.scores));
                    const isSelected = selected === r.region;
                    return (
                        <div
                            key={r.region}
                            className={`rounded-xl border p-3 cursor-pointer transition-all ${isSelected ? 'border-indigo-300 bg-indigo-50 shadow-md' : 'border-slate-100 bg-slate-50/60 hover:border-indigo-200 hover:bg-indigo-50/40'}`}
                            onClick={() => setSelected(isSelected ? null : r.region)}
                        >
                            <div className="text-center text-sm font-bold text-slate-800 mb-1">{r.region}</div>
                            <div className="flex justify-center mb-1">
                                <RadarChart scores={r.scores} dimensions={data.dimensions} size={110} />
                            </div>
                            <div className="text-[9px] text-center text-indigo-600 font-medium mb-1">
                                主购：{r.topCategory}
                            </div>
                            <div className="text-[9px] text-slate-500 text-center">
                                最强：{data.dimensions[topIdx]}（{r.scores[topIdx]}分）
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 详细解读面板 */}
            {selected && (() => {
                const r = data.regions.find(x => x.region === selected);
                if (!r) return null;
                return (
                    <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-bold text-indigo-800">{r.region} — 消费者偏好详情</span>
                            <button onClick={() => setSelected(null)} className="ml-auto text-[10px] text-indigo-400 hover:text-indigo-600">✕ 关闭</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                            {data.dimensions.map((dim, i) => (
                                <div key={dim} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-indigo-100">
                                    <div className="w-10 bg-slate-100 rounded-full h-1.5">
                                        <div
                                            className="h-1.5 rounded-full bg-indigo-500"
                                            style={{ width: `${r.scores[i]}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-600">{dim}</span>
                                    <span className="ml-auto text-[10px] font-bold text-indigo-700">{r.scores[i]}</span>
                                </div>
                            ))}
                        </div>
                        <div className="text-xs text-indigo-800 bg-white/70 rounded-lg px-3 py-2 border border-indigo-100">
                            💡 {r.insight}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
