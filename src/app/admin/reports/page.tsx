'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useServices } from '@/contexts/ServicesContext';

// Интерфейсы данных
interface Employee {
  id: number;
  name: string;
  earned: number;
  paid: number;
  outstanding: number;
}

interface Month {
  month: string;
  status: string;
  totalEarned: number;
  totalPaid: number;
  totalOutstanding: number;
  employees: Employee[];
}

interface Shift {
  id: number;
  masterName: string;
  date: string;
  hours: number;
  steamBath: number;
  brandSteam: number;
  introSteam: number;
  scrubbing: number;
  masters: number;
  amount: number;
  services?: string | { [key: string]: number };
}

interface ShiftLoadingState {
  [key: string]: {
    loading: boolean;
    error: boolean;
    data: Shift[] | null;
  };
}

// Утилиты форматирования
const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  
  return formatted.replace(/\u00A0/g, '\u202F');
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });
};

const formatMonthName = (monthString: string): string => {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
};

// Функции для статуса
const getStatusText = (status: string): string => {
  switch (status) {
    case 'open': return 'Не закрыт';
    case 'partial': return 'Частично закрыт';
    case 'closed': return 'Закрыт';
    default: return status;
  }
};

const getStatusCircle = (status: string) => {
  const statusText = getStatusText(status);

  return (
    <span
      className={`status-circle status-circle--${status}`}
      title={statusText}
      aria-label={statusText}
    />
  );
};

