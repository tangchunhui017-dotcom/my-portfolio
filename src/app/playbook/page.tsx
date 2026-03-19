'use client';

import { useMemo, useState } from 'react';
import {
    COLOR_ROLE_TYPES,
    OCCASION_TAGS,
    PRODUCT_ROLE_OPTIONS,
    TREND_SOURCE_OPTIONS,
} from '@/config/business-dictionaries';
import {
    BUILTIN_METHODOLOGY_TEMPLATES,
    FormulaRule,
    MethodologyTemplate,
    ThresholdRule,
    cloneMethodologyTemplate,
} from '@/config/methodologyTemplates';
import {
    PLANNING_FORMULAS,
    PLANNING_PRINCIPLES,
    PLANNING_WORKFLOW_STEPS,
    REQUIRED_PLANNING_FIELDS,
} from '@/config/planningFramework';
import { SOP_DOCUMENTS } from '@/config/sopDocuments';

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
        name: '波段-系列-场合矩阵',
        description: '先锁时间波段，再定义系列、场合和角色坑位。',
    },
    {
        name: 'Bottom-up OTB 预算表',
        description: '按品类 / SKU 自下而上推量化预算和财务预算。',
    },
    {
        name: '镜像市调对比表',
        description: '从鞋墙结构、主推色、材质细节到品牌差值一次看清。',
    },
    {
        name: '宽度 / 深度推演表',
        description: '把目标销售额、单价、售罄率和单款深度联动起来。',
    },
];

