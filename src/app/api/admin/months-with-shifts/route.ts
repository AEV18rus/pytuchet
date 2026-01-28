import { NextResponse } from 'next/server';
import * as monthRepo from '@/repositories/month.repository';

export async function GET() {
  try {
    const months = await monthRepo.getMonthsWithShiftsData();
    return NextResponse.json({ months });
  } catch (error) {
    console.error('Ошибка при получении месяцев со сменами:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}