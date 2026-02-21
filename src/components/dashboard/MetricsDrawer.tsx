'use client';

import { useState } from 'react';
import {
    APPAREL_TO_FOOTWEAR_TERMS,
    FOOTWEAR_CATEGORY_TAXONOMY,
    FOOTWEAR_CORE_METRICS,
    FOOTWEAR_SERIES_POSITIONING,
} from '@/config/footwearLanguage';

const CATEGORY_COLORS: Record<string, string> = {
    经营结果: 'bg-blue-100 text-blue-700',
    价格折扣: 'bg-amber-100 text-amber-700',
    效率结构: 'bg-emerald-100 text-emerald-700',
};

export default function MetricsDrawer() {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                title="指标口径说明"
            >
                <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-xs font-bold">i</span>
                <span className="hidden sm:inline">指标口径</span>
            </button>

            {/* Overlay */}
            {open && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="flex-1 bg-black/40 backdrop-blur-sm"
                        onClick={() => setOpen(false)}
                    />

                    {/* Drawer */}
                    <div className="w-full max-w-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">鞋类标准指标与字段口径</h2>
                                <p className="text-xs text-slate-400 mt-0.5">依据你给出的 2.1 / 2.2 标准，统一到当前看板展示口径</p>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                            <section>
                                <h3 className="text-sm font-bold text-slate-900 mb-3">2.1 核心指标字段口径</h3>
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
                                <h3 className="text-sm font-bold text-slate-900 mb-3">服装字段 → 鞋类标准字段</h3>
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
                                <h3 className="text-sm font-bold text-slate-900 mb-3">2.2 鞋类类目与系列标准</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div className="border border-slate-100 rounded-lg p-3">
                                        <div className="text-xs font-semibold text-slate-700 mb-2">一级/二级品类</div>
                                        <div className="space-y-2">
                                            {FOOTWEAR_CATEGORY_TAXONOMY.map((item) => (
                                                <div key={item.category_l1}>
                                                    <div className="text-xs font-medium text-slate-800 mb-1">{item.category_l1}</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.category_l2.map((sub) => (
                                                            <span key={`${item.category_l1}-${sub}`} className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                                {sub}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border border-slate-100 rounded-lg p-3">
                                        <div className="text-xs font-semibold text-slate-700 mb-2">系列/定位（替代黑标/红标）</div>
                                        <div className="space-y-2">
                                            {FOOTWEAR_SERIES_POSITIONING.map((item) => (
                                                <div key={item.series} className="rounded-md bg-slate-50 px-2.5 py-2">
                                                    <div className="text-xs font-medium text-slate-800">{item.series}</div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
                            <p className="text-xs text-slate-400">
                                ⚠️ 当前为 Demo 数据口径。后续接入真实 ERP/CRM 后，可按同一标准直接替换字段。
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
