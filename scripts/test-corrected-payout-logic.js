// Устанавливаем переменную окружения для подключения к базе данных
process.env.POSTGRES_URL = "postgresql://neondb_owner:npg_FuYknM4g3rji@ep-damp-queen-a4y4suae-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const { 
  createPayoutWithCorrection, 
  getPayoutsDataOptimized, 
  getEarningsForMonth,
  addShift,
  initDatabase,
  createUser,
  getUserByTelegramId,
  deletePayout,
  deleteShift,
  getPayoutsByUser,
  getShifts
} = require('../src/lib/db.ts');

async function testCorrectedPayoutLogic() {
  try {
    console.log('🔄 Инициализация базы данных...');
    await initDatabase();
    
    // Создаем тестового пользователя
    console.log('👤 Создаем тестового пользователя...');
    let user = await getUserByTelegramId(999999);
    if (!user) {
      user = await createUser({
        telegram_id: 999999,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        display_name: 'Test User'
      });
    }
    const userId = user.id;
    console.log(`✅ Пользователь создан с ID: ${userId}`);

    // Очищаем старые данные для этого пользователя
    console.log('🧹 Очищаем старые данные...');
    
    // Удаляем все выплаты пользователя
    const existingPayouts = await getPayoutsByUser(userId);
    for (const payout of existingPayouts) {
      await deletePayout(payout.id, userId);
    }
    
    // Удаляем все смены пользователя
    const existingShifts = await getShifts(userId);
    for (const shift of existingShifts) {
      await deleteShift(shift.id, userId);
    }

    // Создаем смены для тестирования
    console.log('📅 Создаем тестовые смены...');
    
    // Январь 2025: заработок 10,000 ₽
    await addShift({
      user_id: userId,
      date: '2025-01-15',
      hours: 8,
      steam_bath: 2,
      brand_steam: 1,
      intro_steam: 1,
      scrubbing: 0,
      zaparnik: 0,
      masters: 1,
      total: 10000,
      hourly_rate: 500,
      steam_bath_price: 3000,
      brand_steam_price: 4000,
      intro_steam_price: 2500,
      scrubbing_price: 2400,
      zaparnik_price: 1500
    });
    
    // Февраль 2025: заработок 3,000 ₽
    await addShift({
      user_id: userId,
      date: '2025-02-15',
      hours: 6,
      steam_bath: 1,
      brand_steam: 0,
      intro_steam: 0,
      scrubbing: 0,
      zaparnik: 0,
      masters: 0,
      total: 3000,
      hourly_rate: 500,
      steam_bath_price: 3000,
      brand_steam_price: 4000,
      intro_steam_price: 2500,
      scrubbing_price: 2400,
      zaparnik_price: 1500
    });
    
    // Март 2025: заработок 1,000 ₽
    await addShift({
      user_id: userId,
      date: '2025-03-15',
      hours: 2,
      steam_bath: 0,
      brand_steam: 0,
      intro_steam: 0,
      scrubbing: 0,
      zaparnik: 0,
      masters: 0,
      total: 1000,
      hourly_rate: 500,
      steam_bath_price: 3000,
      brand_steam_price: 4000,
      intro_steam_price: 2500,
      scrubbing_price: 2400,
      zaparnik_price: 1500
    });
    
    // Апрель 2025: заработок 5,000 ₽
    await addShift({
      user_id: userId,
      date: '2025-04-15',
      hours: 10,
      steam_bath: 0,
      brand_steam: 0,
      intro_steam: 0,
      scrubbing: 0,
      zaparnik: 0,
      masters: 0,
      total: 5000,
      hourly_rate: 500,
      steam_bath_price: 3000,
      brand_steam_price: 4000,
      intro_steam_price: 2500,
      scrubbing_price: 2400,
      zaparnik_price: 1500
    });

    console.log('✅ Тестовые смены созданы');

    // Тестируем сценарий из примера
    console.log('\n🧪 Тестируем сценарий с корректировкой выплат...');
    
    // Январь: выплата 15,000 ₽ при заработке 10,000 ₽
    console.log('\n📅 Январь 2025: Выплата 15,000 ₽ при заработке 10,000 ₽');
    const jan_result = await createPayoutWithCorrection({
      user_id: userId,
      month: '2025-01',
      amount: 15000,
      date: '2025-01-31',
      comment: 'Большая выплата'
    });
    
    console.log(`   💰 Записано в базу: ${jan_result.payout.amount} ₽`);
    console.log(`   🔄 Переплата: ${jan_result.overpayment || 0} ₽`);
    
    // Проверяем данные за январь
    const janEarnings = await getEarningsForMonth(userId, '2025-01');
    console.log(`   📊 Заработок за январь: ${janEarnings} ₽`);
    
    // Февраль: выплата 2,000 ₽ при заработке 3,000 ₽ + перенос 5,000 ₽
    console.log('\n📅 Февраль 2025: Выплата 2,000 ₽ при заработке 3,000 ₽ + перенос 5,000 ₽');
    const feb_result = await createPayoutWithCorrection({
      user_id: userId,
      month: '2025-02',
      amount: 2000,
      date: '2025-02-28',
      comment: 'Обычная выплата'
    });
    
    console.log(`   💰 Записано в базу: ${feb_result.payout.amount} ₽`);
    console.log(`   🔄 Переплата: ${feb_result.overpayment || 0} ₽`);
    
    // Март: выплата 3,000 ₽ при заработке 1,000 ₽ + перенос 2,000 ₽
    console.log('\n📅 Март 2025: Выплата 3,000 ₽ при заработке 1,000 ₽ + перенос 2,000 ₽');
    const mar_result = await createPayoutWithCorrection({
      user_id: userId,
      month: '2025-03',
      amount: 3000,
      date: '2025-03-31',
      comment: 'Еще одна выплата'
    });
    
    console.log(`   💰 Записано в базу: ${mar_result.payout.amount} ₽`);
    console.log(`   🔄 Переплата: ${mar_result.overpayment || 0} ₽`);

    // Получаем итоговые данные
    console.log('\n📊 Итоговые данные по месяцам:');
    const monthsData = await getPayoutsDataOptimized(userId);
    
    for (const monthData of monthsData) {
      if (['2025-01', '2025-02', '2025-03', '2025-04'].includes(monthData.month)) {
        console.log(`\n📅 ${monthData.month}:`);
        console.log(`   💼 Заработано: ${monthData.earnings} ₽`);
        console.log(`   💰 Выплачено: ${monthData.total_payouts} ₽`);
        console.log(`   📋 Остаток: ${monthData.remaining} ₽`);
        console.log(`   📝 Выплаты:`);
        
        for (const payout of monthData.payouts) {
          console.log(`      - ${payout.amount} ₽ (${payout.date}) ${payout.comment || ''}`);
        }
      }
    }

    console.log('\n✅ Тест завершен успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
    process.exit(1);
  }
}

testCorrectedPayoutLogic();