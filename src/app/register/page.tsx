'use client';

import { useState, useEffect } from 'react';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, loading: authLoading } = useTelegramAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/');
      return;
    }
    
    if (user && user.display_name) {
      router.push('/');
      return;
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Пользователь не авторизован');
      return;
    }
    
    if (!displayName.trim()) {
      setError('Пожалуйста, введите ваше имя');
      return;
    }

    if (displayName.trim().length < 2) {
      setError('Имя должно содержать минимум 2 символа');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': user.telegram_id.toString(),
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при регистрации');
      }

      if (data.success) {
        // Обновляем данные пользователя в localStorage
        if (data.user && user) {
          const updatedUser = { ...user, display_name: data.user.display_name };
          localStorage.setItem('telegram_user', JSON.stringify(updatedUser));
        }
        
        // Перенаправляем на главную страницу после успешной регистрации
        router.push('/');
      } else {
        setError(data.error || 'Ошибка при регистрации');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  // Показываем загрузку пока проверяем авторизацию
  if (authLoading) {
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
        `}</style>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            background: 'var(--background-card)',
            borderRadius: '15px',
            boxShadow: '0 20px 40px var(--shadow-light)',
            padding: '60px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid var(--primary-color)',
              borderTop: '4px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <p style={{
              color: 'var(--primary-color)',
              fontSize: '1.2em',
              fontWeight: '600'
            }}>Загрузка...</p>
          </div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </>
    );
  }

  // Если пользователь не авторизован или уже зарегистрирован, не показываем форму
  if (!user || user.display_name) {
    return null;
  }

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
          --success-color: #22c55e;
          --error-color: #ef4444;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, var(--background-main) 0%, var(--accent-light) 100%);
          min-height: 100vh;
          padding: 20px;
          color: var(--font-color);
        }

        .register-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .register-card {
          max-width: 500px;
          width: 100%;
          background: var(--background-card);
          border-radius: 15px;
          box-shadow: 0 20px 40px var(--shadow-light);
          overflow: hidden;
          border: 2px solid var(--border-light);
        }

        .register-header {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          padding: 40px;
          text-align: center;
          position: relative;
        }

        .register-header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--accent-color) 0%, var(--accent-light) 100%);
        }

        .register-header h1 {
          font-size: 2.2em;
          margin-bottom: 10px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          font-weight: 700;
        }

        .register-header p {
          font-size: 1.1rem;
          opacity: 0.9;
          line-height: 1.5;
        }

        .register-content {
          padding: 40px;
        }

        .form-group {
          margin-bottom: 25px;
        }

        .form-label {
          display: block;
          font-weight: 600;
          color: var(--font-color);
          margin-bottom: 10px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-input {
          width: 100%;
          padding: 16px 20px;
          border: 2px solid var(--border-light);
          border-radius: 12px;
          font-size: 16px;
          background: var(--background-card);
          color: var(--font-color);
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(74, 43, 27, 0.1);
          transform: translateY(-1px);
        }

        .form-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: var(--background-section);
        }

        .form-help {
          margin-top: 8px;
          font-size: 13px;
          color: var(--secondary-color);
          opacity: 0.8;
        }

        .error-message {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
          border: 2px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 20px;
        }

        .error-text {
          color: var(--error-color);
          font-size: 14px;
          font-weight: 500;
        }

        .submit-button {
          width: 100%;
          padding: 16px 24px;
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: var(--accent-color);
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 15px var(--shadow-medium);
          position: relative;
          overflow: hidden;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px var(--shadow-medium);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .submit-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }

        .submit-button:hover:not(:disabled)::before {
          left: 100%;
        }

        .loading-spinner {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--accent-color);
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .user-info {
          margin-top: 30px;
          padding: 20px;
          background: var(--background-section);
          border-radius: 10px;
          border: 1px solid var(--border-light);
          text-align: center;
        }

        .user-info-text {
          font-size: 12px;
          color: var(--secondary-color);
          opacity: 0.8;
          line-height: 1.4;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .register-header {
            padding: 30px 20px;
          }
          
          .register-header h1 {
            font-size: 1.8em;
          }
          
          .register-content {
            padding: 30px 20px;
          }
        }
      `}</style>
      
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h1>Добро пожаловать!</h1>
            <p>
              Для завершения регистрации укажите имя, под которым вас будет видеть администратор
            </p>
          </div>

          <div className="register-content">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="displayName" className="form-label">
                  Ваше имя для отчетов
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Введите ваше имя"
                  className="form-input"
                  disabled={isLoading}
                  maxLength={50}
                />
                <p className="form-help">
                  Это имя будет отображаться в отчетах администратора
                </p>
              </div>

              {error && (
                <div className="error-message">
                  <p className="error-text">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !displayName.trim()}
                className="submit-button"
              >
                {isLoading ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    Регистрация...
                  </div>
                ) : (
                  'Завершить регистрацию'
                )}
              </button>
            </form>

            <div className="user-info">
              <p className="user-info-text">
                Ваши данные Telegram: {user.first_name} {user.last_name && user.last_name}
                {user.username && ` (@${user.username})`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}