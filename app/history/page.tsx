import { Clock3, Heart, History, Timer } from "lucide-react";
import { listCheckins, listItems, listRoutineChecks, listRoutines, listWorkLogs } from "@/lib/store";
import { daysAgoSeoul, todaySeoul } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const today = todaySeoul();
  const heatFrom = daysAgoSeoul(83); // 히트맵 12주
  const from = daysAgoSeoul(27); // 타임라인 4주
  const weekAgo = daysAgoSeoul(6);
  const [checkins, workLogs, routines, routineChecks, diaries] = await Promise.all([
    listCheckins(heatFrom, today),
    listWorkLogs(heatFrom, today),
    listRoutines(),
    listRoutineChecks(heatFrom, today),
    listItems("diary"),
  ]);

  // 활동 히트맵 (GitHub 잔디 스타일)
  const activity = new Map<string, number>();
  const bump = (d?: string, n = 1) => {
    if (d) activity.set(d, (activity.get(d) ?? 0) + n);
  };
  workLogs.forEach((l) => bump(l.date));
  routineChecks.filter((c) => c.done).forEach((c) => bump(c.date));
  checkins.forEach((c) => {
    if (c.first_task || c.gratitude.some((g) => g.trim()) || c.learned) bump(c.date);
  });
  diaries.forEach((d) => bump(d.data.date));
  const heatDays: string[] = [];
  for (let i = 83; i >= 0; i--) heatDays.push(daysAgoSeoul(i));
  const heatWeeks: string[][] = [];
  for (let i = 0; i < heatDays.length; i += 7) heatWeeks.push(heatDays.slice(i, i + 7));
  const heatColor = (n: number) =>
    n === 0 ? "var(--nt-raised)" : n <= 2 ? "#d9e6c9" : n <= 5 ? "#9fb985" : "var(--nt-blue)";

  const tlCheckins = checkins.filter((c) => c.date >= from);
  const tlWorkLogs = workLogs.filter((l) => l.date >= from);
  const tlRoutineChecks = routineChecks.filter((c) => c.date >= from);
  const weekMinutes = workLogs.filter((l) => l.date >= weekAgo).reduce((s, l) => s + l.minutes, 0);
  const weekGratitudeDays = checkins.filter(
    (c) => c.date >= weekAgo && c.gratitude.some((g) => g.trim())
  ).length;
  const weekRoutineChecks = routineChecks.filter((c) => c.date >= weekAgo && c.done).length;

  const byProject = new Map<string, number>();
  for (const l of tlWorkLogs) {
    byProject.set(l.project, (byProject.get(l.project) ?? 0) + l.minutes);
  }
  const projects = [...byProject.entries()].sort((a, b) => b[1] - a[1]);

  const dates = [...new Set([
    ...tlCheckins.map((c) => c.date),
    ...tlWorkLogs.map((l) => l.date),
    ...tlRoutineChecks.filter((c) => c.done).map((c) => c.date),
  ])].sort((a, b) => b.localeCompare(a));

  const routineName = new Map(routines.map((r) => [String(r.id), r.title]));

  function fmt(min: number) {
    return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60 ? `${min % 60}m` : ""}`.trim() : `${min}m`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <h1 className="page-title flex items-center gap-2">
          <History size={19} style={{ color: "var(--color-accent-500)" }} />
          기록
        </h1>
        <p className="page-desc">매일이 쌓여서 성장의 기록이 된다. 달성률 대신 한 일만 센다.</p>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card card--tight anim-in">
          <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>
            <Timer size={13} /> 이번 주 작업 시간
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: "var(--color-accent-500)" }}>
            {Math.floor(weekMinutes / 60)}h {weekMinutes % 60}m
          </p>
        </div>
        <div className="card card--tight anim-in" style={{ animationDelay: "50ms" }}>
          <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>
            <Clock3 size={13} /> 이번 주 루틴 체크
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: "var(--color-accent-500)" }}>{weekRoutineChecks}개</p>
        </div>
        <div className="card card--tight anim-in" style={{ animationDelay: "100ms" }}>
          <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>
            <Heart size={13} /> 이번 주 감사일기 쓴 날
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: "var(--color-accent-500)" }}>{weekGratitudeDays}일</p>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">활동 잔디 (최근 12주)</h2>
        <div className="heatmap" style={{ overflowX: "auto", paddingBottom: 4 }}>
          {heatWeeks.map((week, wi) => (
            <div key={wi} className="heatmap__col">
              {week.map((d) => (
                <span
                  key={d}
                  className="heatmap__cell"
                  title={`${d}: 활동 ${activity.get(d) ?? 0}건`}
                  style={{ background: heatColor(activity.get(d) ?? 0) }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1">
          <span className="text-xs" style={{ color: "var(--color-gray-400)", marginRight: 2 }}>적음</span>
          {["var(--nt-raised)", "#d9e6c9", "#9fb985", "var(--nt-blue)"].map((c) => (
            <span key={c} style={{ width: 10, height: 10, borderRadius: 3, background: c, display: "inline-block" }} />
          ))}
          <span className="text-xs" style={{ color: "var(--color-gray-400)", marginLeft: 2 }}>많음</span>
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--color-gray-400)" }}>
          루틴 체크, 작업 로그, 체크인, 일기가 모두 잔디가 된다.
        </p>
      </section>

      {projects.length > 0 && (
        <section className="card">
          <h2 className="section-title">프로젝트별 누적 (최근 4주)</h2>
          <ul className="flex flex-col gap-2">
            {projects.map(([p, min]) => (
              <li key={p} className="flex items-center gap-3 text-sm">
                <span className="min-w-32 shrink-0 font-bold">{p}</span>
                <span
                  className="h-2 rounded-full"
                  style={{
                    background: "var(--color-accent-500)",
                    width: `${Math.min(100, (min / (projects[0][1] || 1)) * 100)}%`,
                    minWidth: 8,
                  }}
                />
                <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--color-gray-500)" }}>{fmt(min)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="section-title" style={{ marginBottom: 0 }}>일별 타임라인 (최근 4주)</h2>
        {dates.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-gray-400)" }}>
            아직 기록이 없다. 오늘의 첫 체크가 첫 페이지가 된다.
          </p>
        )}
        {dates.map((date) => {
          const c = tlCheckins.find((c) => c.date === date);
          const logs = tlWorkLogs.filter((l) => l.date === date);
          const checks = tlRoutineChecks.filter((rc) => rc.date === date && rc.done);
          return (
            <div key={date} className="card card--tight hover-lift">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-sm font-bold tabular-nums" style={{ color: "var(--color-accent-500)" }}>{date}</p>
                {c?.mood && <span className="chip chip--sm chip--surface">{c.mood}</span>}
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                {c?.first_task && (
                  <p>
                    <span className="font-bold" style={{ color: c.first_task_done ? "var(--nt-green)" : "var(--color-gray-400)" }}>
                      {c.first_task_done ? "완료" : "미완"}
                    </span>{" "}
                    우선순위: {c.first_task}
                  </p>
                )}
                {logs.map((l) => (
                  <p key={l.id}>
                    <span className="font-bold">{l.project}</span>
                    <span className="mx-1.5 text-xs font-semibold tabular-nums" style={{ color: "var(--color-gray-500)" }}>{fmt(l.minutes)}</span>
                    {l.note}
                  </p>
                ))}
                {checks.length > 0 && (
                  <p className="text-[13px]" style={{ color: "var(--color-gray-500)" }}>
                    루틴 {checks.length}개: {checks.map((rc) => routineName.get(String(rc.routine_id)) ?? "").filter(Boolean).join(", ")}
                  </p>
                )}
                {c?.gratitude.filter((g) => g.trim()).map((g, i) => (
                  <p key={i} style={{ color: "var(--color-gray-500)" }}>감사: {g}</p>
                ))}
                {c?.learned.trim() && <p style={{ color: "var(--color-gray-500)" }}>배움: {c.learned}</p>}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
