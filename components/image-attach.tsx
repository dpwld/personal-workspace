"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

// 이미지 첨부 공용 위젯: 업로드 후 URL 배열을 부모에 전달
export default function ImageAttach({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const next = [...urls];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const { url } = await res.json();
        next.push(url);
      }
    }
    setUploading(false);
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((u, i) => (
            <div key={u + i} className="relative">
              <a href={u} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u}
                  alt={`첨부 이미지 ${i + 1}`}
                  className="h-24 w-24 rounded-lg border object-cover"
                  style={{ borderColor: "var(--color-gray-200)" }}
                />
              </a>
              <button
                aria-label="이미지 제거"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white"
                style={{ background: "var(--color-gray-700)" }}
                onClick={() => onChange(urls.filter((_, j) => j !== i))}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        className="btn btn--tertiary btn--sm self-start"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus size={15} /> {uploading ? "올리는 중" : "이미지 첨부"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />
    </div>
  );
}
