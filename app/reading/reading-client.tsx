"use client";

import { requestMutation } from "@/lib/client-request.mjs";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Book, ChevronDown, ChevronUp, Pencil, Plus, Star, Trash2 } from "lucide-react";
import ConfirmButton from "@/components/confirm-button";
import Drawer from "@/components/drawer";

// Goodreads 스타일 커버 타일 컬러
const COVER_COLORS = ["#1E3A5F", "#5B3A29", "#2F4538", "#4A2545", "#1F2937", "#7C2D12", "#134E4A", "#581C87"];
function coverColor(t: string): string {
  let h = 0;
  for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return COVER_COLORS[h % COVER_COLORS.length];
}
import { Item, todaySeoul } from "@/lib/types";

const STATUSES = ["읽는 중", "읽고 싶음", "완독"];
const GENRES = ["자기계발", "교양", "경제경영", "과학기술", "소설에세이", "기타"];

// 장르 → Notion 다크 태그 톤
const GENRE_TAGS: Record<string, string> = {
  자기계발: "yellow",
  교양: "brown",
  경제경영: "green",
  과학기술: "blue",
  소설에세이: "pink",
  기타: "gray",
};
function genreTagStyle(genre: string) {
  const t = GENRE_TAGS[genre] ?? "gray";
  return { background: `var(--nt-tag-${t}-bg)`, color: `var(--nt-tag-${t}-fg)` };
}
const STAR_YELLOW = "#F7C325";

// 새 읽기 기록 프리필 (플레인 텍스트 독서록 양식) — 읽은 범위는 전용 입력칸이 따로 있다
const NOTE_TEMPLATE = {
  quote: "핵심 한 문장\n\n핵심 아이디어 3개\n- \n- \n- ",
  thought: "내 생각 / 깨달음\n\n내 삶 / 일에 적용할 점\n",
};

const emptyBookForm = () => ({
  title: "",
  author: "",
  status: "읽는 중",
  total: "",
  current: "",
  rating: "",
  review: "",
  genre: "",
  cover: "",
});

