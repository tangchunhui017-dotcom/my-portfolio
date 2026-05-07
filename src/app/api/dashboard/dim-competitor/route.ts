import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
    const rows = await sql`
        SELECT
            id, name, position, market_share, yoy,
            (SELECT json_agg(elem::json) FROM unnest(category_mix::text[])   AS elem) AS category_mix,
            (SELECT json_agg(elem::json) FROM unnest(price_band_mix::text[]) AS elem) AS price_band_mix,
            (SELECT json_agg(elem)       FROM unnest(trend_tags::text[])     AS elem) AS trend_tags,
            (SELECT json_agg(elem::json) FROM unnest(hot_skus::text[])       AS elem) AS hot_skus
        FROM dim_competitor
    `;
    return NextResponse.json(rows);
}
