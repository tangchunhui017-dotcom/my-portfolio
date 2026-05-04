export const DASHBOARD_SEASON_ORDER = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
export const DASHBOARD_WAVE_ORDER = [
    'W01',
    'W02',
    'W03',
    'W04',
    'W05',
    'W06',
    'W07',
    'W08',
    'W09',
    'W10',
    'W11',
    'W12',
] as const;

export type DashboardSeason = typeof DASHBOARD_SEASON_ORDER[number];
export type DashboardWave = typeof DASHBOARD_WAVE_ORDER[number];

export function normalizeDashboardWave(value: string | null | undefined): DashboardWave | null {
    if (!value) return null;
    const match = /^W(\d{1,2})$/i.exec(String(value).trim());
    if (!match) return null;
    const waveNumber = Number(match[1]);
    if (!Number.isFinite(waveNumber) || waveNumber < 1 || waveNumber > 12) return null;
    return `W${String(waveNumber).padStart(2, '0')}` as DashboardWave;
}

export function getDashboardMonthByWave(value: string | null | undefined): number | null {
    const normalizedWave = normalizeDashboardWave(value);
    if (!normalizedWave) return null;
    return Number(normalizedWave.slice(1));
}


export function getCurrentDashboardWave(date = new Date()): DashboardWave {
    const month = Math.min(Math.max(date.getMonth() + 1, 1), 12);
    return `W${String(month).padStart(2, '0')}` as DashboardWave;
}
export function getDashboardSeasonByWave(value: string | null | undefined): DashboardSeason | null {
    const month = getDashboardMonthByWave(value);
    if (month === null) return null;
    if (month <= 3) return 'Q1';
    if (month <= 6) return 'Q2';
    if (month <= 9) return 'Q3';
    return 'Q4';
}

export function getDashboardWavesForSeason(season: string | 'all'): DashboardWave[] {
    if (season === 'all') return [...DASHBOARD_WAVE_ORDER];

    const seasonIndex = DASHBOARD_SEASON_ORDER.indexOf(season as DashboardSeason);
    if (seasonIndex === -1) return [...DASHBOARD_WAVE_ORDER];

    const start = seasonIndex * 3;
    return DASHBOARD_WAVE_ORDER.slice(start, start + 3);
}

export function matchesDashboardSeasonFilter(
    selectedSeason: string | 'all',
    wave: string | null | undefined,
    rawSeason?: string | null,
): boolean {
    if (selectedSeason === 'all') return true;
    const canonicalSeason = getDashboardSeasonByWave(wave);
    if (canonicalSeason) return canonicalSeason === selectedSeason;
    return rawSeason === selectedSeason;
}
