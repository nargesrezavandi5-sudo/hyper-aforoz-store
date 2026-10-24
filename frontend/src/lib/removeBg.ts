import type { Config } from "@imgly/background-removal";

/**
 * حذف پس‌زمینهٔ تصویر محصول به‌صورت سمت کاربر با @imgly/background-removal
 * مدل فقط با dynamic import بارگذاری می‌شود تا لود اولیهٔ برنامه کند نشود.
 */

/** برش حاشیهٔ شفاف تا کادر محصول + ۵٪ حاشیه */
async function autoCropAlpha(src: HTMLCanvasElement): Promise<Blob> {
  const ctx = src.getContext("2d");
  if (!ctx) return toPngBlob(src);

  const { width: w, height: h } = src;
  const data = ctx.getImageData(0, 0, w, h).data;

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX === -1) return toPngBlob(src); // تصویر تمام‌شفاف — همان خروجی برگران

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const margin = Math.max(Math.round(boxW * 0.05), Math.round(boxH * 0.05));
  const pad = margin;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(w, maxX + pad) - cropX;
  const cropH = Math.min(h, maxY + pad) - cropY;

  const out = document.createElement("canvas");
  out.width = cropW;
  out.height = cropH;
  out.getContext("2d")!.drawImage(src, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return toPngBlob(out);
}

function toPngBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
}

/**
 * برش حاشیهٔ شفاف یک تصویر (برای لوگو) — خروجی dataURL PNG تمام‌قد هنر.
 * حاشیهٔ ۲٪ حفظ می‌شود تا هنر له نشود.
 */
export async function trimTransparentPng(src: string): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0);

  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX === -1) return src; // تمام‌شفاف — بدون تغییر

  const mx = Math.max(2, Math.round(w * 0.02));
  const my = Math.max(2, Math.round(h * 0.02));
  const cx = Math.max(0, minX - mx);
  const cy = Math.max(0, minY - my);
  const cw = Math.min(w, maxX + mx) - cx;
  const ch = Math.min(h, maxY + my) - cy;

  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(c, cx, cy, cw, ch, 0, 0, cw, ch);
  return out.toDataURL("image/png");
}

/**
 * ورودی حذف پس‌زمینه با تنظیم مقیاس خروجی:
 * خروجی زیر ۱۲۰۰px کوچک نمی‌شود؛ فقط اگر از ۱۶۰۰px بلندتر بود به ۱۶۰۰ محدود می‌شود.
 */
export async function removeProductBackground(
  source: Blob | File,
  onProgress?: (p: number) => void
): Promise<Blob> {
  // dynamic import تا باندل اصلی سنگین نشود
  const mod = await import("@imgly/background-removal");
  const config: Config = {
    progress: (key, p) => {
      if (key === "compute") onProgress?.(p);
    },
    output: {
      // مدل خودش مقیاس‌بندی می‌کند؛ سپس در post-process کنترل می کنیم
      quality: 0.95,
    },
  };
  const raw = await mod.removeBackground(source, config);

  // post-process: auto-crop + کنترل اندازهٔ بلندترین ضلع (۱۲۰۰/۱۶۰۰)
  const bmp = await createImageBitmap(raw);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0);
  bmp.close();

  const long = Math.max(canvas.width, canvas.height);
  if (long > 1600) {
    const scale = 1600 / long;
    const scaled = document.createElement("canvas");
    scaled.width = Math.round(canvas.width * scale);
    scaled.height = Math.round(canvas.height * scale);
    const sctx = scaled.getContext("2d")!;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
    return autoCropAlpha(scaled);
  }
  // زیر ۱۶۰۰: بدونダウنسکیل (حداقل ۱۲۰۰ حفظ می‌شود چون کوچک نمی‌کنیم)
  return autoCropAlpha(canvas);
}
