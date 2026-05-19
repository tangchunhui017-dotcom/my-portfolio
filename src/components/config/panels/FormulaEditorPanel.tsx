'use client';
/**
 * src/components/config/panels/FormulaEditorPanel.tsx
 * 公式编辑器：品牌覆盖保存 + 中文变量解释 + 聚合口径识别
 */
import { useState, useMemo } from 'react';
import { useMerchConfig } from '@/context/MerchConfigContext';
import { validateFormula, evaluateFormula, extractVariables } from '@/utils/formulaEngine';
import { ALL_TABS, type MetricDefinition, type MetricUnit, type TabKey } from '@/types/merchConfig';

const UNIT_LABEL: Record<MetricUnit, string> = {
    currency: '金额',
    percent: '百分比',
    pairs: '双数',
    count: '数量',
    days: '天',
    weeks: '周',
    times: '次',
    ratio: '比值',
    sqm: '平方米',
};

const TAB_LABEL: Record<TabKey, string> = {
    overview: '总览',
    'annual-control': '年度总控',
    'brand-positioning': '品牌定位',
    'region-store': '区域&门店',
    consumer: '消费者画像',
    'category-ops': '品类运营',
    'wave-planning': '波段企划',
    otb: 'OTB预算',
    cashflow: '现金流',
    forecast: '销售预测',
    pnl: '损益表',
    'competitor-trend': '竞品&趋势',
    'inventory-health': '库存健康',
};

const CATEGORY_LABEL: Record<string, string> = {
    sales: '销售',
    performance: '业绩',
    inventory: '库存',
    assortment: '货品结构',
    channel: '渠道',
    profitability: '盈利能力',
    planning: '计划',
    financial: '财务',
    operation: '运营',
    structure: '结构',
    other: '其他',
};

const TYPE_LABEL: Record<MetricDefinition['defaultMetricType'], string> = {
    standard: '标准指标',
    reference: '参考指标',
    derived: '衍生指标',
};

const SOURCE_LABEL: Record<string, string> = {
    platform: '平台模板',
    industry: '行业模板',
    brand: '品牌覆盖',
    user: '用户自定义',
};

const KNOWN_FIELD_LABEL: Record<string, string> = {
    returnAmount: '退货金额',
    retailPrice: '吊牌价',
    costPrice: '成本价',
    salesTarget: '目标销售额',
    current: '本期值',
    last: '上期值',
    lastYear: '去年同期',
    availableLaunchPairs: '上市可售双数',
    inventoryPairs: '库存双数',
    damagedInventory: '残损库存',
    giftInventory: '赠品库存',
    threshold: '阈值',
    age: '库龄',
    avgWeeklySales: '近4周平均销售双数',
    monthlySales: '月销售双数',
    endingInventory: '期末库存',
    annualCOGS: '年化销售成本',
    avgInventoryCost: '平均库存成本',
    brokenSizeSKU: '断码SKU数',
    totalActiveSKU: '总在售SKU数',
    styleId: '款式ID',
    colorId: '颜色ID',
    sizeId: '尺码ID',
    plannedProductionPairs: '计划生产双数',
    categorySalesAmount: '品类销售额',
    priceBandSalesAmount: '价格带销售额',
    channelSalesAmount: '渠道销售额',
    totalSalesAmount: '总销售额',
    costOfGoods: '销售成本',
    salesPlanCost: '销售计划成本',
    endingInventoryTarget: '期末库存目标',
    beginningInventory: '期初库存',
    annualTarget: '年度目标',
    seasonRatio: '季节占比',
    waveSalesRatio: '波段占比',
    outbound: '销售出库',
    pairs: '双数',
};

const AGGREGATE_WORDS = new Set(['sum', 'count', 'avg', 'min', 'max', 'distinct', 'where']);
const EMPTY_TEST_VALUES: Record<string, string> = {};

