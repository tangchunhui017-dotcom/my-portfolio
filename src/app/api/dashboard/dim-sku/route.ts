import { NextResponse } from 'next/server';
import data from '../../../../../data/dashboard/dim_sku.json';

export async function GET() {
    return NextResponse.json(data);
}
