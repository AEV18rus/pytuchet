import { initDatabase } from './db';

// Инициализация базы данных при старте приложения
let startupInitialized = false;

export async function initializeApp(): Promise<void> {
  if (startupInitialized) {
    return;
  }

  try {
    console.log('🚀 Initializing application...');
    await initDatabase();
    startupInitialized = true;
    console.log('✅ Application initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    throw error;
  }
}

// Автоматическая инициализация при импорте модуля
initializeApp().catch(error => {
  console.error('Failed to initialize app on startup:', error);
});