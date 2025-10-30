const { sql } = require('@vercel/postgres');
require('dotenv/config');

async function checkTable() {
  try {
    console.log('Проверяем таблицу month_status...');
    
    // Проверяем существование таблицы
    const tableExists = await sql.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'month_status'
      );
    `);
    console.log('Таблица month_status существует:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Проверяем структуру таблицы
      const columns = await sql.query(`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'month_status' 
        ORDER BY ordinal_position
      `);
      console.log('Колонки в таблице month_status:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
      });
      
      // Проверяем данные в таблице
      const data = await sql.query('SELECT * FROM month_status LIMIT 5');
      console.log('Данные в таблице month_status:', data.rows);
    }
    
    // Проверяем все таблицы
    console.log('\nВсе таблицы в базе данных:');
    const tables = await sql.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkTable();