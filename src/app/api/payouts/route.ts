import { NextRequest, NextResponse } from 'next/server';
import { 
  createPayout, 
  createPayoutWithCorrection,
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

    // Создаем выплату с корректировкой
    console.log('💰 Создаем выплату с корректировкой...');
    const result = await createPayoutWithCorrection({
      user_id: user.id!,
      month,
      amount: parseFloat(amount),
      date,
      comment: comment || ''
    });
    console.log('✅ Выплата создана:', result.payout);
    
    if (result.overpayment) {
      console.log(`🔄 Переплата ${result.overpayment} ₽ перенесена на следующий месяц`);
    }

    return NextResponse.json({ 
      payout: result.payout,
      overpayment: result.overpayment 
    });
  } catch (error) {
    console.error('❌ Ошибка при создании выплаты:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}