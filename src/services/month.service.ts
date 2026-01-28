// ============================================================================
// Month Service - Управление жизненным циклом месяцев
// ============================================================================

import { executeQuery } from '@/lib/db-client';
import * as monthRepo from '@/repositories/month.repository';
import { payoutService } from './payout.service';

export class MonthService {
    /**
     * Проверяет, закончился ли месяц (по календарю или вручную закрыт)
     */
    async isMonthClosed(month: string): Promise<boolean> {
        try {
            // Проверяем статус вручную закрытого месяца
            const manualStatus = await monthRepo.getMonthStatus(month);
            if (manualStatus) {
                return true;
            }

            // Проверяем по календарю: месяц закончился?
            const [year, monthNum] = month.split('-').map(Number);
            const lastDayOfMonth = new Date(year, monthNum, 0);
            const today = new Date();

            today.setHours(0, 0, 0, 0);
            lastDayOfMonth.setHours(23, 59, 59, 999);

            return today > lastDayOfMonth;
        } catch (error) {
            console.error('Ошибка при проверке закрытия месяца:', error);
            throw error;
        }
    }

    /**
     * Автоматически закрывает месяцы, которые уже завершились по календарю
     * Обрабатывает авансы, превращая их в переносы
     */
    async autoCloseFinishedMonths(): Promise<void> {
        try {
            // Получаем все месяцы со сменами
            const result = await executeQuery(
                `SELECT DISTINCT TO_CHAR(TO_DATE(date, 'YYYY-MM-DD'), 'YYYY-MM') as month, user_id
         FROM shifts
         ORDER BY month ASC`
            );

            const monthsToCheck = result.rows as { month: string; user_id: number }[];

            for (const { month, user_id } of monthsToCheck) {
                // Проверяем, закончился ли месяц по календарю
                const [year, monthNum] = month.split('-').map(Number);
                const lastDayOfMonth = new Date(year, monthNum, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                lastDayOfMonth.setHours(23, 59, 59, 999);

                if (today > lastDayOfMonth) {
                    // Месяц закончился, проверяем не закрыт ли он уже
                    const isClosed = await monthRepo.getMonthStatus(month);

                    if (!isClosed) {
                        console.log(`Автоматическое закрытие месяца ${month} для пользователя ${user_id}`);

                        // Обрабатываем авансы перед закрытием
                        await this.processMonthClosure(user_id, month);

                        // Закрываем месяц
                        await monthRepo.setMonthClosed(month, true);
                    }
                }
            }
        } catch (error) {
            console.error('Ошибка при автоматическом закрытии месяцев:', error);
            throw error;
        }
    }

    /**
     * Обрабатывает авансы при закрытии месяца
     * Превращает авансы в переносы на следующий месяц
     */
    async processMonthClosure(userId: number, month: string): Promise<void> {
        try {
            const earnings = await monthRepo.getEarningsForMonth(userId, month);
            const totalPayouts = await this._getPayoutsForMonth(userId, month);

            // Проверяем, есть ли переплата
            if (totalPayouts <= earnings) {
                console.log(`Месяц ${month}: переплаты нет (${totalPayouts} ₽ <= ${earnings} ₽)`);
                return;
            }

            const overpayment = totalPayouts - earnings;
            console.log(`Месяц ${month}: переплата ${overpayment} ₽, создаём перенос на следующий месяц`);

            // Вычисляем следующий месяц
            const [year, monthNumber] = month.split('-').map(Number);
            const nextDate = new Date(year, monthNumber, 1);
            const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

            // Создаем комментарий для переноса
            const monthNames = [
                'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
            ];
            const fromMonthName = monthNames[monthNumber - 1];
            const comment = `Перенос с ${fromMonthName} ${year}`;

            // Получаем последнюю дату месяца для даты переноса
            const lastDay = new Date(year, monthNumber, 0);
            const payoutDate = `${year}-${String(monthNumber).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

            // Создаём выплату-перенос в следующем месяце через PayoutService
            await payoutService.createPayoutWithCorrection({
                user_id: userId,
                month: nextMonth,
                amount: overpayment,
                date: payoutDate,
                comment: comment,
                initiated_by: null,
                initiator_role: 'system',
                method: 'carryover',
                source: 'carryover'
            });

            // Помечаем все авансы текущего месяца как закрытые (снимаем флаг is_advance)
            await executeQuery(
                `UPDATE payouts SET is_advance = FALSE 
         WHERE user_id = $1 AND month = $2 AND is_advance = TRUE`,
                [userId, month]
            );
        } catch (error) {
            console.error('Ошибка при обработке закрытия месяца:', error);
            throw error;
        }
    }

    /**
     * Получить статус месяца (для совместимости)
     */
    async getMonthStatus(month: string): Promise<boolean> {
        return monthRepo.getMonthStatus(month);
    }

    /**
     * Установить статус месяца
     */
    async setMonthClosed(month: string, closed: boolean): Promise<void> {
        await monthRepo.setMonthClosed(month, closed);
    }

    // =========================================================================
    // Private Helpers
    // =========================================================================

    private async _getPayoutsForMonth(userId: number, month: string): Promise<number> {
        const result = await executeQuery(
            `SELECT COALESCE(SUM(amount), 0) as total 
       FROM payouts 
       WHERE user_id = $1 AND month = $2 AND reversed_at IS NULL`,
            [userId, month]
        );
        return parseFloat(result.rows[0]?.total || '0');
    }
}

export const monthService = new MonthService();
