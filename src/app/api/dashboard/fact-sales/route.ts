import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const season = searchParams.get('season');
    const wave = searchParams.get('wave');

    let rows;
    if (year && year !== 'all') {
        rows = await sql`
            SELECT * FROM fact_sales
            WHERE season_year = ${year}
            ${season && season !== 'all' ? sql`AND season = ${season}` : sql``}
            ${wave && wave !== 'all' ? sql`AND wave = ${wave}` : sql``}
        `;
    } else {
        rows = await sql`SELECT * FROM fact_sales`;
    }
    return NextResponse.json(rows);
}
