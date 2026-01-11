# Pagepoof - Vitamix Generative Website POC

## Goal
Build a generative website POC that merges the best aspects of previous POCs:
- **adaptive-web**: Intent adherence (query classification, content atoms, context-aware navigation)
- **vitamix-poc**: Content adherence (session context, multi-agent self-improvement)
- **materialised-web**: Image generation architecture (size-specific prompts, progressive delivery)
- **vitamix**: All 23 production blocks

## User Choices
- **Blocks**: All 23 from vitamix + additional specialized blocks
- **Image Generation**: Imagen 3 (primary, for non-product images)
- **Product Images**: Official high-fidelity images (not generated)
- **Product Data**: Database for 100% accuracy
- **Videos**: Vitamix official YouTube videos indexed for semantic retrieval
- **Self-Improvement**: Full multi-agent (Claude + Gemini + GPT-4o)
- **Share**: DA persistence with shareable URLs
- **Quality Focus**: Optimize for output quality, not speed

## Model Strategy (Quality-Optimized)

| Task | Model | Rationale |
|------|-------|-----------|
| Query Classification | Claude Opus 4.5 | Best intent understanding |
| Content Atoms | Claude Opus 4.5 | Highest quality content |
| Layout Selection | Gemini 1.5 Pro | Cross-model validation |
| Content Validation | GPT-4o | Cross-model validation |
| Image Generation | Imagen 3 | Best image quality |
| Self-Improvement Analysis | Claude Opus 4.5 + Gemini + GPT-4o | Multi-perspective |
| Self-Improvement Synthesis | Claude Opus 4.5 | Best reasoning for synthesis |

---

## AEM EDS Skills (Claude Code)

Use these skills during development for block creation, content modeling, and testing.

### Skills for Block Development

| Skill | When to Use | Purpose |
|-------|-------------|---------|
| `/block-inventory` | Before creating new blocks | Survey available blocks from local project + Block Collection |
| `/block-collection-and-party` | When looking for reference implementations | Find existing blocks, code snippets, patterns to use as starting points |
| `/building-blocks` | When creating or modifying blocks | Guide for creating new blocks or making significant changes |
| `/content-modeling` | When designing block content structure | Create effective content models that are easy for authors |
| `/testing-blocks` | After making code changes | Run unit tests, browser tests, linting, performance validation |

### Skills for Content Generation

| Skill | When to Use | Purpose |
|-------|-------------|---------|
| `/content-driven-development` | For all development tasks | Apply CDD process to block development |
| `/content-modeling` | When defining DA content structure | Ensure blocks have proper row/column structures for authoring |
| `/docs-search` | When needing EDS feature guidance | Search aem.live documentation for implementation help |

### Skills for Page Import/Migration

| Skill | When to Use | Purpose |
|-------|-------------|---------|
| `/scrape-webpage` | To extract content from vitamix.com | Scrape content, metadata, images for seeding |
| `/page-import` | To import existing pages | Full import workflow from URL to EDS HTML |
| `/identify-page-structure` | To analyze page sections | Identify section boundaries and content sequences |
| `/authoring-analysis` | To validate block selection | Analyze content sequences for proper block mapping |
| `/generate-import-html` | To create structured HTML | Generate section structure with block tables |
| `/preview-import` | To verify imported content | Preview and validate in local dev server |

### Playwright Browser Automation

Available for scraping, testing, and validation:

| Tool | Purpose |
|------|---------|
| `browser_navigate` | Navigate to URLs for scraping |
| `browser_snapshot` | Get accessibility tree for data extraction |
| `browser_take_screenshot` | Capture visual references |
| `browser_click`, `browser_type` | Interact with dynamic pages |
| `browser_evaluate` | Run JavaScript for complex extraction |

**Key Use Cases:**
- Scrape product comparison data from https://www.vitamix.com/ca/en_us/catalog/product_compare/
- Extract product details from PDP pages
- Capture official product images
- Validate generated pages visually
- Test block rendering in browser

### Skill Usage in Development Workflow

```
1. BLOCK DEVELOPMENT
   /block-inventory          → Check what blocks exist
   /block-collection-and-party → Find reference implementations
   /content-modeling         → Design the content model
   /building-blocks          → Create/modify block code
   /testing-blocks           → Validate changes

2. CONTENT SEEDING (Phase 1.5)
   /scrape-webpage           → Extract vitamix.com content
   /identify-page-structure  → Analyze page sections
   /authoring-analysis       → Map to blocks
   /generate-import-html     → Create DA-compatible HTML

3. RUNTIME CONTENT GENERATION
   Content atoms → /content-modeling patterns → Block renderer
   Use DA Content Models section for correct HTML structure

4. TROUBLESHOOTING
   /docs-search              → Find EDS documentation
   /testing-blocks           → Debug block issues
```

---

## Product Database & Media Assets

