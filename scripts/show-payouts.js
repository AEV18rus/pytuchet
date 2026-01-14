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

async function showPayouts() {
    try {
        // 1. Находим пользователя
        console.log('🔍 Ищем пользователя "Губина Анна"...');
        const userResult = await pool.query(
            `SELECT id, first_name, last_name, display_name 
       FROM users 
       WHERE first_name ILIKE '%Губина%' 
          OR last_name ILIKE '%Губина%' 
          OR display_name ILIKE '%Губина%'
          OR first_name ILIKE '%Анна%' 
          OR last_name ILIKE '%Анна%' 
          OR display_name ILIKE '%Анна%'`
        );

        if (userResult.rows.length === 0) {
            console.log('❌ Пользователь не найден.');
            return;
        }

        // Фильтруем более точно
        const targetUser = userResult.rows.find(u =>
            (u.first_name && u.first_name.includes('Губина')) ||
            (u.last_name && u.last_name.includes('Губина')) ||
            (u.display_name && u.display_name.includes('Губина'))
        ) || userResult.rows[0];

        console.log(`✅ Нашли пользователя: ${targetUser.first_name || ''} ${targetUser.last_name || ''} (${targetUser.display_name || 'без ника'}) [ID: ${targetUser.id}]`);

        // 2. Получаем выплаты
        console.log('\n💰 Выплаты:');
        const payoutsResult = await pool.query(
            `SELECT date, amount, comment, is_advance, month 
       FROM payouts 
       WHERE user_id = $1 
       ORDER BY date DESC`,
            [targetUser.id]
        );

        if (payoutsResult.rows.length === 0) {
            console.log('Нет выплат.');
        } else {
            console.table(payoutsResult.rows.map(p => ({
                'Дата': new Date(p.date).toLocaleDateString('ru-RU'),
                'Сумма': p.amount + ' ₽',
                'Месяц': p.month,
                'Аванс': p.is_advance ? 'ДА' : 'Нет',
                'Комментарий': p.comment || '-'
            })));
        }

    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        await pool.end();
    }
}

showPayouts();
