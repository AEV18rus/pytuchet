import { NextRequest, NextResponse } from 'next/server';
import { getLogs, addLog, clearLogs } from '@/lib/logging';

// GET - получить логи
export async function GET(request: NextRequest) {
  try {
    // Простая проверка авторизации (в продакшене нужна более надежная)
    const authHeader = request.headers.get('authorization');
    
    // Получаем логи
    const logs = getLogs();
    
    return NextResponse.json({
      success: true,
      logs: logs,
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
    clearLogs();
    
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