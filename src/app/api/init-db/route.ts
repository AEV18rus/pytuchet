import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

export async function POST() {
  try {
    // Проверяем наличие переменных окружения
    if (!process.env.POSTGRES_URL_NON_POOLING && !process.env.POSTGRES_URL) {
      return NextResponse.json({
        error: 'База данных не настроена',
        details: 'Переменные окружения POSTGRES_URL_NON_POOLING или POSTGRES_URL не найдены. Настройте Vercel Postgres в панели управления.',
        setup_required: true
      }, { status: 503 });
    }

    console.log('Инициализация базы данных...');
    await initDatabase();
    
    return NextResponse.json({ 
      message: 'База данных успешно инициализирована',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
    return NextResponse.json({ 
      error: 'Ошибка при инициализации базы данных',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Проверяем наличие переменных окружения
    if (!process.env.POSTGRES_URL_NON_POOLING && !process.env.POSTGRES_URL) {
      return NextResponse.json({
        error: 'База данных не настроена',
        details: 'Переменные окружения POSTGRES_URL_NON_POOLING или POSTGRES_URL не найдены. Настройте Vercel Postgres в панели управления.',
        setup_required: true
      }, { status: 503 });
    }

    // Проверяем состояние базы данных
    const { sql } = await import('@vercel/postgres');
    
    // Проверяем существование таблиц
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tables = tablesResult.rows.map(row => row.table_name);
    const hasShiftsTable = tables.includes('shifts');
    const hasPricesTable = tables.includes('prices');
    
    let pricesCount = 0;
    let shiftsCount = 0;
    
    if (hasPricesTable) {
      const pricesResult = await sql`SELECT COUNT(*) as count FROM prices`;
      pricesCount = parseInt(pricesResult.rows[0].count);
    }
    
    if (hasShiftsTable) {
      const shiftsResult = await sql`SELECT COUNT(*) as count FROM shifts`;
      shiftsCount = parseInt(shiftsResult.rows[0].count);
    }
    
    return NextResponse.json({
      status: 'ok',
      database: {
        tables: tables,
        hasShiftsTable,
        hasPricesTable,
        pricesCount,
        shiftsCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Ошибка при проверке базы данных:', error);
    return NextResponse.json({ 
      error: 'Ошибка при проверке базы данных',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}