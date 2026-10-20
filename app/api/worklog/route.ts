import { NextRequest, NextResponse } from "next/server";
import { addWorkLog, deleteWorkLog, updateWorkLog } from "@/lib/store";
import { validDate, validId } from "@/lib/validation.mjs";
import { todaySeoul } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid body" }, { status: 400 });
  if (["update", "delete"].includes(body.action) && !validId(body.id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  if (body.date !== undefined && !validDate(body.date)) return NextResponse.json({ error: "invalid date" }, { status: 400 });
  if (body.action === "delete") {
    await deleteWorkLog(String(body.id));
    return NextResponse.json({ ok: true });
  }
  const minutes = Number(body.minutes);
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) {
    return NextResponse.json({ error: "minutes must be positive" }, { status: 400 });
  }
  const project = String(body.project ?? "").trim() || "기타";
  if (body.action === "update") await updateWorkLog(body.id, minutes, project, String(body.note ?? ""));
  else await addWorkLog(body.date ?? todaySeoul(), minutes, project, String(body.note ?? ""));
  return NextResponse.json({ ok: true });
}
