import type { CompareMode, DashboardFilters } from '@/hooks/useDashboardFilter';
import {
    DASHBOARD_SEASON_ORDER,
    DASHBOARD_WAVE_ORDER,
    getDashboardMonthByWave,
    getDashboardSeasonByWave,
    type DashboardSeason,
    type DashboardWave,
} from '@/config/dashboardTime';

export type DashboardCompareContext =
    | 'overview'
    | 'annual-control'
    | 'consumer'
    | 'category'
    | 'channel'
    | 'planning'
    | 'otb'
    | 'competitor'
    | 'inventory';

type MomBasis = 'year' | 'season' | 'wave';

type DashboardPlanAvailability = {
    planAvailable: boolean;
    planDisabledReason?: string;
};

export interface DashboardMomBaseline {
    year: number;
    season: DashboardSeason | 'all';
    wave: DashboardWave | 'all';
    label: string;
    modeLabel: string;
    deltaLabel: string;
    baselineLabel: string;
    basis: MomBasis;
}

export interface DashboardCompareMeta {
    mode: CompareMode;
    modeLabel: string;
    deltaLabel: string;
    buttonLabel: string;
    baselineLabel: string;
    momAvailable: boolean;
    disabledReason?: string;
    planAvailable: boolean;
    planDisabledReason?: string;
    basis: 'none' | 'plan' | 'yoy' | MomBasis | 'generic';
}

function getPreviousSeason(currentSeason: string, currentYear: number): { year: number; season: DashboardSeason } | null {
    const seasonIndex = DASHBOARD_SEASON_ORDER.indexOf(currentSeason as DashboardSeason);
    if (seasonIndex === -1) return null;
    if (seasonIndex === 0) {
        return {
            year: currentYear - 1,
            season: 'Q4',
        };
    }
    return {
        year: currentYear,
        season: DASHBOARD_SEASON_ORDER[seasonIndex - 1],
    };
}

function getPreviousWave(currentWave: string, currentYear: number): { year: number; season: DashboardSeason | 'all'; wave: DashboardWave } | null {
    const waveIndex = DASHBOARD_WAVE_ORDER.indexOf(currentWave as DashboardWave);
    if (waveIndex === -1) return null;
    if (waveIndex > 0) {
        const previousWave = DASHBOARD_WAVE_ORDER[waveIndex - 1];
        return {
            year: currentYear,
            season: getDashboardSeasonByWave(previousWave) || 'all',
            wave: previousWave,
        };
    }

    return {
        year: currentYear - 1,
        season: 'Q4',
        wave: 'W12',
    };
}

function resolveDashboardTimeLevel(filters: DashboardFilters): MomBasis {
    if (filters.wave !== 'all') return 'wave';
    if (filters.season !== 'all') return 'season';
    return 'year';
}

function getDashboardYoyLabels(filters: DashboardFilters) {
    const level = resolveDashboardTimeLevel(filters);
    if (level === 'wave') {
        return {
            modeLabel: '同比去年同月',
            deltaLabel: '较去年同月',
            baselineLabel: '去年同月',
        };
    }

    if (level === 'season') {
        return {
            modeLabel: '同比去年同季',
            deltaLabel: '较去年同季',
            baselineLabel: '去年同季',
        };
    }

    return {
        modeLabel: '同比去年',
        deltaLabel: '较去年',
        baselineLabel: '去年',
    };
}

function getDashboardPlanAvailability(
    filters: DashboardFilters,
    context: DashboardCompareContext,
): DashboardPlanAvailability {
    if (context === 'planning' || context === 'otb') {
        return { planAvailable: true };
    }

    if (context === 'competitor') {
        return {
            planAvailable: false,
            planDisabledReason: '当前页暂无可用计划基线。',
        };
    }

    if (filters.season === 'all' && filters.wave === 'all') {
        return { planAvailable: true };
    }

    if (context === 'overview' || context === 'annual-control' || context === 'channel') {
        return { planAvailable: true };
    }

    if (context === 'category') {
        return {
            planAvailable: false,
            planDisabledReason: '品类页当前仍使用年度计划基线，季度/月度计划拆分暂未接入。',
        };
    }

    return {
        planAvailable: false,
        planDisabledReason: '当前页暂未接入季度/月度计划拆分。',
    };
}

