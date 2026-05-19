'use client';
/**
 * src/components/dashboard/brand-positioning/PriceTierPyramid.tsx
 * 品牌定位金字塔 V2 — 精致化升级版：
 *   1. 每层用 linearGradient，顶部高光 → 底部阴影，立体厚度
 *   2. 品牌所在层：暖色 spotlight 光晕 + 品牌粉边线（不再黑描边）
 *   3. hover 其它层 → dim，当前层 brighten（聚光灯效果）
 *   4. 品牌名 italic serif 字体
 *   5. 虚线"战略向上"箭头：从 Camper 层 → 目标上一档（如国内一线）
 *
 * 数据驱动：层数、层名、价格区间、竞品全部来自 tier.tierLadder。
 */
import { useMemo, useState } from 'react';
import type { TierLadderEntry } from '@/types/brandPositioning';

interface Props {
    tierLadder: TierLadderEntry[];
    /** 品牌名 — 标在金字塔上品牌所在层 */
    brandName: string;
    className?: string;
}

const VIEWBOX_W = 600;
const VIEWBOX_H = 480;
const Y_AXIS_W = 60;
const Y_TICK_GAP = 14;
const PYRAMID_PAD_TOP = 24;
const PYRAMID_PAD_BOTTOM = 8;
const BASE_W_RATIO = 0.94;
const APEX_W_RATIO = 0.10;

/** 每层的渐变色对 — 从浅到深 */
const TIER_GRADIENTS: Array<{ top: string; bottom: string }> = [
    { top: '#fafbfc', bottom: '#eef2f6' }, // 0 顶层（最浅）
    { top: '#eef2f6', bottom: '#dde4ec' },
    { top: '#dde4ec', bottom: '#c4cdd8' },
    { top: '#a8b3c1', bottom: '#7c8794' },
    { top: '#6b7480', bottom: '#4b525c' },
    { top: '#4b525c', bottom: '#363b43' }, // 5 底层（最深）
];

/** 品牌粉色（沿用项目品牌色） */
const BRAND_PINK = '#ec4899';
const BRAND_PINK_GLOW = 'rgba(236,72,153,0.18)';

