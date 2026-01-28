import { NextRequest, NextResponse } from 'next/server';
import * as userRepo from '@/repositories/user.repository';

export async function POST(request: NextRequest) {
  try {
    await userRepo.cleanupUsersExceptTest();

    return NextResponse.json({
      success: true,
      message: 'Все пользователи кроме User Test удалены успешно'
    });
  } catch (error) {
    console.error('Ошибка при очистке пользователей:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при очистке пользователей'
    }, { status: 500 });
  }
}