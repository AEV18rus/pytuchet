import { useState, useCallback } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  text: string;
  variant: ToastVariant;
}

export function useToast(defaultDuration = 4000) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const hideToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (text: string, variant: ToastVariant = 'info', duration = defaultDuration) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, text, variant }]);
      if (duration > 0) {
        setTimeout(() => hideToast(id), duration);
      }
    },
    [defaultDuration, hideToast]
  );

  return { toasts, showToast, hideToast };
}

export function ToastContainer({
  toasts,
  onDismiss
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.variant}`}>
          <span>{toast.text}</span>
          <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Закрыть уведомление">
            ×
          </button>
        </div>
      ))}
      <style jsx>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 1500;
        }
        .toast {
          min-width: 260px;
          max-width: 320px;
          padding: 12px 16px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          color: #1f2937;
          background: #fff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }
        .toast button {
          border: none;
          background: transparent;
          font-size: 18px;
          color: inherit;
          cursor: pointer;
        }
        .toast--success {
          border-left: 4px solid #10b981;
        }
        .toast--error {
          border-left: 4px solid #ef4444;
        }
        .toast--info {
          border-left: 4px solid #3b82f6;
        }
        @media (max-width: 640px) {
          .toast-container {
            left: 16px;
            right: 16px;
            bottom: 16px;
          }
          .toast {
            width: 100%;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}
