export interface AuthenticatedUser {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  display_name?: string;
  role?: 'admin' | 'demo' | 'master';
}

// Функция для получения заголовков авторизации (для клиентской части)
export function getAuthHeaders(): Record<string, string> {
  const user = getUserFromStorage();
  
  if (!user) {
    // Если пользователь не найден и мы не в Telegram, используем fallback пользователя
    if (!isTelegramWebApp()) {
      return {
        'x-telegram-id': '87654321', // Fallback telegram_id для тестового пользователя
      };
    }
    return {};
  }
  
  return {
    'x-telegram-id': user.telegram_id.toString(),
  };
}



// Функция для получения пользователя из localStorage (для клиентской части)
export function getUserFromStorage(): AuthenticatedUser | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const userData = localStorage.getItem('telegram_user');
    if (!userData) {
      return null;
    }
    
    return JSON.parse(userData);
  } catch (error) {
    console.error('Ошибка получения пользователя из localStorage:', error);
    return null;
  }
}

// Функция для сохранения пользователя в localStorage
export function saveUserToStorage(user: AuthenticatedUser): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.setItem('telegram_user', JSON.stringify(user));
}

// Функция для удаления пользователя из localStorage
export function removeUserFromStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem('telegram_user');
}

// Функция для проверки, запущено ли приложение в Telegram
export function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const webApp = (window as any).Telegram?.WebApp;
  
  // Проверяем не только наличие объекта, но и что он инициализирован Telegram
  // В браузере объект может существовать, но не быть инициализированным
  return !!(webApp && webApp.initData && webApp.platform !== 'unknown');
}

// Функция для получения initData из Telegram WebApp
export function getTelegramInitData(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const webApp = (window as any).Telegram?.WebApp;
  return webApp?.initData || null;
}