export default function PriceTierPyramid({ tierLadder, brandName, className = '' }: Props) {
    const [hovered, setHovered] = useState<string | null>(null);

    // 几何计算
    const { layers, yTicks, ownIndex, aspirationalIndex } = useMemo(() => {
        const n = tierLadder.length;
        const innerH = VIEWBOX_H - PYRAMID_PAD_TOP - PYRAMID_PAD_BOTTOM;
        const innerW = VIEWBOX_W - Y_AXIS_W;
        const layerH = innerH / n;
        const baseW = innerW * BASE_W_RATIO;
        const apexW = innerW * APEX_W_RATIO;

        type Layer = {
            entry: TierLadderEntry;
            index: number;
            top: number;
            bottom: number;
            topW: number;
            bottomW: number;
            midY: number;
        };

        const drawnLayers: Layer[] = tierLadder.map((entry, i) => {
            const top = PYRAMID_PAD_TOP + i * layerH;
            const bottom = top + layerH;
            const widthAt = (y: number) => {
                const t = (y - PYRAMID_PAD_TOP) / innerH;
                return apexW + (baseW - apexW) * t;
            };
            return {
                entry, index: i, top, bottom,
                topW: widthAt(top),
                bottomW: widthAt(bottom),
                midY: (top + bottom) / 2,
            };
        });

        const ticks: { y: number; value: number }[] = [];
        drawnLayers.forEach((l, i) => {
            ticks.push({ y: l.top, value: l.entry.priceRange[1] });
            if (i === drawnLayers.length - 1) {
                ticks.push({ y: l.bottom, value: l.entry.priceRange[0] });
            }
        });

        const ownIdx = drawnLayers.findIndex((l) => l.entry.isOwnTier);
        // 战略目标：往上一档
        const aspirationalIdx = ownIdx > 0 ? ownIdx - 1 : -1;

        return { layers: drawnLayers, yTicks: ticks, ownIndex: ownIdx, aspirationalIndex: aspirationalIdx };
    }, [tierLadder]);

    const isLayerDimmed = (l: typeof layers[0]) => {
        if (!hovered) return false;
        // hover 时，其它层（且非品牌层）淡化
        return hovered !== l.entry.tierId && !l.entry.isOwnTier;
    };

    const cx = Y_AXIS_W + (VIEWBOX_W - Y_AXIS_W) / 2;
    const ownLayer = ownIndex >= 0 ? layers[ownIndex] : null;
    const aspLayer = aspirationalIndex >= 0 ? layers[aspirationalIndex] : null;

    return (
        <div className={`relative ${className}`}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mb-2">价格区间 (¥)</div>
            <div className="flex justify-center gap-3">
                <svg viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`} className="w-full max-w-[680px] flex-shrink-0" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        {/* 每层渐变 */}
                        {layers.map((_, i) => {
                            const stop = TIER_GRADIENTS[Math.min(i, TIER_GRADIENTS.length - 1)];
                            return (
                                <linearGradient key={`grad-${i}`} id={`tier-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={stop.top} />
                                    <stop offset="100%" stopColor={stop.bottom} />
                                </linearGradient>
                            );
                        })}
                        {/* Camper spotlight 暖光晕 */}
                        <radialGradient id="own-spotlight" cx="50%" cy="50%" r="60%">
                            <stop offset="0%" stopColor={BRAND_PINK_GLOW} />
                            <stop offset="100%" stopColor="rgba(236,72,153,0)" />
                        </radialGradient>
                        {/* 箭头 marker */}
                        <marker
                            id="asp-arrow"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto"
                        >
                            <path d="M0,0 L10,5 L0,10 z" fill={BRAND_PINK} />
                        </marker>
                    </defs>

                    {/* Y 轴 */}
                    <line x1={Y_AXIS_W} y1={PYRAMID_PAD_TOP - 4} x2={Y_AXIS_W} y2={VIEWBOX_H - PYRAMID_PAD_BOTTOM + 4} stroke="#cbd5e1" strokeWidth="1" />
                    <polygon points={`${Y_AXIS_W - 4},${PYRAMID_PAD_TOP - 4} ${Y_AXIS_W + 4},${PYRAMID_PAD_TOP - 4} ${Y_AXIS_W},${PYRAMID_PAD_TOP - 10}`} fill="#cbd5e1" />
                    {yTicks.map((t, i) => (
                        <g key={`tick-${i}`}>
                            <line x1={Y_AXIS_W - 4} y1={t.y} x2={Y_AXIS_W} y2={t.y} stroke="#cbd5e1" strokeWidth="1" />
                            <text x={Y_AXIS_W - Y_TICK_GAP} y={t.y + 3} textAnchor="end" className="fill-slate-400" style={{ fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                                {t.value.toLocaleString()}{i === 0 ? '+' : ''}
                            </text>
                        </g>
                    ))}

                    {/* Camper spotlight 光晕（在金字塔图层"背后"先绘制） */}
                    {ownLayer && (
                        <ellipse
                            cx={cx}
                            cy={ownLayer.midY}
                            rx={Math.max(ownLayer.bottomW, ownLayer.topW) / 2 + 36}
                            ry={(ownLayer.bottom - ownLayer.top) / 2 + 22}
                            fill="url(#own-spotlight)"
                            style={{ filter: 'blur(4px)' }}
                        />
                    )}

                    {/* 金字塔层 */}
                    {layers.map((l) => {
                        const isHovered = hovered === l.entry.tierId;
                        const isOwn = !!l.entry.isOwnTier;
                        const dimmed = isLayerDimmed(l);
                        const x1 = cx - l.topW / 2;
                        const x2 = cx + l.topW / 2;
                        const x3 = cx + l.bottomW / 2;
                        const x4 = cx - l.bottomW / 2;
                        const stroke = isOwn ? BRAND_PINK : isHovered ? '#475569' : '#ffffff';
                        const strokeWidth = isOwn ? 1.6 : 1;
                        return (
                            <g
                                key={l.entry.tierId}
                                onMouseEnter={() => setHovered(l.entry.tierId)}
                                onMouseLeave={() => setHovered(null)}
                                style={{
                                    cursor: 'pointer',
                                    opacity: dimmed ? 0.42 : 1,
                                    transition: 'opacity 220ms ease',
                                }}
                            >
                                <polygon
                                    points={`${x1},${l.top} ${x2},${l.top} ${x3},${l.bottom} ${x4},${l.bottom}`}
                                    fill={`url(#tier-grad-${l.index})`}
                                    stroke={stroke}
                                    strokeWidth={strokeWidth}
                                />
                                {/* 品牌名（仅自有层）— italic serif，与 tier label 一起垂直居中到本层 */}
                                {isOwn && (
                                    <text
                                        x={cx}
                                        y={l.midY + 3}
                                        textAnchor="middle"
                                        fill="#0f172a"
                                        style={{
                                            fontSize: 22,
                                            fontWeight: 600,
                                            fontStyle: 'italic',
                                            fontFamily: '"Playfair Display", Georgia, "Times New Roman", serif',
                                            letterSpacing: '0.01em',
                                        }}
                                    >
                                        {brandName}
                                    </text>
                                )}
                                <text
                                    x={cx}
                                    y={isOwn ? l.midY + 20 : l.midY + 4}
                                    textAnchor="middle"
                                    className={isOwn ? 'fill-slate-700' : (l.index >= 3 ? 'fill-white/85' : 'fill-slate-600')}
                                    style={{ fontSize: 11 }}
                                >
                                    {l.entry.tierLabel}
                                </text>
                            </g>
                        );
                    })}

                    {/* 战略目标向上箭头（虚线，从品牌层 → 上一档） */}
                    {ownLayer && aspLayer && (
                        <g style={{ pointerEvents: 'none' }}>
                            <line
                                x1={cx + ownLayer.topW / 2 + 6}
                                y1={ownLayer.top + 4}
                                x2={cx + aspLayer.bottomW / 2 + 6}
                                y2={aspLayer.midY + 2}
                                stroke={BRAND_PINK}
                                strokeWidth="1.2"
                                strokeDasharray="3,3"
                                markerEnd="url(#asp-arrow)"
                                opacity="0.75"
                            />
                            <text
                                x={cx + ownLayer.topW / 2 + 12}
                                y={(ownLayer.top + aspLayer.bottom) / 2}
                                fill="#0f172a"
                                style={{ fontSize: 10, fontStyle: 'italic', letterSpacing: '0.05em' }}
                                opacity="0.85"
                            >
                                战略向上
                            </text>
                        </g>
                    )}
                </svg>

                {/* 右侧：每层竞品列表（高度跟随 SVG，via flex stretch） */}
                <div className="hidden md:flex flex-col relative flex-shrink-0" style={{ width: 280 }}>
                    {layers.map((l) => {
                        const topPct = (l.midY / VIEWBOX_H) * 100;
                        const isHovered = hovered === l.entry.tierId;
                        const isOwn = !!l.entry.isOwnTier;
                        const dimmed = hovered ? (!isHovered && !isOwn) : false;
                        return (
                            <div
                                key={`competitor-${l.entry.tierId}`}
                                onMouseEnter={() => setHovered(l.entry.tierId)}
                                onMouseLeave={() => setHovered(null)}
                                className={`absolute -translate-y-1/2 transition-all duration-200 ${
                                    isHovered || isOwn ? 'text-slate-800' : 'text-slate-400'
                                } ${dimmed ? 'opacity-40' : 'opacity-100'}`}
                                style={{ top: `${topPct}%`, left: 0, right: 0 }}
                            >
                                <div className="text-[12px] leading-6 flex flex-wrap items-center gap-x-1">
                                    {l.entry.competitors.map((c, i) => (
                                        <span key={c} className="inline-flex items-center">
                                            {i > 0 && <span className="text-slate-300 mx-1.5">·</span>}
                                            <span>{c}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 移动端：表格化竞品列表 */}
            <div className="md:hidden mt-3 space-y-1.5">
                {layers.map((l) => (
                    <div key={`m-${l.entry.tierId}`} className="text-[12px] flex gap-2">
                        <span className={`flex-shrink-0 w-32 ${l.entry.isOwnTier ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>{l.entry.tierLabel}</span>
                        <span className="text-slate-600">{l.entry.competitors.join(' · ')}</span>
                    </div>
                ))}
            </div>

            {/* Hover 详情 */}
            {hovered && (() => {
                const l = layers.find((x) => x.entry.tierId === hovered);
                if (!l) return null;
                return (
                    <div className="mt-3 text-[11px] text-slate-500 leading-5">
                        <span className="text-slate-800 font-medium">{l.entry.tierLabel}</span>
                        <span className="mx-2 text-slate-300">·</span>
                        <span className="font-mono tabular-nums">¥{l.entry.priceRange[0].toLocaleString()} - ¥{l.entry.priceRange[1].toLocaleString()}</span>
                        <span className="mx-2 text-slate-300">·</span>
                        <span>{l.entry.competitors.join('、')}</span>
                    </div>
                );
            })()}
        </div>
    );
}
