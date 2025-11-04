// Устанавливаем переменную окружения для подключения к базе данных
process.env.POSTGRES_URL = "postgresql://neondb_owner:npg_FuYknM4g3rji@ep-damp-queen-a4y4suae-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const { addShift, createPayout, initDatabase } = require('../src/lib/db.ts');

async function createTestData() {
  try {
    console.log('Инициализация базы данных...');
    await initDatabase();
    
    const userId = 23; // ID нового тестового пользователя
    
    console.log('Создаем тестовые смены для августа 2024...');
    
    // Смены для августа 2024 (заработок 15000 ₽)
    const augustShifts = [
      {
        user_id: userId,
        date: '2024-08-05',
        hours: 8,
        steam_bath: 2,
        brand_steam: 1,
        intro_steam: 0,
        scrubbing: 1,
        zaparnik: 0,
        masters: 1,
        total: 5000,
        hourly_rate: 300,
        steam_bath_price: 3000,
        brand_steam_price: 4200,
        intro_steam_price: 2500,
        scrubbing_price: 1200,
        zaparnik_price: 0,
        services: JSON.stringify(['Путевое парение', 'Фирменное парение', 'Скрабирование']),
        service_prices: JSON.stringify([3000, 4200, 1200])
      },
      {
        user_id: userId,
        date: '2024-08-15',
        hours: 10,
        steam_bath: 3,
        brand_steam: 0,
        intro_steam: 1,
        scrubbing: 2,
        zaparnik: 1,
        masters: 1,
        total: 10000,
        hourly_rate: 300,
        steam_bath_price: 3000,
        brand_steam_price: 4200,
        intro_steam_price: 2500,
        scrubbing_price: 1200,
        zaparnik_price: 0,
        services: JSON.stringify(['Путевое парение', 'Ознакомительное парение', 'Скрабирование']),
        service_prices: JSON.stringify([9000, 2500, 2400])
      }
    ];
    
    for (const shift of augustShifts) {
      await addShift(shift);
      console.log(`✅ Добавлена смена на ${shift.date} на сумму ${shift.total} ₽`);
    }
    
    console.log('Создаем тестовые выплаты для августа 2024...');
    
    // Выплаты для августа 2024 (20000 ₽ - больше заработка на 5000 ₽)
    const augustPayouts = [
      {
        user_id: userId,
        month: '2024-08',
        amount: 10000,
        date: '2024-08-10',
        comment: 'Первая выплата'
      },
      {
        user_id: userId,
        month: '2024-08',
        amount: 10000,
        date: '2024-08-20',
        comment: 'Вторая выплата'
      }
    ];
    
    for (const payout of augustPayouts) {
      await createPayout(payout);
      console.log(`✅ Добавлена выплата ${payout.amount} ₽ за ${payout.month}`);
    }
    
    console.log('Создаем тестовые смены для сентября 2024...');
    
    // Смены для сентября 2024 (заработок 12000 ₽)
    const septemberShifts = [
      {
        user_id: userId,
        date: '2024-09-10',
        hours: 8,
        steam_bath: 2,
        brand_steam: 1,
        intro_steam: 1,
        scrubbing: 0,
        zaparnik: 0,
        masters: 1,
        total: 12000,
        hourly_rate: 300,
        steam_bath_price: 3000,
        brand_steam_price: 4200,
        intro_steam_price: 2500,
        scrubbing_price: 1200,
        zaparnik_price: 0,
        services: JSON.stringify(['Путевое парение', 'Фирменное парение', 'Ознакомительное парение']),
        service_prices: JSON.stringify([6000, 4200, 2500])
      }
    ];
    
    for (const shift of septemberShifts) {
      await addShift(shift);
      console.log(`✅ Добавлена смена на ${shift.date} на сумму ${shift.total} ₽`);
    }
    
    console.log('\n🎉 Тестовые данные созданы успешно!');
    console.log('📊 Сводка:');
    console.log('  Август 2024: заработок 15000 ₽, выплаты 20000 ₽ (переплата 5000 ₽)');
    console.log('  Сентябрь 2024: заработок 12000 ₽');
    console.log('  Ожидается: перенос 5000 ₽ из августа в сентябрь');
    
  } catch (error) {
    console.error('❌ Ошибка при создании тестовых данных:', error);
    throw error;
  }
}

createTestData()
  .then(() => {
    console.log('Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Скрипт завершен с ошибкой:', error);
    process.exit(1);
  });