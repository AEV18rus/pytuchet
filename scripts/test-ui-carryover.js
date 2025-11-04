// Устанавливаем переменную окружения для подключения к базе данных
process.env.POSTGRES_URL = "postgresql://neondb_owner:npg_FuYknM4g3rji@ep-damp-queen-a4y4suae-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const { getPayoutsDataOptimized, initDatabase } = require('../src/lib/db.ts');

async function testUICarryover() {
  try {
    console.log('Инициализация базы данных...');
    await initDatabase();
    
    const userId = 23; // ID тестового пользователя
    
    console.log('\n📊 Проверяем данные для UI с исправленной логикой переносов:');
    
    // Получаем данные для UI
    const payoutsData = await getPayoutsDataOptimized(userId);
    
    console.log('\n📋 Данные по месяцам:');
    console.log('┌─────────────┬─────────────┬─────────────┬─────────────┬──────────┬─────────────┐');
    console.log('│    Месяц    │ Заработано  │ Выплачено   │  Остаток    │ Прогресс │   Статус    │');
    console.log('├─────────────┼─────────────┼─────────────┼─────────────┼──────────┼─────────────┤');
    
    payoutsData.forEach(month => {
      const monthStr = month.month.padEnd(11);
      const earningsStr = `${month.earnings} ₽`.padEnd(11);
      const payoutsStr = `${month.total_payouts} ₽`.padEnd(11);
      const remainingStr = `${month.remaining} ₽`.padEnd(11);
      const progressStr = `${month.progress}%`.padEnd(8);
      const statusStr = month.status.padEnd(11);
      
      console.log(`│ ${monthStr} │ ${earningsStr} │ ${payoutsStr} │ ${remainingStr} │ ${progressStr} │ ${statusStr} │`);
      
      // Проверяем правильность логики
      if (month.total_payouts > month.earnings) {
        console.log(`│ ❌ ОШИБКА: Выплачено (${month.total_payouts}) > Заработано (${month.earnings}) │`);
      }
      
      // Показываем детали выплат если есть переносы
      if (month.payouts && Array.isArray(month.payouts)) {
        const carryovers = month.payouts.filter(p => 
          p.comment && (p.comment.includes('Перенос в') || p.comment.includes('Перенос с'))
        );
        if (carryovers.length > 0) {
          console.log(`│ 📝 Переносы в ${month.month}:`);
          carryovers.forEach(carryover => {
            console.log(`│    - ${carryover.amount} ₽: ${carryover.comment}`);
          });
        }
      }
    });
    
    console.log('└─────────────┴─────────────┴─────────────┴─────────────┴──────────┴─────────────┘');
    
    // Проверяем ключевые принципы
    console.log('\n🔍 Проверка ключевых принципов:');
    
    let allCorrect = true;
    
    payoutsData.forEach(month => {
      // Принцип 1: Выплачено не должно превышать Заработано
      if (month.total_payouts > month.earnings) {
        console.log(`❌ ${month.month}: Выплачено (${month.total_payouts}) > Заработано (${month.earnings})`);
        allCorrect = false;
      } else {
        console.log(`✅ ${month.month}: Выплачено (${month.total_payouts}) ≤ Заработано (${month.earnings})`);
      }
      
      // Принцип 2: Остаток должен быть правильно рассчитан
      const expectedRemaining = Math.max(0, month.earnings - month.total_payouts);
      if (month.remaining !== expectedRemaining) {
        console.log(`❌ ${month.month}: Неправильный остаток. Ожидается ${expectedRemaining}, получено ${month.remaining}`);
        allCorrect = false;
      }
      
      // Принцип 3: Прогресс должен быть правильно рассчитан
      const expectedProgress = month.earnings > 0 ? Math.round((month.total_payouts / month.earnings) * 100) : 0;
      if (month.progress !== expectedProgress) {
        console.log(`❌ ${month.month}: Неправильный прогресс. Ожидается ${expectedProgress}%, получено ${month.progress}%`);
        allCorrect = false;
      }
    });
    
    if (allCorrect) {
      console.log('\n🎉 Все проверки пройдены! Логика переносов работает корректно.');
    } else {
      console.log('\n❌ Обнаружены ошибки в логике.');
    }
    
    console.log('\n📊 Сводка по статусам:');
    const statusCounts = payoutsData.reduce((acc, month) => {
      acc[month.status] = (acc[month.status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} месяц(ев)`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании UI:', error);
    throw error;
  }
}

testUICarryover()
  .then(() => {
    console.log('\nТест UI завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Тест UI завершен с ошибкой:', error);
    process.exit(1);
  });