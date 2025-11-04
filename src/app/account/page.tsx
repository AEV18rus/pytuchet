'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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

  React.useEffect(() => {
    if (user) {
      // Загружаем расширенный профиль (browser_login, password_set_at)
      const loadProfile = async () => {
        try {
          const res = await fetch('/api/user/profile', { headers: getAuthHeaders() });
          const data = await res.json();
          if (res.ok && data?.user) {
            setProfileExtras({
              browser_login: data.user.browser_login ?? null,
              password_set_at: data.user.password_set_at ?? null,
            });
            // Предзаполняем логин: приоритет browser_login, затем telegram username
            const pref = (data.user.browser_login ?? user.username ?? '').trim();
            if (pref) setLogin(pref);
          } else {
            // Fallback: только telegram username
            if (user.username) setLogin(user.username);
          }
        } catch {
          if (user.username) setLogin(user.username);
        }
      };
      loadProfile();
    }
  }, [user]);

  const handleSavePassword = async () => {
    setStatus(null);
    setError(null);

    if (!login || login.trim().length < 3) {
      setError('Логин должен содержать минимум 3 символа');
      return;
    }
    if (!password || password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };

      // Заглушка: эндпоинт будет реализован на следующем шаге
      const response = await fetch('/api/user/set-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({ username: login.trim(), password, currentPassword: profileExtras?.password_set_at ? currentPassword : undefined }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Ошибка сохранения пароля' }));
        throw new Error(data.error || 'Ошибка сохранения пароля');
      }

      setStatus('Пароль успешно сохранён. Теперь вы сможете входить в браузере.');
      // Обновим статус пароля
      setProfileExtras(prev => ({ ...(prev || {}), password_set_at: new Date().toISOString(), browser_login: login.trim() }));
      setCurrentPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения пароля');
    }
  };

  const handleLogout = async () => {
    setLogoutStatus(null);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Не удалось выйти');
      setLogoutStatus('Вы вышли из системы');
      // Перенаправляем на страницу входа
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    } catch (e) {
      setLogoutStatus(e instanceof Error ? e.message : 'Ошибка выхода');
    }
  };

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --primary-color: #4A2B1B; --secondary-color: #7A3E2D; --accent-color: #E9D5B5;
          --background-main: #F2E5D3; --font-color: #2C1A0F; --primary-light: #5D3426; --primary-dark: #3A2015;
          --secondary-light: #8B4A38; --secondary-dark: #6A3424; --accent-light: #F0E2C8; --accent-dark: #DCC49F;
          --background-card: #FEFCF8; --background-section: rgba(233, 213, 181, 0.15);
          --shadow-light: rgba(74, 43, 27, 0.1); --shadow-medium: rgba(74, 43, 27, 0.15); --border-light: rgba(74, 43, 27, 0.2);
        }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, var(--background-main) 0%, var(--accent-light) 100%); min-height: 100vh; padding: 20px; color: var(--font-color); }
        .container { max-width: 1200px; margin: 0 auto; background: var(--background-card); border-radius: 15px; box-shadow: 0 20px 40px var(--shadow-light); overflow: hidden; }
        .header { background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%); color: var(--accent-color); padding: 30px; text-align: center; }
        .header-content { display: flex; align-items: center; justify-content: center; gap: 20px; }
        .logo { width: 80px; height: 80px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .header h1 { font-size: 2em; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .content { padding: 30px; }
        .form-section { background: linear-gradient(135deg, var(--background-section) 0%, rgba(122, 62, 45, 0.08) 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 2px solid var(--primary-color); box-shadow: 0 8px 25px var(--shadow-medium); position: relative; }
        .form-section::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%); }
        .form-section h2 { color: var(--primary-color); margin-bottom: 16px; font-size: 1.4em; font-weight: 700; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .input-group { display: flex; flex-direction: column; }
        .input-label { font-weight: 600; color: var(--font-color); margin-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .input-field { width: 100%; padding: 12px 14px; border: 2px solid var(--border-light); border-radius: 10px; font-size: 16px; background: var(--background-card); color: var(--font-color); transition: all 0.3s ease; box-shadow: 0 2px 4px var(--shadow-light); }
        .input-field:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 4px rgba(74, 43, 27, 0.1), 0 4px 12px var(--shadow-medium); transform: translateY(-1px); }
        .btn { background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%); color: var(--accent-color); border: none; padding: 11px 22px; border-radius: 10px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 15px var(--shadow-medium); text-decoration: none; display: inline-block; }
        .btn:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(74, 43, 27, 0.4); background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%); }
        .back-section { margin-bottom: 16px; display: flex; justify-content: flex-start; }
        .back-button { padding: 12px 20px; background: var(--background-card); border: 2px solid var(--border-light); border-radius: 10px; color: var(--primary-color); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px var(--shadow-medium); display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
        .back-button:hover { background: var(--primary-color); color: var(--background-card); border-color: var(--primary-color); box-shadow: 0 8px 25px rgba(74, 43, 27, 0.4); transform: translateY(-3px); }
        .back-button:active { transform: translateY(-1px); box-shadow: 0 4px 15px var(--shadow-medium); }
        .status { margin-top: 10px; color: #166534; }
        .error { margin-top: 10px; color: #991b1b; }
        @media (max-width: 768px) { .content { padding: 20px; } .header { padding: 20px; } }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="header-content">
            <div className="logo">
              <Image src="/logo.svg" alt="Логотип" width={80} height={80} priority />
            </div>
            <h1>Личный кабинет</h1>
          </div>
        </div>

        <div className="content">
          <div className="back-section">
            <button onClick={() => router.push('/')} className="back-button">← Назад</button>
          </div>
          {loading ? (
            <div>Загрузка профиля...</div>
          ) : (
            <>
              <div className="form-section">
                <h2>Данные профиля</h2>
                <div className="grid">
                  <div className="input-group">
                    <label className="input-label">Telegram ID</label>
                    <input className="input-field" type="text" value={user?.telegram_id ?? ''} readOnly />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Имя</label>
                    <input className="input-field" type="text" value={(user?.first_name || '') + (user?.last_name ? ` ${user.last_name}` : '')} readOnly />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Логин (Telegram username)</label>
                    <input className="input-field" type="text" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="username" />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h2>Установка пароля для входа в браузере</h2>
                {profileExtras?.password_set_at ? (
                  <div style={{ marginBottom: 12 }}>
                    Статус: пароль установлен {new Date(profileExtras.password_set_at).toLocaleString()}
                  </div>
                ) : (
                  <div style={{ marginBottom: 12 }}>Статус: пароль ещё не установлен</div>
                )}
                <div className="grid">
                  {profileExtras?.password_set_at && (
                    <div className="input-group">
                      <label className="input-label">Текущий пароль</label>
                      <input className="input-field" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="введите текущий пароль" />
                    </div>
                  )}
                  <div className="input-group">
                    <label className="input-label">Новый пароль</label>
                    <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="минимум 8 символов" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Подтверждение пароля</label>
                    <input className="input-field" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="повторите пароль" />
                  </div>
                </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button className="btn" onClick={handleSavePassword}>Сохранить пароль</button>
                <button className="btn" onClick={handleLogout}>Выйти</button>
              </div>
              {status && <div className="status">{status}</div>}
              {error && <div className="error">{error}</div>}
              {logoutStatus && <div className="status">{logoutStatus}</div>}
            </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}