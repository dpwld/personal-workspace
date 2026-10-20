import { ChevronDown } from "lucide-react";

// 토글 섹션: 대시보드 스타일의 접었다 펴는 영역 (네이티브 details 기반)
export default function Collapsible({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="collapsible" open={defaultOpen}>
      <summary>
        <ChevronDown size={16} className="collapsible__chevron" />
        <span className="section-title" style={{ marginBottom: 0 }}>{title}</span>
        {typeof count === "number" && (
          <span className="text-[13px] font-semibold" style={{ color: "var(--color-gray-400)" }}>{count}</span>
        )}
      </summary>
      <div className="collapsible__body">{children}</div>
    </details>
  );
}
