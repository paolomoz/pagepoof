/**
 * RAG Retriever
 * Fetches relevant context from D1 database and Vectorize
 */

import type { ClassificationResult, RagFilters } from './classifier';
import type { RagContext } from './generator';
import type { UserProfile } from '../lib/session';

export interface Env {
  DB: D1Database;
  VECTORIZE?: VectorizeIndex;
  AI?: Ai;
}

export interface RetrievalOptions {
  userProfile?: UserProfile;
}

// Term expansion for semantic matching
// Maps conversational terms to FAQ-friendly terms
const TERM_EXPANSIONS: Record<string, string[]> = {
  // Accessibility terms
  arthritis: ['easy', 'grip', 'ergonomic', 'accessibility', 'senior', 'mobility'],
  grip: ['easy', 'handle', 'ergonomic', 'comfortable', 'accessibility'],
  mobility: ['easy', 'accessibility', 'senior', 'ergonomic'],
  elderly: ['senior', 'easy', 'simple', 'accessibility'],
  senior: ['easy', 'simple', 'accessibility', 'ergonomic'],
  disabled: ['accessibility', 'easy', 'ergonomic'],
  // Noise terms
  quiet: ['noise', 'sound', 'decibel', 'silent', 'apartment'],
  noise: ['quiet', 'sound', 'decibel', 'loud', 'volume'],
  loud: ['noise', 'quiet', 'sound', 'decibel'],
  apartment: ['noise', 'quiet', 'sound', 'neighbor'],
  decibel: ['noise', 'sound', 'quiet', 'db'],
  // Medical terms
  dysphagia: ['swallow', 'puree', 'texture', 'medical', 'therapy'],
  stroke: ['medical', 'therapy', 'recovery', 'puree', 'texture'],
  swallow: ['dysphagia', 'puree', 'texture', 'safe', 'medical'],
  therapy: ['medical', 'recovery', 'dysphagia', 'puree'],
  puree: ['texture', 'smooth', 'medical', 'baby', 'soft'],
  // Budget terms
  budget: ['price', 'cost', 'affordable', 'value', 'cheap', 'save'],
  cheap: ['budget', 'affordable', 'value', 'price', 'cost'],
  afford: ['budget', 'price', 'cost', 'value', 'payment'],
  broke: ['budget', 'affordable', 'value', 'price'],
  // Allergy terms
  allergy: ['clean', 'sanitize', 'allergen', 'cross-contamination', 'separate'],
  allergies: ['clean', 'sanitize', 'allergen', 'container', 'separate'],
  allergen: ['clean', 'sanitize', 'container', 'separate'],
  // Support terms
  broken: ['warranty', 'repair', 'replace', 'return', 'service'],
  repair: ['warranty', 'service', 'fix', 'broken', 'replace'],
  warranty: ['repair', 'service', 'replace', 'return', 'claim'],
  return: ['warranty', 'refund', 'exchange', 'service'],
};

// Categories to search based on classification flags
const CLASSIFICATION_FAQ_CATEGORIES: Record<string, string[]> = {
  accessibility: ['getting-started', 'features', 'product-selection', 'ease-of-use'],
  noise: ['features', 'product-comparison', 'specifications', 'apartment-living'],
  medical: ['getting-started', 'features', 'recipes', 'safety', 'texture'],
  budget: ['pricing', 'value', 'product-comparison', 'payment', 'refurbished'],
  support: ['warranty', 'troubleshooting', 'service', 'repair', 'returns'],
};

/**
 * Retrieve relevant context based on query classification
 * Uses Vectorize for semantic search, falls back to D1 keyword search
 * Applies smart filtering based on user profile (dietary preferences, interests)
 */
