import { NextResponse } from 'next/server';
import * as userRepo from '@/repositories/user.repository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegram_id, first_name, last_name, username } = body;

    // Проверяем обязательные поля
    if (!telegram_id || !first_name) {
      return NextResponse.json(
        { error: 'telegram_id и first_name обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли уже пользователь с таким telegram_id
    const existingUser = await userRepo.getUserByTelegramId(telegram_id);
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'Пользователь уже существует',
        user: existingUser
      });
    }

    // Создаем тестового пользователя
    const testUser = await userRepo.createUser({
      telegram_id,
      first_name,
      last_name,
      username
    });

    return NextResponse.json({
      success: true,
      message: 'Тестовый пользователь создан успешно',
      user: testUser
    });

  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании тестового пользователя' },
      { status: 500 }
    );
  }
}