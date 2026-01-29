'use client';

import React, { useState } from 'react';

interface NewPaymentFormProps {
  onSubmit: (data: { amount: number; comment: string }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function NewPaymentForm({ onSubmit, onCancel, isSubmitting }: NewPaymentFormProps) {
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(amount.replace(/\s+/g, ''));
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      setError('Введите сумму больше нуля');
      return;
    }
    setError(null);
    onSubmit({ amount: parsed, comment: comment.trim() });
  };

  return (
    <form className="new-payment-card" onSubmit={handleSubmit}>
      <label className="new-payment-label">
        Сумма выплаты
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min="0"
          step="100"
          className={`new-payment-input ${error ? 'new-payment-input--error' : ''}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isSubmitting}
        />
      </label>
      {error && <div className="new-payment-error">{error}</div>}

      <label className="new-payment-label">
        Комментарий
        <input
          type="text"
          className="new-payment-input"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isSubmitting}
        />
      </label>

      <div className="new-payment-actions">
        <button type="button" className="btn btn-cancel" onClick={onCancel} disabled={isSubmitting}>
          Отмена
        </button>
        <button type="submit" className="btn btn-save" disabled={isSubmitting}>
          {isSubmitting ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>

      <style jsx>{`
        .new-payment-card {
          background: #fff7ef;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .new-payment-label {
          display: flex;
          flex-direction: column;
          font-size: 13px;
          font-weight: 600;
          color: var(--primary-color, #2c1a0f);
          gap: 6px;
        }
        .new-payment-input {
          border: 1px solid rgba(44, 26, 15, 0.25);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          width: 100%;
          background: #fff;
        }
        .new-payment-input--error {
          border-color: #dc2626;
        }
        .new-payment-error {
          font-size: 12px;
          color: #dc2626;
        }
        .new-payment-actions {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }
        .btn-cancel {
          flex: 1;
          border: 1px solid #6b3f27;
          color: #6b3f27;
          background: rgba(107, 63, 39, 0.05);
          border-radius: 8px;
          padding: 7px 10px;
          font-weight: 600;
        }
        .btn-save {
          flex: 1;
          border: none;
          background: #6b3f27;
          color: #fff;
          border-radius: 8px;
          padding: 7px 10px;
          font-weight: 600;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 520px) {
          .new-payment-card {
            padding: 16px;
          }
          .new-payment-actions {
            flex-direction: row;
          }
        }
      `}</style>
    </form>
  );
}
