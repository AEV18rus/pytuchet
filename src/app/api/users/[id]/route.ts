import { NextRequest, NextResponse } from 'next/server';
import { blockUser, unblockUser, deleteUser, getShifts } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const userId = parseInt(idParam);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Неверный ID пользователя' }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body;

    let result;
    switch (action) {
      case 'block':
        result = await blockUser(userId);
        break;
      case 'unblock':
        result = await unblockUser(userId);
        break;
      default:
        return NextResponse.json({ error: 'Неверное действие' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: result
    });
  } catch (error) {
    console.error('Ошибка при управлении пользователем:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const userId = parseInt(idParam);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Неверный ID пользователя' }, { status: 400 });
    }

    await deleteUser(userId);

    return NextResponse.json({
      success: true,
      message: 'Пользователь успешно удален'
    });
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const userId = parseInt(idParam);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Неверный ID пользователя' }, { status: 400 });
    }

    const shifts = await getShifts(userId);

    return NextResponse.json({
      success: true,
      shifts: shifts
    });
  } catch (error) {
    console.error('Ошибка при получении смен пользователя:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}