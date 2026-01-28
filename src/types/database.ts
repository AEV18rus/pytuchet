// Типы для базы данных

export interface User {
    id?: number;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    display_name?: string;
    // Роль пользователя: admin, demo, master
    role?: 'admin' | 'demo' | 'master';
    // Поля для браузерной авторизации
    browser_login?: string;
    password_hash?: string;
    password_set_at?: string;
    last_login_at?: string;
    is_blocked?: boolean;
    blocked_at?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Shift {
    id?: number;
    user_id: number;
    date: string;
    hours: number;
    steam_bath: number;
    brand_steam: number;
    intro_steam: number;
    scrubbing: number;
    zaparnik: number;
    masters: number;
    total: number;
    // Цены на момент создания смены
    hourly_rate: number;
    steam_bath_price: number;
    brand_steam_price: number;
    intro_steam_price: number;
    scrubbing_price: number;
    zaparnik_price: number;
    // Новые поля для динамических услуг
    services?: string; // JSON строка с услугами
    service_prices?: string; // JSON строка с ценами услуг
    created_at?: string;
}

export interface Price {
    id?: number;
    name: string;
    price: number;
    updated_at?: string;
}

export interface Payout {
    id?: number;
    user_id: number;
    month: string; // Формат: YYYY-MM
    amount: number;
    date: string; // Дата выплаты
    comment?: string;
    initiated_by?: number | null;
    initiator_role?: 'admin' | 'master' | 'system' | null;
    method?: string | null;
    source?: string | null;
    reversed_at?: string | null;
    reversed_by?: number | null;
    reversal_reason?: string | null;
    is_advance?: boolean; // Помечает выплату как аванс (месяц не закрыт)
    created_at?: string;
}

export interface Carryover {
    id?: number;
    user_id: number;
    from_month: string; // Формат: YYYY-MM
    to_month: string; // Формат: YYYY-MM
    amount: number;
    created_at?: string;
}
