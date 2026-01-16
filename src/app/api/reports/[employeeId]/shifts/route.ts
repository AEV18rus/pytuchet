import { NextRequest, NextResponse } from 'next/server';
import { getShiftsForUserAndMonth, getMonthlyReportsForAllMasters } from '@/lib/db';

interface ShiftData {
  id: number;
  masterName: string;
  date: string;
  hours: number;
  steamBath: number;
  brandSteam: number;
  introSteam: number;
  scrubbing: number;
  zaparnik: number;
  masters: number;
  amount: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const resolvedParams = await params;
    const employeeId = parseInt(resolvedParams.employeeId);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM format

    if (isNaN(employeeId) || !month) {
      return NextResponse.json(
        { error: 'Employee ID and month are required' },
        { status: 400 }
      );
    }

    // Получаем смены сотрудника за указанный месяц
    const shifts = await getShiftsForUserAndMonth(employeeId, month);

    // Получаем информацию о пользователе из отчётов
    const reports = await getMonthlyReportsForAllMasters(month);
    const userReport = reports.find(report => report.user_id === employeeId);
    const masterName = userReport ?
      (userReport.display_name || `${userReport.first_name} ${userReport.last_name || ''}`.trim()) :
      'Неизвестный мастер';

    // Форматирование данных для новой структуры таблицы
    const formattedShifts: ShiftData[] = shifts.map(shift => {
      return {
        id: shift.id!,
        masterName: masterName,
        date: shift.date,
        hours: shift.hours,
        steamBath: shift.steam_bath || 0,      // П
        brandSteam: shift.brand_steam || 0,    // Ф
        introSteam: shift.intro_steam || 0,    // О
        scrubbing: shift.scrubbing || 0,       // С
        zaparnik: shift.zaparnik || 0,         // З
        masters: shift.masters || 1,           // МАСТЕРА
        amount: shift.total,                   // ИТОГО
      };
    });

    return NextResponse.json({ shifts: formattedShifts });
  } catch (error) {
    console.error('Error fetching employee shifts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee shifts' },
      { status: 500 }
    );
  }
}