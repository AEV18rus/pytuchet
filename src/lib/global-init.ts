import { initDatabase } from '@/services/db-init.service';

// Глобальная переменная для отслеживания инициализации
declare global {
  var __db_initialized: boolean | undefined;
  var __db_init_promise: Promise<void> | undefined;
}

export async function ensureDatabaseInitialized(): Promise<void> {
  // Если база уже инициализирована, возвращаемся сразу
  if (global.__db_initialized) {
    return;
  }

  // Если инициализация уже в процессе, ждем её завершения
  if (global.__db_init_promise) {
    console.log('⏳ Waiting for existing DB init promise...');
    await global.__db_init_promise;
    console.log('✅ Waited for DB init promise - DONE');
    return;
  }

  // Создаем промис инициализации
  global.__db_init_promise = initDatabase();

  try {
    await global.__db_init_promise;
    global.__db_initialized = true;
    console.log('✅ Database initialized globally');
  } catch (error) {
    // Сбрасываем промис при ошибке, чтобы можно было попробовать снова
    global.__db_init_promise = undefined;
    console.error('❌ Failed to initialize database globally:', error);
    throw error;
  }
}