"use client";

import { requestMutation } from "@/lib/client-request.mjs";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NotebookPen, Pencil, Trash2 } from "lucide-react";
import ConfirmButton from "@/components/confirm-button";
import Drawer from "@/components/drawer";
import ImageAttach from "@/components/image-attach";
import { MemoEditor } from "@/components/memo-editor";
import MemoView from "@/components/memo-view";
import { Item, todaySeoul } from "@/lib/types";

function parseImages(s?: string): string[] {
  try {
    const arr = JSON.parse(s ?? "[]");
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// HTML에서 태그를 걷어낸 평문 (단어 수 계산용). 구버전 평문은 그대로.
function plainText(s?: string): string {
  if (!s) return "";
  if (!s.includes("<")) return s;
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

const MOOD_OPTIONS = [
  { emoji: "😄", label: "최고" },
  { emoji: "🙂", label: "좋음" },
  { emoji: "😐", label: "보통" },
  { emoji: "😪", label: "지침" },
  { emoji: "😢", label: "힘듦" },
];

function moodEmoji(label: string): string {
  return MOOD_OPTIONS.find((m) => m.label === label)?.emoji ?? "";
}

function DateBadge({ date }: { date: string }) {
  const d = new Date(date + "T00:00:00");
  return (
    <div className="diary-date">
      <p className="diary-date__dow">{DOW[d.getDay()]}요일</p>
      <p className="diary-date__num tabular-nums">{d.getDate()}</p>
      <p className="diary-date__month tabular-nums">{d.getFullYear()}.{String(d.getMonth() + 1).padStart(2, "0")}</p>
    </div>
  );
}

export default function DiaryClient({ entries }: { entries: Item[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [date, setDate] = useState(todaySeoul());
  const [initialBody, setInitialBody] = useState("");
  const bodyRef = useRef("");
  const [images, setImages] = useState<string[]>([]);
  const [mood, setMood] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sorted = entries.slice().sort((a, b) => (b.data.date ?? "").localeCompare(a.data.date ?? ""));

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
    const html = bodyRef.current;
    const hasBody = plainText(html).length > 0 || html.includes("<img");
    if (!hasBody && images.length === 0) return;
    const data = { date, body: html, images: JSON.stringify(images), mood };
    const saved = editing === "new"
      ? await post({ action: "add", kind: "diary", data })
      : await post({ action: "update", id: editing, data });
    if (!saved) return;
    setEditing(null);
    setInitialBody("");
    bodyRef.current = "";
    setImages([]);
    setMood("");
  }

  const saveErrorAlert = saveError && (
    <p className="alert text-sm" role="alert" style={{ color: "var(--color-danger)" }}>{saveError}</p>
  );

  return (
    <div className="flex flex-col gap-6">
      {editing === null && saveErrorAlert}
      <div className="page-head flex items-start justify-between gap-3" style={{ marginBottom: 0 }}>
        <div>
          <div className="flex items-center gap-2">
            <NotebookPen size={18} style={{ color: "var(--color-accent-500)" }} />
            <h1 className="page-title">일기장</h1>
          </div>
          <p className="page-desc">길어도 짧아도 좋다. 사진 한 장이어도 하루의 기록이 된다.</p>
        </div>
        <button
          className="btn btn--primary btn--sm shrink-0"
          onClick={() => {
            setEditing("new");
            setDate(todaySeoul());
            setInitialBody("");
            bodyRef.current = "";
            setImages([]);
            setMood("");
          }}
        >
          <Pencil size={14} /> 오늘 일기 쓰기
        </button>
      </div>

      <Drawer open={editing !== null} onClose={() => setEditing(null)} title="일기 쓰기" width={720}>
        {saveErrorAlert}
        <div className="flex flex-col gap-3">
          <input
            className="input"
            style={{ width: 180 }}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            {MOOD_OPTIONS.map((m) => {
              const selected = mood === m.label;
              return (
                <button
                  key={m.label}
                  type="button"
                  className="chip"
                  style={{
                    cursor: "pointer",
                    border: selected
                      ? "1.5px solid var(--nt-blue)"
                      : "1px solid var(--nt-divider)",
                    background: selected ? "var(--nt-tag-blue-bg)" : "transparent",
                    color: selected ? "var(--nt-tag-blue-fg)" : "var(--nt-text-soft)",
                  }}
                  aria-pressed={selected}
                  onClick={() => setMood(selected ? "" : m.label)}
                >
                  {m.emoji} {m.label}
                </button>
              );
            })}
          </div>
          <div style={{ minHeight: 280 }}>
            <MemoEditor
              key={editing ?? "closed"}
              value={initialBody}
              onSave={(html) => {
                bodyRef.current = html;
              }}
            />
          </div>
          <ImageAttach urls={images} onChange={setImages} />
          <div className="flex justify-end gap-2">
            <button className="btn btn--tertiary btn--sm" onClick={() => setEditing(null)}>취소</button>
            <button className="btn btn--primary btn--sm" disabled={busy} onClick={save}>
              저장
            </button>
          </div>
        </div>
      </Drawer>

      <div className="flex flex-col gap-5">
        {sorted.length === 0 && editing === null && (
          <p className="text-sm" style={{ color: "var(--color-gray-400)" }}>아직 일기가 없어요. 오늘 밤 첫 장을 써 보세요.</p>
        )}
        {sorted.map((e, idx) => {
          const id = String(e.id);
          const imgs = parseImages(e.data.images);
          const text = plainText(e.data.body);
          const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
          const isLast = idx === sorted.length - 1;
          return (
            <div key={id} className="diary-entry anim-in" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex flex-col items-center self-stretch" style={{ flex: "none" }}>
                <DateBadge date={e.data.date ?? todaySeoul()} />
                {e.data.mood && (
                  <span className="chip chip--sm chip--accent mt-2 shrink-0">
                    {moodEmoji(e.data.mood)} {e.data.mood}
                  </span>
                )}
                {!isLast && (
                  <span
                    aria-hidden
                    style={{ width: 1, flex: 1, marginTop: 8, background: "var(--nt-divider-solid)" }}
                  />
                )}
              </div>
              <div className="card hover-lift min-w-0 flex-1">
                {e.data.body && <MemoView html={e.data.body} />}
                {imgs.length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${e.data.body ? "mt-3" : ""}`}>
                    {imgs.map((u, i) => (
                      <a key={u + i} href={u} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={u}
                          alt={`일기 사진 ${i + 1}`}
                          className="h-36 w-36 rounded-xl border object-cover"
                          style={{ borderColor: "var(--color-gray-200)" }}
                        />
                      </a>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--color-gray-100)" }}>
                  <span className="text-xs font-medium" style={{ color: "var(--nt-muted)" }}>
                    {words > 0 && `${words} 단어`}
                    {words > 0 && imgs.length > 0 && " · "}
                    {imgs.length > 0 && `사진 ${imgs.length}장`}
                  </span>
                  <div className="flex gap-1">
                    <button
                      className="btn btn--tertiary btn--sm btn--icon-only"
                      style={{ ["--btn-h" as string]: "28px" }}
                      aria-label="수정"
                      onClick={() => {
                        setEditing(id);
                        setDate(e.data.date ?? todaySeoul());
                        setInitialBody(e.data.body ?? "");
                        bodyRef.current = e.data.body ?? "";
                        setImages(imgs);
                        setMood(e.data.mood ?? "");
                      }}
                    >
                      <Pencil size={12} />
                    </button>
                    <ConfirmButton disabled={busy} onConfirm={() => post({ action: "delete", id })} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
