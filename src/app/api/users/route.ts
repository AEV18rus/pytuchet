import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    // Список пользователей доступен только администратору
    await requireAdmin(request);
    const users = await getAllUsers();
    return NextResponse.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Ошибка при получении пользователей:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}