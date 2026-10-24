import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useWebSocket } from "@/lib/useWs";
import { DisplayStatus } from "@/lib/types";
import { toFaDigits } from "@/lib/format";
import { pushToast } from "@/components/Toast";
import { Badge, Button, Card, Modal, PageHeader } from "@/components/ui";
import QRCode from "qrcode";

export default function Displays() {
  const [status, setStatus] = useState<DisplayStatus | null>(null);
  const [qrImg, setQrImg] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);

  const load = useCallback(() => {
    api<DisplayStatus>("/api/admin/displays")
      .then(setStatus)
      .catch((e: ApiError) => pushToast(e.message, "err"));
  }, []);
  useEffect(() => {
    load();
    const t = window.setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  useWebSocket("/ws/admin", (msg) => {
    if (msg.type === "displays_state" && typeof msg.connected === "number") {
      setStatus((s) => (s ? { ...s, connected: msg.connected } : s));
    }
  });

  const sharedUrl = status
    ? `${window.location.origin}/#${status.url}`
    : `${window.location.origin}/#/display`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(sharedUrl);
      pushToast("لینک کپی شد: " + sharedUrl);
    } catch {
      setCopyFallback(sharedUrl);
    }
  };
  const [copyFallback, setCopyFallback] = useState("");

  const showQr = async () => {
    const img = await QRCode.toDataURL(sharedUrl, { width: 320, margin: 2 });
    setQrImg(img);
    setShowQrModal(true);
  };

  const connected = status?.connected ?? 0;

  return (
    <div dir="rtl" className="space-y-4">
      <PageHeader title="وضعیت نمایشگرها" />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* اتصال زنده */}
        <Card className="p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-500">جلسات نمایش فعال</div>
            <Badge tone={connected > 0 ? "ok" : "neutral"}>
              {connected > 0 ? "زنده" : "بدون اتصال"}
            </Badge>
          </div>
          <div className="text-4xl font-black fa-num">{toFaDigits(connected)}</div>
          <div className="text-xs text-slate-400 leading-5">
            هر تلویزیونی که صفحه نمایش را باز کرده باشد، به‌صورت زنده اینجا شمرده می‌شود؛
            تعداد با اتصال/قطع شدن فوری تغییر می‌کند.
          </div>
        </Card>

        {/* لینک مشترک */}
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="text-sm font-bold text-slate-500">لینک مشترک نمایش (برای همه تلویزیون‌ها)</div>
          <div className="flex flex-wrap items-center gap-3">
            <code
              className="text-sm bg-slate-100 rounded-lg px-3 py-2 font-bold text-slate-800 ltr:text-left"
              dir="ltr"
            >
              {sharedUrl}
            </code>
            <Button size="sm" variant="neutral" onClick={copyLink}>
              📋 کپی لینک
            </Button>
            <Button size="sm" variant="neutral" onClick={showQr}>
              🔲 نمایش QR
            </Button>
          </div>
          <div className="rounded-xl bg-sky-50 border border-sky-200 p-3.5 text-xs text-sky-900 leading-6">
            راهنما: روی مرورگر هر تلویزیون همین آدرس را باز کنید و تمام‌صفحه شوید
            (F11 یا دکمه تمام‌صفحه در پایین صفحه). در حالت «نمایش کاملاً همگام» همه تلویزیون‌ها
            اسلاید یکسان را هم‌زمان نشان می‌دهند؛ تلویزیونی که دیر باز شود یا ری‌استارت شود
            دقیقاً به اسلاید جاری می‌پیوندد.
          </div>
        </Card>
      </div>

      {copyFallback && (
        <Modal open onClose={() => setCopyFallback("")} title="کپی لینک" width="max-w-md">
          <code className="block bg-slate-100 rounded-xl px-3 py-2 text-xs break-all" dir="ltr">
            {copyFallback}
          </code>
          <Button className="mt-4" variant="neutral" onClick={() => setCopyFallback("")}>
            بستن
          </Button>
        </Modal>
      )}

      <Modal open={showQrModal} onClose={() => setShowQrModal(false)} title="QR — لینک مشترک" width="max-w-sm">
        <div className="text-center space-y-3">
          <img src={qrImg} alt="QR Code" className="rounded-xl mx-auto" />
          <p className="text-xs text-slate-500 break-all ltr:text-left" dir="ltr">{sharedUrl}</p>
          <Button variant="neutral" onClick={() => setShowQrModal(false)}>بستن</Button>
        </div>
      </Modal>
    </div>
  );
}
