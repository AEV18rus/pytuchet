'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

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
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
  }) + ' г.';
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

const getStatusColors = (status: string) => {
  switch (status) {
    case 'open':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800'
      };
    case 'partial':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800'
      };
    case 'closed':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800'
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-800'
      };
  }
};

const getStatusCircle = (status: string) => {
  const statusText = getStatusText(status);
  const colorMap: Record<string, string> = {
    open: '#ef4444',     // red-500
    partial: '#eab308',  // yellow-500
    closed: '#22c55e',   // green-500
    default: '#6b7280'   // gray-500
  };
  const bg = colorMap[status] || colorMap.default;

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        title={statusText}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: bg,
          position: 'relative',
          zIndex: 1
        }}
      />
    </div>
  );
};

// Сокращения услуг
const getServiceAbbreviation = (service: string): string => {
  switch (service.toLowerCase()) {
    case 'путевое': return 'П';
    case 'фирменное': return 'Ф';
    case 'ознакомительное': return 'О';
    case 'скрабирование': return 'С';
    default: return service.charAt(0).toUpperCase();
  }
};

// Компонент таблицы смен
function ShiftsTable({ shifts }: { shifts: Shift[] }) {
  return (
    <div className="mt-4">
      <table className="shifts-table">
        <thead>
          <tr>
            <th>ДАТА</th>
            <th className="text-right">ЧАСЫ</th>
            <th className="text-center">П</th>
            <th className="text-center">Ф</th>
            <th className="text-center">О</th>
            <th className="text-center">С</th>
            <th className="text-center">МАСТЕРА</th>
            <th className="text-right">ИТОГО</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((shift, index) => (
            <tr key={shift.id} className="shift-row">
              <td>{formatDate(shift.date)}</td>
              <td className="text-right">{shift.hours}</td>
              <td className="text-center">{shift.steamBath}</td>
              <td className="text-center">{shift.brandSteam}</td>
              <td className="text-center">{shift.introSteam}</td>
              <td className="text-center">{shift.scrubbing}</td>
              <td className="text-center">{shift.masters}</td>
              <td className="text-right" style={{fontWeight:700}}>{formatCurrency(shift.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const employeeKey = `${employee.id}-${month}`;

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
        className="hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100"
        onClick={handleToggle}
      >
        <td className="py-3 px-4">
          <div className="flex items-center">
            <div className="font-medium text-gray-900">{employee.name}</div>
          </div>
        </td>
        <td className="py-3 px-4 text-right font-medium">
          {formatCurrency(employee.earned)}
        </td>
        <td className="py-3 px-4 text-right">
          {formatCurrency(employee.paid)}
        </td>
        <td className="py-3 px-4 text-right">
          <span className={employee.outstanding > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
            {formatCurrency(employee.outstanding)}
          </span>
        </td>
        <td className="text-center" style={{ padding: '12px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <div
              title={employee.outstanding > 0 ? 'Долг' : 'Оплачено'}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: employee.outstanding > 0 ? '#dc2626' : '#16a34a',
                flexShrink: 0
              }}
            />
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="p-0">
            <div className="px-4 pb-4 bg-gray-25">
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
            </div>
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
  const colors = getStatusColors(month.status);

  return (
    <div className={`form-section mb-8`}>
      {/* Заголовок месяца */}
      <div className="mb-6" style={{background:'#fdf9f4', borderRadius:'10px', boxShadow:'0 4px 8px var(--shadow-light)', padding:'16px'}}>
        <h2 className="text-2xl font-bold mb-4" style={{color:'var(--primary-color)'}}>
          {formatMonthName(month.month)}
        </h2>
        <table style={{
          width:'100%', 
          borderCollapse:'collapse', 
          tableLayout:'fixed',
          border: '1px solid #e5e7eb'
        }}>
          <colgroup>
            <col style={{width:'25%'}} />
            <col style={{width:'25%'}} />
            <col style={{width:'25%'}} />
            <col style={{width:'25%'}} />
          </colgroup>
          <thead>
            <tr style={{borderBottom: '2px solid #e5e7eb'}}>
              <th style={{
                color:'var(--secondary-color)', 
                fontWeight:'500', 
                fontSize:'12px', 
                textTransform:'uppercase', 
                letterSpacing:'0.1em', 
                padding:'12px', 
                textAlign:'left', 
                verticalAlign:'middle',
                borderRight: '1px solid #f3f4f6',
                backgroundColor: '#f9fafb'
              }}>Статус</th>
              <th style={{
                color:'var(--secondary-color)', 
                fontWeight:'500', 
                fontSize:'12px', 
                textTransform:'uppercase', 
                letterSpacing:'0.1em', 
                padding:'12px', 
                textAlign:'left', 
                verticalAlign:'middle',
                borderRight: '1px solid #f3f4f6',
                backgroundColor: '#f9fafb'
              }}>Заработано</th>
              <th style={{
                color:'var(--secondary-color)', 
                fontWeight:'500', 
                fontSize:'12px', 
                textTransform:'uppercase', 
                letterSpacing:'0.1em', 
                padding:'12px', 
                textAlign:'left', 
                verticalAlign:'middle',
                borderRight: '1px solid #f3f4f6',
                backgroundColor: '#f9fafb'
              }}>Выплачено</th>
              <th style={{
                color:'var(--secondary-color)', 
                fontWeight:'500', 
                fontSize:'12px', 
                textTransform:'uppercase', 
                letterSpacing:'0.1em', 
                padding:'12px', 
                textAlign:'left', 
                verticalAlign:'middle',
                backgroundColor: '#f9fafb'
              }}>Остаток</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{
                color: colors.text.replace('text-','').includes('red') ? '#dc2626' : colors.text.replace('text-','').includes('green') ? '#16a34a' : 'var(--font-color)', 
                fontWeight:'600', 
                fontSize:'14px', 
                padding:'12px', 
                textAlign:'left', 
                verticalAlign:'middle',
                borderRight: '1px solid #f3f4f6',
                position: 'relative'
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  {getStatusCircle(month.status)}
                </div>
              </td>
              <td style={{
                color:'var(--font-color)', 
                fontWeight:'600', 
                fontSize:'14px', 
                padding:'12px', 
                textAlign:'left', 
                verticalAlign:'middle',
                borderRight: '1px solid #f3f4f6'
              }}>
                {formatCurrency(month.totalEarned)}
              </td>
              <td style={{
                color:'var(--font-color)', 
                fontWeight:'600', 
                fontSize:'14px', 
                padding:'12px', 
                textAlign:'left', 
                verticalAlign:'middle',
                borderRight: '1px solid #f3f4f6'
              }}>
                {formatCurrency(month.totalPaid)}
              </td>
              <td style={{
                color: month.totalOutstanding > 0 ? '#dc2626' : '#16a34a', 
                fontWeight:'600', 
                fontSize:'14px', 
                padding:'12px', 
                textAlign:'left', 
                verticalAlign:'middle'
              }}>
                {formatCurrency(month.totalOutstanding)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Таблица сотрудников */}
      <div style={{background:'var(--background-card)', borderRadius:'10px', boxShadow:'0 4px 8px var(--shadow-light)'}}>
        <table className="shifts-table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th className="py-4 px-4">Сотрудник</th>
              <th className="py-4 px-4 text-right">Заработано</th>
              <th className="py-4 px-4 text-right">Выплачено</th>
              <th className="py-4 px-4 text-right">Остаток</th>
              <th className="py-4 px-4 text-center">Статус</th>
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
    </div>
  );
}