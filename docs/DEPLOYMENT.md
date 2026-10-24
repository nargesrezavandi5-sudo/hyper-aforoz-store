# راهنمای استقرار روی سرور آنلاین

## پیش‌نیازها
- سرور لینوکس (Ubuntu 22+) یا سرور ایرانی سازگار با Python/FastAPI
- Python 3.10+ توصیه می‌شود (کد با 3.8 هم سازگار است)
- دامنه متصل به سرور + گواهی HTTPS (nginx + certbot توصیه می‌شود)

## ساختار استقرار

```
اینترنت → nginx (HTTPS, :443) → uvicorn (127.0.0.1:8000)
                             → فایل‌های استاتیک فرانت‌اند (dist/)
```

## ۱) آماده‌سازی بک‌اند

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
nano .env
# حتماً تنظیم کنید:
#   SECRET_KEY=<حداقل ۳۲ نویسه تصادفی؛ مثلاً خروجی openssl rand -hex 32>
#   ADMIN_PASSWORD=<رمز قوی>
#   ALLOWED_ORIGINS=https://DOMAIN,
chmod 600 .env
set -a
. ./.env
set +a
python -m app.seed        # بار اول فقط
```

## سرویس systemd

`/etc/systemd/system/store-api.service`:

```ini
[Unit]
Description=Store Advertising API
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/store/backend
Environment="PATH=/var/www/store/backend/.venv/bin"
EnvironmentFile=/var/www/store/backend/.env
ExecStart=/var/www/store/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now store-api
```

## ۲) ساخت فرانت‌اند

```bash
cd frontend
npm install
npm run build       # خروجی در dist/
cp -r dist/* /var/www/store/site/
```

## ۳) nginx

```nginx
server {
    listen 443 ssl http2;
    server_name DOMAIN;
    ssl_certificate     /etc/letsencrypt/live/DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN/privkey.pem;

    # فرانت‌اند (SPA)
    root /var/www/store/site;
    index index.html;
    location / {
        try_files $uri /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 10M;
    }

    location /media/ {
        proxy_pass http://127.0.0.1:8000;
        expires 30d;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 3600s;
    }

    access_log /var/log/nginx/store.access.log;
}

server {
    listen 80;
    server_name DOMAIN;
    return 301 https://$host$request_uri;
}
```

## ۴) پایگاه‌داده و على بارگذاری فایل‌ها

پیش‌فرض SQLite است و برای سطح این پروژه (ده‌ها محصول و چند نمایشگر) کافی است؛
فایل در `backend/data/store.db` و تصاویر در `backend/media/` نگهداری می‌شوند.

برای PostgreSQL: جدول‌های پروژه در `app/database.py` تعریف شده‌اند و با پیاده‌سازی
موتور asyncpg/psycopg و جایگزینی helping functions می‌توان گسترش داد
(توضیح در انتهای فایل README بخش ۱۰).
اگر فقط نیاز به مقیاس بیشتر دارید، SQLite در حالت WAL هم فشار ناچیز تحمل می‌کند.

## ۵) پشتیبان‌گیری

```bash
# پشتیبان‌گیری روزانه از دیتابیس و تصاویر
0 3 * * * cd /var/www/store/backend && \
  sqlite3 data/store.db "VACUUM INTO 'backups/store-$(date +\%F).db'" && \
  rsync -a media/ backups/media/
```

همچنین پنل داشبورد دکمه «دریافت نسخه پشتیبان محصولات» دارد (خروجی JSON).

## ۶) اتصال تلویزیون‌ها در محیط واقعی

1. در پنل، از صفحه «نمایشگرها» نمایشگر جدید بسازید.
2. لینک را کپی کنید یا QR را روی تلویزیون اسکن کنید.
3. در مرورگر تلویزیون باز کنید؛ صفحه پس از دریافت اطلاعات تلویزیون
   را به طور خودکار به‌روز نگه می‌دارد.

فهرست ادامه در فایل TV-CONNECTION.md آمده است.
