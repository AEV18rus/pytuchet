// ============================================================================
// Price Repository - Чистый слой доступа к данным цен
// ============================================================================

import { executeQuery } from '@/lib/db-client';
import type { Price } from '@/types/database';

/**
 * Получить все цены
 */
export async function getPrices(): Promise<Price[]> {
    try {
        const result = await executeQuery('SELECT * FROM prices ORDER BY id');
        return result.rows as Price[];
    } catch (error) {
        console.error('Error getting prices:', error);
        throw error;
    }
}

/**
 * Добавить новую цену
 */
export async function addPrice(price: Omit<Price, 'id'>): Promise<Price> {
    try {
        const result = await executeQuery(
            'INSERT INTO prices (name, price) VALUES ($1, $2) RETURNING *',
            [price.name, price.price]
        );
        return result.rows[0] as Price;
    } catch (error) {
        console.error('Error adding price:', error);
        throw error;
    }
}

/**
 * Обновить цену
 */
export async function updatePrice(id: number, price: Omit<Price, 'id'>): Promise<Price> {
    try {
        const result = await executeQuery(
            'UPDATE prices SET name = $1, price = $2 WHERE id = $3 RETURNING *',
            [price.name, price.price, id]
        );
        return result.rows[0] as Price;
    } catch (error) {
        console.error('Error updating price:', error);
        throw error;
    }
}

/**
 * Удалить цену
 */
export async function deletePrice(id: number): Promise<void> {
    try {
        await executeQuery('DELETE FROM prices WHERE id = $1', [id]);
    } catch (error) {
        console.error('Error deleting price:', error);
        throw error;
    }
}
