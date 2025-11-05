'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import UserGreeting from '@/components/UserGreeting';
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
        <style jsx global>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          :root {
            --primary-color: #4A2B1B;
            --secondary-color: #7A3E2D;
            --accent-color: #E9D5B5;
            --background-main: #F2E5D3;
            --font-color: #2C1A0F;
            --primary-light: #5D3426;
            --primary-dark: #3A2015;
            --secondary-light: #8B4A38;
            --secondary-dark: #6A3424;
            --accent-light: #F0E2C8;
            --accent-dark: #DCC49F;
            --background-card: #FEFCF8;
            --background-section: rgba(233, 213, 181, 0.15);
            --shadow-light: rgba(74, 43, 27, 0.1);
            --shadow-medium: rgba(74, 43, 27, 0.15);
            --border-light: rgba(74, 43, 27, 0.2);
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, var(--background-main) 0%, var(--accent-light) 100%);
            min-height: 100vh;
            padding: 20px;
            color: var(--font-color);
          }

          .loading-container {
            max-width: 800px;
            margin: 0 auto;
            background: var(--background-card);
            border-radius: 15px;
            box-shadow: 0 20px 40px var(--shadow-light);
            padding: 60px;
            text-align: center;
          }

          .loading-text {
            color: var(--primary-color);
            font-size: 1.5em;
            font-weight: 600;
          }
        `}</style>
        <div className="loading-container">
          <div className="loading-text">Загрузка данных...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root {
          --primary-color: #4A2B1B;
          --secondary-color: #7A3E2D;
          --accent-color: #E9D5B5;
          --background-main: #F2E5D3;
          --font-color: #2C1A0F;
          --primary-light: #5D3426;
          --primary-dark: #3A2015;
          --secondary-light: #8B4A38;
          --secondary-dark: #6A3424;
          --accent-light: #F0E2C8;
          --accent-dark: #DCC49F;
          --background-card: #FEFCF8;
          --background-section: rgba(233, 213, 181, 0.15);
          --shadow-light: rgba(74, 43, 27, 0.1);
          --shadow-medium: rgba(74, 43, 27, 0.15);
          --border-light: rgba(74, 43, 27, 0.2);
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, var(--background-main) 0%, var(--accent-light) 100%);
          min-height: 100vh;
          padding: 20px;
          color: var(--font-color);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: var(--background-card);
          border-radius: 15px;
          box-shadow: 0 20px 40px var(--shadow-light);
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

        .content {
          padding: 40px;
        }

        .stats-section {
          background: linear-gradient(135deg, var(--background-section) 0%, rgba(122, 62, 45, 0.08) 100%);
          border-radius: 12px;
          padding: 30px;
          margin-bottom: 30px;
          border: 2px solid var(--primary-color);
          box-shadow: 0 8px 25px var(--shadow-medium);
          position: relative;
          overflow: hidden;
        }

        .stats-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: var(--background-card);
          border-radius: 10px;
          padding: 20px;
          text-align: center;
          box-shadow: 0 4px 8px var(--shadow-light);
          border: 2px solid var(--border-light);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 16px var(--shadow-medium);
          border-color: var(--primary-light);
        }

        .stat-value {
          font-size: 2.5em;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .stat-value.blue { color: #3b82f6; }
        .stat-value.green { color: #22c55e; }
        .stat-value.purple { color: #8b5cf6; }
        .stat-value.orange { color: #f97316; }

        .stat-label {
          color: var(--secondary-color);
          font-weight: 500;
        }

        .form-section {
          background: linear-gradient(135deg, var(--background-section) 0%, rgba(122, 62, 45, 0.08) 100%);
          border-radius: 12px;
          padding: 30px;
          margin-bottom: 30px;
          border: 2px solid var(--primary-color);
          box-shadow: 0 8px 25px var(--shadow-medium);
          position: relative;
          overflow: hidden;
        }

        .form-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        }

        .form-section h2 {
          color: var(--primary-color);
          margin-bottom: 25px;
          font-size: 1.6em;
          font-weight: 700;
          text-shadow: 0 1px 2px var(--shadow-light);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
        }

        .input-label {
          font-weight: 600;
          color: var(--font-color);
          margin-bottom: 8px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .input-field {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid var(--border-light);
          border-radius: 10px;
          font-size: 16px;
          background: var(--background-card);
          color: var(--font-color);
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px var(--shadow-light);
        }

        .input-field:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(74, 43, 27, 0.1), 0 4px 12px var(--shadow-medium);
          transform: translateY(-1px);
        }

        .input-field:hover {
          border-color: var(--primary-light);
          box-shadow: 0 4px 8px var(--shadow-light);
        }

        /* Скрытие стрелок прокрутки в полях number */
        .input-field[type="number"]::-webkit-outer-spin-button,
        .input-field[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .input-field[type="number"] {
          -moz-appearance: textfield;
        }

        .form-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .calculation-info {
          flex: 1;
          min-width: 200px;
        }

        .calculation-total {
          font-weight: 600;
          color: var(--primary-color);
          font-size: 1.1em;
        }

        .calculation-details {
          font-size: 0.9em;
          color: var(--secondary-color);
          margin-top: 5px;
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
          text-decoration: none;
          display: inline-block;
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

        .btn-danger {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
        }

        .btn-danger:hover {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .shifts-section {
          background: linear-gradient(135deg, var(--background-section) 0%, rgba(122, 62, 45, 0.08) 100%);
          border-radius: 12px;
          padding: 30px;
          border: 2px solid var(--primary-color);
          box-shadow: 0 8px 25px var(--shadow-medium);
          position: relative;
          overflow: hidden;
        }

        .shifts-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        }

        .shifts-section h2 {
          color: var(--primary-color);
          margin-bottom: 25px;
          font-size: 1.6em;
          font-weight: 700;
          text-shadow: 0 1px 2px var(--shadow-light);
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #8B6B4B;
          background: var(--background-card);
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(74, 43, 27, 0.08);
          margin: 20px 0;
        }

        .empty-title {
          font-size: 1.4em;
          font-weight: 500;
          margin-bottom: 12px;
          color: #8B6B4B;
          line-height: 1.4;
        }

        .shifts-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--background-card);
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 8px var(--shadow-light);
        }

        .shifts-table th {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          padding: 15px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .shifts-table td {
          padding: 15px 12px;
          border-bottom: 1px solid var(--border-light);
          color: var(--font-color);
        }

        .shifts-table tr:hover {
          background: var(--background-section);
        }

        .shifts-table tr:last-child td {
          border-bottom: none;
        }

        .delete-btn {
          background: transparent;
          border: none;
          border-radius: 8px;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 8px;
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



        /* Стили для раскрывающихся строк */
        .shift-row {
          transition: background-color 0.2s ease;
        }

        .shift-row:hover {
          background-color: rgba(139, 69, 19, 0.05);
        }

        .shift-row.expanded {
          background-color: rgba(139, 69, 19, 0.1);
        }

        .expand-icon {
          font-size: 12px;
          color: var(--primary-color);
          transition: transform 0.2s ease;
          display: inline-block;
          width: 16px;
        }

        .shift-details-row {
          background-color: rgba(139, 69, 19, 0.02);
          border-top: 1px solid rgba(139, 69, 19, 0.1);
        }

        .shift-details-content {
          padding: 20px;
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

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .detail-item {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: rgba(255, 255, 255, 0.5);
          border-radius: 6px;
          border: 1px solid rgba(139, 69, 19, 0.1);
        }

        .detail-label {
          font-weight: 500;
          color: #666;
          font-size: 14px;
        }

        .detail-value {
          font-weight: 600;
          color: var(--primary-color);
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .container {
            margin: 10px;
            border-radius: 15px;
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
            padding: 20px;
          }

          .form-grid, .services-grid {
            grid-template-columns: 1fr;
          }

          .form-footer {
            flex-direction: column;
            align-items: stretch;
          }



          /* Мобильные стили для таблицы */
          .shifts-table {
            font-size: 14px;
          }

          .shifts-table th,
          .shifts-table td {
            padding: 8px 4px;
            font-size: 12px;
          }

          .shifts-table th:first-child,
          .shifts-table td:first-child {
            padding-left: 8px;
          }

          .shifts-table th:last-child,
          .shifts-table td:last-child {
            padding-right: 8px;
          }

          /* Мобильные стили для деталей */
          .details-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .shift-details-content {
            padding: 12px;
            margin: 0 -4px;
          }

          .detail-item {
            padding: 8px;
            font-size: 12px;
            border-radius: 6px;
          }

          .detail-label {
            font-size: 11px;
            margin-bottom: 2px;
          }

          .detail-value {
            font-size: 13px;
            font-weight: 700;
          }

          .expand-icon {
            font-size: 10px;
          }

          /* Адаптация для очень маленьких экранов */
          @media (max-width: 480px) {
            .shifts-table th,
            .shifts-table td {
              padding: 6px 2px;
              font-size: 11px;
            }

            .shift-details-content {
              padding: 10px;
              margin: 0 -2px;
            }

            .detail-item {
              padding: 6px;
              font-size: 11px;
            }

            .detail-label {
              font-size: 10px;
            }

            .detail-value {
              font-size: 12px;
            }
          }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="header-content">
            <div className="logo" onClick={() => router.push('/admin')} style={{cursor: 'pointer'}}>
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
              <div className="input-group">
                <label className="input-label">Часы работы ({getPrice('Почасовая ставка')}₽)</label>
                <input
                  className="input-field"
                  type="number"
                  step="0.5"
                  value={newShift.hours === 0 ? '' : newShift.hours.toString()}
                  onChange={(e) => setNewShift({ ...newShift, hours: Number(e.target.value) || 0 })}
                  placeholder=""
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Количество мастеров</label>
                <input
                  className="input-field"
                  type="number"
                  value={newShift.masters.toString()}
                  onChange={(e) => setNewShift({ ...newShift, masters: Number(e.target.value) })}
                  placeholder="2"
                  required
                />
              </div>
            </div>
            
            <h3 style={{color: 'var(--primary-color)', marginBottom: '15px', fontSize: '1.2em', fontWeight: '600'}}>Банные услуги</h3>
            <div className="services-grid">
              <div className="input-group">
                <label className="input-label">Путевое парение ({getPrice('Путевое парение')}₽)</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  value={newShift.steam_bath === 0 ? '' : newShift.steam_bath.toString()}
                  onChange={(e) => setNewShift({ ...newShift, steam_bath: Number(e.target.value) || 0 })}
                  placeholder=""
                />
              </div>
              <div className="input-group">
                <label className="input-label">Фирменное парение ({getPrice('Фирменное парение')}₽)</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  value={newShift.brand_steam === 0 ? '' : newShift.brand_steam.toString()}
                  onChange={(e) => setNewShift({ ...newShift, brand_steam: Number(e.target.value) || 0 })}
                  placeholder=""
                />
              </div>
              <div className="input-group">
                <label className="input-label">Ознакомительное ({getPrice('Ознакомительное парение')}₽)</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  value={newShift.intro_steam === 0 ? '' : newShift.intro_steam.toString()}
                  onChange={(e) => setNewShift({ ...newShift, intro_steam: Number(e.target.value) || 0 })}
                  placeholder=""
                />
              </div>
              <div className="input-group">
                <label className="input-label">Скрабирование ({getPrice('Скрабирование')}₽)</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  value={newShift.scrubbing === 0 ? '' : newShift.scrubbing.toString()}
                  onChange={(e) => setNewShift({ ...newShift, scrubbing: Number(e.target.value) || 0 })}
                  placeholder=""
                />
              </div>
              <div className="input-group">
                <label className="input-label">Запарник ({getPrice('Запарник')}₽)</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  value={newShift.zaparnik === 0 ? '' : newShift.zaparnik.toString()}
                  onChange={(e) => setNewShift({ ...newShift, zaparnik: Number(e.target.value) || 0 })}
                  placeholder=""
                />
              </div>
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
              <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
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
                <div style={{overflowX: 'auto'}}>
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
                            style={{cursor: 'pointer'}}
                          >
                            <td>
                              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span className="expand-icon">
                                  {expandedRows.has(shift.id!) ? '▼' : '▶'}
                                </span>
                                {new Date(shift.date).toLocaleDateString('ru-RU')}
                              </div>
                            </td>
                            <td style={{fontWeight: '600', color: 'var(--primary-color)'}}>
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
