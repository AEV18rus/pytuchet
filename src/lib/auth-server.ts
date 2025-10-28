import { NextRequest } from 'next/server';
import { getUserByTelegramId } from './db';

export interface AuthenticatedUser {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  display_name?: string;
  created_at?: string;
  updated_at?: string;
}

// Функция для получения пользователя из заголовков запроса (только для серверной части)
export async function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Получаем telegram_id из заголовка
    const telegramId = request.headers.get('x-telegram-id');
    
    if (!telegramId) {
      return null;
    }
    
    const user = await getUserByTelegramId(parseInt(telegramId));
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id!,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      display_name: user.display_name,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    return null;
  }
}

// Middleware для проверки авторизации (только для серверной части)
export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}