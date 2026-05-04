export interface DashboardPlanMonthlyPoint {
    month: number;
    plan_sales_amt: number;
}

export interface DashboardPlanBreakdownInput {
    annualPlanTotal: number;
    monthlyPlanSource?: number[];
    currentYearMonthlyActuals?: number[];
    previousYearMonthlyActuals?: number[];
    season: string | 'all';
    wave: string | 'all';
}

export interface DashboardPlanBreakdown {
    monthlyPlan: number[];
    quarterPlan: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>;
    periodPlanTotal: number;
    periodRatio: number;
}

const ALL_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const QUARTER_MONTHS: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number[]> = {
    Q1: [1, 2, 3],
    Q2: [4, 5, 6],
    Q3: [7, 8, 9],
    Q4: [10, 11, 12],
};

function normalizeMonthlyValues(values: number[] | undefined) {
    const safeValues = ALL_MONTHS.map((_, index) => Math.max(0, Number(values?.[index] ?? 0)));
    const total = safeValues.reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
        return ALL_MONTHS.map(() => 1 / 12);
    }
    return safeValues.map((value) => value / total);
}

export function deriveDashboardAnnualPlanTotal(monthlyPlanSource: number[] | undefined, fallbackAnnualPlanTotal: number) {
    const monthlyTotal = (monthlyPlanSource || []).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
    if (monthlyTotal > 0) return monthlyTotal;
    return Math.max(0, Number(fallbackAnnualPlanTotal || 0));
}

function getMonthsForSelection(season: string | 'all', wave: string | 'all') {
    if (wave !== 'all') {
        const month = Number(String(wave).replace('W', ''));
        return Number.isFinite(month) && month >= 1 && month <= 12 ? [month] : ALL_MONTHS;
    }
    if (season !== 'all' && Object.prototype.hasOwnProperty.call(QUARTER_MONTHS, season)) {
        return QUARTER_MONTHS[season as keyof typeof QUARTER_MONTHS];
    }
    return ALL_MONTHS;
}

export function deriveScopedAnnualPlanTotal(
    annualPlanTotal: number,
    scopeAnnualActualTotal: number,
    overallAnnualActualTotal: number,
) {
    if (!Number.isFinite(annualPlanTotal) || annualPlanTotal <= 0) return 0;
    if (!Number.isFinite(scopeAnnualActualTotal) || scopeAnnualActualTotal <= 0) return 0;
    if (!Number.isFinite(overallAnnualActualTotal) || overallAnnualActualTotal <= 0) return annualPlanTotal;
    return annualPlanTotal * (scopeAnnualActualTotal / overallAnnualActualTotal);
}

export function deriveDashboardMonthlyPlanBreakdown({
    annualPlanTotal,
    monthlyPlanSource,
    currentYearMonthlyActuals,
    previousYearMonthlyActuals,
    season,
    wave,
}: DashboardPlanBreakdownInput): DashboardPlanBreakdown {
    const sourceWeights = (() => {
        const monthlySourceTotal = (monthlyPlanSource || []).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
        if (monthlySourceTotal > 0) return normalizeMonthlyValues(monthlyPlanSource);

        const previousYearTotal = (previousYearMonthlyActuals || []).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
        if (previousYearTotal > 0) return normalizeMonthlyValues(previousYearMonthlyActuals);

        return normalizeMonthlyValues(currentYearMonthlyActuals);
    })();

    const monthlyPlan = sourceWeights.map((weight) => annualPlanTotal * weight);
    const quarterPlan = {
        Q1: QUARTER_MONTHS.Q1.reduce((sum, month) => sum + (monthlyPlan[month - 1] ?? 0), 0),
        Q2: QUARTER_MONTHS.Q2.reduce((sum, month) => sum + (monthlyPlan[month - 1] ?? 0), 0),
        Q3: QUARTER_MONTHS.Q3.reduce((sum, month) => sum + (monthlyPlan[month - 1] ?? 0), 0),
        Q4: QUARTER_MONTHS.Q4.reduce((sum, month) => sum + (monthlyPlan[month - 1] ?? 0), 0),
    };
    const selectedMonths = getMonthsForSelection(season, wave);
    const periodPlanTotal = selectedMonths.reduce((sum, month) => sum + (monthlyPlan[month - 1] ?? 0), 0);
    const periodRatio = annualPlanTotal > 0 ? periodPlanTotal / annualPlanTotal : 0;

    return {
        monthlyPlan,
        quarterPlan,
        periodPlanTotal,
        periodRatio,
    };
}
