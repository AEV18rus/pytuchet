import { NextRequest, NextResponse } from 'next/server';
import { updatePrice, deletePrice } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
    }

    const { name, price } = await request.json();
    
    if (!name || !price) {
      return NextResponse.json({ error: 'Название и цена обязательны' }, { status: 400 });
    }
    
    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Цена должна быть положительным числом' }, { status: 400 });
    }
    
    await updatePrice(id, { name, price });
    
    return NextResponse.json({ 
      message: 'Цена обновлена успешно',
      price: { id, name, price }
    });
  } catch (error) {
    console.error('Ошибка при обновлении цены:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

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
    
    await deletePrice(id);
    
    return NextResponse.json({ message: 'Цена удалена успешно' });
  } catch (error) {
    console.error('Ошибка при удалении цены:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}