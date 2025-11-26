import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseInitialized } from '@/lib/global-init';
import { requireAdmin } from '@/lib/auth-server';
import {
  createPayoutWithCorrection,
  getEarningsForMonth,
  getPayoutsForMonth,
  getUserById,
  getPayoutHistoryForUserAndMonth
} from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();
    const admin = await requireAdmin(request);

    const body = await request.json();
    const { userId, month, amount, method, comment, date, source } = body;

    if (!userId || !month || amount === undefined) {
      return NextResponse.json(
        { error: 'userId, month и amount обязательны' },
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

    const { payout, overpayment } = await createPayoutWithCorrection({
      user_id: Number(userId),
      month,
      amount: parsedAmount,
      date: payoutDate,
      comment: (comment ?? '').trim() || null,
      initiated_by: admin.id,
      initiator_role: 'admin',
      method: method || 'cash',
      source: source || 'admin:manual'
    });

    const earnings = await getEarningsForMonth(Number(userId), month);
    const totalPaid = await getPayoutsForMonth(Number(userId), month);
    const remaining = Math.max(0, earnings - totalPaid);

    const history = await getPayoutHistoryForUserAndMonth(Number(userId), month, 5);

    return NextResponse.json({
      payout,
      overpayment,
      summary: {
        earnings,
        totalPaid,
        remaining
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
