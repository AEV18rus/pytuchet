import { NextRequest, NextResponse } from 'next/server';
import { getLogs, addLog, clearLogs } from '@/lib/logging';
import { requireAdmin } from '@/lib/auth-server';

// GET - получить логи
export async function GET(request: NextRequest) {
  try {
    // Требуется роль администратора
    await requireAdmin(request);
    
    // Получаем логи
    const logs = getLogs();
    
    return NextResponse.json({
      success: true,
      logs: logs,
      total: logs.length
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ success: false, error: 'Доступ запрещен' }, { status: 403 });
      }
    }
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
    await requireAdmin(request);
    clearLogs();
    
    addLog('info', 'Логи очищены администратором');
    
    return NextResponse.json({
      success: true,
      message: 'Логи очищены'
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ success: false, error: 'Доступ запрещен' }, { status: 403 });
      }
    }
    console.error('Ошибка очистки логов:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка очистки логов' },
      { status: 500 }
    );
  }
}