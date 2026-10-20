import { NextRequest, NextResponse } from "next/server";

// 책 제목(+저자)으로 표지 이미지 검색. Google Books 우선, 쿼터 초과 시 Open Library 폴백.
async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type GoogleVolume = { volumeInfo?: { imageLinks?: { thumbnail?: string; smallThumbnail?: string } } };

async function googleCover(q: string): Promise<string> {
  const json = (await fetchJson(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5&printType=books`
  )) as { items?: GoogleVolume[] } | null;
  for (const it of json?.items ?? []) {
    const links = it.volumeInfo?.imageLinks;
    const t = links?.thumbnail || links?.smallThumbnail;
    if (t) return t.replace(/^http:\/\//, "https://");
  }
  return "";
}

async function openLibraryCover(params: string): Promise<string> {
  const json = (await fetchJson(
    `https://openlibrary.org/search.json?${params}&limit=5&fields=cover_i`
  )) as { docs?: { cover_i?: number }[] } | null;
  for (const d of json?.docs ?? []) {
    if (d.cover_i) return `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`;
  }
  return "";
}

export async function GET(req: NextRequest) {
  const title = (req.nextUrl.searchParams.get("title") ?? "").trim();
  const author = (req.nextUrl.searchParams.get("author") ?? "").trim();
  if (!title) return NextResponse.json({ cover: "" });

  let cover = await googleCover(`intitle:${title}${author ? `+inauthor:${author}` : ""}`);
  if (!cover) cover = await googleCover(`${title} ${author}`.trim());
  if (!cover) cover = await openLibraryCover(`title=${encodeURIComponent(title)}`);
  if (!cover) cover = await openLibraryCover(`q=${encodeURIComponent(`${title} ${author}`.trim())}`);
  return NextResponse.json({ cover });
}
