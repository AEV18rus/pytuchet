import { NextRequest, NextResponse } from 'next/server';
import { 
  createPayout, 
  getPayoutsByUser, 
  getPayoutsByUserAndMonth,
  getMonthsWithShifts,
  getEarningsForMonth,
  getPayoutsForMonth,
  getUserByTelegramId,
  getPayoutsDataOptimized,
  getMonthStatus,
  processOverpaymentCarryover
} from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-server';
import { ensureDatabaseInitialized } from '@/lib/global-init';

// GET /api/payouts - получить все выплаты пользователя с данными по месяцам
export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();
    
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Используем оптимизированную функцию для получения всех данных одним запросом
    const monthsData = await getPayoutsDataOptimized(user.id!);

    return NextResponse.json({ months: monthsData });
  } catch (error) {
    console.error('Ошибка при получении выплат:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/payouts - создать новую выплату
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Начинаем создание выплаты...');
    await ensureDatabaseInitialized();
    console.log('✅ База данных инициализирована');
    
    const user = await getUserFromRequest(request);
    console.log('👤 Пользователь:', user);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  const body = await request.json();
  const { month, amount, date, comment } = body;
  console.log('📝 Данные выплаты:', { month, amount, date, comment });

    // Валидация
    if (!month || !amount || !date) {
      return NextResponse.json({ 
        error: 'Месяц, сумма и дата обязательны' 
      }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ 
        error: 'Сумма должна быть больше 0' 
      }, { status: 400 });
    }

    // Проверка: месяц закрыт?
    console.log('🔍 Проверяем статус месяца:', month);
    const isClosed = await getMonthStatus(month);
    console.log('📅 Статус месяца:', isClosed);
    if (isClosed) {
      return NextResponse.json({ 
        error: 'Месяц закрыт, добавление выплат запрещено' 
      }, { status: 403 });
    }

    // Создаем выплату
    console.log('💰 Создаем выплату...');
    const payout = await createPayout({
      user_id: user.id!,
      month,
      amount: parseFloat(amount),
      date,
      comment: comment || ''
    });
    console.log('✅ Выплата создана:', payout);

    // Обрабатываем возможный перенос переплаты
    console.log('🔄 Обрабатываем переносы переплат...');
    try {
      await processOverpaymentCarryover(user.id!, month, date);
      console.log('✅ Переносы обработаны');
    } catch (carryoverError) {
      console.error('⚠️ Ошибка при обработке переносов:', carryoverError);
      // Не прерываем выполнение, так как выплата уже создана
    }

    return NextResponse.json({ payout });
  } catch (error) {
    console.error('❌ Ошибка при создании выплаты:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}