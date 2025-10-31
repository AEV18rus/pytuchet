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
    const { date, hours, masters, total, services, service_prices, steam_bath, brand_steam, intro_steam, scrubbing, zaparnik } = await request.json();
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
    
    // Подготавливаем данные для сохранения
    const shiftData: any = {
      user_id: user.id,
      date,
      hours,
      masters: masters || 1,
      total,
      hourly_rate: prices.find(p => p.name === 'Почасовая ставка')?.price || 0
    };

    // Если используется новая структура с динамическими услугами
    if (services && typeof services === 'object') {
      // Сохраняем услуги как JSON
      shiftData.services = JSON.stringify(services);
      shiftData.service_prices = JSON.stringify(service_prices || {});
      
      // Для обратной совместимости также сохраняем в старые поля
      shiftData.steam_bath = services['Путевое парение'] || 0;
      shiftData.brand_steam = services['Фирменное парение'] || 0;
      shiftData.intro_steam = services['Ознакомительное парение'] || 0;
      shiftData.scrubbing = services['Скрабирование'] || 0;
      shiftData.zaparnik = services['Запарник'] || 0;
      
      // Цены для обратной совместимости
      shiftData.steam_bath_price = service_prices?.['Путевое парение'] || prices.find(p => p.name === 'Путевое парение')?.price || 0;
      shiftData.brand_steam_price = service_prices?.['Фирменное парение'] || prices.find(p => p.name === 'Фирменное парение')?.price || 0;
      shiftData.intro_steam_price = service_prices?.['Ознакомительное парение'] || prices.find(p => p.name === 'Ознакомительное парение')?.price || 0;
      shiftData.scrubbing_price = service_prices?.['Скрабирование'] || prices.find(p => p.name === 'Скрабирование')?.price || 0;
      shiftData.zaparnik_price = service_prices?.['Запарник'] || prices.find(p => p.name === 'Запарник')?.price || 0;
    } else {
      // Старая структура данных (обратная совместимость)
      shiftData.steam_bath = steam_bath || 0;
      shiftData.brand_steam = brand_steam || 0;
      shiftData.intro_steam = intro_steam || 0;
      shiftData.scrubbing = scrubbing || 0;
      shiftData.zaparnik = zaparnik || 0;
      
      shiftData.steam_bath_price = prices.find(p => p.name === 'Путевое парение')?.price || 0;
      shiftData.brand_steam_price = prices.find(p => p.name === 'Фирменное парение')?.price || 0;
      shiftData.intro_steam_price = prices.find(p => p.name === 'Ознакомительное парение')?.price || 0;
      shiftData.scrubbing_price = prices.find(p => p.name === 'Скрабирование')?.price || 0;
      shiftData.zaparnik_price = prices.find(p => p.name === 'Запарник')?.price || 0;
    }
    
    await addShift(shiftData);

    return NextResponse.json({ 
      message: 'Смена добавлена успешно',
      shift: { date, hours, masters, total, services: services || {} }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }
    console.error('Ошибка при добавлении смены:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}