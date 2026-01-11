#!/usr/bin/env node
/**
 * Vitamix Website Scraper
 * Fetches products, recipes, and content from vitamix.com for RAG indexing
 */

const fs = require('fs');
const path = require('path');

const SITEMAPS = {
  main: 'https://www.vitamix.com/us/en_us.sitemap.xml',
  products: 'https://www.vitamix.com/us/en_us/products/sitemap.xml',
  magento: 'https://www.vitamix.com/media/en_us.magento_sitemap.xml',
};

const OUTPUT_DIR = path.join(__dirname, 'data');
const DELAY_MS = 500; // Rate limiting

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Fetch with retry and rate limiting
 */
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      console.error(`  Retry ${i + 1}/${retries} for ${url}: ${error.message}`);
      if (i === retries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse sitemap XML and extract URLs
 */
function parseSitemap(xml) {
  const urls = [];
  const regex = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

/**
 * Extract product data from HTML
 */
function extractProduct(html, url) {
  const product = {
    url,
    slug: url.split('/products/')[1] || '',
    name: '',
    series: '',
    price: null,
    description: '',
    features: [],
    specs: {},
    images: [],
  };

  // Extract title
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                     html.match(/<title>([^<|]+)/i);
  if (titleMatch) {
    product.name = titleMatch[1].trim().replace(/\s*\|.*$/, '');
  }

  // Extract price
  const priceMatch = html.match(/\$[\d,]+\.?\d*/);
  if (priceMatch) {
    product.price = parseFloat(priceMatch[0].replace(/[$,]/g, ''));
  }

  // Extract description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
                    html.match(/<meta\s+content="([^"]+)"\s+name="description"/i);
  if (descMatch) {
    product.description = descMatch[1].trim();
  }

  // Extract series from URL or content
  if (url.includes('ascent-x')) product.series = 'Ascent X';
  else if (url.includes('ascent')) product.series = 'Ascent';
  else if (url.includes('explorian') || url.includes('e310') || url.includes('e320')) product.series = 'Explorian';
  else if (url.includes('propel')) product.series = 'Propel';
  else if (url.includes('professional') || url.includes('pro-')) product.series = 'Professional';
  else if (url.includes('venturist')) product.series = 'Venturist';
  else if (url.includes('5200') || url.includes('legacy')) product.series = 'Legacy';
  else if (url.includes('reconditioned')) product.series = 'Certified Reconditioned';
  else product.series = 'Accessories';

  // Extract images
  const imgRegex = /src="([^"]+(?:\.jpg|\.png|\.webp)[^"]*)"/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const imgUrl = imgMatch[1];
    if (imgUrl.includes('product') || imgUrl.includes('vitamix')) {
      product.images.push(imgUrl.startsWith('http') ? imgUrl : `https://www.vitamix.com${imgUrl}`);
    }
  }
  product.images = [...new Set(product.images)].slice(0, 5);

  // Extract features from lists
  const featureRegex = /<li[^>]*>([^<]{10,100})<\/li>/gi;
  let featureMatch;
  while ((featureMatch = featureRegex.exec(html)) !== null) {
    const feature = featureMatch[1].trim();
    if (feature.length > 10 && feature.length < 100 && !feature.includes('<')) {
      product.features.push(feature);
    }
  }
  product.features = [...new Set(product.features)].slice(0, 10);

  return product;
}

/**
 * Extract recipe data from HTML
 */
