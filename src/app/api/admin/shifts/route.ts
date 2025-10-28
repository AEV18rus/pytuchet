import { NextRequest, NextResponse } from 'next/server';
import { getShiftsWithUsers } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Для админ панели получаем все смены с информацией о пользователях
    const shifts = await getShiftsWithUsers();
    return NextResponse.json(shifts);
  } catch (error) {
    console.error('Ошибка при получении всех смен для админа:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}