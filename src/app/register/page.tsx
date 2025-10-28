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
          'x-telegram-id': user?.telegram_id.toString() || '',
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Если пользователь не авторизован или уже зарегистрирован, не показываем форму
  if (!user || user.display_name) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Добро пожаловать!</h1>
          <p className="text-gray-600">
            Для завершения регистрации укажите имя, под которым вас будет видеть администратор
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
              Ваше имя для отчетов
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Введите ваше имя"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
              maxLength={50}
            />
            <p className="mt-1 text-sm text-gray-500">
              Это имя будет отображаться в отчетах администратора
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !displayName.trim()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Регистрация...
              </div>
            ) : (
              'Завершить регистрацию'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Ваши данные Telegram: {user.first_name} {user.last_name && user.last_name}
            {user.username && ` (@${user.username})`}
          </p>
        </div>
      </div>
    </div>
  );
}