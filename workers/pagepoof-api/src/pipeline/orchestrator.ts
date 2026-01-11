/**
 * Pipeline Orchestrator
 * Coordinates the full generation pipeline with SSE streaming
 */

import { classifyQuery, type ClassificationResult } from './classifier';
import { generateContentAtoms, generateHeroContent, type GenerationResult, type RagContext } from './generator';
import { selectLayout, type LayoutResult } from './layout';
import { renderBlocks, buildPageHtml, type RenderedBlock } from './renderer';
import { retrieveContext } from './retriever';
import { generateImages, extractImageRequests, type ImageRequest, type GeneratedImage, type ImagenEnv } from '../ai-clients/imagen';
import { type Session, buildSessionContext, addQueryToSession } from '../lib/session';
import { trackQuery, trackPagePublished } from '../lib/tracking';

export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  CACHE: KVNamespace;
  ANTHROPIC_API_KEY: string;
  GOOGLE_AI_API_KEY: string;
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
  VERTEX_PROJECT_ID?: string;
  VERTEX_LOCATION?: string;
}

export interface PipelineOptions {
  session?: Session;
  baseUrl?: string;
}

export interface StreamEvent {
  event: string;
  data: Record<string, unknown>;
}

export type StreamWriter = {
  write: (event: StreamEvent) => Promise<void>;
  close: () => Promise<void>;
};

/**
 * Create SSE stream writer
 */
export function createStreamWriter(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder
): StreamWriter {
  return {
    async write(event: StreamEvent) {
      const data = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
      await writer.write(encoder.encode(data));
    },
    async close() {
      await writer.close();
    },
  };
}

/**
 * Run the full generation pipeline with SSE streaming
 */
