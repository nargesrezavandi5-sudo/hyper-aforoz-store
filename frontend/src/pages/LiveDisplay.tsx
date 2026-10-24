import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, PageHeader } from "@/components/ui";

type PreviewState = "loading" | "ready" | "error";

export default function LiveDisplay() {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  const loadTimerRef = useRef<number | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  const displayUrl = new URL(".", window.location.href);
  displayUrl.hash = "/display";
  const availableWidth =
    previewSize.width > 0 && previewSize.height > 0
      ? Math.min(previewSize.width, previewSize.height * (16 / 9))
      : 0;
  const displayViewportWidth = Math.max(761, availableWidth);
  const previewScale =
    availableWidth > 0 ? availableWidth / displayViewportWidth : 1;

  useEffect(() => {
    setPreviewState("loading");
    loadTimerRef.current = window.setTimeout(() => {
      setPreviewState("error");
    }, 20000);

    return () => {
      if (loadTimerRef.current !== null) {
        window.clearTimeout(loadTimerRef.current);
      }
    };
  }, [reloadKey]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const observer = new ResizeObserver(([entry]) => {
      setPreviewSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(preview);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === previewRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const markLoaded = () => {
    if (loadTimerRef.current !== null) {
      window.clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
    setPreviewState("ready");
  };

  const markFailed = () => {
    if (loadTimerRef.current !== null) {
      window.clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
    setPreviewState("error");
  };

  const enterFullscreen = async () => {
    if (!previewRef.current?.requestFullscreen) {
      console.error("Fullscreen is not supported by this browser.");
      return;
    }
    try {
      await previewRef.current.requestFullscreen();
    } catch (error) {
      console.error("Live display fullscreen request failed:", error);
    }
  };

  const exitFullscreen = async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch (error) {
      console.error("Could not exit live display fullscreen:", error);
    }
  };

  const returnToAdmin = async () => {
    await exitFullscreen();
    navigate("/admin");
  };

  return (
    <div dir="rtl" className="space-y-4">
      <PageHeader
        title="نمایش زنده"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="neutral" onClick={() => setReloadKey((key) => key + 1)}>
              بارگذاری دوباره
            </Button>
            <Button variant="neutral" onClick={enterFullscreen}>
              ⛶ تمام‌صفحه
            </Button>
            <Button variant="secondary" onClick={() => navigate("/admin")}>
              بازگشت به پنل
            </Button>
          </div>
        }
      />

      <Card className="p-3 sm:p-4">
        <p className="mb-3 text-sm leading-6 text-slate-600">
          پیش‌نمایش از مسیر اصلی نمایش عمومی بارگذاری می‌شود؛ تنظیمات و وضعیت پخش آن همانند نمایشگرهای متصل است.
        </p>
        <div ref={previewRef} className="live-display-preview">
          <iframe
            key={reloadKey}
            src={displayUrl.href}
            title="نمایش زنده محصولات فروشگاه"
            allow="fullscreen"
            className="live-display-iframe"
            style={{
              width: `${displayViewportWidth}px`,
              height: `${displayViewportWidth * (9 / 16)}px`,
              transform: `scale(${previewScale})`,
            }}
            onLoad={markLoaded}
            onError={markFailed}
          />

          {previewState === "loading" && (
            <div className="live-display-overlay" role="status">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>در حال بارگذاری نمایش…</span>
            </div>
          )}

          {previewState === "error" && (
            <div className="live-display-overlay" role="alert">
              <div className="max-w-md space-y-3 px-4 text-center">
                <div className="text-4xl">⚠️</div>
                <h2 className="text-lg font-bold">بارگذاری نمایش زنده ناموفق بود</h2>
                <p className="text-sm text-slate-200">
                  اتصال به مسیر نمایش برقرار نشد. اتصال سرور را بررسی کنید و دوباره تلاش کنید.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => setReloadKey((key) => key + 1)}>
                    تلاش دوباره
                  </Button>
                  <a
                    href={displayUrl.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/25"
                  >
                    باز کردن مسیر نمایش
                  </a>
                </div>
              </div>
            </div>
          )}

          {fullscreen && (
            <div className="live-display-fullscreen-actions">
              <Button variant="secondary" onClick={exitFullscreen}>
                خروج از تمام‌صفحه
              </Button>
              <Button onClick={returnToAdmin}>بازگشت به پنل</Button>
            </div>
          )}
        </div>
      </Card>
      <div className="text-xs text-slate-500">
        مسیر اصلی نمایش:{" "}
        <a
          href={displayUrl.href}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-sky-700 underline"
          dir="ltr"
        >
          {displayUrl.href}
        </a>
      </div>
    </div>
  );
}
