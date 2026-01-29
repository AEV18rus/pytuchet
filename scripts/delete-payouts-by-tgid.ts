
import { executeQuery } from '../src/lib/db-client';
import { loadEnvConfig } from '@next/env';

// Load environment variables correctly
loadEnvConfig(process.cwd());

async function main() {
    const tgIdStr = process.argv[2];
    if (!tgIdStr) {
        console.error('❌ Ошибка: Введите Telegram ID вторым аргументом.');
        console.log('Пример: npx tsx scripts/delete-payouts-by-tgid.ts 123456789');
        process.exit(1);
    }

    const tgId = parseInt(tgIdStr, 10);
    if (isNaN(tgId)) {
        console.error('❌ Ошибка: Telegram ID должен быть числом.');
        process.exit(1);
    }

    try {
        console.log(`🔍 Поиск пользователя с Telegram ID: ${tgId}...`);
        const userResult = await executeQuery(
            'SELECT id, first_name, last_name, display_name FROM users WHERE telegram_id = $1',
            [tgId]
        );

        if (userResult.rows.length === 0) {
            console.error(`❌ Пользователь с Telegram ID ${tgId} не найден.`);
            process.exit(1);
        }

        const user = userResult.rows[0];
        const name = user.display_name || `${user.first_name} ${user.last_name || ''}`.trim();
        console.log(`👤 Найден пользователь: ${name} (Internal ID: ${user.id})`);

        // Сначала посчитаем, сколько выплат, чтобы показать
        const countResult = await executeQuery('SELECT count(*) as cnt FROM payouts WHERE user_id = $1', [user.id]);
        const count = countResult.rows[0].cnt;

        if (parseInt(count) === 0) {
            console.log('ℹ️ У пользователя нет выплат. Удалять нечего.');
            process.exit(0);
        }

        console.log(`⚠️ Найдено ${count} выплат. Удаляем...`);

        // Удаляем
        await executeQuery('DELETE FROM payouts WHERE user_id = $1', [user.id]);

        console.log(`✅ Успешно удалено ${count} выплат для пользователя ${name}.`);
        console.log(`ℹ️ Баланс пользователя изменится (долг увеличится).`);

    } catch (error) {
        console.error('❌ Ошибка при выполнении:', error);
        process.exit(1);
    }
}

main();
