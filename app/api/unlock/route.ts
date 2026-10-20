import { NextRequest, NextResponse } from 'next/server';
import { authConfig, constantEqual, createSession, requestOrigin, sameOrigin, SESSION_COOKIE, SESSION_SECONDS } from '@/lib/security.mjs';

// This process-wide budget complements the strong passphrase requirement.
let attempts = 0;
let resetAt = 0;
export async function POST(req: NextRequest) {
  let config;
  try { config = authConfig(); }
  catch { return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 503 }); }
  const origin = requestOrigin(config.origin, req.headers.get('host'), req.nextUrl.protocol);
  if (!sameOrigin(req.headers.get('origin'), origin)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (Date.now() > resetAt) { attempts = 0; resetAt = Date.now() + 60_000; }
  if (++attempts > 10) return NextResponse.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 429, headers: { 'Retry-After': '60' } });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid' }, { status: 400 }); }
  if (!config.passcode || typeof body?.code !== 'string' || body.code.length > 256 || !constantEqual(body.code, config.passcode)) {
    return NextResponse.json({ error: 'wrong' }, { status: 401 });
  }
  attempts = 0;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSession(config.passcode), {
    httpOnly: true, secure: origin.startsWith('https:'), sameSite: 'strict', maxAge: SESSION_SECONDS, path: '/',
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
