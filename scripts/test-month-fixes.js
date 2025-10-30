const { sql } = require('@vercel/postgres');

// Устанавливаем переменную окружения для подключения к базе данных
process.env.POSTGRES_URL = 'postgresql://neondb_owner:npg_Ey8Ey8Ey8Ey8Ey8Ey8Ey8Ey8Ey8Ey8@ep-weathered-darkness-a5aqhqzj.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function testMonthFixes() {
  console.log('🧪 Тестирование исправлений группировки месяцев...\n');

  try {
    // 1. Проверяем API endpoint для получения месяцев
    console.log('1. Тестирование API endpoint /api/admin/months-with-shifts');
    const response = await fetch('http://localhost:3000/api/admin/months-with-shifts');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API endpoint работает');
      console.log('📅 Найденные месяцы:', data.months);
    } else {
      console.log('❌ API endpoint не работает:', response.statusText);
      return;
    }

    // 2. Проверяем данные в базе
    console.log('\n2. Проверка данных в базе данных');
    const monthsQuery = await sql`
      SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') as month
      FROM shifts 
      ORDER BY month DESC
    `;
    console.log('📊 Месяцы в базе данных:', monthsQuery.rows.map(r => r.month));

    // 3. Проверяем конкретного пользователя (Aleksey)
    console.log('\n3. Проверка данных для пользователя Aleksey');
    const alekseyShifts = await sql`
      SELECT u.first_name, u.last_name, s.date, TO_CHAR(s.date, 'YYYY-MM') as month
      FROM shifts s
      JOIN users u ON s.user_id = u.id
      WHERE u.first_name ILIKE '%aleksey%'
      ORDER BY s.date DESC
    `;
    
    if (alekseyShifts.rows.length > 0) {
      console.log('✅ Найдены смены для Aleksey:');
      alekseyShifts.rows.forEach(shift => {
        console.log(`  - ${shift.date} (${shift.month})`);
      });
    } else {
      console.log('❌ Смены для Aleksey не найдены');
    }

    // 4. Тестируем API для получения отчетов по месяцам
    console.log('\n4. Тестирование API отчетов для октября 2025');
    const reportsResponse = await fetch('http://localhost:3000/api/admin/reports?month=2025-10');
    if (reportsResponse.ok) {
      const reportsData = await reportsResponse.json();
      console.log('✅ API отчетов работает для 2025-10');
      console.log(`📈 Найдено отчетов: ${reportsData.length}`);
      
      // Ищем Aleksey в отчетах
      const alekseyReport = reportsData.find(r => 
        r.first_name && r.first_name.toLowerCase().includes('aleksey')
      );
      if (alekseyReport) {
        console.log('✅ Aleksey найден в отчетах октября 2025:');
        console.log(`  - Имя: ${alekseyReport.first_name} ${alekseyReport.last_name || ''}`);
        console.log(`  - Заработано: ${alekseyReport.earned || 0}`);
        console.log(`  - Выплачено: ${alekseyReport.paid || 0}`);
      } else {
        console.log('⚠️ Aleksey не найден в отчетах октября 2025');
      }
    } else {
      console.log('❌ API отчетов не работает:', reportsResponse.statusText);
    }

    // 5. Тестируем API для получения смен пользователя
    console.log('\n5. Тестирование API смен для Aleksey в октябре 2025');
    const shiftsResponse = await fetch('http://localhost:3000/api/shifts?user_id=21&month=2025-10');
    if (shiftsResponse.ok) {
      const shiftsData = await shiftsResponse.json();
      console.log('✅ API смен работает для Aleksey в 2025-10');
      console.log(`🔄 Найдено смен: ${shiftsData.length}`);
      
      if (shiftsData.length > 0) {
        shiftsData.forEach((shift, index) => {
          console.log(`  Смена ${index + 1}: ${shift.date}, сумма: ${shift.total || 0}`);
        });
      }
    } else {
      console.log('❌ API смен не работает:', shiftsResponse.statusText);
    }

    console.log('\n🎉 Тестирование завершено!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

testMonthFixes();