import { NextResponse } from 'next/server';
import { addShift, getPrices, getUserByTelegramId } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_telegram_id } = body;

    // Если не указан telegram_id, используем fallback пользователя
    const telegramId = user_telegram_id || 87654321;

    // Получаем пользователя
    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      return NextResponse.json(
        { error: `Пользователь с telegram_id ${telegramId} не найден` },
        { status: 404 }
      );
    }

    // Получаем текущие цены
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

    // Создаем тестовые смены за последние 30 дней
    const testShifts = [];
    const today = new Date();
    
    for (let i = 0; i < 15; i++) {
      const shiftDate = new Date(today);
      shiftDate.setDate(today.getDate() - i * 2); // Каждые 2 дня
      
      const hours = 8 + Math.floor(Math.random() * 4); // 8-11 часов
      const steamBath = Math.floor(Math.random() * 3); // 0-2 путевых парения
      const brandSteam = Math.floor(Math.random() * 2); // 0-1 фирменное парение
      const introSteam = Math.floor(Math.random() * 2); // 0-1 ознакомительное
      const scrubbing = Math.floor(Math.random() * 3); // 0-2 скрабирования
      const masters = 2; // Всегда 2 мастера
      
      // Рассчитываем общую сумму
      const total = 
        hours * currentPrices.hourly_rate +
        steamBath * currentPrices.steam_bath_price +
        brandSteam * currentPrices.brand_steam_price +
        introSteam * currentPrices.intro_steam_price +
        scrubbing * currentPrices.scrubbing_price;

      const shift = {
        user_id: user.id!,
        date: shiftDate.toISOString().split('T')[0],
        hours,
        steam_bath: steamBath,
        brand_steam: brandSteam,
        intro_steam: introSteam,
        scrubbing,
        masters,
        total: Math.round(total),
        hourly_rate: currentPrices.hourly_rate,
        steam_bath_price: currentPrices.steam_bath_price,
        brand_steam_price: currentPrices.brand_steam_price,
        intro_steam_price: currentPrices.intro_steam_price,
        scrubbing_price: currentPrices.scrubbing_price
      };

      await addShift(shift);
      testShifts.push(shift);
    }

    return NextResponse.json({
      success: true,
      message: `Создано ${testShifts.length} тестовых смен для пользователя ${user.first_name}`,
      shifts: testShifts.length,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        name: `${user.first_name} ${user.last_name || ''}`
      }
    });

  } catch (error) {
    console.error('Error creating test shifts:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании тестовых смен', details: error instanceof Error ? error.message : 'Неизвестная ошибка' },
      { status: 500 }
    );
  }
}