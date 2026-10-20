"use client";

import { requestMutation } from "@/lib/client-request.mjs";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { routineDayLabel } from "@/lib/routine-schedule.mjs";
import { cheerMessage, routineEmoji, signalLevel, SIGNAL_COLORS } from "@/lib/celebrate";
import Mascot, { mascotMood } from "@/components/mascot";

// 체크 버스트 조각들 (방향·색은 고정, 색 일부는 루틴 색으로 덮어씀)
const BURST_PIECES = [
  { dx: "20px", dy: "-14px" }, { dx: "-20px", dy: "-12px" }, { dx: "15px", dy: "17px" },
  { dx: "-16px", dy: "15px" }, { dx: "0px", dy: "-22px" }, { dx: "22px", dy: "3px" },
  { dx: "-23px", dy: "2px" }, { dx: "2px", dy: "21px" },
];
const BURST_COLORS = ["#f2c94c", "#c7b9ff", "#7bd88f", "#ff9ec4"];
const CONFETTI = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 6.3 + 3) % 100}%`,
  color: BURST_COLORS[i % BURST_COLORS.length],
  delay: i * 90,
}));
import PushToggle from "@/components/push-toggle";
import { Routine, ROUTINE_COLORS } from "@/lib/types";
import Drawer from "@/components/drawer";

function sectionOf(time: string): string {
  const h = Number(time.slice(0, 2));
  if (h < 12) return "아침";
  if (h < 18) return "낮";
  return "저녁";
}

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
function weekdayOf(date: string): string {
  return WEEKDAY_KO[new Date(`${date}T12:00:00+09:00`).getUTCDay()];
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function RoutinesClient({
  date,
  today,
  routines,
  doneIds,
  weekStats,
  pastStreak,
}: {
  date: string;
  today: string;
  routines: Routine[];
  doneIds: string[];
  weekStats: { date: string; total: number; done: number }[];
  pastStreak: number;
}) {
  const router = useRouter();
  const [done, setDone] = useState<Set<string>>(new Set(doneIds));
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", time: "07:00", color: "blue", desc: "" });
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [burstId, setBurstId] = useState<string | null>(null);
  const [cheer, setCheer] = useState<{ n: number; text: string } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const pendingRoutines = useRef(new Set<string>());

  async function post(body: object) {
    setBusy(true);
    setSaveError(null);
    try {
      const error = await requestMutation("/api/routines", body);
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

  async function toggle(id: string) {
    if (pendingRoutines.current.has(id)) return;
    pendingRoutines.current.add(id);
    const next = new Set(done);
    const willDone = !next.has(id);
    if (willDone) next.add(id);
    else next.delete(id);
    setDone(next);
    if (willDone) {
      setPulseId(id);
      setTimeout(() => setPulseId(null), 200);
      setBurstId(id);
      setTimeout(() => setBurstId((cur) => (cur === id ? null : cur)), 700);
      const n = routines.filter((r) => next.has(String(r.id))).length;
      if (n === routines.length && routines.length > 0) {
        setCheer(null);
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 4200);
      } else {
        const token = Date.now();
        setCheer({ n: token, text: cheerMessage(n, routines.length) });
        setTimeout(() => setCheer((cur) => (cur?.n === token ? null : cur)), 2000);
      }
    }
    try {
      if (!(await post({ action: "check", date, id, done: willDone }))) {
        setDone((current) => {
          const restored = new Set(current);
          if (willDone) restored.delete(id);
          else restored.add(id);
          return restored;
        });
        setPulseId(null);
        setBurstId(null);
        setCheer(null);
        setCelebrate(false);
      }
    } finally {
      pendingRoutines.current.delete(id);
    }
  }

  async function submitEdit() {
    const saved = editing === "new"
      ? await post({ action: "add", ...form })
      : await post({ action: "update", id: editing, ...form });
    if (!saved) return;
    setEditing(null);
  }

  const doneCount = routines.filter((r) => done.has(String(r.id))).length;
  const sections = ["아침", "낮", "저녁"];
  const isToday = date === today;
  const isFuture = date > today;

  const editorForm = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input
          className="input basis-32"
          style={{ width: "auto", flexGrow: 0 }}
          type="time"
          value={form.time}
          onChange={(e) => setForm({ ...form, time: e.target.value })}
        />
        <input
          className="input min-w-40 flex-1"
          style={{ width: "auto" }}
          placeholder="루틴 이름"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <textarea
        className="input"
        rows={3}
        placeholder="구체적으로 뭘 하는지 (예: 공복 유산균, 식후 비타민D·오메가3)"
        value={form.desc}
        onChange={(e) => setForm({ ...form, desc: e.target.value })}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {Object.entries(ROUTINE_COLORS).map(([key, hex]) => (
          <button
            key={key}
            aria-label={`색상 ${key}`}
            className="h-7 w-7 rounded-full"
            style={{
              background: hex,
              outline: form.color === key ? "2px solid var(--color-common-black)" : "none",
              outlineOffset: 2,
            }}
            onClick={() => setForm({ ...form, color: key })}
          />
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button className="btn btn--tertiary btn--sm" onClick={() => setEditing(null)}>취소</button>
        <button className="btn btn--primary btn--sm" disabled={busy || !form.title.trim()} onClick={submitEdit}>
          저장
        </button>
      </div>
    </div>
  );

  const pct = routines.length > 0 ? (doneCount / routines.length) * 100 : 0;
  const level = signalLevel(doneCount, routines.length);
  const streak = pastStreak + (isToday && level === "green" ? 1 : 0);

  const saveErrorAlert = saveError && (
    <p className="alert text-sm" role="alert" style={{ color: "var(--color-danger)" }}>{saveError}</p>
  );

  return (
    <div className="flex flex-col gap-5">
      {editing === null && saveErrorAlert}
      <div className="page-head flex flex-wrap items-center justify-between gap-2" style={{ marginBottom: 0 }}>
        <div className="routine-datebar flex items-center">
          <Link
            href={`/routines?date=${shiftDate(date, -7)}`}
            className="btn btn--tertiary btn--sm btn--icon-only"
            aria-label="일주일 전"
          >
            <ChevronsLeft size={15} />
          </Link>
          <Link
            href={`/routines?date=${shiftDate(date, -1)}`}
            className="btn btn--tertiary btn--sm btn--icon-only"
            aria-label="이전 날"
          >
            <ChevronLeft size={15} />
          </Link>
          <h1 className="routine-date page-title tabular-nums flex items-center gap-2">
            <Clock3 size={18} style={{ color: "var(--color-accent-500)" }} />
            {date} ({weekdayOf(date)})
            {isToday && <span className="ml-2 text-sm font-semibold" style={{ color: "var(--color-accent-500)" }}>오늘</span>}
          </h1>
          <Link
              href={`/routines?date=${shiftDate(date, 1)}`}
              className="btn btn--tertiary btn--sm btn--icon-only"
              aria-label="다음 날"
            >
              <ChevronRight size={15} />
            </Link>
          <Link
            href={`/routines?date=${shiftDate(date, 7)}`}
            className="btn btn--tertiary btn--sm btn--icon-only"
            aria-label="일주일 후"
          >
            <ChevronsRight size={15} />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <PushToggle />
          <button className="btn btn--tertiary btn--sm" onClick={() => { setEditMode(!editMode); setEditing(null); }}>
            {editMode ? "완료" : "편집"}
          </button>
        </div>
      </div>

      <p className="text-sm" style={{ color: "var(--nt-muted)" }}>{routineDayLabel(date)} {isFuture ? "예정 루틴" : "루틴"} · 날짜에 맞춰 자동으로 표시돼요.</p>
      {!isToday && <Link href="/routines" className="text-sm self-start">오늘로 돌아가기</Link>}
      <section className="ach card card--tight" aria-label="달성도">
        <div className="ach__top">
          <span className="mascot-hop" key={cheer?.n ?? (celebrate ? -1 : 0)}>
            <Mascot mood={mascotMood(doneCount, routines.length)} size={46} />
          </span>
          <span className="signal" aria-label={`오늘 신호등: ${level}`}>
            {(["red", "yellow", "green"] as const).map((c) => (
              <i key={c} data-on={level === c} style={{ ["--sc" as string]: SIGNAL_COLORS[c] }} />
            ))}
          </span>
          <strong className="ach__pct">
            {Math.round(pct)}<em>%</em>
          </strong>
          <span className="ach__count tabular-nums">{doneCount}/{routines.length}</span>
          <span className="ach__streak">
            {streak > 0 ? `🔥 ${streak}일 연속 초록불` : "80% 채우면 초록불이 켜져요"}
          </span>
        </div>
        <div
          style={{ height: 6, borderRadius: 999, background: "var(--color-gray-100)", overflow: "hidden" }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 999,
              background: level === "green" ? SIGNAL_COLORS.green : "var(--color-accent-500)",
              width: `${pct}%`,
              transition: "width 240ms cubic-bezier(0.2,0,0,1), background 240ms",
            }}
          />
        </div>
        <div className="wk" aria-label="최근 7일 달성도">
          {weekStats.map((s) => {
            const isOpen = s.date === date;
            const t = isOpen ? routines.length : s.total;
            const d = isOpen ? doneCount : s.done;
            const lv = signalLevel(d, t);
            return (
              <Link key={s.date} href={`/routines?date=${s.date}`} data-open={isOpen} title={`${s.date} · ${d}/${t}`}>
                <span className="wk__dot" style={{ background: SIGNAL_COLORS[lv], opacity: lv === "zero" || lv === "none" ? 0.35 : 1 }} />
                <small>{weekdayOf(s.date)}</small>
              </Link>
            );
          })}
        </div>
      </section>

      {sections.map((sec) => {
        const secRoutines = routines.filter((r) => sectionOf(r.time) === sec);
        if (secRoutines.length === 0) return null;
        const secDone = secRoutines.filter((r) => done.has(String(r.id))).length;
        return (
          <section key={sec}>
            <h2 className="mb-2 flex items-baseline gap-1.5 text-[13px] font-bold" style={{ color: "var(--color-gray-500)" }}>
              {sec}
              <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--color-gray-400)" }}>
                {secDone}/{secRoutines.length}
              </span>
            </h2>
            <div className="flex flex-col gap-2">
              {secRoutines.map((r) => {
                const id = String(r.id);
                const checked = done.has(id);
                const color = ROUTINE_COLORS[r.color] ?? ROUTINE_COLORS.blue;
                const desc = id === "0f129e64-9f22-4c3f-b5af-e299407177ba"
                  ? [...(r.desc ?? "").split("\n").slice(0, 2), [
                      "일요일 밀린 공부 · 주간 점검", "월요일 R", "화요일 L", "수요일 S",
                      "목요일 W", "금요일 R·L 복습", "토요일 S·W 복습",
                    ][new Date(`${date}T12:00:00+09:00`).getUTCDay()]].join("\n")
                  : r.desc;
                return (
                  <div
                    key={id}
                    className="card card--tight flex items-center gap-3"
                    style={{
                      borderLeft: `4px solid ${color}`,
                      opacity: checked ? 0.55 : 1,
                      padding: "12px 16px",
                    }}
                  >
                    <button
                      aria-label={checked ? "체크 해제" : "체크"}
                      className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px]"
                      style={{
                        border: `2px solid ${checked ? color : "var(--color-gray-300)"}`,
                        background: checked ? color : "transparent",
                        overflow: "visible",
                        transform: pulseId === id ? "scale(1.05)" : "scale(1)",
                        transition:
                          "background 180ms cubic-bezier(0.2,0,0,1), transform 180ms cubic-bezier(0.2,0,0,1)",
                      }}
                      onClick={() => toggle(id)}
                    >
                      {checked && (
                        <span className={burstId === id ? "rstamp" : undefined}>{routineEmoji(r.title)}</span>
                      )}
                      {burstId === id && (
                        <span className="rburst" aria-hidden>
                          {BURST_PIECES.map((p, i) => (
                            <i
                              key={i}
                              style={{
                                ["--dx" as string]: p.dx,
                                ["--dy" as string]: p.dy,
                                ["--pc" as string]: i % 2 === 0 ? color : BURST_COLORS[i % BURST_COLORS.length],
                                animationDelay: `${i * 14}ms`,
                              }}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-bold ${checked ? "line-through" : ""}`}>{r.title}</p>
                      <p className="text-xs font-medium" style={{ color: "var(--color-gray-400)" }}>
                        <span className="tabular-nums">{r.time}</span>
                        {desc && <span style={{ color: "var(--color-gray-500)", whiteSpace: "pre-line", ...(desc.includes("\n") ? { display: "block", marginTop: "4px", lineHeight: 1.7 } : {}) }}>{desc.includes("\n") ? "" : " · "}{desc}</span>}
                      </p>
                    </div>
                    {editMode && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          className="btn btn--tertiary btn--sm btn--icon-only"
                          style={{ ["--btn-h" as string]: "30px" }}
                          aria-label="수정"
                          onClick={() => {
                            setEditing(id);
                            setForm({ title: r.title, time: r.time, color: r.color, desc: r.desc ?? "" });
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="btn btn--tertiary btn--sm btn--icon-only"
                          style={{ ["--btn-h" as string]: "30px" }}
                          aria-label="삭제"
                          disabled={busy}
                          onClick={() => {
                            if (confirm(`'${r.title}' 루틴을 삭제할까요? 기록도 함께 지워져요.`)) {
                              post({ action: "delete", id });
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <button
        className="btn btn--secondary btn--sm self-start"
        onClick={() => {
          setEditing("new");
          setForm({ title: "", time: "07:00", color: "blue", desc: "" });
        }}
      >
        <Plus size={15} /> 루틴 추가
      </button>

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "루틴 추가" : "루틴 수정"}
        width={480}
      >
        {saveErrorAlert}
        {editorForm}
      </Drawer>

      {cheer && (
        <div className="cheer-toast" role="status" key={cheer.n}>
          {cheer.text}
        </div>
      )}
      {celebrate && (
        <div className="celebrate" aria-hidden>
          {CONFETTI.map((c, i) => (
            <i key={i} style={{ left: c.left, background: c.color, animationDelay: `${c.delay}ms` }} />
          ))}
          <div className="celebrate__msg">
            <span style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <Mascot mood="party" size={62} />
            </span>
            오늘 루틴 올클리어! 🎉
            <small>새싹이가 전해요: 정말 멋져요!</small>
          </div>
        </div>
      )}
    </div>
  );
}
