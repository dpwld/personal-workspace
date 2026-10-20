import { NextRequest, NextResponse } from 'next/server';
import { authConfig, isLoopback, requestOrigin, sameOrigin, SESSION_COOKIE, validSession } from './lib/security.mjs';

const PUBLIC_PATHS = new Set(['/unlock', '/api/unlock', '/sw.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/mascot.png']);

export function proxy(req: NextRequest) {
  let config;
  let origin: string;
  try {
    config = authConfig();
    origin = requestOrigin(config.origin, req.headers.get("host"), req.nextUrl.protocol);
  }
  catch { return NextResponse.json({ error: 'Configure a strong PASSCODE and APP_ORIGIN before starting this service.' }, { status: 503 }); }
  const { pathname } = req.nextUrl;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !sameOrigin(req.headers.get('origin'), origin)) {
    return NextResponse.json({ error: 'Same-origin request required.' }, { status: 403 });
  }
  if (!config.passcode && !isLoopback(new URL(origin).hostname)) {
    return NextResponse.json({ error: 'Configure PASSCODE before exposing this service.' }, { status: 503 });
  }
  const authorized = !config.passcode || validSession(req.cookies.get(SESSION_COOKIE)?.value, config.passcode);
  if (!authorized && !PUBLIC_PATHS.has(pathname)) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'locked' }, { status: 401 });
    return NextResponse.redirect(new URL('/unlock', req.url));
  }
  if (authorized && pathname === '/unlock') return NextResponse.redirect(new URL('/', req.url));
  if (authorized && pathname === '/' && /Mobi|iPhone/i.test(req.headers.get('user-agent') || '')) {
    let fromInside = false;
    try { fromInside = new URL(req.headers.get('referer') || '').origin === origin; } catch { /* No referrer. */ }
    if (!fromInside) return NextResponse.redirect(new URL('/routines', req.url));
  }
  const response = NextResponse.next();
  if (!PUBLIC_PATHS.has(pathname)) response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  return response;
}

export const config = { matcher: ['/((?!_next/static|favicon.ico).*)'] };
