// Скрипт для настройки Telegram WebHook
// Запуск: node scripts/setup-telegram-webhook.js

const dotenv = require('dotenv');

// Загружаем переменные окружения
dotenv.config({ path: '.env.local' });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.VERCEL_URL || 'https://pytuchet.vercel.app';

if (!BOT_TOKEN) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в .env.local');
  process.exit(1);
}

async function setWebhook() {
  const webhookUrl = `${WEBHOOK_URL}/api/telegram-webhook`;
  
  console.log('🔧 Настройка Telegram WebHook...');
  console.log('📍 URL:', webhookUrl);
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'],
      }),
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ WebHook успешно настроен!');
      console.log('📋 Результат:', result.description);
    } else {
      console.error('❌ Ошибка настройки WebHook:', result.description);
    }
  } catch (error) {
    console.error('❌ Ошибка запроса:', error);
  }
}

async function getWebhookInfo() {
  console.log('\n🔍 Проверка текущих настроек WebHook...');
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const result = await response.json();
    
    if (result.ok) {
      console.log('📋 Информация о WebHook:');
      console.log('   URL:', result.result.url || 'Не установлен');
      console.log('   Статус:', result.result.has_custom_certificate ? 'С сертификатом' : 'Без сертификата');
      console.log('   Ожидающие обновления:', result.result.pending_update_count);
      
      if (result.result.last_error_date) {
        console.log('   Последняя ошибка:', new Date(result.result.last_error_date * 1000).toLocaleString());
        console.log('   Сообщение об ошибке:', result.result.last_error_message);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка получения информации:', error);
  }
}

async function deleteWebhook() {
  console.log('\n🗑️ Удаление WebHook...');
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ WebHook удален!');
    } else {
      console.error('❌ Ошибка удаления WebHook:', result.description);
    }
  } catch (error) {
    console.error('❌ Ошибка запроса:', error);
  }
}

// Основная функция
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'set':
      await setWebhook();
      break;
    case 'info':
      await getWebhookInfo();
      break;
    case 'delete':
      await deleteWebhook();
      break;
    default:
      console.log('📋 Использование:');
      console.log('   npx ts-node scripts/setup-telegram-webhook.ts set    - Установить WebHook');
      console.log('   npx ts-node scripts/setup-telegram-webhook.ts info   - Получить информацию о WebHook');
      console.log('   npx ts-node scripts/setup-telegram-webhook.ts delete - Удалить WebHook');
      break;
  }
}

main().catch(console.error);