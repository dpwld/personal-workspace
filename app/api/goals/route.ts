import { NextRequest, NextResponse } from "next/server";
import { getGoals, saveGoals } from "@/lib/store";
import { validGoals } from "@/lib/validation.mjs";
import { GoalsDoc } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ goals: await getGoals() });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { goals: GoalsDoc };
  if (!validGoals(body?.goals)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  await saveGoals(body.goals);
  return NextResponse.json({ ok: true });
}
