const { sql } = require('@vercel/postgres');

// Устанавливаем переменную окружения для подключения к базе
process.env.POSTGRES_URL = "postgresql://neondb_owner:npg_FuYknM4g3rji@ep-damp-queen-a4y4suae-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function debugMonthFiltering() {
  try {
    console.log('🔍 Отладка фильтрации смен по месяцам...\n');
    
    // Получаем всех пользователей
    const usersResult = await sql`SELECT id, first_name, last_name FROM users ORDER BY first_name`;
    console.log('👥 Пользователи в системе:');
    usersResult.rows.forEach(user => {
      console.log(`  - ID: ${user.id}, Имя: ${user.first_name} ${user.last_name || ''}`);
    });
    
    // Найдем пользователя Aleksey
    const alexeyUser = usersResult.rows.find(u => u.first_name.toLowerCase().includes('aleksey'));
    if (!alexeyUser) {
      console.log('\n❌ Пользователь Aleksey не найден');
      return;
    }
    
    console.log(`\n🎯 Найден пользователь Aleksey: ID ${alexeyUser.id}`);
    
    // Сначала проверим структуру таблицы shifts
    const tableStructure = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'shifts' 
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 Структура таблицы shifts:');
    tableStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Получаем все смены Aleksey
    const allShiftsResult = await sql`
      SELECT id, date, total,
             TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') as month_from_date
      FROM shifts 
      WHERE user_id = ${alexeyUser.id}
      ORDER BY date DESC
    `;
    
    console.log(`\n📊 Все смены пользователя Aleksey (${allShiftsResult.rows.length} записей):`);
    allShiftsResult.rows.forEach(shift => {
      console.log(`  - ID: ${shift.id}`);
      console.log(`    Дата смены: ${shift.date} (месяц: ${shift.month_from_date})`);
      console.log(`    Сумма: ${shift.total} ₽`);
      console.log('');
    });
    
    // Проверяем фильтрацию для октября 2024
    const octoberShifts = await sql`
      SELECT id, date, total
      FROM shifts 
      WHERE user_id = ${alexeyUser.id}
      AND TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') = '2024-10'
      ORDER BY date DESC
    `;
    
    console.log(`\n🗓️ Смены Aleksey за октябрь 2024 (по дате смены): ${octoberShifts.rows.length} записей`);
    octoberShifts.rows.forEach(shift => {
      console.log(`  - ID: ${shift.id}, Дата: ${shift.date}, Сумма: ${shift.total} ₽`);
    });
    
    // Проверяем фильтрацию для октября 2025
    const october2025Shifts = await sql`
      SELECT id, date, total
      FROM shifts 
      WHERE user_id = ${alexeyUser.id}
      AND TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') = '2025-10'
      ORDER BY date DESC
    `;
    
    console.log(`\n🗓️ Смены Aleksey за октябрь 2025 (по дате смены): ${october2025Shifts.rows.length} записей`);
    october2025Shifts.rows.forEach(shift => {
      console.log(`  - ID: ${shift.id}, Дата: ${shift.date}, Сумма: ${shift.total} ₽`);
    });
    
    // Проверяем что возвращает API для 2024-10
    console.log('\n🔗 Тестируем API запрос для 2024-10...');
    const apiUrl2024 = `http://localhost:3000/api/shifts?user_id=${alexeyUser.id}&month=2024-10`;
    console.log(`URL: ${apiUrl2024}`);
    
    // Проверяем что возвращает API для 2025-10
    console.log('\n🔗 Тестируем API запрос для 2025-10...');
    const apiUrl2025 = `http://localhost:3000/api/shifts?user_id=${alexeyUser.id}&month=2025-10`;
    console.log(`URL: ${apiUrl2025}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

debugMonthFiltering();