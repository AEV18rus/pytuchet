const { sql } = require('@vercel/postgres');

async function initVercelPostgres() {
  try {
    console.log('🚀 Инициализация Vercel Postgres...');
    
    // Создание таблицы shifts
    console.log('📊 Создание таблицы shifts...');
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
    console.log('💰 Создание таблицы prices...');
    await sql`
      CREATE TABLE IF NOT EXISTS prices (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        price REAL NOT NULL
      )
    `;
    console.log('✅ Таблица prices создана');

    // Добавление начальных цен
    console.log('💵 Добавление начальных цен...');
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

    // Проверка результата
    console.log('🔍 Проверка созданных таблиц...');
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('📋 Созданные таблицы:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    const pricesResult = await sql`SELECT COUNT(*) as count FROM prices`;
    const shiftsResult = await sql`SELECT COUNT(*) as count FROM shifts`;
    
    console.log(`💰 Количество цен: ${pricesResult.rows[0].count}`);
    console.log(`📊 Количество смен: ${shiftsResult.rows[0].count}`);
    
    console.log('🎉 Vercel Postgres успешно инициализирован!');
    
  } catch (error) {
    console.error('❌ Ошибка при инициализации Vercel Postgres:', error);
    console.log('\n💡 Возможные решения:');
    console.log('1. Убедитесь, что переменные окружения POSTGRES_* настроены в Vercel');
    console.log('2. Проверьте, что Vercel Postgres добавлен к проекту');
    console.log('3. Убедитесь, что у вас есть права на создание таблиц');
    process.exit(1);
  }
}

// Запуск только если скрипт вызван напрямую
if (require.main === module) {
  initVercelPostgres();
}

module.exports = { initVercelPostgres };