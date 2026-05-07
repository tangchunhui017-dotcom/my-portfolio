'use client';
/**
 * src/components/otb/panels/SeasonCalendarPanel.tsx
 * 季节经营日历 — 四季阶段卡片 + 季节承接矩阵
 */
import { useMemo } from 'react';
import {
    getCurrentSeasonPhase,
    calcHandoverMatrix,
    calcSeasonRisk,
    getSeasonColorClasses,
    type SeasonCalendar,
    type SeasonPhase,
} from '@/utils/seasonCalendar';
import { formatCurrency, type CurrencyUnit } from '@/utils/otbCalculations';
import defaultSeasons from '../../../../data/otb/season_calendar.json';

interface Props {
    currencyUnit: CurrencyUnit;
    /** 四季销售目标（元），key = seasonId */
    seasonSalesTargets?: Record<string, number>;
    /** 四季OTB预算（元），key = seasonId */
    seasonOTBBudgets?: Record<string, number>;
}

const PHASE_ICON: Record<SeasonPhase, string> = {
    not_started: '⏳',
    launch:      '🚀',
    main_sales:  '🔥',
    clearance:   '📦',
    ended:       '✓',
};

const RISK_COLOR: Record<string, string> = {
    normal:  'bg-emerald-50 border-emerald-100 text-emerald-700',
    warning: 'bg-amber-50 border-amber-100 text-amber-700',
    danger:  'bg-rose-50 border-rose-100 text-rose-700',
};

const HANDOVER_RISK_BADGE: Record<string, string> = {
    normal:  'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger:  'bg-rose-100 text-rose-700',
};

function fmtDateStr(s: string): string {
    const [, m, d] = s.split('-');
    return `${parseInt(m)}/${parseInt(d)}`;
}

