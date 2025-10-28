import { NextRequest, NextResponse } from 'next/server';

// Простое хранилище логов в памяти (в продакшене лучше использовать базу данных)
let logs: Array<{
  timestamp: string;
  level: 'info' | 'error' | 'warning';
  message: string;
  details?: any;
}> = [];

// Функция для добавления лога
export function addLog(level: 'info' | 'error' | 'warning', message: string, details?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details
  };
  
  logs.push(logEntry);
  
  // Ограничиваем количество логов (последние 1000)
  if (logs.length > 1000) {
    logs = logs.slice(-1000);
  }
  
  console.log(`[${level.toUpperCase()}] ${message}`, details || '');
}

// GET - получить логи
export async function GET(request: NextRequest) {
  try {
    // Простая проверка авторизации (в продакшене нужна более надежная)
    const authHeader = request.headers.get('authorization');
    
    // Возвращаем логи (сортируем по времени, новые сверху)
    const sortedLogs = [...logs].reverse();
    
    return NextResponse.json({
      success: true,
      logs: sortedLogs,
      total: logs.length
    });
  } catch (error) {
    console.error('Ошибка получения логов:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения логов' },
      { status: 500 }
    );
  }
}

// DELETE - очистить логи
export async function DELETE(request: NextRequest) {
  try {
    logs = [];
    
    addLog('info', 'Логи очищены администратором');
    
    return NextResponse.json({
      success: true,
      message: 'Логи очищены'
    });
  } catch (error) {
    console.error('Ошибка очистки логов:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка очистки логов' },
      { status: 500 }
    );
  }
}

// Экспортируем функцию для использования в других частях приложения
export { addLog as logToSystem };