'use client';
/**
 * src/components/dashboard/channel/ChannelDecisionCockpit.tsx
 * V15 L1: 5秒决策驾驶舱
 * 替换原 RegionStoreExecutiveSummary + RegionStoreDecisionSummary + ChannelPortfolioScoreCard
 */
import { useMemo } from 'react';
import ChannelSectionHeader from './ChannelSectionHeader';
import ChannelKpiCard from './ChannelKpiCard';
import ChannelPortfolioScoreCard from './ChannelPortfolioScoreCard';
import type { RegionStoreKpi, RegionStoreDecisionItem } from './types';

interface Props {
    kpis: RegionStoreKpi[];
    decisions: RegionStoreDecisionItem[];
}

const STATUS_TONE: Record<RegionStoreKpi['status'], 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'slate'> = {
    healthy: 'emerald',
    opportunity: 'sky',
    warning: 'amber',
    risk: 'rose',
    observe: 'violet',
    none: 'slate',
};

const DECISION_TONE_CONFIG = {
    good: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        header: 'text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: '✅',
        label: '加码机会',
    },
    warn: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        header: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: '⚠️',
        label: '关注风险',
    },
    risk: {
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        header: 'text-rose-700',
        badge: 'bg-rose-100 text-rose-700 border-rose-200',
        icon: '🚨',
        label: '立即处理',
    },
    info: {
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        header: 'text-sky-700',
        badge: 'bg-sky-100 text-sky-700 border-sky-200',
        icon: 'ℹ️',
        label: '信息参考',
    },
} as const;

export default function ChannelDecisionCockpit({ kpis, decisions }: Props) {
    // Top 6 KPIs
    const topKpis = useMemo(() => kpis.slice(0, 6), [kpis]);

    // Decision items grouped by tone
    const grouped = useMemo(() => {
        const g: Record<string, RegionStoreDecisionItem[]> = { good: [], warn: [], risk: [], info: [] };
        decisions.forEach(d => {
            if (g[d.tone]) g[d.tone].push(d);
        });
        return g;
    }, [decisions]);

    const toneOrder: Array<RegionStoreDecisionItem['tone']> = ['good', 'warn', 'risk', 'info'];
    const activeGroups = toneOrder.filter(t => grouped[t].length > 0);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-5">
            <ChannelSectionHeader
                icon="🎯"
                title="区域&门店决策驾驶舱"
                subtitle="5秒掌握全局：KPI + 决策信号 + 组合评分"
                colorBar="blue"
            />

            {/* KPI 指标网格 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {topKpis.map(kpi => (
                    <ChannelKpiCard
                        key={kpi.key}
                        label={kpi.label}
                        value={kpi.value}
                        subValue={kpi.sub ?? (kpi.target ? `目标 ${kpi.target}` : undefined)}
                        diffPct={kpi.diffPct ?? null}
                        diffLabel={kpi.yoyRate !== undefined ? 'YoY' : undefined}
                        tone={STATUS_TONE[kpi.status]}
                        compact
                    />
                ))}
            </div>

            {/* 决策信号分组 */}
            {activeGroups.length > 0 && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${activeGroups.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
                    {activeGroups.map(tone => {
                        const cfg = DECISION_TONE_CONFIG[tone];
                        const items = grouped[tone];
                        return (
                            <div
                                key={tone}
                                className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3 flex flex-col gap-2`}
                            >
                                <div className={`text-xs font-bold ${cfg.header} flex items-center gap-1`}>
                                    <span>{cfg.icon}</span>
                                    <span>{cfg.label}</span>
                                    <span className={`ml-auto inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${cfg.badge}`}>
                                        {items.length}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {items.map(item => (
                                        <div key={item.id} className="flex flex-col gap-0.5">
                                            <div className="text-xs font-semibold text-slate-800 leading-tight">{item.label}</div>
                                            {item.subjects.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {item.subjects.slice(0, 4).map(s => (
                                                        <span key={s} className="inline-block rounded bg-white/80 border border-slate-200 px-1 py-0.5 text-[10px] text-slate-600">
                                                            {s}
                                                        </span>
                                                    ))}
                                                    {item.subjects.length > 4 && (
                                                        <span className="text-[10px] text-slate-400">+{item.subjects.length - 4}</span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="text-[11px] text-slate-500 leading-tight line-clamp-2">{item.reason}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 底部：区域组合评分（折叠展示）*/}
            <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1 select-none list-none">
                    <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                    查看季度区域组合评分
                </summary>
                <div className="mt-3">
                    <ChannelPortfolioScoreCard />
                </div>
            </details>
        </div>
    );
}
