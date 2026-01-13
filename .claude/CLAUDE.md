# Pagepoof - Project Context

## Overview

Pagepoof is an AI-powered generative website for Vitamix that creates personalized web pages from natural language queries. Users ask questions about products, recipes, or blending techniques, and the system generates complete, styled pages streamed in real-time.

## Tech Stack

**Frontend**: AEM Edge Delivery Services (EDS) - JavaScript/CSS with 77+ block components
**Backend**: Cloudflare Workers (TypeScript)
**Storage**: D1 (SQLite), KV (cache), Vectorize (RAG), R2 (images)
**AI Models**:
- Claude Opus 4.5: Query classification, content generation, synthesis
- Gemini 1.5 Pro: Layout selection, cross-model validation
- GPT-4o: Content validation, multi-agent analysis
- Imagen 3: Image generation for non-product visuals

## Directory Structure

```
pagepoof/
├── blocks/                    # 77 EDS UI blocks (hero, cards, product-cards, etc.)
├── scripts/
│   ├── aem.js                 # EDS core library
│   ├── scripts.js             # Main site scripts
│   └── generative.js          # SSE client for page generation
├── styles/                    # CSS with design tokens
├── workers/
│   ├── pagepoof-api/          # Main generation worker
│   │   ├── src/
│   │   │   ├── index.ts       # Entry point & routing
│   │   │   ├── pipeline/      # Generation pipeline modules
│   │   │   │   ├── orchestrator.ts   # Coordinates full pipeline
│   │   │   │   ├── classifier.ts     # Query classification
│   │   │   │   ├── retriever.ts      # RAG context fetching
│   │   │   │   ├── generator.ts      # Content atom generation
│   │   │   │   ├── layout.ts         # Block sequence selection
│   │   │   │   └── renderer.ts       # Atom → HTML conversion
│   │   │   ├── ai-clients/    # AI service clients (imagen.ts)
│   │   │   └── lib/           # Utilities (da-client, session, tracking)
│   │   ├── seed.sql           # Database seed (products, recipes, FAQs)
│   │   └── wrangler.toml      # Worker config
│   └── pagepoof-analytics/    # Self-improvement analytics worker
├── PLAN.md                    # Detailed project specification
└── AGENTS.md                  # AI agent instructions
```

## Core Generation Pipeline

```
Query → Classification → Data Retrieval → Content Atoms → Layout → HTML Rendering → Image Generation
```

1. **Classification** (Claude): Determines query type (product/recipe/blog/support)
2. **Retrieval** (D1 + Vectorize): Fetches relevant products, recipes, FAQs, videos
3. **Content Atoms** (Claude): Generates structured content units
4. **Layout** (Gemini): Selects optimal block sequence
5. **Rendering** (TypeScript): Converts to EDS-compatible HTML
6. **Images** (Imagen 3): Generates hero/card images in parallel

Response streams via SSE with events: `progress`, `block`, `image-ready`, `complete`

## Key API Endpoints

**pagepoof-api**:
- `GET/POST /api/stream?query=...` - SSE page generation
- `POST /api/persist` - Save to Document Authoring
- `GET /images/{slug}/{id}.png` - Serve generated images

**pagepoof-analytics**:
- `POST /api/track` - Event tracking
- `POST /api/analytics/analyze-page` - Single page analysis

## Database Schema

- `products` - 100+ Vitamix blenders/accessories with specs and pricing
- `recipes` - 1600+ recipes with ingredients, instructions, dietary tags
- `faqs` - Q&A pairs by category
- `videos` - YouTube video metadata
- `product_images` - Official high-fidelity product images

## Development Commands

```bash
# Start local dev server (frontend)
npm start

# Start worker dev server
cd workers/pagepoof-api && npm run dev

# Run tests
npm test

# Lint
npm run lint
```

## External Services

- **Adobe Document Authoring (DA)**: Page persistence and publishing
- **Adobe IMS**: S2S authentication
- **Cloudflare Workers AI**: Embeddings for RAG
- **vitamix.com**: Product catalog source

## EDS Block Pattern

Blocks use table-based content models for authoring:
```html
<div class="block-name">
  <div><!-- row 1 --><div><!-- col 1 --></div><div><!-- col 2 --></div></div>
  <div><!-- row 2 --><div><!-- col 1 --></div></div>
</div>
```

## Notes

- Quality-focused: Uses Claude Opus 4.5 for best reasoning, with cross-model validation
- Multi-agent analytics: 3 AI models analyze page performance in parallel
- Progressive rendering: SSE streams blocks as they're generated
- Official images only for products; Imagen generates recipe/lifestyle images
