-- Pagepoof D1 Database Schema
-- Product data for 100% accuracy

-- Products table
CREATE TABLE IF NOT EXISTS products (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  series TEXT,           -- Ascent, Ascent X, Explorian, Legacy, Propel, Venturist
  model TEXT,            -- A3500, E320, etc.
  price REAL,
  regular_price REAL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  short_description TEXT,
  features TEXT,         -- JSON array of feature strings
  specs TEXT,            -- JSON object of specifications
  warranty_years INTEGER,
  in_stock BOOLEAN DEFAULT 1,
  url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Product images table (high-fidelity official images)
CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL REFERENCES products(sku),
  image_url TEXT NOT NULL,       -- Original URL from vitamix.com
  r2_path TEXT,                  -- Path in R2 bucket after download
  image_type TEXT,               -- 'hero', 'gallery', 'lifestyle', 'detail', 'swatch'
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Product variants (colors, sizes)
CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL REFERENCES products(sku),
  variant_sku TEXT,
  color TEXT,
  color_hex TEXT,
  color_name TEXT,
  price REAL,
  in_stock BOOLEAN DEFAULT 1,
  image_url TEXT,
  r2_path TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Product features for comparison (canonical from vitamix.com/catalog/product_compare/)
CREATE TABLE IF NOT EXISTS product_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  feature_value TEXT,           -- '✓', '—', or specific text like '10 Year'
  feature_category TEXT,        -- 'blender_features', 'attachments', 'techniques'
  sort_order INTEGER DEFAULT 0,
  UNIQUE(series, feature_name)
);

-- Container compatibility matrix
CREATE TABLE IF NOT EXISTS container_compatibility (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series TEXT NOT NULL,
  container_name TEXT NOT NULL,
  container_sku TEXT,
  compatible BOOLEAN,
  notes TEXT,                   -- e.g., "Propel 750 only", "Some models"
  UNIQUE(series, container_name)
);

-- Attachment compatibility matrix
CREATE TABLE IF NOT EXISTS attachment_compatibility (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series TEXT NOT NULL,
  attachment_name TEXT NOT NULL,
  attachment_sku TEXT,
  compatible BOOLEAN,
  notes TEXT,
  UNIQUE(series, attachment_name)
);

-- Videos table (Vitamix YouTube channel)
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,        -- YouTube video ID
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  published_at TEXT,
  view_count INTEGER,
  like_count INTEGER,
  categories TEXT,            -- JSON array: ['recipe', 'product', 'tutorial', 'testimonial', 'tips']
  products_mentioned TEXT,    -- JSON array of SKUs
  recipes_mentioned TEXT,     -- JSON array of recipe names
  tags TEXT,                  -- JSON array of tags
  transcript TEXT,            -- Video transcript if available
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  total_time_minutes INTEGER,
  servings TEXT,
  difficulty TEXT,            -- 'easy', 'medium', 'hard'
  ingredients TEXT,           -- JSON array
  instructions TEXT,          -- JSON array of steps
  nutrition TEXT,             -- JSON object
  tips TEXT,                  -- JSON array
  image_url TEXT,
  r2_path TEXT,
  categories TEXT,            -- JSON array: ['smoothie', 'soup', 'dessert', etc.]
  dietary_tags TEXT,          -- JSON array: ['vegan', 'gluten-free', 'keto', etc.]
  source_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- FAQs table
CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,              -- 'buying-guide', 'general', 'features', 'recipes', 'maintenance', 'accessories', 'warranty', 'troubleshooting'
  products_mentioned TEXT,    -- JSON array of SKUs
  tags TEXT,                  -- JSON array of tags
  source_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_series ON products(series);
CREATE INDEX IF NOT EXISTS idx_products_model ON products(model);
CREATE INDEX IF NOT EXISTS idx_product_images_sku ON product_images(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_features_series ON product_features(series);
CREATE INDEX IF NOT EXISTS idx_videos_categories ON videos(categories);
CREATE INDEX IF NOT EXISTS idx_recipes_categories ON recipes(categories);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
