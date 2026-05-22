'use client';

import type { ResearchConclusionReport, ResearchFinding } from '@/types/competitorTrendTypes';

const FINDING_TYPE_STYLES: Record<ResearchFinding['findingType'], string> = {
    '机会':   'bg-emerald-50 text-emerald-700 border border-emerald-200',
    '风险':   'bg-rose-50 text-rose-700 border border-rose-200',
    '趋势':   'bg-blue-50 text-blue-700 border border-blue-200',
    '竞品动向': 'bg-violet-50 text-violet-700 border border-violet-200',
};

const DEPT_ICONS: Record<string, string> = {
    '商品企划部': '📋',
    '运营部': '📣',
    '设计部': '🎨',
    '渠道部': '🏪',
};

interface Props {
    report: ResearchConclusionReport;
}

export default function ResearchConclusionPanel({ report }: Props) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h4 className="text-base font-semibold text-slate-800">商品企划市场调研结论报告</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span>调研周期：{report.reportPeriod}</span>
                        <span>·</span>
                        <span>生成日期：{report.generatedAt}</span>
                    </div>
                </div>
                <button
                    onClick={() => window.print()}
                    className="text-xs border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg transition-colors print:hidden"
                >
                    打印 / 导出
                </button>
            </div>

            {/* Block 1: Top Findings */}
            <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">核心发现</div>
                <div className="space-y-3">
                    {report.topFindings.map((finding) => (
                        <div
                            key={finding.id}
                            className="flex gap-3 rounded-xl border border-slate-100 bg-white p-4 hover:shadow-sm transition-shadow"
                        >
                            {/* Priority */}
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                                {finding.priority}
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${FINDING_TYPE_STYLES[finding.findingType]}`}>
                                        {finding.findingType}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-800">{finding.title}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-[1.5]">
                                    <span className="text-slate-500 font-medium">证据：</span>{finding.evidence}
                                </p>
                                <p className="text-xs text-slate-600 leading-[1.5]">
                                    <span className="text-slate-500 font-medium">对本品意义：</span>{finding.implication}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Block 2: Opportunity vs Risk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opportunities */}
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-4">
                    <div className="text-xs font-semibold text-emerald-700 mb-3">机会鞋型 &amp; 价格带</div>
                    <div className="mb-3">
                        <div className="text-[11px] text-slate-500 mb-1.5">机会鞋型（按优先级）</div>
                        <div className="flex flex-wrap gap-1.5">
                            {report.opportunityShoeTypes.map((item, i) => (
                                <span key={i} className="text-[11px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="text-[11px] text-slate-500 mb-1.5">机会价格带</div>
                        <div className="space-y-1">
                            {report.opportunityPriceBands.map((item, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-[11px] text-emerald-700">
                                    <span className="mt-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Risks */}
                <div className="rounded-xl border-2 border-rose-200 bg-rose-50/30 p-4">
                    <div className="text-xs font-semibold text-rose-700 mb-3">风险提示</div>
                    <div className="space-y-2">
                        {report.riskAlerts.map((alert, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-rose-700">
                                <span className="mt-0.5 flex-shrink-0 text-rose-400">⚠</span>
                                <span className="leading-[1.5]">{alert}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Block 3: Department Guidance */}
            <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">各部门行动建议</div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {report.departmentGuidance.map((dept) => (
                        <div key={dept.department} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-base">{DEPT_ICONS[dept.department] ?? '🏢'}</span>
                                <span className="text-xs font-semibold text-slate-700">{dept.department}</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 leading-[1.4]">{dept.keyAction}</p>
                            <ul className="space-y-1">
                                {dept.details.map((detail, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-500 leading-[1.4]">
                                        <span className="text-slate-300 flex-shrink-0 mt-0.5">·</span>
                                        {detail}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Block 4: Next Research Plan */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">📅</span>
                    <span className="text-xs font-semibold text-blue-700">下次调研计划</span>
                </div>
                <p className="text-xs text-slate-700 leading-[1.6]">{report.nextResearchPlan}</p>
            </div>
        </div>
    );
}

// ─── Print styles injected via style tag ─────────────────────────────────────
// Add to globals.css or via a <style> tag if needed:
// @media print {
//   nav, aside, header, .print\:hidden { display: none !important; }
// }
