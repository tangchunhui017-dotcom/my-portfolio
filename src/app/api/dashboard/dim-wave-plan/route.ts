import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
    const rows = await sql`SELECT * FROM dim_wave_plan`;
    return NextResponse.json(rows);
}
