'use client';

import { useState, useRef, useEffect } from 'react';

interface ChartMenuProps {
    chartTitle: string;
    chartRef?: React.RefObject<HTMLDivElement | null>;
    conclusion?: string;
    onDrillDown?: () => void;
}

export default function ChartMenu({
    chartTitle,
    chartRef,
    conclusion,
    onDrillDown,
}: ChartMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // 下载图表为 PNG
    const handleDownloadPNG = () => {
        if (!chartRef?.current) return;

        // 使用 ECharts 实例的 getDataURL 方法
        const chartInstance = (chartRef.current as any).querySelector('canvas');
        if (chartInstance) {
            const url = chartInstance.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `${chartTitle.replace(/\s+/g, '_')}.png`;
            a.click();
        }
        setIsOpen(false);
    };

    // 复制图表摘要
    const handleCopyConclusion = () => {
        if (!conclusion) return;
        navigator.clipboard.writeText(`${chartTitle}\n\n${conclusion}`);
        alert('图表摘要已复制到剪贴板');
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            {/* 菜单按钮 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
                title="图表操作"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
            </button>

            {/* 下拉菜单 */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                    <button
                        onClick={handleDownloadPNG}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                        <span>⬇️</span> 下载 PNG
                    </button>

                    {conclusion && (
                        <button
                            onClick={handleCopyConclusion}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                            <span>📋</span> 复制摘要
                        </button>
                    )}

                    {onDrillDown && (
                        <>
                            <div className="border-t border-slate-100 my-1" />
                            <button
                                onClick={() => {
                                    onDrillDown();
                                    setIsOpen(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <span>🔍</span> 进入钻取
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
