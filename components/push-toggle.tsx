"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

// 루틴 푸시 알림 켜기/끄기. iOS는 홈 화면에 추가한 웹앱에서만 알림 가능.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "unsupported" | "off" | "on" | "busy";

export default function PushToggle() {
  const [state, setState] = useState<State>("busy");

  useEffect(() => {
    (async () => {
      if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), ua: navigator.userAgent.slice(0, 120) }),
      });
      if (!response.ok) { await sub.unsubscribe(); throw new Error("Subscription was not saved."); }
      setState("on");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const response = await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        if (!response.ok) throw new Error("Subscription was not removed.");
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  if (state === "unsupported") return null;

  return (
    <button
      className="btn btn--secondary btn--sm shrink-0"
      disabled={state === "busy"}
      onClick={state === "on" ? disable : enable}
      title="iOS는 홈 화면에 추가한 앱에서만 알림을 받을 수 있어요"
    >
      {state === "on" ? <BellOff size={14} /> : <Bell size={14} />}
      {state === "on" ? "알림 끄기" : "알림 켜기"}
    </button>
  );
}
