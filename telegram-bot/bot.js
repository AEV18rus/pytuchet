require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Замените 'YOUR_BOT_TOKEN' на токен вашего бота, полученный от @BotFather
const token = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';

// Проверяем токен
console.log('🔑 Проверка токена...');
if (!token || token === 'YOUR_BOT_TOKEN') {
    console.error('❌ Ошибка: Токен бота не найден! Проверьте файл .env');
    process.exit(1);
}
console.log('✅ Токен найден:', token.substring(0, 10) + '...');

// Настройки сервера
const PORT = process.env.PORT || 3500;
const USE_WEBHOOK = process.env.USE_WEBHOOK === 'true';

// Создаем экземпляр бота
let bot;

if (USE_WEBHOOK) {
    // Webhook режим (для продакшена)
    bot = new TelegramBot(token, { webHook: true });
    bot.setWebHook(`${process.env.WEBHOOK_URL}/bot${token}`);
    
    // Создаем Express сервер для webhook
    const express = require('express');
    const app = express();
    
    app.use(express.json());
    
    // Endpoint для webhook
    app.post(`/bot${token}`, (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    });
    
    // Запускаем сервер
    app.listen(PORT, () => {
        console.log(`🌐 Webhook сервер запущен на порту ${PORT}`);
        console.log(`📱 Веб-приложение: https://pytuchet.vercel.app/`);
    });
} else {
    // Polling режим (для разработки)
    bot = new TelegramBot(token, { polling: true });
    console.log('🤖 Бот запущен в polling режиме');
    console.log(`📱 Веб-приложение: https://pytuchet.vercel.app/`);
}

// URL веб-приложения
const webAppUrl = 'https://pytuchet.vercel.app/';

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'Пользователь';
    
    console.log(`📨 Получена команда /start от пользователя ${firstName} (ID: ${chatId})`);
    
    // Создаем inline клавиатуру с кнопкой для открытия веб-приложения
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '🚀 Открыть приложение',
                        web_app: { url: webAppUrl }
                    }
                ]
            ]
        }
    };
    
    // Отправляем приветственное сообщение с кнопкой
    bot.sendMessage(chatId, `Привет, ${firstName}! 👋\n\nДобро пожаловать в Путёвой учёт!\n\nНажмите кнопку ниже, чтобы открыть веб-приложение:`, options);
});

// Обработчик команды /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    
    const helpText = `
🤖 *Помощь по боту Путёвой учёт*

Доступные команды:
• /start - Запустить бота и получить кнопку для открытия приложения
• /app - Получить ссылку на веб-приложение
• /help - Показать это сообщение

Просто нажмите кнопку "Открыть приложение" для доступа к веб-версии!
    `;
    
    bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

// Обработчик команды /app
bot.onText(/\/app/, (msg) => {
    const chatId = msg.chat.id;
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '🚀 Открыть приложение',
                        web_app: { url: webAppUrl }
                    }
                ],
                [
                    {
                        text: '🔗 Открыть в браузере',
                        url: webAppUrl
                    }
                ]
            ]
        }
    };
    
    bot.sendMessage(chatId, '📱 *Путёвой учёт*\n\nВыберите способ открытия приложения:', { 
        parse_mode: 'Markdown',
        ...options 
    });
});

// Обработчик всех остальных сообщений
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    
    console.log(`📩 Получено сообщение: "${messageText}" от пользователя ID: ${chatId}`);
    
    // Игнорируем команды, которые уже обработаны
    if (messageText && !messageText.startsWith('/')) {
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '🚀 Открыть приложение',
                            web_app: { url: webAppUrl }
                        }
                    ]
                ]
            }
        };
        
        bot.sendMessage(chatId, 'Используйте команду /start для начала работы или нажмите кнопку ниже:', options);
    }
});

// Обработка ошибок
bot.on('error', (error) => {
    console.error('Ошибка бота:', error);
});

// Обработка polling ошибок
bot.on('polling_error', (error) => {
    console.error('Ошибка polling:', error);
});