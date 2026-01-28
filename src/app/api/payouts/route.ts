import { NextRequest, NextResponse } from 'next/server';
import {
  getPayoutsDataWithGlobalBalance,
  createSimplePayout,
  getUserBalance
} from '@/lib/db';
import { getUserFromRequest, requireMasterForMutation } from '@/lib/auth-server';
import { ensureDatabaseInitialized } from '@/lib/global-init';

// GET /api/payouts - получить все выплаты пользователя с глобальным балансом
export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Используем новую функцию с глобальным балансом
    const data = await getPayoutsDataWithGlobalBalance(user.id!);

    return NextResponse.json({
      globalBalance: data.globalBalance,
      totalEarnings: data.totalEarnings,
      totalPayouts: data.totalPayouts,
      months: data.months,
      allPayouts: data.allPayouts
    });
  } catch (error) {
    console.error('Ошибка при получении выплат:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/payouts - создать новую выплату (простая, без привязки к месяцу)
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Начинаем создание выплаты...');
    await ensureDatabaseInitialized();
    console.log('✅ База данных инициализирована');

    // Разрешаем мутации только для мастера (админ/демо запрещены)
    try {
      await requireMasterForMutation(request);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await getUserFromRequest(request);
    console.log('👤 Пользователь:', user);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, date, comment } = body;
    console.log('📝 Данные выплаты:', { amount, date, comment });

    // Валидация
    if (!amount || !date) {
      return NextResponse.json({
        error: 'Сумма и дата обязательны'
      }, { status: 400 });
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json({
        error: 'Сумма должна быть больше 0'
      }, { status: 400 });
    }

    // Получаем текущий баланс для информации
    const balanceBefore = await getUserBalance(user.id!);

    // Создаем простую выплату
    console.log('💰 Создаем выплату...');
    const payout = await createSimplePayout({
      user_id: user.id!,
      amount: parseFloat(amount),
      date,
      comment: comment || null
    });
    console.log('✅ Выплата создана:', payout);

    // Получаем новый баланс
    const balanceAfter = await getUserBalance(user.id!);

    return NextResponse.json({
      payout,
      balanceBefore,
      balanceAfter,
      isAdvance: balanceAfter < 0
    });
  } catch (error) {
    console.error('❌ Ошибка при создании выплаты:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
