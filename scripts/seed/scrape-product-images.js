/**
 * Scrape Product Images Script
 * Uses known Vitamix image URL patterns to download product images
 *
 * This script creates a manifest of product images from vitamix.com
 * Run with: node scripts/seed/scrape-product-images.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Product data from seed-products.js
const { products } = require('./seed-products.js');

const OUTPUT_DIR = path.join(__dirname, '../../assets/products');
const BASE_URL = 'https://www.vitamix.com';

// Known product image mappings discovered through browser inspection
// Format: sku -> array of media hashes (primary image first)
const productImageMappings = {
  'ascent-x5': [
    'media_cf7b1b7a0732b25592404b6342ae9bbac946514c.png',  // Main product
    'media_54a6f24682f18471b71567c5e7ef08223b38bd38.png',  // Side view
    'media_388e2062bc515d20e36d6e60b635d68121a44cfb.png',  // Back view
  ],
  // Add more as discovered...
};

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(filepath);
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function downloadProductImages() {
  console.log('=== Product Image Downloader ===\n');
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  const results = [];

  for (const sku of Object.keys(productImageMappings)) {
    const product = products.find(p => p.sku === sku);
    if (!product) {
      console.log(`Product not found: ${sku}`);
      continue;
    }

    console.log(`Processing: ${product.name} (${sku})`);
    const images = productImageMappings[sku];
    const productImages = [];

    for (let i = 0; i < images.length; i++) {
      const mediaFile = images[i];
      const ext = mediaFile.split('.').pop();
      const filename = `${sku}-${i + 1}.${ext}`;
      const filepath = path.join(OUTPUT_DIR, filename);

      // Construct high-res URL
      const imageUrl = `${BASE_URL}/us/en_us/products/${mediaFile}?width=2000&format=${ext}&optimize=medium`;

      try {
        console.log(`  Downloading: ${filename}`);
        await downloadFile(imageUrl, filepath);
        productImages.push({
          filename,
          url: `/assets/products/${filename}`,
          originalUrl: imageUrl,
          type: i === 0 ? 'primary' : 'gallery'
        });
      } catch (error) {
        console.log(`  Failed: ${error.message}`);
      }
    }

    results.push({
      sku,
      name: product.name,
      images: productImages,
      status: productImages.length > 0 ? 'success' : 'failed'
    });

    console.log('');
  }

  // Write results JSON
  const manifestPath = path.join(OUTPUT_DIR, 'image-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2));
  console.log(`\nImage manifest: ${manifestPath}`);

  // Generate SQL for product_images table
  let sql = '-- Auto-generated product images data\n\n';
  for (const result of results) {
    for (const img of result.images) {
      const altText = result.name.replace(/'/g, "''");
      sql += `INSERT OR REPLACE INTO product_images (product_sku, image_url, image_type, alt_text) VALUES ('${result.sku}', '${img.url}', '${img.type}', '${altText}');\n`;
    }
  }

  const sqlPath = path.join(__dirname, 'product-images.sql');
  fs.writeFileSync(sqlPath, sql);
  console.log(`SQL file: ${sqlPath}`);

  // Summary
  console.log(`\n=== Summary ===`);
  console.log(`Products with images: ${results.filter(r => r.status === 'success').length}`);
  console.log(`Products without mappings: ${products.length - Object.keys(productImageMappings).length}`);
}

// Run if executed directly
if (require.main === module) {
  downloadProductImages().catch(console.error);
}

module.exports = { downloadProductImages, productImageMappings };
