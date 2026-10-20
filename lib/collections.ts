// 범용 컬렉션 페이지 설정.

export type FieldType = "text" | "textarea" | "select" | "date" | "url" | "number";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
};

export type CollectionConfig = {
  kind: string;
  title: string;
  desc: string;
  fields: Field[];
  titleKey: string; // 목록에서 제목으로 쓰는 필드
  chipKeys: string[]; // 칩으로 보여줄 select 필드
  metaKeys?: string[]; // 제목 아래 회색 줄로 보여줄 필드
  dateKey?: string; // 날짜 필드 (정렬·표시)
  dday?: boolean; // 날짜에 D-day 배지 표시
  groupBy?: string; // 이 select 필드 값으로 섹션 그룹
  addLabel: string;
};


// 상태·우선순위 값별 시맨틱 컬러 (Notion 다크 태그 톤)
export const OPTION_COLORS: Record<string, string> = {
  "높음": "#FF7369",
  "중간": "#FFA344",
  "낮음": "#4DAB9A",
  "To Do": "#9B9B98",
  "진행 중": "#529CCA",
  "완료": "#4DAB9A",
  "예정": "#9B9B98",
  "스크랩": "#529CCA",
  "딥다이브": "#9A6DD7",
  "아이디어": "#9B9B98",
  "작성 중": "#FFA344",
  "업로드 완료": "#4DAB9A",
  "관심": "#FFA344",
  "가고 싶음": "#FFA344",
  "계획 중": "#529CCA",
  "다녀옴": "#4DAB9A",
  "준비 중": "#FFA344",
  "내 채널": "#529CCA",
  "레퍼런스": "#9B9B98",
  "Inbox": "#FFA344",
  "Project": "#529CCA",
  "Area": "#4DAB9A",
  "Resource": "#9A6DD7",
  "Archive": "#9B9B98",
};

