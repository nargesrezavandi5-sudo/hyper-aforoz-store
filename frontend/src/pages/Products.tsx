import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, resizeImage, uploadImage } from "@/lib/api";
import { useWebSocket } from "@/lib/useWs";
import { Product } from "@/lib/types";
import { faDateTime, formatPrice, normalizePrice, toFaDigits } from "@/lib/format";
import { pushToast } from "@/components/Toast";
import JalaliDatePicker from "@/components/JalaliDatePicker";
import CategorySelect from "@/components/CategorySelect";
import { faJalaliDate } from "@/lib/jalali";
import { removeProductBackground } from "@/lib/removeBg";
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Field, inputCls,
  Modal, PageHeader, TableSkeleton, Thumb, useUnsavedGuard,
} from "@/components/ui";

type FormState = {
  id?: number;
  name: string;
  description: string;
  category: string;
  price: string;
  sale_price: string;
  discount_start: string;
  discount_end: string;
  sort_order: string;
  active: boolean;
  image_url: string;
  original_image: string; // نسخهٔ اصلی تصویر برای امکان انجام دوبارهٔ حذف پس‌زمینه
};

const emptyForm: FormState = {
  name: "", description: "", category: "", price: "", sale_price: "",
  discount_start: "", discount_end: "", sort_order: "0",
  active: true, image_url: "", original_image: "",
};

type SortKey = "order" | "name" | "price" | "discount";

function dateToTs(v: string): number | null {
  if (!v) return null;
  const [year, month, day] = v.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return Math.floor(date.getTime() / 1000);
}
function tsToDate(v: number | null): string {
  if (!v) return "";
  return new Date(v * 1000).toISOString().slice(0, 10);
}

