'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';

// Типы для Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        initDataUnsafe: {
          user?: {
            id: number;
            telegram_id: number;
            first_name: string;
            last_name: string;
            username?: string;
          };
        };
      };
    };
  }
}

interface Payout {
  id: number;
  amount: number;
  date: string;
  comment?: string;
  initiator_role?: 'admin' | 'master' | 'system' | null;
  method?: string | null;
  source?: string | null;
  reversed_at?: string | null;
  reversal_reason?: string | null;
  is_advance?: boolean;
}

interface MonthData {
  month: string;
  earnings: number;
  payouts: Payout[];
  remaining: number;
  total_payouts: number;
  progress: number;
  status: string;
}

interface User {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name: string;
  username?: string;
}

interface TelegramInitUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export default function PayoutsPage() {
  const router = useRouter();
  const { user: authUser } = useTelegramAuth();
  const [user, setUser] = useState<User | null>(null);
  const [months, setMonths] = useState<MonthData[]>([]);
  const [allPayoutsForHistory, setAllPayoutsForHistory] = useState<Payout[]>([]);
  const [globalBalance, setGlobalBalance] = useState<number>(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [totalPayouts, setTotalPayouts] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [modalData, setModalData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    comment: ''
  });
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isManualInput, setIsManualInput] = useState<boolean>(false);
  const [manualYear, setManualYear] = useState<string>('');

  useEffect(() => {
    const initializeUser = async () => {
      try {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          tg.ready();

          const initData = tg.initDataUnsafe;
          if (initData?.user) {
            // Приводим объект Telegram к форме нашего пользователя
            const tgUser = initData.user as TelegramInitUser;
            setUser({
              id: tgUser.id,
              telegram_id: tgUser.id,
              first_name: tgUser.first_name,
              last_name: tgUser.last_name || '',
              username: tgUser.username,
            });
          } else {
            // Fallback для тестирования в Telegram WebApp без данных
            setUser({
              id: 20,
              telegram_id: 87654321,
              first_name: 'Test',
              last_name: 'User',
              username: 'testuser'
            });
          }
        } else {
          // Fallback для тестирования вне Telegram
          setUser({
            id: 20,
            telegram_id: 87654321,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser'
          });
        }
      } catch (err) {
        console.error('Ошибка инициализации пользователя:', err);
        // Даже при ошибке используем fallback пользователя для тестирования
        setUser({
          id: 20,
          telegram_id: 87654321,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser'
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  const fetchPayouts = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null); // Сбрасываем предыдущие ошибки

      console.log('Fetching payouts for user:', user.telegram_id);

      // Если по каким-то причинам telegram_id отсутствует (Telegram WebApp), используем id как telegram_id
      const telegramHeader = (user.telegram_id ?? user.id ?? 87654321).toString();
      const response = await fetch('/api/payouts', {
        headers: {
          'x-telegram-id': telegramHeader
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error('Ошибка загрузки данных');
      }

      const data = await response.json();
      console.log('Received data:', data);

      // Сохраняем глобальные данные
      setGlobalBalance(data.globalBalance || 0);
      setTotalEarnings(data.totalEarnings || 0);
      setTotalPayouts(data.totalPayouts || 0);

      // API возвращает объект с полем months и allPayouts
      const monthsData = data.months || [];

      // Сохраняем все выплаты для модального окна истории
      setAllPayoutsForHistory(data.allPayouts || []);

      // Фильтруем данные по выбранному году для отображения на странице
      const filteredData = monthsData.filter((monthData: MonthData) => {
        // Парсим год из строки формата "YYYY-MM"
        const monthYear = parseInt(monthData.month.split('-')[0]);
        return monthYear === selectedYear;
      });
      setMonths(filteredData);

      if (filteredData.length === 0) {
        setError(`Нет данных за ${selectedYear} год`);
      }
    } catch (err) {
      console.error('Ошибка загрузки выплат:', err);
      setError('Не удалось загрузить данные о выплатах');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, user]);

  useEffect(() => {
    if (user) {
      fetchPayouts();
    }
  }, [user, fetchPayouts]);

  const handleAddPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const response = await fetch('/api/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': user.telegram_id.toString()
        },
        body: JSON.stringify({
          amount: parseFloat(modalData.amount),
          date: modalData.date,
          comment: modalData.comment || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка добавления выплаты');
      }

      setShowModal(false);
      setModalData({ amount: '', date: new Date().toISOString().split('T')[0], comment: '' });
      fetchPayouts();
    } catch (err) {
      console.error('Ошибка добавления выплаты:', err);
      alert('Не удалось добавить выплату');
    }
  };

  const handleDeletePayout = async (payoutId: number) => {
    if (!user || !confirm('Вы уверены, что хотите удалить эту выплату?')) return;

    try {
      const response = await fetch(`/api/payouts/${payoutId}`, {
        method: 'DELETE',
        headers: {
          'x-telegram-id': user.telegram_id.toString()
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления выплаты');
      }

      fetchPayouts();
    } catch (err) {
      console.error('Ошибка удаления выплаты:', err);
      alert('Не удалось удалить выплату');
    }
  };

  const toggleMonthExpansion = (month: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitiatorLabel = (role?: string | null) => {
    switch (role) {
      case 'admin':
        return 'Администратор';
      case 'system':
        return 'Система';
      default:
        return 'Мастер';
    }
  };

  const getNextMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const nextDate = new Date(year, month, 1); // month уже +1 из-за индексации с 0
    return nextDate.toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusColor = (remaining: number) => {
    if (remaining <= 0) return 'green';
    if (remaining < 5000) return 'orange';
    return 'red';
  };

  const getStatusIcon = (remaining: number) => {
    if (remaining <= 0) return '✓';
    return '●';
  };

  const getAvailableYears = () => {
    const years = [];
    for (let year = 2025; year <= 2030; year++) {
      years.push(year);
    }
    return years;
  };

  const handleYearChange = (value: string) => {
    if (value === 'manual') {
      setIsManualInput(true);
      setManualYear(selectedYear.toString());
    } else {
      setIsManualInput(false);
      setSelectedYear(parseInt(value));
    }
  };

  const handleManualYearSubmit = () => {
    const year = parseInt(manualYear);
    if (year && year >= 2020 && year <= 2050) {
      setSelectedYear(year);
      setIsManualInput(false);
    }
  };

  const handleManualYearCancel = () => {
    setIsManualInput(false);
    setManualYear('');
  };

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка данных...</p>
        </div>
        <style jsx>{`
          .container {
            max-width: 1200px;
            margin: 20px auto;
            padding: 20px;
            background: #f8f6f3;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(74, 43, 27, 0.15);
            border: 3px solid #7a3e2d;
            min-height: 80vh;
          }
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 400px;
            color: #7a3e2d;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5d5c8;
            border-top: 4px solid #7a3e2d;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="content">
        {/* Шапка в стиле главной страницы */}
        <div className="header">
          <div className="header-content">
            <div className="logo" onClick={() => router.push('/admin')} style={{ cursor: 'pointer' }}>
              <Image
                src="/logo.svg"
                alt="Логотип"
                width={120}
                height={120}
                priority
              />
            </div>
            <div className="header-text">
              <h1>Выплаты</h1>
            </div>
          </div>
        </div>

        <div className="content">
          {/* Кнопка назад */}
          <div className="back-section">
            <button
              onClick={() => router.push('/')}
              className="back-button"
            >
              ← Назад
            </button>
          </div>

          {/* Выбор года */}
          <div className="year-section">
            <div className="year-selector">
              <label className="year-label">Выбрать год</label>
              {!isManualInput ? (
                <div className="year-select-container">
                  <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="year-select"
                  >
                    {getAvailableYears().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                    <option value="manual">Ввести вручную...</option>
                  </select>
                </div>
              ) : (
                <div className="manual-year-input">
                  <input
                    type="number"
                    value={manualYear}
                    onChange={(e) => setManualYear(e.target.value)}
                    placeholder="Введите год"
                    className="year-input"
                    min="2020"
                    max="2050"
                  />
                  <div className="manual-year-actions">
                    <button onClick={handleManualYearSubmit} className="btn-year-confirm">
                      ✓
                    </button>
                    <button onClick={handleManualYearCancel} className="btn-year-cancel">
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Глобальный баланс */}
          <div className="global-balance-section">
            <div className={`global-balance-card ${globalBalance < 0 ? 'advance' : globalBalance === 0 ? 'zero' : 'positive'}`}>
              <div className="balance-header">
                <span className="balance-label">Общий баланс:</span>
                <span className="balance-value">
                  {globalBalance >= 0 ? '+' : ''}{globalBalance.toLocaleString()} ₽
                </span>
              </div>
              <div className="balance-details">
                <div className="balance-row">
                  <span>Заработано всего:</span>
                  <span className="earned">{totalEarnings.toLocaleString()} ₽</span>
                </div>
                <div className="balance-row">
                  <span>Выплачено всего:</span>
                  <span className="paid">{totalPayouts.toLocaleString()} ₽</span>
                </div>
              </div>
              {globalBalance < 0 && (
                <div className="balance-warning">
                  ⚠️ Аванс: выплачено больше, чем заработано
                </div>
              )}
            </div>
            <div className="button-group">
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-add-payout"
                disabled={authUser?.role === 'demo'}
              >
                + Добавить выплату
              </button>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="btn btn-secondary"
              >
                История выплат
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="months-grid">
            {months.length === 0 ? (
              <div className="empty-state">
                <div className="empty-title">Нет данных за {selectedYear} год</div>
                <p>Данные о заработке за выбранный год отсутствуют</p>
              </div>
            ) : (
              months.map((monthData) => (
                <div key={monthData.month} className="month-card">
                  <div className="month-header">
                    <div className="month-icon">
                      <Image
                        src="/calendar.svg"
                        alt="Календарь"
                        width={24}
                        height={24}
                      />
                    </div>
                    <h3 className="month-title">{formatMonth(monthData.month)}</h3>
                    <div className={`status-indicator ${getStatusColor(monthData.remaining)}`}>
                      {getStatusIcon(monthData.remaining)}
                    </div>
                  </div>

                  <div className="earnings-section">
                    <div className="earnings-row">
                      <span className="earnings-icon">●</span>
                      <span className="earnings-label">Заработано:</span>
                      <span className="earnings-value earned">{monthData.earnings.toLocaleString()} ₽</span>
                    </div>
                    <div className="earnings-simple">
                      <span className="earnings-label">Выплачено:</span>
                      <span className="earnings-value paid">{(monthData.total_payouts || 0).toLocaleString()} ₽</span>
                    </div>
                    <div className="earnings-simple">
                      <span className="earnings-label">Остаток:</span>
                      <span className="earnings-value remaining">{monthData.remaining.toLocaleString()} ₽</span>
                    </div>
                  </div>

                  <div className="progress-section">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(100, monthData.progress || 0)}%`
                        }}
                      ></div>
                    </div>
                    <div className="progress-percentage">
                      {Math.round(monthData.progress || 0)}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {showModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2 className="modal-title">Добавить выплату</h2>
                <form onSubmit={handleAddPayout} className="modal-form">
                  <div className="form-group">
                    <label className="form-label">Сумма (₽)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={modalData.amount}
                      onChange={(e) => setModalData(prev => ({ ...prev, amount: e.target.value }))}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Дата</label>
                    <input
                      type="date"
                      value={modalData.date}
                      onChange={(e) => setModalData(prev => ({ ...prev, date: e.target.value }))}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Комментарий</label>
                    <textarea
                      value={modalData.comment}
                      onChange={(e) => setModalData(prev => ({ ...prev, comment: e.target.value }))}
                      className="form-textarea"
                      rows={3}
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="submit" className="btn btn-primary" disabled={authUser?.role === 'demo'}>
                      Добавить
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn btn-secondary"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )
          }

          {/* Модальное окно истории выплат */}
          {
            showHistoryModal && (
              <div className="modal-overlay">
                <div className="modal-content history-modal">
                  <div className="modal-header">
                    <h2 className="modal-title">История выплат</h2>
                    <button
                      onClick={() => setShowHistoryModal(false)}
                      className="close-button"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="history-list-scroll">
                    {allPayoutsForHistory
                      .filter((p: Payout) => !p.reversed_at)
                      .sort((a: Payout, b: Payout) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .length === 0 ? (
                      <p className="no-data">Нет истории выплат</p>
                    ) : (
                      allPayoutsForHistory
                        .filter((p: Payout) => !p.reversed_at)
                        .sort((a: Payout, b: Payout) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((payout: Payout) => (
                          <div
                            key={payout.id}
                            className="history-item"
                          >
                            <div className="history-info">
                              <div className="history-amount">{payout.amount.toLocaleString()} ₽</div>
                              <div className="history-details">
                                {new Date(payout.date).toLocaleDateString('ru-RU')} · {getInitiatorLabel(payout.initiator_role)}
                                {payout.is_advance && <span className="advance-badge">АВАНС</span>}
                                {payout.comment && ` • ${payout.comment}`}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeletePayout(payout.id)}
                              className="delete-btn"
                              disabled={authUser?.role === 'demo'}
                              title="Удалить выплату"
                            >
                              <img src="/trash.svg" alt="Удалить" width="28" height="28" />
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )
          }
        </div>
      </div>

      <style jsx>{`
        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          color: var(--primary-color);
          cursor: pointer;
        }

        .history-list-scroll {
          max-height: 60vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .no-data {
          text-align: center;
          color: #666;
          padding: 20px;
        }

        /* Основные переменные */
        :root {
          --primary-color: #7a3e2d;
          --secondary-color: #8b4513;
          --accent-color: #f5f5dc;
          --background-card: #ffffff;
          --background-section: #f8f6f3;
          --font-color: #333333;
          --border-light: #e5d5c8;
          --shadow-light: rgba(74, 43, 27, 0.1);
          --shadow-medium: rgba(74, 43, 27, 0.2);
          --primary-light: #9d5a47;
          --secondary-light: #a0522d;
        }

        .container {
          max-width: 1200px;
          margin: 20px auto;
          padding: 0;
          background: var(--background-section);
          border-radius: 20px;
          box-shadow: 0 10px 30px var(--shadow-medium);
          border: 3px solid var(--primary-color);
          min-height: 80vh;
          position: relative;
          overflow: hidden;
        }

        .header {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          padding: 40px;
          text-align: center;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 30px;
          flex-wrap: nowrap;
        }

        .logo {
          width: 120px;
          height: 120px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-text {
          text-align: left;
        }

        .header h1 {
          font-size: 2.5em;
          margin-bottom: 10px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          border-radius: 20px 20px 0 0;
        }

        .content {
          position: relative;
          z-index: 1;
          padding: 30px;
        }

        .back-section {
          margin-bottom: 20px;
        }

        .year-section {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 30px;
        }

        .back-button {
          padding: 12px 20px;
          background: var(--background-card);
          border: 2px solid var(--border-light);
          border-radius: 10px;
          color: var(--primary-color);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px var(--shadow-medium);
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }

        .back-button:hover {
          background: var(--primary-color);
          color: var(--background-card);
          border-color: var(--primary-color);
          box-shadow: 0 8px 25px rgba(74, 43, 27, 0.4);
          transform: translateY(-3px);
        }

        .back-button:active {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px var(--shadow-medium);
        }

        .year-selector {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .year-label {
          font-weight: 600;
          color: var(--primary-color);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .year-select {
          padding: 12px 16px;
          border: 2px solid var(--border-light);
          border-radius: 10px;
          background: var(--background-card);
          color: var(--font-color);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px var(--shadow-light);
          min-width: 120px;
        }

        .year-select:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(74, 43, 27, 0.1);
        }

        .year-select:hover {
          border-color: var(--primary-light);
          box-shadow: 0 4px 8px var(--shadow-light);
        }

        .year-select-container {
          position: relative;
        }

        .manual-year-input {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .year-input {
          padding: 12px 16px;
          border: 2px solid var(--border-light);
          border-radius: 10px;
          background: var(--background-card);
          color: var(--font-color);
          font-size: 16px;
          font-weight: 600;
          cursor: text;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px var(--shadow-light);
          min-width: 120px;
        }

        .year-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(74, 43, 27, 0.1);
        }

        .manual-year-actions {
          display: flex;
          gap: 5px;
        }

        .btn-year-confirm,
        .btn-year-cancel {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-year-confirm {
          background: #22c55e;
          color: white;
        }

        .btn-year-confirm:hover {
          background: #16a34a;
          transform: scale(1.05);
        }

        .btn-year-cancel {
          background: #ef4444;
          color: white;
        }

        .btn-year-cancel:hover {
          background: #dc2626;
          transform: scale(1.05);
        }

        /* Глобальный баланс */
        .global-balance-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, var(--background-card) 0%, rgba(122, 62, 45, 0.05) 100%);
          border-radius: 16px;
          border: 2px solid var(--border-light);
          box-shadow: 0 4px 15px var(--shadow-light);
        }

        .global-balance-card {
          padding: 20px;
          border-radius: 12px;
          transition: all 0.3s ease;
          background: var(--background-card);
          border: 2px solid var(--border-light);
        }

        .global-balance-card.positive {
          background: var(--background-card);
          border: 2px solid var(--border-light);
        }

        .global-balance-card.zero {
          background: var(--background-card);
          border: 2px solid var(--border-light);
        }

        .global-balance-card.advance {
          background: var(--background-card);
          border: 2px solid #f59e0b;
        }

        .balance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .balance-label {
          font-size: 1.1em;
          font-weight: 600;
          color: var(--primary-color);
        }

        .balance-value {
          font-size: 1.8em;
          font-weight: 700;
          color: var(--primary-color);
        }

        .global-balance-card.positive .balance-value {
          color: #16a34a;
        }

        .global-balance-card.advance .balance-value {
          color: #d97706;
        }

        .balance-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .balance-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.95em;
          color: #666;
        }

        .balance-row .earned {
          color: var(--primary-color);
          font-weight: 600;
        }

        .balance-row .paid {
          color: #666;
          font-weight: 600;
        }

        .balance-warning {
          margin-top: 12px;
          padding: 10px;
          background: rgba(245, 158, 11, 0.15);
          border-radius: 8px;
          font-size: 0.9em;
          color: #92400e;
          text-align: center;
          font-weight: 500;
        }

        .btn-add-payout {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: white;
          padding: 14px 24px;
          border: none;
          border-radius: 10px;
          font-size: 1em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(74, 43, 27, 0.3);
        }

        .btn-add-payout:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(74, 43, 27, 0.4);
        }

        .btn-add-payout:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-header {
          text-align: left;
          margin-bottom: 40px;
        }

        .page-header h1 {
          color: var(--primary-color);
          font-size: 2.5em;
          font-weight: 700;
          margin-bottom: 15px;
          text-shadow: 0 1px 2px var(--shadow-light);
        }

        .page-header p {
          color: var(--secondary-color);
          font-size: 1.1em;
          font-weight: 500;
          line-height: 1.6;
        }

        .error-message {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border: 2px solid #dc2626;
          color: #991b1b;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 30px;
          font-weight: 600;
          text-align: center;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--secondary-color);
          background: var(--background-card);
          border-radius: 12px;
          box-shadow: 0 4px 12px var(--shadow-light);
          margin: 20px 0;
          border: 2px solid var(--border-light);
        }

        .empty-title {
          font-size: 1.4em;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--primary-color);
        }

        .months-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 30px;
        }

        .month-card {
          background: linear-gradient(135deg, var(--background-card) 0%, rgba(122, 62, 45, 0.02) 100%);
          border-radius: 16px;
          padding: 30px;
          border: 2px solid var(--border-light);
          box-shadow: 0 8px 25px var(--shadow-medium);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .month-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        }

        .month-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 35px var(--shadow-medium);
          border-color: var(--primary-light);
        }

        .month-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 25px;
        }

        .month-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          margin-right: 12px;
          opacity: 0.8;
          color: var(--primary-color);
          transition: all 0.3s ease;
        }

        .month-icon:hover {
          opacity: 1;
          transform: scale(1.1);
        }

        .month-title {
          flex: 1;
          font-size: 1.4em;
          font-weight: 700;
          color: var(--primary-color);
          text-transform: capitalize;
        }

        .status-indicator {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: white;
        }

        .status-indicator.green {
          background: #22c55e;
        }

        .status-indicator.orange {
          background: #f97316;
        }

        .status-indicator.red {
          background: #dc2626;
        }

        .earnings-section {
          margin-bottom: 16px;
          padding: 0;
        }

        .earnings-row {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          gap: 8px;
        }

        .earnings-simple {
          display: flex;
          align-items: center;
          margin-bottom: 6px;
          padding-left: 20px;
          gap: 8px;
        }

        .earnings-icon {
          color: #22c55e;
          font-size: 12px;
          font-weight: bold;
          width: 16px;
          flex-shrink: 0;
        }

        .earnings-label {
          font-weight: 500;
          color: #333;
          font-size: 15px;
          min-width: 100px;
        }

        .earnings-simple .earnings-label {
          font-weight: 400;
          color: #666;
          font-size: 13px;
          min-width: 80px;
        }

        .earnings-value {
          font-weight: 700;
          font-size: 15px;
          color: #333;
          text-align: right;
          min-width: 80px;
        }

        .earnings-value.earned {
          color: #333;
          font-weight: 700;
        }

        .earnings-value.paid {
          color: #666;
          font-weight: 500;
          font-size: 13px;
        }

        .earnings-value.remaining {
          color: #666;
          font-weight: 500;
          font-size: 13px;
        }

        .earnings-value.advance {
          color: #ff9800;
          font-weight: 600;
          font-size: 13px;
        }

        .earnings-percentage {
          font-weight: 600;
          color: #333;
          font-size: 15px;
          margin-left: auto;
          flex-shrink: 0;
        }

        .progress-section {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }

        .progress-bar {
          flex: 1;
          height: 12px;
          background: var(--border-light);
          border-radius: 6px;
          overflow: hidden;
          box-shadow: inset 0 2px 4px var(--shadow-light);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
          border-radius: 6px;
          transition: width 0.3s ease;
        }

        .progress-percentage {
          font-weight: 700;
          color: var(--primary-color);
          font-size: 14px;
          min-width: 40px;
          text-align: right;
        }

        .debt-notice {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #f59e0b;
          color: #92400e;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .debt-icon {
          font-size: 18px;
        }

        .card-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          border: none;
          padding: 11px 22px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 15px var(--shadow-medium);
          flex: 1;
          min-width: 120px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(74, 43, 27, 0.4);
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%);
        }

        .btn:active {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px var(--shadow-medium);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: 0 4px 15px var(--shadow-medium);
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%);
        }

        .btn-secondary {
          background: #ffffff !important;
          color: #7a3e2d !important;
          border: 2px solid #7a3e2d;
          font-weight: 600;
        }

        .btn-secondary:hover {
          background: #7a3e2d !important;
          color: #ffffff !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(122, 62, 45, 0.2);
        }

        .delete-btn {
          background: transparent;
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 8px;
          width: 56px;
          height: 56px;
        }

        .delete-btn:hover {
          background: rgba(156, 163, 175, 0.2);
          transform: scale(1.05);
        }

        .delete-btn img {
          opacity: 0.6;
          transition: opacity 0.2s ease;
        }

        .delete-btn:hover img {
          opacity: 0.8;
        }

        .btn-small {
          padding: 8px 16px;
          font-size: 10px;
          min-width: 100px;
          border-radius: 8px;
          flex: none;
        }

        .history-section {
          border-top: 2px solid var(--border-light);
          padding-top: 25px;
          margin-top: 25px;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .history-title {
          font-weight: 600;
          color: var(--primary-color);
          margin-bottom: 20px;
          font-size: 1.1em;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 10px;
          border: 1px solid var(--border-light);
          transition: all 0.2s ease;
        }

        .history-item--reversed {
          opacity: 0.7;
          border-style: dashed;
          background: rgba(220, 38, 38, 0.05);
        }

        .history-item:hover {
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 2px 8px var(--shadow-light);
        }

        .history-info {
          flex: 1;
        }

        .history-amount {
          font-weight: 700;
          color: var(--primary-color);
          font-size: 1.1em;
          margin-bottom: 4px;
        }

        .history-details {
          font-size: 14px;
          color: var(--secondary-color);
        }

        .history-reversed-note {
          font-size: 13px;
          color: #b45309;
          margin-top: 4px;
        }

        .history-item--advance {
          background: rgba(255, 152, 0, 0.05);
          border-color: rgba(255, 152, 0, 0.3);
          flex-direction: column;
          align-items: stretch;
        }

        .history-item--advance:hover {
          background: rgba(255, 152, 0, 0.08);
        }

        .history-separator {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 152, 0, 0.3) 50%, transparent 100%);
          margin-bottom: 12px;
        }

        .advance-amount {
          color: #ff9800;
          font-weight: 700;
          font-size: 1.1em;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: var(--background-card);
          border-radius: 16px;
          padding: 30px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          border: 2px solid var(--primary-color);
          position: relative;
        }

        .modal-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          border-radius: 16px 16px 0 0;
        }

        .modal-title {
          color: var(--primary-color);
          font-size: 1.5em;
          font-weight: 700;
          margin-bottom: 25px;
          text-align: center;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-weight: 600;
          color: var(--primary-color);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-input,
        .form-textarea {
          padding: 14px 16px;
          border: 2px solid var(--border-light);
          border-radius: 10px;
          font-size: 16px;
          background: var(--background-card);
          color: var(--font-color);
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px var(--shadow-light);
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(74, 43, 27, 0.1);
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .modal-actions {
          display: flex;
          gap: 15px;
          margin-top: 10px;
        }

        @media (max-width: 768px) {
          .container {
            margin: 0;
            padding: 0;
            border-radius: 0;
            border: none;
            min-height: 100vh;
          }

          .header {
            padding: 5px 20px !important;
          }

          .header-content {
            flex-direction: column;
            gap: 20px;
          }

          .logo {
            width: 100px;
            height: 100px;
          }

          .header-text {
            text-align: center;
          }

          .header h1 {
            font-size: 2em;
          }

          .content {
            padding: 0 15px;
          }

          .months-grid {
            grid-template-columns: 1fr;
            gap: 15px;
            padding: 0;
          }

          .month-card {
            padding: 15px;
            margin: 0;
            border-radius: 12px;
          }

          .back-section {
            padding: 10px 0;
          }

          .year-section {
            padding: 10px 0;
          }

          .manual-year-input {
            flex-direction: column;
            align-items: stretch;
            gap: 15px;
          }

          .year-input {
            font-size: 16px;
            padding: 14px 16px;
            min-width: auto;
            width: 100%;
          }

          .manual-year-actions {
            justify-content: center;
            gap: 15px;
          }

          .btn-year-confirm,
          .btn-year-cancel {
            width: 40px;
            height: 40px;
            font-size: 16px;
          }

          .card-actions {
            flex-direction: column;
            gap: 10px;
          }

          .btn {
            min-width: auto;
            padding: 12px 20px;
            font-size: 14px;
          }

          .modal-content {
            margin: 10px;
            padding: 20px;
          }

          .modal-actions {
            flex-direction: column;
          }

          .earnings-row {
            gap: 6px;
            margin-bottom: 8px;
          }

          .earnings-simple {
            padding-left: 16px;
            margin-bottom: 4px;
          }

          .earnings-label {
            font-size: 14px;
            min-width: 90px;
          }

          .earnings-simple .earnings-label {
            font-size: 12px;
            min-width: 70px;
          }

          .earnings-value {
            font-size: 14px;
            min-width: 70px;
          }

          .earnings-value.paid,
          .earnings-value.remaining {
            font-size: 12px;
          }

          .earnings-percentage {
            font-size: 14px;
          }

          .earnings-icon {
            font-size: 8px;
            width: 12px;
          }
        }

        .advance-badge {
          display: inline-block;
          background-color: #ff9800;
          color: white;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 6px;
          vertical-align: middle;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
