import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths, faDigits, isoToJalali, JALALI_MONTHS, jalaliToIso,
  monthLength, todayJalali, weekdaySatFirst, WEEKDAYS_SHORT,
} from "@/lib/jalali";

type Props = {
  /** میلادی ISO «YYYY-MM-DD» یا رشتهٔ خالی (مقدار ذخیره‌شونده در فرم) */
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
};

export default function JalaliDatePicker({ value, onChange, placeholder = "انتخاب تاریخ" }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => isoToJalali(value), [value]);
  const [view, setView] = useState(() => {
    const s = isoToJalali(value);
    return s ? { jy: s.jy, jm: s.jm } : { jy: todayJalali().jy, jm: todayJalali().jm };
  });
  const today = useMemo(() => todayJalali(), []);

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

  /* هنگام باز شدن، تقویم روی ماهِ تاریخ انتخاب‌شده قرار گیرد */
  useEffect(() => {
    if (!open) return;
    if (selected) setView({ jy: selected.jy, jm: selected.jm });
  }, [open, selected]);

  const days = monthLength(view.jy, view.jm);
  const blanks = weekdaySatFirst(view.jy, view.jm, 1);

  const pick = (jd: number) => {
    onChange(jalaliToIso({ jy: view.jy, jm: view.jm, jd }));
    setOpen(false);
  };

  return (
    <div ref={rootRef} dir="rtl" className="relative">
      {/* دکمهٔ نمایش تاریخ (به‌صورت شمسی) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-slate-800 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <span className={`fa-num ${selected ? "" : "text-slate-400"}`}>
          {selected ? faDigits(`${selected.jy}/${String(selected.jm).padStart(2, "0")}/${String(selected.jd).padStart(2, "0")}`) : placeholder}
        </span>
        <span className="flex items-center gap-1">
          {selected && (
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
          <span className="text-slate-400">📅</span>
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          {/* ناوبری سال و ماه */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex gap-1">
              <button type="button" onClick={() => setView(addMonths(view.jy, view.jm, -12))}
                className="rounded-lg px-2 py-1 hover:bg-slate-100" aria-label="سال قبل">⏪</button>
              <button type="button" onClick={() => setView(addMonths(view.jy, view.jm, -1))}
                className="rounded-lg px-2 py-1 hover:bg-slate-100" aria-label="ماه قبل">‹</button>
            </div>
            <div className="fa-num font-black text-slate-900 text-sm">
              {JALALI_MONTHS[view.jm - 1]} {faDigits(view.jy)}
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => setView(addMonths(view.jy, view.jm, 1))}
                className="rounded-lg px-2 py-1 hover:bg-slate-100" aria-label="ماه بعد">›</button>
              <button type="button" onClick={() => setView(addMonths(view.jy, view.jm, 12))}
                className="rounded-lg px-2 py-1 hover:bg-slate-100" aria-label="سال بعد">⏩</button>
            </div>
          </div>

          {/* نام روزها — شروع هفته از شنبه */}
          <div className="mb-1 grid grid-cols-7 text-center text-xs font-bold text-slate-400">
            {WEEKDAYS_SHORT.map((w) => <span key={w}>{w}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {Array.from({ length: blanks }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: days }, (_, i) => i + 1).map((jd) => {
              const isToday = today.jy === view.jy && today.jm === view.jm && today.jd === jd;
              const isSelected = !!selected && selected.jy === view.jy && selected.jm === view.jm && selected.jd === jd;
              return (
                <button
                  key={jd}
                  type="button"
                  onClick={() => pick(jd)}
                  className={`fa-num rounded-lg py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "bg-amber-500 font-black text-slate-900"
                      : isToday
                      ? "bg-amber-100 font-bold text-amber-800 hover:bg-amber-200"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {faDigits(jd)}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-xs">
            <button
              type="button"
              onClick={() => { onChange(jalaliToIso(today)); setOpen(false); }}
              className="rounded-lg px-2 py-1 font-bold text-amber-700 hover:bg-amber-50"
            >
              امروز
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