const STATUS_LABELS = ["all", "active", "inactive", "discounted"] as const;
const STATUS_TEXT: Record<string, string> = {
  all: "همه", active: "فعال", inactive: "غیرفعال", discounted: "تخفیف‌دار",
};

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("order");
  const [form, setForm] = useState<FormState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const load = useCallback(
    (query = q, st = status) => {
      setLoading(true);
      const params = new URLSearchParams({ q: query, status_filter: st });
      api<{ items: Product[] }>(`/api/admin/products?${params}`)
        .then((d) => setItems(d.items))
        .catch((e: ApiError) => pushToast(e.message, "err"))
        .finally(() => setLoading(false));
    },
    [q, status]
  );

  useEffect(() => {
    const t = window.setTimeout(() => load(), q ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  useWebSocket("/ws/admin", () => {
    // Only reload if form is not open (to avoid resetting form during typing)
    if (!form) load();
  });

  const sorted = useMemo(() => {
    const arr = [...items];
    if (sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name, "fa"));
    if (sort === "price")
      arr.sort((a, b) => (normalizePrice(b.price) ?? 0) - (normalizePrice(a.price) ?? 0));
    if (sort === "discount")
      arr.sort((a, b) => (b.sale_price ?? 0) / b.price - (a.sale_price ?? 0) / a.price);
    if (sort === "order") arr.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    return arr;
  }, [items, sort]);

  const canReorder = sort === "order";

  const toggle = (p: Product) => {
    api(`/api/admin/products/${p.id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ active: !p.active }),
    })
      .then(() => load())
      .catch((e: ApiError) => pushToast(e.message, "err"));
  };

  const doDelete = (p: Product) => {
    setDelBusy(true);

    api(`/api/admin/products/${p.id}`, { method: "DELETE" })
      .then(() => {
        pushToast(`محصول «${p.name}» حذف شد`);
        setConfirmDelete(null);
        load();
      })
      .catch((e: ApiError) => pushToast(e.message, "err"))
      .finally(() => setDelBusy(false));
  };

  /* ---- ترتیب: جابه‌جایی با دکمه و درگ‌واندراپ ---- */
  const persistOrder = (list: Product[]) => {
    const ids = list.map((p) => p.id);
    api("/api/admin/products/order", {
      method: "PUT",
      body: JSON.stringify({ ids }),
    })
      .then(() => load())
      .catch((e: ApiError) => pushToast(e.message || " ثبت ترتیب ناموفق بود", "err"));
  };

  const move = (p: Product, dir: -1 | 1) => {
    const list = [...sorted];
    const i = list.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    // deterministic local update then persist
    setItems(list);
    persistOrder(list.map((x, k) => ({ ...x, sort_order: k })));
  };

  const dragId = useRef<number | null>(null);
  const onDragStartRow = (id: number) => (dragId.current = id);
  const onDropRow = (id: number) => {
    const from = dragId.current;
    dragId.current = null;
    if (from == null || from === id) return;
    const list = [...sorted];
    const fi = list.findIndex((x) => x.id === from);
    const ti = list.findIndex((x) => x.id === id);
    if (fi < 0 || ti < 0) return;
    const [moved] = list.splice(fi, 1);
    list.splice(ti, 0, moved);
    setItems(list);
    persistOrder(list);
  };

  const discountNow = (p: Product) =>
    !!p.sale_price && p.sale_price < p.price && (!p.discount_start || Date.now() / 1000 >= p.discount_start) && (!p.discount_end || Date.now() / 1000 <= p.discount_end);

  /* ---- حذف پس‌زمینه برای همهٔ عکس‌ها (پردازش دسته‌جمعی) ---- */
  const [bgBusy, setBgBusy] = useState(false);
  const [bgProgress, setBgProgress] = useState({ done: 0, total: 0, current: "" });

  const runBatchBgRemoval = async () => {
    const queue = items.filter((p) => p.image_url);
    if (queue.length === 0) {
      pushToast("محصولی برای پردازش تصویر وجود ندارد");
      return;
    }
    setBgBusy(true);
    setBgProgress({ done: 0, total: queue.length, current: "" });
    let completed = 0;
    let succeeded = 0;
    let failed = 0;
    for (const p of queue) {
      setBgProgress({ done: completed, total: queue.length, current: p.name });
      try {
        const res = await fetch(p.image_url);
        if (!res.ok) throw new Error(`Image request failed (${res.status})`);
        const blob = await res.blob();
        const out = await removeProductBackground(blob);
        const imageUrl = await new Promise<string>((resolve, reject) => {
          uploadImage(
            new File([out], `${p.id}-bg.png`, { type: "image/png" }),
            () => {},
            (url) => resolve(url),
            (msg) => reject(new Error(msg))
          );
        });
        await api(`/api/admin/products/${p.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: p.name, description: p.description, category: p.category,
            price: normalizePrice(p.price), sale_price: normalizePrice(p.sale_price),
            discount_start: p.discount_start, discount_end: p.discount_end,
            sort_order: p.sort_order, active: !!p.active, image_url: imageUrl,
          }),
        });
        succeeded++;
      } catch (err) {
        failed++;
        console.error("Batch bg-removal failed for", p.name, err);
      } finally {
        completed++;
        setBgProgress({ done: completed, total: queue.length, current: p.name });
      }
    }
    setBgBusy(false);
    if (failed) {
      pushToast(
        `پردازش ${toFaDigits(succeeded)} تصویر موفق بود و ${toFaDigits(failed)} مورد ناموفق ماند`,
        "err"
      );
    } else {
      pushToast(`پردازش دسته‌جمعی تمام شد — ${toFaDigits(succeeded)} تصویر`);
    }
    load();
  };

  return (
    <div dir="rtl" className="space-y-4">
      <PageHeader
        title="محصولات"
        actions={
          <div className="flex gap-2">
            <Button variant="neutral" onClick={runBatchBgRemoval} loading={bgBusy}>
              پردازش همهٔ عکس‌ها
            </Button>
            <Button onClick={() => setForm({ ...emptyForm })}>
              + افزودن محصول
            </Button>
          </div>
        }
      />

      {bgBusy && (
        <Card className="p-4 space-y-2">
          <p className="text-sm font-bold text-amber-800">
            در حال پردازش: {bgProgress.current} — {toFaDigits(bgProgress.done)} از {toFaDigits(bgProgress.total)}
          </p>
          <div className="h-2 rounded bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${bgProgress.total ? Math.round((bgProgress.done / bgProgress.total) * 100) : 0}%` }}
            />
          </div>
        </Card>
      )}

      {/* جست‌وجو / فیلتر / مرتب‌سازی */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 جست‌وجو در نام یا دسته‌بندی…"
          aria-label="جست‌وجوي محصول"
          className={`${inputCls} w-72`}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="فيلتر وضعیت"
          className={`${inputCls} w-44`}
        >
          {STATUS_LABELS.map((s) => (
            <option key={s} value={s}>{STATUS_TEXT[s]}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label=" مرتب‌سازی"
          className={`${inputCls} w-56`}
        >
          <option value="order">مرتب‌سازی: ترتيب نمایش</option>
          <option value="name">مرتب‌سازی: نام (الفبا)</option>
          <option value="price">مرتب‌سازی: گران‌ترین</option>
          <option value="discount">مرتب‌سازی: بیشترین تخفیف</option>
        </select>
        {canReorder && (
          <span className="text-xs text-slate-400">
            برای تغییر ترتيب نمایش، صفوف را بکشید یا از دکمه‌های ▲▼ استفاده کنید
          </span>
        )}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              {canReorder && <th className="p-3 text-right w-10"></th>}
              <th className="p-3 text-right">تصوير</th>
              <th className="p-3 text-right">نام</th>
              <th className="p-3 text-right">دسته</th>
              <th className="p-3 text-right">قیمت</th>
              <th className="p-3 text-right">تخفيف</th>
              <th className="p-3 text-right">وضعيت</th>
              <th className="p-3 text-right">اخرين تغيير</th>
              <th className="p-3 text-right"></th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton rows={6} cols={8} />
          ) : sorted.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    icon="📦"
                    title={q ? "محصولي با این مشخصات يكyd شد" : "هنوز محصولي ثبت نشده"}
                    hint={q ? "عبارت جست‌وجو أو فيلتر را تغيير دهid." : "اولين محصول فروشگاه را اضافه کنید تا علي televizor نشان دهد."}
                    action={!q && <Button onClick={() => setForm({ ...emptyForm })}>افزودن اولین محصول</Button>}
                  />
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {sorted.map((p) => {
                const discounted = discountNow(p);
                return (
                  <tr
                    key={p.id}
                    className="border-t border-slate-100 hover:bg-slate-50/50"
                    draggable={canReorder}
                    onDragStart={() => onDragStartRow(p.id)}
                    onDragOver={(e) => canReorder && e.preventDefault()}
                    onDrop={() => canReorder && onDropRow(p.id)}
                  >
                    {canReorder && (
                      <td className="p-3 text-slate-300 cursor-grab active:cursor-grabbing" title="کشیدن برای تغيير ترتيب">
                        ⣿
                      </td>
                    )}
                    <td className="p-3">
                      <Thumb src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg" />
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{p.name}</div>
                      {p.description && (
                        <div className="text-xs text-slate-400 truncate max-w-[220px]">{p.description}</div>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{p.category || "—"}</td>
                    <td className="p-3 fa-num whitespace-nowrap">
                      {discounted ? (
                        <span className="text-slate-400 line-through">{formatPrice(p.price)}</span>
                      ) : (
                        <span className="font-bold text-slate-800">{formatPrice(p.price)}</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {discounted && p.sale_price ? (
                        <div className="space-y-1">
                          <Badge tone="warn">٪{toFaDigits(p.discount_percent)}</Badge>
                          <div className="fa-num font-bold text-amber-700">{formatPrice(p.sale_price)}</div>
                        </div>
                      ) : p.sale_price ? (
                        <Badge tone="neutral">تخفيف در بازه</Badge>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggle(p)}
                        aria-pressed={!!p.active}
                        className={`
  rounded-full px-3 py-1 text-xs font-bold transition-colors 
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
  ${p.active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-200 text-slate-500 hover:bg-slate-300"}
`}
                      >
                        {p.active ? "● فعال" : "○ غيرفعال"}
                      </button>
                    </td>
                    <td className="p-3 text-xs text-slate-400 fa-num whitespace-nowrap">{faDateTime(p.updated_at)}</td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {canReorder && (
                          <>
                            <button
                              onClick={() => move(p, -1)}
                              aria-label={`انتقال ${p.name} به بالا`}
                              className="rounded-lg px-2 py-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => move(p, 1)}
                              aria-label={`انتقال ${p.name} به پایین`}
                              className="rounded-lg px-2 py-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                            >
                              ▼
                            </button>
                          </>
                        )}
                        <Button size="sm" variant="neutral" onClick={() => setForm(toForm(p))}>ویرایش</Button>
                        <Button size="sm" variant="danger" onClick={() => setConfirmDelete(p)}>حذف</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </Card>

      {form && (
        <ProductModal
          form={form}
          existingCategories={Array.from(new Set(items.map((p) => p.category).filter(Boolean)))}
          onClose={() => setForm(null)}
          onSaved={(created) => {
            setForm(null);
            load();
            pushToast(created ? "محصول اضافه شد و علي نمایشگرها اعمال می‌شود" : "تغييرات ذخیره شد و علي نمایشگرها اعمال می‌شود");
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="حذف محصول"
        message={`آيا از حذف «${confirmDelete?.name}» مطمين هستيد؟ этот عملقابل بازگشت نیست.`}
        confirmLabel="حذف محصول"
        danger
        busy={delBusy}
        onConfirm={() => confirmDelete && doDelete(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function toForm(p: Product): FormState {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    price: String(normalizePrice(p.price) ?? ""),
    sale_price: String(normalizePrice(p.sale_price) ?? ""),
    discount_start: tsToDate(p.discount_start),
    discount_end: tsToDate(p.discount_end),
    sort_order: String(p.sort_order),
    active: !!p.active,
    image_url: p.image_url,
    original_image: (p as any).original_image || p.image_url,
  };
}

/* ---------------- Product form dialog ---------------- */
function ProductModal({
  form,
  existingCategories,
  onClose,
  onSaved,
}: {
  form: FormState;
  existingCategories?: string[];
  onClose: () => void;
  onSaved: (created: boolean) => void;
}) {
  const editing = !!form.id;
  // Use a ref to stably capture the initial form prop — this prevents
  // the form state from being re-evaluated on every re-render of the modal,
  // which was causing inputs to remount and cursor position to jump.
  const initialForm = useRef(form);
  initialForm.current = form;
  const [f, setF] = useState<FormState>(initialForm.current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string>(initialForm.current.image_url);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [upPct, setUpPct] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [removeBgOn, setRemoveBgOn] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processErr, setProcessErr] = useState("");
  const [beforePreview, setBeforePreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = f.name !== initialForm.current.name ||
    f.description !== initialForm.current.description ||
    f.category !== initialForm.current.category ||
    f.price !== initialForm.current.price ||
    f.sale_price !== initialForm.current.sale_price ||
    f.discount_start !== initialForm.current.discount_start ||
    f.discount_end !== initialForm.current.discount_end ||
    f.sort_order !== initialForm.current.sort_order ||
    f.active !== initialForm.current.active ||
    f.image_url !== initialForm.current.image_url;
  
  const guard = useUnsavedGuard(dirty);

  const close = () => {
    // Cancel always closes the form, discarding any unsaved changes
    // Resets all fields and processing state
    guard.confirmLeave(() => onClose());
    pushToast("عملیات لغو شد");
  };

  const set = (patch: Partial<FormState>) => setF((p) => ({ ...p, ...patch }));

  const price = parseInt(f.price || "0", 10) || 0;
  const sale = parseInt(f.sale_price || "0", 10) || 0;
  const percent = sale > 0 && sale < price ? Math.round(((price - sale) * 100) / price) : 0;

  const pickFile = (file?: File | null) => {
    if (!file) return;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name) || !/image\/(jpeg|png|webp)/.test(file.type)) {
      pushToast("فرمت تصویر پشتیبانی نمی‌شود (JPG، PNG، WebP)", "err");
      return;
    }
    if (file.size > 7.9 * 1024 * 1024) {
      pushToast("حجم فایل بیش از حد مجاز (۸ مگابایت)", "err");
      return;
    }
    setBeforePreview(URL.createObjectURL(file));
    setProcessedBlob(null);
    setProcessErr("");
    setPreview(URL.createObjectURL(file));
    setPendingImage(file);
    setF((p) => ({ ...p, image_url: "" }));

    // حذف خودکار پس‌زمینه — فرایند سنگین در پس‌زمینه (感谢 progressively)
    if (removeBgOn) {
      setProcessing(true);
      removeProductBackground(file, (p) => setUpPct(Math.round(p * 90)))
        .then((blob) => {
          setProcessedBlob(blob);
          setPreview(URL.createObjectURL(blob));
          pushToast("پس‌زمینه حذف شد");
        })
        .catch((err) => {
          console.error("Background removal failed:", err);
          setProcessErr("حذف پس‌زمینه ناموفق بود؛ تصویر اصلی حفظ شد");
          setPreview(URL.createObjectURL(file));
          // keep the original in place — nothing lost
        })
        .finally(() => {
          setProcessing(false);
        });
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!f.name.trim()) return setError("نام محصول الزامی است");
    if (!price) return setError("قیمت اصلی الزامی است");
    if (sale && price && sale >= price) return setError("قیمت تخفيف‌خورده باید کمتر از قیمت اصلی باشد");
    setBusy(true);
    try {
      let imageUrl = f.image_url;
      if (pendingImage) {
        // اولویت با نسخهٔ بدون پس‌زمینه (processed) است؛ اگر حذف شکست خورد، اصلی
        const candidate = processedBlob || (await resizeImage(pendingImage).catch(() => pendingImage));
        await new Promise<void>((resolve, reject) => {
          uploadImage(
            candidate,
            (pct) => setUpPct(pct),
            (url) => {
              imageUrl = url;
              resolve();
            },
            (msg) => reject(new Error(msg))
          );
        });
      }
      const body = {
        name: f.name.trim(),
        description: f.description.trim(),
        category: f.category.trim(),
        price,
        sale_price: sale || null,
        discount_start: dateToTs(f.discount_start),
        discount_end: dateToTs(f.discount_end),
        sort_order: parseInt(f.sort_order || "0", 10) || 0,
        active: f.active,
        image_url: imageUrl,
      };
      if (editing) await api(`/api/admin/products/${f.id}`, { method: "PUT", body: JSON.stringify(body) });
      else await api("/api/admin/products", { method: "POST", body: JSON.stringify(body) });
      onSaved(!editing);
    } catch (err: any) {
      setError(err.message || "ذخیره ناموفق بود");
      pushToast(err.message || "ذخیره ناموفق بود", "err");
    } finally {
      setBusy(false);
      setUpPct(null);
    }
  };

  return (
    <Modal open onClose={close} title={editing ? "ويرش محصول" : "افزودن محصول جديد"} width="max-w-3xl">
      <form onSubmit={save} className="grid md:grid-cols-2 gap-4 text-sm">
        <div className="md:col-span-2">
          <Field label="نام محصول" required error={f.name === "" ? "نام وارد کنید" : undefined}>
            <input
              value={f.name}
              onChange={(e) => set({ name: e.target.value })}
              className={inputCls}
              placeholder="مثلاً: پنير ليقوان ۴۰۰ گرمی"
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="توضيح Korte" hint="چند کلمه؛ علي televizor زیر محصول نشان داده می‌شود">
            <input
              value={f.description}
              onChange={(e) => set({ description: e.target.value })}
              className={inputCls}
              placeholder="مثلاً: از دوン‌های تازه بشناسكارا تخصصي"
            />
          </Field>
        </div>
        <Field label="دسته‌بندی" hint="اختیاری — از فهرست انتخاب کنید یا جست‌وجو کنید">
          <CategorySelect
            value={f.category}
            onChange={(v) => set({ category: v })}
            extras={existingCategories}
            placeholder="انتخاب دسته‌بندی"
          />
          {f.category && (
            <span className="mt-1.5 block text-xs text-slate-500">
              انتخاب‌شده: <span className="font-bold text-slate-700">{f.category}</span>
            </span>
          )}
        </Field>
        <Field label="ترتیب نمایش" hint="عدد کوچک‌تر زودتر نمایش داده می‌شود">
          <input
            type="number"
            value={f.sort_order}
            onChange={(e) => set({ sort_order: e.target.value })}
            className={`${inputCls} ltr:text-left`}
          />
        </Field>
        <Field label="قیمت اصلی (تومان)" required>
          <input
            type="number"
            min={1}
            value={f.price}
            onChange={(e) => set({ price: e.target.value })}
            className={`${inputCls} ltr:text-left`}
          />
        </Field>
        <Field
          label="قیمت تخفيف‌خورده (تومان)"
          hint={percent > 0 ? `درصد تخفيف خودکار: ٪${toFaDigits(percent)}` : "خالي بگذاريد تا تخفيف نمایش داده نشود"}
        >
          <input
            type="number"
            min={0}
            value={f.sale_price}
            onChange={(e) => set({ sale_price: e.target.value })}
            className={`${inputCls} ltr:text-left`}
          />
        </Field>
        <Field label="شروع تخفيف (اختياري)" hint="تاریخ شمسی برای شروع خودکار تخفيف">
          <JalaliDatePicker
            value={f.discount_start}
            onChange={(iso) => set({ discount_start: iso })}
            placeholder="انتخاب تاریخ شروع"
          />
          {f.discount_start && (
            <span className="fa-num mt-1.5 block text-xs text-slate-500">
              شروع: {faJalaliDate(Math.floor(new Date(f.discount_start + "T00:00:00").getTime() / 1000))}
            </span>
          )}
        </Field>
        <Field label="پایان تخفيف (اختياري)" hint="تاریخ شمسی برای پایان خودکار تخفيف">
          <JalaliDatePicker
            value={f.discount_end}
            onChange={(iso) => set({ discount_end: iso })}
            placeholder="انتخاب تاریخ پایان"
          />
          {f.discount_end && (
            <span className="fa-num mt-1.5 block text-xs text-slate-500">
              پایان: {faJalaliDate(Math.floor(new Date(f.discount_end + "T00:00:00").getTime() / 1000))}
            </span>
          )}
        </Field>

        <div className="md:col-span-2">
          <span className="font-bold text-slate-700 text-sm">تصوير محصول</span>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            className={`mt-1 cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${dragging ? "border-amber-500 bg-amber-50" : "border-slate-300 hover:border-slate-400"}`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {preview ? (
              <div className="flex flex-col items-center gap-2">
                {beforePreview && preview && beforePreview !== preview ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">قبل:</span>
                    <img src={beforePreview} alt="قبل" className="max-h-24 rounded-lg object-contain" />
                    <span className="text-slate-300 text-lg">→</span>
                    <span className="text-xs text-slate-500">بعد (بدون پس‌زمینه):</span>
                    <img src={preview} alt="بعد (بدون پس‌زمینه)" className="max-h-24 rounded-lg object-contain" />
                  </div>
                ) : (
                  <img src={preview} alt="پیش‌نمایش تصویر" className="max-h-40 rounded-xl object-contain" />
                )}
                <span className="text-xs text-slate-500">برای تغییر، تصویر دیگری انتخاب کنید</span>
                {processing && (
                  <span className="text-xs font-bold text-amber-600">در حال حذف پس‌زمینه…</span>
                )}
                {processErr && (
                  <span className="text-xs font-bold text-rose-600">{processErr}</span>
                )}
                <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={removeBgOn}
                    onChange={(e) => setRemoveBgOn(e.target.checked)}
                    className="w-4 h-4 accent-amber-500"
                  />
                  حذف خودکار پس‌زمینه (برای عکس‌هایی که پس‌زمینهٔ شفاف دارند خاموش کنید)
                </label>
              </div>
            ) : (
              <div className="py-6 text-slate-500">
                <div className="text-3xl" aria-hidden>📤</div>
                <div className="mt-1 text-sm">فایل را بکشidipidipidipedi و رها کنidipidipidi كليک کن</div>
                <div className="text-[11px] text-slate-400">JPG، PNG یا WebP — تا ۸ مگابايت (خودکار بهینه می‌شود)</div>
              </div>
            )}
          </div>
          {pendingImage && (
            <p className="mt-1.5 text-xs text-emerald-700 font-bold">
              تصویر جديد انتخاب شد؛ همراه با ذخیره آپلود می‌شود.
            </p>
          )}
          {upPct !== null && upPct < 100 && (
            <div className="mt-2 h-2 rounded bg-slate-200 overflow-hidden">
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${upPct}%` }} />
            </div>
          )}
        </div>

        <label className="md:col-span-2 flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3">
          <input
            type="checkbox"
            checked={f.active}
            onChange={(e) => set({ active: e.target.checked })}
            className="w-4 h-4 accent-amber-500"
          />
          <span className="text-sm font-bold text-slate-700">
            محصول فعال است ( علي televizor مشاهده می‌شود)
          </span>
        </label>

        {error && (
          <div className="md:col-span-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 text-sm font-bold" role="alert">
            {error}
          </div>
        )}

        <div className="md:col-span-2 flex gap-3 justify-end pt-3 border-t border-slate-100">
          <Button type="button" variant="neutral" onClick={close}>
            انصراف
          </Button>
          <Button type="submit" loading={busy || processing} disabled={processing}>
            {processing
              ? "در حال حذف پس‌زمینه…"
              : upPct !== null && upPct < 100
              ? `آپلود تصویر… ${toFaDigits(upPct)}٪`
              : "ذخیره محصول"}
          </Button>
        </div>
      </form>
      {guard.modal}
    </Modal>
  );
}