### Product Database (D1)
All product data stored in D1 database for 100% accuracy:
```sql
-- Products table
CREATE TABLE products (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  series TEXT,           -- Ascent, Explorian, etc.
  model TEXT,            -- A3500, E320, etc.
  price REAL,
  regular_price REAL,
  description TEXT,
  features TEXT,         -- JSON array
  specs TEXT,            -- JSON object
  warranty_years INTEGER,
  in_stock BOOLEAN,
  url TEXT
);

-- Product images table (high-fidelity official images)
CREATE TABLE product_images (
  id INTEGER PRIMARY KEY,
  sku TEXT REFERENCES products(sku),
  image_url TEXT NOT NULL,
  image_type TEXT,       -- 'hero', 'gallery', 'lifestyle', 'detail'
  alt_text TEXT,
  sort_order INTEGER
);

-- Product variants (colors, sizes)
CREATE TABLE product_variants (
  id INTEGER PRIMARY KEY,
  sku TEXT REFERENCES products(sku),
  variant_sku TEXT,
  color TEXT,
  color_hex TEXT,
  price REAL,
  in_stock BOOLEAN,
  image_url TEXT
);
```

### Official Product Images
High-fidelity product images stored in R2 (not generated):
- Source: Scrape from vitamix.com product pages
- Storage: `pagepoof-images/products/{sku}/`
- Types: hero, gallery (multiple), lifestyle, detail
- Used for: PDP, PLP, product-cards, comparison-table blocks

**Image retrieval logic:**
- Product blocks → lookup by SKU → return official images
- Never generate product images with Imagen 3
- Imagen 3 only for: recipes, lifestyle, hero backgrounds (non-product)

### Vitamix Official Videos (YouTube)
Index all videos from https://www.youtube.com/@VitamixCorporation/videos

**Video Database Table:**
```sql
CREATE TABLE videos (
  id TEXT PRIMARY KEY,        -- YouTube video ID
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  published_at TEXT,
  view_count INTEGER,
  categories TEXT,            -- JSON array: ['recipe', 'product', 'tutorial', 'testimonial']
  products_mentioned TEXT,    -- JSON array of SKUs
  embedding BLOB              -- Vector embedding for semantic search
);
```

**Semantic Indexing:**
- Embed video title + description with Workers AI
- Store embeddings in Vectorize (`pagepoof-rag`)
- Tag videos with categories: recipe, product demo, tutorial, testimonial, cleaning, tips
- Extract mentioned products from title/description

**Video Retrieval:**
- Query relevance score via Vectorize
- Include video in page when score > threshold
- Video block with YouTube embed or thumbnail link

### Canonical Product Comparison Model

**Reference**: https://www.vitamix.com/ca/en_us/catalog/product_compare/

All product comparisons MUST follow this canonical model structure. Use Playwright to scrape and validate comparison data.

**Product Series (Header Row):**
| Series | Starting Price | Key Differentiator |
|--------|---------------|-------------------|
| Ascent X | $779.95 | Touch buttons, +15 Second Button, Tamper Indicator |
| Ascent & Venturist | varies | Self-Detect™, Digital Timer, Touch Buttons |
| Propel Series | $679.95 | Variable Speed, Pulse, 5-7 Year Warranty |
| Legacy Series | $729.95 | 7 Year Warranty, Classic 64oz Container |
| Explorian Series | $499.95 | Entry-level, 5 Year Warranty |

**Blender Features Comparison:**
| Feature | Description | Indicator |
|---------|-------------|-----------|
| Blending Programs | Pre-set programs (Smoothie, Soup, etc.) | ✓ or — |
| Variable Speed Control | 10-speed dial | ✓ or — |
| Touch Buttons | Digital touch interface | ✓ or — |
| Pulse | Manual pulse function | ✓ or — |
| Digital Timer | Built-in timer display | ✓ or — |
| Self-Detect™ Technology | Container auto-detection | ✓ or — |
| Tamper Indicator | Shows when tamper needed | ✓ or — |
| +15 Second Button | Extend blend time | ✓ or — |
| What You Can Make | Link to techniques | "All Techniques" |
| Warranty | Years covered | "10 Year", "5 Year", etc. |
| Colors | Available finishes | Color swatches |
| Dimensions | L × W × H | e.g., "11\" × 8\" × 17\"" |

**Attachment Compatibility:**
| Attachment | Compatible Series |
|------------|------------------|
| Food Processor | Ascent X, Ascent & Venturist |
| Personal Cup Adapter | Propel, Legacy, Explorian |

**Container Compatibility:**
| Container | Ascent X | Ascent | Propel | Legacy | Explorian |
|-----------|----------|--------|--------|--------|-----------|
| 48oz Stainless Steel | ✓ | ✓ | ✓ | ✓ | ✓ |
| 48oz Aer™ Disc | ✓ | ✓ | ✓ | ✓ | ✓ |
| Low-Profile 64oz w/ Self-Detect™ | ✓ | ✓ | — | — | — |
| 48oz w/ Self-Detect™ | ✓ | ✓ | — | — | — |
| 48oz Dry Grains w/ Self-Detect™ | ✓ | ✓ | — | — | — |
| Classic 64oz | — | — | ✓ | ✓ | — |
| Low-Profile 64oz | — | — | Propel 750 | ✓ | Some models |
| 48oz Container | — | — | ✓ | ✓ | ✓ |
| 32oz Container | — | — | ✓ | ✓ | ✓ |
| 32oz Dry Grains | — | — | ✓ | ✓ | ✓ |

