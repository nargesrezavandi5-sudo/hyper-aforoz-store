import { useEffect, useRef, useState } from "react";
import { api, ApiError, resizeImage, uploadImage } from "@/lib/api";
import { AppSettings } from "@/lib/types";
import { useWebSocket } from "@/lib/useWs";
import { pushToast } from "@/components/Toast";

export default function Settings() {
  const [s, setS] = useState<AppSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [upPct, setUpPct] = useState<number | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<AppSettings>("/api/admin/settings").then(setS).catch((e: ApiError) => pushToast(e.message, "err"));
  }, []);
  useWebSocket("/ws/admin", () => api<AppSettings>("/api/admin/settings").then(setS).catch(() => {}));

  if (!s) return <p className="text-slate-500">در حال دریافت تنظیمات…</p>;

  const save = async () => {
    setBusy(true);
    try {
      const data = await api<AppSettings>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(s),
      });
      setS(data);
      pushToast("تنظیمات ذخیره شد و روی نمایشگرهای متصل اعمال شد");
    } catch (e: any) {
      pushToast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const pickLogo = (file?: File | null) => {
    if (!file) return;
    if (!/image\/(jpeg|png|webp)/.test(file.type)) {
      pushToast("فرمت پشتیبانی نمی‌شود (JPG، PNG، WebP)", "err");
      return;
    }
    const upd = async () => {
      const resized = await resizeImage(file, 600).catch(() => file);
      uploadImage(
        resized,
        (p) => setUpPct(p),
        (url) => {
          setUpPct(null);
          setS((p) => (p ? { ...p, logo_url: url } : p));
          pushToast("لوگو ذخیره شد؛ دکمه «ذخیره تنظیمات» را بزنید");
        },
        (msg) => {
          setUpPct(null);
          pushToast(msg, "err");
        }
      );
    };
    upd();
  };

  const set = (patch: Partial<AppSettings>) => setS((p) => ({ ...p!, ...patch }));

  return (
    <div dir="rtl" className="max-w-3xl space-y-6">
      <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-5">
        <h3 className="font-bold text-slate-800">🏷️ مشخصات فروشگاه</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <label className="md:col-span-2">
            <span className="font-bold text-slate-700">نام فروشگاه (نمایش روی تلویزیون)</span>
            <input
              value={s.shop_name}
              onChange={(e) => set({ shop_name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5"
            />
          </label>
          <div className="md:col-span-2">
            <span className="font-bold text-slate-700">لوگو</span>
            <div className="mt-1 flex items-center gap-4">
              <div
                onClick={() => logoRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 w-28 h-28 grid place-items-center overflow-hidden bg-slate-50"
              >
                <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
                  onChange={(e) => pickLogo(e.target.files?.[0])} />
                {s.logo_url ? (
                  <img src={s.logo_url} alt="لوگو" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-2xl">🖼️</span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                کلیک کنید و لوگوی فروشگاه را انتخاب کنید.
                <br />
                JPG، PNG یا WebP — بهترین حالت: تصویر مربع.
              </div>
            </div>
            {upPct !== null && upPct < 100 && (
              <div className="mt-2 h-2 rounded bg-slate-200 overflow-hidden max-w-56">
                <div className="h-full bg-amber-500" style={{ width: `${upPct}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-5">
        <h3 className="font-bold text-slate-800">🎨 ظاهر صفحه نمایش</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <label>
            <span className="font-bold text-slate-700">رنگ پس‌زمینه</span>
            <div className="mt-1 flex gap-2 items-center">
              <input type="color" value={s.background_color} onChange={(e) => set({ background_color: e.target.value })}
                className="w-14 h-10 rounded-lg border" />
              <code className="text-xs text-slate-500">{s.background_color}</code>
            </div>
          </label>
          <label>
            <span className="font-bold text-slate-700">رنگ اصلی (تخفیف و قیمت ویژه)</span>
            <div className="mt-1 flex gap-2 items-center">
              <input type="color" value={s.accent_color} onChange={(e) => set({ accent_color: e.target.value })}
                className="w-14 h-10 rounded-lg border" />
              <code className="text-xs text-slate-500">{s.accent_color}</code>
            </div>
          </label>
          <label>
            <span className="font-bold text-slate-700">مدت نمایش هر اسلاید</span>
            <select
              value={s.duration_seconds}
              onChange={(e) => set({ duration_seconds: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5"
            >
              <option value={5}>۵ ثانیه</option>
              <option value={10}>۱۰ ثانیه</option>
              <option value={15}>۱۵ ثانیه</option>
              <option value={20}>۲۰ ثانیه</option>
            </select>
          </label>
          <label>
            <span className="font-bold text-slate-700">حالت نمایش محصولات</span>
            <select
              value={s.show_mode}
              onChange={(e) => set({ show_mode: e.target.value as AppSettings["show_mode"] })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5"
            >
              <option value="slide">یک محصول در هر اسلاید</option>
              <option value="grid">چند محصول در یک صفحه (شبکه ۲×۲)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-5">
        <h3 className="font-bold text-slate-800">🔄 همگام‌سازی چند نمایشگر</h3>
        <div className="space-y-3 text-sm">
          {[
            {
              value: "independent",
              title: "محتوای مشترک",
              desc: "همه نمایشگرها اطلاعات به‌روز یکسان دارند، اما هر یک اسلایدهای خودش را می‌چرخاند.",
            },
            {
              value: "synchronized",
              title: "نمایش کاملاً همگام",
              desc: "همه نمایشگرها هم‌زمان اسلاید یکسانی نشان می‌دهند؛ زمان‌بندی توسط سرور مدیریت می‌شود.",
            },
          ].map((o) => (
            <label
              key={o.value}
              className={`flex gap-3 rounded-2xl border-2 p-4 cursor-pointer transition ${
                s.sync_mode === o.value ? "border-amber-500 bg-amber-50" : "border-slate-200"
              }`}
            >
              <input
                type="radio"
                name="sync_mode"
                checked={s.sync_mode === o.value}
                onChange={() => set({ sync_mode: o.value as AppSettings["sync_mode"] })}
                className="mt-1 accent-amber-500"
              />
              <div>
                <div className="font-bold text-slate-800">{o.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{o.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
        >
          {busy ? "در حال ذخیره…" : "ذخیره تنظیمات"}
        </button>
      </div>
    </div>
  );
}
