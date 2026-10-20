"use client";

import { cleanMemo } from "@/lib/memo-sanitize.mjs";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, Strikethrough, Trash2, Plus, Minus } from "lucide-react";
import { applyBlockTag, buildTable, currentBlock, handleBlockEnter, handleListEnter, handleTab, tableOp, toggleList, type BlockTag } from "./memo-blocks";

// Personal Workspace 이식: 멘션은 개인 도구라 비활성(빈 목록), 첨부는 인증된 /api/media 경로 사용
const MENTION_NAMES: string[] = [];
const TEAM_MEMBERS: { id: string; fullName: string; title: string }[] = [];
function UserAvatar(_props: { memberKey: string; size: string }) {
  return null;
}

/* 워드/노션식 자유 메모 편집기 (contentEditable).
   - "/" 슬래시 메뉴로 블록 삽입 (제목·리스트·투두·표(크기 선택)·구분선·인용·코드)
   - 텍스트를 드래그하면 떠오르는 서식 툴바 (B/I/U/S + 블록 변환)
   - 표: 캐럿이 안에 있으면 행/열 추가·삭제 툴바, 열 경계 드래그로 너비 조절
   - 블록 변환은 전부 직접 DOM 조작(memoBlocks) — execCommand의 formatBlock/
     insertList는 상태에 따라 조용히 실패해서 쓰지 않는다. 인라인(B/I/U/S)만
     execCommand 사용(신뢰 가능).
   저장 포맷은 HTML — 허용된 태그와 속성만 보존하며 첨부 경로는 인증을 거친다. */

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

/** Wrap bare URLs in text nodes with anchors (run on blur, before save). */
function linkify(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    if (t.parentElement?.closest("a")) continue;
    if (URL_RE.test(t.textContent ?? "")) targets.push(t);
    URL_RE.lastIndex = 0;
  }
  for (const t of targets) {
    const span = document.createElement("span");
    span.innerHTML = (t.textContent ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(URL_RE, (u) => {
      const a = document.createElement("a");
      a.href = u;
      a.textContent = u;
      a.target = "_blank";
      a.rel = "noreferrer noopener";
      return a.outerHTML;
    });
    t.replaceWith(...Array.from(span.childNodes));
  }
}

