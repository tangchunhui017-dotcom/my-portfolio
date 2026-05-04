export interface DashboardOpsFactRecord {
    record_key?: string;
    sku_id: string;
    channel_id: string;
    season_year: string | number;
    season: string;
    wave: string;
    week_num: number;
    demand_pairs: number;
    ship_pairs: number;
    reorder_pairs: number;
    fill_rate: number;
    reorder_rate: number;
    source_type?: string;
}

export function buildDashboardOpsRecordKey(input: {
    season_year: string | number;
    season: string;
    wave: string;
    week_num: number | string;
    sku_id: string;
    channel_id: string;
}) {
    return [
        String(input.season_year),
        String(input.season || ''),
        String(input.wave || ''),
        String(Number(input.week_num || 0)),
        String(input.sku_id || ''),
        String(input.channel_id || ''),
    ].join('__');
}