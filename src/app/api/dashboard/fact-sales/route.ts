import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const season = searchParams.get('season');
    const wave = searchParams.get('wave');

    const filePath = path.join(process.cwd(), 'data', 'dashboard', 'fact_sales.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows: any[] = JSON.parse(raw);
    if (year && year !== 'all') rows = rows.filter((r) => String(r.season_year) === year);
    if (season && season !== 'all') rows = rows.filter((r) => r.season === season);
    if (wave && wave !== 'all') rows = rows.filter((r) => r.wave === wave);
    return NextResponse.json(rows);
}
