// Устанавливаем переменную окружения для подключения к базе данных
process.env.POSTGRES_URL = "postgresql://neondb_owner:npg_FuYknM4g3rji@ep-damp-queen-a4y4suae-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const { processOverpaymentCarryover, createPayout, getPayoutsDataOptimized, getEarningsForMonth, initDatabase } = require('../src/lib/db.ts');

async function testCascadingCarryover() {
  try {
    console.log('=== ТЕСТ КАСКАДНЫХ ПЕРЕНОСОВ ===\n');
    
    // Инициализируем базу данных
    await initDatabase();
    
    const userId = 23;
    const testMonth = '2025-08';
    const payoutDate = '2025-08-15';
    
    // Сначала проверим заработки за несколько месяцев
    console.log('Проверяем заработки за несколько месяцев:');
    const monthsToCheck = ['2025-08', '2025-09', '2025-10', '2025-11'];
    let totalEarnings = 0;
    
    for (const month of monthsToCheck) {
      const earnings = await getEarningsForMonth(userId, month);
      console.log(`${month}: заработок ${earnings} ₽`);
      totalEarnings += earnings;
    }
    
    // Создаем выплату больше суммарного заработка за несколько месяцев
    const largeAmount = Math.floor(totalEarnings * 1.5); // 150% от суммарного заработка
    console.log(`\nСоздаем большую выплату ${largeAmount} ₽ в ${testMonth} (150% от суммарного заработка ${totalEarnings} ₽)`);
    
    // Создаем большую выплату, которая должна создать каскадный перенос
    await createPayout({
      user_id: userId,
      month: testMonth,
      amount: largeAmount,
      date: payoutDate,
      comment: 'Тестовая большая выплата для каскадного переноса'
    });
    
    console.log('Выплата создана, запускаем обработку переносов...\n');
    
    // Обрабатываем переносы
    await processOverpaymentCarryover(userId, testMonth, payoutDate);
    
    console.log('\n=== РЕЗУЛЬТАТЫ ПОСЛЕ ОБРАБОТКИ ПЕРЕНОСОВ ===\n');
    
    // Проверяем результаты для нескольких месяцев
    for (const month of monthsToCheck) {
      const data = await getPayoutsDataOptimized(userId, month);
      console.log(`${month}: Заработок ${data.earnings} ₽, Выплачено ${data.total_payouts} ₽, Остаток ${data.remaining} ₽, Статус: ${data.status}`);
    }
    
    console.log('\n✅ Тест каскадных переносов завершен успешно');
    
  } catch (error) {
    console.error('❌ Тест каскадных переносов завершен с ошибкой:', error);
    process.exit(1);
  }
}

testCascadingCarryover()
  .then(() => {
    console.log('\nТест каскадных переносов завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Тест каскадных переносов завершен с ошибкой:', error);
    process.exit(1);
  });