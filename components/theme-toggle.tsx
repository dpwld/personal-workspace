"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// 다크/라이트 토글. 선택은 localStorage(yos-theme)에 저장, 초기 적용은 layout의 인라인 스크립트가 담당.
export default function ThemeToggle({ withLabel }: { withLabel?: boolean }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (next === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("yos-theme", next);
    } catch {}
  }

  return (
    <button
      className={withLabel ? "nav-btn" : "btn btn--tertiary btn--sm btn--icon-only"}
      style={withLabel ? undefined : { ["--btn-h" as string]: "28px" }}
      aria-label={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
      onClick={toggle}
    >
      {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
      {withLabel && <span>{theme === "light" ? "다크 모드" : "라이트 모드"}</span>}
    </button>
  );
}
