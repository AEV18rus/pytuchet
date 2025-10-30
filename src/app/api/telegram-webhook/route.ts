import { NextRequest, NextResponse } from 'next/server';

// Telegram Bot API types
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

interface TelegramMessage {
  chat_id: number;
  text: string;
  reply_markup?: {
    inline_keyboard: Array<Array<{
      text: string;
      web_app?: { url: string };
      url?: string;
    }>>;
  };
}

// Функция для отправки сообщения через Telegram Bot API
async function sendTelegramMessage(message: TelegramMessage) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN не найден в переменных окружения');
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Ошибка отправки сообщения: ${response.statusText}`);
  }

  return response.json();
}

// Обработчик команды /start
async function handleStartCommand(chatId: number, firstName: string) {
  const message: TelegramMessage = {
    chat_id: chatId,
    text: `Привет, ${firstName}! 👋\n\nДобро пожаловать в систему учета рабочих смен Путёвой учёт!\n\n🔹 Ведите учет своих смен\n🔹 Отслеживайте заработок\n🔹 Просматривайте статистику\n\nНажмите кнопку ниже, чтобы открыть приложение:`,
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🚀 Открыть приложение',
          web_app: { url: 'https://pytuchet.vercel.app/' }
        }
      ]]
    }
  };

  return sendTelegramMessage(message);
}

// Обработчик команды /help
async function handleHelpCommand(chatId: number) {
  const message: TelegramMessage = {
    chat_id: chatId,
    text: `📋 Помощь по использованию бота:\n\n🔸 /start - Начать работу с ботом\n🔸 /app - Открыть веб-приложение\n🔸 /help - Показать это сообщение\n\n💡 Основные функции:\n• Учет рабочих смен\n• Расчет заработка\n• Просмотр статистики\n• Управление ценами услуг\n\nДля работы с приложением нажмите /app или используйте кнопку "Открыть приложение".`,
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🚀 Открыть приложение',
          web_app: { url: 'https://pytuchet.vercel.app/' }
        }
      ]]
    }
  };

  return sendTelegramMessage(message);
}

// Обработчик команды /app
async function handleAppCommand(chatId: number) {
  const message: TelegramMessage = {
    chat_id: chatId,
    text: `🚀 Открываем веб-приложение...\n\nВы будете перенаправлены в систему учета рабочих смен.`,
    reply_markup: {
      inline_keyboard: [[
        {
          text: '📱 Открыть Путёвой учёт',
          web_app: { url: 'https://pytuchet.vercel.app/' }
        }
      ]]
    }
  };

  return sendTelegramMessage(message);
}

// Обработчик неизвестных команд
async function handleUnknownMessage(chatId: number) {
  const message: TelegramMessage = {
    chat_id: chatId,
    text: `❓ Извините, я не понимаю эту команду.\n\nИспользуйте:\n🔸 /start - Начать работу\n🔸 /help - Получить помощь\n🔸 /app - Открыть приложение`,
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🚀 Открыть приложение',
          web_app: { url: 'https://pytuchet.vercel.app/' }
        }
      ]]
    }
  };

  return sendTelegramMessage(message);
}

// Основной обработчик WebHook
export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    
    console.log('📨 Получено обновление от Telegram:', JSON.stringify(update, null, 2));

    // Проверяем, есть ли сообщение в обновлении
    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const { message } = update;
    const chatId = message.chat.id;
    const text = message.text;
    const firstName = message.from.first_name;

    // Обрабатываем команды
    if (text) {
      if (text === '/start') {
        await handleStartCommand(chatId, firstName);
      } else if (text === '/help') {
        await handleHelpCommand(chatId);
      } else if (text === '/app') {
        await handleAppCommand(chatId);
      } else {
        await handleUnknownMessage(chatId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ Ошибка обработки WebHook:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Обработчик GET запросов (для проверки работоспособности)
export async function GET() {
  return NextResponse.json({ 
    status: 'Telegram WebHook endpoint работает',
    timestamp: new Date().toISOString()
  });
}