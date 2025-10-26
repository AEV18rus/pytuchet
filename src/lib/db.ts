import { sql } from '@vercel/postgres';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Типы для данных
export interface Shift {
  id?: number;
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
}

export interface Price {
  id?: number;
  name: string;
  price: number;
}

// Инициализация SQLite для локальной разработки
async function initSQLite() {
  const dbPath = path.join(process.cwd(), 'shifts.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Проверяем, существует ли таблица shifts с новой схемой (включая поля цен)
  const tableInfo = await db.all("PRAGMA table_info(shifts)");
  const hasNewSchema = tableInfo.some(column => column.name === 'hourly_rate');

  if (!hasNewSchema) {
    // Удаляем старую таблицу и создаем новую
    await db.exec('DROP TABLE IF EXISTS shifts');
  }

  // Создание таблиц если их нет
  await db.exec(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      scrubbing_price REAL NOT NULL
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price REAL NOT NULL
    )
  `);

  return db;
}

// Инициализация Postgres для production
async function initPostgres() {
  // Создание таблиц если их нет
  await sql`
    CREATE TABLE IF NOT EXISTS shifts (
      id SERIAL PRIMARY KEY,
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
      scrubbing_price REAL NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS prices (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      price REAL NOT NULL
    )
  `;
}

// Функции для работы со сменами
export async function getShifts(): Promise<Shift[]> {
  if (isProduction) {
    const { rows } = await sql`SELECT * FROM shifts ORDER BY date DESC, id DESC`;
    return rows as Shift[];
  } else {
    const db = await initSQLite();
    const shifts = await db.all('SELECT * FROM shifts ORDER BY date DESC, id DESC');
    await db.close();
    return shifts as Shift[];
  }
}

export async function addShift(shift: Omit<Shift, 'id'>): Promise<void> {
  if (isProduction) {
    await sql`
      INSERT INTO shifts (date, hours, steam_bath, brand_steam, intro_steam, scrubbing, masters, total, hourly_rate, steam_bath_price, brand_steam_price, intro_steam_price, scrubbing_price)
      VALUES (${shift.date}, ${shift.hours}, ${shift.steam_bath}, ${shift.brand_steam}, ${shift.intro_steam}, ${shift.scrubbing}, ${shift.masters}, ${shift.total}, ${shift.hourly_rate}, ${shift.steam_bath_price}, ${shift.brand_steam_price}, ${shift.intro_steam_price}, ${shift.scrubbing_price})
    `;
  } else {
    const db = await initSQLite();
    await db.run(
      'INSERT INTO shifts (date, hours, steam_bath, brand_steam, intro_steam, scrubbing, masters, total, hourly_rate, steam_bath_price, brand_steam_price, intro_steam_price, scrubbing_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [shift.date, shift.hours, shift.steam_bath, shift.brand_steam, shift.intro_steam, shift.scrubbing, shift.masters, shift.total, shift.hourly_rate, shift.steam_bath_price, shift.brand_steam_price, shift.intro_steam_price, shift.scrubbing_price]
    );
    await db.close();
  }
}

export async function deleteShift(id: number): Promise<void> {
  if (isProduction) {
    await sql`DELETE FROM shifts WHERE id = ${id}`;
  } else {
    const db = await initSQLite();
    await db.run('DELETE FROM shifts WHERE id = ?', [id]);
    await db.close();
  }
}

// Функции для работы с ценами
export async function getPrices(): Promise<Price[]> {
  if (isProduction) {
    const { rows } = await sql`SELECT * FROM prices ORDER BY name`;
    return rows as Price[];
  } else {
    const db = await initSQLite();
    const prices = await db.all('SELECT * FROM prices ORDER BY name');
    await db.close();
    return prices as Price[];
  }
}

export async function addPrice(price: Omit<Price, 'id'>): Promise<void> {
  if (isProduction) {
    await sql`
      INSERT INTO prices (name, price)
      VALUES (${price.name}, ${price.price})
      ON CONFLICT (name) DO UPDATE SET price = ${price.price}
    `;
  } else {
    const db = await initSQLite();
    await db.run(
      'INSERT OR REPLACE INTO prices (name, price) VALUES (?, ?)',
      [price.name, price.price]
    );
    await db.close();
  }
}

export async function updatePrice(id: number, price: Omit<Price, 'id'>): Promise<void> {
  if (isProduction) {
    await sql`
      UPDATE prices SET name = ${price.name}, price = ${price.price}
      WHERE id = ${id}
    `;
  } else {
    const db = await initSQLite();
    await db.run(
      'UPDATE prices SET name = ?, price = ? WHERE id = ?',
      [price.name, price.price, id]
    );
    await db.close();
  }
}

export async function deletePrice(id: number): Promise<void> {
  if (isProduction) {
    await sql`DELETE FROM prices WHERE id = ${id}`;
  } else {
    const db = await initSQLite();
    await db.run('DELETE FROM prices WHERE id = ?', [id]);
    await db.close();
  }
}

// Инициализация базы данных
export async function initDatabase() {
  if (isProduction) {
    await initPostgres();
    await initDefaultPrices();
  } else {
    const db = await initSQLite();
    await db.close();
    await initDefaultPrices();
  }
}

// Инициализация цен по умолчанию если их нет в базе
async function initDefaultPrices() {
  try {
    const existingPrices = await getPrices();
    
    // Если цены уже есть, ничего не делаем
    if (existingPrices.length > 0) {
      return;
    }
    
    // Добавляем начальные цены
    const defaultPrices = [
      { name: 'Почасовая ставка', price: 400 },
      { name: 'Путевое парение', price: 3500 },
      { name: 'Фирменное парение', price: 4200 },
      { name: 'Ознакомительное парение', price: 2500 },
      { name: 'Скрабирование', price: 1200 }
    ];
    
    for (const price of defaultPrices) {
      await addPrice(price);
    }
  } catch (error) {
    console.error('Ошибка при инициализации цен по умолчанию:', error);
  }
}