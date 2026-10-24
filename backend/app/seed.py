"""Seed script: creates the admin account and a few clearly-labeled
test products with generated SVG sample images.

Run:  python -m app.seed
"""

from . import database as db
from .config import ADMIN_USERNAME, ADMIN_PASSWORD, MEDIA_DIR
from .security import hash_password

SAMPLE_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="{c1}"/><stop offset="100%" stop-color="{c2}"/>
  </linearGradient></defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <circle cx="400" cy="300" r="180" fill="#ffffff22"/>
  <text x="400" y="290" font-size="150" text-anchor="middle" fill="#fff">{emoji}</text>
  <text x="400" y="400" font-size="44" text-anchor="middle" fill="#ffffffcc" font-family="sans-serif">{label}</text>
  <text x="400" y="470" font-size="26" text-anchor="middle" fill="#ffffff88" font-family="sans-serif">تصویر آزمایشی</text>
</svg>
"""

SAMPLES = [
    # name, desc, category, price, sale, emoji, c1, c2
    ("قهوه اسپرسو ۲۵۰ گرمی", "فرآوری‌شده از دانه‌های تازه برشته‌کاری تخصصی", "نوشیدنی", 320000, 256000, "☕", "#6b3e1e", "#b0773a"),
    ("پنیر لیقوان ۴۰۰ گرمی", "پنیر سنتی لیقوان با کیفیت ممتاز", "لبنیات", 185000, 148000, "🧀", "#2c5f2d", "#97bc62"),
    ("روغن زیتون فرابکر ۱ لیتری", "روغن زیتون بکر با اسید کمتر از سی‌دهم درصد", "خواروبار", 450000, 385000, "🫒", "#3a5a40", "#a3b18a"),
    ("کاور کوله‌پشتی ورزشی", "کاور ضدآب مناسب کوله ۴۰ لیتری", "لوازم ورزشی", 260000, None, "🎒", "#1d3557", "#457b9d"),
    ("بستنی سنتی خانواده", "بستنی سنتی با خامه و پسته", "لبنیات", 120000, 96000, "🍨", "#500724", "#be123c"),
    ("عسل کنار طبیعی ۹۰۰ گرمی", "برداشت از زاغه‌های طبیعی و فرآوری محدود", "خواروبار", 780000, 660000, "🍯", "#7c2d12", "#f59e0b"),
]


def run() -> None:
    if len(ADMIN_PASSWORD) < 12:
        raise RuntimeError("Set ADMIN_PASSWORD to a strong password before seeding")
    db.create_user(ADMIN_USERNAME, hash_password(ADMIN_PASSWORD))
    prod = db.get_products()
    if prod:
        print("Sample data already present, skipping.")
        return
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    for i, (name, desc, cat, price, sale, emoji, c1, c2) in enumerate(SAMPLES):
        fname = f"sample-{i + 1}.svg"
        (MEDIA_DIR / fname).write_bytes(
            SAMPLE_TEMPLATE.format(c1=c1, c2=c2, emoji=emoji, label=name).encode("utf-8")
        )
        db.insert_product({
            "name": name, "description": desc, "category": cat,
            "price": price, "sale_price": sale,
            "discount_percent": round((price - sale) * 100 / price) if sale else 0,
            "discount_start": None, "discount_end": None,
            "sort_order": i, "active": 1,
            "image_url": f"/media/{fname}",
        })
    print("Admin account and sample products created.")
    print(f"Admin account created for {ADMIN_USERNAME}.")


if __name__ == "__main__":
    run()
