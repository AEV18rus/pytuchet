// ============================================================================
// Payout Repository - Базовый CRUD для выплат
// Сложная логика (FIFO, авансы, коррекция) будет в payout.service
// ============================================================================

import { executeQuery } from '@/lib/db-client';
import type { Payout } from '@/types/database';

/**
 * Создать простую выплату (без бизнес-логики)
 */
export async function createPayout(payout: Omit<Payout, 'id' | 'created_at'>): Promise<Payout> {
    try {
        const result = await executeQuery(
            `INSERT INTO payouts (
        user_id, 
        month, 
        amount, 
        date, 
        comment, 
        initiated_by, 
        initiator_role, 
        method, 
        source, 
        reversed_at,
        reversed_by,
        reversal_reason,
        is_advance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [
                payout.user_id,
                payout.month,
                payout.amount,
                payout.date,
                payout.comment ?? null,
                payout.initiated_by !== undefined ? payout.initiated_by : payout.user_id,
                payout.initiator_role ?? 'master',
                payout.method ?? null,
                payout.source ?? null,
                payout.reversed_at ?? null,
                payout.reversed_by ?? null,
                payout.reversal_reason ?? null,
                payout.is_advance ?? false
            ]
        );
        return result.rows[0] as Payout;
    } catch (error) {
        console.error('Ошибка при создании выплаты:', error);
        throw error;
    }
}

/**
 * Получить выплаты пользователя
 */
export async function getPayoutsByUser(userId: number): Promise<Payout[]> {
    try {
        const result = await executeQuery(
            'SELECT * FROM payouts WHERE user_id = $1 ORDER BY month DESC, date DESC',
            [userId]
        );
        return result.rows as Payout[];
    } catch (error) {
        console.error('Ошибка при получении выплат пользователя:', error);
        throw error;
    }
}

/**
 * Получить выплаты за месяц
 */
export async function getPayoutsByUserAndMonth(userId: number, month: string): Promise<Payout[]> {
    try {
        const result = await executeQuery(
            'SELECT * FROM payouts WHERE user_id = $1 AND month = $2 ORDER BY date DESC',
            [userId, month]
        );
        return result.rows as Payout[];
    } catch (error) {
        console.error('Ошибка при получении выплат за месяц:', error);
        throw error;
    }
}

/**
 * Удалить выплату
 */
export async function deletePayout(id: number, userId: number): Promise<boolean> {
    try {
        const result = await executeQuery(
            'DELETE FROM payouts WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        const rows = Array.isArray((result as any).rows) ? (result as any).rows : [];
        return rows.length > 0;
    } catch (error) {
        console.error('Ошибка при удалении выплаты:', error);
        throw error;
    }
}

/**
 * Получить выплату по ID
 */
export async function getPayoutById(id: number): Promise<Payout | null> {
    try {
        const result = await executeQuery('SELECT * FROM payouts WHERE id = $1', [id]);
        return result.rows.length > 0 ? (result.rows[0] as Payout) : null;
    } catch (error) {
        console.error('Ошибка при получении выплаты по ID:', error);
        throw error;
    }
}

/**
 * Принудительно удалить выплату (без проверки user_id)
 */
export async function deletePayoutForce(id: number): Promise<boolean> {
    try {
        const result = await executeQuery('DELETE FROM payouts WHERE id = $1 RETURNING id', [id]);
        const rows = Array.isArray((result as any).rows) ? (result as any).rows : [];
        return rows.length > 0;
    } catch (error) {
        console.error('Ошибка при принудительном удалении выплаты:', error);
        throw error;
    }
}

/**
 * Получить историю выплат для месяца (с лимитом)
 */
export async function getPayoutHistoryForUserAndMonth(
    userId: number,
    month: string,
    limit = 5
): Promise<Payout[]> {
    try {
        const result = await executeQuery(
            `SELECT * FROM payouts
       WHERE user_id = $1 AND month = $2
       ORDER BY date DESC, created_at DESC, id DESC
       LIMIT $3`,
            [userId, month, limit]
        );
        return result.rows as Payout[];
    } catch (error) {
        console.error('Ошибка при получении истории выплат:', error);
        throw error;
    }
}

/**
 * Пометить выплату как откатанную (reversed)
 */
export async function markPayoutReversed(
    payoutId: number,
    adminId: number,
    reason?: string
): Promise<Payout | null> {
    try {
        const result = await executeQuery(
            `UPDATE payouts
       SET reversed_at = COALESCE(reversed_at, CURRENT_TIMESTAMP),
           reversed_by = CASE WHEN reversed_at IS NULL THEN $2 ELSE reversed_by END,
           reversal_reason = CASE WHEN reversed_at IS NULL THEN COALESCE($3, reversal_reason) ELSE reversal_reason END
       WHERE id = $1
       RETURNING *`,
            [payoutId, adminId, reason ?? null]
        );
        return result.rows.length > 0 ? (result.rows[0] as Payout) : null;
    } catch (error) {
        console.error('Ошибка при пометке выплаты как откатанной:', error);
        throw error;
    }
}

/**
 * Получить сумму выплат за месяц (исключая откатанные)
 */
export async function getPayoutsAmountForMonth(userId: number, month: string): Promise<number> {
    try {
        const result = await executeQuery(
            `SELECT COALESCE(SUM(amount), 0) as total_payouts
       FROM payouts 
       WHERE user_id = $1 AND month = $2 AND reversed_at IS NULL`,
            [userId, month]
        );
        return parseFloat(result.rows[0]?.total_payouts || '0');
    } catch (error) {
        console.error('Ошибка при получении суммы выплат за месяц:', error);
        throw error;
    }
}

/**
 * Получить все выплаты (для использования в отчетах)
 */
export async function getAllPayoutsForUser(userId: number): Promise<Payout[]> {
    try {
        const result = await executeQuery(
            'SELECT * FROM payouts WHERE user_id = $1 AND reversed_at IS NULL ORDER BY date DESC',
            [userId]
        );
        return result.rows as Payout[];
    } catch (error) {
        console.error('Ошибка при получении всех выплат:', error);
        throw error;
    }
}

/**
 * Снять флаг аванса с выплаты
 */
export async function removeAdvanceFlag(payoutId: number): Promise<boolean> {
    try {
        const result = await executeQuery(
            'UPDATE payouts SET is_advance = FALSE WHERE id = $1 RETURNING id',
            [payoutId]
        );
        return (result.rowCount || 0) > 0;
    } catch (error) {
        console.error('Ошибка при снятии флага аванса:', error);
        throw error;
    }
}

/**
 * Получить общую сумму выплат пользователя (неотмененных)
 */
export async function getTotalPayouts(userId: number): Promise<number> {
    try {
        const result = await executeQuery(
            `SELECT COALESCE(SUM(amount), 0) as total_payouts 
             FROM payouts 
             WHERE user_id = $1 AND reversed_at IS NULL`,
            [userId]
        );
        return parseFloat(result.rows[0]?.total_payouts || '0');
    } catch (error) {
        console.error('Ошибка при получении общей суммы выплат:', error);
        throw error;
    }
}
