import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { pushToast } from "@/components/Toast";
import { toFaDigits } from "@/lib/format";

/* ============================ Buttons ============================ */
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "neutral";
type BtnSize = "sm" | "md" | "lg";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 " +
  "disabled:opacity-50 disabled:pointer-events-none select-none";

const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: "bg-amber-500 text-slate-900 hover:bg-amber-400",
  secondary: "bg-slate-800 text-white hover:bg-slate-700",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-200/70",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
  neutral: "bg-slate-200 text-slate-800 hover:bg-slate-300",
};

const BTN_SIZES: Record<BtnSize, string> = {
  sm: "text-xs px-2.5 py-1.5",
  md: "text-sm px-4 py-2.5",
  lg: "text-base px-6 py-3",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
}) {
  return (
    <button
      className={`${BTN_BASE} ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`}
      disabled={rest.disabled || loading}
      {...rest}
    >
      {loading && (
        <span
          className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}

/* ============================ Fields ============================ */
export function Field({
  label,
  hint,
  error: fieldError,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-bold text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && !fieldError && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
      {fieldError && <div className="mt-1 text-xs text-rose-600 font-bold">{fieldError}</div>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 " +
  "placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/40 " +
  "disabled:bg-slate-100 disabled:text-slate-400";

/* ============================ Modal ============================ */
export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Ref to track whether we've already focused the first element during this mount.
  // This prevents the focus effect from running on every re-render when onClose changes.
  const firstFocusedRef = useRef<boolean>(false);

  useEffect(() => {
    // Only focus the first element once when the modal truly opens (not on every re-render).
    if (open && !firstFocusedRef.current) {
      const el = ref.current;
      el?.querySelector<HTMLElement>(
        "input, select, textarea, button"
      )?.focus();
      firstFocusedRef.current = true;
    }
    // Reset the flag when the modal closes so it can focus again on next open.
    if (!open) {
      firstFocusedRef.current = false;
    }
  }, [open]);

  // Cleanup: remove keydown listener on unmount
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        // به‌دام انداختن فوکوس داخل دیالوگ
        const focusables = ref.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-slate-950/60 grid place-items-center p-4 overflow-auto"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        className={`bg-white rounded-2xl p-6 w-full ${width} shadow-2xl my-8 border border-slate-200`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xl leading-none"
            aria-label="بستن"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ============================ Confirm dialog ============================ */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "تأیید",
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <div className="text-sm text-slate-600 leading-6">{message}</div>
      <div className="mt-5 flex gap-3 justify-end">
        <Button variant="neutral" onClick={onClose}>
          انصراف
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          onClick={onConfirm}
          loading={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ============================ Status indicators ============================ */
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "ok" | "warn" | "err" | "info" | "neutral";
  children: ReactNode;
}) {
  const tones = {
    ok: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-800",
    err: "bg-rose-100 text-rose-800",
    info: "bg-sky-100 text-sky-800",
    neutral: "bg-slate-200 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* ============================ Skeletons / states ============================ */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-slate-100">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="p-3">
              <Skeleton className="h-5 w-full max-w-[140px]" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function EmptyState({
  icon = "📦",
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-14 text-center">
      <div className="text-5xl opacity-60">{icon}</div>
      <p className="mt-3 font-bold text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
      <p className="font-bold text-rose-700">{message}</p>
      {retry && (
        <Button variant="neutral" className="mt-3" onClick={retry}>
          تلاش مجدد
        </Button>
      )}
    </div>
  );
}

/* ============================ Page header ============================ */
export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="text-xl font-black text-slate-900 grow">{title}</h2>
      {actions}
    </div>
  );
}

/* ============================ Card ============================ */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/* ============================ Form guard: unsaved changes ============================ */
export function useUnsavedGuard(dirty: boolean) {
  const [show, setShow] = useState(false);
  const allowRef = useRef<(() => void) | null>(null);

  const confirmLeave = useCallback(
    (go: () => void) => {
      if (!dirty) return go;
      allowRef.current = go;
      setShow(true);
    },
    [dirty]
  );

  const modal = (
    <ConfirmDialog
      open={show}
      title="تغییرات ذخیره‌نشده"
      message="تغییرات ذخیره نشده است. با خروج، تغییرات از بین می‌رود."
      confirmLabel="خروج بدون ذخیره"
      danger
      onConfirm={() => {
        setShow(false);
        allowRef.current?.();
      }}
      onClose={() => setShow(false)}
    />
  );

  return { confirmLeave, modal };
}

/* ============================ Spinner ============================ */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
      <span className="inline-block h-5 w-5 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

/* ============================ Safety: confirm duplicates ============================ */
export const requestOnce = (() => {
  const inflight = new Map<string, boolean>();
  return async (key: string, fn: () => Promise<unknown>) => {
    if (inflight.get(key)) return;
    inflight.set(key, true);
    try {
      await fn();
    } finally {
      inflight.delete(key);
    }
  };
})();

export function faNum(value: string | number) {
  return <span className="fa-num">{toFaDigits(String(value))}</span>;
}

/* ============================ Display: Thumb ============================ */
export function Thumb({
  src,
  alt = "",
  className = "",
  fallback = "🖼️",
}: {
  src?: string;
  alt?: string;
  className?: string;
  fallback?: string;
}) {
  const [bad, setBad] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setBad(false);
    setLoaded(false);
  }, [src]);
  if (!src || bad)
    return (
      <div className={`grid place-items-center bg-slate-100 text-slate-300 ${className}`}>{fallback}</div>
    );
  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {!loaded && <Skeleton className="absolute inset-0" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setBad(true)}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover ${loaded ? "opacity-100" : "opacity-0"} transition-opacity`}
      />
    </div>
  );
}

/* ============================ Number formatting ============================ */
