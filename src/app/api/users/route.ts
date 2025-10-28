import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/db';

export async function GET() {
  try {
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