// ============================================================================
// Carryover Repository - Работа с переносами между месяцами
// ============================================================================

import { executeQuery } from '@/lib/db-client';
import type { Carryover } from '@/types/database';

/**
 * Получить переносы В определенный месяц
 */
export async function getCarryoversToMonth(userId: number, month: string): Promise<Carryover[]> {
    try {
        const result = await executeQuery(
            'SELECT * FROM carryovers WHERE user_id = $1 AND to_month = $2 ORDER BY from_month',
            [userId, month]
        );
        return result.rows as Carryover[];
    } catch (error) {
        console.error('Ошибка при получении переносов в месяц:', error);
        throw error;
    }
}

/**
 * Получить переносы ИЗ определенного месяца
 */
export async function getCarryoversFromMonth(userId: number, month: string): Promise<Carryover[]> {
    try {
        const result = await executeQuery(
            'SELECT * FROM carryovers WHERE user_id = $1 AND from_month = $2 ORDER BY to_month',
            [userId, month]
        );
        return result.rows as Carryover[];
    } catch (error) {
        console.error('Ошибка при получении переносов из месяца:', error);
        throw error;
    }
}

/**
 * Создать запись переноса
 */
export async function createCarryover(carryover: Omit<Carryover, 'id' | 'created_at'>): Promise<void> {
    try {
        await executeQuery(
            `INSERT INTO carryovers (user_id, from_month, to_month, amount) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (user_id, from_month, to_month) 
       DO UPDATE SET amount = carryovers.amount + EXCLUDED.amount, created_at = CURRENT_TIMESTAMP`,
            [carryover.user_id, carryover.from_month, carryover.to_month, carryover.amount]
        );
    } catch (error) {
        console.error('Ошибка при создании переноса:', error);
        throw error;
    }
}

/**
 * Удалить перенос
 */
export async function deleteCarryover(userId: number, fromMonth: string, toMonth: string): Promise<boolean> {
    try {
        const result = await executeQuery(
            'DELETE FROM carryovers WHERE user_id = $1 AND from_month = $2 AND to_month = $3',
            [userId, fromMonth, toMonth]
        );
        return (result.rowCount || 0) > 0;
    } catch (error) {
        console.error('Ошибка при удалении переноса:', error);
        throw error;
    }
}
