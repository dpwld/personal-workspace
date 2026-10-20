"use client";

import { useState } from "react";
import { Check, Target } from "lucide-react";
import Drawer from "@/components/drawer";
import { GoalsDoc } from "@/lib/types";
import { requestMutation } from "@/lib/client-request.mjs";

export default function GoalsClient({ initial }: { initial: GoalsDoc }) {
  const [doc, setDoc] = useState<GoalsDoc>(initial);
  const [editingBlock, setEditingBlock] = useState<number | null>(null);
  const [editingRoot, setEditingRoot] = useState<number | null>(null);
  const [editingMotto, setEditingMotto] = useState(false);
  const [editingCenter, setEditingCenter] = useState(false);
  const [centerText, setCenterText] = useState(initial.center ?? "특별한 나");
  const [blockText, setBlockText] = useState("");
  const [rootForm, setRootForm] = useState({ title: "", desc: "" });
  const [mottoText, setMottoText] = useState(initial.motto);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function persist(next: GoalsDoc) {
    setBusy(true);
    setSaved(false);
    setSaveError(null);
    try {
      const error = await requestMutation("/api/goals", { goals: next }, "PUT");
      if (error) {
        setSaveError(error);
        return false;
      }
      setDoc(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function saveBlock() {
    if (editingBlock === null) return;
    const lines = blockText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const next = structuredClone(doc);
    next.mandala[editingBlock].name = lines[0];
    next.mandala[editingBlock].items = lines.slice(1);
    if (await persist(next)) setEditingBlock(null);
  }

  async function saveRoot() {
    if (editingRoot === null) return;
    const next = structuredClone(doc);
    next.roots[editingRoot].title = rootForm.title.trim() || next.roots[editingRoot].title;
    next.roots[editingRoot].desc = rootForm.desc.trim();
    if (await persist(next)) setEditingRoot(null);
  }

  const saveErrorAlert = saveError && (
    <p className="alert text-sm" role="alert" style={{ color: "var(--color-danger)" }}>{saveError}</p>
  );

  return (
    <div className="flex flex-col gap-6">
      {!editingCenter && editingRoot === null && editingBlock === null && saveErrorAlert}
      <div className="page-head flex items-baseline justify-between" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title flex items-center gap-2"><Target size={19} style={{ color: "var(--color-accent-500)" }} />목표판</h1>
          <p className="page-desc">확정된 목표만. 카드를 눌러 언제든 수정할 수 있다.</p>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--color-success)" }}>
            <Check size={15} /> 저장됨
          </span>
        )}
      </div>

      {/* 인생 다짐 */}
      {editingMotto ? (
        <div className="card card--tight anim-in flex flex-col gap-2">
          <textarea
            className="input"
            rows={2}
            value={mottoText}
            onChange={(e) => setMottoText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="btn btn--tertiary btn--sm" onClick={() => setEditingMotto(false)}>취소</button>
            <button
              className="btn btn--primary btn--sm"
              disabled={busy}
              onClick={async () => {
                const next = structuredClone(doc);
                next.motto = mottoText.trim() || doc.motto;
                if (await persist(next)) setEditingMotto(false);
              }}
            >
              저장
            </button>
          </div>
        </div>
      ) : (
        <button
          className="card anim-in w-full text-left"
          style={{ background: "var(--color-accent-500)", border: 0 }}
          onClick={() => {
            setMottoText(doc.motto);
            setEditingMotto(true);
          }}
        >
          <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>인생 다짐</p>
          <p className="mt-1 text-[17px] font-bold leading-relaxed text-white" style={{ textWrap: "balance" }}>
            {doc.motto}
          </p>
        </button>
      )}

      {/* 뿌리 4층: 화면 비중을 줄이려고 2열 컴팩트 카드로 표시 */}
      <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {doc.roots.map((r, i) => (
          <div
            key={r.tag}
            className="card anim-in hover-lift cursor-pointer"
            style={{
              padding: "14px 16px",
              animationDelay: `${i * 40}ms`,
              ...(r.engine ? { borderColor: "var(--color-accent-300)", background: "var(--color-accent-50)" } : {}),
            }}
          >
            <button
              className="w-full cursor-pointer text-left"
              onClick={() => {
                setEditingRoot(i);
                setRootForm({ title: r.title, desc: r.desc });
              }}
            >
              <span className="text-[11px] font-bold" style={{ color: "var(--color-accent-500)" }}>{r.tag}</span>
              <h2 className="mt-0.5 text-[14px] font-bold leading-snug">{r.title}</h2>
              <p
                className="mt-0.5 text-[12px]"
                style={{
                  color: "var(--color-gray-500)",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {r.desc}
              </p>
            </button>
          </div>
        ))}
      </section>

      {/* 만다라트 9x9 (엑셀 스타일) */}
      <section className="anim-in">
        <h2 className="section-title" style={{ marginBottom: 6 }}>만다라트</h2>
        <p className="page-desc" style={{ marginTop: 0, marginBottom: 14 }}>
          칸을 누르면 그 영역을 수정할 수 있다. 가운데 노란 칸이 나.
        </p>
        <div className="mgrid-scroll">
          <div className="mgrid" role="grid" aria-label="만다라트">
            {Array.from({ length: 81 }, (_, idx) => {
              const row = Math.floor(idx / 9);
              const col = idx % 9;
              const br = Math.floor(row / 3);
              const bc = Math.floor(col / 3);
              const r = row % 3;
              const c = col % 3;
              const blockLayout = [
                [0, 1, 2],
                [3, -1, 4],
                [5, 6, 7],
              ];
              const bi = blockLayout[br][bc];
              const inner = r * 3 + c; // 0..8, 4 = 블록 중앙
              const itemIdx = inner < 4 ? inner : inner - 1;
              const thickR = col === 2 || col === 5;
              const thickB = row === 2 || row === 5;
              let text = "";
              let cls = "mgrid-cell";
              let onClick: (() => void) | undefined;
              if (bi === -1) {
                // 중앙 블록: 테마명 미니 셀 + 가운데 나
                if (inner === 4) {
                  text = doc.center ?? "특별한 나";
                  cls += " mgrid-cell--center";
                  onClick = () => {
                    setCenterText(doc.center ?? "특별한 나");
                    setEditingCenter(true);
                  };
                } else {
                  const m = doc.mandala[itemIdx];
                  text = m?.name ?? "";
                  cls += " mgrid-cell--minitheme";
                  onClick = () => {
                    if (!m) return;
                    setEditingBlock(itemIdx);
                    setBlockText([m.name, ...m.items].join("\n"));
                  };
                }
              } else {
                const m = doc.mandala[bi];
                if (inner === 4) {
                  text = m?.name ?? "";
                  cls += " mgrid-cell--theme";
                } else {
                  text = m?.items[itemIdx] ?? "";
                }
                onClick = () => {
                  if (!m) return;
                  setEditingBlock(bi);
                  setBlockText([m.name, ...m.items].join("\n"));
                };
              }
              return (
                <button
                  key={idx}
                  className={cls}
                  data-thick-r={thickR || undefined}
                  data-thick-b={thickB || undefined}
                  onClick={onClick}
                  tabIndex={inner === 4 || bi === -1 ? 0 : -1}
                  aria-label={text || "빈 칸"}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 중심 편집 Drawer */}
      <Drawer open={editingCenter} onClose={() => setEditingCenter(false)} title="만다라트 중심" width={420}>
        {saveErrorAlert}
        <div className="flex flex-col gap-3">
          <p className="text-[13px]" style={{ color: "var(--color-gray-500)" }}>
            만다라트 한가운데 놓을 한 단어. 모든 키워드가 이 사람을 향한다.
          </p>
          <input
            className="input text-center font-bold"
            value={centerText}
            onChange={(e) => setCenterText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="btn btn--tertiary btn--sm" onClick={() => setEditingCenter(false)}>취소</button>
            <button
              className="btn btn--primary btn--sm"
              disabled={busy}
              onClick={async () => {
                const next = structuredClone(doc);
                next.center = centerText.trim() || "특별한 나";
                if (await persist(next)) setEditingCenter(false);
              }}
            >
              저장
            </button>
          </div>
        </div>
      </Drawer>

      {/* 뿌리 편집 Drawer */}
      <Drawer
        open={editingRoot !== null}
        onClose={() => setEditingRoot(null)}
        title={editingRoot !== null ? doc.roots[editingRoot]?.tag : undefined}
        width={520}
      >
        {saveErrorAlert}
        <div className="flex flex-col gap-3">
          <label>
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>제목</span>
            <input
              className="input font-bold"
              value={rootForm.title}
              onChange={(e) => setRootForm({ ...rootForm, title: e.target.value })}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--color-gray-500)" }}>설명</span>
            <textarea
              className="input"
              rows={4}
              value={rootForm.desc}
              onChange={(e) => setRootForm({ ...rootForm, desc: e.target.value })}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button className="btn btn--tertiary btn--sm" onClick={() => setEditingRoot(null)}>취소</button>
            <button className="btn btn--primary btn--sm" disabled={busy} onClick={saveRoot}>저장</button>
          </div>
        </div>
      </Drawer>

      {/* 만다라트 블록 편집 Drawer */}
      <Drawer
        open={editingBlock !== null}
        onClose={() => setEditingBlock(null)}
        title={editingBlock !== null ? doc.mandala[editingBlock]?.name : undefined}
        width={520}
      >
        {saveErrorAlert}
        <div className="flex flex-col gap-3">
          <p className="text-xs" style={{ color: "var(--color-gray-500)" }}>
            첫 줄은 영역 이름, 아래 줄들이 실행 항목이다.
          </p>
          <textarea
            className="input text-[13px]"
            rows={Math.max(14, blockText.split("\n").length + 2)}
            value={blockText}
            onChange={(e) => setBlockText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="btn btn--tertiary btn--sm" onClick={() => setEditingBlock(null)}>취소</button>
            <button className="btn btn--primary btn--sm" disabled={busy} onClick={saveBlock}>저장</button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
