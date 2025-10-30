import { NextRequest, NextResponse } from 'next/server';
import { deleteShift, getShiftById, getMonthStatus } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
    }
    // Проверяем, существует ли смена и принадлежит ли пользователю
    const shift = await getShiftById(id);
    if (!shift || shift.user_id !== user.id) {
      return NextResponse.json({ error: 'Смена не найдена или не принадлежит пользователю' }, { status: 404 });
    }

    // Проверка: месяц закрыт?
    const month = (typeof shift.date === 'string' && shift.date.length >= 7) ? shift.date.slice(0, 7) : '';
    if (month) {
      const isClosed = await getMonthStatus(month);
      if (isClosed) {
        return NextResponse.json({ error: 'Месяц закрыт, удаление смен запрещено' }, { status: 403 });
      }
    }

    await deleteShift(id, user.id);
    
    return NextResponse.json({ message: 'Смена удалена успешно' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }
    console.error('Ошибка при удалении смены:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}