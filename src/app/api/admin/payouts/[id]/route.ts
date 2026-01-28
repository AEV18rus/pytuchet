import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseInitialized } from '@/lib/global-init';
import { requireAdmin } from '@/lib/auth-server';
import * as payoutRepo from '@/repositories/payout.repository';
import * as monthRepo from '@/repositories/month.repository';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseInitialized();
    await requireAdmin(request);

    const resolvedParams = await params;

    const payoutId = Number(resolvedParams?.id);
    if (Number.isNaN(payoutId)) {
      return NextResponse.json({ error: 'Некорректный ID выплаты' }, { status: 400 });
    }

    const existing = await payoutRepo.getPayoutById(payoutId);
    if (!existing) {
      return NextResponse.json({ error: 'Выплата не найдена' }, { status: 404 });
    }

    const deleted = await payoutRepo.deletePayoutForce(payoutId);
    if (!deleted) {
      return NextResponse.json({ error: 'Не удалось удалить выплату' }, { status: 400 });
    }

    const earnings = await monthRepo.getEarningsForMonth(existing.user_id, existing.month);
    const totalPaid = await payoutRepo.getPayoutsAmountForMonth(existing.user_id, existing.month);
    const remaining = Math.max(0, earnings - totalPaid);
    const history = await payoutRepo.getPayoutHistoryForUserAndMonth(existing.user_id, existing.month, 5);

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
