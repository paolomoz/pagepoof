/**
 * Pagepoof API Worker
 * Main generation worker for AI-powered page creation
 */

import { runPipeline, createStreamWriter } from './pipeline/orchestrator';
import { classifyQuery } from './pipeline/classifier';
import { getOrCreateSession } from './lib/session';
import { trackSessionStart } from './lib/tracking';

export interface Env {
  IMAGES: R2Bucket;
  CACHE: KVNamespace;
  VECTORIZE: VectorizeIndex;
  AI: Ai;
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  GOOGLE_AI_API_KEY: string;
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
  OPENAI_API_KEY: string;
  VERTEX_PROJECT_ID: string;
  VERTEX_LOCATION: string;
  DA_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (path === '/api/stream' || path === '/api/stream/') {
        // SSE page generation endpoint
        return handleStream(request, env, ctx);
      }

      if (path === '/api/classify' && request.method === 'GET') {
        // Quick classification endpoint for testing
        return handleClassify(request, env);
      }

      if (path === '/api/persist' && request.method === 'POST') {
        // DA persistence endpoint
        return handlePersist(request, env);
      }

      if (path.startsWith('/images/')) {
        // R2 image serving
        return handleImages(request, env, path);
      }

      if (path === '/api/index' && request.method === 'POST') {
        // Index content into Vectorize
        return handleIndex(request, env);
      }

      if (path === '/api/search' && request.method === 'GET') {
        // Search Vectorize
        return handleSearch(request, env);
      }

      if (path === '/health') {
        return new Response(JSON.stringify({ status: 'ok', worker: 'pagepoof-api' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

async function handleStream(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') || '';

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Validate API keys
  if (!env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (!env.GOOGLE_AI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Create SSE stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Create stream writer wrapper
  const stream = createStreamWriter(writer, encoder);

  // Start generation in background
  ctx.waitUntil((async () => {
    try {
      await runPipeline(query, env, stream);
    } catch (error) {
      console.error('Pipeline error:', error);
      await stream.write({
        event: 'error',
        data: { message: String(error) },
      });
    } finally {
      await stream.close();
    }
  })());

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function handleClassify(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') || '';

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const classification = classifyQuery(query);

  return new Response(JSON.stringify(classification, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function handlePersist(request: Request, env: Env): Promise<Response> {
  // TODO: Implement DA persistence
  // Reference: ../vitamix-poc/workers/vitamix-recommender/src/lib/da-client.ts

  const body = await request.json() as { query: string; blocks: string; slug: string };

  return new Response(JSON.stringify({
    success: true,
    liveUrl: `https://main--pagepoof--paolomoz.aem.live/${body.slug}`,
    previewUrl: `https://main--pagepoof--paolomoz.aem.page/${body.slug}`,
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function handleImages(request: Request, env: Env, path: string): Promise<Response> {
  // Extract image path from URL: /images/{slug}/{id}.png
  const imagePath = path.replace('/images/', '');

  const object = await env.IMAGES.get(imagePath);

  if (!object) {
    return new Response('Image not found', { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

interface IndexRecord {
  id: string;
  type: 'product' | 'recipe';
  text: string;
  metadata: Record<string, string>;
}

async function handleIndex(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const records: IndexRecord[] = [];

    // Fetch all products from D1
    const products = await env.DB.prepare(
      'SELECT sku, name, series, price, description, features FROM products'
    ).all<{ sku: string; name: string; series: string; price: number; description: string; features: string }>();

    for (const p of products.results || []) {
      const text = [
        `Product: ${p.name}`,
        `Series: ${p.series}`,
        `Price: $${p.price}`,
        p.description,
        p.features ? `Features: ${JSON.parse(p.features).join(', ')}` : '',
      ].filter(Boolean).join('. ');

      // Vectorize IDs max 64 bytes - use hash for long SKUs
      const shortId = `p:${p.sku.substring(0, 50)}`;

      records.push({
        id: shortId,
        type: 'product',
        text,
        metadata: {
          sku: p.sku,
          name: p.name,
          series: p.series || '',
          price: String(p.price || 0),
        },
      });
    }

    // Fetch all recipes from D1
    const recipes = await env.DB.prepare(
      'SELECT slug, title, description, dietary_tags, categories FROM recipes'
    ).all<{ slug: string; title: string; description: string; dietary_tags: string; categories: string }>();

    for (const r of recipes.results || []) {
      const dietary = r.dietary_tags ? JSON.parse(r.dietary_tags).join(', ') : '';
      const text = [
        `Recipe: ${r.title}`,
        r.description,
        dietary ? `Dietary: ${dietary}` : '',
        r.categories ? `Categories: ${r.categories}` : '',
      ].filter(Boolean).join('. ');

      // Vectorize IDs max 64 bytes - use shortened slug
      const shortId = `r:${r.slug.substring(0, 60)}`;

      records.push({
        id: shortId,
        type: 'recipe',
        text,
        metadata: {
          slug: r.slug,
          title: r.title,
          dietary: dietary,
          categories: r.categories || '',
        },
      });
    }

    // Generate embeddings in batches (Workers AI limit is 100 per call)
    const BATCH_SIZE = 100;
    let indexed = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const texts = batch.map(r => r.text);

      // Generate embeddings using Workers AI
      const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: texts,
      }) as { data: number[][] };

      // Prepare vectors for Vectorize
      const vectors = batch.map((record, idx) => ({
        id: record.id,
        values: embeddings.data[idx],
        metadata: record.metadata,
      }));

      // Insert into Vectorize
      await env.VECTORIZE.upsert(vectors);
      indexed += batch.length;
    }

    return new Response(JSON.stringify({
      success: true,
      indexed,
      products: products.results?.length || 0,
      recipes: recipes.results?.length || 0,
    }), { headers: corsHeaders });

  } catch (error) {
    console.error('Index error:', error);
    return new Response(JSON.stringify({
      error: 'Indexing failed',
      message: String(error),
    }), { status: 500, headers: corsHeaders });
  }
}

async function handleSearch(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const url = new URL(request.url);
  const query = url.searchParams.get('query') || '';
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const type = url.searchParams.get('type') || ''; // filter by product/recipe

  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    // Generate embedding for query
    const queryEmbedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [query],
    }) as { data: number[][] };

    // Search Vectorize
    const results = await env.VECTORIZE.query(queryEmbedding.data[0], {
      topK: limit,
      returnMetadata: 'all',
    });

    // Filter by type if specified (p: for product, r: for recipe)
    let matches = results.matches || [];
    if (type === 'product') {
      matches = matches.filter(m => m.id.startsWith('p:'));
    } else if (type === 'recipe') {
      matches = matches.filter(m => m.id.startsWith('r:'));
    }

    return new Response(JSON.stringify({
      query,
      results: matches.map(m => ({
        id: m.id,
        score: m.score,
        metadata: m.metadata,
      })),
    }), { headers: corsHeaders });

  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({
      error: 'Search failed',
      message: String(error),
    }), { status: 500, headers: corsHeaders });
  }
}
