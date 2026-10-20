"use client";

import { useState } from "react";

export default function UnlockPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  async function unlock() {
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      setError(true);
    }
  }

  return (
    <div className="mx-auto mt-24 max-w-xs text-center">
      <h1 className="mb-4 text-xl font-bold">Personal Workspace</h1>
      <input
        className="input text-center"
        type="password"
        placeholder="암호"
        value={code}
        autoFocus
        onChange={(e) => {
          setCode(e.target.value);
          setError(false);
        }}
        onKeyDown={(e) => e.key === "Enter" && unlock()}
      />
      {error && (
        <p className="mt-2 text-xs font-semibold" style={{ color: "var(--color-danger)" }}>
          암호가 맞지 않아요
        </p>
      )}
      <button className="btn btn--primary btn--md mt-3 w-full" onClick={unlock}>
        열기
      </button>
    </div>
  );
}
