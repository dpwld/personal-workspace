"use client";

import { requestMutation } from "@/lib/client-request.mjs";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import ConfirmButton from "@/components/confirm-button";
import Drawer from "@/components/drawer";
import ImageAttach from "@/components/image-attach";
import { MemoEditor } from "@/components/memo-editor";
import MemoView from "@/components/memo-view";
import { Item, ddayLabel, todaySeoul } from "@/lib/types";

// OneNote 노트북 구조: 과정(노트북) → 주차(섹션) → 기록(페이지)
// + Notion Student Dashboard의 Due within the week / month

const COURSE_COLORS = ["#1571F3", "#14B8A6", "#8B5CF6", "#F97316", "#EC4899", "#0EA5E9", "#27C961"];
const DEFAULT_COURSES = ["온라인 강의", "자격증 준비", "영어 시험"];

function courseColor(name: string, i: number): string {
  return COURSE_COLORS[i % COURSE_COLORS.length] ?? COURSE_COLORS[0];
}

function parseImages(s?: string): string[] {
  try {
    const arr = JSON.parse(s ?? "[]");
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// HTML에서 태그를 걷어낸 평문 (저장 가능 여부 판단용)
function plainText(s?: string): string {
  if (!s) return "";
  if (!s.includes("<")) return s;
  return s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
}

export default function StudyClient({
  courses,
  assignments,
  lectures,
}: {
  courses: Item[];
  assignments: Item[];
  lectures: Item[];
}) {
  const router = useRouter();
  const today = todaySeoul();
  const courseNames = courses.map((c) => c.data.name).filter(Boolean);
  const [selected, setSelected] = useState<string>(courseNames[0] ?? "");
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 수업 기록 에디터
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState({ week: "1", title: "" });
  const [noteBody, setNoteBody] = useState("");
  const noteBodyRef = useRef("");
  const [images, setImages] = useState<string[]>([]);

  // 마감 일정 수정
  const [editingDue, setEditingDue] = useState<Item | null>(null);
  const [dueEdit, setDueEdit] = useState({ name: "", course: "", date: "", status: "예정" });

  // 과정 추가
  const [addingCourse, setAddingCourse] = useState(false);
  const [courseName, setCourseName] = useState("");

  // 과정 수정
  const [editingCourse, setEditingCourse] = useState<Item | null>(null);
  const [courseEdit, setCourseEdit] = useState({ name: "", status: "진행 중" });

  // 일정 추가
  const [addingDue, setAddingDue] = useState(false);
  const [dueForm, setDueForm] = useState({ name: "", date: "" });

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

  async function createDefaults() {
    setBusy(true);
    setSaveError(null);
    try {
      for (const name of DEFAULT_COURSES.filter((name) => !courseNames.includes(name))) {
        const error = await requestMutation("/api/items", { action: "add", kind: "course", data: { name, status: "진행 중" } });
        if (error) {
          setSaveError(error);
          return;
        }
      }
      setSelected(DEFAULT_COURSES[0]);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  async function saveNote() {
    const html = noteBodyRef.current;
    const hasBody = plainText(html).length > 0 || html.includes("<img");
    if (!selected || (!hasBody && images.length === 0)) return;
    const data = {
      course: selected,
      week: noteForm.week,
      title: noteForm.title,
      body: html,
      date: todaySeoul(),
      images: JSON.stringify(images),
    };
    const saved = editingNote === "new"
      ? await post({ action: "add", kind: "lecture", data })
      : await post({ action: "update", id: editingNote, data });
    if (!saved) return;
    setEditingNote(null);
    setImages([]);
    setSelectedWeek(Number(noteForm.week));
  }

  function linkedCount(courseNameToCheck: string) {
    const lectureCount = lectures.filter((l) => l.data.course === courseNameToCheck).length;
    const dueCount = assignments.filter((a) => a.data.course === courseNameToCheck).length;
    return { lectureCount, dueCount };
  }

  async function saveCourse() {
    if (!editingCourse || !courseEdit.name.trim()) return;
    const newName = courseEdit.name.trim();
    const oldName = editingCourse.data.name ?? "";
    if (newName !== oldName) {
      const { lectureCount, dueCount } = linkedCount(oldName);
      if (
        lectureCount + dueCount > 0 &&
        !confirm(
          `이름을 바꾸면 기존 이름으로 연결된 수업 기록 ${lectureCount}개, 마감 일정 ${dueCount}개는 이 과정 아래에 보이지 않게 됩니다. 계속할까요?`
        )
      )
        return;
    }
    if (!(await post({
      action: "update",
      id: editingCourse.id,
      data: { ...editingCourse.data, name: newName, status: courseEdit.status },
    }))) return;
    setEditingCourse(null);
    setSelected(newName);
  }

  async function removeCourse() {
    if (!editingCourse) return;
    const name = editingCourse.data.name ?? "";
    const { lectureCount, dueCount } = linkedCount(name);
    let msg = `'${name}' 과정을 삭제할까요?`;
    if (lectureCount + dueCount > 0) {
      msg += `\n이 과정에 연결된 수업 기록 ${lectureCount}개, 마감 일정 ${dueCount}개는 삭제되지 않고 그대로 남습니다.`;
    }
    if (!confirm(msg)) return;
    const remaining = courses
      .filter((c) => c.id !== editingCourse.id)
      .map((c) => c.data.name)
      .filter(Boolean);
    if (!(await post({ action: "delete", id: editingCourse.id }))) return;
    setEditingCourse(null);
    setSelected(remaining[0] ?? "");
    setSelectedWeek(null);
  }

  const selectedCourse = courses.find((c) => c.data.name === selected);
  const courseLectures = lectures.filter((l) => l.data.course === selected);
  const weeks = [...new Set(courseLectures.map((l) => Number(l.data.week) || 1))].sort((a, b) => b - a);
  const activeWeek = selectedWeek !== null && weeks.includes(selectedWeek) ? selectedWeek : (weeks[0] ?? null);
  const weekNotes = courseLectures
    .filter((l) => (Number(l.data.week) || 1) === activeWeek)
    .sort((a, b) => (b.data.date ?? "").localeCompare(a.data.date ?? ""));

  const openDues = assignments
    .filter((a) => a.data.status !== "완료" && a.data.date)
    .sort((a, b) => a.data.date.localeCompare(b.data.date));
  const weekEnd = new Date(new Date(today).getTime() + 7 * 86400_000).toISOString().slice(0, 10);
  const monthEnd = new Date(new Date(today).getTime() + 31 * 86400_000).toISOString().slice(0, 10);
  const dueWeek = openDues.filter((a) => a.data.date <= weekEnd);
  const dueMonth = openDues.filter((a) => a.data.date > weekEnd && a.data.date <= monthEnd);
  const dueLater = openDues.filter((a) => a.data.date > monthEnd);

  // 수정 중인 기록의 원래 날짜 (신규는 오늘) — 헤더 프로퍼티 줄 표시용
  const editingLecture =
    editingNote && editingNote !== "new" ? lectures.find((l) => String(l.id) === editingNote) : undefined;
  const noteDate = editingLecture?.data.date ?? today;
  const noteWeek = Math.max(1, Number(noteForm.week) || 1);
  const stepWeek = (d: number) => setNoteForm({ ...noteForm, week: String(Math.max(1, noteWeek + d)) });
  const stepBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 18, height: 18, borderRadius: 4, border: "none", background: "none",
    color: "inherit", cursor: "pointer", padding: 0,
  };

  const noteEditor = (
    <div className="flex flex-col gap-3">
      {/* Notion 페이지 헤더: 보더 없는 큰 제목 + 프로퍼티 줄 */}
      <div>
        <input
          placeholder="수업 제목"
          value={noteForm.title}
          onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
          style={{
            width: "100%", fontSize: 27, fontWeight: 700, lineHeight: 1.3,
            background: "transparent", border: 0, outline: "none", padding: "2px 0",
          }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--nt-muted)" }}>
          <span
            className="chip chip--sm chip--surface flex items-center gap-1 tabular-nums"
            style={{ color: "var(--nt-muted)" }}
          >
            <button type="button" style={stepBtn} aria-label="주차 줄이기" onClick={() => stepWeek(-1)}>
              <Minus size={11} />
            </button>
            {noteWeek}주차
            <button type="button" style={stepBtn} aria-label="주차 늘리기" onClick={() => stepWeek(1)}>
              <Plus size={11} />
            </button>
          </span>
          <span className="chip chip--sm chip--surface tabular-nums" style={{ color: "var(--nt-muted)" }}>
            {noteDate}
          </span>
        </div>
      </div>
      <div>
        <MemoEditor
          key={editingNote ?? "closed"}
          value={noteBody}
          minHeight="calc(100vh - 320px)"
          onSave={(html) => {
            noteBodyRef.current = html;
          }}
        />
      </div>
      <ImageAttach urls={images} onChange={setImages} />
      <div className="flex justify-end gap-2">
        <button className="btn btn--tertiary btn--sm" onClick={() => setEditingNote(null)}>취소</button>
        <button className="btn btn--primary btn--sm" disabled={busy} onClick={saveNote}>저장</button>
      </div>
    </div>
  );

  const saveErrorAlert = saveError && (
    <p className="alert text-sm" role="alert" style={{ color: "var(--color-danger)" }}>{saveError}</p>
  );

  return (
    <div className="flex flex-col gap-6">
      {editingNote === null && editingCourse === null && editingDue === null && saveErrorAlert}
      <div className="page-head flex items-start justify-between gap-3" style={{ marginBottom: 0 }}>
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap size={18} style={{ color: "var(--color-accent-500)" }} />
            <h1 className="page-title">학업</h1>
          </div>
          <p className="page-desc">과정은 노트북, 주차는 섹션, 기록은 페이지. 이번 주 마감 {dueWeek.length}건.</p>
        </div>
      </div>

      {/* 과정(노트북) 탭 */}
      {courses.length === 0 ? (
        <div className="card flex flex-col items-start gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} style={{ color: "var(--color-accent-500)" }} />
            <p className="text-[15px] font-bold">아직 과정이 없어요</p>
          </div>
          <p className="text-sm" style={{ color: "var(--color-gray-500)" }}>
            지금 계획에 맞는 기본 과정 3개(온라인 강의, 자격증 준비, 영어 시험)로 시작할까요?
          </p>
          <div className="flex gap-2">
            <button className="btn btn--primary btn--sm" disabled={busy} onClick={createDefaults}>
              기본 과정 3개 만들기
            </button>
            <button className="btn btn--tertiary btn--sm" onClick={() => setAddingCourse(true)}>직접 만들기</button>
          </div>
          {addingCourse && (
            <div className="flex w-full gap-2">
              <input className="input" placeholder="과정명" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
              <button
                className="btn btn--primary btn--sm shrink-0"
                disabled={busy || !courseName.trim()}
                onClick={async () => {
                  if (!(await post({ action: "add", kind: "course", data: { name: courseName.trim(), status: "진행 중" } }))) return;
                  setSelected(courseName.trim());
                  setCourseName("");
                  setAddingCourse(false);
                }}
              >
                추가
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="course-tabs">
          {courses.map((c, i) => {
            const name = c.data.name;
            const color = courseColor(name, i);
            const active = selected === name;
            const count = lectures.filter((l) => l.data.course === name).length;
            return (
              <button
                key={c.id}
                className="course-tab"
                data-active={active}
                style={{ borderTopColor: color }}
                onClick={() => {
                  setSelected(name);
                  setSelectedWeek(null);
                  setEditingNote(null);
                }}
              >
                <span className="font-bold">{name}</span>
                <span
                  className="chip chip--sm tabular-nums"
                  style={{ background: "var(--nt-tag-gray-bg)", color: "var(--nt-tag-gray-fg)" }}
                >
                  기록 {count}
                </span>
              </button>
            );
          })}
          {selectedCourse && (
            <button
              className="btn btn--tertiary btn--sm btn--icon-only self-center"
              style={{ ["--btn-h" as string]: "32px" }}
              aria-label="선택한 과정 수정"
              onClick={() => {
                setEditingCourse(selectedCourse);
                setCourseEdit({
                  name: selectedCourse.data.name ?? "",
                  status: selectedCourse.data.status ?? "진행 중",
                });
              }}
            >
              <Pencil size={14} />
            </button>
          )}
          {addingCourse ? (
            <div className="flex items-center gap-2 px-2">
              <input
                className="input"
                style={{ width: 150, height: 38 }}
                placeholder="과정명"
                autoFocus
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && courseName.trim()) {
                    if (!(await post({ action: "add", kind: "course", data: { name: courseName.trim(), status: "진행 중" } }))) return;
                    setSelected(courseName.trim());
                    setCourseName("");
                    setAddingCourse(false);
                  }
                }}
              />
              <button className="btn btn--tertiary btn--sm" onClick={() => setAddingCourse(false)}>취소</button>
            </div>
          ) : (
            <button className="course-tab course-tab--add" onClick={() => setAddingCourse(true)} aria-label="과정 추가">
              <Plus size={15} />
            </button>
          )}
        </div>
      )}

      {/* 노트북 본문: 주차 레일 + 페이지 */}
      {selected && courses.length > 0 && (
        <div className="notebook">
          <div className="notebook__rail">
            <p className="sidebar__label" style={{ padding: "0 0 6px" }}>주차</p>
            {weeks.length === 0 && (
              <p className="px-1 text-xs" style={{ color: "var(--nt-muted)" }}>기록 없음</p>
            )}
            {weeks.map((w) => (
              <button
                key={w}
                className="notebook__week"
                data-active={w === activeWeek}
                onClick={() => setSelectedWeek(w)}
              >
                {w}주차
              </button>
            ))}
            <button
              className="notebook__week notebook__week--add"
              onClick={() => {
                const next = weeks.length > 0 ? Math.max(...weeks) + 1 : 1;
                setEditingNote("new");
                setNoteForm({ week: String(next), title: "" });
                setNoteBody("");
                noteBodyRef.current = "";
                setImages([]);
              }}
            >
              <Plus size={13} /> 새 주차
            </button>
          </div>

          <div className="min-w-0 flex-1 flex flex-col gap-3">
            <button
              className="btn btn--secondary btn--sm self-start"
              onClick={() => {
                setEditingNote("new");
                setNoteForm({ week: String(activeWeek ?? 1), title: "" });
                setNoteBody("");
                noteBodyRef.current = "";
                setImages([]);
              }}
            >
              <Plus size={15} /> {activeWeek ? `${activeWeek}주차에 기록 추가` : "첫 기록 남기기"}
            </button>
            {weekNotes.map((l, idx) => {
              const id = String(l.id);
              const imgs = parseImages(l.data.images);
              return (
                <div
                  key={`${selected}-${activeWeek}-${id}`}
                  className="card anim-in hover-lift"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[15px] font-bold">
                      {l.data.title || "수업 기록"}
                      <span className="ml-2 text-xs font-medium tabular-nums" style={{ color: "var(--nt-muted)" }}>
                        {l.data.date}
                      </span>
                    </p>
                    <div className="flex gap-1">
                      <button
                        className="btn btn--tertiary btn--sm btn--icon-only"
                        style={{ ["--btn-h" as string]: "28px" }}
                        aria-label="수정"
                        onClick={() => {
                          setEditingNote(id);
                          setNoteForm({ week: l.data.week ?? "1", title: l.data.title ?? "" });
                          setNoteBody(l.data.body ?? "");
                          noteBodyRef.current = l.data.body ?? "";
                          setImages(imgs);
                        }}
                      >
                        <Pencil size={12} />
                      </button>
                      <ConfirmButton disabled={busy} onConfirm={() => post({ action: "delete", id })} />
                    </div>
                  </div>
                  {l.data.body && <MemoView html={l.data.body} />}
                  {imgs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {imgs.map((u, i) => (
                        <a key={u + i} href={u} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={u}
                            alt={`수업 캡처 ${i + 1}`}
                            className="h-36 w-auto rounded-xl border object-cover"
                            style={{ borderColor: "var(--color-gray-200)" }}
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {weekNotes.length === 0 && editingNote === null && weeks.length > 0 && (
              <p className="text-sm" style={{ color: "var(--nt-muted)" }}>이 주차엔 아직 기록이 없어요.</p>
            )}
          </div>
        </div>
      )}

      {/* 마감 일정: Notion Student Dashboard 스타일 */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title" style={{ marginBottom: 0 }}>마감 일정</h2>
          {!addingDue && (
            <button className="btn btn--tertiary btn--sm" onClick={() => setAddingDue(true)}>
              <Plus size={14} /> 일정 추가
            </button>
          )}
        </div>
        {addingDue && (
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              className="input min-w-40 flex-1"
              style={{ width: "auto" }}
              placeholder="예: SQLD 접수 마감"
              value={dueForm.name}
              onChange={(e) => setDueForm({ ...dueForm, name: e.target.value })}
            />
            <input
              className="input"
              style={{ width: 150, flexGrow: 0 }}
              type="date"
              value={dueForm.date}
              onChange={(e) => setDueForm({ ...dueForm, date: e.target.value })}
            />
            <button
              className="btn btn--primary btn--sm shrink-0"
              disabled={busy || !dueForm.name.trim() || !dueForm.date}
              onClick={async () => {
                if (!(await post({
                  action: "add",
                  kind: "assignment",
                  data: { name: dueForm.name.trim(), course: selected, date: dueForm.date, status: "예정" },
                }))) return;
                setDueForm({ name: "", date: "" });
                setAddingDue(false);
              }}
            >
              추가
            </button>
            <button className="btn btn--tertiary btn--sm shrink-0" onClick={() => setAddingDue(false)}>취소</button>
          </div>
        )}
        {[
          { label: "이번 주 마감", rows: dueWeek, color: "var(--nt-red)" },
          { label: "이번 달 마감", rows: dueMonth, color: "#F7C325" },
          { label: "그 이후", rows: dueLater, color: "var(--nt-muted)" },
        ].map(
          (g) =>
            g.rows.length > 0 && (
              <div key={g.label} className="mb-3">
                <p className="mb-1.5 text-[13px] font-bold" style={{ color: g.color }}>{g.label}</p>
                {g.rows.map((a) => (
                  <div key={a.id} className="task-row transition-colors hover:bg-[var(--nt-hover)]">
                    <span className="chip chip--sm chip--accent tabular-nums shrink-0">{ddayLabel(a.data.date, today)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{a.data.name}</p>
                      <p className="text-xs" style={{ color: "var(--nt-muted)" }}>
                        {a.data.date}{a.data.course ? ` · ${a.data.course}` : ""}
                      </p>
                    </div>
                    <button
                      className="btn btn--tertiary btn--sm"
                      style={{ height: 28, padding: "0 10px", fontSize: 12 }}
                      disabled={busy}
                      onClick={() => post({ action: "update", id: a.id, data: { ...a.data, status: "완료" } })}
                    >
                      완료
                    </button>
                    <button
                      className="btn btn--tertiary btn--sm btn--icon-only"
                      style={{ ["--btn-h" as string]: "28px" }}
                      aria-label="수정"
                      onClick={() => {
                        setEditingDue(a);
                        setDueEdit({
                          name: a.data.name ?? "",
                          course: a.data.course ?? "",
                          date: a.data.date ?? "",
                          status: a.data.status ?? "예정",
                        });
                      }}
                    >
                      <Pencil size={12} />
                    </button>
                    <ConfirmButton disabled={busy} onConfirm={() => post({ action: "delete", id: a.id })} />
                  </div>
                ))}
              </div>
            )
        )}
        {openDues.length === 0 && !addingDue && (
          <p className="text-sm" style={{ color: "var(--color-gray-400)" }}>
            다가오는 마감이 없어요. OMSA 지원 마감이나 자격증 접수일을 등록해두세요.
          </p>
        )}
      </section>

      <Drawer
        open={editingNote !== null}
        onClose={() => setEditingNote(null)}
        title="수업 기록"
        width={1100}
      >
        {saveErrorAlert}
        {noteEditor}
      </Drawer>

      <Drawer open={editingCourse !== null} onClose={() => setEditingCourse(null)} title="과정 수정" width={440}>
        {saveErrorAlert}
        <div className="flex flex-col gap-3">
          <label>
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>과정명</span>
            <input
              className="input"
              value={courseEdit.name}
              onChange={(e) => setCourseEdit({ ...courseEdit, name: e.target.value })}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>상태</span>
            <select
              className="input"
              value={courseEdit.status}
              onChange={(e) => setCourseEdit({ ...courseEdit, status: e.target.value })}
            >
              {["진행 중", "완료"]
                .concat(["진행 중", "완료"].includes(courseEdit.status) ? [] : [courseEdit.status])
                .map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
            </select>
          </label>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button className="btn btn--tertiary btn--sm" disabled={busy} onClick={removeCourse}>
              <Trash2 size={14} /> 삭제
            </button>
            <div className="flex gap-2">
              <button className="btn btn--tertiary btn--sm" onClick={() => setEditingCourse(null)}>취소</button>
              <button
                className="btn btn--primary btn--sm"
                disabled={busy || !courseEdit.name.trim()}
                onClick={saveCourse}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </Drawer>

      <Drawer open={editingDue !== null} onClose={() => setEditingDue(null)} title="일정 수정" width={440}>
        {saveErrorAlert}
        <div className="flex flex-col gap-3">
          <label>
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>이름</span>
            <input
              className="input"
              value={dueEdit.name}
              onChange={(e) => setDueEdit({ ...dueEdit, name: e.target.value })}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>과정</span>
            <input
              className="input"
              placeholder="예: 온라인 강의"
              value={dueEdit.course}
              onChange={(e) => setDueEdit({ ...dueEdit, course: e.target.value })}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>마감일</span>
            <input
              className="input"
              type="date"
              value={dueEdit.date}
              onChange={(e) => setDueEdit({ ...dueEdit, date: e.target.value })}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>상태</span>
            <select
              className="input"
              value={dueEdit.status}
              onChange={(e) => setDueEdit({ ...dueEdit, status: e.target.value })}
            >
              {["예정", "진행 중", "완료"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn btn--tertiary btn--sm" onClick={() => setEditingDue(null)}>취소</button>
            <button
              className="btn btn--primary btn--sm"
              disabled={busy || !dueEdit.name.trim() || !dueEdit.date}
              onClick={async () => {
                if (!editingDue) return;
                if (!(await post({
                  action: "update",
                  id: editingDue.id,
                  data: { ...editingDue.data, name: dueEdit.name.trim(), course: dueEdit.course.trim(), date: dueEdit.date, status: dueEdit.status },
                }))) return;
                setEditingDue(null);
              }}
            >
              저장
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
