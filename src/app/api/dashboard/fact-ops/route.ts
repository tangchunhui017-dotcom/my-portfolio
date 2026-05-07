import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const season = searchParams.get('season');

    let rows;
    if (year && year !== 'all') {
        rows = await sql`
            SELECT * FROM fact_ops
            WHERE season_year = ${year}
            ${season && season !== 'all' ? sql`AND season = ${season}` : sql``}
        `;
    } else {
        rows = await sql`SELECT * FROM fact_ops`;
    }
    return NextResponse.json(rows);
}