const REVIEW_MECHANISMS = [
    {
        title: '趋势过滤漏斗',
        description: '全量趋势 → 品牌 DNA → 历史表现 → 开发立项，先过滤再开发。',
    },
    {
        title: '虚拟鞋墙校验',
        description: '用波段色盘、材质和陈列故事反推单款是否真的能上墙。',
    },
    {
        title: '评审与修改单闭环',
        description: '明确评审结论、改稿动作、责任人与下一次评审时间。',
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
                    <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-blue-950">外部课程内容已沉淀为业务框架</h2>
                                <p className="mt-1 text-sm leading-6 text-blue-900">
                                    当前页面已吸收商品企划、设计企划、OTB、色彩企划、场合企划和镜像市调中的高价值方法，
                                    重点沉淀为统一字典、判断链、公式和字段规范，便于后续接入 Dashboard、Design Review 与 OpenClaw。
                                </p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">Reference distilled</span>
                        </div>
                    </div>
                </header>

                <section>
                    <div className="mb-6 flex items-end justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">企划操作系统</h2>
                            <p className="mt-2 text-sm text-slate-600">把外部课程中的工作方法沉淀为后续页面可以直接消费的业务骨架。</p>
                        </div>
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Planning OS</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {PLANNING_PRINCIPLES.map((item) => (
                            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                                <p className="mt-3 text-sm leading-6 text-slate-600">{item.summary}</p>
                                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                                    业务含义：{item.impact}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">统一业务字典</h2>
                            <p className="mt-2 text-sm text-slate-600">先把角色、场合、色彩和趋势来源统一下来，后续 Dashboard 和 Review 直接复用。</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Shared vocabulary</span>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">产品角色</h3>
                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {PRODUCT_ROLE_OPTIONS.map((item) => (
                                    <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <span className="font-semibold text-slate-900">{item.label}</span>
                                            <span className="text-xs uppercase tracking-wide text-slate-400">{item.english}</span>
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                                    </article>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">色彩角色</h3>
                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {COLOR_ROLE_TYPES.map((item) => (
                                    <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <span className="font-semibold text-slate-900">{item.label}</span>
                                            <span className="text-sm font-semibold text-emerald-700">{item.recommendedShare}</span>
                                        </div>
                                        <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{item.english}</div>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <h3 className="text-lg font-semibold text-slate-900">场合标签</h3>
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {OCCASION_TAGS.map((item) => (
                                <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="font-semibold text-slate-900">{item.label}</div>
                                    <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{item.english}</div>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                                </article>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8">
                        <h3 className="text-lg font-semibold text-slate-900">趋势来源口径</h3>
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                            {TREND_SOURCE_OPTIONS.map((item) => (
                                <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="font-semibold text-slate-900">{item.label}</div>
                                    <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{item.english}</div>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">标准判断链</h2>
                            <p className="mt-2 text-sm text-slate-600">后续 Dashboard、Design Review、Case Studies 都可以复用这条企划判断链。</p>
                        </div>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Workflow</span>
                    </div>

                    <div className="mt-6 space-y-4">
                        {PLANNING_WORKFLOW_STEPS.map((step, index) => (
                            <article key={step.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                                            <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {step.openClawAgents.map((agent) => (
                                            <span key={agent} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                                {agent}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                                    <div className="rounded-xl bg-white p-4">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">输入</div>
                                        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                                            {step.inputs.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="rounded-xl bg-white p-4">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">判断</div>
                                        <p className="mt-3 text-sm leading-6 text-slate-600">{step.judgement}</p>
                                    </div>
                                    <div className="rounded-xl bg-white p-4">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">输出</div>
                                        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                                            {step.outputs.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">企划模板</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {PLANNING_TEMPLATES.map((item) => (
                            <article key={item.name} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="text-xl font-bold text-slate-900">{item.name}</h3>
                                <p className="mt-4 text-base leading-7 text-slate-600">{item.description}</p>
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

                <section>
                    <div className="mb-6 flex items-end justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">SOP 文档</h2>
                            <p className="mt-2 text-sm text-slate-600">标准操作流程：把关键业务动作沉淀为可复用的步骤、阈值和决策节点。</p>
                        </div>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Standard Operating Procedures</span>
                    </div>

                    <div className="space-y-6">
                        {SOP_DOCUMENTS.map((sop) => (
                            <details key={sop.id} className="group rounded-2xl border border-amber-200 bg-white shadow-sm">
                                <summary className="cursor-pointer list-none rounded-2xl px-6 py-5 group-open:rounded-b-none group-open:border-b group-open:border-amber-100">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">{sop.title}</h3>
                                            <p className="mt-1 text-sm text-slate-600">{sop.subtitle}</p>
                                        </div>
                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                            {sop.steps.length} 步骤
                                        </span>
                                    </div>
                                </summary>

                                <div className="space-y-6 px-6 pb-6 pt-4">
                                    <div>
                                        <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-700">步骤流程</h4>
                                        <div className="mt-3 space-y-3">
                                            {sop.steps.map((step, idx) => (
                                                <div key={step.order} className="flex items-start gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                                                            {String(step.order).padStart(2, '0')}
                                                        </span>
                                                        {idx < sop.steps.length - 1 && (
                                                            <span className="mt-1 h-6 w-px bg-amber-200" />
                                                        )}
                                                    </div>
                                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex-1">
                                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                            <span className="text-sm font-semibold text-slate-900">{step.title}</span>
                                                            {step.duration && (
                                                                <span className="text-[11px] text-slate-400">{step.duration}</span>
                                                            )}
                                                        </div>
                                                        <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-700">关键阈值</h4>
                                            <ul className="mt-3 space-y-2">
                                                {sop.thresholds.map((t) => (
                                                    <li key={t} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                                        {t}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-700">决策节点</h4>
                                            <div className="mt-3 space-y-3">
                                                {sop.decisionNodes.map((node) => (
                                                    <div key={node.condition} className="text-sm">
                                                        <div className="font-semibold text-slate-800">{node.condition}</div>
                                                        <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                                                            <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-800">Y: {node.yesAction}</span>
                                                            <span className="rounded-md bg-rose-100 px-2 py-1 text-rose-800">N: {node.noAction}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-700">输出模板</h4>
                                            <div className="mt-3 space-y-2">
                                                {sop.outputTemplates.map((tpl) => (
                                                    <div key={tpl.name} className="rounded-lg bg-white p-2.5">
                                                        <div className="text-sm font-semibold text-slate-800">{tpl.name}</div>
                                                        <p className="mt-0.5 text-xs leading-5 text-slate-500">{tpl.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </details>
                        ))}
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
                    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-bold text-slate-900">关键公式</h2>
                        <p className="mt-2 text-sm text-slate-600">这些公式适合进入 Dashboard、Playbook 和 OpenClaw normalizer 的统一口径层。</p>
                        <div className="mt-6 space-y-4">
                            {PLANNING_FORMULAS.map((item) => (
                                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                                    <div className="mt-3 rounded-lg bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100">
                                        {item.formula}
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-bold text-slate-900">核心字段规范</h2>
                        <p className="mt-2 text-sm text-slate-600">后面做 OpenClaw 文件接入时，应优先统一这些字段，避免页面层各写一套口径。</p>
                        <div className="mt-6 space-y-3">
                            {REQUIRED_PLANNING_FIELDS.map((item) => (
                                <div key={item.field} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                                        <div>
                                            <div className="font-semibold text-slate-900">{item.label}</div>
                                            <div className="mt-1 font-mono text-xs text-slate-400">{item.field}</div>
                                        </div>
                                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                                            {item.usedIn.join(' / ')}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </article>
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

