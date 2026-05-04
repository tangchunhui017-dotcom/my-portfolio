import seasonSalesLifecycleRaw from '@/../data/taxonomy/season_sales_lifecycle_standards.json';

export type DashboardSeasonLifecycleSeason = 'Q1' | 'Q2' | 'Q3' | 'Q4';

type RawBoundary = {
    month: number;
    day: number | 'month_end';
    year_offset: number;
};

type RawPhase = {
    id: string;
    label: string;
    sales_share: number;
    start: RawBoundary;
    end: RawBoundary;
    sell_through_target: {
        min: number;
        max: number;
    };
};

type RawSeasonStandard = {
    label: string;
    english: string;
    phases: RawPhase[];
};

type RawSeasonLifecycleCatalog = {
    note: string;
    seasons: Record<DashboardSeasonLifecycleSeason, RawSeasonStandard>;
};

export interface DashboardSeasonLifecycleBoundary {
    month: number;
    day: number | 'month_end';
    yearOffset: number;
}

export interface DashboardSeasonLifecyclePhase {
    id: string;
    label: string;
    salesShare: number;
    start: DashboardSeasonLifecycleBoundary;
    end: DashboardSeasonLifecycleBoundary;
    rangeLabel: string;
    sellThroughTarget: {
        min: number;
        max: number;
    };
    sellThroughTargetLabel: string;
}

export interface DashboardSeasonLifecycleStandard {
    label: string;
    english: string;
    windowLabel: string;
    phases: DashboardSeasonLifecyclePhase[];
}

type PanelWindowConfig = {
    label: string;
    rangeLabel: string;
    start: number;
    end: number;
    monthWeights: Array<{ month: number; weight: number }>;
};

const rawCatalog = seasonSalesLifecycleRaw as RawSeasonLifecycleCatalog;

function formatBoundary(boundary: DashboardSeasonLifecycleBoundary) {
    const prefix = boundary.yearOffset === 1 ? '次年' : '';
    const day = boundary.day === 'month_end' ? '月末' : `/${boundary.day}`;
    return `${prefix}${boundary.month}${day}`;
}

function createPhase(phase: RawPhase): DashboardSeasonLifecyclePhase {
    const start: DashboardSeasonLifecycleBoundary = {
        month: phase.start.month,
        day: phase.start.day,
        yearOffset: phase.start.year_offset,
    };
    const end: DashboardSeasonLifecycleBoundary = {
        month: phase.end.month,
        day: phase.end.day,
        yearOffset: phase.end.year_offset,
    };

    return {
        id: phase.id,
        label: phase.label,
        salesShare: phase.sales_share,
        start,
        end,
        rangeLabel: `${formatBoundary(start)} - ${formatBoundary(end)}`,
        sellThroughTarget: {
            min: phase.sell_through_target.min,
            max: phase.sell_through_target.max,
        },
        sellThroughTargetLabel: `${(phase.sell_through_target.min * 100).toFixed(0)}% - ${(phase.sell_through_target.max * 100).toFixed(0)}%`,
    };
}

function createSeasonStandard(season: DashboardSeasonLifecycleSeason): DashboardSeasonLifecycleStandard {
    const rawSeason = rawCatalog.seasons[season];
    const phases = rawSeason.phases.map(createPhase);
    const firstPhase = phases[0];
    const lastPhase = phases[phases.length - 1];

    return {
        label: rawSeason.label,
        english: rawSeason.english,
        windowLabel: `${formatBoundary(firstPhase.start)} - ${formatBoundary(lastPhase.end)}`,
        phases,
    };
}

export const DASHBOARD_SEASON_LIFECYCLE_NOTE = rawCatalog.note;

export const DASHBOARD_SEASON_LIFECYCLE_STANDARDS: Record<DashboardSeasonLifecycleSeason, DashboardSeasonLifecycleStandard> = {
    Q1: createSeasonStandard('Q1'),
    Q2: createSeasonStandard('Q2'),
    Q3: createSeasonStandard('Q3'),
    Q4: createSeasonStandard('Q4'),
};

export const DASHBOARD_SEASON_LIFECYCLE_ORDER: DashboardSeasonLifecycleSeason[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export const DASHBOARD_SEASON_LIFECYCLE_PANEL_WINDOWS: Record<DashboardSeasonLifecycleSeason, PanelWindowConfig> = {
    Q1: {
        label: '春季',
        rangeLabel: '12/10-5月末',
        start: 10 / 31,
        end: 6,
        monthWeights: [
            { month: 12, weight: 22 / 31 },
            { month: 1, weight: 1 },
            { month: 2, weight: 1 },
            { month: 3, weight: 1 },
            { month: 4, weight: 1 },
            { month: 5, weight: 1 },
        ],
    },
    Q2: {
        label: '夏季',
        rangeLabel: '3/5-9月末',
        start: 3 + 5 / 31,
        end: 10,
        monthWeights: [
            { month: 3, weight: 27 / 31 },
            { month: 4, weight: 1 },
            { month: 5, weight: 1 },
            { month: 6, weight: 1 },
            { month: 7, weight: 1 },
            { month: 8, weight: 1 },
            { month: 9, weight: 1 },
        ],
    },
    Q3: {
        label: '秋季',
        rangeLabel: '6/25-11月末',
        start: 6 + 25 / 30,
        end: 12,
        monthWeights: [
            { month: 6, weight: 6 / 30 },
            { month: 7, weight: 1 },
            { month: 8, weight: 1 },
            { month: 9, weight: 1 },
            { month: 10, weight: 1 },
            { month: 11, weight: 1 },
        ],
    },
    Q4: {
        label: '冬季',
        rangeLabel: '9/30-次年3月末',
        start: 9 + 30 / 30,
        end: 16,
        monthWeights: [
            { month: 9, weight: 1 / 30 },
            { month: 10, weight: 1 },
            { month: 11, weight: 1 },
            { month: 12, weight: 1 },
            { month: 1, weight: 1 },
            { month: 2, weight: 1 },
            { month: 3, weight: 1 },
        ],
    },
};
