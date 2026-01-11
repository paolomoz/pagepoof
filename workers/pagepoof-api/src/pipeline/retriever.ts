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
 * Uses Vectorize for semantic search, falls back to D1 keyword search
 */
export async function retrieveContext(
  query: string,
  classification: ClassificationResult,
  env: Env
): Promise<RagContext> {
  const filters = classification.ragFilters;
  const keywords = classification.keywords;

  // Try semantic search with Vectorize first
  if (env.VECTORIZE && env.AI) {
    try {
      const semanticResults = await retrieveWithVectorize(query, filters, env);
      if (semanticResults.products.length > 0 || semanticResults.recipes.length > 0) {
        // Supplement with FAQs and videos from D1 keyword search
        const [faqs, videos] = await Promise.all([
          filters.collections.includes('faqs')
            ? retrieveFaqs(query, keywords, filters, env)
            : Promise.resolve([]),
          filters.collections.includes('videos')
            ? retrieveVideos(query, keywords, filters, env)
            : Promise.resolve([]),
        ]);
        return { ...semanticResults, faqs, videos };
      }
    } catch (error) {
      console.error('Vectorize search failed, falling back to keyword search:', error);
    }
  }

  // Fallback: Run D1 keyword retrievals in parallel
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
 * Semantic search using Vectorize
 */
async function retrieveWithVectorize(
  query: string,
  filters: RagFilters,
  env: Env
): Promise<RagContext> {
  // Generate embedding for query
  const embedding = await env.AI!.run('@cf/baai/bge-base-en-v1.5', {
    text: [query],
  }) as { data: number[][] };

  // Search Vectorize
  const results = await env.VECTORIZE!.query(embedding.data[0], {
    topK: filters.topK * 2, // Get extra to filter by type
    returnMetadata: 'all',
  });

  const matches = results.matches || [];

  // Separate products and recipes
  const productMatches = matches.filter(m => m.id.startsWith('p:'));
  const recipeMatches = matches.filter(m => m.id.startsWith('r:'));

  // Fetch full product details from D1
  const productSkus = productMatches
    .slice(0, filters.topK)
    .map(m => (m.metadata as Record<string, string>)?.sku)
    .filter(Boolean);

  const products = productSkus.length > 0
    ? await fetchProductsBySkus(productSkus, env)
    : [];

  // Fetch full recipe details from D1
  const recipeSlugs = recipeMatches
    .slice(0, filters.topK)
    .map(m => (m.metadata as Record<string, string>)?.slug)
    .filter(Boolean);

  const recipes = recipeSlugs.length > 0
    ? await fetchRecipesBySlugs(recipeSlugs, env)
    : [];

  return { products, recipes, faqs: [], videos: [] };
}

/**
 * Fetch products by SKUs from D1
 */
async function fetchProductsBySkus(
  skus: string[],
  env: Env
): Promise<RagContext['products']> {
  if (skus.length === 0) return [];

  const placeholders = skus.map(() => '?').join(',');

  try {
    const result = await env.DB.prepare(`
      SELECT sku, name, series, price, description, features, specs
      FROM products
      WHERE sku IN (${placeholders})
    `)
      .bind(...skus)
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
    console.error('Error fetching products by SKUs:', error);
    return [];
  }
}

/**
 * Fetch recipes by slugs from D1
 */
async function fetchRecipesBySlugs(
  slugs: string[],
  env: Env
): Promise<RagContext['recipes']> {
  if (slugs.length === 0) return [];

  const placeholders = slugs.map(() => '?').join(',');

  try {
    const result = await env.DB.prepare(`
      SELECT slug, title, description, ingredients, instructions, prep_time_minutes, servings, dietary_tags
      FROM recipes
      WHERE slug IN (${placeholders})
    `)
      .bind(...slugs)
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
    console.error('Error fetching recipes by slugs:', error);
    return [];
  }
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
