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
const useVercelPostgres = isVercel && hasVercelPostgres;

// Создаем клиент для Vercel Postgres
let vercelClient: any = null;

// Создаем пул подключений для локальной разработки
let localPool: Pool | null = null;

// Функция для получения клиента Vercel Postgres
function getVercelClient() {
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

// Типы для данных
export interface User {
  id?: number;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  display_name?: string;
  // Роль пользователя: admin, demo, master
  role?: 'admin' | 'demo' | 'master';
  // Поля для браузерной авторизации
  browser_login?: string;
  password_hash?: string;
  password_set_at?: string;
  last_login_at?: string;
  is_blocked?: boolean;
  blocked_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Shift {
  id?: number;
  user_id: number;
  date: string;
  hours: number;
  steam_bath: number;
  brand_steam: number;
  intro_steam: number;
  scrubbing: number;
  zaparnik: number;
  masters: number;
  total: number;
  // Цены на момент создания смены
  hourly_rate: number;
  steam_bath_price: number;
  brand_steam_price: number;
  intro_steam_price: number;
  scrubbing_price: number;
  zaparnik_price: number;
  // Новые поля для динамических услуг
  services?: string; // JSON строка с услугами
  service_prices?: string; // JSON строка с ценами услуг
  created_at?: string;
}

export interface Price {
  id?: number;
  name: string;
  price: number;
  updated_at?: string;
}

export interface Payout {
  id?: number;
  user_id: number;
  month: string; // Формат: YYYY-MM
  amount: number;
  date: string; // Дата выплаты
  comment?: string;
  initiated_by?: number | null;
  initiator_role?: 'admin' | 'master' | 'system' | null;
  method?: string | null;
  source?: string | null;
  reversed_at?: string | null;
  reversed_by?: number | null;
  reversal_reason?: string | null;
  is_advance?: boolean; // Помечает выплату как аванс (месяц не закрыт)
  created_at?: string;
}

export interface Carryover {
  id?: number;
  user_id: number;
  from_month: string; // Формат: YYYY-MM
  to_month: string; // Формат: YYYY-MM
  amount: number;
  created_at?: string;
}

// Инициализация PostgreSQL таблиц
async function initPostgres() {
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

// Функции для работы с пользователями
export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  try {
    const result = await executeQuery('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    return result.rows.length > 0 ? result.rows[0] as User : null;
  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    throw error;
  }
}

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

export async function getAllUsers(): Promise<User[]> {
  try {
    const result = await executeQuery('SELECT * FROM users ORDER BY created_at DESC', []);
    return result.rows as User[];
  } catch (error) {
    console.error('Ошибка при получении всех пользователей:', error);
    throw error;
  }
}

// Получить пользователя по browser_login
export async function getUserByBrowserLogin(login: string): Promise<User | null> {
  try {
    const result = await executeQuery('SELECT * FROM users WHERE browser_login = $1', [login]);
    return result.rows.length > 0 ? (result.rows[0] as User) : null;
  } catch (error) {
    console.error('Ошибка при получении пользователя по логину:', error);
    throw error;
  }
}

// Получить пользователя по ID
export async function getUserById(id: number): Promise<User | null> {
  try {
    const result = await executeQuery('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows.length > 0 ? (result.rows[0] as User) : null;
  } catch (error) {
    console.error('Ошибка при получении пользователя по ID:', error);
    throw error;
  }
}

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

// Установка роли пользователя по внутреннему ID
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

// Функции для работы со сменами
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

export async function deleteShift(id: number, userId: number): Promise<void> {
  try {
    await executeQuery('DELETE FROM shifts WHERE id = $1 AND user_id = $2', [id, userId]);
  } catch (error) {
    console.error('Ошибка при удалении смены:', error);
    throw error;
  }
}

// Получить смену по ID
export async function getShiftById(id: number): Promise<Shift | null> {
  try {
    const result = await executeQuery('SELECT * FROM shifts WHERE id = $1', [id]);
    return result.rows.length > 0 ? (result.rows[0] as Shift) : null;
  } catch (error) {
    console.error('Ошибка при получении смены по ID:', error);
    throw error;
  }
}

// Функции для работы с ценами
export async function getPrices(): Promise<Price[]> {
  try {
    const result = await executeQuery('SELECT * FROM prices ORDER BY id');
    return result.rows as Price[];
  } catch (error) {
    console.error('Error getting prices:', error);
    throw error;
  }
}

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

export async function deletePrice(id: number): Promise<void> {
  try {
    await executeQuery('DELETE FROM prices WHERE id = $1', [id]);
  } catch (error) {
    console.error('Error deleting price:', error);
    throw error;
  }
}

// Кэш для отслеживания инициализации базы данных
let isDbInitialized = false;
let initPromise: Promise<void> | null = null;

// Инициализация базы данных
export async function initDatabase(): Promise<void> {
  // Если база уже инициализирована, возвращаемся сразу
  if (isDbInitialized) {
    return;
  }

  // Если инициализация уже в процессе, ждем её завершения
  if (initPromise) {
    return initPromise;
  }

  // Создаем промис инициализации
  initPromise = performDatabaseInit();

  try {
    await initPromise;
    isDbInitialized = true;
  } catch (error) {
    // Сбрасываем промис при ошибке, чтобы можно было попробовать снова
    initPromise = null;
    throw error;
  }
}

async function performDatabaseInit(): Promise<void> {
  try {
    if (useVercelPostgres) {
      // Для Vercel Postgres используем sql.query для лучшей производительности
      console.log('Initializing Vercel Postgres database...');

      // Создание таблицы пользователей
      await sql.query(`
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
      await sql.query(`
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
      await sql.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_browser_login ON users(browser_login)
      `);

      // Создание таблицы shifts
      await sql.query(`
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
          zaparnik_price REAL NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Гарантируем наличие новых полей в существующей таблице (миграция)
      await sql.query(`
        ALTER TABLE shifts 
        ADD COLUMN IF NOT EXISTS zaparnik INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS zaparnik_price REAL NOT NULL DEFAULT 0
      `);

      // Создание таблицы prices
      await sql.query(`
        CREATE TABLE IF NOT EXISTS prices (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          price REAL NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Создание таблицы payouts
      await sql.query(`
        CREATE TABLE IF NOT EXISTS payouts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          month TEXT NOT NULL,
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          comment TEXT DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Статус месяца (закрыт/открыт)
      await sql.query(`
        CREATE TABLE IF NOT EXISTS month_status (
          month TEXT PRIMARY KEY,
          closed BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Проверяем, есть ли данные в таблице prices
      const pricesResult = await sql.query('SELECT COUNT(*) as count FROM prices');
      const pricesCount = pricesResult.rows[0].count;

      if (pricesCount === 0) {
        // Добавляем базовые цены
        await sql.query(`
          INSERT INTO prices (name, price) VALUES 
          ('Почасовая ставка', 400),
          ('Путевое парение', 3500),
          ('Фирменное парение', 4200),
          ('Ознакомительное парение', 2500),
          ('Скрабирование', 1200),
          ('Запарник', 800)
        `);
        console.log('Default prices inserted');
      }

      // Назначаем администратора по telegram_id, если пользователь существует
      try {
        await sql.query('UPDATE users SET role = $1 WHERE telegram_id = $2', ['admin', 7001686456]);
        console.log('Admin role assigned for telegram_id 7001686456 (if existed)');
        await sql.query('UPDATE users SET role = $1 WHERE telegram_id = $2', ['admin', 87654321]);
        console.log('Admin role assigned for fallback test telegram_id 87654321 (if existed)');
      } catch (e) {
        console.warn('Failed to assign admin by telegram_id on Vercel Postgres:', e);
      }

      console.log('Vercel Postgres database initialized successfully');
    } else {
      // Для локальной разработки используем старый метод
      await initPostgres();
      await initDefaultPrices();

      // Назначаем администратора по telegram_id, если пользователь существует (локальный Postgres)
      try {
        await executeQuery('UPDATE users SET role = $1 WHERE telegram_id = $2', ['admin', 7001686456]);
        console.log('Admin role assigned for telegram_id 7001686456 (if existed)');
        await executeQuery('UPDATE users SET role = $1 WHERE telegram_id = $2', ['admin', 87654321]);
        console.log('Admin role assigned for fallback test telegram_id 87654321 (if existed)');
      } catch (e) {
        console.warn('Failed to assign admin by telegram_id on local Postgres:', e);
      }
    }

    console.log('PostgreSQL tables initialized successfully');
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
    throw error;
  }
}

export async function initDefaultPrices(): Promise<void> {
  try {
    const defaultPrices = [
      { name: 'Почасовая ставка', price: 400 },
      { name: 'Путевое парение', price: 3500 },
      { name: 'Фирменное парение', price: 4200 },
      { name: 'Ознакомительное парение', price: 2500 },
      { name: 'Скрабирование', price: 1200 },
      { name: 'Запарник', price: 800 }
    ];

    for (const price of defaultPrices) {
      await executeQuery(
        'INSERT INTO prices (name, price) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [price.name, price.price]
      );
    }

    console.log('Default prices initialized successfully');
  } catch (error) {
    console.error('Error initializing default prices:', error);
    throw error;
  }
}

// Функция для очистки пользователей (оставляем только User Test)
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

// Функции для работы с выплатами
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

// Новая функция для создания выплат с корректировкой сумм и поддержкой авансов
export async function createPayoutWithCorrection(payout: Omit<Payout, 'id' | 'created_at'>): Promise<{ payout: Payout; overpayment?: number }> {
  try {
    // Получаем заработок за месяц
    const monthlyEarnings = await getEarningsForMonth(payout.user_id, payout.month);

    // Получаем уже существующие выплаты за месяц
    const existingPayouts = await getPayoutsForMonth(payout.user_id, payout.month);

    // Вычисляем оставшуюся сумму для выплат
    const remainingEarnings = monthlyEarnings - existingPayouts;

    // Проверяем, закрыт ли месяц
    const isClosed = await isMonthClosed(payout.month);

    // Если выплата превышает оставшийся заработок
    if (payout.amount > remainingEarnings) {
      if (!isClosed) {
        // СЦЕНАРИЙ: АВАНС (месяц не закрыт)
        // Создаем выплату на полную сумму, помечаем как аванс
        console.log(`Создание аванса для ${payout.user_id} в ${payout.month}: ${payout.amount} ₽ (заработок ${monthlyEarnings} ₽, выплачено ${existingPayouts} ₽)`);

        const advancePayout = {
          ...payout,
          is_advance: true
        };

        const createdPayout = await createPayout(advancePayout);

        return {
          payout: createdPayout,
          overpayment: 0 // Технически переплаты нет, это аванс
        };
      } else {
        // СЦЕНАРИЙ: ПЕРЕПЛАТА (месяц закрыт)
        // Старая логика: разбиваем на выплату и перенос
        const actualAmount = Math.max(0, remainingEarnings);
        const overpayment = payout.amount - actualAmount;

        console.log(`Создание переплаты для ${payout.user_id} в ${payout.month}: выплата ${actualAmount} ₽, перенос ${overpayment} ₽`);

        // Создаем выплату с скорректированной суммой (если она > 0)
        let createdPayout: Payout;

        if (actualAmount > 0) {
          createdPayout = await createPayout({
            ...payout,
            amount: actualAmount,
            is_advance: false
          });
        } else {
          // Если вся сумма уходит в перенос, создаем фиктивную запись для возврата (или берем первую часть переноса)
          // В данном случае лучше вернуть структуру, похожую на выплату
          createdPayout = { ...payout, amount: 0, id: 0 } as Payout;
        }

        // Создаем перенос на следующий месяц
        if (overpayment > 0) {
          await createCarryoverForOverpayment(payout, overpayment);
        }

        return {
          payout: createdPayout,
          overpayment: overpayment
        };
      }
    }

    // СЦЕНАРИЙ: ОБЫЧНАЯ ВЫПЛАТА (хватает заработка)
    const createdPayout = await createPayout({
      ...payout,
      is_advance: false
    });

    return {
      payout: createdPayout,
      overpayment: undefined
    };
  } catch (error) {
    console.error('Ошибка при создании выплаты с корректировкой:', error);
    throw error;
  }
}

// Вспомогательная функция для создания переноса переплаты
async function createCarryoverForOverpayment(
  originalPayout: Omit<Payout, 'id' | 'created_at'>,
  amount: number
): Promise<void> {
  try {
    // Вычисляем следующий месяц
    const [year, monthNumber] = originalPayout.month.split('-').map(Number);
    const nextDate = new Date(year, monthNumber, 1); // monthNumber уже 1-индексирован
    const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    // Создаем комментарий для переноса
    const monthNames = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const fromMonthName = monthNames[monthNumber - 1];
    const fromYear = year;
    const comment = `Перенос с ${fromMonthName} ${fromYear}`;

    // Создаем выплату-перенос в следующем месяце
    await createPayoutWithCorrection({
      user_id: originalPayout.user_id,
      month: nextMonth,
      amount: amount,
      date: originalPayout.date,
      comment: comment,
      initiated_by: originalPayout.initiated_by,
      initiator_role: originalPayout.initiator_role,
      method: originalPayout.method,
      source: 'carryover'
    });
  } catch (error) {
    console.error('Ошибка при создании переноса переплаты:', error);
    throw error;
  }
}

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

// Получить выплату по ID
export async function getPayoutById(id: number): Promise<Payout | null> {
  try {
    const result = await executeQuery('SELECT * FROM payouts WHERE id = $1', [id]);
    return result.rows.length > 0 ? (result.rows[0] as Payout) : null;
  } catch (error) {
    console.error('Ошибка при получении выплаты по ID:', error);
    throw error;
  }
}

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

// --- Статус месяца (закрыт/открыт) ---
export async function getMonthStatuses(): Promise<{ month: string; closed: boolean }[]> {
  try {
    const result = await executeQuery('SELECT month, closed FROM month_status ORDER BY month DESC');
    return result.rows.map((row: any) => ({ month: row.month, closed: !!row.closed }));
  } catch (error) {
    console.error('Ошибка при получении статусов месяцев:', error);
    throw error;
  }
}

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

// Функция для получения месяцев с сменами для пользователя
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

// Функция для получения суммы заработка за месяц
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

// Функция для получения суммы выплат за месяц
export async function getPayoutsForMonth(userId: number, month: string): Promise<number> {
  try {
    const result = await executeQuery(
      `SELECT COALESCE(SUM(amount), 0) as total_payouts
       FROM payouts 
       WHERE user_id = $1 AND month = $2 AND reversed_at IS NULL`,
      [userId, month]
    );
    return parseFloat(result.rows[0]?.total_payouts || '0');
  } catch (error) {
    console.error('Ошибка при получении выплат за месяц:', error);
    throw error;
  }
}

// --- Функции для работы с авансами ---

/**
 * Проверяет, закончился ли месяц (по календарю или вручную закрыт)
 * @param month - месяц в формате YYYY-MM
 * @returns true если месяц закончился или закрыт вручную
 */
export async function isMonthClosed(month: string): Promise<boolean> {
  try {
    // Проверяем статус вручную закрытого месяца
    const manualStatus = await getMonthStatus(month);
    if (manualStatus) {
      return true;
    }

    // Проверяем по календарю: месяц закончился?
    const [year, monthNum] = month.split('-').map(Number);
    const lastDayOfMonth = new Date(year, monthNum, 0); // 0 = последний день предыдущего месяца
    const today = new Date();

    // Устанавливаем время на начало дня для корректного сравнения
    today.setHours(0, 0, 0, 0);
    lastDayOfMonth.setHours(23, 59, 59, 999);

    return today > lastDayOfMonth;
  } catch (error) {
    console.error('Ошибка при проверке закрытия месяца:', error);
    throw error;
  }
}

/**
 * Пересчитывает авансы после добавления/изменения смен в месяце
 * Обновляет статус выплат: если заработок покрыл аванс, убирает флаг is_advance
 * @param userId - ID пользователя
 * @param month - месяц в формате YYYY-MM
 */
export async function recalculateAdvancesForMonth(userId: number, month: string): Promise<void> {
  try {
    // Получаем текущий заработок за месяц
    const earnings = await getEarningsForMonth(userId, month);

    // Получаем все авансы в этом месяце
    const result = await executeQuery(
      `SELECT id, amount FROM payouts 
       WHERE user_id = $1 AND month = $2 AND is_advance = TRUE AND reversed_at IS NULL
       ORDER BY created_at ASC`,
      [userId, month]
    );

    if (result.rows.length === 0) {
      return; // Нет авансов для пересчёта
    }

    let accumulatedPayouts = 0;

    for (const advance of result.rows as Payout[]) {
      accumulatedPayouts += advance.amount!;

      // Если заработок покрывает этот аванс
      if (earnings >= accumulatedPayouts) {
        // Убираем флаг аванса
        await executeQuery(
          `UPDATE payouts SET is_advance = FALSE WHERE id = $1`,
          [advance.id]
        );
        console.log(`Аванс ${advance.id} покрыт заработком. Сумма: ${advance.amount} ₽`);
      }
    }

    console.log(`Пересчёт авансов для месяца ${month} завершён. Заработок: ${earnings} ₽`);
  } catch (error) {
    console.error('Ошибка при пересчёте авансов:', error);
    throw error;
  }
}

/**
 * Автоматически закрывает месяцы, которые уже завершились по календарю
 * Обрабатывает авансы, превращая их в переносы
 */
export async function autoCloseFinishedMonths(): Promise<void> {
  try {
    // Получаем все месяцы со сменами
    const result = await executeQuery(
      `SELECT DISTINCT TO_CHAR(TO_DATE(date, 'YYYY-MM-DD'), 'YYYY-MM') as month, user_id
       FROM shifts
       ORDER BY month ASC`
    );

    const monthsToCheck = result.rows as { month: string; user_id: number }[];

    for (const { month, user_id } of monthsToCheck) {
      // Проверяем, закончился ли месяц по календарю
      const [year, monthNum] = month.split('-').map(Number);
      const lastDayOfMonth = new Date(year, monthNum, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      lastDayOfMonth.setHours(23, 59, 59, 999);

      if (today > lastDayOfMonth) {
        // Месяц закончился, проверяем не закрыт ли он уже
        const isClosed = await getMonthStatus(month);

        if (!isClosed) {
          console.log(`Автоматическое закрытие месяца ${month} для пользователя ${user_id}`);

          // Обрабатываем авансы перед закрытием
          await processMonthClosure(user_id, month);

          // Закрываем месяц
          await setMonthClosed(month, true);
        }
      }
    }
  } catch (error) {
    console.error('Ошибка при автоматическом закрытии месяцев:', error);
    throw error;
  }
}

/**
 * Обрабатывает авансы при закрытии месяца
 * Превращает авансы в переносы на следующий месяц
 * @param userId - ID пользователя
 * @param month - закрываемый месяц в формате YYYY-MM
 */
export async function processMonthClosure(userId: number, month: string): Promise<void> {
  try {
    const earnings = await getEarningsForMonth(userId, month);
    const totalPayouts = await getPayoutsForMonth(userId, month);

    // Проверяем, есть ли переплата
    if (totalPayouts <= earnings) {
      console.log(`Месяц ${month}: переплаты нет (${totalPayouts} ₽ <= ${earnings} ₽)`);
      return;
    }

    const overpayment = totalPayouts - earnings;
    console.log(`Месяц ${month}: переплата ${overpayment} ₽, создаём перенос на следующий месяц`);

    // Вычисляем следующий месяц
    const [year, monthNumber] = month.split('-').map(Number);
    const nextDate = new Date(year, monthNumber, 1); // monthNumber уже 1-индексирован
    const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    // Создаем комментарий для переноса
    const monthNames = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const fromMonthName = monthNames[monthNumber - 1];
    const comment = `Перенос с ${fromMonthName} ${year}`;

    // Получаем последнюю дату месяца для даты переноса
    const lastDay = new Date(year, monthNumber, 0);
    const payoutDate = `${year}-${String(monthNumber).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    // Создаём выплату-перенос в следующем месяце
    await createPayout({
      user_id: userId,
      month: nextMonth,
      amount: overpayment,
      date: payoutDate,
      comment: comment,
      initiated_by: null,
      initiator_role: 'system',
      method: 'carryover',
      source: 'carryover',
      reversed_at: null,
      is_advance: false // Перенос не является авансом
    });

    // Помечаем все авансы текущего месяца как закрытые (снимаем флаг is_advance)
    await executeQuery(
      `UPDATE payouts SET is_advance = FALSE 
       WHERE user_id = $1 AND month = $2 AND is_advance = TRUE`,
      [userId, month]
    );

    console.log(`Создан перенос: ${overpayment} ₽ в месяц ${nextMonth}`);
  } catch (error) {
    console.error('Ошибка при обработке закрытия месяца:', error);
    throw error;
  }
}


// Итоги за месяц по всем пользователям (заработано по сменам, выплачено, остаток)
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

// Оптимизированная функция для получения всех данных о выплатах одним запросом
export async function getPayoutsDataOptimized(userId: number): Promise<any[]> {
  try {
    const result = await executeQuery(
      `WITH monthly_earnings AS (
        SELECT 
          TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') as month,
          SUM(total) as earnings
        FROM shifts 
        WHERE user_id = $1
        GROUP BY month
      ),
      monthly_payouts AS (
        SELECT 
          month,
          -- Включаем все выплаты, но суммы учитываем только для неотмененных
          SUM(CASE WHEN reversed_at IS NULL THEN amount ELSE 0 END) as raw_total_payouts,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', id,
              'amount', amount,
              'date', date,
              'comment', comment,
              'initiated_by', initiated_by,
              'initiator_role', initiator_role,
              'method', method,
              'source', source,
              'reversed_at', reversed_at,
              'reversed_by', reversed_by,
              'reversal_reason', reversal_reason,
              'is_advance', is_advance
            )
            ORDER BY date DESC, created_at DESC, id DESC
          ) as payouts
        FROM payouts 
        WHERE user_id = $1
        GROUP BY month
      )
      SELECT 
        me.month,
        me.earnings,
        -- Реальная сумма всех выплат
        COALESCE(mp.raw_total_payouts, 0) as total_payouts_real,
        -- Сумма для отображения (не больше заработка)
        LEAST(COALESCE(mp.raw_total_payouts, 0), me.earnings) as total_payouts,
        -- Сумма аванса (если выплаты превышают заработок)
        GREATEST(0, COALESCE(mp.raw_total_payouts, 0) - me.earnings) as advance_amount,
        -- Остаток к выплате (если заработок больше выплат)
        GREATEST(0, me.earnings - COALESCE(mp.raw_total_payouts, 0)) as remaining,
        CASE 
          WHEN me.earnings > 0 THEN 
            ROUND((LEAST(COALESCE(mp.raw_total_payouts, 0), me.earnings) / me.earnings) * 100)
          ELSE 0 
        END as progress,
        CASE 
          WHEN COALESCE(mp.raw_total_payouts, 0) >= me.earnings THEN 'completed'
          WHEN COALESCE(mp.raw_total_payouts, 0) > 0 THEN 'partial'
          ELSE 'none'
        END as status,
        COALESCE(mp.payouts, '[]'::json) as payouts
      FROM monthly_earnings me
      LEFT JOIN monthly_payouts mp ON me.month = mp.month
      ORDER BY me.month DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Ошибка при получении оптимизированных данных о выплатах:', error);
    throw error;
  }
}

export async function getMonthlyReportsForAllMasters(month?: string): Promise<any[]> {
  try {
    if (month) {
      // Если указан конкретный месяц, возвращаем данные только для этого месяца
      const query = `
        WITH monthly_earnings AS (
          SELECT 
            s.user_id,
            u.first_name,
            u.last_name,
            u.display_name,
            $1 as month,
            SUM(s.hours) as hours,
            SUM(s.steam_bath) as steam_bath,
            SUM(s.brand_steam) as brand_steam,
            SUM(s.intro_steam) as intro_steam,
            SUM(s.scrubbing) as scrubbing,
            SUM(s.zaparnik) as zaparnik,
            SUM(s.total) as earnings
          FROM shifts s
          JOIN users u ON s.user_id = u.id
          WHERE (u.is_blocked = false OR u.is_blocked IS NULL)
          AND TO_CHAR(DATE_TRUNC('month', s.date::date), 'YYYY-MM') = $1
          GROUP BY s.user_id, u.first_name, u.last_name, u.display_name
        ),
        monthly_payouts AS (
          SELECT 
            p.user_id,
            SUM(CASE WHEN p.reversed_at IS NULL THEN p.amount ELSE 0 END) as raw_total_payouts
          FROM payouts p
          WHERE p.month = $1
          GROUP BY p.user_id
        )
        SELECT 
          me.user_id,
          me.first_name,
          me.last_name,
          me.display_name,
          me.month,
          me.hours,
          me.steam_bath,
          me.brand_steam,
          me.intro_steam,
          me.scrubbing,
          me.zaparnik,
          me.earnings,
          me.earnings,
          COALESCE(mp.raw_total_payouts, 0) as total_payouts,
          GREATEST(0, me.earnings - COALESCE(mp.raw_total_payouts, 0)) as remaining,
          CASE 
            WHEN COALESCE(mp.raw_total_payouts, 0) >= me.earnings THEN 'completed'
            WHEN COALESCE(mp.raw_total_payouts, 0) > 0 THEN 'partial'
            ELSE 'unpaid'
          END as status,
          COALESCE(rp.recent_payouts, '[]'::json) as recent_payouts
        FROM monthly_earnings me
        LEFT JOIN monthly_payouts mp ON me.user_id = mp.user_id
        LEFT JOIN LATERAL (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', payout_row.id,
              'amount', payout_row.amount,
              'date', payout_row.date,
              'comment', payout_row.comment,
              'initiated_by', payout_row.initiated_by,
              'initiator_role', payout_row.initiator_role,
              'method', payout_row.method,
              'source', payout_row.source,
              'reversed_at', payout_row.reversed_at,
              'reversed_by', payout_row.reversed_by,
              'reversal_reason', payout_row.reversal_reason,
              'is_advance', payout_row.is_advance
            )
            ORDER BY payout_row.date DESC, payout_row.created_at DESC, payout_row.id DESC
          ) as recent_payouts
          FROM (
            SELECT 
              p.id,
              p.amount,
              p.date,
              p.comment,
              p.initiated_by,
              p.initiator_role,
              p.method,
              p.source,
              p.reversed_at,
              p.reversed_by,
              p.reversal_reason,
              p.is_advance,
              p.created_at
            FROM payouts p
            WHERE p.user_id = me.user_id AND p.month = $1
            ORDER BY p.date DESC, p.created_at DESC, p.id DESC
            LIMIT 5
          ) payout_row
        ) rp ON true
        ORDER BY me.earnings DESC
      `;

      const result = await executeQuery(query, [month]);
      return result.rows;
    } else {
      // Если месяц не указан, возвращаем данные для всех месяцев
      const query = `
        WITH monthly_earnings AS (
          SELECT 
            s.user_id,
            u.first_name,
            u.last_name,
            u.display_name,
            TO_CHAR(DATE_TRUNC('month', s.date::date), 'YYYY-MM') as month,
            SUM(s.hours) as hours,
            SUM(s.steam_bath) as steam_bath,
            SUM(s.brand_steam) as brand_steam,
            SUM(s.intro_steam) as intro_steam,
            SUM(s.scrubbing) as scrubbing,
            SUM(s.zaparnik) as zaparnik,
            SUM(s.total) as earnings
          FROM shifts s
          JOIN users u ON s.user_id = u.id
          WHERE u.is_blocked = false OR u.is_blocked IS NULL
          GROUP BY s.user_id, u.first_name, u.last_name, u.display_name, month
        ),
        monthly_payouts AS (
          SELECT 
            p.user_id,
            p.month,
            SUM(CASE WHEN p.reversed_at IS NULL THEN p.amount ELSE 0 END) as raw_total_payouts
          FROM payouts p
          GROUP BY p.user_id, p.month
        )
        SELECT 
          me.user_id,
          me.first_name,
          me.last_name,
          me.display_name,
          me.month,
          me.hours,
          me.steam_bath,
          me.brand_steam,
          me.intro_steam,
          me.scrubbing,
          me.zaparnik,
          me.earnings,
          me.earnings,
          COALESCE(mp.raw_total_payouts, 0) as total_payouts,
          GREATEST(0, me.earnings - COALESCE(mp.raw_total_payouts, 0)) as remaining,
          CASE 
            WHEN COALESCE(mp.raw_total_payouts, 0) >= me.earnings THEN 'completed'
            WHEN COALESCE(mp.raw_total_payouts, 0) > 0 THEN 'partial'
            ELSE 'unpaid'
          END as status,
          COALESCE(rp.recent_payouts, '[]'::json) as recent_payouts
        FROM monthly_earnings me
        LEFT JOIN monthly_payouts mp ON me.user_id = mp.user_id AND me.month = mp.month
        LEFT JOIN LATERAL (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', payout_row.id,
              'amount', payout_row.amount,
              'date', payout_row.date,
              'comment', payout_row.comment,
              'initiated_by', payout_row.initiated_by,
              'initiator_role', payout_row.initiator_role,
              'method', payout_row.method,
              'source', payout_row.source,
              'reversed_at', payout_row.reversed_at,
              'reversed_by', payout_row.reversed_by,
              'reversal_reason', payout_row.reversal_reason,
              'is_advance', payout_row.is_advance
            )
            ORDER BY payout_row.date DESC, payout_row.created_at DESC, payout_row.id DESC
          ) as recent_payouts
          FROM (
            SELECT 
              p.id,
              p.amount,
              p.date,
              p.comment,
              p.initiated_by,
              p.initiator_role,
              p.method,
              p.source,
              p.reversed_at,
              p.reversed_by,
              p.reversal_reason,
              p.is_advance,
              p.created_at
            FROM payouts p
            WHERE p.user_id = me.user_id AND p.month = me.month
            ORDER BY p.date DESC, p.created_at DESC, p.id DESC
            LIMIT 5
          ) payout_row
        ) rp ON true
        ORDER BY me.month DESC, me.earnings DESC
      `;

      const result = await executeQuery(query, []);
      return result.rows;
    }
  } catch (error) {
    console.error('Ошибка при получении отчетов по мастерам:', error);
    throw error;
  }
}

export async function getShiftsForUserAndMonth(userId: number, month: string): Promise<Shift[]> {
  try {
    const result = await executeQuery(
      `SELECT * FROM shifts 
       WHERE user_id = $1 
       AND TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') = $2
       ORDER BY date DESC`,
      [userId, month]
    );
    return result.rows;
  } catch (error) {
    console.error('Ошибка при получении смен пользователя за месяц:', error);
    throw error;
  }
}

// Получить все месяцы, в которых есть смены
export async function getMonthsWithShiftsData(): Promise<string[]> {
  try {
    const result = await executeQuery(
      `SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') as month
       FROM shifts 
       ORDER BY month DESC`,
      []
    );
    return result.rows.map(row => row.month);
  } catch (error) {
    console.error('Ошибка при получении месяцев со сменами:', error);
    throw error;
  }
}

// Функции для работы с переносами переплат
export async function createCarryoverPayout(carryover: Omit<Carryover, 'id' | 'created_at'>, payoutDate: string): Promise<Payout> {
  try {
    // Создаем запись в таблице carryovers
    await executeQuery(
      `INSERT INTO carryovers (user_id, from_month, to_month, amount) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (user_id, from_month, to_month) 
       DO UPDATE SET amount = carryovers.amount + EXCLUDED.amount, created_at = CURRENT_TIMESTAMP`,
      [carryover.user_id, carryover.from_month, carryover.to_month, carryover.amount]
    );

    // Создаем выплату в следующем месяце
    const monthNames = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    const [year, month] = carryover.from_month.split('-');
    const monthIndex = parseInt(month) - 1;
    const monthName = monthNames[monthIndex];
    const comment = `Перенос с ${monthName} ${year}`;

    const payout = await createPayout({
      user_id: carryover.user_id,
      month: carryover.to_month,
      amount: carryover.amount,
      date: payoutDate,
      comment: comment,
      initiated_by: null,
      initiator_role: 'system',
      method: 'carryover',
      source: 'carryover',
      reversed_at: null
    });

    return payout;
  } catch (error) {
    console.error('Ошибка при создании переноса:', error);
    throw error;
  }
}

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

// Функция для получения следующего месяца
export function getNextMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const nextDate = new Date(year, monthNum, 1); // monthNum уже 0-based после split
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
}

// Функция для автоматического переноса переплаты на следующий месяц (каскадно)
export async function processOverpaymentCarryover(userId: number, month: string, payoutDate: string): Promise<void> {
  try {
    await processOverpaymentCarryoverOptimized(userId, month, payoutDate);
  } catch (error) {
    console.error('Ошибка при обработке переноса переплаты:', error);
    throw error;
  }
}

// Оптимизированная функция для обработки каскадных переносов
async function processOverpaymentCarryoverOptimized(
  userId: number,
  startMonth: string,
  payoutDate: string
): Promise<void> {
  let currentMonth = startMonth;
  let remainingOverpayment = 0;
  const maxIterations = 12; // Максимум 12 месяцев для предотвращения бесконечного цикла
  let iteration = 0;

  // Сначала вычисляем начальную переплату
  const initialEarnings = await getEarningsForMonth(userId, currentMonth);
  const initialPayouts = await getPayoutsForMonth(userId, currentMonth);

  if (initialPayouts <= initialEarnings) {
    console.log(`Месяц ${currentMonth}: переплаты нет (${initialPayouts} ₽ <= ${initialEarnings} ₽)`);
    return;
  }

  remainingOverpayment = initialPayouts - initialEarnings;
  console.log(`Начальная переплата в ${currentMonth}: ${remainingOverpayment} ₽`);

  // Создаем массив переносов для batch-обработки
  const carryoversToCreate = [];

  while (remainingOverpayment > 0 && iteration < maxIterations) {
    iteration++;
    const nextMonth = getNextMonth(currentMonth);

    // Получаем заработок следующего месяца
    const nextMonthEarnings = await getEarningsForMonth(userId, nextMonth);

    console.log(`Месяц ${nextMonth}: заработок ${nextMonthEarnings} ₽, нужно перенести ${remainingOverpayment} ₽`);

    // Создаем комментарий для переноса
    const monthNames = [
      'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
      'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
    ];

    const [currentYear, currentMonthNum] = currentMonth.split('-');
    const currentMonthIndex = parseInt(currentMonthNum) - 1;
    const currentMonthName = monthNames[currentMonthIndex];

    const carryoverComment = `Перенос с ${currentMonthName} ${currentYear}`;

    // Добавляем перенос в список для создания
    carryoversToCreate.push({
      user_id: userId,
      month: nextMonth,
      amount: remainingOverpayment,
      date: payoutDate,
      comment: carryoverComment,
      initiated_by: null,
      initiator_role: 'system' as const,
      method: 'carryover',
      source: 'carryover',
      reversed_at: null
    });

    // Если заработок следующего месяца покрывает всю переплату
    if (nextMonthEarnings >= remainingOverpayment) {
      console.log(`Переплата ${remainingOverpayment} ₽ полностью покрывается заработком ${nextMonthEarnings} ₽ в ${nextMonth}`);
      remainingOverpayment = 0;
    } else {
      // Если заработок не покрывает переплату, переносим остаток дальше
      remainingOverpayment = remainingOverpayment - nextMonthEarnings;
      console.log(`Заработок ${nextMonthEarnings} ₽ в ${nextMonth} не покрывает переплату, остается ${remainingOverpayment} ₽`);
      currentMonth = nextMonth;
    }
  }

  // Создаем все переносы
  for (const carryover of carryoversToCreate) {
    await createPayout(carryover);
    console.log(`Создан перенос: ${carryover.amount} ₽ в ${carryover.month}`);
  }

  if (iteration >= maxIterations) {
    console.warn(`Достигнуто максимальное количество итераций (${maxIterations}) при обработке переносов`);
  }
}

// ============================================================================
// НОВЫЙ ПОДХОД: ГЛОБАЛЬНЫЙ БАЛАНС
// ============================================================================
// Выплаты больше не привязываются к месяцам. Баланс = сумма всех заработков - сумма всех выплат.
// Статус месяца вычисляется по FIFO: выплаты закрывают месяцы по порядку.
// ============================================================================

/**
 * Получить общую сумму заработка пользователя (сумма всех смен)
 */
export async function getTotalEarnings(userId: number): Promise<number> {
  try {
    const result = await executeQuery(
      `SELECT COALESCE(SUM(total), 0) as total_earnings FROM shifts WHERE user_id = $1`,
      [userId]
    );
    return parseFloat(result.rows[0]?.total_earnings || '0');
  } catch (error) {
    console.error('Ошибка при получении общего заработка:', error);
    throw error;
  }
}

/**
 * Получить общую сумму выплат пользователя (сумма всех выплат, без откатанных)
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

/**
 * Получить глобальный баланс пользователя (заработок - выплаты)
 * Положительный баланс = должны мастеру
 * Отрицательный баланс = аванс (мастер получил больше, чем заработал)
 */
export async function getUserBalance(userId: number): Promise<number> {
  try {
    const earnings = await getTotalEarnings(userId);
    const payouts = await getTotalPayouts(userId);
    return earnings - payouts;
  } catch (error) {
    console.error('Ошибка при получении баланса пользователя:', error);
    throw error;
  }
}

/**
 * Получить накопленный заработок до конца указанного месяца (включительно)
 * Используется для определения статуса месяца по FIFO
 */
export async function getCumulativeEarningsUpToMonth(userId: number, month: string): Promise<number> {
  try {
    // Получаем последний день месяца
    const [year, monthNum] = month.split('-').map(Number);
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const result = await executeQuery(
      `SELECT COALESCE(SUM(total), 0) as cumulative_earnings 
       FROM shifts 
       WHERE user_id = $1 AND date <= $2`,
      [userId, endDate]
    );
    return parseFloat(result.rows[0]?.cumulative_earnings || '0');
  } catch (error) {
    console.error('Ошибка при получении накопленного заработка:', error);
    throw error;
  }
}

/**
 * Получить заработок за конкретный месяц
 */
export async function getMonthEarnings(userId: number, month: string): Promise<number> {
  try {
    const result = await executeQuery(
      `SELECT COALESCE(SUM(total), 0) as month_earnings 
       FROM shifts 
       WHERE user_id = $1 
       AND TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') = $2`,
      [userId, month]
    );
    return parseFloat(result.rows[0]?.month_earnings || '0');
  } catch (error) {
    console.error('Ошибка при получении заработка за месяц:', error);
    throw error;
  }
}

/**
 * Определить статус месяца по FIFO (закрыт/частично/не оплачен)
 * и сумму остатка по этому месяцу
 */
export async function getMonthStatusByBalance(
  userId: number,
  month: string
): Promise<{ status: 'closed' | 'partial' | 'unpaid'; paidAmount: number; remainingAmount: number }> {
  try {
    // Накопленный заработок до конца этого месяца
    const cumulativeEarnings = await getCumulativeEarningsUpToMonth(userId, month);

    // Все выплаты пользователя
    const totalPayouts = await getTotalPayouts(userId);

    // Заработок именно за этот месяц
    const monthEarnings = await getMonthEarnings(userId, month);

    // Сколько заработано ДО этого месяца
    const previousEarnings = cumulativeEarnings - monthEarnings;

    // Сколько выплат "дошло" до этого месяца
    const payoutsAvailableForMonth = Math.max(0, totalPayouts - previousEarnings);

    // Сколько из этого месяца оплачено
    const paidAmount = Math.min(payoutsAvailableForMonth, monthEarnings);

    // Сколько осталось по этому месяцу
    const remainingAmount = Math.max(0, monthEarnings - paidAmount);

    let status: 'closed' | 'partial' | 'unpaid';

    if (paidAmount >= monthEarnings && monthEarnings > 0) {
      status = 'closed';
    } else if (paidAmount > 0) {
      status = 'partial';
    } else {
      status = 'unpaid';
    }

    return { status, paidAmount, remainingAmount };
  } catch (error) {
    console.error('Ошибка при определении статуса месяца:', error);
    throw error;
  }
}

/**
 * Создать простую выплату (без привязки к месяцу, только дата и сумма)
 */
export async function createSimplePayout(payout: {
  user_id: number;
  amount: number;
  date: string;
  comment?: string | null;
  initiated_by?: number | null;
  initiator_role?: 'admin' | 'master' | 'system' | null;
  method?: string | null;
  source?: string | null;
}): Promise<Payout> {
  try {
    // Определяем месяц из даты для обратной совместимости
    const month = payout.date.substring(0, 7); // "YYYY-MM"

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
        is_advance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE) RETURNING *`,
      [
        payout.user_id,
        month,
        payout.amount,
        payout.date,
        payout.comment ?? null,
        payout.initiated_by ?? payout.user_id,
        payout.initiator_role ?? 'master',
        payout.method ?? null,
        payout.source ?? null
      ]
    );
    return result.rows[0] as Payout;
  } catch (error) {
    console.error('Ошибка при создании простой выплаты:', error);
    throw error;
  }
}

/**
 * Оптимизированная функция для получения данных о выплатах с глобальным балансом
 * Возвращает данные по месяцам со статусами по FIFO
 */
export async function getPayoutsDataWithGlobalBalance(userId: number): Promise<{
  globalBalance: number;
  totalEarnings: number;
  totalPayouts: number;
  months: any[];
}> {
  try {
    // Получаем глобальные суммы
    const totalEarnings = await getTotalEarnings(userId);
    const totalPayouts = await getTotalPayouts(userId);
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
    const monthsData = [];

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
      months: monthsData
    };
  } catch (error) {
    console.error('Ошибка при получении данных о выплатах с глобальным балансом:', error);
    throw error;
  }
}

/**
 * Получить все выплаты пользователя (для истории)
 */
export async function getAllPayoutsForUser(userId: number): Promise<Payout[]> {
  try {
    const result = await executeQuery(
      `SELECT * FROM payouts 
       WHERE user_id = $1 
       ORDER BY date DESC, created_at DESC, id DESC`,
      [userId]
    );
    return result.rows as Payout[];
  } catch (error) {
    console.error('Ошибка при получении всех выплат пользователя:', error);
    throw error;
  }
}

/**
 * Получить отчёты для админа с глобальным балансом
 * Статус месяца и остаток рассчитываются по FIFO
 */
export async function getReportsWithGlobalBalance(targetMonth?: string): Promise<any[]> {
  try {
    // Получаем всех активных пользователей с их заработками и выплатами
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
    `);

    const users = usersResult.rows;

    // Получаем месяцы с заработками
    let monthsQuery = `
      SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') as month
      FROM shifts
    `;
    const monthsParams: any[] = [];

    if (targetMonth) {
      monthsQuery += ` WHERE TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') = $1`;
      monthsParams.push(targetMonth);
    }

    monthsQuery += ` ORDER BY month ASC`;

    const monthsResult = await executeQuery(monthsQuery, monthsParams);
    const months = monthsResult.rows.map((r: any) => r.month);

    // Для каждого пользователя строим данные по месяцам с FIFO
    const result: any[] = [];

    for (const month of months) {
      const employeesData: any[] = [];

      for (const user of users) {
        const userId = user.user_id;
        const totalPayouts = parseFloat(user.total_payouts) || 0;

        // Получаем накопленный заработок до конца этого месяца
        const cumulativeResult = await executeQuery(`
          SELECT COALESCE(SUM(total), 0) as cumulative
          FROM shifts
          WHERE user_id = $1 
          AND date::date <= (DATE_TRUNC('month', $2::date) + INTERVAL '1 month - 1 day')::date
        `, [userId, month + '-01']);
        const cumulativeEarnings = parseFloat(cumulativeResult.rows[0]?.cumulative) || 0;

        // Заработок за этот месяц
        const monthResult = await executeQuery(`
          SELECT COALESCE(SUM(total), 0) as month_earnings
          FROM shifts
          WHERE user_id = $1 
          AND TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') = $2
        `, [userId, month]);
        const monthEarnings = parseFloat(monthResult.rows[0]?.month_earnings) || 0;

        if (monthEarnings === 0) continue; // Пропускаем месяцы без заработка

        // Заработок ДО этого месяца
        const previousEarnings = cumulativeEarnings - monthEarnings;

        // Сколько выплат "дошло" до этого месяца по FIFO
        const payoutsAvailableForMonth = Math.max(0, totalPayouts - previousEarnings);

        // Сколько оплачено из этого месяца
        const paidAmount = Math.min(payoutsAvailableForMonth, monthEarnings);

        // Остаток по этому месяцу
        const remainingAmount = Math.max(0, monthEarnings - paidAmount);

        // Получаем последние выплаты пользователя
        const payoutsResult = await executeQuery(`
          SELECT id, amount, date, comment, initiated_by, initiator_role, 
                 method, source, reversed_at, reversed_by, reversal_reason, is_advance
          FROM payouts
          WHERE user_id = $1
          ORDER BY date DESC, created_at DESC, id DESC
          LIMIT 5
        `, [userId]);

        employeesData.push({
          user_id: userId,
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name,
          earnings: monthEarnings,
          total_payouts: paidAmount,
          remaining: remainingAmount,
          recent_payouts: payoutsResult.rows,
          // Глобальные данные пользователя
          global_balance: parseFloat(user.total_earnings) - parseFloat(user.total_payouts)
        });
      }

      if (employeesData.length > 0) {
        result.push({
          month,
          employees: employeesData
        });
      }
    }

    // Сортируем по месяцам в обратном порядке
    return result.sort((a, b) => b.month.localeCompare(a.month));
  } catch (error) {
    console.error('Ошибка при получении отчётов с глобальным балансом:', error);
    throw error;
  }
}

/**
 * Получить отчёты для админа с глобальным балансом
 * Оптимизированная версия: 3 запроса вместо N*M
 */
export async function getReportsWithGlobalBalanceOptimized(targetMonth?: string): Promise<any[]> {
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
    let monthlyEarningsQuery = `
      SELECT 
        user_id,
        TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') as month,
        SUM(total) as month_earnings
      FROM shifts
      GROUP BY user_id, month
      ORDER BY month ASC
    `;

    // Если нужен конкретный месяц, фильтруем сразу, но для FIFO нам нужна вся история
    // Поэтому загружаем всё, а фильтруем при формировании результата

    const monthlyEarningsResult = await executeQuery(monthlyEarningsQuery);

    // Группируем заработки по пользователям: { userId: [{ month, earnings }, ...] }
    const userEarningsHistory: Record<number, { month: string; earnings: number }[]> = {};

    monthlyEarningsResult.rows.forEach((row: any) => {
      if (!userEarningsHistory[row.user_id]) {
        userEarningsHistory[row.user_id] = [];
      }
      userEarningsHistory[row.user_id].push({
        month: row.month,
        earnings: parseFloat(row.month_earnings)
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
    const reportDataByMonth: Record<string, any[]> = {};

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
            recent_payouts: recentPayouts, // Просто отдаём последние выплаты
            global_balance: parseFloat(user.total_earnings) - parseFloat(user.total_payouts)
          });
        }
      }
    }

    // Преобразуем объект в массив
    const result = Object.entries(reportDataByMonth).map(([month, employees]) => ({
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
