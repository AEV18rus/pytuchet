// ============================================================================
// Report Service - Формирование отчётов с FIFO логикой
// ============================================================================

import { executeQuery } from '@/lib/db-client';
import { balanceService } from './balance.service';
import * as payoutRepo from '@/repositories/payout.repository';

// Типы для отчётов
interface MonthPayoutData {
    month: string;
    earnings: number;
    total_payouts: number;
    remaining: number;
    progress: number;
    status: string;
    payouts: any[];
}

interface PayoutsDataWithGlobalBalance {
    globalBalance: number;
    totalEarnings: number;
    totalPayouts: number;
    months: MonthPayoutData[];
    allPayouts: any[];
}

interface EmployeeReportData {
    user_id: number;
    first_name: string;
    last_name: string;
    display_name: string;
    earnings: number;
    total_payouts: number;
    remaining: number;
    recent_payouts: any[];
    global_balance: number;
    hours: number;
    steam_bath: number;
    brand_steam: number;
    intro_steam: number;
    scrubbing: number;
    zaparnik: number;
}

interface MonthReport {
    month: string;
    employees: EmployeeReportData[];
}

export class ReportService {
    /**
     * Получить данные о выплатах с глобальным балансом для мастера
     * Возвращает данные по месяцам со статусами по FIFO
     */
    async getPayoutsDataWithGlobalBalance(userId: number): Promise<PayoutsDataWithGlobalBalance> {
        try {
            // Получаем глобальные суммы
            const totalEarnings = await balanceService.getTotalEarnings(userId);
            const totalPayouts = await balanceService.getTotalPayouts(userId);
            const globalBalance = totalEarnings - totalPayouts;

            // Получаем все месяцы с заработком
            const monthsResult = await executeQuery(
                `SELECT 
          TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') as month,
          SUM(total) as earnings
         FROM shifts 
         WHERE user_id = $1
         GROUP BY month
         ORDER BY month ASC`,
                [userId]
            );

            // Получаем все выплаты пользователя
            const payoutsResult = await executeQuery(
                `SELECT 
          id, amount, date, comment, initiated_by, initiator_role, 
          method, source, reversed_at, reversed_by, reversal_reason, is_advance,
          TO_CHAR(date::date, 'YYYY-MM') as payout_month
         FROM payouts 
         WHERE user_id = $1
         ORDER BY date DESC, created_at DESC, id DESC`,
                [userId]
            );

            const allPayouts = payoutsResult.rows;

            // Вычисляем статусы месяцев по FIFO
            let cumulativeEarnings = 0;
            const monthsData: MonthPayoutData[] = [];

            for (const row of monthsResult.rows) {
                const monthEarnings = parseFloat(row.earnings);
                const previousEarnings = cumulativeEarnings;
                cumulativeEarnings += monthEarnings;

                // Сколько выплат "дошло" до этого месяца
                const payoutsAvailableForMonth = Math.max(0, totalPayouts - previousEarnings);

                // Сколько из этого месяца оплачено
                const paidAmount = Math.min(payoutsAvailableForMonth, monthEarnings);

                // Сколько осталось по этому месяцу
                const remainingAmount = Math.max(0, monthEarnings - paidAmount);

                // Прогресс в процентах
                const progress = monthEarnings > 0 ? Math.round((paidAmount / monthEarnings) * 100) : 0;

                // Статус
                let status: string;
                if (paidAmount >= monthEarnings && monthEarnings > 0) {
                    status = 'closed';
                } else if (paidAmount > 0) {
                    status = 'partial';
                } else {
                    status = 'unpaid';
                }

                // Получаем выплаты, связанные с этим месяцем (по дате)
                const monthPayouts = allPayouts.filter((p: any) => p.payout_month === row.month);

                monthsData.push({
                    month: row.month,
                    earnings: monthEarnings,
                    total_payouts: paidAmount,
                    remaining: remainingAmount,
                    progress,
                    status,
                    payouts: monthPayouts
                });
            }

            // Сортируем по месяцам в обратном порядке (новые сначала)
            monthsData.reverse();

            return {
                globalBalance,
                totalEarnings,
                totalPayouts,
                months: monthsData,
                allPayouts
            };
        } catch (error) {
            console.error('Ошибка при получении данных о выплатах с глобальным балансом:', error);
            throw error;
        }
    }

