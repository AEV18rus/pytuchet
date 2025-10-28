import { sql, createClient } from '@vercel/postgres';
import { Pool } from 'pg';

// Определяем среду выполнения
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;

// Проверяем наличие Vercel Postgres переменных окружения
const hasVercelPostgres = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL);

// Используем Vercel Postgres если переменные доступны, иначе локальный PostgreSQL
const useVercelPostgres = isProduction || hasVercelPostgres;

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
if (!useVercelPostgres && process.env.POSTGRES_URL) {
  localPool = new Pool({
    connectionString: process.env.POSTGRES_URL,
  });
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
  masters: number;
  total: number;
  // Цены на момент создания смены
  hourly_rate: number;
  steam_bath_price: number;
  brand_steam_price: number;
  intro_steam_price: number;
  scrubbing_price: number;
  created_at?: string;
}

export interface Price {
  id?: number;
  name: string;
  price: number;
  updated_at?: string;
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
        is_blocked BOOLEAN DEFAULT FALSE,
        blocked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Добавляем новые поля в существующую таблицу users, если их нет
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS display_name TEXT
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
        masters INTEGER NOT NULL DEFAULT 1,
        total REAL NOT NULL,
        hourly_rate REAL NOT NULL,
        steam_bath_price REAL NOT NULL,
        brand_steam_price REAL NOT NULL,
        intro_steam_price REAL NOT NULL,
        scrubbing_price REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS prices (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        price REAL NOT NULL,
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
      INSERT INTO users (telegram_id, first_name, last_name, username, display_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userData.telegram_id, userData.first_name, userData.last_name, userData.username, userData.display_name]);
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
      INSERT INTO shifts (user_id, date, hours, steam_bath, brand_steam, intro_steam, scrubbing, masters, total, hourly_rate, steam_bath_price, brand_steam_price, intro_steam_price, scrubbing_price)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [shift.user_id, shift.date, shift.hours, shift.steam_bath, shift.brand_steam, shift.intro_steam, shift.scrubbing, shift.masters, shift.total, shift.hourly_rate, shift.steam_bath_price, shift.brand_steam_price, shift.intro_steam_price, shift.scrubbing_price]);
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
          is_blocked BOOLEAN DEFAULT FALSE,
          blocked_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Добавляем новые поля в существующую таблицу users, если их нет
      await sql.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS display_name TEXT
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
          masters INTEGER NOT NULL DEFAULT 1,
          total REAL NOT NULL,
          hourly_rate REAL NOT NULL,
          steam_bath_price REAL NOT NULL,
          brand_steam_price REAL NOT NULL,
          intro_steam_price REAL NOT NULL,
          scrubbing_price REAL NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
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
          ('Скрабирование', 1200)
        `);
        console.log('Default prices inserted');
      }

      console.log('Vercel Postgres database initialized successfully');
    } else {
      // Для локальной разработки используем старый метод
      await initPostgres();
      await initDefaultPrices();
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
      { name: 'Скрабирование', price: 1200 }
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