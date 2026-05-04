'use client';

import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import {
    ANNUAL_CONTROL_BUDGET_GANTT_BARS,
    ANNUAL_CONTROL_TRANSITION_GANTT_BARS,
    ANNUAL_CONTROL_SEASON_LABELS,
    SEASONAL_INVENTORY_TRANSITIONS,
    type AnnualControlGanttBar,
    type AnnualControlMasterLane,
    type AnnualControlMasterLaneCell,
    type AnnualControlMasterViewModel,
    type AnnualControlMonthAxisItem,
    type AnnualControlTone,
} from '@/config/annualControl';

const LANE_LABEL_WIDTH = 208;
const LANE_GAP = 8; // matches Tailwind gap-2 = 8px
const TIMELINE_OFFSET = LANE_LABEL_WIDTH + LANE_GAP; // 216px

type TemporalState = 'past' | 'current' | 'future';

interface AnnualControlMasterViewProps {
    model: AnnualControlMasterViewModel;
}

function TonePill({ tone, children }: { tone: AnnualControlTone | 'pink'; children: ReactNode }) {
    const toneClass = {
        slate: 'bg-slate-100 text-slate-600',
        sky: 'bg-sky-100 text-sky-700',
        emerald: 'bg-emerald-100 text-emerald-700',
        amber: 'bg-amber-100 text-amber-700',
        rose: 'bg-rose-100 text-rose-700',
        pink: 'bg-pink-100 text-pink-700',
    }[tone];

    return <span className={`inline-flex max-w-[180px] items-center truncate rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClass}`}>{children}</span>;
}

function LaneMeta({ title, detail, accent }: { title: string; detail: string; accent?: string }) {
    return (
        <div className="sticky left-0 z-30 relative flex min-h-[104px] flex-col justify-center rounded-[24px] border border-slate-200/70 bg-slate-50/62 px-4 py-3 shadow-[10px_0_18px_rgba(248,250,252,0.95)] backdrop-blur-sm">
            {accent && <span className={`absolute left-3 top-5 bottom-5 w-1 rounded-full opacity-80 ${accent}`} />}
            <div className={`text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 ${accent ? 'pl-3' : ''}`}>管理线</div>
            <div className={`mt-1 text-sm font-semibold text-slate-900 ${accent ? 'pl-3' : ''}`}>{title}</div>
            <div className={`mt-1 text-xs leading-5 text-slate-500 ${accent ? 'pl-3' : ''}`}>{detail}</div>
        </div>
    );
}

function MatrixRow({ title, detail, accent, children }: { title: string; detail: string; accent?: string; children: ReactNode }) {
    return (
        <div className="grid items-stretch gap-2" style={{ gridTemplateColumns: String(LANE_LABEL_WIDTH) + 'px minmax(0,1fr)' }}>
            <LaneMeta title={title} detail={detail} accent={accent} />
            <div className="min-w-0">{children}</div>
        </div>
    );
}

function TrackSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={['relative overflow-hidden rounded-[24px] border border-slate-200/85 bg-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-sm', className].filter(Boolean).join(' ')}>{children}</div>;
}

function getSeasonBandClass(season: keyof typeof ANNUAL_CONTROL_SEASON_LABELS) {
    return {
        Q1: 'border-emerald-200 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(255,255,255,0.92))]',
        Q2: 'border-sky-200 bg-[linear-gradient(135deg,rgba(56,189,248,0.16),rgba(255,255,255,0.92))]',
        Q3: 'border-amber-200 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(255,255,255,0.94))]',
        Q4: 'border-rose-200 bg-[linear-gradient(135deg,rgba(244,63,94,0.16),rgba(255,255,255,0.94))]',
    }[season];
}

function getCellToneClass(tone: AnnualControlTone) {
    return {
        slate: 'border-slate-200 bg-slate-50/75',
        sky: 'border-sky-200 bg-sky-50/78',
        emerald: 'border-emerald-200 bg-emerald-50/78',
        amber: 'border-amber-200 bg-amber-50/80',
        rose: 'border-rose-200 bg-rose-50/78',
    }[tone];
}

function getBarToneClass(tone: AnnualControlTone) {
    return {
        slate: 'border-slate-200 bg-white/95',
        sky: 'border-sky-200 bg-sky-50/92',
        emerald: 'border-emerald-200 bg-emerald-50/92',
        amber: 'border-amber-200 bg-amber-50/92',
        rose: 'border-rose-200 bg-rose-50/92',
    }[tone];
}

function getBarRingClass(tone: AnnualControlTone) {
    return {
        slate: 'ring-slate-300',
        sky: 'ring-sky-300',
        emerald: 'ring-emerald-300',
        amber: 'ring-amber-300',
        rose: 'ring-rose-300',
    }[tone];
}

function getTemporalState(month: number, currentMonth: number): TemporalState {
    if (month < currentMonth) return 'past';
    if (month > currentMonth) return 'future';
    return 'current';
}

function getTemporalSurfaceClass(state: TemporalState, inScope: boolean) {
    if (state === 'current') return 'bg-white/76';
    if (state === 'past') return inScope ? 'bg-slate-100/60' : 'bg-slate-50/78 opacity-72';
    return inScope ? 'bg-sky-50/62' : 'bg-white/80 opacity-82';
}

function getMatrixCellClass(cell: AnnualControlMasterLaneCell, currentMonth: number, inScope: boolean) {
    const state = getTemporalState(cell.month, currentMonth);
    const emphasisClass = state === 'current' ? 'shadow-[inset_0_0_0_1px_rgba(244,114,182,0.14),inset_0_1px_0_rgba(255,255,255,0.92)]' : '';
    const scopeClass = !inScope && state !== 'current' ? 'opacity-84' : '';
    const surfaceClass = state === 'current'
        ? 'border-slate-200/70 bg-white/90'
        : `${getCellToneClass(cell.tone)} ${getTemporalSurfaceClass(state, inScope)}`;
    return `border-l border-slate-200/70 first:border-l-0 ${surfaceClass} ${emphasisClass} ${scopeClass}`;
}

function getTimelineBaseStyle(currentMonth: number): CSSProperties {
    return {
        ['--timeline-offset' as string]: `${TIMELINE_OFFSET}px`,
        ['--current-month' as string]: String(currentMonth),
    };
}

function getMonthCenterStyle(month: number): CSSProperties {
    return {
        left: `calc(var(--timeline-offset) + ((100% - var(--timeline-offset)) / 12) * ${month - 0.5})`,
    };
}

function getMonthSpanStyle(startMonth: number, span: number): CSSProperties {
    return {
        left: `calc(var(--timeline-offset) + ((100% - var(--timeline-offset)) / 12) * ${startMonth - 1})`,
        width: `calc(((100% - var(--timeline-offset)) / 12) * ${span})`,
    };
}

/** 计算当前周在所在月份内的偏移比例 (0–1)，用于定位周次细线 */
function getCurrentWeekFractionInMonth(currentMonth: number, months: AnnualControlMonthAxisItem[]): number {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const currentWeekOfYear = Math.ceil(dayOfYear / 7);
    const axis = months.find((m) => m.month === currentMonth);
    if (!axis) return 0.5;
    const bounds = getWeekBounds(axis.weekRange);
    const totalWeeks = Math.max(1, bounds.end - bounds.start + 1);
    const weekOffset = Math.max(0, Math.min(totalWeeks - 0.01, currentWeekOfYear - bounds.start));
    return Math.max(0.05, Math.min(0.95, (weekOffset + 0.5) / totalWeeks));
}

/** 周次细线的绝对定位样式 */
function getWeekCursorStyle(currentMonth: number, weekFraction: number): CSSProperties {
    return {
        left: `calc(var(--timeline-offset) + ((100% - var(--timeline-offset)) / 12) * ${currentMonth - 1 + weekFraction})`,
    };
}

function getWeekBounds(weekRange: string) {
    const match = weekRange.match(/(\d+)-(\d+)/);
    if (!match) return { start: 1, end: 4 };
    return { start: Number(match[1]), end: Number(match[2]) };
}

function getTimelineNodeToneClass(tone: AnnualControlTone) {
    return {
        slate: 'bg-slate-200 text-slate-700',
        sky: 'bg-sky-100 text-sky-700',
        emerald: 'bg-emerald-100 text-emerald-700',
        amber: 'bg-amber-100 text-amber-700',
        rose: 'bg-rose-100 text-rose-700',
    }[tone];
}

function getDependencyStrokeColor(tone: AnnualControlTone) {
    return {
        slate: '#64748b',
        sky: '#0ea5e9',
        emerald: '#10b981',
        amber: '#f59e0b',
        rose: '#f43f5e',
    }[tone];
}

function getDependencyTone(relation: 'pre' | 'post', severity: 'low' | 'medium' | 'high'): AnnualControlTone {
    if (relation === 'pre') return severity === 'high' ? 'rose' : 'amber';
    return severity === 'high' ? 'rose' : 'sky';
}

function MatrixOverlays({ model }: { model: AnnualControlMasterViewModel }) {
    // 计算当前周在本月内的位置比例
    const weekFraction = getCurrentWeekFractionInMonth(model.currentMonth, model.months);
    const weekCursorStyle = getWeekCursorStyle(model.currentMonth, weekFraction);

    return (
        // z-[5]: 占位层，粉色背景已移入 WeekCursorOverlay z-[25]
        <div className='pointer-events-none absolute inset-y-0 left-0 right-14 z-[5] hidden md:block' />
    );
}

/** 细线层: z-[25] 高于 sticky header z-20，确保细线从顶到底完整贯通 */
function WeekCursorOverlay({ model }: { model: AnnualControlMasterViewModel }) {
    // 每30分钟重算一次，自动跟随时间推进（周次细线 + 跨月时背景列位移）
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 24 * 60 * 60 * 1000);
        return () => clearInterval(id);
    }, []);

    const weekFraction = getCurrentWeekFractionInMonth(model.currentMonth, model.months);
    const weekCursorStyle = getWeekCursorStyle(model.currentMonth, weekFraction);

    return (
        <div className='pointer-events-none absolute inset-y-0 left-0 right-14 z-[25] hidden md:block'>
            {/* 当前月列背景：z-[25] 统一覆盖 sticky 和非 sticky 所有行（纯色极低透明度） */}
            <div
                className='absolute inset-y-0 bg-pink-500/5'
                style={{ ...getMonthSpanStyle(model.currentMonth, 1) }}
            />
            {/* 主线（去除光晕保证文字清晰可读） */}
            <div
                className='absolute inset-y-0 w-px -translate-x-1/2 bg-pink-500/70'
                style={weekCursorStyle}
            />
            {/* 顶部圆点 */}
            <div
                className='absolute top-3 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-white bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.4)]'
                style={weekCursorStyle}
            />
            <div className='absolute right-3 top-2 hidden xl:block'>
                <TonePill tone="slate">全年完整展开 · 12月自然收尾</TonePill>
            </div>
        </div>
    );
}


const CONTINUUM_SEASON_HEADLINES: Record<number, string> = {
    1: '双节礼赠与春波承接',
    2: '春主销承接与秋订货前置',
    3: '妇女节换季与夏波预排',
    4: '五一预热与春退夏进',
    5: '劳动节承接与夏主销拉量',
    6: '年中特惠与冬订货评审',
    7: '暑期主推与秋波预热',
    8: '七夕返校与秋主销起量',
    9: '中秋国庆与秋波爆发',
    10: '深秋保暖与冬一波打样',
    11: '双11与冬主销冲量',
    12: '年终禼赠与春波前置',
};

