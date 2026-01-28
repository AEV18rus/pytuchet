import { NextRequest, NextResponse } from 'next/server';
import * as shiftRepo from '@/repositories/shift.repository';
import { requireMasterForMutation } from '@/lib/auth-server';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Удаление смены разрешено только мастеру
    const user = await requireMasterForMutation(request);
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
    }
    // Проверяем, существует ли смена и принадлежит ли пользователю
    const shift = await shiftRepo.getShiftById(id);
    if (!shift || shift.user_id !== user.id) {
      return NextResponse.json({ error: 'Смена не найдена или не принадлежит пользователю' }, { status: 404 });
    }

    await shiftRepo.deleteShift(id, user.id);

    return NextResponse.json({ message: 'Смена удалена успешно' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
      }
    }
    console.error('Ошибка при удалении смены:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}