import { NextRequest, NextResponse } from 'next/server';
import { reportService } from '@/services/report.service';

type RawPayoutEntry = {
  id: number;
  amount: number | string;
  date: string;
  comment?: string;
  initiator_role?: 'admin' | 'master' | 'system' | null;
  initiated_by?: number | null;
  method?: string | null;
  source?: string | null;
  reversed_at?: string | null;
  reversed_by?: number | null;
  reversal_reason?: string | null;
  is_advance?: boolean;
};

type RawReportEmployee = {
  user_id: number;
  first_name: string;
  last_name: string;
  display_name?: string;
  earnings: number | string;
  total_payouts: number | string;
  remaining: number | string;
  recent_payouts?: RawPayoutEntry[];
  global_balance?: number;
};

type RawReportMonth = {
  month: string;
  employees: RawReportEmployee[];
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Если указан конкретный месяц, используем его
    const targetMonth = from && to && from === to ? from : undefined;

    // Получаем данные с новой логикой глобального баланса (ОПТИМИЗИРОВАННАЯ ВЕРСИЯ)
    const rawData = await reportService.getReportsWithGlobalBalanceOptimized(targetMonth) as unknown as RawReportMonth[];
    console.log('API: Получены отчёты с глобальным балансом (оптимизировано)');

    // Фильтруем по диапазону месяцев, если указан
    let filteredData = rawData;
    if (from || to) {
      const fromDate = from ? new Date(from + '-01') : new Date('2020-01-01');
      const toDate = to ? new Date(to + '-01') : new Date();

      filteredData = rawData.filter(item => {
        const monthDate = new Date(item.month + '-01');
        return monthDate >= fromDate && monthDate <= toDate;
      });
    }

    // Преобразуем данные в формат для фронтенда
    const monthsData = filteredData.map(item => {
      const employees = item.employees.map(emp => {
        const recentPayouts = Array.isArray(emp.recent_payouts)
          ? emp.recent_payouts.map((entry) => ({
            id: entry.id,
            amount: parseFloat(String(entry.amount)) || 0,
            date: entry.date,
            comment: entry.comment,
            initiator_role: entry.initiator_role,
            initiated_by: entry.initiated_by,
            method: entry.method,
            source: entry.source,
            reversed_at: entry.reversed_at,
            reversed_by: entry.reversed_by,
            reversal_reason: entry.reversal_reason,
            is_advance: entry.is_advance
          }))
          : [];

        return {
          id: emp.user_id,
          name: emp.display_name || `${emp.first_name} ${emp.last_name}`,
          earned: parseFloat(String(emp.earnings)) || 0,
          paid: parseFloat(String(emp.total_payouts)) || 0,
          outstanding: parseFloat(String(emp.remaining)) || 0,
          globalBalance: emp.global_balance,
          recentPayouts,
        };
      });

      // Вычисляем общие суммы
      const totalEarned = employees.reduce((sum, emp) => sum + emp.earned, 0);
      const totalPaid = employees.reduce((sum, emp) => sum + emp.paid, 0);
      const totalOutstanding = employees.reduce((sum, emp) => sum + emp.outstanding, 0);

      // Определяем статус месяца
      let status = 'open';
      if (totalOutstanding === 0) {
        status = 'closed';
      } else if (totalPaid > 0) {
        status = 'partial';
      }

      return {
        month: item.month,
        employees: employees.filter(emp => emp.earned > 0),
        totalEarned,
        totalPaid,
        totalOutstanding,
        status,
      };
    });

    // Фильтруем месяцы без сотрудников
    const result = monthsData.filter(month => month.employees.length > 0);

    console.log('API: Результат отчетов:', JSON.stringify(result, null, 2));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