function extractRecipe(html, url) {
  const recipe = {
    url,
    slug: url.split('/recipes/')[1] || '',
    title: '',
    description: '',
    prepTime: null,
    servings: '',
    ingredients: [],
    instructions: [],
    dietary: [],
    categories: [],
    image: '',
  };

  // Extract title
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                     html.match(/<title>([^<|]+)/i);
  if (titleMatch) {
    recipe.title = titleMatch[1].trim().replace(/\s*\|.*$/, '').replace(/\s*Recipe$/, '');
  }

  // Extract description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
                    html.match(/<meta\s+content="([^"]+)"\s+name="description"/i);
  if (descMatch) {
    recipe.description = descMatch[1].trim();
  }

  // Extract prep time
  const timeMatch = html.match(/(\d+)\s*(?:min|minute)/i);
  if (timeMatch) {
    recipe.prepTime = parseInt(timeMatch[1]);
  }

  // Extract servings
  const servingsMatch = html.match(/(?:serves?|servings?|yield)[:\s]*(\d+(?:\s*-\s*\d+)?(?:\s*\w+)?)/i);
  if (servingsMatch) {
    recipe.servings = servingsMatch[1].trim();
  }

  // Extract ingredients (look for ingredient-related patterns)
  const ingredientRegex = /<li[^>]*class="[^"]*ingredient[^"]*"[^>]*>([^<]+)<\/li>/gi;
  let ingMatch;
  while ((ingMatch = ingredientRegex.exec(html)) !== null) {
    recipe.ingredients.push(ingMatch[1].trim());
  }

  // Fallback: extract from structured data
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      if (jsonLd.recipeIngredient) {
        recipe.ingredients = jsonLd.recipeIngredient;
      }
      if (jsonLd.recipeInstructions) {
        recipe.instructions = jsonLd.recipeInstructions.map(i =>
          typeof i === 'string' ? i : i.text
        ).filter(Boolean);
      }
      if (jsonLd.prepTime) {
        const ptMatch = jsonLd.prepTime.match(/PT(\d+)M/);
        if (ptMatch) recipe.prepTime = parseInt(ptMatch[1]);
      }
      if (jsonLd.recipeYield) {
        recipe.servings = jsonLd.recipeYield;
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  // Extract main image
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (ogImageMatch) {
    recipe.image = ogImageMatch[1];
  }

  // Infer dietary tags from content
  const lowerHtml = html.toLowerCase();
  if (lowerHtml.includes('vegan')) recipe.dietary.push('vegan');
  if (lowerHtml.includes('vegetarian')) recipe.dietary.push('vegetarian');
  if (lowerHtml.includes('gluten-free') || lowerHtml.includes('gluten free')) recipe.dietary.push('gluten-free');
  if (lowerHtml.includes('dairy-free') || lowerHtml.includes('dairy free')) recipe.dietary.push('dairy-free');
  if (lowerHtml.includes('keto')) recipe.dietary.push('keto');
  if (lowerHtml.includes('paleo')) recipe.dietary.push('paleo');

  // Infer categories from URL and content
  if (url.includes('smoothie') || lowerHtml.includes('smoothie')) recipe.categories.push('smoothies');
  if (url.includes('soup') || lowerHtml.includes('soup')) recipe.categories.push('soups');
  if (url.includes('sauce') || lowerHtml.includes('sauce')) recipe.categories.push('sauces');
  if (url.includes('dessert') || lowerHtml.includes('dessert') || lowerHtml.includes('ice cream')) recipe.categories.push('desserts');
  if (url.includes('cocktail') || url.includes('margarita') || lowerHtml.includes('cocktail')) recipe.categories.push('beverages');
  if (url.includes('butter') || lowerHtml.includes('nut butter')) recipe.categories.push('nut-butters');
  if (url.includes('dip') || url.includes('hummus') || lowerHtml.includes('dip')) recipe.categories.push('dips');
  if (url.includes('breakfast') || lowerHtml.includes('breakfast')) recipe.categories.push('breakfast');
  if (url.includes('bowl')) recipe.categories.push('bowls');

  return recipe;
}

/**
 * Scrape all products
 */
async function scrapeProducts() {
  console.log('\\n=== Scraping Products ===');

  // Fetch product sitemap
  console.log('Fetching product sitemap...');
  const sitemapXml = await fetchWithRetry(SITEMAPS.products);
  const productUrls = parseSitemap(sitemapXml);
  console.log(`Found ${productUrls.length} product URLs`);

  const products = [];

  for (let i = 0; i < productUrls.length; i++) {
    const url = productUrls[i];
    console.log(`[${i + 1}/${productUrls.length}] Scraping: ${url}`);

    try {
      const html = await fetchWithRetry(url);
      const product = extractProduct(html, url);

      if (product.name) {
        products.push(product);
        console.log(`  ✓ ${product.name} (${product.series}) - $${product.price || 'N/A'}`);
      } else {
        console.log(`  ⚠ No product name found`);
      }
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }

    await sleep(DELAY_MS);
  }

  // Save products
  const outputPath = path.join(OUTPUT_DIR, 'products.json');
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
  console.log(`\\nSaved ${products.length} products to ${outputPath}`);

  return products;
}

/**
 * Scrape all recipes
 */
async function scrapeRecipes() {
  console.log('\\n=== Scraping Recipes ===');

  // First, get recipe listing page to find all recipes
  console.log('Fetching recipe index...');
  const indexHtml = await fetchWithRetry('https://www.vitamix.com/us/en_us/recipes');

  // Extract recipe URLs from the listing page
  const recipeUrls = new Set();
  const hrefRegex = /href="(\/us\/en_us\/recipes\/[^"]+)"/gi;
  let match;
  while ((match = hrefRegex.exec(indexHtml)) !== null) {
    const url = `https://www.vitamix.com${match[1]}`;
    if (!url.includes('.css') && !url.includes('.js')) {
      recipeUrls.add(url);
    }
  }

  // Also check main sitemap for recipes
  console.log('Checking main sitemap for more recipes...');
  const mainSitemap = await fetchWithRetry(SITEMAPS.main);
  const allUrls = parseSitemap(mainSitemap);
  for (const url of allUrls) {
    if (url.includes('/recipes/') && !url.endsWith('/recipes/') && !url.endsWith('/recipes')) {
      recipeUrls.add(url);
    }
  }

  const recipeUrlList = [...recipeUrls];
  console.log(`Found ${recipeUrlList.length} recipe URLs`);

  const recipes = [];

  for (let i = 0; i < recipeUrlList.length; i++) {
    const url = recipeUrlList[i];
    console.log(`[${i + 1}/${recipeUrlList.length}] Scraping: ${url}`);

    try {
      const html = await fetchWithRetry(url);
      const recipe = extractRecipe(html, url);

      if (recipe.title) {
        recipes.push(recipe);
        console.log(`  ✓ ${recipe.title} (${recipe.categories.join(', ') || 'uncategorized'})`);
      } else {
        console.log(`  ⚠ No recipe title found`);
      }
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }

    await sleep(DELAY_MS);
  }

  // Save recipes
  const outputPath = path.join(OUTPUT_DIR, 'recipes.json');
  fs.writeFileSync(outputPath, JSON.stringify(recipes, null, 2));
  console.log(`\\nSaved ${recipes.length} recipes to ${outputPath}`);

  return recipes;
}

