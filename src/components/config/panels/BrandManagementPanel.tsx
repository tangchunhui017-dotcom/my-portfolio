'use client';
/**
 * src/components/config/panels/BrandManagementPanel.tsx
 * 品牌管理 — 当前品牌信息 + override 差异 + 操作
 */
import { useMerchConfig } from '@/context/MerchConfigContext';

export default function BrandManagementPanel() {
    const { brand, industry, overrideMap, metrics, dimensions, thresholds } = useMerchConfig();

    const overridden = {
        metrics: Array.from(overrideMap.metrics)
            .map((id) => metrics.get(id))
            .filter(Boolean),
        dimensions: Array.from(overrideMap.dimensions)
            .map((id) => dimensions.get(id))
            .filter(Boolean),
        thresholds: Array.from(overrideMap.thresholds)
            .map((id) => thresholds.get(id))
            .filter(Boolean),
    };

    const totalOverrides =
        overridden.metrics.length + overridden.dimensions.length + overridden.thresholds.length;

    return (
        <div className="space-y-6">
            {/* 当前品牌 */}
            <section>
                <h3 className="text-base font-bold text-slate-800 mb-2">当前品牌</h3>
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-center gap-4">
                    <span className="text-3xl">{brand.logo ?? '🏷️'}</span>
                    <div>
                        <div className="text-lg font-bold text-slate-800">{brand.brandName}</div>
                        <div className="text-xs text-slate-400 mt-1 space-x-2">
                            <span>品牌ID: {brand.brandId}</span>
                            <span>·</span>
                            <span>行业: {industry.label}</span>
                            <span>·</span>
                            <span>模板 v{brand.industryTemplateVersion}</span>
                            {brand.fiscalYear && (
                                <>
                                    <span>·</span>
                                    <span>财年 FY{brand.fiscalYear}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Override 差异管理 */}
            <section>
                <h3 className="text-base font-bold text-slate-800 mb-1">Override 差异管理</h3>
                <p className="text-xs text-slate-400 mb-3">
                    该品牌覆盖了 <strong className="text-amber-600">{totalOverrides}</strong> 项行业模板配置
                </p>

                {totalOverrides === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        暂无品牌覆盖项，完全使用行业模板默认值
                    </div>
                )}

                {overridden.metrics.length > 0 && (
                    <div className="mb-4">
                        <div className="text-sm font-semibold text-slate-700 mb-1">
                            指标覆盖（{overridden.metrics.length}）
                        </div>
                        {overridden.metrics.map((m) =>
                            m ? (
                                <div
                                    key={m.metricId}
                                    className="text-xs p-2.5 border-l-2 border-amber-400 bg-amber-50 rounded-r mb-1 flex items-center justify-between"
                                >
                                    <span>
                                        <strong>{m.label}</strong>{' '}
                                        <span className="text-slate-500">({m.metricId})</span> — 公式:{' '}
                                        <code className="bg-white px-1 rounded">{m.formula}</code>
                                    </span>
                                    <button className="text-rose-500 hover:text-rose-700 text-xs ml-2 flex-shrink-0">
                                        还原
                                    </button>
                                </div>
                            ) : null
                        )}
                    </div>
                )}

                {overridden.dimensions.length > 0 && (
                    <div className="mb-4">
                        <div className="text-sm font-semibold text-slate-700 mb-1">
                            维度覆盖（{overridden.dimensions.length}）
                        </div>
                        {overridden.dimensions.map((d) =>
                            d ? (
                                <div
                                    key={d.dimensionId}
                                    className="text-xs p-2.5 border-l-2 border-amber-400 bg-amber-50 rounded-r mb-1"
                                >
                                    {d.label}（{d.values.length} 项）
                                </div>
                            ) : null
                        )}
                    </div>
                )}

                {overridden.thresholds.length > 0 && (
                    <div>
                        <div className="text-sm font-semibold text-slate-700 mb-1">
                            阈值覆盖（{overridden.thresholds.length}）
                        </div>
                        {overridden.thresholds.map((t) =>
                            t ? (
                                <div
                                    key={t.thresholdId}
                                    className="text-xs p-2.5 border-l-2 border-amber-400 bg-amber-50 rounded-r mb-1"
                                >
                                    {t.label}: <strong>{t.defaultValue}</strong> {t.unit}
                                </div>
                            ) : null
                        )}
                    </div>
                )}
            </section>

            {/* 操作 */}
            <section>
                <h3 className="text-base font-bold text-slate-800 mb-2">操作</h3>
                <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                        + 新建品牌（从行业模板复制）
                    </button>
                    <button className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                        导出当前品牌配置
                    </button>
                    <button className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                        导入品牌配置
                    </button>
                </div>
            </section>
        </div>
    );
}
