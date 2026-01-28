import { NextRequest, NextResponse } from 'next/server';
import * as userRepo from '@/repositories/user.repository';
import * as shiftRepo from '@/repositories/shift.repository';
import { requireAdmin } from '@/lib/auth-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Только админы могут выполнять административные действия
    await requireAdmin(request);
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
        result = await userRepo.blockUser(userId);
        break;
      case 'unblock':
        result = await userRepo.unblockUser(userId);
        break;
      case 'set_role': {
        const role = body.role as 'admin' | 'demo' | 'master';
        if (!role || !['admin', 'demo', 'master'].includes(role)) {
          return NextResponse.json({ error: 'Некорректная роль' }, { status: 400 });
        }
        result = await userRepo.setUserRole(userId, role);
        break;
      }
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
    await requireAdmin(request);
    const { id: idParam } = await params;
    const userId = parseInt(idParam);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Неверный ID пользователя' }, { status: 400 });
    }

    await userRepo.deleteUser(userId);

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
    await requireAdmin(request);
    const { id: idParam } = await params;
    const userId = parseInt(idParam);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Неверный ID пользователя' }, { status: 400 });
    }

    const shifts = await shiftRepo.getShifts(userId);

    return NextResponse.json({
      success: true,
      shifts: shifts
    });
  } catch (error) {
    console.error('Ошибка при получении смен пользователя:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}