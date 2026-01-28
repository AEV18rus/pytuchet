// ============================================================================
// User Repository - Чистый слой доступа к данным пользователей
// ============================================================================

import { executeQuery } from '@/lib/db-client';
import type { User } from '@/types/database';

/**
 * Получить пользователя по Telegram ID
 */
export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
    try {
        const result = await executeQuery('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
        return result.rows.length > 0 ? result.rows[0] as User : null;
    } catch (error) {
        console.error('Ошибка при получении пользователя:', error);
        throw error;
    }
}

/**
 * Создать нового пользователя
 */
export async function createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    try {
        const result = await executeQuery(`
      INSERT INTO users (telegram_id, first_name, last_name, username, display_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userData.telegram_id, userData.first_name, userData.last_name, userData.username, userData.display_name, userData.role ?? 'master']);
        return result.rows[0] as User;
    } catch (error) {
        console.error('Ошибка при создании пользователя:', error);
        throw error;
    }
}

/**
 * Обновить данные пользователя
 */
export async function updateUser(telegramId: number, userData: Partial<Omit<User, 'id' | 'telegram_id' | 'created_at'>>): Promise<User> {
    try {
        // Строим динамический запрос только для переданных полей
        const updates: string[] = [];
        const values: any[] = [telegramId];
        let paramIndex = 2;

        if (userData.first_name !== undefined) {
            updates.push(`first_name = $${paramIndex}`);
            values.push(userData.first_name);
            paramIndex++;
        }

        if (userData.last_name !== undefined) {
            updates.push(`last_name = $${paramIndex}`);
            values.push(userData.last_name);
            paramIndex++;
        }

        if (userData.username !== undefined) {
            updates.push(`username = $${paramIndex}`);
            values.push(userData.username);
            paramIndex++;
        }

        if (userData.display_name !== undefined) {
            updates.push(`display_name = $${paramIndex}`);
            values.push(userData.display_name);
            paramIndex++;
        }

        if (userData.role !== undefined) {
            updates.push(`role = $${paramIndex}`);
            values.push(userData.role);
            paramIndex++;
        }

        if (userData.browser_login !== undefined) {
            updates.push(`browser_login = $${paramIndex}`);
            values.push(userData.browser_login);
            paramIndex++;
        }

        if (userData.password_hash !== undefined) {
            updates.push(`password_hash = $${paramIndex}`);
            values.push(userData.password_hash);
            paramIndex++;
        }

        if (userData.password_set_at !== undefined) {
            updates.push(`password_set_at = $${paramIndex}`);
            values.push(userData.password_set_at);
            paramIndex++;
        }

        if (userData.last_login_at !== undefined) {
            updates.push(`last_login_at = $${paramIndex}`);
            values.push(userData.last_login_at);
            paramIndex++;
        }

        if (userData.is_blocked !== undefined) {
            updates.push(`is_blocked = $${paramIndex}`);
            values.push(userData.is_blocked);
            paramIndex++;
        }

        if (userData.blocked_at !== undefined) {
            updates.push(`blocked_at = $${paramIndex}`);
            values.push(userData.blocked_at);
            paramIndex++;
        }

        // Всегда обновляем updated_at
        updates.push('updated_at = CURRENT_TIMESTAMP');

        if (updates.length === 1) { // Только updated_at
            // Если нет полей для обновления, просто возвращаем текущего пользователя
            const result = await executeQuery('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
            return result.rows[0] as User;
        }

        const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE telegram_id = $1
      RETURNING *
    `;

        const result = await executeQuery(query, values);
        return result.rows[0] as User;
    } catch (error) {
        console.error('Ошибка при обновлении пользователя:', error);
        throw error;
    }
}

/**
 * Получить всех пользователей
 */
export async function getAllUsers(): Promise<User[]> {
    try {
        const result = await executeQuery('SELECT * FROM users ORDER BY created_at DESC', []);
        return result.rows as User[];
    } catch (error) {
        console.error('Ошибка при получении всех пользователей:', error);
        throw error;
    }
}

/**
 * Получить пользователя по browser_login
 */
export async function getUserByBrowserLogin(login: string): Promise<User | null> {
    try {
        const result = await executeQuery('SELECT * FROM users WHERE browser_login = $1', [login]);
        return result.rows.length > 0 ? (result.rows[0] as User) : null;
    } catch (error) {
        console.error('Ошибка при получении пользователя по логину:', error);
        throw error;
    }
}

/**
 * Получить пользователя по ID
 */
export async function getUserById(id: number): Promise<User | null> {
    try {
        const result = await executeQuery('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows.length > 0 ? (result.rows[0] as User) : null;
    } catch (error) {
        console.error('Ошибка при получении пользователя по ID:', error);
        throw error;
    }
}

/**
 * Заблокировать пользователя
 */
export async function blockUser(userId: number): Promise<User> {
    try {
        const result = await executeQuery(`
      UPDATE users 
      SET is_blocked = TRUE,
          blocked_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [userId]);
        return result.rows[0] as User;
    } catch (error) {
        console.error('Ошибка при блокировке пользователя:', error);
        throw error;
    }
}

/**
 * Разблокировать пользователя
 */
export async function unblockUser(userId: number): Promise<User> {
    try {
        const result = await executeQuery(`
      UPDATE users 
      SET is_blocked = FALSE,
          blocked_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [userId]);
        return result.rows[0] as User;
    } catch (error) {
        console.error('Ошибка при разблокировке пользователя:', error);
        throw error;
    }
}

/**
 * Удалить пользователя
 */
export async function deleteUser(userId: number): Promise<void> {
    try {
        // Сначала удаляем все смены пользователя (CASCADE должен это сделать автоматически, но для надежности)
        await executeQuery('DELETE FROM shifts WHERE user_id = $1', [userId]);
        // Затем удаляем самого пользователя
        await executeQuery('DELETE FROM users WHERE id = $1', [userId]);
    } catch (error) {
        console.error('Ошибка при удалении пользователя:', error);
        throw error;
    }
}

/**
 * Установить роль пользователя
 */
export async function setUserRole(userId: number, role: 'admin' | 'demo' | 'master'): Promise<User> {
    try {
        const result = await executeQuery(
            `
        UPDATE users
        SET role = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
            [userId, role]
        );
        return result.rows[0] as User;
    } catch (error) {
        console.error('Ошибка при назначении роли пользователю:', error);
        throw error;
    }
}

/**
 * Удалить всех пользователей кроме тестового (User Test)
 * ОПАСНАЯ ОПЕРАЦИЯ - используется только для тестирования
 */
export async function cleanupUsersExceptTest(): Promise<void> {
    try {
        // Сначала удаляем все смены пользователей, кроме User Test
        await executeQuery(
            'DELETE FROM shifts WHERE user_id NOT IN (SELECT id FROM users WHERE first_name = $1)',
            ['User Test']
        );

        // Затем удаляем всех пользователей, кроме User Test
        await executeQuery(
            'DELETE FROM users WHERE first_name != $1',
            ['User Test']
        );

        console.log('Users cleanup completed successfully');
    } catch (error) {
        console.error('Error during users cleanup:', error);
        throw error;
    }
}
