import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

// Explicit, fictional local examples. Never reads an environment file or a database.
const file = resolve(".data/demo.json");
if (process.argv.includes("--clean")) {
  rmSync(file, { force: true });
  console.log("Removed only .data/demo.json. Your workspace data was not changed.");
  process.exit(0);
}
if (existsSync(file)) {
  console.error("Demo data already exists. Run npm run demo:clean before reseeding it.");
  process.exit(1);
}
const day = (ago = 0) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" })
  .format(new Date(Date.now() - ago * 86400000));
const today = day();
const data = { checkins: {}, workLogs: [], routines: [], routineChecks: [], items: [], docs: {} };
const routineRows = [
  ["07:30", "아침 스트레칭", "orange", "몸을 천천히 깨우는 10분"],
  ["08:00", "오늘 계획 읽기", "teal", "오늘 가장 중요한 일 하나 고르기"],
  ["12:30", "점심 산책", "lime", "잠시 화면에서 벗어나 걷기"],
  ["18:30", "독서 20분", "blue", "좋았던 문장과 생각 기록하기"],
  ["21:00", "하루 정리", "pink", "감사한 일과 배운 점 남기기"],
];
data.routines = routineRows.map(([time, title, color, desc], i) => ({
  id: `demo-routine-${i}`, time, title, color, desc, sort: i, active: true,
}));
for (let ago = 20; ago >= 0; ago--) {
  if (ago % 6 === 0 && ago !== 0) continue;
  const date = day(ago);
  data.checkins[date] = {
    date, first_task: ago === 0 ? "작은 웹 프로젝트의 첫 화면 완성하기" : "하루의 중요한 일 하나 끝내기",
    first_task_done: ago > 0, gratitude: ["집중할 수 있는 시간", "산책하며 찾은 여유", "새로운 것을 배우는 즐거움"],
    learned: "작은 단위로 나누면 시작하기 쉬워진다.", mood: "좋음", updated_at: new Date().toISOString(),
  };
  data.workLogs.push({
    id: `demo-log-${ago}`, date, minutes: 30 + (ago % 4) * 15,
    project: ago % 2 ? "웹 프로젝트" : "디자인 공부", note: "학습 내용을 정리하고 작은 예제를 완성했어요.",
  });
  for (let i = 0; i < (ago === 0 ? 2 : 3 + ago % 3); i++) {
    data.routineChecks.push({ date, routine_id: `demo-routine-${i}`, done: true });
  }
}
let sequence = 0;
const item = (kind, fields) => data.items.push({
  id: `demo-item-${sequence++}`, kind, data: fields, created_at: new Date().toISOString(),
});
item("task", { title: "대시보드 첫 화면 마무리", status: "진행 중", deadline: today, priority: "높음", category: "업무", notes: "카드 간격과 모바일 화면 확인" });
item("task", { title: "읽은 책 한 챕터 정리하기", status: "To Do", deadline: today, priority: "중간", category: "학업", notes: "가장 인상 깊은 문장 세 개" });
item("task", { title: "주말 산책 코스 찾아보기", status: "To Do", deadline: day(-2), priority: "낮음", category: "생활", notes: "" });
item("task", { title: "이번 주 계획 세우기", status: "완료", deadline: today, priority: "중간", category: "생활", notes: "" });
item("diary", { date: today, title: "작은 시작을 모으는 날", body: "<p>완벽한 계획보다 오늘 할 수 있는 작은 일을 선택했다.</p>", mood: "좋음", images: "[]" });
item("note", { title: "새 프로젝트 아이디어", para: "Project", date: today, body: "<h2>다음 한 걸음</h2><p>사용자의 하루를 조금 더 편하게 만드는 작은 웹 도구.</p>" });
item("course", { name: "웹 디자인 기초", status: "진행 중", url: "", memo: "개인 학습용 예시 과정" });
item("book", { title: "예시 독서 노트", author: "가상의 저자", status: "읽는 중", total_pages: "240", current_page: "84", cover: "" });
item("culture", { title: "주말 사진 전시", category: "공연", status: "관심", date: day(-4), memo: "가상의 전시 기록" });
item("travel", { place: "바닷가 산책", country: "국내", status: "계획 중", date: day(-7), memo: "가상의 여행 계획" });
item("idea", { title: "일주일 동안 배운 것 정리", status: "아이디어", channel: "블로그", date: today, url: "" });
mkdirSync(resolve(".data"), { recursive: true });
writeFileSync(file, JSON.stringify(data, null, 2), { flag: "wx", mode: 0o600 });
console.log("Created fictional .data/demo.json. Run npm run demo:dev; default workspace stays empty.");
