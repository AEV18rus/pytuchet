'use client';

import { useState, useEffect } from 'react';

interface User {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  display_name?: string;
  is_blocked?: boolean;
  blocked_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface Shift {
  id: number;
  user_id: number;
  date: string;
  hours: number;
  steam_bath: number;
  brand_steam: number;
  intro_steam: number;
  scrubbing: number;
  masters: number;
  total: number;
  created_at?: string;
}

interface UserManagementProps {
  onUserSelect?: (userId: number) => void;
}

export default function UserManagement({ onUserSelect }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userShifts, setUserShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке пользователей');
      }
      
      if (data.success) {
        setUsers(data.users);
      } else {
        throw new Error(data.error || 'Не удалось загрузить пользователей');
      }
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      alert(`Ошибка загрузки: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const loadUserShifts = async (userId: number) => {
    try {
      setShiftsLoading(true);
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке смен пользователя');
      }
      
      if (data.success) {
        setUserShifts(data.shifts);
      } else {
        throw new Error(data.error || 'Не удалось загрузить смены пользователя');
      }
    } catch (error) {
      console.error('Ошибка при загрузке смен пользователя:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      alert(`Ошибка загрузки смен: ${errorMessage}`);
    } finally {
      setShiftsLoading(false);
    }
  };

  const handleUserAction = async (userId: number, action: 'block' | 'unblock' | 'delete') => {
    try {
      if (action === 'delete') {
        if (!confirm('Вы уверены, что хотите удалить этого пользователя? Все его смены также будут удалены.')) {
          return;
        }
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Ошибка при удалении пользователя');
        }
        
        if (data.success) {
          alert('Пользователь успешно удален');
          await loadUsers();
          if (selectedUser?.id === userId) {
            setSelectedUser(null);
            setUserShifts([]);
            setShowUserDetails(false);
          }
        } else {
          throw new Error(data.error || 'Не удалось удалить пользователя');
        }
      } else {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action }),
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `Ошибка при выполнении действия: ${action}`);
        }
        
        if (data.success) {
          const actionText = action === 'block' ? 'заблокирован' : 'разблокирован';
          alert(`Пользователь успешно ${actionText}`);
          await loadUsers();
          if (selectedUser?.id === userId) {
            setSelectedUser(data.user);
          }
        } else {
          throw new Error(data.error || `Не удалось выполнить действие: ${action}`);
        }
      }
    } catch (error) {
      console.error('Ошибка при выполнении действия:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      alert(`Ошибка: ${errorMessage}`);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
    loadUserShifts(user.id);
    if (onUserSelect) {
      onUserSelect(user.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <div className="loading">Загрузка пользователей...</div>;
  }

  return (
    <div className="user-management">
      <div className="users-section">
        <h3>Пользователи ({users.length})</h3>
        <div className="users-list">
          {users.map((user) => (
            <div
              key={user.id}
              className={`user-card ${user.is_blocked ? 'blocked' : ''} ${
                selectedUser?.id === user.id ? 'selected' : ''
              }`}
              onClick={() => handleUserSelect(user)}
            >
              <div className="user-info">
                <div className="user-name">
                  {user.display_name || `${user.first_name} ${user.last_name || ''}`}
                  {user.username && <span className="username">@{user.username}</span>}
                  {user.display_name && (
                    <span className="telegram-name">({user.first_name} {user.last_name || ''})</span>
                  )}
                </div>
                <div className="user-meta">
                  ID: {user.telegram_id}
                  {user.is_blocked && <span className="blocked-badge">Заблокирован</span>}
                </div>
                <div className="user-date">
                  Регистрация: {user.created_at ? formatDate(user.created_at) : 'Неизвестно'}
                </div>
              </div>
              <div className="user-actions">
                {user.is_blocked ? (
                  <button
                    className="action-btn unblock"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUserAction(user.id, 'unblock');
                    }}
                  >
                    Разблокировать
                  </button>
                ) : (
                  <button
                    className="action-btn block"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUserAction(user.id, 'block');
                    }}
                  >
                    Заблокировать
                  </button>
                )}
                <button
                  className="action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserAction(user.id, 'delete');
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showUserDetails && selectedUser && (
        <div className="user-details">
          <div className="details-header">
            <h3>
              Смены пользователя: {selectedUser.display_name || `${selectedUser.first_name} ${selectedUser.last_name || ''}`}
            </h3>
            <button
              className="close-btn"
              onClick={() => {
                setShowUserDetails(false);
                setSelectedUser(null);
                setUserShifts([]);
              }}
            >
              ✕
            </button>
          </div>

          {shiftsLoading ? (
            <div className="loading">Загрузка смен...</div>
          ) : userShifts.length > 0 ? (
            <div className="shifts-table-container">
              <table className="shifts-table">
                <thead>
                  <tr>
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
                  {userShifts.map((shift) => (
                    <tr key={shift.id}>
                      <td>{formatDate(shift.date)}</td>
                      <td>{shift.hours}</td>
                      <td>{shift.steam_bath}</td>
                      <td>{shift.brand_steam}</td>
                      <td>{shift.intro_steam}</td>
                      <td>{shift.scrubbing}</td>
                      <td>{shift.masters}</td>
                      <td>{formatCurrency(shift.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="shifts-summary">
                <strong>
                  Всего смен: {userShifts.length} | 
                  Общая сумма: {formatCurrency(userShifts.reduce((sum, shift) => sum + shift.total, 0))}
                </strong>
              </div>
            </div>
          ) : (
            <div className="no-data">У пользователя пока нет смен</div>
          )}
        </div>
      )}

      <style jsx>{`
        .user-management {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .users-section h3 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .users-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 15px;
        }

        .user-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .user-card:hover {
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
        }

        .user-card.selected {
          border-color: #007bff;
          background: #f8f9fa;
        }

        .user-card.blocked {
          border-color: #dc3545;
          background: #fff5f5;
        }

        .user-info {
          margin-bottom: 10px;
        }

        .user-name {
          font-weight: bold;
          margin-bottom: 5px;
        }

        .username {
          color: #666;
          font-weight: normal;
          margin-left: 8px;
        }

        .user-meta {
          font-size: 0.9em;
          color: #666;
          margin-bottom: 3px;
        }

        .user-date {
          font-size: 0.8em;
          color: #999;
        }

        .blocked-badge {
          background: #dc3545;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8em;
          margin-left: 8px;
        }

        .user-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
          transition: background-color 0.2s ease;
        }

