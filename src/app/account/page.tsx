'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';
import { getAuthHeaders } from '@/lib/auth';

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useTelegramAuth();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoutStatus, setLogoutStatus] = useState<string | null>(null);
  const [profileExtras, setProfileExtras] = useState<{ browser_login?: string | null; password_set_at?: string | null } | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameStatus, setNameStatus] = useState<string | null>(null);

  React.useEffect(() => {
    if (loading) return;
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
        if (!res.ok) {
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      }
    };
    checkAuth();
  }, [loading, router]);

  React.useEffect(() => {
    if (!user || loading) return;

    const loadProfile = async () => {
      try {
        const res = await fetch('/api/user/profile', { headers: getAuthHeaders() });
        const data = await res.json();
        if (res.ok && data?.user) {
          setProfileExtras({
            browser_login: data.user.browser_login ?? null,
            password_set_at: data.user.password_set_at ?? null,
          });
          const pref = (data.user.browser_login ?? user.username ?? '').trim();
          if (pref) setLogin(pref);
          const dn = (data.user.display_name ?? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`).trim();
          setDisplayName(dn);
          setNameInput(dn);
        } else {
          if (user.username) setLogin(user.username);
          const dn = (user.display_name ?? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`).trim();
          setDisplayName(dn);
          setNameInput(dn);
        }
      } catch {
        if (user.username) setLogin(user.username);
        const dn = (user.display_name ?? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`).trim();
        setDisplayName(dn);
        setNameInput(dn);
      }
    };
    loadProfile();
  }, [user, loading]);

  const handleSaveDisplayName = async () => {
    setNameError(null);
    setNameStatus(null);
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) {
      setNameError('Имя минимум 2 символа');
      return;
    }
    if (trimmed.length > 50) {
      setNameError('Имя не должно превышать 50 символов');
      return;
    }
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ display_name: trimmed })
      });
      const data = await res.json();
      if (res.ok) {
        setDisplayName(trimmed);
        setIsEditingName(false);
        setNameStatus('Имя обновлено');
      } else {
        setNameError(data.error || 'Ошибка обновления имени');
      }
    } catch {
      setNameError('Ошибка соединения');
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    try {
      const body: any = { browser_login: login, new_password: password };
      if (profileExtras?.password_set_at) {
        body.current_password = currentPassword;
      }

      const res = await fetch('/api/user/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('Настройки сохранены');
        setProfileExtras({ browser_login: login, password_set_at: new Date().toISOString() });
        setPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
      } else {
        setError(data.error || 'Ошибка сохранения');
      }
    } catch {
      setError('Ошибка соединения');
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
      if (res.ok) {
        setLogoutStatus('Вы вышли из системы');
        router.push('/login');
      } else {
        setLogoutStatus('Ошибка выхода');
      }
    } catch {
      setLogoutStatus('Ошибка соединения');
    }
  };

  if (loading) {
    return (
      <>
        <style jsx global>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
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
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, var(--background-main) 0%, var(--accent-light) 100%); min-height: 100vh; padding: 32px; color: var(--font-color); }
          .loading-container { display: flex; align-items: center; justify-content: center; height: 100vh; }
        `}</style>
        <div className="flex items-center justify-center h-screen">Загрузка...</div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <style jsx global>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #F2E5D3 0%, #F0E2C8 100%); min-height: 100vh; padding: 32px; color: #2C1A0F; }
          .loading-container { display: flex; align-items: center; justify-content: center; height: 100vh; }
        `}</style>
        <div className="flex items-center justify-center h-screen">Не авторизован</div>
      </>
    );
  }

  // Основные стили страницы аккаунта
  const Styles = (
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
    padding: clamp(6px, 4vw, 36px);
    color: var(--font-color);
  }
  
  .container {
    width: min(100%, 760px);
    margin: 0 auto;
    background: var(--background-card);
    border-radius: 18px;
    box-shadow: 0 12px 24px var(--shadow-light);
    overflow: hidden;
  }
  
    .header {
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
      color: var(--accent-color);
      padding: clamp(20px, 6vw, 40px);
    }

    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: clamp(16px, 5vw, 32px);
      flex-wrap: wrap;
      text-align: left;
    }

    .logo {
      width: clamp(72px, 18vw, 120px);
      height: clamp(72px, 18vw, 120px);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
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
    padding: clamp(20px, 6vw, 48px);
  }

  .back-section { margin-bottom: 24px; display: flex; justify-content: flex-start; padding-left: 20px; }
  .back-button { width: auto; }

  .section {
    background: linear-gradient(135deg, var(--background-section) 0%, rgba(122, 62, 45, 0.06) 100%);
    border-radius: 12px;
    padding: 32px;
    margin-bottom: 40px;
    border: 1px solid var(--border-light);
    box-shadow: 0 6px 18px var(--shadow-light);
    position: relative;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .container {
      border-radius: 14px;
    }

    .content {
      padding: 20px;
    }

    .form-grid {
      grid-template-columns: 1fr;
      gap: 18px;
    }

    .section {
      padding: 22px;
      margin-bottom: 28px;
    }

    .back-section {
      justify-content: flex-start;
      padding-left: 0;
    }

    .buttons-row {
      flex-direction: column;
    }

    .buttons-row .btn {
      width: 100%;
      min-width: 0;
    }
  }

  @media (max-width: 480px) {
    body {
      padding: 8px;
    }

    .logo {
      width: 60px;
      height: 60px;
    }

    .content {
      padding: 16px;
    }

    .section {
      padding: 18px;
    }
  }

  @media (max-width: 420px) {
    body {
      padding: 4px;
    }

    .container {
      border-radius: 10px;
    }
  }
  
  .section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  }
  
    .section h2 {
      color: var(--primary-color);
      margin-bottom: 25px;
      font-size: 1.6em;
      font-weight: 700;
      text-shadow: 0 1px 2px var(--shadow-light);
    }
  
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 24px;
    margin-bottom: 24px;
  }
  
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
  
    .input-label {
      font-weight: 600;
      color: var(--font-color);
      margin-bottom: 8px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  
  .input-field {
    width: 100%;
    padding: 14px 16px;
    border: 1px solid rgba(74, 43, 27, 0.25);
    border-radius: 12px;
    font-size: 16px;
    background: rgba(255, 255, 255, 0.9);
    color: var(--font-color);
    transition: box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
    box-shadow: 0 1px 2px rgba(74, 43, 27, 0.08);
  }
  
  .input-field:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(74, 43, 27, 0.12);
  }

  .readonly-field {
    background: rgba(255, 255, 255, 0.7);
    box-shadow: none;
    border: 1px solid rgba(42, 26, 15, 0.12);
  }

  .btn {
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    color: var(--accent-color);
    border: none;
    padding: 12px 22px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.25s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 3px 10px var(--shadow-medium);
    text-decoration: none;
    display: inline-block;
  }
  
  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(74, 43, 27, 0.35);
    background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%);
  }
  
    .btn-danger {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
    }

    .btn-danger:hover {
      background: linear-gradient(135deg, #ef4444, #dc2626);
    }

  .btn-secondary {
    background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-light) 100%);
    color: var(--primary-color);
    border: 2px solid var(--primary-color);
  }

  .btn-secondary:hover {
    background: linear-gradient(135deg, var(--accent-dark) 0%, var(--accent-color) 100%);
  }
  .buttons-row { display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap; align-items: stretch; }
  .buttons-row .btn { flex: 1 1 auto; min-width: 200px; }
  .status-line { margin-bottom: 16px; font-size: 14px; color: var(--font-color); }

  .status-message {
    text-align: center;
    padding: 12px;
    margin: 16px 0;
    border-radius: 8px;
    font-weight: 500;
  }
  
    .success {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border: 1px solid #22c55e;
    }
  
    .error {
      background: rgba(220, 38, 38, 0.1);
      color: #dc2626;
      border: 1px solid #dc2626;
    }
  `}</style>
  );

  // Обновляем JSX для использования новых классов, исправляя синтаксис и размещение кнопки
  return (
    <>
      {Styles}
      <div className="container">
        <header className="header">
          <div className="header-content">
            <div className="logo">
              <img src="/logo.svg" alt="Логотип" style={{ width: '100%', height: '100%' }} />
            </div>
            <div className="header-text">
              <h1>Личный кабинет</h1>
            </div>
          </div>
        </header>
        <main className="content">
          <div className="back-section">
            <button className="btn btn-secondary back-button" onClick={() => router.back()}>Назад</button>
          </div>
          <section className="section">
            <h2>Данные профиля</h2>
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Telegram ID</label>
                <div className="input-field readonly-field">{user.telegram_id || 'N/A'}</div>
              </div>
              <div className="input-group">
                <label className="input-label">Имя</label>
                {isEditingName ? (
                  <div>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="input-field"
                    />
                    <div className="buttons-row" style={{ marginTop: '10px' }}>
                      <button type="button" className="btn" onClick={handleSaveDisplayName}>СОХРАНИТЬ</button>
                      <button type="button" className="btn btn-danger" onClick={() => { setIsEditingName(false); setNameInput(displayName); setNameError(null); }}>ОТМЕНА</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="input-field readonly-field" style={{ flex: '1' }}>{displayName}</div>
                    <button type="button" className="btn" onClick={() => setIsEditingName(true)}>ИЗМЕНИТЬ</button>
                  </div>
                )}
                {nameError && <p className="status-message error">{nameError}</p>}
                {nameStatus && <p className="status-message success">{nameStatus}</p>}
              </div>
              <div className="input-group">
                <label className="input-label">Логин (Telegram username)</label>
                <div className="input-field readonly-field">@{user.username || 'N/A'}</div>
              </div>
            </div>
          </section>
  
          <section className="section">
            <h2>Установка пароля для входа в браузере</h2>
            <p className="status-line">
              {profileExtras?.password_set_at
                ? `Статус: пароль установлен ${new Date(profileExtras.password_set_at).toLocaleString()}`
                : 'Статус: пароль не установлен'}
            </p>
            <form onSubmit={handleSetPassword} className="form-grid">
              <div className="input-group">
                <label className="input-label">Текущий пароль</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="введите текущий пароль"
                  className="input-field"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Новый пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="минимум 8 символов"
                  required
                  className="input-field"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Подтверждение пароля</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="повторите пароль"
                  required
                  className="input-field"
                />
              </div>
              <div className="buttons-row">
                <button type="submit" className="btn">СОХРАНИТЬ ПАРОЛЬ</button>
                <button type="button" className="btn btn-danger" onClick={handleLogout}>ВЫЙТИ</button>
              </div>
            </form>
          </section>
  
          {error && <p className="status-message error">{error}</p>}
          {status && <p className="status-message success">{status}</p>}
          {logoutStatus && <p className="status-message">{logoutStatus}</p>}
        </main>
      </div>
    </>
  );
}
