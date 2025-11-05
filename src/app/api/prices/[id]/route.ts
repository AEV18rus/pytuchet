import { NextRequest, NextResponse } from 'next/server';
import { updatePrice } from '@/lib/db';
import { ensureDatabaseInitialized } from '@/lib/global-init';
import { requireAdmin } from '@/lib/auth-server';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    await ensureDatabaseInitialized();

    const { id } = await context.params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      return NextResponse.json({ error: 'Некорректный ID услуги' }, { status: 400 });
    }

    const { name, price } = await request.json();

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Название и цена обязательны' }, { status: 400 });
    }
    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Цена должна быть положительным числом' }, { status: 400 });
    }

    await updatePrice(idNum, { name, price });

    return NextResponse.json({
      message: 'Цена обновлена успешно',
      price: { id: idNum, name, price }
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
      }
    }
    console.error('Ошибка при обновлении цены:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}