function isAggregateFormula(formula: string): boolean {
    return /\b(sum|count|avg|min|max)\s*\(/i.test(formula) || /\bdistinct\b/i.test(formula) || /\bwhere\b/i.test(formula);
}

function extractIdentifiers(formula: string): string[] {
    const matches = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? [];
    return Array.from(new Set(matches.filter((m) => !AGGREGATE_WORDS.has(m.toLowerCase()))));
}

function getUnitLabel(unit?: string): string {
    return unit && unit in UNIT_LABEL ? UNIT_LABEL[unit as MetricUnit] : unit ?? '-';
}

function getCategoryLabel(category?: string): string {
    return CATEGORY_LABEL[category ?? 'other'] ?? category ?? '其他';
}

function formatMetricValue(value: number, unit: MetricUnit): string {
    if (unit === 'percent') return `${(value * 100).toFixed(2)}%`;
    if (unit === 'currency') return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
    if (unit === 'pairs') return `${Math.round(value).toLocaleString('zh-CN')} 双`;
    if (unit === 'count') return `${Math.round(value).toLocaleString('zh-CN')} 项`;
    if (unit === 'days') return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 1 })} 天`;
    if (unit === 'weeks') return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 1 })} 周`;
    if (unit === 'times') return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 次`;
    if (unit === 'ratio') return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
    if (unit === 'sqm') return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 1 })} 平方米`;
    return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function describeVariable(variableId: string, metrics: Map<string, MetricDefinition>) {
    const metric = metrics.get(variableId);
    if (metric) {
        return {
            label: metric.label,
            source: '指标',
            detail: `${getCategoryLabel(metric.category)} · ${getUnitLabel(metric.unit)}`,
        };
    }
    return {
        label: KNOWN_FIELD_LABEL[variableId] ?? variableId,
        source: '外部字段',
        detail: KNOWN_FIELD_LABEL[variableId] ? '来自ERP/门店/商品主数据' : '未登记中文名',
    };
}

function appendToken(formula: string, token: string): string {
    if (!formula.trim()) return token;
    return `${formula}${formula.endsWith(' ') ? '' : ' '}${token}`;
}

