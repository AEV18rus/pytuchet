'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useServices, Price } from '@/contexts/ServicesContext';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function PricingPage() {
  const router = useRouter();
  const { prices, addPrice, updatePrice, deletePrice, refreshPrices, loading: pricesLoading, error } = useServices();
  const { user } = useTelegramAuth();
  const readonly = user?.role !== 'admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<number | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState('');
  const [updatingServiceId, setUpdatingServiceId] = useState<number | null>(null);

  useEffect(() => {
    // Ensure prices are up-to-date when visiting the page
    refreshPrices().catch(() => {});
  }, [refreshPrices]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setNotification({ id, message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewServiceName('');
    setNewServicePrice('');
  };

  const handleAddService = async () => {
    if (readonly) {
      showNotification('Только админ может изменять цены', 'error');
      return;
    }
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
      closeModal();
    } catch (e) {
      console.error('Ошибка при добавлении услуги:', e);
      showNotification('Не удалось сохранить', 'error');
    }
  };

  const handleDeleteService = async (id: number) => {
    if (readonly) {
      showNotification('Только админ может изменять цены', 'error');
      return;
    }
    if (!confirm('Удалить услугу?')) return;
    try {
      setDeletingServiceId(id);
      await deletePrice(id);
      showNotification('Услуга удалена', 'success');
    } catch (e) {
      console.error('Ошибка при удалении услуги:', e);
      showNotification('Не удалось удалить', 'error');
    } finally {
      setDeletingServiceId(null);
    }
  };

  const startEditingPrice = (serviceId: number, currentPrice: number) => {
    if (readonly) return;
    setEditingServiceId(serviceId);
    setEditingPrice(currentPrice.toString());
  };

  const cancelEditing = () => {
    setEditingServiceId(null);
    setEditingPrice('');
  };

  const saveEditedPrice = async (serviceId: number) => {
    if (readonly) {
      showNotification('Только админ может изменять цены', 'error');
      return;
    }
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
      setEditingServiceId(null);
      setEditingPrice('');
    } catch (e) {
      console.error('Ошибка при обновлении цены:', e);
      showNotification('Не удалось сохранить', 'error');
    } finally {
      setUpdatingServiceId(null);
    }
  };

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #F2E5D3; min-height: 100vh; padding: 20px; color: #2C1A0F; }
        .container { max-width: 900px; margin: 0 auto; background: #FEFCF8; border-radius: 16px; box-shadow: 0 10px 30px rgba(74,43,27,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg,#4A2B1B 0%,#7A3E2D 100%); color: #E9D5B5; padding: 24px; }
        .header-content { display:flex; align-items:center; gap:16px; }
        .logo { width: 56px; height: 56px; display:flex; align-items:center; justify-content:center; }
        .header-text h1 { font-size: 24px; }
        .content { padding: 24px; }
        .page-header { display:flex; justify-content: space-between; align-items:center; margin-bottom: 16px; }
        .page-title { font-size: 22px; font-weight: 700; color: #4A2B1B; }
        .add-service-btn { background:#4A2B1B; color:#E9D5B5; border:none; padding:10px 16px; border-radius:8px; cursor:pointer; }
        .add-service-btn[disabled] { opacity:0.6; cursor:not-allowed; }
        .services-table { border:1px solid rgba(74,43,27,0.2); border-radius:12px; overflow:hidden; }
        .table-header { background:#F0E2C8; padding:12px; }
        .table-row { display:grid; grid-template-columns: 1fr 180px 60px; align-items:center; padding:12px; border-top:1px solid rgba(74,43,27,0.1); }
        .service-name { font-weight:600; }
        .service-price { }
        .price-display { cursor: pointer; }
        .edit-hint { margin-left: 8px; font-size:12px; color:#7A3E2D; }
        .delete-btn { background:transparent; border:none; cursor:pointer; }
        .delete-btn[disabled] { opacity:0.6; cursor:not-allowed; }
        .loading, .empty-state { padding:16px; text-align:center; color:#4A2B1B; }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; }
        .modal { background:#FEFCF8; width: 380px; max-width: 92vw; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.2); padding:16px; }
        .modal-header { margin-bottom: 12px; }
        .modal-title { font-size:18px; font-weight:700; color:#4A2B1B; }
        .form-group { margin-bottom:12px; }
        .form-label { display:block; margin-bottom:6px; font-weight:600; }
        .form-input { width:100%; padding:10px; border:1px solid rgba(74,43,27,0.2); border-radius:8px; }
        .modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top: 8px; }
        .btn-secondary { background:#E9D5B5; color:#4A2B1B; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; }
        .btn-primary { background:#4A2B1B; color:#E9D5B5; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; }
        .notifications { position:fixed; bottom:16px; right:16px; }
        .notification { padding:10px 14px; border-radius:8px; color:#FEFCF8; }
        .notification.success { background:#2E7D32; }
        .notification.error { background:#C62828; }
        .price-edit-container { display:flex; align-items:center; gap:8px; }
        .price-edit-input { width:120px; padding:8px; border:1px solid rgba(74,43,27,0.2); border-radius:8px; }
        .save-price-btn, .cancel-price-btn { border:none; background:#4A2B1B; color:#E9D5B5; padding:6px 10px; border-radius:6px; cursor:pointer; }
        .save-price-btn[disabled], .cancel-price-btn[disabled] { opacity:0.6; cursor:not-allowed; }
        .readonly-banner { background:#FFF3CD; color:#856404; border:1px solid #FFEeba; padding:10px; border-radius:8px; margin-bottom: 12px; }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="header-content">
            <div className="logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
              <Image src="/logo.svg" alt="Логотип" width={50} height={50} />
            </div>
            <div className="header-text">
              <h1>Путевый Учет</h1>
            </div>
          </div>
        </div>

        <div className="content">
          {readonly && (
            <div className="readonly-banner">
              Только администратор может изменять цены. Просмотр включен.
            </div>
          )}

          <div className="page-header">
            <h2 className="page-title">Цены</h2>
            <button className="add-service-btn" onClick={() => setIsModalOpen(true)} disabled={readonly}>Добавить услугу</button>
          </div>

          <div className="services-table">
            {pricesLoading ? (
              <div className="loading">Загрузка...</div>
            ) : error ? (
              <div className="empty-state">Ошибка: {error}</div>
            ) : prices.length === 0 ? (
              <div className="empty-state">Услуги не найдены. Добавьте первую услугу.</div>
            ) : (
              <>
                <div className="table-header">
                  <div className="table-row">
                    <div className="service-name" style={{ fontWeight: 700 }}>Название услуги</div>
                    <div className="service-price" style={{ fontWeight: 700 }}>Цена</div>
                    <div style={{ width: '60px' }}></div>
                  </div>
                </div>
                {prices.map((service) => (
                  <div key={service.id} className={`table-row ${deletingServiceId === service.id ? 'deleting' : ''} ${updatingServiceId === service.id ? 'updating' : ''}`}>
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
                            step="1"
                            disabled={updatingServiceId === service.id || readonly}
                          />
                          <div className="price-edit-buttons" style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="save-price-btn"
                              onClick={() => service.id && saveEditedPrice(service.id)}
                              disabled={updatingServiceId === service.id || readonly}
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
                        <div className="price-display" onClick={() => !readonly && service.id && startEditingPrice(service.id, service.price)}>
                          {service.price} ₽ {readonly ? null : <span className="edit-hint">Нажмите для редактирования</span>}
                        </div>
                      )}
                    </div>
                    <button
                      className="delete-btn"
                      onClick={() => service.id && handleDeleteService(service.id)}
                      disabled={deletingServiceId === service.id || editingServiceId === service.id || readonly}
                      title="Удалить услугу"
                    >
                      <img src="/trash.svg" alt="Удалить" width="24" height="24" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {isModalOpen && (
            <div className="modal-overlay" onClick={closeModal}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">Добавить услугу</h3>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="serviceName">Название услуги</label>
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
                  <label className="form-label" htmlFor="servicePrice">Цена (₽)</label>
                  <input
                    type="number"
                    id="servicePrice"
                    className="form-input"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    placeholder="Введите цену"
                    min="0"
                    step="1"
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={closeModal}>Отмена</button>
                  <button className="btn-primary" onClick={handleAddService} disabled={readonly}>Сохранить</button>
                </div>
              </div>
            </div>
          )}

          {notification && (
            <div className="notifications">
              <div key={notification.id} className={`notification ${notification.type}`}>
                {notification.message}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}