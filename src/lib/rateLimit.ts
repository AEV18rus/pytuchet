import type { NextRequest } from 'next/server';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  blockDurationMs?: number;
}

type RateRecord = {
  hits: number;
  resetAt: number;
  blockedUntil?: number;
};

// Глобальное хранилище лимитов в памяти (для dev)
declare global {
  // eslint-disable-next-line no-var
  var __rate_limit_store: Map<string, RateRecord> | undefined;
}

const store: Map<string, RateRecord> = global.__rate_limit_store ??= new Map<string, RateRecord>();

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions
): { allowed: boolean; remaining: number; resetMs: number; retryAfterMs?: number } {
  const now = Date.now();
  const rec = store.get(key);

  if (rec?.blockedUntil && now < rec.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, (rec.resetAt ?? now) - now),
      retryAfterMs: rec.blockedUntil - now,
    };
  }

  if (!rec || now >= rec.resetAt) {
    const next: RateRecord = { hits: 1, resetAt: now + opts.windowMs };
    store.set(key, next);
    return { allowed: true, remaining: opts.max - 1, resetMs: opts.windowMs };
  }

  rec.hits += 1;

  if (rec.hits > opts.max) {
    rec.blockedUntil = now + (opts.blockDurationMs ?? opts.windowMs);
    store.set(key, rec);
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, rec.resetAt - now),
      retryAfterMs: rec.blockedUntil - now,
    };
  }

  store.set(key, rec);
  return {
    allowed: true,
    remaining: Math.max(0, opts.max - rec.hits),
    resetMs: Math.max(0, rec.resetAt - now),
  };
}

// Извлечение IP из заголовков (подходит для dev, за прокси — x-forwarded-for)
export function getClientIp(req: NextRequest): string {
  // В dev используем host как стабильный ключ, затем пробуем прокси-заголовки
  const host = req.headers.get('host');
  if (host) return `host:${host}`;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  const xrip = req.headers.get('x-real-ip');
  if (xrip) return xrip;
  // Дополнительные распространенные заголовки
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const fastly = req.headers.get('fastly-client-ip');
  if (fastly) return fastly;
  const trueClient = req.headers.get('true-client-ip');
  if (trueClient) return trueClient;
  return 'unknown';
}

// Явно экспортируем именованные сущности для корректной работы Turbopack
// (удалено: переэкспорт вызывал конфликт при сборке)

// Дополнительно экспорт по умолчанию (не используется, но помогает сборщику)
export default {
  checkRateLimit,
  getClientIp,
};