// Компонент таблицы смен
function ShiftsTable({ shifts }: { shifts: Shift[] }) {
  const { prices } = useServices();
  const servicePrices = prices.filter(price => price.name !== 'Почасовая ставка');
  
  return (
    <div className="shift-card-list">
      {shifts.map((shift) => {
        // Парсим данные услуг
        let servicesData: { [key: string]: number } = {};
        if (shift.services) {
          try {
            servicesData = typeof shift.services === 'string' 
              ? JSON.parse(shift.services) 
              : shift.services;
          } catch (e) {
            console.error('Error parsing services data:', e);
          }
        }

        const getServiceCount = (serviceName: string): number => {
          if (servicesData[serviceName] !== undefined) {
            return servicesData[serviceName];
          }
          
          switch (serviceName) {
            case 'Путевое парение':
              return shift.steamBath || 0;
            case 'Фирменное парение':
              return shift.brandSteam || 0;
            case 'Ознакомительное парение':
              return shift.introSteam || 0;
            case 'Скрабирование':
              return shift.scrubbing || 0;
            default:
              return 0;
          }
        };

        const visibleServices = servicePrices
          .map(price => ({
            name: price.name,
            count: getServiceCount(price.name)
          }))
          .filter(service => service.count > 0);
        const totalFormatted = formatCurrency(shift.amount).replace(/\s*₽/, '₽');

        return (
          <div key={shift.id} className="shift-card">
            <div className="shift-card__header">
              <div>
                <div className="shift-card__date">{formatDate(shift.date)}</div>
                <div className="shift-card__masters">мастеров: {shift.masters}</div>
              </div>
              <span className="shift-card__hours-badge">
                {shift.hours} ч
              </span>
            </div>

            {visibleServices.length > 0 && (
              <div className="shift-card__services">
                {visibleServices.map(service => (
                  <div className="shift-card__service-row" key={service.name}>
                    <span>{service.name}</span>
                    <span>{service.count}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="shift-card__total" aria-label="Итого за смену">
              <span className="shift-card__total-value">{totalFormatted}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Компонент строки сотрудника
function EmployeeRow({ 
  employee, 
  month, 
  shiftState, 
  onToggle 
}: { 
  employee: Employee; 
  month: string;
  shiftState: ShiftLoadingState[string];
  onToggle: (employeeId: number, month: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDebt = employee.outstanding > 0;
  const statusBadgeLabel = hasDebt ? 'долг' : 'выплачено';

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    
    if (newExpanded && !shiftState?.data && !shiftState?.loading) {
      onToggle(employee.id, month);
    }
  };

  const handleRetry = () => {
    onToggle(employee.id, month);
  };

  return (
    <>
      <tr 
        className="employee-row hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100"
        onClick={handleToggle}
      >
        <td colSpan={2} className="employee-card-wrapper">
          <div className="employee-card">
            <div className="employee-card__header">
              <h3 className="employee-card__name">{employee.name}</h3>
              <span className={`employee-status-badge ${hasDebt ? 'employee-status-badge--debt' : 'employee-status-badge--paid'}`}>
                <span className="employee-status-badge__dot" />
                {statusBadgeLabel}
              </span>
            </div>
            <div className="employee-card__balance balance-grid">
              <div className="balance-col">
                <div className="balance-label">Итого</div>
                <div className="balance-value employee-card__amount">
                  {formatCurrency(employee.earned)}
                </div>
              </div>
              <div className="balance-col balance-col--right">
                <div className="balance-label">Остаток</div>
                <div className={`balance-value employee-card__amount ${hasDebt ? 'employee-card__amount--danger' : 'employee-card__amount--safe'}`}>
                  {formatCurrency(employee.outstanding)}
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={2} className="shift-card-cell">
            {shiftState?.loading && (
              <div className="text-center py-4 text-gray-600">
                Загрузка смен...
              </div>
            )}
            {shiftState?.error && (
              <div className="text-center py-4">
                <div className="text-red-600 mb-2">Ошибка загрузки</div>
                <button 
                  onClick={handleRetry}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                >
                  Повторить
                </button>
              </div>
            )}
            {shiftState?.data && shiftState.data.length === 0 && (
              <div className="text-center py-4 text-gray-600">
                Смен нет
              </div>
            )}
            {shiftState?.data && shiftState.data.length > 0 && (
              <ShiftsTable shifts={shiftState.data} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// Компонент карточки месяца
function MonthCard({ 
  month, 
  shiftStates, 
  onLoadShifts 
}: { 
  month: Month;
  shiftStates: ShiftLoadingState;
  onLoadShifts: (employeeId: number, monthStr: string) => void;
}) {
  const statusText = getStatusText(month.status);
  const outstandingValueClass = [
    'month-card__totals-value',
    month.totalOutstanding > 0
      ? 'month-card__totals-value--danger'
      : month.totalOutstanding < 0
        ? 'month-card__totals-value--success'
        : ''
  ].join(' ').trim();

  return (
    <div className={`form-section mb-8`}>
      {/* Заголовок месяца */}
      <div className="month-card__header">
        <h2 className="text-2xl font-bold mb-4" style={{color:'var(--primary-color)'}}>
          {formatMonthName(month.month)}
        </h2>
        <div className="month-card__status">
          {getStatusCircle(month.status)}
          <span>{statusText}</span>
        </div>
        <div className="month-card__totals" role="list">
          <div className="month-card__totals-row" role="listitem">
            <span className="month-card__totals-label">Заработано</span>
            <span className="month-card__totals-value">
              {formatCurrency(month.totalEarned)}
            </span>
          </div>
          <div className="month-card__totals-row" role="listitem">
            <span className="month-card__totals-label">Выплачено</span>
            <span className="month-card__totals-value">
              {formatCurrency(month.totalPaid)}
            </span>
          </div>
          <div className="month-card__totals-row month-card__totals-row--accent" role="listitem">
            <span className="month-card__totals-label">Остаток</span>
            <span className={outstandingValueClass}>
              {formatCurrency(month.totalOutstanding)}
            </span>
          </div>
        </div>
      </div>

      {/* Таблица сотрудников */}
      <div style={{background:'var(--background-card)', borderRadius:'10px', boxShadow:'0 4px 8px var(--shadow-light)'}}>
        <table className="shifts-table shifts-table--employees" style={{width:'100%'}}>
          <thead>
            <tr>
              <th className="py-4 px-4">Сотрудник</th>
              <th className="py-4 px-4 text-right">Баланс</th>
            </tr>
          </thead>
          <tbody>
            {month.employees.map((employee) => {
              const employeeKey = `${employee.id}-${month.month}`;
              return (
                <EmployeeRow 
                  key={employee.id} 
                  employee={employee} 
                  month={month.month}
                  shiftState={shiftStates[employeeKey]}
                  onToggle={onLoadShifts}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Основной компонент страницы отчетов
export default function ReportsPage() {
  const router = useRouter();
  const [months, setMonths] = useState<Month[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shiftStates, setShiftStates] = useState<ShiftLoadingState>({});

  // Загрузка основных данных отчетов
  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) {
        throw new Error(`Ошибка загрузки отчетов: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        // Фильтруем месяцы, оставляя только те, где есть сотрудники с заработком
        const filteredMonths = data.filter((month: any) => {
          const hasEmployeesWithEarnings = month.employees && month.employees.some((emp: any) => {
            return emp.earned > 0;
          });
          return hasEmployeesWithEarnings;
        });
        
        setMonths(filteredMonths);
      } else {
        setMonths([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки отчетов:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка смен для конкретного сотрудника
  const loadShifts = async (employeeId: number, month: string) => {
    const employeeKey = `${employeeId}-${month}`;
    
    setShiftStates(prev => ({
      ...prev,
      [employeeKey]: { loading: true, error: false, data: null }
    }));

    try {
      const response = await fetch(`/api/reports/${employeeId}/shifts?month=${month}`);
      if (!response.ok) {
        throw new Error('Ошибка загрузки смен');
      }
      
      const data = await response.json();
      
      setShiftStates(prev => ({
        ...prev,
        [employeeKey]: { loading: false, error: false, data: data.shifts || [] }
      }));
    } catch (err) {
      console.error('Ошибка загрузки смен:', err);
      setShiftStates(prev => ({
        ...prev,
        [employeeKey]: { loading: false, error: true, data: null }
      }));
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="header">
          <div className="header-content">
            <div className="logo">
              <Image src="/logo.svg" alt="Логотип" width={60} height={60} priority />
            </div>
            <div className="header-text">
              <h1>Отчеты</h1>
            </div>
          </div>
        </div>
        <div className="content">
          <div style={{textAlign:'center', padding:'40px'}}>
            <div style={{color:'var(--primary-color)', fontWeight:600}}>Загрузка отчётов...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="header">
          <div className="header-content">
            <div className="logo">
              <Image src="/logo.svg" alt="Логотип" width={60} height={60} priority />
            </div>
            <div className="header-text">
              <h1>Отчеты</h1>
            </div>
          </div>
        </div>
        <div className="content">
          <div style={{textAlign:'center'}}>
            <div style={{color:'#dc2626', marginBottom:'16px'}}>Ошибка: {error}</div>
            <button className="btn" onClick={loadReports}>Повторить загрузку</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-content">
          <div className="logo">
            <Image src="/logo.svg" alt="Логотип" width={60} height={60} priority />
          </div>
          <div className="header-text">
            <h1>Отчеты</h1>
          </div>
        </div>
      </div>
      <div className="content">
        <div className="back-section">
          <button 
            onClick={() => router.push('/admin')}
            className="btn btn-secondary"
          >
            Назад
          </button>
        </div>

        {months.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">Нет данных для отображения</div>
          </div>
        ) : (
          months.map((month) => (
            <MonthCard 
              key={month.month} 
              month={month}
              shiftStates={shiftStates}
              onLoadShifts={loadShifts}
            />
          ))
        )}
      </div>

      <style jsx>{`
        .back-section {
          margin-bottom: 20px;
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
      `}</style>
    </div>
  );
}
