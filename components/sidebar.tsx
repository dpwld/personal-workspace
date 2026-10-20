"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarSearch } from "@/components/quick-nav";
import ThemeToggle from "@/components/theme-toggle";
import {
  Book,
  LayoutGrid,
  Search,
  BookOpen,
  CalendarCheck,
  Clock3,
  FileText,
  GraduationCap,
  History,
  Lightbulb,
  ListTodo,
  Newspaper,
  NotebookPen,
  Plane,
  Target,
} from "lucide-react";

const GROUPS: { label: string; items: { href: string; label: string; icon: React.ReactNode }[] }[] = [
  {
    label: "매일의 실행",
    items: [
      { href: "/", label: "오늘", icon: <CalendarCheck /> },
      { href: "/routines", label: "루틴", icon: <Clock3 /> },
      { href: "/tasks", label: "할 일", icon: <ListTodo /> },
      { href: "/diary", label: "일기장", icon: <NotebookPen /> },
    ],
  },
  {
    label: "성장의 방향",
    items: [
      { href: "/goals", label: "목표판", icon: <Target /> },
      { href: "/study", label: "학업", icon: <GraduationCap /> },
      { href: "/history", label: "기록", icon: <History /> },
    ],
  },
  {
    label: "나의 라이브러리",
    items: [
      { href: "/scraps", label: "스크랩", icon: <Newspaper /> },
      { href: "/notes", label: "노트", icon: <FileText /> },
      { href: "/reading", label: "독서", icon: <Book /> },
      { href: "/culture", label: "문화", icon: <BookOpen /> },
      { href: "/travel", label: "여행", icon: <Plane /> },
      { href: "/contents", label: "콘텐츠", icon: <Lightbulb /> },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [avatarOk, setAvatarOk] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setAvatarOk(true);
    img.src = "/avatar.png";
  }, []);
  return (
    <aside className="sidebar" aria-label="주 메뉴">
      <div className="sidebar__brand">
        {avatarOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/avatar.png" alt="프로필 이미지" className="brand-avatar" />
        ) : (
          <span className="brand-mark">P</span>
        )}
        <div><span className="brand-word">Personal Workspace<span className="brand-dot">.</span></span><p className="brand-caption">나를 만들어가는 공간</p></div>
      </div>
      <SidebarSearch />
      {GROUPS.map((g) => (
        <div key={g.label} className="sidebar__group">
          <div className="sidebar__label">{g.label}</div>
          {g.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`nav-btn ${pathname === item.href ? "is-active" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      ))}
      <div className="sidebar-footer">
        <span className="growth-dot" />완벽보다, 오늘의 한 걸음
        <span style={{ marginLeft: "auto" }}><ThemeToggle /></span>
      </div>
    </aside>
  );
}

// 모바일: Notion 앱처럼 하단 탭 바 + 전체 메뉴 시트
const MOBILE_TABS = GROUPS[0].items.slice(0, 3); // 오늘, 루틴, 할 일

export function MobileTabs() {
  const pathname = usePathname();
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    setSheet(false);
  }, [pathname]);

  return (
    <>
      <nav className="mtab" aria-label="모바일 내비게이션">
        {MOBILE_TABS.map((item) => (
          <Link key={item.href} href={item.href} className="mtab__item" data-active={pathname === item.href}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
        <button className="mtab__item" onClick={() => window.dispatchEvent(new CustomEvent("yos:quicknav"))}>
          <Search />
          <span>검색</span>
        </button>
        <button className="mtab__item" data-active={sheet} aria-expanded={sheet} aria-label="전체 메뉴" onClick={() => setSheet((v) => !v)}>
          <LayoutGrid />
          <span>전체</span>
        </button>
      </nav>

      {sheet && (
        <div className="msheet-overlay" onClick={() => setSheet(false)}>
          <div className="msheet" onClick={(e) => e.stopPropagation()}>
            {GROUPS.map((g) => (
              <div key={g.label}>
                <div className="sidebar__label" style={{ padding: "8px 4px 6px" }}>{g.label}</div>
                <div className="msheet__grid">
                  {g.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-btn ${pathname === item.href ? "is-active" : ""}`}
                      onClick={() => setSheet(false)}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="msheet__grid" style={{ borderTop: "1px solid var(--nt-divider)", paddingTop: 8 }}>
              <ThemeToggle withLabel />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
