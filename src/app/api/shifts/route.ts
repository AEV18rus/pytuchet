import { NextRequest, NextResponse } from 'next/server';
import * as shiftRepo from '@/repositories/shift.repository';
import * as priceRepo from '@/repositories/price.repository';
import { payoutService } from '@/services/payout.service';
import { monthService } from '@/services/month.service';
import { requireAuth, requireMasterForMutation } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const month = searchParams.get('month');

    if (userId && month) {
      const shifts = await shiftRepo.getShiftsForUserAndMonth(parseInt(userId), month);
      return NextResponse.json(shifts);
    } else {
      const shifts = await shiftRepo.getShifts(user.id);
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
    const user = await requireMasterForMutation(request);
    const { date, hours, masters, total, services, service_prices, steam_bath, brand_steam, intro_steam, scrubbing, zaparnik } = await request.json();

    if (!date || hours === undefined || total === undefined) {
      return NextResponse.json({ error: 'Дата, часы и общая сумма обязательны' }, { status: 400 });
    }
    if (typeof hours !== 'number' || hours < 0) {
      return NextResponse.json({ error: 'Часы должны быть положительным числом' }, { status: 400 });
    }
    if (typeof total !== 'number' || total < 0) {
      return NextResponse.json({ error: 'Общая сумма должна быть положительным числом' }, { status: 400 });
    }

    const prices = await priceRepo.getPrices();

    const shiftData: any = {
      user_id: user.id,
      date,
      hours,
      masters: masters || 1,
      total,
      hourly_rate: prices.find(p => p.name === 'Почасовая ставка')?.price || 0
    };

    if (services && typeof services === 'object') {
      shiftData.services = JSON.stringify(services);
      shiftData.service_prices = JSON.stringify(service_prices || {});

      shiftData.steam_bath = services['Путевое парение'] || 0;
      shiftData.brand_steam = services['Фирменное парение'] || 0;
      shiftData.intro_steam = services['Ознакомительное парение'] || 0;
      shiftData.scrubbing = services['Скрабирование'] || 0;
      shiftData.zaparnik = services['Запарник'] || 0;

      shiftData.steam_bath_price = service_prices?.['Путевое парение'] || prices.find(p => p.name === 'Путевое парение')?.price || 0;
      shiftData.brand_steam_price = service_prices?.['Фирменное парение'] || prices.find(p => p.name === 'Фирменное парение')?.price || 0;
      shiftData.intro_steam_price = service_prices?.['Ознакомительное парение'] || prices.find(p => p.name === 'Ознакомительное парение')?.price || 0;
      shiftData.scrubbing_price = service_prices?.['Скрабирование'] || prices.find(p => p.name === 'Скрабирование')?.price || 0;
      shiftData.zaparnik_price = service_prices?.['Запарник'] || prices.find(p => p.name === 'Запарник')?.price || 0;
    } else {
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

    await shiftRepo.addShift(shiftData);

    // Пересчитываем авансы для месяца, в который добавлена смена
    try {
      const month = (typeof date === 'string' && date.length >= 7) ? date.slice(0, 7) : '';
      if (month) {
        await payoutService.recalculateAdvancesForMonth(user.id, month);
      }

      // Запускаем проверку автоматического закрытия месяцев (в фоновом режиме)
      monthService.autoCloseFinishedMonths().catch((err: Error) => console.error('Ошибка в фоновой задаче автозакрытия:', err));
    } catch (e) {
      console.error('Ошибка при пересчете авансов:', e);
      // Не прерываем ответ клиенту, так как смена уже добавлена
    }

    return NextResponse.json({
      message: 'Смена добавлена успешно',
      shift: { date, hours, masters, total, services: services || {} }
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
    console.error('Ошибка при добавлении смены:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}