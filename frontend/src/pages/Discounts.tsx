import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useWebSocket } from "@/lib/useWs";
import { Product } from "@/lib/types";
import { faDateTime, formatPrice, normalizePrice, toFaDigits } from "@/lib/format";
import { pushToast } from "@/components/Toast";
import {
  Badge, Button, Card, EmptyState, inputCls, PageHeader, TableSkeleton, Thumb,
} from "@/components/ui";

type Row = {
  product: Product;
  state: "active" | "upcoming" | "expired";
};

export default function Discounts() {
  const [items, setItems] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [sale, setSale] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      api<{ items: Product[] }>("/api/admin/products")
        .then((d) => setItems(d.items))
        .catch((e: ApiError) => pushToast(e.message, "err")),
    []
  );
  useEffect(() => { load(); }, [load]);
  useWebSocket("/ws/admin", () => load());

  const rows: Row[] = useMemo(() => {
    const ts = Date.now() / 1000;
    return (items || [])
      .filter((p) => p.sale_price && p.sale_price < p.price)
      .map((p) => {
        const state: Row["state"] =
          p.discount_start && ts < p.discount_start
            ? "upcoming"
            : p.discount_end && ts > p.discount_end
            ? "expired"
            : "active";
        return { product: p, state };
      })
      .sort((a, b) => (a.state === b.state ? a.product.sort_order - b.product.sort_order : a.state === "active" ? -1 : 1));
  }, [items]);

  const counts = useMemo(
    () => ({
      active: rows.filter((r) => r.state === "active").length,
      upcoming: rows.filter((r) => r.state === "upcoming").length,
      expired: rows.filter((r) => r.state === "expired").length,
    }),
    [rows]
  );

  const save = async () => {
    if (!editing) return;
    const val = parseInt(sale || "", 10);
    if (!val || val < 0) return pushToast("قیمت تخفیف وارد کنید", "err");
    if (val >= editing.product.price)
      return pushToast("قیمت تخفیف‌خورده باید کمتر از قیمت اصلی باشد", "err");
    setBusy(true);
    try {
      const p = editing.product;
      const body = {
        name: p.name, description: p.description, category: p.category,
        price: normalizePrice(p.price) ?? p.price, sale_price: val,
        discount_start: p.discount_start, discount_end: p.discount_end,
        sort_order: p.sort_order, active: !!p.active, image_url: p.image_url,
      };
      await api(`/api/admin/products/${p.id}`, { method: "PUT", body: JSON.stringify(body) });
      pushToast("تخفیف ذخیره شد و روی نمایشگرها اعمال می‌شود");
      setEditing(null);
      load();
    } catch (e: any) {
      pushToast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const removeDiscount = async (row: Row) => {
    const p = row.product;
    const body = {
      name: p.name, description: p.description, category: p.category,
      price: normalizePrice(p.price) ?? p.price, sale_price: null,
      discount_start: null, discount_end: null,
      sort_order: p.sort_order, active: !!p.active, image_url: p.image_url,
    };
    try {
      await api(`/api/admin/products/${p.id}`, { method: "PUT", body: JSON.stringify(body) });
      pushToast("تخفیف حذف شد");
      load();
    } catch (e: any) {
      pushToast(e.message, "err");
    }
  };

  const tone: Record<Row["state"], "ok" | "info" | "err"> = { active: "ok", upcoming: "info", expired: "err" };
  const label: Record<Row["state"], string> = { active: "در حال نمایش", upcoming: "شروع نشده", expired: "منقضی" };

  return (
    <div dir="rtl" className="space-y-4">
      <PageHeader title="تخفیف‌ها و پیشنهادها" />
      <div className="flex gap-3 text-sm">
        <Badge tone="ok">{toFaDigits(counts.active)} فعال</Badge>
        <Badge tone="info">{toFaDigits(counts.upcoming)} شروع‌نشده</Badge>
        <Badge tone="err">{toFaDigits(counts.expired)} منقضی</Badge>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="p-3 text-right">محصول</th>
              <th className="p-3 text-right">قیمت اصلی</th>
              <th className="p-3 text-right">قیمت تخفیف</th>
              <th className="p-3 text-right">درصد</th>
              <th className="p-3 text-right">بازه</th>
              <th className="p-3 text-right">وضعیت</th>
              <th className="p-3 text-right">عملیات</th>
            </tr>
          </thead>
          {items === null ? (
            <TableSkeleton rows={5} cols={7} />
          ) : rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="🏷️"
                    title="هیچ تخفیفی ثبت نشده"
                    hint="از صفحه محصولات می‌توانید برای هر محصول قیمت تخفیف تعیین کنید."
                    action={
                      <a href="#/admin/products" className="text-amber-600 font-bold text-sm hover:underline">
                        رفتن به محصولات ←
                      </a>
                    }
                  />
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {rows.map((r) => (
                <tr key={r.product.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Thumb src={r.product.image_url} className="w-10 h-10 rounded-lg" />
                      <div>
                        <div className="font-bold text-slate-800">{r.product.name}</div>
                        <div className="text-xs text-slate-400">{r.product.category || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 fa-num text-slate-500">{formatPrice(r.product.price)} تومان</td>
                  <td className="p-3 fa-num font-bold text-amber-700">{formatPrice(r.product.sale_price)} تومان</td>
                  <td className="p-3 fa-num">{toFaDigits(r.product.discount_percent)}٪</td>
                  <td className="p-3 text-xs text-slate-400 fa-num">
                    {r.product.discount_end ? faDateTime(r.product.discount_end) : "بدون پایان"}
                  </td>
                  <td className="p-3">
                    <Badge tone={tone[r.state]}>{label[r.state]}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="neutral"
                        onClick={() => {
                          setEditing(r);
                          setSale(String(normalizePrice(r.product.sale_price) ?? ""));
                        }}
                      >
                        ویرایش تخفیف
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => removeDiscount(r)}>
                        حذف تخفیف
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </Card>

      {editing && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 grid place-items-center p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}
          dir="rtl"
        >
          <Card className="w-full max-w-md p-6">
            <h3 className="font-black text-lg text-slate-900 mb-4">
              ویرایش تخفیف — {editing.product.name}
            </h3>
            <label className="block text-sm">
              <span className="font-bold text-slate-700">
                قیمت تخفیف‌خورده (تومان) <span className="text-rose-500">*</span>
              </span>
              <input
                autoFocus
                type="number"
                min={1}
                value={sale}
                onChange={(e) => setSale(e.target.value)}
                className={`mt-1 ${inputCls} ltr:text-left`}
              />
              <span className="mt-2 block text-xs text-slate-400">
                قیمت اصلی: <span className="fa-num">{formatPrice(editing.product.price)}</span> تومان
              </span>
            </label>
            <div className="mt-5 flex gap-3 justify-end">
              <Button variant="neutral" onClick={() => setEditing(null)}>
                انصراف
              </Button>
              <Button loading={busy} onClick={save}>
                ذخیره
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
