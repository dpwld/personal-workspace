"use client";

import { useId } from "react";

// Personal Workspace 마스코트: 머리에 새싹이 난 라벤더 콩. 달성도에 따라 표정이 바뀐다.
// sleep(시작 전) → calm(빨강) → happy(노랑) → excited(초록) → party(올클리어)
export type MascotMood = "sleep" | "calm" | "happy" | "excited" | "party";

const FACE = "#4a3f66";

export default function Mascot({ mood = "calm", size = 44 }: { mood?: MascotMood; size?: number }) {
  const gid = useId();
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="mascot" data-mood={mood} aria-hidden>
      <title>새싹이</title>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9ceff" />
          <stop offset="1" stopColor="#b2a0f5" />
        </linearGradient>
      </defs>

      {/* 새싹 */}
      <g className="mascot__sprout">
        <line x1="32" y1="14" x2="32" y2="8" stroke="#6fcf97" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M32 8 C32 3.5 35.5 1 39.5 1.5 C39.5 6 36.5 8.5 32 8 Z" fill="#6fcf97" />
        <path d="M32 8 C32 4.5 29 2.5 25.5 3 C25.5 6.5 28.5 8.5 32 8 Z" fill="#9ee6ad" />
      </g>

      {/* 몸통 */}
      <path
        d="M32 13 C45 13 53 23 53 36.5 C53 50 44 59 32 59 C20 59 11 50 11 36.5 C11 23 19 13 32 13 Z"
        fill={`url(#${gid})`}
      />

      {/* 볼터치 */}
      <circle cx="19.5" cy="43" r="3.4" fill="#f2a6c2" opacity="0.5" />
      <circle cx="44.5" cy="43" r="3.4" fill="#f2a6c2" opacity="0.5" />

      {mood === "sleep" && (
        <g stroke={FACE} strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M19 37 q4 3 8 0" />
          <path d="M37 37 q4 3 8 0" />
          <path d="M29.5 47 q2.5 1.6 5 0" />
          <text x="48" y="22" fontSize="9" fill={FACE} stroke="none" fontWeight="700">z</text>
          <text x="53" y="15" fontSize="7" fill={FACE} stroke="none" fontWeight="700">z</text>
        </g>
      )}
      {mood === "calm" && (
        <g>
          <circle cx="23" cy="37" r="2.7" fill={FACE} />
          <circle cx="41" cy="37" r="2.7" fill={FACE} />
          <path d="M28.5 46 q3.5 2 7 0" stroke={FACE} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </g>
      )}
      {mood === "happy" && (
        <g>
          <circle cx="23" cy="37" r="2.7" fill={FACE} />
          <circle cx="41" cy="37" r="2.7" fill={FACE} />
          <path d="M26.5 44.5 q5.5 5 11 0" stroke={FACE} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </g>
      )}
      {mood === "excited" && (
        <g>
          <path d="M19 38 q4 -4.5 8 0" stroke={FACE} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M37 38 q4 -4.5 8 0" stroke={FACE} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M25.5 44 q6.5 7.5 13 0 z" fill={FACE} />
        </g>
      )}
      {mood === "party" && (
        <g>
          <path d="M23 34 l1.1 2.6 2.6 1.1 -2.6 1.1 -1.1 2.6 -1.1 -2.6 -2.6 -1.1 2.6 -1.1 Z" fill={FACE} />
          <path d="M41 34 l1.1 2.6 2.6 1.1 -2.6 1.1 -1.1 2.6 -1.1 -2.6 -2.6 -1.1 2.6 -1.1 Z" fill={FACE} />
          <path d="M25.5 44 q6.5 7.5 13 0 z" fill={FACE} />
          <circle cx="10" cy="20" r="1.8" fill="#f2c94c" />
          <circle cx="55" cy="26" r="1.8" fill="#ff9ec4" />
          <circle cx="7" cy="34" r="1.5" fill="#7bd88f" />
          <circle cx="58" cy="14" r="1.5" fill="#c7b9ff" />
        </g>
      )}
    </svg>
  );
}

export function mascotMood(done: number, total: number): MascotMood {
  if (total === 0 || done === 0) return "sleep";
  const r = done / total;
  if (r >= 1) return "party";
  if (r >= 0.8) return "excited";
  if (r >= 0.4) return "happy";
  return "calm";
}
