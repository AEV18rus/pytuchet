'use client';

import { useState, useEffect } from 'react';
import { 
  AuthenticatedUser, 
  getUserFromStorage, 
  saveUserToStorage, 
  removeUserFromStorage,
  isTelegramWebApp,
  getTelegramInitData 
} from '@/lib/auth';

// Функция для проверки существования пользователя в базе данных
const verifyUserExists = async (user: AuthenticatedUser): Promise<boolean> => {
  try {
    const response = await fetch('/api/user/profile', {
      method: 'GET',
      headers: {
        'x-telegram-id': user.telegram_id.toString(),
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error verifying user existence:', error);
    return false;
  }
};

export function useTelegramAuth() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('=== CLIENT AUTH DEBUG ===');
        console.log('Starting authentication process...');
        
        // 0) Сначала проверяем cookie-сессию (браузерный вход)
        try {
          const meRes = await fetch('/api/auth/me', { method: 'GET' });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData && meData.authenticated && meData.user) {
              console.log('Authenticated via cookie session:', meData.user);
              setUser(meData.user);
              saveUserToStorage(meData.user);
              setLoading(false);
              return;
            }
          }
        } catch (cookieErr) {
          console.log('Cookie session not available:', cookieErr);
        }

        // Сначала проверяем localStorage
        const storedUser = getUserFromStorage();
        if (storedUser) {
          console.log('Found stored user in localStorage:', storedUser);
          
          // Для fallback пользователей (браузерных) не проверяем базу данных
          if (storedUser.telegram_id === 87654321) {
            console.log('Found fallback user, using directly without DB verification');
            setUser(storedUser);
            setLoading(false);
            return;
          }
          
          // Для реальных Telegram пользователей проверяем, существует ли пользователь в базе данных
          const userExists = await verifyUserExists(storedUser);
          if (userExists) {
            setUser(storedUser);
            setLoading(false);
            return;
          } else {
            console.log('User from localStorage no longer exists in database, clearing localStorage');
            removeUserFromStorage();
            // Продолжаем с обычной аутентификацией
          }
        }

        console.log('No stored user found, checking Telegram WebApp...');
        console.log('isTelegramWebApp() result:', isTelegramWebApp());
        
        // Если пользователя нет в localStorage, проверяем Telegram WebApp
        if (isTelegramWebApp()) {
          console.log('Running in Telegram WebApp');
           console.log('Telegram WebApp object:', typeof window !== 'undefined' && (window as any).Telegram?.WebApp);
          
          const initData = getTelegramInitData();
          console.log('getTelegramInitData() result:', initData);
          console.log('initData type:', typeof initData);
          console.log('initData length:', initData ? initData.length : 'null/undefined');
          
          if (initData) {
            console.log('Attempting to authenticate with Telegram...');
            await authenticateWithTelegram(initData);
          } else {
            console.log('No initData available, using fallback user');
            // Если не удалось получить данные Telegram, используем fallback пользователя
            await authenticateWithFallbackUser();
          }
        } else {
          console.log('Not running in Telegram WebApp, using fallback user');
          // Если не в Telegram WebApp, используем fallback пользователя
          await authenticateWithFallbackUser();
        }
      } catch (err) {
        console.error('Ошибка инициализации авторизации:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : 'No stack trace'
        });
        setError('Ошибка авторизации');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const authenticateWithTelegram = async (initData: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка авторизации');
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        saveUserToStorage(data.user);
      } else {
        throw new Error('Неверный ответ сервера');
      }
    } catch (err) {
      console.error('Ошибка авторизации через Telegram:', err);
      setError(err instanceof Error ? err.message : 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  const authenticateWithFallbackUser = async () => {
    try {
      const isInTelegram = isTelegramWebApp();
      
      const fallbackUser: AuthenticatedUser = {
        id: 0, // Временный ID для нового пользователя
        telegram_id: 87654321,
        first_name: 'New',
        last_name: 'User',
        username: 'newuser'
      };

      // Если вход НЕ из Telegram (т.е. из браузера), добавляем display_name
      // чтобы обойти проверку регистрации
      if (!isInTelegram) {
        fallbackUser.display_name = 'Browser User';
      }
      // Если вход из Telegram, display_name намеренно не указываем, 
      // чтобы пользователь попал на регистрацию

      setUser(fallbackUser);
      saveUserToStorage(fallbackUser);
    } catch (err) {
      console.error('Ошибка создания fallback пользователя:', err);
      setError('Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Выходим из cookie-сессии, если она есть
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    removeUserFromStorage();
  };

  return {
    user,
    loading,
    error,
    logout,
    isAuthenticated: !!user,
  };
}
