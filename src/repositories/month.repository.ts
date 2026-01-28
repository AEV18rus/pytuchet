// ============================================================================
// Month Repository - Работа со статусами месяцев и агрегацией данных
// ============================================================================

import { executeQuery } from '@/lib/db-client';

/**
 * Получить статусы месяцев (закрыт/открыт)
 */
export async function getMonthStatuses(): Promise<{ month: string; closed: boolean }[]> {
    try {
        const result = await executeQuery('SELECT month, closed FROM month_status ORDER BY month DESC');
        return result.rows.map((row: any) => ({ month: row.month, closed: !!row.closed }));
    } catch (error) {
        console.error('Ошибка при получении статусов месяцев:', error);
        throw error;
    }
}

/**
 * Получить статус конкретного месяца
 */
export async function getMonthStatus(month: string): Promise<boolean> {
    try {
        const result = await executeQuery('SELECT closed FROM month_status WHERE month = $1', [month]);
        if (result.rows.length === 0) {
            return false; // По умолчанию месяц открыт
        }
        return !!result.rows[0].closed;
    } catch (error) {
        console.error('Ошибка при получении статуса месяца:', error);
        throw error;
    }
}

/**
 * Установить статус месяца (закрыт/открыт)
 */
export async function setMonthClosed(month: string, closed: boolean): Promise<{ month: string; closed: boolean }> {
    try {
        const result = await executeQuery(
            `INSERT INTO month_status (month, closed, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (month) DO UPDATE SET closed = EXCLUDED.closed, updated_at = CURRENT_TIMESTAMP
       RETURNING month, closed`,
            [month, closed]
        );
        return { month: result.rows[0].month, closed: !!result.rows[0].closed };
    } catch (error) {
        console.error('Ошибка при установке статуса месяца:', error);
        throw error;
    }
}

/**
 * Получить месяцы со сменами для пользователя
 */
export async function getMonthsWithShifts(userId: number): Promise<string[]> {
    try {
        const result = await executeQuery(
            `SELECT DISTINCT 
         TO_CHAR(TO_DATE(date, 'YYYY-MM-DD'), 'YYYY-MM') as month
       FROM shifts 
       WHERE user_id = $1 
       ORDER BY month DESC`,
            [userId]
        );
        return result.rows.map(row => row.month);
    } catch (error) {
        console.error('Ошибка при получении месяцев со сменами:', error);
        throw error;
    }
}

/**
 * Получить заработок за месяц
 */
export async function getEarningsForMonth(userId: number, month: string): Promise<number> {
    try {
        const result = await executeQuery(
            `SELECT COALESCE(SUM(total), 0) as total_earnings
       FROM shifts 
       WHERE user_id = $1 
       AND TO_CHAR(TO_DATE(date, 'YYYY-MM-DD'), 'YYYY-MM') = $2`,
            [userId, month]
        );
        return parseFloat(result.rows[0]?.total_earnings || '0');
    } catch (error) {
        console.error('Ошибка при получении заработка за месяц:', error);
        throw error;
    }
}

/**
 * Получить все месяцы со сменами (для всех пользователей)
 */
export async function getAllMonthsWithShifts(): Promise<{ month: string; user_id: number }[]> {
    try {
        const result = await executeQuery(
            `SELECT DISTINCT TO_CHAR(TO_DATE(date, 'YYYY-MM-DD'), 'YYYY-MM') as month, user_id
       FROM shifts
       ORDER BY month ASC`
        );
        return result.rows as { month: string; user_id: number }[];
    } catch (error) {
        console.error('Ошибка при получении всех месяцев со сменами:', error);
        throw error;
    }
}

/**
 * Получить итоги месяца (заработано/выплачено/остаток)
 */
export async function getMonthTotals(month: string): Promise<{ earned: number; paid: number; remaining: number }> {
    try {
        const earnedResult = await executeQuery(
            `SELECT COALESCE(SUM(total), 0) as earned
             FROM shifts 
             WHERE TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') = $1`,
            [month]
        );

        const paidResult = await executeQuery(
            `SELECT COALESCE(SUM(amount), 0) as paid
             FROM payouts 
             WHERE month = $1 AND reversed_at IS NULL`,
            [month]
        );

        const earned = parseFloat(earnedResult.rows[0]?.earned || '0');
        const paid = parseFloat(paidResult.rows[0]?.paid || '0');
        const remaining = earned - paid;
        return { earned, paid, remaining };
    } catch (error) {
        console.error('Ошибка при получении итогов месяца:', error);
        throw error;
    }
}

/**
 * Получить список месяцев со сменами (только месяцы, без user_id)
 */
export async function getMonthsWithShiftsData(): Promise<string[]> {
    try {
        const result = await executeQuery(
            `SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') as month
             FROM shifts 
             ORDER BY month DESC`,
            []
        );
        return result.rows.map((row: any) => row.month);
    } catch (error) {
        console.error('Ошибка при получении месяцев со сменами:', error);
        throw error;
    }
}
