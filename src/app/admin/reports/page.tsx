'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/auth';

// --- Интерфейсы ---

interface Payout {
  id: number;
  amount: number;
  date: string;
  comment?: string;
  is_advance?: boolean;
}

interface Shift {
  id: number;
  date: string;
  hours: number;
  amount: number;
  masters: number;
  steamBath?: number;
  brandSteam?: number;
  introSteam?: number;
  scrubbing?: number;
  zaparnik?: number;
}

interface Employee {
  // Универсальный интерфейс с поддержкой legacy полей
  user_id?: number;
  id?: number;

  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  display_name?: string;
  displayName?: string;
  name?: string; // Legacy

  earnings: number | string;
  earned?: number | string; // Legacy

  total_payouts: number | string;
  paid?: number | string; // Legacy

  remaining: number | string;
  outstanding?: number | string; // Legacy

  global_balance?: number | string;
  globalBalance?: number | string; // Legacy
}

interface MonthData {
  month: string;
  employees: Employee[];
}

// --- Утилиты ---

const safeNumber = (val: number | string | undefined): number => {
  if (val === undefined || val === null) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (amount: number | string | undefined): string => {
  const num = safeNumber(amount);
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num).replace(/\u00A0/g, '\u202F');
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
};

const formatMonthName = (monthString: string): string => {
  if (!monthString) return '';
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
};

// --- Стили (Inline) ---
const styles = {
  modalBackdrop: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '18px',
  },
  modalBody: {
    padding: '20px',
    overflowY: 'auto' as const,
    overflowX: 'auto' as const,
  },
  modalFooter: {
    padding: '15px 20px',
    borderTop: '1px solid #eee',
    textAlign: 'right' as const,
    backgroundColor: '#f9fafb',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginTop: '10px',
  },
  th: {
    textAlign: 'left' as const,
    padding: '10px',
    borderBottom: '2px solid #eee',
    color: '#666',
    fontWeight: 600,
  },
  td: {
    padding: '10px',
    borderBottom: '1px solid #eee',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: '#f8fafc',
    padding: '16px 24px',
    borderBottom: '1px solid #eee',
    fontWeight: 'bold',
    fontSize: '18px',
    color: '#333',
  },
  btnSmall: {
    padding: '6px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: 'none',
    marginRight: '8px',
    fontWeight: 500,
  },
  btnBlue: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
  },
  btnPurple: {
    backgroundColor: '#f3e8ff',
    color: '#7e22ce',
  },
  debtText: {
    color: '#d97706',
    fontWeight: 'bold' as const,
    marginLeft: '5px',
  },
  creditText: {
    color: '#059669',
    fontWeight: 'bold' as const,
    marginLeft: '5px',
  }
};

// --- Компоненты ---

