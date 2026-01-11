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