export default function ReadingClient({ books, notes }: { books: Item[]; notes: Item[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<string | null>(null); // id or "new"
  const [bookForm, setBookForm] = useState(emptyBookForm());
  const [genreTab, setGenreTab] = useState("전체");
  const [brokenCovers, setBrokenCovers] = useState<Record<string, boolean>>({});
  const origTitle = useRef(""); // 제목이 바뀐 경우에만 표지 재조회
  const [noteForm, setNoteForm] = useState({ range: "", quote: "", thought: "" });
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteEditForm, setNoteEditForm] = useState({ range: "", quote: "", thought: "" });
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function post(body: object) {
    setBusy(true);
    setSaveError(null);
    try {
      const error = await requestMutation("/api/items", body);
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

  async function saveBook() {
    if (!bookForm.title.trim()) return;
    let cover = bookForm.cover;
    const titleChanged = bookForm.title.trim() !== origTitle.current;
    if (!cover || titleChanged) {
      setBusy(true);
      try {
        const res = await fetch(
          `/api/bookcover?title=${encodeURIComponent(bookForm.title.trim())}&author=${encodeURIComponent(bookForm.author.trim())}`
        );
        const json: { cover?: string } = await res.json();
        if (json.cover) cover = json.cover;
      } catch {
        // 표지 조회 실패 시 기존 값 유지
      }
    }
    const data = { ...bookForm, cover };
    const saved = editingBook === "new"
      ? await post({ action: "add", kind: "book", data })
      : await post({ action: "update", id: editingBook, data });
    if (!saved) return;
    setEditingBook(null);
  }

  async function updateProgress(book: Item, current: string) {
    if (!(await post({ action: "update", id: book.id, data: { ...book.data, current } }))) return;
  }

  async function addNote(bookId: string) {
    if (!noteForm.range.trim() && !noteForm.quote.trim() && !noteForm.thought.trim()) return;
    if (!(await post({
      action: "add",
      kind: "book_note",
      data: { book_id: bookId, date: todaySeoul(), ...noteForm },
    }))) return;
    setNoteForm({ range: "", quote: "", thought: "" });
  }

  async function saveNoteEdit(note: Item) {
    if (!(await post({ action: "update", id: note.id, data: { ...note.data, ...noteEditForm } }))) return;
    setEditingNote(null);
  }

  const saveErrorAlert = saveError && (
    <p className="alert text-sm" role="alert" style={{ color: "var(--color-danger)" }}>{saveError}</p>
  );

  return (
    <div className="flex flex-col gap-6">
      {editingBook === null && saveErrorAlert}
      <div className="page-head flex items-start justify-between gap-3" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Book size={19} style={{ color: "var(--color-accent-500)" }} />
            독서 기록장
          </h1>
          <p className="page-desc">한 번에 다 읽지 않아도 된다. 읽을 때마다 기록을 한 장씩 쌓는 곳.</p>
        </div>
        <button
          className="btn btn--primary btn--sm shrink-0"
          onClick={() => {
            setEditingBook("new");
            setBookForm(emptyBookForm());
            origTitle.current = "";
          }}
        >
          <Plus size={15} /> 책 추가
        </button>
      </div>

      <Drawer open={editingBook !== null} onClose={() => setEditingBook(null)} title="책 정보" width={520}>
        {saveErrorAlert}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>제목</span>
              <input className="input" value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>저자</span>
              <input className="input" value={bookForm.author} onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>상태</span>
              <select className="input" value={bookForm.status} onChange={(e) => setBookForm({ ...bookForm, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>장르</span>
              <select className="input" value={bookForm.genre} onChange={(e) => setBookForm({ ...bookForm, genre: e.target.value })}>
                <option value="">선택 안 함</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>현재 쪽</span>
                <input className="input" type="number" value={bookForm.current} onChange={(e) => setBookForm({ ...bookForm, current: e.target.value })} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>전체 쪽</span>
                <input className="input" type="number" value={bookForm.total} onChange={(e) => setBookForm({ ...bookForm, total: e.target.value })} />
              </label>
            </div>
            {bookForm.status === "완독" && (
              <>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>별점</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const filled = n <= (Number(bookForm.rating) || 0);
                      return (
                        <button
                          key={n}
                          type="button"
                          aria-label={`별점 ${n}점`}
                          aria-pressed={filled}
                          style={{ padding: 2, lineHeight: 0 }}
                          onClick={() =>
                            setBookForm({ ...bookForm, rating: bookForm.rating === String(n) ? "" : String(n) })
                          }
                        >
                          <Star
                            size={20}
                            fill={filled ? STAR_YELLOW : "none"}
                            style={{
                              color: filled ? STAR_YELLOW : "var(--color-gray-300)",
                              transition: "color 180ms cubic-bezier(0.2, 0, 0, 1)",
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>완독 소감 · 내 삶에 적용할 점</span>
                  <textarea className="input" rows={3} value={bookForm.review} onChange={(e) => setBookForm({ ...bookForm, review: e.target.value })} />
                </label>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn btn--tertiary btn--sm" onClick={() => setEditingBook(null)}>취소</button>
            <button className="btn btn--primary btn--sm" disabled={busy || !bookForm.title.trim()} onClick={saveBook}>저장</button>
          </div>
        </div>
      </Drawer>

      {books.length > 0 && (
        <div className="tabs">
          {["전체", ...GENRES.filter((g) => books.some((b) => b.data.genre === g))].map((g) => (
            <button key={g} className="tab" data-active={genreTab === g} onClick={() => setGenreTab(g)}>
              {g}
              <span className="ml-1.5 text-xs font-medium" style={{ color: "var(--color-gray-400)" }}>
                {g === "전체" ? books.length : books.filter((b) => b.data.genre === g).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {STATUSES.map((status) => {
        const visible = genreTab === "전체" ? books : books.filter((b) => b.data.genre === genreTab);
        const group = visible.filter((b) => (b.data.status || "읽는 중") === status);
        if (group.length === 0) return null;
        return (
          <section key={status}>
            <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--color-gray-500)" }}>
              {status} <span style={{ color: "var(--color-gray-400)" }}>{group.length}</span>
            </h2>
            <div className="flex flex-col gap-3">
              {group.map((book) => {
                const id = String(book.id);
                const bookNotes = notes
                  .filter((n) => String(n.data.book_id) === id)
                  .sort((a, b) => (b.data.date ?? "").localeCompare(a.data.date ?? ""));
                const cur = Number(book.data.current) || 0;
                const total = Number(book.data.total) || 0;
                const pct = total > 0 ? Math.min(100, Math.round((cur / total) * 100)) : null;
                const isOpen = open === id;
                return (
                  <div key={id} className="card">
                    <div className="flex items-start gap-4">
                      <div
                        className="book-cover"
                        style={{
                          position: "relative",
                          background: coverColor(book.data.title ?? ""),
                          transition: "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "rotate(-2deg) translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "";
                        }}
                      >
                        {book.data.cover && !brokenCovers[id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={book.data.cover}
                            alt={`${book.data.title} 표지`}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            onError={() => setBrokenCovers((b) => ({ ...b, [id]: true }))}
                          />
                        ) : (
                          book.data.title
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[16px] font-bold">{book.data.title}</span>
                          {book.data.author && (
                            <span className="text-[13px]" style={{ color: "var(--color-gray-500)" }}>{book.data.author}</span>
                          )}
                          {book.data.genre && (
                            <span className="chip chip--sm" style={genreTagStyle(book.data.genre)}>{book.data.genre}</span>
                          )}
                          {book.data.rating && (
                            <span className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Star
                                  key={n}
                                  size={13}
                                  fill={n <= Number(book.data.rating) ? STAR_YELLOW : "none"}
                                  style={{ color: n <= Number(book.data.rating) ? STAR_YELLOW : "var(--color-gray-300)" }}
                                />
                              ))}
                            </span>
                          )}
                        </div>
                        {pct !== null && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--nt-raised)" }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--nt-blue)" }} />
                            </div>
                            <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--nt-text-soft)" }}>
                              {pct}%
                            </span>
                            <input
                              className="input shrink-0 text-center tabular-nums"
                              style={{ width: 62, height: 30, padding: "0 4px", fontSize: 12 }}
                              type="number"
                              defaultValue={cur}
                              aria-label="현재 쪽 업데이트"
                              onBlur={(e) => {
                                if (e.target.value !== String(cur)) updateProgress(book, e.target.value);
                              }}
                            />
                            <span className="text-xs tabular-nums" style={{ color: "var(--nt-muted)" }}>/ {total}p</span>
                          </div>
                        )}
                        {book.data.review && (
                          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-gray-600)", whiteSpace: "pre-wrap" }}>
                            {book.data.review}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          className="btn btn--tertiary btn--sm btn--icon-only"
                          style={{ ["--btn-h" as string]: "32px" }}
                          aria-label="책 수정"
                          onClick={() => {
                            setEditingBook(id);
                            setBookForm({
                              title: book.data.title ?? "",
                              author: book.data.author ?? "",
                              status: book.data.status ?? "읽는 중",
                              total: book.data.total ?? "",
                              current: book.data.current ?? "",
                              rating: book.data.rating ?? "",
                              review: book.data.review ?? "",
                              genre: book.data.genre ?? "",
                              cover: book.data.cover ?? "",
                            });
                            origTitle.current = (book.data.title ?? "").trim();
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn--tertiary btn--sm btn--icon-only"
                          style={{ ["--btn-h" as string]: "32px" }}
                          aria-label="책 삭제"
                          disabled={busy}
                          onClick={async () => {
                            if (confirm(`'${book.data.title}'와 기록을 모두 삭제할까요?`)) {
                              for (const note of bookNotes) {
                                if (!(await post({ action: "delete", id: note.id }))) return;
                              }
                              await post({ action: "delete", id });
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <button
                      className="mt-3 flex items-center gap-1 text-[13px] font-semibold"
                      style={{ color: "var(--color-accent-500)" }}
                      onClick={() => {
                        const willOpen = !isOpen;
                        setOpen(willOpen ? id : null);
                        // 신규 작성 폼이 완전히 비어 있을 때만 독서록 양식 프리필 (기존 기록 수정은 건드리지 않음)
                        if (willOpen && !noteForm.range.trim() && !noteForm.quote.trim() && !noteForm.thought.trim()) {
                          setNoteForm({ range: "", quote: NOTE_TEMPLATE.quote, thought: NOTE_TEMPLATE.thought });
                        }
                      }}
                    >
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      읽기 기록 {bookNotes.length}개
                    </button>

                    {isOpen && (
                      <div className="anim-in mt-3 flex flex-col gap-3 border-t pt-4" style={{ borderColor: "var(--color-gray-100)" }}>
                        <div className="flex flex-col gap-2 rounded-xl p-4" style={{ background: "var(--color-gray-50)" }}>
                          <input
                            className="input"
                            placeholder="오늘 읽은 범위 (예: p.45~78, 3장)"
                            value={noteForm.range}
                            onChange={(e) => setNoteForm({ ...noteForm, range: e.target.value })}
                          />
                          <textarea
                            className="input"
                            rows={6}
                            placeholder="인상 깊은 문장이나 아이디어"
                            value={noteForm.quote}
                            onChange={(e) => setNoteForm({ ...noteForm, quote: e.target.value })}
                          />
                          <textarea
                            className="input"
                            rows={4}
                            placeholder="내 생각, 깨달음"
                            value={noteForm.thought}
                            onChange={(e) => setNoteForm({ ...noteForm, thought: e.target.value })}
                          />
                          <button className="btn btn--primary btn--sm self-end" disabled={busy} onClick={() => addNote(id)}>
                            기록 남기기
                          </button>
                        </div>
                        {bookNotes.map((n) =>
                          editingNote === String(n.id) ? (
                            <div key={n.id} className="flex flex-col gap-2 rounded-xl border p-4" style={{ borderColor: "var(--color-gray-200)" }}>
                              <p className="text-xs font-bold tabular-nums" style={{ color: "var(--color-accent-500)" }}>
                                {n.data.date} 기록 수정
                              </p>
                              <input
                                className="input"
                                placeholder="읽은 범위 (예: p.45~78, 3장)"
                                value={noteEditForm.range}
                                onChange={(e) => setNoteEditForm({ ...noteEditForm, range: e.target.value })}
                              />
                              <textarea
                                className="input"
                                rows={2}
                                placeholder="인상 깊은 문장이나 아이디어"
                                value={noteEditForm.quote}
                                onChange={(e) => setNoteEditForm({ ...noteEditForm, quote: e.target.value })}
                              />
                              <textarea
                                className="input"
                                rows={2}
                                placeholder="내 생각, 깨달음"
                                value={noteEditForm.thought}
                                onChange={(e) => setNoteEditForm({ ...noteEditForm, thought: e.target.value })}
                              />
                              <div className="flex justify-end gap-2">
                                <button className="btn btn--tertiary btn--sm" onClick={() => setEditingNote(null)}>취소</button>
                                <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => saveNoteEdit(n)}>저장</button>
                              </div>
                            </div>
                          ) : (
                          <div key={n.id} className="flex flex-col gap-1.5 rounded-xl border p-4" style={{ borderColor: "var(--color-gray-200)" }}>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold tabular-nums" style={{ color: "var(--color-accent-500)" }}>
                                {n.data.date} {n.data.range && `· ${n.data.range}`}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  aria-label="기록 수정"
                                  style={{ color: "var(--color-gray-400)" }}
                                  onClick={() => {
                                    setEditingNote(String(n.id));
                                    setNoteEditForm({
                                      range: n.data.range ?? "",
                                      quote: n.data.quote ?? "",
                                      thought: n.data.thought ?? "",
                                    });
                                  }}
                                >
                                  <Pencil size={13} />
                                </button>
                                <ConfirmButton size={24} onConfirm={() => post({ action: "delete", id: n.id })} />
                              </div>
                            </div>
                            {n.data.quote && (
                              <p className="border-l-2 pl-3 text-sm leading-relaxed" style={{ borderColor: "var(--color-accent-300)", color: "var(--color-gray-700)", whiteSpace: "pre-wrap" }}>
                                {n.data.quote}
                              </p>
                            )}
                            {n.data.thought && (
                              <p className="text-sm leading-relaxed" style={{ color: "var(--color-gray-600)", whiteSpace: "pre-wrap" }}>
                                {n.data.thought}
                              </p>
                            )}
                          </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {books.length === 0 && editingBook === null && (
        <p className="flex items-center gap-2 text-sm" style={{ color: "var(--color-gray-400)" }}>
          <Book size={15} /> 첫 책을 추가해 보세요. 완독이 목표가 아니라 기록이 목표다.
        </p>
      )}
    </div>
  );
}
