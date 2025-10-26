import { NextRequest, NextResponse } from 'next/server';
import { getShifts, addShift, initDatabase, getPrices } from '@/lib/db';

export async function GET() {
  try {
    await initDatabase();
    const shifts = await getShifts();
    return NextResponse.json(shifts);
  } catch (error) {
    console.error('Ошибка при получении смен:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { date, hours, steam_bath, brand_steam, intro_steam, scrubbing, masters, total } = await request.json();
    
    if (!date || hours === undefined || total === undefined) {
      return NextResponse.json({ error: 'Дата, часы и общая сумма обязательны' }, { status: 400 });
    }
    
    if (typeof hours !== 'number' || hours < 0) {
      return NextResponse.json({ error: 'Часы должны быть положительным числом' }, { status: 400 });
    }
    
    if (typeof total !== 'number' || total < 0) {
      return NextResponse.json({ error: 'Общая сумма должна быть положительным числом' }, { status: 400 });
    }
    
    await initDatabase();
    
    // Получаем текущие цены для сохранения со сменой
    const prices = await getPrices();
    const priceMapping: { [key: string]: string } = {
      'Почасовая ставка': 'hourly_rate',
      'Путевое парение': 'steam_bath_price',
      'Фирменное парение': 'brand_steam_price',
      'Ознакомительное парение': 'intro_steam_price',
      'Скрабирование': 'scrubbing_price'
    };
    
    const currentPrices: { [key: string]: number } = {
      hourly_rate: 0,
      steam_bath_price: 0,
      brand_steam_price: 0,
      intro_steam_price: 0,
      scrubbing_price: 0
    };
    
    // Заполняем текущие цены
    prices.forEach(price => {
      const key = priceMapping[price.name];
      if (key) {
        currentPrices[key] = price.price;
      }
    });
    
    await addShift({
      date,
      hours,
      steam_bath: steam_bath || 0,
      brand_steam: brand_steam || 0,
      intro_steam: intro_steam || 0,
      scrubbing: scrubbing || 0,
      masters: masters || 1,
      total,
      hourly_rate: currentPrices.hourly_rate,
      steam_bath_price: currentPrices.steam_bath_price,
      brand_steam_price: currentPrices.brand_steam_price,
      intro_steam_price: currentPrices.intro_steam_price,
      scrubbing_price: currentPrices.scrubbing_price
    });

    return NextResponse.json({ 
      message: 'Смена добавлена успешно',
      shift: { date, hours, steam_bath, brand_steam, intro_steam, scrubbing, masters, total }
    });
  } catch (error) {
    console.error('Ошибка при добавлении смены:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}