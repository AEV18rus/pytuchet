import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST() {
  try {
    // Добавляем колонки если их нет
    await sql.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS display_name TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    return NextResponse.json({
      success: true,
      message: 'Схема базы данных обновлена успешно'
    });

  } catch (error) {
    console.error('Error fixing schema:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении схемы базы данных' },
      { status: 500 }
    );
  }
}