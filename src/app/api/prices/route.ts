import { NextRequest, NextResponse } from 'next/server';
import { getPrices, addPrice, deletePrice } from '@/lib/db';

export async function GET() {
  try {
    const prices = await getPrices();
    return NextResponse.json(prices);
  } catch (error) {
    console.error('Ошибка при получении цен:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
    console.error('Ошибка при добавлении цены:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
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
    console.error('Ошибка при удалении услуги:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}