        .action-btn.block {
          background: #ffc107;
          color: #000;
        }

        .action-btn.block:hover {
          background: #e0a800;
        }

        .action-btn.unblock {
          background: #28a745;
          color: white;
        }

        .action-btn.unblock:hover {
          background: #218838;
        }

        .action-btn.delete {
          background: #dc3545;
          color: white;
        }

        .action-btn.delete:hover {
          background: #c82333;
        }

        .user-details {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background: white;
          margin-top: 20px;
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .details-header h3 {
          margin: 0;
          color: #333;
        }

        .close-btn {
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 16px;
        }

        .close-btn:hover {
          background: #e9ecef;
        }

        .shifts-table-container {
          overflow-x: auto;
        }

        .shifts-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }

        .shifts-table th,
        .shifts-table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        .shifts-table th {
          background: #f8f9fa;
          font-weight: bold;
        }

        .shifts-table tr:hover {
          background: #f8f9fa;
        }

        .shifts-summary {
          text-align: right;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .loading {
          text-align: center;
          padding: 20px;
          color: #666;
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #999;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .users-list {
            grid-template-columns: 1fr;
          }

          .user-actions {
            flex-direction: column;
          }

          .action-btn {
            width: 100%;
          }

          .details-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .shifts-table {
            font-size: 0.9em;
          }

          .shifts-table th,
          .shifts-table td {
            padding: 8px 4px;
          }
        }
      `}</style>
    </div>
  );
}