**What You Can Make (Techniques):**
All series support: Smoothies & Juices, Baby Food, Batters, Dressings & Cold Sauces, Dips & Spreads, Food Prep, Frozen Treats, Cocktails, Nut Butters, Grinding (Flours/Nuts/Spices), Hot Soups & Drinks, Doughs

**Database Tables for Comparison:**
```sql
-- Product features for comparison
CREATE TABLE product_features (
  series TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  feature_value TEXT,           -- '✓', '—', or specific text
  sort_order INTEGER,
  PRIMARY KEY (series, feature_name)
);

-- Container compatibility matrix
CREATE TABLE container_compatibility (
  series TEXT NOT NULL,
  container_sku TEXT NOT NULL,
  compatible BOOLEAN,
  notes TEXT,                   -- e.g., "Propel 750 only"
  PRIMARY KEY (series, container_sku)
);

-- Attachment compatibility matrix
CREATE TABLE attachment_compatibility (
  series TEXT NOT NULL,
  attachment_sku TEXT NOT NULL,
  compatible BOOLEAN,
  PRIMARY KEY (series, attachment_sku)
);
```

**Comparison Block Implementation:**
- Use `comparison-table` block from vitamix-poc as base
- Enhance with canonical feature list from vitamix.com
- Pull data from D1 database (not hardcoded)
- Support 2-5 products side-by-side
- Include "BEST PICK" ribbon for recommendations
- Link product images to official images in R2

**Screenshot Reference:** `.playwright-mcp/vitamix-comparison-full.png`

---

## Project Structure

```
pagepoof/
├── blocks/                          # All 23 vitamix blocks + new AI blocks
│   ├── accordion/                   # From vitamix
│   ├── alert-banners/
│   ├── banner/
│   ├── cards/
│   ├── carousel/
│   ├── collage/
│   ├── columns/
│   ├── footer/
│   ├── form/
│   ├── fragment/
│   ├── header/
│   ├── hero/
│   ├── hotspot/
│   ├── modal/
│   ├── navigation/
│   ├── pdp/
│   ├── plp/
│   ├── recommended-products/
│   ├── speed-control/
│   ├── toc/
│   ├── video/
│   ├── query-form/                  # NEW: AI search input
│   ├── comparison-cards/            # From adaptive-web
│   ├── recipe-detail/               # From adaptive-web
│   ├── recipe-grid/                 # From materialised-web: filterable recipe grid
│   ├── technique-spotlight/         # From materialised-web: 50/50 educational layout
│   ├── verdict-card/                # From materialised-web: recommendation summary
│   ├── product-cards/               # From vitamix-poc: product listings
│   ├── comparison-table/            # From vitamix-poc: side-by-side comparison
│   ├── analytics-dashboard/         # NEW: Self-improvement UI
│   └── analytics-analysis/          # NEW: Analysis display
├── scripts/
│   ├── aem.js
│   ├── scripts.js
│   └── generative.js                # NEW: SSE client, placeholders
├── styles/
│   ├── styles.css
│   └── generative.css
├── workers/
│   ├── pagepoof-api/                # Main generation worker
│   │   └── src/
│   │       ├── index.ts
│   │       ├── routes/
│   │       │   ├── generate.ts      # SSE generation
│   │       │   ├── persist.ts       # DA persistence
│   │       │   └── images.ts        # R2 image serving
│   │       ├── pipeline/
│   │       │   ├── orchestrator.ts
│   │       │   ├── classifier.ts    # Query classification
│   │       │   ├── retriever.ts     # RAG context
│   │       │   ├── generator.ts     # Content atoms
│   │       │   └── renderer.ts      # HTML rendering
│   │       ├── ai-clients/
│   │       │   ├── claude.ts
│   │       │   ├── gemini.ts
│   │       │   ├── openai.ts
│   │       │   └── imagen.ts        # Imagen 3
│   │       └── prompts/
│   │           ├── classification.ts
│   │           ├── content-atoms.ts
│   │           ├── layout-selection.ts
│   │           └── image.ts
│   └── pagepoof-analytics/          # Self-improvement worker
│       └── src/
│           ├── index.ts
│           ├── handlers/
│           │   ├── track.ts
│           │   ├── analyze.ts
│           │   └── analyze-page.ts
│           └── agents/
│               ├── claude.ts
│               ├── gemini.ts
│               ├── openai.ts
│               └── synthesize.ts
└── content/
    ├── products.json
    ├── recipes.json
    └── faqs.json
```

---

## Data Flow

**Model Strategy: Optimize for QUALITY (not speed)**
- **Primary**: Claude Opus 4.5 for all content generation
- **Cross-validation**: Gemini, GPT-4o for validation/synthesis

