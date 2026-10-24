import { useCallback, useEffect, useRef, useState, Component } from "react";
import type { ReactNode } from "react";
import type { TvData, TvProduct } from "@/lib/types";
import { formatPrice, toFaDigits } from "@/lib/format";

const CACHE_PREFIX = "sp_display_cache_v2";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* Error Boundary: اگر کامپوننت کرش کند، به‌جای صفحهٔ خالی              */
/* پیام فارسی واضح نشانdde و ارor را در kunsol log kon               */
/* ------------------------------------------------------------------ */
class DisplayErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null };

  static getDerivedStateFromError(err: unknown) {
    return { message: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(err: unknown) {
    console.error("Display component error:", err);
  }

  render() {
    if (this.state.message) {
      return (
        <div dir="rtl" className="grid min-h-screen place-items-center bg-slate-950 p-8 text-center">
          <div className="space-y-4">
            <div className="text-6xl">⚠️</div>
            <h2 className="text-2xl font-bold text-white">خطا در نمایش محصول</h2>
            <p className="text-slate-300">اطلاعاتی برای نمایش وجود ندارد</p>
            <p className="text-xs text-slate-500">{this.state.message}</p>
            <button
              onClick={() => {
                this.setState({ message: null });
                window.location.reload();
              }}
              className="mt-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-900 hover:bg-amber-400"
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* Store identity */
/* ------------------------------------------------------------------ */
function HeaderBar({ settings }: { settings: TvData["settings"] }) {
  return (
    <div dir="rtl" className="tv-brand">
      {settings.logo_url && (
        <img
          src={settings.logo_url}
          alt="لوگوی فروشگاه"
          className="tv-brand-logo"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      )}
      <span className="tv-brand-name">{settings.shop_name}</span>
    </div>
  );
}

function ProductImage({
  src,
  alt,
  className,
  placeholderClassName = "tv-image-placeholder",
}: {
  src: string;
  alt: string;
  className: string;
  placeholderClassName?: string;
}) {
  const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const retryTimer = useRef<number | null>(null);

  useEffect(() => {
    setRetry(0);
    setLoaded(false);
    setFailed(false);
    return () => {
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
    };
  }, [src]);

  const retrySrc = (() => {
    if (!retry) return src;
    const url = new URL(src, window.location.href);
    url.searchParams.set("_display_retry", String(retry));
    return url.href;
  })();

  const handleError = () => {
    if (retry < 3) {
      const nextRetry = retry + 1;
      retryTimer.current = window.setTimeout(() => setRetry(nextRetry), 500 * 2 ** retry);
      return;
    }

    setFailed(true);
    console.error(`Display image failed to load after retries: ${src}`);
  };

  return (
    <div className="relative grid h-full w-full place-items-center">
      {src && !failed && (
        <img
          src={retrySrc}
          alt={alt}
          className={className}
          style={{ visibility: loaded ? "visible" : "hidden" }}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
      )}
      {(!src || failed || !loaded) && (
        <span className={placeholderClassName} aria-hidden="true">🛍</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Full-bleed, widescreen product promotion */
/* ------------------------------------------------------------------ */
function ProductSlide({
  product,
  settings,
  animate,
}: {
  product?: TvProduct;
  settings: TvData["settings"];
  animate: boolean;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const titleFontSize = useFitFontSize(titleRef, product?.name ?? "", 152, 24, 0.04, 0.12);
  const descriptionFontSize = useFitFontSize(
    descriptionRef,
    product?.description ?? "",
    110,
    34,
    0.029,
    0.09
  );

  if (!product) return null;
  const discounted =
    !!product.sale_price && product.sale_price < product.price;

  return (
    <div
      dir="ltr"
      className={`tv-slide ${animate ? "display-fade-enter" : ""}`}
    >
      <div className="tv-image-stage" aria-hidden={!product.image_url}>
        <div className="tv-image-circle" />
        <ProductImage
          key={product.id}
          src={product.image_url}
          alt={product.name}
          className="tv-product-image"
        />
      </div>

      <div dir="rtl" className="tv-content">
        <div className="tv-brand-area">
          <HeaderBar settings={settings} />
          <div className="tv-brand-accent" aria-hidden="true" />
        </div>

        <main className="tv-details">
          <h1
            ref={titleRef}
            className="tv-product-name"
            style={{ fontSize: `${titleFontSize}px` }}
            title={product.name}
          >
            {product.name}
          </h1>

          {!!product.description && (
            <p
              ref={descriptionRef}
              className="tv-product-description"
              style={{ fontSize: `${descriptionFontSize}px` }}
              title={product.description}
            >
              {product.description}
            </p>
          )}

          {discounted && (
            <div className="tv-discount-badge">
              {toFaDigits(product.discount_percent)}٪ تخفیف
            </div>
          )}

          <PriceBlock
            price={product.price}
            salePrice={discounted ? product.sale_price! : null}
          />
        </main>
      </div>
    </div>
  );
}

function useFitFontSize<T extends HTMLElement>(
  ref: React.RefObject<T>,
  text: string,
  maxSize: number,
  minSize: number,
  widthScale: number,
  heightScale: number
): number {
  const [fontSize, setFontSize] = useState(minSize);

  useEffect(() => {
    const element = ref.current;
    if (!element || !text) return;

    const measure = () => {
      const previousSize = element.style.fontSize;
      const preferredSize = Math.min(
        maxSize,
        window.innerWidth * widthScale,
        window.innerHeight * heightScale
      );
      const availableWidth = element.clientWidth;
      if (!availableWidth || !preferredSize) return;

      let low = minSize;
      let high = Math.max(minSize, preferredSize);
      while (high - low > 0.5) {
        const candidate = (low + high) / 2;
        element.style.fontSize = `${candidate}px`;
        if (element.scrollWidth <= availableWidth) {
          low = candidate;
        } else {
          high = candidate;
        }
      }
      element.style.fontSize = previousSize;
      setFontSize(Math.min(preferredSize, low));
    };

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [heightScale, maxSize, minSize, ref, text, widthScale]);

  return fontSize;
}

/* ------------------------------------------------------------------ */
/* PriceBlock: single row prices, old-price strike line, fit-to-width   */
/* ------------------------------------------------------------------ */
function PriceBlock({
  price,
  salePrice,
}: {
  price: number;
  salePrice: number | null;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const discounted = salePrice != null && salePrice < price;

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const minScale = 0.35;
    const finalPrice = row.children[0] as HTMLElement | undefined;
    const oldPrice = row.children[1] as HTMLElement | undefined;
    if (!finalPrice || !oldPrice) return;
    const measure = () => {
      finalPrice.style.fontSize = "";
      oldPrice.style.fontSize = "";
      const available = Math.max(1, row.clientWidth);
      const gap = discounted
        ? parseFloat(getComputedStyle(row).columnGap) || 0
        : 0;
      const measured = Math.max(
        1,
        finalPrice.getBoundingClientRect().width +
          (discounted ? oldPrice.getBoundingClientRect().width : 0)
      );
      const nextScale = Math.max(
        minScale,
        Math.min(1, Math.max(1, available - gap) / measured)
      );
      finalPrice.style.fontSize = `${parseFloat(getComputedStyle(finalPrice).fontSize) * nextScale}px`;
      if (discounted) {
        oldPrice.style.fontSize = `${parseFloat(getComputedStyle(oldPrice).fontSize) * nextScale}px`;
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    measure();
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [discounted, price, salePrice]);

  return (
    <div
      ref={rowRef}
      dir="rtl"
      className={`tv-price-row ${discounted ? "tv-price-row-discounted" : "tv-price-row-regular"}`}
    >
      <div
        className="fa-num tv-final-price"
      >
        {formatPrice(discounted ? salePrice : price)}
        <span className="tv-toman">تومان</span>
      </div>
      <div
        className={`fa-num tv-old-price old-price-strike ${discounted ? "" : "hidden"}`}
      >
        {discounted && (
          <>
            {formatPrice(price)}
            <span className="tv-old-toman">تومان</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- شبکه 4×۱ (۲×۲) ------------- */
function GridSlide({
  products,
  settings,
  animate,
}: {
  products: TvProduct[];
  settings: TvData["settings"];
  animate: boolean;
}) {
  if (products.length === 0) return null;
  return (
    <div
      className={`absolute inset-0 grid grid-cols-2 grid-rows-2 gap-6 px-16 pb-10 pt-6 ${animate ? "display-fade-enter" : ""}`}
    >
      {products.map((p) => {
        const discounted = !!p.sale_price && p.sale_price < p.price;
        return (
          <div
            key={p.id}
            className="flex min-h-0 items-center gap-8 overflow-hidden rounded-[1.75rem] bg-white px-10 shadow-xl"
          >
            <div className="grid w-56 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 p-4 aspect-square">
              <ProductImage
                key={p.id}
                src={p.image_url}
                alt={p.name}
                className="h-full w-full object-contain"
                placeholderClassName="text-6xl opacity-70"
              />
            </div>
            <div className="min-w-0 space-y-3 text-right" dir="rtl">
              <h2 className="line-clamp-2 text-4xl font-black leading-snug text-slate-900">
                {p.name}
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                {discounted ? (
                  <>
                    <span className="fa-num text-3xl font-bold text-slate-400 line-through">
                      {formatPrice(p.price)}
                    </span>
                    <span
                      className="fa-num text-5xl font-black"
                      style={{ color: settings.accent_color }}
                    >
                      {formatPrice(p.sale_price!)}
                    </span>
                    <span
                      className="rounded-full px-4 py-1.5 text-2xl font-black text-white"
                      style={{ backgroundColor: settings.accent_color }}
                    >
                      ٪{toFaDigits(p.discount_percent)}
                    </span>
                  </>
                ) : (
                  <span className="fa-num text-5xl font-black text-slate-900">
                    {formatPrice(p.price)}{" "}
                    <span className="text-2xl text-slate-500">تومان</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Display: page Hay'e display                                          */
/* ------------------------------------------------------------------ */
function DisplayInner() {
  const [data, setData] = useState<TvData | null>(null);
  const [error, setError] = useState<string>("");
  const [idx, setIdx] = useState(0);
  const [serverOffset, setServerOffset] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [burgerVisible, setBurgerVisible] = useState(true);
  const hideBurgerTimer = useRef<number | null>(null);

  const goFullscreen = () => {
    document.documentElement.requestFullscreen().catch((err) => {
      console.error("Fullscreen request failed:", err);
    });
  };

  const refetchTimer = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const revealAndScheduleHide = () => {
      setBurgerVisible(true);
      if (hideBurgerTimer.current !== null) {
        window.clearTimeout(hideBurgerTimer.current);
      }
      if (!document.fullscreenElement) {
        hideBurgerTimer.current = window.setTimeout(
          () => setBurgerVisible(false),
          3000
        );
      }
    };
    const onFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      setFullscreen(isFullscreen);
      if (isFullscreen) {
        setBurgerVisible(false);
        if (hideBurgerTimer.current !== null) {
          window.clearTimeout(hideBurgerTimer.current);
        }
      } else {
        revealAndScheduleHide();
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("pointermove", revealAndScheduleHide);
    window.addEventListener("touchstart", revealAndScheduleHide);
    window.addEventListener("keydown", revealAndScheduleHide);
    onFullscreenChange();
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("pointermove", revealAndScheduleHide);
      window.removeEventListener("touchstart", revealAndScheduleHide);
      window.removeEventListener("keydown", revealAndScheduleHide);
      if (hideBurgerTimer.current !== null) {
        window.clearTimeout(hideBurgerTimer.current);
      }
    };
  }, []);

  const syncMode = data?.settings.sync_mode ?? "independent";
  const duration = data?.sync.duration ?? 10;
  const products = data?.products ?? [];
  const slidesPerView = data?.settings.show_mode === "grid" ? 4 : 1;
  const slideCount = Math.max(1, Math.ceil(products.length / slidesPerView));

  useEffect(() => {
    if (products.length <= 1) return;
    const nextProductIndex = (idx * slidesPerView + slidesPerView) % products.length;
    const nextImageUrl = products[nextProductIndex]?.image_url;
    if (!nextImageUrl) return;

    const preload = new Image();
    preload.decoding = "async";
    preload.src = nextImageUrl;
  }, [idx, products, slidesPerView]);

  const fetchData = useCallback((silent = true) => {
    fetch("/api/public/display")
      .then(async (res) => {
        if (!res.ok) {
          let msg = "خطا در دریافت اطلاعات";
          try {
            const j = await res.json();
            msg = j.detail || msg;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }
        const json = (await res.json()) as TvData;
        localStorage.setItem(CACHE_PREFIX, JSON.stringify(json));
        setData(json);
        setError("");
        setServerOffset(json.sync.server_time - Date.now());
      })
      .catch((e) => {
        if (!(e instanceof Error)) return;
        console.error("Display fetch error:", e);
        if (!silent) setError(e.message || "خطا در دریافت اطلاعات");
      });
  }, []);

  /* --- him-e hook-haye qabl-e return-e-ye conditional-e --- */

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_PREFIX);
    if (cached) {
      try {
        setData(JSON.parse(cached) as TvData);
      } catch {
        /* ignore */
      }
    }
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    let alive = true;
    let retry = 0;
    let reconnectTimer: number | undefined;
    let pollTimer: number | undefined;

    const connect = () => {
      if (!alive) return;
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${location.host}/ws/display`);
      wsRef.current = ws;
      ws.onopen = () => {
        retry = 0;
        clearInterval(pollTimer);
        pollTimer = window.setInterval(() => {
          if (ws.readyState === 1) ws.send("ping");
        }, 25000);
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as {
            type: string;
            index?: number;
            server_time?: number;
          };
          if (msg.type === "slide") {
            const total = Math.max(1, slideCountRef.current);
            if (syncModeRef.current === "synchronized" && typeof msg.index === "number") {
              setIdx(((msg.index % total) + total) % total);
              setSlideEnd((msg.server_time ?? Date.now()) + durationRef.current * 1000);
            }
          }
          if (msg.type === "update") {
            if (refetchTimer.current) return;
            refetchTimer.current = window.setTimeout(() => {
              refetchTimer.current = null;
              fetchData();
            }, 500);
          }
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        clearInterval(pollTimer);
        if (!alive) return;
        retry += 1;
        reconnectTimer = window.setTimeout(
          connect,
          Math.min(15000, 2000 * Math.pow(2, Math.min(retry, 3)))
        );
      };
      ws.onerror = () => ws.close();
    };

    connect();

    const poll = window.setInterval(() => fetchData(true), 60000);
    const onOnlineChange = () => {
      if (navigator.onLine !== false) fetchData(true);
    };
    window.addEventListener("online", onOnlineChange);
    window.addEventListener("offline", onOnlineChange);

    return () => {
      alive = false;
      clearTimeout(reconnectTimer);
      clearInterval(pollTimer);
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      window.removeEventListener("online", onOnlineChange);
      window.removeEventListener("offline", onOnlineChange);
      wsRef.current?.close();
    };
  }, [fetchData]);

  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const slideCountRef = useRef(slideCount);
  const durationRef = useRef(duration);
  const syncModeRef = useRef(syncMode);
  useEffect(() => {
    slideCountRef.current = slideCount;
    durationRef.current = duration;
    syncModeRef.current = syncMode;
  }, [slideCount, duration, syncMode]);

  const [slideEnd, setSlideEnd] = useState(0);
  useEffect(() => {
    if (!data || syncMode !== "synchronized") return;
    setIdx(((data.sync.slide_index % data.sync.total) + data.sync.total) % data.sync.total);
    if (data.sync.slide_end) setSlideEnd(data.sync.slide_end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.sync.slide_index, data?.sync.slide_end, syncMode]);

  useEffect(() => {
    if (syncMode !== "independent" || slideCount <= 1) return;
    const timer = window.setInterval(() => {
      setIdx((current) => (current + 1) % slideCount);
    }, Math.max(1, duration) * 1000);
    return () => window.clearInterval(timer);
  }, [duration, slideCount, syncMode]);

  useEffect(() => {
    if (syncMode !== "synchronized" || !slideEnd) return;
    if (nowMs + serverOffset >= slideEnd) {
      setIdx((i) => (i + 1) % Math.max(1, slideCountRef.current));
      setSlideEnd((s) => s + durationRef.current * 1000);
    }
  }, [nowMs, slideEnd, serverOffset, syncMode]);

  useEffect(() => {
    if (idx >= slideCount) setIdx(0);
  }, [slideCount, idx]);

  if (!data) {
    return (
      <div
        dir="rtl"
        className="grid min-h-screen place-items-center bg-slate-950 p-8 text-center text-white"
      >
        <p>{error || "در حال دریافت اطلاعات نمایش…"}</p>
      </div>
    );
  }
  const { settings } = data;
  const sized = products.slice(idx * slidesPerView, idx * slidesPerView + slidesPerView);
  const hasProducts = products.length > 0;
  const anim = !prefersReducedMotion();

  return (
    <div
      dir="rtl"
      className="flex min-h-screen w-full flex-col overflow-hidden"
      style={{ background: settings.background_color }}
    >
      {/* ---------- Header: in slide-ye single-product dar lastan-ye rast slide mi-adi --- */}
      {!(hasProducts && slidesPerView === 1) && (
        <header className="relative z-10 flex w-full shrink-0 items-center justify-center border-b border-black/5 px-8 pb-4 pt-5">
          <HeaderBar settings={settings} />
        </header>
      )}

      {/* ---------- Content slide-zher header ---------- */}
      <div className="relative flex-1">
        {hasProducts && slidesPerView === 1 && (
          <ProductSlide
            key={`${idx}-${sized[0]?.id}`}
            product={sized[0]}
            settings={settings}
            animate={anim}
          />
        )}

        {hasProducts && slidesPerView !== 1 && (
          <GridSlide
            key={idx}
            products={sized}
            settings={settings}
            animate={anim}
          />
        )}

        {!hasProducts && (
          <>
            <div className="absolute inset-0 grid place-items-center">
              <div className="space-y-3 text-center opacity-80">
                <div className="text-6xl">𛍎</div>
                <p className="text-2xl font-bold text-white">در حال اتصال به سر…</p>
                <p className="text-sm text-slate-600">
                  تغییرات panel-e management bah-port-e tozihat sho-rav mishe-dan
                </p>
              </div>
            </div>

          </>
        )}
        {!fullscreen && (
          <button
            onClick={goFullscreen}
            className={`burger-btn absolute bottom-6 left-10 z-20 rounded-full bg-black/50 px-6 py-3 text-base text-white transition-opacity duration-500 hover:bg-black/70 ${
              burgerVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            ⛶ تمام‌صفحه
          </button>
        )}
      </div>
    </div>
  );
}

export default function Display() {
  return (
    <DisplayErrorBoundary>
      <DisplayInner />
    </DisplayErrorBoundary>
  );
}