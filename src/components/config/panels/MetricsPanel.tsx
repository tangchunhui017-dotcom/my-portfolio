'use client';
/**
 * src/components/config/panels/MetricsPanel.tsx
 * 指标定义管理面板 V18 — 中文化 + 图标按钮 + 隐藏内部ID
 */
import { useState } from 'react';
import { useMerchConfig } from '@/context/MerchConfigContext';
import { ALL_TABS, type TabKey, type MetricDefinition, type MetricUnit } from '@/types/merchConfig';

const UNIT_LABEL: Record<string, string> = {
    currency: '金额', percent: '百分比', pairs: '双数', count: '数量',
    days: '天', weeks: '周', times: '次', ratio: '比值', sqm: '平方米',
};

// 业务模块 TabKey → 中文（与 src/types/merchConfig.ts 的 TabKey 严格对齐）
const TAB_LABEL: Record<string, string> = {
    'overview':         '总览',
    'annual-control':   '年度总控',
    'region-store':     '区域&门店',
    'consumer':         '消费者画像',
    'category-ops':     '品类运营',
    'wave-planning':    '波段企划',
    'otb':              'OTB预算',
    'cashflow':         '现金流',
    'forecast':         '销售预测',
    'pnl':              '损益表',
    'competitor-trend': '竞品&趋势',
    'inventory-health': '库存健康',
};

