'use client';
/**
 * src/components/config/panels/BrandOverviewPanel.tsx
 * 品牌总览面板 V18 — 核心入口，替换旧 BrandManagementPanel 概念
 * 品牌切换器 + 关键信息卡 + Override 差异管理 + 操作
 */
import { useMerchConfig } from '@/context/MerchConfigContext';
import type { TabKey } from '@/types/merchConfig';

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

export default function BrandOverviewPanel() {
    const {
        brand, industry, overrideMap, metrics, dimensions, thresholds, tabs,
        availableBrands, switchBrand,
        resetMetricOverride, resetDimensionOverride, resetThresholdOverride, resetTabOverride,
    } = useMerchConfig();

    const overridden = {
        metrics: Array.from(overrideMap.metrics).map((id) => metrics.get(id)).filter(Boolean),
        dimensions: Array.from(overrideMap.dimensions).map((id) => dimensions.get(id)).filter(Boolean),
        thresholds: Array.from(overrideMap.thresholds).map((id) => thresholds.get(id)).filter(Boolean),
        tabs: Array.from(overrideMap.tabs).map((tabKey) => ({ tabKey, config: tabs.get(tabKey) })),
    };
    const totalOverrides =
        overridden.metrics.length +
        overridden.dimensions.length +
        overridden.thresholds.length +
        overridden.tabs.length;

    function resetAll() {
        if (totalOverrides === 0) return;
        if (typeof window !== 'undefined') {
            const ok = window.confirm(`确认要清除当前品牌全部 ${totalOverrides} 项覆盖，恢复到行业模板默认值吗？此操作不可撤销。`);
            if (!ok) return;
        }
        Array.from(overrideMap.metrics).forEach(resetMetricOverride);
        Array.from(overrideMap.dimensions).forEach(resetDimensionOverride);
        Array.from(overrideMap.thresholds).forEach(resetThresholdOverride);
        Array.from(overrideMap.tabs).forEach(resetTabOverride);
    }

    return (
        <div className="space-y-5">
            {/* ── 品牌信息卡 ── */}
            <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <div className="flex items-start gap-4">
                    <span className="text-4xl leading-none mt-1">{brand.logo ?? '🏷️'}</span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-xl font-bold text-slate-800">{brand.brandName}</h2>
                            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                                {industry.label}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                                模板 v{brand.industryTemplateVersion ?? industry.version}
                            </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                            <span>财年 FY{brand.fiscalYear ?? '—'}</span>
                            <span>创建时间 2026-05-14</span>
                            <span>
                                覆盖项 <strong className={totalOverrides > 0 ? 'text-amber-600' : 'text-slate-400'}>{totalOverrides} 项</strong>
                            </span>
                        </div>
                    </div>
                </div>

                {/* 品牌切换 */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {availableBrands.map((b) => (
                        <button
                            key={b.brandId}
                            onClick={() => switchBrand(b.brandId)}
                            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                                b.brandId === brand.brandId
                                    ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-600'
                            }`}
                        >
                            {b.brandName}
                        </button>
                    ))}
                </div>
            </section>

            {/* ── 操作按钮 ── */}
            <section className="flex flex-wrap gap-2">
                <button className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    + 创建新品牌
                </button>
                <button className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    📤 导出配置
                </button>
                <button className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    📥 导入配置
                </button>
                <button
                    onClick={resetAll}
                    disabled={totalOverrides === 0}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-600 hover:bg-rose-100 transition-colors ml-auto disabled:opacity-40 disabled:cursor-not-allowed"
                    title={totalOverrides === 0 ? '当前没有任何覆盖项' : `清除全部 ${totalOverrides} 项覆盖`}
                >
                    ↶ 还原到行业模板
                </button>
            </section>

            {/* ── Override 差异管理 ── */}
            <section>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">Override 差异管理</h3>
                    {totalOverrides > 0 && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            已覆盖 {totalOverrides} 项
                        </span>
                    )}
                </div>

                {totalOverrides === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                        暂无品牌覆盖项，完全使用行业模板默认值
                    </div>
                )}

                {overridden.metrics.length > 0 && (
                    <OverrideSection title={`✏️ 指标覆盖（${overridden.metrics.length} 项）`}>
                        {overridden.metrics.map((m) =>
                            m ? (
                                <OverrideRow
                                    key={m.metricId}
                                    name={m.label}
                                    detail={`公式: ${m.formula}`}
                                    onReset={() => resetMetricOverride(m.metricId)}
                                />
                            ) : null
                        )}
                    </OverrideSection>
                )}

                {overridden.dimensions.length > 0 && (
                    <OverrideSection title={`✏️ 维度覆盖（${overridden.dimensions.length} 项）`}>
                        {overridden.dimensions.map((d) =>
                            d ? (
                                <OverrideRow
                                    key={d.dimensionId}
                                    name={d.label}
                                    detail={`${d.values.length} 个维度值`}
                                    onReset={() => resetDimensionOverride(d.dimensionId)}
                                />
                            ) : null
                        )}
                    </OverrideSection>
                )}

                {overridden.thresholds.length > 0 && (
                    <OverrideSection title={`✏️ 阈值覆盖（${overridden.thresholds.length} 项）`}>
                        {overridden.thresholds.map((t) =>
                            t ? (
                                <OverrideRow
                                    key={t.thresholdId}
                                    name={t.label}
                                    detail={`默认值: ${t.defaultValue} ${t.unit}`}
                                    onReset={() => resetThresholdOverride(t.thresholdId)}
                                />
                            ) : null
                        )}
                    </OverrideSection>
                )}

                {overridden.tabs.length > 0 && (
                    <OverrideSection title={`✏️ Tab 配置覆盖（${overridden.tabs.length} 项）`}>
                        {overridden.tabs.map(({ tabKey, config }) => (
                            <OverrideRow
                                key={tabKey}
                                name={TAB_LABEL[tabKey] ?? tabKey}
                                detail={`${config?.sections?.length ?? 0} 个 section · ${Object.keys(config?.customSettings ?? {}).length} 项自定义设置`}
                                onReset={() => resetTabOverride(tabKey)}
                            />
                        ))}
                    </OverrideSection>
                )}
            </section>
        </div>
    );
}

function OverrideSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <div className="mb-2 text-sm font-semibold text-slate-700">{title}</div>
            <div className="space-y-1">{children}</div>
        </div>
    );
}

function OverrideRow({ name, detail, onReset }: { name: string; detail: string; onReset?: () => void }) {
    return (
        <div className="flex items-center justify-between rounded-lg border-l-2 border-amber-400 bg-amber-50 px-3 py-2">
            <div>
                <span className="text-sm font-medium text-slate-800">{name}</span>
                <span className="ml-2 text-xs text-slate-500">{detail}</span>
            </div>
            <button
                onClick={onReset}
                disabled={!onReset}
                className="text-xs text-rose-500 hover:text-rose-700 flex-shrink-0 ml-2 disabled:opacity-40"
            >
                ↶ 还原
            </button>
        </div>
    );
}
