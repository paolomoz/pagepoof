#!/bin/bash
# Pagepoof Database Seeding Script
# Run this script to populate the D1 database with product, recipe, and video data

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "=== Pagepoof Database Seeding ==="
echo "Project directory: $PROJECT_DIR"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: wrangler CLI not found. Install with: npm install -g wrangler"
    exit 1
fi

# Generate SQL files
echo "Generating SQL files..."
cd "$PROJECT_DIR"
node scripts/seed/seed-products.js > scripts/seed/products.sql
node scripts/seed/seed-recipes.js > scripts/seed/recipes.sql
node scripts/seed/seed-videos.js > scripts/seed/videos.sql
node scripts/seed/seed-faqs.js > scripts/seed/faqs.sql

echo "Generated:"
echo "  - scripts/seed/products.sql"
echo "  - scripts/seed/recipes.sql"
echo "  - scripts/seed/videos.sql"
echo "  - scripts/seed/faqs.sql"
echo ""

# Check if D1 database exists
DB_NAME="pagepoof-db"
echo "Checking for D1 database: $DB_NAME"

if wrangler d1 list 2>/dev/null | grep -q "$DB_NAME"; then
    echo "Database $DB_NAME exists."
else
    echo "Creating D1 database: $DB_NAME"
    wrangler d1 create $DB_NAME
    echo ""
    echo "IMPORTANT: Update workers/pagepoof-api/wrangler.toml with the new database_id"
    echo ""
fi

# Run schema
echo "Running schema migration..."
wrangler d1 execute $DB_NAME --file=scripts/seed/schema.sql --remote

# Seed products
echo "Seeding products..."
wrangler d1 execute $DB_NAME --file=scripts/seed/products.sql --remote

# Seed recipes
echo "Seeding recipes..."
wrangler d1 execute $DB_NAME --file=scripts/seed/recipes.sql --remote

# Seed videos
echo "Seeding videos..."
wrangler d1 execute $DB_NAME --file=scripts/seed/videos.sql --remote

# Seed FAQs
echo "Seeding FAQs..."
wrangler d1 execute $DB_NAME --file=scripts/seed/faqs.sql --remote

# Seed product images
echo "Seeding product images..."
wrangler d1 execute $DB_NAME --file=scripts/seed/product-images.sql --remote

echo ""
echo "=== Seeding Complete ==="
echo ""
echo "To verify, run:"
echo "  wrangler d1 execute $DB_NAME --command=\"SELECT COUNT(*) FROM products;\" --remote"
echo "  wrangler d1 execute $DB_NAME --command=\"SELECT COUNT(*) FROM recipes;\" --remote"
echo "  wrangler d1 execute $DB_NAME --command=\"SELECT COUNT(*) FROM videos;\" --remote"
echo "  wrangler d1 execute $DB_NAME --command=\"SELECT COUNT(*) FROM faqs;\" --remote"
echo "  wrangler d1 execute $DB_NAME --command=\"SELECT COUNT(*) FROM product_images;\" --remote"
