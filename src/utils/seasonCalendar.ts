/**
 * src/utils/seasonCalendar.ts
 * 季节运营日历工具函数
 * - 阶段判断：上市期 / 主销期 / 清尾期 / 未开始 / 已结束
 * - 季节重叠计算
 * - 季节承接风险
 * - OTB建议生成
 */

// ── 类型定义 ─────────────────────────────────────────────────────────────────

export type SeasonPhase = 'not_started' | 'launch' | 'main_sales' | 'clearance' | 'ended';

export interface SeasonCalendar {
    seasonId: string;
    seasonName: string;
    seasonShort?: string;
    colorScheme?: string;
    seasonStart: string;
    seasonEnd: string;
    launchStart: string;
    launchEnd: string;
    mainSalesStart: string;
    mainSalesEnd: string;
    clearanceStart: string;
    clearanceEnd: string;
    status: string;
    statusLabel: string;
    riskType: string;
    salesRatioOfAnnual?: number;
    newProductRatio?: number;
    sellThroughTarget?: number;
    keyCategories?: string[];
    keyEvents?: string[];
    orderLeadTimeDays?: number;
    notes?: string;
}

export interface SeasonPhaseInfo {
    phase: SeasonPhase;
    phaseLabel: string;
    /** 距上市天数（仅 not_started 时有值） */
    daysToLaunch: number | null;
    /** 当前阶段剩余天数 */
    daysRemainingInPhase: number | null;
    /** 整季剩余天数 */
    daysRemainingInSeason: number | null;
    /** 整季进度 0-100 */
    progressPct: number;
    /** 主销期进度 0-100（仅主销期有意义） */
    mainSalesProgressPct: number | null;
}

export interface SeasonRisk {
    level: 'normal' | 'warning' | 'danger';
    label: string;
    advice: string;
}

export interface HandoverEntry {
    fromSeason: SeasonCalendar;
    toSeason: SeasonCalendar;
    overlapDays: number;
    overlapPeriod: string;
    riskLevel: 'normal' | 'warning' | 'danger';
    advice: string;
}

export interface OTBSeasonAdvice {
    seasonId: string;
    phase: SeasonPhase;
    advices: { level: 'info' | 'warning' | 'danger'; text: string }[];
}

// ── 辅助函数 ─────────────────────────────────────────────────────────────────

