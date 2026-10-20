import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { authConfig, createSession, validSession, sameOrigin, imageExtension, allowedMetadataUrl, storageConfig } from '../lib/security.mjs';
import { readJson, writeJson } from '../lib/local-storage.mjs';

const pass = 'test-passphrase-with-32-characters';
test('production refuses missing or weak lock and invalid origin', () => {
  for (const env of [{}, { PASSCODE: 'short', APP_ORIGIN: 'https://example.test' }, { PASSCODE: pass, APP_ORIGIN: 'https://example.test/path' }]) {
    assert.throws(() => authConfig({ NODE_ENV: 'production', ...env }));
  }
  assert.equal(authConfig({ NODE_ENV: 'production', PASSCODE: pass, APP_ORIGIN: 'https://example.test' }).origin, 'https://example.test');
});
test('session rejects tampering, expiry, other passcode and raw passwords', () => {
  const session = createSession(pass, 1000);
  assert.equal(validSession(session, pass, 1001), true);
  assert.equal(validSession(`${session.slice(0, -1)}${session.endsWith("x") ? "y" : "x"}`, pass, 1001), false);
  assert.equal(validSession(session, pass, 1000 + 7 * 86400), false);
  assert.equal(validSession(session, 'different-passphrase', 1001), false);
  assert.equal(validSession(pass, pass, 1001), false);
  assert.equal(session.includes(pass), false);
});
test('mutations require an exact origin, not suffix matching or missing headers', () => {
  assert.equal(sameOrigin('https://example.test', 'https://example.test'), true);
  for (const origin of [null, 'null', 'https://example.test.evil.test', 'http://example.test']) assert.equal(sameOrigin(origin, 'https://example.test'), false);
});
test('storage refuses partial Supabase credentials and ephemeral production fallback', () => {
  assert.throws(() => storageConfig({ SUPABASE_URL: 'https://example.supabase.co' }));
  assert.throws(() => storageConfig({ SUPABASE_SERVICE_KEY: 'test-key' }));
  assert.throws(() => storageConfig({ NODE_ENV: 'production', VERCEL: '1' }));
  assert.equal(storageConfig({}).mode, 'local');
  assert.equal(storageConfig({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_KEY: 'test-key' }).mode, 'supabase');
});
test('images require matching MIME and raster signatures; SVG and disguised HTML fail', () => {
  const png = Buffer.from('89504e470d0a1a0a00000000', 'hex');
  assert.equal(imageExtension(png, 'image/png'), 'png');
  assert.equal(imageExtension(Buffer.from('ffd8ffe000000000', 'hex'), 'image/jpeg'), 'jpg');
  for (const [bytes, mime] of [[png, 'image/jpeg'], [Buffer.from('<svg/>'), 'image/svg+xml'], [Buffer.from('<html>'), 'image/png']]) assert.throws(() => imageExtension(bytes, mime));
});
test('metadata fetches default off and allow only exact public HTTPS origins', () => {
  assert.throws(() => allowedMetadataUrl('https://example.test/a', ''));
  assert.equal(allowedMetadataUrl('https://example.test/a', 'https://example.test').hostname, 'example.test');
  for (const raw of ['http://example.test/a', 'https://example.test.evil.test/a', 'https://user@example.test/a', 'https://127.0.0.1/a']) assert.throws(() => allowedMetadataUrl(raw, 'https://example.test,https://127.0.0.1'));
});
test('local writes survive reload without leaving temporary files', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'workspace-storage-'));
  try {
    const file = path.join(dir, 'nested', 'store.json');
    assert.deepEqual(readJson(file, () => ({ items: [] })), { items: [] });
    writeJson(file, { items: [{ title: 'saved' }] });
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { items: [{ title: 'saved' }] });
    assert.deepEqual(readdirSync(path.dirname(file)), ['store.json']);
    writeFileSync(file, '{broken');
    assert.throws(() => readJson(file, () => ({ items: [] })), SyntaxError);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('body reader rejects oversized streams before accepting upload or metadata content', async () => {
  const { readLimited } = await import('../lib/http-body.mjs');
  assert.equal((await readLimited(new Response('abc'), 3)).toString(), 'abc');
  await assert.rejects(readLimited(new Response('abcd'), 3), /large/);
});

test('demo and preview storage ignore production credentials and isolate image directories', () => {
  assert.equal(storageConfig({ NODE_ENV: 'development', WORKSPACE_DEMO: '1', WORKSPACE_DATA_DIR: '/tmp/example-data', SUPABASE_URL: 'https://example.supabase.co' }).directory, '/tmp/example-data/demo');
  assert.equal(storageConfig({ NODE_ENV: 'development', WORKSPACE_LOCAL_PREVIEW: '1' }).directory, '.data/preview');
  assert.throws(() => storageConfig({ NODE_ENV: 'production', WORKSPACE_DEMO: '1', SUPABASE_URL: 'https://example.supabase.co' }));
});
test('push subscriptions reject internal URLs and invalid encryption keys', async () => {
  const { validPushSubscription } = await import('../lib/push-subscription.mjs');
  const keys = { p256dh: Buffer.alloc(65, 4).toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') };
  assert.equal(validPushSubscription({ endpoint: 'https://fcm.googleapis.com/fcm/send/example', keys }), true);
  assert.equal(validPushSubscription({ endpoint: 'https://web.push.apple.com/example', keys }), true);
  for (const endpoint of ['http://fcm.googleapis.com/example', 'https://127.0.0.1/', 'https://fcm.googleapis.com.evil.test/']) assert.equal(validPushSubscription({ endpoint, keys }), false);
  assert.equal(validPushSubscription({ endpoint: 'https://fcm.googleapis.com/example', keys: { p256dh: 'bad', auth: 'bad' } }), false);
});
test('production requires HTTPS for remote origins while allowing loopback smoke tests', () => {
  assert.throws(() => authConfig({ NODE_ENV: 'production', PASSCODE: pass, APP_ORIGIN: 'http://workspace.example.test' }));
  assert.equal(authConfig({ NODE_ENV: 'production', PASSCODE: pass, APP_ORIGIN: 'http://127.0.0.1:4320' }).origin, 'http://127.0.0.1:4320');
});
test('development Origin checks preserve the browser Host instead of Next normalized localhost', async () => {
  const { requestOrigin } = await import('../lib/security.mjs');
  assert.equal(requestOrigin('', '127.0.0.1:4317', 'http:'), 'http://127.0.0.1:4317');
  assert.equal(requestOrigin('https://workspace.example.test', 'localhost:3000', 'http:'), 'https://workspace.example.test');
  assert.throws(() => requestOrigin('', '127.0.0.1:4317/path', 'http:'));
});
test('absolute data directories keep uploads outside the project and survive a fresh read', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'workspace-upload-'));
  const previous = { WORKSPACE_DATA_DIR: process.env.WORKSPACE_DATA_DIR, SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY };
  process.env.WORKSPACE_DATA_DIR = directory;
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_SERVICE_KEY = '';
  try {
    const { saveImage, loadImage } = await import('../lib/uploads.mjs');
    const image = Buffer.from('89504e470d0a1a0a00000000', 'hex');
    await saveImage('test.png', image, 'image/png');
    assert.deepEqual(readFileSync(path.join(directory, 'uploads', 'test.png')), image);
    assert.deepEqual(await loadImage('test.png'), image);
  } finally {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    rmSync(directory, { recursive: true, force: true });
  }
});
