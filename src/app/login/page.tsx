'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Если пользователь уже авторизован через cookie-сессию, сразу отправляем на главную
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { method: 'GET' });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.authenticated) {
            router.replace('/');
          }
        }
      } catch {
        // игнорируем ошибки сети
      }
    };
    checkAuth();
  }, [router]);

  const handleLogin = async () => {
    setError(null);
    if (!username || username.trim().length < 3) {
      setError('Логин должен содержать минимум 3 символа');
      return;
    }
    if (!password || password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Неверные учетные данные');
      }
      router.push('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка входа');
    } finally {
      setLoading(false);
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
        .container { max-width: 600px; margin: 0 auto; background: var(--background-card); border-radius: 15px; box-shadow: 0 20px 40px var(--shadow-light); overflow: hidden; }
        .header { background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%); color: var(--accent-color); padding: 24px; text-align: center; }
        .header-content { display: flex; align-items: center; justify-content: center; gap: 16px; }
        .logo { width: 64px; height: 64px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .header h1 { font-size: 1.6em; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .content { padding: 24px; }
        .form-section { background: linear-gradient(135deg, var(--background-section) 0%, rgba(122, 62, 45, 0.08) 100%); border-radius: 12px; padding: 20px; border: 2px solid var(--primary-color); box-shadow: 0 8px 25px var(--shadow-medium); position: relative; }
        .input-group { display: flex; flex-direction: column; margin-bottom: 16px; }
        .input-label { font-weight: 600; color: var(--font-color); margin-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .input-field { width: 100%; padding: 12px 14px; border: 2px solid var(--border-light); border-radius: 10px; font-size: 16px; background: var(--background-card); color: var(--font-color); transition: all 0.3s ease; box-shadow: 0 2px 4px var(--shadow-light); }
        .input-field:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 4px rgba(74, 43, 27, 0.1), 0 4px 12px var(--shadow-medium); transform: translateY(-1px); }
        .btn { background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%); color: var(--accent-color); border: none; padding: 11px 22px; border-radius: 10px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 15px var(--shadow-medium); }
        .btn:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(74, 43, 27, 0.4); background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%); }
        .error { margin-top: 10px; color: #991b1b; }
        .hint { margin-top: 12px; font-size: 14px; opacity: 0.85; }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="header-content">
            <div className="logo">
              <Image src="/logo.svg" alt="Логотип" width={64} height={64} priority />
            </div>
            <h1>Вход в личный кабинет</h1>
          </div>
        </div>

        <div className="content">
          <div className="form-section">
            <div className="input-group">
              <label className="input-label">Логин (Telegram username)</label>
              <input className="input-field" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
            </div>
            <div className="input-group">
              <label className="input-label">Пароль</label>
              <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="минимум 8 символов" />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="btn" onClick={handleLogin} disabled={loading}>{loading ? 'Вход...' : 'Войти'}</button>
            </div>
            {error && <div className="error">{error}</div>}
            <div className="hint">Если вход не работает, сначала установите пароль на странице аккаунта.</div>
          </div>
        </div>
      </div>
    </>
  );
}