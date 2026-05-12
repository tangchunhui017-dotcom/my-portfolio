import { NextResponse } from 'next/server';
import data from '../../../../../data/dashboard/fact_inventory.json';

export async function GET() {
    return NextResponse.json(data);
}
