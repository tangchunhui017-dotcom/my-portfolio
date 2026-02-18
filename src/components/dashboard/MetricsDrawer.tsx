'use client';

import { useState } from 'react';

const METRICS = [
    {
        name: '净销售额',
        formula: '净销售额 = 成交金额 - 退款金额 - 优惠券抵扣',
        note: '以实际到账金额为准，不含运费。本看板使用指数化处理（×系数），结构与趋势真实。',
        category: '结果指标',
    },
    {
        name: '售罄率（累计）',
        formula: '累计售罄率 = 累计销量 ÷ 期初库存',
        note: '按上市波段计算，期初库存为首发日库存快照。目标值：新品≥80%，常青款≥90%，清仓款≥95%。',
        category: '结果指标',
    },
    {
        name: '毛利率',
        formula: '毛利率 = (净销售额 - 销货成本) ÷ 净销售额',
        note: '销货成本含出厂成本+物流+仓储。不含营销费用（营销费用计入运营利润层）。',
        category: '结果指标',
    },
    {
        name: '动销率',
        formula: '动销率 = 有销售记录的 SKU 数 ÷ 在售 SKU 总数',
        note: '统计周期内，至少有1笔销售记录即视为"动销"。低于70%需启动滞销预警。',
        category: '效率指标',
    },
    {
        name: '平均折扣深度',
        formula: '折扣深度 = 1 - (净销售额 ÷ 吊牌销售额)',
        note: '折扣深度反映整体促销力度。健康区间：<12%。超过15%需审查促销策略。',
        category: '效率指标',
    },
    {
        name: 'Top10 SKU 集中度',
        formula: '集中度 = Top10 SKU 净销售额 ÷ 全部 SKU 净销售额',
        note: '集中度>70%表示长尾SKU贡献极低，建议启动SKU精简评估。',
        category: '结构指标',
    },
    {
        name: '折扣损失额',
        formula: '折扣损失额 = 吊牌销售额 - 净销售额',
        note: '即因促销/折扣损失的潜在收入。折扣损失率>15%需重新评估定价策略。',
        category: '效率指标',
    },
];

const CATEGORY_COLORS: Record<string, string> = {
    '结果指标': 'bg-blue-100 text-blue-700',
    '效率指标': 'bg-amber-100 text-amber-700',
    '结构指标': 'bg-emerald-100 text-emerald-700',
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
                    <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">指标口径说明</h2>
                                <p className="text-xs text-slate-400 mt-0.5">数据更新：每周一 09:00 · 覆盖 15 款 SKU · 10 个渠道</p>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                            {METRICS.map(metric => (
                                <div key={metric.name} className="border border-slate-100 rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-slate-900">{metric.name}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[metric.category]}`}>
                                            {metric.category}
                                        </span>
                                    </div>
                                    <div className="text-xs font-mono bg-slate-50 text-slate-600 px-3 py-2 rounded-md mb-2">
                                        {metric.formula}
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">{metric.note}</p>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
                            <p className="text-xs text-slate-400">
                                ⚠️ 本看板数据已脱敏处理，金额经指数化，结构与趋势真实反映业务逻辑。
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
