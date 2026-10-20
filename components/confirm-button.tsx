"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

// Notion식 인라인 삭제 확인: 브라우저 confirm 창 대신
// 첫 클릭에 버튼이 빨갛게 "삭제?"로 바뀌고, 3초 안에 다시 누르면 실행된다.
export default function ConfirmButton({
  onConfirm,
  disabled,
  size = 28,
  label = "삭제",
}: {
  onConfirm: () => void;
  disabled?: boolean;
  size?: number;
  label?: string;
}) {
  const [arming, setArming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (arming) {
    return (
      <button
        className="btn btn--sm"
        style={{
          ["--btn-h" as string]: `${size}px`,
          background: "var(--nt-tag-red-bg)",
          color: "var(--nt-tag-red-fg)",
          border: "1px solid var(--nt-red)",
          fontWeight: 600,
        }}
        disabled={disabled}
        aria-label={`${label} 확인`}
        onClick={() => {
          if (timer.current) clearTimeout(timer.current);
          setArming(false);
          onConfirm();
        }}
      >
        {label}?
      </button>
    );
  }

  return (
    <button
      className="btn btn--tertiary btn--sm btn--icon-only"
      style={{ ["--btn-h" as string]: `${size}px` }}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        setArming(true);
        timer.current = setTimeout(() => setArming(false), 3000);
      }}
    >
      <Trash2 size={12} />
    </button>
  );
}
