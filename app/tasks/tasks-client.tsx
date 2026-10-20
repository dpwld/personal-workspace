"use client";

import { requestMutation } from "@/lib/client-request.mjs";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, CircleCheck, ListTodo, Pencil, Plus } from "lucide-react";
import ConfirmButton from "@/components/confirm-button";
import { Item, ddayLabel, todaySeoul } from "@/lib/types";
import { randomCheer, taskEmoji } from "@/lib/celebrate";
import Mascot from "@/components/mascot";

// 체크 버스트 조각 (루틴 페이지와 동일한 연출)
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

// Todoist 스타일: 우선순위 컬러 원형 체크 + 얇은 행 + 마감일 중심 섹션
const PRIORITY_COLOR: Record<string, string> = {
  "높음": "#b85247",
  "중간": "#9b632f",
  "낮음": "#39765b",
};
const CATEGORIES = ["본선", "업무", "학업", "부업", "취미", "생활"];

function dateColor(deadline: string, today: string): string {
  if (deadline < today) return "#b85247";
  if (deadline === today) return "#39765b";
  return "var(--color-gray-500)";
}

export default function TasksClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const today = todaySeoul();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", deadline: "", priority: "중간", category: "본선", notes: "" });
  const [showDone, setShowDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // 체크는 기다리지 않는다: 화면 먼저 뒤집고 서버는 뒤에서 (Notion식 즉각 반응)
  const [statusOverride, setStatusOverride] = useState<Record<string, string>>({});

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

  function statusOf(item: Item): string {
    return statusOverride[String(item.id)] ?? item.data.status;
  }

  const [burstId, setBurstId] = useState<string | null>(null);
  const [cheer, setCheer] = useState<{ n: number; text: string } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const pendingTasks = useRef(new Set<string>());

  async function toggleDone(item: Item) {
    const id = String(item.id);
    if (pendingTasks.current.has(id)) return;
    pendingTasks.current.add(id);
    setSaveError(null);
    const current = statusOf(item);
    const next = current === "완료" ? "To Do" : "완료";
    let statusTimer: ReturnType<typeof setTimeout> | undefined;
    if (next === "완료") {
      // 도장·버스트를 보여준 뒤에 행을 완료 섹션으로 옮긴다 (바로 옮기면 효과가 안 보임)
      setBurstId(id);
      setTimeout(() => setBurstId((cur) => (cur === id ? null : cur)), 700);
      statusTimer = setTimeout(() => setStatusOverride((prev) => ({ ...prev, [id]: next })), 500);
      const remaining = items.filter(
        (i) => String(i.id) !== id && (statusOverride[String(i.id)] ?? i.data.status) !== "완료"
      ).length;
      if (remaining === 0) {
        setCheer(null);
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 4200);
      } else {
        const token = Date.now();
        setCheer({ n: token, text: randomCheer() });
        setTimeout(() => setCheer((cur) => (cur?.n === token ? null : cur)), 2000);
      }
    } else {
      setStatusOverride((prev) => ({ ...prev, [id]: next }));
    }
    const error = await requestMutation("/api/items", { action: "update", id: item.id, data: { ...item.data, status: next } });
    if (error) {
      clearTimeout(statusTimer);
      setStatusOverride((prev) => ({ ...prev, [id]: current }));
      setBurstId(null);
      setCheer(null);
      setCelebrate(false);
      setSaveError(error);
      pendingTasks.current.delete(id);
      return;
    }
    setTimeout(() => {
      pendingTasks.current.delete(id);
      router.refresh();
    }, next === "완료" ? 600 : 0);
  }

  async function save() {
    if (!form.title.trim()) return;
    const data = { ...form, status: "To Do" };
    const saved = editing === "new"
      ? await post({ action: "add", kind: "task", data })
      : await post({ action: "update", id: editing, data: { ...form, status: items.find((i) => String(i.id) === editing)?.data.status ?? "To Do" } });
    if (!saved) return;
    setEditing(null);
    setForm({ title: "", deadline: "", priority: "중간", category: "본선", notes: "" });
  }

  const open = items.filter((i) => statusOf(i) !== "완료");
  const done = items.filter((i) => statusOf(i) === "완료");
  const overdue = open.filter((i) => i.data.deadline && i.data.deadline < today);
  const dueToday = open.filter((i) => i.data.deadline === today);
  const upcoming = open
    .filter((i) => i.data.deadline && i.data.deadline > today)
    .sort((a, b) => a.data.deadline.localeCompare(b.data.deadline));
  const someday = open.filter((i) => !i.data.deadline);

  const editorRow = (
    <div className="task-editor">
      <input
        className="input"
        placeholder="할 일 이름"
        value={form.title}
        autoFocus
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      <div className="flex flex-wrap gap-2">
        <input
          className="input"
          style={{ width: 150, flexGrow: 0 }}
          type="date"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
        />
        <select
          className="input"
          style={{ width: 100, flexGrow: 0 }}
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
        >
          {Object.keys(PRIORITY_COLOR).map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          className="input"
          style={{ width: 110, flexGrow: 0 }}
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          className="input min-w-32 flex-1"
          style={{ width: "auto" }}
          placeholder="메모"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn btn--tertiary btn--sm" onClick={() => setEditing(null)}>취소</button>
        <button className="btn btn--primary btn--sm" disabled={busy || !form.title.trim()} onClick={save}>
          {editing === "new" ? "할 일 추가" : "저장"}
        </button>
      </div>
    </div>
  );

  function TaskRow({ item }: { item: Item }) {
    const id = String(item.id);
    const isDone = statusOf(item) === "완료";
    const stamping = burstId === id;
    const showDoneLook = isDone || stamping;
    const pColor = PRIORITY_COLOR[item.data.priority] ?? "var(--color-gray-300)";
    if (editing === id) return editorRow;
    return (
      <div className="task-row group">
        <button
          className="task-check"
          aria-label={isDone ? "미완료로 되돌리기" : "완료"}
          style={{
            borderColor: pColor,
            background: showDoneLook ? pColor : `color-mix(in oklab, ${pColor} 8%, transparent)`,
            position: "relative",
            overflow: "visible",
          }}
          onClick={() => toggleDone(item)}
        >
          {showDoneLook ? (
            <span className={stamping ? "rstamp" : undefined} style={{ fontSize: 11 }}>
              {taskEmoji(item.data.title, item.data.category)}
            </span>
          ) : (
            <Check size={12} style={{ color: pColor, opacity: 0 }} className="task-check__icon" />
          )}
          {burstId === id && (
            <span className="rburst" aria-hidden>
              {BURST_PIECES.map((p, i) => (
                <i
                  key={i}
                  style={{
                    ["--dx" as string]: p.dx,
                    ["--dy" as string]: p.dy,
                    ["--pc" as string]: i % 2 === 0 ? pColor : BURST_COLORS[i % BURST_COLORS.length],
                    animationDelay: `${i * 14}ms`,
                  }}
                />
              ))}
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-[14.5px] font-medium leading-snug ${isDone ? "line-through" : ""}`} style={{ color: isDone ? "var(--color-gray-500)" : "var(--foreground)" }}>
            {item.data.title}
          </p>
          {(item.data.deadline || item.data.notes) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
              {item.data.deadline && (
                <span className="font-semibold tabular-nums" style={{ color: isDone ? "var(--color-gray-400)" : dateColor(item.data.deadline, today) }}>
                  {item.data.deadline === today ? "오늘" : item.data.deadline}
                  {!isDone && item.data.deadline !== today && ` · ${ddayLabel(item.data.deadline, today)}`}
                </span>
              )}
              {item.data.notes && <span style={{ color: "var(--color-gray-400)" }}>{item.data.notes}</span>}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs font-semibold" style={{ color: "var(--color-gray-400)" }}>
          {item.data.category}
        </span>
        <div className="task-actions">
          <button
            className="btn btn--tertiary btn--sm btn--icon-only"
            style={{ ["--btn-h" as string]: "28px" }}
            aria-label="수정"
            onClick={() => {
              setEditing(id);
              setForm({
                title: item.data.title ?? "",
                deadline: item.data.deadline ?? "",
                priority: item.data.priority ?? "중간",
                category: item.data.category ?? "본선",
                notes: item.data.notes ?? "",
              });
            }}
          >
            <Pencil size={12} />
          </button>
          <ConfirmButton disabled={busy} onConfirm={() => post({ action: "delete", id })} />
        </div>
      </div>
    );
  }

  function Section({ title, rows, color }: { title: string; rows: Item[]; color?: string }) {
    if (rows.length === 0) return null;
    return (
      <section className="card" style={{ padding: "8px 20px" }}>
        <h2 className="task-section-title" style={{ color: color ?? "var(--foreground)" }}>
          {title} <span style={{ color: "var(--color-gray-400)" }}>{rows.length}</span>
        </h2>
        <div>
          {rows.map((item) => (
            <TaskRow key={item.id} item={item} />
          ))}
        </div>
      </section>
    );
  }

  const saveErrorAlert = saveError && (
    <p className="alert text-sm" role="alert" style={{ color: "var(--color-danger)" }}>{saveError}</p>
  );

  return (
    <div className="flex flex-col gap-4">
      {saveErrorAlert}
      <div className="page-head flex items-start justify-between gap-3" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ListTodo size={19} style={{ color: "var(--color-accent-500)" }} />
            할 일
          </h1>
          <p className="page-desc">하고 싶은 것이 많을 때는 적고, 우선순위와 가능 여부를 생각하자.</p>
        </div>
        {editing === null && (
          <button
            className="btn btn--primary btn--sm shrink-0"
            onClick={() => {
              setEditing("new");
              setForm({ title: "", deadline: "", priority: "중간", category: "본선", notes: "" });
            }}
          >
            <Plus size={15} /> 할 일 추가
          </button>
        )}
      </div>

      {editing === "new" && <div className="card card--tight">{editorRow}</div>}

      <Section title="기한 지남" rows={overdue} color="#b85247" />
      <Section title="오늘" rows={dueToday} color="#39765b" />
      <Section title="예정" rows={upcoming} />
      <Section title="기한 없음" rows={someday} />

      {open.length === 0 && editing === null && (
        <p className="flex items-center gap-2 text-sm" style={{ color: "var(--color-gray-400)" }}>
          <CircleCheck size={15} /> 남은 할 일이 없어요. 오늘은 여기까지.
        </p>
      )}

      {done.length > 0 && (
        <button
          className="flex items-center gap-1 self-start text-[13px] font-semibold"
          style={{ color: "var(--color-gray-500)" }}
          onClick={() => setShowDone(!showDone)}
        >
          <ChevronDown size={14} style={{ transform: showDone ? "none" : "rotate(-90deg)", transition: "transform 180ms" }} />
          완료됨 {done.length}
        </button>
      )}
      {showDone && (
        <section className="card" style={{ padding: "8px 20px" }}>
          {done.map((item) => (
            <TaskRow key={item.id} item={item} />
          ))}
        </section>
      )}

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
            할 일 올클리어! 🎉
            <small>새싹이가 전해요: 남은 할 일이 하나도 없어요!</small>
          </div>
        </div>
      )}
    </div>
  );
}
