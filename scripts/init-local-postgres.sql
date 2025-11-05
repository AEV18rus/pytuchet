-- Инициализация PostgreSQL таблиц для локальной разработки

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  username TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'master',
  browser_login TEXT,
  password_hash TEXT,
  password_set_at TIMESTAMP,
  last_login_at TIMESTAMP,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Уникальный индекс для логина (позволяет несколько NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_browser_login ON users(browser_login);

-- Создание таблицы shifts
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  hours REAL NOT NULL,
  steam_bath INTEGER NOT NULL DEFAULT 0,
  brand_steam INTEGER NOT NULL DEFAULT 0,
  intro_steam INTEGER NOT NULL DEFAULT 0,
  scrubbing INTEGER NOT NULL DEFAULT 0,
  masters INTEGER NOT NULL DEFAULT 1,
  total REAL NOT NULL,
  hourly_rate REAL NOT NULL,
  steam_bath_price REAL NOT NULL,
  brand_steam_price REAL NOT NULL,
  intro_steam_price REAL NOT NULL,
  scrubbing_price REAL NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы prices (общие цены для всех пользователей)
CREATE TABLE IF NOT EXISTS prices (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price REAL NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы default_prices для значений по умолчанию
CREATE TABLE IF NOT EXISTS default_prices (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price REAL NOT NULL
);

-- Добавление начальных цен по умолчанию
INSERT INTO default_prices (name, price) VALUES 
  ('Почасовая ставка', 400),
  ('Путевое парение', 3200),
  ('Фирменное парение', 4500),
  ('Ознакомительное парение', 2500),
  ('Скрабирование', 1200)
ON CONFLICT (name) DO NOTHING;

-- Вывод информации о созданных таблицах
\echo 'Таблицы успешно созданы:'
\dt