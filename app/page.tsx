import { getCheckin, listItems, listRoutineChecks, listRoutines, listWorkLogs } from "@/lib/store";
import { daysAgoSeoul, todaySeoul } from "@/lib/types";
import TodayClient from "./today-client";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = todaySeoul();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : today;
  const weekAgo = daysAgoSeoul(6);
  const monthAgo = daysAgoSeoul(30);
  const from = date < monthAgo ? date : monthAgo;
  const to = date > today ? date : today;
  const [checkin, logs, routines, routineChecks, taskItems] = await Promise.all([
    getCheckin(date),
    listWorkLogs(from, to),
    listRoutines(date),
    listRoutineChecks(date, date),
    listItems("task"),
  ]);
  const weekLogs = logs.filter((l) => l.date >= weekAgo && l.date <= today);
  const weekMinutes = weekLogs.reduce((s, l) => s + l.minutes, 0);
  const todayLogs = logs.filter((l) => l.date === date);
  const monthLogs = logs.filter((l) => l.date >= monthAgo && l.date <= today);
  const recentProjects = [...new Set(monthLogs.map((l) => l.project))].slice(0, 8);

  return (
    <TodayClient
      key={date}
      date={date}
      today={today}
      initial={checkin}
      weekMinutes={weekMinutes}
      todayLogs={todayLogs}
      recentProjects={recentProjects}
      routines={routines}
      routineDoneIds={routineChecks.filter((c) => c.done).map((c) => String(c.routine_id))}
      tasks={taskItems}
    />
  );
}
