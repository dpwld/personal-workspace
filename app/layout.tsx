import type { Metadata, Viewport } from "next";
import Sidebar, { MobileTabs } from "@/components/sidebar";
import QuickNav from "@/components/quick-nav";
import "./globals.css";
import "./ds/notion.css";
import "./ds/workspace.css";

export const metadata: Metadata = {
  title: "Personal Workspace",
  description: "오늘의 실행과 성장의 방향을 연결하는 개인 워크스페이스",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#1c1c21",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("yos-theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`,
          }}
        />
        <a className="skip-link" href="#main-content">본문으로 이동</a>
        <div className="app-shell">
          <Sidebar />
          <main id="main-content" className="app-main">
            {process.env.NODE_ENV === "development" && process.env.WORKSPACE_DEMO === "1" && <p role="status" className="page-desc" style={{ marginBottom: 16 }}>예시 데이터 · 개인 기록과 분리된 로컬 미리보기</p>}
            {children}
          </main>
        </div>
        <MobileTabs />
        <QuickNav />
      </body>
    </html>
  );
}
