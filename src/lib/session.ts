import crypto from 'crypto';

const DEFAULT_EXP_SECONDS = 60 * 60 * 24; // 24 часа

function getSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-change-me';
}

export interface SessionPayload {
  user_id: number;
  telegram_id?: number;
  exp: number; // unix seconds
}

export function signToken(payload: Omit<SessionPayload, 'exp'>, expSeconds: number = DEFAULT_EXP_SECONDS): string {
  const exp = Math.floor(Date.now() / 1000) + expSeconds;
  const full: SessionPayload = { ...payload, exp };
  const json = JSON.stringify(full);
  const data = Buffer.from(json).toString('base64url');
  const hmac = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
  return `${data}.${hmac}`;
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;
    const expected = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const json = Buffer.from(data, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as SessionPayload;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}