/** 解析日期字符串，避免时区偏移（统一按本地时间零点处理） */
export function parseDate(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function fmtDate(d: Date): string {
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

const PHASE_LABELS: Record<SeasonPhase, string> = {
    not_started: '未开始',
    launch: '上市期',
    main_sales: '主销期',
    clearance: '清尾期',
    ended: '已结束',
};

// ── 核心函数 ─────────────────────────────────────────────────────────────────

/**
 * 判断当前日期所处季节阶段
 */
export function getCurrentSeasonPhase(today: Date, season: SeasonCalendar): SeasonPhaseInfo {
    const t = today.getTime();
    const seasonStart = parseDate(season.seasonStart).getTime();
    const seasonEnd   = parseDate(season.seasonEnd).getTime();
    const launchEnd   = parseDate(season.launchEnd).getTime();
    const mainStart   = parseDate(season.mainSalesStart).getTime();
    const mainEnd     = parseDate(season.mainSalesEnd).getTime();
    const clearEnd    = parseDate(season.clearanceEnd).getTime();

    const DAY = 86400000;
    const totalDays   = (seasonEnd - seasonStart) / DAY;
    const elapsed     = Math.max(0, (t - seasonStart) / DAY);
    const progressPct = Math.min(100, (elapsed / totalDays) * 100);

    let phase: SeasonPhase;
    let daysRemainingInPhase: number | null = null;
    let daysToLaunch: number | null = null;
    let mainSalesProgressPct: number | null = null;

    if (t < seasonStart) {
        phase = 'not_started';
        daysToLaunch = Math.ceil((seasonStart - t) / DAY);
    } else if (t <= launchEnd) {
        phase = 'launch';
        daysRemainingInPhase = Math.ceil((launchEnd - t) / DAY);
    } else if (t <= mainEnd) {
        phase = 'main_sales';
        daysRemainingInPhase = Math.ceil((mainEnd - t) / DAY);
        const mainTotal = (mainEnd - mainStart) / DAY;
        const mainElapsed = (t - mainStart) / DAY;
        mainSalesProgressPct = Math.min(100, (mainElapsed / mainTotal) * 100);
    } else if (t <= clearEnd) {
        phase = 'clearance';
        daysRemainingInPhase = Math.ceil((clearEnd - t) / DAY);
    } else {
        phase = 'ended';
    }

    const daysRemainingInSeason = t < seasonEnd ? Math.ceil((seasonEnd - t) / DAY) : null;

    return {
        phase,
        phaseLabel: PHASE_LABELS[phase],
        daysToLaunch,
        daysRemainingInPhase,
        daysRemainingInSeason,
        progressPct,
        mainSalesProgressPct,
    };
}

/**
 * 计算两个季节的重叠天数
 */
export function calcSeasonOverlap(seasonA: SeasonCalendar, seasonB: SeasonCalendar): {
    overlapDays: number;
    overlapStart: Date | null;
    overlapEnd: Date | null;
} {
    const aStart = parseDate(seasonA.seasonStart).getTime();
    const aEnd   = parseDate(seasonA.seasonEnd).getTime();
    const bStart = parseDate(seasonB.seasonStart).getTime();
    const bEnd   = parseDate(seasonB.seasonEnd).getTime();

    const overlapStart = Math.max(aStart, bStart);
    const overlapEnd   = Math.min(aEnd, bEnd);

    if (overlapEnd <= overlapStart) {
        return { overlapDays: 0, overlapStart: null, overlapEnd: null };
    }

    return {
        overlapDays: Math.round((overlapEnd - overlapStart) / 86400000),
        overlapStart: new Date(overlapStart),
        overlapEnd: new Date(overlapEnd),
    };
}

/**
 * 生成季节风险评估
 */
export function calcSeasonRisk(
    season: SeasonCalendar,
    today: Date,
    nextSeason?: SeasonCalendar,
): SeasonRisk {
    const phaseInfo = getCurrentSeasonPhase(today, season);

    if (phaseInfo.phase === 'ended') {
        return { level: 'normal', label: '已结束', advice: '本季已完结，请关注复盘数据' };
    }
    if (phaseInfo.phase === 'not_started') {
        const leadDays = season.orderLeadTimeDays ?? 120;
        const daysToStart = phaseInfo.daysToLaunch ?? 999;
        if (daysToStart < leadDays) {
            return {
                level: 'warning',
                label: '下单窗口临近',
                advice: `距本季上市 ${daysToStart} 天，已进入下单黄金期（建议提前${leadDays}天完成下单）`,
            };
        }
        return { level: 'normal', label: '未开始', advice: '按计划推进上市准备' };
    }

    if (season.riskType === 'season_transition_slow') {
        if (phaseInfo.phase === 'clearance' && nextSeason) {
            const nextPhaseInfo = getCurrentSeasonPhase(today, nextSeason);
            const { overlapDays } = calcSeasonOverlap(season, nextSeason);
            if (nextPhaseInfo.phase === 'launch' || nextPhaseInfo.phase === 'main_sales') {
                if (overlapDays > 30) {
                    return {
                        level: 'danger',
                        label: '季节切换偏慢',
                        advice: `本季清尾期与${nextSeason.seasonName}季上市重叠约${overlapDays}天，建议提前启动折扣促销，释放陈列容量`,
                    };
                }
            }
        }
        return {
            level: 'warning',
            label: season.statusLabel,
            advice: '注意季节切换节奏，控制尾货比例，保障新季陈列空间',
        };
    }

    if (season.riskType === 'category_structure_bias') {
        return {
            level: 'warning',
            label: '结构偏差',
            advice: `${season.seasonName}季品类结构存在偏差，请检查${(season.keyCategories ?? []).join('、')}等核心品类占比是否达标`,
        };
    }

    if (phaseInfo.phase === 'main_sales') {
        const progress = phaseInfo.mainSalesProgressPct ?? 0;
        if (progress > 70 && (phaseInfo.daysRemainingInPhase ?? 0) < 15) {
            return {
                level: 'warning',
                label: '主销期尾声',
                advice: `主销期已完成${progress.toFixed(0)}%，余${phaseInfo.daysRemainingInPhase}天，注意清尾备货节奏`,
            };
        }
    }

    return { level: 'normal', label: season.statusLabel, advice: '按计划推进，无明显异常' };
}

/**
 * 生成季节承接矩阵（相邻季节两两计算）
 */
export function calcHandoverMatrix(seasons: SeasonCalendar[]): HandoverEntry[] {
    const result: HandoverEntry[] = [];

    for (let i = 0; i < seasons.length - 1; i++) {
        const from = seasons[i];
        const to   = seasons[i + 1];
        const { overlapDays, overlapStart, overlapEnd } = calcSeasonOverlap(from, to);

        const period = overlapStart && overlapEnd
            ? `${fmtDate(overlapStart)} — ${fmtDate(overlapEnd)}`
            : '无重叠';

        let riskLevel: HandoverEntry['riskLevel'] = 'normal';
        if (overlapDays > 80)      riskLevel = 'danger';
        else if (overlapDays > 50) riskLevel = 'warning';

        const ADVICE_MAP: Record<string, string> = {
            '春→夏': `春季清尾提前折扣，夏季新品上市期优先保障陈列空间`,
            '夏→秋': `夏季清尾不要挤压秋季主推，秋季款数控制，避免夹季库存`,
            '秋→冬': `秋季库存需在双十一前完成主要消化，冬季主销款提前到货`,
            '冬→春': `冬季清尾时间较长，春季新品上架要提前预留陈列容量`,
        };
        const key = `${from.seasonName}→${to.seasonName}`;
        const advice = ADVICE_MAP[key] ?? '注意季节承接节奏，合理安排陈列切换';

        result.push({ fromSeason: from, toSeason: to, overlapDays, overlapPeriod: period, riskLevel, advice });
    }

    return result;
}

/**
 * 生成季节 OTB 操作建议
 */
export function generateSeasonOTBAdvice(
    season: SeasonCalendar,
    today: Date,
    otbData?: { budgetExecutionRate?: number; sellThroughRate?: number },
): OTBSeasonAdvice {
    const phaseInfo = getCurrentSeasonPhase(today, season);
    const advices: OTBSeasonAdvice['advices'] = [];
    const leadDays = season.orderLeadTimeDays ?? 120;

    if (phaseInfo.phase === 'not_started') {
        const daysToStart = phaseInfo.daysToLaunch ?? 999;
        if (daysToStart <= leadDays) {
            advices.push({ level: 'warning', text: `距${season.seasonName}季上市${daysToStart}天，已进入下单黄金期，请确认采购预算已审批` });
        } else {
            advices.push({ level: 'info', text: `${season.seasonName}季尚未开始，距上市${daysToStart}天，建议提前完成款式开发和价格确认` });
        }
    }

    if (phaseInfo.phase === 'launch') {
        advices.push({ level: 'info', text: `${season.seasonName}季上市期，关注新品铺货进度和门店陈列达标率` });
        const ber = otbData?.budgetExecutionRate;
        if (ber !== undefined && ber < 0.80) {
            advices.push({ level: 'danger', text: `预算执行率仅${(ber * 100).toFixed(0)}%，下单进度明显滞后，请推进剩余款式确认` });
        }
    }

    if (phaseInfo.phase === 'main_sales') {
        const st = otbData?.sellThroughRate;
        if (st !== undefined) {
            const target = season.sellThroughTarget ?? 0.80;
            if (st < target * 0.6) {
                advices.push({ level: 'danger', text: `当前售罄率${(st * 100).toFixed(0)}%，远低于目标${(target * 100).toFixed(0)}%，需提前制定清货方案` });
            } else if (st < target * 0.8) {
                advices.push({ level: 'warning', text: `售罄率${(st * 100).toFixed(0)}%，低于目标${(target * 100).toFixed(0)}%，注意促销节奏` });
            }
        }
        advices.push({ level: 'info', text: `主销期余${phaseInfo.daysRemainingInPhase ?? '--'}天，${(season.keyEvents ?? []).join('、')}是关键节点` });
    }

    if (phaseInfo.phase === 'clearance') {
        advices.push({ level: 'warning', text: `${season.seasonName}季已进入清尾期，余${phaseInfo.daysRemainingInPhase ?? '--'}天，需加速库存消化` });
        const st = otbData?.sellThroughRate;
        if (st !== undefined && st < (season.sellThroughTarget ?? 0.80)) {
            advices.push({ level: 'danger', text: `清尾期售罄率未达目标，建议加大折扣力度或转移至奥莱渠道` });
        }
    }

    if (advices.length === 0) {
        advices.push({ level: 'info', text: `${season.seasonName}季（${phaseInfo.phaseLabel}）无异常，按计划推进` });
    }

    return { seasonId: season.seasonId, phase: phaseInfo.phase, advices };
}

/** 获取四季色方案对应的 Tailwind class */
export function getSeasonColorClasses(colorScheme: string | undefined): {
    bg: string; border: string; badge: string; badgeText: string; text: string; progressBar: string;
} {
    switch (colorScheme) {
        case 'emerald':
            return { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100', badgeText: 'text-emerald-700', text: 'text-emerald-700', progressBar: 'bg-emerald-400' };
        case 'sky':
            return { bg: 'bg-sky-50', border: 'border-sky-200', badge: 'bg-sky-100', badgeText: 'text-sky-700', text: 'text-sky-700', progressBar: 'bg-sky-400' };
        case 'amber':
            return { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100', badgeText: 'text-amber-700', text: 'text-amber-700', progressBar: 'bg-amber-400' };
        case 'rose':
            return { bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-100', badgeText: 'text-rose-700', text: 'text-rose-700', progressBar: 'bg-rose-400' };
        default:
            return { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100', badgeText: 'text-slate-700', text: 'text-slate-700', progressBar: 'bg-slate-400' };
    }
}
