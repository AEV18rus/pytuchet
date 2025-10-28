// Система логирования для приложения
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: any;
}

// Временное хранилище логов в памяти (для разработки)
let logs: LogEntry[] = [];

export function addLog(level: LogEntry['level'], message: string, details?: any): LogEntry {
  const logEntry: LogEntry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    level,
    message,
    details
  };
  
  logs.push(logEntry);
  
  // Ограничиваем количество логов в памяти
  if (logs.length > 1000) {
    logs = logs.slice(-500);
  }
  
  // Также выводим в консоль для отладки
  console.log(`[${logEntry.level.toUpperCase()}] ${logEntry.message}`, details || '');
  
  return logEntry;
}

export function getLogs(): LogEntry[] {
  return [...logs].reverse(); // Возвращаем копию в обратном порядке (новые сверху)
}

export function clearLogs(): void {
  logs = [];
}