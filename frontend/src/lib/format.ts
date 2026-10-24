import { faDigits, faJalaliDateTime } from "./jalali";

/** نام تاریخی حفظ شده تا همهٔ importهای موجود کار کنند */
export const toFaDigits = faDigits;
export { faJalaliDate, faJalaliDateFull } from "./jalali";

/** قیمت با جداکننده هزارگان و ارقام فارسی + تومان */
export function normalizePrice(value: number | null | undefined): number | null {
  if (value == null) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num > 0 && num < 1000 ? num * 1000 : num;
}

export function formatPrice(value: number | null | undefined): string {
  const num = normalizePrice(value);
  if (num == null) return "";
  return faDigits(Math.trunc(num).toLocaleString("en-US"));
}

export function formatPercent(value: number | null | undefined): string {
  return value ? `٪${toFaDigits(value)}` : "";
}

/**
 * dateTime فارسی/شمسی مثل «۱۴۰۵/۰۷/۲۲ ۱۴:۳۰» —
 * تبدیل تقویم واقعاً جلالی است (jalaali-js)، نه ترجمهٔ تقویم میلادی.
 */
export function faDateTime(ts: number | null | undefined): string {
  return faJalaliDateTime(ts);
}
