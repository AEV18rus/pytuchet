import { sql, createClient } from '@vercel/postgres';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Определяем среду выполнения
const isVercel = !!process.env.VERCEL;

// Проверяем наличие переменных окружения для Vercel Postgres
// Важно: локальная разработка часто использует DATABASE_URL, которая НЕ поддерживается @vercel/postgres.
// Поэтому DATABASE_URL не должна переключать нас в режим Vercel Postgres.
const hasVercelPostgres = !!(process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING);

// Используем Vercel Postgres ТОЛЬКО если реально присутствуют его переменные.
export const useVercelPostgres = isVercel && hasVercelPostgres;

// Создаем клиент для Vercel Postgres
let vercelClient: any = null;

// Создаем пул подключений для локальной разработки
let localPool: Pool | null = null;

// Функция для получения клиента Vercel Postgres
export function getVercelClient() {
    if (!vercelClient && useVercelPostgres) {
        // Проверяем наличие переменных окружения перед созданием клиента
        if (process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL) {
            vercelClient = createClient();
        }
    }
    return vercelClient;
}

// Инициализация локального пула только если не используем Vercel Postgres
if (!useVercelPostgres) {
    // Явно загружаем .env.local для локальной разработки
    try {
        dotenv.config({ path: '.env.local' });
    } catch { }
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (connectionString) {
        localPool = new Pool({ connectionString });
    }
}

// Функция для выполнения простых SQL запросов без параметров
async function executeSimpleQuery(query: string) {
    if (useVercelPostgres) {
        // Используем Vercel Postgres sql.query для лучшей производительности
        try {
            const result = await sql.query(query);
            return result;
        } catch (error) {
            console.error('Vercel Postgres query error:', error);
            throw error;
        }
    } else {
        // Используем обычный PostgreSQL для локальной разработки
        if (!localPool) {
            throw new Error('Local PostgreSQL pool not initialized');
        }
        const result = await localPool.query(query);
        return { rows: result.rows };
    }
}

// Функция для выполнения SQL запросов с параметрами
export async function executeQuery(query: string, params?: any[]) {
    if (useVercelPostgres) {
        // Используем Vercel Postgres sql template literal для лучшей производительности
        try {
            let result;
            if (params && params.length > 0) {
                // Для запросов с параметрами используем sql.query
                result = await sql.query(query, params);
            } else {
                // Для простых запросов без параметров
                result = await sql.query(query);
            }
            return result;
        } catch (error) {
            console.error('Vercel Postgres query error:', error);
            throw error;
        }
    } else {
        // Используем локальный PostgreSQL для разработки
        if (!localPool) {
            throw new Error('Database pool not initialized');
        }
        const result = await localPool.query(query, params);
        return result;
    }
}

// Экспортируем sql для использования в инициализации
export { sql };
