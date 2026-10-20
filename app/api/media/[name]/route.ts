import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/auth';
import { IMAGE_TYPES, loadImage } from '@/lib/uploads.mjs';

export async function GET(_req: NextRequest, context: { params: Promise<{ name: string }> }) {
  await assertAuthorized();
  const { name } = await context.params;
  const match = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(png|jpg|gif|webp)$/.exec(name);
  if (!match) return new NextResponse(null, { status: 404 });
  const file = await loadImage(name);
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(file instanceof Blob ? file : new Uint8Array(file), {
    headers: { 'Content-Type': IMAGE_TYPES[match[1]], 'Content-Disposition': `inline; filename="${name}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