```
USER QUERY
    │
    ▼
┌─────────────────────┐
│ 1. CLASSIFICATION   │  Claude Opus 4.5 → QueryType, confidence, keywords
└─────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. DATA RETRIEVAL (parallel)                                            │
│  ├── RAG: Vectorize → relevant content chunks, recipes, FAQs            │
│  ├── Products: D1 → exact product data, specs, pricing                  │
│  ├── Product Images: D1 → official high-fidelity images                 │
│  └── Videos: Vectorize → relevant Vitamix YouTube videos                │
└─────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 3. CONTENT ATOMS    │  Claude Opus 4.5 → structured content units
└─────────────────────┘   (uses exact product data, official images, relevant videos)
    │
    ▼
┌─────────────────────┐
│ 4. LAYOUT SELECTION │  Gemini 1.5 Pro → ordered block sequence (cross-model)
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 5. VALIDATION       │  GPT-4o → validate content quality (cross-model)
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 6. BLOCK RENDERING  │  Template engine → EDS-compatible HTML
└─────────────────────┘   (product blocks use official images, video blocks embed YouTube)
    │
    ├───────────────────────┐
    ▼                       ▼
┌─────────────────┐   ┌─────────────────┐
│ SSE STREAMING   │   │ IMAGEN 3        │  (parallel, non-product only)
│ Stream blocks   │   │ Generate images │
└─────────────────┘   └─────────────────┘
```

---

## Key Components

### 1. Query Classification (from adaptive-web)
- **Model**: Claude Opus 4.5 (quality-focused)
- Pattern-based classification: product, recipe, blog, support, commercial, general
- Strong indicators with weighted scoring (2.0 for keywords vs 1.0 for patterns)
- Optimizes RAG retrieval parameters per query type

### 2. Content Atoms (from adaptive-web)
- **Model**: Claude Opus 4.5 (quality-focused)
- Types: `heading`, `paragraph`, `feature_set`, `faq_set`, `comparison`, `product_detail`, `recipe_detail`, `interactive_guide`, `steps`, `table`, `cta`, `related`

### 3. Image Generation (Imagen 3)
- **Sizes**: hero (2000x800), card (750x562), column (600x400)
- **Content prompts**: recipe, smoothie, soup, product, lifestyle
- **Progressive delivery**: Placeholder → SSE `image-ready` event → Update

### 4. Multi-Agent Self-Improvement
**Strategy**: Use multiple models for cross-validation, Claude Opus 4.5 for synthesis
```
Claude Opus 4.5 + Gemini 1.5 Pro + GPT-4o (parallel analysis)
                    │
                    ▼
         Claude Opus 4.5 Synthesis
                    │
                    ▼
┌────────────────────────────────────┐
│ Scores: content, layout, conversion │
│ Top issues                          │
│ Suggestions (impact/effort)         │
│ Claude Code prompts                 │
└────────────────────────────────────┘
```

### 5. Additional Specialized Blocks

**From materialised-web:**
| Block | Purpose |
|-------|---------|
| `recipe-grid` | Filterable grid of recipe cards with favorites, difficulty/time filters |
| `technique-spotlight` | 50/50 split educational layout with animated tips |
| `verdict-card` | Summary recommendation card with per-product guidance |

**From vitamix-poc:**
| Block | Purpose |
|-------|---------|
| `product-cards` | Product listings with ratings, pricing, sale indicators |
| `comparison-table` | Side-by-side product specs with "BEST PICK" highlighting |

### 6. Navigation & Site Chrome (from vitamix)

Copy nav and footer from `../vitamix` to ensure the site looks identical to the original Vitamix site.

**Header Structure (from vitamix):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]  Products  Recipes  Why Vitamix  Learn  Support  Commercial  │  🔍 🌐 Account Cart │
├─────────────────────────────────────────────────────────────────────────────┤
│                    ┌─────────────────────────────────┐                      │
│                    │  🔍 Ask anything about Vitamix  │   ← NEW: Query Input │
│                    └─────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Header Modification - Add Query Input:**
- Place a centered query input below the main navigation bar
- Style: Full-width search bar with placeholder "Ask anything about Vitamix..."
- On submit: Trigger SSE generation flow, render generated content below
- Implementation: Modify `blocks/header/header.js` and `blocks/header/header.css`

**Footer Structure (from vitamix):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Email Signup: "Get $25 off your first order..."]    [Subscribe Button]     │
├─────────────────────────────────────────────────────────────────────────────┤
│  📘 📷 📌 🎥  (Social Icons)                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Corporate Info     │ Customer Service │ Account Links                       │
│ - About Us         │ - Contact Us     │ - Order Status                      │
│ - Careers          │ - FAQs           │ - Returns                           │
│ - Newsroom         │ - Shipping       │ - Warranty                          │
│ - Sustainability   │ - ...            │ - ...                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ © 2025 Vitamix. All rights reserved. | Privacy | Terms | Accessibility     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Files to Copy (exact match with vitamix):**
```
# Navigation block (full copy)
../vitamix/blocks/navigation/ → ./blocks/navigation/

# Header block (copy, then modify for query input)
../vitamix/blocks/header/ → ./blocks/header/

# Footer block (full copy)
../vitamix/blocks/footer/ → ./blocks/footer/

# Navigation content (nav.html)
../vitamix/nav.html → ./nav.html

# Footer content (footer.html)
../vitamix/footer.html → ./footer.html
```

