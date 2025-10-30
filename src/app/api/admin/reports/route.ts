import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyReportsForAllMasters } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    const reports = await getMonthlyReportsForAllMasters(month || undefined);
    
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Ошибка при получении отчетов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении отчетов' },
      { status: 500 }
    );
  }
}