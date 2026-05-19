'use client';
/**
 * src/components/dashboard/brand-positioning/StyleQuadrant.tsx
 * 风格象限图 — 双轴（极简↔极繁 / 前卫↔大众）+ 关键词云 + 品牌定位点（可拖拽）。
 *
 * 智能：
 *   - 关键词坐标 (-1..1) 来自数据，自动映射到 SVG
 *   - 中央圆内的关键词字号略大，象征"品牌覆盖区"
 *   - 品牌定位点呼吸闪烁 + 可鼠标拖拽
 *   - 拖拽位置自动持久化到 localStorage（key = bp:quadrant:brand-pos:{brandName}）
 *   - 上季度位置 → 漂移箭头（虚线）
 *   - 可选竞品位置（半透明灰点）
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StyleQuadrant as StyleQuadrantData } from '@/types/brandPositioning';

interface Props {
    data: StyleQuadrantData;
    brandName: string;
    className?: string;
}

const VB = 600;
const PAD = 36;
const CENTER = VB / 2;
const HALF = (VB - PAD * 2) / 2;
const CIRCLE_R = HALF * 0.62;
/** 轴端标签距离轴线端点向外的距离 — 越大越靠近 viewport 边缘 */
const LABEL_OUTSET = 18;
/** viewBox 水平外扩量 — 给极简/极繁标签的水平方向背景留出空间，避免被裁切 */
const VB_PAD_X = 44;
/** viewBox 垂直外扩量 — 给前卫/大众标签同样留空间，保持对称 */
const VB_PAD_Y = 44;

