'use client';
/**
 * src/components/dashboard/brand-positioning/MoodCollage.tsx
 *
 * 通用 mood 图拼贴组件。
 *
 * 特性：
 *   1. 数量可调 (1-9)，通过卡片底部 +/- 按钮控制；localStorage 持久化
 *   2. 5 个 variant 版式 (magazine / tall-left / center-tall / grid / row)，
 *      每个 variant 对不同 count 有合适的布局模板，超出范围 fallback 到 N 列网格
 *   3. 支持图片拖拽换位（按 imageIdx 而非位置）+ 拖图上传 + 重置顺序
 *   4. 所有交互的 storage key 都以 storagePrefix 为命名空间，不同 section 互不影响
 *
 * 使用：
 *   <MoodCollage
 *     images={data.moodImages}        // (string | null)[]
 *     variant="magazine"               // 见 MoodCollageVariant
 *     storagePrefix="bp:philosophy"    // localStorage 命名空间
 *     label="Mood"                     // 占位文字基础 label
 *   />
 */
import { useEffect, useState, type ReactNode } from 'react';
import DraggableMoodSlot, { useMoodOrder } from './DraggableMoodSlot';

/** ImageSlot 渲染回调的入参 — 与 BrandPositioningPanel 内的 ImageSlot 对齐 */
export interface ImageSlotProps {
    url?: string;
    label?: string;
    ratio?: string;
    className?: string;
    slotKey?: string;
}

export type MoodCollageVariant =
    | 'magazine'    // 大图 + 小图组合，适合品牌理念/系列
    | 'tall-left'   // 左侧高图 + 右侧方阵，适合客群 portrait
    | 'center-tall' // 两边方块 + 中间高图，适合生活方式
    | 'grid'        // 纯方阵 N×N，适合职业
    | 'row';        // 单排横排，适合品牌风格

interface Props {
    images: (string | null)[];
    variant: MoodCollageVariant;
    storagePrefix: string;
    label: string;
    minCount?: number;
    maxCount?: number;
    /** 透传给 ImageSlot 的额外 className（一般不需要） */
    slotClassName?: string;
    /** 图位渲染器自定义：默认 ImageSlot 占位组件 */
    renderImageSlot: (props: ImageSlotProps) => ReactNode;
}

const DEFAULT_MIN = 1;
const DEFAULT_MAX = 9;

