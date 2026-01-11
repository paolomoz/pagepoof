#!/usr/bin/env node
/**
 * Import scraped data to D1 database
 * Generates SQL statements for wrangler d1 execute
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_FILE = path.join(__dirname, 'import.sql');

// Escape SQL strings
function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str !== 'string') str = String(str);
  return `'${str.replace(/'/g, "''")}'`;
}

// Generate product SQL
function generateProductSQL(products) {
  const statements = [];

  for (const p of products) {
    // Generate SKU from slug (uppercase, clean)
    const sku = p.slug.toUpperCase().replace(/-/g, '_').substring(0, 50);
    const name = escapeSQL(p.name);
    const series = escapeSQL(p.series || 'Other');
    const price = p.price || 'NULL';
    const description = escapeSQL(p.description || '');
    const features = escapeSQL(JSON.stringify(p.features || []));
    const specs = escapeSQL(JSON.stringify(p.specs || {}));

    statements.push(`INSERT OR REPLACE INTO products (sku, name, series, price, description, features, specs) VALUES (${escapeSQL(sku)}, ${name}, ${series}, ${price}, ${description}, ${features}, ${specs});`);

    // Add images if any
    if (p.images && p.images.length > 0) {
      for (let i = 0; i < p.images.length; i++) {
        statements.push(`INSERT OR REPLACE INTO product_images (sku, image_url, sort_order) VALUES (${escapeSQL(sku)}, ${escapeSQL(p.images[i])}, ${i});`);
      }
    }
  }

  return statements;
}

// Generate recipe SQL
function generateRecipeSQL(recipes) {
  const statements = [];

  for (const r of recipes) {
    const slug = escapeSQL(r.slug.substring(0, 100));
    const title = escapeSQL(r.title || '');
    const description = escapeSQL(r.description || '');
    const ingredients = escapeSQL(JSON.stringify(r.ingredients || []));
    const instructions = escapeSQL(JSON.stringify(r.instructions || []));
    const prepTime = r.prepTime || 'NULL';
    const servings = escapeSQL(r.servings || '');
    const dietaryTags = escapeSQL(JSON.stringify(r.dietary || []));
    const categories = escapeSQL(r.categories ? r.categories.join(', ') : '');

    statements.push(`INSERT OR REPLACE INTO recipes (slug, title, description, ingredients, instructions, prep_time_minutes, servings, dietary_tags, categories) VALUES (${slug}, ${title}, ${description}, ${ingredients}, ${instructions}, ${prepTime}, ${servings}, ${dietaryTags}, ${categories});`);
  }

  return statements;
}

// Main
async function main() {
  console.log('Importing scraped data to D1...\n');

  const statements = [];

  // Load and process products
  const productsPath = path.join(DATA_DIR, 'products.json');
  if (fs.existsSync(productsPath)) {
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    console.log(`Processing ${products.length} products...`);
    statements.push(...generateProductSQL(products));
  }

  // Load and process recipes
  const recipesPath = path.join(DATA_DIR, 'recipes.json');
  if (fs.existsSync(recipesPath)) {
    const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf-8'));
    console.log(`Processing ${recipes.length} recipes...`);
    statements.push(...generateRecipeSQL(recipes));
  }

  // Write SQL file
  const sql = statements.join('\n');
  fs.writeFileSync(OUTPUT_FILE, sql);
  console.log(`\nGenerated ${statements.length} SQL statements`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log('\nTo import to D1, run:');
  console.log(`  cd /Users/paolo/excat/pagepoof/workers/pagepoof-api`);
  console.log(`  wrangler d1 execute pagepoof-db --remote --file=../../scripts/scrape/import.sql`);
}

main().catch(console.error);
