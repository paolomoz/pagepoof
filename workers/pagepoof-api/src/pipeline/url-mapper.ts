/**
 * URL Mapper
 * Corrects LLM-generated URLs to match actual product/recipe slugs
 */

import type { Logger } from '../lib/logger';

export interface UrlCatalog {
  products: Map<string, { sku: string; name: string }>;
  recipes: Map<string, { slug: string; title: string }>;
}

/**
 * Build URL catalog from database results
 */
export function buildUrlCatalog(
  products: Array<{ sku: string; name: string }>,
  recipes: Array<{ slug: string; title: string }>
): UrlCatalog {
  const productMap = new Map<string, { sku: string; name: string }>();
  const recipeMap = new Map<string, { slug: string; title: string }>();

  // Index products by SKU (exact) and normalized name (fuzzy)
  for (const product of products) {
    const normalizedSku = normalize(product.sku);
    const normalizedName = normalize(product.name);

    productMap.set(normalizedSku, product);
    productMap.set(normalizedName, product);

    // Also index by common variations
    const simpleName = product.name.toLowerCase()
      .replace(/vitamix\s*/gi, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    if (simpleName) {
      productMap.set(simpleName, product);
    }
  }

  // Index recipes by slug (exact) and normalized title (fuzzy)
  for (const recipe of recipes) {
    // DB slugs may have trailing slashes, normalize for matching
    const cleanSlug = recipe.slug.replace(/\/+$/, '');
    const normalizedSlug = normalize(cleanSlug);
    const normalizedTitle = normalize(recipe.title);

    recipeMap.set(normalizedSlug, recipe);
    recipeMap.set(cleanSlug, recipe); // Also store clean slug for exact matches
    recipeMap.set(normalizedTitle, recipe);

    // Index by key words
    const keywords = extractKeywords(recipe.title);
    for (const keyword of keywords) {
      if (!recipeMap.has(keyword) && keyword.length > 4) {
        recipeMap.set(keyword, recipe);
      }
    }
  }

  return { products: productMap, recipes: recipeMap };
}

/**
 * Normalize text for matching
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Extract keywords from title for fuzzy matching
 */
function extractKeywords(title: string): string[] {
  const stopWords = new Set(['a', 'an', 'the', 'with', 'and', 'or', 'for', 'in', 'on', 'of', 'to']);
  return title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .map(word => word.replace(/[^a-z0-9]/g, ''));
}

/**
 * Find best matching product for a URL slug
 */
export function findProduct(
  urlSlug: string,
  catalog: UrlCatalog
): { sku: string; name: string } | null {
  const normalized = normalize(urlSlug);

  // Exact match
  if (catalog.products.has(normalized)) {
    return catalog.products.get(normalized)!;
  }

  // Try variations
  const variations = [
    urlSlug.toLowerCase(),
    urlSlug.replace(/-/g, ''),
    urlSlug.replace(/_/g, ''),
    urlSlug.replace(/vitamix-?/gi, ''),
  ];

  for (const variant of variations) {
    const normalizedVariant = normalize(variant);
    if (catalog.products.has(normalizedVariant)) {
      return catalog.products.get(normalizedVariant)!;
    }
  }

  // Fuzzy match by finding best overlap
  let bestMatch: { sku: string; name: string } | null = null;
  let bestScore = 0;

  for (const [key, product] of catalog.products) {
    const score = similarity(normalized, key);
    if (score > bestScore && score > 0.6) {
      bestScore = score;
      bestMatch = product;
    }
  }

  return bestMatch;
}

/**
 * Find best matching recipe for a URL slug
 */
export function findRecipe(
  urlSlug: string,
  catalog: UrlCatalog
): { slug: string; title: string } | null {
  const normalized = normalize(urlSlug);

  // Exact match
  if (catalog.recipes.has(normalized)) {
    return catalog.recipes.get(normalized)!;
  }

  // Try variations
  const variations = [
    urlSlug.toLowerCase().replace(/-/g, ''),
    urlSlug.replace(/recipe$/i, ''),
    urlSlug.replace(/-recipe$/i, ''),
  ];

  for (const variant of variations) {
    const normalizedVariant = normalize(variant);
    if (catalog.recipes.has(normalizedVariant)) {
      return catalog.recipes.get(normalizedVariant)!;
    }
  }

  // Fuzzy match
  let bestMatch: { slug: string; title: string } | null = null;
  let bestScore = 0;

  for (const [key, recipe] of catalog.recipes) {
    const score = similarity(normalized, key);
    if (score > bestScore && score > 0.5) {
      bestScore = score;
      bestMatch = recipe;
    }
  }

  return bestMatch;
}

/**
 * Simple similarity score (Jaccard-like)
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  // Check containment
  if (a.includes(b) || b.includes(a)) {
    return 0.8;
  }

  // Character n-gram overlap
  const ngramsA = new Set(ngrams(a, 2));
  const ngramsB = new Set(ngrams(b, 2));

  const intersection = [...ngramsA].filter(x => ngramsB.has(x)).length;
  const union = new Set([...ngramsA, ...ngramsB]).size;

  return union > 0 ? intersection / union : 0;
}

/**
 * Generate character n-grams
 */
function ngrams(text: string, n: number): string[] {
  const result: string[] = [];
  for (let i = 0; i <= text.length - n; i++) {
    result.push(text.slice(i, i + n));
  }
  return result;
}

/**
 * URL correction stats
 */
export interface UrlCorrectionStats {
  productsChecked: number;
  productsCorrected: number;
  recipesChecked: number;
  recipesCorrected: number;
  corrections: Array<{
    type: 'product' | 'recipe';
    original: string;
    corrected: string;
    matchType: 'exact' | 'fuzzy' | 'none';
  }>;
}

/**
 * Correct URLs in rendered HTML
 */
export function correctUrls(html: string, catalog: UrlCatalog, logger?: Logger): string {
  const stats: UrlCorrectionStats = {
    productsChecked: 0,
    productsCorrected: 0,
    recipesChecked: 0,
    recipesCorrected: 0,
    corrections: [],
  };

  // Match product URLs: /products/something
  html = html.replace(
    /href="\/products\/([^"]+)"/g,
    (match, slug) => {
      stats.productsChecked++;
      const product = findProduct(slug, catalog);
      if (product && product.sku !== slug) {
        stats.productsCorrected++;
        stats.corrections.push({
          type: 'product',
          original: slug,
          corrected: product.sku,
          matchType: 'fuzzy',
        });
        return `href="/products/${product.sku}"`;
      } else if (product) {
        stats.corrections.push({
          type: 'product',
          original: slug,
          corrected: product.sku,
          matchType: 'exact',
        });
      }
      return match; // Keep original if no match
    }
  );

  // Match recipe URLs: /recipes/something/
  html = html.replace(
    /href="\/recipes\/([^"]+)"/g,
    (match, slug) => {
      stats.recipesChecked++;
      // Normalize slug (remove trailing slashes for lookup)
      const cleanSlug = slug.replace(/\/+$/, '');
      const recipe = findRecipe(cleanSlug, catalog);
      if (recipe) {
        // Recipe slugs in DB may include trailing slash, normalize output
        const finalSlug = recipe.slug.replace(/\/+$/, '');
        const wasChanged = finalSlug !== cleanSlug;
        if (wasChanged) {
          stats.recipesCorrected++;
        }
        stats.corrections.push({
          type: 'recipe',
          original: cleanSlug,
          corrected: finalSlug,
          matchType: wasChanged ? 'fuzzy' : 'exact',
        });
        return `href="/recipes/${finalSlug}/"`;
      }
      stats.corrections.push({
        type: 'recipe',
        original: cleanSlug,
        corrected: cleanSlug,
        matchType: 'none',
      });
      return match; // Keep original if no match
    }
  );

  // Log stats if any corrections were made
  if (logger && (stats.productsCorrected > 0 || stats.recipesCorrected > 0)) {
    logger.info('URL corrections applied', {
      productsChecked: stats.productsChecked,
      productsCorrected: stats.productsCorrected,
      recipesChecked: stats.recipesChecked,
      recipesCorrected: stats.recipesCorrected,
    });
  }

  return html;
}

/**
 * Load URL catalog from D1 database
 */
export async function loadUrlCatalog(db: D1Database): Promise<UrlCatalog> {
  const [productsResult, recipesResult] = await Promise.all([
    db.prepare('SELECT sku, name FROM products').all<{ sku: string; name: string }>(),
    db.prepare('SELECT slug, title FROM recipes').all<{ slug: string; title: string }>(),
  ]);

  return buildUrlCatalog(
    productsResult.results || [],
    recipesResult.results || []
  );
}
