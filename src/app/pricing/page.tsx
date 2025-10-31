'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useServices, Price } from '@/contexts/ServicesContext';

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function PricingPage() {
  const router = useRouter();
  const { prices, addPrice, updatePrice, deletePrice, refreshPrices, loading: pricesLoading } = useServices();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalServices, setOriginalServices] = useState<Price[]>([]);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [updatingServiceId, setUpdatingServiceId] = useState<number | null>(null);

  // Инициализация оригинального состояния при загрузке
  useEffect(() => {
    if (prices.length > 0 && originalServices.length === 0) {
      setOriginalServices([...prices]);
    }
  }, [prices, originalServices.length]);

  // Добавление новой услуги
  const handleAddService = async () => {
    if (!newServiceName.trim() || !newServicePrice.trim()) {
      showNotification('Заполните все поля', 'error');
      return;
    }

    const price = parseFloat(newServicePrice);
    if (isNaN(price) || price <= 0) {
      showNotification('Цена должна быть положительным числом', 'error');
      return;
    }

    try {
      await addPrice({ name: newServiceName.trim(), price });
      showNotification('Услуга добавлена', 'success');
      setNewServiceName('');
      setNewServicePrice('');
      setIsModalOpen(false);
      setHasChanges(true); // Отмечаем, что есть изменения
    } catch (error) {
      console.error('Ошибка при добавлении услуги:', error);
      showNotification('Не удалось сохранить', 'error');
    }
  };

  // Удаление услуги
  const handleDeleteService = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) {
      return;
    }

    try {
      setDeletingServiceId(id);
      await deletePrice(id);
      showNotification('Услуга удалена', 'success');
      setHasChanges(true); // Отмечаем, что есть изменения
    } catch (error) {
      console.error('Ошибка при удалении услуги:', error);
      showNotification('Не удалось удалить', 'error');
    } finally {
      setDeletingServiceId(null);
    }
  };

  // Показать уведомление
  const showNotification = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setNotification({ id, message, type });
    
    // Автоматически удаляем уведомление через 3 секунды
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Закрытие модального окна
  const closeModal = () => {
    setIsModalOpen(false);
    setNewServiceName('');
    setNewServicePrice('');
  };

  // Сохранение изменений
  const saveChanges = () => {
    setHasChanges(false);
    setOriginalServices([...prices]);
    showNotification('Изменения сохранены', 'success');
    setTimeout(() => {
      router.push('/admin');
    }, 1000);
  };

  // Возврат в админ панель без сохранения
  const goBackToAdmin = () => {
    if (hasChanges) {
      if (confirm('У вас есть несохранённые изменения. Вы уверены, что хотите выйти без сохранения?')) {
        router.push('/admin');
      }
    } else {
      router.push('/admin');
    }
  };

  // Начать редактирование цены
  const startEditingPrice = (serviceId: number, currentPrice: number) => {
    setEditingServiceId(serviceId);
    setEditingPrice(currentPrice.toString());
  };

  // Отменить редактирование
  const cancelEditing = () => {
    setEditingServiceId(null);
    setEditingPrice('');
  };

  // Сохранить изменённую цену
  const saveEditedPrice = async (serviceId: number) => {
    if (!editingPrice.trim()) {
      showNotification('Введите цену', 'error');
      return;
    }

    const price = parseFloat(editingPrice);
    if (isNaN(price) || price <= 0) {
      showNotification('Цена должна быть положительным числом', 'error');
      return;
    }

    try {
      setUpdatingServiceId(serviceId);
      const service = prices.find(s => s.id === serviceId);
      if (!service) return;

      await updatePrice(serviceId, { name: service.name, price });
      showNotification('Цена обновлена', 'success');
      setHasChanges(true);
      setEditingServiceId(null);
      setEditingPrice('');
    } catch (error) {
      console.error('Ошибка при обновлении цены:', error);
      showNotification('Ошибка при обновлении цены', 'error');
    } finally {
      setUpdatingServiceId(null);
    }
  };



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
          --success-color: #4CAF50;
          --error-color: #f44336;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, var(--background-main) 0%, var(--accent-light) 100%);
          min-height: 100vh;
          padding: 20px;
          color: var(--font-color);
        }

        .container {
          max-width: 1000px;
          margin: 0 auto;
          background: var(--background-card);
          border-radius: 15px;
          box-shadow: 0 20px 40px var(--shadow-light);
          overflow: hidden;
        }

        .header {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          padding: 30px;
          text-align: center;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
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
          padding: 30px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .page-title {
          color: var(--primary-color);
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
        }

        .add-service-btn {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px var(--shadow-medium);
          min-height: 44px;
        }

        .add-service-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(74, 43, 27, 0.3);
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%);
        }

        .services-table {
          background: var(--background-card);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 25px var(--shadow-medium);
          border: 2px solid var(--border-light);
        }

        .table-header {
          background: linear-gradient(135deg, var(--background-section) 0%, rgba(122, 62, 45, 0.08) 100%);
          padding: 20px;
          border-bottom: 2px solid var(--border-light);
        }

        .table-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 20px;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border-light);
          transition: all 0.3s ease;
          min-height: 70px;
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .table-row:hover {
          background: var(--background-section);
        }

        .table-row.deleting {
          opacity: 0.5;
          transform: scale(0.98);
        }

        .table-row.updating {
          opacity: 0.7;
        }

        .price-edit-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .price-edit-input {
          padding: 8px 12px;
          border: 2px solid #8B4513;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          background: #FFF8DC;
          color: #8B4513;
          width: 100%;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .price-edit-input:focus {
          outline: none;
          border-color: #A0522D;
          box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.1);
        }

        .price-edit-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .price-edit-buttons {
          display: flex;
          gap: 6px;
          justify-content: center;
        }

        .save-price-btn,
          .cancel-price-btn {
            border: none;
            padding: 8px 12px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 15px rgba(139, 69, 19, 0.2);
            min-width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .save-price-btn {
            background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
            color: #FFF8DC;
          }

          .save-price-btn:hover:not(:disabled) {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(139, 69, 19, 0.4);
            background: linear-gradient(135deg, #A0522D 0%, #CD853F 100%);
          }

          .cancel-price-btn {
            background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
            color: #FFF8DC;
          }

          .cancel-price-btn:hover:not(:disabled) {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(139, 69, 19, 0.4);
            background: linear-gradient(135deg, #A0522D 0%, #CD853F 100%);
          }

          .save-price-btn:disabled,
          .cancel-price-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: 0 4px 15px rgba(139, 69, 19, 0.2);
          }

        .price-display {
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.2s ease;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 4px;
        }

        .price-display:hover {
          background: rgba(139, 69, 19, 0.1);
          transform: translateY(-1px);
        }

        .edit-hint {
          font-size: 11px;
          color: #8B4513;
          opacity: 0;
          transition: opacity 0.2s ease;
          font-style: italic;
        }

        .price-display:hover .edit-hint {
          opacity: 0.7;
        }

        .service-name {
          font-weight: 600;
          color: var(--font-color);
          font-size: 16px;
        }

        .service-price {
          font-weight: 700;
          color: var(--primary-color);
          font-size: 18px;
          text-align: right;
          min-width: 100px;
        }

        .delete-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          min-height: 44px;
        }

        .delete-btn:hover {
          background: rgba(244, 67, 54, 0.1);
          transform: scale(1.1);
        }

        .delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: var(--primary-color);
          font-size: 18px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--primary-color);
        }

        .empty-state h3 {
          font-size: 24px;
          margin-bottom: 10px;
        }

        .empty-state p {
          font-size: 16px;
          opacity: 0.7;
        }

        /* Модальное окно */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: var(--background-card);
          border-radius: 15px;
          padding: 30px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          animation: modalAppear 0.3s ease;
        }

        @keyframes modalAppear {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .modal-header {
          margin-bottom: 25px;
        }

        .modal-title {
          color: var(--primary-color);
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          color: var(--font-color);
          font-weight: 600;
          font-size: 14px;
        }

        .form-input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid var(--border-light);
          border-radius: 10px;
          font-size: 16px;
          background: var(--background-card);
          color: var(--font-color);
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px var(--shadow-light);
          min-height: 44px;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(74, 43, 27, 0.1), 0 4px 12px var(--shadow-medium);
          transform: translateY(-1px);
        }

        .modal-actions {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
          margin-top: 30px;
        }

        .btn-secondary {
          background: var(--background-section);
          color: var(--font-color);
          border: 2px solid var(--border-light);
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          min-height: 44px;
        }

        .btn-secondary:hover {
          background: var(--accent-light);
          border-color: var(--primary-light);
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px var(--shadow-medium);
          min-height: 44px;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(74, 43, 27, 0.3);
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%);
        }

        /* Уведомления */
        .notifications {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 2000;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .notification {
          padding: 15px 20px;
          border-radius: 10px;
          color: white;
          font-weight: 600;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          animation: notificationSlide 0.3s ease;
          min-width: 250px;
        }

        .notification.success {
          background: var(--success-color);
        }

        .notification.error {
          background: var(--error-color);
        }

        @keyframes notificationSlide {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .action-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-top: 30px;
          padding: 20px 0;
        }

        .back-btn, .save-btn {
          padding: 12px 30px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 120px;
        }

        .back-btn {
          background: #f5f5f5;
          color: #666;
          border: 2px solid #ddd;
        }

        .back-btn:hover {
          background: #e8e8e8;
          border-color: #bbb;
          transform: translateY(-2px);
        }

        .save-btn {
          background: linear-gradient(135deg, #8B4513, #A0522D);
          color: white;
          box-shadow: 0 4px 15px rgba(139, 69, 19, 0.3);
        }

        .save-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #A0522D, #CD853F);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(139, 69, 19, 0.4);
        }

        .save-btn:disabled {
          background: #ccc;
          color: #999;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Адаптивность */
        @media (max-width: 768px) {
          .container {
            margin: 10px;
            border-radius: 15px;
          }

          .header {
            padding: 20px;
          }

          .header-content {
            flex-direction: column;
            gap: 15px;
          }

          .logo {
            width: 80px;
            height: 80px;
          }

          .header-text {
            text-align: center;
          }

          .header h1 {
            font-size: 24px;
          }

          .header p {
            font-size: 14px;
          }

          .content {
            padding: 20px;
          }

          .page-header {
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
          }

          .page-title {
            font-size: 24px;
            text-align: center;
          }

          .add-service-btn {
            width: 100%;
            padding: 16px;
            font-size: 18px;
          }

          .table-row {
            grid-template-columns: 1fr;
            gap: 15px;
            text-align: center;
            padding: 20px 15px;
          }

          .service-price {
            text-align: center;
            font-size: 20px;
          }

          .delete-btn {
            align-self: center;
            min-width: 48px;
            min-height: 48px;
          }

          .modal {
            margin: 20px;
            padding: 25px;
          }

          .modal-actions {
            flex-direction: column;
          }

          .notifications {
            left: 20px;
            right: 20px;
          }

          .notification {
            min-width: auto;
          }

          .action-buttons {
            flex-direction: column;
            gap: 10px;
            padding: 15px 0;
          }

          .back-btn, .save-btn {
            width: 100%;
            padding: 15px;
            font-size: 18px;
          }

          .price-edit-container {
            gap: 10px;
          }

          .price-edit-input {
            padding: 10px 14px;
            font-size: 16px;
          }

          .price-edit-buttons {
            gap: 8px;
          }

          .save-price-btn,
            .cancel-price-btn {
              min-width: 44px;
              height: 44px;
              font-size: 12px;
              padding: 10px 14px;
            }

          .edit-hint {
            font-size: 12px;
          }

          .price-display {
            padding: 10px;
            gap: 6px;
          }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="header-content">
            <div className="logo">
              <Image 
                src="/logo.svg" 
                alt="Логотип" 
                width={120} 
                height={120}
                priority
              />
            </div>
            <div className="header-text">
              <h1>Путевый Учет</h1>
              <p>Управление ценами на услуги</p>
            </div>
          </div>
        </div>

        <div className="content">
          <div className="page-header">
            <h2 className="page-title">Цены</h2>
            <button 
              className="add-service-btn"
              onClick={() => setIsModalOpen(true)}
            >
              Добавить услугу
            </button>
          </div>

          <div className="services-table">
            {pricesLoading ? (
              <div className="loading">Загрузка...</div>
            ) : prices.length === 0 ? (
              <div className="empty-state">
                <h3>Услуги не найдены</h3>
                <p>Добавьте первую услугу, нажав кнопку "Добавить услугу"</p>
              </div>
            ) : (
              <>
                <div className="table-header">
                  <div className="table-row">
                    <div className="service-name" style={{ fontWeight: 700, fontSize: '18px' }}>
                      Название услуги
                    </div>
                    <div className="service-price" style={{ fontWeight: 700, fontSize: '18px' }}>
                      Цена
                    </div>
                    <div style={{ width: '44px' }}></div>
                  </div>
                </div>
                {prices.map((service) => (
                  <div 
                    key={service.id} 
                    className={`table-row ${deletingServiceId === service.id ? 'deleting' : ''} ${updatingServiceId === service.id ? 'updating' : ''}`}
                  >
                    <div className="service-name">{service.name}</div>
                    <div className="service-price">
                      {editingServiceId === service.id ? (
                        <div className="price-edit-container">
                          <input
                            type="number"
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(e.target.value)}
                            className="price-edit-input"
                            placeholder="Цена"
                            min="0"
                            step="0.01"
                            disabled={updatingServiceId === service.id}
                          />
                          <div className="price-edit-buttons">
                            <button
                              className="save-price-btn"
                              onClick={() => service.id && saveEditedPrice(service.id)}
                              disabled={updatingServiceId === service.id}
                              title="Сохранить цену"
                            >
                              ✓
                            </button>
                            <button
                              className="cancel-price-btn"
                              onClick={cancelEditing}
                              disabled={updatingServiceId === service.id}
                              title="Отменить"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="price-display" onClick={() => service.id && startEditingPrice(service.id, service.price)}>
                          {service.price} ₽
                          <span className="edit-hint">Нажмите для редактирования</span>
                        </div>
                      )}
                    </div>
                    <button
                      className="delete-btn"
                      onClick={() => service.id && handleDeleteService(service.id)}
                      disabled={deletingServiceId === service.id || editingServiceId === service.id}
                      title="Удалить услугу"
                    >
                      <img src="/trash.svg" alt="Удалить" width="24" height="24" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
          </div>

          {/* Кнопки сохранения и возврата */}
          <div className="action-buttons">
            <button 
              className="back-btn"
              onClick={goBackToAdmin}
            >
              Назад
            </button>
            <button 
              className="save-btn"
              onClick={saveChanges}
              disabled={!hasChanges}
            >
              Сохранить
            </button>
          </div>
        </div>

        {/* Модальное окно */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Добавить услугу</h3>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="serviceName">
                Название услуги
              </label>
              <input
                type="text"
                id="serviceName"
                className="form-input"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="Введите название услуги"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="servicePrice">
                Цена (₽)
              </label>
              <input
                type="number"
                id="servicePrice"
                className="form-input"
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                placeholder="Введите цену"
                min="0"
                step="0.01"
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>
                Отмена
              </button>
              <button className="btn-primary" onClick={handleAddService}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Уведомления */}
      {notification && (
        <div className="notifications">
          <div 
            key={notification.id} 
            className={`notification ${notification.type}`}
          >
            {notification.message}
          </div>
        </div>
      )}
    </>
  );
}