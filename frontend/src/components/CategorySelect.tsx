import { useEffect, useMemo, useRef, useState } from "react";
import { PREDEFINED_CATEGORIES } from "@/lib/categories";

type Props = {
  /** مقدار فعلی دسته‌بندی (رشتهٔ فارسی، ممکن باید از لیست پیش‌تعریف باشد یا نه) */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** دسته‌های سفارشی/سفارشی موجود در سیستم (برای حفظ مقادیر خارج از لیست) */
  extras?: string[];
};

export default function CategorySelect({ value, onChange, placeholder = "انتخاب دسته‌بندی", extras = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  /* هنگام باز شدن، جست‌وجو ریست شود */
  useEffect(() => { if (open) setQuery(""); }, [open]);

  /* بستن با کلیک بیرون یا Escape */
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** گزینه‌ها: پیش‌فرض‌ها + دسته‌های سفارشی موجود + مقدار فعلی (حفظ مقادیر خارج از لیست) */
  const options = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (c: string) => {
      if (!c || seen.has(c)) return;
      seen.add(c);
      out.push(c);
    };
    PREDEFINED_CATEGORIES.forEach(push);
    (extras || []).forEach(push);
    push(value); // مقدار فعلی همیشه انتخاب‌پذیر و قابل نمایش می‌ماند
    return out;
  }, [value, extras]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((c) => c.toLowerCase().includes(q));
  }, [options, query]);

  /** آیا مقدار فعلی جزو دسته‌های پیش‌فرض است؟ (برای برچسب سفارشی) */
  const isOffList = !!value && !(PREDEFINED_CATEGORIES as readonly string[]).includes(value);

  return (
    <div ref={rootRef} dir="rtl" className="relative">
      {/* دکمهٔ نمایش دسته‌بندی انتخاب‌شده */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-slate-800 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <span className={value ? "font-bold" : "text-slate-400"}>
          {value || placeholder}
          {isOffList && value && (
            <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              دسته‌بندی سفارشی
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              aria-label="پاک کردن"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="rounded px-1 text-rose-500 hover:bg-rose-50"
            >
              ✕
            </span>
          )}
          <span className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {/* جست‌وجوی دسته‌بندی */}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جست‌وجو…"
            className="mb-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
          />

          <ul className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400" dir="rtl">
                دسته‌بندی یافت نشد
              </li>
            ) : (
              filtered.map((cat) => {
                const predef = (PREDEFINED_CATEGORIES as readonly string[]).includes(cat);
                const selected = cat === value;
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => { onChange(cat); setOpen(false); }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm transition-colors ${
                        selected
                          ? "bg-amber-50 font-black text-amber-900"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {selected && <span className="text-amber-600">✓</span>}
                        <span>{cat}</span>
                      </span>
                      {!predef && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          سفارشی
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="mt-1 border-t border-slate-100 pt-1 text-xs text-slate-400 text-center">
            دسته‌بندی اختیاری است
          </div>
        </div>
      )}
    </div>
  );
}
