import { NextRequest, NextResponse } from 'next/server';
import { addItem, listItems, updateItem, deleteItem } from '@/lib/store';
import { assertAuthorized } from '@/lib/auth';
import { validPushSubscription } from '@/lib/push-subscription.mjs';

export async function POST(req: NextRequest) {
  await assertAuthorized(true);
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return NextResponse.json({ error: 'Push is not configured.' }, { status: 503 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid subscription' }, { status: 400 }); }
  const sub = body?.subscription;
  if (!validPushSubscription(sub)) return NextResponse.json({ error: 'invalid subscription' }, { status: 400 });
  const data = { endpoint: String(sub.endpoint), p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth), ua: String(body.ua || '').slice(0, 120) };
  const existing = await listItems('push_sub');
  const duplicate = existing.find((item) => item.data.endpoint === data.endpoint);
  if (duplicate) await updateItem(String(duplicate.id), data);
  else await addItem('push_sub', data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await assertAuthorized(true);
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid subscription' }, { status: 400 }); }
  const endpoint = String(body?.endpoint || '');
  const existing = await listItems('push_sub');
  const hit = existing.find((item) => item.data.endpoint === endpoint);
  if (hit) await deleteItem(String(hit.id));
  return NextResponse.json({ ok: true });
}
