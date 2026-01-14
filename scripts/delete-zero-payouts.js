require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error('❌ Не найдена строка подключения (DATABASE_URL или POSTGRES_URL)');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('vercel') || connectionString.includes('neon') ? { rejectUnauthorized: false } : false,
});

async function deleteZeroPayouts() {
    try {
        // 1. Сначала посмотрим, сколько записей будет удалено
        console.log('🔍 Проверяем количество записей с нулевой суммой...');
        const countResult = await pool.query(
            `SELECT COUNT(*) as count FROM payouts WHERE user_id = 17 AND amount = 0`
        );

        const count = parseInt(countResult.rows[0].count);
        console.log(`📊 Найдено записей с нулевой суммой: ${count}`);

        if (count === 0) {
            console.log('✅ Нет записей для удаления.');
            return;
        }

        // 2. Удаляем
        console.log('🗑️  Удаляем записи...');
        const deleteResult = await pool.query(
            `DELETE FROM payouts WHERE user_id = 17 AND amount = 0`
        );

        console.log(`✅ Удалено записей: ${deleteResult.rowCount}`);

        // 3. Проверяем оставшиеся выплаты
        console.log('\n💰 Оставшиеся выплаты:');
        const remainingResult = await pool.query(
            `SELECT date, amount, comment, month 
       FROM payouts 
       WHERE user_id = 17 
       ORDER BY date DESC`
        );

        if (remainingResult.rows.length === 0) {
            console.log('Нет выплат.');
        } else {
            console.table(remainingResult.rows.map(p => ({
                'Дата': new Date(p.date).toLocaleDateString('ru-RU'),
                'Сумма': p.amount + ' ₽',
                'Месяц': p.month,
                'Комментарий': p.comment || '-'
            })));
        }

    } catch (error) {
        console.error('❌ Ошибка:', error);
    } finally {
        await pool.end();
    }
}

deleteZeroPayouts();
