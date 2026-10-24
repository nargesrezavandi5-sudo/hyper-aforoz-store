export type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  sale_price: number | null;
  discount_percent: number;
  discount_start: number | null;
  discount_end: number | null;
  sort_order: number;
  active: number;
  image_url: string;
  created_at: number;
  updated_at: number;
};

export type AppSettings = {
  shop_name: string;
  logo_url: string;
  background_color: string;
  accent_color: string;
  duration_seconds: number;
  show_mode: "slide" | "grid";
  sync_mode: "independent" | "synchronized";
};

export type TvProduct = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  sale_price: number | null;
  discount_percent: number;
  sort_order: number;
  image_url: string;
};

export type TvData = {
  settings: AppSettings;
  products: TvProduct[];
  sync: {
    server_time: number;
    duration: number;
    total: number;
    slide_index: number; // مقدار فعلی ساعت مشترک سرور (joined instantly by new/refreshed TVs)
    slide_end: number;   // پایان اسلاید جاری (epoch ms)
  };
};

export type DisplayStatus = {
  url: string; // لینک مشترک همه تلویزیون‌ها
  connected: number;
};

export type Stats = {
  total_products: number;
  active_products: number;
  discounted_products: number;
  inactive_products: number;
  upcoming_discounts: number;
  expired_discounts: number;
  displays_connected: number;
  last_sync: number;
};

export type Category = {
  id: number;
  name: string;
  product_count: number;
};

export type ActivityItem = {
  id: number;
  action: string;
  detail: string;
  created_at: number;
};
