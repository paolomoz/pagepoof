/**
 * RAG Retriever
 * Fetches relevant context from D1 database and Vectorize
 */

import type { ClassificationResult, RagFilters } from './classifier';
import type { RagContext } from './generator';

export interface Env {
  DB: D1Database;
  VECTORIZE?: VectorizeIndex;
  AI?: Ai;
}

/**
 * Retrieve relevant context based on query classification
 */
export async function retrieveContext(
  query: string,
  classification: ClassificationResult,
  env: Env
): Promise<RagContext> {
  const filters = classification.ragFilters;
  const keywords = classification.keywords;

  // Run retrievals in parallel for speed
  const [products, recipes, faqs, videos] = await Promise.all([
    filters.collections.includes('products')
      ? retrieveProducts(query, keywords, filters, env)
      : Promise.resolve([]),
    filters.collections.includes('recipes')
      ? retrieveRecipes(query, keywords, filters, env)
      : Promise.resolve([]),
    filters.collections.includes('faqs')
      ? retrieveFaqs(query, keywords, filters, env)
      : Promise.resolve([]),
    filters.collections.includes('videos')
      ? retrieveVideos(query, keywords, filters, env)
      : Promise.resolve([]),
  ]);

  return { products, recipes, faqs, videos };
}

/**
 * Retrieve products from D1
 */
async function retrieveProducts(
  query: string,
  keywords: string[],
  filters: RagFilters,
  env: Env
): Promise<RagContext['products']> {
  const searchTerms = keywords.length > 0 ? keywords : query.split(/\s+/);

  // Build LIKE conditions for search
  const likeConditions = searchTerms
    .slice(0, 5)
    .map((_, i) => `(name LIKE ?${i + 1} OR description LIKE ?${i + 1} OR series LIKE ?${i + 1})`)
    .join(' OR ');

  const params = searchTerms.slice(0, 5).map(t => `%${t}%`);

  try {
    const result = await env.DB.prepare(`
      SELECT sku, name, series, price, description, features, specs
      FROM products
      WHERE ${likeConditions || '1=1'}
      ORDER BY
        CASE WHEN series = 'Ascent X' THEN 1
             WHEN series = 'Ascent' THEN 2
             WHEN series = 'Explorian' THEN 3
             ELSE 4 END,
        price DESC
      LIMIT ?
    `)
      .bind(...params, filters.topK)
      .all();

    return (result.results || []).map((row: Record<string, unknown>) => ({
      sku: row.sku as string,
      name: row.name as string,
      series: row.series as string,
      price: row.price as number,
      description: row.description as string,
      features: parseJsonSafe(row.features as string, []),
      specs: parseJsonSafe(row.specs as string, {}),
    }));
  } catch (error) {
    console.error('Error retrieving products:', error);
    return [];
  }
}

/**
 * Retrieve recipes from D1
 */
async function retrieveRecipes(
  query: string,
  keywords: string[],
  filters: RagFilters,
  env: Env
): Promise<RagContext['recipes']> {
  const searchTerms = keywords.length > 0 ? keywords : query.split(/\s+/);

  const likeConditions = searchTerms
    .slice(0, 5)
    .map((_, i) => `(title LIKE ?${i + 1} OR description LIKE ?${i + 1} OR categories LIKE ?${i + 1})`)
    .join(' OR ');

  const params = searchTerms.slice(0, 5).map(t => `%${t}%`);

  try {
    const result = await env.DB.prepare(`
      SELECT slug, title, description, ingredients, instructions, prep_time_minutes, servings, dietary_tags
      FROM recipes
      WHERE ${likeConditions || '1=1'}
      ORDER BY
        CASE WHEN title LIKE ?6 THEN 1 ELSE 2 END,
        prep_time_minutes ASC
      LIMIT ?7
    `)
      .bind(...params, `%${searchTerms[0] || ''}%`, filters.topK)
      .all();

    return (result.results || []).map((row: Record<string, unknown>) => ({
      slug: row.slug as string,
      title: row.title as string,
      description: row.description as string,
      ingredients: parseJsonSafe(row.ingredients as string, []),
      instructions: parseJsonSafe(row.instructions as string, []),
      prepTime: row.prep_time_minutes as number,
      servings: row.servings as string,
      dietary: parseJsonSafe(row.dietary_tags as string, []),
    }));
  } catch (error) {
    console.error('Error retrieving recipes:', error);
    return [];
  }
}

