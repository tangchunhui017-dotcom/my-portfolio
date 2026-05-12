import { NextResponse } from 'next/server';
import data from '../../../../../data/dashboard/dim_competitor.json';

export async function GET() {
    return NextResponse.json(data);
}
