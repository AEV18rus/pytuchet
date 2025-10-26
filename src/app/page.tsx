'use client';

import { useState, useEffect } from 'react';

interface Shift {
  id: number;
  date: string;
  hours: number;
  steamBath: number;
  brandSteam: number;
  introSteam: number;
  scrubbing: number;
  masters: number;
  total?: number;
}

interface Prices {
  hourly_rate: number;
  steam_bath_price: number;
  brand_steam_price: number;
  intro_steam_price: number;
  scrubbing_price: number;
}

export default function Home() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [prices, setPrices] = useState<Prices>({
    hourly_rate: 0,
    steam_bath_price: 0,
    brand_steam_price: 0,
    intro_steam_price: 0,
    scrubbing_price: 0
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: '',
    steamBath: '',
    brandSteam: '',
    introSteam: '',
    scrubbing: '',
    masters: '2'
  });

  // Состояние для подтверждения удаления
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    shiftId: number | null;
  }>({
    show: false,
    shiftId: null
  });

  // Состояние для детализации смены
  const [shiftDetail, setShiftDetail] = useState<{
    show: boolean;
    shift: Shift | null;
  }>({
    show: false,
    shift: null
  });

  // Безопасное обновление полей формы
  const updateFormField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Загрузка цен
  const loadPrices = async () => {
    try {
      const response = await fetch('/api/prices/bulk');
      if (response.ok) {
        const pricesData = await response.json();
        setPrices(pricesData);
      }
    } catch (error) {
      console.error('Ошибка при загрузке цен:', error);
    }
  };

  // Загрузка смен
  const loadShifts = async () => {
    try {
      const response = await fetch('/api/shifts');
      if (response.ok) {
        const shiftsData = await response.json();
        setShifts(shiftsData);
      }
    } catch (error) {
      console.error('Ошибка загрузки смен:', error);
    }
  };

  // Расчет суммы смены: часы * цена_часа + доп услуги
  const calculateShiftTotal = (shift: Omit<Shift, 'id' | 'total'>) => {
    // Базовая сумма за часы
    const hoursTotal = shift.hours * prices.hourly_rate;
    
    // Сумма всех услуг
    const servicesTotal = 
      (shift.steamBath * prices.steam_bath_price) +
      (shift.brandSteam * prices.brand_steam_price) +
      (shift.introSteam * prices.intro_steam_price) +
      (shift.scrubbing * prices.scrubbing_price);
    
    // Доп услуги: сумма всех услуг * 0.4 / кол-во мастеров
    const additionalServices = (servicesTotal * 0.4) / shift.masters;
    
    const total = hoursTotal + additionalServices;
    return Math.round(total);
  };

  // Обработка отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const shiftData = {
      date: formData.date,
      hours: parseFloat(formData.hours) || 0,
      steamBath: parseInt(formData.steamBath) || 0,
      brandSteam: parseInt(formData.brandSteam) || 0,
      introSteam: parseInt(formData.introSteam) || 0,
      scrubbing: parseInt(formData.scrubbing) || 0,
      masters: parseInt(formData.masters) || 1
    };

    const total = calculateShiftTotal(shiftData);

    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...shiftData, total })
      });

      if (response.ok) {
        await loadShifts();
        setFormData({
          date: new Date().toISOString().split('T')[0],
          hours: '',
          steamBath: '',
          brandSteam: '',
          introSteam: '',
          scrubbing: '',
          masters: '2'
        });
        alert('Смена успешно добавлена!');
      } else {
        alert('Ошибка при сохранении смены');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка при сохранении смены');
    }
  };

  // Показать подтверждение удаления
  const showDeleteConfirm = (id: number) => {
    setDeleteConfirm({
      show: true,
      shiftId: id
    });
  };

  // Отменить удаление
  const cancelDelete = () => {
    setDeleteConfirm({
      show: false,
      shiftId: null
    });
  };

  // Подтвердить удаление
  const confirmDelete = async () => {
    if (deleteConfirm.shiftId === null) return;

    try {
      const response = await fetch(`/api/shifts/${deleteConfirm.shiftId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadShifts();
        alert('Смена успешно удалена!');
      } else {
        alert('Ошибка при удалении смены');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка при удалении смены');
    }

    // Закрыть модальное окно
    setDeleteConfirm({
      show: false,
      shiftId: null
    });
  };

  // Показать детализацию смены
  const showShiftDetail = (shift: Shift) => {
    setShiftDetail({
      show: true,
      shift: shift
    });
  };

  // Закрыть детализацию смены
  const closeShiftDetail = () => {
    setShiftDetail({
      show: false,
      shift: null
    });
  };

  // Открытие страницы с ценами
  const openPricingPage = () => {
    window.open('/pricing', '_blank');
  };

  // Форматирование даты
  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  useEffect(() => {
    loadShifts();
    loadPrices();
  }, []);

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

        .shift-form {
          background: linear-gradient(135deg, var(--background-section) 0%, rgba(122, 62, 45, 0.08) 100%);
          border-radius: 12px;
          padding: 30px;
          margin-bottom: 30px;
          border: 2px solid var(--primary-color);
          box-shadow: 0 8px 25px var(--shadow-medium);
          position: relative;
          overflow: hidden;
        }

        .shift-form::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        }

        .shift-form h2 {
          color: var(--primary-color);
          margin-bottom: 25px;
          font-size: 1.6em;
          font-weight: 700;
          text-shadow: 0 1px 2px var(--shadow-light);
        }

        .form-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--font-color);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-group input {
          padding: 14px 16px;
          border: 2px solid var(--border-light);
          border-radius: 10px;
          font-size: 16px;
          background: var(--background-card);
          color: var(--font-color);
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px var(--shadow-light);
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(74, 43, 27, 0.1), 0 4px 12px var(--shadow-medium);
          transform: translateY(-1px);
        }

        .form-group input:hover {
          border-color: var(--primary-light);
          box-shadow: 0 4px 8px var(--shadow-light);
        }

        .btn {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          border: none;
          padding: 16px 32px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 15px var(--shadow-medium);
          margin-top: 20px;
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

        .btn-secondary {
          background: linear-gradient(135deg, var(--accent-dark) 0%, var(--accent-color) 100%);
          color: var(--font-color);
          margin-top: 10px;
          border: 2px solid var(--border-light);
          width: auto;
          padding: 12px 24px;
        }

        .btn-secondary:hover {
          background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-light) 100%);
          border-color: var(--primary-light);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px var(--shadow-medium);
        }

        .pricing-section {
          margin-bottom: 30px;
          text-align: center;
        }

        .shifts-list {
          background: var(--background-card);
          border-radius: 12px;
          padding: 30px;
          border: 2px solid var(--border-light);
          box-shadow: 0 8px 25px var(--shadow-light);
        }

        .shifts-list h2 {
          color: var(--primary-color);
          margin-bottom: 25px;
          font-size: 1.6em;
          font-weight: 700;
          text-align: center;
        }

        .shifts-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        .shifts-table th,
        .shifts-table td {
          padding: 15px;
          text-align: left;
          border-bottom: 2px solid var(--border-light);
        }

        .shifts-table th {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 14px;
        }

        .shifts-table tr:hover {
          background: var(--background-section);
        }

        .delete-btn-small {
          background: #dc3545;
          color: white;
          border: none;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .delete-btn-small:hover {
          background: #c82333;
          transform: scale(1.1);
        }

        .empty-state {
          text-align: center;
          color: var(--primary-color);
          font-style: italic;
          padding: 40px;
          font-size: 1.1em;
        }

        @media (max-width: 768px) {
          .container {
            margin: 10px;
            border-radius: 15px;
            max-width: 100%;
          }

          .header {
            padding: 20px;
          }

          .header-content {
            flex-direction: column;
            gap: 10px;
          }

          .logo {
            width: 80px;
            height: 80px;
          }

          .logo img {
            width: 40px !important;
            height: 40px !important;
          }

          .header-text {
            text-align: center;
          }

          .header h1 {
            font-size: 2rem;
          }

          .content {
            padding: 20px;
          }

          .shift-form {
            padding: 20px;
          }

          .form-row {
            flex-direction: column;
            gap: 15px;
          }

          .form-group label {
            font-size: 14px;
          }

          .form-group input {
            font-size: 16px;
            padding: 12px;
            min-height: 44px;
          }

          .btn {
            font-size: 16px;
            padding: 12px 20px;
            min-height: 44px;
            width: 100%;
            margin-bottom: 10px;
          }

          .btn-secondary {
            width: 100%;
            margin-bottom: 20px;
          }

          .shifts-list {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .shifts-table {
            font-size: 14px;
            min-width: 600px;
          }

          .shifts-table th,
          .shifts-table td {
            padding: 10px 8px;
          }

          .delete-btn-small {
            width: 25px;
            height: 25px;
            font-size: 14px;
          }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="header-content">
            <div className="logo">
                <img src="/logo.svg" alt="Логотип" style={{width: '120px', height: '120px'}} />
              </div>
            <div className="header-text">
              <h1>Путевый Учет</h1>
              <p>Система учёта смен и доходов</p>
            </div>
          </div>
        </div>

        <div className="content">
          <div className="shift-form">
            <h2>Добавить смену</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date">Дата:</label>
                  <input
                    type="date"
                    id="date"
                    value={formData.date}
                    onChange={(e) => updateFormField('date', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="hours">Отработанные часы ({prices.hourly_rate} ₽/час):</label>
                  <input
                    type="number"
                    id="hours"
                    step="0.5"
                    min="0"
                    placeholder="0"
                    value={formData.hours}
                    onChange={(e) => updateFormField('hours', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="steamBath">Путевое парение ({prices.steam_bath_price} ₽):</label>
                  <input
                    type="number"
                    id="steamBath"
                    min="0"
                    placeholder="0"
                    value={formData.steamBath}
                    onChange={(e) => updateFormField('steamBath', e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="brandSteam">Фирменное парение ({prices.brand_steam_price} ₽):</label>
                  <input
                    type="number"
                    id="brandSteam"
                    min="0"
                    placeholder="0"
                    value={formData.brandSteam}
                    onChange={(e) => updateFormField('brandSteam', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="introSteam">Ознакомительное парение ({prices.intro_steam_price} ₽):</label>
                  <input
                    type="number"
                    id="introSteam"
                    min="0"
                    placeholder="0"
                    value={formData.introSteam}
                    onChange={(e) => updateFormField('introSteam', e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="scrubbing">Скрабирование ({prices.scrubbing_price} ₽):</label>
                  <input
                    type="number"
                    id="scrubbing"
                    min="0"
                    placeholder="0"
                    value={formData.scrubbing}
                    onChange={(e) => updateFormField('scrubbing', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="masters">Кол-во мастеров:</label>
                <input
                  type="number"
                  id="masters"
                  min="1"
                  placeholder="1"
                  value={formData.masters}
                  onChange={(e) => updateFormField('masters', e.target.value)}
                  required
                />
              </div>
              
              <button type="submit" className="btn">Добавить смену</button>
            </form>
          </div>

          <div className="pricing-section">
            <button type="button" className="btn btn-secondary" onClick={openPricingPage}>
              Прайс
            </button>
          </div>

          <div className="shifts-list">
            <h2>История смен</h2>
            {shifts.length === 0 ? (
              <div className="empty-state">Пока нет добавленных смен</div>
            ) : (
              <table className="shifts-table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Сумма</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((shift) => (
                      <tr key={shift.id} onClick={() => showShiftDetail(shift)} style={{cursor: 'pointer'}}>
                        <td>{formatDateShort(shift.date)}</td>
                        <td>{shift.total || 0} ₽</td>
                        <td>
                          <button
                            className="delete-btn-small"
                            onClick={(e) => {
                              e.stopPropagation();
                              showDeleteConfirm(shift.id);
                            }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно подтверждения удаления */}
      {deleteConfirm.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>
              Подтверждение удаления
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#666' }}>
              Вы уверены, что хотите удалить эту смену? Это действие нельзя отменить.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelDelete}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  color: '#333',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно детализации смены */}
      {shiftDetail.show && shiftDetail.shift && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3>Детализация смены от {formatDateShort(shiftDetail.shift.date)}</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <h4>Часы работы:</h4>
              <p>{shiftDetail.shift.hours} ч × {prices.hourly_rate} ₽ = {Math.round(shiftDetail.shift.hours * prices.hourly_rate)} ₽</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4>Услуги:</h4>
              {(shiftDetail.shift as any).steam_bath > 0 && (
                <p>Парение: {(shiftDetail.shift as any).steam_bath} × {prices.steam_bath_price} ₽ = {(shiftDetail.shift as any).steam_bath * prices.steam_bath_price} ₽</p>
              )}
              {(shiftDetail.shift as any).brand_steam > 0 && (
                <p>Фирменное парение: {(shiftDetail.shift as any).brand_steam} × {prices.brand_steam_price} ₽ = {(shiftDetail.shift as any).brand_steam * prices.brand_steam_price} ₽</p>
              )}
              {(shiftDetail.shift as any).intro_steam > 0 && (
                <p>Ознакомительное парение: {(shiftDetail.shift as any).intro_steam} × {prices.intro_steam_price} ₽ = {(shiftDetail.shift as any).intro_steam * prices.intro_steam_price} ₽</p>
              )}
              {(shiftDetail.shift as any).scrubbing > 0 && (
                <p>Скрабирование: {(shiftDetail.shift as any).scrubbing} × {prices.scrubbing_price} ₽ = {(shiftDetail.shift as any).scrubbing * prices.scrubbing_price} ₽</p>
              )}
              
              {(() => {
                const servicesTotal = 
                  ((shiftDetail.shift as any).steam_bath * prices.steam_bath_price) +
                  ((shiftDetail.shift as any).brand_steam * prices.brand_steam_price) +
                  ((shiftDetail.shift as any).intro_steam * prices.intro_steam_price) +
                  ((shiftDetail.shift as any).scrubbing * prices.scrubbing_price);
                
                if (servicesTotal > 0) {
                  const additionalServices = (servicesTotal * 0.4) / shiftDetail.shift.masters;
                  return (
                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                      <p><strong>Сумма услуг: {servicesTotal} ₽</strong></p>
                      <p>Доп услуги: {servicesTotal} ₽ × 0.4 ÷ {shiftDetail.shift.masters} мастер(а) = {Math.round(additionalServices)} ₽</p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
              <h4>Итого: {shiftDetail.shift.total || 0} ₽</h4>
              <p>Мастеров: {shiftDetail.shift.masters}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={closeShiftDetail}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  color: '#333',
                  cursor: 'pointer'
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