/**
 * Retrieve FAQs from D1
 */
async function retrieveFaqs(
  query: string,
  keywords: string[],
  filters: RagFilters,
  env: Env
): Promise<RagContext['faqs']> {
  const searchTerms = keywords.length > 0 ? keywords : query.split(/\s+/);

  const likeConditions = searchTerms
    .slice(0, 5)
    .map((_, i) => `(question LIKE ?${i + 1} OR answer LIKE ?${i + 1} OR tags LIKE ?${i + 1})`)
    .join(' OR ');

  const params = searchTerms.slice(0, 5).map(t => `%${t}%`);

  try {
    const result = await env.DB.prepare(`
      SELECT question, answer, category
      FROM faqs
      WHERE ${likeConditions || '1=1'}
      ORDER BY
        CASE WHEN question LIKE ?6 THEN 1 ELSE 2 END
      LIMIT ?7
    `)
      .bind(...params, `%${searchTerms[0] || ''}%`, filters.topK)
      .all();

    return (result.results || []).map((row: Record<string, unknown>) => ({
      question: row.question as string,
      answer: row.answer as string,
      category: row.category as string,
    }));
  } catch (error) {
    console.error('Error retrieving FAQs:', error);
    return [];
  }
}

/**
 * Retrieve videos from D1
 */
async function retrieveVideos(
  query: string,
  keywords: string[],
  filters: RagFilters,
  env: Env
): Promise<RagContext['videos']> {
  const searchTerms = keywords.length > 0 ? keywords : query.split(/\s+/);

  const likeConditions = searchTerms
    .slice(0, 5)
    .map((_, i) => `(title LIKE ?${i + 1} OR description LIKE ?${i + 1} OR tags LIKE ?${i + 1})`)
    .join(' OR ');

  const params = searchTerms.slice(0, 5).map(t => `%${t}%`);

  try {
    const result = await env.DB.prepare(`
      SELECT id, title, description, thumbnail_url
      FROM videos
      WHERE ${likeConditions || '1=1'}
      ORDER BY
        CASE WHEN title LIKE ?6 THEN 1 ELSE 2 END,
        view_count DESC
      LIMIT ?7
    `)
      .bind(...params, `%${searchTerms[0] || ''}%`, Math.min(filters.topK, 5))
      .all();

    return (result.results || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      thumbnail: row.thumbnail_url as string,
    }));
  } catch (error) {
    console.error('Error retrieving videos:', error);
    return [];
  }
}

/**
 * Safe JSON parsing helper
 */
function parseJsonSafe<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

/**
 * Get product images from D1
 */
export async function getProductImages(
  skus: string[],
  env: Env
): Promise<Map<string, string[]>> {
  if (skus.length === 0) return new Map();

  const placeholders = skus.map(() => '?').join(',');

  try {
    const result = await env.DB.prepare(`
      SELECT sku, image_url, r2_path
      FROM product_images
      WHERE sku IN (${placeholders})
      ORDER BY sort_order ASC
    `)
      .bind(...skus)
      .all();

    const images = new Map<string, string[]>();
    for (const row of (result.results || []) as Array<{ sku: string; image_url: string; r2_path?: string }>) {
      const url = row.r2_path || row.image_url;
      if (!images.has(row.sku)) {
        images.set(row.sku, []);
      }
      images.get(row.sku)!.push(url);
    }

    return images;
  } catch (error) {
    console.error('Error retrieving product images:', error);
    return new Map();
  }
}
