import * as shiftRepo from '@/repositories/shift.repository';
import * as payoutRepo from '@/repositories/payout.repository';
import * as monthRepo from '@/repositories/month.repository';

export class BalanceService {
    /**
     * Получить общую сумму заработка пользователя (сумма всех смен)
     */
    async getTotalEarnings(userId: number): Promise<number> {
        return shiftRepo.getTotalEarnings(userId);
    }

    /**
     * Получить общую сумму выплат пользователя (сумма всех выплат, без откатанных)
     */
    async getTotalPayouts(userId: number): Promise<number> {
        return payoutRepo.getTotalPayouts(userId);
    }

    /**
     * Получить глобальный баланс пользователя (заработок - выплаты)
     * Положительный баланс = должны мастеру
     * Отрицательный баланс = аванс (мастер получил больше, чем заработал)
     */
    async getUserBalance(userId: number): Promise<number> {
        const earnings = await this.getTotalEarnings(userId);
        const payouts = await this.getTotalPayouts(userId);
        return earnings - payouts;
    }

    /**
     * Получить накопленный заработок до конца указанного месяца (включительно)
     * Используется для определения статуса месяца по FIFO
     */
    async getCumulativeEarningsUpToMonth(userId: number, month: string): Promise<number> {
        // Получаем последний день месяца
        const [year, monthNum] = month.split('-').map(Number);
        const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
        const endDate = `${month}-${String(lastDayOfMonth).padStart(2, '0')}`;

        return shiftRepo.getCumulativeEarnings(userId, endDate);
    }

    /**
     * Получить заработок за конкретный месяц
     */
    async getMonthEarnings(userId: number, month: string): Promise<number> {
        return monthRepo.getEarningsForMonth(userId, month);
    }

    /**
     * Определить статус месяца по FIFO (закрыт/частично/не оплачен)
     * и сумму остатка по этому месяцу
     */
    async getMonthStatusByBalance(
        userId: number,
        month: string
    ): Promise<{ status: 'closed' | 'partial' | 'unpaid'; paidAmount: number; remainingAmount: number }> {
        try {
            // Накопленный заработок до конца этого месяца
            const cumulativeEarnings = await this.getCumulativeEarningsUpToMonth(userId, month);

            // Все выплаты пользователя
            const totalPayouts = await this.getTotalPayouts(userId);

            // Заработок именно за этот месяц
            const monthEarnings = await this.getMonthEarnings(userId, month);

            // Сколько заработано ДО этого месяца
            const previousEarnings = cumulativeEarnings - monthEarnings;

            // Сколько выплат "дошло" до этого месяца
            const payoutsAvailableForMonth = Math.max(0, totalPayouts - previousEarnings);

            // Сколько из этого месяца оплачено
            const paidAmount = Math.min(payoutsAvailableForMonth, monthEarnings);

            // Сколько осталось по этому месяцу
            const remainingAmount = Math.max(0, monthEarnings - paidAmount);

            let status: 'closed' | 'partial' | 'unpaid';

            if (paidAmount >= monthEarnings && monthEarnings > 0) {
                status = 'closed';
            } else if (paidAmount > 0) {
                status = 'partial';
            } else {
                status = 'unpaid';
            }

            return { status, paidAmount, remainingAmount };
        } catch (error) {
            console.error('Ошибка при определении статуса месяца:', error);
            throw error;
        }
    }
}

export const balanceService = new BalanceService();
