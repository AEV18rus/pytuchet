import { NextRequest, NextResponse } from 'next/server';
import * as userRepo from '@/repositories/user.repository';

export async function POST(request: NextRequest) {
  try {
    // Получаем telegram_id из заголовка
    const telegramId = request.headers.get('x-telegram-id');

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID не найден' },
        { status: 401 }
      );
    }

    const telegramIdNumber = parseInt(telegramId);
    if (isNaN(telegramIdNumber)) {
      return NextResponse.json(
        { error: 'Неверный Telegram ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { display_name } = body;

    // Валидация данных
    if (!display_name || typeof display_name !== 'string') {
      return NextResponse.json(
        { error: 'Имя обязательно для заполнения' },
        { status: 400 }
      );
    }

    const trimmedDisplayName = display_name.trim();
    if (trimmedDisplayName.length < 2) {
      return NextResponse.json(
        { error: 'Имя должно содержать минимум 2 символа' },
        { status: 400 }
      );
    }

    if (trimmedDisplayName.length > 50) {
      return NextResponse.json(
        { error: 'Имя не должно превышать 50 символов' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь
    let existingUser = await userRepo.getUserByTelegramId(telegramIdNumber);

    if (existingUser && existingUser.display_name) {
      return NextResponse.json(
        { error: 'Пользователь уже зарегистрирован' },
        { status: 400 }
      );
    }

    let updatedUser;

    if (existingUser) {
      // Обновляем существующего пользователя с display_name
      updatedUser = await userRepo.updateUser(telegramIdNumber, {
        display_name: trimmedDisplayName
      });
    } else {
      // Создаем нового пользователя (для fallback пользователей)
      updatedUser = await userRepo.createUser({
        telegram_id: telegramIdNumber,
        first_name: 'New',
        last_name: 'User',
        username: 'newuser',
        display_name: trimmedDisplayName
      });
    }

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Ошибка при обновлении данных пользователя' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Регистрация завершена успешно',
      user: updatedUser
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}