export async function runPipeline(
  query: string,
  env: Env,
  stream: StreamWriter,
  options: PipelineOptions = {}
): Promise<{ success: boolean; pageHtml?: string; slug?: string; error?: string }> {
  const { session, baseUrl = 'https://main--pagepoof--paolomoz.aem.live' } = options;

  try {
    // Phase 1: Classification (~100ms)
    await stream.write({
      event: 'progress',
      data: { step: 'classification', message: 'Analyzing your query...' },
    });

    const classification = classifyQuery(query);

    await stream.write({
      event: 'classification',
      data: {
        type: classification.type,
        confidence: classification.confidence,
        keywords: classification.keywords,
        journeyStage: session?.journeyStage || 'exploring',
      },
    });

    // Build session context for personalization
    const sessionContext = session ? buildSessionContext(session) : '';

    // Phase 2: RAG Retrieval (parallel, ~200ms)
    await stream.write({
      event: 'progress',
      data: { step: 'retrieval', message: 'Gathering relevant information...' },
    });

    const context = await retrieveContext(query, classification, {
      DB: env.DB,
      VECTORIZE: env.VECTORIZE,
      AI: env.AI,
    });

    await stream.write({
      event: 'retrieval',
      data: {
        products: context.products.length,
        recipes: context.recipes.length,
        faqs: context.faqs.length,
        videos: context.videos.length,
      },
    });

    // Phase 3: Two-phase generation
    // 3a: Fast hero generation (~1s)
    await stream.write({
      event: 'progress',
      data: { step: 'hero', message: 'Creating page header...' },
    });

    const heroContent = await generateHeroContent(query, classification, env.ANTHROPIC_API_KEY);

    // Stream hero block immediately
    const heroHtml = renderHeroBlock(heroContent);
    await stream.write({
      event: 'block',
      data: {
        name: 'hero',
        html: heroHtml,
        index: 0,
      },
    });

    // 3b: Full content generation (~3-5s)
    await stream.write({
      event: 'progress',
      data: { step: 'content', message: 'Generating content...' },
    });

    const generation = await generateContentAtoms(
      query,
      classification,
      context,
      env.ANTHROPIC_API_KEY
    );

    await stream.write({
      event: 'generation',
      data: {
        title: generation.title,
        atomCount: generation.atoms.length,
        suggestedBlocks: generation.suggestedBlocks,
      },
    });

    // Phase 4: Layout selection (~500ms)
    await stream.write({
      event: 'progress',
      data: { step: 'layout', message: 'Optimizing layout...' },
    });

    const layout = await selectLayout(generation.atoms, classification, env.GOOGLE_AI_API_KEY);

    await stream.write({
      event: 'layout',
      data: {
        blockCount: layout.blocks.length,
        hasHero: layout.pageStructure.hasHero,
      },
    });

    // Phase 5: Block rendering and streaming
    await stream.write({
      event: 'progress',
      data: { step: 'rendering', message: 'Building page blocks...' },
    });

    const renderedBlocks = renderBlocks(layout.blocks, generation.atoms);

    // Stream each block (skip hero if already streamed)
    for (let i = 0; i < renderedBlocks.length; i++) {
      const block = renderedBlocks[i];

      // Skip hero if we already streamed it
      if (block.name === 'hero' && i === 0) continue;

      await stream.write({
        event: 'block',
        data: {
          name: block.name,
          html: block.html,
          index: i,
        },
      });

      // Small delay for progressive rendering effect
      await sleep(50);
    }

    // Build complete page HTML
    const pageHtml = buildPageHtml(generation.title, generation.description, renderedBlocks);

    // Phase 6: Image generation (parallel, in background)
    const slug = generateSlug(generation.title);
    const imageGenEnabled = env.GOOGLE_SERVICE_ACCOUNT_JSON && env.VERTEX_PROJECT_ID && env.VERTEX_LOCATION;

    if (imageGenEnabled) {
      await stream.write({
        event: 'progress',
        data: { step: 'images', message: 'Generating images...' },
      });

      // Extract image requests from rendered HTML
      const allHtml = renderedBlocks.map(b => b.html).join('\n');
      const imageRequests = extractImageRequests(allHtml, slug);

      if (imageRequests.length > 0) {
        await stream.write({
          event: 'images-started',
          data: { count: imageRequests.length },
        });

        // Generate images and stream as they complete
        const imagenEnv: ImagenEnv = {
          GOOGLE_SERVICE_ACCOUNT_JSON: env.GOOGLE_SERVICE_ACCOUNT_JSON!,
          VERTEX_PROJECT_ID: env.VERTEX_PROJECT_ID!,
          VERTEX_LOCATION: env.VERTEX_LOCATION!,
          IMAGES: env.IMAGES,
        };

        const generatedImages = await generateImages(imageRequests, imagenEnv, 3);

        // Stream each completed image
        for (const image of generatedImages) {
          await stream.write({
            event: 'image-ready',
            data: {
              id: image.id,
              url: image.url,
              size: image.size,
              success: image.success,
            },
          });
        }

        await stream.write({
          event: 'images-complete',
          data: {
            total: generatedImages.length,
            successful: generatedImages.filter(i => i.success).length,
          },
        });
      }
    }

    // Phase 7: Analytics tracking
    const pageUrl = `${baseUrl}/${slug}`;
    const pagePath = `/${slug}`;

    // Track query and page generation (fire and forget)
    if (session) {
      trackQuery(
        session.id,
        query,
        classification.type,
        session.journeyStage,
        session.metadata.totalQueries + 1
      ).catch(() => {});

      trackPagePublished(
        session.id,
        query,
        pageUrl,
        pagePath
      ).catch(() => {});

      // Update session with this query
      await addQueryToSession(session, query, classification.type, pageUrl, env.CACHE);
    }

    // Phase 8: Complete
    await stream.write({
      event: 'complete',
      data: {
        success: true,
        title: generation.title,
        description: generation.description,
        blockCount: renderedBlocks.length,
        queryType: classification.type,
        slug,
        pageUrl,
        pagePath,
        imagesGenerated: imageGenEnabled,
        sessionId: session?.id,
        journeyStage: session?.journeyStage,
      },
    });

    return { success: true, pageHtml, slug };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Pipeline error:', errorMessage);

    await stream.write({
      event: 'error',
      data: {
        message: 'An error occurred during generation',
        details: errorMessage,
      },
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Render hero block from fast generation
 */
function renderHeroBlock(content: { title: string; subtitle: string; imageHint: string }): string {
  return `<div class="hero">
  <div>
    <div>
      <picture>
        <img src="/images/placeholder-hero.jpg" alt="${escapeHtml(content.title)}" data-image-hint="${escapeHtml(content.imageHint)}">
      </picture>
    </div>
  </div>
  <div>
    <div>
      <h1>${escapeHtml(content.title)}</h1>
      <p>${escapeHtml(content.subtitle)}</p>
    </div>
  </div>
</div>`;
}

/**
 * HTML escape helper
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate URL-safe slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'page';
}
