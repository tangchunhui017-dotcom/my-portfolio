'use client';
/**
 * src/components/dashboard/channel/RegionDrilldownTabs.tsx
 * V15 L3: 区域钻取 4-Tab 容器
 * heat=区域×渠道热力 / ops=运营链路 / city=城市线级钻取 / terminal=终端体检矩阵
 */
import { useState } from 'react';
import type { ReactNode } from 'react';

type TabKey = 'heat' | 'ops' | 'city' | 'terminal';

interface Props {
    heatContent: ReactNode;
    opsContent: ReactNode;
    cityContent: ReactNode;
    terminalContent: ReactNode;
    defaultTab?: TabKey;
}

const TABS: { key: TabKey; label: string }[] = [
    { key: 'city', label: '🏙️ 城市线级钻取' },
    { key: 'heat', label: '🌡️ 区域×渠道热力' },
    { key: 'ops', label: '🔗 运营链路' },
    { key: 'terminal', label: '🩺 终端体检矩阵' },
];

export default function RegionDrilldownTabs({
    heatContent,
    opsContent,
    cityContent,
    terminalContent,
    defaultTab = 'city',
}: Props) {
    const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

    const contentMap: Record<TabKey, ReactNode> = {
        heat: heatContent,
        ops: opsContent,
        city: cityContent,
        terminal: terminalContent,
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Tab 导航 */}
            <div className="flex items-center border-b border-slate-100 px-4 pt-3 gap-1 overflow-x-auto">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
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
