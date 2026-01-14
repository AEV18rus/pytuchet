import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseInitialized } from '@/lib/global-init';
import { requireAdmin } from '@/lib/auth-server';
import {
  createSimplePayout,
  getUserById,
  getUserBalance,
  getTotalEarnings,
  getTotalPayouts,
  getAllPayoutsForUser
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId обязателен' },
        { status: 400 }
      );
    }

    const payouts = await getAllPayoutsForUser(Number(userId));

    return NextResponse.json({ payouts });
  } catch (error) {
    console.error('Ошибка при получении выплат админом:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();
    const admin = await requireAdmin(request);

    const body = await request.json();
    const { userId, amount, method, comment, date, source } = body;

    if (!userId || amount === undefined) {
      return NextResponse.json(
        { error: 'userId и amount обязательны' },
        { status: 400 }
      );
    }

    const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Сумма должна быть положительным числом' },
        { status: 400 }
      );
    }

    const payoutDate = typeof date === 'string' && date.length > 0
      ? date
      : new Date().toISOString().split('T')[0];

    const targetUser = await getUserById(Number(userId));
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Получаем баланс до выплаты
    const balanceBefore = await getUserBalance(Number(userId));

    // Создаем простую выплату
    const payout = await createSimplePayout({
      user_id: Number(userId),
      amount: parsedAmount,
      date: payoutDate,
      comment: (comment ?? '').trim() || null,
      initiated_by: admin.id,
      initiator_role: 'admin',
      method: method || 'cash',
      source: source || 'admin:manual'
    });

    // Получаем данные после выплаты
    const totalEarnings = await getTotalEarnings(Number(userId));
    const totalPayouts = await getTotalPayouts(Number(userId));
    const balanceAfter = totalEarnings - totalPayouts;

    // Получаем последние 5 выплат для истории
    const allPayouts = await getAllPayoutsForUser(Number(userId));
    const history = allPayouts.slice(0, 5);

    return NextResponse.json({
      payout,
      balanceBefore,
      balanceAfter,
      isAdvance: balanceAfter < 0,
      summary: {
        totalEarnings,
        totalPayouts,
        balance: balanceAfter
      },
      history
    }, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании выплаты админом:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