function toX(x: number) { return CENTER + x * HALF; }
function toY(y: number) { return CENTER - y * HALF; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

export default function StyleQuadrant({ data, brandName, className = '' }: Props) {
    const [showCompetitors, setShowCompetitors] = useState(false);
    const [showDrift, setShowDrift] = useState(true);

    const storageKey = `bp:quadrant:brand-pos:${brandName}`;
    const circleKey = `bp:quadrant:circle-pos:${brandName}`;

    // 品牌位置 + hydration 状态合并到一个 state，避免单 effect 里多次 setState
    const [state, setState] = useState<{ pos: { x: number; y: number }; hydrated: boolean }>({
        pos: data.brandPosition,
        hydrated: false,
    });
    const { pos, hydrated } = state;
    const [dragging, setDragging] = useState(false);

    // 灰圆位置（默认在中心 0,0）
    const [circleState, setCircleState] = useState<{ pos: { x: number; y: number }; hydrated: boolean }>({
        pos: { x: 0, y: 0 },
        hydrated: false,
    });
    const circlePos = circleState.pos;
    const [draggingCircle, setDraggingCircle] = useState(false);
    const [circleDragStart, setCircleDragStart] = useState<{ offsetX: number; offsetY: number } | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);

    const setPos = (next: { x: number; y: number }) => {
        setState((s) => ({ ...s, pos: next }));
    };

    useEffect(() => {
        let nextPos = data.brandPosition;
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
                        nextPos = { x: parsed.x, y: parsed.y };
                    }
                }
            } catch { /* noop */ }
        }
        setState({ pos: nextPos, hydrated: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey]);

    useEffect(() => {
        if (!hydrated || typeof window === 'undefined') return;
        try { localStorage.setItem(storageKey, JSON.stringify(pos)); } catch { /* noop */ }
    }, [pos, storageKey, hydrated]);

    // 灰圆位置 hydration
    useEffect(() => {
        let next = { x: 0, y: 0 };
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(circleKey);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
                        next = { x: parsed.x, y: parsed.y };
                    }
                }
            } catch { /* noop */ }
        }
        setCircleState({ pos: next, hydrated: true });
    }, [circleKey]);

    useEffect(() => {
        if (!circleState.hydrated || typeof window === 'undefined') return;
        try { localStorage.setItem(circleKey, JSON.stringify(circlePos)); } catch { /* noop */ }
    }, [circlePos, circleKey, circleState.hydrated]);

    // 拖拽：把鼠标坐标转成 SVG viewBox 坐标，再转成归一化的 (-1..1)
    const clientToNormalized = useCallback((clientX: number, clientY: number) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        const svgX = ((clientX - rect.left) / rect.width) * (VB + VB_PAD_X * 2) - VB_PAD_X;
        const svgY = ((clientY - rect.top) / rect.height) * (VB + VB_PAD_Y * 2) - VB_PAD_Y;
        const nx = (svgX - CENTER) / HALF;
        const ny = -(svgY - CENTER) / HALF; // SVG y 向下，归一化 y 向上
        return { x: clamp(nx, -1, 1), y: clamp(ny, -1, 1) };
    }, []);

    // 品牌点拖拽 effect
    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => {
            const p = clientToNormalized(e.clientX, e.clientY);
            if (p) setState((s) => ({ ...s, pos: p }));
        };
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches[0]) {
                const p = clientToNormalized(e.touches[0].clientX, e.touches[0].clientY);
                if (p) setState((s) => ({ ...s, pos: p }));
            }
        };
        const onUp = () => setDragging(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onTouchMove);
        window.addEventListener('touchend', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onUp);
        };
    }, [dragging, clientToNormalized]);

    // 灰圆拖拽 effect — 用 dragStart 记录鼠标按下时圆心和鼠标的偏移，移动时维持
    useEffect(() => {
        if (!draggingCircle || !circleDragStart) return;
        const handle = (clientX: number, clientY: number) => {
            const p = clientToNormalized(clientX, clientY);
            if (!p) return;
            const next = {
                x: clamp(p.x - circleDragStart.offsetX, -1, 1),
                y: clamp(p.y - circleDragStart.offsetY, -1, 1),
            };
            setCircleState((s) => ({ ...s, pos: next }));
        };
        const onMove = (e: MouseEvent) => handle(e.clientX, e.clientY);
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches[0]) handle(e.touches[0].clientX, e.touches[0].clientY);
        };
        const onUp = () => { setDraggingCircle(false); setCircleDragStart(null); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onTouchMove);
        window.addEventListener('touchend', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onUp);
        };
    }, [draggingCircle, circleDragStart, clientToNormalized]);

    const brandX = toX(pos.x);
    const brandY = toY(pos.y);
    const prevX = data.previousPosition ? toX(data.previousPosition.x) : null;
    const prevY = data.previousPosition ? toY(data.previousPosition.y) : null;

    const isDefaultPos = pos.x === data.brandPosition.x && pos.y === data.brandPosition.y;
    const resetPos = () => setPos(data.brandPosition);
    const isDefaultCircle = circlePos.x === 0 && circlePos.y === 0;
    const resetCircle = () => setCircleState((s) => ({ ...s, pos: { x: 0, y: 0 } }));
    const circleCX = toX(circlePos.x);
    const circleCY = toY(circlePos.y);

    const onCircleMouseDown = (e: React.MouseEvent<SVGCircleElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const start = clientToNormalized(e.clientX, e.clientY);
        if (!start) return;
        setCircleDragStart({ offsetX: start.x - circlePos.x, offsetY: start.y - circlePos.y });
        setDraggingCircle(true);
    };
    const onCircleTouchStart = (e: React.TouchEvent<SVGCircleElement>) => {
        if (!e.touches[0]) return;
        e.preventDefault();
        e.stopPropagation();
        const start = clientToNormalized(e.touches[0].clientX, e.touches[0].clientY);
        if (!start) return;
        setCircleDragStart({ offsetX: start.x - circlePos.x, offsetY: start.y - circlePos.y });
        setDraggingCircle(true);
    };

    return (
        <div className={`relative ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Style Quadrant</div>
                <div className="flex items-center gap-3 text-[11px]">
                    {data.previousPosition && (
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={showDrift}
                                onChange={(e) => setShowDrift(e.target.checked)}
                                className="w-3 h-3 accent-slate-700"
                            />
                            <span className="text-slate-500">显示季度漂移</span>
                        </label>
                    )}
                    {data.competitorPositions && data.competitorPositions.length > 0 && (
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={showCompetitors}
                                onChange={(e) => setShowCompetitors(e.target.checked)}
                                className="w-3 h-3 accent-slate-700"
                            />
                            <span className="text-slate-500">显示竞品位置</span>
                        </label>
                    )}
                    {!isDefaultPos && (
                        <button
                            type="button"
                            onClick={resetPos}
                            className="text-slate-400 hover:text-slate-700 underline-offset-2 hover:underline"
                        >
                            ↺ 重置品牌位置
                        </button>
                    )}
                    {!isDefaultCircle && (
                        <button
                            type="button"
                            onClick={resetCircle}
                            className="text-slate-400 hover:text-slate-700 underline-offset-2 hover:underline"
                        >
                            ↺ 重置舒适区
                        </button>
                    )}
                </div>
            </div>

            <svg
                ref={svgRef}
                viewBox={`${-VB_PAD_X} ${-VB_PAD_Y} ${VB + VB_PAD_X * 2} ${VB + VB_PAD_Y * 2}`}
                className="w-full max-w-[680px] mx-auto block select-none"
                style={{ touchAction: dragging || draggingCircle ? 'none' : 'auto' }}
            >
                {/* 中央灰圆（品牌"舒适区" — 可拖拽） */}
                <circle
                    cx={circleCX}
                    cy={circleCY}
                    r={CIRCLE_R}
                    fill="#e2e8f0"
                    fillOpacity={draggingCircle ? 0.8 : 0.6}
                    stroke={draggingCircle ? '#94a3b8' : 'transparent'}
                    strokeWidth="1"
                    onMouseDown={onCircleMouseDown}
                    onTouchStart={onCircleTouchStart}
                    style={{ cursor: draggingCircle ? 'grabbing' : 'grab', transition: 'fill-opacity 120ms ease' }}
                />

                {/* 主轴线 */}
                <line x1={PAD} y1={CENTER} x2={VB - PAD} y2={CENTER} stroke="#94a3b8" strokeWidth="0.8" />
                <line x1={CENTER} y1={PAD} x2={CENTER} y2={VB - PAD} stroke="#94a3b8" strokeWidth="0.8" />

                {/* 4 个轴端标签（带圆角灰底框）— 比 PAD 更向外 LABEL_OUTSET */}
                <AxisLabelBox cx={CENTER} cy={PAD - LABEL_OUTSET} text={data.axes.y.top} />
                <AxisLabelBox cx={CENTER} cy={VB - PAD + LABEL_OUTSET} text={data.axes.y.bottom} />
                <AxisLabelBox cx={PAD - LABEL_OUTSET} cy={CENTER} text={data.axes.x.left} align="right" />
                <AxisLabelBox cx={VB - PAD + LABEL_OUTSET} cy={CENTER} text={data.axes.x.right} align="left" />

                {/* 4 个角的"极端"标签 */}
                <CornerLabel cx={PAD + 4}  cy={PAD + 16}        text={data.cornerLabels.topLeft}     align="left" />
                <CornerLabel cx={VB - PAD - 4} cy={PAD + 16}    text={data.cornerLabels.topRight}    align="right" />
                <CornerLabel cx={PAD + 4}  cy={VB - PAD - 8}    text={data.cornerLabels.bottomLeft}  align="left" />
                <CornerLabel cx={VB - PAD - 4} cy={VB - PAD - 8} text={data.cornerLabels.bottomRight} align="right" />

                {/* 关键词云 */}
                {data.keywords.map((k) => (
                    <text
                        key={k.keyword}
                        x={toX(k.x)}
                        y={toY(k.y)}
                        textAnchor="middle"
                        className={k.inCircle ? 'fill-slate-700' : 'fill-slate-400'}
                        style={{ fontSize: k.inCircle ? 13 : 11, pointerEvents: 'none' }}
                    >
                        {k.keyword}
                    </text>
                ))}

                {/* 竞品定位点 */}
                {showCompetitors && data.competitorPositions?.map((c) => (
                    <g key={`comp-${c.name}`} style={{ pointerEvents: 'none' }}>
                        <circle cx={toX(c.x)} cy={toY(c.y)} r="5" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
                        <text x={toX(c.x) + 8} y={toY(c.y) + 4} className="fill-slate-500" style={{ fontSize: 10 }}>
                            {c.name}
                        </text>
                    </g>
                ))}

                {/* 漂移箭头：上季 → 本季（实时跟随拖拽） */}
                {showDrift && prevX !== null && prevY !== null && (
                    <>
                        <defs>
                            <marker id="drift-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                                <path d="M0,0 L10,5 L0,10 z" fill="#0f172a" />
                            </marker>
                        </defs>
                        <line
                            x1={prevX} y1={prevY} x2={brandX} y2={brandY}
                            stroke="#0f172a"
                            strokeWidth="1.2"
                            strokeDasharray="3,3"
                            markerEnd="url(#drift-arrow)"
                            style={{ pointerEvents: 'none' }}
                        />
                        <circle cx={prevX} cy={prevY} r="3" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" style={{ pointerEvents: 'none' }} />
                        <text x={prevX + 6} y={prevY - 6} className="fill-slate-400" style={{ fontSize: 10, pointerEvents: 'none' }}>上季</text>
                    </>
                )}

                {/* 品牌定位点（呼吸 + 可拖拽 + 重点） */}
                <g
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
                    onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
                    style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                >
                    {/* 拖拽热区（透明大圆，方便点击） */}
                    <circle cx={brandX} cy={brandY} r="22" fill="transparent" />
                    {/* 呼吸光晕 */}
                    <circle
                        cx={brandX}
                        cy={brandY}
                        r="14"
                        fill="#0f172a"
                        fillOpacity={dragging ? 0.18 : 0.10}
                        className="origin-center"
                        style={{ animation: dragging ? 'none' : 'sq-brand-pulse 2.4s ease-in-out infinite', pointerEvents: 'none' }}
                    />
                    {/* 实点 */}
                    <circle
                        cx={brandX}
                        cy={brandY}
                        r={dragging ? 7 : 6}
                        fill="#0f172a"
                        stroke="#ffffff"
                        strokeWidth={dragging ? 1.5 : 0}
                        style={{ pointerEvents: 'none', transition: 'r 120ms ease' }}
                    />
                    <text
                        x={brandX}
                        y={brandY - 14}
                        textAnchor="middle"
                        className="fill-slate-900"
                        style={{ fontSize: 13, fontWeight: 600, pointerEvents: 'none' }}
                    >
                        {brandName}
                    </text>
                </g>

                <style>{`
                    @keyframes sq-brand-pulse {
                        0%, 100% { transform: scale(1); opacity: 0.4; }
                        50%      { transform: scale(1.5); opacity: 0.1; }
                    }
                `}</style>
            </svg>

            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-y-1">
                <div>
                    <span className="font-medium text-slate-700">{brandName}</span> 当前定位 ·
                    <span className="ml-1.5 font-mono tabular-nums">
                        {data.axes.x.left}({pos.x.toFixed(2)}) / {data.axes.y.top}({pos.y.toFixed(2)})
                    </span>
                    {data.previousPosition && showDrift && (
                        <>
                            <span className="mx-2 text-slate-300">·</span>
                            <span>较上季漂移 <span className="font-mono tabular-nums">Δx={(pos.x - data.previousPosition.x).toFixed(2)}, Δy={(pos.y - data.previousPosition.y).toFixed(2)}</span></span>
                        </>
                    )}
                </div>
                <span className="text-slate-300">↔ 可拖拽品牌点自由定位</span>
            </div>
        </div>
    );
}

function AxisLabelBox({ cx, cy, text, align = 'center' }: { cx: number; cy: number; text: string; align?: 'left' | 'center' | 'right' }) {
    const tw = text.length * 13 + 14;
    const th = 22;
    const x = align === 'right' ? cx - tw : align === 'left' ? cx : cx - tw / 2;
    const y = cy - th / 2;
    return (
        <g style={{ pointerEvents: 'none' }}>
            <rect x={x} y={y} width={tw} height={th} rx="3" ry="3" fill="#94a3b8" />
            <text x={x + tw / 2} y={y + th / 2 + 4} textAnchor="middle" className="fill-white" style={{ fontSize: 11, fontWeight: 600 }}>
                {text}
            </text>
        </g>
    );
}

function CornerLabel({ cx, cy, text, align }: { cx: number; cy: number; text: string; align: 'left' | 'right' }) {
    return (
        <text
            x={cx}
            y={cy}
            textAnchor={align === 'right' ? 'end' : 'start'}
            className="fill-slate-800"
            style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', pointerEvents: 'none' }}
        >
            {text}
        </text>
    );
}