export function resolveDashboardMomBaseline(
    filters: DashboardFilters,
    currentYear: number,
    _context: DashboardCompareContext,
): DashboardMomBaseline | null {
    const level = resolveDashboardTimeLevel(filters);

    if (level === 'wave' && filters.wave !== 'all') {
        const previousWave = getPreviousWave(filters.wave, currentYear);
        if (!previousWave) return null;
        const month = getDashboardMonthByWave(previousWave.wave);
        return {
            ...previousWave,
            label: month ? `${previousWave.year}年 ${month}月` : `${previousWave.year}年 ${previousWave.wave}`,
            modeLabel: '环比上月',
            deltaLabel: '较上月',
            baselineLabel: '上月',
            basis: 'wave',
        };
    }

    if (level === 'season' && filters.season !== 'all') {
        const previousSeason = getPreviousSeason(filters.season as string, currentYear);
        if (!previousSeason) return null;
        return {
            year: previousSeason.year,
            season: previousSeason.season,
            wave: 'all',
            label: `${previousSeason.year}年 ${previousSeason.season}`,
            modeLabel: '环比上季',
            deltaLabel: '较上季',
            baselineLabel: '上季',
            basis: 'season',
        };
    }

    if (filters.season_year !== 'all') {
        return {
            year: currentYear - 1,
            season: 'all',
            wave: 'all',
            label: `${currentYear - 1}年`,
            modeLabel: '环比上年',
            deltaLabel: '较上年',
            baselineLabel: '上年',
            basis: 'year',
        };
    }

    return null;
}

export function getDashboardCompareMeta(
    compareMode: CompareMode,
    filters: DashboardFilters,
    context: DashboardCompareContext,
): DashboardCompareMeta {
    const planMeta = getDashboardPlanAvailability(filters, context);

    if (compareMode === 'plan') {
        return {
            mode: compareMode,
            modeLabel: 'vs计划',
            deltaLabel: '较计划',
            buttonLabel: 'vs计划',
            baselineLabel: '计划',
            momAvailable: true,
            planAvailable: planMeta.planAvailable,
            planDisabledReason: planMeta.planDisabledReason,
            basis: 'plan',
        };
    }

    if (compareMode === 'yoy') {
        const yoyLabels = getDashboardYoyLabels(filters);
        return {
            mode: compareMode,
            modeLabel: yoyLabels.modeLabel,
            deltaLabel: yoyLabels.deltaLabel,
            buttonLabel: '同比',
            baselineLabel: yoyLabels.baselineLabel,
            momAvailable: true,
            planAvailable: planMeta.planAvailable,
            planDisabledReason: planMeta.planDisabledReason,
            basis: 'yoy',
        };
    }

    if (compareMode === 'none') {
        const momMeta = getDashboardCompareMeta('mom', filters, context);
        return {
            mode: compareMode,
            modeLabel: '无对比',
            deltaLabel: '当前值',
            buttonLabel: momMeta.buttonLabel,
            baselineLabel: '',
            momAvailable: momMeta.momAvailable,
            disabledReason: momMeta.disabledReason,
            planAvailable: planMeta.planAvailable,
            planDisabledReason: planMeta.planDisabledReason,
            basis: 'none',
        };
    }

    const currentYear = filters.season_year === 'all' ? 2025 : Number(filters.season_year);
    const baseline = resolveDashboardMomBaseline(filters, currentYear, context);
    if (baseline) {
        return {
            mode: compareMode,
            modeLabel: baseline.modeLabel,
            deltaLabel: baseline.deltaLabel,
            buttonLabel: '环比',
            baselineLabel: baseline.baselineLabel,
            momAvailable: true,
            planAvailable: planMeta.planAvailable,
            planDisabledReason: planMeta.planDisabledReason,
            basis: baseline.basis,
        };
    }

    return {
        mode: compareMode,
        modeLabel: '环比前周期',
        deltaLabel: '较前周期',
        buttonLabel: '环比',
        baselineLabel: '前周期',
        momAvailable: false,
        disabledReason: '请先选择具体年度、季度或月份，再使用环比。',
        planAvailable: planMeta.planAvailable,
        planDisabledReason: planMeta.planDisabledReason,
        basis: 'generic',
    };
}