import { NextRequest, NextResponse } from 'next/server';
import { deletePayout, getPayoutById, getMonthStatus } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-server';

// DELETE /api/payouts/[id] - удалить выплату
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const payoutId = parseInt(resolvedParams.id);
    if (isNaN(payoutId)) {
      return NextResponse.json({ error: 'Invalid payout ID' }, { status: 400 });
    }

    // Проверяем, существует ли выплата и принадлежит ли пользователю
    const payout = await getPayoutById(payoutId);
    if (!payout || payout.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Выплата не найдена или не принадлежит пользователю' 
      }, { status: 404 });
    }

    // Проверка: месяц закрыт?
    const isClosed = await getMonthStatus(payout.month);
    if (isClosed) {
      return NextResponse.json({ 
        error: 'Месяц закрыт, удаление выплат запрещено' 
      }, { status: 403 });
    }

    const success = await deletePayout(payoutId, user.id);
    
    if (!success) {
      return NextResponse.json({ 
        error: 'Выплата не найдена или не принадлежит пользователю' 
      }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении выплаты:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}