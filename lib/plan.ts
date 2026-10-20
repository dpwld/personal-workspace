// Editable starting structure; no personal goals or routine records are bundled.
import type { GoalsDoc } from "./types";

export const MOTTO = "나의 다짐을 적어보세요";
export const MANDALA_CENTER = "나의 목표";
export const ROOTS: GoalsDoc["roots"] = [
  { tag: "목적 · WHY", title: "나의 목적", desc: "무엇을 위해 성장하고 싶은가요?" },
  { tag: "수단 · HOW", title: "나의 방법", desc: "어떤 방법으로 나아갈까요?" },
  { tag: "엔진 · WHAT", title: "나의 집중 영역", desc: "지금 집중하고 싶은 일을 적어보세요.", engine: true },
  { tag: "토대 · BEING", title: "나의 태도", desc: "어떤 태도를 지키고 싶은가요?" },
];
export const MANDALA: GoalsDoc["mandala"] = Array.from({ length: 8 }, (_, i) => ({
  key: String.fromCharCode(65 + i), name: `영역 ${i + 1}`, items: Array(8).fill(""),
}));
