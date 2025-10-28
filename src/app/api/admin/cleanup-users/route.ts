import { NextRequest, NextResponse } from 'next/server';
import { cleanupUsersExceptTest } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await cleanupUsersExceptTest();
    
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