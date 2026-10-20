"use client";

import { cleanMemo } from "@/lib/memo-sanitize.mjs";

// 저장된 메모 HTML을 읽기 전용으로 렌더한다.
// 구버전 평문(태그 없음)은 pre-wrap 문단으로 그대로 보여준다.
export default function MemoView({ html }: { html: string }) {
  if (!html || !html.trim()) return null;
  if (!html.includes("<")) {
    return (
      <p className="text-sm leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>{html}</p>
    );
  }
  return (
    <div
      className="sx-memo sx-memo--view"
      style={{ minHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: cleanMemo(html) }}
    />
  );
}
