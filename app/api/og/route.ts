import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/auth';
import { allowedMetadataUrl } from '@/lib/security.mjs';
import { readLimited } from '@/lib/http-body.mjs';

// Remote previews are off until the operator explicitly trusts exact HTTPS origins.
export async function GET(req: NextRequest) {
  await assertAuthorized();
  let target: URL;
  try { target = allowedMetadataUrl(req.nextUrl.searchParams.get('url') || '', process.env.OG_ALLOWED_ORIGINS || ''); }
  catch { return NextResponse.json({ image: '', title: '' }); }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(target, { signal: controller.signal, redirect: 'error', headers: { Accept: 'text/html' }, cache: 'no-store' });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return NextResponse.json({ image: '', title: '' });
    const html = (await readLimited(response, 300_000)).toString('utf8');
    const pick = (property: string) => {
      const expression = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
      const match = html.match(expression);
      return match ? (match[1] || match[2] || '').trim() : '';
    };
    let image = '';
    try {
      const rawImage = pick('og:image') || pick('twitter:image');
      if (rawImage) {
        const candidate = new URL(rawImage, target);
        if (candidate.protocol === 'https:') image = candidate.href;
      }
    } catch { /* Missing or malformed preview image. */ }
    return NextResponse.json({ image, title: pick('og:title') });
  } catch { return NextResponse.json({ image: '', title: '' }); }
  finally { clearTimeout(timer); }
}
