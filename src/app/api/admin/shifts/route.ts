import { NextRequest, NextResponse } from 'next/server';
import * as shiftRepo from '@/repositories/shift.repository';
import { requireAdmin } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Требуется роль администратора
    await requireAdmin(request);
    // Для админ панели получаем все смены с информацией о пользователях
    const shifts = await shiftRepo.getShiftsWithUsers();
    return NextResponse.json(shifts);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
      }
    }
    console.error('Ошибка при получении всех смен для админа:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}