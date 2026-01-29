import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, requireAuth } from '@/lib/auth-server';
import * as userRepo from '@/repositories/user.repository';

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
    const full = await userRepo.getUserById(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        display_name: user.display_name,
        role: user.role, // Добавляем роль для синхронизации на клиенте
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

// Обновление профиля текущего пользователя (сейчас поддерживается только display_name)
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const body = await request.json();
    const { display_name } = body;

    if (display_name === undefined) {
      return NextResponse.json(
        { error: 'Не передано поле display_name' },
        { status: 400 }
      );
    }

    if (typeof display_name !== 'string') {
      return NextResponse.json(
        { error: 'display_name должен быть строкой' },
        { status: 400 }
      );
    }

    const trimmed = display_name.trim();
    if (trimmed.length < 2) {
      return NextResponse.json(
        { error: 'Имя должно содержать минимум 2 символа' },
        { status: 400 }
      );
    }
    if (trimmed.length > 50) {
      return NextResponse.json(
        { error: 'Имя не должно превышать 50 символов' },
        { status: 400 }
      );
    }

    // Обновляем пользователя по его telegram_id (updateUser ожидает telegramId)
    const updated = await userRepo.updateUser(user.telegram_id, { display_name: trimmed });

    return NextResponse.json({
      success: true,
      user: updated,
      message: 'Имя успешно обновлено'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}