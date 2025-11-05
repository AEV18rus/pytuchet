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
  } catch {}
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
async function executeQuery(query: string, params?: any[]) {
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Статус месяца (закрыт/открыт)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS month_status (
        month TEXT PRIMARY KEY,
        closed BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      INSERT INTO shifts (user_id, date, hours, steam_bath, brand_steam, intro_steam, scrubbing, zaparnik, masters, total, hourly_rate, steam_bath_price, brand_steam_price, intro_steam_price, scrubbing_price, zaparnik_price)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [shift.user_id, shift.date, shift.hours, shift.steam_bath, shift.brand_steam, shift.intro_steam, shift.scrubbing, shift.zaparnik, shift.masters, shift.total, shift.hourly_rate, shift.steam_bath_price, shift.brand_steam_price, shift.intro_steam_price, shift.scrubbing_price, shift.zaparnik_price]);
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
      'INSERT INTO payouts (user_id, month, amount, date, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [payout.user_id, payout.month, payout.amount, payout.date, payout.comment]
    );
    return result.rows[0] as Payout;
  } catch (error) {
    console.error('Ошибка при создании выплаты:', error);
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
      'DELETE FROM payouts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount || 0) > 0;
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
       WHERE user_id = $1 AND month = $2`,
      [userId, month]
    );
    return parseFloat(result.rows[0]?.total_payouts || '0');
  } catch (error) {
    console.error('Ошибка при получении выплат за месяц:', error);
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
       WHERE month = $1`,
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
          SUM(amount) as total_payouts,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', id,
              'amount', amount,
              'date', date,
              'comment', comment
            ) ORDER BY date DESC
          ) as payouts
        FROM payouts 
        WHERE user_id = $1
        GROUP BY month
      )
      SELECT 
        me.month,
        me.earnings,
        COALESCE(mp.total_payouts, 0) as total_payouts,
        (me.earnings - COALESCE(mp.total_payouts, 0)) as remaining,
        CASE 
          WHEN me.earnings > 0 THEN ROUND((COALESCE(mp.total_payouts, 0) / me.earnings) * 100)
          ELSE 0 
        END as progress,
        CASE 
          WHEN COALESCE(mp.total_payouts, 0) >= me.earnings THEN 'completed'
          WHEN COALESCE(mp.total_payouts, 0) > 0 THEN 'partial'
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
            SUM(p.amount) as total_payouts
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
          COALESCE(mp.total_payouts, 0) as total_payouts,
          (me.earnings - COALESCE(mp.total_payouts, 0)) as remaining,
          CASE 
            WHEN (me.earnings - COALESCE(mp.total_payouts, 0)) = 0 THEN 'completed'
            WHEN COALESCE(mp.total_payouts, 0) > 0 THEN 'partial'
            ELSE 'unpaid'
          END as status
        FROM monthly_earnings me
        LEFT JOIN monthly_payouts mp ON me.user_id = mp.user_id
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
            SUM(p.amount) as total_payouts
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
          COALESCE(mp.total_payouts, 0) as total_payouts,
          (me.earnings - COALESCE(mp.total_payouts, 0)) as remaining,
          CASE 
            WHEN (me.earnings - COALESCE(mp.total_payouts, 0)) = 0 THEN 'completed'
            WHEN COALESCE(mp.total_payouts, 0) > 0 THEN 'partial'
            ELSE 'unpaid'
          END as status
        FROM monthly_earnings me
        LEFT JOIN monthly_payouts mp ON me.user_id = mp.user_id AND me.month = mp.month
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