**Header Query Input Implementation:**
1. Add query form HTML after main nav in `header.js`:
   ```javascript
   // After nav decoration, add query form
   const queryForm = document.createElement('div');
   queryForm.className = 'header-query-form';
   queryForm.innerHTML = `
     <form id="pagepoof-query">
       <input type="text" placeholder="Ask anything about Vitamix..." />
       <button type="submit">Generate</button>
     </form>
   `;
   header.appendChild(queryForm);
   ```

2. Add styles in `header.css`:
   ```css
   .header-query-form {
     width: 100%;
     max-width: 600px;
     margin: 0 auto;
     padding: 16px;
   }
   .header-query-form input {
     width: 100%;
     padding: 12px 16px;
     border: 1px solid var(--color-border);
     border-radius: 24px;
     font-size: 16px;
   }
   ```

3. Wire up to SSE generation in `generative.js`:
   ```javascript
   document.getElementById('pagepoof-query').addEventListener('submit', (e) => {
     e.preventDefault();
     const query = e.target.querySelector('input').value;
     generatePage(query); // SSE streaming function
   });
   ```

### 7. Share Functionality (from vitamix-poc)
Enables generated pages to be persisted and shared:
1. After generation completes, `persistToDA()` saves page to Document Authoring
2. Worker POSTs to `/api/persist` with query, blocks, and metadata
3. DA returns live + preview URLs
4. Header Share button enables copy-to-clipboard of shareable URL
5. `page-published` event dispatched for UI updates

---

## DA Content Models

Block content in Document Authoring follows table-based patterns. Each block expects specific row/column structures.

### Content Model Reference

| Block | Rows | Columns | Structure |
|-------|------|---------|-----------|
| Hero | 1 | 1 | Single cell with: video link (optional), eyebrow, H1 title, CTA button, disclaimer |
| Cards | N | 2 | Each row = card. Col1: image + title, Col2: body content |
| Carousel | N | 1-2 | Each row = slide. Col1: image (optional), Col2: body text/quote |
| Accordion | N | 2 | Each row = item. Col1: label/title, Col2: expandable body |
| Columns | 1 | N | Single row, N columns with any content |
| Banner | 1 | 2 | Col1: text content (eyebrow, heading, CTA), Col2: image/video |
| Hotspot | N | 2 | Row1: image + caption. Rows 2+: coordinates (X,Y) + popover content |

### Hero Block
```
| hero |
|------|
| [Video URL link]      |
| Eyebrow text          |
| # Main Title          |
| [CTA Button link]     |
| *Disclaimer text*     |
```

### Cards Block
```
| cards (variant) |            |
|-----------------|------------|
| ![Image]        | Card body  |
| Card title      | with text  |
|-----------------|------------|
| ![Image]        | Card body  |
| Card title      | with text  |
```
**Variants**: `articles`, `grid`, `knockout`, `linked`, `overlay`, `icon-list`, `rows-2/3/4`

### Carousel Block
```
| carousel (variant) |                    |
|--------------------|--------------------|
| ![Slide image]     | Slide body text    |
|                    | > Quote (optional) |
|--------------------|--------------------|
| ![Slide image]     | Slide body text    |
```
**Variants**: `expansion`, `testimonial`, `linked`, `slides-2/3/4`, `items`

### Accordion Block
```
| accordion |                              |
|-----------|------------------------------|
| Label 1   | Expandable content for item 1 |
| Label 2   | Expandable content for item 2 |
```

### Columns Block
```
| columns (variant) |          |          |
|-------------------|----------|----------|
| Col 1 content     | Col 2    | Col 3    |
| with images/text  | content  | content  |
```
**Variants**: `icons`, `icon-list`, `text-center`

### Banner Block
```
| banner (variant) |              |
|------------------|--------------|
| Eyebrow text     | ![Image]     |
| ## Heading       |              |
| Body paragraph   |              |
| [CTA link]       |              |
```
**Variants**: `inset`, `compact`, `aligned`, `split`, `image`, `narrow-media`

### Hotspot Block
```
| hotspot |                    |
|---------|--------------------|
| ![Main image] | Caption text |
| 25,40   | **Hotspot 1 title** Popover content |
| 75,60   | **Hotspot 2 title** Popover content |
```
Coordinates are X,Y percentages relative to image dimensions.

### Product Cards Block (from vitamix-poc)
```
| product-cards |
|---------------|
| ![Product image] |
| Product Name     |
| ★★★★☆ (123)     |
| $449.00          |
| ~~$549.00~~      |
| [View Details]   |
```

