import { NextRequest } from 'next/server';
import { getUserByTelegramId, getUserById } from '@/repositories/user.repository';
import { verifyToken } from './session';

export interface AuthenticatedUser {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  display_name?: string;
  role?: 'admin' | 'demo' | 'master';
  created_at?: string;
  updated_at?: string;
}

// Функция для получения пользователя из заголовков запроса (только для серверной части)
export async function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // 1) Проверяем cookie-сессию
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(kv => {
      const idx = kv.indexOf('=');
      if (idx === -1) return [kv.trim(), ''];
      const key = kv.slice(0, idx).trim();
      const val = kv.slice(idx + 1).trim();
      return [key, decodeURIComponent(val)];
    }));
    const token = cookies['auth_token'];
    if (token) {
      const payload = verifyToken(token);
      if (payload && payload.user_id) {
        const byId = await getUserById(payload.user_id);
        if (byId) {
          return {
            id: byId.id!,
            telegram_id: byId.telegram_id,
            first_name: byId.first_name,
            last_name: byId.last_name,
            username: byId.username,
            display_name: byId.display_name,
            role: byId.role as any,
            created_at: byId.created_at,
            updated_at: byId.updated_at
          };
        }
      }
    }

    // 2) Fallback: Telegram заголовок
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
      role: user.role as any,
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

// Middleware для проверки роли администратора
export async function requireAdmin(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);
  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return user;
}

// Разрешить только мастеру выполнять мутации (шаблон для смен/выплат)
export async function requireMasterForMutation(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);

  if (user.role === 'demo') {
    throw new Error('Forbidden'); // Демо только просмотр
  }
  // Разрешены мастера и пользователи без явно заданной роли, трактуем как мастер
  return user;
}

// Универсальный запрет для ролей (можно использовать для любых мутаций)
export async function forbidRoles(request: NextRequest, roles: Array<'admin' | 'demo'>): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);
  if (roles.includes((user.role ?? 'master') as any)) {
    throw new Error('Forbidden');
  }
  return user;
}