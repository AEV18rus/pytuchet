import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseInitialized } from '@/lib/global-init';
import { requireAdmin } from '@/lib/auth-server';
import {
  getPayoutById,
  deletePayoutForce,
  getEarningsForMonth,
  getPayoutsForMonth,
  getPayoutHistoryForUserAndMonth
} from '@/lib/db';

type RouteParams = {
  id: string;
};

type RouteContext =
  | { params: RouteParams }
  | { params: Promise<RouteParams> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await ensureDatabaseInitialized();
    await requireAdmin(request);

    const resolvedParams = await Promise.resolve(context.params);

    const payoutId = Number(resolvedParams?.id);
    if (Number.isNaN(payoutId)) {
      return NextResponse.json({ error: 'Некорректный ID выплаты' }, { status: 400 });
    }

    const existing = await getPayoutById(payoutId);
    if (!existing) {
      return NextResponse.json({ error: 'Выплата не найдена' }, { status: 404 });
    }

    const deleted = await deletePayoutForce(payoutId);
    if (!deleted) {
      return NextResponse.json({ error: 'Не удалось удалить выплату' }, { status: 400 });
    }

    const earnings = await getEarningsForMonth(existing.user_id, existing.month);
    const totalPaid = await getPayoutsForMonth(existing.user_id, existing.month);
    const remaining = Math.max(0, earnings - totalPaid);
    const history = await getPayoutHistoryForUserAndMonth(existing.user_id, existing.month, 5);

    return NextResponse.json({
      payout: existing,
      summary: { earnings, totalPaid, remaining },
      history
    });
  } catch (error) {
    console.error('Ошибка при удалении выплаты админом:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
