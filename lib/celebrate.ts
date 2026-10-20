// 체크 순간의 성취감 장치 (마이루틴 벤치마킹: 이모지 스탬프 + 응원 멘트 + 올클리어 축하)
const EMOJI_RULES: [RegExp, string][] = [
  [/기상/, "⏰"],
  [/스트레칭|유산소|러닝|운동/, "🏃‍♀️"],
  [/샤워|스킨케어/, "🧖‍♀️"],
  [/명상|플랜/, "🧘‍♀️"],
  [/비타민/, "💊"],
  [/독서|책/, "📚"],
  [/뉴스|기술문서|블로그/, "📰"],
  [/업무/, "💼"],
  [/점심|건강식/, "🥗"],
  [/부업/, "💰"],
  [/omscs|대학원/i, "🎓"],
  [/채용|지원|취업/, "🎯"],
  [/도서관/, "📖"],
  [/중국어/, "🀄"],
  [/toefl|ielts|토플|영어/i, "✈️"],
  [/보안/, "🔐"],
  [/coursera|genomic|바이오|생명/i, "🧬"],
  [/cpa|회계/i, "🧮"],
  [/투자|증권|파생|자산관리|신용분석|금융/, "📈"],
  [/aws|클라우드/i, "☁️"],
  [/sqld|sql|정보처리|데이터/i, "💾"],
  [/스포츠/, "🏃‍♀️"],
  [/한국어교원/, "🗣️"],
  [/pcce|코딩/i, "⌨️"],
  [/자격증|시험|접수|응시|인증/, "✍️"],
  [/하루 정리|감사/, "🌙"],
  [/휴대폰|취침|미라클/, "😴"],
  [/산책/, "🚶‍♀️"],
  [/물/, "💧"],
  [/프로젝트/, "🛠️"],
];

export function routineEmoji(title: string): string {
  for (const [re, emoji] of EMOJI_RULES) if (re.test(title)) return emoji;
  return "✨";
}

const CHEERS = [
  "잘하고 있어요!",
  "멋져요 💜",
  "하나 더 해냈어요!",
  "오늘도 한 걸음 🌱",
  "이 맛에 루틴하죠 😎",
  "꾸준함이 재능이에요",
  "작은 실행이 쌓이는 중 ✨",
];

export function randomCheer(): string {
  return CHEERS[Math.floor(Math.random() * CHEERS.length)];
}

export function cheerMessage(done: number, total: number): string {
  if (total >= 4 && done === Math.ceil(total / 2)) return `벌써 절반! ${done}/${total} 💪`;
  if (done === 1) return "좋은 시작이에요! 첫 체크 ✅";
  return randomCheer();
}

const CATEGORY_EMOJI: Record<string, string> = {
  "본선": "🎯", "업무": "💼", "학업": "📚", "부업": "💰", "취미": "🎨", "생활": "🏠",
};

// 달성도 신호등 (마이루틴 벤치마킹): 80% 이상 초록, 40% 이상 노랑, 그 밑은 빨강
export const SIGNAL_COLORS = {
  green: "#6fcf97",
  yellow: "#f2c94c",
  red: "#eb5757",
  zero: "#5a5a63",
  none: "#5a5a63",
} as const;

export type SignalLevel = keyof typeof SIGNAL_COLORS;

export function signalLevel(done: number, total: number): SignalLevel {
  if (total === 0) return "none";
  if (done === 0) return "zero";
  const r = done / total;
  return r >= 0.8 ? "green" : r >= 0.4 ? "yellow" : "red";
}

export function taskEmoji(title: string, category?: string): string {
  for (const [re, emoji] of EMOJI_RULES) if (re.test(title)) return emoji;
  return CATEGORY_EMOJI[category ?? ""] ?? "✅";
}
