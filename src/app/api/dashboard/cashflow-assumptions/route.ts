import { NextResponse } from 'next/server';
import data from '../../../../../data/dashboard/cashflow_assumptions.json';

export async function GET() {
    return NextResponse.json(data);
}
