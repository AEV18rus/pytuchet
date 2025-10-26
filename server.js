const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Создание/подключение к базе данных
const db = new sqlite3.Database('shifts.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключение к SQLite базе данных установлено.');
    }
});

// Создание таблицы смен (убираем поля цен, добавляем поле total)
db.run(`CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    hours REAL NOT NULL,
    steamBath INTEGER NOT NULL,
    brandSteam INTEGER NOT NULL,
    introSteam INTEGER NOT NULL,
    scrubbing INTEGER NOT NULL,
    masters INTEGER NOT NULL DEFAULT 1,
    total REAL NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Создание таблицы для хранения актуальных цен
db.run(`CREATE TABLE IF NOT EXISTS prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hourly_rate REAL NOT NULL DEFAULT 400,
    steam_bath_price REAL NOT NULL DEFAULT 3500,
    brand_steam_price REAL NOT NULL DEFAULT 4200,
    intro_steam_price REAL NOT NULL DEFAULT 2500,
    scrubbing_price REAL NOT NULL DEFAULT 1200,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Добавление поля total к существующей таблице (для обратной совместимости)
db.run(`ALTER TABLE shifts ADD COLUMN total REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
        console.error('Ошибка добавления колонки total:', err.message);
    }
});

// Инициализация таблицы цен значениями по умолчанию, если она пуста
db.get('SELECT COUNT(*) as count FROM prices', [], (err, row) => {
    if (err) {
        console.error('Ошибка проверки таблицы prices:', err.message);
    } else if (row.count === 0) {
        db.run(`INSERT INTO prices (hourly_rate, steam_bath_price, brand_steam_price, intro_steam_price, scrubbing_price) 
                VALUES (400, 3500, 4200, 2500, 1200)`, (err) => {
            if (err) {
                console.error('Ошибка инициализации цен:', err.message);
            } else {
                console.log('Таблица цен инициализирована значениями по умолчанию.');
            }
        });
    }
});

// API маршруты

// Получить все смены
app.get('/api/shifts', (req, res) => {
    db.all('SELECT * FROM shifts ORDER BY date DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Получить актуальные цены
app.get('/api/prices', (req, res) => {
    db.get('SELECT * FROM prices ORDER BY updated_at DESC LIMIT 1', [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row || {
            hourly_rate: 400,
            steam_bath_price: 3500,
            brand_steam_price: 4200,
            intro_steam_price: 2500,
            scrubbing_price: 1200
        });
    });
});

// Обновить цены
app.post('/api/prices', (req, res) => {
    const { 
        hourlyRate,
        steamBathPrice,
        brandSteamPrice,
        introSteamPrice,
        scrubbingPrice
    } = req.body;
    
    const sql = `INSERT INTO prices (
        hourly_rate, steam_bath_price, brand_steam_price, intro_steam_price, scrubbing_price
    ) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [
        hourlyRate || 400,
        steamBathPrice || 3500,
        brandSteamPrice || 4200,
        introSteamPrice || 2500,
        scrubbingPrice || 1200
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            id: this.lastID,
            hourly_rate: hourlyRate || 400,
            steam_bath_price: steamBathPrice || 3500,
            brand_steam_price: brandSteamPrice || 4200,
            intro_steam_price: introSteamPrice || 2500,
            scrubbing_price: scrubbingPrice || 1200
        });
    });
});

// Добавить новую смену
app.post('/api/shifts', (req, res) => {
    const { 
        date, 
        hours, 
        steamBath, 
        brandSteam, 
        introSteam, 
        scrubbing, 
        masters
    } = req.body;
    
    // Получаем актуальные цены из базы данных
    db.get('SELECT * FROM prices ORDER BY updated_at DESC LIMIT 1', [], (err, priceRow) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Используем цены из базы или значения по умолчанию
        const prices = priceRow || {
            hourly_rate: 400,
            steam_bath_price: 3500,
            brand_steam_price: 4200,
            intro_steam_price: 2500,
            scrubbing_price: 1200
        };
        
        // Рассчитываем итоговую сумму на бэкенде
        const mastersCount = masters || 1;
        const hoursTotal = hours * prices.hourly_rate;
        const servicesTotal = (
            (steamBath * prices.steam_bath_price) +
            (brandSteam * prices.brand_steam_price) +
            (introSteam * prices.intro_steam_price) +
            (scrubbing * prices.scrubbing_price)
        );
        const total = Math.round(hoursTotal + (servicesTotal * 0.4 / mastersCount));
        
        // Сохраняем смену с рассчитанной суммой
        const sql = `INSERT INTO shifts (
            date, hours, steamBath, brandSteam, introSteam, scrubbing, masters, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [
            date, 
            hours, 
            steamBath, 
            brandSteam, 
            introSteam, 
            scrubbing, 
            mastersCount,
            total
        ], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                id: this.lastID,
                date,
                hours,
                steamBath,
                brandSteam,
                introSteam,
                scrubbing,
                masters: mastersCount,
                total
            });
        });
    });
});

// Удалить смену
app.delete('/api/shifts/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM shifts WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Смена не найдена' });
            return;
        }
        res.json({ message: 'Смена удалена', deletedID: id });
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});

// Обработка закрытия приложения
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Соединение с базой данных закрыто.');
        process.exit(0);
    });
});