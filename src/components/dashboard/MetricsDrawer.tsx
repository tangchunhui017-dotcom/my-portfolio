'use client';

import { useState } from 'react';
import {
    APPAREL_TO_FOOTWEAR_TERMS,
    FOOTWEAR_CORE_METRICS,
    FOOTWEAR_SERIES_POSITIONING,
    FOOTWEAR_PLANNING_CUBE_AXES,
    FOOTWEAR_EXECUTION_MANDATES,
} from '@/config/footwearLanguage';
import {
    FOOTWEAR_CATEGORY_HIERARCHY,
    FOOTWEAR_PUBLIC_ATTRIBUTE_TAGS,
    FOOTWEAR_SCENE_CATEGORY_PICKS,
} from '@/config/footwearTaxonomy';

const CATEGORY_COLORS: Record<string, string> = {
    经营结果: 'bg-blue-100 text-blue-700',
    价格折扣: 'bg-amber-100 text-amber-700',
    效率结构: 'bg-emerald-100 text-emerald-700',
};

export default function MetricsDrawer() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                title="指标口径说明"
            >
                <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-xs font-bold">i</span>
                <span className="hidden sm:inline">指标口径</span>
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

                    <div className="w-full max-w-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">鞋类指标口径与企划标准</h2>
                                <p className="text-xs text-slate-500 mt-0.5">统一字段定义，保证看板口径一致、可追溯。</p>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                                aria-label="关闭"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">核心指标口径</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {FOOTWEAR_CORE_METRICS.map((metric) => (
                                        <div key={metric.id} className="border border-slate-100 rounded-lg p-3">
                                            <div className="flex items-start justify-between mb-1.5 gap-2">
                                                <div>
                                                    <h4 className="font-semibold text-slate-900">{metric.name}</h4>
                                                    <p className="text-[11px] text-slate-400">{metric.english}</p>
                                                </div>
                                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${CATEGORY_COLORS[metric.category]}`}>
                                                    {metric.category}
                                                </span>
                                            </div>
                                            <div className="text-xs font-mono bg-slate-50 text-slate-600 px-2.5 py-2 rounded-md mb-2">
                                                {metric.formula}
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">{metric.note}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">服装字段 → 鞋类字段映射</h3>
                                <div className="overflow-x-auto border border-slate-100 rounded-lg">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="text-left px-3 py-2 text-slate-500 font-semibold">原字段（服装）</th>
                                                <th className="text-left px-3 py-2 text-slate-500 font-semibold">标准字段（鞋类）</th>
                                                <th className="text-left px-3 py-2 text-slate-500 font-semibold">说明</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {APPAREL_TO_FOOTWEAR_TERMS.map((item) => (
                                                <tr key={`${item.apparel}-${item.footwear}`} className="border-t border-slate-100">
                                                    <td className="px-3 py-2 text-slate-600">{item.apparel}</td>
                                                    <td className="px-3 py-2 text-slate-800 font-medium">{item.footwear}</td>
                                                    <td className="px-3 py-2 text-slate-500">{item.note || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">类目与场景标准</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div className="border border-slate-100 rounded-lg p-3">
                                        <div className="text-xs font-semibold text-slate-700 mb-2">类目层级</div>
                                        <div className="space-y-3">
                                            {FOOTWEAR_CATEGORY_HIERARCHY.map((group) => (
                                                <div key={group.l1} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                    <div className="text-xs font-semibold text-slate-800">{group.l1}</div>
                                                    <div className="mt-2 space-y-2">
                                                        {group.items.map((item) => (
                                                            <div key={`${group.l1}-${item.l2}`} className="rounded border border-slate-200 bg-white px-2 py-1.5">
                                                                <div className="text-[11px] font-medium text-slate-700">{item.l2}</div>
                                                                <div className="mt-1 flex flex-wrap gap-1">
                                                                    {item.l3.map((leaf) => (
                                                                        <span
                                                                            key={`${group.l1}-${item.l2}-${leaf}`}
                                                                            className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                                                                        >
                                                                            {leaf}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border border-slate-100 rounded-lg p-3 space-y-3">
                                        <div>
                                            <div className="text-xs font-semibold text-slate-700 mb-2">系列定位</div>
                                            <div className="space-y-2">
                                                {FOOTWEAR_SERIES_POSITIONING.map((item) => (
                                                    <div key={item.series} className="rounded-md bg-slate-50 px-2.5 py-2">
                                                        <div className="text-xs font-medium text-slate-800">{item.series}</div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs font-semibold text-slate-700 mb-2">公共属性标签</div>
                                            <div className="space-y-2">
                                                {FOOTWEAR_PUBLIC_ATTRIBUTE_TAGS.map((attr) => (
                                                    <div key={attr.group} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                        <div className="text-[11px] font-medium text-slate-700 mb-1">{attr.group}</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {attr.tags.map((tag) => (
                                                                <span
                                                                    key={`${attr.group}-${tag}`}
                                                                    className="text-[11px] px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 border border-slate-100 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-slate-700 mb-2">场景选品建议</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {FOOTWEAR_SCENE_CATEGORY_PICKS.map((scene) => (
                                            <div key={scene.scene} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                <div className="text-xs font-semibold text-slate-800">{scene.scene}</div>
                                                <div className="text-[11px] text-slate-600 mt-1">适用一级：{scene.l1Focus.join(' / ')}</div>
                                                <div className="text-[11px] text-slate-600 mt-1">推荐二级：{scene.l2Recommended.join('、')}</div>
                                                <div className="text-[11px] text-slate-600 mt-1">推荐三级：{scene.l3Recommended.join('、')}</div>
                                                <div className="text-[11px] text-slate-500 mt-1">{scene.notes}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">三维企划魔方（X/Y/Z）</h3>
                                <div className="space-y-3">
                                    {FOOTWEAR_PLANNING_CUBE_AXES.map((axis) => (
                                        <div key={axis.axis} className="border border-slate-100 rounded-lg p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                                <div className="text-xs font-semibold text-slate-800">轴 {axis.axis} · {axis.title}</div>
                                                <div className="text-[11px] text-slate-500">{axis.english}</div>
                                            </div>
                                            <p className="text-xs text-slate-600 mb-2">{axis.coreLogic}</p>
                                            <div className="space-y-2">
                                                {axis.values.map((item) => (
                                                    <div key={`${axis.axis}-${item.code}`} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <span className="inline-flex items-center rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">{item.code}</span>
                                                            <span className="text-xs font-medium text-slate-800">{item.label}</span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">范围：{item.scope}</div>
                                                        <div className="text-[11px] text-slate-600 mt-0.5">企划导向：{item.planningFocus}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">执行要求（上线前强校验）</h3>
                                <div className="space-y-2">
                                    {FOOTWEAR_EXECUTION_MANDATES.map((item) => (
                                        <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div className="text-xs font-semibold text-slate-800">{item.title}</div>
                                            <div className="text-xs text-slate-600 mt-1">{item.detail}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
                            <p className="text-xs text-slate-500">
                                当前为 Demo 口径。接入真实 ERP/CRM 后，只需替换数据源，不改口径定义。
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
