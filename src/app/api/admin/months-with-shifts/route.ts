import { NextResponse } from 'next/server';
import { getMonthsWithShiftsData } from '@/lib/db';

export async function GET() {
  try {
    const months = await getMonthsWithShiftsData();
    return NextResponse.json({ months });
  } catch (error) {
    console.error('Ошибка при получении месяцев со сменами:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}