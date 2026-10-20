"use client";

import { requestMutation } from "@/lib/client-request.mjs";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Inbox, Pencil, Plus, Trash2 } from "lucide-react";
import ConfirmButton from "@/components/confirm-button";
import Drawer from "@/components/drawer";
import { CollectionConfig, OPTION_COLORS } from "@/lib/collections";
import { Item, ddayLabel, todaySeoul } from "@/lib/types";

function emptyForm(config: CollectionConfig): Record<string, string> {
  const f: Record<string, string> = {};
  for (const field of config.fields) {
    f[field.key] = field.type === "select" ? (field.options?.[0] ?? "") : "";
  }
  return f;
}

function hostOf(url?: string): string | null {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

export function ColorChip({ value }: { value: string }) {
  const color = OPTION_COLORS[value];
  if (!color) return <span className="chip chip--sm chip--surface">{value}</span>;
  return (
    <span
      className="chip chip--sm"
      style={{
        borderRadius: 4,
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
        color: `color-mix(in oklab, ${color} 55%, #263226)`,
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {value}
    </span>
  );
}

export default function CollectionClient({
  config,
  items,
  heading = true,
}: {
  config: CollectionConfig;
  items: Item[];
  heading?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null); // 상세로 보는 item id
  const [editing, setEditing] = useState<string | null>(null); // item id or "new"
  const [form, setForm] = useState<Record<string, string>>(emptyForm(config));
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("전체");
  const today = todaySeoul();

  async function post(body: object) {
    setBusy(true);
    setSaveError(null);
    try {
      const error = await requestMutation("/api/items", body);
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

  async function submit() {
    if (!form[config.titleKey]?.trim()) return;
    if (editing === "new") {
      if (!(await post({ action: "add", kind: config.kind, data: form }))) return;
      closeDrawer();
    } else {
      if (!(await post({ action: "update", id: editing, data: form }))) return;
      setEditing(null); // 상세 보기로 복귀
    }
  }

  function closeDrawer() {
    setSelected(null);
    setEditing(null);
  }

  function openDetail(item: Item) {
    setSelected(String(item.id));
    setEditing(null);
  }

  function openEdit(item: Item) {
    setForm({ ...emptyForm(config), ...item.data });
    setSelected(String(item.id));
    setEditing(String(item.id));
  }

  function openAdd() {
    setForm(emptyForm(config));
    setSelected(null);
    setEditing("new");
  }

  async function remove(id: string) {
    if (!(await post({ action: "delete", id }))) return;
    closeDrawer();
  }

  const sorted = config.dateKey
    ? items.slice().sort((a, b) => (a.data[config.dateKey!] ?? "9999").localeCompare(b.data[config.dateKey!] ?? "9999"))
    : items;

  const groupOptions = config.groupBy
    ? (config.fields.find((f) => f.key === config.groupBy)?.options ?? [])
    : [];
  const defaultOption = groupOptions[0];

  const groups: { name: string | null; rows: Item[] }[] = config.groupBy
    ? groupOptions
        .filter((opt) => tab === "전체" || tab === opt)
        .map((opt) => ({
          name: opt,
          rows: sorted.filter((i) => (i.data[config.groupBy!] || defaultOption) === opt),
        }))
    : [{ name: null, rows: sorted }];

  const drawerOpen = editing !== null || selected !== null;
  const selectedItem = selected !== null ? items.find((i) => String(i.id) === selected) : undefined;

  const formView = (
    <div className="flex flex-col gap-3">
      {config.fields.map((f) => (
        <label key={f.key}>
          <span className="mb-1 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>
            {f.label}
          </span>
          {f.type === "select" ? (
            <select
              className="input"
              value={form[f.key] ?? ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            >
              {f.options?.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : f.type === "textarea" ? (
            <textarea
              className="input"
              rows={4}
              value={form[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          ) : (
            <input
              className="input"
              type={f.type === "date" ? "date" : f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
              value={form[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          )}
        </label>
      ))}
      <div className="flex justify-end gap-2 pt-1">
        <button
          className="btn btn--tertiary btn--sm"
          onClick={() => (editing === "new" || selected === null ? closeDrawer() : setEditing(null))}
        >
          취소
        </button>
        <button className="btn btn--primary btn--sm" disabled={busy || !form[config.titleKey]?.trim()} onClick={submit}>
          저장
        </button>
      </div>
    </div>
  );

  const detailView = selectedItem && (
    <div className="flex flex-col">
      <h3 className="text-[20px] font-bold leading-snug" style={{ wordBreak: "keep-all" }}>
        {selectedItem.data[config.titleKey]}
      </h3>
      {config.dday && config.dateKey && selectedItem.data[config.dateKey] && selectedItem.data.status !== "완료" && (
        <div className="mt-2">
          <span className="chip chip--sm chip--accent tabular-nums">
            {ddayLabel(selectedItem.data[config.dateKey], today)}
          </span>
        </div>
      )}
      <div className="mt-5 flex flex-col gap-4">
        {config.fields
          .filter((f) => f.key !== config.titleKey && (selectedItem.data[f.key] ?? "").trim() !== "")
          .map((f) => (
            <div key={f.key}>
              <p className="mb-1 text-xs font-semibold" style={{ color: "var(--color-gray-400)" }}>
                {f.label}
              </p>
              {f.type === "url" ? (
                <a
                  href={selectedItem.data[f.key]}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--secondary btn--sm"
                >
                  <ExternalLink size={14} /> {hostOf(selectedItem.data[f.key]) ?? "링크 열기"}
                </a>
              ) : f.type === "select" ? (
                <ColorChip value={selectedItem.data[f.key]} />
              ) : (
                <p
                  className={`leading-relaxed ${f.type === "date" || f.type === "number" ? "text-sm tabular-nums" : "text-sm"}`}
                  style={{ whiteSpace: "pre-wrap", wordBreak: "keep-all" }}
                >
                  {selectedItem.data[f.key]}
                </p>
              )}
            </div>
          ))}
      </div>
      <div
        className="flex justify-end gap-2 border-t"
        style={{ borderColor: "var(--color-gray-100)", marginTop: 28, paddingTop: 16 }}
      >
        <ConfirmButton size={32} disabled={busy} onConfirm={() => remove(String(selectedItem.id))} />
        <button className="btn btn--secondary btn--sm" onClick={() => openEdit(selectedItem)}>
          <Pencil size={14} /> 수정
        </button>
      </div>
    </div>
  );

  const addButton = (
    <button className={`btn ${heading ? "btn--primary" : "btn--secondary"} btn--sm shrink-0`} onClick={openAdd}>
      <Plus size={15} /> {config.addLabel}
    </button>
  );

  const saveErrorAlert = saveError && (
    <p className="alert text-sm" role="alert" style={{ color: "var(--color-danger)" }}>{saveError}</p>
  );

  return (
    <div className="flex flex-col gap-4">
      {selected === null && editing === null && saveErrorAlert}
      {heading ? (
        <div className="page-head flex items-start justify-between gap-3" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="page-title">{config.title}</h1>
            <p className="page-desc">{config.desc}</p>
          </div>
          {addButton}
        </div>
      ) : (
        <div>{addButton}</div>
      )}

      {config.groupBy && groupOptions.length > 1 && (
        <div className="tabs">
          {["전체", ...groupOptions].map((t) => (
            <button key={t} className="tab" data-active={tab === t} onClick={() => setTab(t)}>
              {t}
              <span className="ml-1.5 text-xs font-medium" style={{ color: "var(--color-gray-400)" }}>
                {t === "전체"
                  ? items.length
                  : sorted.filter((i) => (i.data[config.groupBy!] || defaultOption) === t).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.name ?? "all"}>
          {g.name && tab === "전체" && (
            <h2 className="mb-2 text-[13px] font-bold" style={{ color: "var(--color-gray-500)" }}>
              <ColorChip value={g.name} />
            </h2>
          )}
          <div className="flex flex-col gap-2.5">
            {g.rows.length === 0 && (g.name === null || tab !== "전체") && (
              <p className="flex items-center gap-2 text-sm" style={{ color: "var(--color-gray-400)" }}>
                <Inbox size={15} /> 아직 항목이 없어요.
              </p>
            )}
            {g.rows.map((item, index) => {
              const host = hostOf(item.data.url);
              return (
                <div
                  key={item.id}
                  className="group card card--tight anim-in hover-lift flex cursor-pointer items-start gap-3"
                  style={{ animationDelay: `${index * 40}ms` }}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") openDetail(item);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.data.url ? (
                        <a
                          href={item.data.url}
                          target="_blank"
                          rel="noreferrer"
                          className="link text-[15px] font-bold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.data[config.titleKey]}
                        </a>
                      ) : (
                        <span className="text-[15px] font-bold">{item.data[config.titleKey]}</span>
                      )}
                      {host && (
                        <span className="text-xs font-medium" style={{ color: "var(--color-gray-400)" }}>{host}</span>
                      )}
                      {config.chipKeys.map(
                        (k) => item.data[k] && <ColorChip key={k} value={item.data[k]} />
                      )}
                      {config.dateKey && item.data[config.dateKey] && (
                        <span className="text-xs font-medium tabular-nums" style={{ color: "var(--color-gray-400)" }}>
                          {item.data[config.dateKey]}
                        </span>
                      )}
                      {config.dday && item.data[config.dateKey ?? ""] && item.data.status !== "완료" && (
                        <span className="chip chip--sm chip--accent tabular-nums">
                          {ddayLabel(item.data[config.dateKey!], today)}
                        </span>
                      )}
                    </div>
                    {config.metaKeys?.map(
                      (k) =>
                        item.data[k] && (
                          <p key={k} className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--color-gray-500)", whiteSpace: "pre-wrap" }}>
                            {item.data[k]}
                          </p>
                        )
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                    <button
                      className="btn btn--tertiary btn--sm btn--icon-only"
                      style={{ ["--btn-h" as string]: "32px" }}
                      aria-label="수정"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(item);
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <span onClick={(e) => e.stopPropagation()}><ConfirmButton disabled={busy} onConfirm={() => remove(String(item.id))} /></span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        width={460}
        title={editing === "new" ? config.addLabel : editing !== null ? "수정" : undefined}
      >
        {saveErrorAlert}
        {editing !== null ? formView : detailView}
      </Drawer>
    </div>
  );
}
