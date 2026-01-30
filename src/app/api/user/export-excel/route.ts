import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db-client';
import { reportService } from '@/services/report.service';
import { requireAuth } from '@/lib/auth-server';
import * as XLSX from 'xlsx';
import { ensureDatabaseInitialized } from '@/lib/global-init';

// Функция для отправки документа через Telegram API
async function sendTelegramDocument(chatId: number, buffer: Buffer, filename: string, caption?: string) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        throw new Error('TELEGRAM_BOT_TOKEN not found');
    }

    const formData = new FormData();

    // Создаем Blob из буфера (преобразуем Buffer в Uint8Array для совместимости типов)
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    formData.append('chat_id', chatId.toString());
    formData.append('document', blob, filename);
    if (caption) {
        formData.append('caption', caption);
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Telegram API Error:', errorText);
        throw new Error(`Failed to send document: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

export async function POST(request: NextRequest) {
    try {
        await ensureDatabaseInitialized();
        const user = await requireAuth(request);

        if (!user.telegram_id) {
            return NextResponse.json(
                { error: 'Для отправки отчета необходим Telegram ID' },
                { status: 400 }
            );
        }

        // 1. Сбор данных
        const payoutsData = await reportService.getPayoutsDataWithGlobalBalance(user.id);

        // Получаем смены (нужен отдельный запрос для сырых данных)
        const shiftsResult = await executeQuery(
            `SELECT * FROM shifts WHERE user_id = $1 ORDER BY date DESC, id DESC`,
            [user.id]
        );
        const shifts = shiftsResult.rows;

        // 2. Формирование Excel
        const wb = XLSX.utils.book_new();

        // --- Лист 1: Сводка ---
        const summaryData = [
            ['Отчет по балансу', user.display_name || user.first_name],
            ['Дата формирования', new Date().toLocaleDateString('ru-RU')],
            ['', ''],
            ['Показатель', 'Сумма (₽)'],
            ['Всего заработано', payoutsData.totalEarnings],
            ['Всего выплачено', payoutsData.totalPayouts],
            ['Текущий баланс', payoutsData.globalBalance],
            ['', ''],
            ['Статус', payoutsData.globalBalance >= 0 ? 'Заведение должно вам' : 'У вас аванс']
        ];

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

        // Настройка ширины колонок
        wsSummary['!cols'] = [{ wch: 20 }, { wch: 15 }];

        XLSX.utils.book_append_sheet(wb, wsSummary, 'Сводка');

        // --- Лист 2: Смены ---
        const shiftsHeader = [
            'ID', 'Дата', 'Часы', 'Мастера',
            'Путевое', 'Фирменное', 'Ознаком.', 'Скраб', 'Запарник',
            'Итого (₽)'
        ];

        const shiftsRows = shifts.map((s: any) => [
            s.id,
            new Date(s.date).toLocaleDateString('ru-RU'),
            s.hours,
            s.masters,
            s.steam_bath,
            s.brand_steam,
            s.intro_steam,
            s.scrubbing,
            s.zaparnik,
            s.total
        ]);

        const wsShifts = XLSX.utils.aoa_to_sheet([shiftsHeader, ...shiftsRows]);
        wsShifts['!cols'] = [
            { wch: 5 }, { wch: 12 }, { wch: 6 }, { wch: 8 },
            { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 6 }, { wch: 8 },
            { wch: 12 }
        ];
        XLSX.utils.book_append_sheet(wb, wsShifts, 'История смен');

        // --- Лист 3: Выплаты ---
        const payoutsHeader = ['ID', 'Дата', 'Сумма (₽)', 'Комментарий', 'Тип'];

        const payoutsRows = payoutsData.allPayouts.map((p: any) => [
            p.id,
            new Date(p.date).toLocaleDateString('ru-RU'),
            p.amount,
            p.comment || '',
            p.is_advance ? 'Аванс' : (p.reversed_at ? 'Отменена' : 'Выплата')
        ]);

        const wsPayouts = XLSX.utils.aoa_to_sheet([payoutsHeader, ...payoutsRows]);
        wsPayouts['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsPayouts, 'История выплат');

        // 3. Генерация буфера
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // 4. Отправка в Telegram
        const filename = `Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        const caption = `📊 Ваш отчет готов!\n\n👤 Пользователь: ${user.display_name || user.first_name}\n💰 Текущий баланс: ${payoutsData.globalBalance.toLocaleString()} ₽`;

        await sendTelegramDocument(user.telegram_id, buf, filename, caption);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Export Error:', error);
        return NextResponse.json(
            { error: 'Ошибка при формировании отчета' },
            { status: 500 }
        );
    }
}
