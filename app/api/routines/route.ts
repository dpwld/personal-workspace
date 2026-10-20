import { NextRequest, NextResponse } from "next/server";
import { addRoutine, deleteRoutine, setRoutineCheck, updateRoutine } from "@/lib/store";
import { validDate, validTime, validId } from "@/lib/validation.mjs";
import { todaySeoul } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid body" }, { status: 400 });
  if (body.action !== "add" && !validId(body.id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  if (body.date !== undefined && !validDate(body.date)) return NextResponse.json({ error: "invalid date" }, { status: 400 });
  if (body.time !== undefined && !validTime(body.time)) return NextResponse.json({ error: "invalid time" }, { status: 400 });
  if (body.action === "check" && typeof body.done !== "boolean") return NextResponse.json({ error: "invalid check" }, { status: 400 });

  if (body.action === "check") {
    await setRoutineCheck(body.date ?? todaySeoul(), String(body.id), Boolean(body.done));
    return NextResponse.json({ ok: true });
  }
  if (body.action === "add") {
    const title = String(body.title ?? "").trim();
    const time = String(body.time ?? "").trim();
    const color = String(body.color ?? "blue");
    const desc = String(body.desc ?? "");
    if (!title || !validTime(time)) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    await addRoutine(title, time, color, desc);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "update") {
    const patch: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();
    if (typeof body.time === "string" && validTime(body.time)) patch.time = body.time;
    if (typeof body.color === "string") patch.color = body.color;
    if (typeof body.desc === "string") patch.desc = body.desc;
    await updateRoutine(String(body.id), patch);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "delete") {
    await deleteRoutine(String(body.id));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
