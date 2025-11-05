import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-server';
import { getUserById } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не авторизован' },
        { status: 401 }
      );
    }

    // Дополнительно получаем расширенные поля профиля из БД
    const full = await getUserById(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        display_name: user.display_name,
        created_at: user.created_at,
        updated_at: user.updated_at,
        // Новые поля для UI личного кабинета
        browser_login: full?.browser_login || null,
        password_set_at: full?.password_set_at || null,
        last_login_at: full?.last_login_at || null
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}