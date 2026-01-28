// ============================================================================
// DB Init Service - Инициализация таблиц базы данных
// ============================================================================

import { executeQuery } from '@/lib/db-client';

/**
 * Инициализация PostgreSQL таблиц
 */
export async function initDatabase() {
    try {
        // Создание таблицы пользователей
        await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT,
        username TEXT,
        display_name TEXT,
        role TEXT NOT NULL DEFAULT 'master',
        browser_login TEXT,
        password_hash TEXT,
        password_set_at TIMESTAMP,
        last_login_at TIMESTAMP,
        is_blocked BOOLEAN DEFAULT FALSE,
        blocked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Добавляем новые поля в существующую таблицу users, если их нет
        await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'master',
      ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS display_name TEXT,
      ADD COLUMN IF NOT EXISTS browser_login TEXT,
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP
    `);

        // Уникальный индекс для логина (допускает несколько NULL)
        await executeQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_browser_login ON users(browser_login)
    `);

        // Создание таблиц если их нет
        await executeQuery(`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        hours REAL NOT NULL,
        steam_bath INTEGER NOT NULL DEFAULT 0,
        brand_steam INTEGER NOT NULL DEFAULT 0,
        intro_steam INTEGER NOT NULL DEFAULT 0,
        scrubbing INTEGER NOT NULL DEFAULT 0,
        zaparnik INTEGER NOT NULL DEFAULT 0,
        masters INTEGER NOT NULL DEFAULT 1,
        total REAL NOT NULL,
        hourly_rate REAL NOT NULL,
        steam_bath_price REAL NOT NULL,
        brand_steam_price REAL NOT NULL,
        intro_steam_price REAL NOT NULL,
        scrubbing_price REAL NOT NULL,
        zaparnik_price REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Добавляем новые поля в существующую таблицу shifts, если их нет
        await executeQuery(`
      ALTER TABLE shifts 
      ADD COLUMN IF NOT EXISTS zaparnik INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS zaparnik_price REAL NOT NULL DEFAULT 0
    `);

        // Добавляем поля для динамических услуг
        await executeQuery(`
      ALTER TABLE shifts 
      ADD COLUMN IF NOT EXISTS services TEXT,
      ADD COLUMN IF NOT EXISTS service_prices TEXT
    `);

        await executeQuery(`
      CREATE TABLE IF NOT EXISTS prices (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        price REAL NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await executeQuery(`
      CREATE TABLE IF NOT EXISTS payouts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        comment TEXT,
        initiated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        initiator_role TEXT,
        method TEXT,
        source TEXT,
        reversed_at TIMESTAMP,
        reversed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reversal_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await executeQuery(`
      ALTER TABLE payouts
      ADD COLUMN IF NOT EXISTS initiated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS initiator_role TEXT,
      ADD COLUMN IF NOT EXISTS method TEXT,
      ADD COLUMN IF NOT EXISTS source TEXT,
      ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS reversed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
      ADD COLUMN IF NOT EXISTS is_advance BOOLEAN DEFAULT FALSE
    `);

        // Статус месяца (закрыт/открыт)
        await executeQuery(`
      CREATE TABLE IF NOT EXISTS month_status (
        month TEXT PRIMARY KEY,
        closed BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Таблица переносов переплат
        await executeQuery(`
      CREATE TABLE IF NOT EXISTS carryovers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        from_month TEXT NOT NULL,
        to_month TEXT NOT NULL,
        amount REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, from_month, to_month)
      )
    `);

        console.log('PostgreSQL tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}
