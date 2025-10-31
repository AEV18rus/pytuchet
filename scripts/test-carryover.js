// Устанавливаем переменную окружения для подключения к базе данных
process.env.POSTGRES_URL = "postgresql://neondb_owner:npg_FuYknM4g3rji@ep-damp-queen-a4y4suae-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const { processOverpaymentCarryover, getEarningsForMonth, getPayoutsForMonth, initDatabase } = require('../src/lib/db.ts');

async function testCarryover() {
  try {
    console.log('Инициализация базы данных...');
    await initDatabase();
    
    const userId = 23; // ID тестового пользователя
    const month = '2024-08'; // Август 2024
    const payoutDate = '2024-08-31';
    
    console.log('\n📊 Проверяем данные ДО обработки переноса:');
    
    // Проверяем данные до обработки
    const augustEarnings = await getEarningsForMonth(userId, month);
    const augustPayouts = await getPayoutsForMonth(userId, month);
    console.log(`  Август 2024: заработок ${augustEarnings} ₽, выплаты ${augustPayouts} ₽`);
    
    const septemberEarnings = await getEarningsForMonth(userId, '2024-09');
    const septemberPayouts = await getPayoutsForMonth(userId, '2024-09');
    console.log(`  Сентябрь 2024: заработок ${septemberEarnings} ₽, выплаты ${septemberPayouts} ₽`);
    
    if (augustPayouts > augustEarnings) {
      const overpayment = augustPayouts - augustEarnings;
      console.log(`  ⚠️ Переплата в августе: ${overpayment} ₽`);
    }
    
    console.log('\n🔄 Запускаем обработку переноса переплаты...');
    
    // Обрабатываем перенос переплаты
    await processOverpaymentCarryover(userId, month, payoutDate);
    
    console.log('\n📊 Проверяем данные ПОСЛЕ обработки переноса:');
    
    // Проверяем данные после обработки
    const augustEarningsAfter = await getEarningsForMonth(userId, month);
    const augustPayoutsAfter = await getPayoutsForMonth(userId, month);
    console.log(`  Август 2024: заработок ${augustEarningsAfter} ₽, выплаты ${augustPayoutsAfter} ₽`);
    
    const septemberEarningsAfter = await getEarningsForMonth(userId, '2024-09');
    const septemberPayoutsAfter = await getPayoutsForMonth(userId, '2024-09');
    console.log(`  Сентябрь 2024: заработок ${septemberEarningsAfter} ₽, выплаты ${septemberPayoutsAfter} ₽`);
    
    // Проверяем результат
    if (augustPayoutsAfter === augustPayouts) {
      console.log('  ✅ Выплаты в августе не изменились (правильно)');
    } else {
      console.log('  ❌ Выплаты в августе изменились (ошибка)');
    }
    
    if (septemberPayoutsAfter > septemberPayouts) {
      const carryover = septemberPayoutsAfter - septemberPayouts;
      console.log(`  ✅ В сентябрь добавлен перенос: ${carryover} ₽`);
    } else {
      console.log('  ❌ Перенос в сентябрь не создан');
    }
    
    console.log('\n🎉 Тест завершен успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
    throw error;
  }
}

testCarryover()
  .then(() => {
    console.log('Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Скрипт завершен с ошибкой:', error);
    process.exit(1);
  });