### Comparison Table Block (from vitamix-poc)
```
| comparison-table |          |          |          |
|------------------|----------|----------|----------|
| Feature          | Product A | Product B | Product C |
| Motor Power      | 2.2 HP   | 2.0 HP   | 1.5 HP   |
| Warranty         | 10 years | 7 years  | 5 years  |
| Price            | $549     | $449     | $349     |
| Recommendation   | ✓ Best Pick |       |          |
```

### Recipe Grid Block (from materialised-web)
```
| recipe-grid |            |            |
|-------------|------------|------------|
| ![Image]    | ![Image]   | ![Image]   |
| Recipe Name | Recipe 2   | Recipe 3   |
| ⏱ 15 min   | ⏱ 20 min  | ⏱ 10 min  |
| Easy        | Medium     | Easy       |
```

### Image Optimization Standards
- **Hero**: 2000px width
- **Cards**: 900px width
- **Carousel/Banner**: Full width
- All images require `<picture>` tags for AEM optimization

### Key Authoring Rules
1. Use `<picture>` tags for all images (AEM requirement)
2. Single link in a cell makes content clickable
3. First `<strong>` in hotspot popover = title
4. `$X.XX` format auto-detected as price
5. `> Quote` format creates blockquote styling
6. Variants are space-separated class names after block name

---

## Implementation Phases

### Phase 1: Foundation

**Skills to use:**
- `/block-inventory` - Survey copied blocks and verify completeness
- `/content-modeling` - Validate content models match DA structure
- `/testing-blocks` - Verify blocks render correctly with `aem up`

**Steps:**
1. Copy all 23 blocks from `../vitamix/blocks/` to `./blocks/` (including block CSS files)
2. Copy additional blocks:
   - `recipe-grid`, `technique-spotlight`, `verdict-card` from `../materialised-web/blocks/`
   - `product-cards`, `comparison-table` from `../vitamix-poc/blocks/`
3. Copy ALL styles from vitamix to match exact look:
   - `styles/styles.css` - Main styles
   - `styles/colors.css` - Brand colors
   - `styles/containers.css` - Layout containers
   - `styles/fonts.css` - Typography (Adobe Typekit)
   - `styles/typography.css` - Text styles
   - `styles/lazy-styles.css` - Deferred styles
4. Copy ALL icons from `../vitamix/icons/` to `./icons/`:
   - `logo.svg`, `logo-commercial.svg` - Brand logos
   - `cart.svg`, `account.svg`, `search.svg` - Navigation icons
   - Social icons: `social-facebook.svg`, `social-instagram.svg`, etc.
   - UI icons: `compare.svg`, `delivery.svg`, `email.svg`, etc.
5. Copy scripts from vitamix:
   - `scripts/aem.js` - EDS core library
   - `scripts/scripts.js` - Main site scripts
   - `scripts/delayed.js` - Deferred loading
6. Create NEW Cloudflare resources (do not reuse from other POCs):
   - **Worker**: `pagepoof-api` (new worker, separate from vitamix-poc/adaptive-web/materialised-web)
   - **Worker**: `pagepoof-analytics` (new worker for self-improvement)
   - **R2 Bucket**: `pagepoof-images` (new bucket for generated images)
   - **KV Namespace**: `pagepoof-cache` (new KV for sessions/cache)
   - **KV Namespace**: `pagepoof-analytics-kv` (new KV for analytics data)
   - **Vectorize Index**: `pagepoof-rag` (new index for RAG embeddings)
   - **D1 Database**: `pagepoof-db` (optional, for structured data)

**Files to copy for exact Vitamix styling:**
```
# Blocks (with CSS)
../vitamix/blocks/* → ./blocks/

# Additional blocks from POCs
../materialised-web/blocks/recipe-grid/ → ./blocks/
../materialised-web/blocks/technique-spotlight/ → ./blocks/
../materialised-web/blocks/verdict-card/ → ./blocks/
../vitamix-poc/blocks/product-cards/ → ./blocks/
../vitamix-poc/blocks/comparison-table/ → ./blocks/

# Styles (ALL required for exact look)
../vitamix/styles/styles.css → ./styles/
../vitamix/styles/colors.css → ./styles/
../vitamix/styles/containers.css → ./styles/
../vitamix/styles/fonts.css → ./styles/
../vitamix/styles/typography.css → ./styles/
../vitamix/styles/lazy-styles.css → ./styles/

# Icons (ALL 32 icons)
../vitamix/icons/*.svg → ./icons/

# Scripts
../vitamix/scripts/aem.js → ./scripts/
../vitamix/scripts/scripts.js → ./scripts/
../vitamix/scripts/delayed.js → ./scripts/

# Site chrome content (nav & footer structure)
../vitamix/nav.html → ./nav.html
../vitamix/footer.html → ./footer.html
```

**Fonts**: Adobe Typekit loaded via `@import url('https://use.typekit.net/pqz7ltx.css');`

### Phase 1.5: Data Seeding (Product DB, Images, Videos)

