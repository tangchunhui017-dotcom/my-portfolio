'use client';
/**
 * src/components/dashboard/channel/StoreOpsCenter.tsx
 * V15 L4: 终端运营中心 2-Tab 容器
 * tiering=门店分层 / ranking=门店排行&风险榜
 */
import { useState } from 'react';
import type { ReactNode } from 'react';

interface Props {
    tieringContent: ReactNode;
    rankingContent: ReactNode;
    defaultTab?: 'tiering' | 'ranking';
}

const TABS = [
    { key: 'tiering' as const, label: '🏪 门店分层' },
    { key: 'ranking' as const, label: '🏆 门店排行 & 风险榜' },
];

export default function StoreOpsCenter({
    tieringContent,
    rankingContent,
    defaultTab = 'tiering',
}: Props) {
    const [activeTab, setActiveTab] = useState<'tiering' | 'ranking'>(defaultTab);

    const contentMap: Record<typeof activeTab, ReactNode> = {
        tiering: tieringContent,
        ranking: rankingContent,
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Tab 导航 */}
            <div className="flex items-center border-b border-slate-100 px-4 pt-3 gap-1">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === tab.key
                                ? 'border-blue-500 text-blue-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab 内容 */}
            <div className="p-4">
                {contentMap[activeTab]}
            </div>
        </div>
    );
}
