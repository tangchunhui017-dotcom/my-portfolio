export type TransitionSeasonCode = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type TransitionHandoffRole = 'prev' | 'current' | 'next' | 'carryover' | 'non_main';

export interface TransitionSeasonRef {
    season: TransitionSeasonCode;
    seasonYear: number;
}

export interface TransitionSeasonWindow {
    prev: TransitionSeasonRef;
    current: TransitionSeasonRef;
    next: TransitionSeasonRef;
}

function getSeasonLabel(season: TransitionSeasonCode) {
    if (season === 'Q1') return '春';
    if (season === 'Q2') return '夏';
    if (season === 'Q3') return '秋';
    return '冬';
}

export function formatTransitionSeasonKey(season: TransitionSeasonCode, seasonYear: number) {
    return getSeasonLabel(season) + String(seasonYear).slice(-2);
}

export function resolveTransitionCurrentSeason(month: number): TransitionSeasonCode {
    if (month <= 4) return 'Q1';
    if (month <= 6) return 'Q2';
    if (month <= 9) return 'Q3';
    return 'Q4';
}

export function resolveTransitionWindow(anchorYear: number, month: number): TransitionSeasonWindow {
    if (month <= 4) {
        return {
            prev: { season: 'Q4', seasonYear: anchorYear - 1 },
            current: { season: 'Q1', seasonYear: anchorYear },
            next: { season: 'Q2', seasonYear: anchorYear },
        };
    }
    if (month <= 6) {
        return {
            prev: { season: 'Q1', seasonYear: anchorYear },
            current: { season: 'Q2', seasonYear: anchorYear },
            next: { season: 'Q3', seasonYear: anchorYear },
        };
    }
    if (month <= 9) {
        return {
            prev: { season: 'Q2', seasonYear: anchorYear },
            current: { season: 'Q3', seasonYear: anchorYear },
            next: { season: 'Q4', seasonYear: anchorYear },
        };
    }
    return {
        prev: { season: 'Q3', seasonYear: anchorYear },
        current: { season: 'Q4', seasonYear: anchorYear },
        next: { season: 'Q1', seasonYear: anchorYear + 1 },
    };
}

export function resolveTransitionHandoffRole(
    season: TransitionSeasonCode,
    seasonYear: number,
    month: number,
    anchorYear: number,
): TransitionHandoffRole {
    const window = resolveTransitionWindow(anchorYear, month);
    if (season === window.prev.season && seasonYear === window.prev.seasonYear) return 'prev';
    if (season === window.current.season && seasonYear === window.current.seasonYear) return 'current';
    if (season === window.next.season && seasonYear === window.next.seasonYear) return 'next';
    return 'non_main';
}

export function resolveTransitionTimelineKey(
    season: TransitionSeasonCode | null,
    seasonYear: number | null,
    anchorYear: number,
) {
    if (!season || !seasonYear) return null;
    if (seasonYear === anchorYear - 1 && season === 'Q4') return 0;
    if (seasonYear === anchorYear) {
        if (season === 'Q1') return 1;
        if (season === 'Q2') return 2;
        if (season === 'Q3') return 3;
        if (season === 'Q4') return 4;
    }
    if (seasonYear === anchorYear + 1 && season === 'Q1') return 5;
    return null;
}