function ShiftsModal({
  employeeId,
  employeeName,
  month,
  onClose
}: {
  employeeId: number,
  employeeName: string,
  month: string,
  onClose: () => void
}) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const res = await fetch(`/api/reports/${employeeId}/shifts?month=${month}`, {
          headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Ошибка загрузки смен');
        const data = await res.json();
        setShifts(data.shifts || []);
      } catch (err) {
        setError('Не удалось загрузить смены');
      } finally {
        setLoading(false);
      }
    };
    fetchShifts();
  }, [employeeId, month]);

  const toggleRow = (shiftId: number) => {
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

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span>Смены: {employeeName} ({formatMonthName(month)})</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
        </div>
        <div style={styles.modalBody}>
          {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка...</div>}
          {error && <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>{error}</div>}

          {!loading && !error && (
            shifts.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888' }}>Смен нет</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Дата</th>
                    <th style={styles.th}>Часы</th>
                    <th style={styles.th}>Мастеров</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Сумма</th>
                    <th style={{ ...styles.th, width: '40px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map(shift => (
                    <>
                      <tr
                        key={shift.id}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: expandedRows.has(shift.id) ? 'rgba(74, 43, 27, 0.05)' : 'transparent'
                        }}
                        onClick={() => toggleRow(shift.id)}
                      >
                        <td style={styles.td}>{formatDate(shift.date)}</td>
                        <td style={styles.td}>{shift.hours} ч</td>
                        <td style={styles.td}>{shift.masters}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 500 }}>
                          {formatCurrency(shift.amount)}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center', fontSize: '12px', color: '#666' }}>
                          <span style={{
                            display: 'inline-block',
                            transition: 'transform 0.2s ease',
                            transform: expandedRows.has(shift.id) ? 'rotate(180deg)' : 'rotate(0deg)'
                          }}>
                            ▼
                          </span>
                        </td>
                      </tr>
                      {expandedRows.has(shift.id) && (
                        <tr key={`${shift.id}-details`}>
                          <td colSpan={5} style={{
                            padding: 0,
                            backgroundColor: 'rgba(74, 43, 27, 0.02)',
                            borderBottom: '1px solid #eee'
                          }}>
                            <div style={{
                              padding: '15px 20px',
                              animation: 'slideDown 0.3s ease-out'
                            }}>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '10px'
                              }}>
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(74, 43, 27, 0.1)'
                                }}>
                                  <span style={{ fontSize: '13px', color: '#666' }}>Путевое парение (П):</span>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#4A2B1B' }}>
                                    {shift.steamBath || 0}
                                  </span>
                                </div>
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(74, 43, 27, 0.1)'
                                }}>
                                  <span style={{ fontSize: '13px', color: '#666' }}>Фирменное парение (Ф):</span>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#4A2B1B' }}>
                                    {shift.brandSteam || 0}
                                  </span>
                                </div>
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(74, 43, 27, 0.1)'
                                }}>
                                  <span style={{ fontSize: '13px', color: '#666' }}>Ознакомительное (О):</span>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#4A2B1B' }}>
                                    {shift.introSteam || 0}
                                  </span>
                                </div>
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(74, 43, 27, 0.1)'
                                }}>
                                  <span style={{ fontSize: '13px', color: '#666' }}>Скрабирование (С):</span>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#4A2B1B' }}>
                                    {shift.scrubbing || 0}
                                  </span>
                                </div>
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(74, 43, 27, 0.1)'
                                }}>
                                  <span style={{ fontSize: '13px', color: '#666' }}>Запарник (З):</span>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#4A2B1B' }}>
                                    {shift.zaparnik || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
        <div style={styles.modalFooter}>
          {!loading && shifts.length > 0 && (
            <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
              Итого: {formatCurrency(shifts.reduce((acc, s) => acc + s.amount, 0))}
            </div>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Закрыть</button>
        </div>
      </div>
      <style jsx>{`
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
      `}</style>
    </div>
  );
}

function PayoutsModal({
  employeeId,
  employeeName,
  onClose
}: {
  employeeId: number,
  employeeName: string,
  onClose: () => void
}) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        const res = await fetch(`/api/admin/payouts?userId=${employeeId}`, {
          headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Ошибка загрузки выплат');
        const data = await res.json();
        setPayouts(data.payouts || []);
      } catch (err) {
        setError('Не удалось загрузить выплаты');
      } finally {
        setLoading(false);
      }
    };
    fetchPayouts();
  }, [employeeId]);

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span>История выплат: {employeeName}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
        </div>
        <div style={styles.modalBody}>
          {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка...</div>}
          {error && <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>{error}</div>}

          {!loading && !error && (
            payouts.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888' }}>Выплат не найдено</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Дата</th>
                    <th style={styles.th}>Комментарий</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(payout => (
                    <tr key={payout.id}>
                      <td style={styles.td}>{formatDate(payout.date)}</td>
                      <td style={styles.td}>
                        {payout.is_advance && <span style={{ backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', marginRight: '5px' }}>Аванс</span>}
                        {payout.comment || '-'}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(payout.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
        <div style={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}

function EmployeeRow({
  employee,
  month,
  onShowShifts,
  onShowPayouts
}: {
  employee: Employee,
  month: string,
  onShowShifts: () => void,
  onShowPayouts: () => void
}) {
  // Универсальная обработка данных (поддержка разных форматов API)
  const globalBalance = safeNumber(employee.global_balance ?? employee.globalBalance);
  const earnings = safeNumber(employee.earnings ?? employee.earned);
  const payouts = safeNumber(employee.total_payouts ?? employee.paid);

  // Имя
  const name = employee.display_name ||
    employee.displayName ||
    employee.name ||
    (employee.first_name ? `${employee.first_name} ${employee.last_name || ''}`.trim() : '') ||
    (employee.firstName ? `${employee.firstName} ${employee.lastName || ''}`.trim() : '') ||
    'Сотрудник';

  return (
    <tr className="hide-mobile">
      <td style={{ ...styles.td, padding: '16px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{name}</div>
        <div style={{ marginTop: '4px', fontSize: '14px' }}>
          {globalBalance > 0 && <span style={styles.creditText}>Долг: {formatCurrency(globalBalance)}</span>}
          {globalBalance < 0 && <span style={styles.debtText}>Аванс: {formatCurrency(Math.abs(globalBalance))}</span>}
          {globalBalance === 0 && <span style={{ color: '#9ca3af' }}>Баланс: 0 ₽</span>}
        </div>
      </td>
      <td style={{ ...styles.td, textAlign: 'right' }}>
        <div style={{ color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Заработано</div>
        <div style={{ fontWeight: 500, fontSize: '15px' }}>{formatCurrency(earnings)}</div>
      </td>
      <td style={{ ...styles.td, textAlign: 'right' }}>
        <div style={{ color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Выплачено</div>
        <div style={{ fontWeight: 500, fontSize: '15px' }}>{formatCurrency(payouts)}</div>
      </td>
      <td style={{ ...styles.td, textAlign: 'right', width: '200px' }}>
        <button onClick={onShowShifts} style={{ ...styles.btnSmall, ...styles.btnBlue }}>Смены</button>
        <button onClick={onShowPayouts} style={{ ...styles.btnSmall, ...styles.btnPurple }}>Выплаты</button>
      </td>
    </tr>
  );
}

function MobileEmployeeCard({
  employee,
  onShowShifts,
  onShowPayouts
}: {
  employee: Employee,
  onShowShifts: () => void,
  onShowPayouts: () => void
}) {
  const globalBalance = safeNumber(employee.global_balance ?? employee.globalBalance);
  const earnings = safeNumber(employee.earnings ?? employee.earned);
  const payouts = safeNumber(employee.total_payouts ?? employee.paid);

  const name = employee.display_name ||
    employee.displayName ||
    employee.name ||
    (employee.first_name ? `${employee.first_name} ${employee.last_name || ''}`.trim() : '') ||
    (employee.firstName ? `${employee.firstName} ${employee.lastName || ''}`.trim() : '') ||
    'Сотрудник';

  return (
    <div className="report-card-mobile show-mobile hide-desktop">
      <div className="report-card-mobile__header">
        <div className="report-card-mobile__name">{name}</div>
        <div className="report-card-mobile__balance">
          {globalBalance > 0 && <span style={styles.creditText}>Долг: {formatCurrency(globalBalance)}</span>}
          {globalBalance < 0 && <span style={styles.debtText}>Аванс: {formatCurrency(Math.abs(globalBalance))}</span>}
          {globalBalance === 0 && <span style={{ color: '#9ca3af' }}>Баланс: 0 ₽</span>}
        </div>
      </div>

      <div className="report-card-mobile__divider" />

      <div className="report-card-mobile__row">
        <span className="report-card-mobile__label">Заработано:</span>
        <span className="report-card-mobile__value">{formatCurrency(earnings)}</span>
      </div>

      <div className="report-card-mobile__row">
        <span className="report-card-mobile__label">Выплачено:</span>
        <span className="report-card-mobile__value">{formatCurrency(payouts)}</span>
      </div>

      <div className="report-card-mobile__actions">
        <button
          onClick={onShowShifts}
          style={{ ...styles.btnSmall, ...styles.btnBlue, flex: 1, margin: 0, padding: '10px' }}
        >
          Смены
        </button>
        <button
          onClick={onShowPayouts}
          style={{ ...styles.btnSmall, ...styles.btnPurple, flex: 1, margin: 0, padding: '10px' }}
        >
          Выплаты
        </button>
      </div>
    </div>
  );
}

function MonthCard({
  monthData,
  onShowShifts,
  onShowPayouts
}: {
  monthData: MonthData,
  onShowShifts: (employee: Employee, month: string) => void,
  onShowPayouts: (employee: Employee) => void
}) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        {formatMonthName(monthData.month)}
      </div>

      {/* Desktop Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }} className="hide-mobile">
        <thead>
          <tr>
            <th style={{ ...styles.th, paddingLeft: '16px' }}>Сотрудник</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>За месяц</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Выплачено</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {monthData.employees.map((employee, idx) => (
            <EmployeeRow
              key={employee.user_id || employee.id || idx}
              employee={employee}
              month={monthData.month}
              onShowShifts={() => onShowShifts(employee, monthData.month)}
              onShowPayouts={() => onShowPayouts(employee)}
            />
          ))}
        </tbody>
      </table>

      {/* Mobile Cards */}
      <div className="show-mobile hide-desktop">
        {monthData.employees.map((employee, idx) => (
          <MobileEmployeeCard
            key={employee.user_id || employee.id || idx}
            employee={employee}
            onShowShifts={() => onShowShifts(employee, monthData.month)}
            onShowPayouts={() => onShowPayouts(employee)}
          />
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeShiftsModal, setActiveShiftsModal] = useState<{ employeeId: number, name: string, month: string } | null>(null);
  const [activePayoutsModal, setActivePayoutsModal] = useState<{ employeeId: number, name: string } | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/reports', { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Не удалось загрузить отчеты');
        const data = await res.json();

        // Фильтрация
        const filtered = Array.isArray(data)
          ? data.filter((m: any) => m.employees && m.employees.length > 0)
          : [];

        setMonths(filtered);
      } catch (err: any) {
        setError(err.message || 'Ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ padding: '20px' }}>
        <div className="header"><div className="header-text"><h1>Отчеты</h1></div></div>
        <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '20px' }}>
        <div style={{ textAlign: 'center', color: 'red' }}>Ошибка: {error}</div>
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
        <div style={{ marginBottom: '20px' }}>
          <button onClick={() => router.push('/admin')} className="btn btn-secondary">
            Назад
          </button>
        </div>

        {months.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px' }}>
            Нет данных для отображения
          </div>
        ) : (
          months.map(month => (
            <MonthCard
              key={month.month}
              monthData={month}
              onShowShifts={(emp) => {
                const id = emp.user_id || emp.id;
                if (!id) return;
                const name = emp.display_name || emp.name || emp.first_name || 'Сотрудник';
                setActiveShiftsModal({ employeeId: id, name, month: month.month });
              }}
              onShowPayouts={(emp) => {
                const id = emp.user_id || emp.id;
                if (!id) return;
                const name = emp.display_name || emp.name || emp.first_name || 'Сотрудник';
                setActivePayoutsModal({ employeeId: id, name });
              }}
            />
          ))
        )}
      </div>

      {activeShiftsModal && (
        <ShiftsModal
          employeeId={activeShiftsModal.employeeId}
          employeeName={activeShiftsModal.name}
          month={activeShiftsModal.month}
          onClose={() => setActiveShiftsModal(null)}
        />
      )}

      {activePayoutsModal && (
        <PayoutsModal
          employeeId={activePayoutsModal.employeeId}
          employeeName={activePayoutsModal.name}
          onClose={() => setActivePayoutsModal(null)}
        />
      )}
    </div>
  );
}