/**
 * Scrape FAQ and support content
 */
async function scrapeFaqs() {
  console.log('\\n=== Scraping FAQs ===');

  const faqUrls = [
    'https://www.vitamix.com/us/en_us/support/',
    'https://www.vitamix.com/us/en_us/support/product-support/',
    'https://www.vitamix.com/us/en_us/support/order-support/',
  ];

  const faqs = [];

  for (const url of faqUrls) {
    console.log(`Scraping: ${url}`);
    try {
      const html = await fetchWithRetry(url);

      // Extract FAQ-like Q&A patterns
      const qaRegex = /<(?:h[2-4]|strong)[^>]*>([^<]+\?)<\/(?:h[2-4]|strong)>[\s\S]*?<p[^>]*>([^<]+)/gi;
      let match;
      while ((match = qaRegex.exec(html)) !== null) {
        faqs.push({
          question: match[1].trim(),
          answer: match[2].trim(),
          category: url.includes('product') ? 'Products' : url.includes('order') ? 'Orders' : 'General',
          url,
        });
      }
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }
    await sleep(DELAY_MS);
  }

  // Save FAQs
  const outputPath = path.join(OUTPUT_DIR, 'faqs.json');
  fs.writeFileSync(outputPath, JSON.stringify(faqs, null, 2));
  console.log(`\\nSaved ${faqs.length} FAQs to ${outputPath}`);

  return faqs;
}

/**
 * Main entry point
 */
async function main() {
  console.log('🍹 Vitamix Content Scraper');
  console.log('==========================\\n');

  const startTime = Date.now();

  try {
    const products = await scrapeProducts();
    const recipes = await scrapeRecipes();
    const faqs = await scrapeFaqs();

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\\n==========================');
    console.log('✅ Scraping Complete!');
    console.log(`   Products: ${products.length}`);
    console.log(`   Recipes: ${recipes.length}`);
    console.log(`   FAQs: ${faqs.length}`);
    console.log(`   Time: ${elapsed} minutes`);
    console.log('\\nData saved to:', OUTPUT_DIR);
  } catch (error) {
    console.error('\\n❌ Scraping failed:', error);
    process.exit(1);
  }
}

main();
