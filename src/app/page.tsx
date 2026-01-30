'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import UserGreeting from '@/components/UserGreeting';
import Stepper from '@/components/Stepper';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';
import { getAuthHeaders, isTelegramWebApp } from '@/lib/auth';

interface Shift {
  id?: number;
  date: string;
  hours: number;
  steam_bath: number;
  brand_steam: number;
  intro_steam: number;
  scrubbing: number;
  zaparnik: number;
  masters: number;
  total: number;
  hourly_rate?: number;
  steam_bath_price?: number;
  brand_steam_price?: number;
  intro_steam_price?: number;
  scrubbing_price?: number;
  zaparnik_price?: number;
}

interface Price {
  id?: number;
  name: string;
  price: number;
}

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useTelegramAuth();
  // Режим демо: ограничения на добавление и удаление
  const isDemo = user?.role === 'demo';
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [globalBalance, setGlobalBalance] = useState<number>(0);
  const [totalEarningsFromApi, setTotalEarningsFromApi] = useState<number>(0);
  const [totalPayoutsFromApi, setTotalPayoutsFromApi] = useState<number>(0);
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Состояния для аккордеона истории смен
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [shiftsLoaded, setShiftsLoaded] = useState(false);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [newShift, setNewShift] = useState<Omit<Shift, 'id' | 'total'>>({
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    steam_bath: 0,
    brand_steam: 0,
    intro_steam: 0,
    scrubbing: 0,
    zaparnik: 0,
    masters: 2
  });

  // Принудительная очистка формы при загрузке
  useEffect(() => {
    setNewShift({
      date: new Date().toISOString().split('T')[0],
      hours: 0,
      steam_bath: 0,
      brand_steam: 0,
      intro_steam: 0,
      scrubbing: 0,
      zaparnik: 0,
      masters: 2
    });
  }, []);

  // Загрузка критичных данных (баланс + прайсы)
  const loadData = async () => {
    try {
      setLoading(true);

      // Создаем контроллер для отмены запросов по таймауту
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут

      const authHeaders = getAuthHeaders();

      // Загружаем только критичные данные (без смен)
      const timestamp = new Date().getTime();
      const [pricesResponse, payoutsResponse] = await Promise.all([
        fetch(`/api/prices?t=${timestamp}`, {
          signal: controller.signal,
          cache: 'no-store'
        }),
        fetch(`/api/payouts?t=${timestamp}`, {
          signal: controller.signal,
          headers: authHeaders,
          cache: 'no-store'
        })
      ]);

      clearTimeout(timeoutId);

      if (payoutsResponse.ok) {
        const payoutsData = await payoutsResponse.json();
        // Используем готовые данные из API (глобальный баланс)
        setGlobalBalance(payoutsData.globalBalance || 0);
        setTotalEarningsFromApi(payoutsData.totalEarnings || 0);
        setTotalPayoutsFromApi(payoutsData.totalPayouts || 0);
      } else {
        console.error('Ошибка загрузки выплат:', payoutsResponse.status);
        setGlobalBalance(0);
        setTotalEarningsFromApi(0);
        setTotalPayoutsFromApi(0);
      }

      if (pricesResponse.ok) {
        const pricesData = await pricesResponse.json();
        setPrices(pricesData);
      } else {
        console.error('Ошибка загрузки цен:', pricesResponse.status);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Запрос отменен по таймауту');
      } else {
        console.error('Ошибка при загрузке данных:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Загрузка истории смен (по запросу)
  const loadShiftsHistory = async () => {
    if (shiftsLoaded) {
      // Если смены уже загружены, просто переключаем видимость
      setIsHistoryOpen(!isHistoryOpen);
      return;
    }

    try {
      setShiftsLoading(true);
      setIsHistoryOpen(true);

      const authHeaders = getAuthHeaders();
      const response = await fetch(`/api/shifts?t=${new Date().getTime()}`, {
        headers: authHeaders,
        cache: 'no-store'
      });

      if (response.ok) {
        const shiftsData = await response.json();
        setShifts(shiftsData);
        setShiftsLoaded(true);
      } else {
        console.error('Ошибка загрузки смен:', response.status);
      }
    } catch (error) {
      console.error('Ошибка при загрузке истории смен:', error);
    } finally {
      setShiftsLoading(false);
    }
  };

  // Обновление истории смен
  const refreshShiftsHistory = async () => {
    try {
      setShiftsLoading(true);
      const authHeaders = getAuthHeaders();
      const response = await fetch(`/api/shifts?t=${new Date().getTime()}`, {
        headers: authHeaders,
        cache: 'no-store'
      });

      if (response.ok) {
        const shiftsData = await response.json();
        setShifts(shiftsData);
      }
    } catch (error) {
      console.error('Ошибка при обновлении истории смен:', error);
    } finally {
      setShiftsLoading(false);
    }
  };

  // Обновление данных без таймаута и loading-экрана (для действий пользователя)
  const refreshData = async () => {
    try {
      const authHeaders = getAuthHeaders();

      // Обновляем только баланс (смены обновляются отдельно через refreshShiftsHistory)
      const payoutsResponse = await fetch(`/api/payouts?t=${new Date().getTime()}`, {
        headers: authHeaders,
        cache: 'no-store'
      });

      if (payoutsResponse.ok) {
        const payoutsData = await payoutsResponse.json();
        setGlobalBalance(payoutsData.globalBalance || 0);
        setTotalEarningsFromApi(payoutsData.totalEarnings || 0);
        setTotalPayoutsFromApi(payoutsData.totalPayouts || 0);
      }

      // Если история смен открыта, обновляем её тоже
      if (isHistoryOpen && shiftsLoaded) {
        await refreshShiftsHistory();
      }
    } catch (error) {
      console.error('Ошибка при обновлении данных:', error);
    }
  };

  // Получение цены по названию
  const getPrice = (name: string): number => {
    const price = prices.find(p => p.name === name);
    return price ? price.price : 0;
  };

  // Расчет общей суммы смены
  const calculateTotal = (shift: Omit<Shift, 'id' | 'total'>): number => {
    const hourlyRate = getPrice('Почасовая ставка');
    const steamBathPrice = getPrice('Путевое парение');
    const brandSteamPrice = getPrice('Фирменное парение');
    const introSteamPrice = getPrice('Ознакомительное парение');
    const scrubbingPrice = getPrice('Скрабирование');
    const zaparnikPrice = getPrice('Запарник');

    const hourlyTotal = shift.hours * hourlyRate;

    // Сумма всех услуг
    const servicesTotal = (
      shift.steam_bath * steamBathPrice +
      shift.brand_steam * brandSteamPrice +
      shift.intro_steam * introSteamPrice +
      shift.scrubbing * scrubbingPrice +
      shift.zaparnik * zaparnikPrice
    );

    // 40% от суммы услуг, деленное на количество мастеров
    const servicesEarnings = (servicesTotal * 0.4) / shift.masters;

    return hourlyTotal + servicesEarnings;
  };

  // Добавление новой смены
  const handleAddShift = async () => {
    try {
      const total = calculateTotal(newShift);
      const shiftData = { ...newShift, total };
      const authHeaders = getAuthHeaders();

      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(shiftData),
      });

      if (response.ok) {
        await refreshData(); // Обновляем данные без таймаута
        // Сброс формы к начальным значениям
        setNewShift({
          date: new Date().toISOString().split('T')[0],
          hours: 0,
          steam_bath: 0,
          brand_steam: 0,
          intro_steam: 0,
          scrubbing: 0,
          zaparnik: 0,
          masters: 2
        });
      } else {
        const errorData = await response.json();
        alert(`Ошибка при добавлении смены: ${errorData.error || 'Попробуйте еще раз.'}`);
      }
    } catch (error) {
      console.error('Ошибка при добавлении смены:', error);
      alert('Ошибка при добавлении смены. Попробуйте еще раз.');
    }
  };

  // Удаление смены
  const handleDeleteShift = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту смену?')) return;

    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(`/api/shifts/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });

      if (response.ok) {
        await refreshData(); // Обновляем данные без таймаута
      } else {
        const errorData = await response.json();
        alert(`Ошибка при удалении смены: ${errorData.error || 'Попробуйте еще раз.'}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении смены:', error);
      alert('Ошибка при удалении смены. Попробуйте еще раз.');
    }
  };

  const toggleRowExpansion = (shiftId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId);
      } else {
        newSet.add(shiftId);
      }
      return newSet;
    });
  };

  // Расчет общей статистики
  const totalHours = shifts.reduce((sum, shift) => sum + shift.hours, 0);

  // Проверка регистрации пользователя (только для Telegram WebApp)
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !user.display_name && isTelegramWebApp()) {
      // Если пользователь авторизован через Telegram, но не зарегистрирован (нет display_name), перенаправляем на регистрацию
      router.push('/register');
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Загрузка данных только после завершения аутентификации
  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading]);

  if (loading) {
    return (
      <>

        <div className="loading-container">
          <div className="loading-text">Загрузка данных...</div>
        </div>
      </>
    );
  }
  // Расчет баланса: используем данные из API
  const currentBalance = globalBalance;

  return (
    <>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0px 0 140px 0' }}>
        <header className="header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}
            onClick={() => router.push('/admin')}
            title="Панель администратора"
          >
            <div style={{ position: 'relative', width: '50px', height: '50px' }}>
              <Image
                src="/logo.svg"
                alt="Путёвой Учет"
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
            <h1 className="logo-text" style={{ fontSize: '2rem', margin: 0, lineHeight: 1 }}>Путёвой Учет</h1>
          </div>
          {/* Иконка профиля вместо кнопки */}
          <Link
            href="/account"
            className="profile-icon-btn"
            title="Личный кабинет"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M6 21C6 17.134 8.68629 14 12 14C15.3137 14 18 17.134 18 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
        </header>

        <div className="content">
          {/* Карточка баланса - теперь первая после header */}
          <div className="balance-card balance-card--top">
            <div className="balance-info">
              <div className="balance-label">Мой Баланс</div>
              <div className="balance-amount">{currentBalance.toLocaleString()} ₽</div>
            </div>
            <div className="balance-actions">
              <Link href="/payouts" className="balance-btn">
                Кошелек/Выплаты →
              </Link>
            </div>
          </div>

          <UserGreeting />

          {/* Mobile Sticky Total Header */}
          <div className="mobile-total-sticky mobile-only">
            <span className="mobile-total-sticky__label">Итого:</span>
            <span className="mobile-total-sticky__value">{calculateTotal(newShift).toLocaleString()}₽</span>
          </div>
          {/* Форма добавления новой смены - ГРУППИРОВКА ПО БЛОКАМ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>

            {/* Карточка 1: Основные данные смены */}
            <div className="glass-panel" style={{ marginBottom: 0 }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Параметры смены</h2>
              <div className="form-grid">
                <div className="input-group">
                  <label className="input-label">Дата</label>
                  <input
                    className="input-field"
                    type="date"
                    value={newShift.date}
                    onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                    required
                  />
                </div>

                <Stepper
                  label="Часы работы"
                  value={newShift.hours}
                  onChange={(val) => setNewShift({ ...newShift, hours: val })}
                  step={0.5}
                  max={24}
                  price={getPrice('Почасовая ставка')}
                />

                <Stepper
                  label="Мастера на смене"
                  value={newShift.masters}
                  onChange={(val) => setNewShift({ ...newShift, masters: val })}
                  min={1}
                  max={10}
                />
              </div>
            </div>

            {/* Карточка 2: Услуги */}
            <div className="glass-panel" style={{ marginBottom: 0 }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Банные услуги</h2>
              <div className="services-grid">
                <Stepper
                  label="Путевое парение"
                  value={newShift.steam_bath}
                  onChange={(val) => setNewShift({ ...newShift, steam_bath: val })}
                  price={getPrice('Путевое парение')}
                />
                <Stepper
                  label="Фирменное парение"
                  value={newShift.brand_steam}
                  onChange={(val) => setNewShift({ ...newShift, brand_steam: val })}
                  price={getPrice('Фирменное парение')}
                />
                <Stepper
                  label="Ознакомительное"
                  value={newShift.intro_steam}
                  onChange={(val) => setNewShift({ ...newShift, intro_steam: val })}
                  price={getPrice('Ознакомительное парение')}
                />
                <Stepper
                  label="Скрабирование"
                  value={newShift.scrubbing}
                  onChange={(val) => setNewShift({ ...newShift, scrubbing: val })}
                  price={getPrice('Скрабирование')}
                />
                <Stepper
                  label="Запарник"
                  value={newShift.zaparnik}
                  onChange={(val) => setNewShift({ ...newShift, zaparnik: val })}
                  price={getPrice('Запарник')}
                />
              </div>
            </div>

            {/* Блок итогов и действий (Десктоп) */}
            <div className="glass-panel bg-white/40 desktop-only" style={{ marginBottom: 0, padding: '24px' }}>
              <div className="form-footer">
                <div className="calculation-info">
                  <div className="calculation-total">
                    Итого за смену: {calculateTotal(newShift).toLocaleString()}₽
                  </div>
                  <div className="calculation-details">
                    Почасовая: {(newShift.hours * getPrice('Почасовая ставка')).toLocaleString()}₽ <br className="md:hidden" />
                    + Бонус с услуг: {(calculateTotal(newShift) - newShift.hours * getPrice('Почасовая ставка')).toLocaleString()}₽
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '16px' }}>
                  <button
                    className="btn w-full md:w-auto text-center justify-center py-4 text-base"
                    onClick={handleAddShift}
                    disabled={isDemo || !newShift.date || newShift.hours <= 0}
                  >
                    Сохранить смену
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Static Save Button */}
            <div className="mobile-static-action mobile-only">
              <button
                className="mobile-save-btn"
                onClick={handleAddShift}
                disabled={isDemo || !newShift.date || newShift.hours <= 0}
              >
                Сохранить смену
              </button>
            </div>

          </div>

          {/* История смен (аккордеон) */}
          <div className="shifts-section">
            {/* Заголовок-аккордеон */}
            <div className="shifts-accordion-header" onClick={loadShiftsHistory}>
              <div className="shifts-accordion-title">
                <span className="accordion-icon">{isHistoryOpen ? '▼' : '▶'}</span>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>История смен</h2>
                {shiftsLoaded && <span className="shifts-count-badge">{shifts.length}</span>}
              </div>
              {shiftsLoaded && isHistoryOpen && (
                <button
                  className="btn-refresh"
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshShiftsHistory();
                  }}
                  disabled={shiftsLoading}
                  title="Обновить историю"
                >
                  {shiftsLoading ? '⏳' : '↻'} Обновить
                </button>
              )}
            </div>

            {/* Контент аккордеона */}
            {isHistoryOpen && (
              <div className="shifts-accordion-content">
                {shiftsLoading && !shiftsLoaded ? (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <div>Загрузка истории смен...</div>
                  </div>
                ) : shifts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-title">Пока здесь пусто</div>
                    <div>Добавьте первую смену, чтобы начать учёт</div>
                  </div>
                ) : (
                  <>
                    {/* Компактная таблица с раскрывающимися деталями */}
                    <div style={{ overflowX: 'auto' }}>
                      <table className="shifts-table">
                        <thead>
                          <tr>
                            <th>Дата</th>
                            <th>Сумма</th>
                            <th>Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shifts.map((shift) => (
                            <React.Fragment key={shift.id}>
                              <tr
                                className={`shift-row ${expandedRows.has(shift.id!) ? 'expanded' : ''}`}
                                onClick={() => shift.id && toggleRowExpansion(shift.id)}
                                style={{ cursor: 'pointer' }}
                              >
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="expand-icon">
                                      {expandedRows.has(shift.id!) ? '▼' : '▶'}
                                    </span>
                                    {new Date(shift.date).toLocaleDateString('ru-RU')}
                                  </div>
                                </td>
                                <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                                  {shift.total.toLocaleString()}₽
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className="delete-btn"
                                    onClick={() => shift.id && handleDeleteShift(shift.id)}
                                    title="Удалить смену"
                                    disabled={isDemo}
                                  >
                                    <img src="/trash.svg" alt="Удалить" width="28" height="28" />
                                  </button>
                                </td>
                              </tr>
                              {expandedRows.has(shift.id!) && (
                                <tr className="shift-details-row">
                                  <td colSpan={3}>
                                    <div className="shift-details-content">
                                      <div className="details-grid">
                                        <div className="detail-item">
                                          <span className="detail-label">Часы работы:</span>
                                          <span className="detail-value">{shift.hours}ч</span>
                                        </div>
                                        <div className="detail-item">
                                          <span className="detail-label">Мастера:</span>
                                          <span className="detail-value">{shift.masters}</span>
                                        </div>
                                        <div className="detail-item">
                                          <span className="detail-label">Путевое:</span>
                                          <span className="detail-value">{shift.steam_bath}</span>
                                        </div>
                                        <div className="detail-item">
                                          <span className="detail-label">Фирменное:</span>
                                          <span className="detail-value">{shift.brand_steam}</span>
                                        </div>
                                        <div className="detail-item">
                                          <span className="detail-label">Ознакомительное:</span>
                                          <span className="detail-value">{shift.intro_steam}</span>
                                        </div>
                                        <div className="detail-item">
                                          <span className="detail-label">Скрабирование:</span>
                                          <span className="detail-value">{shift.scrubbing}</span>
                                        </div>
                                        <div className="detail-item">
                                          <span className="detail-label">Запарник:</span>
                                          <span className="detail-value">{shift.zaparnik}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Стики-футер удален в пользу Mobile UX V2 (Sticky Top + Static Bottom) */}

        </div>
      </div>
    </>
  );
}
