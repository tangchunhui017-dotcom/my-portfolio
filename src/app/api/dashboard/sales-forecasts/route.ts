import { NextResponse } from 'next/server';
import data from '../../../../../data/dashboard/sales_forecasts.json';

export async function GET() {
    return NextResponse.json(data);
}
