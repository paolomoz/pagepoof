/**
 * Scrape All Product Images
 * This script collects image URLs from all product pages and downloads them
 *
 * Run with: node scripts/seed/scrape-all-images.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Product data
const { products } = require('./seed-products.js');

const OUTPUT_DIR = path.join(__dirname, '../../assets/products');
const BASE_URL = 'https://www.vitamix.com';

// Pre-discovered image mappings from browser inspection
// Each product maps to its media file hashes
const discoveredImages = {
  'ascent-x5': {
    primary: 'media_cf7b1b7a0732b25592404b6342ae9bbac946514c.png',
    gallery: [
      'media_54a6f24682f18471b71567c5e7ef08223b38bd38.png',
      'media_388e2062bc515d20e36d6e60b635d68121a44cfb.png',
    ]
  },
  'e310': {
    primary: 'media_79c401e92378211f6591700f78c5f466b6ef5a45.jpg',
    gallery: [
      'media_c7fbe12d9c22deb5f2bbb5ee32d86a2f7dc784a2.jpg',
      'media_8c2476cda9f47b019b9a30b83d24e19e0c3a621f.jpg',
    ]
  }
};

// For products without discovered images, we'll use placeholder logic
// based on product series for fallback images
const seriesDefaultImages = {
  'Ascent X': '/us/en_us/products/media_cf7b1b7a0732b25592404b6342ae9bbac946514c.png',
  'Legacy': '/us/en_us/products/media_79c401e92378211f6591700f78c5f466b6ef5a45.jpg',
  'Explorian': '/us/en_us/products/media_79c401e92378211f6591700f78c5f466b6ef5a45.jpg',
  'Propel': '/us/en_us/products/media_79c401e92378211f6591700f78c5f466b6ef5a45.jpg',
};

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(filepath);
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
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
  console.log('=== Vitamix Product Image Downloader ===\n');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Products to process: ${products.length}\n`);

  const results = [];
  let downloadCount = 0;
  let skipCount = 0;

  for (const product of products) {
    console.log(`\nProcessing: ${product.name} (${product.sku})`);
    const productImages = [];

    // Check if we have discovered images for this product
    const discovered = discoveredImages[product.sku];

    if (discovered) {
      // Download primary image
      const primaryFile = discovered.primary;
      const ext = primaryFile.split('.').pop();
      const primaryFilename = `${product.sku}-1.${ext}`;
      const primaryPath = path.join(OUTPUT_DIR, primaryFilename);
      const primaryUrl = `${BASE_URL}/us/en_us/products/${primaryFile}?width=1200&format=${ext}&optimize=medium`;

      try {
        if (!fs.existsSync(primaryPath)) {
          console.log(`  Downloading primary: ${primaryFilename}`);
          await downloadFile(primaryUrl, primaryPath);
          downloadCount++;
        } else {
          console.log(`  Skipping (exists): ${primaryFilename}`);
          skipCount++;
        }
        productImages.push({
          filename: primaryFilename,
          url: `/assets/products/${primaryFilename}`,
          type: 'primary'
        });
      } catch (error) {
        console.log(`  Failed primary: ${error.message}`);
      }

      // Download gallery images
      for (let i = 0; i < discovered.gallery.length; i++) {
        const galleryFile = discovered.gallery[i];
        const gext = galleryFile.split('.').pop();
        const galleryFilename = `${product.sku}-${i + 2}.${gext}`;
        const galleryPath = path.join(OUTPUT_DIR, galleryFilename);
        const galleryUrl = `${BASE_URL}/us/en_us/products/${galleryFile}?width=1200&format=${gext}&optimize=medium`;

        try {
          if (!fs.existsSync(galleryPath)) {
            console.log(`  Downloading gallery: ${galleryFilename}`);
            await downloadFile(galleryUrl, galleryPath);
            downloadCount++;
          } else {
            console.log(`  Skipping (exists): ${galleryFilename}`);
            skipCount++;
          }
          productImages.push({
            filename: galleryFilename,
            url: `/assets/products/${galleryFilename}`,
            type: 'gallery'
          });
        } catch (error) {
          console.log(`  Failed gallery: ${error.message}`);
        }
      }
    } else {
      // Use series default as placeholder
      console.log(`  No discovered images - using series default`);
      const defaultMedia = seriesDefaultImages[product.series];
      if (defaultMedia) {
        const ext = defaultMedia.split('.').pop();
        const filename = `${product.sku}-1.${ext}`;
        const filepath = path.join(OUTPUT_DIR, filename);
        const url = `${BASE_URL}${defaultMedia}?width=1200&format=${ext}&optimize=medium`;

        try {
          if (!fs.existsSync(filepath)) {
            console.log(`  Downloading default: ${filename}`);
            await downloadFile(url, filepath);
            downloadCount++;
          } else {
            console.log(`  Skipping (exists): ${filename}`);
            skipCount++;
          }
          productImages.push({
            filename,
            url: `/assets/products/${filename}`,
            type: 'primary'
          });
        } catch (error) {
          console.log(`  Failed: ${error.message}`);
        }
      }
    }

    results.push({
      sku: product.sku,
      name: product.name,
      series: product.series,
      images: productImages,
      status: productImages.length > 0 ? 'success' : 'failed'
    });
  }

  // Write manifest
  const manifestPath = path.join(OUTPUT_DIR, 'image-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2));
  console.log(`\n\nManifest: ${manifestPath}`);

  // Generate SQL
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
  console.log(`Total products: ${products.length}`);
  console.log(`Images downloaded: ${downloadCount}`);
  console.log(`Images skipped (existing): ${skipCount}`);
  console.log(`Products with images: ${results.filter(r => r.status === 'success').length}`);
  console.log(`Products without images: ${results.filter(r => r.status === 'failed').length}`);
}

// Run
if (require.main === module) {
  downloadProductImages().catch(console.error);
}

module.exports = { downloadProductImages, discoveredImages };
