'use client';
/**
 * src/components/config/panels/ConfigDependencyGraph.tsx
 * 配置依赖关系图 V18 — 指标→业务Tab 影响链路可视化（表格版）
 */
import { useMerchConfig } from '@/context/MerchConfigContext';
import { useState } from 'react';
import { ALL_TABS, type TabKey } from '@/types/merchConfig';

// 必须使用 TabKey 体系（与 metric.usedBy 一致），不要混入 dashboard key（category/profit-loss/competitor/inventory）
const TAB_LABEL: Record<TabKey, string> = {
    'overview':          '总览',
    'annual-control':    '年度总控',
    'brand-positioning': '品牌定位',
    'region-store':      '区域&门店',
    'consumer':          '消费者画像',
    'category-ops':      '品类运营',
    'wave-planning':     '波段企划',
    'otb':               'OTB预算',
    'cashflow':          '现金流',
    'forecast':          '销售预测',
    'pnl':               '损益表',
    'competitor-trend':  '竞品&趋势',
    'inventory-health':  '库存健康',
};

const ALL_TABS_LIST: TabKey[] = ALL_TABS;

export default function ConfigDependencyGraph() {
    const { metrics } = useMerchConfig();
    const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');

    const metricList = Array.from(metrics.values());
    const filtered = metricList.filter((m) =>
        !searchText || m.label.includes(searchText) || m.metricId.includes(searchText)
    );
    const selected = selectedMetric ? metrics.get(selectedMetric) : null;

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-700">
                <strong>配置依赖图</strong>：点击左侧指标，右侧高亮显示该指标被哪些业务模块使用。
                改动某指标公式或阈值后，可快速评估影响范围。
            </div>

            <div className="flex gap-4 min-h-[400px]">
                {/* 左侧指标列表 */}
                <div className="w-64 flex-shrink-0 space-y-1">
                    <input
                        placeholder="搜索指标..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-sky-200 mb-2"
                    />
                    <div className="max-h-[400px] overflow-y-auto space-y-0.5 rounded-xl border border-slate-200 p-2">
                        {filtered.map((m) => (
                            <button
                                key={m.metricId}
                                onClick={() => setSelectedMetric(m.metricId)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                                    selectedMetric === m.metricId
                                        ? 'bg-sky-500 text-white'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <div className="font-medium">{m.label}</div>
                                <div className="mt-0.5 opacity-70">影响 {m.usedBy.length} 个模块</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 右侧依赖图 */}
                <div className="flex-1">
                    {selected ? (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                                <div className="text-base font-bold text-sky-800">{selected.label}</div>
                                <div className="mt-1 text-xs text-sky-600">公式：<code>{selected.formula}</code></div>
                                <div className="mt-1 text-xs text-sky-500">
                                    影响 <strong>{selected.usedBy.length}</strong> 个业务模块
                                </div>
                            </div>
                            {/* 影响模块网格 */}
                            <div className="grid grid-cols-3 gap-2">
                                {ALL_TABS_LIST.map((tab) => {
                                    const affected = selected.usedBy.includes(tab);
                                    return (
                                        <div
                                            key={tab}
                                            className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                                                affected
                                                    ? 'border-amber-300 bg-amber-50 text-amber-700 shadow-sm'
                                                    : 'border-slate-100 bg-slate-50 text-slate-400'
                                            }`}
                                        >
                                            {affected && <span className="mr-1.5">⚡</span>}
                                            {TAB_LABEL[tab] ?? tab}
                                        </div>
                                    );
                                })}
                            </div>
                            {/* 指标链路说明 */}
                            {selected.usedBy.length > 0 && (
                                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                                    <div className="text-xs font-semibold text-amber-700 mb-2">修改此指标将影响：</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selected.usedBy.map((tab) => (
                                            <span
                                                key={tab}
                                                className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-medium text-amber-800"
                                            >
                                                {TAB_LABEL[tab] ?? tab}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                            ← 点击左侧指标查看依赖关系
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
