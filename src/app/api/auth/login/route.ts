import { NextRequest, NextResponse } from 'next/server';
import * as userRepo from '@/repositories/user.repository';
import { verifyPassword } from '@/lib/password';
import { signToken } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { addLog } from '@/lib/logging';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(`login:ip:${ip}`, {
      windowMs: 60_000,
      max: 5,
      blockDurationMs: 5 * 60_000,
    });
    if (!ipLimit.allowed) {
      addLog('warn', 'Login rate limit exceeded (IP)', { ip });
      const retrySec = Math.ceil((ipLimit.retryAfterMs ?? 0) / 1000);
      const res = NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
      if (retrySec > 0) res.headers.set('Retry-After', String(retrySec));
      return res;
    }
    const { username, password } = await request.json();
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json({ error: 'Неверный логин' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 400 });
    }

    const login = username.trim();
    const user = await userRepo.getUserByBrowserLogin(login);
    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'Неверные учетные данные' }, { status: 401 });
    }
    const userLimit = checkRateLimit(`login:user:${login}`, {
      windowMs: 60_000,
      max: 5,
      blockDurationMs: 5 * 60_000,
    });
    if (!userLimit.allowed) {
      addLog('warn', 'Login rate limit exceeded (user)', { username: login });
      const retrySec = Math.ceil((userLimit.retryAfterMs ?? 0) / 1000);
      const res = NextResponse.json({ error: 'Слишком много попыток для этого логина. Попробуйте позже.' }, { status: 429 });
      if (retrySec > 0) res.headers.set('Retry-After', String(retrySec));
      return res;
    }
    const ok = verifyPassword(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Неверные учетные данные' }, { status: 401 });
    }

    // Обновляем дату последнего входа
    await userRepo.updateUser(user.telegram_id, { last_login_at: new Date().toISOString() });

    const token = signToken({ user_id: user.id!, telegram_id: user.telegram_id });

    const response = NextResponse.json({ success: true, user: { id: user.id, display_name: user.display_name, username: user.username, telegram_id: user.telegram_id } });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    const isDev = process.env.NODE_ENV !== 'production';
    const msg = isDev ? ((error as any)?.message || 'Внутренняя ошибка сервера') : 'Внутренняя ошибка сервера';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}