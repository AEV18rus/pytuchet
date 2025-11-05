// Устанавливаем переменную окружения для подключения к базе данных
process.env.POSTGRES_URL = "postgresql://neondb_owner:npg_FuYknM4g3rji@ep-damp-queen-a4y4suae-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const { createUser, getUserByTelegramId, initDatabase } = require('../src/lib/db.ts');

async function createTestUser() {
  try {
    // Инициализируем базу данных
    console.log('Инициализация базы данных...');
    await initDatabase();
    
    // Проверяем, существует ли уже пользователь
    console.log('Проверяем существующего пользователя...');
    const existingUser = await getUserByTelegramId(87654321);
    if (existingUser) {
      console.log('Пользователь уже существует:', existingUser);
      return existingUser;
    }

    // Создаем нового пользователя
    console.log('Создаем нового пользователя...');
    const newUser = await createUser({
      telegram_id: 87654321,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser'
    });
    console.log('Создан тестовый пользователь:', newUser);
    return newUser;
  } catch (error) {
    console.error('Ошибка:', error);
    throw error;
  }
}

createTestUser()
  .then(() => {
    console.log('Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Скрипт завершен с ошибкой:', error);
    process.exit(1);
  });