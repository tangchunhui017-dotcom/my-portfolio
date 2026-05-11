'use client';
/**
 * src/components/profit-loss/GradingFormulaModal.tsx
 * S12: 评级公式详情弹窗 — 4 维评分 + 行业基线 + 改进建议
 */
import type { GradingResult } from '@/utils/pnlV9';

interface Props { result: GradingResult; onClose: () => void; }

const WEIGHT_COLORS: Record<string, string> = {
    profitRate: 'bg-emerald-500',
    salesPerSqm: 'bg-sky-500',
    paybackMonths: 'bg-violet-500',
    investmentIntensity: 'bg-amber-500',
};

const GRADE_BADGE: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-800',
    B: 'bg-amber-100 text-amber-800',
    C: 'bg-orange-100 text-orange-800',
    Loss: 'bg-rose-100 text-rose-800',
};

export default function GradingFormulaModal({ result, onClose }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-bold text-slate-900">📐 评级公式详情</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">4 维加权评分 · 对标行业基线</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
                </div>

                {/* 总分 */}
                <div className="flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-3">
                    <div className="text-3xl font-black text-slate-800">{result.totalScore.toFixed(0)}</div>
                    <div>
                        <div className="text-xs text-slate-500">综合评分（满分100）</div>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-bold ${GRADE_BADGE[result.finalGrade] ?? GRADE_BADGE.Loss}`}>
                            {result.finalGrade} — {result.recommendation}
                        </span>
                    </div>
                </div>

                {/* 维度 */}
                <div className="space-y-3">
                    {result.dimensions.map(dim => {
                        const weightPct = Math.round(dim.weight * 100);
                        const contribution = dim.score * dim.weight;
                        return (
                            <div key={dim.key} className="rounded-xl border border-slate-100 px-4 py-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${WEIGHT_COLORS[dim.key] ?? 'bg-slate-400'}`} />
                                        <span className="text-xs font-semibold text-slate-700">{dim.label}</span>
                                        <span className="text-[10px] text-slate-400">权重 {weightPct}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${GRADE_BADGE[dim.grade] ?? GRADE_BADGE.Loss}`}>{dim.grade}</span>
                                        <span className="text-xs font-bold text-slate-800">+{contribution.toFixed(1)}</span>
                                    </div>
                                </div>
                                {/* 进度条 */}
                                <div className="h-1.5 bg-slate-100 rounded-full mb-2">
                                    <div className={`h-full rounded-full ${WEIGHT_COLORS[dim.key] ?? 'bg-slate-400'}`} style={{ width: `${dim.score}%` }} />
                                </div>
                                <p className="text-[11px] text-slate-500">{dim.benchmark}</p>
                                <p className="text-[11px] text-slate-600 font-medium mt-0.5">→ {dim.suggestion}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
