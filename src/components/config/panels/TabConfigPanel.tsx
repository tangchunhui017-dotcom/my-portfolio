'use client';
/**
 * src/components/config/panels/TabConfigPanel.tsx
 * 通用 Tab 配置面板模板 — 所有 12 个 Tab 共用
 * V18 优化：全中文化 + 隐藏英文 ID + 来源中文标签
 */
import type { ReactNode } from 'react';
import { useMerchConfig, useTabConfig } from '@/context/MerchConfigContext';
import type { TabKey, ConfigSource } from '@/types/merchConfig';

interface CustomSection {
    id: string;
    label: string;
    render: () => ReactNode;
}

interface Props {
    tabKey: TabKey;
    customSections?: CustomSection[];
}

// 12 Tab 的中文标题映射
const TAB_LABELS: Record<TabKey, { label: string; icon: string; desc: string }> = {
    'overview':         { label: '总览',       icon: '📊', desc: '品牌经营总览面板' },
    'annual-control':   { label: '年度总控',   icon: '🗺️', desc: '年度计划与目标拆分' },
    'region-store':     { label: '区域&门店',  icon: '🏪', desc: '区域销售、门店分层与执行' },
    'consumer':         { label: '消费者画像', icon: '🧑‍🤝‍🧑', desc: '会员、客群、偏好维度' },
    'category-ops':     { label: '品类运营',   icon: '📋', desc: '品类、价格带、生命周期' },
    'wave-planning':    { label: '波段企划',   icon: '📅', desc: '波段、季节、上市节奏' },
    'otb':              { label: 'OTB 预算',   icon: '💰', desc: 'OTB 计算规则与审批流' },
    'cashflow':         { label: '现金流',     icon: '💧', desc: '回款/支出/清货模拟' },
    'forecast':         { label: '销售预测',   icon: '📈', desc: '预测模型与情景参数' },
    'pnl':              { label: '损益表',     icon: '💹', desc: '毛利/税费/折扣规则' },
    'competitor-trend': { label: '竞品&趋势',  icon: '🧭', desc: '竞品对标维度' },
    'inventory-health': { label: '库存健康',   icon: '📦', desc: '库龄/调拨/计提规则' },
};

