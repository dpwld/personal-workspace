"use client";

import { requestMutation } from "@/lib/client-request.mjs";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import ConfirmButton from "@/components/confirm-button";
import Drawer from "@/components/drawer";
import { ColorChip } from "@/components/collection-client";
import { MemoEditor } from "@/components/memo-editor";
import MemoView from "@/components/memo-view";
import { Item, todaySeoul } from "@/lib/types";

const PARA = ["Inbox", "Project", "Area", "Resource", "Archive"];

// HTML에서 태그를 걷어낸 평문 (미리보기·저장 판단용)
function plainText(s?: string): string {
  if (!s) return "";
  if (!s.includes("<")) return s;
  return s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export default function NotesClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const [tab, setTab] = useState("전체");
  const [open, setOpen] = useState<string | null>(null); // note id or "new"
  const [form, setForm] = useState({ title: "", para: "Inbox", date: "" });
  const [initialBody, setInitialBody] = useState("");
  const bodyRef = useRef("");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sorted = items
    .slice()
    .sort((a, b) => (b.data.date ?? "").localeCompare(a.data.date ?? ""));
  const rows = tab === "전체" ? sorted : sorted.filter((n) => (n.data.para || "Inbox") === tab);

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

  function openNote(n: Item) {
    setOpen(String(n.id));
    setForm({ title: n.data.title ?? "", para: n.data.para || "Inbox", date: n.data.date ?? "" });
    setInitialBody(n.data.body ?? "");
    bodyRef.current = n.data.body ?? "";
  }

  function openNew() {
    setOpen("new");
    setForm({ title: "", para: "Inbox", date: todaySeoul() });
    setInitialBody("");
    bodyRef.current = "";
  }

  async function save() {
    if (!form.title.trim()) return;
    const data = {
      title: form.title.trim(),
      para: form.para,
      body: bodyRef.current,
      date: form.date || todaySeoul(),
    };
    const saved = open === "new"
      ? await post({ action: "add", kind: "note", data })
      : await post({ action: "update", id: open, data });
    if (!saved) return;
    setOpen(null);
  }

  async function remove() {
    if (open === null || open === "new") return;
    if (!(await post({ action: "delete", id: open }))) return;
    setOpen(null);
  }

  const saveErrorAlert = saveError && (
    <p className="alert text-sm" role="alert" style={{ color: "var(--color-danger)" }}>{saveError}</p>
  );

  return (
    <div className="flex flex-col gap-4">
      {open === null && saveErrorAlert}
      <div className="page-head flex items-start justify-between gap-3" style={{ marginBottom: 0 }}>
        <div>
          <div className="flex items-center gap-2">
            <FileText size={18} style={{ color: "var(--color-accent-500)" }} />
            <h1 className="page-title">노트</h1>
          </div>
          <p className="page-desc">PARA로 분류하는 메모. 일단 Inbox에 넣고 나중에 옮기면 된다.</p>
        </div>
        <button className="btn btn--primary btn--sm shrink-0" onClick={openNew}>
          <Plus size={15} /> 노트 추가
        </button>
      </div>

      <div className="tabs">
        {["전체", ...PARA].map((t) => (
          <button key={t} className="tab" data-active={tab === t} onClick={() => setTab(t)}>
            {t}
            <span className="ml-1.5 text-xs font-medium" style={{ color: "var(--color-gray-400)" }}>
              {t === "전체" ? items.length : items.filter((n) => (n.data.para || "Inbox") === t).length}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-gray-400)" }}>아직 노트가 없어요.</p>
        )}
        {rows.map((n, index) => {
          const preview = plainText(n.data.body);
          return (
            <div
              key={n.id}
              className="card card--tight anim-in hover-lift cursor-pointer"
              style={{ animationDelay: `${index * 40}ms` }}
              role="button"
              tabIndex={0}
              onClick={() => openNote(n)}
              onKeyDown={(e) => {
                if (e.key === "Enter") openNote(n);
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-bold">{n.data.title}</span>
                <ColorChip value={n.data.para || "Inbox"} />
                {n.data.date && (
                  <span className="text-xs font-medium tabular-nums" style={{ color: "var(--color-gray-400)" }}>
                    {n.data.date}
                  </span>
                )}
              </div>
              {preview && (
                <p
                  className="mt-1.5 text-[13px] leading-relaxed"
                  style={{
                    color: "var(--color-gray-500)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {preview}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Drawer
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === "new" ? "노트 추가" : "노트"}
        width={720}
      >
        {saveErrorAlert}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <label className="min-w-40 flex-1">
              <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>제목</span>
              <input
                className="input"
                placeholder="노트 제목"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label style={{ width: 140 }}>
              <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>분류</span>
              <select
                className="input"
                value={form.para}
                onChange={(e) => setForm({ ...form, para: e.target.value })}
              >
                {PARA.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ minHeight: 320 }}>
            <MemoEditor
              key={open ?? "closed"}
              value={initialBody}
              onSave={(html) => {
                bodyRef.current = html;
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            {open !== null && open !== "new" && (
              <span style={{ marginRight: "auto" }}>
                <ConfirmButton size={32} disabled={busy} onConfirm={remove} />
              </span>
            )}
            <button className="btn btn--tertiary btn--sm" onClick={() => setOpen(null)}>취소</button>
            <button className="btn btn--primary btn--sm" disabled={busy || !form.title.trim()} onClick={save}>
              저장
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
