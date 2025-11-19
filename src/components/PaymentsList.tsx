'use client';

import Image from 'next/image';
import React from 'react';

export type Payment = {
  id: string | number;
  date: string;
  amount: number;
  comment?: string;
  isAdmin?: boolean;
  isAdvance?: boolean;
};

interface PaymentsListProps {
  payments: Payment[];
  onDelete: (id: string | number) => void;
}

export function PaymentsList({ payments, onDelete }: PaymentsListProps) {
  if (!payments.length) {
    return <div className="payments-empty">Выплат пока нет</div>;
  }

  return (
    <div className="payments-list">
      {payments.map((payment) => (
        <div key={payment.id} className="payment-block">
          <div className="payment-row">
            <div className="payment-date">{payment.date}</div>
            <div className="payment-amount">
              {formatCurrency(payment.amount)}
              {payment.isAdmin && <span className="payment-admin-dot">•</span>}
              {payment.isAdvance && <span className="payment-advance-badge">АВАНС</span>}
            </div>
            <button
              type="button"
              className="payment-delete"
              onClick={() => onDelete(payment.id)}
              aria-label="Удалить выплату"
            >
              <Image src="/trash.svg" alt="" width={16} height={16} />
            </button>
          </div>
          {payment.comment && (
            <div className="payment-comment">
              {payment.comment}
            </div>
          )}
        </div>
      ))}
      <style jsx>{`
        .payments-empty {
          font-size: 12px;
          color: rgba(44, 26, 15, 0.6);
        }
        .payments-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .payment-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .payment-row {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }
        .payment-date {
          min-width: 48px;
          font-size: 13px;
          color: rgba(44, 26, 15, 0.75);
        }
        .payment-amount {
          display: flex;
          align-items: center;
          font-weight: 600;
          color: var(--primary-color, #2c1a0f);
          flex: 1;
        }
        .payment-admin-dot {
          margin-left: 6px;
          color: rgba(44, 26, 15, 0.6);
        }
        .payment-advance-badge {
          display: inline-block;
          background-color: #ff9800;
          color: white;
          font-size: 9px;
          font-weight: bold;
          padding: 1px 4px;
          border-radius: 3px;
          margin-left: 6px;
          vertical-align: middle;
          text-transform: uppercase;
        }
        .payment-delete {
          margin-left: auto;
          border: none;
          background: transparent;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          width: 24px;
          height: 24px;
        }
        .payment-delete:hover {
          opacity: 0.8;
        }
        .payment-comment {
          margin-left: 60px;
          font-size: 12px;
          color: rgba(44, 26, 15, 0.6);
          line-height: 1.3;
          overflow-wrap: break-word;
        }
        @media (max-width: 600px) {
          .payment-row {
            gap: 8px;
          }
          .payment-date {
            min-width: 42px;
          }
          .payment-comment {
            margin-left: 54px;
          }
        }
      `}</style>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s?₽/, ' ₽');
}
