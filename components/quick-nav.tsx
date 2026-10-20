"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Book,
  BookOpen,
  CalendarCheck,
  Clock3,
  CornerDownLeft,
  FileText,
  GraduationCap,
  History,
  Lightbulb,
  ListTodo,
  Newspaper,
  NotebookPen,
  Plane,
  Search,
  Target,
} from "lucide-react";

// Notion의 cmd+K 검색처럼 어디서든 페이지로 점프하는 팔레트.
// 사이드바 검색줄 클릭(yos:quicknav 이벤트) 또는 cmd/ctrl+K로 연다.
const PAGES: { href: string; label: string; keywords: string; icon: React.ReactNode }[] = [
  { href: "/", label: "오늘", keywords: "today 체크인 우선순위 작업로그", icon: <CalendarCheck /> },
  { href: "/routines", label: "루틴", keywords: "routine 습관 아침 저녁", icon: <Clock3 /> },
  { href: "/tasks", label: "할 일", keywords: "task todo 마감", icon: <ListTodo /> },
  { href: "/diary", label: "일기장", keywords: "diary 일기 기분", icon: <NotebookPen /> },
  { href: "/goals", label: "목표판", keywords: "goal 만다라트 목표 다짐", icon: <Target /> },
  { href: "/study", label: "학업", keywords: "study 수업 과제 자격증", icon: <GraduationCap /> },
  { href: "/scraps", label: "스크랩", keywords: "scrap 뉴스 기사", icon: <Newspaper /> },
  { href: "/notes", label: "노트", keywords: "note 메모 PARA", icon: <FileText /> },
  { href: "/reading", label: "독서", keywords: "reading 책 독서록", icon: <Book /> },
  { href: "/culture", label: "문화", keywords: "culture 영화 전시", icon: <BookOpen /> },
  { href: "/travel", label: "여행", keywords: "travel 여행", icon: <Plane /> },
  { href: "/contents", label: "콘텐츠", keywords: "content 아이디어 채널", icon: <Lightbulb /> },
  { href: "/history", label: "기록", keywords: "history 히트맵 타임라인", icon: <History /> },
];

export default function QuickNav() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const openPalette = useCallback(() => {
    setQuery("");
    setSelected(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) setOpen(false);
        else openPalette();
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    const onOpenEvent = () => openPalette();
    window.addEventListener("keydown", onKey);
    window.addEventListener("yos:quicknav", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("yos:quicknav", onOpenEvent);
    };
  }, [open, openPalette]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAGES;
    return PAGES.filter(
      (p) => p.label.toLowerCase().includes(q) || p.keywords.toLowerCase().includes(q)
    );
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <div className="qnav-overlay" onClick={() => setOpen(false)} />
      <div className="qnav" role="dialog" aria-modal="true" aria-label="빠른 이동">
        <input
          ref={inputRef}
          className="qnav__input"
          placeholder="어디로 갈까요?"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelected((s) => Math.min(s + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((s) => Math.max(s - 1, 0));
            } else if (e.key === "Enter" && results[selected]) {
              go(results[selected].href);
            }
          }}
        />
        <div className="qnav__list">
          <p className="qnav__group">페이지</p>
          {results.map((p, i) => (
            <button
              key={p.href}
              className="qnav__item"
              data-selected={i === selected}
              onMouseEnter={() => setSelected(i)}
              onClick={() => go(p.href)}
            >
              {p.icon}
              {p.label}
            </button>
          ))}
          {results.length === 0 && <p className="qnav__group">결과 없음</p>}
        </div>
        <div className="qnav__hint">
          <span>↑↓ 이동</span>
          <span className="flex items-center gap-1"><CornerDownLeft size={11} /> 열기</span>
          <span>esc 닫기</span>
        </div>
      </div>
    </>,
    document.body
  );
}

export function SidebarSearch() {
  return (
    <button
      className="sidebar-search"
      onClick={() => window.dispatchEvent(new CustomEvent("yos:quicknav"))}
    >
      <Search />
      검색
      <kbd>⌘K</kbd>
    </button>
  );
}
