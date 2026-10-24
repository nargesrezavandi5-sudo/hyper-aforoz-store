import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { pushToast } from "@/components/Toast";
import {
  Button, Card, ConfirmDialog, Field, inputCls, PageHeader,
} from "@/components/ui";

export default function General() {
  const [pw, setPw] = useState({ current: "", next: "", repeat: "" });
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const change = async () => {
    setBusy(true);
    try {
      await api("/api/admin/password", {
        method: "POST",
        body: JSON.stringify({ current: pw.current, next: pw.next }),
      });
      pushToast("رمز عبور با موفقیت تغییر کرد");
      setPw({ current: "", next: "", repeat: "" });
      setConfirmOpen(false);
    } catch (e: any) {
      pushToast(e.message || "خطا در تغییر رمز", "err");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.current) return pushToast("رمز فعلی را وارد کنید", "err");
    if (pw.next !== pw.repeat) return pushToast("تکرار رمز مطابفت ندارد", "err");
    if (pw.next.length < 8) return pushToast("رمز جدید باید حداقل 8 کاراکتر باشد", "err");
    if (pw.next === pw.current) return pushToast("رمز جدید نباید مشابه رمز فعلی باشد", "err");
    setConfirmOpen(true);
  };

  return (
    <div dir="rtl" className="max-w-2xl space-y-6">
      <PageHeader title="تنظیمات عمومی" />

      <Card className="p-6">
        <h3 className="font-black text-slate-800 mb-4">🔐 تغییر رمز عبور مدیر</h3>
        <form onSubmit={submit} className="space-y-4 text-sm">
          <Field label="رمز فعلی" required>
            <input
              type="password"
              value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              className={inputCls}
              autoComplete="current-password"
            />
          </Field>
          <Field label="رمز عبور جدید" required hint="حداقل ۸ کاراکتر؛ توصیه می‌شود ترکیبی از حروف و اعداد">
            <input
              type="password"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              className={inputCls}
              autoComplete="new-password"
            />
          </Field>
          <Field label="تکرار رمز جدید" required>
            <input
              type="password"
              value={pw.repeat}
              onChange={(e) => setPw((p) => ({ ...p, repeat: e.target.value }))}
              className={inputCls}
              autoComplete="new-password"
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={busy}>
              تغییر رمز
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="font-black text-slate-800 mb-3">🛠️ نگهداری</h3>
        <p className="text-sm text-slate-500 mb-4">
          از داده‌های پایگاه‌داده نسخه پشتیبان دانلود کنید. بازگردانی فقط توسط پشتیبانی فنی سرور انجام می‌شود.
        </p>
        <Button
          variant="secondary"
          onClick={() =>
            api("/api/admin/backup").then((d) => {
              const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "store-backup-full.json";
              a.click();
              pushToast("نسخه پشتیبان دانلود شد");
            })
          }
        >
          📥 دانلود نسخه پشتیبان کامل
        </Button>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="تغییر رمز عبور"
        message="رمز عبور حساب مدیر تغییر کند؟ لازم است دفعه بعد با رمز جدید وارد شوید."
        confirmLabel="بله، تغییر بده"
        busy={busy}
        onConfirm={change}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