// 来源中文化
const SOURCE_LABEL: Record<ConfigSource, { label: string; cls: string }> = {
    'platform': { label: '平台默认', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    'industry': { label: '行业模板', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
    'brand':    { label: '品牌覆盖', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    'user':     { label: '用户偏好', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
};

function formatThresholdValue(value: number | undefined, unit: string): string {
    if (value === undefined || value === null) return '—';
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

export default function TabConfigPanel({ tabKey, customSections }: Props) {
    const { metrics, dimensions, thresholds } = useMerchConfig();
    const tab = useTabConfig(tabKey);

    const relevantMetrics = Array.from(metrics.values()).filter((m) =>
        m.usedBy.includes(tabKey)
    );
    const relevantDimensions = Array.from(dimensions.values()).filter(
        (d) => !d.scope || d.scope.includes(tabKey)
    );
    const relevantThresholds = Array.from(thresholds.values()).filter((t) =>
        t.appliedTo.includes(tabKey)
    );

    const tabInfo = TAB_LABELS[tabKey] ?? { label: tabKey, icon: '📄', desc: '' };

    return (
        <div className="space-y-6">
            <header className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span>{tabInfo.icon}</span>
                    <span>{tabInfo.label} 配置</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">{tabInfo.desc}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-500">
                    <span>📐 {relevantMetrics.length} 个指标</span>
                    <span>🗂️ {relevantDimensions.length} 个维度</span>
                    <span>⚠️ {relevantThresholds.length} 个阈值</span>
                </div>
            </header>

            {/* Section 启用控制 */}
            {tab?.sections && tab.sections.length > 0 && (
                <section>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">📦 显示模块</h4>
                    <p className="text-[11px] text-slate-400 mb-2">控制此 Tab 中哪些 Section 在前端显示</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {tab.sections.map((s) => (
                            <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer p-2 rounded hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    defaultChecked={s.enabled}
                                    className="rounded"
                                    readOnly
                                />
                                <span className="flex-1">{s.label}</span>
                                {s.collapsedByDefault && (
                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                        默认折叠
                                    </span>
                                )}
                            </label>
                        ))}
                    </div>
                </section>
            )}

            {/* 涉及指标 — 中文标签 + 公式 hover */}
            {relevantMetrics.length > 0 && (
                <section>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">📐 涉及指标（{relevantMetrics.length}）</h4>
                    <p className="text-[11px] text-slate-400 mb-2">点击 Tab「指标定义」修改公式与单位</p>
                    <div className="flex flex-wrap gap-1.5">
                        {relevantMetrics.map((m) => (
                            <span
                                key={m.metricId}
                                className="text-xs px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200"
                                title={`公式: ${m.formula}\n单位: ${m.unit}`}
                            >
                                {m.label}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* 涉及维度 — 卡片化 */}
            {relevantDimensions.length > 0 && (
                <section>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">🗂️ 涉及维度（{relevantDimensions.length}）</h4>
                    <p className="text-[11px] text-slate-400 mb-2">点击 Tab「维度定义」管理维度值</p>
                    <div className="flex flex-wrap gap-1.5">
                        {relevantDimensions.map((d) => (
                            <span
                                key={d.dimensionId}
                                className="text-xs px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200"
                            >
                                {d.label}（{d.values.length} 项）
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* 阈值规则表格 — 中文来源 */}
            {relevantThresholds.length > 0 && (
                <section>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">⚠️ 阈值规则（{relevantThresholds.length}）</h4>
                    <p className="text-[11px] text-slate-400 mb-2">点击 Tab「阈值规则」修改默认值/警示线/严重线</p>
                    <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-3 py-2 text-slate-500 font-medium">阈值名称</th>
                                <th className="text-left px-3 py-2 text-slate-500 font-medium">默认值</th>
                                <th className="text-left px-3 py-2 text-slate-500 font-medium">警示线</th>
                                <th className="text-left px-3 py-2 text-slate-500 font-medium">严重线</th>
                                <th className="text-left px-3 py-2 text-slate-500 font-medium">配置来源</th>
                            </tr>
                        </thead>
                        <tbody>
                            {relevantThresholds.map((t) => {
                                const source = t.source ?? 'industry';
                                const srcBadge = SOURCE_LABEL[source];
                                return (
                                    <tr key={t.thresholdId} className="border-t border-slate-100">
                                        <td className="px-3 py-2 text-slate-700">{t.label}</td>
                                        <td className="px-3 py-2 font-mono text-xs text-slate-600">
                                            {formatThresholdValue(t.defaultValue, t.unit)}
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs text-amber-600">
                                            {formatThresholdValue(t.warningValue, t.unit)}
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs text-rose-600">
                                            {formatThresholdValue(t.criticalValue, t.unit)}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${srcBadge.cls} font-medium`}>
                                                {srcBadge.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
            )}

            {/* 自定义 sections（如 RegionStore 的区域销售目标） */}
            {customSections?.map((cs) => (
                <section key={cs.id}>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">⚙️ {cs.label}</h4>
                    {cs.render()}
                </section>
            ))}

            {/* 空态提示 */}
            {relevantMetrics.length === 0 && relevantDimensions.length === 0 && relevantThresholds.length === 0 && (!customSections || customSections.length === 0) && (
                <div className="text-center text-slate-400 text-sm py-12 border border-dashed border-slate-200 rounded-lg">
                    <div className="text-3xl mb-2">{tabInfo.icon}</div>
                    <div>「{tabInfo.label}」当前暂无独立配置项</div>
                    <div className="text-xs mt-1">通用指标 / 维度 / 阈值在「基础设定」统一维护</div>
                </div>
            )}
        </div>
    );
}
