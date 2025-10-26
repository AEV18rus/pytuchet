import { NextRequest, NextResponse } from 'next/server';
import { getPrices, addPrice, initDatabase } from '@/lib/db';

export async function GET() {
  try {
    await initDatabase();
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
    
    await initDatabase();
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