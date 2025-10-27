# Pytuchet - Учет рабочих смен

Веб-приложение для учета рабочих смен и заработка в банном комплексе. Построено на Next.js с использованием PostgreSQL.

## 🚀 Возможности

- ✅ Учет рабочих смен с детализацией по услугам
- 💰 Управление ценами на услуги
- 📊 Автоматический расчет заработка
- 📱 Адаптивный дизайн для мобильных устройств
- 🔄 Синхронизация данных в реальном времени

## 🛠 Технологии

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **База данных**: PostgreSQL (локально) / Vercel Postgres (production)
- **Деплой**: Vercel

## 📦 Установка и запуск

### Локальная разработка

1. **Клонируйте репозиторий:**
```bash
git clone https://github.com/AEV18rus/pytuchet.git
cd pytuchet
```

2. **Установите зависимости:**
```bash
npm install
```

3. **Настройте PostgreSQL:**
```bash
# Создайте базу данных
createdb pytuchet

# Инициализируйте таблицы
npm run init-postgres
```

4. **Настройте переменные окружения:**
Скопируйте `.env.local` и настройте подключение к вашей PostgreSQL:
```bash
POSTGRES_URL="postgres://username@localhost:5432/pytuchet"
```

5. **Запустите сервер разработки:**
```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## 🚀 Деплой на Vercel

### Настройка Vercel Postgres

1. **Создайте проект на Vercel:**
   - Подключите GitHub репозиторий
   - Vercel автоматически определит Next.js проект

2. **Добавьте Vercel Postgres:**
   - В панели проекта перейдите в Storage → Create Database
   - Выберите Postgres и создайте базу данных
   - Vercel автоматически добавит переменные окружения

3. **Инициализируйте базу данных:**
   ```bash
   # После деплоя вызовите API для инициализации
   curl -X POST https://your-app.vercel.app/api/init-db
   ```

Подробные инструкции см. в [VERCEL_SETUP.md](./VERCEL_SETUP.md)

## 📋 Полезные команды

```bash
# Разработка
npm run dev              # Запуск сервера разработки
npm run build           # Сборка для production
npm run start           # Запуск production сервера

# База данных
npm run init-postgres   # Инициализация локальной PostgreSQL
npm run init-vercel     # Инициализация Vercel Postgres
npm run view-db         # Просмотр содержимого базы данных

# Деплой
vercel                  # Деплой на Vercel
vercel --prod          # Деплой в production
```

## 📊 Структура базы данных

### Таблица `shifts` (смены)
- `id` - уникальный идентификатор
- `date` - дата смены
- `start_time` - время начала
- `end_time` - время окончания
- `services` - JSON с услугами и количеством
- `total_earnings` - общий заработок
- `created_at` - время создания записи

### Таблица `prices` (цены)
- `id` - уникальный идентификатор
- `service_name` - название услуги
- `price` - цена за услугу
- `created_at` - время создания записи
- `updated_at` - время последнего обновления

## 🤝 Участие в разработке

1. Форкните репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект распространяется под лицензией MIT. См. файл `LICENSE` для подробностей.
