import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

// Exercise the built server against a fresh, disposable local store; no external APIs.
await mkdir(".qa", { recursive: true });
const dataDir = await mkdtemp(resolve(".qa", "integration-"));
const port = Number(process.env.TEST_PORT || 4318);
const origin = `http://127.0.0.1:${port}`;
const passcode = randomBytes(24).toString("hex");
const date = "2026-10-21";
let child;
let cookie = "";
let output = "";
const env = {
  ...process.env, NODE_ENV: "production", PASSCODE: passcode, APP_ORIGIN: origin,
  SUPABASE_URL: "", SUPABASE_SERVICE_KEY: "", VERCEL: "",
  WORKSPACE_DEMO: "", WORKSPACE_LOCAL_PREVIEW: "", WORKSPACE_DATA_DIR: dataDir,
};
async function start(overrides = {}) {
  child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    env: { ...env, ...overrides }, stdio: ["ignore", "pipe", "pipe"],
  });
  output = "";
  child.stdout.on("data", d => { output += d; });
  child.stderr.on("data", d => { output += d; });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error("Server exited before readiness.");
    try { await fetch(`${origin}/unlock`); return; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("Server did not become ready.");
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exiting = new Promise(r => child.once("exit", r));
  child.kill("SIGTERM");
  await exiting;
}
async function request(path, body, options = {}) {
  const method = options.method || (body === undefined ? "GET" : "POST");
  return fetch(origin + path, {
    method, redirect: "manual",
    headers: {
      ...(cookie ? { cookie } : {}), ...(body !== undefined ? { "content-type": "application/json", origin } : {}),
      ...options.headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function ok(path, body, options) {
  const response = await request(path, body, options);
  assert.equal(response.status, 200, `${path}: ${response.status}`);
  return response;
}
const stored = async () => JSON.parse(await readFile(resolve(dataDir, "dev.json"), "utf8"));
try {
  await start();
  assert.equal((await request("/api/checkin")).status, 401);
  assert.equal((await request("/api/media/00000000-0000-4000-8000-000000000000.png")).status, 401);
  assert.equal((await request("/api/unlock", { code: "wrong" })).status, 401);
  const unlock = await ok("/api/unlock", { code: passcode });
  cookie = unlock.headers.get("set-cookie").split(";")[0];
  assert.ok(!cookie.includes(passcode), "Cookie must not contain the passcode.");
  assert.equal((await request("/api/checkin", undefined, { headers: { cookie: `workspace_session=${passcode}` } })).status, 401);
  assert.equal((await request("/api/checkin", { date }, { headers: { origin: "https://other.invalid" } })).status, 403);
  assert.equal((await request("/api/checkin", { date, gratitude: "bad type" })).status, 400);
  assert.equal((await request("/api/routines", { action: "add", title: "invalid", time: "25:90" })).status, 400);
  assert.equal((await request("/api/items", { action: "add", kind: "job_posting", data: { title: "removed" } })).status, 400);
  for (const route of ["/", "/routines", "/tasks", "/diary", "/goals", "/study", "/history", "/scraps", "/notes", "/reading", "/culture", "/travel", "/contents"]) {
    await ok(route);
  }
  for (const route of ["/wiki", "/jobs", "/portfolio", "/api/portfolio", "/api/widget"]) {
    assert.equal((await request(route)).status, 404, `${route} must be absent.`);
  }
  await ok("/api/checkin", { date, first_task: "Integration priority", first_task_done: true, gratitude: ["one", "", ""], learned: "saved", mood: "좋음" });
  assert.equal((await stored()).routines.length, 0, "Fresh installs must have no personal routine seeds.");
  await ok("/api/routines", { action: "add", title: "Integration routine", time: "08:00", color: "blue", desc: "test" });
  const routineId = (await stored()).routines[0].id;
  await ok("/api/routines", { action: "check", id: routineId, date, done: true });
  await ok("/api/items", { action: "add", kind: "note", data: { title: "Integration note", body: '<p>safe</p><img src=x onerror="alert(1)">' } });
  const noteId = (await stored()).items[0].id;
  assert.doesNotMatch((await stored()).items[0].data.body, /onerror/);
  await ok("/api/worklog", { date, minutes: 25, project: "Test project", note: "before" });
  const logId = (await stored()).workLogs[0].id;
  await ok("/api/worklog", { action: "update", id: logId, minutes: 40, project: "Test project", note: "after" });
  assert.equal((await stored()).workLogs[0].id, logId, "Edits must retain the original log ID.");
  const goals = (await (await ok("/api/goals")).json()).goals;
  goals.motto = "Integration goal";
  await ok("/api/goals", { goals }, { method: "PUT" });
  const form = new FormData();
  form.append("file", new Blob([await readFile("public/mascot.png")], { type: "image/png" }), "test.png");
  const upload = await fetch(origin + "/api/upload", { method: "POST", headers: { cookie, origin }, body: form });
  assert.equal(upload.status, 200);
  const media = (await upload.json()).url;
  assert.ok(media.startsWith("/api/media/"));
  assert.equal((await ok(media)).headers.get("content-type"), "image/png");
  const badForm = new FormData();
  badForm.append("file", new Blob(["<script>alert(1)</script>"], { type: "image/png" }), "fake.png");
  assert.equal((await fetch(origin + "/api/upload", { method: "POST", headers: { cookie, origin }, body: badForm })).status, 400);
  const badOrigin = await fetch(origin + "/api/upload", { method: "POST", headers: { cookie, origin: "https://other.invalid" }, body: form });
  assert.equal(badOrigin.status, 403);
  await stop();
  await start();
  const reloaded = (await (await ok(`/api/checkin?date=${date}`)).json()).checkin;
  assert.equal(reloaded.first_task, "Integration priority");
  assert.equal((await stored()).workLogs[0].minutes, 40);
  assert.equal((await (await ok("/api/goals")).json()).goals.motto, "Integration goal");
  await ok(media);
  await ok("/api/items", { action: "delete", id: noteId });
  await ok("/api/routines", { action: "delete", id: routineId });
  await ok("/api/worklog", { action: "delete", id: logId });
  assert.equal((await stored()).items.length, 0);
  assert.equal((await stored()).routines.length, 0);
  assert.equal((await stored()).routineChecks.length, 0);
  assert.equal((await stored()).workLogs.length, 0);
  await stop();
  await start({ PASSCODE: "" });
  assert.equal((await request("/api/checkin")).status, 503, "Production must fail closed without a passcode.");
  console.log("Integration passed: 13 pages, removed routes, auth/CSRF, input validation, CRUD, private images, restart persistence and fail-closed production.");
} catch (error) {
  console.error(error);
  // Intentionally do not print server logs, cookies, environment or credentials.
  process.exitCode = 1;
} finally {
  await stop();
  await rm(dataDir, { recursive: true, force: true });
}
