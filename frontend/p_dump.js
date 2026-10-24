import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/Products.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=df9915f3"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("E:/store/frontend/src/pages/Products.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$(), _s2 = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=df9915f3"; const useCallback = __vite__cjsImport3_react["useCallback"]; const useEffect = __vite__cjsImport3_react["useEffect"]; const useMemo = __vite__cjsImport3_react["useMemo"]; const useRef = __vite__cjsImport3_react["useRef"]; const useState = __vite__cjsImport3_react["useState"];
import { api, resizeImage, uploadImage } from "/src/lib/api.ts";
import { useWebSocket } from "/src/lib/useWs.ts";
import { faDateTime, formatPrice, toFaDigits } from "/src/lib/format.ts";
import { pushToast } from "/src/components/Toast.tsx";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  inputCls,
  Modal,
  PageHeader,
  TableSkeleton,
  Thumb,
  useUnsavedGuard
} from "/src/components/ui.tsx";
const emptyForm = {
  name: "",
  description: "",
  category: "",
  price: "",
  sale_price: "",
  discount_start: "",
  discount_end: "",
  sort_order: "0",
  active: true,
  image_url: ""
};
function dateToTs(v) {
  return v ? Math.floor((/* @__PURE__ */ new Date(v + "T00:00:00")).getTime() / 1e3) : null;
}
function tsToDate(v) {
  if (!v) return "";
  return new Date(v * 1e3).toISOString().slice(0, 10);
}
const STATUS_LABELS = ["all", "active", "inactive", "discounted"];
const STATUS_TEXT = {
  all: "همه",
  active: "فعال",
  inactive: "غیرفعال",
  discounted: "تخفیف‌دار"
};
export default function Products() {
  _s();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("order");
  const [form, setForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [delBusy, setDelBusy] = useState(false);
  const load = useCallback(
    (query = q, st = status) => {
      setLoading(true);
      const params = new URLSearchParams({ q: query, status_filter: st });
      api(`/api/admin/products?${params}`).then((d) => setItems(d.items)).catch((e) => pushToast(e.message, "err")).finally(() => setLoading(false));
    },
    [q, status]
  );
  useEffect(() => {
    const t = window.setTimeout(() => load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, status]);
  useWebSocket("/ws/admin", () => load());
  const sorted = useMemo(() => {
    const arr = [...items];
    if (sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name, "fa"));
    if (sort === "price") arr.sort((a, b) => b.price - a.price);
    if (sort === "discount")
      arr.sort((a, b) => (b.sale_price ?? 0) / b.price - (a.sale_price ?? 0) / a.price);
    if (sort === "order") arr.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    return arr;
  }, [items, sort]);
  const canReorder = sort === "order";
  const toggle = (p) => {
    api(`/api/admin/products/${p.id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ active: !p.active })
    }).then(() => load()).catch((e) => pushToast(e.message, "err"));
  };
  const doDelete = (p) => {
    setDelBusy(true);
    api(`/api/admin/products/${p.id}`, { method: "DELETE" }).then(() => {
      pushToast(`محصول «${p.name}» حذف شد`);
      setConfirmDelete(null);
      load();
    }).catch((e) => pushToast(e.message, "err")).finally(() => setDelBusy(false));
  };
  const persistOrder = (list) => {
    const ids = list.map((p) => p.id);
    api("/api/admin/products/order", {
      method: "PUT",
      body: JSON.stringify({ ids })
    }).then(() => load()).catch((e) => pushToast(e.message || "ثبت ترتیب ناموفق بود", "err"));
  };
  const move = (p, dir) => {
    const list = [...sorted];
    const i = list.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setItems(list);
    persistOrder(list.map((x, k) => ({ ...x, sort_order: k })));
  };
  const dragId = useRef(null);
  const onDragStartRow = (id) => dragId.current = id;
  const onDropRow = (id) => {
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
  const discountNow = (p) => !!p.sale_price && p.sale_price < p.price && (!p.discount_start || Date.now() / 1e3 >= p.discount_start) && (!p.discount_end || Date.now() / 1e3 <= p.discount_end);
  return /* @__PURE__ */ jsxDEV("div", { dir: "rtl", className: "space-y-4", children: [
    /* @__PURE__ */ jsxDEV(
      PageHeader,
      {
        title: "محصولات",
        actions: /* @__PURE__ */ jsxDEV(Button, { onClick: () => setForm({ ...emptyForm }), children: "+ افزودن محصول" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 177,
          columnNumber: 9
        }, this)
      },
      void 0,
      false,
      {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 174,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap gap-3 items-center", children: [
      /* @__PURE__ */ jsxDEV(
        "input",
        {
          value: q,
          onChange: (e) => setQ(e.target.value),
          placeholder: "🔍 جست‌وجو در نام یا دسته‌بندی…",
          "aria-label": "جست‌وجوی محصول",
          className: `${inputCls} w-72`
        },
        void 0,
        false,
        {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 185,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "select",
        {
          value: status,
          onChange: (e) => setStatus(e.target.value),
          "aria-label": "فیلتر وضعیت",
          className: `${inputCls} w-44`,
          children: STATUS_LABELS.map(
            (s) => /* @__PURE__ */ jsxDEV("option", { value: s, children: STATUS_TEXT[s] }, s, false, {
              fileName: "E:/store/frontend/src/pages/Products.tsx",
              lineNumber: 199,
              columnNumber: 11
            }, this)
          )
        },
        void 0,
        false,
        {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 192,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "select",
        {
          value: sort,
          onChange: (e) => setSort(e.target.value),
          "aria-label": "مرتب‌سازی",
          className: `${inputCls} w-56`,
          children: [
            /* @__PURE__ */ jsxDEV("option", { value: "order", children: "مرتب‌سازی: ترتیب نمایش" }, void 0, false, {
              fileName: "E:/store/frontend/src/pages/Products.tsx",
              lineNumber: 208,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("option", { value: "name", children: "مرتب‌سازی: نام (الفبا)" }, void 0, false, {
              fileName: "E:/store/frontend/src/pages/Products.tsx",
              lineNumber: 209,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("option", { value: "price", children: "مرتب‌سازی: گران‌ترین" }, void 0, false, {
              fileName: "E:/store/frontend/src/pages/Products.tsx",
              lineNumber: 210,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("option", { value: "discount", children: "مرتب‌سازی: بیشترین تخفیف" }, void 0, false, {
              fileName: "E:/store/frontend/src/pages/Products.tsx",
              lineNumber: 211,
              columnNumber: 11
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 202,
          columnNumber: 9
        },
        this
      ),
      canReorder && /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-slate-400", children: "برای تغییر ترتیب نمایش، ردیف‌ها را بکشید یا از دکمه‌های ▲▼ استفاده کنید" }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 214,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "E:/store/frontend/src/pages/Products.tsx",
      lineNumber: 184,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Card, { className: "overflow-hidden", children: /* @__PURE__ */ jsxDEV("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxDEV("thead", { className: "bg-slate-50 text-slate-500 text-xs", children: /* @__PURE__ */ jsxDEV("tr", { children: [
        canReorder && /* @__PURE__ */ jsxDEV("th", { className: "p-3 text-right w-10" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 224,
          columnNumber: 30
        }, this),
        /* @__PURE__ */ jsxDEV("th", { className: "p-3 text-right", children: "تصویر" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 225,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("th", { className: "p-3 text-right", children: "نام" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 226,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("th", { className: "p-3 text-right", children: "دسته" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 227,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("th", { className: "p-3 text-right", children: "قیمت" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 228,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("th", { className: "p-3 text-right", children: "تخفیف" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 229,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("th", { className: "p-3 text-right", children: "وضعیت" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 230,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("th", { className: "p-3 text-right", children: "آخرین تغییر" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 231,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("th", { className: "p-3 text-right" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 232,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 223,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 222,
        columnNumber: 11
      }, this),
      loading ? /* @__PURE__ */ jsxDEV(TableSkeleton, { rows: 6, cols: 8 }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 236,
        columnNumber: 11
      }, this) : sorted.length === 0 ? /* @__PURE__ */ jsxDEV("tbody", { children: /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", { colSpan: 9, children: /* @__PURE__ */ jsxDEV(
        EmptyState,
        {
          icon: "📦",
          title: q ? "محصولی با این مشخصات یافت نشد" : "هنوز محصولی ثبت نشده",
          hint: q ? "عبارت جست‌وجو یا فیلتر را تغییر دهید." : "اولین محصول فروشگاه را اضافه کنید تا روی تلویزیون نمایش داده شود.",
          action: !q && /* @__PURE__ */ jsxDEV(Button, { onClick: () => setForm({ ...emptyForm }), children: "افزودن اولین محصول" }, void 0, false, {
            fileName: "E:/store/frontend/src/pages/Products.tsx",
            lineNumber: 245,
            columnNumber: 33
          }, this)
        },
        void 0,
        false,
        {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 241,
          columnNumber: 19
        },
        this
      ) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 240,
        columnNumber: 17
      }, this) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 239,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 238,
        columnNumber: 11
      }, this) : /* @__PURE__ */ jsxDEV("tbody", { children: sorted.map((p) => {
        const discounted = discountNow(p);
        return /* @__PURE__ */ jsxDEV(
          "tr",
          {
            className: "border-t border-slate-100 hover:bg-slate-50/50",
            draggable: canReorder,
            onDragStart: () => onDragStartRow(p.id),
            onDragOver: (e) => canReorder && e.preventDefault(),
            onDrop: () => canReorder && onDropRow(p.id),
            children: [
              canReorder && /* @__PURE__ */ jsxDEV("td", { className: "p-3 text-slate-300 cursor-grab active:cursor-grabbing", title: "کشیدن برای تغییر ترتیب", children: "⣿" }, void 0, false, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 264,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("td", { className: "p-3", children: /* @__PURE__ */ jsxDEV(Thumb, { src: p.image_url, alt: p.name, className: "w-12 h-12 rounded-lg" }, void 0, false, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 269,
                columnNumber: 23
              }, this) }, void 0, false, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 268,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("td", { className: "p-3", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "font-bold text-slate-800", children: p.name }, void 0, false, {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 272,
                  columnNumber: 23
                }, this),
                p.description && /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-400 truncate max-w-[220px]", children: p.description }, void 0, false, {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 274,
                  columnNumber: 21
                }, this)
              ] }, void 0, true, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 271,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("td", { className: "p-3 text-slate-500", children: p.category || "—" }, void 0, false, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 277,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("td", { className: "p-3 fa-num whitespace-nowrap", children: discounted ? /* @__PURE__ */ jsxDEV("span", { className: "text-slate-400 line-through", children: formatPrice(p.price) }, void 0, false, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 280,
                columnNumber: 21
              }, this) : /* @__PURE__ */ jsxDEV("span", { className: "font-bold text-slate-800", children: formatPrice(p.price) }, void 0, false, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 282,
                columnNumber: 21
              }, this) }, void 0, false, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 278,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("td", { className: "p-3 whitespace-nowrap", children: discounted && p.sale_price ? /* @__PURE__ */ jsxDEV("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxDEV(Badge, { tone: "warn", children: [
                  "٪",
                  toFaDigits(p.discount_percent)
                ] }, void 0, true, {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 288,
                  columnNumber: 27
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "fa-num font-bold text-amber-700", children: formatPrice(p.sale_price) }, void 0, false, {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 289,
                  columnNumber: 27
                }, this)
              ] }, void 0, true, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 287,
                columnNumber: 21
              }, this) : p.sale_price ? /* @__PURE__ */ jsxDEV(Badge, { tone: "neutral", children: "تخفیف در بازه" }, void 0, false, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 292,
                columnNumber: 21
              }, this) : /* @__PURE__ */ jsxDEV("span", { className: "text-slate-300", children: "—" }, void 0, false, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 294,
                columnNumber: 21
              }, this) }, void 0, false, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 285,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("td", { className: "p-3", children: /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => toggle(p),
                  "aria-pressed": !!p.active,
                  className: `rounded-full px-3 py-1 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${p.active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-200 text-slate-500 hover:bg-slate-300"}`,
                  children: p.active ? "● فعال" : "○ غیرفعال"
                },
                void 0,
                false,
                {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 298,
                  columnNumber: 23
                },
                this
              ) }, void 0, false, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 297,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("td", { className: "p-3 text-xs text-slate-400 fa-num whitespace-nowrap", children: faDateTime(p.updated_at) }, void 0, false, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 310,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("td", { className: "p-3 whitespace-nowrap", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5", children: [
                canReorder && /* @__PURE__ */ jsxDEV(Fragment, { children: [
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => move(p, -1),
                      "aria-label": `انتقال ${p.name} به بالا`,
                      className: "rounded-lg px-2 py-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                      children: "▲"
                    },
                    void 0,
                    false,
                    {
                      fileName: "E:/store/frontend/src/pages/Products.tsx",
                      lineNumber: 315,
                      columnNumber: 29
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => move(p, 1),
                      "aria-label": `انتقال ${p.name} به پایین`,
                      className: "rounded-lg px-2 py-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                      children: "▼"
                    },
                    void 0,
                    false,
                    {
                      fileName: "E:/store/frontend/src/pages/Products.tsx",
                      lineNumber: 322,
                      columnNumber: 29
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 314,
                  columnNumber: 23
                }, this),
                /* @__PURE__ */ jsxDEV(Button, { size: "sm", variant: "neutral", onClick: () => toForm(p), children: "ویرایش" }, void 0, false, {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 331,
                  columnNumber: 25
                }, this),
                /* @__PURE__ */ jsxDEV(Button, { size: "sm", variant: "danger", onClick: () => setConfirmDelete(p), children: "حذف" }, void 0, false, {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 332,
                  columnNumber: 25
                }, this)
              ] }, void 0, true, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 312,
                columnNumber: 23
              }, this) }, void 0, false, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 311,
                columnNumber: 21
              }, this)
            ]
          },
          p.id,
          true,
          {
            fileName: "E:/store/frontend/src/pages/Products.tsx",
            lineNumber: 255,
            columnNumber: 17
          },
          this
        );
      }) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 251,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "E:/store/frontend/src/pages/Products.tsx",
      lineNumber: 221,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "E:/store/frontend/src/pages/Products.tsx",
      lineNumber: 220,
      columnNumber: 7
    }, this),
    form && /* @__PURE__ */ jsxDEV(
      ProductModal,
      {
        form,
        onClose: () => setForm(null),
        onSaved: (created) => {
          setForm(null);
          load();
          pushToast(created ? "محصول اضافه شد و روی نمایشگرها اعمال می‌شود" : "تغییرات ذخیره شد و روی نمایشگرها اعمال می‌شود");
        }
      },
      void 0,
      false,
      {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 344,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      ConfirmDialog,
      {
        open: !!confirmDelete,
        title: "حذف محصول",
        message: `آیا از حذف «${confirmDelete?.name}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`,
        confirmLabel: "حذف محصول",
        danger: true,
        busy: delBusy,
        onConfirm: () => confirmDelete && doDelete(confirmDelete),
        onClose: () => setConfirmDelete(null)
      },
      void 0,
      false,
      {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 355,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "E:/store/frontend/src/pages/Products.tsx",
    lineNumber: 173,
    columnNumber: 5
  }, this);
}
_s(Products, "6rVVFoCbVxfpobZX+7xbEE1MVIU=", false, function() {
  return [useWebSocket];
});
_c = Products;
function toForm(p) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    price: String(p.price ?? ""),
    sale_price: p.sale_price ? String(p.sale_price) : "",
    discount_start: tsToDate(p.discount_start),
    discount_end: tsToDate(p.discount_end),
    sort_order: String(p.sort_order),
    active: !!p.active,
    image_url: p.image_url
  };
}
function ProductModal({
  form,
  onClose,
  onSaved
}) {
  _s2();
  const editing = !!form.id;
  const [f, setF] = useState(form);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(f.image_url);
  const [pendingImage, setPendingImage] = useState(null);
  const [upPct, setUpPct] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const initialRef = useRef(form);
  const dirty = useMemo(() => {
    const a = initialRef.current;
    const keys = Object.keys(a);
    return keys.some((k) => a[k] !== f[k]);
  }, [f]);
  const guard = useUnsavedGuard(dirty);
  const close = () => {
    guard.confirmLeave(() => onClose());
  };
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const price = parseInt(f.price || "0", 10) || 0;
  const sale = parseInt(f.sale_price || "0", 10) || 0;
  const percent = sale > 0 && sale < price ? Math.round((price - sale) * 100 / price) : 0;
  const pickFile = (file) => {
    if (!file) return;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name) || !/image\/(jpeg|png|webp)/.test(file.type)) {
      pushToast("فرمت تصویر پشتیبانی نمی‌شود (JPG، PNG، WebP)", "err");
      return;
    }
    if (file.size > 7.9 * 1024 * 1024) {
      pushToast("حجم فایل بیش از حد مجاز (۸ مگابایت)", "err");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setPendingImage(file);
    setF((p) => ({ ...p, image_url: "" }));
  };
  const save = async (e) => {
    e.preventDefault();
    setError("");
    if (!f.name.trim()) return setError("نام محصول الزامی است");
    if (!price) return setError("قیمت اصلی الزامی است");
    if (sale && price && sale >= price) return setError("قیمت تخفیف‌خورده باید کمتر از قیمت اصلی باشد");
    setBusy(true);
    try {
      let imageUrl = f.image_url;
      if (pendingImage) {
        const resized = await resizeImage(pendingImage).catch(() => pendingImage);
        await new Promise((resolve, reject) => {
          uploadImage(
            resized,
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
        image_url: imageUrl
      };
      if (editing) await api(`/api/admin/products/${f.id}`, { method: "PUT", body: JSON.stringify(body) });
      else
        await api("/api/admin/products", { method: "POST", body: JSON.stringify(body) });
      onSaved(!editing);
    } catch (err) {
      setError(err.message || "ذخیره ناموفق بود");
      pushToast(err.message || "ذخیره ناموفق بود", "err");
    } finally {
      setBusy(false);
      setUpPct(null);
    }
  };
  return /* @__PURE__ */ jsxDEV(Modal, { open: true, onClose: close, title: editing ? "ویرایش محصول" : "افزودن محصول جدید", width: "max-w-3xl", children: [
    /* @__PURE__ */ jsxDEV("form", { onSubmit: save, className: "grid md:grid-cols-2 gap-4 text-sm", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "md:col-span-2", children: /* @__PURE__ */ jsxDEV(Field, { label: "نام محصول", required: true, error: f.name === "" ? "نام وارد کنید" : void 0, children: /* @__PURE__ */ jsxDEV(
        "input",
        {
          value: f.name,
          onChange: (e) => set({ name: e.target.value }),
          className: inputCls,
          placeholder: "مثلاً: پنیر لیقوان ۴۰۰ گرمی"
        },
        void 0,
        false,
        {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 490,
          columnNumber: 13
        },
        this
      ) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 489,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 488,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "md:col-span-2", children: /* @__PURE__ */ jsxDEV(Field, { label: "توضیح کوتاه", hint: "چند کلمه؛ روی تلویزیون زیر نام محصول نشان داده می‌شود", children: /* @__PURE__ */ jsxDEV(
        "input",
        {
          value: f.description,
          onChange: (e) => set({ description: e.target.value }),
          className: inputCls,
          placeholder: "مثلاً: از دانه‌های تازه برشته‌کاری تخصصی"
        },
        void 0,
        false,
        {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 500,
          columnNumber: 13
        },
        this
      ) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 499,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 498,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Field, { label: "دسته‌بندی", children: /* @__PURE__ */ jsxDEV(
        "input",
        {
          value: f.category,
          onChange: (e) => set({ category: e.target.value }),
          className: inputCls,
          placeholder: "مثلاً: لبنیات",
          list: "cat-suggestions"
        },
        void 0,
        false,
        {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 509,
          columnNumber: 11
        },
        this
      ) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 508,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Field, { label: "ترتیب نمایش", hint: "عدد کوچکتر زودتر نمایش داده می‌شود", children: /* @__PURE__ */ jsxDEV(
        "input",
        {
          type: "number",
          value: f.sort_order,
          onChange: (e) => set({ sort_order: e.target.value }),
          className: `${inputCls} ltr:text-left`
        },
        void 0,
        false,
        {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 518,
          columnNumber: 11
        },
        this
      ) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 517,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Field, { label: "قیمت اصلی (تومان)", required: true, children: /* @__PURE__ */ jsxDEV(
        "input",
        {
          type: "number",
          min: 1,
          value: f.price,
          onChange: (e) => set({ price: e.target.value }),
          className: `${inputCls} ltr:text-left`
        },
        void 0,
        false,
        {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 526,
          columnNumber: 11
        },
        this
      ) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 525,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(
        Field,
        {
          label: "قیمت تخفیف‌خورده (تومان)",
          hint: percent > 0 ? `درصد تخفیف خودکار: ٪${toFaDigits(percent)}` : "خالی بگذارید تا تخفیف نمایش داده نشود",
          children: /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "number",
              min: 0,
              value: f.sale_price,
              onChange: (e) => set({ sale_price: e.target.value }),
              className: `${inputCls} ltr:text-left`
            },
            void 0,
            false,
            {
              fileName: "E:/store/frontend/src/pages/Products.tsx",
              lineNumber: 538,
              columnNumber: 11
            },
            this
          )
        },
        void 0,
        false,
        {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 534,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(Field, { label: "شروع تخفیف (اختیاری)", children: /* @__PURE__ */ jsxDEV(
        "input",
        {
          type: "date",
          value: f.discount_start,
          onChange: (e) => set({ discount_start: e.target.value }),
          className: `${inputCls} ltr:text-left`
        },
        void 0,
        false,
        {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 547,
          columnNumber: 11
        },
        this
      ) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 546,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Field, { label: "پایان تخفیف (اختیاری)", children: /* @__PURE__ */ jsxDEV(
        "input",
        {
          type: "date",
          value: f.discount_end,
          onChange: (e) => set({ discount_end: e.target.value }),
          className: `${inputCls} ltr:text-left`
        },
        void 0,
        false,
        {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 555,
          columnNumber: 11
        },
        this
      ) }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 554,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "md:col-span-2", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "font-bold text-slate-700 text-sm", children: "تصویر محصول" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 564,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            onDragOver: (e) => {
              e.preventDefault();
              setDragging(true);
            },
            onDragLeave: () => setDragging(false),
            onDrop: (e) => {
              e.preventDefault();
              setDragging(false);
              pickFile(e.dataTransfer.files?.[0]);
            },
            onClick: () => fileRef.current?.click(),
            role: "button",
            tabIndex: 0,
            onKeyDown: (e) => e.key === "Enter" && fileRef.current?.click(),
            className: `mt-1 cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${dragging ? "border-amber-500 bg-amber-50" : "border-slate-300 hover:border-slate-400"}`,
            children: [
              /* @__PURE__ */ jsxDEV(
                "input",
                {
                  ref: fileRef,
                  type: "file",
                  accept: "image/jpeg,image/png,image/webp",
                  hidden: true,
                  onChange: (e) => pickFile(e.target.files?.[0])
                },
                void 0,
                false,
                {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 584,
                  columnNumber: 13
                },
                this
              ),
              preview ? /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-2", children: [
                /* @__PURE__ */ jsxDEV("img", { src: preview, alt: "پیش‌نمایش تصویر", className: "max-h-40 rounded-xl object-contain" }, void 0, false, {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 593,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-slate-500", children: "برای جایگزینی، تصویر دیگری انتخاب یا رها کنید" }, void 0, false, {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 594,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 592,
                columnNumber: 13
              }, this) : /* @__PURE__ */ jsxDEV("div", { className: "py-6 text-slate-500", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "text-3xl", "aria-hidden": true, children: "📤" }, void 0, false, {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 598,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "mt-1 text-sm", children: "فایل را بکشید و رها کنید یا کلیک کنید" }, void 0, false, {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 599,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "text-[11px] text-slate-400", children: "JPG، PNG یا WebP — تا ۸ مگابایت (خودکار بهینه می‌شود)" }, void 0, false, {
                  fileName: "E:/store/frontend/src/pages/Products.tsx",
                  lineNumber: 600,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "E:/store/frontend/src/pages/Products.tsx",
                lineNumber: 597,
                columnNumber: 13
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "E:/store/frontend/src/pages/Products.tsx",
            lineNumber: 565,
            columnNumber: 11
          },
          this
        ),
        pendingImage && /* @__PURE__ */ jsxDEV("p", { className: "mt-1.5 text-xs text-emerald-700 font-bold", children: "تصویر جدید انتخاب شد؛ همراه با ذخیره آپلود می‌شود." }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 605,
          columnNumber: 11
        }, this),
        upPct !== null && upPct < 100 && /* @__PURE__ */ jsxDEV("div", { className: "mt-2 h-2 rounded bg-slate-200 overflow-hidden", children: /* @__PURE__ */ jsxDEV("div", { className: "h-full bg-amber-500 transition-all", style: { width: `${upPct}%` } }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 611,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 610,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 563,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("label", { className: "md:col-span-2 flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3", children: [
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "checkbox",
            checked: f.active,
            onChange: (e) => set({ active: e.target.checked }),
            className: "w-4 h-4 accent-amber-500"
          },
          void 0,
          false,
          {
            fileName: "E:/store/frontend/src/pages/Products.tsx",
            lineNumber: 617,
            columnNumber: 11
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold text-slate-700", children: "محصول فعال است (روی نمایشگر تلویزیون دیده می‌شود)" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 623,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 616,
        columnNumber: 9
      }, this),
      error && /* @__PURE__ */ jsxDEV("div", { className: "md:col-span-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 text-sm font-bold", role: "alert", children: error }, void 0, false, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 629,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "md:col-span-2 flex gap-3 justify-end pt-3 border-t border-slate-100", children: [
        /* @__PURE__ */ jsxDEV(Button, { type: "button", variant: "neutral", onClick: close, children: "انصراف" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 635,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Button, { type: "submit", loading: busy, children: upPct !== null && upPct < 100 ? `آپلود تصویر… ${toFaDigits(upPct)}٪` : "ذخیره محصول" }, void 0, false, {
          fileName: "E:/store/frontend/src/pages/Products.tsx",
          lineNumber: 638,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "E:/store/frontend/src/pages/Products.tsx",
        lineNumber: 634,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "E:/store/frontend/src/pages/Products.tsx",
      lineNumber: 487,
      columnNumber: 7
    }, this),
    guard.modal
  ] }, void 0, true, {
    fileName: "E:/store/frontend/src/pages/Products.tsx",
    lineNumber: 486,
    columnNumber: 5
  }, this);
}
_s2(ProductModal, "3ZE7y2KIohNvuV6AIJOVyL2SOkk=", false, function() {
  return [useUnsavedGuard];
});
_c2 = ProductModal;
var _c, _c2;
$RefreshReg$(_c, "Products");
$RefreshReg$(_c2, "ProductModal");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("E:/store/frontend/src/pages/Products.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("E:/store/frontend/src/pages/Products.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBNkpVLFNBeUlnQixVQXpJaEI7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBN0pWLFNBQW9CQSxhQUFhQyxXQUFXQyxTQUFTQyxRQUFRQyxnQkFBZ0I7QUFDN0UsU0FBU0MsS0FBZUMsYUFBYUMsbUJBQW1CO0FBQ3hELFNBQVNDLG9CQUFvQjtBQUU3QixTQUFTQyxZQUFZQyxhQUFhQyxrQkFBa0I7QUFDcEQsU0FBU0MsaUJBQWlCO0FBQzFCO0FBQUEsRUFDRUM7QUFBQUEsRUFBT0M7QUFBQUEsRUFBUUM7QUFBQUEsRUFBTUM7QUFBQUEsRUFBZUM7QUFBQUEsRUFBWUM7QUFBQUEsRUFBT0M7QUFBQUEsRUFDdkRDO0FBQUFBLEVBQU9DO0FBQUFBLEVBQVlDO0FBQUFBLEVBQWVDO0FBQUFBLEVBQU9DO0FBQUFBLE9BQ3BDO0FBZ0JQLE1BQU1DLFlBQXVCO0FBQUEsRUFDM0JDLE1BQU07QUFBQSxFQUFJQyxhQUFhO0FBQUEsRUFBSUMsVUFBVTtBQUFBLEVBQUlDLE9BQU87QUFBQSxFQUFJQyxZQUFZO0FBQUEsRUFDaEVDLGdCQUFnQjtBQUFBLEVBQUlDLGNBQWM7QUFBQSxFQUFJQyxZQUFZO0FBQUEsRUFDbERDLFFBQVE7QUFBQSxFQUFNQyxXQUFXO0FBQzNCO0FBSUEsU0FBU0MsU0FBU0MsR0FBMEI7QUFDMUMsU0FBT0EsSUFBSUMsS0FBS0MsT0FBTSxvQkFBSUMsS0FBS0gsSUFBSSxXQUFXLEdBQUVJLFFBQVEsSUFBSSxHQUFJLElBQUk7QUFDdEU7QUFDQSxTQUFTQyxTQUFTTCxHQUEwQjtBQUMxQyxNQUFJLENBQUNBLEVBQUcsUUFBTztBQUNmLFNBQU8sSUFBSUcsS0FBS0gsSUFBSSxHQUFJLEVBQUVNLFlBQVksRUFBRUMsTUFBTSxHQUFHLEVBQUU7QUFDckQ7QUFFQSxNQUFNQyxnQkFBZ0IsQ0FBQyxPQUFPLFVBQVUsWUFBWSxZQUFZO0FBQ2hFLE1BQU1DLGNBQXNDO0FBQUEsRUFDMUNDLEtBQUs7QUFBQSxFQUFPYixRQUFRO0FBQUEsRUFBUWMsVUFBVTtBQUFBLEVBQVdDLFlBQVk7QUFDL0Q7QUFFQSx3QkFBd0JDLFdBQVc7QUFBQUMsS0FBQTtBQUNqQyxRQUFNLENBQUNDLE9BQU9DLFFBQVEsSUFBSWpELFNBQW9CLEVBQUU7QUFDaEQsUUFBTSxDQUFDa0QsU0FBU0MsVUFBVSxJQUFJbkQsU0FBUyxJQUFJO0FBQzNDLFFBQU0sQ0FBQ29ELEdBQUdDLElBQUksSUFBSXJELFNBQVMsRUFBRTtBQUM3QixRQUFNLENBQUNzRCxRQUFRQyxTQUFTLElBQUl2RCxTQUFpQixLQUFLO0FBQ2xELFFBQU0sQ0FBQ3dELE1BQU1DLE9BQU8sSUFBSXpELFNBQWtCLE9BQU87QUFDakQsUUFBTSxDQUFDMEQsTUFBTUMsT0FBTyxJQUFJM0QsU0FBMkIsSUFBSTtBQUN2RCxRQUFNLENBQUM0RCxlQUFlQyxnQkFBZ0IsSUFBSTdELFNBQXlCLElBQUk7QUFDdkUsUUFBTSxDQUFDOEQsU0FBU0MsVUFBVSxJQUFJL0QsU0FBUyxLQUFLO0FBRTVDLFFBQU1nRSxPQUFPcEU7QUFBQUEsSUFDWCxDQUFDcUUsUUFBUWIsR0FBR2MsS0FBS1osV0FBVztBQUMxQkgsaUJBQVcsSUFBSTtBQUNmLFlBQU1nQixTQUFTLElBQUlDLGdCQUFnQixFQUFFaEIsR0FBR2EsT0FBT0ksZUFBZUgsR0FBRyxDQUFDO0FBQ2xFakUsVUFBMEIsdUJBQXVCa0UsTUFBTSxFQUFFLEVBQ3RERyxLQUFLLENBQUNDLE1BQU10QixTQUFTc0IsRUFBRXZCLEtBQUssQ0FBQyxFQUM3QndCLE1BQU0sQ0FBQ0MsTUFBZ0JqRSxVQUFVaUUsRUFBRUMsU0FBUyxLQUFLLENBQUMsRUFDbERDLFFBQVEsTUFBTXhCLFdBQVcsS0FBSyxDQUFDO0FBQUEsSUFDcEM7QUFBQSxJQUNBLENBQUNDLEdBQUdFLE1BQU07QUFBQSxFQUNaO0FBRUF6RCxZQUFVLE1BQU07QUFDZCxVQUFNK0UsSUFBSUMsT0FBT0MsV0FBVyxNQUFNZCxLQUFLLEdBQUdaLElBQUksTUFBTSxDQUFDO0FBQ3JELFdBQU8sTUFBTTJCLGFBQWFILENBQUM7QUFBQSxFQUU3QixHQUFHLENBQUN4QixHQUFHRSxNQUFNLENBQUM7QUFFZGxELGVBQWEsYUFBYSxNQUFNNEQsS0FBSyxDQUFDO0FBRXRDLFFBQU1nQixTQUFTbEYsUUFBUSxNQUFNO0FBQzNCLFVBQU1tRixNQUFNLENBQUMsR0FBR2pDLEtBQUs7QUFDckIsUUFBSVEsU0FBUyxPQUFReUIsS0FBSXpCLEtBQUssQ0FBQzBCLEdBQUdDLE1BQU1ELEVBQUU1RCxLQUFLOEQsY0FBY0QsRUFBRTdELE1BQU0sSUFBSSxDQUFDO0FBQzFFLFFBQUlrQyxTQUFTLFFBQVN5QixLQUFJekIsS0FBSyxDQUFDMEIsR0FBR0MsTUFBTUEsRUFBRTFELFFBQVF5RCxFQUFFekQsS0FBSztBQUMxRCxRQUFJK0IsU0FBUztBQUNYeUIsVUFBSXpCLEtBQUssQ0FBQzBCLEdBQUdDLE9BQU9BLEVBQUV6RCxjQUFjLEtBQUt5RCxFQUFFMUQsU0FBU3lELEVBQUV4RCxjQUFjLEtBQUt3RCxFQUFFekQsS0FBSztBQUNsRixRQUFJK0IsU0FBUyxRQUFTeUIsS0FBSXpCLEtBQUssQ0FBQzBCLEdBQUdDLE1BQU1ELEVBQUVyRCxhQUFhc0QsRUFBRXRELGNBQWNxRCxFQUFFRyxLQUFLRixFQUFFRSxFQUFFO0FBQ25GLFdBQU9KO0FBQUFBLEVBQ1QsR0FBRyxDQUFDakMsT0FBT1EsSUFBSSxDQUFDO0FBRWhCLFFBQU04QixhQUFhOUIsU0FBUztBQUU1QixRQUFNK0IsU0FBU0EsQ0FBQ0MsTUFBZTtBQUM3QnZGLFFBQUksdUJBQXVCdUYsRUFBRUgsRUFBRSxXQUFXO0FBQUEsTUFDeENJLFFBQVE7QUFBQSxNQUNSQyxNQUFNQyxLQUFLQyxVQUFVLEVBQUU5RCxRQUFRLENBQUMwRCxFQUFFMUQsT0FBTyxDQUFDO0FBQUEsSUFDNUMsQ0FBQyxFQUNFd0MsS0FBSyxNQUFNTixLQUFLLENBQUMsRUFDakJRLE1BQU0sQ0FBQ0MsTUFBZ0JqRSxVQUFVaUUsRUFBRUMsU0FBUyxLQUFLLENBQUM7QUFBQSxFQUN2RDtBQUVBLFFBQU1tQixXQUFXQSxDQUFDTCxNQUFlO0FBQy9CekIsZUFBVyxJQUFJO0FBQ2Y5RCxRQUFJLHVCQUF1QnVGLEVBQUVILEVBQUUsSUFBSSxFQUFFSSxRQUFRLFNBQVMsQ0FBQyxFQUNwRG5CLEtBQUssTUFBTTtBQUNWOUQsZ0JBQVUsVUFBVWdGLEVBQUVsRSxJQUFJLFVBQVU7QUFDcEN1Qyx1QkFBaUIsSUFBSTtBQUNyQkcsV0FBSztBQUFBLElBQ1AsQ0FBQyxFQUNBUSxNQUFNLENBQUNDLE1BQWdCakUsVUFBVWlFLEVBQUVDLFNBQVMsS0FBSyxDQUFDLEVBQ2xEQyxRQUFRLE1BQU1aLFdBQVcsS0FBSyxDQUFDO0FBQUEsRUFDcEM7QUFHQSxRQUFNK0IsZUFBZUEsQ0FBQ0MsU0FBb0I7QUFDeEMsVUFBTUMsTUFBTUQsS0FBS0UsSUFBSSxDQUFDVCxNQUFNQSxFQUFFSCxFQUFFO0FBQ2hDcEYsUUFBSSw2QkFBNkI7QUFBQSxNQUMvQndGLFFBQVE7QUFBQSxNQUNSQyxNQUFNQyxLQUFLQyxVQUFVLEVBQUVJLElBQUksQ0FBQztBQUFBLElBQzlCLENBQUMsRUFDRTFCLEtBQUssTUFBTU4sS0FBSyxDQUFDLEVBQ2pCUSxNQUFNLENBQUNDLE1BQWdCakUsVUFBVWlFLEVBQUVDLFdBQVcsd0JBQXdCLEtBQUssQ0FBQztBQUFBLEVBQ2pGO0FBRUEsUUFBTXdCLE9BQU9BLENBQUNWLEdBQVlXLFFBQWdCO0FBQ3hDLFVBQU1KLE9BQU8sQ0FBQyxHQUFHZixNQUFNO0FBQ3ZCLFVBQU1vQixJQUFJTCxLQUFLTSxVQUFVLENBQUNDLE1BQU1BLEVBQUVqQixPQUFPRyxFQUFFSCxFQUFFO0FBQzdDLFVBQU1rQixJQUFJSCxJQUFJRDtBQUNkLFFBQUlJLElBQUksS0FBS0EsS0FBS1IsS0FBS1MsT0FBUTtBQUMvQixLQUFDVCxLQUFLSyxDQUFDLEdBQUdMLEtBQUtRLENBQUMsQ0FBQyxJQUFJLENBQUNSLEtBQUtRLENBQUMsR0FBR1IsS0FBS0ssQ0FBQyxDQUFDO0FBRXRDbkQsYUFBUzhDLElBQUk7QUFDYkQsaUJBQWFDLEtBQUtFLElBQUksQ0FBQ0ssR0FBR0csT0FBTyxFQUFFLEdBQUdILEdBQUd6RSxZQUFZNEUsRUFBRSxFQUFFLENBQUM7QUFBQSxFQUM1RDtBQUVBLFFBQU1DLFNBQVMzRyxPQUFzQixJQUFJO0FBQ3pDLFFBQU00RyxpQkFBaUJBLENBQUN0QixPQUFnQnFCLE9BQU9FLFVBQVV2QjtBQUN6RCxRQUFNd0IsWUFBWUEsQ0FBQ3hCLE9BQWU7QUFDaEMsVUFBTXlCLE9BQU9KLE9BQU9FO0FBQ3BCRixXQUFPRSxVQUFVO0FBQ2pCLFFBQUlFLFFBQVEsUUFBUUEsU0FBU3pCLEdBQUk7QUFDakMsVUFBTVUsT0FBTyxDQUFDLEdBQUdmLE1BQU07QUFDdkIsVUFBTStCLEtBQUtoQixLQUFLTSxVQUFVLENBQUNDLE1BQU1BLEVBQUVqQixPQUFPeUIsSUFBSTtBQUM5QyxVQUFNRSxLQUFLakIsS0FBS00sVUFBVSxDQUFDQyxNQUFNQSxFQUFFakIsT0FBT0EsRUFBRTtBQUM1QyxRQUFJMEIsS0FBSyxLQUFLQyxLQUFLLEVBQUc7QUFDdEIsVUFBTSxDQUFDQyxLQUFLLElBQUlsQixLQUFLbUIsT0FBT0gsSUFBSSxDQUFDO0FBQ2pDaEIsU0FBS21CLE9BQU9GLElBQUksR0FBR0MsS0FBSztBQUN4QmhFLGFBQVM4QyxJQUFJO0FBQ2JELGlCQUFhQyxJQUFJO0FBQUEsRUFDbkI7QUFFQSxRQUFNb0IsY0FBY0EsQ0FBQzNCLE1BQ25CLENBQUMsQ0FBQ0EsRUFBRTlELGNBQWM4RCxFQUFFOUQsYUFBYThELEVBQUUvRCxVQUNsQyxDQUFDK0QsRUFBRTdELGtCQUFrQlMsS0FBS2dGLElBQUksSUFBSSxPQUFRNUIsRUFBRTdELG9CQUM1QyxDQUFDNkQsRUFBRTVELGdCQUFnQlEsS0FBS2dGLElBQUksSUFBSSxPQUFRNUIsRUFBRTVEO0FBRTdDLFNBQ0UsdUJBQUMsU0FBSSxLQUFJLE9BQU0sV0FBVSxhQUN2QjtBQUFBO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDQyxPQUFNO0FBQUEsUUFDTixTQUNFLHVCQUFDLFVBQU8sU0FBUyxNQUFNK0IsUUFBUSxFQUFFLEdBQUd0QyxVQUFVLENBQUMsR0FBRSw4QkFBakQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUVBO0FBQUE7QUFBQSxNQUxKO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQU1HO0FBQUEsSUFJSCx1QkFBQyxTQUFJLFdBQVUscUNBQ2I7QUFBQTtBQUFBLFFBQUM7QUFBQTtBQUFBLFVBQ0MsT0FBTytCO0FBQUFBLFVBQ1AsVUFBVSxDQUFDcUIsTUFBTXBCLEtBQUtvQixFQUFFNEMsT0FBT0MsS0FBSztBQUFBLFVBQ3BDLGFBQVk7QUFBQSxVQUNaLGNBQVc7QUFBQSxVQUNYLFdBQVcsR0FBR3ZHLFFBQVE7QUFBQTtBQUFBLFFBTHhCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUtnQztBQUFBLE1BRWhDO0FBQUEsUUFBQztBQUFBO0FBQUEsVUFDQyxPQUFPdUM7QUFBQUEsVUFDUCxVQUFVLENBQUNtQixNQUFNbEIsVUFBVWtCLEVBQUU0QyxPQUFPQyxLQUFLO0FBQUEsVUFDekMsY0FBVztBQUFBLFVBQ1gsV0FBVyxHQUFHdkcsUUFBUTtBQUFBLFVBRXJCMEIsd0JBQWN3RDtBQUFBQSxZQUFJLENBQUNzQixNQUNsQix1QkFBQyxZQUFlLE9BQU9BLEdBQUk3RSxzQkFBWTZFLENBQUMsS0FBM0JBLEdBQWI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBMEM7QUFBQSxVQUMzQztBQUFBO0FBQUEsUUFSSDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFTQTtBQUFBLE1BQ0E7QUFBQSxRQUFDO0FBQUE7QUFBQSxVQUNDLE9BQU8vRDtBQUFBQSxVQUNQLFVBQVUsQ0FBQ2lCLE1BQU1oQixRQUFRZ0IsRUFBRTRDLE9BQU9DLEtBQWdCO0FBQUEsVUFDbEQsY0FBVztBQUFBLFVBQ1gsV0FBVyxHQUFHdkcsUUFBUTtBQUFBLFVBRXRCO0FBQUEsbUNBQUMsWUFBTyxPQUFNLFNBQVEsc0NBQXRCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTRDO0FBQUEsWUFDNUMsdUJBQUMsWUFBTyxPQUFNLFFBQU8sc0NBQXJCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTJDO0FBQUEsWUFDM0MsdUJBQUMsWUFBTyxPQUFNLFNBQVEsb0NBQXRCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTBDO0FBQUEsWUFDMUMsdUJBQUMsWUFBTyxPQUFNLFlBQVcsd0NBQXpCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQWlEO0FBQUE7QUFBQTtBQUFBLFFBVG5EO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQVVBO0FBQUEsTUFDQ3VFLGNBQ0MsdUJBQUMsVUFBSyxXQUFVLDBCQUF3Qix1RkFBeEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUVBO0FBQUEsU0FoQ0o7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQWtDQTtBQUFBLElBRUEsdUJBQUMsUUFBSyxXQUFVLG1CQUNkLGlDQUFDLFdBQU0sV0FBVSxrQkFDZjtBQUFBLDZCQUFDLFdBQU0sV0FBVSxzQ0FDZixpQ0FBQyxRQUNFQTtBQUFBQSxzQkFBYyx1QkFBQyxRQUFHLFdBQVUseUJBQWQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFvQztBQUFBLFFBQ25ELHVCQUFDLFFBQUcsV0FBVSxrQkFBaUIscUJBQS9CO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBb0M7QUFBQSxRQUNwQyx1QkFBQyxRQUFHLFdBQVUsa0JBQWlCLG1CQUEvQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWtDO0FBQUEsUUFDbEMsdUJBQUMsUUFBRyxXQUFVLGtCQUFpQixvQkFBL0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFtQztBQUFBLFFBQ25DLHVCQUFDLFFBQUcsV0FBVSxrQkFBaUIsb0JBQS9CO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBbUM7QUFBQSxRQUNuQyx1QkFBQyxRQUFHLFdBQVUsa0JBQWlCLHFCQUEvQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQW9DO0FBQUEsUUFDcEMsdUJBQUMsUUFBRyxXQUFVLGtCQUFpQixxQkFBL0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFvQztBQUFBLFFBQ3BDLHVCQUFDLFFBQUcsV0FBVSxrQkFBaUIsMkJBQS9CO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBMEM7QUFBQSxRQUMxQyx1QkFBQyxRQUFHLFdBQVUsb0JBQWQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUErQjtBQUFBLFdBVGpDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFVQSxLQVhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFZQTtBQUFBLE1BQ0NwQyxVQUNDLHVCQUFDLGlCQUFjLE1BQU0sR0FBRyxNQUFNLEtBQTlCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBZ0MsSUFDOUI4QixPQUFPd0IsV0FBVyxJQUNwQix1QkFBQyxXQUNDLGlDQUFDLFFBQ0MsaUNBQUMsUUFBRyxTQUFTLEdBQ1g7QUFBQSxRQUFDO0FBQUE7QUFBQSxVQUNDLE1BQUs7QUFBQSxVQUNMLE9BQU9wRCxJQUFJLGtDQUFrQztBQUFBLFVBQzdDLE1BQU1BLElBQUksMENBQTBDO0FBQUEsVUFDcEQsUUFBUSxDQUFDQSxLQUFLLHVCQUFDLFVBQU8sU0FBUyxNQUFNTyxRQUFRLEVBQUUsR0FBR3RDLFVBQVUsQ0FBQyxHQUFHLGtDQUFsRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFvRTtBQUFBO0FBQUEsUUFKcEY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BSThGLEtBTGhHO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFPQSxLQVJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFTQSxLQVZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFXQSxJQUVBLHVCQUFDLFdBQ0UyRCxpQkFBT2lCLElBQUksQ0FBQ1QsTUFBTTtBQUNqQixjQUFNM0MsYUFBYXNFLFlBQVkzQixDQUFDO0FBQ2hDLGVBQ0U7QUFBQSxVQUFDO0FBQUE7QUFBQSxZQUVDLFdBQVU7QUFBQSxZQUNWLFdBQVdGO0FBQUFBLFlBQ1gsYUFBYSxNQUFNcUIsZUFBZW5CLEVBQUVILEVBQUU7QUFBQSxZQUN0QyxZQUFZLENBQUNaLE1BQU1hLGNBQWNiLEVBQUUrQyxlQUFlO0FBQUEsWUFDbEQsUUFBUSxNQUFNbEMsY0FBY3VCLFVBQVVyQixFQUFFSCxFQUFFO0FBQUEsWUFFekNDO0FBQUFBLDRCQUNDLHVCQUFDLFFBQUcsV0FBVSx5REFBd0QsT0FBTSwwQkFBd0IsaUJBQXBHO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBRUE7QUFBQSxjQUVGLHVCQUFDLFFBQUcsV0FBVSxPQUNaLGlDQUFDLFNBQU0sS0FBS0UsRUFBRXpELFdBQVcsS0FBS3lELEVBQUVsRSxNQUFNLFdBQVUsMEJBQWhEO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXNFLEtBRHhFO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBRUE7QUFBQSxjQUNBLHVCQUFDLFFBQUcsV0FBVSxPQUNaO0FBQUEsdUNBQUMsU0FBSSxXQUFVLDRCQUE0QmtFLFlBQUVsRSxRQUE3QztBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUFrRDtBQUFBLGdCQUNqRGtFLEVBQUVqRSxlQUNELHVCQUFDLFNBQUksV0FBVSxpREFBaURpRSxZQUFFakUsZUFBbEU7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFBOEU7QUFBQSxtQkFIbEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFLQTtBQUFBLGNBQ0EsdUJBQUMsUUFBRyxXQUFVLHNCQUFzQmlFLFlBQUVoRSxZQUFZLE9BQWxEO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXNEO0FBQUEsY0FDdEQsdUJBQUMsUUFBRyxXQUFVLGdDQUNYcUIsdUJBQ0MsdUJBQUMsVUFBSyxXQUFVLCtCQUErQnZDLHNCQUFZa0YsRUFBRS9ELEtBQUssS0FBbEU7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBb0UsSUFFcEUsdUJBQUMsVUFBSyxXQUFVLDRCQUE0Qm5CLHNCQUFZa0YsRUFBRS9ELEtBQUssS0FBL0Q7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBaUUsS0FKckU7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFNQTtBQUFBLGNBQ0EsdUJBQUMsUUFBRyxXQUFVLHlCQUNYb0Isd0JBQWMyQyxFQUFFOUQsYUFDZix1QkFBQyxTQUFJLFdBQVUsYUFDYjtBQUFBLHVDQUFDLFNBQU0sTUFBSyxRQUFPO0FBQUE7QUFBQSxrQkFBRW5CLFdBQVdpRixFQUFFaUMsZ0JBQWdCO0FBQUEscUJBQWxEO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQW9EO0FBQUEsZ0JBQ3BELHVCQUFDLFNBQUksV0FBVSxtQ0FBbUNuSCxzQkFBWWtGLEVBQUU5RCxVQUFVLEtBQTFFO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQTRFO0FBQUEsbUJBRjlFO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBR0EsSUFDRThELEVBQUU5RCxhQUNKLHVCQUFDLFNBQU0sTUFBSyxXQUFVLDZCQUF0QjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFtQyxJQUVuQyx1QkFBQyxVQUFLLFdBQVUsa0JBQWlCLGlCQUFqQztBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFrQyxLQVR0QztBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQVdBO0FBQUEsY0FDQSx1QkFBQyxRQUFHLFdBQVUsT0FDWjtBQUFBLGdCQUFDO0FBQUE7QUFBQSxrQkFDQyxTQUFTLE1BQU02RCxPQUFPQyxDQUFDO0FBQUEsa0JBQ3ZCLGdCQUFjLENBQUMsQ0FBQ0EsRUFBRTFEO0FBQUFBLGtCQUNsQixXQUFXLDJJQUNUMEQsRUFBRTFELFNBQ0UseURBQ0EsZ0RBQWdEO0FBQUEsa0JBR3JEMEQsWUFBRTFELFNBQVMsV0FBVztBQUFBO0FBQUEsZ0JBVHpCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxjQVVBLEtBWEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFZQTtBQUFBLGNBQ0EsdUJBQUMsUUFBRyxXQUFVLHVEQUF1RHpCLHFCQUFXbUYsRUFBRWtDLFVBQVUsS0FBNUY7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBOEY7QUFBQSxjQUM5Rix1QkFBQyxRQUFHLFdBQVUseUJBQ1osaUNBQUMsU0FBSSxXQUFVLDZCQUNacEM7QUFBQUEsOEJBQ0MsbUNBQ0U7QUFBQTtBQUFBLG9CQUFDO0FBQUE7QUFBQSxzQkFDQyxTQUFTLE1BQU1ZLEtBQUtWLEdBQUcsRUFBRTtBQUFBLHNCQUN6QixjQUFZLFVBQVVBLEVBQUVsRSxJQUFJO0FBQUEsc0JBQzVCLFdBQVU7QUFBQSxzQkFBMEo7QUFBQTtBQUFBLG9CQUh0SztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsa0JBTUE7QUFBQSxrQkFDQTtBQUFBLG9CQUFDO0FBQUE7QUFBQSxzQkFDQyxTQUFTLE1BQU00RSxLQUFLVixHQUFHLENBQUM7QUFBQSxzQkFDeEIsY0FBWSxVQUFVQSxFQUFFbEUsSUFBSTtBQUFBLHNCQUM1QixXQUFVO0FBQUEsc0JBQTBKO0FBQUE7QUFBQSxvQkFIdEs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGtCQU1BO0FBQUEscUJBZEY7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFlQTtBQUFBLGdCQUVGLHVCQUFDLFVBQU8sTUFBSyxNQUFLLFNBQVEsV0FBVSxTQUFTLE1BQU1xRyxPQUFPbkMsQ0FBQyxHQUFHLHNCQUE5RDtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUFvRTtBQUFBLGdCQUNwRSx1QkFBQyxVQUFPLE1BQUssTUFBSyxTQUFRLFVBQVMsU0FBUyxNQUFNM0IsaUJBQWlCMkIsQ0FBQyxHQUFHLG1CQUF2RTtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUEwRTtBQUFBLG1CQXBCNUU7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFxQkEsS0F0QkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkF1QkE7QUFBQTtBQUFBO0FBQUEsVUE5RUtBLEVBQUVIO0FBQUFBLFVBRFQ7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQWdGQTtBQUFBLE1BRUosQ0FBQyxLQXRGSDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBdUZBO0FBQUEsU0FySEo7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQXVIQSxLQXhIRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBeUhBO0FBQUEsSUFFQzNCLFFBQ0M7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDO0FBQUEsUUFDQSxTQUFTLE1BQU1DLFFBQVEsSUFBSTtBQUFBLFFBQzNCLFNBQVMsQ0FBQ2lFLFlBQVk7QUFDcEJqRSxrQkFBUSxJQUFJO0FBQ1pLLGVBQUs7QUFDTHhELG9CQUFVb0gsVUFBVSxnREFBZ0QsK0NBQStDO0FBQUEsUUFDckg7QUFBQTtBQUFBLE1BUEY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBT0k7QUFBQSxJQUlOO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDQyxNQUFNLENBQUMsQ0FBQ2hFO0FBQUFBLFFBQ1IsT0FBTTtBQUFBLFFBQ04sU0FBUyxlQUFlQSxlQUFldEMsSUFBSTtBQUFBLFFBQzNDLGNBQWE7QUFBQSxRQUNiO0FBQUEsUUFDQSxNQUFNd0M7QUFBQUEsUUFDTixXQUFXLE1BQU1GLGlCQUFpQmlDLFNBQVNqQyxhQUFhO0FBQUEsUUFDeEQsU0FBUyxNQUFNQyxpQkFBaUIsSUFBSTtBQUFBO0FBQUEsTUFSdEM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBUXdDO0FBQUEsT0E5TDFDO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FnTUE7QUFFSjtBQUFDZCxHQTdTdUJELFVBQVE7QUFBQSxVQTRCOUIxQyxZQUFZO0FBQUE7QUFBQSxLQTVCVTBDO0FBK1N4QixTQUFTNkUsT0FBT25DLEdBQXVCO0FBQ3JDLFNBQU87QUFBQSxJQUNMSCxJQUFJRyxFQUFFSDtBQUFBQSxJQUNOL0QsTUFBTWtFLEVBQUVsRTtBQUFBQSxJQUNSQyxhQUFhaUUsRUFBRWpFO0FBQUFBLElBQ2ZDLFVBQVVnRSxFQUFFaEU7QUFBQUEsSUFDWkMsT0FBT29HLE9BQU9yQyxFQUFFL0QsU0FBUyxFQUFFO0FBQUEsSUFDM0JDLFlBQVk4RCxFQUFFOUQsYUFBYW1HLE9BQU9yQyxFQUFFOUQsVUFBVSxJQUFJO0FBQUEsSUFDbERDLGdCQUFnQlcsU0FBU2tELEVBQUU3RCxjQUFjO0FBQUEsSUFDekNDLGNBQWNVLFNBQVNrRCxFQUFFNUQsWUFBWTtBQUFBLElBQ3JDQyxZQUFZZ0csT0FBT3JDLEVBQUUzRCxVQUFVO0FBQUEsSUFDL0JDLFFBQVEsQ0FBQyxDQUFDMEQsRUFBRTFEO0FBQUFBLElBQ1pDLFdBQVd5RCxFQUFFekQ7QUFBQUEsRUFDZjtBQUNGO0FBR0EsU0FBUytGLGFBQWE7QUFBQSxFQUNwQnBFO0FBQUFBLEVBQ0FxRTtBQUFBQSxFQUNBQztBQUtGLEdBQUc7QUFBQUMsTUFBQTtBQUNELFFBQU1DLFVBQVUsQ0FBQyxDQUFDeEUsS0FBSzJCO0FBQ3ZCLFFBQU0sQ0FBQzhDLEdBQUdDLElBQUksSUFBSXBJLFNBQW9CMEQsSUFBSTtBQUMxQyxRQUFNLENBQUMyRSxNQUFNQyxPQUFPLElBQUl0SSxTQUFTLEtBQUs7QUFDdEMsUUFBTSxDQUFDdUksT0FBT0MsUUFBUSxJQUFJeEksU0FBUyxFQUFFO0FBQ3JDLFFBQU0sQ0FBQ3lJLFNBQVNDLFVBQVUsSUFBSTFJLFNBQWlCbUksRUFBRXBHLFNBQVM7QUFDMUQsUUFBTSxDQUFDNEcsY0FBY0MsZUFBZSxJQUFJNUksU0FBc0IsSUFBSTtBQUNsRSxRQUFNLENBQUM2SSxPQUFPQyxRQUFRLElBQUk5SSxTQUF3QixJQUFJO0FBQ3RELFFBQU0sQ0FBQytJLFVBQVVDLFdBQVcsSUFBSWhKLFNBQVMsS0FBSztBQUM5QyxRQUFNaUosVUFBVWxKLE9BQXlCLElBQUk7QUFFN0MsUUFBTW1KLGFBQWFuSixPQUFPMkQsSUFBSTtBQUM5QixRQUFNeUYsUUFBUXJKLFFBQVEsTUFBTTtBQUMxQixVQUFNb0YsSUFBSWdFLFdBQVd0QztBQUNyQixVQUFNd0MsT0FBT0MsT0FBT0QsS0FBS2xFLENBQUM7QUFDMUIsV0FBT2tFLEtBQUtFLEtBQUssQ0FBQzdDLE1BQU12QixFQUFFdUIsQ0FBQyxNQUFNMEIsRUFBRTFCLENBQUMsQ0FBQztBQUFBLEVBQ3ZDLEdBQUcsQ0FBQzBCLENBQUMsQ0FBQztBQUNOLFFBQU1vQixRQUFRbkksZ0JBQWdCK0gsS0FBSztBQUVuQyxRQUFNSyxRQUFRQSxNQUFNO0FBQ2xCRCxVQUFNRSxhQUFhLE1BQU0xQixRQUFRLENBQUM7QUFBQSxFQUNwQztBQUVBLFFBQU0yQixNQUFNQSxDQUFDQyxVQUE4QnZCLEtBQUssQ0FBQzVDLE9BQU8sRUFBRSxHQUFHQSxHQUFHLEdBQUdtRSxNQUFNLEVBQUU7QUFFM0UsUUFBTWxJLFFBQVFtSSxTQUFTekIsRUFBRTFHLFNBQVMsS0FBSyxFQUFFLEtBQUs7QUFDOUMsUUFBTW9JLE9BQU9ELFNBQVN6QixFQUFFekcsY0FBYyxLQUFLLEVBQUUsS0FBSztBQUNsRCxRQUFNb0ksVUFBVUQsT0FBTyxLQUFLQSxPQUFPcEksUUFBUVMsS0FBSzZILE9BQVF0SSxRQUFRb0ksUUFBUSxNQUFPcEksS0FBSyxJQUFJO0FBRXhGLFFBQU11SSxXQUFXQSxDQUFDQyxTQUF1QjtBQUN2QyxRQUFJLENBQUNBLEtBQU07QUFDWCxRQUFJLENBQUMsMEJBQTBCQyxLQUFLRCxLQUFLM0ksSUFBSSxLQUFLLENBQUMseUJBQXlCNEksS0FBS0QsS0FBS0UsSUFBSSxHQUFHO0FBQzNGM0osZ0JBQVUsZ0RBQWdELEtBQUs7QUFDL0Q7QUFBQSxJQUNGO0FBQ0EsUUFBSXlKLEtBQUtHLE9BQU8sTUFBTSxPQUFPLE1BQU07QUFDakM1SixnQkFBVSx1Q0FBdUMsS0FBSztBQUN0RDtBQUFBLElBQ0Y7QUFDQWtJLGVBQVcyQixJQUFJQyxnQkFBZ0JMLElBQUksQ0FBQztBQUNwQ3JCLG9CQUFnQnFCLElBQUk7QUFDcEI3QixTQUFLLENBQUM1QyxPQUFPLEVBQUUsR0FBR0EsR0FBR3pELFdBQVcsR0FBRyxFQUFFO0FBQUEsRUFDdkM7QUFFQSxRQUFNd0ksT0FBTyxPQUFPOUYsTUFBaUI7QUFDbkNBLE1BQUUrQyxlQUFlO0FBQ2pCZ0IsYUFBUyxFQUFFO0FBQ1gsUUFBSSxDQUFDTCxFQUFFN0csS0FBS2tKLEtBQUssRUFBRyxRQUFPaEMsU0FBUyxzQkFBc0I7QUFDMUQsUUFBSSxDQUFDL0csTUFBTyxRQUFPK0csU0FBUyxzQkFBc0I7QUFDbEQsUUFBSXFCLFFBQVFwSSxTQUFTb0ksUUFBUXBJLE1BQU8sUUFBTytHLFNBQVMsOENBQThDO0FBQ2xHRixZQUFRLElBQUk7QUFDWixRQUFJO0FBQ0YsVUFBSW1DLFdBQVd0QyxFQUFFcEc7QUFDakIsVUFBSTRHLGNBQWM7QUFDaEIsY0FBTStCLFVBQVUsTUFBTXhLLFlBQVl5SSxZQUFZLEVBQUVuRSxNQUFNLE1BQU1tRSxZQUFZO0FBQ3hFLGNBQU0sSUFBSWdDLFFBQWMsQ0FBQ0MsU0FBU0MsV0FBVztBQUMzQzFLO0FBQUFBLFlBQ0V1SztBQUFBQSxZQUNBLENBQUNJLFFBQVFoQyxTQUFTZ0MsR0FBRztBQUFBLFlBQ3JCLENBQUNDLFFBQVE7QUFDUE4seUJBQVdNO0FBQ1hILHNCQUFRO0FBQUEsWUFDVjtBQUFBLFlBQ0EsQ0FBQ0ksUUFBUUgsT0FBTyxJQUFJSSxNQUFNRCxHQUFHLENBQUM7QUFBQSxVQUNoQztBQUFBLFFBQ0YsQ0FBQztBQUFBLE1BQ0g7QUFDQSxZQUFNdEYsT0FBTztBQUFBLFFBQ1hwRSxNQUFNNkcsRUFBRTdHLEtBQUtrSixLQUFLO0FBQUEsUUFDbEJqSixhQUFhNEcsRUFBRTVHLFlBQVlpSixLQUFLO0FBQUEsUUFDaENoSixVQUFVMkcsRUFBRTNHLFNBQVNnSixLQUFLO0FBQUEsUUFDMUIvSTtBQUFBQSxRQUNBQyxZQUFZbUksUUFBUTtBQUFBLFFBQ3BCbEksZ0JBQWdCSyxTQUFTbUcsRUFBRXhHLGNBQWM7QUFBQSxRQUN6Q0MsY0FBY0ksU0FBU21HLEVBQUV2RyxZQUFZO0FBQUEsUUFDckNDLFlBQVkrSCxTQUFTekIsRUFBRXRHLGNBQWMsS0FBSyxFQUFFLEtBQUs7QUFBQSxRQUNqREMsUUFBUXFHLEVBQUVyRztBQUFBQSxRQUNWQyxXQUFXMEk7QUFBQUEsTUFDYjtBQUNBLFVBQUl2QyxRQUFTLE9BQU1qSSxJQUFJLHVCQUF1QmtJLEVBQUU5QyxFQUFFLElBQUksRUFBRUksUUFBUSxPQUFPQyxNQUFNQyxLQUFLQyxVQUFVRixJQUFJLEVBQUUsQ0FBQztBQUFBO0FBQzlGLGNBQU16RixJQUFJLHVCQUF1QixFQUFFd0YsUUFBUSxRQUFRQyxNQUFNQyxLQUFLQyxVQUFVRixJQUFJLEVBQUUsQ0FBQztBQUNwRnNDLGNBQVEsQ0FBQ0UsT0FBTztBQUFBLElBQ2xCLFNBQVNnRCxLQUFVO0FBQ2pCMUMsZUFBUzBDLElBQUl4RyxXQUFXLGtCQUFrQjtBQUMxQ2xFLGdCQUFVMEssSUFBSXhHLFdBQVcsb0JBQW9CLEtBQUs7QUFBQSxJQUNwRCxVQUFDO0FBQ0M0RCxjQUFRLEtBQUs7QUFDYlEsZUFBUyxJQUFJO0FBQUEsSUFDZjtBQUFBLEVBQ0Y7QUFFQSxTQUNFLHVCQUFDLFNBQU0sTUFBSSxNQUFDLFNBQVNVLE9BQU8sT0FBT3RCLFVBQVUsaUJBQWlCLHFCQUFxQixPQUFNLGFBQ3ZGO0FBQUEsMkJBQUMsVUFBSyxVQUFVcUMsTUFBTSxXQUFVLHFDQUM5QjtBQUFBLDZCQUFDLFNBQUksV0FBVSxpQkFDYixpQ0FBQyxTQUFNLE9BQU0sYUFBWSxVQUFRLE1BQUMsT0FBT3BDLEVBQUU3RyxTQUFTLEtBQUssa0JBQWtCNkosUUFDekU7QUFBQSxRQUFDO0FBQUE7QUFBQSxVQUNDLE9BQU9oRCxFQUFFN0c7QUFBQUEsVUFDVCxVQUFVLENBQUNtRCxNQUFNaUYsSUFBSSxFQUFFcEksTUFBTW1ELEVBQUU0QyxPQUFPQyxNQUFNLENBQUM7QUFBQSxVQUM3QyxXQUFXdkc7QUFBQUEsVUFDWCxhQUFZO0FBQUE7QUFBQSxRQUpkO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUkyQyxLQUw3QztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBT0EsS0FSRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBU0E7QUFBQSxNQUNBLHVCQUFDLFNBQUksV0FBVSxpQkFDYixpQ0FBQyxTQUFNLE9BQU0sZUFBYyxNQUFLLHlEQUM5QjtBQUFBLFFBQUM7QUFBQTtBQUFBLFVBQ0MsT0FBT29ILEVBQUU1RztBQUFBQSxVQUNULFVBQVUsQ0FBQ2tELE1BQU1pRixJQUFJLEVBQUVuSSxhQUFha0QsRUFBRTRDLE9BQU9DLE1BQU0sQ0FBQztBQUFBLFVBQ3BELFdBQVd2RztBQUFBQSxVQUNYLGFBQVk7QUFBQTtBQUFBLFFBSmQ7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BSXdELEtBTDFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFPQSxLQVJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFTQTtBQUFBLE1BQ0EsdUJBQUMsU0FBTSxPQUFNLGFBQ1g7QUFBQSxRQUFDO0FBQUE7QUFBQSxVQUNDLE9BQU9vSCxFQUFFM0c7QUFBQUEsVUFDVCxVQUFVLENBQUNpRCxNQUFNaUYsSUFBSSxFQUFFbEksVUFBVWlELEVBQUU0QyxPQUFPQyxNQUFNLENBQUM7QUFBQSxVQUNqRCxXQUFXdkc7QUFBQUEsVUFDWCxhQUFZO0FBQUEsVUFDWixNQUFLO0FBQUE7QUFBQSxRQUxQO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUt3QixLQU4xQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBUUE7QUFBQSxNQUNBLHVCQUFDLFNBQU0sT0FBTSxlQUFjLE1BQUssc0NBQzlCO0FBQUEsUUFBQztBQUFBO0FBQUEsVUFDQyxNQUFLO0FBQUEsVUFDTCxPQUFPb0gsRUFBRXRHO0FBQUFBLFVBQ1QsVUFBVSxDQUFDNEMsTUFBTWlGLElBQUksRUFBRTdILFlBQVk0QyxFQUFFNEMsT0FBT0MsTUFBTSxDQUFDO0FBQUEsVUFDbkQsV0FBVyxHQUFHdkcsUUFBUTtBQUFBO0FBQUEsUUFKeEI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BSXlDLEtBTDNDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFPQTtBQUFBLE1BQ0EsdUJBQUMsU0FBTSxPQUFNLHFCQUFvQixVQUFRLE1BQ3ZDO0FBQUEsUUFBQztBQUFBO0FBQUEsVUFDQyxNQUFLO0FBQUEsVUFDTCxLQUFLO0FBQUEsVUFDTCxPQUFPb0gsRUFBRTFHO0FBQUFBLFVBQ1QsVUFBVSxDQUFDZ0QsTUFBTWlGLElBQUksRUFBRWpJLE9BQU9nRCxFQUFFNEMsT0FBT0MsTUFBTSxDQUFDO0FBQUEsVUFDOUMsV0FBVyxHQUFHdkcsUUFBUTtBQUFBO0FBQUEsUUFMeEI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BS3lDLEtBTjNDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFRQTtBQUFBLE1BQ0E7QUFBQSxRQUFDO0FBQUE7QUFBQSxVQUNDLE9BQU07QUFBQSxVQUNOLE1BQU0rSSxVQUFVLElBQUksdUJBQXVCdkosV0FBV3VKLE9BQU8sQ0FBQyxLQUFLO0FBQUEsVUFFbkU7QUFBQSxZQUFDO0FBQUE7QUFBQSxjQUNDLE1BQUs7QUFBQSxjQUNMLEtBQUs7QUFBQSxjQUNMLE9BQU8zQixFQUFFekc7QUFBQUEsY0FDVCxVQUFVLENBQUMrQyxNQUFNaUYsSUFBSSxFQUFFaEksWUFBWStDLEVBQUU0QyxPQUFPQyxNQUFNLENBQUM7QUFBQSxjQUNuRCxXQUFXLEdBQUd2RyxRQUFRO0FBQUE7QUFBQSxZQUx4QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFLeUM7QUFBQTtBQUFBLFFBVDNDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQVdBO0FBQUEsTUFDQSx1QkFBQyxTQUFNLE9BQU0sd0JBQ1g7QUFBQSxRQUFDO0FBQUE7QUFBQSxVQUNDLE1BQUs7QUFBQSxVQUNMLE9BQU9vSCxFQUFFeEc7QUFBQUEsVUFDVCxVQUFVLENBQUM4QyxNQUFNaUYsSUFBSSxFQUFFL0gsZ0JBQWdCOEMsRUFBRTRDLE9BQU9DLE1BQU0sQ0FBQztBQUFBLFVBQ3ZELFdBQVcsR0FBR3ZHLFFBQVE7QUFBQTtBQUFBLFFBSnhCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUl5QyxLQUwzQztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBT0E7QUFBQSxNQUNBLHVCQUFDLFNBQU0sT0FBTSx5QkFDWDtBQUFBLFFBQUM7QUFBQTtBQUFBLFVBQ0MsTUFBSztBQUFBLFVBQ0wsT0FBT29ILEVBQUV2RztBQUFBQSxVQUNULFVBQVUsQ0FBQzZDLE1BQU1pRixJQUFJLEVBQUU5SCxjQUFjNkMsRUFBRTRDLE9BQU9DLE1BQU0sQ0FBQztBQUFBLFVBQ3JELFdBQVcsR0FBR3ZHLFFBQVE7QUFBQTtBQUFBLFFBSnhCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUl5QyxLQUwzQztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBT0E7QUFBQSxNQUVBLHVCQUFDLFNBQUksV0FBVSxpQkFDYjtBQUFBLCtCQUFDLFVBQUssV0FBVSxvQ0FBbUMsMkJBQW5EO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBOEQ7QUFBQSxRQUM5RDtBQUFBLFVBQUM7QUFBQTtBQUFBLFlBQ0MsWUFBWSxDQUFDMEQsTUFBTTtBQUNqQkEsZ0JBQUUrQyxlQUFlO0FBQ2pCd0IsMEJBQVksSUFBSTtBQUFBLFlBQ2xCO0FBQUEsWUFDQSxhQUFhLE1BQU1BLFlBQVksS0FBSztBQUFBLFlBQ3BDLFFBQVEsQ0FBQ3ZFLE1BQU07QUFDYkEsZ0JBQUUrQyxlQUFlO0FBQ2pCd0IsMEJBQVksS0FBSztBQUNqQmdCLHVCQUFTdkYsRUFBRTJHLGFBQWFDLFFBQVEsQ0FBQyxDQUFDO0FBQUEsWUFDcEM7QUFBQSxZQUNBLFNBQVMsTUFBTXBDLFFBQVFyQyxTQUFTMEUsTUFBTTtBQUFBLFlBQ3RDLE1BQUs7QUFBQSxZQUNMLFVBQVU7QUFBQSxZQUNWLFdBQVcsQ0FBQzdHLE1BQU1BLEVBQUU4RyxRQUFRLFdBQVd0QyxRQUFRckMsU0FBUzBFLE1BQU07QUFBQSxZQUM5RCxXQUFXLHlLQUNUdkMsV0FBVyxpQ0FBaUMseUNBQXlDO0FBQUEsWUFHdkY7QUFBQTtBQUFBLGdCQUFDO0FBQUE7QUFBQSxrQkFDQyxLQUFLRTtBQUFBQSxrQkFDTCxNQUFLO0FBQUEsa0JBQ0wsUUFBTztBQUFBLGtCQUNQO0FBQUEsa0JBQ0EsVUFBVSxDQUFDeEUsTUFBTXVGLFNBQVN2RixFQUFFNEMsT0FBT2dFLFFBQVEsQ0FBQyxDQUFDO0FBQUE7QUFBQSxnQkFML0M7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGNBS2lEO0FBQUEsY0FFaEQ1QyxVQUNDLHVCQUFDLFNBQUksV0FBVSxvQ0FDYjtBQUFBLHVDQUFDLFNBQUksS0FBS0EsU0FBUyxLQUFJLG1CQUFrQixXQUFVLHdDQUFuRDtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUF1RjtBQUFBLGdCQUN2Rix1QkFBQyxVQUFLLFdBQVUsMEJBQXlCLDZEQUF6QztBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUFzRjtBQUFBLG1CQUZ4RjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUdBLElBRUEsdUJBQUMsU0FBSSxXQUFVLHVCQUNiO0FBQUEsdUNBQUMsU0FBSSxXQUFVLFlBQVcsZUFBVyxNQUFDLGtCQUF0QztBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUF3QztBQUFBLGdCQUN4Qyx1QkFBQyxTQUFJLFdBQVUsZ0JBQWUscURBQTlCO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQW1FO0FBQUEsZ0JBQ25FLHVCQUFDLFNBQUksV0FBVSw4QkFBNkIscUVBQTVDO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQWlHO0FBQUEsbUJBSG5HO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBSUE7QUFBQTtBQUFBO0FBQUEsVUFwQ0o7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBc0NBO0FBQUEsUUFDQ0UsZ0JBQ0MsdUJBQUMsT0FBRSxXQUFVLDZDQUEyQyxrRUFBeEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUVBO0FBQUEsUUFFREUsVUFBVSxRQUFRQSxRQUFRLE9BQ3pCLHVCQUFDLFNBQUksV0FBVSxpREFDYixpQ0FBQyxTQUFJLFdBQVUsc0NBQXFDLE9BQU8sRUFBRTJDLE9BQU8sR0FBRzNDLEtBQUssSUFBSSxLQUFoRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWtGLEtBRHBGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBLFdBakRKO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFtREE7QUFBQSxNQUVBLHVCQUFDLFdBQU0sV0FBVSw4RkFDZjtBQUFBO0FBQUEsVUFBQztBQUFBO0FBQUEsWUFDQyxNQUFLO0FBQUEsWUFDTCxTQUFTVixFQUFFckc7QUFBQUEsWUFDWCxVQUFVLENBQUMyQyxNQUFNaUYsSUFBSSxFQUFFNUgsUUFBUTJDLEVBQUU0QyxPQUFPb0UsUUFBUSxDQUFDO0FBQUEsWUFDakQsV0FBVTtBQUFBO0FBQUEsVUFKWjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFJc0M7QUFBQSxRQUV0Qyx1QkFBQyxVQUFLLFdBQVUsb0NBQWtDLGlFQUFsRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBRUE7QUFBQSxXQVRGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFVQTtBQUFBLE1BRUNsRCxTQUNDLHVCQUFDLFNBQUksV0FBVSwwR0FBeUcsTUFBSyxTQUMxSEEsbUJBREg7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUVBO0FBQUEsTUFHRix1QkFBQyxTQUFJLFdBQVUsdUVBQ2I7QUFBQSwrQkFBQyxVQUFPLE1BQUssVUFBUyxTQUFRLFdBQVUsU0FBU2lCLE9BQU0sc0JBQXZEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBLFFBQ0EsdUJBQUMsVUFBTyxNQUFLLFVBQVMsU0FBU25CLE1BQzVCUSxvQkFBVSxRQUFRQSxRQUFRLE1BQU0sZ0JBQWdCdEksV0FBV3NJLEtBQUssQ0FBQyxNQUFNLGlCQUQxRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBRUE7QUFBQSxXQU5GO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFPQTtBQUFBLFNBMUpGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0EySkE7QUFBQSxJQUNDVSxNQUFNbUM7QUFBQUEsT0E3SlQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQThKQTtBQUVKO0FBQUN6RCxJQXBRUUgsY0FBWTtBQUFBLFVBeUJMMUcsZUFBZTtBQUFBO0FBQUEsTUF6QnRCMEc7QUFBWSxJQUFBNkQsSUFBQUM7QUFBQSxhQUFBRCxJQUFBO0FBQUEsYUFBQUMsS0FBQSIsIm5hbWVzIjpbInVzZUNhbGxiYWNrIiwidXNlRWZmZWN0IiwidXNlTWVtbyIsInVzZVJlZiIsInVzZVN0YXRlIiwiYXBpIiwicmVzaXplSW1hZ2UiLCJ1cGxvYWRJbWFnZSIsInVzZVdlYlNvY2tldCIsImZhRGF0ZVRpbWUiLCJmb3JtYXRQcmljZSIsInRvRmFEaWdpdHMiLCJwdXNoVG9hc3QiLCJCYWRnZSIsIkJ1dHRvbiIsIkNhcmQiLCJDb25maXJtRGlhbG9nIiwiRW1wdHlTdGF0ZSIsIkZpZWxkIiwiaW5wdXRDbHMiLCJNb2RhbCIsIlBhZ2VIZWFkZXIiLCJUYWJsZVNrZWxldG9uIiwiVGh1bWIiLCJ1c2VVbnNhdmVkR3VhcmQiLCJlbXB0eUZvcm0iLCJuYW1lIiwiZGVzY3JpcHRpb24iLCJjYXRlZ29yeSIsInByaWNlIiwic2FsZV9wcmljZSIsImRpc2NvdW50X3N0YXJ0IiwiZGlzY291bnRfZW5kIiwic29ydF9vcmRlciIsImFjdGl2ZSIsImltYWdlX3VybCIsImRhdGVUb1RzIiwidiIsIk1hdGgiLCJmbG9vciIsIkRhdGUiLCJnZXRUaW1lIiwidHNUb0RhdGUiLCJ0b0lTT1N0cmluZyIsInNsaWNlIiwiU1RBVFVTX0xBQkVMUyIsIlNUQVRVU19URVhUIiwiYWxsIiwiaW5hY3RpdmUiLCJkaXNjb3VudGVkIiwiUHJvZHVjdHMiLCJfcyIsIml0ZW1zIiwic2V0SXRlbXMiLCJsb2FkaW5nIiwic2V0TG9hZGluZyIsInEiLCJzZXRRIiwic3RhdHVzIiwic2V0U3RhdHVzIiwic29ydCIsInNldFNvcnQiLCJmb3JtIiwic2V0Rm9ybSIsImNvbmZpcm1EZWxldGUiLCJzZXRDb25maXJtRGVsZXRlIiwiZGVsQnVzeSIsInNldERlbEJ1c3kiLCJsb2FkIiwicXVlcnkiLCJzdCIsInBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInN0YXR1c19maWx0ZXIiLCJ0aGVuIiwiZCIsImNhdGNoIiwiZSIsIm1lc3NhZ2UiLCJmaW5hbGx5IiwidCIsIndpbmRvdyIsInNldFRpbWVvdXQiLCJjbGVhclRpbWVvdXQiLCJzb3J0ZWQiLCJhcnIiLCJhIiwiYiIsImxvY2FsZUNvbXBhcmUiLCJpZCIsImNhblJlb3JkZXIiLCJ0b2dnbGUiLCJwIiwibWV0aG9kIiwiYm9keSIsIkpTT04iLCJzdHJpbmdpZnkiLCJkb0RlbGV0ZSIsInBlcnNpc3RPcmRlciIsImxpc3QiLCJpZHMiLCJtYXAiLCJtb3ZlIiwiZGlyIiwiaSIsImZpbmRJbmRleCIsIngiLCJqIiwibGVuZ3RoIiwiayIsImRyYWdJZCIsIm9uRHJhZ1N0YXJ0Um93IiwiY3VycmVudCIsIm9uRHJvcFJvdyIsImZyb20iLCJmaSIsInRpIiwibW92ZWQiLCJzcGxpY2UiLCJkaXNjb3VudE5vdyIsIm5vdyIsInRhcmdldCIsInZhbHVlIiwicyIsInByZXZlbnREZWZhdWx0IiwiZGlzY291bnRfcGVyY2VudCIsInVwZGF0ZWRfYXQiLCJ0b0Zvcm0iLCJjcmVhdGVkIiwiU3RyaW5nIiwiUHJvZHVjdE1vZGFsIiwib25DbG9zZSIsIm9uU2F2ZWQiLCJfczIiLCJlZGl0aW5nIiwiZiIsInNldEYiLCJidXN5Iiwic2V0QnVzeSIsImVycm9yIiwic2V0RXJyb3IiLCJwcmV2aWV3Iiwic2V0UHJldmlldyIsInBlbmRpbmdJbWFnZSIsInNldFBlbmRpbmdJbWFnZSIsInVwUGN0Iiwic2V0VXBQY3QiLCJkcmFnZ2luZyIsInNldERyYWdnaW5nIiwiZmlsZVJlZiIsImluaXRpYWxSZWYiLCJkaXJ0eSIsImtleXMiLCJPYmplY3QiLCJzb21lIiwiZ3VhcmQiLCJjbG9zZSIsImNvbmZpcm1MZWF2ZSIsInNldCIsInBhdGNoIiwicGFyc2VJbnQiLCJzYWxlIiwicGVyY2VudCIsInJvdW5kIiwicGlja0ZpbGUiLCJmaWxlIiwidGVzdCIsInR5cGUiLCJzaXplIiwiVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwic2F2ZSIsInRyaW0iLCJpbWFnZVVybCIsInJlc2l6ZWQiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInBjdCIsInVybCIsIm1zZyIsIkVycm9yIiwiZXJyIiwidW5kZWZpbmVkIiwiZGF0YVRyYW5zZmVyIiwiZmlsZXMiLCJjbGljayIsImtleSIsIndpZHRoIiwiY2hlY2tlZCIsIm1vZGFsIiwiX2MiLCJfYzIiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiUHJvZHVjdHMudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEZvcm1FdmVudCwgdXNlQ2FsbGJhY2ssIHVzZUVmZmVjdCwgdXNlTWVtbywgdXNlUmVmLCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgYXBpLCBBcGlFcnJvciwgcmVzaXplSW1hZ2UsIHVwbG9hZEltYWdlIH0gZnJvbSBcIkAvbGliL2FwaVwiO1xuaW1wb3J0IHsgdXNlV2ViU29ja2V0IH0gZnJvbSBcIkAvbGliL3VzZVdzXCI7XG5pbXBvcnQgeyBQcm9kdWN0IH0gZnJvbSBcIkAvbGliL3R5cGVzXCI7XG5pbXBvcnQgeyBmYURhdGVUaW1lLCBmb3JtYXRQcmljZSwgdG9GYURpZ2l0cyB9IGZyb20gXCJAL2xpYi9mb3JtYXRcIjtcbmltcG9ydCB7IHB1c2hUb2FzdCB9IGZyb20gXCJAL2NvbXBvbmVudHMvVG9hc3RcIjtcbmltcG9ydCB7XG4gIEJhZGdlLCBCdXR0b24sIENhcmQsIENvbmZpcm1EaWFsb2csIEVtcHR5U3RhdGUsIEZpZWxkLCBpbnB1dENscyxcbiAgTW9kYWwsIFBhZ2VIZWFkZXIsIFRhYmxlU2tlbGV0b24sIFRodW1iLCB1c2VVbnNhdmVkR3VhcmQsXG59IGZyb20gXCJAL2NvbXBvbmVudHMvdWlcIjtcblxudHlwZSBGb3JtU3RhdGUgPSB7XG4gIGlkPzogbnVtYmVyO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIGNhdGVnb3J5OiBzdHJpbmc7XG4gIHByaWNlOiBzdHJpbmc7XG4gIHNhbGVfcHJpY2U6IHN0cmluZztcbiAgZGlzY291bnRfc3RhcnQ6IHN0cmluZztcbiAgZGlzY291bnRfZW5kOiBzdHJpbmc7XG4gIHNvcnRfb3JkZXI6IHN0cmluZztcbiAgYWN0aXZlOiBib29sZWFuO1xuICBpbWFnZV91cmw6IHN0cmluZztcbn07XG5cbmNvbnN0IGVtcHR5Rm9ybTogRm9ybVN0YXRlID0ge1xuICBuYW1lOiBcIlwiLCBkZXNjcmlwdGlvbjogXCJcIiwgY2F0ZWdvcnk6IFwiXCIsIHByaWNlOiBcIlwiLCBzYWxlX3ByaWNlOiBcIlwiLFxuICBkaXNjb3VudF9zdGFydDogXCJcIiwgZGlzY291bnRfZW5kOiBcIlwiLCBzb3J0X29yZGVyOiBcIjBcIixcbiAgYWN0aXZlOiB0cnVlLCBpbWFnZV91cmw6IFwiXCIsXG59O1xuXG50eXBlIFNvcnRLZXkgPSBcIm9yZGVyXCIgfCBcIm5hbWVcIiB8IFwicHJpY2VcIiB8IFwiZGlzY291bnRcIjtcblxuZnVuY3Rpb24gZGF0ZVRvVHModjogc3RyaW5nKTogbnVtYmVyIHwgbnVsbCB7XG4gIHJldHVybiB2ID8gTWF0aC5mbG9vcihuZXcgRGF0ZSh2ICsgXCJUMDA6MDA6MDBcIikuZ2V0VGltZSgpIC8gMTAwMCkgOiBudWxsO1xufVxuZnVuY3Rpb24gdHNUb0RhdGUodjogbnVtYmVyIHwgbnVsbCk6IHN0cmluZyB7XG4gIGlmICghdikgcmV0dXJuIFwiXCI7XG4gIHJldHVybiBuZXcgRGF0ZSh2ICogMTAwMCkudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XG59XG5cbmNvbnN0IFNUQVRVU19MQUJFTFMgPSBbXCJhbGxcIiwgXCJhY3RpdmVcIiwgXCJpbmFjdGl2ZVwiLCBcImRpc2NvdW50ZWRcIl0gYXMgY29uc3Q7XG5jb25zdCBTVEFUVVNfVEVYVDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgYWxsOiBcItmH2YXZh1wiLCBhY3RpdmU6IFwi2YHYudin2YRcIiwgaW5hY3RpdmU6IFwi2LrbjNix2YHYudin2YRcIiwgZGlzY291bnRlZDogXCLYqtiu2YHbjNmB4oCM2K/Yp9ixXCIsXG59O1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBQcm9kdWN0cygpIHtcbiAgY29uc3QgW2l0ZW1zLCBzZXRJdGVtc10gPSB1c2VTdGF0ZTxQcm9kdWN0W10+KFtdKTtcbiAgY29uc3QgW2xvYWRpbmcsIHNldExvYWRpbmddID0gdXNlU3RhdGUodHJ1ZSk7XG4gIGNvbnN0IFtxLCBzZXRRXSA9IHVzZVN0YXRlKFwiXCIpO1xuICBjb25zdCBbc3RhdHVzLCBzZXRTdGF0dXNdID0gdXNlU3RhdGU8c3RyaW5nPihcImFsbFwiKTtcbiAgY29uc3QgW3NvcnQsIHNldFNvcnRdID0gdXNlU3RhdGU8U29ydEtleT4oXCJvcmRlclwiKTtcbiAgY29uc3QgW2Zvcm0sIHNldEZvcm1dID0gdXNlU3RhdGU8Rm9ybVN0YXRlIHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IFtjb25maXJtRGVsZXRlLCBzZXRDb25maXJtRGVsZXRlXSA9IHVzZVN0YXRlPFByb2R1Y3QgfCBudWxsPihudWxsKTtcbiAgY29uc3QgW2RlbEJ1c3ksIHNldERlbEJ1c3ldID0gdXNlU3RhdGUoZmFsc2UpO1xuXG4gIGNvbnN0IGxvYWQgPSB1c2VDYWxsYmFjayhcbiAgICAocXVlcnkgPSBxLCBzdCA9IHN0YXR1cykgPT4ge1xuICAgICAgc2V0TG9hZGluZyh0cnVlKTtcbiAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoeyBxOiBxdWVyeSwgc3RhdHVzX2ZpbHRlcjogc3QgfSk7XG4gICAgICBhcGk8eyBpdGVtczogUHJvZHVjdFtdIH0+KGAvYXBpL2FkbWluL3Byb2R1Y3RzPyR7cGFyYW1zfWApXG4gICAgICAgIC50aGVuKChkKSA9PiBzZXRJdGVtcyhkLml0ZW1zKSlcbiAgICAgICAgLmNhdGNoKChlOiBBcGlFcnJvcikgPT4gcHVzaFRvYXN0KGUubWVzc2FnZSwgXCJlcnJcIikpXG4gICAgICAgIC5maW5hbGx5KCgpID0+IHNldExvYWRpbmcoZmFsc2UpKTtcbiAgICB9LFxuICAgIFtxLCBzdGF0dXNdXG4gICk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCB0ID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4gbG9hZCgpLCBxID8gMzAwIDogMCk7XG4gICAgcmV0dXJuICgpID0+IGNsZWFyVGltZW91dCh0KTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVhY3QtaG9va3MvZXhoYXVzdGl2ZS1kZXBzXG4gIH0sIFtxLCBzdGF0dXNdKTtcblxuICB1c2VXZWJTb2NrZXQoXCIvd3MvYWRtaW5cIiwgKCkgPT4gbG9hZCgpKTtcblxuICBjb25zdCBzb3J0ZWQgPSB1c2VNZW1vKCgpID0+IHtcbiAgICBjb25zdCBhcnIgPSBbLi4uaXRlbXNdO1xuICAgIGlmIChzb3J0ID09PSBcIm5hbWVcIikgYXJyLnNvcnQoKGEsIGIpID0+IGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSwgXCJmYVwiKSk7XG4gICAgaWYgKHNvcnQgPT09IFwicHJpY2VcIikgYXJyLnNvcnQoKGEsIGIpID0+IGIucHJpY2UgLSBhLnByaWNlKTtcbiAgICBpZiAoc29ydCA9PT0gXCJkaXNjb3VudFwiKVxuICAgICAgYXJyLnNvcnQoKGEsIGIpID0+IChiLnNhbGVfcHJpY2UgPz8gMCkgLyBiLnByaWNlIC0gKGEuc2FsZV9wcmljZSA/PyAwKSAvIGEucHJpY2UpO1xuICAgIGlmIChzb3J0ID09PSBcIm9yZGVyXCIpIGFyci5zb3J0KChhLCBiKSA9PiBhLnNvcnRfb3JkZXIgLSBiLnNvcnRfb3JkZXIgfHwgYS5pZCAtIGIuaWQpO1xuICAgIHJldHVybiBhcnI7XG4gIH0sIFtpdGVtcywgc29ydF0pO1xuXG4gIGNvbnN0IGNhblJlb3JkZXIgPSBzb3J0ID09PSBcIm9yZGVyXCI7XG5cbiAgY29uc3QgdG9nZ2xlID0gKHA6IFByb2R1Y3QpID0+IHtcbiAgICBhcGkoYC9hcGkvYWRtaW4vcHJvZHVjdHMvJHtwLmlkfS9hY3RpdmVgLCB7XG4gICAgICBtZXRob2Q6IFwiUEFUQ0hcIixcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgYWN0aXZlOiAhcC5hY3RpdmUgfSksXG4gICAgfSlcbiAgICAgIC50aGVuKCgpID0+IGxvYWQoKSlcbiAgICAgIC5jYXRjaCgoZTogQXBpRXJyb3IpID0+IHB1c2hUb2FzdChlLm1lc3NhZ2UsIFwiZXJyXCIpKTtcbiAgfTtcblxuICBjb25zdCBkb0RlbGV0ZSA9IChwOiBQcm9kdWN0KSA9PiB7XG4gICAgc2V0RGVsQnVzeSh0cnVlKTtcbiAgICBhcGkoYC9hcGkvYWRtaW4vcHJvZHVjdHMvJHtwLmlkfWAsIHsgbWV0aG9kOiBcIkRFTEVURVwiIH0pXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIHB1c2hUb2FzdChg2YXYrdi12YjZhCDCqyR7cC5uYW1lfcK7INit2LDZgSDYtNivYCk7XG4gICAgICAgIHNldENvbmZpcm1EZWxldGUobnVsbCk7XG4gICAgICAgIGxvYWQoKTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGU6IEFwaUVycm9yKSA9PiBwdXNoVG9hc3QoZS5tZXNzYWdlLCBcImVyclwiKSlcbiAgICAgIC5maW5hbGx5KCgpID0+IHNldERlbEJ1c3koZmFsc2UpKTtcbiAgfTtcblxuICAvKiAtLS0tINiq2LHYqtuM2Kg6INis2KfYqNmH4oCM2KzYp9uM24wg2KjYpyDYr9qp2YXZhyDZiCDYr9ix2q/igIzZiNin2YbYr9ix2KfZviAtLS0tICovXG4gIGNvbnN0IHBlcnNpc3RPcmRlciA9IChsaXN0OiBQcm9kdWN0W10pID0+IHtcbiAgICBjb25zdCBpZHMgPSBsaXN0Lm1hcCgocCkgPT4gcC5pZCk7XG4gICAgYXBpKFwiL2FwaS9hZG1pbi9wcm9kdWN0cy9vcmRlclwiLCB7XG4gICAgICBtZXRob2Q6IFwiUFVUXCIsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGlkcyB9KSxcbiAgICB9KVxuICAgICAgLnRoZW4oKCkgPT4gbG9hZCgpKVxuICAgICAgLmNhdGNoKChlOiBBcGlFcnJvcikgPT4gcHVzaFRvYXN0KGUubWVzc2FnZSB8fCBcItir2KjYqiDYqtix2KrbjNioINmG2KfZhdmI2YHZgiDYqNmI2K9cIiwgXCJlcnJcIikpO1xuICB9O1xuXG4gIGNvbnN0IG1vdmUgPSAocDogUHJvZHVjdCwgZGlyOiAtMSB8IDEpID0+IHtcbiAgICBjb25zdCBsaXN0ID0gWy4uLnNvcnRlZF07XG4gICAgY29uc3QgaSA9IGxpc3QuZmluZEluZGV4KCh4KSA9PiB4LmlkID09PSBwLmlkKTtcbiAgICBjb25zdCBqID0gaSArIGRpcjtcbiAgICBpZiAoaiA8IDAgfHwgaiA+PSBsaXN0Lmxlbmd0aCkgcmV0dXJuO1xuICAgIFtsaXN0W2ldLCBsaXN0W2pdXSA9IFtsaXN0W2pdLCBsaXN0W2ldXTtcbiAgICAvLyBkZXRlcm1pbmlzdGljIGxvY2FsIHVwZGF0ZSB0aGVuIHBlcnNpc3RcbiAgICBzZXRJdGVtcyhsaXN0KTtcbiAgICBwZXJzaXN0T3JkZXIobGlzdC5tYXAoKHgsIGspID0+ICh7IC4uLngsIHNvcnRfb3JkZXI6IGsgfSkpKTtcbiAgfTtcblxuICBjb25zdCBkcmFnSWQgPSB1c2VSZWY8bnVtYmVyIHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IG9uRHJhZ1N0YXJ0Um93ID0gKGlkOiBudW1iZXIpID0+IChkcmFnSWQuY3VycmVudCA9IGlkKTtcbiAgY29uc3Qgb25Ecm9wUm93ID0gKGlkOiBudW1iZXIpID0+IHtcbiAgICBjb25zdCBmcm9tID0gZHJhZ0lkLmN1cnJlbnQ7XG4gICAgZHJhZ0lkLmN1cnJlbnQgPSBudWxsO1xuICAgIGlmIChmcm9tID09IG51bGwgfHwgZnJvbSA9PT0gaWQpIHJldHVybjtcbiAgICBjb25zdCBsaXN0ID0gWy4uLnNvcnRlZF07XG4gICAgY29uc3QgZmkgPSBsaXN0LmZpbmRJbmRleCgoeCkgPT4geC5pZCA9PT0gZnJvbSk7XG4gICAgY29uc3QgdGkgPSBsaXN0LmZpbmRJbmRleCgoeCkgPT4geC5pZCA9PT0gaWQpO1xuICAgIGlmIChmaSA8IDAgfHwgdGkgPCAwKSByZXR1cm47XG4gICAgY29uc3QgW21vdmVkXSA9IGxpc3Quc3BsaWNlKGZpLCAxKTtcbiAgICBsaXN0LnNwbGljZSh0aSwgMCwgbW92ZWQpO1xuICAgIHNldEl0ZW1zKGxpc3QpO1xuICAgIHBlcnNpc3RPcmRlcihsaXN0KTtcbiAgfTtcblxuICBjb25zdCBkaXNjb3VudE5vdyA9IChwOiBQcm9kdWN0KSA9PlxuICAgICEhcC5zYWxlX3ByaWNlICYmIHAuc2FsZV9wcmljZSA8IHAucHJpY2UgJiZcbiAgICAoIXAuZGlzY291bnRfc3RhcnQgfHwgRGF0ZS5ub3coKSAvIDEwMDAgPj0gcC5kaXNjb3VudF9zdGFydCkgJiZcbiAgICAoIXAuZGlzY291bnRfZW5kIHx8IERhdGUubm93KCkgLyAxMDAwIDw9IHAuZGlzY291bnRfZW5kKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgZGlyPVwicnRsXCIgY2xhc3NOYW1lPVwic3BhY2UteS00XCI+XG4gICAgICA8UGFnZUhlYWRlclxuICAgICAgICB0aXRsZT1cItmF2K3YtdmI2YTYp9iqXCJcbiAgICAgICAgYWN0aW9ucz17XG4gICAgICAgICAgPEJ1dHRvbiBvbkNsaWNrPXsoKSA9PiBzZXRGb3JtKHsgLi4uZW1wdHlGb3JtIH0pfT5cbiAgICAgICAgICAgICsg2KfZgdiy2YjYr9mGINmF2K3YtdmI2YRcbiAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgfVxuICAgICAgLz5cblxuICAgICAgey8qINis2LPYquKAjNmI2KzZiCAvINmB24zZhNiq2LEgLyDZhdix2KrYqOKAjNiz2KfYstuMICovfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtd3JhcCBnYXAtMyBpdGVtcy1jZW50ZXJcIj5cbiAgICAgICAgPGlucHV0XG4gICAgICAgICAgdmFsdWU9e3F9XG4gICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRRKGUudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICBwbGFjZWhvbGRlcj1cIvCflI0g2KzYs9iq4oCM2YjYrNmIINiv2LEg2YbYp9mFINuM2Kcg2K/Ys9iq2YfigIzYqNmG2K/bjOKAplwiXG4gICAgICAgICAgYXJpYS1sYWJlbD1cItis2LPYquKAjNmI2KzZiNuMINmF2K3YtdmI2YRcIlxuICAgICAgICAgIGNsYXNzTmFtZT17YCR7aW5wdXRDbHN9IHctNzJgfVxuICAgICAgICAvPlxuICAgICAgICA8c2VsZWN0XG4gICAgICAgICAgdmFsdWU9e3N0YXR1c31cbiAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldFN0YXR1cyhlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgYXJpYS1sYWJlbD1cItmB24zZhNiq2LEg2YjYtti524zYqlwiXG4gICAgICAgICAgY2xhc3NOYW1lPXtgJHtpbnB1dENsc30gdy00NGB9XG4gICAgICAgID5cbiAgICAgICAgICB7U1RBVFVTX0xBQkVMUy5tYXAoKHMpID0+IChcbiAgICAgICAgICAgIDxvcHRpb24ga2V5PXtzfSB2YWx1ZT17c30+e1NUQVRVU19URVhUW3NdfTwvb3B0aW9uPlxuICAgICAgICAgICkpfVxuICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgPHNlbGVjdFxuICAgICAgICAgIHZhbHVlPXtzb3J0fVxuICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0U29ydChlLnRhcmdldC52YWx1ZSBhcyBTb3J0S2V5KX1cbiAgICAgICAgICBhcmlhLWxhYmVsPVwi2YXYsdiq2KjigIzYs9in2LLbjFwiXG4gICAgICAgICAgY2xhc3NOYW1lPXtgJHtpbnB1dENsc30gdy01NmB9XG4gICAgICAgID5cbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwib3JkZXJcIj7Zhdix2KrYqOKAjNiz2KfYstuMOiDYqtix2KrbjNioINmG2YXYp9uM2LQ8L29wdGlvbj5cbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwibmFtZVwiPtmF2LHYqtio4oCM2LPYp9iy24w6INmG2KfZhSAo2KfZhNmB2KjYpyk8L29wdGlvbj5cbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwicHJpY2VcIj7Zhdix2KrYqOKAjNiz2KfYstuMOiDar9ix2KfZhuKAjNiq2LHbjNmGPC9vcHRpb24+XG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cImRpc2NvdW50XCI+2YXYsdiq2KjigIzYs9in2LLbjDog2KjbjNi02KrYsduM2YYg2KrYrtmB24zZgTwvb3B0aW9uPlxuICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAge2NhblJlb3JkZXIgJiYgKFxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS00MDBcIj5cbiAgICAgICAgICAgINio2LHYp9uMINiq2LrbjNuM2LEg2KrYsdiq24zYqCDZhtmF2KfbjNi02Iwg2LHYr9uM2YHigIzZh9inINix2Kcg2Kjaqdi024zYryDbjNinINin2LIg2K/aqdmF2YfigIzZh9in24wg4pay4pa8INin2LPYqtmB2KfYr9mHINqp2YbbjNivXG4gICAgICAgICAgPC9zcGFuPlxuICAgICAgICApfVxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxDYXJkIGNsYXNzTmFtZT1cIm92ZXJmbG93LWhpZGRlblwiPlxuICAgICAgICA8dGFibGUgY2xhc3NOYW1lPVwidy1mdWxsIHRleHQtc21cIj5cbiAgICAgICAgICA8dGhlYWQgY2xhc3NOYW1lPVwiYmctc2xhdGUtNTAgdGV4dC1zbGF0ZS01MDAgdGV4dC14c1wiPlxuICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICB7Y2FuUmVvcmRlciAmJiA8dGggY2xhc3NOYW1lPVwicC0zIHRleHQtcmlnaHQgdy0xMFwiPjwvdGg+fVxuICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwicC0zIHRleHQtcmlnaHRcIj7Yqti12YjbjNixPC90aD5cbiAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInAtMyB0ZXh0LXJpZ2h0XCI+2YbYp9mFPC90aD5cbiAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInAtMyB0ZXh0LXJpZ2h0XCI+2K/Ys9iq2Yc8L3RoPlxuICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwicC0zIHRleHQtcmlnaHRcIj7ZgtuM2YXYqjwvdGg+XG4gICAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJwLTMgdGV4dC1yaWdodFwiPtiq2K7ZgduM2YE8L3RoPlxuICAgICAgICAgICAgICA8dGggY2xhc3NOYW1lPVwicC0zIHRleHQtcmlnaHRcIj7ZiNi22LnbjNiqPC90aD5cbiAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInAtMyB0ZXh0LXJpZ2h0XCI+2KLYrtix24zZhiDYqti624zbjNixPC90aD5cbiAgICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInAtMyB0ZXh0LXJpZ2h0XCI+PC90aD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgPC90aGVhZD5cbiAgICAgICAgICB7bG9hZGluZyA/IChcbiAgICAgICAgICAgIDxUYWJsZVNrZWxldG9uIHJvd3M9ezZ9IGNvbHM9ezh9IC8+XG4gICAgICAgICAgKSA6IHNvcnRlZC5sZW5ndGggPT09IDAgPyAoXG4gICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICA8dGQgY29sU3Bhbj17OX0+XG4gICAgICAgICAgICAgICAgICA8RW1wdHlTdGF0ZVxuICAgICAgICAgICAgICAgICAgICBpY29uPVwi8J+TplwiXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlPXtxID8gXCLZhdit2LXZiNmE24wg2KjYpyDYp9uM2YYg2YXYtNiu2LXYp9iqINuM2KfZgdiqINmG2LTYr1wiIDogXCLZh9mG2YjYsiDZhdit2LXZiNmE24wg2KvYqNiqINmG2LTYr9mHXCJ9XG4gICAgICAgICAgICAgICAgICAgIGhpbnQ9e3EgPyBcIti52KjYp9ix2Kog2KzYs9iq4oCM2YjYrNmIINuM2Kcg2YHbjNmE2KrYsSDYsdinINiq2LrbjNuM2LEg2K/Zh9uM2K8uXCIgOiBcItin2YjZhNuM2YYg2YXYrdi12YjZhCDZgdix2YjYtNqv2KfZhyDYsdinINin2LbYp9mB2Ycg2qnZhtuM2K8g2KrYpyDYsdmI24wg2KrZhNmI24zYstuM2YjZhiDZhtmF2KfbjNi0INiv2KfYr9mHINi02YjYry5cIn1cbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uPXshcSAmJiA8QnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldEZvcm0oeyAuLi5lbXB0eUZvcm0gfSl9Ptin2YHYstmI2K/ZhiDYp9mI2YTbjNmGINmF2K3YtdmI2YQ8L0J1dHRvbj59XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICA8L3Rib2R5PlxuICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICAgIHtzb3J0ZWQubWFwKChwKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlzY291bnRlZCA9IGRpc2NvdW50Tm93KHApO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8dHJcbiAgICAgICAgICAgICAgICAgICAga2V5PXtwLmlkfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJib3JkZXItdCBib3JkZXItc2xhdGUtMTAwIGhvdmVyOmJnLXNsYXRlLTUwLzUwXCJcbiAgICAgICAgICAgICAgICAgICAgZHJhZ2dhYmxlPXtjYW5SZW9yZGVyfVxuICAgICAgICAgICAgICAgICAgICBvbkRyYWdTdGFydD17KCkgPT4gb25EcmFnU3RhcnRSb3cocC5pZCl9XG4gICAgICAgICAgICAgICAgICAgIG9uRHJhZ092ZXI9eyhlKSA9PiBjYW5SZW9yZGVyICYmIGUucHJldmVudERlZmF1bHQoKX1cbiAgICAgICAgICAgICAgICAgICAgb25Ecm9wPXsoKSA9PiBjYW5SZW9yZGVyICYmIG9uRHJvcFJvdyhwLmlkKX1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAge2NhblJlb3JkZXIgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJwLTMgdGV4dC1zbGF0ZS0zMDAgY3Vyc29yLWdyYWIgYWN0aXZlOmN1cnNvci1ncmFiYmluZ1wiIHRpdGxlPVwi2qnYtNuM2K/ZhiDYqNix2KfbjCDYqti624zbjNixINiq2LHYqtuM2KhcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIOKjv1xuICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJwLTNcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8VGh1bWIgc3JjPXtwLmltYWdlX3VybH0gYWx0PXtwLm5hbWV9IGNsYXNzTmFtZT1cInctMTIgaC0xMiByb3VuZGVkLWxnXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInAtM1wiPlxuICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtc2xhdGUtODAwXCI+e3AubmFtZX08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICB7cC5kZXNjcmlwdGlvbiAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS00MDAgdHJ1bmNhdGUgbWF4LXctWzIyMHB4XVwiPntwLmRlc2NyaXB0aW9ufTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJwLTMgdGV4dC1zbGF0ZS01MDBcIj57cC5jYXRlZ29yeSB8fCBcIuKAlFwifTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJwLTMgZmEtbnVtIHdoaXRlc3BhY2Utbm93cmFwXCI+XG4gICAgICAgICAgICAgICAgICAgICAge2Rpc2NvdW50ZWQgPyAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTQwMCBsaW5lLXRocm91Z2hcIj57Zm9ybWF0UHJpY2UocC5wcmljZSl9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJmb250LWJvbGQgdGV4dC1zbGF0ZS04MDBcIj57Zm9ybWF0UHJpY2UocC5wcmljZSl9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJwLTMgd2hpdGVzcGFjZS1ub3dyYXBcIj5cbiAgICAgICAgICAgICAgICAgICAgICB7ZGlzY291bnRlZCAmJiBwLnNhbGVfcHJpY2UgPyAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8QmFkZ2UgdG9uZT1cIndhcm5cIj7Zqnt0b0ZhRGlnaXRzKHAuZGlzY291bnRfcGVyY2VudCl9PC9CYWRnZT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmYS1udW0gZm9udC1ib2xkIHRleHQtYW1iZXItNzAwXCI+e2Zvcm1hdFByaWNlKHAuc2FsZV9wcmljZSl9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICApIDogcC5zYWxlX3ByaWNlID8gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPEJhZGdlIHRvbmU9XCJuZXV0cmFsXCI+2KrYrtmB24zZgSDYr9ixINio2KfYstmHPC9CYWRnZT5cbiAgICAgICAgICAgICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS0zMDBcIj7igJQ8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInAtM1wiPlxuICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHRvZ2dsZShwKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17ISFwLmFjdGl2ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHJvdW5kZWQtZnVsbCBweC0zIHB5LTEgdGV4dC14cyBmb250LWJvbGQgdHJhbnNpdGlvbi1jb2xvcnMgZm9jdXMtdmlzaWJsZTpvdXRsaW5lLW5vbmUgZm9jdXMtdmlzaWJsZTpyaW5nLTIgZm9jdXMtdmlzaWJsZTpyaW5nLWFtYmVyLTQwMCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICBwLmFjdGl2ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gXCJiZy1lbWVyYWxkLTEwMCB0ZXh0LWVtZXJhbGQtNzAwIGhvdmVyOmJnLWVtZXJhbGQtMjAwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFwiYmctc2xhdGUtMjAwIHRleHQtc2xhdGUtNTAwIGhvdmVyOmJnLXNsYXRlLTMwMFwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICB7cC5hY3RpdmUgPyBcIuKXjyDZgdi52KfZhFwiIDogXCLil4sg2LrbjNix2YHYudin2YRcIn1cbiAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInAtMyB0ZXh0LXhzIHRleHQtc2xhdGUtNDAwIGZhLW51bSB3aGl0ZXNwYWNlLW5vd3JhcFwiPntmYURhdGVUaW1lKHAudXBkYXRlZF9hdCl9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzTmFtZT1cInAtMyB3aGl0ZXNwYWNlLW5vd3JhcFwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAge2NhblJlb3JkZXIgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICA8PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG1vdmUocCwgLTEpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YNin2YbYqtmC2KfZhCAke3AubmFtZX0g2KjZhyDYqNin2YTYp2B9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJyb3VuZGVkLWxnIHB4LTIgcHktMSB0ZXh0LXNsYXRlLTQwMCBob3Zlcjp0ZXh0LXNsYXRlLTgwMCBob3ZlcjpiZy1zbGF0ZS0xMDAgZm9jdXMtdmlzaWJsZTpvdXRsaW5lLW5vbmUgZm9jdXMtdmlzaWJsZTpyaW5nLTIgZm9jdXMtdmlzaWJsZTpyaW5nLWFtYmVyLTQwMFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4payXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gbW92ZShwLCAxKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2DYp9mG2KrZgtin2YQgJHtwLm5hbWV9INio2Ycg2b7Yp9uM24zZhmB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJyb3VuZGVkLWxnIHB4LTIgcHktMSB0ZXh0LXNsYXRlLTQwMCBob3Zlcjp0ZXh0LXNsYXRlLTgwMCBob3ZlcjpiZy1zbGF0ZS0xMDAgZm9jdXMtdmlzaWJsZTpvdXRsaW5lLW5vbmUgZm9jdXMtdmlzaWJsZTpyaW5nLTIgZm9jdXMtdmlzaWJsZTpyaW5nLWFtYmVyLTQwMFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pa8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvPlxuICAgICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIDxCdXR0b24gc2l6ZT1cInNtXCIgdmFyaWFudD1cIm5ldXRyYWxcIiBvbkNsaWNrPXsoKSA9PiB0b0Zvcm0ocCl9PtmI24zYsdin24zYtDwvQnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPEJ1dHRvbiBzaXplPVwic21cIiB2YXJpYW50PVwiZGFuZ2VyXCIgb25DbGljaz17KCkgPT4gc2V0Q29uZmlybURlbGV0ZShwKX0+2K3YsNmBPC9CdXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgPC90Ym9keT5cbiAgICAgICAgICApfVxuICAgICAgICA8L3RhYmxlPlxuICAgICAgPC9DYXJkPlxuXG4gICAgICB7Zm9ybSAmJiAoXG4gICAgICAgIDxQcm9kdWN0TW9kYWxcbiAgICAgICAgICBmb3JtPXtmb3JtfVxuICAgICAgICAgIG9uQ2xvc2U9eygpID0+IHNldEZvcm0obnVsbCl9XG4gICAgICAgICAgb25TYXZlZD17KGNyZWF0ZWQpID0+IHtcbiAgICAgICAgICAgIHNldEZvcm0obnVsbCk7XG4gICAgICAgICAgICBsb2FkKCk7XG4gICAgICAgICAgICBwdXNoVG9hc3QoY3JlYXRlZCA/IFwi2YXYrdi12YjZhCDYp9i22KfZgdmHINi02K8g2Ygg2LHZiNuMINmG2YXYp9uM2LTar9ix2YfYpyDYp9i52YXYp9mEINmF24zigIzYtNmI2K9cIiA6IFwi2KrYutuM24zYsdin2Kog2LDYrtuM2LHZhyDYtNivINmIINix2YjbjCDZhtmF2KfbjNi02q/YsdmH2Kcg2KfYudmF2KfZhCDZhduM4oCM2LTZiNivXCIpO1xuICAgICAgICAgIH19XG4gICAgICAgIC8+XG4gICAgICApfVxuXG4gICAgICA8Q29uZmlybURpYWxvZ1xuICAgICAgICBvcGVuPXshIWNvbmZpcm1EZWxldGV9XG4gICAgICAgIHRpdGxlPVwi2K3YsNmBINmF2K3YtdmI2YRcIlxuICAgICAgICBtZXNzYWdlPXtg2KLbjNinINin2LIg2K3YsNmBIMKrJHtjb25maXJtRGVsZXRlPy5uYW1lfcK7INmF2LfZhdim2YYg2YfYs9iq24zYr9ifINin24zZhiDYudmF2YQg2YLYp9io2YQg2KjYp9iy2q/YtNiqINmG24zYs9iqLmB9XG4gICAgICAgIGNvbmZpcm1MYWJlbD1cItit2LDZgSDZhdit2LXZiNmEXCJcbiAgICAgICAgZGFuZ2VyXG4gICAgICAgIGJ1c3k9e2RlbEJ1c3l9XG4gICAgICAgIG9uQ29uZmlybT17KCkgPT4gY29uZmlybURlbGV0ZSAmJiBkb0RlbGV0ZShjb25maXJtRGVsZXRlKX1cbiAgICAgICAgb25DbG9zZT17KCkgPT4gc2V0Q29uZmlybURlbGV0ZShudWxsKX1cbiAgICAgIC8+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmZ1bmN0aW9uIHRvRm9ybShwOiBQcm9kdWN0KTogRm9ybVN0YXRlIHtcbiAgcmV0dXJuIHtcbiAgICBpZDogcC5pZCxcbiAgICBuYW1lOiBwLm5hbWUsXG4gICAgZGVzY3JpcHRpb246IHAuZGVzY3JpcHRpb24sXG4gICAgY2F0ZWdvcnk6IHAuY2F0ZWdvcnksXG4gICAgcHJpY2U6IFN0cmluZyhwLnByaWNlID8/IFwiXCIpLFxuICAgIHNhbGVfcHJpY2U6IHAuc2FsZV9wcmljZSA/IFN0cmluZyhwLnNhbGVfcHJpY2UpIDogXCJcIixcbiAgICBkaXNjb3VudF9zdGFydDogdHNUb0RhdGUocC5kaXNjb3VudF9zdGFydCksXG4gICAgZGlzY291bnRfZW5kOiB0c1RvRGF0ZShwLmRpc2NvdW50X2VuZCksXG4gICAgc29ydF9vcmRlcjogU3RyaW5nKHAuc29ydF9vcmRlciksXG4gICAgYWN0aXZlOiAhIXAuYWN0aXZlLFxuICAgIGltYWdlX3VybDogcC5pbWFnZV91cmwsXG4gIH07XG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0gUHJvZHVjdCBmb3JtIGRpYWxvZyAtLS0tLS0tLS0tLS0tLS0tICovXG5mdW5jdGlvbiBQcm9kdWN0TW9kYWwoe1xuICBmb3JtLFxuICBvbkNsb3NlLFxuICBvblNhdmVkLFxufToge1xuICBmb3JtOiBGb3JtU3RhdGU7XG4gIG9uQ2xvc2U6ICgpID0+IHZvaWQ7XG4gIG9uU2F2ZWQ6IChjcmVhdGVkOiBib29sZWFuKSA9PiB2b2lkO1xufSkge1xuICBjb25zdCBlZGl0aW5nID0gISFmb3JtLmlkO1xuICBjb25zdCBbZiwgc2V0Rl0gPSB1c2VTdGF0ZTxGb3JtU3RhdGU+KGZvcm0pO1xuICBjb25zdCBbYnVzeSwgc2V0QnVzeV0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtlcnJvciwgc2V0RXJyb3JdID0gdXNlU3RhdGUoXCJcIik7XG4gIGNvbnN0IFtwcmV2aWV3LCBzZXRQcmV2aWV3XSA9IHVzZVN0YXRlPHN0cmluZz4oZi5pbWFnZV91cmwpO1xuICBjb25zdCBbcGVuZGluZ0ltYWdlLCBzZXRQZW5kaW5nSW1hZ2VdID0gdXNlU3RhdGU8RmlsZSB8IG51bGw+KG51bGwpO1xuICBjb25zdCBbdXBQY3QsIHNldFVwUGN0XSA9IHVzZVN0YXRlPG51bWJlciB8IG51bGw+KG51bGwpO1xuICBjb25zdCBbZHJhZ2dpbmcsIHNldERyYWdnaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgZmlsZVJlZiA9IHVzZVJlZjxIVE1MSW5wdXRFbGVtZW50PihudWxsKTtcblxuICBjb25zdCBpbml0aWFsUmVmID0gdXNlUmVmKGZvcm0pO1xuICBjb25zdCBkaXJ0eSA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIGNvbnN0IGEgPSBpbml0aWFsUmVmLmN1cnJlbnQ7XG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKGEpIGFzIChrZXlvZiBGb3JtU3RhdGUpW107XG4gICAgcmV0dXJuIGtleXMuc29tZSgoaykgPT4gYVtrXSAhPT0gZltrXSk7XG4gIH0sIFtmXSk7XG4gIGNvbnN0IGd1YXJkID0gdXNlVW5zYXZlZEd1YXJkKGRpcnR5KTtcblxuICBjb25zdCBjbG9zZSA9ICgpID0+IHtcbiAgICBndWFyZC5jb25maXJtTGVhdmUoKCkgPT4gb25DbG9zZSgpKTtcbiAgfTtcblxuICBjb25zdCBzZXQgPSAocGF0Y2g6IFBhcnRpYWw8Rm9ybVN0YXRlPikgPT4gc2V0RigocCkgPT4gKHsgLi4ucCwgLi4ucGF0Y2ggfSkpO1xuXG4gIGNvbnN0IHByaWNlID0gcGFyc2VJbnQoZi5wcmljZSB8fCBcIjBcIiwgMTApIHx8IDA7XG4gIGNvbnN0IHNhbGUgPSBwYXJzZUludChmLnNhbGVfcHJpY2UgfHwgXCIwXCIsIDEwKSB8fCAwO1xuICBjb25zdCBwZXJjZW50ID0gc2FsZSA+IDAgJiYgc2FsZSA8IHByaWNlID8gTWF0aC5yb3VuZCgoKHByaWNlIC0gc2FsZSkgKiAxMDApIC8gcHJpY2UpIDogMDtcblxuICBjb25zdCBwaWNrRmlsZSA9IChmaWxlPzogRmlsZSB8IG51bGwpID0+IHtcbiAgICBpZiAoIWZpbGUpIHJldHVybjtcbiAgICBpZiAoIS9cXC4oanBnfGpwZWd8cG5nfHdlYnApJC9pLnRlc3QoZmlsZS5uYW1lKSB8fCAhL2ltYWdlXFwvKGpwZWd8cG5nfHdlYnApLy50ZXN0KGZpbGUudHlwZSkpIHtcbiAgICAgIHB1c2hUb2FzdChcItmB2LHZhdiqINiq2LXZiNuM2LEg2b7YtNiq24zYqNin2YbbjCDZhtmF24zigIzYtNmI2K8gKEpQR9iMIFBOR9iMIFdlYlApXCIsIFwiZXJyXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZmlsZS5zaXplID4gNy45ICogMTAyNCAqIDEwMjQpIHtcbiAgICAgIHB1c2hUb2FzdChcItit2KzZhSDZgdin24zZhCDYqNuM2LQg2KfYsiDYrdivINmF2KzYp9iyICjbuCDZhdqv2KfYqNin24zYqilcIiwgXCJlcnJcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHNldFByZXZpZXcoVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKSk7XG4gICAgc2V0UGVuZGluZ0ltYWdlKGZpbGUpO1xuICAgIHNldEYoKHApID0+ICh7IC4uLnAsIGltYWdlX3VybDogXCJcIiB9KSk7XG4gIH07XG5cbiAgY29uc3Qgc2F2ZSA9IGFzeW5jIChlOiBGb3JtRXZlbnQpID0+IHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgc2V0RXJyb3IoXCJcIik7XG4gICAgaWYgKCFmLm5hbWUudHJpbSgpKSByZXR1cm4gc2V0RXJyb3IoXCLZhtin2YUg2YXYrdi12YjZhCDYp9mE2LLYp9mF24wg2KfYs9iqXCIpO1xuICAgIGlmICghcHJpY2UpIHJldHVybiBzZXRFcnJvcihcItmC24zZhdiqINin2LXZhNuMINin2YTYstin2YXbjCDYp9iz2KpcIik7XG4gICAgaWYgKHNhbGUgJiYgcHJpY2UgJiYgc2FsZSA+PSBwcmljZSkgcmV0dXJuIHNldEVycm9yKFwi2YLbjNmF2Kog2KrYrtmB24zZgeKAjNiu2YjYsdiv2Ycg2KjYp9uM2K8g2qnZhdiq2LEg2KfYsiDZgtuM2YXYqiDYp9i12YTbjCDYqNin2LTYr1wiKTtcbiAgICBzZXRCdXN5KHRydWUpO1xuICAgIHRyeSB7XG4gICAgICBsZXQgaW1hZ2VVcmwgPSBmLmltYWdlX3VybDtcbiAgICAgIGlmIChwZW5kaW5nSW1hZ2UpIHtcbiAgICAgICAgY29uc3QgcmVzaXplZCA9IGF3YWl0IHJlc2l6ZUltYWdlKHBlbmRpbmdJbWFnZSkuY2F0Y2goKCkgPT4gcGVuZGluZ0ltYWdlKTtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgIHVwbG9hZEltYWdlKFxuICAgICAgICAgICAgcmVzaXplZCxcbiAgICAgICAgICAgIChwY3QpID0+IHNldFVwUGN0KHBjdCksXG4gICAgICAgICAgICAodXJsKSA9PiB7XG4gICAgICAgICAgICAgIGltYWdlVXJsID0gdXJsO1xuICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKG1zZykgPT4gcmVqZWN0KG5ldyBFcnJvcihtc2cpKVxuICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY29uc3QgYm9keSA9IHtcbiAgICAgICAgbmFtZTogZi5uYW1lLnRyaW0oKSxcbiAgICAgICAgZGVzY3JpcHRpb246IGYuZGVzY3JpcHRpb24udHJpbSgpLFxuICAgICAgICBjYXRlZ29yeTogZi5jYXRlZ29yeS50cmltKCksXG4gICAgICAgIHByaWNlLFxuICAgICAgICBzYWxlX3ByaWNlOiBzYWxlIHx8IG51bGwsXG4gICAgICAgIGRpc2NvdW50X3N0YXJ0OiBkYXRlVG9UcyhmLmRpc2NvdW50X3N0YXJ0KSxcbiAgICAgICAgZGlzY291bnRfZW5kOiBkYXRlVG9UcyhmLmRpc2NvdW50X2VuZCksXG4gICAgICAgIHNvcnRfb3JkZXI6IHBhcnNlSW50KGYuc29ydF9vcmRlciB8fCBcIjBcIiwgMTApIHx8IDAsXG4gICAgICAgIGFjdGl2ZTogZi5hY3RpdmUsXG4gICAgICAgIGltYWdlX3VybDogaW1hZ2VVcmwsXG4gICAgICB9O1xuICAgICAgaWYgKGVkaXRpbmcpIGF3YWl0IGFwaShgL2FwaS9hZG1pbi9wcm9kdWN0cy8ke2YuaWR9YCwgeyBtZXRob2Q6IFwiUFVUXCIsIGJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpIH0pO1xuICAgICAgZWxzZSBhd2FpdCBhcGkoXCIvYXBpL2FkbWluL3Byb2R1Y3RzXCIsIHsgbWV0aG9kOiBcIlBPU1RcIiwgYm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSkgfSk7XG4gICAgICBvblNhdmVkKCFlZGl0aW5nKTtcbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgc2V0RXJyb3IoZXJyLm1lc3NhZ2UgfHwgXCLYsNiu24zYsdmHINmG2KfZhdmI2YHZgiDYqNmI2K9cIik7XG4gICAgICBwdXNoVG9hc3QoZXJyLm1lc3NhZ2UgfHwgXCLYsNiu24zYsdmHINmG2KfZhdmI2YHZgiDYqNmI2K9cIiwgXCJlcnJcIik7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHNldEJ1c3koZmFsc2UpO1xuICAgICAgc2V0VXBQY3QobnVsbCk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPE1vZGFsIG9wZW4gb25DbG9zZT17Y2xvc2V9IHRpdGxlPXtlZGl0aW5nID8gXCLZiNuM2LHYp9uM2LQg2YXYrdi12YjZhFwiIDogXCLYp9mB2LLZiNiv2YYg2YXYrdi12YjZhCDYrNiv24zYr1wifSB3aWR0aD1cIm1heC13LTN4bFwiPlxuICAgICAgPGZvcm0gb25TdWJtaXQ9e3NhdmV9IGNsYXNzTmFtZT1cImdyaWQgbWQ6Z3JpZC1jb2xzLTIgZ2FwLTQgdGV4dC1zbVwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1kOmNvbC1zcGFuLTJcIj5cbiAgICAgICAgICA8RmllbGQgbGFiZWw9XCLZhtin2YUg2YXYrdi12YjZhFwiIHJlcXVpcmVkIGVycm9yPXtmLm5hbWUgPT09IFwiXCIgPyBcItmG2KfZhSDZiNin2LHYryDaqdmG24zYr1wiIDogdW5kZWZpbmVkfT5cbiAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICB2YWx1ZT17Zi5uYW1lfVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldCh7IG5hbWU6IGUudGFyZ2V0LnZhbHVlIH0pfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9e2lucHV0Q2xzfVxuICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cItmF2KvZhNin2Ys6INm+2YbbjNixINmE24zZgtmI2KfZhiDbtNuw27Ag2q/YsdmF24xcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICA8L0ZpZWxkPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtZDpjb2wtc3Bhbi0yXCI+XG4gICAgICAgICAgPEZpZWxkIGxhYmVsPVwi2KrZiNi224zYrSDaqdmI2KrYp9mHXCIgaGludD1cItqG2YbYryDaqdmE2YXZh9ibINix2YjbjCDYqtmE2YjbjNiy24zZiNmGINiy24zYsSDZhtin2YUg2YXYrdi12YjZhCDZhti02KfZhiDYr9in2K/ZhyDZhduM4oCM2LTZiNivXCI+XG4gICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgdmFsdWU9e2YuZGVzY3JpcHRpb259XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0KHsgZGVzY3JpcHRpb246IGUudGFyZ2V0LnZhbHVlIH0pfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9e2lucHV0Q2xzfVxuICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cItmF2KvZhNin2Ys6INin2LIg2K/Yp9mG2YfigIzZh9in24wg2KrYp9iy2Ycg2KjYsdi02KrZh+KAjNqp2KfYsduMINiq2K7Ytdi124xcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICA8L0ZpZWxkPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPEZpZWxkIGxhYmVsPVwi2K/Ys9iq2YfigIzYqNmG2K/bjFwiPlxuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgdmFsdWU9e2YuY2F0ZWdvcnl9XG4gICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldCh7IGNhdGVnb3J5OiBlLnRhcmdldC52YWx1ZSB9KX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT17aW5wdXRDbHN9XG4gICAgICAgICAgICBwbGFjZWhvbGRlcj1cItmF2KvZhNin2Ys6INmE2KjZhtuM2KfYqlwiXG4gICAgICAgICAgICBsaXN0PVwiY2F0LXN1Z2dlc3Rpb25zXCJcbiAgICAgICAgICAvPlxuICAgICAgICA8L0ZpZWxkPlxuICAgICAgICA8RmllbGQgbGFiZWw9XCLYqtix2KrbjNioINmG2YXYp9uM2LRcIiBoaW50PVwi2LnYr9ivINqp2Yjahtqp2KrYsSDYstmI2K/YqtixINmG2YXYp9uM2LQg2K/Yp9iv2Ycg2YXbjOKAjNi02YjYr1wiPlxuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgdHlwZT1cIm51bWJlclwiXG4gICAgICAgICAgICB2YWx1ZT17Zi5zb3J0X29yZGVyfVxuICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXQoeyBzb3J0X29yZGVyOiBlLnRhcmdldC52YWx1ZSB9KX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT17YCR7aW5wdXRDbHN9IGx0cjp0ZXh0LWxlZnRgfVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvRmllbGQ+XG4gICAgICAgIDxGaWVsZCBsYWJlbD1cItmC24zZhdiqINin2LXZhNuMICjYqtmI2YXYp9mGKVwiIHJlcXVpcmVkPlxuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgdHlwZT1cIm51bWJlclwiXG4gICAgICAgICAgICBtaW49ezF9XG4gICAgICAgICAgICB2YWx1ZT17Zi5wcmljZX1cbiAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0KHsgcHJpY2U6IGUudGFyZ2V0LnZhbHVlIH0pfVxuICAgICAgICAgICAgY2xhc3NOYW1lPXtgJHtpbnB1dENsc30gbHRyOnRleHQtbGVmdGB9XG4gICAgICAgICAgLz5cbiAgICAgICAgPC9GaWVsZD5cbiAgICAgICAgPEZpZWxkXG4gICAgICAgICAgbGFiZWw9XCLZgtuM2YXYqiDYqtiu2YHbjNmB4oCM2K7ZiNix2K/ZhyAo2KrZiNmF2KfZhilcIlxuICAgICAgICAgIGhpbnQ9e3BlcmNlbnQgPiAwID8gYNiv2LHYtdivINiq2K7ZgduM2YEg2K7ZiNiv2qnYp9ixOiDZqiR7dG9GYURpZ2l0cyhwZXJjZW50KX1gIDogXCLYrtin2YTbjCDYqNqv2LDYp9ix24zYryDYqtinINiq2K7ZgduM2YEg2YbZhdin24zYtCDYr9in2K/ZhyDZhti02YjYr1wifVxuICAgICAgICA+XG4gICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICB0eXBlPVwibnVtYmVyXCJcbiAgICAgICAgICAgIG1pbj17MH1cbiAgICAgICAgICAgIHZhbHVlPXtmLnNhbGVfcHJpY2V9XG4gICAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldCh7IHNhbGVfcHJpY2U6IGUudGFyZ2V0LnZhbHVlIH0pfVxuICAgICAgICAgICAgY2xhc3NOYW1lPXtgJHtpbnB1dENsc30gbHRyOnRleHQtbGVmdGB9XG4gICAgICAgICAgLz5cbiAgICAgICAgPC9GaWVsZD5cbiAgICAgICAgPEZpZWxkIGxhYmVsPVwi2LTYsdmI2Lkg2KrYrtmB24zZgSAo2KfYrtiq24zYp9ix24wpXCI+XG4gICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICB0eXBlPVwiZGF0ZVwiXG4gICAgICAgICAgICB2YWx1ZT17Zi5kaXNjb3VudF9zdGFydH1cbiAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0KHsgZGlzY291bnRfc3RhcnQ6IGUudGFyZ2V0LnZhbHVlIH0pfVxuICAgICAgICAgICAgY2xhc3NOYW1lPXtgJHtpbnB1dENsc30gbHRyOnRleHQtbGVmdGB9XG4gICAgICAgICAgLz5cbiAgICAgICAgPC9GaWVsZD5cbiAgICAgICAgPEZpZWxkIGxhYmVsPVwi2b7Yp9uM2KfZhiDYqtiu2YHbjNmBICjYp9iu2KrbjNin2LHbjClcIj5cbiAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgIHR5cGU9XCJkYXRlXCJcbiAgICAgICAgICAgIHZhbHVlPXtmLmRpc2NvdW50X2VuZH1cbiAgICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0KHsgZGlzY291bnRfZW5kOiBlLnRhcmdldC52YWx1ZSB9KX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT17YCR7aW5wdXRDbHN9IGx0cjp0ZXh0LWxlZnRgfVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvRmllbGQ+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtZDpjb2wtc3Bhbi0yXCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtc2xhdGUtNzAwIHRleHQtc21cIj7Yqti12YjbjNixINmF2K3YtdmI2YQ8L3NwYW4+XG4gICAgICAgICAgPGRpdlxuICAgICAgICAgICAgb25EcmFnT3Zlcj17KGUpID0+IHtcbiAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICBzZXREcmFnZ2luZyh0cnVlKTtcbiAgICAgICAgICAgIH19XG4gICAgICAgICAgICBvbkRyYWdMZWF2ZT17KCkgPT4gc2V0RHJhZ2dpbmcoZmFsc2UpfVxuICAgICAgICAgICAgb25Ecm9wPXsoZSkgPT4ge1xuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgIHNldERyYWdnaW5nKGZhbHNlKTtcbiAgICAgICAgICAgICAgcGlja0ZpbGUoZS5kYXRhVHJhbnNmZXIuZmlsZXM/LlswXSk7XG4gICAgICAgICAgICB9fVxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gZmlsZVJlZi5jdXJyZW50Py5jbGljaygpfVxuICAgICAgICAgICAgcm9sZT1cImJ1dHRvblwiXG4gICAgICAgICAgICB0YWJJbmRleD17MH1cbiAgICAgICAgICAgIG9uS2V5RG93bj17KGUpID0+IGUua2V5ID09PSBcIkVudGVyXCIgJiYgZmlsZVJlZi5jdXJyZW50Py5jbGljaygpfVxuICAgICAgICAgICAgY2xhc3NOYW1lPXtgbXQtMSBjdXJzb3ItcG9pbnRlciByb3VuZGVkLTJ4bCBib3JkZXItMiBib3JkZXItZGFzaGVkIHAtNCB0ZXh0LWNlbnRlciB0cmFuc2l0aW9uLWNvbG9ycyBmb2N1cy12aXNpYmxlOm91dGxpbmUtbm9uZSBmb2N1cy12aXNpYmxlOnJpbmctMiBmb2N1cy12aXNpYmxlOnJpbmctYW1iZXItNDAwICR7XG4gICAgICAgICAgICAgIGRyYWdnaW5nID8gXCJib3JkZXItYW1iZXItNTAwIGJnLWFtYmVyLTUwXCIgOiBcImJvcmRlci1zbGF0ZS0zMDAgaG92ZXI6Ym9yZGVyLXNsYXRlLTQwMFwiXG4gICAgICAgICAgICB9YH1cbiAgICAgICAgICA+XG4gICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgcmVmPXtmaWxlUmVmfVxuICAgICAgICAgICAgICB0eXBlPVwiZmlsZVwiXG4gICAgICAgICAgICAgIGFjY2VwdD1cImltYWdlL2pwZWcsaW1hZ2UvcG5nLGltYWdlL3dlYnBcIlxuICAgICAgICAgICAgICBoaWRkZW5cbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBwaWNrRmlsZShlLnRhcmdldC5maWxlcz8uWzBdKX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICB7cHJldmlldyA/IChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICAgIDxpbWcgc3JjPXtwcmV2aWV3fSBhbHQ9XCLZvtuM2LTigIzZhtmF2KfbjNi0INiq2LXZiNuM2LFcIiBjbGFzc05hbWU9XCJtYXgtaC00MCByb3VuZGVkLXhsIG9iamVjdC1jb250YWluXCIgLz5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtc2xhdGUtNTAwXCI+2KjYsdin24wg2KzYp9uM2q/YstuM2YbbjNiMINiq2LXZiNuM2LEg2K/bjNqv2LHbjCDYp9mG2KrYrtin2Kgg24zYpyDYsdmH2Kcg2qnZhtuM2K88L3NwYW4+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJweS02IHRleHQtc2xhdGUtNTAwXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LTN4bFwiIGFyaWEtaGlkZGVuPvCfk6Q8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTEgdGV4dC1zbVwiPtmB2KfbjNmEINix2Kcg2Kjaqdi024zYryDZiCDYsdmH2Kcg2qnZhtuM2K8g24zYpyDaqdmE24zaqSDaqdmG24zYrzwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gdGV4dC1zbGF0ZS00MDBcIj5KUEfYjCBQTkcg24zYpyBXZWJQIOKAlCDYqtinINu4INmF2q/Yp9io2KfbjNiqICjYrtmI2K/aqdin2LEg2KjZh9uM2YbZhyDZhduM4oCM2LTZiNivKTwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAge3BlbmRpbmdJbWFnZSAmJiAoXG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0xLjUgdGV4dC14cyB0ZXh0LWVtZXJhbGQtNzAwIGZvbnQtYm9sZFwiPlxuICAgICAgICAgICAgICDYqti12YjbjNixINis2K/bjNivINin2YbYqtiu2KfYqCDYtNiv2Jsg2YfZhdix2KfZhyDYqNinINiw2K7bjNix2Ycg2KLZvtmE2YjYryDZhduM4oCM2LTZiNivLlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICl9XG4gICAgICAgICAge3VwUGN0ICE9PSBudWxsICYmIHVwUGN0IDwgMTAwICYmIChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMiBoLTIgcm91bmRlZCBiZy1zbGF0ZS0yMDAgb3ZlcmZsb3ctaGlkZGVuXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaC1mdWxsIGJnLWFtYmVyLTUwMCB0cmFuc2l0aW9uLWFsbFwiIHN0eWxlPXt7IHdpZHRoOiBgJHt1cFBjdH0lYCB9fSAvPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cIm1kOmNvbC1zcGFuLTIgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIuNSByb3VuZGVkLXhsIGJnLXNsYXRlLTUwIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIHAtM1wiPlxuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgIGNoZWNrZWQ9e2YuYWN0aXZlfVxuICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXQoeyBhY3RpdmU6IGUudGFyZ2V0LmNoZWNrZWQgfSl9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJ3LTQgaC00IGFjY2VudC1hbWJlci01MDBcIlxuICAgICAgICAgIC8+XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGQgdGV4dC1zbGF0ZS03MDBcIj5cbiAgICAgICAgICAgINmF2K3YtdmI2YQg2YHYudin2YQg2KfYs9iqICjYsdmI24wg2YbZhdin24zYtNqv2LEg2KrZhNmI24zYstuM2YjZhiDYr9uM2K/ZhyDZhduM4oCM2LTZiNivKVxuICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPC9sYWJlbD5cblxuICAgICAgICB7ZXJyb3IgJiYgKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWQ6Y29sLXNwYW4tMiByb3VuZGVkLXhsIGJnLXJvc2UtNTAgYm9yZGVyIGJvcmRlci1yb3NlLTIwMCB0ZXh0LXJvc2UtNzAwIHB4LTQgcHktMi41IHRleHQtc20gZm9udC1ib2xkXCIgcm9sZT1cImFsZXJ0XCI+XG4gICAgICAgICAgICB7ZXJyb3J9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtZDpjb2wtc3Bhbi0yIGZsZXggZ2FwLTMganVzdGlmeS1lbmQgcHQtMyBib3JkZXItdCBib3JkZXItc2xhdGUtMTAwXCI+XG4gICAgICAgICAgPEJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdmFyaWFudD1cIm5ldXRyYWxcIiBvbkNsaWNrPXtjbG9zZX0+XG4gICAgICAgICAgICDYp9mG2LXYsdin2YFcbiAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICA8QnV0dG9uIHR5cGU9XCJzdWJtaXRcIiBsb2FkaW5nPXtidXN5fT5cbiAgICAgICAgICAgIHt1cFBjdCAhPT0gbnVsbCAmJiB1cFBjdCA8IDEwMCA/IGDYotm+2YTZiNivINiq2LXZiNuM2LHigKYgJHt0b0ZhRGlnaXRzKHVwUGN0KX3ZqmAgOiBcItiw2K7bjNix2Ycg2YXYrdi12YjZhFwifVxuICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZm9ybT5cbiAgICAgIHtndWFyZC5tb2RhbH1cbiAgICA8L01vZGFsPlxuICApO1xufVxuXG4iXSwiZmlsZSI6IkU6L3N0b3JlL2Zyb250ZW5kL3NyYy9wYWdlcy9Qcm9kdWN0cy50c3gifQ==