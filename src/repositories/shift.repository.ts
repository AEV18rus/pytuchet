// ============================================================================
// Shift Repository - Чистый слой доступа к данным смен
// ============================================================================

import { executeQuery } from '@/lib/db-client';
import type { Shift } from '@/types/database';

/**
 * Получить смены (все или для конкретного пользователя)
 */
export async function getShifts(userId?: number): Promise<Shift[]> {
    try {
        if (userId) {
            const result = await executeQuery('SELECT * FROM shifts WHERE user_id = $1 ORDER BY date DESC, id DESC', [userId]);
            return result.rows as Shift[];
        } else {
            const result = await executeQuery('SELECT * FROM shifts ORDER BY date DESC, id DESC');
            return result.rows as Shift[];
        }
    } catch (error) {
        console.error('Ошибка при получении смен:', error);
        throw error;
    }
}

/**
 * Получить смены с информацией о пользователях (JOIN)
 */
export async function getShiftsWithUsers(): Promise<any[]> {
    try {
        const result = await executeQuery(`
      SELECT 
        s.*,
        u.first_name,
        u.last_name,
        u.username,
        u.display_name,
        u.telegram_id
      FROM shifts s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.date DESC, s.id DESC
    `);
        return result.rows;
    } catch (error) {
        console.error('Ошибка при получении смен с пользователями:', error);
        throw error;
    }
}

/**
 * Добавить новую смену
 */
export async function addShift(shift: Omit<Shift, 'id' | 'created_at'>): Promise<void> {
    try {
        await executeQuery(`
      INSERT INTO shifts (user_id, date, hours, steam_bath, brand_steam, intro_steam, scrubbing, zaparnik, masters, total, hourly_rate, steam_bath_price, brand_steam_price, intro_steam_price, scrubbing_price, zaparnik_price, services, service_prices)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [shift.user_id, shift.date, shift.hours, shift.steam_bath, shift.brand_steam, shift.intro_steam, shift.scrubbing, shift.zaparnik, shift.masters, shift.total, shift.hourly_rate, shift.steam_bath_price, shift.brand_steam_price, shift.intro_steam_price, shift.scrubbing_price, shift.zaparnik_price, shift.services || null, shift.service_prices || null]);
    } catch (error) {
        console.error('Ошибка при добавлении смены:', error);
        throw error;
    }
}

/**
 * Удалить смену
 */
export async function deleteShift(id: number, userId: number): Promise<void> {
    try {
        await executeQuery('DELETE FROM shifts WHERE id = $1 AND user_id = $2', [id, userId]);
    } catch (error) {
        console.error('Ошибка при удалении смены:', error);
        throw error;
    }
}

/**
 * Получить смену по ID
 */
export async function getShiftById(id: number): Promise<Shift | null> {
    try {
        const result = await executeQuery('SELECT * FROM shifts WHERE id = $1', [id]);
        return result.rows.length > 0 ? (result.rows[0] as Shift) : null;
    } catch (error) {
        console.error('Ошибка при получении смены по ID:', error);
        throw error;
    }
}

/**
 * Получить смены для конкретного пользователя и месяца
 */
export async function getShiftsForUserAndMonth(userId: number, month: string): Promise<Shift[]> {
    try {
        const result = await executeQuery(`
      SELECT * FROM shifts 
      WHERE user_id = $1 
      AND date LIKE $2
      ORDER BY date DESC
    `, [userId, `${month}%`]);
        return result.rows as Shift[];
    } catch (error) {
        console.error('Ошибка при получении смен для пользователя и месяца:', error);
        throw error;
    }
}

/**
 * Получить общую сумму заработка
 */
export async function getTotalEarnings(userId: number): Promise<number> {
    try {
        const result = await executeQuery(
            'SELECT COALESCE(SUM(total), 0) as total_earnings FROM shifts WHERE user_id = $1',
            [userId]
        );
        return parseFloat(result.rows[0]?.total_earnings || '0');
    } catch (error) {
        console.error('Ошибка при получении общего заработка:', error);
        throw error;
    }
}

/**
 * Получить накопленный заработок до определенной даты (включительно)
 */
export async function getCumulativeEarnings(userId: number, date: string): Promise<number> {
    try {
        const result = await executeQuery(
            'SELECT COALESCE(SUM(total), 0) as cumulative_earnings FROM shifts WHERE user_id = $1 AND date <= $2',
            [userId, date]
        );
        return parseFloat(result.rows[0]?.cumulative_earnings || '0');
    } catch (error) {
        console.error('Ошибка при получении накопленного заработка:', error);
        throw error;
    }
}
