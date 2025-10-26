// Загружаем переменные окружения из .env.local
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function initPostgresTables() {
  try {
    console.log('Инициализация PostgreSQL таблиц...');
    
    // Создание таблицы shifts
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
    console.log('✅ Таблица shifts создана');

    // Создание таблицы prices
    await sql`
      CREATE TABLE IF NOT EXISTS prices (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        price REAL NOT NULL
      )
    `;
    console.log('✅ Таблица prices создана');

    // Добавление начальных цен
    const defaultPrices = [
      { name: 'Почасовая ставка', price: 400 },
      { name: 'Путевое парение', price: 3500 },
      { name: 'Фирменное парение', price: 4200 },
      { name: 'Ознакомительное парение', price: 2500 },
      { name: 'Скрабирование', price: 1200 }
    ];

    for (const price of defaultPrices) {
      await sql`
        INSERT INTO prices (name, price)
        VALUES (${price.name}, ${price.price})
        ON CONFLICT (name) DO NOTHING
      `;
    }
    console.log('✅ Начальные цены добавлены');

    console.log('🎉 Инициализация PostgreSQL завершена успешно!');
  } catch (error) {
    console.error('❌ Ошибка при инициализации PostgreSQL:', error);
    process.exit(1);
  }
}

// Запуск скрипта
initPostgresTables();