export async function retrieveContext(
  query: string,
  classification: ClassificationResult,
  env: Env,
  options: RetrievalOptions = {}
): Promise<RagContext> {
  const filters = classification.ragFilters;
  const keywords = classification.keywords;
  const { userProfile } = options;

  // Log dietary filtering if active
  if (userProfile?.dietaryPreferences?.length) {
    console.log('[RAG] Applying dietary filters:', userProfile.dietaryPreferences);
  }

  // Try semantic search with Vectorize first
  if (env.VECTORIZE && env.AI) {
    try {
      const semanticResults = await retrieveWithVectorize(query, filters, env, userProfile);
      if (semanticResults.products.length > 0 || semanticResults.recipes.length > 0) {
        // Supplement with FAQs and videos from D1 keyword search
        const [faqs, videos] = await Promise.all([
          filters.collections.includes('faqs')
            ? retrieveFaqs(query, keywords, filters, env, classification)
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
      ? retrieveProducts(query, keywords, filters, env, userProfile, classification)
      : Promise.resolve([]),
    filters.collections.includes('recipes')
      ? retrieveRecipes(query, keywords, filters, env, userProfile)
      : Promise.resolve([]),
    filters.collections.includes('faqs')
      ? retrieveFaqs(query, keywords, filters, env, classification)
      : Promise.resolve([]),
    filters.collections.includes('videos')
      ? retrieveVideos(query, keywords, filters, env)
      : Promise.resolve([]),
  ]);

  return { products, recipes, faqs, videos };
}

/**
 * Semantic search using Vectorize
 * Applies dietary filtering and series boosting based on user profile
 */
async function retrieveWithVectorize(
  query: string,
  filters: RagFilters,
  env: Env,
  userProfile?: UserProfile
): Promise<RagContext> {
  // Generate embedding for query
  const embedding = await env.AI!.run('@cf/baai/bge-base-en-v1.5', {
    text: [query],
  }) as { data: number[][] };

  // Search Vectorize - get extra results for filtering
  const results = await env.VECTORIZE!.query(embedding.data[0], {
    topK: filters.topK * 3, // Get extra for dietary filtering
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

  let products = productSkus.length > 0
    ? await fetchProductsBySkus(productSkus, env)
    : [];

  // Boost preferred series if user has preferences
  if (userProfile?.preferredSeries?.length && products.length > 1) {
    products = boostPreferredSeries(products, userProfile.preferredSeries);
  }

  // Fetch full recipe details from D1
  const recipeSlugs = recipeMatches
    .slice(0, filters.topK * 2) // Get extra for dietary filtering
    .map(m => (m.metadata as Record<string, string>)?.slug)
    .filter(Boolean);

  let recipes = recipeSlugs.length > 0
    ? await fetchRecipesBySlugs(recipeSlugs, env)
    : [];

  // Filter recipes by dietary preferences
  if (userProfile?.dietaryPreferences?.length && recipes.length > 0) {
    recipes = filterByDietaryPreferences(recipes, userProfile.dietaryPreferences, filters.topK);
  } else {
    recipes = recipes.slice(0, filters.topK);
  }

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
 * Boosts preferred series based on user profile
 * Searches features for use-case matching (accessibility, noise, etc.)
 */
async function retrieveProducts(
  query: string,
  keywords: string[],
  filters: RagFilters,
  env: Env,
  userProfile?: UserProfile,
  classification?: ClassificationResult
): Promise<RagContext['products']> {
  const searchTerms = keywords.length > 0 ? keywords : query.split(/\s+/);

  // Expand terms for use-case matching
  const expandedTerms = expandSearchTerms(searchTerms);

  // Build LIKE conditions for search (include features column)
  const terms = expandedTerms.slice(0, 5);
  const likeConditions = terms
    .map((_, i) => `(name LIKE ?${i + 1} OR description LIKE ?${i + 1} OR series LIKE ?${i + 1} OR features LIKE ?${i + 1})`)
    .join(' OR ');

  const params = terms.map(t => `%${t}%`);

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
      .bind(...params, filters.topK * 3) // Get extra for scoring
      .all();

    let products = (result.results || []).map((row: Record<string, unknown>) => ({
      sku: row.sku as string,
      name: row.name as string,
      series: row.series as string,
      price: row.price as number,
      description: row.description as string,
      features: parseJsonSafe<string[]>(row.features as string, []),
      specs: parseJsonSafe<Record<string, string>>(row.specs as string, {}),
    }));

    // Score products by relevance to search terms
    products = scoreAndSortProducts(products, expandedTerms, classification);

    // Boost preferred series if user has preferences
    if (userProfile?.preferredSeries?.length && products.length > 1) {
      products = boostPreferredSeries(products, userProfile.preferredSeries);
    }

    console.log(`[RAG] Product retrieval: ${products.length} results (expanded from ${searchTerms.length} to ${expandedTerms.length} terms)`);

    return products.slice(0, filters.topK);
  } catch (error) {
    console.error('Error retrieving products:', error);
    return [];
  }
}

/**
 * Score and sort products by relevance
 * Boosts products that match use-case queries (accessibility, noise, etc.)
 */
function scoreAndSortProducts(
  products: RagContext['products'],
  terms: string[],
  classification?: ClassificationResult
): RagContext['products'] {
  const scored = products.map(product => {
    let score = 0;
    const nameLower = product.name.toLowerCase();
    const descLower = product.description.toLowerCase();
    const featuresLower = (product.features || []).join(' ').toLowerCase();

    // Score term matches
    for (const term of terms) {
      if (nameLower.includes(term)) score += 3;
      if (descLower.includes(term)) score += 2;
      if (featuresLower.includes(term)) score += 2;
    }

    // Boost based on classification
    if (classification?.isAccessibilityQuery) {
      // Boost products with accessibility-friendly features
      if (featuresLower.includes('easy') || featuresLower.includes('simple') ||
          featuresLower.includes('ergonomic') || featuresLower.includes('intuitive')) {
        score += 3;
      }
    }

    if (classification?.isNoiseQuery) {
      // Boost quieter models
      if (featuresLower.includes('quiet') || nameLower.includes('quiet')) {
        score += 5;
      }
      if (product.specs?.decibels) {
        const db = parseInt(String(product.specs.decibels), 10);
        if (db < 80) score += 3;
        if (db < 70) score += 2;
      }
    }

    if (classification?.budget !== undefined) {
      // Boost products within budget (give slight preference)
      if (product.price <= classification.budget) {
        score += 4;
      } else if (product.price <= classification.budget * 1.2) {
        // Within 20% of budget - still relevant
        score += 1;
      }
    }

    return { product, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.map(s => s.product);
}

/**
 * Retrieve recipes from D1
 * Filters by dietary preferences based on user profile
 */
async function retrieveRecipes(
  query: string,
  keywords: string[],
  filters: RagFilters,
  env: Env,
  userProfile?: UserProfile
): Promise<RagContext['recipes']> {
  const searchTerms = keywords.length > 0 ? keywords : query.split(/\s+/);
  const terms = searchTerms.slice(0, 5);

  const likeConditions = terms
    .map((_, i) => `(title LIKE ?${i + 1} OR description LIKE ?${i + 1} OR categories LIKE ?${i + 1})`)
    .join(' OR ');

  const params = terms.map(t => `%${t}%`);
  const orderParam = params.length + 1;
  const limitParam = params.length + 2;

  try {
    const result = await env.DB.prepare(`
      SELECT slug, title, description, ingredients, instructions, prep_time_minutes, servings, dietary_tags
      FROM recipes
      WHERE ${likeConditions || '1=1'}
      ORDER BY
        CASE WHEN title LIKE ?${orderParam} THEN 1 ELSE 2 END,
        prep_time_minutes ASC
      LIMIT ?${limitParam}
    `)
      .bind(...params, `%${terms[0] || ''}%`, filters.topK * 2) // Get extra for dietary filtering
      .all();

    let recipes = (result.results || []).map((row: Record<string, unknown>) => ({
      slug: row.slug as string,
      title: row.title as string,
      description: row.description as string,
      ingredients: parseJsonSafe<string[]>(row.ingredients as string, []),
      instructions: parseJsonSafe<string[]>(row.instructions as string, []),
      prepTime: row.prep_time_minutes as number,
      servings: row.servings as string,
      dietary: parseJsonSafe<string[]>(row.dietary_tags as string, []),
    }));

    // Filter by dietary preferences if user has them
    if (userProfile?.dietaryPreferences?.length && recipes.length > 0) {
      recipes = filterByDietaryPreferences(recipes, userProfile.dietaryPreferences, filters.topK);
    } else {
      recipes = recipes.slice(0, filters.topK);
    }

    return recipes;
  } catch (error) {
    console.error('Error retrieving recipes:', error);
    return [];
  }
}

/**
 * Retrieve FAQs from D1 with semantic term expansion
 * Uses classification flags to boost relevant FAQ categories
 */
async function retrieveFaqs(
  query: string,
  keywords: string[],
  filters: RagFilters,
  env: Env,
  classification?: ClassificationResult
): Promise<RagContext['faqs']> {
  const searchTerms = keywords.length > 0 ? keywords : query.split(/\s+/).filter(Boolean);

  // Expand terms using semantic mappings
  const expandedTerms = expandSearchTerms(searchTerms);

  // Get categories to prioritize based on classification flags
  const priorityCategories = getClassificationCategories(classification);

  if (expandedTerms.length === 0 && priorityCategories.length === 0) {
    // No search terms - return most recent FAQs
    try {
      const result = await env.DB.prepare(`
        SELECT question, answer, category
        FROM faqs
        LIMIT ?
      `)
        .bind(filters.topK)
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

  // Build search conditions
  const conditions: string[] = [];
  const params: string[] = [];

  // Add term-based conditions (limit to 5 expanded terms)
  const termsToSearch = expandedTerms.slice(0, 5);
  for (const term of termsToSearch) {
    const pattern = `%${term}%`;
    conditions.push('(question LIKE ? OR answer LIKE ? OR tags LIKE ?)');
    params.push(pattern, pattern, pattern);
  }

  // Add category-based conditions if we have priority categories
  if (priorityCategories.length > 0) {
    const categoryConditions = priorityCategories.map(() => 'category LIKE ?').join(' OR ');
    conditions.push(`(${categoryConditions})`);
    params.push(...priorityCategories.map(c => `%${c}%`));
  }

  if (conditions.length === 0) {
    return [];
  }

  try {
    // Get more results to allow for relevance sorting
    const result = await env.DB.prepare(`
      SELECT question, answer, category
      FROM faqs
      WHERE ${conditions.join(' OR ')}
      LIMIT ?
    `)
      .bind(...params, filters.topK * 2)
      .all();

    let faqs = (result.results || []).map((row: Record<string, unknown>) => ({
      question: row.question as string,
      answer: row.answer as string,
      category: row.category as string,
    }));

    // Score and sort FAQs by relevance
    faqs = scoreAndSortFaqs(faqs, termsToSearch, priorityCategories);

    console.log(`[RAG] FAQ retrieval: ${faqs.length} results (expanded from ${searchTerms.length} to ${expandedTerms.length} terms)`);

    return faqs.slice(0, filters.topK);
  } catch (error) {
    console.error('Error retrieving FAQs:', error);
    return [];
  }
}

/**
 * Expand search terms using semantic mappings
 */
function expandSearchTerms(terms: string[]): string[] {
  const expanded = new Set<string>();

  for (const term of terms) {
    const normalized = term.toLowerCase();
    // Add original term
    expanded.add(normalized);

    // Add expansions if available
    const expansions = TERM_EXPANSIONS[normalized];
    if (expansions) {
      for (const exp of expansions) {
        expanded.add(exp);
      }
    }
  }

  return Array.from(expanded);
}

/**
 * Get FAQ categories to prioritize based on classification flags
 */
function getClassificationCategories(classification?: ClassificationResult): string[] {
  if (!classification) return [];

  const categories: string[] = [];

  if (classification.isAccessibilityQuery) {
    categories.push(...(CLASSIFICATION_FAQ_CATEGORIES.accessibility || []));
  }
  if (classification.isNoiseQuery) {
    categories.push(...(CLASSIFICATION_FAQ_CATEGORIES.noise || []));
  }
  if (classification.isMedicalQuery) {
    categories.push(...(CLASSIFICATION_FAQ_CATEGORIES.medical || []));
  }
  if (classification.budget !== undefined) {
    categories.push(...(CLASSIFICATION_FAQ_CATEGORIES.budget || []));
  }
  if (classification.type === 'support') {
    categories.push(...(CLASSIFICATION_FAQ_CATEGORIES.support || []));
  }

  // Deduplicate
  return [...new Set(categories)];
}

/**
 * Score and sort FAQs by relevance to search terms and priority categories
 */
function scoreAndSortFaqs(
  faqs: RagContext['faqs'],
  terms: string[],
  priorityCategories: string[]
): RagContext['faqs'] {
  const scored = faqs.map(faq => {
    let score = 0;
    const questionLower = faq.question.toLowerCase();
    const answerLower = faq.answer.toLowerCase();
    const categoryLower = (faq.category || '').toLowerCase();

    // Score term matches
    for (const term of terms) {
      // Question matches are most valuable
      if (questionLower.includes(term)) score += 3;
      // Answer matches
      if (answerLower.includes(term)) score += 1;
    }

    // Boost priority categories
    for (const cat of priorityCategories) {
      if (categoryLower.includes(cat.toLowerCase())) {
        score += 2;
      }
    }

    return { faq, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.map(s => s.faq);
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
  const searchTerms = keywords.length > 0 ? keywords : query.split(/\s+/).filter(Boolean);
  const terms = searchTerms.slice(0, 3); // Limit to 3 terms for simpler queries
  const limit = Math.min(filters.topK, 5);

  if (terms.length === 0) {
    // No search terms - return most popular videos
    try {
      const result = await env.DB.prepare(`
        SELECT id, title, description, thumbnail_url
        FROM videos
        ORDER BY view_count DESC
        LIMIT ?
      `)
        .bind(limit)
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

  // Build simple OR conditions with positional params
  const conditions: string[] = [];
  const params: string[] = [];

  for (const term of terms) {
    const pattern = `%${term}%`;
    conditions.push('(title LIKE ? OR description LIKE ? OR tags LIKE ?)');
    params.push(pattern, pattern, pattern);
  }

  try {
    const result = await env.DB.prepare(`
      SELECT id, title, description, thumbnail_url
      FROM videos
      WHERE ${conditions.join(' OR ')}
      ORDER BY view_count DESC
      LIMIT ?
    `)
      .bind(...params, limit)
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

/**
 * Filter recipes by dietary preferences
 * Prioritizes recipes that match user's dietary tags
 */
function filterByDietaryPreferences(
  recipes: RagContext['recipes'],
  dietaryPreferences: string[],
  limit: number
): RagContext['recipes'] {
  // Normalize preferences for matching
  const normalizedPrefs = dietaryPreferences.map(p => p.toLowerCase());

  // Score recipes by how many dietary preferences they match
  const scored = recipes.map(recipe => {
    const recipeTags = (recipe.dietary || []).map(t => t.toLowerCase());
    let score = 0;

    for (const pref of normalizedPrefs) {
      // Check for direct match
      if (recipeTags.some(tag => tag.includes(pref) || pref.includes(tag))) {
        score += 2;
      }
      // Check for related matches
      if (pref === 'keto' && recipeTags.some(t => t.includes('low-carb') || t.includes('low carb'))) {
        score += 1;
      }
      if (pref === 'vegan' && recipeTags.some(t => t.includes('plant-based') || t.includes('dairy-free'))) {
        score += 1;
      }
      if (pref === 'gluten-free' && recipeTags.some(t => t.includes('celiac') || t.includes('gf'))) {
        score += 1;
      }
    }

    return { recipe, score };
  });

  // Sort by score (highest first), then take top results
  scored.sort((a, b) => b.score - a.score);

  // Log filtering results
  const matchCount = scored.filter(s => s.score > 0).length;
  if (matchCount > 0) {
    console.log(`[RAG] Dietary filtering: ${matchCount}/${recipes.length} recipes match preferences`);
  }

  return scored.slice(0, limit).map(s => s.recipe);
}

/**
 * Boost products from preferred series to the top
 */
function boostPreferredSeries(
  products: RagContext['products'],
  preferredSeries: string[]
): RagContext['products'] {
  // Normalize series names for matching
  const normalizedPrefs = preferredSeries.map(s => s.toLowerCase());

  // Separate preferred and other products
  const preferred: RagContext['products'] = [];
  const others: RagContext['products'] = [];

  for (const product of products) {
    const productSeries = (product.series || '').toLowerCase();
    const isPreferred = normalizedPrefs.some(pref =>
      productSeries.includes(pref) || pref.includes(productSeries)
    );

    if (isPreferred) {
      preferred.push(product);
    } else {
      others.push(product);
    }
  }

  // Log boosting results
  if (preferred.length > 0) {
    console.log(`[RAG] Series boosting: ${preferred.length} products from preferred series moved to top`);
  }

  return [...preferred, ...others];
}
