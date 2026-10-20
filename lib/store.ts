import { createClient, SupabaseClient } from "@supabase/supabase-js";
import path from "path";
import { randomUUID } from "crypto";
import { routinesForDate } from "./routine-schedule.mjs";
import { Checkin, GoalsDoc, Item, Routine, RoutineCheck, WorkLog } from "./types";
import { MANDALA, MANDALA_CENTER, MOTTO, ROOTS } from "./plan";
import { readJson, writeJson } from "./local-storage.mjs";
import { storageConfig } from "./security.mjs";
import { assertAuthorized } from "./auth";

// Local storage requires one Node process and a persistent filesystem.
type DevData = {
  checkins: Record<string, Checkin>;
  workLogs: WorkLog[];
  routines: Routine[];
  routineChecks: RoutineCheck[];
  items: Item[];
  docs: Record<string, unknown>;
};

const isolated = process.env.NODE_ENV === "development";
const filename = isolated && process.env.WORKSPACE_DEMO === "1" ? "demo.json"
  : isolated && process.env.WORKSPACE_LOCAL_PREVIEW === "1" ? "routine-preview.json" : "dev.json";
const DEV_FILE = path.resolve(process.env.WORKSPACE_DATA_DIR || ".data", filename);

function loadDev(): DevData {
  const d = readJson(DEV_FILE, () => ({ checkins: {}, workLogs: [], routines: [], routineChecks: [], items: [], docs: {} }));
  if (!d || typeof d !== "object" || Array.isArray(d)) throw new Error("Invalid local workspace data.");
  return {
    checkins: d.checkins ?? {}, workLogs: d.workLogs ?? [], routines: d.routines ?? [],
    routineChecks: d.routineChecks ?? [], items: d.items ?? [], docs: d.docs ?? {},
  };
}

function saveDev(d: DevData) { writeJson(DEV_FILE, d); }

function sb(): SupabaseClient | null {
  const config = storageConfig();
  return config.mode === "supabase"
    ? createClient(config.url, config.key, { auth: { persistSession: false } }) : null;
}

// ---------- Checkins ----------

export async function getCheckin(date: string): Promise<Checkin | null> {
  await assertAuthorized();
  const client = sb();
  if (client) {
    const { data } = await client.from("checkins").select("*").eq("date", date).maybeSingle().throwOnError();
    return (data as Checkin) ?? null;
  }
  return loadDev().checkins[date] ?? null;
}

export async function upsertCheckin(c: Checkin): Promise<void> {
  await assertAuthorized(true);
  const client = sb();
  if (client) {
    await client.from("checkins").upsert(c, { onConflict: "date" }).throwOnError();
    return;
  }
  const d = loadDev();
  d.checkins[c.date] = c;
  saveDev(d);
}

