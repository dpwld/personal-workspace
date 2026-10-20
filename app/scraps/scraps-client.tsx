"use client";

import { requestMutation } from "@/lib/client-request.mjs";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import ConfirmButton from "@/components/confirm-button";
import Drawer from "@/components/drawer";
import { Item, todaySeoul } from "@/lib/types";

// Pocket 스타일: 컬러 썸네일 카드 그리드 + 도메인/키워드 메타
// 다크에서는 형광 대신 Notion 다크 태그 파스텔로
const THUMB_TAGS = ["blue", "green", "purple", "orange", "pink", "brown"];

function hostOf(url?: string): string | null {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

function thumbTag(s: string): string {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return THUMB_TAGS[h % THUMB_TAGS.length];
}

const emptyScrapForm = () => ({ title: "", url: "", keyword: "", type: "스크랩", date: todaySeoul(), memo: "", image: "" });

// 새 스크랩 메모 프리필 (뉴스·기술문서 양식, 플레인 텍스트)
const SCRAP_MEMO_TEMPLATE = [
  "이슈 요약 (3줄)",
  "- ",
  "- ",
  "- ",
  "",
  "핵심 기술·개념 키워드",
  "- ",
  "",
  "왜 중요한가",
  "",
  "더 알아볼 키워드",
  "",
  "떠오른 아이디어",
  "",
].join("\n");

export default function ScrapsClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const [tab, setTab] = useState("전체");
  const [selected, setSelected] = useState<string | null>(null); // 상세로 보는 item id
  const [editing, setEditing] = useState<string | null>(null); // item id or "new"
  const [form, setForm] = useState(emptyScrapForm());
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ogLoading, setOgLoading] = useState(false);
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});
  const lastOgUrl = useRef(""); // 같은 URL 반복 조회 방지

  async function fetchOg(url: string) {
    const trimmed = url.trim();
    if (!trimmed || trimmed === lastOgUrl.current) return;
    lastOgUrl.current = trimmed;
    setOgLoading(true);
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(trimmed)}`);
      const json: { image?: string; title?: string } = await res.json();
      setForm((f) => ({
        ...f,
        image: json.image || f.image,
        title: f.title.trim() ? f.title : json.title || f.title,
      }));
    } catch {
      // 조회 실패 시 기존 값 유지
    }
    setOgLoading(false);
  }

  async function post(payload: object) {
    setBusy(true);
    setSaveError(null);
    try {
      const error = await requestMutation("/api/items", payload);
      if (error) {
        setSaveError(error);
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!form.title.trim()) return;
    if (editing === "new") {
      if (!(await post({ action: "add", kind: "scrap", data: form }))) return;
      closeDrawer();
    } else {
      if (!(await post({ action: "update", id: editing, data: form }))) return;
      setEditing(null); // 상세 보기로 복귀
    }
  }

  function closeDrawer() {
    setSelected(null);
    setEditing(null);
  }

  function openEdit(item: Item) {
    setForm({
      title: item.data.title ?? "",
      url: item.data.url ?? "",
      keyword: item.data.keyword ?? "",
      type: item.data.type ?? "스크랩",
      date: item.data.date ?? todaySeoul(),
      memo: item.data.memo ?? "",
      image: item.data.image ?? "",
    });
    lastOgUrl.current = item.data.url ?? "";
    setSelected(String(item.id));
    setEditing(String(item.id));
  }

  async function remove(id: string) {
    if (!(await post({ action: "delete", id }))) return;
    closeDrawer();
  }

  const sorted = items.slice().sort((a, b) => (b.data.date ?? "").localeCompare(a.data.date ?? ""));
  const filtered = tab === "전체" ? sorted : sorted.filter((i) => (i.data.type || "스크랩") === tab);

  const drawerOpen = editing !== null || selected !== null;
  const selectedItem = selected !== null ? items.find((i) => String(i.id) === selected) : undefined;

  const formView = (
    <div className="flex flex-col gap-3">
      <label>
        <span className="mb-1 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>제목</span>
        <input className="input" placeholder="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </label>
      <label>
        <span className="mb-1 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>링크</span>
        <input
          className="input"
          type="url"
          placeholder="https://..."
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          onBlur={() => fetchOg(form.url)}
        />
        {ogLoading && (
          <span className="mt-1 block text-xs font-medium" style={{ color: "var(--color-gray-400)" }}>
            이미지 가져오는 중
          </span>
        )}
      </label>
      <label>
        <span className="mb-1 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>키워드</span>
        <input className="input" placeholder="예: 디자인" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} />
      </label>
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>구분</span>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option>스크랩</option>
            <option>딥다이브</option>
          </select>
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>날짜</span>
          <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
      </div>
      <label>
        <span className="mb-1 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>메모</span>
        <textarea className="input" rows={editing === "new" ? 14 : 4} placeholder="메모, 배운 것" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <button
          className="btn btn--tertiary btn--sm"
          onClick={() => (editing === "new" || selected === null ? closeDrawer() : setEditing(null))}
        >
          취소
        </button>
        <button className="btn btn--primary btn--sm" disabled={busy || !form.title.trim()} onClick={save}>저장</button>
      </div>
    </div>
  );

  const detailView = selectedItem && (
    <div className="flex flex-col">
      <h3 className="text-[20px] font-bold leading-snug" style={{ wordBreak: "keep-all" }}>
        {selectedItem.data.title}
      </h3>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(selectedItem.data.type || "스크랩") === "딥다이브" ? (
          <span className="chip chip--sm" style={{ background: "var(--nt-tag-purple-bg)", color: "var(--nt-tag-purple-fg)" }}>딥다이브</span>
        ) : (
          <span className="chip chip--sm chip--surface">스크랩</span>
        )}
        {selectedItem.data.keyword && <span className="chip chip--sm chip--surface">{selectedItem.data.keyword}</span>}
        {selectedItem.data.date && (
          <span className="text-xs font-medium tabular-nums" style={{ color: "var(--color-gray-400)" }}>
            {selectedItem.data.date}
          </span>
        )}
      </div>
      {selectedItem.data.url && (
        <div className="mt-4">
          <a href={selectedItem.data.url} target="_blank" rel="noreferrer" className="btn btn--primary btn--sm">
            <ExternalLink size={14} /> 원문 열기
          </a>
          <p className="mt-1.5 text-xs font-medium" style={{ color: "var(--nt-muted)" }}>
            {hostOf(selectedItem.data.url)}
          </p>
        </div>
      )}
      {selectedItem.data.memo && (
        <div className="mt-5">
          <p className="mb-1 text-xs font-semibold" style={{ color: "var(--color-gray-400)" }}>메모</p>
          <p className="text-sm leading-relaxed" style={{ whiteSpace: "pre-wrap", wordBreak: "keep-all" }}>
            {selectedItem.data.memo}
          </p>
        </div>
      )}
      <div
        className="flex justify-end gap-2 border-t"
        style={{ borderColor: "var(--color-gray-100)", marginTop: 28, paddingTop: 16 }}
      >
        <ConfirmButton size={32} disabled={busy} onConfirm={() => remove(String(selectedItem.id))} />
        <button className="btn btn--secondary btn--sm" onClick={() => openEdit(selectedItem)}>
          <Pencil size={14} /> 수정
        </button>
      </div>
    </div>
  );

  const saveErrorAlert = saveError && (
    <p className="alert text-sm" role="alert" style={{ color: "var(--color-danger)" }}>{saveError}</p>
  );

  return (
    <div className="flex flex-col gap-4">
      {selected === null && editing === null && saveErrorAlert}
      <div className="page-head flex items-start justify-between gap-3" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Newspaper size={19} style={{ color: "var(--color-accent-500)" }} />
            스크랩
          </h1>
          <p className="page-desc">뉴스, 증시, 인사이트를 모은다. 딥다이브할 것은 표시해두기.</p>
        </div>
        <button
          className="btn btn--primary btn--sm shrink-0"
          onClick={() => {
            // 신규 스크랩만 양식 프리필 — 기존 항목 수정(openEdit)은 저장된 메모 그대로
            setForm({ ...emptyScrapForm(), memo: SCRAP_MEMO_TEMPLATE });
            lastOgUrl.current = "";
            setSelected(null);
            setEditing("new");
          }}
        >
          <Plus size={15} /> 스크랩 추가
        </button>
      </div>

      <div className="tabs">
        {["전체", "스크랩", "딥다이브"].map((t) => (
          <button key={t} className="tab" data-active={tab === t} onClick={() => setTab(t)}>
            {t}
            <span className="ml-1.5 text-xs font-medium" style={{ color: "var(--color-gray-400)" }}>
              {t === "전체" ? items.length : items.filter((i) => (i.data.type || "스크랩") === t).length}
            </span>
          </button>
        ))}
      </div>

      <div className="scrap-grid">
        {filtered.length === 0 && (
          <p className="flex items-center gap-2 text-sm" style={{ color: "var(--color-gray-400)" }}>
            <Newspaper size={15} /> 아직 스크랩이 없어요. 오늘 읽은 기사 하나부터.
          </p>
        )}
        {filtered.map((item, index) => {
          const id = String(item.id);
          const host = hostOf(item.data.url);
          const tag = thumbTag(item.data.keyword || item.data.title || "s");
          const deep = (item.data.type || "스크랩") === "딥다이브";
          return (
            <div
              key={id}
              className="card card--tight scrap-card anim-in hover-lift cursor-pointer"
              style={{ animationDelay: `${index * 40}ms` }}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelected(id);
                setEditing(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSelected(id);
                  setEditing(null);
                }
              }}
            >
              <div
                className="scrap-card__thumb"
                style={{
                  position: "relative",
                  background: `var(--nt-tag-${tag}-bg)`,
                  color: `var(--nt-tag-${tag}-fg)`,
                }}
              >
                {item.data.image && !brokenThumbs[id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.data.image}
                    alt=""
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    onError={() => setBrokenThumbs((b) => ({ ...b, [id]: true }))}
                  />
                ) : (
                  (item.data.keyword || item.data.title || "S").slice(0, 1).toUpperCase()
                )}
                {deep && (
                  <span
                    aria-label="딥다이브"
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#9A6DD7",
                      boxShadow: "0 0 0 2px var(--nt-card)",
                    }}
                  />
                )}
              </div>
              {item.data.url ? (
                <a
                  href={item.data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link text-[15px] font-bold leading-snug"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.data.title}
                </a>
              ) : (
                <p className="text-[15px] font-bold leading-snug">{item.data.title}</p>
              )}
              {item.data.memo && (
                <p
                  className="mt-1.5 text-[13px] leading-relaxed"
                  style={{
                    color: "var(--color-gray-500)",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.data.memo}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="min-w-0 truncate text-xs font-medium" style={{ color: "var(--nt-muted)" }}>
                  {host ?? "메모"} · {item.data.date}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {deep && (
                    <span className="chip chip--sm" style={{ background: "var(--nt-tag-purple-bg)", color: "var(--nt-tag-purple-fg)" }}>딥다이브</span>
                  )}
                  {item.data.keyword && <span className="chip chip--sm chip--surface">{item.data.keyword}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        width={460}
        title={editing === "new" ? "스크랩 추가" : editing !== null ? "수정" : undefined}
      >
        {saveErrorAlert}
        {editing !== null ? formView : detailView}
      </Drawer>
    </div>
  );
}
