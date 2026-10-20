import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

export const SESSION_COOKIE = 'workspace_session';
export const SESSION_SECONDS = 7 * 86400;

export function authConfig(env = process.env) {
  const passcode = env.PASSCODE || '';
  const production = env.NODE_ENV === 'production';
  if ((production || passcode) && passcode.length < 16) throw new Error('PASSCODE must contain at least 16 characters.');
  let origin = '';
  if (env.APP_ORIGIN) {
    const url = new URL(env.APP_ORIGIN);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== env.APP_ORIGIN || url.username || url.password) throw new Error('APP_ORIGIN must be an exact HTTP(S) origin.');
    if (production && url.protocol !== 'https:' && !isLoopback(url.hostname)) throw new Error('Public production APP_ORIGIN must use HTTPS.');
    origin = url.origin;
  }
  if (production && !origin) throw new Error('APP_ORIGIN is required in production.');
  return { passcode, origin, production };
}

export function isLoopback(hostname) {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
}

export function requestOrigin(configured, host, protocol = 'http:') {
  if (configured) return configured;
  if (!host || !['http:', 'https:'].includes(protocol)) throw new Error('Invalid request origin.');
  const url = new URL(`${protocol}//${host}`);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid request host.');
  return url.origin;
}

export function constantEqual(a, b) {
  const first = Buffer.from(String(a));
  const second = Buffer.from(String(b));
  return first.length === second.length && timingSafeEqual(first, second);
}

export function createSession(passcode, now = Math.floor(Date.now() / 1000)) {
  const body = `${now + SESSION_SECONDS}.${randomBytes(24).toString('base64url')}`;
  return `${body}.${createHmac('sha256', passcode).update(body).digest('base64url')}`;
}

export function validSession(value, passcode, now = Math.floor(Date.now() / 1000)) {
  if (!value || !passcode) return false;
  const parts = value.split('.');
  if (parts.length !== 3 || !/^\d+$/.test(parts[0])) return false;
  const expires = Number(parts[0]);
  if (expires <= now || expires > now + SESSION_SECONDS) return false;
  const signature = createHmac('sha256', passcode).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  return constantEqual(parts[2], signature);
}

export function sameOrigin(origin, expected) {
  return Boolean(origin && origin === expected);
}

export function storageConfig(env = process.env) {
  const baseDirectory = env.WORKSPACE_DATA_DIR || '.data';
  const isolated = env.NODE_ENV === 'development' && (env.WORKSPACE_LOCAL_PREVIEW === '1' || env.WORKSPACE_DEMO === '1');
  const url = isolated ? '' : env.SUPABASE_URL || '';
  const key = isolated ? '' : env.SUPABASE_SERVICE_KEY || '';
  if (Boolean(url) !== Boolean(key)) throw new Error('Set both SUPABASE_URL and SUPABASE_SERVICE_KEY, or neither.');
  if (url) return { mode: 'supabase', url, key, directory: baseDirectory, baseDirectory };
  if (env.NODE_ENV === 'production' && env.VERCEL) throw new Error('Vercel requires Supabase persistent storage.');
  const directory = isolated && env.WORKSPACE_DEMO === '1' ? `${baseDirectory}/demo` : isolated ? `${baseDirectory}/preview` : baseDirectory;
  return { mode: 'local', url: '', key: '', directory, baseDirectory };
}

export function imageExtension(bytes, mime) {
  const signatures = {
    'image/png': ['png', bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))],
    'image/jpeg': ['jpg', bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255],
    'image/gif': ['gif', ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString())],
    'image/webp': ['webp', bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'],
  };
  const match = signatures[mime];
  if (!match?.[1]) throw new Error('Only PNG, JPEG, GIF and WebP images with matching content are supported.');
  return String(match[0]);
}

export function allowedMetadataUrl(raw, origins = '') {
  const url = new URL(raw);
  const allowlist = origins.split(',').map((s) => s.trim()).filter(Boolean);
  if (url.protocol !== 'https:' || url.username || url.password || isIP(url.hostname.replace(/^\[|\]$/g, '')) || isLoopback(url.hostname) || !allowlist.includes(url.origin)) throw new Error('Metadata origin is not enabled.');
  return url;
}
