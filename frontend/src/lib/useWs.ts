import { useEffect, useRef } from "react";

/**
 * اتصال همگام‌سازی بلادرنگ (WebSocket) با اتصال مجدد خودکار.
 * onOpen/onMessage با قید hooks به‌روزرسانی می‌شوند.
 */
export function useWebSocket(
  url: string,
  onMessage: (data: any) => void,
  onOffline?: (offline: boolean) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const msgRef = useRef(onMessage);
  msgRef.current = onMessage;
  const offRef = useRef(onOffline);
  offRef.current = onOffline;
  const retryRef = useRef<number>(0);

  useEffect(() => {
    let alive = true;
    let timer: number;
    let pingTimer: number;

    const connect = () => {
      if (!alive) return;
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${location.host}${url}`);
      wsRef.current = ws;
      ws.onopen = () => {
        retryRef.current = 0;
        offRef.current?.(false);
        ws.send(JSON.stringify({ token: localStorage.getItem("sp_admin_token") || "" }));
        pingTimer = window.setInterval(
          () => ws.readyState === 1 && ws.send("ping"),
          25000
        );
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type !== "pong") msgRef.current(data);
        } catch {
          // ignore bad frames
        }
      };
      ws.onclose = () => {
        offRef.current?.(true);
        clearInterval(pingTimer);
        if (!alive) return;
        const delay = Math.min(15000, 2000 * Math.pow(2, Math.min(retryRef.current, 3)));
        retryRef.current += 1;
        timer = window.setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
    };
    connect();

    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(pingTimer);
      wsRef.current?.close();
    };
  }, [url]);

  return wsRef;
}
