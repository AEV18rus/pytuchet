-- Инициализация PostgreSQL таблиц для локальной разработки

-- Создание таблицы shifts
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
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
  scrubbing_price REAL NOT NULL
);

-- Создание таблицы prices
CREATE TABLE IF NOT EXISTS prices (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price REAL NOT NULL
);

-- Добавление начальных цен
INSERT INTO prices (name, price) VALUES 
  ('Почасовая ставка', 400),
  ('Путевое парение', 3200),
  ('Фирменное парение', 4500),
  ('Ознакомительное парение', 2500),
  ('Скрабирование', 1200)
ON CONFLICT (name) DO NOTHING;

-- Вывод информации о созданных таблицах
\echo 'Таблицы успешно созданы:'
\dt