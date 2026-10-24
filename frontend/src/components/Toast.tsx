import { useEffect, useState } from "react";

type Toast = { id: number; kind: "ok" | "err"; text: string };
let toasts: Toast[] = [];
let listeners: ((t: Toast[]) => void)[] = [];
let nextId = 1;

export function pushToast(text: string, kind: "ok" | "err" = "ok") {
  const t = { id: nextId++, kind, text };
  toasts = [...toasts, t];
  listeners.forEach((l) => l(toasts));
  window.setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    listeners.forEach((l) => l(toasts));
  }, 4000);
}

export default function ToastRoot() {
  const [list, setList] = useState<Toast[]>([]);
  useEffect(() => {
    listeners.push(setList);
    return () => {
      listeners = listeners.filter((l) => l !== setList);
    };
  }, []);
  return (
    <div className="fixed bottom-4 right-1/2 translate-x-1/2 z-50 flex flex-col gap-2 w-[min(90vw,420px)]">
      {list.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl px-4 py-3 text-sm shadow-lg text-white ${
            t.kind === "ok" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
