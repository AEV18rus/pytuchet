import { NextRequest, NextResponse } from 'next/server';
import { getMonthTotals } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    if (!month) {
      return NextResponse.json({ error: 'Требуется параметр month в формате YYYY-MM' }, { status: 400 });
    }

    const totals = await getMonthTotals(month);
    return NextResponse.json({ month, ...totals });
  } catch (error) {
    console.error('Ошибка при получении итогов месяца:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}