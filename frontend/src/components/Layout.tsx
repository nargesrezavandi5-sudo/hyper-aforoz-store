import { NavLink, useNavigate } from "react-router-dom";
import { clearSession, getUsername } from "@/lib/api";
import { useWebSocket } from "@/lib/useWs";

const nav = [
  { to: "/admin", label: "مرور کلی", icon: "🏠", end: true },
  { to: "/admin/products", label: "محصولات", icon: "📦" },
  { to: "/admin/categories", label: "دسته‌بندی‌ها", icon: "🗂️" },
  { to: "/admin/discounts", label: "تخفیف‌ها و پیشنهادها", icon: "🏷️" },
  { to: "/admin/displays", label: "وضعیت نمایشگرها", icon: "📺" },
  { to: "/admin/settings", label: "طراحی و تنظیمات نمایش", icon: "🎨" },
  { to: "/admin/images", label: "کتابخانه تصاویر", icon: "🖼️" },
  { to: "/admin/general", label: "تنظیمات عمومی", icon: "⚙️" },
  { to: "/admin/live-display", label: "نمایش زنده", icon: "▶️" },
];

export default function Layout({
  children,
  wsOnline,
}: {
  children: React.ReactNode;
  wsOnline?: boolean;
}) {
  const navigate = useNavigate();
  useWebSocket("/ws/admin", () => {}, (offline) => {
    const el = document.getElementById("ws-status-dot");
    if (el) el.dataset.state = offline ? "off" : "on";
  });

  return (
    <div className="flex min-h-screen bg-slate-100" dir="rtl">
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-100 flex flex-col sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-slate-700/70">
          <div className="text-base font-bold flex items-center gap-2">
            <span aria-hidden>🖥️</span> سامانه فروشگاه
          </div>
          <div className="text-xs text-slate-400 mt-0.5">مدیریت محصولات و نمایشگرهای تلویزیون</div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isActive
                    ? "bg-amber-500 text-slate-900 font-bold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <span aria-hidden>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700/70 text-sm">
          <div className="text-slate-400 text-xs">کاربر: {getUsername() || "-"}</div>
          <button
            onClick={() => {
              clearSession();
              navigate("/admin/login", { replace: true });
            }}
            className="mt-3 w-full rounded-xl bg-rose-600 hover:bg-rose-500 py-2 font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            خروج از حساب
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <h1 className="font-bold text-slate-800 text-sm">پنل مدیریت</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span
              id="ws-status-dot"
              data-state="off"
              className={`w-2.5 h-2.5 rounded-full ${
                wsOnline ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            <span>اتصال بلادرنگ</span>
          </div>
        </header>
        <main className="p-6 grow">{children}</main>
      </div>
    </div>
  );
}
