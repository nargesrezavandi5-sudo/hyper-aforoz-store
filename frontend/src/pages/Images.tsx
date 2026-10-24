import { useCallback, useEffect, useState } from "react";
import { api, ApiError, resizeImage, uploadImage } from "@/lib/api";
import { pushToast } from "@/components/Toast";
import {
  Button, Card, ConfirmDialog, EmptyState, PageHeader, Spinner, Thumb,
} from "@/components/ui";

type ImageItem = { id: number; url: string; filename: string; created_at: number };
export default function Images() {
  const [items, setItems] = useState<ImageItem[] | null>(null);
  const [usage, setUsage] = useState<Map<string, string>>(new Map()); // url -> product name
  const [upPct, setUpPct] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copyUrl, setCopyUrl] = useState("");
  const [deleting, setDeleting] = useState<ImageItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(
    () =>
      api<{ items: ImageItem[] }>("/api/admin/images")
        .then((d) => setItems(d.items))
        .catch((e: ApiError) => pushToast(e.message, "err")),
    []
  );
  useEffect(() => { load(); }, [load]);

  // کدام تصویر در کدام محصول استفاده شده (برای نشان «در استفاده»)
  useEffect(() => {
    api<{ items: Array<{ image_url: string; name: string }> }>("/api/admin/products")
      .then((d) => {
        const m = new Map<string, string>();
        d.items.forEach((p) => p.image_url && m.set(p.image_url, p.name));
        setUsage(m);
      })
      .catch(() => {});
  }, [items]);

  const doUpload = (file?: File | null) => {
    if (!file) return;
    if (!/image\/(jpeg|png|webp)/.test(file.type)) {
      pushToast("فرمت پشتیبانی نمی‌شود (JPG، PNG، WebP)", "err");
      return;
    }
    if (file.size > 7.9 * 1024 * 1024) {
      pushToast("حجم فایل بیش از حد مجاز (۸ مگابایت)", "err");
      return;
    }
    setUpPct(0);
    resizeImage(file)
      .catch(() => file)
      .then((resized) =>
        uploadImage(
          resized,
          (p) => setUpPct(p),
          (url) => {
            setUpPct(null);
            pushToast("تصویر بارگذاری شد به کتابخانه اضافه شد");
            load();
          },
          (msg) => {
            setUpPct(null);
            pushToast(msg, "err");
          }
        )
      );
  };

  const inUse = (i: ImageItem) => usage.get(i.url);

  const deleteImage = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/api/admin/images/${deleting.id}`, { method: "DELETE" });
      pushToast("تصویر از کتابخانه و سرور حذف شد");
      setDeleting(null);
      load();
    } catch (e) {
      pushToast(
        e instanceof Error ? e.message : "حذف تصویر ناموفق بود",
        "err"
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      <PageHeader title="کتابخانه تصاویر" />
      <p className="text-sm text-slate-500">
        تصاویر بارگذاری‌شده همه در سرور ذخیره می‌شوند و می‌توانید در چند محصول از آن‌ها استفاده کنید.
      </p>

      {/* آپلود */}
      <div
        className={`rounded-2xl bg-white border-slate-300 border-2 border-dashed p-6 text-center transition-colors cursor-pointer hover:border-slate-400 ${
          dragging ? "border-amber-500 bg-amber-50" : ""
        }`}
        onDragOver={(e: React.DragEvent) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e: React.DragEvent) => {
          e.preventDefault();
          setDragging(false);
          doUpload(e.dataTransfer.files?.[0]);
        }}
        onClick={() =>
          (document.getElementById("img-lib-file") as HTMLInputElement)?.click()
        }
      >
        <input
          id="img-lib-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => doUpload(e.target.files?.[0])}
        />
        <div className="text-3xl" aria-hidden>📤</div>
        <div className="mt-1 text-sm font-bold text-slate-600">
          فایل را بکشید و رها کنید یا کلیک کنید
        </div>
        <div className="text-[11px] text-slate-400">JPG، PNG یا WebP — تا ۸ مگابایت</div>
        {upPct !== null && upPct < 100 && (
          <div className="mt-3 h-2 rounded bg-slate-200 overflow-hidden mx-auto max-w-sm">
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${upPct}%` }} />
          </div>
        )}
      </div>

      {/* شبکه تصاویر */}
      {items === null ? (
        <Spinner label="در حال دریافت تصاویر…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon="🖼️"
          title="کتابخانه خالی است"
          hint="اولین تصویر را بالا آپلود کنید تا در محصولات و لوگو قابل استفاده باشد."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map((i) => {
            const user = inUse(i);
            return (
              <Card key={i.id} className="overflow-hidden">
                <Thumb src={i.url} className="aspect-square" fallback="🖼️" />
                <div className="p-2.5 space-y-1.5">
                  <div className="text-xs text-slate-500 truncate" dir="ltr" title={i.filename}>
                    {i.filename}
                  </div>
                  {user ? (
                    <div className="text-[11px] text-emerald-700 font-bold truncate">استفاده در: {user}</div>
                  ) : (
                    <div className="text-[11px] text-slate-400">بدون استفاده</div>
                  )}
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="neutral"
                      onClick={() =>
                        navigator.clipboard
                          ? navigator.clipboard.writeText(location.origin + i.url).then(
                              () => pushToast("آدرس تصویر کپی شد"),
                              () => setCopyUrl(location.origin + i.url)
                            )
                          : setCopyUrl(location.origin + i.url)
                      }
                    >
                      کپی آدرس
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleting(i)}>
                      حذف
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {copyUrl && (
        <div className="fixed inset-0 z-40 bg-slate-950/60 grid place-items-center p-4" onMouseDown={() => setCopyUrl("")}>
          <Card className="w-full max-w-md p-6">
            <h3 className="font-black mb-3">این آدرس را کپی کنید</h3>
            <code className="block bg-slate-100 rounded-xl px-3 py-2 text-xs break-all" dir="ltr">
              {copyUrl}
            </code>
            <Button className="mt-4" variant="neutral" onClick={() => setCopyUrl("")}>
              بستن
            </Button>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="حذف تصویر از کتابخانه"
        message={
          deleting && inUse(deleting)
            ? `این تصویر در محصول «${inUse(deleting)}» استفاده شده است. اگر حذف شود، آن محصول بدون تصویر می‌ماند. مطمئنید؟`
            : "این تصویر از سرور حذف شود؟ این عمل بازگشت‌پذیر نیست."
        }
        confirmLabel="حذف تصویر"
        danger
        busy={deleteBusy}
        onConfirm={() => {
          void deleteImage();
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
