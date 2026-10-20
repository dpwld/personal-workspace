import { NextRequest, NextResponse } from "next/server";
import { addItem, deleteItem, updateItem } from "@/lib/store";
import { cleanMemo } from "@/lib/memo-sanitize.mjs";
import { validId } from "@/lib/validation.mjs";

const KINDS = new Set(["task", "diary", "note", "scrap", "book", "book_note", "course", "assignment", "lecture", "culture", "travel", "channel", "idea", "okr", "quarter_goal"]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid body" }, { status: 400 });
  if (["update", "delete"].includes(body.action) && !validId(body.id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  if (body.action === "add") {
    const kind = String(body.kind ?? "");
    if (!KINDS.has(kind)) return NextResponse.json({ error: "unknown kind" }, { status: 400 });
    const data = sanitize(body.data);
    if (!Object.values(data).some((v) => v.trim())) {
      return NextResponse.json({ error: "empty" }, { status: 400 });
    }
    await addItem(kind, data);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "update") {
    await updateItem(String(body.id), sanitize(body.data));
    return NextResponse.json({ ok: true });
  }
  if (body.action === "delete") {
    await deleteItem(String(body.id));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

function sanitize(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string" && !["__proto__", "constructor", "prototype"].includes(k)) out[k] = k === "body" ? cleanMemo(v.slice(0, 20000)) : v.slice(0, 20000);
    }
  }
  return out;
}
