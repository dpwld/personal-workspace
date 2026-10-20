import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { assertAuthorized } from '@/lib/auth';
import { imageExtension } from '@/lib/security.mjs';
import { readLimited } from '@/lib/http-body.mjs';
import { IMAGE_TYPES, saveImage } from '@/lib/uploads.mjs';

export async function POST(req: NextRequest) {
  await assertAuthorized(true);
  let form: FormData;
  try {
    const bytes = await readLimited(req, 11 * 1024 * 1024);
    form = await new Response(new Uint8Array(bytes), { headers: { 'Content-Type': req.headers.get('content-type') || '' } }).formData();
  } catch { return NextResponse.json({ error: '유효한 10MB 이하 이미지 파일을 선택해 주세요.' }, { status: 400 }); }
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: '10MB 이하 이미지 파일이 필요해요.' }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  let extension: string;
  try { extension = imageExtension(bytes, file.type); }
  catch { return NextResponse.json({ error: 'PNG, JPEG, GIF, WebP 이미지만 사용할 수 있어요.' }, { status: 400 }); }
  const name = `${randomUUID()}.${extension}`;
  await saveImage(name, bytes, IMAGE_TYPES[extension]);
  return NextResponse.json({ url: `/api/media/${name}` });
}
