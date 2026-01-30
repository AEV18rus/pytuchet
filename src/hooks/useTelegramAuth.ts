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

// Функция для получения актуальных данных пользователя из API
const getUserData = async (user: AuthenticatedUser): Promise<AuthenticatedUser | null> => {
  try {
    const response = await fetch('/api/user/profile', {
      method: 'GET',
      headers: {
        'x-telegram-id': user.telegram_id.toString(),
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.success && data.user) {
      return data.user as AuthenticatedUser;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
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

        // 1. Приоритет: Telegram WebApp (всегда актуальный пользователь)
        if (isTelegramWebApp()) {
          console.log('Running in Telegram WebApp');

          const initData = getTelegramInitData();
          if (initData) {
            console.log('Attempting to authenticate with Telegram...');
            await authenticateWithTelegram(initData);
            return; // Успешно начали процесс через Telegram, выходим
          }
        }

        // 2. Если не Telegram или нет initData -> проверяем Cookie/LocalStorage
        console.log('Not in Telegram or no initData. Checking storage...');

        // Проверяем cookie-сессию
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

        // Проверяем localStorage
        const storedUser = getUserFromStorage();
        if (storedUser) {
          console.log('Found stored user in localStorage:', storedUser);

          // Для fallback пользователей не проверяем базу
          if (storedUser.telegram_id === 87654321) {
            setUser(storedUser);
            setLoading(false);
            return;
          }

          // Обновляем данные из БД
          const freshUserData = await getUserData(storedUser);
          if (freshUserData) {
            setUser(freshUserData);
            saveUserToStorage(freshUserData);
            setLoading(false);
            return;
          } else {
            removeUserFromStorage();
          }
        }

        // 3. Если ничего не нашли -> Fallback
        console.log('No auth found, using fallback user');
        await authenticateWithFallbackUser();

      } catch (err) {
        console.error('Ошибка инициализации авторизации:', err);
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
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => { });
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