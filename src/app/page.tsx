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
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
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

  // Загрузка данных
  const loadData = async () => {
    try {
      setLoading(true);

      // Создаем контроллер для отмены запросов по таймауту
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 секунд таймаут

      const authHeaders = getAuthHeaders();

      const [shiftsResponse, pricesResponse] = await Promise.all([
        fetch('/api/shifts', {
          signal: controller.signal,
          headers: authHeaders
        }),
        fetch('/api/prices', { signal: controller.signal })
      ]);

      clearTimeout(timeoutId);

      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json();
        setShifts(shiftsData);
      } else {
        console.error('Ошибка загрузки смен:', shiftsResponse.status);
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
        await loadData(); // Перезагружаем данные
        // Сброс формы
        setNewShift({
          date: new Date().toISOString().split('T')[0],
          hours: 8,
          steam_bath: 0,
          brand_steam: 0,
          intro_steam: 0,
          scrubbing: 0,
          zaparnik: 0,
          masters: 1
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
        await loadData(); // Перезагружаем данные
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
  const totalEarnings = shifts.reduce((sum, shift) => sum + shift.total, 0);

  // Проверка регистрации пользователя (только для Telegram WebApp)
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !user.display_name && isTelegramWebApp()) {
      // Если пользователь авторизован через Telegram, но не зарегистрирован (нет display_name), перенаправляем на регистрацию
      router.push('/register');
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <>

        <div className="loading-container">
          <div className="loading-text">Загрузка данных...</div>
        </div>
      </>
    );
  }

  return (
    <>


      <div className="container">
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
              <h1>Путёвый Учет</h1>
            </div>
          </div>
        </div>

        <div className="content">
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
            <Link href="/account" className="btn">Личный кабинет</Link>
          </div>
          <UserGreeting />
          {/* Форма добавления новой смены */}
          <div className="form-section">
            <h2>Добавить новую смену</h2>

            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Дата смены</label>
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
                label="Количество мастеров"
                value={newShift.masters}
                onChange={(val) => setNewShift({ ...newShift, masters: val })}
                min={1}
                max={10}
              />
            </div>

            <h3 style={{ color: 'var(--primary-color)', marginBottom: '15px', fontSize: '1.2em', fontWeight: '600' }}>Банные услуги</h3>
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

            <div className="form-footer">
              <div className="calculation-info">
                <div className="calculation-total">
                  Расчетная сумма: {calculateTotal(newShift).toLocaleString()}₽
                </div>
                <div className="calculation-details">
                  Почасовая: {(newShift.hours * getPrice('Почасовая ставка')).toLocaleString()}₽ +
                  Услуги: {(calculateTotal(newShift) - newShift.hours * getPrice('Почасовая ставка')).toLocaleString()}₽
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <button
                  className="btn"
                  onClick={handleAddShift}
                  disabled={isDemo || !newShift.date || newShift.hours <= 0}
                >
                  Добавить смену
                </button>
                <button
                  className="btn"
                  onClick={() => window.location.href = '/payouts'}
                >
                  Выплаты
                </button>
              </div>
            </div>
          </div>

          {/* Список смен */}
          <div className="shifts-section">
            <h2>История смен</h2>
            {shifts.length === 0 ? (
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
        </div>
      </div>
    </>
  );
}
