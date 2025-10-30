import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyReportsForAllMasters, getMonthsWithShiftsData } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Получаем все месяцы со сменами
    const allMonths = await getMonthsWithShiftsData();
    console.log('API: Все месяцы со сменами:', allMonths);
    
    // Фильтруем месяцы по диапазону, если указан
    let filteredMonths = allMonths;
    if (from || to) {
      const fromDate = from ? new Date(from + '-01') : new Date('2020-01-01');
      const toDate = to ? new Date(to + '-01') : new Date();
      
      filteredMonths = allMonths.filter(month => {
        const monthDate = new Date(month + '-01');
        return monthDate >= fromDate && monthDate <= toDate;
      });
    }

    // Получаем данные для каждого месяца
    const monthsData = await Promise.all(
      filteredMonths.map(async (month) => {
        const reports = await getMonthlyReportsForAllMasters(month);
        
        // Группируем данные по сотрудникам
        const employees = reports.map(report => ({
          id: report.user_id,
          name: report.display_name || `${report.first_name} ${report.last_name}`,
          earned: parseFloat(report.earnings) || 0,
          paid: parseFloat(report.total_payouts) || 0,
          outstanding: parseFloat(report.remaining) || 0,
        }));

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
          month,
          employees: employees.filter(emp => emp.earned > 0), // Фильтруем сотрудников без смен
          totalEarned,
          totalPaid,
          totalOutstanding,
          status,
        };
      })
    );

    // Фильтруем месяцы без смен и сортируем по убыванию
    const result = monthsData
      .filter(month => month.employees.length > 0)
      .sort((a, b) => b.month.localeCompare(a.month));

    console.log('API: Результат отчетов:', JSON.stringify(result, null, 2));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}