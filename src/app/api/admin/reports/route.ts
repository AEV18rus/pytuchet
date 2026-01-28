import { NextRequest, NextResponse } from 'next/server';
import { reportService } from '@/services/report.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    // Получаем данные через сервис (группированные по месяцам)
    const groupedReports = await reportService.getReportsWithGlobalBalanceOptimized(month || undefined);

    // Разворачиваем в плоский список для совместимости с админкой
    const reports = groupedReports.flatMap(group =>
      group.employees.map(emp => ({
        ...emp,
        month: group.month,
        status: emp.remaining <= 0 && emp.earnings > 0 ? 'completed' : (emp.total_payouts > 0 ? 'partial' : 'unpaid')
      }))
    );

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Ошибка при получении отчетов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении отчетов' },
      { status: 500 }
    );
  }
}