**Skills to use:**
- `/scrape-webpage` - Extract content from vitamix.com pages
- `/identify-page-structure` - Analyze page sections for content extraction
- `/content-modeling` - Ensure scraped content maps to block models
- **Playwright** - Scrape dynamic comparison page and product pages

**1. Scrape Product Data from vitamix.com:**
- All blenders (Ascent, Explorian, Legacy series)
- Containers & accessories
- Pricing, specs, features, warranty info
- Store in D1 `products` table

**2. Scrape Product Comparison Data (Playwright):**
- Navigate to https://www.vitamix.com/ca/en_us/catalog/product_compare/
- Use `browser_snapshot` to extract structured comparison data
- Populate `product_features`, `container_compatibility`, `attachment_compatibility` tables
- This is the CANONICAL source for all product comparisons
- Store feature matrix: Blending Programs, Variable Speed, Touch Buttons, Pulse, Digital Timer, Self-Detect™, Tamper Indicator, +15 Second Button, Warranty, Colors, Dimensions
- Store container compatibility matrix (10+ containers × 5 series)
- Store attachment compatibility matrix

**3. Download Official Product Images:**
- Scrape all product images from vitamix.com
- Store in R2: `pagepoof-images/products/{sku}/`
- Populate `product_images` table with URLs

**4. Index Vitamix YouTube Videos:**
- Fetch video list from https://www.youtube.com/@VitamixCorporation/videos
- Use YouTube Data API to get: title, description, duration, thumbnail
- Categorize each video (recipe, product, tutorial, testimonial, tips)
- Extract mentioned products from title/description
- Generate embeddings (Workers AI) and store in Vectorize
- Populate `videos` table

**5. Seed RAG with Content:**
- Product descriptions and features
- Recipe content (from vitamix.com/recipes)
- FAQ content
- Video metadata (for semantic retrieval)

**Scraping Scripts to Create:**
```
scripts/
├── seed-products.js       # Scrape vitamix.com products → D1
├── seed-comparison.js     # Scrape comparison page (Playwright) → D1 feature/compatibility tables
├── seed-images.js         # Download product images → R2
├── seed-videos.js         # Index YouTube videos → D1 + Vectorize
├── seed-recipes.js        # Scrape recipes → Vectorize
└── seed-faqs.js           # Scrape FAQs → Vectorize
```

**seed-comparison.js workflow:**
1. Launch Playwright browser
2. Navigate to https://www.vitamix.com/ca/en_us/catalog/product_compare/
3. Accept cookies if prompted
4. Use `browser_snapshot` to get accessibility tree
5. Parse tables: Blender Features, Attachment Compatibility, Container Compatibility, What You Can Make
6. Insert into D1: `product_features`, `container_compatibility`, `attachment_compatibility`
7. Save screenshot to `.playwright-mcp/` for reference

**Cloudflare Resource Setup Commands:**
```bash
# Create new R2 bucket
wrangler r2 bucket create pagepoof-images

# Create new KV namespaces
wrangler kv namespace create CACHE          # pagepoof-cache
wrangler kv namespace create ANALYTICS      # pagepoof-analytics-kv

# Create new Vectorize index
wrangler vectorize create pagepoof-rag --dimensions 768 --metric cosine

# Create new D1 database (optional)
wrangler d1 create pagepoof-db
```

**wrangler.toml bindings (pagepoof-api):**
```toml
name = "pagepoof-api"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "pagepoof-images"

[[kv_namespaces]]
binding = "CACHE"
id = "<new-kv-id>"

[[vectorize]]
binding = "VECTORIZE"
index_name = "pagepoof-rag"

[ai]
binding = "AI"
```

### Phase 2: Core Generation Pipeline

**Skills to use:**
- `/content-driven-development` - Apply CDD process to generation pipeline
- `/content-modeling` - Ensure generated content matches DA block models
- `/block-collection-and-party` - Find patterns for block rendering
- `/docs-search` - Reference EDS documentation for HTML structure

**Steps:**
1. Implement query classifier (port from `../adaptive-web/workers/src/lib/query-classifier.js`)
2. Implement content atoms generation (port from `../adaptive-web/workers/src/lib/claude.js`)
3. Implement layout selection (port from `../adaptive-web/workers/src/lib/gemini.js`)
4. Build SSE streaming endpoint
5. Create block renderer with atom→block mapping
   - Use `/content-modeling` patterns for correct DA HTML structure
   - Reference "DA Content Models" section for row/column patterns

**Key references:**
- `../adaptive-web/workers/src/lib/query-classifier.js`
- `../adaptive-web/workers/src/lib/claude.js` (CONTENT_ATOMS_PROMPT)
- `../adaptive-web/workers/src/lib/gemini.js` (layout rules)

### Phase 3: Image Generation
1. Integrate Imagen 3 via Vertex AI (port from `../materialised-web/workers/generative/src/ai-clients/imagen.ts`)
2. Implement size-specific prompt engineering
3. Build progressive delivery with R2 storage
4. Add SSE `image-ready` events

**Key reference:**
- `../materialised-web/workers/generative/src/ai-clients/imagen.ts`
- `../materialised-web/workers/generative/src/prompts/image.ts`