export default function SeasonCalendarPanel({ currencyUnit, seasonSalesTargets, seasonOTBBudgets }: Props) {
    const today  = useMemo(() => new Date(), []);
    const seasons = defaultSeasons as SeasonCalendar[];

    const phaseInfos = useMemo(
        () => seasons.map(s => getCurrentSeasonPhase(today, s)),
        [today, seasons],
    );

    const risks = useMemo(() => {
        return seasons.map((s, i) => {
            const next = seasons[i + 1];
            return calcSeasonRisk(s, today, next);
        });
    }, [today, seasons]);

    const handover = useMemo(() => calcHandoverMatrix(seasons), [seasons]);

    const fc = (v: number | null | undefined) => formatCurrency(v, currencyUnit);

    return (
        <div className="space-y-6">
            {/* ── 四季卡片 ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {seasons.map((season, idx) => {
                    const info  = phaseInfos[idx];
                    const risk  = risks[idx];
                    const color = getSeasonColorClasses(season.colorScheme);
                    const salesTarget = seasonSalesTargets?.[season.seasonId];
                    const otbBudget   = seasonOTBBudgets?.[season.seasonId];

                    return (
                        <div key={season.seasonId}
                            className={`rounded-xl border ${color.border} ${color.bg} p-4 space-y-3`}>
                            {/* 卡头：季节名 + 阶段标签 */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-black ${color.text}`}>{season.seasonName}</span>
                                    <span className="text-xs text-slate-400 font-medium">{season.seasonShort}</span>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${color.badge} ${color.badgeText}`}>
                                    {PHASE_ICON[info.phase]} {info.phaseLabel}
                                </span>
                            </div>

                            {/* 整季进度条 */}
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                    <span>{fmtDateStr(season.seasonStart)}</span>
                                    <span>{info.progressPct.toFixed(0)}%</span>
                                    <span>{fmtDateStr(season.seasonEnd)}</span>
                                </div>
                                <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${color.progressBar} rounded-full transition-all`}
                                        style={{ width: `${info.progressPct}%` }}
                                    />
                                </div>
                            </div>

                            {/* 阶段日期表 */}
                            <div className="space-y-1">
                                {[
                                    { label: '上市期', start: season.launchStart,     end: season.launchEnd,     phase: 'launch'     as SeasonPhase },
                                    { label: '主销期', start: season.mainSalesStart,  end: season.mainSalesEnd,  phase: 'main_sales' as SeasonPhase },
                                    { label: '清尾期', start: season.clearanceStart,  end: season.clearanceEnd,  phase: 'clearance'  as SeasonPhase },
                                ].map(p => (
                                    <div key={p.label} className={`flex items-center justify-between text-[10px] px-2 py-1 rounded-lg ${info.phase === p.phase ? `${color.badge} font-semibold` : 'text-slate-500'}`}>
                                        <span>{p.label}</span>
                                        <span>{fmtDateStr(p.start)} — {fmtDateStr(p.end)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* 倒计时 / 剩余 */}
                            <div className="text-xs">
                                {info.phase === 'not_started' && info.daysToLaunch !== null && (
                                    <p className={`${color.text} font-medium`}>距上市 {info.daysToLaunch} 天</p>
                                )}
                                {(info.phase === 'launch' || info.phase === 'main_sales' || info.phase === 'clearance') && info.daysRemainingInPhase !== null && (
                                    <p className={`${color.text} font-medium`}>当前阶段余 {info.daysRemainingInPhase} 天</p>
                                )}
                                {info.phase === 'ended' && (
                                    <p className="text-slate-400 font-medium">本季已结束</p>
                                )}
                            </div>

                            {/* 销售目标 / OTB预算 */}
                            {(salesTarget !== undefined || otbBudget !== undefined) && (
                                <div className="flex gap-2 text-[10px] pt-1 border-t border-white/60">
                                    {salesTarget !== undefined && (
                                        <div>
                                            <p className="text-slate-400">销售目标</p>
                                            <p className={`font-semibold ${color.text}`}>{fc(salesTarget)}</p>
                                        </div>
                                    )}
                                    {otbBudget !== undefined && (
                                        <div className="ml-auto text-right">
                                            <p className="text-slate-400">OTB预算</p>
                                            <p className={`font-semibold ${color.text}`}>{fc(otbBudget)}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 季节状态标签 */}
                            <p className={`text-[10px] font-medium ${risk.level === 'danger' ? 'text-rose-600' : risk.level === 'warning' ? 'text-amber-600' : color.text}`}>
                                {risk.label}
                            </p>

                            {/* 风险建议 */}
                            <div className={`text-[10px] px-2.5 py-2 rounded-lg border ${RISK_COLOR[risk.level]}`}>
                                {risk.advice}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── 季节承接矩阵 ── */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">季节承接矩阵</h3>
                    <p className="text-xs text-slate-400 mt-0.5">相邻季节重叠天数 · 承接风险 · 运营建议</p>
                </div>
                <div className="divide-y divide-slate-50">
                    {handover.map((h, i) => {
                        const fromColor = getSeasonColorClasses(h.fromSeason.colorScheme);
                        const toColor   = getSeasonColorClasses(h.toSeason.colorScheme);
                        return (
                            <div key={i} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-4">
                                {/* 季节承接箭头 */}
                                <div className="flex items-center gap-2 flex-shrink-0 min-w-[140px]">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${fromColor.badge} ${fromColor.badgeText}`}>
                                        {h.fromSeason.seasonName}季
                                    </span>
                                    <span className="text-slate-400">→</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${toColor.badge} ${toColor.badgeText}`}>
                                        {h.toSeason.seasonName}季
                                    </span>
                                </div>

                                {/* 重叠信息 */}
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 flex-1">
                                    <div>
                                        <span className="text-slate-400">重叠期</span>
                                        <span className="ml-1 font-medium text-slate-700">{h.overlapPeriod}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400">重叠天数</span>
                                        <span className="ml-1 font-semibold text-slate-800">{h.overlapDays} 天</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${HANDOVER_RISK_BADGE[h.riskLevel]}`}>
                                        {h.riskLevel === 'danger' ? '⚠️ 高风险' : h.riskLevel === 'warning' ? '🔶 中等风险' : '✅ 正常'}
                                    </span>
                                </div>

                                {/* 建议 */}
                                <p className="text-xs text-slate-500 sm:max-w-xs">{h.advice}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── 核心关键节点（当前季节） ── */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">核心关键节点</h3>
                    <p className="text-xs text-slate-400 mt-0.5">各季节重要营销节点与主销阶段</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-max text-xs w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                {['季节', '上市开始', '上市结束', '主销开始', '主销结束', '清尾开始', '清尾结束', '年度占比', '核心节点'].map((h, i) => (
                                    <th key={i} className={`py-2 px-3 text-slate-400 font-medium whitespace-nowrap ${i >= 7 ? 'text-left' : i >= 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {seasons.map((s, idx) => {
                                const info  = phaseInfos[idx];
                                const color = getSeasonColorClasses(s.colorScheme);
                                return (
                                    <tr key={s.seasonId} className={`border-b border-slate-50 hover:bg-slate-50/60 ${info.phase !== 'not_started' && info.phase !== 'ended' ? color.bg : ''}`}>
                                        <td className="py-2.5 px-3">
                                            <span className={`font-bold ${color.text}`}>{s.seasonName}</span>
                                            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${color.badge} ${color.badgeText}`}>{info.phaseLabel}</span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-slate-600">{fmtDateStr(s.launchStart)}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-600">{fmtDateStr(s.launchEnd)}</td>
                                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">{fmtDateStr(s.mainSalesStart)}</td>
                                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">{fmtDateStr(s.mainSalesEnd)}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-500">{fmtDateStr(s.clearanceStart)}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-500">{fmtDateStr(s.clearanceEnd)}</td>
                                        <td className="py-2.5 px-3 text-right text-sky-700 font-medium">
                                            {s.salesRatioOfAnnual !== undefined ? `${(s.salesRatioOfAnnual * 100).toFixed(0)}%` : '--'}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-500 max-w-[200px]">
                                            {(s.keyEvents ?? []).join('·')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
