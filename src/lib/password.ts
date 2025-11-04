import crypto from 'crypto';

// Формат хранения: scrypt$N$r$p$saltBase64$hashBase64
export function hashPassword(password: string, opts?: { N?: number; r?: number; p?: number }): string {
  // Снижаем параметры по умолчанию для совместимости с средами с ограниченной памятью
  const N = opts?.N ?? 4096; // cost
  const r = opts?.r ?? 8;     // block size
  const p = opts?.p ?? 1;     // parallelization
  const salt = crypto.randomBytes(16);
  const keyLen = 64;
  const hash = crypto.scryptSync(password, salt, keyLen, { N, r, p, maxmem: 256 * N * r + keyLen });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${Buffer.from(hash).toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$');
    if (parts.length !== 6 || !stored.startsWith('scrypt')) return false;
    const N = parseInt(parts[1], 10);
    const r = parseInt(parts[2], 10);
    const p = parseInt(parts[3], 10);
    const salt = Buffer.from(parts[4], 'base64');
    const expected = Buffer.from(parts[5], 'base64');
    const keyLen = expected.length;
    // Используем такой же запас по памяти, как при хешировании, чтобы избежать ошибок лимита памяти
    const hash = crypto.scryptSync(password, salt, keyLen, { N, r, p, maxmem: 256 * N * r + keyLen });
    return crypto.timingSafeEqual(Buffer.from(hash), expected);
  } catch {
    return false;
  }
}