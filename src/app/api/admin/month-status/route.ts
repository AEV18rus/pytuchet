import { NextRequest, NextResponse } from 'next/server';
import * as monthRepo from '@/repositories/month.repository';
import { monthService } from '@/services/month.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (month) {
      const closed = await monthRepo.getMonthStatus(month);
      return NextResponse.json({ month, closed });
    }

    const statuses = await monthRepo.getMonthStatuses();
    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Ошибка при получении статуса месяца:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, closed } = body || {};

    if (!month || typeof closed !== 'boolean') {
      return NextResponse.json({ error: 'Нужны поля month и closed' }, { status: 400 });
    }

    await monthService.setMonthClosed(month, closed);
    return NextResponse.json({ success: true, status: { month, closed } });
  } catch (error) {
    console.error('Ошибка при обновлении статуса месяца:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}