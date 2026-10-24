import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/lib/useWs";
import { ActivityItem, Stats } from "@/lib/types";
import { faDateTime, toFaDigits } from "@/lib/format";
import { Badge, Card, ErrorState, Skeleton } from "@/components/ui";

type StatCard = {
  label: string;
  icon: string;
  value: number;
  cls: string;
  warn?: boolean;
};

type Activity = {
  items: Array<{
    id: number;
    action: string;
    detail: string;
    created_at: number;
  }>;
};

const ACTION_LABELS: Record<string, string> = {
  product_add: "افزودن محصول",
  product_edit: "ویرایش محصول",
  product_delete: "حذف محصول",
  product_toggle: "تغییر وضعیت محصول",
  reorder: "تغییر ترتیب محصولات",
  category_add: "افزودن دسته‌بندی",
  category_rename: "تغییر نام دسته‌بندی",
  category_delete: "حذف دسته‌بندی",
  image_upload: "آپلود تصویر",
  settings: "تغییر تنظیمات",
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      api<Stats>("/api/admin/stats")
        .then((s) => {
          setStats(s);
          setError("");
        })
        .catch((e) => setError(e.message)),
    []
  );

  const loadActivity = useCallback(
    () =>
      api<{ items: ActivityItem[] }>("/api/admin/activity")
        .then((d) => setActivity(d.items))
        .catch(() => {}),
    []
  );

  useEffect(() => {
    load();
    loadActivity();
    const t = window.setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load, loadActivity]);

  useWebSocket("/ws/admin", () => {
    load();
    loadActivity();
  });

  if (error && !stats) return <ErrorState message={error} retry={load} />;
  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4" dir="rtl">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
        <Skeleton className="h-28 xl:col-span-5" />
      </div>
    );
  }

  const cards: StatCard[] = [
    { label: "کل محصولات", icon: "📦", value: stats.total_products, cls: "bg-slate-800 text-white" },
    { label: "محصولات فعال", icon: "✅", value: stats.active_products, cls: "bg-white text-slate-900" },
    { label: "غیرفعال", icon: "⏸️", value: stats.inactive_products, cls: "bg-white text-slate-900" },
    { label: "در حال تخفیف", icon: "🏷️", value: stats.discounted_products, cls: "bg-amber-500 text-slate-900" },
    { label: "تخفیف‌های پیش‌رو", icon: "🗓️", value: stats.upcoming_discounts, cls: "bg-white text-slate-900", warn: stats.upcoming_discounts > 0 },
  ];
  if (stats.expired_discounts > 0)
    cards.push({ label: "تخفیف منقضی‌شده", icon: "⚠️", value: stats.expired_discounts, cls: "bg-rose-50 text-rose-700" });

  return (
    <div dir="rtl" className="space-y-6">
      {/* آمار عملیاتی */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className={`${c.cls} p-4 flex flex-col gap-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold opacity-70">{c.label}</span>
              <span className="text-xl" aria-hidden>{c.icon}</span>
            </div>
            <div className="text-3xl font-black fa-num">{toFaDigits(c.value)}</div>
            {c.warn && <Badge tone="warn">بررسی کنید</Badge>}
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* وضعیت نمایشگرها */}
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>📺</span>
            <div>
              <div className="text-xs text-slate-500 font-bold">نمایشگرهای متصل</div>
              <div className="mt-1 text-2xl font-black fa-num">
                {toFaDigits(stats.displays_connected)}{" "}
                <span className="text-sm font-bold text-slate-400">تلویزیون</span>
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400 leading-5">
            تعداد جلسات نمایش فعال روی لینک مشترک <code dir="ltr" className="bg-slate-100 rounded px-1">/#/display</code>.
            برای مشاهده جزئیات به «وضعیت نمایشگرها» بروید.
          </div>
        </Card>

        {/* فعالیت‌های اخیر */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="font-black text-slate-800">فعالیت‌های اخیر</div>
            <span className="text-xs text-slate-400">۳۰ مورد آخر</span>
          </div>
          <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto">
            {activity === null && (
              <>
                <Skeleton className="h-5" />
                <Skeleton className="h-5" />
                <Skeleton className="h-5" />
              </>
            )}
            {activity && activity.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">
                هنوز فعالیتی ثبت نشده است
              </p>
            )}
            {activity?.map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm border-b border-slate-100 pb-2.5 last:border-0">
                <Badge tone="info">{ACTION_LABELS[a.action] || a.action}</Badge>
                <span className="text-slate-600 truncate grow">{a.detail || "—"}</span>
                <span className="text-xs text-slate-400 fa-num whitespace-nowrap">{faDateTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 flex flex-wrap gap-6 items-center">
        <div>
          <div className="text-xs text-slate-500">آخرین همگام‌سازی تغییرات</div>
          <div className="font-bold text-slate-800 fa-num">{faDateTime(stats.last_sync)}</div>
        </div>
        <div className="grow" />
        <button
          onClick={() =>
            api("/api/admin/backup").then((d) => {
              const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "store-backup.json";
              a.click();
            })
          }
          className="rounded-xl bg-slate-800 text-white text-sm px-4 py-2 font-bold hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          📥 دریافت نسخه پشتیبان محصولات
        </button>
        <span className="text-xs text-slate-400">
          تغییرات به‌صورت خودکار روی تمام نمایشگرهای متصل اعمال می‌شود.
        </span>
      </Card>
    </div>
  );
}
