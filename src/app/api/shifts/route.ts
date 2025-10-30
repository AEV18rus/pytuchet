import { NextRequest, NextResponse } from 'next/server';
import { getShifts, addShift, getPrices, getShiftsForUserAndMonth, getMonthStatus } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const month = searchParams.get('month');

    // Если указан user_id и month, возвращаем смены для конкретного пользователя за месяц (для админа)
    if (userId && month) {
      const shifts = await getShiftsForUserAndMonth(parseInt(userId), month);
      return NextResponse.json(shifts);
    } else {
      // Обычное поведение - возвращаем смены текущего пользователя
      const shifts = await getShifts(user.id);
      return NextResponse.json(shifts);
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }
    console.error('Ошибка при получении смен:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { date, hours, steam_bath, brand_steam, intro_steam, scrubbing, zaparnik, masters, total } = await request.json();
    // Проверка: месяц закрыт?
    try {
      const month = (typeof date === 'string' && date.length >= 7) ? date.slice(0, 7) : '';
      if (month) {
        const isClosed = await getMonthStatus(month);
        if (isClosed) {
          return NextResponse.json({ error: 'Месяц закрыт, добавление смен запрещено' }, { status: 403 });
        }
      }
    } catch (e) {
      // если формат даты неожиданный, продолжаем без блокировки
    }
    if (!date || hours === undefined || total === undefined) {
      return NextResponse.json({ error: 'Дата, часы и общая сумма обязательны' }, { status: 400 });
    }
    
    if (typeof hours !== 'number' || hours < 0) {
      return NextResponse.json({ error: 'Часы должны быть положительным числом' }, { status: 400 });
    }
    
    if (typeof total !== 'number' || total < 0) {
      return NextResponse.json({ error: 'Общая сумма должна быть положительным числом' }, { status: 400 });
    }
    

    
    // Получаем текущие цены для сохранения со сменой
    const prices = await getPrices();
    const priceMapping: { [key: string]: string } = {
      'Почасовая ставка': 'hourly_rate',
      'Путевое парение': 'steam_bath_price',
      'Фирменное парение': 'brand_steam_price',
      'Ознакомительное парение': 'intro_steam_price',
      'Скрабирование': 'scrubbing_price',
      'Запарник': 'zaparnik_price'
    };
    
    const currentPrices: { [key: string]: number } = {
      hourly_rate: 0,
      steam_bath_price: 0,
      brand_steam_price: 0,
      intro_steam_price: 0,
      scrubbing_price: 0,
      zaparnik_price: 0
    };
    
    // Заполняем текущие цены
    prices.forEach(price => {
      const key = priceMapping[price.name];
      if (key) {
        currentPrices[key] = price.price;
      }
    });
    
    await addShift({
      user_id: user.id,
      date,
      hours,
      steam_bath: steam_bath || 0,
      brand_steam: brand_steam || 0,
      intro_steam: intro_steam || 0,
      scrubbing: scrubbing || 0,
      zaparnik: zaparnik || 0,
      masters: masters || 1,
      total,
      hourly_rate: currentPrices.hourly_rate,
      steam_bath_price: currentPrices.steam_bath_price,
      brand_steam_price: currentPrices.brand_steam_price,
      intro_steam_price: currentPrices.intro_steam_price,
      scrubbing_price: currentPrices.scrubbing_price,
      zaparnik_price: currentPrices.zaparnik_price
    });

    return NextResponse.json({ 
      message: 'Смена добавлена успешно',
      shift: { date, hours, steam_bath, brand_steam, intro_steam, scrubbing, zaparnik, masters, total }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }
    console.error('Ошибка при добавлении смены:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}