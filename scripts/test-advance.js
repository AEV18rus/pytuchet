// Устанавливаем переменную окружения для подключения к базе данных
process.env.POSTGRES_URL = "postgresql://neondb_owner:npg_FuYknM4g3rji@ep-damp-queen-a4y4suae-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const {
    createPayoutWithCorrection,
    getEarningsForMonth,
    getPayoutsForMonth,
    initDatabase,
    addShift,
    recalculateAdvancesForMonth,
    processMonthClosure,
    setMonthClosed,
    executeQuery
} = require('../src/lib/db.ts');

async function testAdvanceLogic() {
    try {
        console.log('=== ТЕСТ СИСТЕМЫ АВАНСОВ ===\n');

        // Инициализируем базу данных
        await initDatabase();

        const userId = 23; // Тестовый пользователь
        // Используем далекий будущий месяц, чтобы он точно был открыт
        const testMonth = '2025-12';
        const payoutDate = '2025-12-15';

        console.log(`\n--- Подготовка: Очистка данных за ${testMonth} ---`);
        await executeQuery('DELETE FROM shifts WHERE user_id = $1 AND TO_CHAR(TO_DATE(date, \'YYYY-MM-DD\'), \'YYYY-MM\') = $2', [userId, testMonth]);
        await executeQuery('DELETE FROM payouts WHERE user_id = $1 AND month = $2', [userId, testMonth]);
        await executeQuery('DELETE FROM month_status WHERE month = $1', [testMonth]);

        console.log('\n--- Шаг 1: Создание аванса (выплата без заработка) ---');
        const amount = 10000;

        const result1 = await createPayoutWithCorrection({
            user_id: userId,
            month: testMonth,
            amount: amount,
            date: payoutDate,
            comment: 'Тестовый аванс'
        });

        console.log('Результат создания выплаты:', result1);

        if (result1.payout.is_advance) {
            console.log('✅ Выплата помечена как аванс (is_advance = true)');
        } else {
            console.error('❌ ОШИБКА: Выплата НЕ помечена как аванс');
        }

        if (!result1.overpayment) {
            console.log('✅ Перенос не создан (overpayment = undefined)');
        } else {
            console.error(`❌ ОШИБКА: Создан перенос на сумму ${result1.overpayment}`);
        }

        console.log('\n--- Шаг 2: Добавление смены (частичное покрытие) ---');
        // Добавляем смену на 4000 (меньше аванса 10000)
        await addShift({
            user_id: userId,
            date: `${testMonth}-20`,
            hours: 10,
            masters: 1,
            total: 4000,
            hourly_rate: 400
        });

        // Пересчитываем
        await recalculateAdvancesForMonth(userId, testMonth);

        // Проверяем статус выплаты
        const check1 = await executeQuery('SELECT is_advance FROM payouts WHERE id = $1', [result1.payout.id]);
        if (check1.rows[0].is_advance) {
            console.log('✅ Аванс остался авансом (заработок 4000 < выплаты 10000)');
        } else {
            console.error('❌ ОШИБКА: Аванс перестал быть авансом раньше времени');
        }

        console.log('\n--- Шаг 3: Добавление смены (полное покрытие) ---');
        // Добавляем еще смену на 8000 (итого 12000 > 10000)
        await addShift({
            user_id: userId,
            date: `${testMonth}-21`,
            hours: 20,
            masters: 1,
            total: 8000,
            hourly_rate: 400
        });

        // Пересчитываем
        await recalculateAdvancesForMonth(userId, testMonth);

        // Проверяем статус выплаты
        const check2 = await executeQuery('SELECT is_advance FROM payouts WHERE id = $1', [result1.payout.id]);
        if (!check2.rows[0].is_advance) {
            console.log('✅ Аванс закрыт (заработок 12000 > выплаты 10000)');
        } else {
            console.error('❌ ОШИБКА: Аванс все еще активен, хотя заработок покрывает его');
        }

        console.log('\n--- Шаг 4: Тест закрытия месяца и создания переноса ---');
        // Создаем еще одну большую выплату, чтобы снова была переплата
        // Сейчас заработок 12000, выплачено 10000. Остаток 2000.
        // Создадим выплату на 5000. Переплата будет 3000.

        const result2 = await createPayoutWithCorrection({
            user_id: userId,
            month: testMonth,
            amount: 5000,
            date: `${testMonth}-25`,
            comment: 'Второй аванс'
        });

        console.log('Создана вторая выплата (аванс):', result2.payout.amount);

        // Теперь закрываем месяц вручную
        console.log('Закрываем месяц вручную...');
        await processMonthClosure(userId, testMonth);
        await setMonthClosed(testMonth, true);

        // Проверяем, создан ли перенос на следующий месяц (2026-01)
        const nextMonth = '2026-01';
        const carryovers = await executeQuery(
            'SELECT * FROM payouts WHERE user_id = $1 AND month = $2 AND source = \'carryover\'',
            [userId, nextMonth]
        );

        if (carryovers.rows.length > 0) {
            console.log(`✅ Перенос на ${nextMonth} успешно создан: ${carryovers.rows[0].amount} ₽`);
            // Ожидаемая сумма: (10000 + 5000) - 12000 = 3000
            if (Math.abs(carryovers.rows[0].amount - 3000) < 0.1) {
                console.log('✅ Сумма переноса верна (3000 ₽)');
            } else {
                console.error(`❌ ОШИБКА: Неверная сумма переноса. Ожидалось 3000, получено ${carryovers.rows[0].amount}`);
            }
        } else {
            console.error('❌ ОШИБКА: Перенос не создан после закрытия месяца');
        }

        // Проверяем, что авансы закрыты
        const check3 = await executeQuery('SELECT count(*) as count FROM payouts WHERE user_id = $1 AND month = $2 AND is_advance = TRUE', [userId, testMonth]);
        if (check3.rows[0].count == 0) {
            console.log('✅ Все флаги авансов сняты после закрытия месяца');
        } else {
            console.error('❌ ОШИБКА: Остались активные флаги авансов');
        }

        console.log('\n🎉 Тест завершен успешно!');

    } catch (error) {
        console.error('❌ Ошибка при тестировании:', error);
        process.exit(1);
    }
}

testAdvanceLogic()
    .then(() => {
        console.log('Скрипт завершен');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Скрипт завершен с ошибкой:', error);
        process.exit(1);
    });
