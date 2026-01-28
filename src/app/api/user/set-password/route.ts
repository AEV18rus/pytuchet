import { NextRequest, NextResponse } from 'next/server';
import * as userRepo from '@/repositories/user.repository';
import { hashPassword, verifyPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const telegramId = request.headers.get('x-telegram-id');
    if (!telegramId) {
      return NextResponse.json({ error: 'Требуется авторизация через Telegram' }, { status: 401 });
    }

    const telegramIdNumber = parseInt(telegramId, 10);
    if (isNaN(telegramIdNumber)) {
      return NextResponse.json({ error: 'Неверный Telegram ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Неверное тело запроса' }, { status: 400 });
    }

    const { username, password, currentPassword } = body as { username?: string; password?: string; currentPassword?: string };

    // Валидация логина
    const login = (username || '').trim();
    if (!login || login.length < 3) {
      return NextResponse.json({ error: 'Логин должен содержать минимум 3 символа' }, { status: 400 });
    }
    if (login.length > 64) {
      return NextResponse.json({ error: 'Логин слишком длинный' }, { status: 400 });
    }

    // Валидация пароля
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Пароль должен содержать минимум 8 символов' }, { status: 400 });
    }

    // Проверяем пользователя
    const user = await userRepo.getUserByTelegramId(telegramIdNumber);
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Проверяем уникальность логина (если логин принадлежит другому пользователю)
    const existingByLogin = await userRepo.getUserByBrowserLogin(login);
    if (existingByLogin && existingByLogin.id !== user.id) {
      return NextResponse.json({ error: 'Логин уже занят' }, { status: 409 });
    }

    // Если пароль уже установлен, требуется проверка текущего пароля
    if (user.password_hash) {
      if (!currentPassword || typeof currentPassword !== 'string') {
        return NextResponse.json({ error: 'Требуется текущий пароль' }, { status: 400 });
      }
      const ok = verifyPassword(currentPassword, user.password_hash);
      if (!ok) {
        return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 401 });
      }
    }

    // Хешируем пароль
    const passwordHash = hashPassword(password);
    const nowIso = new Date().toISOString();

    // Обновляем пользователя
    const updated = await userRepo.updateUser(telegramIdNumber, {
      browser_login: login,
      password_hash: passwordHash,
      password_set_at: nowIso,
    });

    return NextResponse.json({ success: true, message: 'Пароль сохранён', user: updated });
  } catch (error: any) {
    // Обработка уникального ограничения
    const message = (error && error.message) || 'Внутренняя ошибка сервера';
    if (message.includes('duplicate key') || message.includes('idx_users_browser_login')) {
      return NextResponse.json({ error: 'Логин уже занят' }, { status: 409 });
    }
    console.error('Set password error:', error);
    const isDev = process.env.NODE_ENV !== 'production';
    const msg = isDev ? (error?.message || 'Внутренняя ошибка сервера') : 'Внутренняя ошибка сервера';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}