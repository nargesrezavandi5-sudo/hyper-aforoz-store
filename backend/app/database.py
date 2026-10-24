"""SQLite data layer — plain stdlib sqlite3.

All timestamps are integer Unix seconds (UTC). Tables:
  users      admin accounts (password stored as PBKDF2-HMAC-SHA256 hash)
  products   store products incl. prices, discount window, image, order, active
  displays   TV screens: unique token, name, enabled/revoked, last_seen
  settings   key/value JSON store for display customization (single 'app' row)
  images     known uploaded media files (for reuse + orphan checks)
"""
from __future__ import annotations

import json
import sqlite3
import threading
import time
from .config import DATABASE_PATH, DATA_DIR

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT '',
    price INTEGER NOT NULL,             -- تومان
    sale_price INTEGER,                 -- تومان، NULL = بدون تخفیف
    discount_percent INTEGER DEFAULT 0, -- محاسبه‌شده روی سرور
    discount_start INTEGER,             -- epoch seconds, nullable
    discount_end INTEGER,               -- epoch seconds, nullable
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    image_url TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS displays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    revoked INTEGER DEFAULT 0,
    last_seen INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    detail TEXT DEFAULT '',
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    filename TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
"""


def get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        _conn = sqlite3.connect(str(DATABASE_PATH), check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL;")
        _conn.execute("PRAGMA foreign_keys=ON;")
        _conn.executescript(SCHEMA)
        _conn.commit()
    return _conn


def query(sql: str, params: tuple = ()) -> list[dict]:
    with _lock:
        rows = get_conn().execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def query_one(sql: str, params: tuple = ()) -> dict | None:
    with _lock:
        row = get_conn().execute(sql, params).fetchone()
    return dict(row) if row else None


def execute(sql: str, params: tuple = ()) -> int:
    """Run a write statement; returns lastrowid."""
    with _lock:
        cur = get_conn().execute(sql, params)
        get_conn().commit()
    return cur.lastrowid


def executemany(sql: str, seq: list[tuple]) -> None:
    with _lock:
        get_conn().executemany(sql, seq)
        get_conn().commit()


def now() -> int:
    return int(time.time())


# ---------- users ----------
def create_user(username: str, password_hash: str) -> None:
    execute(
        "INSERT OR IGNORE INTO users (username, password_hash, created_at) VALUES (?,?,?)",
        (username, password_hash, now()),
    )


def get_user(username: str) -> dict | None:
    return query_one("SELECT * FROM users WHERE username = ?", (username,))


def update_user_password(username: str, password_hash: str) -> None:
    execute(
        "UPDATE users SET password_hash = ? WHERE username = ?",
        (password_hash, username),
    )


# ---------- products ----------
def get_products() -> list[dict]:
    return query(
        "SELECT * FROM products ORDER BY sort_order ASC, id ASC"
    )


def get_product(pid: int) -> dict | None:
    return query_one("SELECT * FROM products WHERE id = ?", (pid,))


def insert_product(p: dict) -> int:
    t = now()
    return execute(
        """INSERT INTO products
           (name, description, category, price, sale_price, discount_percent,
            discount_start, discount_end, sort_order, active, image_url,
            created_at, updated_at)
           VALUES (:name,:description,:category,:price,:sale_price,:discount_percent,
                   :discount_start,:discount_end,:sort_order,:active,:image_url,
                   :t,:t)""",
        {**p, "t": t},
    )


def update_product(pid: int, p: dict) -> None:
    p = {**p, "updated_at": now()}
    sets = ", ".join(f"{k} = :{k}" for k in p)
    p["id"] = pid
    with _lock:
        get_conn().execute(f"UPDATE products SET {sets} WHERE id = :id", p)
        get_conn().commit()


def delete_product(pid: int) -> None:
    execute("DELETE FROM products WHERE id = ?", (pid,))


# ---------- displays ----------
def get_displays() -> list[dict]:
    return query("SELECT * FROM displays ORDER BY id ASC")


def get_display_by_token(token: str) -> dict | None:
    return query_one("SELECT * FROM displays WHERE token = ?", (token,))


def get_display(did: int) -> dict | None:
    return query_one("SELECT * FROM displays WHERE id = ?", (did,))


def insert_display(token: str, name: str) -> int:
    return execute(
        "INSERT INTO displays (token, name, created_at) VALUES (?,?,?)",
        (token, name, now()),
    )


def update_display(did: int, fields: dict) -> None:
    sets = ", ".join(f"{k} = ?" for k in fields)
    with _lock:
        get_conn().execute(
            f"UPDATE displays SET {sets} WHERE id = ?", tuple(fields.values()) + (did,)
        )
        get_conn().commit()


def delete_display(did: int) -> None:
    execute("DELETE FROM displays WHERE id = ?", (did,))


def touch_display(token: str) -> None:
    with _lock:
        get_conn().execute(
            "UPDATE displays SET last_seen = ? WHERE token = ?", (now(), token)
        )
        get_conn().commit()


# ---------- categories ----------
def get_categories() -> list[dict]:
    return query("SELECT * FROM categories ORDER BY name ASC")


def get_category(cid: int) -> dict | None:
    return query_one("SELECT * FROM categories WHERE id = ?", (cid,))


def get_category_by_name(name: str) -> dict | None:
    return query_one("SELECT * FROM categories WHERE name = ?", (name,))


def insert_category(name: str) -> int:
    return execute("INSERT INTO categories (name) VALUES (?)", (name,))


def rename_category(cid: int, name: str) -> None:
    execute("UPDATE categories SET name = ? WHERE id = ?", (name, cid))


def reassign_products_category(from_name: str, to_name: str) -> None:
    execute("UPDATE products SET category = ? WHERE category = ?", (to_name, from_name))


def delete_category(cid: int) -> None:
    execute("DELETE FROM categories WHERE id = ?", (cid,))


# ---------- activity log ----------
def log_activity(action: str, detail: str = "") -> None:
    execute(
        "INSERT INTO activity_log (action, detail, created_at) VALUES (?,?,?)",
        (action, detail, now()),
    )


def get_activity(limit: int = 20) -> list[dict]:
    return query("SELECT * FROM activity_log ORDER BY id DESC LIMIT ?", (limit,))


# ---------- settings ----------
DEFAULT_SETTINGS = {
    "shop_name": "فروشگاه نمونه",
    "logo_url": "",
    "background_color": "#0f172a",
    "accent_color": "#f59e0b",
    "duration_seconds": 10,
    "show_mode": "slide",          # slide | grid
    "sync_mode": "independent",    # independent | synchronized
}


def get_settings() -> dict:
    row = query_one("SELECT value FROM settings WHERE key = 'app'")
    data = json.loads(row["value"]) if row else {}
    return {**DEFAULT_SETTINGS, **data}


def save_settings(data: dict) -> None:
    merged = {**get_settings(), **data}
    with _lock:
        get_conn().execute(
            "INSERT INTO settings (key, value) VALUES ('app', ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (json.dumps(merged, ensure_ascii=False),),
        )
        get_conn().commit()


# ---------- shared slideshow state (synchronized mode) ----------
# Stored server-side so every TV — even one opened later or refreshed —
# joins the same slide the others are on. Kept in the settings store.

def get_slide_state() -> dict:
    """Returns {'index': int, 'next_flip': epoch seconds} — defaults if missing."""
    row = query_one("SELECT value FROM settings WHERE key = 'slide_state'")
    if not row:
        return {"index": 0, "next_flip": 0}
    try:
        return json.loads(row["value"])
    except Exception:
        return {"index": 0, "next_flip": 0}


def save_slide_state(index: int, next_flip: int) -> None:
    with _lock:
        get_conn().execute(
            "INSERT INTO settings (key, value) VALUES ('slide_state', ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (json.dumps({"index": index, "next_flip": next_flip}),),
        )
        get_conn().commit()


# ---------- images ----------
def insert_image(url: str, filename: str) -> None:
    execute(
        "INSERT OR IGNORE INTO images (url, filename, created_at) VALUES (?,?,?)",
        (url, filename, now()),
    )


def get_images() -> list[dict]:
    return query("SELECT * FROM images ORDER BY id DESC")


def get_image(iid: int) -> dict | None:
    return query_one("SELECT * FROM images WHERE id = ?", (iid,))


def delete_image(iid: int) -> None:
    execute("DELETE FROM images WHERE id = ?", (iid,))