export default function FormulaEditorPanel() {
    const { metrics, overrideMap, saveMetricOverride, resetMetricOverride } = useMerchConfig();
    const metricList = useMemo(() => Array.from(metrics.values()), [metrics]);
    const categories = useMemo(
        () => Array.from(new Set(metricList.map((m) => m.category ?? 'other'))),
        [metricList]
    );

    const [selectedId, setSelectedId] = useState<string>(metricList[0]?.metricId ?? '');
    const [filterTab, setFilterTab] = useState<TabKey | 'all'>('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [draftState, setDraftState] = useState<{
        metricId: string;
        baseFormula: string;
        value: string;
    } | null>(null);
    const [testValuesByMetric, setTestValuesByMetric] = useState<Record<string, Record<string, string>>>({});

    const filteredMetricList = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return metricList.filter((m) => {
            if (filterTab !== 'all' && !m.usedBy.includes(filterTab)) return false;
            if (filterCategory !== 'all' && (m.category ?? 'other') !== filterCategory) return false;
            if (keyword && !`${m.label} ${m.metricId} ${m.description}`.toLowerCase().includes(keyword)) return false;
            return true;
        });
    }, [filterCategory, filterTab, metricList, search]);

    const selectedMetricId = useMemo(() => {
        if (filteredMetricList.some((m) => m.metricId === selectedId)) return selectedId;
        return filteredMetricList[0]?.metricId ?? selectedId;
    }, [filteredMetricList, selectedId]);

    const metric = metrics.get(selectedMetricId);
    const draftFormula = metric && draftState?.metricId === metric.metricId && draftState.baseFormula === metric.formula
        ? draftState.value
        : metric?.formula ?? '';
    const testValues = useMemo(() => {
        if (!metric) return EMPTY_TEST_VALUES;
        return testValuesByMetric[metric.metricId] ?? EMPTY_TEST_VALUES;
    }, [metric, testValuesByMetric]);

    const setFormulaDraft = (next: string | ((prev: string) => string)) => {
        if (!metric) return;
        setDraftState((prev) => {
            const current = prev?.metricId === metric.metricId && prev.baseFormula === metric.formula
                ? prev.value
                : metric.formula;
            return {
                metricId: metric.metricId,
                baseFormula: metric.formula,
                value: typeof next === 'function' ? next(current) : next,
            };
        });
    };

    const setMetricTestValue = (variableId: string, value: string) => {
        if (!metric) return;
        setTestValuesByMetric((prev) => ({
            ...prev,
            [metric.metricId]: {
                ...(prev[metric.metricId] ?? {}),
                [variableId]: value,
            },
        }));
    };

    const formulaMode = useMemo<'aggregate' | 'expression'>(
        () => (isAggregateFormula(draftFormula) ? 'aggregate' : 'expression'),
        [draftFormula]
    );

    const validation = useMemo(() => {
        if (formulaMode === 'aggregate') {
            return draftFormula.trim()
                ? { ok: true }
                : { ok: false, error: '公式不能为空' };
        }
        return validateFormula(draftFormula);
    }, [draftFormula, formulaMode]);

    const variables = useMemo(
        () => (formulaMode === 'expression' && validation.ok ? extractVariables(draftFormula) : []),
        [draftFormula, formulaMode, validation.ok]
    );
    const aggregateIdentifiers = useMemo(
        () => (formulaMode === 'aggregate' ? extractIdentifiers(draftFormula) : []),
        [draftFormula, formulaMode]
    );

    const relatedMetrics = useMemo(() => {
        if (!metric) return metricList.slice(0, 12);
        const usedBy = new Set(metric.usedBy);
        return metricList
            .filter((m) => m.metricId !== metric.metricId)
            .filter((m) => (m.category && m.category === metric.category) || m.usedBy.some((tab) => usedBy.has(tab)))
            .slice(0, 12);
    }, [metric, metricList]);

    const testPreview = useMemo(() => {
        if (formulaMode === 'aggregate') return { status: 'aggregate' as const };
        if (!validation.ok) return { status: 'invalid' as const };

        const missing = variables.filter((v) => (testValues[v] ?? '').trim() === '');
        if (missing.length > 0) return { status: 'missing' as const, missing };

        const numericVars: Record<string, number> = {};
        const invalid: string[] = [];
        for (const v of variables) {
            const raw = testValues[v];
            const value = Number(raw);
            if (!Number.isFinite(value)) {
                invalid.push(v);
            } else {
                numericVars[v] = value;
            }
        }
        if (invalid.length > 0) return { status: 'bad-value' as const, invalid };

        const value = evaluateFormula(draftFormula, numericVars);
        if (value === null || value === undefined) return { status: 'error' as const };
        return { status: 'ok' as const, value };
    }, [draftFormula, formulaMode, testValues, validation.ok, variables]);

    const isDirty = metric ? draftFormula.trim() !== metric.formula : false;
    const isOverride = metric ? overrideMap.metrics.has(metric.metricId) : false;

    const handleResetDraft = () => {
        if (!metric) return;
        setDraftState(null);
        setTestValuesByMetric((prev) => ({ ...prev, [metric.metricId]: {} }));
    };

    const handleSave = () => {
        if (!metric || !validation.ok) return;
        saveMetricOverride({
            ...metric,
            formula: draftFormula.trim(),
            variables: formulaMode === 'expression' ? variables : metric.variables,
            source: 'brand',
        });
    };

    const handleResetOverride = () => {
        if (!metric) return;
        resetMetricOverride(metric.metricId);
        setDraftState(null);
    };

    return (
        <div className="space-y-5">
            <header className="border-b border-slate-100 pb-3">
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
                    🧮 公式编辑器
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                    编辑指标计算公式，支持品牌覆盖；数据源聚合口径会单独标识，不强行前端试算。
                </p>
            </header>

            <section className="flex flex-wrap items-center gap-2">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索指标名称或ID..."
                    className="min-w-[180px] flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                />
                <select
                    value={filterTab}
                    onChange={(e) => setFilterTab(e.target.value as TabKey | 'all')}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none"
                >
                    <option value="all">全部业务模块</option>
                    {ALL_TABS.map((tab) => (
                        <option key={tab} value={tab}>
                            {TAB_LABEL[tab]}
                        </option>
                    ))}
                </select>
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none"
                >
                    <option value="all">全部指标类别</option>
                    {categories.map((category) => (
                        <option key={category} value={category}>
                            {getCategoryLabel(category)}
                        </option>
                    ))}
                </select>
                <span className="text-xs text-slate-400">{filteredMetricList.length} 个指标</span>
            </section>

            <section>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-slate-700">选择要编辑的指标</label>
                    <span className="text-[11px] text-slate-400">来自「指标定义」的标准指标，不包含维度值和业务规则</span>
                </div>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {filteredMetricList.map((m) => {
                        const active = m.metricId === selectedMetricId;
                        return (
                            <button
                                key={m.metricId}
                                type="button"
                                onClick={() => setSelectedId(m.metricId)}
                                className={`grid w-full grid-cols-[minmax(180px,1fr)_auto] items-center gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-sky-50/60 ${
                                    active ? 'bg-sky-50 text-sky-800' : 'text-slate-700'
                                }`}
                            >
                                <span className="min-w-0">
                                    <span className="block truncate font-semibold">{m.label}</span>
                                    <span className="mt-0.5 block truncate font-mono text-[11px] text-slate-400">{m.metricId}</span>
                                </span>
                                <span className="flex flex-wrap justify-end gap-1.5">
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                        {getUnitLabel(m.unit)}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                        {getCategoryLabel(m.category)}
                                    </span>
                                    {overrideMap.metrics.has(m.metricId) && (
                                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                                            品牌覆盖
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
                {filteredMetricList.length === 0 && (
                    <p className="mt-1.5 text-xs text-rose-500">没有匹配的指标，请调整筛选条件。</p>
                )}
            </section>

            {metric && (
                <>
                    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-800">{metric.label}</h4>
                                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">
                                        {TYPE_LABEL[metric.defaultMetricType]}
                                    </span>
                                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">
                                        {getCategoryLabel(metric.category)}
                                    </span>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] ring-1 ${
                                        isOverride
                                            ? 'bg-amber-50 text-amber-700 ring-amber-200'
                                            : 'bg-white text-slate-500 ring-slate-200'
                                    }`}>
                                        {isOverride ? '当前品牌已覆盖' : SOURCE_LABEL[metric.source] ?? '行业模板'}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">{metric.description}</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {metric.usedBy.map((tab) => (
                                    <span key={tab} className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700">
                                        {TAB_LABEL[tab]}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                            <label className="text-xs font-semibold text-slate-700">
                                公式表达式
                                {isDirty && <span className="ml-2 text-amber-600">● 未保存</span>}
                            </label>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                                formulaMode === 'aggregate'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-emerald-50 text-emerald-700'
                            }`}>
                                {formulaMode === 'aggregate' ? '数据源聚合口径' : '前端可试算公式'}
                            </span>
                        </div>
                        <textarea
                            value={draftFormula}
                            onChange={(e) => setFormulaDraft(e.target.value)}
                            rows={4}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-sky-200"
                            placeholder="例如: salesPairs * avgSellingPrice"
                        />

                        <div className="mt-2 grid gap-2 lg:grid-cols-2">
                            <div className="rounded-lg border border-slate-100 bg-white p-3">
                                <div className="mb-2 text-[11px] font-semibold text-slate-500">可插入指标</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {relatedMetrics.map((m) => (
                                        <button
                                            key={m.metricId}
                                            type="button"
                                            onClick={() => setFormulaDraft((prev) => appendToken(prev, m.metricId))}
                                            className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                                            title={m.metricId}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-white p-3">
                                <div className="mb-2 text-[11px] font-semibold text-slate-500">运算符</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {['+', '-', '*', '/', '(', ')'].map((op) => (
                                        <button
                                            key={op}
                                            type="button"
                                            onClick={() => setFormulaDraft((prev) => appendToken(prev, op))}
                                            className="min-w-8 rounded border border-slate-200 px-2 py-1 font-mono text-xs text-slate-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                                        >
                                            {op}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[11px]">
                                {validation.ok ? (
                                    formulaMode === 'aggregate' ? (
                                        <span className="text-amber-600">已识别为聚合口径，需由数据层计算后回传结果</span>
                                    ) : (
                                        <span className="text-emerald-600">语法正确，可进行测试预览</span>
                                    )
                                ) : (
                                    <span className="text-rose-600">语法错误：{validation.error}</span>
                                )}
                            </div>
                            <div className="flex gap-1.5">
                                {isOverride && (
                                    <button
                                        type="button"
                                        onClick={handleResetOverride}
                                        className="rounded border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50"
                                    >
                                        还原模板
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleResetDraft}
                                    disabled={!isDirty}
                                    className="rounded border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    还原草稿
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={!isDirty || !validation.ok}
                                    className="rounded bg-sky-600 px-3 py-1 text-xs text-white hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400"
                                >
                                    保存到品牌覆盖
                                </button>
                            </div>
                        </div>
                    </section>

                    {formulaMode === 'aggregate' ? (
                        <section className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
                            <div className="text-xs font-semibold text-amber-800">数据源聚合口径</div>
                            <p className="mt-1 text-xs leading-6 text-amber-700">
                                这类公式用于定义从ERP、门店流水、库存明细里如何汇总指标，不在浏览器里试算。
                                接入真实数据后，后端或数据层按这个口径输出结果，前端只消费指标值。
                            </p>
                            {aggregateIdentifiers.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {aggregateIdentifiers.map((id) => {
                                        const item = describeVariable(id, metrics);
                                        return (
                                            <span key={id} className="rounded-full bg-white px-2 py-1 text-[11px] text-amber-800 ring-1 ring-amber-100">
                                                {item.label} <span className="text-amber-500">({id})</span>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    ) : (
                        <section>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                变量赋值（测试预览）
                            </label>
                            {variables.length > 0 ? (
                                <div className="grid gap-2 lg:grid-cols-2">
                                    {variables.map((variableId) => {
                                        const item = describeVariable(variableId, metrics);
                                        return (
                                            <div key={variableId} className="rounded-lg border border-slate-100 bg-white p-3">
                                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-700">{item.label}</div>
                                                        <div className="mt-0.5 font-mono text-[11px] text-slate-400">{variableId}</div>
                                                    </div>
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                                        {item.source} · {item.detail}
                                                    </span>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={testValues[variableId] ?? ''}
                                                    onChange={(e) => setMetricTestValue(variableId, e.target.value)}
                                                    placeholder="输入测试值"
                                                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-sky-200"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
                                    当前公式没有变量，可直接查看计算结果。
                                </div>
                            )}

                            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                <div className="mb-1 text-[11px] text-slate-500">计算结果</div>
                                <div className="text-base font-semibold text-slate-800">
                                    {testPreview.status === 'ok' && formatMetricValue(testPreview.value, metric.unit)}
                                    {testPreview.status === 'missing' && '请先填写所有测试变量'}
                                    {testPreview.status === 'bad-value' && '测试变量必须是数字'}
                                    {testPreview.status === 'invalid' && '公式语法错误，暂不能试算'}
                                    {testPreview.status === 'error' && '无法计算，请检查分母是否为0或变量是否合理'}
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-400">
                        说明：四则运算公式可在前端试算；带 sum、count、distinct、where 的公式属于数据层聚合口径。
                        变量名仍使用指标ID或主数据字段ID，中文说明用于配置识别，不改变数据接口字段。
                    </section>
                </>
            )}
        </div>
    );
}