### Phase 4: Self-Improvement System

**Skills to use:**
- `/building-blocks` - Create analytics-dashboard and analytics-analysis blocks
- `/content-modeling` - Design content model for analytics blocks
- `/testing-blocks` - Validate analytics blocks render correctly

**Steps:**
1. Create `workers/pagepoof-analytics/` worker
2. Implement multi-agent analysis (Claude, Gemini, GPT-4o in parallel)
3. Build synthesis algorithm
4. Create analytics-dashboard and analytics-analysis blocks
   - Use `/building-blocks` for block creation guidance
   - Apply `/content-modeling` for proper DA structure
5. Implement Claude Code prompt generation
   - Generate prompts that reference appropriate skills for fixes

**Key reference:**
- `../vitamix-poc/workers/vitamix-analytics/src/`
- `../vitamix-poc/blocks/analytics-analysis/`

### Phase 5: Integration & Polish

**Skills to use:**
- `/testing-blocks` - End-to-end testing of all blocks
- `/preview-import` - Verify generated pages render correctly
- `/docs-search` - Reference EDS docs for optimization patterns

**Steps:**
1. Add session context management
2. Implement share functionality (port from `../vitamix-poc/scripts/api-client.js`)
3. Add share button to header with copy-to-clipboard
4. Integrate analytics tracking into generation flow
5. Create analytics page (`/agent-self-improve`)
6. End-to-end testing
   - Use `/testing-blocks` for automated validation
   - Use `/preview-import` to verify page rendering
7. Performance optimization

**Key reference for share:**
- `../vitamix-poc/scripts/api-client.js` (persistToDA function)
- `../vitamix-poc/blocks/header/header.js` (share button UI)

---

## API Endpoints

### pagepoof-api
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/stream` | SSE page generation |
| POST | `/api/persist` | Save to DA |
| GET | `/images/{slug}/{id}.png` | Serve R2 images |

### pagepoof-analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/track` | Event tracking |
| GET | `/api/analytics/summary` | 30-day summary |
| POST | `/api/analytics/analyze` | Batch analysis |
| POST | `/api/analytics/analyze-page` | Single page analysis |

---

## Verification Plan

**Skills for verification:**
- `/testing-blocks` - Automated testing for all block changes
- `/preview-import` - Visual verification of rendered pages
- `/block-inventory` - Confirm all blocks are properly installed

| Test | Verification Steps | Skill |
|------|-------------------|-------|
| 1. Block rendering | Copy blocks → run `aem up` → verify blocks render | `/testing-blocks` |
| 2. Product data accuracy | Query product → verify specs/price match vitamix.com exactly | Manual |
| 3. Product images | Verify product blocks use official images (not generated) | `/preview-import` |
| 4. Video retrieval | Query "how to make smoothie" → verify relevant YouTube video included | Manual |
| 5. Query classification | Test queries → verify correct type assignment | Manual |
| 6. Content generation | Submit query → verify atoms match DA content models | `/content-modeling` |
| 7. Image generation | Verify Imagen 3 generates only non-product images | Manual |
| 8. SSE streaming | Verify progressive block + image delivery | Manual |
| 9. Share functionality | Generate page → click Share → verify URL copied | Manual |
| 10. Self-improvement | Run analysis → verify multi-agent synthesis | Manual |
| 11. End-to-end | Generate page → share → track → analyze → view suggestions | `/testing-blocks` |

---

## Critical Reference Files

| Component | Reference File |
|-----------|----------------|
| Query classifier | `../adaptive-web/workers/src/lib/query-classifier.js` |
| Content atoms | `../adaptive-web/workers/src/lib/claude.js` |
| Layout selection | `../adaptive-web/workers/src/lib/gemini.js` |
| Imagen 3 | `../materialised-web/workers/generative/src/ai-clients/imagen.ts` |
| Image prompts | `../materialised-web/workers/generative/src/prompts/image.ts` |
| Multi-agent analysis | `../vitamix-poc/workers/vitamix-analytics/src/` |
| Session context | `../vitamix-poc/workers/vitamix-recommender/src/lib/` |
| Block patterns | `../vitamix/blocks/cards/cards.js` |
| Recipe grid | `../materialised-web/blocks/recipe-grid/` |
| Technique spotlight | `../materialised-web/blocks/technique-spotlight/` |
| Verdict card | `../materialised-web/blocks/verdict-card/` |
| Product cards | `../vitamix-poc/blocks/product-cards/` |
| Comparison table | `../vitamix-poc/blocks/comparison-table/` |
| Share/DA persist | `../vitamix-poc/scripts/api-client.js` (persistToDA function) |
| Share UI | `../vitamix-poc/blocks/header/` (share button logic) |
| Navigation block | `../vitamix/blocks/navigation/` |
| Header block | `../vitamix/blocks/header/` |
| Footer block | `../vitamix/blocks/footer/` |
| Nav content | `../vitamix/nav.html` |
| Footer content | `../vitamix/footer.html` |
