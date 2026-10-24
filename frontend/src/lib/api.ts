import { Product } from "@/lib/types";

const TOKEN_KEY = "sp_admin_token";
const USERNAME_KEY = "sp_admin_username";

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setSession(token: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export function getUsername(): string {
  return localStorage.getItem(USERNAME_KEY) || "";
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, { ...options, headers });
  if (res.status === 204) return undefined as T;
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON error
  }
  if (!res.ok) {
    const msg = data?.detail || `خطای سرور (${res.status})`;
    if (res.status === 401 && window.location.pathname.startsWith("/admin")) {
      clearSession();
      window.location.href = "/admin/login";
    }
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

/** آپلود تصویر با نمایش درصد پیشرفت (XMLHttpRequest برای onprogress) */
export function uploadImage(
  file: File | Blob,
  onProgress: (pct: number) => void,
  onDone: (url: string) => void,
  onError: (msg: string) => void
): XMLHttpRequest {
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/admin/images");
  xhr.setRequestHeader("Authorization", `Bearer ${getToken()}`);
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) onProgress(Math.round((e.loaded * 100) / e.total));
  };
  xhr.onload = () => {
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);
      onDone(data.url);
    } else {
      try {
        onError(JSON.parse(xhr.responseText).detail || "خطا در آپلود تصویر");
      } catch {
        onError("خطا در آپلود تصویر");
      }
    }
  };
  xhr.onerror = () => onError("خطای شبکه در آپلود تصویر");
  const fd = new FormData();
  fd.append("file", file);
  xhr.send(fd);
  return xhr;
}

/** س کم کردن اندازه تصویر سمت مرورگر برای سرعت لود تلویزیون‌ها */
export async function resizeImage(
  src: File | Blob,
  maxWidth = 1600,
  quality = 0.85
): Promise<Blob> {
  const img = await createImageBitmap(src);
  const scale = Math.min(1, maxWidth / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) =>
    canvas.toBlob(
      (b) => resolve(b || src),
      img.height && (src as File).type === "image/png" && scale === 1
        ? "image/png"
        : "image/jpeg",
      quality
    )
  );
}
