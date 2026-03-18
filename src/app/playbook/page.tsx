'use client';

import { useMemo, useState } from 'react';
import {
    BUILTIN_METHODOLOGY_TEMPLATES,
    FormulaRule,
    MethodologyTemplate,
    ThresholdRule,
    cloneMethodologyTemplate,
} from '@/config/methodologyTemplates';

const CUSTOM_TEMPLATE_STORAGE_KEY = 'portfolio-playbook-custom-templates-v1';
const ACTIVE_TEMPLATE_STORAGE_KEY = 'portfolio-playbook-active-template-id-v1';

type ThresholdNumericField = 'healthyLow' | 'healthyHigh' | 'warningLow' | 'warningHigh' | 'riskLow' | 'riskHigh';

const THRESHOLD_INPUTS: Array<{ field: ThresholdNumericField; label: string }> = [
    { field: 'healthyLow', label: '健康下限 >=' },
    { field: 'healthyHigh', label: '健康上限 <=' },
    { field: 'warningLow', label: '预警下限 >=' },
    { field: 'warningHigh', label: '预警上限 <=' },
    { field: 'riskLow', label: '风险下限 >=' },
    { field: 'riskHigh', label: '风险上限 <=' },
];

const PLANNING_TEMPLATES = [
    {
        name: 'Range Plan 模板',
        description: 'SKU × 价格带 × 渠道规划表',
    },
    {
        name: '季节波段计划',
        description: '上市节奏与补货建议模板',
    },
    {
        name: 'OTB 预算表',
        description: '预算测算与采购额度模板',
    },
];

const REVIEW_MECHANISMS = [
    {
        title: '设计评审清单',
        description: '从企划意图、楦型匹配、尺码结构到终端上架条件，逐条校验。',
    },
    {
        title: '成本与毛利评审',
        description: '按价格带和渠道拆解目标毛利，避免上市后被动折扣。',
    },
    {
        title: '企划执行偏差复盘',
        description: '聚焦销发比、SKU利用率、单款产出和断码风险，形成闭环动作。',
    },
];

function parseStoredCustomTemplates(raw: string | null): MethodologyTemplate[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as MethodologyTemplate[];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((template) => template && typeof template.id === 'string' && Array.isArray(template.thresholds) && Array.isArray(template.formulas))
            .map((template) => ({
                ...template,
                builtIn: false,
                thresholds: template.thresholds.map((rule) => ({
                    ...rule,
                    healthyLow: rule.healthyLow ?? null,
                    healthyHigh: rule.healthyHigh ?? null,
                    warningLow: rule.warningLow ?? null,
                    warningHigh: rule.warningHigh ?? null,
                    riskLow: rule.riskLow ?? null,
                    riskHigh: rule.riskHigh ?? null,
                })),
                formulas: template.formulas.map((rule) => ({
                    ...rule,
                    fields: Array.isArray(rule.fields) ? rule.fields : [],
                })),
            }));
    } catch {
        return [];
    }
}

