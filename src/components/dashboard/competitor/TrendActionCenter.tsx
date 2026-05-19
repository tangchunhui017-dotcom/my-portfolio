'use client';

import type { TrendAction, TrendTag, ActionStatus } from '@/types/competitorTrendTypes';

const TAG_CONFIG: Record<TrendTag, { bg: string; text: string }> = {
    '高热':    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    '升量':    { bg: 'bg-blue-100',    text: 'text-blue-700' },
    '风险':    { bg: 'bg-rose-100',    text: 'text-rose-700' },
    '小批量测试': { bg: 'bg-amber-100', text: 'text-amber-700' },
    '设计机会': { bg: 'bg-violet-100', text: 'text-violet-700' },
    '观察':    { bg: 'bg-slate-100',   text: 'text-slate-600' },
    '避免跟进': { bg: 'bg-rose-100',   text: 'text-rose-700' },
};

const ACTION_STATUS_CONFIG: Record<ActionStatus, { label: string; bg: string; text: string }> = {
    pending:     { label: '待执行', bg: 'bg-amber-50',   text: 'text-amber-600' },
    in_progress: { label: '进行中', bg: 'bg-blue-50',    text: 'text-blue-600' },
    done:        { label: '已完成', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    rejected:    { label: '已忽略', bg: 'bg-slate-50',   text: 'text-slate-500' },
};

interface TrendActionCenterProps {
    actions: TrendAction[];
    onJumpToPlanning?: (waveId: string) => void;
    onJumpToDesign?: (trendId: string) => void;
    onJumpToOtb?: () => void;
}

export default function TrendActionCenter({
    actions,
    onJumpToPlanning,
    onJumpToDesign,
    onJumpToOtb,
}: TrendActionCenterProps) {
    const sortedActions = [...actions].sort((a, b) => a.priority - b.priority).slice(0, 8);

    return (
        <div className="space-y-3">
            {sortedActions.map((action) => {
                const tagCfg = TAG_CONFIG[action.trendTag];
                const statusCfg = ACTION_STATUS_CONFIG[action.actionStatus];
                const isRejected = action.actionStatus === 'rejected';

                return (
                    <div
                        key={action.id}
                        className={`rounded-xl border p-4 transition-colors ${
                            isRejected
                                ? 'border-slate-150 bg-slate-50/60 opacity-70'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-slate-800">{action.trendObject}</span>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${tagCfg.bg} ${tagCfg.text}`}>
                                    {action.trendTag}
                                </span>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                                    {statusCfg.label}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">P{action.priority}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1.5 mb-3 text-xs text-slate-600">
                            <div><span className="text-slate-400">趋势证据：</span>{action.trendEvidence}</div>
                            <div><span className="text-slate-400">适合人群：</span>{action.targetAudience}</div>
                            <div><span className="text-slate-400">建议品类/鞋型：</span>{action.recommendedCategory} · {action.recommendedShoeType}</div>
                            <div><span className="text-slate-400">建议价格带：</span>{action.recommendedPriceBand}</div>
                            <div><span className="text-slate-400">建议波段：</span>{action.recommendedWaveId}</div>
                            <div><span className="text-slate-400">预计销售影响：</span>
                                <span className={action.expectedSalesImpact.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}>
                                    {action.expectedSalesImpact}
                                </span>
                            </div>
                            <div><span className="text-slate-400">预计毛利影响：</span>
                                <span className={action.expectedMarginImpact.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}>
                                    {action.expectedMarginImpact}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                            <span className="text-[11px] text-slate-500">建议动作：</span>
                            <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {action.recommendedAction}
                            </span>
                            {action.recommendedAction === '加入波段企划' && onJumpToPlanning && (
                                <button
                                    onClick={() => onJumpToPlanning(action.recommendedWaveId)}
                                    className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                >
                                    → 波段企划
                                </button>
                            )}
                            {(action.recommendedAction === '加入设计灵感池' || action.recommendedAction === '生成趋势Brief' || action.recommendedAction === '生成竞品对标Brief') && onJumpToDesign && (
                                <button
                                    onClick={() => onJumpToDesign(action.id)}
                                    className="text-[11px] px-2.5 py-1 rounded-md bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
                                >
                                    → 设计计划
                                </button>
                            )}
                            {action.recommendedAction === '生成OTB建议' && onJumpToOtb && (
                                <button
                                    onClick={onJumpToOtb}
                                    className="text-[11px] px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors"
                                >
                                    → OTB预算
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
