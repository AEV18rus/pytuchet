const { sql } = require('@vercel/postgres');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function fixTable() {
  try {
    console.log('🔧 Исправляем таблицу month_status...');
    
    // Удаляем таблицу если она существует
    await sql.query('DROP TABLE IF EXISTS month_status');
    console.log('✅ Старая таблица удалена');
    
    // Создаем таблицу заново
    await sql.query(`
      CREATE TABLE month_status (
        month TEXT PRIMARY KEY,
        closed BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Таблица month_status создана заново');
    
    // Проверяем структуру
    const columns = await sql.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'month_status' 
      ORDER BY ordinal_position
    `);
    console.log('📋 Структура таблицы month_status:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

fixTable();