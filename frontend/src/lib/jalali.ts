import { isLeapJalaaliYear, jalaaliMonthLength, toGregorian, toJalaali } from "jalaali-js";

/**
 * تقویم شمسی (جلالی) — تبدیل‌ها با کتابخانهٔ jalaali-js انجام می‌شود؛
 * یعنی طول ماه‌ها و سال‌های کبیسه واقعاً بر اساس الگوریتم تقویم جلالی است،
 * نه صرفاً ترجمهٔ نام ماه‌های میلادی.
 */

/* ---------------- ارقام فارسی ---------------- */
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
export function faDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[+d]);
}

/* ---------------- نام ماه‌ها و روزهای هفته ---------------- */
export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
] as const;

/** هفته از شنبه شروع می‌شود */
export const WEEKDAYS_LONG = [
  "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه",
] as const;
/** خلاصهٔ یک‌حرفی برای سرستون تقویم (شنبه…جمعه) */
export const WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

export type JDate = { jy: number; jm: number; jd: number };

/* ---------------- تبدیل مبنایی ---------------- */

/** ثانیهٔ یونیکس (نیمه‌شب در منطقهٔ زمانی محلی) → تاریخ جلالی */
export function tsToJalali(ts: number): JDate {
  const d = new Date(ts * 1000);
  const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return { jy: j.jy, jm: j.jm, jd: j.jd };
}

/** تاریخ جلالی → ثانیهٔ یونیکس نیمه‌شب محلی */
export function jalaliToTs({ jy, jm, jd }: JDate): number {
  const g = toGregorian(jy, jm, jd);
  return Math.floor(new Date(g.gy, g.gm - 1, g.gd).getTime() / 1000);
}

/** تاریخ جلالی → رشتهٔ میلادی ISO «YYYY-MM-DD» (برای سازگاری با ورودی‌های فرم) */
export function jalaliToIso({ jy, jm, jd }: JDate): string {
  const g = toGregorian(jy, jm, jd);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${g.gy}-${p(g.gm)}-${p(g.gd)}`;
}

/** رشتهٔ میلادی ISO «YYYY-MM-DD» → تاریخ جلالی (null برای رشتهٔ خالی/نامعتبر) */
export function isoToJalali(iso: string): JDate | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const j = toJalaali(Number(m[1]), Number(m[2]), Number(m[3]));
  return { jy: j.jy, jm: j.jm, jd: j.jd };
}

/** روزِ هفتهٔ جلالی با شروع از شنبه: ۰=شنبه … ۶=جمعه */
export function weekdaySatFirst(jy: number, jm: number, jd: number): number {
  const g = toGregorian(jy, jm, jd);
  // getDay(): ۰=یکشنبه … ۶=شنبه  →  جابه‌جایی تا شنبه = ۰
  return (new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7;
}

/** طول ماه جلالی (با مدیریت کبیسهٔ اسفند ۲۹/۳۰) */
export function monthLength(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm);
}

export function isLeap(jy: number): boolean {
  return isLeapJalaaliYear(jy);
}

/** امروز به تاریخ جلالی */
export function todayJalali(): JDate {
  const d = new Date();
  const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return { jy: j.jy, jm: j.jm, jd: j.jd };
}

/* ---------------- فرمت‌بندی نمایشی ---------------- */

/** «۱۴۰۵/۰۷/۲۲» */
export function faJalaliDate(ts: number | null | undefined): string {
  if (!ts) return "—";
  const { jy, jm, jd } = tsToJalali(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return faDigits(`${jy}/${p(jm)}/${p(jd)}`);
}

/** «۲۲ مهر ۱۴۰۵» */
export function faJalaliDateFull(ts: number | null | undefined): string {
  if (!ts) return "—";
  const { jy, jm, jd } = tsToJalali(ts);
  return faDigits(`${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`);
}

/** «۱۴۰۵/۰۷/۲۲ ۱۴:۳۰» */
export function faJalaliDateTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  const hm = new Date(ts * 1000).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${faJalaliDate(ts)} ${faDigits(hm)}`;
}

/** انتخاب ماه/سال پاپ‌آپ تقویم: جابه‌جایی سال با عبور از مرز دی→فروردین */
export function addMonths(jy: number, jm: number, delta: number): JDate {
  const total = jy * 12 + (jm - 1) + delta;
  return { jy: Math.floor(total / 12), jm: (((total % 12) + 12) % 12) + 1, jd: 1 };
}
