export type Checkin = {
  date: string; // YYYY-MM-DD (Asia/Seoul)
  first_task: string; // 오늘의 우선순위 하나
  first_task_done: boolean;
  gratitude: string[]; // 감사일기 3줄
  learned: string; // 배운 일 1줄
  mood: string; // 최고/좋음/보통/지침/힘듦
  updated_at: string;
};

export type WorkLog = {
  id: string;
  date: string;
  minutes: number;
  project: string;
  note: string;
};

export type Routine = {
  id: string;
  title: string;
  time: string; // "HH:MM"
  color: string; // ROUTINE_COLORS 키
  desc: string; // 구체적으로 뭘 해야 하는지
  sort: number;
  active: boolean;
};

export type RoutineCheck = {
  date: string;
  routine_id: string;
  done: boolean;
};

// 범용 컬렉션 아이템: 할일/스크랩/노트/문화/여행/콘텐츠/학업/분기목표
export type Item = {
  id: string;
  kind: string;
  data: Record<string, string>;
  created_at: string;
};

export type GoalsDoc = {
  motto: string;
  center: string; // 만다라트 중심 키워드
  roots: { tag: string; title: string; desc: string; engine?: boolean }[];
  mandala: { key: string; name: string; items: string[] }[];
  updated_at: string;
};

export const ROUTINE_COLORS: Record<string, string> = {
  yellow: "#EAB308",
  orange: "#F97316",
  lime: "#7CB518",
  blue: "#1571F3",
  pink: "#EC4899",
  cyan: "#0EA5E9",
  teal: "#14B8A6",
  red: "#EF1026",
  gray: "#71717A",
};

export const MOODS = ["최고", "좋음", "보통", "지침", "힘듦"];

export function todaySeoul(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

export function daysAgoSeoul(n: number): string {
  const d = new Date(Date.now() - n * 86400_000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(d);
}

export function ddayLabel(date: string, today: string): string {
  const diff = Math.round((new Date(date).getTime() - new Date(today).getTime()) / 86400_000);
  if (diff === 0) return "D-Day";
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}
