# Настройка Telegram WebHook для Vercel

Этот документ описывает, как настроить Telegram бота для работы через WebHook на Vercel.

## Преимущества WebHook над Polling

- ✅ Мгновенная доставка сообщений
- ✅ Меньше нагрузки на сервер
- ✅ Подходит для production среды
- ✅ Автоматическое масштабирование на Vercel
- ✅ Не требует постоянно работающего процесса

## Шаги настройки

### 1. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_actual_bot_token_here

# Vercel Configuration (автоматически устанавливается Vercel)
VERCEL_URL=https://pytuchet.vercel.app
```

### 2. Получение токена бота

1. Найдите [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot` или используйте существующего бота
3. Скопируйте токен и добавьте в `.env.local`

### 3. Деплой на Vercel

```bash
# Убедитесь что проект собирается
npm run build

# Деплой на Vercel
vercel --prod
```

### 4. Настройка WebHook

После успешного деплоя настройте WebHook:

```bash
# Установить WebHook
npm run webhook:set

# Проверить статус WebHook
npm run webhook:info

# Удалить WebHook (если нужно)
npm run webhook:delete
```

### 5. Настройка переменных окружения в Vercel

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите проект `pytuchet`
3. Перейдите в Settings → Environment Variables
4. Добавьте переменную:
   - Name: `TELEGRAM_BOT_TOKEN`
   - Value: ваш токен бота
   - Environment: Production

### 6. Повторный деплой

После добавления переменных окружения сделайте повторный деплой:

```bash
vercel --prod
```

## Тестирование

1. Найдите вашего бота в Telegram
2. Отправьте команду `/start`
3. Бот должен ответить с кнопкой для открытия веб-приложения

## Доступные команды бота

- `/start` - Приветствие и кнопка для открытия приложения
- `/help` - Справка по использованию
- `/app` - Прямая ссылка на веб-приложение

## API Endpoint

WebHook настроен на endpoint: `https://pytuchet.vercel.app/api/telegram-webhook`

Вы можете проверить его работу, отправив GET запрос:
```bash
curl https://pytuchet.vercel.app/api/telegram-webhook
```

## Отладка

### Проверка логов Vercel

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите проект и перейдите в Functions
3. Найдите функцию `api/telegram-webhook`
4. Просмотрите логи выполнения

### Проверка WebHook статуса

```bash
npm run webhook:info
```

### Типичные проблемы

1. **WebHook не работает**
   - Проверьте, что `TELEGRAM_BOT_TOKEN` установлен в Vercel
   - Убедитесь, что URL доступен (https://pytuchet.vercel.app/api/telegram-webhook)

2. **Бот не отвечает**
   - Проверьте логи в Vercel Dashboard
   - Убедитесь, что WebHook установлен правильно

3. **Ошибки в логах**
   - Проверьте формат токена бота
   - Убедитесь, что все зависимости установлены

## Переключение между Polling и WebHook

### Отключение старого бота (Polling)

Если у вас работает бот в режиме polling, остановите его:

```bash
# В папке telegram-bot
npm stop
```

### Удаление WebHook (возврат к Polling)

```bash
npm run webhook:delete
```

После этого можете снова запустить бота в режиме polling.

## Безопасность

- Никогда не коммитьте токен бота в Git
- Используйте переменные окружения
- Регулярно проверяйте логи на подозрительную активность
- При необходимости обновите токен бота через @BotFather