const CONTINUUM_SEASON_BANDS: Array<{ season: 'Q1' | 'Q2' | 'Q3' | 'Q4'; title: string }> = [
    { season: 'Q1', title: '春季经营带' },
    { season: 'Q2', title: '夏季经营带' },
    { season: 'Q3', title: '秋季经营带' },
    { season: 'Q4', title: '冬季经营带' },
];

function getContinuumQuarterOffset(month: number) {
    return ((month - 1) % 3) / 3;
}

function formatMonthDayLabel(date: Date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getWeekDateRange(year: number, week: number) {
    const start = new Date(year, 0, 1 + (week - 1) * 7);
    const end = new Date(year, 0, 1 + week * 7 - 1);
    return {
        startLabel: formatMonthDayLabel(start),
        endLabel: formatMonthDayLabel(end),
    };
}

function TimelineContinuumRow({ model, scopeSet }: { model: AnnualControlMasterViewModel; scopeSet: Set<number> }) {
    const seasonTones: Record<string, AnnualControlTone> = {
        Q1: 'emerald',
        Q2: 'sky',
        Q3: 'amber',
        Q4: 'rose',
    };

    return (
        <MatrixRow title="全年推进 / 季节切换" detail="先看季度经营带，再看季度下面 3 个自然月如何推进上新、主销和收口。" accent="bg-sky-400">
            <TrackSurface>
                <div className="overflow-hidden rounded-[22px]">
                    <div className="grid grid-cols-12 border-b border-slate-200/80">
                        {CONTINUUM_SEASON_BANDS.map((band) => {
                            const isCurrent = model.currentSeason === band.season;
                            const currentMonthInBand = isCurrent ? model.currentMonth : 1;
                            const t = seasonTones[band.season] || 'slate';

                            // 计算当前月份在所属季度中的索引（0、1、2代表季度的前中后月）
                            const monthIndexInQuarter = (model.currentMonth - 1) % 3;
                            // 每月占据 33.333% 带宽，居中点对应 16.666%, 50%, 83.333%
                            const centerOffsetPercentage = monthIndexInQuarter * 33.333 + 16.666;

                            return (
                                <div
                                    key={`continuum-band-${band.season}`}
                                    className={`relative col-span-3 min-h-[76px] border-l border-slate-200/70 px-5 py-4 first:border-l-0 ${getSeasonBandClass(band.season)}`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`h-2.5 w-2.5 rounded-full ${t === 'emerald' ? 'bg-emerald-400' : t === 'sky' ? 'bg-sky-400' : t === 'amber' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                                            <div className={`text-[15px] font-bold tracking-tight ${isCurrent ? 'text-slate-950' : 'text-slate-700'}`}>{band.title}</div>
                                        </div>
                                        <TonePill tone={t}>{band.season}</TonePill>
                                    </div>
                                    {isCurrent && model.nextNode ? (
                                        <div
                                            className="absolute top-[42px] z-20 flex"
                                            style={{ left: `${centerOffsetPercentage}%`, transform: 'translateX(-50%)' }}
                                        >
                                            <TonePill tone={model.nextNode.tone}>{model.nextNode.etaLabel} · 下一步</TonePill>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                    <div className="grid grid-cols-12 relative">
                        {/* 轨道底线 */}
                        <div className="absolute top-[21px] left-[4%] right-[4%] h-[2.5px] bg-slate-200/70 pointer-events-none" />

                        {model.months.map((month) => {
                            const state = getTemporalState(month.month, model.currentMonth);
                            const statusLabel = state === 'past' ? '历史阶段' : state === 'current' ? '当前推进' : '待进入';

                            return (
                                <div key={`continuum-${month.month}`} className={`relative min-h-[88px] border-l border-slate-200/60 px-2 py-4 first:border-l-0 ${getTemporalSurfaceClass(state, scopeSet.has(month.month))}`}>
                                    {/* 活跃轨道高亮 */}
                                    {state === 'past' && <div className="absolute top-[21px] left-0 right-0 h-[2.5px] bg-slate-300 pointer-events-none" />}
                                    {state === 'current' && <div className="absolute top-[21px] left-0 right-1/2 h-[2.5px] bg-gradient-to-r from-slate-300 to-pink-400 pointer-events-none" />}

                                    <div className="relative z-10 flex flex-col items-center text-center">
                                        <div className={`box-content flex h-[12px] w-[12px] items-center justify-center rounded-full bg-white ring-4 transition-transform ${state === 'past' ? 'border-[3.5px] border-slate-300 ring-white' : state === 'current' ? 'scale-125 border-[4px] border-pink-500 shadow-[0_0_0_4px_rgba(244,114,182,0.15)] ring-pink-50' : 'border-[3px] border-slate-200 ring-white'}`} />
                                        <div className={`mt-3.5 text-[14px] font-bold tracking-tight ${state === 'past' ? 'text-slate-500' : state === 'current' ? 'text-pink-600' : 'text-slate-700'}`}>{month.phaseLabel}</div>
                                        <div className={`mt-0.5 text-[10px] font-semibold leading-tight ${state === 'past' ? 'text-slate-400 opacity-80' : state === 'current' ? 'text-slate-500' : 'text-slate-400/90'}`}>{statusLabel}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </TrackSurface>
        </MatrixRow>
    );
}

function SeasonBandRow({ model }: { model: AnnualControlMasterViewModel }) {
    const currentSeasonIndex = model.currentSeason === 'Q1' ? 0 : model.currentSeason === 'Q2' ? 1 : model.currentSeason === 'Q3' ? 2 : 3;
    return (
        <MatrixRow title="季节切换" detail="全年仍按春 / 夏 / 秋 / 冬四条经营带推进，季度切换点必须和货盘承接同步。" accent="bg-emerald-400">
            <TrackSurface>
                <div className="grid grid-cols-12">
                    {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((season, seasonIndex) => (
                        <div
                            key={season}
                            className={`col-span-3 min-h-[88px] border-l border-slate-200/70 px-4 py-3 first:border-l-0 ${getSeasonBandClass(season)} ${seasonIndex < currentSeasonIndex ? 'opacity-88' : seasonIndex > currentSeasonIndex ? 'brightness-[1.02]' : 'shadow-[inset_0_0_0_1px_rgba(244,114,182,0.10)]'}`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-slate-900">{ANNUAL_CONTROL_SEASON_LABELS[season]}经营带</div>
                                <TonePill tone="slate">{season}</TonePill>
                            </div>
                            <div className="mt-2 text-xs leading-5 text-slate-600">
                                {season === 'Q1'
                                    ? '春上新 / 春主销 / 春收口'
                                    : season === 'Q2'
                                        ? '夏上新 / 夏主销 / 春退市'
                                        : season === 'Q3'
                                            ? '秋上新 / 节庆预热 / 秋冬承接'
                                            : '冬上新 / 双11冲刺 / 年末清货'}
                            </div>
                        </div>
                    ))}
                </div>
            </TrackSurface>
        </MatrixRow>
    );
}

function MonthAxisRow({ model, scopeSet }: { model: AnnualControlMasterViewModel; scopeSet: Set<number> }) {
    return (
        <MatrixRow title="月份 / 周次 / 日期" detail="把月份、周次和实际公历日期压到同一条主轴上，直观映射真实日历推进。" accent="bg-indigo-400">
            <TrackSurface className="bg-white/82">
                <div className="grid grid-cols-12">
                    {model.months.map((month) => {
                        const state = getTemporalState(month.month, model.currentMonth);
                        const bounds = getWeekBounds(month.weekRange);
                        const weeks = Array.from({ length: bounds.end - bounds.start + 1 }, (_, index) => bounds.start + index);
                        const isCurrentMonth = month.month === model.currentMonth;
                        return (
                            <div
                                key={month.month}
                                className={`relative min-h-[128px] border-l border-slate-200/70 px-3.5 py-3.5 first:border-l-0 ${getTemporalSurfaceClass(state, scopeSet.has(month.month))}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className={`text-[16px] font-semibold tracking-tight ${isCurrentMonth ? 'text-pink-600' : 'text-slate-900'}`}>
                                        {String(month.month).padStart(2, '0')}月
                                    </div>
                                    <div
                                        className={`inline-flex h-[30px] min-w-[52px] items-center justify-center rounded-full border px-3 text-[11px] font-semibold ${isCurrentMonth ? 'border-pink-200/80 bg-pink-50/75 text-pink-500' : 'border-slate-200/80 bg-white/68 text-slate-400'}`}
                                    >
                                        {month.wave}
                                    </div>
                                </div>
                                <div className="mt-7 relative">
                                    {/* 贯穿全月的水平刻度线，左右负边距实现跨月连接 */}
                                    <div className={`absolute top-[9px] -left-3.5 -right-3.5 h-px ${isCurrentMonth ? 'bg-pink-100' : 'bg-slate-200/70'}`}></div>

                                    <div className="relative grid gap-x-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
                                        {weeks.map((week) => {
                                            const range = getWeekDateRange(model.year, week);
                                            const isCurrentWeek = isCurrentMonth && week === model.currentWeek;
                                            return (
                                                <div key={`${month.month}-week-${week}`} className="flex flex-col items-center">
                                                    {/* 周次刻度节点 */}
                                                    <div
                                                        className={`relative z-10 flex h-[20px] min-w-[24px] items-center justify-center rounded-full border-[2.5px] bg-white px-1 text-[10px] font-bold tracking-tighter shadow-sm transition-transform hover:scale-110 ${isCurrentWeek ? 'border-pink-300 text-pink-600 shadow-pink-200/50 ring-2 ring-pink-50 ring-offset-1' : 'border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'
                                                            }`}
                                                    >
                                                        {week}
                                                    </div>

                                                    {/* 刻度短导线 */}
                                                    <div className={`mt-0.5 h-1.5 w-px ${isCurrentWeek ? 'bg-pink-200' : 'bg-slate-200/80'}`}></div>

                                                    {/* 日期信息盘 */}
                                                    {(() => {
                                                        const todayLabel = formatMonthDayLabel(new Date());
                                                        const isStartToday = range.startLabel === todayLabel;
                                                        const isEndToday = range.endLabel === todayLabel;
                                                        return (
                                                            <div className="mt-1.5 flex flex-col items-center justify-center gap-[3px] text-center">
                                                                <span className={`text-[10px] tabular-nums tracking-tight leading-none ${isStartToday ? 'text-pink-600 font-bold' : isCurrentWeek ? 'text-slate-800 font-semibold' : 'text-slate-500 font-medium'}`}>
                                                                    {range.startLabel.replace('/', '.')}
                                                                </span>
                                                                <span className={`text-[9px] tabular-nums leading-none ${isEndToday ? 'text-pink-600 font-bold opacity-100' : isCurrentWeek ? 'text-slate-600 font-medium opacity-80' : 'text-slate-400 font-medium opacity-60'}`}>
                                                                    {range.endLabel.replace('/', '.')}
                                                                </span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </TrackSurface>
        </MatrixRow>
    );
}

function WeekScaleRow({ model, scopeSet }: { model: AnnualControlMasterViewModel; scopeSet: Set<number> }) {
    return (
        <MatrixRow title="周级节点标尺" detail="把周次和关键节点前置到主盘上，先看一周内发生什么，再看解释层。" accent="bg-violet-400">
            <TrackSurface>
                <div className="grid grid-cols-12">
                    {model.months.map((month) => {
                        const state = getTemporalState(month.month, model.currentMonth);
                        const bounds = getWeekBounds(month.weekRange);
                        const weeks = Array.from({ length: bounds.end - bounds.start + 1 }, (_, index) => bounds.start + index);
                        const nodes = model.timelineNodes.filter((node) => node.month === month.month).sort((left, right) => (left.week ?? 99) - (right.week ?? 99));
                        return (
                            <div key={`week-scale-${month.month}`} className={`relative min-h-[120px] border-l border-slate-200/70 px-4 py-3 first:border-l-0 ${getTemporalSurfaceClass(state, scopeSet.has(month.month))}`}>
                                <div className="grid grid-cols-4 gap-1 text-[10px] font-medium text-slate-500">
                                    {weeks.slice(0, 4).map((week) => (
                                        <div key={`${month.month}-week-${week}`} className="rounded-full bg-white/72 px-1.5 py-1 text-center">W{week}</div>
                                    ))}
                                </div>
                                <div className="mt-3 space-y-1.5">
                                    {nodes.slice(0, 2).map((node) => {
                                        const tone = getDependencyTone(node.nodeType === 'clearance' ? 'post' : 'pre', node.severity);
                                        const label = (node.week ? `W${node.week}` : month.wave) + ' · ' + node.label;
                                        const isHigh = node.severity === 'high';
                                        const isLow = node.severity === 'low';
                                        return (
                                            <div
                                                key={`${month.month}-${node.label}`}
                                                className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${getTimelineNodeToneClass(tone)} ${isHigh ? 'font-semibold ring-1 ring-inset ring-current/15' : 'font-medium'} ${isLow ? 'opacity-55' : ''}`}
                                            >
                                                {isHigh && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />}
                                                {label}
                                            </div>
                                        );
                                    })}
                                    {nodes.length === 0 ? <div className="text-[10px] leading-5 text-slate-400">本月暂无额外节点</div> : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </TrackSurface>
        </MatrixRow>
    );
}

function GanttRow({ title, detail, accent, bars, model, scopeSet }: { title: string; detail: string; accent?: string; bars: AnnualControlGanttBar[]; model: AnnualControlMasterViewModel; scopeSet: Set<number> }) {
    return (
        <MatrixRow title={title} detail={detail} accent={accent}>
            <TrackSurface className="relative">
                {/* 背景色格（绝对层，仅负责时区着色） */}
                <div className="pointer-events-none absolute inset-0 grid grid-cols-12">
                    {model.months.map((month) => {
                        const state = getTemporalState(month.month, model.currentMonth);
                        return <div key={`${title}-bg-${month.month}`} className={`border-l border-slate-200/70 first:border-l-0 ${getTemporalSurfaceClass(state, scopeSet.has(month.month))}`} />;
                    })}
                </div>
                {/* 甘特条（正常流布局，自然撑高行高） */}
                <div className="relative grid min-h-[112px] grid-cols-12">
                    {bars.map((bar) => {
                        const intersectsScope = Array.from({ length: bar.span }, (_, index) => bar.startMonth + index).some((month) => scopeSet.has(month));
                        const currentInside = model.currentMonth >= bar.startMonth && model.currentMonth < bar.startMonth + bar.span;
                        const hasBudget = bar.budgetTarget != null;
                        const hasActual = hasBudget && bar.budgetActual != null;
                        const pct = hasActual ? Math.min(100, Math.round((bar.budgetActual! / bar.budgetTarget!) * 100)) : 0;
                        const barGridRow = bar.id.includes('buying') || bar.id.includes('handoff') ? 2 : 1;
                        return (
                            <div key={bar.id} style={{ gridColumn: `${bar.startMonth} / span ${bar.span}`, gridRow: barGridRow }} className="px-1.5 py-2">
                                <div className={`rounded-[20px] border px-3 py-3 shadow-sm ${getBarToneClass(bar.tone)} ${intersectsScope ? 'shadow-[0_10px_24px_rgba(15,23,42,0.08)]' : ''}`}>
                                    <div className="flex flex-wrap items-start justify-between gap-x-1.5 gap-y-2">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <TonePill tone={bar.tone}>{bar.label}</TonePill>
                                            <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${currentInside ? 'bg-pink-50 text-pink-600 ring-1 ring-inset ring-pink-300/70' :
                                                model.currentMonth > bar.startMonth ? 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200/60' :
                                                    'bg-white/60 text-slate-400 ring-1 ring-inset ring-slate-200 border-dashed'
                                                }`}>
                                                {currentInside ? '进行中' : model.currentMonth > bar.startMonth ? '已完结' : '待启动'}
                                            </span>
                                        </div>
                                        <span className="shrink-0 whitespace-nowrap px-1 text-[11px] text-slate-400">M{String(bar.startMonth).padStart(2, '0')}-{String(bar.startMonth + bar.span - 1).padStart(2, '0')}</span>
                                    </div>
                                    <div className="mt-2 text-xs leading-5 text-slate-600">{bar.detail}</div>
                                    {hasBudget && (
                                        <div className="mt-3 space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900/8">
                                                    {hasActual && (
                                                        <div
                                                            className="absolute inset-y-0 left-0 rounded-full bg-slate-900/25 transition-all"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    )}
                                                </div>
                                                <span className="shrink-0 text-[11px] font-medium text-slate-500">
                                                    {hasActual ? `${pct}%` : '待执行'}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                {hasActual
                                                    ? `¥${bar.budgetActual!.toLocaleString()}万 / ¥${bar.budgetTarget!.toLocaleString()}万`
                                                    : `预算 ¥${bar.budgetTarget!.toLocaleString()}万`}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </TrackSurface>
        </MatrixRow>
    );
}


function DependencyRow({ model, scopeSet }: { model: AnnualControlMasterViewModel; scopeSet: Set<number> }) {
    const lineHeight = 26;
    const svgHeight = 40 + model.dependencies.length * lineHeight;

    return (
        <MatrixRow title="前后约束关系" detail="把当前节点的前序依赖、后续影响和下一关键节点挂在同一条年轴上。" accent="bg-rose-400">
            <TrackSurface className="relative">
                <div className="grid grid-cols-12">
                    {model.months.map((month) => {
                        const state = getTemporalState(month.month, model.currentMonth);
                        return <div key={`dep-${month.month}`} className={`min-h-[148px] border-l border-slate-200/70 first:border-l-0 ${getTemporalSurfaceClass(state, scopeSet.has(month.month))}`} />;
                    })}
                </div>
                <svg className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[92px] w-full" viewBox={`0 0 1200 ${svgHeight}`} preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        <marker id="annual-control-arrow-amber" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                            <path d="M0,0 L10,5 L0,10 z" fill="#f59e0b" />
                        </marker>
                        <marker id="annual-control-arrow-rose" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                            <path d="M0,0 L10,5 L0,10 z" fill="#f43f5e" />
                        </marker>
                        <marker id="annual-control-arrow-sky" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                            <path d="M0,0 L10,5 L0,10 z" fill="#0ea5e9" />
                        </marker>
                    </defs>
                    {model.dependencies.map((dependency, index) => {
                        const tone = getDependencyTone(dependency.relation, dependency.severity);
                        const stroke = getDependencyStrokeColor(tone);
                        const x1 = ((dependency.fromMonth - 0.5) / 12) * 1200;
                        const x2 = ((dependency.toMonth - 0.5) / 12) * 1200;
                        const y = 22 + index * lineHeight;
                        const midX = (x1 + x2) / 2;
                        const bend = dependency.relation === 'pre' ? -18 : 18;
                        const markerId = tone === 'rose' ? 'url(#annual-control-arrow-rose)' : tone === 'amber' ? 'url(#annual-control-arrow-amber)' : 'url(#annual-control-arrow-sky)';
                        return (
                            <g key={`dep-line-${dependency.id}`}>
                                <circle cx={x1} cy={y} r="3.5" fill={stroke} opacity="0.9" />
                                <path d={`M ${x1} ${y} C ${midX} ${y + bend}, ${midX} ${y + bend}, ${x2} ${y}`} fill="none" stroke={stroke} strokeWidth="2.5" strokeDasharray={dependency.severity === 'high' ? '0' : '5 5'} markerEnd={markerId} opacity="0.9" />
                            </g>
                        );
                    })}
                </svg>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[58px] grid grid-cols-12">
                    {model.dependencies.map((dependency) => {
                        const startMonth = Math.min(dependency.fromMonth, dependency.toMonth);
                        const span = Math.abs(dependency.toMonth - dependency.fromMonth) + 1;
                        return (
                            <div key={dependency.id} style={{ gridColumn: `${startMonth} / span ${span}` }} className="px-1.5 pb-3">
                                <div className={`rounded-[20px] border px-3 py-3 ${dependency.severity === 'high' ? 'border-rose-200 bg-rose-50/88' : 'border-amber-200 bg-amber-50/88'}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <TonePill tone={dependency.relation === 'pre' ? 'amber' : dependency.severity === 'high' ? 'rose' : 'sky'}>{dependency.title}</TonePill>
                                        <span className="text-[11px] text-slate-400">{dependency.relatedModule}</span>
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-slate-900">{dependency.label}</div>
                                    <div className="mt-1 text-xs leading-5 text-slate-600">{dependency.detail}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </TrackSurface>
        </MatrixRow>
    );
}

function ActionLaneCell({ cell, currentMonth, inScope }: { cell: AnnualControlMasterLaneCell; currentMonth: number; inScope: boolean }) {
    return (
        <div className={`relative min-h-[188px] px-4 py-3 ${getMatrixCellClass(cell, currentMonth, inScope)}`}>
            <div className='relative z-10 flex items-center justify-between gap-2'>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{cell.headline}</div>
            </div>
            <div className='relative z-10 mt-3 space-y-2.5'>
                {cell.actionTracks?.map((track) => (
                    <div key={`${cell.month}-${track.teamType}`} className="grid grid-cols-[54px_minmax(0,1fr)] items-start gap-2">
                        <div className="flex flex-col items-center gap-1 pt-1 text-[10px] font-semibold tracking-[0.14em] text-slate-500">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white">{track.ownerCode}</span>
                            <span className="text-[9px] leading-4">{track.teamType}</span>
                        </div>
                        <div className={`relative overflow-hidden rounded-[18px] border px-3 py-2.5 ${track.riskFlag ? 'border-rose-200 bg-white/95' : 'border-slate-200 bg-white/90'}`}>
                            <span className={`absolute inset-y-0 left-0 w-1.5 ${track.riskFlag ? 'bg-rose-400' : track.priority === 'P0' ? 'bg-pink-400' : track.priority === 'P1' ? 'bg-sky-400' : 'bg-slate-300'}`} />
                            <div className="flex items-center justify-between gap-2 pl-1">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="shrink-0 rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{track.weekLabel}</span>
                                    <span className="truncate text-[11px] font-medium text-slate-700">{track.title}</span>
                                </div>
                                <span className="shrink-0 text-[10px] font-medium text-slate-400">{track.priority}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1 pl-1">
                                <span className="inline-flex max-w-[120px] items-center truncate rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                    输出 · {track.deliverable}
                                </span>
                                <span className="inline-flex max-w-[96px] items-center truncate rounded-full bg-white/88 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                    {track.statusLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {cell.emphasis && cell.supportingText ? <div className='relative z-10 mt-3 text-[11px] leading-5 text-slate-500'>{cell.supportingText}</div> : null}
            {cell.emphasis && cell.nextStepHint ? <div className='relative z-10 mt-2 text-[11px] font-medium text-pink-600'>下一节点：{cell.nextStepHint}</div> : null}
        </div>
    );
}

function GenericLaneCell({ cell, currentMonth, inScope }: { cell: AnnualControlMasterLaneCell; currentMonth: number; inScope: boolean }) {
    return (
        <div className={`relative min-h-[156px] px-4 py-3 ${getMatrixCellClass(cell, currentMonth, inScope)}`} title={cell.supportingText}>
            <div className='relative z-10 flex items-start justify-between gap-2'>
                <div className="text-sm font-semibold leading-6 text-slate-900">{cell.headline}</div>
            </div>
            <div className='relative z-10 mt-2 text-xs leading-5 text-slate-600'>{cell.description}</div>
            {cell.supportingText ? <div className='relative z-10 mt-2 text-[11px] leading-5 text-slate-500'>{cell.supportingText}</div> : null}
            {cell.nextStepHint ? <div className='relative z-10 mt-2 text-[11px] font-medium text-pink-600'>下一节点：{cell.nextStepHint}</div> : null}
            <div className='relative z-10 mt-3 flex flex-wrap gap-1.5'>
                {cell.chips.slice(0, 3).map((chip) => (
                    <span key={`${cell.month}-${chip}`} title={chip} className="inline-flex max-w-[108px] items-center truncate rounded-full bg-white/88 px-2 py-1 text-[11px] font-medium text-slate-600">
                        {chip}
                    </span>
                ))}
                {cell.footwearChips?.slice(0, 2).map((chip) => (
                    <span key={`${cell.month}-fw-${chip}`} title={chip} className="inline-flex max-w-[120px] items-center truncate rounded-full bg-slate-900/5 px-2 py-1 text-[11px] font-medium text-slate-600">
                        {chip}
                    </span>
                ))}
            </div>
        </div>
    );
}

type TransitionStageKey = 'launch' | 'mainSell' | 'clearance';

type SeasonalTransitionRecord = (typeof SEASONAL_INVENTORY_TRANSITIONS)[number];

const TRANSITION_STAGE_META: Record<TransitionStageKey, {
    label: string;
    planClass: string;
    planTextClass: string;
    actualClass: string;
}> = {
    launch: {
        label: '上市',
        planClass: 'border-sky-200 bg-sky-100/92',
        planTextClass: 'text-sky-700',
        actualClass: 'bg-sky-500/88',
    },
    mainSell: {
        label: '主销',
        planClass: 'border-emerald-200 bg-emerald-100/92',
        planTextClass: 'text-emerald-700',
        actualClass: 'bg-emerald-500/88',
    },
    clearance: {
        label: '清货',
        planClass: 'border-amber-200 bg-amber-100/92',
        planTextClass: 'text-amber-700',
        actualClass: 'bg-rose-500/86',
    },
};

const TRANSITION_LIFECYCLE_META: { key: keyof SeasonalTransitionRecord['lifecyclePlan']; label: string; barClass: string; textClass: string }[] = [
    { key: 'launch', label: '上', barClass: 'bg-sky-400/85', textClass: 'text-sky-600' },
    { key: 'mainSell', label: '主', barClass: 'bg-emerald-400/85', textClass: 'text-emerald-600' },
    { key: 'mature', label: '成', barClass: 'bg-amber-400/85', textClass: 'text-amber-600' },
    { key: 'clearance', label: '清', barClass: 'bg-rose-400/80', textClass: 'text-rose-600' },
];

function getTransitionRangeStyle(start: number, end: number): CSSProperties {
    const safeStart = Math.max(1, Math.min(12.98, start));
    const safeEnd = Math.max(safeStart + 0.08, Math.min(12.98, end));
    return {
        left: `calc((100% / 12) * ${safeStart - 1})`,
        width: `calc((100% / 12) * ${safeEnd - safeStart})`,
    };
}

function formatTransitionPercent(value: number) {
    return `${Math.round(value * 100)}%`;
}

function getTransitionSeasonTone(season: keyof typeof ANNUAL_CONTROL_SEASON_LABELS): AnnualControlTone {
    const toneMap: Record<keyof typeof ANNUAL_CONTROL_SEASON_LABELS, AnnualControlTone> = {
        Q1: 'emerald',
        Q2: 'sky',
        Q3: 'amber',
        Q4: 'rose',
    };
    return toneMap[season];
}

function LifecycleMixBar({ label, mix }: { label: '计' | '实'; mix: SeasonalTransitionRecord['lifecyclePlan'] | SeasonalTransitionRecord['lifecycleActual'] }) {
    return (
        <div className="grid grid-cols-[16px_minmax(0,1fr)] items-start gap-2">
            <span className="pt-0.5 text-[10px] font-semibold text-slate-500">{label}</span>
            <div>
                <div className="flex h-2 overflow-hidden rounded-full bg-slate-200/70">
                    {TRANSITION_LIFECYCLE_META.map(({ key, barClass }) => (
                        <div key={`${label}-${key}`} className={barClass} style={{ width: formatTransitionPercent(mix[key]) }} />
                    ))}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] leading-4">
                    {TRANSITION_LIFECYCLE_META.map(({ key, label: shortLabel, textClass }) => (
                        <span key={`${label}-${key}-text`} className={textClass}>{shortLabel}{Math.round(mix[key] * 100)}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function RatioMixBar({ label, newRatio, actual = false }: { label: '计' | '实'; newRatio: number; actual?: boolean }) {
    const newPct = Math.round(newRatio * 100);
    const oldPct = 100 - newPct;

    return (
        <div className="grid grid-cols-[16px_minmax(0,1fr)_86px] items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-500">{label}</span>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-200/65">
                <div className={actual ? 'bg-emerald-500/85' : 'bg-emerald-200/95'} style={{ width: `${newPct}%` }} />
                <div className={actual ? 'bg-amber-500/75' : 'bg-amber-200/95'} style={{ width: `${oldPct}%` }} />
            </div>
            <span className={`text-right text-[10px] font-medium ${actual ? 'text-slate-700' : 'text-slate-400'}`}>
                新 {newPct} / 旧 {oldPct}
            </span>
        </div>
    );
}

const TRANSITION_SEASON_META: Record<keyof typeof ANNUAL_CONTROL_SEASON_LABELS, {
    short: string;
    planClass: string;
    actualClass: string;
    textClass: string;
}> = {
    Q1: { short: '\u6625', planClass: 'border-amber-200 bg-amber-100/92', actualClass: 'bg-amber-500/84', textClass: 'text-amber-700' },
    Q2: { short: '\u590f', planClass: 'border-lime-200 bg-lime-100/92', actualClass: 'bg-lime-500/80', textClass: 'text-lime-700' },
    Q3: { short: '\u79cb', planClass: 'border-sky-200 bg-sky-100/92', actualClass: 'bg-sky-500/84', textClass: 'text-sky-700' },
    Q4: { short: '\u51ac', planClass: 'border-fuchsia-200 bg-fuchsia-100/92', actualClass: 'bg-fuchsia-500/82', textClass: 'text-fuchsia-700' },
};

type TransitionMatrixStage = TransitionStageKey | 'handoff';

const TRANSITION_MATRIX_STAGE_LABELS: Record<TransitionMatrixStage, string> = {
    launch: '\u4e0a\u5e02',
    mainSell: '\u4e3b\u9500',
    clearance: '\u6e05\u8d27',
    handoff: '\u627f\u63a5',
};

function getTransitionStageRanges(transition: SeasonalTransitionRecord, stage: TransitionMatrixStage) {
    if (stage === 'handoff') {
        return {
            plan: transition.timelinePlan.handoff,
            actual: transition.timelineActual.handoff,
        };
    }

    return {
        plan: transition.timelinePlan[stage],
        actual: transition.timelineActual[stage],
    };
}

function TransitionStageMatrixRow({ stage }: { stage: TransitionMatrixStage }) {
    return (
        <div className="relative h-8 rounded-[18px] bg-white/52 ring-1 ring-inset ring-slate-900/4">
            <div className="pointer-events-none absolute inset-y-0 left-2 z-[2] flex items-center">
                <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white">
                    {TRANSITION_MATRIX_STAGE_LABELS[stage]}
                </span>
            </div>
            {SEASONAL_INVENTORY_TRANSITIONS.map((transition) => {
                const seasonMeta = TRANSITION_SEASON_META[transition.season];
                const ranges = getTransitionStageRanges(transition, stage);
                const planLabel = stage === 'handoff'
                    ? '\u8ba1 \u65b0 ' + formatTransitionPercent(transition.newGoodsRatio)
                    : '\u8ba1 ' + formatTransitionPercent(transition.discountPlanByStage[stage]);
                const actualLabel = stage === 'handoff'
                    ? '\u5b9e \u65b0 ' + formatTransitionPercent(transition.actualNewGoodsRatio)
                    : '\u5b9e ' + formatTransitionPercent(transition.discountActualByStage[stage]);
                const actualClass = stage === 'handoff' ? 'bg-pink-400/74' : seasonMeta.actualClass;
                const dashedClass = stage === 'handoff' ? 'border-dashed' : '';

                return (
                    <div key={stage + '-' + transition.season} className="absolute inset-0">
                        <div className={['absolute inset-y-[4px] rounded-full border', seasonMeta.planClass, dashedClass].filter(Boolean).join(' ')} style={getTransitionRangeStyle(ranges.plan.start, ranges.plan.end)}>
                            <div className="flex h-full items-center justify-between gap-2 px-2">
                                <span className={['truncate text-[10px] font-semibold', seasonMeta.textClass].join(' ')}>{seasonMeta.short}</span>
                                <span className="hidden truncate text-[9px] text-slate-400 xl:block">{planLabel}</span>
                            </div>
                        </div>
                        <div className={['absolute inset-y-[9px] rounded-full shadow-[0_4px_10px_rgba(15,23,42,0.10)]', actualClass].join(' ')} style={getTransitionRangeStyle(ranges.actual.start, ranges.actual.end)}>
                            <div className="flex h-full items-center justify-end px-2">
                                <span className="hidden truncate text-[9px] font-semibold text-white xl:block">{actualLabel}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}



type TransitionSeasonModel = AnnualControlMasterViewModel['transitionControl']['seasons'][number];
type TransitionLifecycleSegment = TransitionSeasonModel['actualSegments'][number];
type TransitionMetricBand = TransitionSeasonModel['sellThroughPlanBand'][number];

type TransitionDisplaySlice = {
    start: number;
    end: number;
    label: string;
    showLabel: boolean;
};

type TransitionDisplayRange = {
    start: number;
    end: number;
};

const TRANSITION_ROW_PALETTE: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', { row: string; metric: string; text: string; pill: AnnualControlTone; glassTube: string; fillFluid: string }> = {
    Q1: { row: 'bg-emerald-50/90 border border-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]', metric: 'bg-emerald-50/40', text: 'text-emerald-700', pill: 'emerald', glassTube: 'bg-emerald-50/30 ring-1 ring-inset ring-emerald-200/80 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.02)]', fillFluid: 'bg-emerald-200/70 border-r border-emerald-300/70 shadow-[inset_-2px_0_6px_rgba(255,255,255,0.7)]' },
    Q2: { row: 'bg-sky-50/90 border border-sky-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]', metric: 'bg-sky-50/40', text: 'text-sky-700', pill: 'sky', glassTube: 'bg-sky-50/30 ring-1 ring-inset ring-sky-200/80 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.02)]', fillFluid: 'bg-sky-200/70 border-r border-sky-300/70 shadow-[inset_-2px_0_6px_rgba(255,255,255,0.7)]' },
    Q3: { row: 'bg-amber-50/90 border border-amber-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]', metric: 'bg-amber-50/40', text: 'text-amber-700', pill: 'amber', glassTube: 'bg-amber-50/30 ring-1 ring-inset ring-amber-200/80 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.02)]', fillFluid: 'bg-amber-200/70 border-r border-amber-300/70 shadow-[inset_-2px_0_6px_rgba(255,255,255,0.7)]' },
    Q4: { row: 'bg-rose-50/90 border border-rose-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]', metric: 'bg-rose-50/40', text: 'text-rose-700', pill: 'rose', glassTube: 'bg-rose-50/30 ring-1 ring-inset ring-rose-200/80 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.02)]', fillFluid: 'bg-rose-200/70 border-r border-rose-300/70 shadow-[inset_-2px_0_6px_rgba(255,255,255,0.7)]' },
};

function normalizeTransitionPoint(point: number) {
    return point > 12.98 ? point - 12 : point;
}

function getWrappedTransitionRanges(start: number, end: number) {
    if (end <= 12.98) {
        return [{ start: normalizeTransitionPoint(start), end }];
    }

    if (start > 12.98) {
        return [{ start: normalizeTransitionPoint(start), end: end - 12 }];
    }

    const safeStart = normalizeTransitionPoint(start);
    const safeEnd = Math.max(1.1, end - 12);
    return [
        { start: safeStart, end: 12.98 },
        { start: 1.02, end: safeEnd },
    ];
}

function mergeTransitionRanges(ranges: TransitionDisplayRange[]) {
    const sorted = [...ranges].sort((left, right) => left.start - right.start);
    const merged: TransitionDisplayRange[] = [];

    sorted.forEach((range) => {
        const current = merged[merged.length - 1];
        if (!current) {
            merged.push({ ...range });
            return;
        }

        if (range.start <= current.end + 0.04) {
            current.end = Math.max(current.end, range.end);
            return;
        }

        merged.push({ ...range });
    });

    return merged;
}

function buildTransitionFilledRangesFromSpan(start: number, end: number) {
    return getWrappedTransitionRanges(start, end).map((range) => ({ start: range.start, end: range.end }));
}

function buildTransitionFilledRangesFromBands(bands: TransitionMetricBand[]) {
    return mergeTransitionRanges(
        bands.flatMap((band) => getWrappedTransitionRanges(band.start, band.end).map((range) => ({ start: range.start, end: range.end }))),
    );
}

function buildTransitionMonthSlices(start: number, end: number, resolveLabel: (point: number) => string) {
    return getWrappedTransitionRanges(start, end).flatMap((range) => {
        const points = [range.start];
        for (let month = Math.ceil(range.start); month < range.end - 0.001; month += 1) {
            points.push(month);
        }
        points.push(range.end);

        return points.slice(0, -1).map((point, index) => {
            const next = points[index + 1];
            const width = next - point;
            const mid = point + width / 2;
            return {
                start: point,
                end: next,
                label: resolveLabel(mid),
                showLabel: width >= 0.78,
            };
        });
    });
}

function isPointWithinTransitionRange(start: number, end: number, point: number) {
    return getWrappedTransitionRanges(start, end).some((range) => point >= range.start - 0.001 && point < range.end + 0.001);
}

function getTransitionLifecycleLabelAtPoint(segments: TransitionLifecycleSegment[], point: number) {
    return segments.find((segment) => isPointWithinTransitionRange(segment.start, segment.end, point))?.label || '';
}

function getTransitionMetricLabelAtPoint(bands: TransitionMetricBand[], point: number) {
    const band = bands.find((item) => isPointWithinTransitionRange(item.start, item.end, point));
    return band ? `${Math.round(band.value * 100)}%` : '';
}

function getTransitionMarkersFromRanges(ranges: TransitionDisplayRange[]) {
    const points = new Set<number>();
    ranges.forEach((range) => {
        for (let month = Math.ceil(range.start); month < range.end - 0.001; month += 1) {
            points.add(month);
        }
    });
    return [...points].sort((left, right) => left - right);
}

const TRANSITION_PADDING_OFFSET = 14;

function getTransitionPointOffset(point: number): string {
    const offsetIndex = point - 1;
    return `calc((100% + ${TRANSITION_PADDING_OFFSET * 2}px) / 12 * ${offsetIndex} - ${TRANSITION_PADDING_OFFSET}px)`;
}

function getTransitionSliceStyle(start: number, end: number): CSSProperties {
    const widthMonths = end - start;
    return {
        left: getTransitionPointOffset(start),
        width: `calc((100% + ${TRANSITION_PADDING_OFFSET * 2}px) / 12 * ${widthMonths})`,
    };
}

function getTransitionRowLabelStyle(anchor: number): CSSProperties {
    const labelWidth = 104;
    const isNearStart = (anchor - 1) <= 1;
    if (isNearStart) {
        return { left: '8px' };
    }
    return {
        left: `calc(${getTransitionPointOffset(anchor)} - ${labelWidth + 12}px)`,
    };
}

function getTransitionMarkerStyle(point: number): CSSProperties {
    return {
        left: getTransitionPointOffset(point),
    };
}

function TransitionBandRow({
    label,
    anchor,
    filledRanges,
    previewRanges = [],
    textSlices,
    markers,
    barClass,
    textClass,
    progress,
    progressClass,
}: {
    label: string;
    anchor: number;
    filledRanges: TransitionDisplayRange[];
    previewRanges?: TransitionDisplayRange[];
    textSlices: TransitionDisplaySlice[];
    markers: number[];
    barClass: string;
    textClass: string;
    progress?: number;
    progressClass?: string;
}) {
    return (
        <div className="relative h-7">
            <div className="absolute top-1/2 z-[10] -translate-y-1/2 flex h-6 w-[100px] justify-end items-center rounded-[6px] bg-white/85 pr-2.5 text-[11px] font-bold text-slate-500 shadow-[0_2px_4px_rgba(15,23,42,0.04),inset_0_0_0_1px_rgba(255,255,255,1)] backdrop-blur-md" style={{ left: `calc(${getTransitionPointOffset(normalizeTransitionPoint(anchor))} - 108px)` }}>{label}</div>
            {previewRanges.map((range, index) => (
                <div
                    key={`${label}-preview-${index}-${range.start}`}
                    className={`absolute inset-y-[6px] z-[1] rounded-full ${barClass} opacity-35`}
                    style={getTransitionSliceStyle(range.start, range.end)}
                />
            ))}
            {filledRanges.map((range, index) => (
                <div
                    key={`${label}-range-${index}-${range.start}`}
                    className={`absolute inset-y-[6px] z-[1] rounded-full overflow-hidden ${barClass}`}
                    style={getTransitionSliceStyle(range.start, range.end)}
                >
                    {progress !== undefined && index === 0 && (
                        <div
                            className={`absolute inset-y-0 left-0 transition-all duration-[1.5s] ease-out rounded-full shadow-[inset_-2px_0_4px_rgba(255,255,255,0.4)] ${progressClass}`}
                            style={{ width: `${progress * 100}%` }}
                        />
                    )}
                </div>
            ))}
            {textSlices.map((slice, index) => (
                <div
                    key={`${label}-text-${index}-${slice.start}`}
                    className="absolute inset-y-[6px] z-[2] flex items-center justify-center"
                    style={getTransitionSliceStyle(slice.start, slice.end)}
                >
                    {slice.showLabel && slice.label ? (
                        <span className={`truncate px-1 text-center text-[11px] font-semibold leading-none ${textClass}`}>{slice.label}</span>
                    ) : null}
                </div>
            ))}
            {markers.map((point, index) => (
                <span
                    key={`${label}-marker-${point}-${index}`}
                    className="absolute inset-y-[8px] z-[3] w-1.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.72)]"
                    style={getTransitionMarkerStyle(point)}
                />
            ))}
        </div>
    );
}

function TransitionMetricRow({
    label,
    anchor,
    bands,
    glassTubeTrack,
    fillFluidClass,
}: {
    label: string;
    anchor: number;
    bands: TransitionMetricBand[];
    glassTubeTrack: string;
    fillFluidClass: string;
}) {
    const filledRanges = buildTransitionFilledRangesFromBands(bands);
    const textSlices = bands.length
        ? buildTransitionMonthSlices(bands[0].start, bands[bands.length - 1].end, (point) => getTransitionMetricLabelAtPoint(bands, point))
        : [];
    const markers = getTransitionMarkersFromRanges(filledRanges);

    // 随机生成一段稳定、极具汇报价值的假进度水位百分比 (35% ~ 85%)
    const pseudoHash = label.charCodeAt(label.length - 1) + Math.floor(anchor * 10);
    const mockProgress = 0.35 + (pseudoHash % 50) / 100;

    return (
        <TransitionBandRow
            label={label}
            anchor={anchor}
            filledRanges={filledRanges}
            textSlices={textSlices}
            markers={markers}
            barClass={glassTubeTrack}
            textClass="text-slate-600 font-semibold tracking-tight"
            progress={mockProgress}
            progressClass={fillFluidClass}
        />
    );
}

const LANE_ACCENT: Record<string, string> = {
    marketing: 'bg-pink-400',
    budget: 'bg-amber-500',
    transition: 'bg-teal-400',
    environment: 'bg-slate-400',
    risk: 'bg-rose-400',
    action: 'bg-indigo-500',
};

function TransitionLaneRow({ lane, model, scopeSet }: { lane: AnnualControlMasterLane; model: AnnualControlMasterViewModel; scopeSet: Set<number> }) {
    return (
        <MatrixRow title={lane.title} detail={lane.description} accent={LANE_ACCENT.transition}>
            <TrackSurface className="relative">
                {/* 贯穿全网的月份分割线背景 */}
                <div className="pointer-events-none absolute inset-0 grid grid-cols-12">
                    {model.months.map((month) => {
                        const state = getTemporalState(month.month, model.currentMonth);
                        return (
                            <div key={`transition-grid-${month.month}`} className={`border-l border-slate-200/60 transition-colors first:border-l-0 ${getTemporalSurfaceClass(state, scopeSet.has(month.month))}`} />
                        );
                    })}
                </div>

                <div className="relative space-y-6 py-4">
                    {model.transitionControl.seasons.map((season, seasonIdx) => {
                        const palette = TRANSITION_ROW_PALETTE[season.season];
                        const lifecycleFilledRanges = buildTransitionFilledRangesFromSpan(season.actualRange.start, season.actualRange.end);
                        const carryInPreviewRanges = season.carryInPreviewRange ? [{ start: season.carryInPreviewRange.start, end: season.carryInPreviewRange.end }] : [];
                        const lifecycleTextSlices = buildTransitionMonthSlices(
                            season.actualRange.start,
                            season.actualRange.end,
                            (point) => getTransitionLifecycleLabelAtPoint(season.actualSegments, point),
                        );
                        const lifecycleMarkers = getTransitionMarkersFromRanges(lifecycleFilledRanges);
                        const lifecycleAnchor = normalizeTransitionPoint(season.actualRange.start);
                        const metricAnchor = normalizeTransitionPoint(season.planRange.start);
                        const isRiskPulsing = season.season === model.currentSeason && season.risk.tone === 'risk';
                        return (
                            <div key={season.season} className="relative px-3.5 pt-2 pb-4">
                                {seasonIdx > 0 && <div className="absolute top-0 left-3.5 right-3.5 border-t-[2px] border-dashed border-slate-300/70" />}
                                <div className="flex flex-col gap-3.5 xl:flex-row xl:items-start xl:justify-between mt-5">
                                    <div className="space-y-2.5">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <TonePill tone={palette.pill}>{season.shortLabel}</TonePill>
                                            <div className="text-[15px] font-bold tracking-tight text-slate-800">{season.fullLifecycleLabel}</div>
                                            <TonePill tone={season.risk.tone === 'risk' ? 'rose' : season.risk.tone === 'watch' ? 'amber' : 'slate'}>{season.risk.status}</TonePill>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-slate-500">
                                            <span className="rounded-md bg-slate-100/80 px-2 py-0.5">上市 <span className="text-slate-700">{season.windows.launch}</span></span>
                                            <span className="text-slate-300">·</span>
                                            <span className="rounded-md bg-slate-100/80 px-2 py-0.5">主销 <span className="text-slate-700">{season.windows.mainSell}</span></span>
                                            <span className="text-slate-300">·</span>
                                            <span className="rounded-md bg-slate-100/80 px-2 py-0.5">清尾 <span className="text-slate-700">{season.windows.clearance}</span></span>
                                        </div>
                                    </div>
                                    <div className="grid gap-2 md:grid-cols-2 xl:min-w-[320px]">
                                        {/* 新旧结构 - 双色比例条 */}
                                        <div className="rounded-[18px] border border-slate-200/80 bg-white/90 px-3.5 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400/80 mb-2.5">新旧结构</div>
                                            {/* OTB 目标行 */}
                                            <div className="mb-2">
                                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
                                                    <span>OTB</span>
                                                    <span className="tabular-nums">新 {Math.round(season.ratio.planNew * 100)} / 旧 {Math.round(season.ratio.planOld * 100)}</span>
                                                </div>
                                                <div className="flex h-[6px] w-full overflow-hidden rounded-full">
                                                    <div className="rounded-l-full bg-emerald-400/80" style={{ width: `${season.ratio.planNew * 100}%` }} />
                                                    <div className="rounded-r-full bg-slate-300/60" style={{ width: `${season.ratio.planOld * 100}%` }} />
                                                </div>
                                            </div>
                                            {/* 库存 实际行 */}
                                            <div>
                                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
                                                    <span>库存</span>
                                                    <span className="tabular-nums">新 {Math.round(season.ratio.actualNew * 100)} / 旧 {Math.round(season.ratio.actualOld * 100)}</span>
                                                </div>
                                                <div className="flex h-[6px] w-full overflow-hidden rounded-full">
                                                    <div className="rounded-l-full bg-teal-400/80" style={{ width: `${season.ratio.actualNew * 100}%` }} />
                                                    <div className="rounded-r-full bg-slate-300/60" style={{ width: `${season.ratio.actualOld * 100}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                        {/* 老货均折 - 计划 vs 实际对比 */}
                                        <div className="rounded-[18px] border border-slate-200/80 bg-white/90 px-3.5 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400/80 mb-2.5">老货均折</div>
                                            {/* 计划均折 */}
                                            <div className="mb-2">
                                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
                                                    <span>计划</span>
                                                    <span className="tabular-nums">{season.kpis.oldDiscountTargetLabel.replace('计划均折 ', '')}</span>
                                                </div>
                                                <div className="relative h-[6px] w-full overflow-hidden rounded-full bg-slate-100">
                                                    <div className="h-full rounded-full bg-amber-400/80" style={{ width: season.kpis.oldDiscountTargetLabel.replace('计划均折 ', '') }} />
                                                </div>
                                            </div>
                                            {/* 实际均折 */}
                                            <div>
                                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
                                                    <span>实际</span>
                                                    <span className="tabular-nums">{season.kpis.oldDiscountActualLabel.replace('实际均折 ', '')}</span>
                                                </div>
                                                <div className="relative h-[6px] w-full overflow-hidden rounded-full bg-slate-100">
                                                    <div className="h-full rounded-full bg-rose-400/70" style={{ width: season.kpis.oldDiscountActualLabel.replace('实际均折 ', '') }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-0.5">
                                    <div className="relative">
                                        <TransitionBandRow label="新品生命周期" anchor={lifecycleAnchor} filledRanges={lifecycleFilledRanges} previewRanges={carryInPreviewRanges} textSlices={lifecycleTextSlices} markers={lifecycleMarkers} barClass={palette.row} textClass={palette.text} />
                                        {season.carryInLabel && season.carryInPreviewRange ? (
                                            <div className="absolute -top-3.5" style={{ left: getTransitionPointOffset(season.carryInPreviewRange.start) }}>
                                                <span className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-600 shadow-sm">{season.carryInLabel}</span>
                                            </div>
                                        ) : null}
                                        {season.carryOutLabel ? (
                                            <div className="absolute -top-3.5" style={{ left: `calc(${getTransitionPointOffset(normalizeTransitionPoint(season.actualRange.end))} + 12px)` }}>
                                                <span className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-600 shadow-sm">{season.carryOutLabel}</span>
                                            </div>
                                        ) : null}
                                    </div>
                                    <TransitionMetricRow label="新品售罄计划" anchor={metricAnchor} bands={season.sellThroughPlanBand} glassTubeTrack={palette.glassTube} fillFluidClass={palette.fillFluid} />
                                    <TransitionMetricRow label="新品折扣计划" anchor={metricAnchor} bands={season.newGoodsDiscountPlanBand} glassTubeTrack={palette.glassTube} fillFluidClass={palette.fillFluid} />
                                    <TransitionMetricRow label="老货折扣节奏" anchor={metricAnchor} bands={season.oldGoodsDiscountPlanBand} glassTubeTrack={palette.glassTube} fillFluidClass={palette.fillFluid} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </TrackSurface>
        </MatrixRow>
    );
}

function LaneRow({ lane, model, scopeSet }: { lane: AnnualControlMasterLane; model: AnnualControlMasterViewModel; scopeSet: Set<number> }) {
    if (lane.id === 'transition') {
        return <TransitionLaneRow lane={lane} model={model} scopeSet={scopeSet} />;
    }
    if (lane.id === 'environment') {
        return <EnvironmentLaneRow lane={lane} model={model} scopeSet={scopeSet} />;
    }

    return (
        <MatrixRow title={lane.title} detail={lane.description} accent={LANE_ACCENT[lane.id]}>
            <TrackSurface>
                <div className="grid grid-cols-12">
                    {lane.cells.map((cell) => {
                        const inScope = scopeSet.has(cell.month);
                        if (lane.id === 'action') return <ActionLaneCell key={`${lane.id}-${cell.month}`} cell={cell} currentMonth={model.currentMonth} inScope={inScope} />;
                        return <GenericLaneCell key={`${lane.id}-${cell.month}`} cell={cell} currentMonth={model.currentMonth} inScope={inScope} />;
                    })}
                </div>
            </TrackSurface>
        </MatrixRow>
    );
}


function EnvironmentLaneRow({ lane, model, scopeSet }: { lane: AnnualControlMasterLane; model: AnnualControlMasterViewModel; scopeSet: Set<number> }) {
    const currentCell = lane.cells.find((cell) => cell.month == model.currentMonth) || lane.cells[0];
    const orderedRows = currentCell?.environmentMetrics?.temperatureRows || [];
    const orderedKeys = orderedRows.map((row) => `${row.regionLabel}|${row.cityLabel}`);

    return (
        <div className="grid items-stretch gap-2" style={{ gridTemplateColumns: String(LANE_LABEL_WIDTH) + 'px minmax(0,1fr)' }}>
            <div className="sticky left-0 z-30 flex flex-col overflow-hidden rounded-[24px] border border-slate-200/70 bg-slate-50/62 shadow-[10px_0_18px_rgba(248,250,252,0.95)] backdrop-blur-sm">
                {/* 贯通左侧全高的辅助线 */}
                <span className="absolute z-10 left-[16px] top-5 bottom-6 w-1 rounded-full bg-slate-400 opacity-80" />

                <div className="relative flex-1 px-4 py-4">
                    <div className="pl-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">管理线</div>
                    <div className="mt-1 pl-4 text-sm font-semibold text-slate-900">{lane.title}</div>
                    <div className="mt-1 pl-4 text-[11px] leading-5 text-slate-500">{lane.description}</div>
                </div>

                <div className="relative z-0 shrink-0 pr-3 pb-4 pl-[30px]">
                    <div className="rounded-[22px] bg-slate-200/40 p-2">
                        <div className="mb-2 pl-3 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">区域 · 城市</div>
                        <div className="space-y-1.5">
                            {orderedRows.map((row) => (
                                <div key={`${row.regionLabel}-${row.cityLabel}`} className="flex h-[36px] items-center gap-3 rounded-[14px] bg-white/70 px-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition-colors hover:bg-white">
                                    <span className="text-[11px] font-bold text-slate-400">{row.regionLabel}</span>
                                    <span className="text-[13px] font-medium text-slate-700">{row.cityLabel}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <TrackSurface className="relative">
                {/* 背景色格（绝对层，仅负责跨整个纵向区间的高度统一着色） */}
                <div className="pointer-events-none absolute inset-0 grid grid-cols-12">
                    {lane.cells.map((cell) => {
                        const state = getTemporalState(cell.month, model.currentMonth);
                        return <div key={`bg-${cell.month}`} className={`border-l border-slate-200/50 first:border-l-0 ${getTemporalSurfaceClass(state, scopeSet.has(cell.month))}`} />;
                    })}
                </div>

                {/* 实际内容流 */}
                <div className="relative flex h-full flex-col">
                    <div className="grid flex-1 grid-cols-12">
                        {lane.cells.map((cell) => (
                            <div key={`env-summary-${cell.month}`} className="px-3 py-4">
                                <div className="text-[15px] font-bold tracking-tight text-slate-800">{cell.headline}</div>
                                <div className="mt-2 text-[12px] leading-relaxed text-slate-500">{cell.environmentMetrics?.solarTermSummary || cell.supportingText || cell.description}</div>
                            </div>
                        ))}
                    </div>
                    <div className="grid shrink-0 grid-cols-12">
                        {lane.cells.map((cell) => {
                            const isCurrent = cell.month === model.currentMonth;
                            const rowMap = new Map((cell.environmentMetrics?.temperatureRows || []).map((row) => [`${row.regionLabel}|${row.cityLabel}`, row]));
                            return (
                                <div key={`env-temp-${cell.month}`} className="px-1 pb-3">
                                    <div className="p-2">
                                        {/* 以相同的 Padding 与上空高度对齐左侧的 `区域 · 门店` */}
                                        <div className="mb-2 flex justify-center pt-1">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300 opacity-60">Temp</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {orderedKeys.map((key) => {
                                                const rowData = rowMap.get(key);
                                                return (
                                                    <div key={`${cell.month}-${key}`} className="flex h-[36px] items-center justify-center">
                                                        {rowData ? (
                                                            <div className={`rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums tracking-tight shadow-sm ring-1 ${isCurrent ? 'bg-white text-pink-600 ring-pink-100 shadow-pink-100/50' : 'bg-white/80 text-slate-600 ring-slate-100 shadow-slate-200/30'}`}>
                                                                {rowData.rangeLabel}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </TrackSurface>
        </div>
    );
}

function FestivalWeekLaneRow({ lane, model, scopeSet }: { lane: AnnualControlMasterLane; model: AnnualControlMasterViewModel; scopeSet: Set<number> }) {
    return (
        <MatrixRow title="节庆营销 / 周级节点" detail="先看当月节庆窗口，再看对应周次的关键节点如何前置推进。" accent="bg-rose-400">
            <TrackSurface>
                <div className="grid grid-cols-12">
                    {model.months.map((month) => {
                        const state = getTemporalState(month.month, model.currentMonth);
                        const cell = lane.cells.find((item) => item.month === month.month);
                        const bounds = getWeekBounds(month.weekRange);
                        const weeks = Array.from({ length: bounds.end - bounds.start + 1 }, (_, index) => bounds.start + index);
                        const nodes = model.timelineNodes
                            .filter((node) => node.month === month.month && node.nodeType !== 'solar-term')
                            .sort((left, right) => (left.week ?? 99) - (right.week ?? 99))
                            .slice(0, 2);

                        const rawTitle = cell?.headline || month.phaseLabel;
                        const hasSeparator = rawTitle.includes(' · ');
                        const [badge, mainTitle] = hasSeparator ? rawTitle.split(' · ') : ['', rawTitle];

                        return (
                            <div key={`festival-week-${month.month}`} className={`group min-h-[174px] border-l border-slate-200/70 px-4 py-4 first:border-l-0 ${getTemporalSurfaceClass(state, scopeSet.has(month.month))}`}>
                                {hasSeparator ? (
                                    <div className={`mb-0.5 text-[10px] font-extrabold tracking-widest uppercase ${month.season === 'Q1' ? 'text-emerald-400/90' :
                                        month.season === 'Q2' ? 'text-sky-400/90' :
                                            month.season === 'Q3' ? 'text-amber-400/90' :
                                                month.season === 'Q4' ? 'text-rose-400/90' :
                                                    'text-slate-400/90'
                                        }`}>{badge}</div>
                                ) : null}
                                <div className="text-[17px] font-bold tracking-tight text-slate-900/95 leading-snug">{mainTitle}</div>

                                <div className="mt-4">
                                    <div className="flex w-full items-center justify-between gap-1.5 opacity-60 mix-blend-multiply transition-opacity group-hover:opacity-80">
                                        {weeks.slice(0, 4).map((week) => (
                                            <div key={`${month.month}-festival-week-${week}`} className="flex flex-1 flex-col items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-slate-400">W{week}</span>
                                                <div className="h-[3px] w-full rounded-full bg-slate-200/90" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 space-y-2 relative z-10">
                                    {nodes.map((node) => {
                                        const seasonalStripe =
                                            month.season === 'Q1' ? 'bg-emerald-300' :
                                                month.season === 'Q2' ? 'bg-sky-300' :
                                                    month.season === 'Q3' ? 'bg-amber-300' :
                                                        month.season === 'Q4' ? 'bg-rose-300' :
                                                            'bg-slate-300';
                                        return (
                                            <div key={`${month.month}-${node.label}`} className="h-[46px] relative flex items-stretch overflow-hidden rounded-[10px] border border-slate-200/60 bg-[rgba(255,255,255,0.72)] shadow-[0_4px_12px_rgba(15,23,42,0.03)] backdrop-blur-md transition-all hover:bg-white hover:shadow-[0_6px_16px_rgba(15,23,42,0.05)]">
                                                <div className={`w-[4px] shrink-0 ${seasonalStripe} opacity-85`} />
                                                <div className="flex flex-1 items-center justify-between gap-1.5 px-2.5 py-1.5">
                                                    <span className="text-[13px] font-semibold text-slate-700 leading-tight line-clamp-2">{node.label}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 tabular-nums shrink-0">W{node.week}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </TrackSurface>
        </MatrixRow>
    );
}

function MonthWorkBriefRow({ lane, model, scopeSet }: { lane: AnnualControlMasterLane; model: AnnualControlMasterViewModel; scopeSet: Set<number> }) {
    return (
        <MatrixRow title="月份工作简述" detail="先看本月业务重点，再看下方部门动作如何分工推进。" accent="bg-indigo-400">
            <TrackSurface>
                <div className="grid grid-cols-12">
                    {lane.cells.map((cell) => {
                        const state = getTemporalState(cell.month, model.currentMonth);
                        const brief = cell.monthWorkBrief;
                        const season = model.months.find((m: AnnualControlMonthAxisItem) => m.month === cell.month)?.season;
                        return (
                            <div key={`month-brief-${cell.month}`} className={`group border-l border-slate-200/70 p-2.5 first:border-l-0 ${getTemporalSurfaceClass(state, scopeSet.has(cell.month))}`}>
                                <div className="relative h-full min-h-[142px] overflow-hidden rounded-[16px] bg-[rgba(255,255,255,0.45)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ring-1 ring-inset ring-slate-200/50 transition-all hover:bg-[rgba(255,255,255,0.85)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:ring-slate-300/50">
                                    {/* Decorative Quote Mark */}
                                    <div className={`pointer-events-none absolute -top-1 right-2 select-none font-serif text-[48px] font-black leading-none transition-colors ${season === 'Q1' ? 'text-emerald-200/30 group-hover:text-emerald-300/50' :
                                        season === 'Q2' ? 'text-sky-200/30 group-hover:text-sky-300/50' :
                                            season === 'Q3' ? 'text-amber-200/30 group-hover:text-amber-300/50' :
                                                season === 'Q4' ? 'text-rose-200/30 group-hover:text-rose-300/50' :
                                                    'text-slate-300/30 group-hover:text-slate-400/50'
                                        }`}>"</div>

                                    <div className="relative z-10 flex h-full flex-col">
                                        <div className="mb-2.5 flex items-start gap-1.5">
                                            <div className={`mt-1.5 -ml-3 h-1.5 w-1.5 shrink-0 rounded-full ${season === 'Q1' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' :
                                                season === 'Q2' ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]' :
                                                    season === 'Q3' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' :
                                                        season === 'Q4' ? 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]' :
                                                            'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.6)]'
                                                }`}></div>
                                            <span className="text-[14px] font-bold tracking-tight text-slate-800 leading-snug">{brief?.title || cell.headline}</span>
                                        </div>
                                        <div className="text-[12px] font-medium leading-relaxed text-slate-500 text-justify">
                                            {brief?.summary || cell.description}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </TrackSurface>
        </MatrixRow>
    );
}

const ACTION_TEAM_LAYOUT = [
    { key: 'product', label: '商品', owner: '商', badgeClass: 'bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200' },
    { key: 'planning', label: '设计企划', owner: '企', badgeClass: 'bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-200' },
    { key: 'display', label: '品牌陈列', owner: '陈', badgeClass: 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200' },
] as const;

function DepartmentActionLaneRow({ lane, model, scopeSet }: { lane: AnnualControlMasterLane; model: AnnualControlMasterViewModel; scopeSet: Set<number> }) {
    return (
        <div className="grid items-stretch gap-2" style={{ gridTemplateColumns: String(LANE_LABEL_WIDTH) + 'px minmax(0,1fr)' }}>
            <div className="sticky left-0 z-30 overflow-hidden rounded-[24px] border border-slate-200/70 bg-slate-50/62 shadow-[10px_0_18px_rgba(248,250,252,0.95)] backdrop-blur-sm">
                <div className="grid h-full grid-cols-[1fr_88px]">
                    <div className="relative flex items-center px-4 py-4">
                        <span className="absolute left-3 top-5 bottom-5 w-1 rounded-full opacity-80 bg-indigo-500" />
                        <div>
                            <div className="pl-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">管理线</div>
                            <div className="mt-1 pl-3 text-sm font-semibold text-slate-900">{lane.title}</div>
                            <div className="mt-1 pl-3 text-xs leading-5 text-slate-500">{lane.description}</div>
                        </div>
                    </div>
                    <div className="grid grid-rows-3 divide-y divide-slate-200/80 border-l border-slate-200/80 bg-white/72">
                        {ACTION_TEAM_LAYOUT.map((team) => (
                            <div key={team.key} className="flex items-center justify-center gap-2 px-2 text-center">
                                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-semibold ${team.badgeClass}`}>{team.owner}</span>
                                <div className="w-[26px] text-[13px] font-semibold leading-5 text-slate-700 text-center">{team.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <TrackSurface>
                <div className="divide-y divide-slate-200/80">
                    {ACTION_TEAM_LAYOUT.map((team) => (
                        <div key={`action-row-${team.key}`} className="grid grid-cols-12">
                            {lane.cells.map((cell) => {
                                const track = cell.actionTracks?.find((item) => item.teamType === team.label);
                                const inScope = scopeSet.has(cell.month);
                                const state = getTemporalState(cell.month, model.currentMonth);
                                const surfaceClass = state === 'current' ? 'bg-white/90' : getTemporalSurfaceClass(state, inScope);
                                const season = model.months.find((m: AnnualControlMonthAxisItem) => m.month === cell.month)?.season;
                                const seasonAccent =
                                    season === 'Q1' ? 'border-l-emerald-300' :
                                        season === 'Q2' ? 'border-l-sky-300' :
                                            season === 'Q3' ? 'border-l-amber-300' :
                                                season === 'Q4' ? 'border-l-rose-300' :
                                                    'border-l-slate-200';
                                const statusStyle = (track?.statusLabel === '进行中' || track?.statusLabel === '执行中')
                                    ? 'bg-pink-50 text-pink-600 ring-pink-200'
                                    : track?.statusLabel === '已完成'
                                        ? 'bg-emerald-50 text-emerald-600 ring-emerald-200'
                                        : 'bg-slate-50 text-slate-500 ring-slate-200';
                                return (
                                    <div key={`${cell.month}-${team.key}`} className={`group border-l border-slate-200/70 p-2 first:border-l-0 ${surfaceClass}`}>
                                        {track ? (
                                            <div className={`relative h-full rounded-[14px] border border-slate-200/50 border-l-[3px] ${seasonAccent} bg-[rgba(255,255,255,0.5)] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all hover:bg-[rgba(255,255,255,0.88)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.04)]`}>
                                                <div className="flex items-start justify-between gap-1.5">
                                                    <span className="text-[14px] font-bold tracking-tight text-slate-800 leading-snug">{track.title}</span>
                                                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ring-1 ring-inset ${statusStyle}`}>{track.statusLabel}</span>
                                                </div>
                                                <div className="mt-2 text-[12px] leading-relaxed text-slate-500 text-justify">{track.detail}</div>
                                                <div className="mt-auto pt-2.5">
                                                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400/80 mb-1">输出</div>
                                                    <div className="text-[12px] leading-relaxed font-medium text-slate-600">{track.deliverable}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full rounded-[14px] bg-slate-50/30" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </TrackSurface>
        </div>
    );
}

function getScopeLabel(scopeMonths: number[]) {
    if (scopeMonths.length === 1) return `聚焦 ${String(scopeMonths[0]).padStart(2, '0')} 月`;
    if (scopeMonths.length === 3) return `聚焦 ${String(scopeMonths[0]).padStart(2, '0')}-${String(scopeMonths[2]).padStart(2, '0')} 月`;
    return '全年主盘';
}

export default function AnnualControlMasterView({ model }: AnnualControlMasterViewProps) {
    const scopeSet = new Set(model.scopeMonths);
    const topScrollRef = useRef<HTMLDivElement | null>(null);
    const mainScrollRef = useRef<HTMLDivElement | null>(null);
    const syncingScrollRef = useRef<'top' | 'main' | null>(null);
    const compactCategories = model.footwearFocus?.categories.map((item) => item.replace('鞋', '').replace('户外/机能', '机能')).join(' / ') || '鞋类';
    const compactPriceBand = model.footwearFocus ? model.footwearFocus.priceBandRange + ' ' + (model.footwearFocus.priceBandLabel.includes('核心') ? '走量' : model.footwearFocus.priceBandLabel.replace('价格带', '').replace('带', '')) : '399-599 走量';
    const compactRole = model.footwearFocus?.keyRole || '核心角色';
    const focusDependency = model.dependencies.find((item) => item.severity === 'high') || model.dependencies[0] || null;
    const environmentLane = model.lanes.find((lane) => lane.id === 'environment') || null;
    const transitionLane = model.lanes.find((lane) => lane.id === 'transition') || null;
    const riskLane = model.lanes.find((lane) => lane.id === 'risk') || null;
    const marketingLane = model.lanes.find((lane) => lane.id === 'marketing') || null;
    const actionLane = model.lanes.find((lane) => lane.id === 'action') || null;
    const remainingLanes = model.lanes.filter((lane) => !['environment', 'transition', 'risk', 'marketing', 'action'].includes(lane.id));

    const syncScroll = (source: 'top' | 'main') => {
        const sourceEl = source === 'top' ? topScrollRef.current : mainScrollRef.current;
        const targetEl = source === 'top' ? mainScrollRef.current : topScrollRef.current;
        if (!sourceEl || !targetEl) return;
        if (syncingScrollRef.current && syncingScrollRef.current !== source) return;
        syncingScrollRef.current = source;
        targetEl.scrollLeft = sourceEl.scrollLeft;
        requestAnimationFrame(() => {
            syncingScrollRef.current = null;
        });
    };

    return (
        <section className="rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.11),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_26%),linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                {/* ─── 左侧：精简标题区 ─── */}
                <div className="max-w-3xl">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-pink-500">Master View</div>
                    <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-800">年度商品运营总盘</h2>
                    {/* 动态经营摘要 */}
                    <p className="mt-3 text-sm leading-7 text-slate-500">
                        {(() => {
                            const seasonLabel = model.currentSeason === 'Q1' ? '春季' : model.currentSeason === 'Q2' ? '夏季' : model.currentSeason === 'Q3' ? '秋季' : '冬季';
                            const currentControl = model.transitionControl.seasons.find((s) => s.season === model.currentSeason);
                            const phaseHint = model.currentStageLabel !== '年度统筹期' ? model.currentStageLabel : (() => { const p = (model.currentMonth - 1) % 3; return ['上新启动', '主销推进', '折扣切换'][p]; })();
                            return `${seasonLabel}经营带 · ${phaseHint}阶段${currentControl ? ` · ${currentControl.shortLabel}` : ''}`;
                        })()}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <TonePill tone="pink">当前节点 {model.currentNodeLabel}</TonePill>
                        <TonePill tone="sky">{String(model.currentMonth).padStart(2, '0')}月 / {model.currentWave}</TonePill>
                        <TonePill tone="slate">{getScopeLabel(model.scopeMonths)}</TonePill>
                    </div>
                </div>

                {/* ─── 右侧：便签纸风格 Briefing Card ─── */}
                <div className="relative w-full max-w-[360px] shrink-0 rotate-[1.5deg] hover:rotate-0 transition-transform duration-300">
                    {/* 纸感阴影层 */}
                    <div className="absolute inset-0 rounded-[16px] bg-slate-900/[0.03] translate-y-1 translate-x-0.5 blur-[6px]" />
                    <div className="relative rounded-[16px] bg-[#fefcf3] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                        {/* 图钉装饰 */}
                        <div className="absolute -top-[6px] left-[38%] flex items-end gap-[6px]">
                            <div className={`h-[14px] w-[8px] rounded-full shadow-[0_2px_3px_rgba(0,0,0,0.15)] ${model.currentSeason === 'Q1' ? 'bg-emerald-400' :
                                model.currentSeason === 'Q2' ? 'bg-sky-400' :
                                    model.currentSeason === 'Q3' ? 'bg-amber-400' :
                                        model.currentSeason === 'Q4' ? 'bg-rose-400' :
                                            'bg-slate-400'
                                }`} />
                            <div className={`h-[14px] w-[8px] rounded-full shadow-[0_2px_3px_rgba(0,0,0,0.15)] ${model.currentSeason === 'Q1' ? 'bg-emerald-300' :
                                model.currentSeason === 'Q2' ? 'bg-sky-300' :
                                    model.currentSeason === 'Q3' ? 'bg-amber-300' :
                                        model.currentSeason === 'Q4' ? 'bg-rose-300' :
                                            'bg-slate-300'
                                }`} />
                        </div>
                        {/* 折角 */}
                        <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[16px] border-t-[16px] border-l-transparent border-t-[#f5f0e0] rounded-br-[16px]" style={{ filter: 'drop-shadow(-1px -1px 1px rgba(0,0,0,0.04))' }} />
                        <div className="absolute bottom-0 right-0 w-[16px] h-[16px] rounded-br-[16px] bg-gradient-to-tl from-[#e8e2cc] to-[#f0ebda]" />

                        <div className="px-5 py-4 space-y-3">
                            {/* 当前波段 */}
                            {model.footwearFocus ? (
                                <div>
                                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#b8a88a] mb-1.5">当前波段</div>
                                    <div className="text-[12px] font-medium text-slate-600 leading-relaxed">
                                        {model.footwearFocus.scene} · {compactCategories} · {compactPriceBand} · {compactRole}
                                    </div>
                                </div>
                            ) : null}

                            {/* 第四区：新旧品完成度 */}
                            <div className="border-t border-dashed border-[#e8e0c8]/80" />
                            <div>
                                <div className="text-[9px] font-bold uppercase tracking-widest text-[#b8a88a] mb-1.5">货盘健康度</div>
                                {(() => {
                                    const currentControl = model.transitionControl.seasons.find((s) => s.season === model.currentSeason);
                                    if (!currentControl) return <div className="text-[12px] text-slate-500">数据加载中</div>;
                                    const actualNew = Math.round(currentControl.ratio.actualNew * 100);
                                    const planNew = Math.round(currentControl.ratio.planNew * 100);
                                    const actualOld = Math.round(currentControl.ratio.actualOld * 100);
                                    const planOld = Math.round(currentControl.ratio.planOld * 100);
                                    const newGap = actualNew - planNew;
                                    const seasonLabel = model.currentSeason === 'Q1' ? '春季' : model.currentSeason === 'Q2' ? '夏季' : model.currentSeason === 'Q3' ? '秋季' : '冬季';
                                    return (
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-slate-600">{seasonLabel}新品上架</span>
                                                <span className={`font-semibold tabular-nums ${newGap >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>实 {actualNew}% / 目 {planNew}%</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-slate-600">上季旧品清货</span>
                                                <span className={`font-semibold tabular-nums ${actualOld <= planOld ? 'text-emerald-600' : 'text-rose-500'}`}>余 {actualOld}% / 目 ≤{planOld}%</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div ref={topScrollRef} onScroll={() => syncScroll('top')} className="annual-control-scroll annual-control-scroll-top mt-5 overflow-x-auto overscroll-x-contain pb-2" aria-label="年度总盘顶部滚动条">
                <div className="h-3 min-w-[2060px] pr-14" />
            </div>

            <div ref={mainScrollRef} onScroll={() => syncScroll('main')} className="annual-control-scroll mt-3 overflow-x-auto overscroll-x-contain pb-5 pr-2">
                <div className="relative min-w-[2060px] space-y-2 pr-14" style={getTimelineBaseStyle(model.currentMonth)}>
                    <MatrixOverlays model={model} />
                    <WeekCursorOverlay model={model} />
                    <div className="sticky top-3 z-20 space-y-1.5 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,255,255,0.90),rgba(255,255,255,0))] pb-3 backdrop-blur-sm">
                        <TimelineContinuumRow model={model} scopeSet={scopeSet} />
                        <MonthAxisRow model={model} scopeSet={scopeSet} />
                    </div>
                    {environmentLane ? <EnvironmentLaneRow lane={environmentLane} model={model} scopeSet={scopeSet} /> : null}
                    <GanttRow title="订货 / 预算甘特" detail="把订货会、QOTB、SOTB 做成跨月条带，强化全年预算窗口和前置锁量关系。" accent="bg-amber-400" bars={ANNUAL_CONTROL_BUDGET_GANTT_BARS} model={model} scopeSet={scopeSet} />
                    <GanttRow title="清货 / 承接甘特" detail="把清货窗口和新品承接压成连续条带，直接看旧货退出与新货切换关系。" accent="bg-rose-400" bars={ANNUAL_CONTROL_TRANSITION_GANTT_BARS} model={model} scopeSet={scopeSet} />
                    {transitionLane ? <TransitionLaneRow lane={transitionLane} model={model} scopeSet={scopeSet} /> : null}
                    {riskLane ? <FestivalWeekLaneRow lane={riskLane} model={model} scopeSet={scopeSet} /> : null}
                    {marketingLane ? <LaneRow lane={marketingLane} model={model} scopeSet={scopeSet} /> : null}
                    {actionLane ? <MonthWorkBriefRow lane={actionLane} model={model} scopeSet={scopeSet} /> : null}
                    {actionLane ? <DepartmentActionLaneRow lane={actionLane} model={model} scopeSet={scopeSet} /> : null}
                    {remainingLanes.map((lane) => (
                        <LaneRow key={lane.id} lane={lane} model={model} scopeSet={scopeSet} />
                    ))}
                </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                <span>左右拖动查看全年 1-12 月与年末收官节点。</span>
                <span>当前定位 {String(model.currentMonth).padStart(2, '0')}月 / {model.currentWave}</span>
            </div>
        </section>
    );
}






