const mentionRe = () =>
  new RegExp(`@(?:${MENTION_NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");

/** Highlight @mentions as people tags (run on blur, before save — like linkify). */
function mentionify(root: HTMLElement) {
  if (MENTION_NAMES.length === 0) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    if (t.parentElement?.closest("a,[data-mention]")) continue;
    if (mentionRe().test(t.textContent ?? "")) targets.push(t);
  }
  for (const t of targets) {
    const span = document.createElement("span");
    span.innerHTML = (t.textContent ?? "").replace(mentionRe(), (m) =>
      `<span data-mention style="color:var(--color-accent-500);font-weight:600;background:color-mix(in srgb, var(--color-accent-500) 8%, transparent);border-radius:4px;padding:0 3px">${m}</span>`);
    t.replaceWith(...Array.from(span.childNodes));
  }
}

/** Wrap an <img> in a horizontally-resizable holder (Word-style corner drag). */
function makeResizableImage(img: HTMLImageElement): HTMLElement {
  const wrap = document.createElement("span");
  wrap.setAttribute("data-resize", "1");
  wrap.style.display = "inline-block";
  wrap.style.resize = "horizontal";
  wrap.style.overflow = "hidden";
  wrap.style.maxWidth = "100%";
  wrap.style.width = img.style.width && img.style.width !== "100%" ? img.style.width : "320px";
  wrap.style.margin = "6px 0";
  img.style.width = "100%";
  img.style.height = "auto";
  img.style.display = "block";
  img.style.borderRadius = "8px";
  img.style.margin = "0";
  wrap.appendChild(img);
  return wrap;
}

type SlashAction =
  | { kind: "block"; tag: BlockTag }
  | { kind: "list"; type: "ul" | "ol" }
  | { kind: "todo" }
  | { kind: "table" }
  | { kind: "divider" };

const SLASH_BLOCKS: { key: string; label: string; hint: string; action: SlashAction }[] = [
  { key: "text", label: "Text", hint: "Aa", action: { kind: "block", tag: "p" } },
  { key: "h1", label: "Heading 1", hint: "#", action: { kind: "block", tag: "h1" } },
  { key: "h2", label: "Heading 2", hint: "##", action: { kind: "block", tag: "h2" } },
  { key: "h3", label: "Heading 3", hint: "###", action: { kind: "block", tag: "h3" } },
  { key: "bullet", label: "Bulleted list", hint: "•", action: { kind: "list", type: "ul" } },
  { key: "number", label: "Numbered list", hint: "1.", action: { kind: "list", type: "ol" } },
  { key: "todo", label: "To-do", hint: "☑", action: { kind: "todo" } },
  { key: "table", label: "Table", hint: "⿲", action: { kind: "table" } },
  { key: "divider", label: "Divider", hint: "—", action: { kind: "divider" } },
  { key: "quote", label: "Quote", hint: "❝", action: { kind: "block", tag: "blockquote" } },
  { key: "code", label: "Code", hint: "{ }", action: { kind: "block", tag: "pre" } },
];

/** Storage backend for uploads — defaults to the docs bucket (sprint memos);
   the Board passes its own bucket so readers don't need the Docs grant. */
export interface MemoFileStore {
  upload: (file: File) => Promise<string>;
  url: (path: string) => Promise<string>;
}

const DEFAULT_STORE: MemoFileStore = {
  upload: async (f) => {
    const form = new FormData();
    form.append("file", f);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("upload failed");
    const { url } = await res.json();
    return url as string;
  },
  url: async (p) => p,
};

export function MemoEditor({ value, onSave, files = DEFAULT_STORE, minHeight = 180 }: { value: string; onSave: (html: string) => void; files?: MemoFileStore; minHeight?: number | string }) {
  const ref = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(!value);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  // "/" 메뉴 (query로 필터, tablePick = 표 크기 선택 단계)
  const [slash, setSlash] = useState<{ x: number; y: number; query: string; tablePick: boolean } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  // "@" 사람 멘션 메뉴 — 슬래시 메뉴와 같은 캐럿 위치 팝업 패턴
  const [mention, setMention] = useState<{ x: number; y: number; query: string } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [tableHover, setTableHover] = useState<{ r: number; c: number }>({ r: 2, c: 3 });

  // 드래그 선택 서식 툴바 / 표 편집 툴바
  const [selBar, setSelBar] = useState<{ x: number; y: number } | null>(null);
  const [tableBar, setTableBar] = useState<{ x: number; y: number; table: HTMLTableElement; cell: HTMLElement | null } | null>(null);

  const colDrag = useRef<{ cells: HTMLElement[]; startX: number; startW: number } | null>(null);

  const slashItems = slash && !slash.tablePick
    ? SLASH_BLOCKS.filter((b) => b.label.toLowerCase().includes(slash.query.toLowerCase()))
    : [];
  const mentionItems = mention
    ? TEAM_MEMBERS.filter((m) => m.fullName.toLowerCase().startsWith(mention.query.toLowerCase()))
    : [];

  // Mount (keyed per task): inject stored HTML, re-resolve signed URLs.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = cleanMemo(value);
    setEmpty(!(el.textContent ?? "").trim() && !el.querySelector("img"));
    el.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      if (!img.parentElement?.hasAttribute("data-resize")) {
        const wrap = makeResizableImage(img.cloneNode(true) as HTMLImageElement);
        img.replaceWith(wrap);
      }
    });
    el.querySelectorAll<HTMLElement>("[data-path]").forEach((node) => {
      const path = node.getAttribute("data-path");
      if (!path) return;
      files.url(path)
        .then((u) => {
          if (node.tagName === "IMG") (node as HTMLImageElement).src = u;
          else if (node.tagName === "A") (node as HTMLAnchorElement).href = u;
        })
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Serialize for storage: strip scripts, blank out expiring signed URLs. */
  function serialize(): string {
    const el = ref.current;
    if (!el) return "";
    // Checkbox state lives on the DOM property — mirror it into the attribute
    // so it survives HTML serialization.
    el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => {
      if (cb.checked) cb.setAttribute("checked", "");
      else cb.removeAttribute("checked");
    });
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("script,style").forEach((x) => x.remove());
    // 인증된 첨부 경로를 유지한다.
    return cleanMemo(clone.innerHTML);
  }

  function save() {
    const el = ref.current;
    if (!el) return;
    linkify(el);
    mentionify(el);
    setEmpty(!(el.textContent ?? "").trim() && !el.querySelector("img"));
    onSave(serialize());
  }

  /** Insert a node at the caret (or append when the caret is elsewhere). */
  function insertAtCaret(node: Node) {
    const el = ref.current;
    if (!el) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      el.appendChild(node);
    }
  }

  async function insertFile(file: File) {
    setBusy(true);
    try {
      const path = await files.upload(file);
      const url = await files.url(path);
      if ((file.type || "").startsWith("image/")) {
        const img = document.createElement("img");
        img.src = url;
        img.setAttribute("data-path", path);
        img.alt = file.name;
        insertAtCaret(makeResizableImage(img));
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.setAttribute("data-path", path);
        a.textContent = "📎 " + file.name;
        a.target = "_blank";
        a.rel = "noreferrer noopener";
        insertAtCaret(a);
        insertAtCaret(document.createTextNode(" "));
      }
      setEmpty(false);
      onSave(serialize());
    } catch (err) {
      console.error("memo attach failed:", err);
    } finally {
      setBusy(false);
    }
  }

  // ── 슬래시 메뉴 ──────────────────────────────────────────────────────────
  function openSlashMenu() {
    const sel = window.getSelection();
    const wrap = wrapRef.current;
    if (!sel || sel.rangeCount === 0 || !wrap) return;
    let rect = sel.getRangeAt(0).getBoundingClientRect();
    // 빈 블록의 collapsed 캐럿은 rect가 (0,0)으로 나온다 — 캐럿이 든 요소의
    // rect로 폴백해 메뉴가 화면 꼭대기로 튀지 않게 한다.
    let bottom = rect.bottom;
    if (rect.top === 0 && rect.left === 0 && rect.width === 0) {
      const node = sel.anchorNode;
      const el = node && node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement;
      if (el && el.getBoundingClientRect) {
        const er = el.getBoundingClientRect();
        // 요소 전체 박스의 bottom이 아니라 '첫 줄' 높이 기준으로.
        rect = er;
        bottom = er.top + Math.min(er.height, 24);
      }
    }
    const wrapRect = wrap.getBoundingClientRect();
    setSlash({ x: Math.max(0, Math.min(rect.left - wrapRect.left, 240)), y: bottom - wrapRect.top + 4, query: "", tablePick: false });
    setSlashIndex(0);
  }

  /** "@" 메뉴 — 슬래시 메뉴와 같은 캐럿 좌표 계산. */
  function openMentionMenu() {
    const sel = window.getSelection();
    const wrap = wrapRef.current;
    if (!sel || sel.rangeCount === 0 || !wrap) return;
    let rect = sel.getRangeAt(0).getBoundingClientRect();
    let bottom = rect.bottom;
    if (rect.top === 0 && rect.left === 0 && rect.width === 0) {
      const node = sel.anchorNode;
      const el = node && node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement;
      if (el && el.getBoundingClientRect) {
        const er = el.getBoundingClientRect();
        rect = er;
        bottom = er.top + Math.min(er.height, 24);
      }
    }
    const wrapRect = wrap.getBoundingClientRect();
    setMention({ x: Math.max(0, Math.min(rect.left - wrapRect.left, 240)), y: bottom - wrapRect.top + 4, query: "" });
    setMentionIndex(0);
  }

  /** Delete the typed "@query", then insert the highlighted mention tag. */
  function pickMention(fullName: string) {
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0 || !mention) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    const n = 1 + mention.query.length;
    if (node.nodeType === Node.TEXT_NODE && range.startOffset >= n) {
      range.setStart(node, range.startOffset - n);
      range.deleteContents();
    }
    const first = fullName.split(" ")[0];
    const span = document.createElement("span");
    span.setAttribute("data-mention", "");
    span.setAttribute("style", "color:var(--color-accent-500);font-weight:600;background:color-mix(in srgb, var(--color-accent-500) 8%, transparent);border-radius:4px;padding:0 3px");
    span.textContent = "@" + first;
    const space = document.createTextNode("\u00a0");
    range.insertNode(space);
    range.insertNode(span);
    range.setStartAfter(space);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    el.focus();
    setMention(null);
    setMentionIndex(0);
    save();
  }

  /** Delete the typed "/query" (right before running an action). */
  function eraseSlashText() {
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0 || !slash) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    const n = 1 + slash.query.length;
    if (node.nodeType === Node.TEXT_NODE && range.startOffset >= n) {
      range.setStart(node, range.startOffset - n);
      range.deleteContents();
    }
    el.focus();
  }

  function runSlashAction(action: SlashAction) {
    const el = ref.current;
    if (!el) return;
    if (action.kind === "table") {
      // Stage 2: size picker (keep the typed "/table" until a size is chosen).
      setSlash((s0) => (s0 ? { ...s0, tablePick: true } : s0));
      setTableHover({ r: 2, c: 3 });
      return;
    }
    eraseSlashText();
    if (action.kind === "block") applyBlockTag(el, action.tag);
    else if (action.kind === "list") toggleList(el, action.type);
    else if (action.kind === "todo") {
      const div = document.createElement("div");
      div.innerHTML = '<input type="checkbox"> ';
      insertAtCaret(div);
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(div);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else if (action.kind === "divider") {
      const hr = document.createElement("hr");
      const p = document.createElement("p");
      p.appendChild(document.createElement("br"));
      insertAtCaret(hr);
      hr.parentNode?.insertBefore(p, hr.nextSibling);
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(p);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    setSlash(null);
    setSlashIndex(0);
    save();
  }

  function insertTableSized(rows: number, cols: number) {
    const el = ref.current;
    if (!el) return;
    eraseSlashText();
    const table = buildTable(rows, cols);
    const block = currentBlock(el, window.getSelection()?.anchorNode ?? null);
    if (block && !(block.textContent ?? "").trim()) block.replaceWith(table);
    else insertAtCaret(table);
    const p = document.createElement("p");
    p.appendChild(document.createElement("br"));
    table.parentNode?.insertBefore(p, table.nextSibling);
    const first = table.querySelector("th,td") as HTMLElement | null;
    if (first) {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(first);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    setSlash(null);
    save();
  }

  function onEditorKeyDown(e: React.KeyboardEvent) {
    if (e.nativeEvent.isComposing) return; // 한글 IME 조합 중엔 단축키·블록 로직 미적용
    // Ctrl/Cmd+B·I·U — 드래그 툴바 없이 바로 서식 (브라우저 기본에 기대지 않고
    // 명시 처리해 저장까지 이어지게 한다).
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
      const k = e.key.toLowerCase();
      if (k === "b" || k === "i" || k === "u") {
        e.preventDefault();
        applyInline(k === "b" ? "bold" : k === "i" ? "italic" : "underline");
        return;
      }
    }
    if (mention) {
      if (e.key === "Escape") { e.preventDefault(); setMention(null); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (mentionItems.length ? (i + 1) % mentionItems.length : 0)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (mentionItems.length ? (i - 1 + mentionItems.length) % mentionItems.length : 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const m = mentionItems[mentionIndex];
        if (m) pickMention(m.fullName); else setMention(null);
        return;
      }
      if (e.key === "Backspace") { setMention((m0) => (m0 && m0.query ? { ...m0, query: m0.query.slice(0, -1) } : null)); setMentionIndex(0); return; }
      if (e.key.length === 1) { setMention((m0) => (m0 ? { ...m0, query: m0.query + e.key } : m0)); setMentionIndex(0); return; }
      if (e.key !== "Shift") setMention(null);
      return;
    }
    if (!slash) {
      if (e.key === "@") {
        requestAnimationFrame(openMentionMenu);
        return;
      }
      if (e.key === "/") {
        // "/" 문자가 DOM에 들어간 다음 프레임에 측정 — keydown 시점의 빈 블록
        // collapsed 캐럿은 rect가 없어서 메뉴가 엉뚱한 곳(편집기 박스 기준)에 떴다.
        requestAnimationFrame(openSlashMenu);
        return;
      }
      // Notion-style keys: to-dos continue on Enter (empty → exit), headings
      // continue as text, blank last line in code/quote exits, Tab indents.
      if (e.key === "Enter" && !e.shiftKey && ref.current) {
        if (handleListEnter(ref.current) || handleBlockEnter(ref.current)) {
          e.preventDefault();
          save();
        }
        return;
      }
      if (e.key === "Tab" && ref.current && handleTab(ref.current, e.shiftKey)) {
        e.preventDefault();
        save();
      }
      return;
    }
    if (slash.tablePick) {
      if (e.key === "Escape") {
        e.preventDefault();
        setSlash(null);
      } else if (e.key === "Enter") {
        e.preventDefault();
        insertTableSized(tableHover.r + 1, tableHover.c + 1);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setSlash(null);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSlashIndex((i) => (slashItems.length ? (i + 1) % slashItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSlashIndex((i) => (slashItems.length ? (i - 1 + slashItems.length) % slashItems.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const block = slashItems[slashIndex];
      if (block) runSlashAction(block.action);
      else setSlash(null);
    } else if (e.key === "Backspace") {
      setSlash((s0) => (s0 && s0.query ? { ...s0, query: s0.query.slice(0, -1) } : null));
      setSlashIndex(0);
    } else if (e.key.length === 1) {
      setSlash((s0) => (s0 ? { ...s0, query: s0.query + e.key } : s0));
      setSlashIndex(0);
    } else if (e.key !== "Shift") {
      setSlash(null);
    }
  }

  // ── 선택/표 툴바 위치 갱신 (mouseup/keyup) ───────────────────────────────
  function refreshBars() {
    const el = ref.current;
    const wrap = wrapRef.current;
    const sel = window.getSelection();
    if (!el || !wrap || !sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
      setSelBar(null);
      setTableBar(null);
      return;
    }
    const wrapRect = wrap.getBoundingClientRect();

    if (!sel.isCollapsed) {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setSelBar({ x: Math.max(0, rect.left - wrapRect.left), y: Math.max(-34, rect.top - wrapRect.top - 40) });
    } else {
      setSelBar(null);
    }

    const anchorEl = sel.anchorNode instanceof HTMLElement ? sel.anchorNode : sel.anchorNode?.parentElement;
    const table = anchorEl?.closest("table");
    if (table && el.contains(table)) {
      const tRect = table.getBoundingClientRect();
      setTableBar({
        x: Math.max(0, tRect.right - wrapRect.left - 180),
        y: Math.max(-34, tRect.top - wrapRect.top - 36),
        table: table as HTMLTableElement,
        cell: (anchorEl?.closest("th,td") as HTMLElement | null) ?? null,
      });
    } else {
      setTableBar(null);
    }
  }

  function applyInline(cmd: "bold" | "italic" | "underline" | "strikeThrough") {
    document.execCommand(cmd);
    save();
  }

  function applySelBlock(action: SlashAction) {
    const el = ref.current;
    if (!el) return;
    if (action.kind === "block") applyBlockTag(el, action.tag);
    else if (action.kind === "list") toggleList(el, action.type);
    setSelBar(null);
    save();
  }

  function runTableOp(op: "addRow" | "delRow" | "addCol" | "delCol" | "delete") {
    if (!tableBar) return;
    if (op === "delete") tableBar.table.remove();
    else tableOp(tableBar.table, tableBar.cell, op);
    setTableBar(null);
    save();
  }

  // ── 표 열 너비 드래그 (셀 오른쪽 경계 6px 잡고 끌기) ─────────────────────
  function onEditorMouseMove(e: React.MouseEvent) {
    if (colDrag.current) {
      const dx = e.clientX - colDrag.current.startX;
      const w = Math.max(36, colDrag.current.startW + dx);
      for (const c of colDrag.current.cells) c.style.width = `${w}px`;
      return;
    }
    const el = ref.current;
    const cell = (e.target as HTMLElement).closest?.("th,td") as HTMLElement | null;
    if (!el) return;
    if (!cell) {
      el.style.cursor = "";
      return;
    }
    const rect = cell.getBoundingClientRect();
    el.style.cursor = rect.right - e.clientX < 6 ? "col-resize" : "";
  }

  function onEditorMouseDown(e: React.MouseEvent) {
    const cell = (e.target as HTMLElement).closest?.("th,td") as HTMLElement | null;
    if (!cell) return;
    const rect = cell.getBoundingClientRect();
    if (rect.right - e.clientX >= 6) return;
    const table = cell.closest("table");
    if (!table) return;
    e.preventDefault();
    const colIndex = Array.from(cell.parentElement!.children).indexOf(cell);
    const cells = Array.from(table.querySelectorAll("tr"))
      .map((r) => r.children[colIndex] as HTMLElement | undefined)
      .filter((c): c is HTMLElement => !!c);
    colDrag.current = { cells, startX: e.clientX, startW: rect.width };
    const onUp = () => {
      colDrag.current = null;
      window.removeEventListener("mouseup", onUp);
      save();
    };
    window.addEventListener("mouseup", onUp);
  }

  const barBtn: React.CSSProperties = {
    border: "none", background: "none", cursor: "pointer", borderRadius: 6,
    padding: "4px 7px", display: "inline-flex", alignItems: "center", gap: 1,
    font: "inherit", fontSize: "var(--text-xs)", color: "var(--text-default)",
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {empty && (
        <div style={{ position: "absolute", top: 10, left: 12, color: "var(--text-subtle)", fontSize: "var(--text-sm)", pointerEvents: "none", lineHeight: 1.5 }}>
          자유롭게 적어보세요. &apos;/&apos;를 누르면 제목, 목록, 표 같은 블록을 넣을 수 있고,
          <br />
          텍스트를 드래그하면 서식을, 이미지는 붙여넣기나 드래그로 추가할 수 있어요.
        </div>
      )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="sx-memo"
        style={{
          minHeight,
          border: dragOver ? "1.5px dashed var(--color-accent-500)" : "1px solid transparent",
          borderRadius: 10, padding: "10px 12px",
          fontSize: "var(--text-sm)", color: "var(--text-default)", lineHeight: 1.6,
          background: "transparent", outline: "none",
          overflowWrap: "anywhere",
        }}
        onKeyDown={onEditorKeyDown}
        onKeyUp={refreshBars}
        onMouseUp={refreshBars}
        onMouseMove={onEditorMouseMove}
        onMouseDown={onEditorMouseDown}
        onInput={() => {
          const el = ref.current;
          if (el) setEmpty(!(el.textContent ?? "").trim() && !el.querySelector("img"));
        }}
        onBlur={() => {
          setSlash(null);
          setSelBar(null);
          setTableBar(null);
          save();
        }}
        onPaste={(e) => {
          const items = Array.from(e.clipboardData?.items ?? []);
          const imgs = items.filter((it) => it.kind === "file" && it.type.startsWith("image/"));
          if (imgs.length > 0) {
            e.preventDefault();
            for (const it of imgs) {
              const f = it.getAsFile();
              if (f) void insertFile(f);
            }
          }
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files ?? []);
          if (files.length > 0) {
            e.preventDefault();
            for (const f of files) void insertFile(f);
          }
        }}
        onClick={(e) => {
          // 링크는 클릭으로 바로 열기 (편집은 링크 밖 텍스트에서).
          const a = (e.target as HTMLElement).closest("a");
          if (!a) return;
          e.preventDefault();
          const path = a.getAttribute("data-path");
          if (path) {
            files.url(path).then((u) => window.open(u, "_blank", "noopener")).catch(() => {});
          } else if (a.getAttribute("href") && a.getAttribute("href") !== "#") {
            window.open(a.getAttribute("href")!, "_blank", "noopener");
          }
        }}
      />

      {/* ── @ 사람 멘션 메뉴 ── */}
      {mention && mentionItems.length > 0 && (
        <div
          className="sx-anim-pop"
          role="menu"
          style={{
            position: "absolute", left: mention.x, top: mention.y, zIndex: 40, minWidth: 230,
            background: "var(--surface-card)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)", boxShadow: "0 10px 30px rgba(0,0,0,.16)", padding: 4,
          }}
        >
          <div style={{ fontSize: "var(--text-2xs)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-subtle)", padding: "5px 8px 3px" }}>
            People
          </div>
          {mentionItems.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="menuitem"
              onMouseDown={(e) => { e.preventDefault(); pickMention(m.fullName); }}
              onMouseEnter={() => setMentionIndex(i)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                border: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", padding: "6px 8px",
                background: i === mentionIndex ? "var(--color-accent-50)" : "none", font: "inherit",
              }}
            >
              <UserAvatar memberKey={m.id} size="xs" />
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-strong)", flex: 1 }}>{m.fullName}</span>
              <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-subtle)" }}>{m.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── 슬래시 메뉴 ── */}
      {slash && !slash.tablePick && slashItems.length > 0 && (
        <div
          className="sx-anim-pop"
          role="menu"
          style={{
            position: "absolute", left: slash.x, top: slash.y, zIndex: 40, minWidth: 220,
            background: "var(--surface-card)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)", boxShadow: "0 10px 30px rgba(0,0,0,.16)", padding: 4,
          }}
        >
          <div style={{ fontSize: "var(--text-2xs)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-subtle)", padding: "5px 8px 3px" }}>
            Basic blocks
          </div>
          {slashItems.map((b, i) => (
            <button
              key={b.key}
              type="button"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault(); // keep the caret/selection alive
                runSlashAction(b.action);
              }}
              onMouseEnter={() => setSlashIndex(i)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                border: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", padding: "6px 8px",
                background: i === slashIndex ? "var(--color-accent-50)" : "none", font: "inherit",
              }}
            >
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-strong)", flex: 1 }}>{b.label}</span>
              <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-subtle)" }}>{b.hint}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── 표 크기 선택 그리드 ── */}
      {slash?.tablePick && (
        <div
          className="sx-anim-pop"
          style={{
            position: "absolute", left: slash.x, top: slash.y, zIndex: 40,
            background: "var(--surface-card)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)", boxShadow: "0 10px 30px rgba(0,0,0,.16)", padding: 10,
          }}
        >
          <div style={{ fontSize: "var(--text-2xs)", color: "var(--text-subtle)", paddingBottom: 6 }}>
            {tableHover.r + 1} × {tableHover.c + 1} table
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 18px)", gap: 3 }}>
            {Array.from({ length: 36 }, (_, i) => {
              const r = Math.floor(i / 6);
              const c = i % 6;
              const on = r <= tableHover.r && c <= tableHover.c;
              return (
                <span
                  key={i}
                  onMouseEnter={() => setTableHover({ r, c })}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertTableSized(r + 1, c + 1);
                  }}
                  style={{
                    width: 18, height: 18, borderRadius: 3, cursor: "pointer",
                    border: `1px solid ${on ? "var(--color-accent-500)" : "var(--border-default)"}`,
                    background: on ? "var(--color-accent-50)" : "transparent",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── 드래그 선택 서식 툴바 ── */}
      {selBar && (
        <div
          className="sx-anim-pop"
          role="toolbar"
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "absolute", left: Math.min(selBar.x, 230), top: selBar.y, zIndex: 41,
            display: "flex", alignItems: "center", gap: 2,
            background: "var(--surface-card)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)", boxShadow: "0 10px 30px rgba(0,0,0,.16)", padding: 3,
          }}
        >
          <button type="button" style={barBtn} title="Bold" onClick={() => applyInline("bold")}><Bold size={13} /></button>
          <button type="button" style={barBtn} title="Italic" onClick={() => applyInline("italic")}><Italic size={13} /></button>
          <button type="button" style={barBtn} title="Underline" onClick={() => applyInline("underline")}><Underline size={13} /></button>
          <button type="button" style={barBtn} title="Strikethrough" onClick={() => applyInline("strikeThrough")}><Strikethrough size={13} /></button>
          <span style={{ width: 1, alignSelf: "stretch", background: "var(--border-subtle)", margin: "0 3px" }} />
          <button type="button" style={{ ...barBtn, fontWeight: 700 }} title="Heading 1" onClick={() => applySelBlock({ kind: "block", tag: "h1" })}>H1</button>
          <button type="button" style={{ ...barBtn, fontWeight: 700 }} title="Heading 2" onClick={() => applySelBlock({ kind: "block", tag: "h2" })}>H2</button>
          <button type="button" style={{ ...barBtn, fontWeight: 700 }} title="Heading 3" onClick={() => applySelBlock({ kind: "block", tag: "h3" })}>H3</button>
          <button type="button" style={barBtn} title="Bulleted list" onClick={() => applySelBlock({ kind: "list", type: "ul" })}>•</button>
          <button type="button" style={barBtn} title="Numbered list" onClick={() => applySelBlock({ kind: "list", type: "ol" })}>1.</button>
          <button type="button" style={barBtn} title="Quote" onClick={() => applySelBlock({ kind: "block", tag: "blockquote" })}>❝</button>
          <button type="button" style={{ ...barBtn, fontFamily: "var(--font-mono)" }} title="Code" onClick={() => applySelBlock({ kind: "block", tag: "pre" })}>{"{}"}</button>
          <button type="button" style={barBtn} title="Plain text" onClick={() => applySelBlock({ kind: "block", tag: "p" })}>Aa</button>
        </div>
      )}

      {/* ── 표 편집 툴바 ── */}
      {tableBar && !selBar && (
        <div
          className="sx-anim-pop"
          role="toolbar"
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "absolute", left: tableBar.x, top: tableBar.y, zIndex: 41,
            display: "flex", alignItems: "center", gap: 2,
            background: "var(--surface-card)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)", boxShadow: "0 10px 30px rgba(0,0,0,.16)", padding: 3,
          }}
        >
          <button type="button" style={barBtn} title="Add row below" onClick={() => runTableOp("addRow")}><Plus size={12} />R</button>
          <button type="button" style={barBtn} title="Delete row" onClick={() => runTableOp("delRow")}><Minus size={12} />R</button>
          <button type="button" style={barBtn} title="Add column right" onClick={() => runTableOp("addCol")}><Plus size={12} />C</button>
          <button type="button" style={barBtn} title="Delete column" onClick={() => runTableOp("delCol")}><Minus size={12} />C</button>
          <span style={{ width: 1, alignSelf: "stretch", background: "var(--border-subtle)", margin: "0 3px" }} />
          <button type="button" style={{ ...barBtn, color: "var(--red-600)" }} title="Delete table" onClick={() => runTableOp("delete")}><Trash2 size={12} /></button>
        </div>
      )}

      {busy && (
        <div style={{ position: "absolute", right: 10, bottom: 8, fontSize: "var(--text-2xs)", color: "var(--text-muted)" }}>
          Uploading…
        </div>
      )}
    </div>
  );
}
