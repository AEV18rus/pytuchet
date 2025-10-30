import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST() {
  try {
    // Добавляем недостающие колонки в users
    await sql.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS display_name TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // Добавляем недостающие колонки в shifts (для новых услуг)
    await sql.query(`
      ALTER TABLE shifts 
      ADD COLUMN IF NOT EXISTS zaparnik INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS zaparnik_price REAL NOT NULL DEFAULT 0
    `);

    return NextResponse.json({
      success: true,
      message: 'Схема базы данных обновлена успешно (users, shifts)'
    });

  } catch (error) {
    console.error('Error fixing schema:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении схемы базы данных' },
      { status: 500 }
    );
  }
}