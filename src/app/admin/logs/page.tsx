'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/logs');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        console.error('Ошибка загрузки логов:', response.statusText);
      }
    } catch (error) {
      console.error('Ошибка загрузки логов:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      const response = await fetch('/api/admin/logs', {
        method: 'DELETE'
      });
      if (response.ok) {
        setLogs([]);
      }
    } catch (error) {
      console.error('Ошибка очистки логов:', error);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadLogs, 5000); // Обновление каждые 5 секунд
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU');
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return '#ff4444';
      case 'warning': return '#ffaa00';
      case 'info': return '#4444ff';
      default: return '#666';
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div className="header-content">
          <div 
            className="logo"
            onClick={() => router.push('/')}
            style={{ cursor: 'pointer' }}
          >
            <Image
              src="/logo.svg"
              alt="Логотип"
              width={50}
              height={50}
            />
          </div>
          <div className="header-text">
            <h1>Системные логи</h1>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="logs-controls">
          <div className="controls-left">
            <button 
              onClick={() => router.push('/admin')}
              className="btn btn-secondary"
            >
              ← Назад к админ панели
            </button>
          </div>
          
          <div className="controls-center">
            <button 
              onClick={loadLogs}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Загрузка...' : 'Обновить'}
            </button>
            
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Автообновление (5с)
            </label>
          </div>
          
          <div className="controls-right">
            <button 
              onClick={clearLogs}
              className="btn btn-danger"
            >
              Очистить логи
            </button>
          </div>
        </div>

        <div className="logs-container">
          {loading && logs.length === 0 ? (
            <div className="loading">Загрузка логов...</div>
          ) : logs.length === 0 ? (
            <div className="no-logs">Логи отсутствуют</div>
          ) : (
            <div className="logs-list">
              {logs.map((log, index) => (
                <div key={index} className="log-entry">
                  <div className="log-header">
                    <span 
                      className="log-level"
                      style={{ color: getLevelColor(log.level) }}
                    >
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="log-timestamp">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  <div className="log-message">
                    {log.message}
                  </div>
                  {log.details && (
                    <div className="log-details">
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: var(--background-card);
          border-radius: 15px;
          box-shadow: 0 20px 40px var(--shadow-light);
          overflow: hidden;
        }

        .header {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          padding: 5px !important;
          text-align: center;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: nowrap;
          max-width: 400px;
          margin: 0 auto;
        }

        .logo {
          width: 50px;
          height: 50px;
          flex-shrink: 0;
        }

        .header-text {
          text-align: left;
        }

        .header h1 {
          font-size: 2.5em;
          margin-bottom: 10px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .content {
          padding: 30px;
        }

        .logs-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 15px;
          background: #f5f5f5;
          border-radius: 8px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .controls-left, .controls-center, .controls-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .auto-refresh-toggle {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 14px;
          cursor: pointer;
        }

        .logs-container {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          max-height: 70vh;
          overflow-y: auto;
        }

        .loading, .no-logs {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 16px;
        }

        .logs-list {
          padding: 0;
        }

        .log-entry {
          border-bottom: 1px solid #eee;
          padding: 15px;
        }

        .log-entry:last-child {
          border-bottom: none;
        }

        .log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .log-level {
          font-weight: bold;
          font-family: monospace;
        }

        .log-timestamp {
          font-size: 12px;
          color: #666;
          font-family: monospace;
        }

        .log-message {
          font-family: monospace;
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 8px;
        }

        .log-details {
          background: #f8f8f8;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 10px;
          margin-top: 8px;
        }

        .log-details pre {
          margin: 0;
          font-size: 12px;
          color: #333;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #545b62;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background: #c82333;
        }

        @media (max-width: 768px) {
          .logs-controls {
            flex-direction: column;
            align-items: stretch;
          }

          .controls-left, .controls-center, .controls-right {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}