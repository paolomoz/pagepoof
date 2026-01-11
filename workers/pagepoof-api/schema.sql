-- Pagepoof D1 Database Schema

-- Products table
CREATE TABLE IF NOT EXISTS products (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  series TEXT,
  price REAL,
  description TEXT,
  features TEXT, -- JSON array
  specs TEXT, -- JSON object
  created_at TEXT DEFAULT (datetime('now'))
);

-- Product images table
CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL,
  image_url TEXT NOT NULL,
  r2_path TEXT,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (sku) REFERENCES products(sku)
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  ingredients TEXT, -- JSON array
  instructions TEXT, -- JSON array
  prep_time_minutes INTEGER,
  servings TEXT,
  dietary_tags TEXT, -- JSON array
  categories TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- FAQs table
CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  tags TEXT
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  tags TEXT,
  view_count INTEGER DEFAULT 0
);

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_products_series ON products(series);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);
CREATE INDEX IF NOT EXISTS idx_product_images_sku ON product_images(sku);
