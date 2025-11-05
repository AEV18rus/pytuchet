import { NextRequest, NextResponse } from 'next/server';
import { getPrices, addPrice, deletePrice } from '@/lib/db';
import { ensureDatabaseInitialized } from '@/lib/global-init';
import { requireAdmin } from '@/lib/auth-server';

export async function GET() {
  try {
    await ensureDatabaseInitialized();
    const prices = await getPrices();
    return NextResponse.json(prices);
  } catch (error) {
    console.error('Ошибка при получении цен:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    await ensureDatabaseInitialized();
    const { name, price } = await request.json();
    
    if (!name || !price) {
      return NextResponse.json({ error: 'Название и цена обязательны' }, { status: 400 });
    }
    
    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Цена должна быть положительным числом' }, { status: 400 });
    }
    

    await addPrice({ name, price });
    
    return NextResponse.json({ 
      message: 'Цена добавлена успешно',
      price: { name, price }
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
    console.error('Ошибка при добавлении цены:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);
    await ensureDatabaseInitialized();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID услуги обязателен' }, { status: 400 });
    }
    
    const priceId = parseInt(id);
    if (isNaN(priceId)) {
      return NextResponse.json({ error: 'Некорректный ID услуги' }, { status: 400 });
    }

    await deletePrice(priceId);
    
    return NextResponse.json({ 
      message: 'Услуга удалена успешно'
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
    console.error('Ошибка при удалении услуги:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}