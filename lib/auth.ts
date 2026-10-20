import { cookies, headers } from 'next/headers';
import { authConfig, isLoopback, requestOrigin, sameOrigin, SESSION_COOKIE, validSession } from './security.mjs';

// Recheck at the data boundary as well as in proxy.ts.
export async function assertAuthorized(mutation = false): Promise<void> {
  const config = authConfig();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') || '';
  const expectedOrigin = requestOrigin(config.origin, host, `${requestHeaders.get('x-forwarded-proto') || 'http'}:`);
  const local = isLoopback(new URL(`http://${host}`).hostname);
  if (!config.passcode) {
    if (config.production || !local) throw new Error('Authentication is not configured.');
  } else if (!validSession((await cookies()).get(SESSION_COOKIE)?.value, config.passcode)) {
    throw new Error('Authentication required.');
  }
  if (mutation && !sameOrigin(requestHeaders.get('origin'), expectedOrigin)) throw new Error('Same-origin request required.');
}
