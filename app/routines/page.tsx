import { listRoutineChecks, listRoutineDailyStats, listRoutines } from "@/lib/store";
import { daysAgoSeoul, todaySeoul } from "@/lib/types";
import RoutinesClient from "./routines-client";

export const dynamic = "force-dynamic";

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : todaySeoul();
  const addDays = (d: string, n: number) => {
    const t = new Date(`${d}T00:00:00`);
    t.setDate(t.getDate() + n);
    const p = (x: number) => String(x).padStart(2, "0");
    return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
  };
  const last30 = Array.from({ length: 30 }, (_, i) => daysAgoSeoul(29 - i));
  // 주간 잔디는 보고 있는 날짜가 끝에 오도록 (지난주·다음주로 넘겨도 따라온다)
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6));
  const allDates = [...new Set([...last30, ...weekDates])].sort();
  const [routines, checks, stats] = await Promise.all([
    listRoutines(date),
    listRoutineChecks(date, date),
    listRoutineDailyStats(allDates),
  ]);
  const byDate = new Map(stats.map((s) => [s.date, s]));
  const doneIds = new Set(checks.filter((c) => c.done).map((c) => String(c.routine_id)));
  // 어제까지 연속 초록불(80% 이상) 일수. 루틴이 없던 날은 건너뛴다.
  let pastStreak = 0;
  for (let i = last30.length - 2; i >= 0; i--) {
    const s = byDate.get(last30[i])!;
    if (s.total === 0) continue;
    if (s.done / s.total >= 0.8) pastStreak++;
    else break;
  }
  return (
    <RoutinesClient
      key={date}
      date={date}
      today={todaySeoul()}
      routines={routines}
      doneIds={[...doneIds]}
      weekStats={weekDates.map((d) => byDate.get(d)!)}
      pastStreak={pastStreak}
    />
  );
}