export default function MoodCollage({
    images, variant, storagePrefix, label,
    minCount = DEFAULT_MIN, maxCount = DEFAULT_MAX,
    slotClassName = 'h-full',
    renderImageSlot,
}: Props) {
    const countKey = `${storagePrefix}:count`;
    const defaultCount = Math.min(Math.max(images.length, minCount), maxCount);

    const [state, setState] = useState<{ count: number; hydrated: boolean }>({ count: defaultCount, hydrated: false });
    const { count, hydrated } = state;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        let next = defaultCount;
        try {
            const stored = localStorage.getItem(countKey);
            if (stored) {
                const n = parseInt(stored, 10);
                if (Number.isInteger(n) && n >= minCount && n <= maxCount) next = n;
            }
        } catch { /* noop */ }
        // eslint-disable-next-line
        setState({ count: next, hydrated: true });
    }, [countKey, defaultCount, minCount, maxCount]);

    useEffect(() => {
        if (!hydrated || typeof window === 'undefined') return;
        try { localStorage.setItem(countKey, String(count)); } catch { /* noop */ }
    }, [count, countKey, hydrated]);

    // 图位的拖拽换位 — order 长度跟 count 走，count 改了 order 重置
    const orderKey = `${storagePrefix}:order:${count}`;
    const { order, swap, reset, isDefault } = useMoodOrder(orderKey, count);
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    const inc = () => setState((s) => ({ ...s, count: Math.min(s.count + 1, maxCount) }));
    const dec = () => setState((s) => ({ ...s, count: Math.max(s.count - 1, minCount) }));

    const renderSlot = (slotIndex: number) => {
        const imageIdx = order[slotIndex] ?? slotIndex;
        return (
            <DraggableMoodSlot
                slotIndex={slotIndex}
                dragIdx={dragIdx}
                onDragStart={setDragIdx}
                onDragEnd={() => setDragIdx(null)}
                onDrop={swap}
            >
                {renderImageSlot({
                    url: images[imageIdx] ?? undefined,
                    label: `${label} · ${String(imageIdx + 1).padStart(2, '0')}`,
                    ratio: '',
                    className: slotClassName,
                    slotKey: `${storagePrefix}:${imageIdx}`,
                })}
            </DraggableMoodSlot>
        );
    };

    return (
        <div className="flex flex-col gap-2 h-full">
            {renderVariant(variant, count, renderSlot)}
            <div className="flex items-center justify-end gap-3 text-[10px]">
                {!isDefault && (
                    <button
                        type="button"
                        onClick={reset}
                        className="text-slate-400 hover:text-slate-700 underline-offset-2 hover:underline"
                    >
                        ↺ 重置顺序
                    </button>
                )}
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={dec}
                        disabled={count <= minCount}
                        className="w-5 h-5 rounded-full border border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-sm leading-none"
                        title="减少图片"
                    >
                        −
                    </button>
                    <span className="font-mono tabular-nums text-slate-700 min-w-[14px] text-center">{count}</span>
                    <button
                        type="button"
                        onClick={inc}
                        disabled={count >= maxCount}
                        className="w-5 h-5 rounded-full border border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-sm leading-none"
                        title="增加图片"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── 5 个 variant 的布局函数 ─────────────────────────────────────────── */

type SlotRenderer = (i: number) => ReactNode;

function renderVariant(variant: MoodCollageVariant, n: number, slot: SlotRenderer): ReactNode {
    if (n === 1) return <div className="h-full min-h-[280px]">{slot(0)}</div>;
    switch (variant) {
        case 'magazine':    return magazineLayout(n, slot);
        case 'tall-left':   return tallLeftLayout(n, slot);
        case 'center-tall': return centerTallLayout(n, slot);
        case 'grid':        return gridLayout(n, slot);
        case 'row':         return rowLayout(n, slot);
        default:            return gridLayout(n, slot);
    }
}

/** magazine — 大图 + 小图磁贴：count 4/5 用 PPT 原版式，其余智能 fallback */
function magazineLayout(n: number, slot: SlotRenderer): ReactNode {
    if (n === 2) {
        return (
            <div className="grid grid-cols-2 gap-2 h-full min-h-[280px]">
                {slot(0)}{slot(1)}
            </div>
        );
    }
    if (n === 3) {
        return (
            <div className="grid grid-cols-3 grid-rows-2 gap-2 h-full min-h-[300px]">
                <div className="col-span-2 row-span-2">{slot(0)}</div>
                <div>{slot(1)}</div>
                <div>{slot(2)}</div>
            </div>
        );
    }
    if (n === 4) {
        return (
            <div className="grid grid-cols-3 grid-rows-3 gap-2 h-full min-h-[420px]">
                <div className="col-span-2 row-span-2">{slot(0)}</div>
                <div>{slot(1)}</div>
                <div>{slot(2)}</div>
                <div className="col-span-3">{slot(3)}</div>
            </div>
        );
    }
    if (n === 5) {
        return (
            <div className="grid grid-cols-3 grid-rows-3 gap-2 h-full min-h-[420px]">
                <div className="col-span-2 row-span-2">{slot(0)}</div>
                <div>{slot(1)}</div>
                <div>{slot(2)}</div>
                <div>{slot(3)}</div>
                <div className="col-span-2">{slot(4)}</div>
            </div>
        );
    }
    if (n === 6) {
        return (
            <div className="grid grid-cols-3 grid-rows-3 gap-2 h-full min-h-[420px]">
                <div className="col-span-2 row-span-2">{slot(0)}</div>
                <div>{slot(1)}</div>
                <div>{slot(2)}</div>
                <div>{slot(3)}</div>
                <div>{slot(4)}</div>
                <div>{slot(5)}</div>
            </div>
        );
    }
    return gridLayout(n, slot);
}

/** tall-left — 左侧高图 + 右侧方阵：count 5 用客群 PPT 原版式 */
function tallLeftLayout(n: number, slot: SlotRenderer): ReactNode {
    if (n === 2) {
        return (
            <div className="grid grid-cols-2 gap-2 h-full min-h-[300px]">
                {slot(0)}{slot(1)}
            </div>
        );
    }
    if (n === 3) {
        return (
            <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full min-h-[300px]">
                <div className="row-span-2">{slot(0)}</div>
                <div>{slot(1)}</div>
                <div>{slot(2)}</div>
            </div>
        );
    }
    if (n === 4) {
        return (
            <div className="grid grid-cols-2 grid-rows-3 gap-2 h-full min-h-[420px]">
                <div className="row-span-3">{slot(0)}</div>
                <div>{slot(1)}</div>
                <div>{slot(2)}</div>
                <div>{slot(3)}</div>
            </div>
        );
    }
    if (n === 5) {
        return (
            <div className="grid grid-cols-3 grid-rows-2 gap-2 h-full min-h-[320px]">
                <div className="row-span-2">{slot(0)}</div>
                <div>{slot(1)}</div>
                <div>{slot(2)}</div>
                <div>{slot(3)}</div>
                <div>{slot(4)}</div>
            </div>
        );
    }
    if (n === 6) {
        return (
            <div className="grid grid-cols-3 grid-rows-3 gap-2 h-full min-h-[420px]">
                <div className="row-span-3">{slot(0)}</div>
                <div>{slot(1)}</div>
                <div>{slot(2)}</div>
                <div>{slot(3)}</div>
                <div>{slot(4)}</div>
                <div>{slot(5)}</div>
            </div>
        );
    }
    return gridLayout(n, slot);
}

/** center-tall — 两边方块 + 中间高图：count 5 用生活方式 PPT 原版式 */
function centerTallLayout(n: number, slot: SlotRenderer): ReactNode {
    if (n === 2) {
        return (
            <div className="grid grid-cols-2 gap-2 h-full min-h-[300px]">
                {slot(0)}{slot(1)}
            </div>
        );
    }
    if (n === 3) {
        return (
            <div className="grid grid-cols-3 grid-rows-2 gap-2 h-full min-h-[300px]">
                <div>{slot(0)}</div>
                <div className="row-span-2">{slot(1)}</div>
                <div>{slot(2)}</div>
            </div>
        );
    }
    if (n === 4) {
        return (
            <div className="grid grid-cols-3 grid-rows-2 gap-2 h-full min-h-[300px]">
                <div>{slot(0)}</div>
                <div className="row-span-2">{slot(1)}</div>
                <div>{slot(2)}</div>
                <div className="col-span-3">{slot(3)}</div>
            </div>
        );
    }
    if (n === 5) {
        return (
            <div className="grid grid-cols-3 grid-rows-2 gap-2 h-full min-h-[300px]">
                <div>{slot(0)}</div>
                <div className="row-span-2">{slot(1)}</div>
                <div>{slot(2)}</div>
                <div>{slot(3)}</div>
                <div>{slot(4)}</div>
            </div>
        );
    }
    if (n === 6) {
        return (
            <div className="grid grid-cols-3 grid-rows-3 gap-2 h-full min-h-[420px]">
                <div>{slot(0)}</div>
                <div className="row-span-3">{slot(1)}</div>
                <div>{slot(2)}</div>
                <div>{slot(3)}</div>
                <div>{slot(4)}</div>
                <div>{slot(5)}</div>
            </div>
        );
    }
    return gridLayout(n, slot);
}

/** grid — N×N 方阵；高度跟随父容器（= 文本列高），用 grid-rows 1fr 等分 */
function gridLayout(n: number, slot: SlotRenderer): ReactNode {
    const cols = n <= 3 ? n : n <= 4 ? 2 : n <= 6 ? 3 : n <= 8 ? 4 : 3;
    const rows = Math.ceil(n / cols);
    return (
        <div
            className="grid gap-2 h-full min-h-[300px]"
            style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
        >
            {Array.from({ length: n }, (_, i) => <div key={i} className="h-full">{slot(i)}</div>)}
        </div>
    );
}

/** row — 单排横排：所有图等宽 */
function rowLayout(n: number, slot: SlotRenderer): ReactNode {
    return (
        <div className="grid gap-2 h-full" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {Array.from({ length: n }, (_, i) => <div key={i} className="aspect-[3/4]">{slot(i)}</div>)}
        </div>
    );
}
