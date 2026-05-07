import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface SizeSalesInventoryRecord {
    season_year?: string | number;
    season?: string;
    wave?: string;
}

let cachedRows: SizeSalesInventoryRecord[] | null = null;

async function loadRows() {
    if (cachedRows) return cachedRows;
    const filePath = path.join(process.cwd(), 'data', 'dashboard', 'fact_size_sales_inventory.json');
    const raw = await fs.readFile(filePath, 'utf8');
    cachedRows = JSON.parse(raw) as SizeSalesInventoryRecord[];
    return cachedRows;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const season = searchParams.get('season');
    const wave = searchParams.get('wave');

    try {
        const rows = await loadRows();
        const filtered = rows.filter((row) => {
            if (year && year !== 'all' && String(row.season_year) !== year) return false;
            if (season && season !== 'all' && row.season !== season) return false;
            if (wave && wave !== 'all' && row.wave !== wave) return false;
            return true;
        });
        return NextResponse.json(filtered);
    } catch {
        return NextResponse.json([], { status: 200 });
    }
}
