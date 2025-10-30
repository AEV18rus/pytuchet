'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserManagement from '@/components/UserManagement';
import Link from 'next/link';
import Image from 'next/image';

interface Shift {
  id?: number;
  date: string;
  hours: number;
  steam_bath: number;
  brand_steam: number;
  intro_steam: number;
  scrubbing: number;
  masters: number;
  total: number;
  hourly_rate?: number;
  steam_bath_price?: number;
  brand_steam_price?: number;
  intro_steam_price?: number;
  scrubbing_price?: number;
  // Информация о пользователе для админ панели
  first_name?: string;
  last_name?: string;
  username?: string;
  display_name?: string;
  telegram_id?: number;
}

interface Version {
  version: string;
  buildDate: string;
  description: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [showReports, setShowReports] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState<Version | null>(null);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/shifts');
      if (response.ok) {
        const data = await response.json();
        setShifts(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки смен:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersion = async () => {
    try {
      const response = await fetch('/api/version');
      if (response.ok) {
        const data = await response.json();
        setVersion(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки версии:', error);
    }
  };

  useEffect(() => {
    loadVersion();
  }, []);

  const handleReportsClick = () => {
    if (!showReports) {
      loadShifts();
    }
    setShowReports(!showReports);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
            <h1>Админ панель</h1>
          </div>
        </div>
      </div>

      <div className="content">
        {!showReports && !showUserManagement ? (
           <div className="admin-section">
             <div className="admin-grid">
               <button 
                 onClick={() => router.push('/pricing')}
                 className="admin-card admin-button"
               >
                 <div className="card-content">
                   <h3>Прайс-лист</h3>
                   <p>Управление ценами на услуги</p>
                 </div>
               </button>

               <button 
                 onClick={() => router.push('/admin/reports')}
                 className="admin-card admin-button"
               >
                 <div className="card-content">
                   <h3>Отчеты</h3>
                   <p>Отчеты по мастерам с детализацией смен</p>
                 </div>
               </button>

               <button 
                 onClick={() => setShowUserManagement(true)}
                 className="admin-card admin-button"
               >
                 <div className="card-content">
                   <h3>Управление пользователями</h3>
                   <p>Просмотр, блокировка и удаление пользователей</p>
                 </div>
               </button>

               <button className="admin-card admin-button" disabled>
                 <div className="card-content">
                   <h3>Настройки</h3>
                   <p>Конфигурация системы</p>
                 </div>
               </button>

               <button 
                 onClick={() => router.push('/admin/logs')}
                 className="admin-card admin-button"
               >
                 <div className="card-content">
                   <h3>Системные логи</h3>
                   <p>Просмотр логов</p>
                 </div>
               </button>
             </div>

            <div className="back-section">
              <button 
                onClick={() => router.push('/')}
                className="btn btn-secondary"
              >
                Назад на главную
              </button>
            </div>

            {version && (
              <div className="version-info">
                <p>Версия: {version.version}</p>
                <p>Дата сборки: {new Date(version.buildDate).toLocaleDateString('ru-RU')}</p>
                <p>{version.description}</p>
              </div>
            )}
          </div>
        ) : showReports ? (
          <div className="reports-section">
            <div className="reports-header">
              <h2>Отчеты по сменам</h2>
              <button 
                onClick={() => setShowReports(false)}
                className="btn btn-secondary"
              >
                Назад к панели
              </button>
            </div>

            {loading ? (
              <div className="loading">Загрузка данных...</div>
            ) : (
              <div className="table-container">
                {shifts.length === 0 ? (
                  <div className="no-data">Нет данных о сменах</div>
                ) : (
                  <table className="shifts-table">
                    <thead>
                      <tr>
                        <th>Мастер</th>
                        <th>Дата</th>
                        <th>Часы</th>
                        <th>П</th>
                        <th>Ф</th>
                        <th>О</th>
                        <th>С</th>
                        <th>Мастера</th>
                        <th>Итого</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map((shift) => (
                        <tr key={shift.id}>
                          <td className="user-cell">
                            <div className="user-info">
                              <div className="user-name">
                                {shift.display_name || `${shift.first_name} ${shift.last_name || ''}`.trim()}
                              </div>
                              <div className="user-username">@{shift.username}</div>
                            </div>
                          </td>
                          <td>{formatDate(shift.date)}</td>
                          <td>{shift.hours}</td>
                          <td>{shift.steam_bath}</td>
                          <td>{shift.brand_steam}</td>
                          <td>{shift.intro_steam}</td>
                          <td>{shift.scrubbing}</td>
                          <td>{shift.masters}</td>
                          <td className="total-cell">{formatCurrency(shift.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
           </div>
         ) : (
           <div className="user-management-section">
             <div className="reports-header">
               <h2>Управление пользователями</h2>
               <button 
                 onClick={() => setShowUserManagement(false)}
                 className="btn btn-secondary"
               >
                 Назад к панели
               </button>
             </div>
             <UserManagement />
           </div>
         )}
       </div>

      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: var(--background-card);
          border-radius: 15px;
          box-shadow: 0 20px 40px var(--shadow-light);
          overflow: hidden;
          min-height: 90vh;
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
          transition: transform 0.3s ease;
        }

        .logo:hover {
          transform: scale(1.05);
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



        .admin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .admin-card {
          background: linear-gradient(135deg, var(--background-section) 0%, rgba(122, 62, 45, 0.08) 100%);
          border: 2px solid var(--primary-color);
          border-radius: 12px;
          padding: 25px;
          text-decoration: none;
          color: var(--font-color);
          transition: all 0.3s ease;
          box-shadow: 0 8px 25px var(--shadow-medium);
          position: relative;
          cursor: pointer;
        }

        .admin-button {
          background: linear-gradient(135deg, var(--background-section) 0%, rgba(122, 62, 45, 0.08) 100%);
          border: 2px solid var(--primary-color);
          font-family: inherit;
          font-size: inherit;
        }

        .admin-card:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px var(--shadow-medium);
          border-color: var(--secondary-color);
        }

        .admin-card:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .card-content {
          text-align: center;
        }

        .card-content h3 {
          color: var(--primary-color);
          font-size: 1.4em;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .card-content p {
          color: var(--font-color);
          font-size: 0.95em;
          opacity: 0.8;
          line-height: 1.4;
        }

        .back-section {
          text-align: center;
          margin-top: 30px;
        }

        .version-info {
          text-align: center;
          margin-top: 20px;
          padding: 15px;
          background: var(--background-section);
          border-radius: 8px;
          border: 1px solid var(--border-light);
        }

        .version-info p {
          margin: 5px 0;
          font-size: 0.85em;
          color: var(--font-color);
          opacity: 0.7;
        }

        .version-info p:first-child {
          font-weight: 600;
          color: var(--primary-color);
          opacity: 1;
        }

        .btn {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px var(--shadow-medium);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px var(--shadow-medium);
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%);
        }

        .btn-secondary {
          background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-light) 100%);
          color: var(--primary-color);
          border: 2px solid var(--primary-color);
        }

        .btn-secondary:hover {
          background: linear-gradient(135deg, var(--accent-dark) 0%, var(--accent-color) 100%);
        }

        .reports-section {
          min-height: 400px;
        }

        .reports-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .reports-header h2 {
          color: var(--primary-color);
          font-size: 1.8em;
          margin: 0;
        }

        .loading, .no-data {
          text-align: center;
          padding: 40px;
          color: var(--font-color);
          font-size: 1.1em;
        }

        .table-container {
          overflow-x: auto;
          border-radius: 12px;
          box-shadow: 0 8px 25px var(--shadow-medium);
        }

        .shifts-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--background-card);
          border-radius: 12px;
          overflow: hidden;
        }

        .shifts-table th {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          padding: 15px 10px;
          text-align: left;
          font-weight: 600;
          font-size: 0.9em;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .shifts-table td {
          padding: 12px 10px;
          border-bottom: 1px solid var(--border-light);
          color: var(--font-color);
        }

        .shifts-table tr:hover {
          background: var(--background-section);
        }

        .total-cell {
          font-weight: 600;
          color: var(--primary-color);
        }

        .user-cell {
          min-width: 150px;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .user-name {
          font-weight: 600;
          color: var(--primary-color);
          font-size: 0.9em;
        }

        .user-username {
          font-size: 0.8em;
          color: var(--font-color-light);
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .content {
            padding: 20px;
          }

          .admin-grid {
            grid-template-columns: 1fr;
          }

          .reports-header {
            flex-direction: column;
            text-align: center;
          }

          .shifts-table {
            font-size: 0.85em;
          }

          .shifts-table th,
          .shifts-table td {
            padding: 8px 6px;
          }
        }
      `}</style>
    </div>
  );
}