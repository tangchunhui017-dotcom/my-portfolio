'use client';
/**
 * src/components/config/ConfigDrivenThresholdsBar.tsx
 * V17 步骤 11 — 配置驱动可视化标识
 *
 * 在业务 Tab 顶部展示当前 Tab 使用的阈值/维度，让用户看到：
 *   - 哪些数值是配置驱动的
 *   - 当前值来自哪个层级（行业模板 / 品牌覆盖）
 *   - 修改配置后立即在此 Tab 生效
 *
 * 用法：
 *   <ConfigDrivenThresholdsBar tabKey="inventory-health" />
 */
import { useMerchConfig } from '@/context/MerchConfigContext';
import type { TabKey } from '@/types/merchConfig';

interface Props {
    tabKey: TabKey;
    /** 折叠默认状态 */
    defaultExpanded?: boolean;
}

const SOURCE_BADGE: Record<string, { cls: string; label: string }> = {
    'brand':    { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: '品牌覆盖' },
    'industry': { cls: 'bg-slate-100 text-slate-600 border-slate-200', label: '行业模板' },
    'platform': { cls: 'bg-violet-100 text-violet-700 border-violet-200', label: '平台默认' },
    'user':     { cls: 'bg-sky-100 text-sky-700 border-sky-200', label: '用户偏好' },
};

function formatThresholdValue(value: number | undefined, unit: string): string {
    if (value === undefined) return '—';
    if (unit === 'percent') return `${(value * 100).toFixed(1)}%`;
    if (unit === 'currency') return `¥${value.toLocaleString()}`;
    if (unit === 'pairs') return `${value.toLocaleString()}双`;
    if (unit === 'weeks') return `${value}周`;
    if (unit === 'days') return `${value}天`;
    if (unit === 'times') return `${value}次`;
    if (unit === 'count') return `${value}`;
    if (unit === 'ratio') return `${value.toFixed(1)}`;
    return String(value);
}

export default function ConfigDrivenThresholdsBar({ tabKey, defaultExpanded = false }: Props) {
    const { thresholds, dimensions, brand, industry, overrideMap } = useMerchConfig();

    const relevantThresholds = Array.from(thresholds.values()).filter(t => t.appliedTo.includes(tabKey));
    const relevantDimensions = Array.from(dimensions.values()).filter(d => !d.scope || d.scope.includes(tabKey));

    if (relevantThresholds.length === 0 && relevantDimensions.length === 0) return null;

    const overrideThresholdCount = relevantThresholds.filter(t => overrideMap.thresholds.has(t.thresholdId)).length;
    const overrideDimensionCount = relevantDimensions.filter(d => overrideMap.dimensions.has(d.dimensionId)).length;
    const totalOverrides = overrideThresholdCount + overrideDimensionCount;

    return (
        <details open={defaultExpanded} className="rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/60 to-sky-50/60 mb-4">
            <summary className="cursor-pointer px-4 py-2.5 list-none flex items-center justify-between gap-2 select-none">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base">⚙️</span>
                    <span className="text-xs font-bold text-slate-800">配置驱动 — 当前生效</span>
                    <span className="text-[10px] text-slate-500">
                        {brand.brandName} · 行业 {industry.label} v{industry.version}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                        {relevantThresholds.length} 阈值 · {relevantDimensions.length} 维度
                    </span>
                    {totalOverrides > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                            品牌覆盖 {totalOverrides} 项
                        </span>
                    )}
                </div>
                <span className="text-[10px] text-slate-400">点击展开/收起 ▾</span>
            </summary>

            <div className="px-4 pb-3 pt-1 space-y-3">
                {relevantThresholds.length > 0 && (
                    <div>
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">阈值规则</div>
                        <div className="flex flex-wrap gap-1.5">
                            {relevantThresholds.map(t => {
                                const source = t.source ?? 'industry';
                                const badge = SOURCE_BADGE[source] ?? SOURCE_BADGE.industry;
                                const isOverride = overrideMap.thresholds.has(t.thresholdId);
                                return (
                                    <div key={t.thresholdId}
                                         className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 bg-white ${isOverride ? 'border-amber-200' : 'border-slate-100'}`}
                                         title={`公式来源: ${badge.label}`}>
                                        <span className="text-[10px] text-slate-600">{t.label}:</span>
                                        <span className="text-[11px] font-bold text-slate-800">
                                            {formatThresholdValue(t.defaultValue, t.unit)}
                                        </span>
                                        {t.warningValue !== undefined && (
                                            <span className="text-[9px] text-amber-600">⚠ {formatThresholdValue(t.warningValue, t.unit)}</span>
                                        )}
                                        {t.criticalValue !== undefined && (
                                            <span className="text-[9px] text-rose-600">🔴 {formatThresholdValue(t.criticalValue, t.unit)}</span>
                                        )}
                                        <span className={`text-[8px] px-1 py-0.5 rounded border ${badge.cls} font-medium`}>
                                            {badge.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {relevantDimensions.length > 0 && (
                    <div>
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">维度定义</div>
                        <div className="flex flex-wrap gap-1.5">
                            {relevantDimensions.map(d => {
                                const source = d.source ?? 'industry';
                                const badge = SOURCE_BADGE[source] ?? SOURCE_BADGE.industry;
                                const isOverride = overrideMap.dimensions.has(d.dimensionId);
                                return (
                                    <div key={d.dimensionId}
                                         className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 bg-white ${isOverride ? 'border-amber-200' : 'border-slate-100'}`}>
                                        <span className="text-[10px] text-slate-600">{d.label}:</span>
                                        <span className="text-[11px] font-bold text-slate-800">{d.values.length} 项</span>
                                        <span className={`text-[8px] px-1 py-0.5 rounded border ${badge.cls} font-medium`}>
                                            {badge.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="text-[10px] text-slate-400 border-t border-slate-200 pt-2">
                    💡 提示：以上数值由「年度全局配置」管理。修改后所有使用该指标/阈值的 Tab 自动更新。
                </div>
            </div>
        </details>
    );
}
