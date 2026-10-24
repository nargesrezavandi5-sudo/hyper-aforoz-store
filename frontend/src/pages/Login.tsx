import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setSession } from "@/lib/api";
import { pushToast } from "@/components/Toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ access_token: string; username: string }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ username, password }) }
      );
      setSession(data.access_token, data.username);
      navigate("/admin", { replace: true });
    } catch (err: any) {
      setError(err.message || "ورود ناموفق بود");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      dir="rtl"
      style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)" }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl space-y-4"
      >
        <div className="text-center">
          <div className="text-4xl">🛍️</div>
          <h1 className="mt-2 text-xl font-bold text-slate-800">
            ورود مدیر فروشگاه
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مدیریت محصولات، قیمت‌ها و تخفیف‌ها
          </p>
        </div>
        {error && (
          <div className="rounded-xl bg-rose-50 text-rose-700 text-sm px-4 py-2 border border-rose-200">
            {error}
          </div>
        )}
        <label className="block text-sm font-bold text-slate-700">
          نام کاربری
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 ltr:text-left"
            placeholder="admin"
          />
        </label>
        <label className="block text-sm font-bold text-slate-700">
          رمز عبور
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 ltr:text-left"
            placeholder="••••••••"
          />
        </label>
        <button
          disabled={busy}
          className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold py-3"
        >
          {busy ? "در حال ورود..." : "ورود"}
        </button>
      </form>
    </div>
  );
}
