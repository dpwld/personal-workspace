export function validPushSubscription(subscription) {
  try {
    const url = new URL(subscription.endpoint);
    const host = url.hostname;
    const allowed = host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com'
      || host.endsWith('.push.apple.com') || host.endsWith('.notify.windows.com');
    if (!allowed || url.protocol !== 'https:' || url.username || url.password || url.port || subscription.endpoint.length > 4096) return false;
    const { p256dh, auth } = subscription.keys;
    return typeof p256dh === 'string' && /^[A-Za-z0-9_-]{86,88}={0,2}$/.test(p256dh) && Buffer.from(p256dh, 'base64url').length === 65
      && typeof auth === 'string' && /^[A-Za-z0-9_-]{22,24}={0,2}$/.test(auth) && Buffer.from(auth, 'base64url').length === 16;
  } catch { return false; }
}
