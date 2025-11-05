require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkAndCreateTables() {
  try {
    console.log('🔍 Проверка существующих таблиц...');
    
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('📋 Все таблицы в базе данных:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    const existingTables = result.rows.map(row => row.table_name);
    
    // Проверяем и создаем недостающие таблицы
    if (!existingTables.includes('users')) {
      console.log('\n⚠️  Создаем таблицу users...');
      await sql`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          telegram_id TEXT UNIQUE,
          role TEXT DEFAULT 'master',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('✅ Таблица users создана');
    }
    
    if (!existingTables.includes('payouts')) {
      console.log('\n⚠️  Создаем таблицу payouts...');
      await sql`
        CREATE TABLE payouts (
          id SERIAL PRIMARY KEY,
          master_name TEXT NOT NULL,
          month TEXT NOT NULL,
          amount REAL NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('✅ Таблица payouts создана');
    }
    
    if (!existingTables.includes('month_status')) {
      console.log('\n⚠️  Создаем таблицу month_status...');
      await sql`
        CREATE TABLE month_status (
          id SERIAL PRIMARY KEY,
          month TEXT NOT NULL UNIQUE,
          is_paid BOOLEAN NOT NULL DEFAULT false
        )
      `;
      console.log('✅ Таблица month_status создана');
    }
    
    console.log('\n🎉 Все необходимые таблицы проверены и созданы!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

checkAndCreateTables();