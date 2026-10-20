import { NextRequest, NextResponse } from "next/server";
import { getCheckin, upsertCheckin } from "@/lib/store";
import { validDate } from "@/lib/validation.mjs";
import { Checkin, todaySeoul } from "@/lib/types";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? todaySeoul();
  if (!validDate(date)) return NextResponse.json({ error: "invalid date" }, { status: 400 });
  const checkin = await getCheckin(date);
  return NextResponse.json({ checkin });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid body" }, { status: 400 });
  if (["first_task", "learned", "mood"].some(k => body[k] !== undefined && (typeof body[k] !== "string" || body[k].length > 20000)) || (body.first_task_done !== undefined && typeof body.first_task_done !== "boolean") || (body.gratitude !== undefined && (!Array.isArray(body.gratitude) || body.gratitude.length !== 3 || !body.gratitude.every((x: unknown) => typeof x === "string" && x.length <= 20000)))) return NextResponse.json({ error: "invalid checkin" }, { status: 400 });
  const date: string = body.date ?? todaySeoul();
  if (!validDate(date)) return NextResponse.json({ error: "invalid date" }, { status: 400 });
  const prev = await getCheckin(date);
  const next: Checkin = {
    date,
    first_task: body.first_task ?? prev?.first_task ?? "",
    first_task_done: body.first_task_done ?? prev?.first_task_done ?? false,
    gratitude: body.gratitude ?? prev?.gratitude ?? ["", "", ""],
    learned: body.learned ?? prev?.learned ?? "",
    mood: body.mood ?? prev?.mood ?? "",
    updated_at: new Date().toISOString(),
  };
  await upsertCheckin(next);
  return NextResponse.json({ ok: true, checkin: next });
}