export async function listCheckins(from: string, to: string): Promise<Checkin[]> {
  await assertAuthorized();
  const client = sb();
  if (client) {
    const { data } = await client
      .from("checkins")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: false }).throwOnError();
    return (data as Checkin[]) ?? [];
  }
  return Object.values(loadDev().checkins)
    .filter((c) => c.date >= from && c.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ---------- Work logs ----------

export async function addWorkLog(date: string, minutes: number, project: string, note: string): Promise<void> {
  await assertAuthorized(true);
  const log: WorkLog = { id: randomUUID(), date, minutes, project, note };
  const client = sb();
  if (client) {
    await client.from("work_logs").insert(log).throwOnError();
    return;
  }
  const d = loadDev();
  d.workLogs.push(log);
  saveDev(d);
}

export async function updateWorkLog(id: string, minutes: number, project: string, note: string): Promise<void> {
  await assertAuthorized(true);
  const client = sb();
  if (client) {
    await client.from("work_logs").update({ minutes, project, note }).eq("id", id).throwOnError();
    return;
  }
  const d = loadDev();
  const log = d.workLogs.find((entry) => String(entry.id) === String(id));
  if (!log) throw new Error("Work log not found.");
  Object.assign(log, { minutes, project, note });
  saveDev(d);
}

export async function deleteWorkLog(id: string): Promise<void> {
  await assertAuthorized(true);
  const client = sb();
  if (client) {
    await client.from("work_logs").delete().eq("id", id).throwOnError();
    return;
  }
  const d = loadDev();
  d.workLogs = d.workLogs.filter((l) => String(l.id) !== String(id));
  saveDev(d);
}

export async function listWorkLogs(from: string, to: string): Promise<WorkLog[]> {
  await assertAuthorized();
  const client = sb();
  if (client) {
    const { data } = await client
      .from("work_logs")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: false }).throwOnError();
    return (data as WorkLog[]) ?? [];
  }
  return loadDev()
    .workLogs.filter((m) => m.date >= from && m.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ---------- Routines ----------

function sortRoutines(rs: Routine[]): Routine[] {
  return rs.slice().sort((a, b) => a.time.localeCompare(b.time) || a.sort - b.sort);
}

export async function listRoutines(date?: string): Promise<Routine[]> {
  await assertAuthorized();
  const schedule = date ? await getDoc("routine_schedule", () => ({})) : {};
  const client = sb();
  if (client) {
    const { data } = await client.from("routines").select("*").throwOnError();
    return sortRoutines(routinesForDate((data as Routine[]) ?? [], date, schedule));
  }
  const d = loadDev();
  return sortRoutines(routinesForDate(d.routines, date, schedule));
}

export async function addRoutine(title: string, time: string, color: string, desc: string): Promise<void> {
  await assertAuthorized(true);
  const client = sb();
  if (client) {
    const { data } = await client.from("routines").select("sort").order("sort", { ascending: false }).limit(1).throwOnError();
    const sort = ((data?.[0]?.sort as number) ?? 0) + 1;
    await client.from("routines").insert({ title, time, color, desc, sort, active: true }).throwOnError();
    return;
  }
  const d = loadDev();
  const sort = Math.max(0, ...d.routines.map((r) => r.sort)) + 1;
  d.routines.push({ id: randomUUID(), title, time, color, desc, sort, active: true });
  saveDev(d);
}

export async function updateRoutine(id: string, patch: Partial<Routine>): Promise<void> {
  await assertAuthorized(true);
  const { id: _id, ...fields } = patch;
  const client = sb();
  if (client) {
    await client.from("routines").update(fields).eq("id", id).throwOnError();
    return;
  }
  const d = loadDev();
  const r = d.routines.find((r) => String(r.id) === String(id));
  if (r) {
    Object.assign(r, fields);
    saveDev(d);
  }
}

export async function deleteRoutine(id: string): Promise<void> {
  await assertAuthorized(true);
  const client = sb();
  if (client) {
    await client.from("routines").delete().eq("id", id).throwOnError();
    return;
  }
  const d = loadDev();
  d.routines = d.routines.filter((r) => String(r.id) !== String(id));
  d.routineChecks = d.routineChecks.filter((c) => String(c.routine_id) !== String(id));
  saveDev(d);
}

export async function listRoutineChecks(from: string, to: string): Promise<RoutineCheck[]> {
  await assertAuthorized();
  const client = sb();
  if (client) {
    const { data } = await client.from("routine_checks").select("*").gte("date", from).lte("date", to).throwOnError();
    return (data as RoutineCheck[]) ?? [];
  }
  return loadDev().routineChecks.filter((c) => c.date >= from && c.date <= to);
}

// 날짜별 달성도 (신호등·주간 잔디·연속 기록용). 요일 스케줄을 반영해 그날의 분모를 센다.
export async function listRoutineDailyStats(
  dates: string[]
): Promise<{ date: string; total: number; done: number }[]> {
  await assertAuthorized();
  if (dates.length === 0) return [];
  const schedule = await getDoc("routine_schedule", () => ({}));
  const client = sb();
  const all: Routine[] = client
    ? (((await client.from("routines").select("*").throwOnError()).data as Routine[]) ?? [])
    : loadDev().routines;
  const checks = await listRoutineChecks(dates[0], dates[dates.length - 1]);
  const doneByDate = new Map<string, Set<string>>();
  for (const c of checks) {
    if (!c.done) continue;
    const set = doneByDate.get(c.date) ?? new Set<string>();
    set.add(String(c.routine_id));
    doneByDate.set(c.date, set);
  }
  return dates.map((date) => {
    const todays = routinesForDate(all, date, schedule) as Routine[];
    const doneSet = doneByDate.get(date);
    return { date, total: todays.length, done: todays.filter((r) => doneSet?.has(String(r.id))).length };
  });
}

export async function setRoutineCheck(date: string, routineId: string, done: boolean): Promise<void> {
  await assertAuthorized(true);
  const client = sb();
  if (client) {
    await client
      .from("routine_checks")
      .upsert({ date, routine_id: routineId, done }, { onConflict: "date,routine_id" }).throwOnError();
    return;
  }
  const d = loadDev();
  const existing = d.routineChecks.find(
    (c) => c.date === date && String(c.routine_id) === String(routineId)
  );
  if (existing) existing.done = done;
  else d.routineChecks.push({ date, routine_id: routineId, done });
  saveDev(d);
}

// ---------- Items (범용 컬렉션) ----------

export async function listItems(kind: string): Promise<Item[]> {
  await assertAuthorized();
  const client = sb();
  if (client) {
    const { data } = await client
      .from("items")
      .select("*")
      .eq("kind", kind)
      .order("created_at", { ascending: false }).throwOnError();
    return (data as Item[]) ?? [];
  }
  return loadDev()
    .items.filter((i) => i.kind === kind)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addItem(kind: string, data: Record<string, string>): Promise<void> {
  await assertAuthorized(true);
  const item: Item = { id: randomUUID(), kind, data, created_at: new Date().toISOString() };
  const client = sb();
  if (client) {
    await client.from("items").insert(item).throwOnError();
    return;
  }
  const d = loadDev();
  d.items.push(item);
  saveDev(d);
}

export async function updateItem(id: string, data: Record<string, string>): Promise<void> {
  await assertAuthorized(true);
  const client = sb();
  if (client) {
    await client.from("items").update({ data }).eq("id", id).throwOnError();
    return;
  }
  const d = loadDev();
  const it = d.items.find((i) => String(i.id) === String(id));
  if (it) {
    it.data = data;
    saveDev(d);
  }
}

export async function deleteItem(id: string): Promise<void> {
  await assertAuthorized(true);
  const client = sb();
  if (client) {
    await client.from("items").delete().eq("id", id).throwOnError();
    return;
  }
  const d = loadDev();
  d.items = d.items.filter((i) => String(i.id) !== String(id));
  saveDev(d);
}

// ---------- Goals and schedule documents ----------

async function getDoc<T>(id: string, seed: () => T): Promise<T> {
  const client = sb();
  if (client) {
    const { data } = await client.from("docs").select("*").eq("id", id).maybeSingle().throwOnError();
    return data?.data ? data.data as T : seed();
  }
  return (loadDev().docs[id] as T | undefined) ?? seed();
}

async function saveDoc(id: string, doc: unknown): Promise<void> {
  const client = sb();
  if (client) {
    await client.from("docs").upsert({ id, data: doc }).throwOnError();
    return;
  }
  const d = loadDev();
  d.docs[id] = doc;
  saveDev(d);
}

function seedGoals(): GoalsDoc {
  return { motto: MOTTO, center: MANDALA_CENTER, roots: ROOTS, mandala: MANDALA, updated_at: new Date().toISOString() };
}

export async function getGoals(): Promise<GoalsDoc> {
  await assertAuthorized();
  const doc = await getDoc<GoalsDoc>("goals", seedGoals);
  if (!doc.motto) doc.motto = MOTTO;
  if (!doc.center) doc.center = MANDALA_CENTER;
  return doc;
}

export async function saveGoals(doc: GoalsDoc): Promise<void> {
  await assertAuthorized(true);
  doc.updated_at = new Date().toISOString();
  await saveDoc("goals", doc);
}
