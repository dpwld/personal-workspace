"use client";

import { requestMutation } from "@/lib/client-request.mjs";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import ConfirmButton from "@/components/confirm-button";
import { Item } from "@/lib/types";

type KR = { title: string; progress: number };

function parseKRs(s?: string): KR[] {
  try {
    const arr = JSON.parse(s ?? "[]");
    return Array.isArray(arr)
      ? arr.map((k) => ({ title: String(k.title ?? ""), progress: Math.min(100, Math.max(0, Number(k.progress) || 0)) }))
      : [];
  } catch {
    return [];
  }
}

const QUARTERS = ["2026 Q3", "2026 Q4", "2027 Q1", "2027 Q2"];

export default function OkrClient({ objectives }: { objectives: Item[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{ title: string; quarter: string; krs: KR[] }>({
    title: "",
    quarter: QUARTERS[0],
    krs: [{ title: "", progress: 0 }],
  });
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function post(payload: object) {
    setBusy(true);
    setSaveError(null);
    try {
      const error = await requestMutation("/api/items", payload);
      if (error) {
        setSaveError(error);
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!form.title.trim()) return;
    const krs = form.krs.filter((k) => k.title.trim());
    const data = { title: form.title, quarter: form.quarter, krs: JSON.stringify(krs) };
    const saved = editing === "new"
      ? await post({ action: "add", kind: "okr", data })
      : await post({ action: "update", id: editing, data });
    if (!saved) return;
    setEditing(null);
  }

  async function setProgress(obj: Item, idx: number, progress: number) {
    const krs = parseKRs(obj.data.krs);
    krs[idx] = { ...krs[idx], progress: Math.min(100, Math.max(0, progress)) };
    if (!(await post({ action: "update", id: obj.id, data: { ...obj.data, krs: JSON.stringify(krs) } }))) return;
  }

  const editor = (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <label className="min-w-52 flex-1">
          <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>Objective, 이루고 싶은 것</span>
          <input className="input" placeholder="예: 새로운 기술을 배우고 작은 프로젝트를 완성한다" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label style={{ width: 130 }}>
          <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>분기</span>
          <select className="input" value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })}>
            {QUARTERS.map((q) => <option key={q}>{q}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>Key Results, 측정 가능한 결과</span>
        {form.krs.map((kr, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input flex-1"
              style={{ width: "auto" }}
              placeholder={`KR ${i + 1} (예: 열전달 강의 12강 완강)`}
              value={kr.title}
              onChange={(e) => {
                const krs = [...form.krs];
                krs[i] = { ...krs[i], title: e.target.value };
                setForm({ ...form, krs });
              }}
            />
            <button
              className="btn btn--tertiary btn--sm btn--icon-only"
              style={{ ["--btn-h" as string]: "48px" }}
              aria-label="KR 삭제"
              onClick={() => setForm({ ...form, krs: form.krs.filter((_, j) => j !== i) })}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          className="btn btn--tertiary btn--sm self-start"
          onClick={() => setForm({ ...form, krs: [...form.krs, { title: "", progress: 0 }] })}
        >
          <Plus size={14} /> KR 추가
        </button>
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn btn--tertiary btn--sm" onClick={() => setEditing(null)}>취소</button>
        <button className="btn btn--primary btn--sm" disabled={busy || !form.title.trim()} onClick={save}>저장</button>
      </div>
    </div>
  );

  const saveErrorAlert = saveError && (
    <p className="alert text-sm" role="alert" style={{ color: "var(--color-danger)" }}>{saveError}</p>
  );

  return (
    <div className="flex flex-col gap-4">
      {saveErrorAlert}
      {editing === null ? (
        <button
          className="btn btn--secondary btn--sm self-start"
          onClick={() => {
            setEditing("new");
            setForm({ title: "", quarter: QUARTERS[0], krs: [{ title: "", progress: 0 }] });
          }}
        >
          <Plus size={15} /> Objective 추가
        </button>
      ) : (
        editing === "new" && editor
      )}

      {QUARTERS.map((quarter) => {
        const group = objectives.filter((o) => (o.data.quarter || QUARTERS[0]) === quarter);
        if (group.length === 0) return null;
        return (
          <section key={quarter}>
            <h3 className="mb-2 text-[13px] font-bold" style={{ color: "var(--color-gray-500)" }}>{quarter}</h3>
            <div className="flex flex-col gap-3">
              {group.map((obj) => {
                const id = String(obj.id);
                if (editing === id) return <div key={id}>{editor}</div>;
                const krs = parseKRs(obj.data.krs);
                const overall = krs.length > 0 ? Math.round(krs.reduce((s, k) => s + k.progress, 0) / krs.length) : 0;
                return (
                  <div key={id} className="card hover-lift">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-bold">{obj.data.title}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--color-gray-100)" }}>
                            <div className="h-full rounded-full" style={{ width: `${overall}%`, background: "var(--color-accent-500)", transition: "width 180ms cubic-bezier(0.4,0,0.2,1)" }} />
                          </div>
                          <span className="text-sm font-bold tabular-nums" style={{ color: "var(--color-accent-500)" }}>{overall}%</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          className="btn btn--tertiary btn--sm btn--icon-only"
                          style={{ ["--btn-h" as string]: "30px" }}
                          aria-label="수정"
                          onClick={() => {
                            setEditing(id);
                            setForm({ title: obj.data.title ?? "", quarter: obj.data.quarter ?? QUARTERS[0], krs: parseKRs(obj.data.krs) });
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                        <ConfirmButton size={30} disabled={busy} onConfirm={() => post({ action: "delete", id })} />
                      </div>
                    </div>
                    {krs.length > 0 && (
                      <ul className="mt-4 flex flex-col gap-2.5">
                        {krs.map((kr, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <span className="min-w-0 flex-1 text-sm leading-relaxed">{kr.title}</span>
                            <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full" style={{ background: "var(--color-gray-100)" }}>
                              <div className="h-full rounded-full" style={{ width: `${kr.progress}%`, background: "var(--color-success)", transition: "width 180ms cubic-bezier(0.2,0,0,1)" }} />
                            </div>
                            <input
                              key={`range-${kr.progress}`}
                              className="shrink-0"
                              style={{ width: 96, accentColor: "var(--color-accent-500)" }}
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              defaultValue={kr.progress}
                              aria-label={`${kr.title} 진행률 슬라이더`}
                              onPointerUp={(e) => {
                                const v = Number((e.target as HTMLInputElement).value);
                                if (v !== kr.progress) setProgress(obj, i, v);
                              }}
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (v !== kr.progress) setProgress(obj, i, v);
                              }}
                            />
                            <input
                              key={`num-${kr.progress}`}
                              className="input shrink-0 text-center tabular-nums"
                              style={{ width: 64, height: 34, padding: "0 6px", fontSize: 13 }}
                              type="number"
                              min={0}
                              max={100}
                              defaultValue={kr.progress}
                              aria-label={`${kr.title} 진행률`}
                              onBlur={(e) => {
                                const v = Number(e.target.value);
                                if (v !== kr.progress) setProgress(obj, i, v);
                              }}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
