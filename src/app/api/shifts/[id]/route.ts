import { NextRequest, NextResponse } from 'next/server';
import { deleteShift } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
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