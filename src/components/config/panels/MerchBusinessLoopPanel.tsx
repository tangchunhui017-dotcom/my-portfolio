'use client';
/**
 * src/components/config/panels/MerchBusinessLoopPanel.tsx
 * 业务闭环总览 — 12 个模块的角色、上下游、必备指标、健康状态。
 */
import { useMemo } from 'react';
import { useMerchConfig } from '@/context/MerchConfigContext';
import { MERCH_BUSINESS_MODULE_LIST, MERCH_BUSINESS_MODULES } from '@/config/merchBusinessLoop';
import { runMerchConfigHealthCheck } from '@/utils/merchConfigHealth';
import type { TabKey } from '@/types/merchConfig';

const KEY_LOOPS: { title: string; chain: TabKey[] }[] = [
    {
        title: '主链路 · 计划 → 执行 → 复盘',
        chain: ['annual-control', 'category-ops', 'wave-planning', 'otb', 'cashflow', 'forecast', 'inventory-health', 'pnl', 'overview'],
    },
    {
        title: '市场感知链路',
        chain: ['competitor-trend', 'consumer', 'category-ops', 'wave-planning', 'forecast'],
    },
    {
        title: '渠道反馈链路',
        chain: ['region-store', 'otb', 'inventory-health', 'pnl'],
    },
];

export default function MerchBusinessLoopPanel() {
    const config = useMerchConfig();

    const issues = useMemo(() => runMerchConfigHealthCheck(config), [config]);
    const issuesByTab = useMemo(() => {
        const map = new Map<TabKey, number>();
        for (const issue of issues) {
            if (issue.area !== 'loop') continue;
            const tabKey = issue.targetId as TabKey;
            map.set(tabKey, (map.get(tabKey) ?? 0) + 1);
        }
        return map;
    }, [issues]);

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-700">
                <strong>业务闭环总览</strong>：12 个模块的角色、上下游依赖、必备指标与健康状态。
                可用作「配置审查」的入口图，确认中台是否真正闭合到业务侧。
            </div>

            {/* 关键链路展示 */}
            <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">🔁 核心链路</h3>
                <div className="space-y-3">
                    {KEY_LOOPS.map((loop) => (
                        <div key={loop.title} className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="text-xs font-semibold text-slate-700 mb-2">{loop.title}</div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {loop.chain.map((tabKey, idx) => {
                                    const m = MERCH_BUSINESS_MODULES[tabKey];
                                    const issueCount = issuesByTab.get(tabKey) ?? 0;
                                    return (
                                        <span key={tabKey} className="flex items-center gap-1.5">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium ${
                                                    issueCount > 0
                                                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                                                        : 'border-slate-200 bg-slate-50 text-slate-700'
                                                }`}
                                                title={m.role}
                                            >
                                                <span>{m.icon}</span>
                                                <span>{m.label}</span>
                                                {issueCount > 0 && (
                                                    <span className="ml-1 rounded-full bg-rose-200 px-1.5 text-[10px] text-rose-800">{issueCount}</span>
                                                )}
                                            </span>
                                            {idx < loop.chain.length - 1 && <span className="text-slate-300">→</span>}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 12 模块详情卡片 */}
            <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">📦 全部模块（12）</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {MERCH_BUSINESS_MODULE_LIST.map((mod) => {
                        const tabConfig = config.tabs.get(mod.tabKey);
                        const tabOverridden = config.overrideMap.tabs.has(mod.tabKey);
                        const metricCount = Array.from(config.metrics.values()).filter((m) =>
                            m.usedBy.includes(mod.tabKey)
                        ).length;
                        const missingRequired = mod.requiredMetrics.filter((id) => !config.metrics.has(id));
                        const healthy = missingRequired.length === 0 && tabConfig !== undefined;

                        return (
                            <div
                                key={mod.tabKey}
                                className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${
                                    healthy ? 'border-slate-200 bg-white' : 'border-rose-200 bg-rose-50'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{mod.icon}</span>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-800">{mod.label}</div>
                                            <div className="text-[11px] text-slate-500">{mod.role}</div>
                                        </div>
                                    </div>
                                    <span
                                        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                            healthy
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-rose-100 text-rose-700'
                                        }`}
                                    >
                                        {healthy ? '✅ 正常' : `⚠️ 缺 ${missingRequired.length} 项`}
                                    </span>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                                    <div>
                                        <span className="font-medium text-slate-600">指标数：</span>
                                        {metricCount}（必备 {mod.requiredMetrics.length}）
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-600">上游：</span>
                                        {mod.upstreamTabs.length} 个
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-600">输出：</span>
                                        {mod.outputMetrics.length} 项
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-600">下游：</span>
                                        {mod.downstreamTabs.length} 个
                                    </div>
                                </div>

                                {missingRequired.length > 0 && (
                                    <div className="mt-2 rounded-lg bg-white px-2 py-1.5 text-[11px] text-rose-600">
                                        <strong>缺失必备指标：</strong>
                                        {missingRequired.slice(0, 4).join(', ')}
                                        {missingRequired.length > 4 ? ' ...' : ''}
                                    </div>
                                )}

                                {tabOverridden && (
                                    <div className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                        🏷️ 当前品牌已覆盖
                                    </div>
                                )}

                                {/* 业务问题 */}
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-700">
                                        要回答的核心业务问题（{mod.businessQuestions.length}）
                                    </summary>
                                    <ul className="mt-1.5 ml-4 list-disc text-[11px] text-slate-500 space-y-0.5">
                                        {mod.businessQuestions.map((q) => (
                                            <li key={q}>{q}</li>
                                        ))}
                                    </ul>
                                </details>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
