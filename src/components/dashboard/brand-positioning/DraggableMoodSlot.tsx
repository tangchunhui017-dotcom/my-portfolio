'use client';
/**
 * src/components/dashboard/brand-positioning/DraggableMoodSlot.tsx
 *
 * 支持拖拽换位的 mood 图占位槽。
 *
 * 使用方式：
 *   const { order, swap, reset, isDefault } = useMoodOrder('storage-key', images.length);
 *
 *   <DraggableMoodSlot
 *      slotIndex={0}                    // 该槽在画面上的物理位置（不变）
 *      imageIndex={order[0]}            // 当前该槽渲染的图片在原数组中的下标
 *      onDragStart={(idx) => setDragIdx(idx)}
 *      onDragEnd={() => setDragIdx(null)}
 *      onDrop={(from, to) => swap(from, to)}
 *      dragIdx={dragIdx}
 *   >
 *     <ImageSlot ... />
 *   </DraggableMoodSlot>
 */
import { useState, useEffect, useCallback, type ReactNode } from 'react';

interface Props {
    slotIndex: number;
    dragIdx: number | null;
    onDragStart: (idx: number) => void;
    onDragEnd: () => void;
    onDrop: (from: number, to: number) => void;
    children: ReactNode;
    className?: string;
}

export default function DraggableMoodSlot({
    slotIndex, dragIdx, onDragStart, onDragEnd, onDrop, children, className = '',
}: Props) {
    const [isOver, setIsOver] = useState(false);
    const isDragging = dragIdx === slotIndex;

    return (
        <div
            draggable
            onDragStart={(e) => {
                onDragStart(slotIndex);
                e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => {
                onDragEnd();
                setIsOver(false);
            }}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }}
            onDragEnter={() => setIsOver(true)}
            onDragLeave={() => setIsOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsOver(false);
                if (dragIdx !== null && dragIdx !== slotIndex) {
                    onDrop(dragIdx, slotIndex);
                }
            }}
            className={`h-full cursor-grab active:cursor-grabbing transition-all duration-150 ${
                isDragging ? 'opacity-40 scale-95' : ''
            } ${
                // 仅在内部拖拽换位时显示蓝框；拖外部文件由 ImageSlot 自己显示，避免重复 + 状态卡住
                isOver && !isDragging && dragIdx !== null ? 'ring-2 ring-sky-400 ring-offset-1 rounded-md' : ''
            } ${className}`}
        >
            {children}
        </div>
    );
}

/**
 * hook：管理 mood 图的排序状态（带 localStorage 持久化）。
 *
 * @param storageKey   localStorage 键，建议格式 `bp:mood:<section>:<id>`
 * @param length       图片总数
 */
export function useMoodOrder(storageKey: string, length: number) {
    const defaultOrder = () => Array.from({ length }, (_, i) => i);

    const [order, setOrder] = useState<number[]>(defaultOrder);
    const [hydrated, setHydrated] = useState(false);

    // 仅客户端从 localStorage 读取，避免 SSR mismatch
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (
                    Array.isArray(parsed) &&
                    parsed.length === length &&
                    parsed.every((v) => Number.isInteger(v) && v >= 0 && v < length) &&
                    new Set(parsed).size === length
                ) {
                    setOrder(parsed);
                }
            }
        } catch { /* noop */ }
        setHydrated(true);
    }, [storageKey, length]);

    // 写回 localStorage
    useEffect(() => {
        if (!hydrated || typeof window === 'undefined') return;
        try { localStorage.setItem(storageKey, JSON.stringify(order)); } catch { /* noop */ }
    }, [order, storageKey, hydrated]);

    const swap = useCallback((from: number, to: number) => {
        setOrder((prev) => {
            if (from === to) return prev;
            const next = [...prev];
            [next[from], next[to]] = [next[to], next[from]];
            return next;
        });
    }, []);

    const reset = useCallback(() => {
        setOrder(defaultOrder());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [length]);

    const isDefault = order.every((v, i) => v === i);

    return { order, swap, reset, isDefault };
}
