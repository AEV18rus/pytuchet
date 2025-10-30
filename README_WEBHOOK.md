# 🤖 Telegram Bot WebHook для Vercel

## 📋 Обзор

Telegram бот теперь интегрирован в Next.js приложение и работает через WebHook на Vercel. Это обеспечивает:

- ⚡ Мгновенную доставку сообщений
- 🚀 Автоматическое масштабирование
- 💰 Экономию ресурсов
- 🔒 Безопасность production-уровня

## 🏗️ Архитектура

```
Telegram → WebHook → Vercel Function → Response
                         ↓
                   Next.js API Route
                   /api/telegram-webhook
```

## 📁 Структура файлов

```
src/app/api/telegram-webhook/
└── route.ts                    # Основной обработчик WebHook

scripts/
└── setup-telegram-webhook.js   # Скрипт настройки WebHook

package.json                    # Новые npm скрипты
.env.example                    # Пример переменных окружения
TELEGRAM_WEBHOOK_SETUP.md       # Подробная документация
FINAL_SETUP_INSTRUCTIONS.md     # Финальные шаги
```

## 🚀 Быстрый старт

### 1. Настройте переменные окружения в Vercel

```bash
# В Vercel Dashboard → Settings → Environment Variables
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 2. Повторный деплой

```bash
vercel --prod
```

### 3. Настройка WebHook

```bash
# Создайте локальный .env.local
echo "TELEGRAM_BOT_TOKEN=your_token" > .env.local

# Установите WebHook
npm run webhook:set
```

## 🛠️ Доступные команды

```bash
# WebHook управление
npm run webhook:set      # Установить WebHook
npm run webhook:info     # Проверить статус
npm run webhook:delete   # Удалить WebHook

# Разработка
npm run dev             # Локальная разработка
npm run build           # Сборка проекта
vercel --prod           # Деплой на Vercel
```

## 🤖 Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Приветствие + кнопка веб-приложения |
| `/help` | Справка по использованию |
| `/app` | Прямая ссылка на приложение |

## 🔧 API Endpoints

### WebHook Endpoint
- **URL**: `https://pytuchet.vercel.app/api/telegram-webhook`
- **Methods**: `POST` (WebHook), `GET` (проверка статуса)
- **Безопасность**: Проверка токена через переменные окружения

### Тестирование
```bash
# Проверка работоспособности
curl https://pytuchet.vercel.app/api/telegram-webhook

# Ответ
{"status":"Telegram WebHook endpoint работает","timestamp":"..."}
```

## 📊 Мониторинг

### Vercel Dashboard
1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите проект `pytuchet`
3. **Functions** → `api/telegram-webhook`
4. Просмотр логов в реальном времени

### WebHook статус
```bash
npm run webhook:info
```

Пример вывода:
```
📋 Информация о WebHook:
   URL: https://pytuchet.vercel.app/api/telegram-webhook
   Статус: Без сертификата
   Ожидающие обновления: 0
```

## 🔄 Переключение режимов

### WebHook → Polling
```bash
npm run webhook:delete
cd telegram-bot && npm start
```

### Polling → WebHook
```bash
# Остановите polling бота
pkill -f "npm start"

# Установите WebHook
npm run webhook:set
```

## 🐛 Отладка

### Типичные проблемы

1. **Бот не отвечает**
   ```bash
   # Проверьте переменные окружения
   npm run webhook:info
   
   # Проверьте логи в Vercel Dashboard
   ```

2. **WebHook не установлен**
   ```bash
   # Убедитесь что токен правильный
   echo $TELEGRAM_BOT_TOKEN
   
   # Переустановите WebHook
   npm run webhook:delete
   npm run webhook:set
   ```

3. **Ошибки в логах**
   - Проверьте формат токена (должен содержать `:`)
   - Убедитесь что приложение развернуто на Vercel
   - Проверьте доступность URL

### Логи и диагностика

```bash
# Локальная разработка
npm run dev
# Проверьте http://localhost:3000/api/telegram-webhook

# Production логи
# Vercel Dashboard → Functions → api/telegram-webhook
```

## 🔒 Безопасность

- ✅ Токен бота хранится в переменных окружения Vercel
- ✅ Никаких секретов в коде
- ✅ HTTPS обязателен для WebHook
- ✅ Валидация входящих данных

## 📈 Производительность

- **Cold Start**: ~100-300ms (Vercel Functions)
- **Warm Response**: ~10-50ms
- **Масштабирование**: Автоматическое
- **Лимиты**: Согласно плану Vercel

## 🎯 Следующие шаги

1. ✅ WebHook настроен и работает
2. 🔄 Мониторинг через Vercel Dashboard
3. 📊 Анализ использования и производительности
4. 🚀 Добавление новых команд бота (при необходимости)

---

**Готово!** 🎉 Ваш Telegram бот теперь работает через WebHook на Vercel с максимальной производительностью и надежностью.