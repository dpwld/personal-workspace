"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Target, ListTodo, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3, Moon, Pencil, Sun, Timer, Trash2 } from "lucide-react";
import { Checkin, Item, MOODS, Routine, ROUTINE_COLORS, WorkLog, ddayLabel } from "@/lib/types";
import { cheerMessage, randomCheer, routineEmoji, signalLevel, SIGNAL_COLORS, taskEmoji } from "@/lib/celebrate";
import Mascot, { mascotMood } from "@/components/mascot";
import { requestMutation } from "@/lib/client-request.mjs";

const TASK_PRIORITY_COLOR: Record<string, string> = {
  "높음": "#b85247",
  "중간": "#9b632f",
  "낮음": "#39765b",
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatKoreanDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

// 로컬 자정 기준으로 +-days 이동한 YYYY-MM-DD
function shiftDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function TodayClient({
  date,
  today,
  initial,
  weekMinutes,
  todayLogs,
  recentProjects,
  routines,
  routineDoneIds,
  tasks,
}: {
  date: string;
  today: string;
  initial: Checkin | null;
  weekMinutes: number;
  todayLogs: WorkLog[];
  recentProjects: string[];
  routines: Routine[];
  routineDoneIds: string[];
  tasks: Item[];
}) {
  const router = useRouter();
  const [firstTask, setFirstTask] = useState(initial?.first_task ?? "");
  const [firstTaskDone, setFirstTaskDone] = useState(initial?.first_task_done ?? false);
  const [gratitude, setGratitude] = useState<string[]>(
    initial?.gratitude?.length === 3 ? initial.gratitude : ["", "", ""]
  );
  const [learned, setLearned] = useState(initial?.learned ?? "");
  const [mood, setMood] = useState(initial?.mood ?? "");
  const [minutes, setMinutes] = useState("");
  const [project, setProject] = useState("");
  const [workNote, setWorkNote] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ project: "", minutes: "", note: "" });

  // 히어로 위젯: 체크는 화면 먼저, 서버는 뒤에서. refresh는 안 한다(목록이 흔들리지 않게).
  const [routineDone, setRoutineDone] = useState<Set<string>>(new Set(routineDoneIds));
  const [taskStatusOverride, setTaskStatusOverride] = useState<Record<string, string>>({});
  const WIDGET_PAGE = 5;
  const [widgetRoutineIds] = useState<string[]>(() =>
    routines.filter((r) => !routineDoneIds.includes(String(r.id))).map((r) => String(r.id))
  );
  const [widgetTaskIds] = useState<string[]>(() =>
    tasks
      .filter((t) => t.data.status !== "완료")
      .sort((a, b) => (a.data.deadline || "9999") < (b.data.deadline || "9999") ? -1 : 1)
      .map((t) => String(t.id))
  );
  const [routinePage, setRoutinePage] = useState(0);
  const [taskPage, setTaskPage] = useState(0);

  const [widgetStampId, setWidgetStampId] = useState<string | null>(null);
  const [widgetCheer, setWidgetCheer] = useState<{ n: number; text: string } | null>(null);
  const pendingWidgets = useRef(new Set<string>());

  async function toggleWidgetRoutine(id: string) {
    const key = `routine:${id}`;
    if (pendingWidgets.current.has(key)) return;
    pendingWidgets.current.add(key);
    setSaveError(null);
    const next = new Set(routineDone);
    const willDone = !next.has(id);
    if (willDone) next.add(id);
    else next.delete(id);
    setRoutineDone(next);
    if (willDone) {
      setWidgetStampId(id);
      setTimeout(() => setWidgetStampId((cur) => (cur === id ? null : cur)), 700);
      const n = routines.filter((r) => next.has(String(r.id))).length;
      const token = Date.now();
      setWidgetCheer({
        n: token,
        text: n === routines.length && routines.length > 0 ? "오늘 루틴 올클리어! 🎉" : cheerMessage(n, routines.length),
      });
      setTimeout(() => setWidgetCheer((cur) => (cur?.n === token ? null : cur)), 2000);
    }
    try {
      const error = await requestMutation("/api/routines", { action: "check", date, id, done: willDone });
      if (error) {
        setRoutineDone((current) => {
          const restored = new Set(current);
          if (willDone) restored.delete(id);
          else restored.add(id);
          return restored;
        });
        setWidgetStampId(null);
        setWidgetCheer(null);
        setSaveError(error);
      }
    } finally {
      pendingWidgets.current.delete(key);
    }
  }

  async function toggleWidgetTask(item: Item) {
    const key = `task:${item.id}`;
    if (pendingWidgets.current.has(key)) return;
    pendingWidgets.current.add(key);
    setSaveError(null);
    const current = taskStatusOverride[String(item.id)] ?? item.data.status;
    const next = current === "완료" ? "To Do" : "완료";
    setTaskStatusOverride((prev) => ({ ...prev, [String(item.id)]: next }));
    if (next === "완료") {
      const id = String(item.id);
      setWidgetStampId(id);
      setTimeout(() => setWidgetStampId((cur) => (cur === id ? null : cur)), 700);
      const token = Date.now();
      setWidgetCheer({ n: token, text: randomCheer() });
      setTimeout(() => setWidgetCheer((cur) => (cur?.n === token ? null : cur)), 2000);
    }
    try {
      const error = await requestMutation("/api/items", { action: "update", id: item.id, data: { ...item.data, status: next } });
      if (error) {
        setTaskStatusOverride((prev) => ({ ...prev, [String(item.id)]: current }));
        setWidgetStampId(null);
        setWidgetCheer(null);
        setSaveError(error);
      }
    } finally {
      pendingWidgets.current.delete(key);
    }
  }

  const allWidgetRoutines = widgetRoutineIds
    .map((id) => routines.find((r) => String(r.id) === id))
    .filter((r): r is Routine => Boolean(r));
  const allWidgetTasks = widgetTaskIds
    .map((id) => tasks.find((t) => String(t.id) === id))
    .filter((t): t is Item => Boolean(t));
  const routinePages = Math.max(1, Math.ceil(allWidgetRoutines.length / WIDGET_PAGE));
  const taskPages = Math.max(1, Math.ceil(allWidgetTasks.length / WIDGET_PAGE));
  const widgetRoutines = allWidgetRoutines.slice(routinePage * WIDGET_PAGE, (routinePage + 1) * WIDGET_PAGE);
  const widgetTasks = allWidgetTasks.slice(taskPage * WIDGET_PAGE, (taskPage + 1) * WIDGET_PAGE);
  const routineDoneCount = routines.filter((r) => routineDone.has(String(r.id))).length;
  const openTaskCount = tasks.filter((t) => (taskStatusOverride[String(t.id)] ?? t.data.status) !== "완료").length;

  async function mutate(url: string, body: object, message: string) {
    setBusy(true);
    setSaved(null);
    setSaveError(null);
    try {
      const error = await requestMutation(url, body);
      if (error) {
        setSaveError(error);
        return false;
      }
      setSaved(message);
      setTimeout(() => setSaved(null), 2500);
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function save(partial: Partial<Checkin>, message: string) {
    return mutate("/api/checkin", { date, ...partial }, message);
  }

  async function logWork() {
    const m = Number(minutes);
    if (!m || m <= 0) return;
    if (!(await mutate("/api/worklog", { date, minutes: m, project, note: workNote }, "작업 로그 기록됨"))) return;
    setMinutes("");
    setWorkNote("");
  }

  async function saveEditedLog(log: WorkLog) {
    const m = Number(editForm.minutes);
    if (!m || m <= 0) return;
    if (!(await mutate("/api/worklog", {
      action: "update", id: log.id, date: log.date, minutes: m, project: editForm.project, note: editForm.note,
    }, "작업 로그 수정됨"))) return;
    setEditingLogId(null);
  }

  async function deleteLog(id: string) {
    await mutate("/api/worklog", { action: "delete", id }, "작업 로그 삭제됨");
  }

  const saveErrorAlert = saveError && (
    <p className="alert text-sm" role="alert" style={{ color: "var(--color-danger)" }}>{saveError}</p>
  );

  return (
    <div className="today-dashboard">
      {saveErrorAlert}
      <div className="page-head anim-in flex flex-wrap items-start justify-between gap-4" style={{ marginBottom: 0 }}>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="eyebrow">MY DAILY SPACE</p>
          <div className="today-date-row">
            <span className="mascot-hop" key={widgetCheer?.n ?? 0} style={{ marginRight: 4 }}>
              <Mascot mood={mascotMood(routineDoneCount, routines.length)} size={40} />
            </span>
            <h1 className="page-title flex items-center gap-2">
              {date === today ? "오늘도 한 걸음." : formatKoreanDate(date)}
            </h1>
            <button
              className="btn btn--tertiary btn--sm btn--icon-only"
              style={{ ["--btn-h" as string]: "32px" }}
              aria-label="이전 날"
              onClick={() => router.push(`/?date=${shiftDate(date, -1)}`)}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              className="btn btn--tertiary btn--sm btn--icon-only"
              style={{ ["--btn-h" as string]: "32px" }}
              aria-label="다음 날"
              onClick={() => router.push(`/?date=${shiftDate(date, 1)}`)}
            >
              <ChevronRight size={15} />
            </button>
            {date !== today && (
              <button
                className="btn btn--tertiary btn--sm"
                style={{ ["--btn-h" as string]: "32px" }}
                onClick={() => router.push("/")}
              >
                오늘로
              </button>
            )}
          </div>
          <p className="text-[13px] font-medium" style={{ color: "var(--color-gray-500)" }}>
            {date === today ? `${formatKoreanDate(date)} · 작은 실행이 쌓여 원하는 내가 될 거예요.` : "지난 기록도 오늘의 자산이에요"}
          </p>
        </div>

        <div className="hero-widget anim-in" style={{ animationDelay: "60ms" }}>
          <section aria-label="루틴 요약">
            <div className="hero-widget__head">
              <Clock3 size={13} /> 루틴 <b>{routineDoneCount}/{routines.length}</b>
              <span
                className="hw-light"
                title={`달성 ${routines.length > 0 ? Math.round((routineDoneCount / routines.length) * 100) : 0}%`}
                style={{ background: SIGNAL_COLORS[signalLevel(routineDoneCount, routines.length)] }}
              />
              <Link href="/routines" aria-label="루틴 전체 보기"><ArrowUpRight size={14} /></Link>
            </div>
            {widgetRoutines.map((r) => {
              const id = String(r.id);
              const checked = routineDone.has(id);
              const color = ROUTINE_COLORS[r.color] ?? ROUTINE_COLORS.blue;
              return (
                <button key={id} className="hero-widget__row" data-checked={checked} onClick={() => toggleWidgetRoutine(id)}>
                  <span className="hw-check" style={{ borderColor: checked ? color : "var(--color-gray-300)", background: checked ? color : "transparent" }}>
                    {checked ? (
                      <span className={widgetStampId === id ? "rstamp" : undefined} style={{ fontSize: 9 }}>
                        {routineEmoji(r.title)}
                      </span>
                    ) : ""}
                  </span>
                  <span className="hw-time">{r.time}</span>
                  <span className="hw-title">{r.title}</span>
                </button>
              );
            })}
            {widgetRoutines.length === 0 && <p className="hw-empty">남은 루틴이 없어요. 수고했어요!</p>}
            {routinePages > 1 && (
              <div className="hw-pager">
                <button aria-label="이전 루틴" disabled={routinePage === 0} onClick={() => setRoutinePage(routinePage - 1)}>
                  <ChevronUp size={14} />
                </button>
                <button aria-label="다음 루틴" disabled={routinePage >= routinePages - 1} onClick={() => setRoutinePage(routinePage + 1)}>
                  <ChevronDown size={14} />
                </button>
              </div>
            )}
          </section>
          <section aria-label="할 일 요약">
            <div className="hero-widget__head">
              <ListTodo size={13} /> 할 일 <b>{openTaskCount}</b>
              <Link href="/tasks" aria-label="할 일 전체 보기"><ArrowUpRight size={14} /></Link>
            </div>
            {widgetTasks.map((t) => {
              const id = String(t.id);
              const checked = (taskStatusOverride[id] ?? t.data.status) === "완료";
              const color = TASK_PRIORITY_COLOR[t.data.priority] ?? "var(--color-gray-400)";
              return (
                <button key={id} className="hero-widget__row" data-checked={checked} onClick={() => toggleWidgetTask(t)}>
                  <span className="hw-check" style={{ borderColor: checked ? color : "var(--color-gray-300)", background: checked ? color : "transparent" }}>
                    {checked ? (
                      <span className={widgetStampId === id ? "rstamp" : undefined} style={{ fontSize: 9 }}>
                        {taskEmoji(t.data.title, t.data.category)}
                      </span>
                    ) : ""}
                  </span>
                  <span className="hw-title">{t.data.title}</span>
                  {t.data.deadline && (
                    <span className="hw-time" style={{ marginLeft: "auto", color: t.data.deadline < today ? "#b85247" : undefined }}>
                      {ddayLabel(t.data.deadline, today)}
                    </span>
                  )}
                </button>
              );
            })}
            {widgetTasks.length === 0 && <p className="hw-empty">열린 할 일이 없어요.</p>}
            {widgetCheer && (
              <div className="cheer-toast" role="status" key={widgetCheer.n}>
                {widgetCheer.text}
              </div>
            )}
            {taskPages > 1 && (
              <div className="hw-pager">
                <button aria-label="이전 할 일" disabled={taskPage === 0} onClick={() => setTaskPage(taskPage - 1)}>
                  <ChevronUp size={14} />
                </button>
                <button aria-label="다음 할 일" disabled={taskPage >= taskPages - 1} onClick={() => setTaskPage(taskPage + 1)}>
                  <ChevronDown size={14} />
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="daily-stats" aria-label="활동 요약">
        <div><span>오늘의 첫걸음</span><strong>{firstTaskDone ? "완료했어요" : "하나에 집중"}</strong><small>{firstTaskDone ? "오늘의 나에게 작은 박수" : "많이 하지 않아도 괜찮아요"}</small></div>
        <div><span>선택한 날의 몰입</span><strong>{todayLogs.reduce((sum, log) => sum + log.minutes, 0)}<em>분</em></strong><small>작업 기록 {todayLogs.length}개</small></div>
        <div><span>최근 7일의 쌓임</span><strong>{Math.floor(weekMinutes / 60)}<em>시간</em> {weekMinutes % 60}<em>분</em></strong><small>기록한 만큼, 성장한 시간</small></div>
      </div>
      <div className="today-columns">
      <div className="today-workspace">
      {saved && (
        <div className="alert alert--success text-sm font-semibold" role="status">
          <Check size={16} /> {saved}
        </div>
      )}

      {/* 아침 */}
      <section className="card focus-card anim-in" style={{ animationDelay: "120ms" }}>
        <div className="mb-2 flex items-center gap-2">
          <Sun size={16} style={{ color: "var(--color-accent-500)" }} />
          <h2 className="text-[15px] font-bold">오늘, 가장 중요한 하나</h2>
        </div>
        <p className="mb-4 text-[13px] leading-relaxed" style={{ color: "var(--color-gray-500)" }}>
          첫 작업을 정하고 시작해요. 작게 시작해도 충분해요.
        </p>
        <div className="flex gap-2">
          <input
            className="input"
            aria-label="오늘의 우선순위"
            placeholder="예: 오늘 공부할 첫 단원 정리하기"
            value={firstTask}
            onChange={(e) => setFirstTask(e.target.value)}
          />
          <button
            className="btn btn--primary btn--md shrink-0"
            disabled={busy || !firstTask.trim()}
            onClick={() => save({ first_task: firstTask }, "우선순위 저장됨")}
          >
            저장
          </button>
        </div>
        {firstTask && (
          <label className="checkbox mt-3 text-sm font-medium">
            <input
              type="checkbox"
              className="sr-only"
              checked={firstTaskDone}
              disabled={busy}
              onChange={async (e) => {
                const next = e.target.checked;
                setFirstTaskDone(next);
                if (!(await save({ first_task: firstTask, first_task_done: next }, "체크됨"))) {
                  setFirstTaskDone(!next);
                }
              }}
            />
            <span
              className="checkbox__box"
              style={{
                borderRadius: 4,
                background: firstTaskDone ? "var(--color-accent-500)" : undefined,
                borderColor: firstTaskDone ? "var(--color-accent-500)" : undefined,
              }}
            >
              {firstTaskDone ? "✓" : ""}
            </span>
            완료했어요
          </label>
        )}
      </section>

      {/* 작업 로그 */}
      <section className="card anim-in" style={{ animationDelay: "180ms" }}>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer size={16} style={{ color: "var(--color-accent-500)" }} />
            <h2 className="text-[15px] font-bold">차곡차곡, 작업 기록</h2>
          </div>
          <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--color-gray-500)" }}>
            최근 7일 {Math.floor(weekMinutes / 60)}h {weekMinutes % 60}m
          </span>
        </div>
        <p className="mb-4 text-[13px] leading-relaxed" style={{ color: "var(--color-gray-500)" }}>
          프로젝트와 집중한 시간을 남겨요. 오늘의 경험이 성장의 기록이 됩니다.
        </p>
        <div className="work-entry-form">
          <input
            className="input basis-36"
            style={{ width: "auto", flexGrow: 0 }}
            list="project-list"
            aria-label="프로젝트"
            placeholder="프로젝트"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          />
          <datalist id="project-list">
            <option value="개인 프로젝트" />
            <option value="업무" />
            <option value="부업" />
            <option value="영어" />
            <option value="중국어" />
            <option value="OMSA" />
            {recentProjects.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <input
            className="input basis-20"
            style={{ width: "auto", flexGrow: 0 }}
            type="number"
            inputMode="numeric"
            aria-label="작업 시간 (분)"
            min="1"
            placeholder="분"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
          <input
            className="input min-w-36 flex-1"
            style={{ width: "auto" }}
            aria-label="작업 내용"
            placeholder="뭘 했나요?"
            value={workNote}
            onChange={(e) => setWorkNote(e.target.value)}
          />
          <button className="btn btn--primary btn--md shrink-0" disabled={busy || Number(minutes) <= 0 || !Number.isFinite(Number(minutes))} onClick={logWork}>
            기록
          </button>
        </div>
        {todayLogs.length > 0 && (
          <div
            className="mt-3 flex flex-col"
            style={{ borderTop: "1px solid var(--color-gray-100)" }}
          >
            {todayLogs.map((log) =>
              editingLogId === log.id ? (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center gap-2 py-2"
                  style={{ borderBottom: "1px solid var(--color-gray-100)" }}
                >
                  <input
                    className="input basis-32"
                    style={{ width: "auto", flexGrow: 0, height: 32 }}
                    list="project-list"
                    placeholder="프로젝트"
                    value={editForm.project}
                    onChange={(e) => setEditForm({ ...editForm, project: e.target.value })}
                  />
                  <input
                    className="input basis-20"
                    style={{ width: "auto", flexGrow: 0, height: 32 }}
                    type="number"
                    inputMode="numeric"
                    placeholder="분"
                    value={editForm.minutes}
                    onChange={(e) => setEditForm({ ...editForm, minutes: e.target.value })}
                  />
                  <input
                    className="input min-w-32 flex-1"
                    style={{ width: "auto", height: 32 }}
                    placeholder="뭘 했나요?"
                    value={editForm.note}
                    onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && saveEditedLog(log)}
                  />
                  <button
                    className="btn btn--tertiary btn--sm shrink-0"
                    onClick={() => setEditingLogId(null)}
                  >
                    취소
                  </button>
                  <button
                    className="btn btn--primary btn--sm shrink-0"
                    disabled={busy || !Number(editForm.minutes)}
                    onClick={() => saveEditedLog(log)}
                  >
                    저장
                  </button>
                </div>
              ) : (
                <div
                  key={log.id}
                  className="flex items-center gap-2 py-2"
                  style={{ borderBottom: "1px solid var(--color-gray-100)" }}
                >
                  <span className="shrink-0 text-[13px] font-bold">{log.project}</span>
                  <span
                    className="shrink-0 text-xs font-semibold tabular-nums"
                    style={{ color: "var(--color-accent-500)" }}
                  >
                    {log.minutes}분
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate text-[13px]"
                    style={{ color: "var(--color-gray-600)" }}
                  >
                    {log.note}
                  </span>
                  <button
                    className="btn btn--tertiary btn--sm btn--icon-only shrink-0"
                    style={{ ["--btn-h" as string]: "28px" }}
                    aria-label="로그 수정"
                    disabled={busy}
                    onClick={() => {
                      setEditingLogId(log.id);
                      setEditForm({
                        project: log.project ?? "",
                        minutes: String(log.minutes),
                        note: log.note ?? "",
                      });
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="btn btn--tertiary btn--sm btn--icon-only shrink-0"
                    style={{ ["--btn-h" as string]: "28px" }}
                    aria-label="로그 삭제"
                    disabled={busy}
                    onClick={() => deleteLog(log.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* 저녁 */}
      <section className="card evening-card anim-in" style={{ animationDelay: "240ms" }}>
        <div className="mb-2 flex items-center gap-2">
          <Moon size={16} style={{ color: "var(--color-accent-500)" }} />
          <h2 className="text-[15px] font-bold">하루를 닫는 작은 기록</h2>
        </div>
        <p className="mb-4 text-[13px] leading-relaxed" style={{ color: "var(--color-gray-500)" }}>
          잘한 일이 아니라 감사한 일. 한 줄이어도 충분하다.
        </p>
        <div className="flex flex-col gap-2">
          {gratitude.map((g, i) => (
            <input
              key={i}
              className="input"
              aria-label={`감사한 일 ${i + 1}`}
              placeholder={`감사한 일 ${i + 1}`}
              value={g}
              onChange={(e) => {
                const next = [...gratitude];
                next[i] = e.target.value;
                setGratitude(next);
              }}
            />
          ))}
          <input
            className="input"
            placeholder="오늘 배운 일 1줄"
            value={learned}
            onChange={(e) => setLearned(e.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex gap-1">
              {MOODS.map((m) => (
                <button
                  key={m}
                  aria-pressed={mood === m}
                  className={`chip chip--sm ${mood === m ? "chip--accent" : ""}`}
                  style={{ cursor: "pointer", border: 0 }}
                  onClick={() => setMood(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              className="btn btn--primary btn--md"
              disabled={busy}
              onClick={() => save({ gratitude, learned, mood }, "저녁 기록 저장됨, 잘 자요")}
            >
              저녁 마감
            </button>
          </div>
        </div>
      </section>

      </div>
      <aside className="today-aside">
        <section className="career-card">
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h2>내일의 나를 <br />만들어가는 시간</h2>
          <p>오늘의 경험을 모으고, <br />나만의 방향을 찾아가요.</p>
          <Link href="/history"><Timer size={17} /><span>쌓아온 기록 돌아보기</span><ArrowUpRight size={16} /></Link>
          <Link href="/goals"><Target size={17} /><span>성장의 방향 정하기</span><ArrowUpRight size={16} /></Link>
        </section>
        <section className="card daily-links">
          <h2>나의 하루 이어가기</h2>
          <Link href="/routines"><Sun size={17} /><span>루틴 체크하기</span><ChevronRight size={15} /></Link>
          <Link href="/tasks"><ListTodo size={17} /><span>남은 할 일 정리하기</span><ChevronRight size={15} /></Link>
          <Link href="/history"><Timer size={17} /><span>쌓아온 기록 돌아보기</span><ChevronRight size={15} /></Link>
        </section>
        <p className="daily-note">완벽한 하루보다,<br />다시 시작하는 하루를 응원해요.</p>
      </aside>
      </div>

    </div>
  );
}
