/**
 * Download Product Images Script
 * Downloads official product images from vitamix.com
 *
 * Usage: node scripts/seed/download-images.js
 *
 * Prerequisites:
 *   npm install playwright
 *   npx playwright install chromium
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Product data from seed-products.js
const { products } = require('./seed-products.js');

const OUTPUT_DIR = path.join(__dirname, '../../assets/products');
const BASE_URL = 'https://www.vitamix.com';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

async function extractProductImages(page, productUrl) {
  const images = [];

  try {
    await page.goto(`${BASE_URL}${productUrl}`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for images to load
    await page.waitForTimeout(2000);

    // Try multiple selectors for product images
    const imageSelectors = [
      '.product-image img',
      '.pdp-image img',
      '[data-testid="product-image"] img',
      '.product-gallery img',
      '.slick-slide img',
      '.product__image img',
      'picture source',
      '.product-detail img',
      '[class*="product"] img[src*="vitamix"]',
      'img[alt*="Vitamix"]',
      'img[alt*="Ascent"]',
      'img[alt*="Explorian"]',
      'img[alt*="Propel"]',
    ];

    for (const selector of imageSelectors) {
      const elements = await page.$$(selector);
      for (const element of elements) {
        let src;
        if (selector.includes('source')) {
          src = await element.getAttribute('srcset');
          if (src) src = src.split(' ')[0]; // Get first URL from srcset
        } else {
          src = await element.getAttribute('src');
        }

        if (src && !images.includes(src)) {
          // Filter for actual product images
          if (src.includes('vitamix') || src.includes('product') || src.includes('blender')) {
            images.push(src);
          }
        }
      }
    }

    // Also try to find high-res images in data attributes
    const dataImageElements = await page.$$('[data-src], [data-zoom-image], [data-large]');
    for (const element of dataImageElements) {
      const dataSrc = await element.getAttribute('data-src') ||
                      await element.getAttribute('data-zoom-image') ||
                      await element.getAttribute('data-large');
      if (dataSrc && !images.includes(dataSrc)) {
        images.push(dataSrc);
      }
    }

  } catch (error) {
    console.error(`  Error extracting images: ${error.message}`);
  }

  return images;
}

async function downloadProductImages() {
  console.log('=== Vitamix Product Image Downloader ===\n');
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  const results = [];

  for (const product of products) {
    console.log(`Processing: ${product.name}`);
    console.log(`  URL: ${BASE_URL}${product.url}`);

    const images = await extractProductImages(page, product.url);
    console.log(`  Found ${images.length} images`);

    if (images.length === 0) {
      console.log('  WARNING: No images found');
      results.push({ sku: product.sku, images: [], status: 'no_images' });
      continue;
    }

    const productImages = [];
    for (let i = 0; i < Math.min(images.length, 5); i++) { // Max 5 images per product
      let imageUrl = images[i];

      // Make absolute URL if relative
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        imageUrl = BASE_URL + imageUrl;
      }

      const ext = imageUrl.split('?')[0].split('.').pop() || 'jpg';
      const filename = `${product.sku}-${i + 1}.${ext}`;
      const filepath = path.join(OUTPUT_DIR, filename);

      try {
        console.log(`  Downloading: ${filename}`);
        await downloadImage(imageUrl, filepath);
        productImages.push({
          filename,
          url: imageUrl,
          type: i === 0 ? 'primary' : 'gallery'
        });
      } catch (error) {
        console.log(`  Failed to download: ${error.message}`);
      }
    }

    results.push({
      sku: product.sku,
      name: product.name,
      images: productImages,
      status: productImages.length > 0 ? 'success' : 'failed'
    });

    console.log('');
  }

  await browser.close();

  // Write results JSON
  const resultsPath = path.join(OUTPUT_DIR, 'image-manifest.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nImage manifest written to: ${resultsPath}`);

  // Generate SQL for product_images table
  let sql = '-- Auto-generated product images data\n\n';
  for (const result of results) {
    for (const img of result.images) {
      sql += `INSERT OR REPLACE INTO product_images (product_sku, image_url, image_type, alt_text) VALUES ('${result.sku}', '/assets/products/${img.filename}', '${img.type}', '${result.name}');\n`;
    }
  }

  const sqlPath = path.join(__dirname, 'product-images.sql');
  fs.writeFileSync(sqlPath, sql);
  console.log(`SQL file written to: ${sqlPath}`);

  // Summary
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status !== 'success').length;
  console.log(`\n=== Summary ===`);
  console.log(`Total products: ${products.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed/No images: ${failed}`);
}

// Run if executed directly
if (require.main === module) {
  downloadProductImages().catch(console.error);
}

module.exports = { downloadProductImages };
