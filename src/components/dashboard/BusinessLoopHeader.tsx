'use client';
/**
 * src/components/dashboard/BusinessLoopHeader.tsx
 * 业务 Tab 顶部统一闭环提示条 — 显示当前模块的角色、上下游、必备指标缺失提示。
 *
 * 一处接入，覆盖 12 个 Tab。Panel 内部不需要重复实现。
 * 使用方式：在 DashboardPage.client.tsx 的 Tab 切换之上渲染一次：
 *   <BusinessLoopHeader tabKey={DASHBOARD_TAB_TO_CONFIG_TAB[activeTab]} onJumpToTab={jumpToTab} />
 */
import { useMerchBusinessModule } from '@/hooks/useMerchBusinessModule';
import type { TabKey } from '@/types/merchConfig';
import {
    CONFIG_TAB_TO_DASHBOARD_TAB,
    type DashboardTab,
} from '@/config/dashboardTabMap';

interface Props {
    tabKey: TabKey;
    onJumpToTab?: (tab: DashboardTab) => void;
    /** 默认折叠，避免占用空间过多 */
    defaultExpanded?: boolean;
    className?: string;
}

export default function BusinessLoopHeader({ tabKey, onJumpToTab, defaultExpanded = false, className = '' }: Props) {
    const mod = useMerchBusinessModule(tabKey);
    const { loop, brand, industry, metrics, overrides, missingRequiredMetrics, isUsingFallback } = mod;

    const overrideCount =
        overrides.metrics.length +
        overrides.dimensions.length +
        overrides.thresholds.length +
        (overrides.tab ? 1 : 0);

    return (
        <details
            open={defaultExpanded}
            className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-3 ${className}`}
        >
            <summary className="cursor-pointer list-none px-4 py-2.5 flex items-center gap-3 flex-wrap text-xs">
                <span className="text-base">{loop.icon}</span>
                <span className="font-semibold text-slate-700">{loop.label}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500 truncate max-w-[420px]" title={loop.role}>{loop.role}</span>
                <span className="ml-auto flex items-center gap-2 flex-shrink-0">
                    <span
                        title={`品牌：${brand.brandName} · 行业模板：${industry.label} v${brand.industryTemplateVersion ?? industry.version}`}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                    >
                        {brand.logo ?? '🏷️'} {brand.brandName}
                    </span>
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-700">
                        指标 {metrics.length}
                    </span>
                    {missingRequiredMetrics.length > 0 ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                            ⚠️ 缺 {missingRequiredMetrics.length} 项必备
                        </span>
                    ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">
                            ✅ 必备齐全
                        </span>
                    )}
                    {overrideCount > 0 ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            ✏️ 覆盖 {overrideCount}
                        </span>
                    ) : isUsingFallback ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                            行业模板
                        </span>
                    ) : null}
                    <span className="text-slate-400 text-[10px]">展开 ▾</span>
                </span>
            </summary>

            <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-slate-50/60">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ModuleChainBlock
                        title="🔼 上游模块"
                        modules={mod.upstreamModules}
                        emptyHint="无（此模块为顶层输入）"
                        onJumpToTab={onJumpToTab}
                    />
                    <ModuleChainBlock
                        title="🔽 下游模块"
                        modules={mod.downstreamModules}
                        emptyHint="无（此模块为终点输出）"
                        onJumpToTab={onJumpToTab}
                    />
                </div>

                <div>
                    <div className="text-[11px] font-semibold text-slate-500 mb-1.5">📐 必备指标（{loop.requiredMetrics.length}）</div>
                    <div className="flex flex-wrap gap-1.5">
                        {loop.requiredMetrics.map((id) => {
                            const m = metrics.find((x) => x.metricId === id);
                            const missing = !m;
                            const overridden = m && overrides.metrics.includes(id);
                            return (
                                <span
                                    key={id}
                                    title={m ? `${m.label} · 公式：${m.formula}` : '指标库未找到'}
                                    className={`text-[11px] px-2 py-0.5 rounded-md border ${
                                        missing
                                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                                            : overridden
                                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                : 'border-sky-100 bg-sky-50 text-sky-700'
                                    }`}
                                >
                                    {missing ? `❌ ${id}` : (overridden ? `✏️ ${m!.label}` : m!.label)}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {loop.outputMetrics.length > 0 && (
                    <div>
                        <div className="text-[11px] font-semibold text-slate-500 mb-1.5">📤 输出指标（{loop.outputMetrics.length}）</div>
                        <div className="flex flex-wrap gap-1.5">
                            {loop.outputMetrics.map((id) => {
                                const m = metrics.find((x) => x.metricId === id);
                                return (
                                    <span
                                        key={id}
                                        className="text-[11px] px-2 py-0.5 rounded-md border border-emerald-100 bg-emerald-50 text-emerald-700"
                                    >
                                        {m?.label ?? id}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                {loop.businessQuestions.length > 0 && (
                    <div>
                        <div className="text-[11px] font-semibold text-slate-500 mb-1.5">❓ 要回答的核心问题</div>
                        <ul className="ml-4 list-disc text-[11px] text-slate-600 space-y-0.5">
                            {loop.businessQuestions.map((q) => (
                                <li key={q}>{q}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </details>
    );
}

function ModuleChainBlock({
    title,
    modules,
    emptyHint,
    onJumpToTab,
}: {
    title: string;
    modules: ReturnType<typeof useMerchBusinessModule>['upstreamModules'];
    emptyHint: string;
    onJumpToTab?: (tab: DashboardTab) => void;
}) {
    return (
        <div>
            <div className="text-[11px] font-semibold text-slate-500 mb-1.5">{title}</div>
            {modules.length === 0 ? (
                <div className="text-[11px] text-slate-400">{emptyHint}</div>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {modules.map((m) => {
                        const targetDashboardKey = CONFIG_TAB_TO_DASHBOARD_TAB[m.tabKey];
                        const clickable = !!onJumpToTab;
                        return (
                            <button
                                key={m.tabKey}
                                type="button"
                                disabled={!clickable}
                                onClick={() => onJumpToTab?.(targetDashboardKey)}
                                className={`text-[11px] px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-700 inline-flex items-center gap-1 ${
                                    clickable ? 'hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 cursor-pointer' : 'opacity-80 cursor-default'
                                }`}
                                title={m.role}
                            >
                                <span>{m.icon}</span>
                                <span>{m.label}</span>
                                {clickable && <span className="text-slate-300">↗</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
