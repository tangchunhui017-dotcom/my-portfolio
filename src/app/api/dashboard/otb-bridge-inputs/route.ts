import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
    const filePath = join(process.cwd(), 'data/dashboard/otb_bridge_inputs.json');
    const raw = readFileSync(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(raw));
}
