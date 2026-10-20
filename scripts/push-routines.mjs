// Optional scheduler: run once every 5 minutes with your own Supabase and VAPID settings.
// --dry reads current state but does not send notifications or alter subscription data.
import path from 'node:path';
import webpush from 'web-push';
import { routinesForDate } from '../lib/routine-schedule.mjs';
import { storageConfig } from '../lib/security.mjs';
import { readJson, writeJson } from '../lib/local-storage.mjs';
import { validPushSubscription } from '../lib/push-subscription.mjs';

const dry = process.argv.includes('--dry');
const config = storageConfig();
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;
if (config.mode !== 'supabase' || !publicKey || !privateKey || !subject) {
  throw new Error('Push requires Supabase plus NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.');
}
webpush.setVapidDetails(subject, publicKey, privateKey);
const headers = { apikey: config.key, Authorization: `Bearer ${config.key}` };
async function rest(route, method = 'GET') {
  const response = await fetch(`${config.url}/rest/v1/${route}`, { headers, method });
  if (!response.ok) throw new Error(`Push storage request failed (${response.status}).`);
  return method === 'GET' ? response.json() : null;
}

const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
const pad = (n) => String(n).padStart(2, '0');
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const minutes = now.getHours() * 60 + now.getMinutes();
const sentPath = path.resolve(config.baseDirectory, 'push-sent.json');
const previous = readJson(sentPath, () => ({ date: today, ids: [] }));
const sent = previous.date === today ? previous : { date: today, ids: [] };
const [routines, checks, subscriptions, schedule] = await Promise.all([
  rest('routines?active=eq.true&select=id,title,time,desc'),
  rest(`routine_checks?date=eq.${today}&done=eq.true&select=routine_id`),
  rest('items?kind=eq.push_sub&select=id,data'),
  rest('docs?id=eq.routine_schedule&select=data'),
]);
if (![routines, checks, subscriptions, schedule].every(Array.isArray)) throw new Error('Invalid push storage response.');
const doneIds = new Set(checks.map((check) => String(check.routine_id)));
const due = routinesForDate(routines, today, schedule[0]?.data).filter((routine) => {
  const [h, m] = routine.time.split(':').map(Number);
  return h * 60 + m <= minutes && h * 60 + m > minutes - 5 && !doneIds.has(String(routine.id));
});
let planned = 0;
let delivered = 0;
let failed = 0;
for (const routine of due) {
  const payload = JSON.stringify({ title: `${routine.time} ${routine.title}`, body: (routine.desc || '지금 할 시간이에요').slice(0, 90), tag: `routine-${routine.id}`, url: '/routines' });
  for (const item of subscriptions) {
    const key = `${routine.id}:${item.id}`;
    if (sent.ids.includes(key)) continue;
    const subscription = { endpoint: item.data.endpoint, keys: { p256dh: item.data.p256dh, auth: item.data.auth } };
    if (!validPushSubscription(subscription)) { failed++; continue; }
    planned++;
    if (dry) continue;
    try {
      await webpush.sendNotification(subscription, payload);
      sent.ids.push(key);
      writeJson(sentPath, sent);
      delivered++;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) await rest(`items?id=eq.${encodeURIComponent(item.id)}`, 'DELETE');
      else failed++;
    }
  }
}
console.log(JSON.stringify({ dry, planned, delivered, failed }));
if (failed) process.exitCode = 1;
