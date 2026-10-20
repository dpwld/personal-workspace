"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// 오른쪽 슬라이드 패널 (Notion peek 스타일). ESC·오버레이 클릭으로 닫힘.
// body 포털로 렌더해서 조상 transform/애니메이션에 잘리지 않는다.
export default function Drawer({
  open,
  onClose,
  title,
  children,
  width = 440,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Notion 피크처럼 열리면 첫 입력에 바로 타이핑 가능하게
    const timer = setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        "input:not([type='hidden']), textarea, [contenteditable='true'], select"
      );
      el?.focus();
    }, 290);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className="drawer-overlay"
        data-open={open}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        ref={panelRef}
        className="drawer"
        data-open={open}
        inert={!open}
        style={{ width: `min(${width}px, 94vw)` }}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "상세"}
      >
        <div className="drawer__head">
          {title && <h2 className="text-[16px] font-bold">{title}</h2>}
          <button
            className="btn btn--tertiary btn--sm btn--icon-only"
            style={{ ["--btn-h" as string]: "32px", marginLeft: "auto" }}
            aria-label="닫기"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </div>
        <div className="drawer__body">{children}</div>
      </aside>
    </>,
    document.body
  );
}
