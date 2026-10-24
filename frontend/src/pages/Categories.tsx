import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Category } from "@/lib/types";
import { toFaDigits } from "@/lib/format";
import { pushToast } from "@/components/Toast";
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Field, inputCls, Modal,
  PageHeader, TableSkeleton, useUnsavedGuard,
} from "@/components/ui";

export default function Categories() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Category | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const load = useCallback(
    () =>
      api<{ items: Category[] }>("/api/admin/categories")
        .then((d) => setItems(d.items))
        .catch((e: ApiError) => pushToast(e.message, "err")),
    []
  );
  useEffect(() => { load(); }, [load]);

  const saveNew = async () => {
    if (!name.trim()) return pushToast("نام دسته‌بندی را وارد کنید", "err");
    setBusy(true);
    try {
      await api("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      pushToast("دسته‌بندی اضافه شد");
      setName("");
      setNewOpen(false);
      load();
    } catch (e: any) {
      pushToast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const rename = async () => {
    if (!editing) return;
    const dirty = name.trim() !== editing.name;
    if (!dirty) return setEditing(null);
    setBusy(true);
    try {
      await api(`/api/admin/categories/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: name.trim() }),
      });
      pushToast("دسته‌بندی تغییر نام یافت؛ محصولات مرتبط به‌روز شدند");
      setEditing(null);
      load();
    } catch (e: any) {
      pushToast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const doRemove = async () => {
    if (!removing) return;
    setDelBusy(true);
    try {
      await api(`/api/admin/categories/${removing.id}`, { method: "DELETE" });
      pushToast(`دسته‌بندی «${removing.name}» حذف شد؛ محصولات آن بدون دسته ماندند`);
      setRemoving(null);
      load();
    } catch (e: any) {
      pushToast(e.message, "err");
    } finally {
      setDelBusy(false);
    }
  };

  const guard = useUnsavedGuard(!!editing && name.trim() !== editing.name);

  return (
    <div dir="rtl" className="space-y-4">
      <PageHeader
        title="دسته‌بندی‌ها"
        actions={
          <Button onClick={() => { setName(""); setNewOpen(true); }}>
            + دسته‌بندی جدید
          </Button>
        }
      />
      <p className="text-sm text-slate-500">
        دسته‌بندی‌ها برای گروه‌بندی محصولات روی صفحه نمایش تلویزیون و فیلتر در مدیریت محصولات استفاده می‌شوند.
      </p>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="p-3 text-right">نام دسته</th>
              <th className="p-3 text-right">تعداد محصولات</th>
              <th className="p-3 text-right">عملیات</th>
            </tr>
          </thead>
          {items === null ? (
            <TableSkeleton rows={4} cols={3} />
          ) : items.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={3}>
                  <EmptyState
                    icon="🗂️"
                    title="هنوز دسته‌بندی‌ای ثبت نشده"
                    hint="می‌توانید محصولات را بدون دسته هم نمایش دهید؛ ولی برای فیلتر بهتر، دسته بسازید."
                    action={<Button onClick={() => setNewOpen(true)}>افزودن اولین دسته</Button>}
                  />
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-800">{c.name}</td>
        <td className="p-3 fa-num text-slate-500">
          {toFaDigits(c.product_count)} محصول
        </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="neutral"
                        onClick={() => {
                          setEditing(c);
                          setName(c.name);
                        }}
                      >
                        تغییر نام
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setRemoving(c)}>
                        حذف
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </Card>

      <Modal open={newOpen || !!editing} onClose={() => { setNewOpen(false); setEditing(null); }} title={editing ? "تغییر نام دسته‌بندی" : "دسته‌بندی جدید"} width="max-w-md">
        <div className="space-y-4">
          <Field label="نام دسته" required>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (editing ? rename() : saveNew())}
              className={inputCls}
              placeholder="مثلاً: لبنیات"
            />
          </Field>
          <div className="flex gap-3 justify-end">
            <Button variant="neutral" onClick={() => { setNewOpen(false); setEditing(null); }}>
              انصراف
            </Button>
            <Button loading={busy} onClick={() => (editing ? rename() : saveNew())}>
              ذخیره
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!removing}
        title="حذف دسته‌بندی"
        message={`دسته‌بندی «${removing?.name}» حذف شود؟ محصولات این دسته حذف نمی‌شوند و فقط بدون دسته می‌مانند.`}
        confirmLabel="حذف دسته"
        danger
        busy={delBusy}
        onConfirm={doRemove}
        onClose={() => setRemoving(null)}
      />
      {guard.modal}
      <Badge tone="info">دسته‌بندی‌ها فوراً روی نمایشگرها همگام می‌شوند</Badge>
    </div>
  );
}