// 业务类别中文映射（覆盖现有 metrics.json 中所有 category 值）
const CATEGORY_LABEL: Record<string, { label: string; cls: string }> = {
    sales:         { label: '销售',     cls: 'bg-sky-50 text-sky-700 border border-sky-100' },
    performance:   { label: '业绩',     cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    inventory:     { label: '库存',     cls: 'bg-violet-50 text-violet-700 border border-violet-100' },
    financial:     { label: '财务',     cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
    operation:     { label: '运营',     cls: 'bg-pink-50 text-pink-700 border border-pink-100' },
    structure:     { label: '结构',     cls: 'bg-indigo-50 text-indigo-700 border border-indigo-100' },
    assortment:    { label: '货品结构', cls: 'bg-teal-50 text-teal-700 border border-teal-100' },
    channel:       { label: '渠道',     cls: 'bg-cyan-50 text-cyan-700 border border-cyan-100' },
    profitability: { label: '盈利能力', cls: 'bg-rose-50 text-rose-700 border border-rose-100' },
    planning:      { label: '计划',     cls: 'bg-lime-50 text-lime-700 border border-lime-100' },
    cashflow:      { label: '现金流',   cls: 'bg-sky-50 text-sky-700 border border-sky-100' },
    pnl:           { label: '损益',     cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
    'data-source': { label: '数据层',   cls: 'bg-slate-100 text-slate-500 border border-slate-200' },
    other:         { label: '其他',     cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

// 公式中常见变量名 → 中文（用于 hover 翻译）
const VAR_CN: Record<string, string> = {
    salesPairs: '销售双数', salesAmount: '销售额', netSalesAmount: '净销售额',
    retailSalesAmount: '吊牌销售额', returnAmount: '退货金额',
    avgSellingPrice: '平均成交价', retailPrice: '吊牌价', costPrice: '成本价',
    salesTarget: '目标销售额', current: '本期值', last: '上期值', lastYear: '去年同期',
    availableLaunchPairs: '上市可售双数', inventoryPairs: '库存双数',
    inventoryCost: '库存成本', damagedInventory: '残损库存', giftInventory: '赠品库存',
    avgWeeklySales: '周均销售', monthlySales: '月销售', endingInventory: '月末库存',
    annualCOGS: '年化销售成本', avgInventoryCost: '平均库存成本',
    brokenSizeSKU: '断码 SKU', totalActiveSKU: '总在售 SKU',
    styleId: '款式 ID', colorId: '色号 ID', sizeId: '尺码 ID',
    plannedProductionPairs: '计划生产双数', skcCount: 'SKC 数', styleCount: '款数',
    categorySalesAmount: '品类销售额', totalSalesAmount: '总销售额',
    priceBandSalesAmount: '价格带销售额', channelSalesAmount: '渠道销售额',
    roleAmount: '角色销售额', annualTarget: '年度目标', seasonRatio: '季节占比',
    seasonSalesTarget: '季节销售目标', waveSalesRatio: '波段占比',
};

// 把公式翻译成"中文 + 英文"对照（用于 title 提示）
function translateFormulaToCN(formula: string): string {
    if (!formula) return '';
    const translated = formula.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (m) => VAR_CN[m] ?? m);
    return `公式：${formula}\n中文对照：${translated}`;
}

export default function MetricsPanel() {
    const { metrics, overrideMap, saveMetricOverride, resetMetricOverride } = useMerchConfig();
    const [filterTab, setFilterTab] = useState<TabKey | 'all'>('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [editingMetric, setEditingMetric] = useState<MetricDefinition | null>(null);

    const categories = Array.from(new Set(Array.from(metrics.values()).map((m) => m.category ?? '其他')));

    const list = Array.from(metrics.values()).filter((m) => {
        if (filterTab !== 'all' && !m.usedBy.includes(filterTab as TabKey)) return false;
        if (filterCategory !== 'all' && (m.category ?? '其他') !== filterCategory) return false;
        if (search && !`${m.label} ${m.description}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-4">
            {/* 筛选栏 */}
            <div className="flex flex-wrap items-center gap-2">
                <input
                    placeholder="搜索指标名称..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[160px] outline-none focus:ring-2 focus:ring-sky-200"
                />
                <select
                    value={filterTab}
                    onChange={(e) => setFilterTab(e.target.value as TabKey | 'all')}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none"
                >
                    <option value="all">全部业务模块</option>
                    {ALL_TABS.map((t) => (
                        <option key={t} value={t}>{TAB_LABEL[t] ?? t}</option>
                    ))}
                </select>
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none"
                >
                    <option value="all">全部类别</option>
                    {categories.map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABEL[c]?.label ?? c}</option>
                    ))}
                </select>
                <span className="text-xs text-slate-400">{list.length} 个指标</span>
            </div>

            {/* 指标表格 */}
            <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">指标名称</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">类别</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">单位</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs max-w-[200px]">计算公式</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">应用模块</th>
                            <th className="text-left px-4 py-2.5 text-slate-500 font-medium text-xs">来源</th>
                            <th className="text-right px-4 py-2.5 text-slate-500 font-medium text-xs w-24">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((m) => (
                            <tr key={m.metricId} className="border-t border-slate-100 hover:bg-slate-50/50">
                                <td className="px-4 py-2.5">
                                    <div className="font-medium text-slate-800">{m.label}</div>
                                    {m.description && (
                                        <div className="text-[10px] text-slate-400 mt-0.5 max-w-[160px] truncate" title={m.description}>
                                            {m.description}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-2.5">
                                    {(() => {
                                        const cat = CATEGORY_LABEL[m.category ?? 'other'] ?? CATEGORY_LABEL.other;
                                        return (
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.cls}`}>
                                                {cat.label}
                                            </span>
                                        );
                                    })()}
                                </td>
                                <td className="px-4 py-2.5 text-slate-500 text-xs">
                                    {UNIT_LABEL[m.unit] ?? m.unit}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-xs text-slate-500 max-w-[200px] truncate"
                                    title={translateFormulaToCN(m.formula)}>
                                    {m.formula}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-400">
                                    <span className="rounded-full bg-sky-50 text-sky-600 px-2 py-0.5">
                                        {m.usedBy.length} 个模块
                                    </span>
                                </td>
                                <td className="px-4 py-2.5">
                                    {overrideMap.metrics.has(m.metricId) ? (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                            品牌自定义
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-slate-400">行业模板</span>
                                    )}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <span className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => setEditingMetric(m)}
                                            className="text-slate-400 hover:text-sky-600 transition-colors"
                                            title="编辑"
                                        >
                                            ✏️
                                        </button>
                                        {overrideMap.metrics.has(m.metricId) && (
                                            <button
                                                onClick={() => resetMetricOverride(m.metricId)}
                                                className="text-amber-500 hover:text-rose-600 transition-colors"
                                                title="还原到行业模板"
                                            >
                                                ↶
                                            </button>
                                        )}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {list.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                                    无匹配指标
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editingMetric && (
                <MetricEditorDrawer
                    metric={editingMetric}
                    onClose={() => setEditingMetric(null)}
                    onSave={(next) => {
                        saveMetricOverride(next);
                        setEditingMetric(null);
                    }}
                />
            )}
        </div>
    );
}

const UNIT_OPTIONS: MetricUnit[] = ['currency', 'percent', 'pairs', 'count', 'days', 'weeks', 'times', 'ratio', 'sqm'];

function MetricEditorDrawer({
    metric,
    onClose,
    onSave,
}: {
    metric: MetricDefinition;
    onClose: () => void;
    onSave: (next: MetricDefinition) => void;
}) {
    const [label, setLabel] = useState(metric.label);
    const [description, setDescription] = useState(metric.description ?? '');
    const [formula, setFormula] = useState(metric.formula);
    const [unit, setUnit] = useState<MetricUnit>(metric.unit);

    function handleSave() {
        const trimmedLabel = label.trim();
        const trimmedFormula = formula.trim();
        if (!trimmedLabel || !trimmedFormula) return;
        onSave({
            ...metric,
            label: trimmedLabel,
            description: description.trim(),
            formula: trimmedFormula,
            unit,
        });
    }

    return (
        <>
            <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
            <div className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <div className="text-base font-semibold text-slate-800">编辑指标</div>
                        <div className="text-[11px] text-slate-400 font-mono">{metric.metricId}</div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    <div>
                        <label className="text-xs font-medium text-slate-600">中文标签</label>
                        <input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                            placeholder="例如：销售额"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-600">描述</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                            placeholder="一句话说明该指标的口径"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-600">单位</label>
                        <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value as MetricUnit)}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                        >
                            {UNIT_OPTIONS.map((u) => (
                                <option key={u} value={u}>{UNIT_LABEL[u] ?? u}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-600">计算公式</label>
                        <textarea
                            value={formula}
                            onChange={(e) => setFormula(e.target.value)}
                            rows={3}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 font-mono"
                            placeholder="例如：salesPairs * avgSellingPrice"
                        />
                        <p className="mt-1 text-[11px] text-slate-400">引用其他指标 metricId 或数据层原子变量；保存后健康检查会自动校验。</p>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                        <div>来源：{metric.source === 'brand' ? '品牌覆盖' : '行业模板'}</div>
                        <div className="mt-0.5">应用模块：{metric.usedBy.length} 个（在此弹层不可改，请在「业务模块配置」中调整）</div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        className="rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
                        disabled={!label.trim() || !formula.trim()}
                    >
                        保存到当前品牌
                    </button>
                </div>
            </div>
        </>
    );
}
