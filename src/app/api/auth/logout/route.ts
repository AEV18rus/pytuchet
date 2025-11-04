import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}