    /**
     * Получить отчёты для админа с глобальным балансом
     * Оптимизированная версия: 3 запроса вместо N*M
     */
    async getReportsWithGlobalBalanceOptimized(targetMonth?: string): Promise<MonthReport[]> {
        try {
            // 1. Получаем общие данные пользователей (всего заработано, всего выплачено)
            const usersResult = await executeQuery(`
        SELECT 
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.display_name,
          COALESCE(earnings.total, 0) as total_earnings,
          COALESCE(payouts.total, 0) as total_payouts
        FROM users u
        LEFT JOIN (
          SELECT user_id, SUM(total) as total
          FROM shifts
          GROUP BY user_id
        ) earnings ON u.id = earnings.user_id
        LEFT JOIN (
          SELECT user_id, SUM(amount) as total
          FROM payouts
          WHERE reversed_at IS NULL
          GROUP BY user_id
        ) payouts ON u.id = payouts.user_id
        WHERE (u.is_blocked = false OR u.is_blocked IS NULL)
        AND COALESCE(earnings.total, 0) > 0
        ORDER BY u.first_name, u.last_name
      `);

            const users = usersResult.rows;

            // 2. Получаем заработок по месяцам для всех пользователей разом
            const monthlyEarningsQuery = `
        SELECT 
          user_id,
          TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') as month,
          SUM(total) as month_earnings,
          SUM(hours) as hours,
          SUM(steam_bath) as steam_bath,
          SUM(brand_steam) as brand_steam,
          SUM(intro_steam) as intro_steam,
          SUM(scrubbing) as scrubbing,
          SUM(zaparnik) as zaparnik
        FROM shifts
        GROUP BY user_id, month
        ORDER BY month ASC
      `;

            const monthlyEarningsResult = await executeQuery(monthlyEarningsQuery);

            // Группируем заработки по пользователям: { userId: [{ month, earnings }, ...] }
            const userEarningsHistory: Record<number, {
                month: string;
                earnings: number;
                details: {
                    hours: number;
                    steam_bath: number;
                    brand_steam: number;
                    intro_steam: number;
                    scrubbing: number;
                    zaparnik: number;
                }
            }[]> = {};

            monthlyEarningsResult.rows.forEach((row: any) => {
                if (!userEarningsHistory[row.user_id]) {
                    userEarningsHistory[row.user_id] = [];
                }
                userEarningsHistory[row.user_id].push({
                    month: row.month,
                    earnings: parseFloat(row.month_earnings),
                    details: {
                        hours: parseFloat(row.hours || 0),
                        steam_bath: parseFloat(row.steam_bath || 0),
                        brand_steam: parseFloat(row.brand_steam || 0),
                        intro_steam: parseFloat(row.intro_steam || 0),
                        scrubbing: parseFloat(row.scrubbing || 0),
                        zaparnik: parseFloat(row.zaparnik || 0)
                    }
                });
            });

            // 3. Получаем последние выплаты для всех пользователей (Lateral Join)
            const recentPayoutsResult = await executeQuery(`
        SELECT * FROM (
          SELECT 
            id, user_id, amount, date, comment, initiated_by, 
            initiator_role, method, source, reversed_at, 
            reversed_by, reversal_reason, is_advance,
            ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY date DESC, id DESC) as rn
          FROM payouts
        ) sub
        WHERE rn <= 5
        ORDER BY user_id, date DESC
      `);

            // Группируем выплаты по пользователям
            const userPayoutsHistory: Record<number, any[]> = {};
            recentPayoutsResult.rows.forEach((row: any) => {
                if (!userPayoutsHistory[row.user_id]) {
                    userPayoutsHistory[row.user_id] = [];
                }
                userPayoutsHistory[row.user_id].push(row);
            });

            // 4. Формируем результат в памяти
            const reportDataByMonth: Record<string, EmployeeReportData[]> = {};

            for (const user of users) {
                const userId = user.user_id;
                const totalPayouts = parseFloat(user.total_payouts) || 0;
                const earningsHistory = userEarningsHistory[userId] || [];
                const recentPayouts = userPayoutsHistory[userId] || [];

                let cumulativeEarnings = 0;

                for (const record of earningsHistory) {
                    const month = record.month;
                    const monthEarnings = record.earnings;

                    // Накопленный заработок ДО этого месяца включительно
                    cumulativeEarnings += monthEarnings;

                    // Заработок ДО начала этого месяца
                    const previousEarnings = cumulativeEarnings - monthEarnings;

                    // Сколько выплат "дошло" до этого месяца по FIFO
                    const payoutsAvailableForMonth = Math.max(0, totalPayouts - previousEarnings);

                    // Сколько оплачено из этого месяца
                    const paidAmount = Math.min(payoutsAvailableForMonth, monthEarnings);

                    // Остаток по этому месяцу
                    const remainingAmount = Math.max(0, monthEarnings - paidAmount);

                    if (!reportDataByMonth[month]) {
                        reportDataByMonth[month] = [];
                    }

                    // Если запрошен конкретный месяц, добавляем только его, иначе все
                    if (!targetMonth || targetMonth === month) {
                        reportDataByMonth[month].push({
                            user_id: userId,
                            first_name: user.first_name,
                            last_name: user.last_name,
                            display_name: user.display_name,
                            earnings: monthEarnings,
                            total_payouts: paidAmount,
                            remaining: remainingAmount,
                            recent_payouts: recentPayouts,
                            global_balance: parseFloat(user.total_earnings) - parseFloat(user.total_payouts),
                            hours: record.details.hours,
                            steam_bath: record.details.steam_bath,
                            brand_steam: record.details.brand_steam,
                            intro_steam: record.details.intro_steam,
                            scrubbing: record.details.scrubbing,
                            zaparnik: record.details.zaparnik
                        });
                    }
                }
            }

            // Преобразуем объект в массив
            const result: MonthReport[] = Object.entries(reportDataByMonth).map(([month, employees]) => ({
                month,
                employees
            }));

            // Сортируем по месяцам в обратном порядке
            return result.sort((a, b) => b.month.localeCompare(a.month));

        } catch (error) {
            console.error('Ошибка при получении (оптимизированных) отчётов:', error);
            throw error;
        }
    }

    /**
     * Получить все выплаты пользователя (для истории)
     */
    async getAllPayoutsForUser(userId: number): Promise<any[]> {
        return payoutRepo.getAllPayoutsForUser(userId);
    }
}

export const reportService = new ReportService();
