import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getUserByTelegramId, createUser, updateUser } from '@/lib/db';
import { AuthenticatedUser } from '@/lib/auth-server';
import { addLog } from '@/lib/logging';
import { validate, validate3rd } from '@tma.js/init-data-node';

// Диагностические функции для отладки Telegram подписи
function hmac(hexKey: Buffer, s: string) {
  return crypto.createHmac('sha256', hexKey).update(s).digest('hex');
}

// Функция для извлечения bot_id из токена бота
function getBotIdFromToken(botToken: string): number {
  const botId = botToken.split(':')[0];
  return parseInt(botId, 10);
}

function buildDataCheck(params: URLSearchParams, includeQueryId: boolean) {
  const p = new URLSearchParams(params.toString()); // копия
  p.delete('hash');
  p.delete('signature');
  if (!includeQueryId) p.delete('query_id');

  // ВАЖНО: никаких лишних \n в конце, сортируем строго по ключу
  const entries = Array.from(p.entries()).sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${k}=${v}`).join('\n');
}

function debugTelegramSignature(initDataRaw: string, botTokenRaw: string, expected: string) {
  const initData = typeof initDataRaw === 'string' ? initDataRaw : String(initDataRaw);
  const botToken = botTokenRaw.trim();

  addLog('info', '🔍 ДИАГНОСТИКА Telegram подписи', {
    expected: expected,
    botTokenLength: botToken.length,
    initDataLength: initData.length
  });

  const params = new URLSearchParams(initData);
  const hasSignature = params.has('signature');
  const hasHash = params.has('hash');
  
  addLog('info', '🔍 Режим проверки в debug', { 
    hasSignature, 
    hasHash,
    mode: hasSignature ? 'validate3rd (новый)' : 'validate (старый)'
  });

  let validationResult = false;
  let errorMessage = '';

  try {
    if (hasSignature) {
      // Новый режим: используем validate3rd с bot_id
      const botId = getBotIdFromToken(botToken);
      validate3rd(initData, botId);
      validationResult = true;
      addLog('info', '✅ DEBUG: validate3rd успешно', { botId });
    } else {
      // Старый режим: используем validate с bot token
      validate(initData, botToken);
      validationResult = true;
      addLog('info', '✅ DEBUG: validate успешно');
    }
  } catch (error) {
    validationResult = false;
    errorMessage = error instanceof Error ? error.message : String(error);
    addLog('info', '❌ DEBUG: Ошибка проверки', { error: errorMessage });
  }

  addLog('info', '🔍 РЕЗУЛЬТАТ диагностики', {
    validationResult,
    errorMessage,
    hasSignature,
    hasHash,
    expected
  });

  console.log('— Telegram auth debug (официальная библиотека) —');
  console.log('expected hash:', expected);
  console.log('validation result:', validationResult ? '✅ VALID' : '❌ INVALID');
  if (errorMessage) {
    console.log('error:', errorMessage);
  }
}

// Функция для проверки подписи Telegram initData
function verifyTelegramWebAppData(initData: string, botToken: string): any {
  // Логируем исходные данные
  addLog('info', '🧾 RAW initData FULL STRING', { initData: initData });
  
  const params = new URLSearchParams(initData);
  addLog('info', '🔑 ALL KEYS from initData', { keys: Array.from(params.keys()) });
  
  // Проверяем наличие signature для определения режима проверки
  const hasSignature = params.has('signature');
  const hasHash = params.has('hash');
  
  addLog('info', '🔍 Режим проверки подписи', { 
    hasSignature, 
    hasHash,
    mode: hasSignature ? 'validate3rd (новый)' : 'validate (старый)'
  });
  
  try {
    if (hasSignature) {
      // Новый режим: используем validate3rd с bot_id
      const botId = getBotIdFromToken(botToken);
      addLog('info', '🤖 Используем validate3rd', { botId });
      
      // validate3rd проверяет подпись и не возвращает данные
      validate3rd(initData, botId);
      
      addLog('info', '✅ validate3rd успешно');
    } else {
      // Старый режим: используем validate с bot token
      addLog('info', '🔑 Используем validate (старый режим)');
      
      // validate проверяет подпись и не возвращает данные
      validate(initData, botToken);
      
      addLog('info', '✅ validate успешно');
    }
  } catch (error) {
    addLog('error', 'Ошибка проверки подписи Telegram', {
      error: error instanceof Error ? error.message : String(error),
      hasSignature,
      hasHash,
      initDataLength: initData.length
    });
    
    throw new Error('Invalid signature');
  }
  
  // После успешной проверки парсим данные пользователя
  const userParam = params.get('user');
  if (!userParam) {
    throw new Error('User data not found');
  }

  let userData;
  try {
    userData = JSON.parse(userParam);
  } catch (parseError) {
    // Попробуем с декодированием
    try {
      userData = JSON.parse(decodeURIComponent(userParam));
    } catch (secondParseError) {
      throw new Error('Failed to parse user data');
    }
  }

  return userData;
}

export async function POST(request: NextRequest) {
  try {
    // 💡 Дополнительная информация
    const requestIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const timestamp = new Date().toISOString();
    
    console.log('💡 Дополнительная информация:');
    console.log('Request IP:', requestIP);
    console.log('User agent:', userAgent);
    console.log('Timestamp:', timestamp);
    
    const body = await request.json();
    const { initData } = body;

    // Логируем начало аутентификации
    addLog('info', 'Начало аутентификации Telegram', {
      hasInitData: !!initData,
      initDataType: typeof initData,
      initDataLength: initData ? initData.length : 0,
      hasBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
      userAgent,
      ip: requestIP,
      timestamp
    });
    
    if (!initData) {
      console.log('Auth failed: initData отсутствует');
      addLog('error', 'Ошибка аутентификации: initData отсутствует', {
        requestBody: body,
        ip: requestIP,
        userAgent,
        timestamp
      });
      return NextResponse.json(
        { error: 'initData is required' },
        { status: 400 }
      );
    }
    
    // Получаем токен бота из переменных окружения
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!botToken) {
      console.log('Auth failed: TELEGRAM_BOT_TOKEN не установлен');
      return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
    }
    
    console.log('Token ends with:', JSON.stringify(botToken.slice(-3)));
    
    // Валидация формата токена Telegram (должен быть вида: 123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)
    if (!/^\d+:[\w-]{35}$/.test(botToken)) {
      addLog('error', 'Некорректный формат TELEGRAM_BOT_TOKEN', { 
        tokenLength: botToken.length,
        tokenFormat: botToken.replace(/:.+/, ':***') 
      });
      return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
    }
    
    // 🔍 ДИАГНОСТИКА: проверяем все возможные комбинации
    const allParams = new URLSearchParams(initData);
    const expectedHash = allParams.get('hash') || '';
    console.log('🔍 Запуск диагностики Telegram подписи...');
    debugTelegramSignature(initData, botToken, expectedHash);
    
    // Проверяем подпись Telegram
    let userData;
    try {
      addLog('info', '🔐 Вызываем verifyTelegramWebAppData', { initDataLength: initData.length });
      userData = verifyTelegramWebAppData(initData, botToken);
      // Логируем userData без персональных данных (photo_url)
      const { photo_url, ...safeUserData } = userData;
      addLog('info', '✅ verifyTelegramWebAppData успешно выполнена', { userData: safeUserData });
    } catch (error) {
      console.log('Auth failed:', error instanceof Error ? error.message : 'Unknown error');
      return NextResponse.json({ error: 'Неверная подпись Telegram' }, { status: 401 });
    }
    
    // Проверяем, существует ли пользователь
    let user = await getUserByTelegramId(userData.id);
    
    if (user) {
      // Обновляем только базовые данные Telegram, если они изменились
      // НЕ затрагиваем display_name и другие пользовательские настройки
      const needsUpdate = 
        user.first_name !== userData.first_name ||
        user.last_name !== userData.last_name ||
        user.username !== userData.username;
      
      if (needsUpdate) {
        const updatedUser = await updateUser(userData.id, {
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username
          // display_name намеренно НЕ обновляем
        });
        user = updatedUser;
      }
    } else {
      // Создаем нового пользователя
      user = await createUser({
        telegram_id: userData.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        username: userData.username
        // display_name будет null для новых пользователей
      });
    }
    
    console.log('Auth success for user:', user.telegram_id);
    
    addLog('info', 'Успешная аутентификация Telegram', {
      userId: user.id,
      telegramId: user.telegram_id,
      username: user.username,
      ip: requestIP,
      userAgent,
      timestamp
    });
    
    // Возвращаем данные пользователя
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        display_name: user.display_name,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
    
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    
    addLog('error', 'Ошибка аутентификации Telegram', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Метод не поддерживается' }, { status: 405 });
}