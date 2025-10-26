import { NextRequest, NextResponse } from 'next/server';
import { deleteShift, initDatabase } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
    }
    
    await initDatabase();
    await deleteShift(id);
    
    return NextResponse.json({ message: 'Смена удалена успешно' });
  } catch (error) {
    console.error('Ошибка при удалении смены:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}