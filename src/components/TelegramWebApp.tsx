'use client';

import { useEffect } from 'react';

export default function TelegramWebApp() {
  useEffect(() => {
    // Устанавливаем начальные значения для CSS переменных
    const setInitialViewportVars = () => {
      const html = document.documentElement;
      
      // Устанавливаем начальные значения если их нет
      if (!html.style.getPropertyValue('--tg-viewport-height')) {
        html.style.setProperty('--tg-viewport-height', `${window.innerHeight}px`);
      }
      if (!html.style.getPropertyValue('--tg-viewport-stable-height')) {
        html.style.setProperty('--tg-viewport-stable-height', `${window.innerHeight}px`);
      }
    };

    // Устанавливаем начальные значения сразу
    setInitialViewportVars();

    // Инициализируем Telegram Web App если доступен
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      
      // Готовим приложение
      tg.ready();
      if (tg.expand) {
        tg.expand();
      }

      // Обновляем CSS переменные с реальными значениями
      const updateViewportVars = () => {
        const html = document.documentElement;
        if (tg.viewportHeight) {
          html.style.setProperty('--tg-viewport-height', `${tg.viewportHeight}px`);
        }
        if (tg.viewportStableHeight) {
          html.style.setProperty('--tg-viewport-stable-height', `${tg.viewportStableHeight}px`);
        }
      };

      // Обновляем значения
      updateViewportVars();

      // Слушаем изменения размера окна
      const handleResize = () => {
        updateViewportVars();
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  return null;
}