export const COLLECTIONS: Record<string, CollectionConfig> = {
  task: {
    kind: "task",
    title: "할 일",
    desc: "하고 싶은 것이 많을 때는 적고, 우선순위와 가능 여부를 생각하자.",
    fields: [
      { key: "title", label: "할 일", type: "text", required: true },
      { key: "deadline", label: "마감일", type: "date" },
      { key: "status", label: "상태", type: "select", options: ["To Do", "진행 중", "완료"] },
      { key: "priority", label: "우선순위", type: "select", options: ["높음", "중간", "낮음"] },
      { key: "category", label: "카테고리", type: "select", options: ["본선", "업무", "학업", "부업", "취미", "생활"] },
      { key: "notes", label: "메모", type: "text" },
    ],
    titleKey: "title",
    chipKeys: ["priority", "category"],
    metaKeys: ["notes"],
    dateKey: "deadline",
    dday: true,
    groupBy: "status",
    addLabel: "할 일 추가",
  },
  scrap: {
    kind: "scrap",
    title: "스크랩",
    desc: "뉴스, 증시, 인사이트를 모은다. 딥다이브할 것은 표시해두기.",
    fields: [
      { key: "title", label: "제목", type: "text", required: true },
      { key: "url", label: "링크", type: "url" },
      { key: "keyword", label: "키워드", type: "text", placeholder: "예: 디자인, 개발" },
      { key: "type", label: "구분", type: "select", options: ["스크랩", "딥다이브"] },
      { key: "date", label: "날짜", type: "date" },
      { key: "memo", label: "메모", type: "textarea" },
    ],
    titleKey: "title",
    chipKeys: ["type"],
    metaKeys: ["keyword", "memo"],
    dateKey: "date",
    addLabel: "스크랩 추가",
  },
  note: {
    kind: "note",
    title: "노트",
    desc: "PARA로 분류하는 메모. 일단 Inbox에 넣고 나중에 옮기면 된다.",
    fields: [
      { key: "title", label: "제목", type: "text", required: true },
      { key: "para", label: "분류", type: "select", options: ["Inbox", "Project", "Area", "Resource", "Archive"] },
      { key: "body", label: "내용", type: "textarea" },
      { key: "date", label: "날짜", type: "date" },
    ],
    titleKey: "title",
    chipKeys: [],
    metaKeys: ["body"],
    dateKey: "date",
    groupBy: "para",
    addLabel: "노트 추가",
  },
  culture: {
    kind: "culture",
    title: "문화",
    desc: "책, 공연, 영화, 방송 기록과 관심 목록.",
    fields: [
      { key: "title", label: "제목", type: "text", required: true },
      { key: "category", label: "분류", type: "select", options: ["책", "공연", "영화", "방송", "기타"] },
      { key: "status", label: "상태", type: "select", options: ["관심", "완료"] },
      { key: "date", label: "날짜", type: "date" },
      { key: "memo", label: "감상", type: "textarea" },
    ],
    titleKey: "title",
    chipKeys: ["category"],
    metaKeys: ["memo"],
    dateKey: "date",
    groupBy: "status",
    addLabel: "기록 추가",
  },
  travel: {
    kind: "travel",
    title: "여행",
    desc: "가고 싶은 곳과 다녀온 곳.",
    fields: [
      { key: "place", label: "장소", type: "text", required: true },
      { key: "country", label: "국가·지역", type: "text" },
      { key: "status", label: "상태", type: "select", options: ["가고 싶음", "계획 중", "다녀옴"] },
      { key: "date", label: "날짜", type: "date" },
      { key: "memo", label: "메모", type: "textarea" },
    ],
    titleKey: "place",
    chipKeys: ["country"],
    metaKeys: ["memo"],
    dateKey: "date",
    groupBy: "status",
    addLabel: "장소 추가",
  },
  channel: {
    kind: "channel",
    title: "채널",
    desc: "내 콘텐츠 계정과 참고하는 레퍼런스 계정.",
    fields: [
      { key: "name", label: "이름", type: "text", required: true },
      { key: "url", label: "링크", type: "url" },
      { key: "type", label: "구분", type: "select", options: ["내 채널", "레퍼런스"] },
      { key: "memo", label: "메모", type: "text" },
    ],
    titleKey: "name",
    chipKeys: [],
    metaKeys: ["memo"],
    groupBy: "type",
    addLabel: "채널 추가",
  },
  idea: {
    kind: "idea",
    title: "콘텐츠 아이디어",
    desc: "업로드할 주제와 진행 상태.",
    fields: [
      { key: "title", label: "주제", type: "text", required: true },
      { key: "status", label: "상태", type: "select", options: ["아이디어", "작성 중", "업로드 완료"] },
      { key: "channel", label: "채널", type: "text", placeholder: "예: 블로그" },
      { key: "date", label: "날짜", type: "date" },
      { key: "url", label: "업로드 링크", type: "url" },
    ],
    titleKey: "title",
    chipKeys: ["channel"],
    metaKeys: [],
    dateKey: "date",
    groupBy: "status",
    addLabel: "아이디어 추가",
  },
  course: {
    kind: "course",
    title: "과정",
    desc: "진행 중인 학업 과정.",
    fields: [
      { key: "name", label: "과정명", type: "text", required: true },
      { key: "status", label: "상태", type: "select", options: ["진행 중", "준비 중", "완료"] },
      { key: "url", label: "링크", type: "url" },
      { key: "memo", label: "메모", type: "text" },
    ],
    titleKey: "name",
    chipKeys: ["status"],
    metaKeys: ["memo"],
    addLabel: "과정 추가",
  },
  assignment: {
    kind: "assignment",
    title: "과제·시험",
    desc: "마감이 있는 학업 일정.",
    fields: [
      { key: "name", label: "이름", type: "text", required: true },
      { key: "course", label: "과정", type: "text", placeholder: "예: 온라인 강의" },
      { key: "date", label: "마감일", type: "date", required: true },
      { key: "status", label: "상태", type: "select", options: ["예정", "진행 중", "완료"] },
    ],
    titleKey: "name",
    chipKeys: ["course", "status"],
    metaKeys: [],
    dateKey: "date",
    dday: true,
    addLabel: "일정 추가",
  },
  quarter_goal: {
    kind: "quarter_goal",
    title: "분기 목표",
    desc: "분기 단위의 큰 목표.",
    fields: [
      { key: "title", label: "목표", type: "text", required: true },
      { key: "quarter", label: "분기", type: "select", options: ["2026 Q3", "2026 Q4", "2027 Q1", "2027 Q2"] },
      { key: "progress", label: "진행률(%)", type: "number" },
    ],
    titleKey: "title",
    chipKeys: ["quarter"],
    metaKeys: [],
    addLabel: "분기 목표 추가",
  },
};
