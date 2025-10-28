import { NextRequest, NextResponse } from 'next/server';
import { addPrice, updatePrice, getPrices } from '@/lib/db';

interface Prices {
  hourly_rate: number;
  steam_bath_price: number;
  brand_steam_price: number;
  intro_steam_price: number;
  scrubbing_price: number;
}

const priceMapping: Record<keyof Prices, string> = {
  hourly_rate: 'Почасовая ставка',
  steam_bath_price: 'Путевое парение',
  brand_steam_price: 'Фирменное парение',
  intro_steam_price: 'Ознакомительное парение',
  scrubbing_price: 'Скрабирование'
};

export async function POST(request: NextRequest) {
  try {
    const prices: Prices = await request.json();
    
    // Валидация данных
    for (const [key, value] of Object.entries(prices)) {
      if (typeof value !== 'number' || value <= 0) {
        return NextResponse.json({ 
          error: `Цена для ${priceMapping[key as keyof Prices]} должна быть положительным числом` 
        }, { status: 400 });
      }
    }

    // Получаем существующие цены
    const existingPrices = await getPrices();
    const existingPricesMap = new Map(existingPrices.map(p => [p.name, p]));
    
    // Обновляем или добавляем каждую цену
    for (const [key, value] of Object.entries(prices)) {
      const name = priceMapping[key as keyof Prices];
      const existingPrice = existingPricesMap.get(name);
      
      if (existingPrice) {
        await updatePrice(existingPrice.id!, { name, price: value });
      } else {
        await addPrice({ name, price: value });
      }
    }
    
    return NextResponse.json({ 
      message: 'Цены сохранены успешно',
      prices
    });
  } catch (error) {
    console.error('Ошибка при сохранении цен:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const prices: Prices = await request.json();
    
    // Валидация данных
    for (const [key, value] of Object.entries(prices)) {
      if (typeof value !== 'number' || value <= 0) {
        return NextResponse.json({ 
          error: `Цена для ${priceMapping[key as keyof Prices]} должна быть положительным числом` 
        }, { status: 400 });
      }
    }

    // Получаем существующие цены
    const existingPrices = await getPrices();
    const existingPricesMap = new Map(existingPrices.map(p => [p.name, p]));
    
    // Обновляем или добавляем каждую цену
    for (const [key, value] of Object.entries(prices)) {
      const name = priceMapping[key as keyof Prices];
      const existingPrice = existingPricesMap.get(name);
      
      if (existingPrice) {
        await updatePrice(existingPrice.id!, { name, price: value });
      } else {
        await addPrice({ name, price: value });
      }
    }
    
    return NextResponse.json({ 
      message: 'Цены обновлены успешно',
      prices
    });
  } catch (error) {
    console.error('Ошибка при обновлении цен:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const prices = await getPrices();
    
    // Преобразуем в формат, ожидаемый фронтендом
    const pricesObject: Prices = {
      hourly_rate: 0,
      steam_bath_price: 0,
      brand_steam_price: 0,
      intro_steam_price: 0,
      scrubbing_price: 0
    };
    
    // Заполняем данными из базы
    prices.forEach((price: { name: string; price: number }) => {
      const key = Object.keys(priceMapping).find(k => priceMapping[k as keyof Prices] === price.name);
      if (key) {
        pricesObject[key as keyof Prices] = price.price;
      }
    });
    
    // Проверяем что все цены загружены из базы
    const missingPrices = Object.entries(pricesObject).filter(([_, value]) => value === 0);
    if (missingPrices.length > 0) {
      return NextResponse.json({ 
        error: 'Не все цены найдены в базе данных. Необходимо сначала установить цены.' 
      }, { status: 404 });
    }
    
    return NextResponse.json(pricesObject);
  } catch (error) {
    console.error('Ошибка при получении цен:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}