function valueForInput(value: number | null, valueType: ThresholdRule['valueType']) {
    if (value === null) return '';
    const normalized = valueType === 'ratio' ? value * 100 : value;
    const rounded = Math.round(normalized * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function parseInputValue(raw: string, valueType: ThresholdRule['valueType']) {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return null;
    return valueType === 'ratio' ? numeric / 100 : numeric;
}

function formatTemplateDate(dateValue: string) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function resolveInitialTemplateState() {
    const defaultTemplate = BUILTIN_METHODOLOGY_TEMPLATES[0]
        ? cloneMethodologyTemplate(BUILTIN_METHODOLOGY_TEMPLATES[0])
        : null;
    const defaultTemplateId = defaultTemplate?.id ?? '';
    const defaultStatus = '已加载内置模板，可编辑后保存为自定义版本。';

    if (typeof window === 'undefined') {
        return {
            customTemplates: [] as MethodologyTemplate[],
            selectedTemplateId: defaultTemplateId,
            draftTemplate: defaultTemplate,
            statusMessage: defaultStatus,
        };
    }

    const storedCustomTemplates = parseStoredCustomTemplates(window.localStorage.getItem(CUSTOM_TEMPLATE_STORAGE_KEY));
    const mergedTemplates = [...BUILTIN_METHODOLOGY_TEMPLATES, ...storedCustomTemplates];
    const activeTemplateId = window.localStorage.getItem(ACTIVE_TEMPLATE_STORAGE_KEY);
    const initialTemplate = mergedTemplates.find((template) => template.id === activeTemplateId) ?? mergedTemplates[0] ?? defaultTemplate;

    return {
        customTemplates: storedCustomTemplates,
        selectedTemplateId: initialTemplate?.id ?? defaultTemplateId,
        draftTemplate: initialTemplate ? cloneMethodologyTemplate(initialTemplate) : defaultTemplate,
        statusMessage: initialTemplate ? `已加载模板：${initialTemplate.name}` : defaultStatus,
    };
}

export default function PlaybookPage() {
    const [initialState] = useState(resolveInitialTemplateState);
    const [customTemplates, setCustomTemplates] = useState<MethodologyTemplate[]>(initialState.customTemplates);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialState.selectedTemplateId);
    const [draftTemplate, setDraftTemplate] = useState<MethodologyTemplate | null>(initialState.draftTemplate);
    const [statusMessage, setStatusMessage] = useState(initialState.statusMessage);

    const allTemplates = useMemo(
        () => [...BUILTIN_METHODOLOGY_TEMPLATES, ...customTemplates],
        [customTemplates],
    );

    const selectedTemplateMeta = useMemo(
        () => allTemplates.find((template) => template.id === selectedTemplateId) ?? null,
        [allTemplates, selectedTemplateId],
    );

    const persistCustomTemplates = (templates: MethodologyTemplate[]) => {
        setCustomTemplates(templates);
        window.localStorage.setItem(CUSTOM_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
    };

    const switchTemplate = (templateId: string) => {
        const target = allTemplates.find((template) => template.id === templateId);
        if (!target) return;
        setSelectedTemplateId(templateId);
        setDraftTemplate(cloneMethodologyTemplate(target));
        window.localStorage.setItem(ACTIVE_TEMPLATE_STORAGE_KEY, templateId);
        setStatusMessage(`已加载模板：${target.name}`);
    };

    const updateDraftMeta = (field: 'name' | 'standard' | 'description', value: string) => {
        setDraftTemplate((current) => {
            if (!current) return current;
            return {
                ...current,
                [field]: value,
            };
        });
    };

    const updateThresholdValue = (thresholdId: string, field: ThresholdNumericField, raw: string) => {
        setDraftTemplate((current) => {
            if (!current) return current;
            return {
                ...current,
                thresholds: current.thresholds.map((threshold) => {
                    if (threshold.id !== thresholdId) return threshold;
                    return {
                        ...threshold,
                        [field]: parseInputValue(raw, threshold.valueType),
                    };
                }),
            };
        });
    };

    const updateThresholdText = (thresholdId: string, field: 'metric' | 'note', value: string) => {
        setDraftTemplate((current) => {
            if (!current) return current;
            return {
                ...current,
                thresholds: current.thresholds.map((threshold) => {
                    if (threshold.id !== thresholdId) return threshold;
                    return {
                        ...threshold,
                        [field]: value,
                    };
                }),
            };
        });
    };

    const updateThresholdType = (thresholdId: string, valueType: ThresholdRule['valueType']) => {
        setDraftTemplate((current) => {
            if (!current) return current;
            return {
                ...current,
                thresholds: current.thresholds.map((threshold) => {
                    if (threshold.id !== thresholdId) return threshold;
                    if (threshold.valueType === valueType) return threshold;
                    return {
                        ...threshold,
                        valueType,
                    };
                }),
            };
        });
    };

    const addThreshold = () => {
        setDraftTemplate((current) => {
            if (!current) return current;
            return {
                ...current,
                thresholds: [
                    ...current.thresholds,
                    {
                        id: `threshold-${Date.now()}`,
                        metric: '新指标阈值',
                        valueType: 'ratio',
                        healthyLow: null,
                        healthyHigh: null,
                        warningLow: null,
                        warningHigh: null,
                        riskLow: null,
                        riskHigh: null,
                        note: '补充该指标在不同体系下的红黄绿判断规则。',
                    },
                ],
            };
        });
    };

    const removeThreshold = (thresholdId: string) => {
        setDraftTemplate((current) => {
            if (!current) return current;
            return {
                ...current,
                thresholds: current.thresholds.filter((threshold) => threshold.id !== thresholdId),
            };
        });
    };

    const updateFormula = (formulaId: string, patch: Partial<FormulaRule>) => {
        setDraftTemplate((current) => {
            if (!current) return current;
            return {
                ...current,
                formulas: current.formulas.map((formula) => {
                    if (formula.id !== formulaId) return formula;
                    return {
                        ...formula,
                        ...patch,
                    };
                }),
            };
        });
    };

    const addFormula = () => {
        setDraftTemplate((current) => {
            if (!current) return current;
            return {
                ...current,
                formulas: [
                    ...current.formulas,
                    {
                        id: `formula-${Date.now()}`,
                        metric: '新公式',
                        displayUnit: '%',
                        formula: '指标 = 字段A / 字段B',
                        fields: ['字段A', '字段B'],
                        note: '补充公式适用的筛选口径和例外条件。',
                    },
                ],
            };
        });
    };

    const removeFormula = (formulaId: string) => {
        setDraftTemplate((current) => {
            if (!current) return current;
            return {
                ...current,
                formulas: current.formulas.filter((formula) => formula.id !== formulaId),
            };
        });
    };

    const saveTemplate = () => {
        if (!draftTemplate) return;

        const baseToSave = cloneMethodologyTemplate(draftTemplate);
        const isBuiltIn = selectedTemplateMeta?.builtIn ?? false;

        const toSave: MethodologyTemplate = {
            ...baseToSave,
            id: isBuiltIn ? `custom-${Date.now()}` : baseToSave.id,
            name: isBuiltIn && !baseToSave.name.includes('自定义') ? `${baseToSave.name}（自定义）` : baseToSave.name,
            builtIn: false,
            updatedAt: new Date().toISOString(),
        };

        const exists = customTemplates.some((template) => template.id === toSave.id);
        const nextCustomTemplates = exists
            ? customTemplates.map((template) => (template.id === toSave.id ? toSave : template))
            : [...customTemplates, toSave];

        persistCustomTemplates(nextCustomTemplates);
        setSelectedTemplateId(toSave.id);
        setDraftTemplate(cloneMethodologyTemplate(toSave));
        window.localStorage.setItem(ACTIVE_TEMPLATE_STORAGE_KEY, toSave.id);
        setStatusMessage(isBuiltIn ? '已另存为自定义模板。' : '模板已保存。');
    };

    const createTemplateCopy = () => {
        if (!draftTemplate) return;
        const copy: MethodologyTemplate = {
            ...cloneMethodologyTemplate(draftTemplate),
            id: `custom-${Date.now()}`,
            name: `${draftTemplate.name} 副本`,
            builtIn: false,
            updatedAt: new Date().toISOString(),
        };
        const nextCustomTemplates = [...customTemplates, copy];
        persistCustomTemplates(nextCustomTemplates);
        setSelectedTemplateId(copy.id);
        setDraftTemplate(cloneMethodologyTemplate(copy));
        window.localStorage.setItem(ACTIVE_TEMPLATE_STORAGE_KEY, copy.id);
        setStatusMessage('已创建模板副本，可继续编辑。');
    };

    const resetDraft = () => {
        if (!selectedTemplateMeta) return;
        setDraftTemplate(cloneMethodologyTemplate(selectedTemplateMeta));
        setStatusMessage('已恢复到模板最近保存版本。');
    };

    const deleteCurrentTemplate = () => {
        if (!selectedTemplateMeta) return;
        if (selectedTemplateMeta.builtIn) {
            setStatusMessage('内置模板不可删除。');
            return;
        }

        const nextCustomTemplates = customTemplates.filter((template) => template.id !== selectedTemplateMeta.id);
        persistCustomTemplates(nextCustomTemplates);

        const nextAllTemplates = [...BUILTIN_METHODOLOGY_TEMPLATES, ...nextCustomTemplates];
        const fallback = nextAllTemplates[0] ?? null;

        if (fallback) {
            setSelectedTemplateId(fallback.id);
            setDraftTemplate(cloneMethodologyTemplate(fallback));
            window.localStorage.setItem(ACTIVE_TEMPLATE_STORAGE_KEY, fallback.id);
        } else {
            setSelectedTemplateId('');
            setDraftTemplate(null);
            window.localStorage.removeItem(ACTIVE_TEMPLATE_STORAGE_KEY);
        }

        setStatusMessage(`已删除模板：${selectedTemplateMeta.name}`);
    };

    const applyAsActiveTemplate = () => {
        if (!draftTemplate) return;
        window.localStorage.setItem(ACTIVE_TEMPLATE_STORAGE_KEY, draftTemplate.id);
        setStatusMessage(`已设为默认加载模板：${draftTemplate.name}`);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="container mx-auto max-w-6xl px-6 py-12 space-y-12">
                <header>
                    <h1 className="text-4xl font-bold text-slate-900">Playbook</h1>
                    <p className="mt-3 text-lg text-slate-600">方法论与资产中心：模板、评审机制、阈值配置、核心公式。</p>
                </header>

                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">企划模板</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {PLANNING_TEMPLATES.map((item) => (
                            <article key={item.name} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="text-2xl font-bold text-slate-900">{item.name}</h3>
                                <p className="mt-4 text-2xl text-slate-600">{item.description}</p>
                                <button
                                    type="button"
                                    className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    下载模板
                                </button>
                            </article>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">评审机制</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {REVIEW_MECHANISMS.map((item) => (
                            <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">方法论模板配置</h2>
                            <p className="mt-2 text-sm text-slate-600">阈值配置和核心计算公式可编辑、可保存、可按体系切换加载。</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">本地持久化</span>
                    </div>

                    {draftTemplate && (
                        <>
                            <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
                                <label className="text-sm text-slate-600">
                                    模板库
                                    <select
                                        value={selectedTemplateId}
                                        onChange={(event) => switchTemplate(event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                                    >
                                        {allTemplates.map((template) => (
                                            <option key={template.id} value={template.id}>
                                                {template.name}{template.builtIn ? '（内置）' : '（自定义）'}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="text-sm text-slate-600">
                                    模板名称
                                    <input
                                        value={draftTemplate.name}
                                        onChange={(event) => updateDraftMeta('name', event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                                    />
                                </label>

                                <label className="text-sm text-slate-600">
                                    体系标准
                                    <input
                                        value={draftTemplate.standard}
                                        onChange={(event) => updateDraftMeta('standard', event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                                    />
                                </label>
                            </div>

                            <label className="mt-3 block text-sm text-slate-600">
                                模板说明
                                <textarea
                                    value={draftTemplate.description}
                                    onChange={(event) => updateDraftMeta('description', event.target.value)}
                                    rows={2}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                                />
                            </label>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={saveTemplate}
                                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                                >
                                    保存模板
                                </button>
                                <button
                                    type="button"
                                    onClick={createTemplateCopy}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    新建副本
                                </button>
                                <button
                                    type="button"
                                    onClick={resetDraft}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    重置草稿
                                </button>
                                <button
                                    type="button"
                                    onClick={applyAsActiveTemplate}
                                    className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                                >
                                    设为默认加载
                                </button>
                                <button
                                    type="button"
                                    onClick={deleteCurrentTemplate}
                                    className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                                >
                                    删除模板
                                </button>
                            </div>

                            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                {statusMessage} 当前模板更新时间：{formatTemplateDate(draftTemplate.updatedAt)}
                            </div>

                            <div className="mt-8 border-t border-slate-200 pt-6">
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">阈值配置（可编辑）</h3>
                                        <p className="text-xs text-slate-500 mt-1">百分比指标按 0-100 输入，保存时自动转换成计算口径。</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addThreshold}
                                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        + 新增阈值
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    {draftTemplate.thresholds.map((threshold) => (
                                        <article key={threshold.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    value={threshold.metric}
                                                    onChange={(event) => updateThresholdText(threshold.id, 'metric', event.target.value)}
                                                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500"
                                                />
                                                <select
                                                    value={threshold.valueType}
                                                    onChange={(event) => updateThresholdType(threshold.id, event.target.value as ThresholdRule['valueType'])}
                                                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-500"
                                                >
                                                    <option value="ratio">百分比</option>
                                                    <option value="number">数值</option>
                                                </select>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                {THRESHOLD_INPUTS.map((input) => (
                                                    <label key={`${threshold.id}-${input.field}`} className="text-[11px] text-slate-500">
                                                        {input.label}
                                                        <input
                                                            value={valueForInput(threshold[input.field], threshold.valueType)}
                                                            onChange={(event) => updateThresholdValue(threshold.id, input.field, event.target.value)}
                                                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-500"
                                                            placeholder={threshold.valueType === 'ratio' ? '例如 80' : '例如 200'}
                                                        />
                                                    </label>
                                                ))}
                                            </div>

                                            <label className="mt-3 block text-[11px] text-slate-500">
                                                规则备注
                                                <textarea
                                                    value={threshold.note}
                                                    onChange={(event) => updateThresholdText(threshold.id, 'note', event.target.value)}
                                                    rows={2}
                                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-500"
                                                />
                                            </label>

                                            <button
                                                type="button"
                                                onClick={() => removeThreshold(threshold.id)}
                                                className="mt-3 text-xs font-semibold text-rose-600 hover:text-rose-700"
                                            >
                                                删除该阈值
                                            </button>
                                        </article>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-8 border-t border-slate-200 pt-6">
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">核心计算公式（可编辑）</h3>
                                        <p className="text-xs text-slate-500 mt-1">支持按体系改公式定义，保存后可作为后续接入真实数据的统一口径模板。</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addFormula}
                                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        + 新增公式
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {draftTemplate.formulas.map((formula, index) => (
                                        <details key={formula.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4" open={index < 2}>
                                            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
                                                {formula.metric} · {formula.displayUnit}
                                            </summary>

                                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                                <label className="text-xs text-slate-500">
                                                    指标名称
                                                    <input
                                                        value={formula.metric}
                                                        onChange={(event) => updateFormula(formula.id, { metric: event.target.value })}
                                                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-500"
                                                    />
                                                </label>
                                                <label className="text-xs text-slate-500">
                                                    单位标签
                                                    <input
                                                        value={formula.displayUnit}
                                                        onChange={(event) => updateFormula(formula.id, { displayUnit: event.target.value })}
                                                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-500"
                                                    />
                                                </label>
                                            </div>

                                            <label className="mt-3 block text-xs text-slate-500">
                                                计算公式
                                                <textarea
                                                    value={formula.formula}
                                                    onChange={(event) => updateFormula(formula.id, { formula: event.target.value })}
                                                    rows={2}
                                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-700 outline-none focus:border-slate-500"
                                                />
                                            </label>

                                            <label className="mt-3 block text-xs text-slate-500">
                                                字段来源（用逗号分隔）
                                                <input
                                                    value={formula.fields.join(', ')}
                                                    onChange={(event) =>
                                                        updateFormula(formula.id, {
                                                            fields: event.target.value
                                                                .split(',')
                                                                .map((field) => field.trim())
                                                                .filter(Boolean),
                                                        })
                                                    }
                                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-500"
                                                />
                                            </label>

                                            <label className="mt-3 block text-xs text-slate-500">
                                                备注
                                                <textarea
                                                    value={formula.note}
                                                    onChange={(event) => updateFormula(formula.id, { note: event.target.value })}
                                                    rows={2}
                                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-500"
                                                />
                                            </label>

                                            <button
                                                type="button"
                                                onClick={() => removeFormula(formula.id)}
                                                className="mt-3 text-xs font-semibold text-rose-600 hover:text-rose-700"
                                            >
                                                删除该公式
                                            </button>
                                        </details>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </section>

                <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                    <h3 className="text-sm font-semibold text-emerald-900">落地说明</h3>
                    <p className="mt-2 text-sm leading-6 text-emerald-800">
                        这里保存的是方法论模板，不会直接改动历史数据。后续接入真实数据时，只需要保持字段口径一致，即可按模板自动套用阈值与公式。
                    </p>
                </section>
            </div>
        </div>
    );
}
