# Implementation Plan - Query Analysis Fixes

## Overview

This plan addresses all issues identified in `QUERY_ANALYSIS.md` across 4 phases. Each task includes specific file changes, implementation details, and testing criteria.

---

## Phase 1: Critical Fixes (Immediate)

### Task 1.1: Fix Empty Block Rendering
**Priority**: P0
**Files**: `src/pipeline/renderer.ts`

**Problem**: Blocks render empty `<div class="cards"></div>` when no content atoms match.

**Implementation**:
1. Add `hasContent()` helper function to check if atoms have renderable content
2. Modify each block renderer to return `null` or skip when no content
3. Update `renderBlocks()` to filter out null/empty blocks
4. Add fallback content for blocks that should never be empty

**Changes**:
```typescript
// Add to renderer.ts
function hasRenderableContent(atoms: ContentAtom[], requiredTypes: string[]): boolean {
  return atoms.some(a => requiredTypes.includes(a.type));
}

// Modify renderCards - return null if no features or related content
// Modify renderCarousel - return null if no items
// Modify renderRecipeDetail - return null if no recipe atom
// Modify renderComparisonCards - return null if no comparison atom
```

**Testing**: Run queries that previously produced empty blocks, verify no empty divs in output.

---

### Task 1.2: Audit and Fix Video IDs in Database
**Priority**: P0
**Files**: Database (D1), `scripts/seed-videos.sql` (if exists)

**Problem**: Fake video ID `dQw4w9WgXcQ` (Rick Roll) in database.

**Implementation**:
1. Query all video IDs from database
2. Identify fake/placeholder IDs (common patterns: `abc123`, `dQw4w9WgXcQ`, `xyz789`)
3. Research real Vitamix YouTube video IDs for each topic
4. Update database with correct IDs

**SQL**:
```sql
-- Find all videos
SELECT id, title FROM videos;

-- Update fake IDs with real ones
UPDATE videos SET id = 'REAL_ID' WHERE id = 'FAKE_ID';
```

**Real Vitamix Video IDs to use**:
- Getting Started: `5HkVb3vKrSA` (Vitamix 101)
- Hot Soup: `pWJo1_m9Rjs`
- Smoothies: `JdMgPhVgVFk`
- Cleaning: `3M6v7HGgzXE`
- Nut Butter: `KZfqtQqru3E`

**Testing**: Run gift giver query, verify no fake video IDs in response.

---

### Task 1.3: Improve Query Classification Patterns
**Priority**: P0
**Files**: `src/pipeline/classifier.ts`

**Problem**: Queries misclassified - noise as "recipe", arthritis as "general".

**Implementation**:
1. Add new keyword categories for accessibility, noise, medical, budget
2. Add weighted patterns for these categories
3. Improve confidence calculation for edge cases
4. Add "accessibility" and "medical" as valid query types (map to product/support)

**New Patterns**:
```typescript
// Accessibility patterns (→ product)
const accessibilityPatterns = [
  'arthritis', 'grip', 'mobility', 'limited', 'easy to use', 'simple',
  'elderly', 'senior', 'disability', 'dexterity', 'hands', 'strength'
];

// Noise patterns (→ product)
const noisePatterns = [
  'quiet', 'noise', 'loud', 'decibel', 'db', 'silent', 'apartment',
  'neighbor', 'sound', 'volume'
];

// Medical patterns (→ support/product)
const medicalPatterns = [
  'dysphagia', 'stroke', 'swallow', 'medical', 'therapy', 'puree',
  'texture', 'choking', 'thick', 'consistency'
];

// Budget patterns (→ product)
const budgetPatterns = [
  'budget', 'afford', 'cheap', 'broke', 'cost', 'price', 'expensive',
  /\$\d+/, 'entry-level', 'starter'
];
```

**Testing**: Re-run arthritis, noise, and medical queries, verify correct classification.

---

## Phase 2: Data Quality Improvements

### Task 2.1: Expand FAQ Retrieval with Semantic Matching
**Priority**: P1
**Files**: `src/pipeline/retriever.ts`

**Problem**: Most queries return 0 FAQs despite relevant FAQs existing.

**Implementation**:
1. Add topic-based FAQ tags in database
2. Create keyword-to-topic mapping
3. Search FAQs by topic tags in addition to text search
4. Add fallback to retrieve most popular FAQs if no matches

**Changes**:
```typescript
// Add FAQ topic mapping
const faqTopicMap: Record<string, string[]> = {
  'noise': ['quiet', 'sound', 'decibel', 'apartment'],
  'cleaning': ['clean', 'wash', 'sanitize', 'dishwasher'],
  'warranty': ['warranty', 'repair', 'replace', 'broken'],
  'accessibility': ['easy', 'simple', 'grip', 'arthritis'],
  'allergies': ['allergy', 'allergen', 'nut', 'dairy', 'cross-contamination'],
  // ...
};

// Modify retrieveFaqs to:
// 1. Extract topics from query
// 2. Search by topic tags
// 3. Fall back to general FAQs if no matches
```

**Database**: Add `topic_tags` column to FAQs table.

**Testing**: Run noise, allergies, and medical queries, verify FAQs retrieved.

---

### Task 2.2: Add Technical Specifications to Products
**Priority**: P1
**Files**: Database schema, `src/pipeline/retriever.ts`, `src/pipeline/renderer.ts`

**Problem**: Engineer query couldn't get wattage, RPM, decibels.

**Implementation**:
1. Create `product_specs` table with detailed specifications
2. Add specs retrieval to product queries
3. Create `specs-table` block renderer for technical comparisons

**Database Schema**:
```sql
CREATE TABLE product_specs (
  sku TEXT PRIMARY KEY,
  motor_watts INTEGER,
  motor_hp REAL,
  blade_rpm_max INTEGER,
  decibels_measured REAL,
  decibels_distance TEXT,
  container_capacity_oz INTEGER,
  weight_lbs REAL,
  dimensions TEXT,
  warranty_years INTEGER,
  cord_length_ft REAL,
  FOREIGN KEY (sku) REFERENCES products(sku)
);
```

**Renderer**: Add `renderSpecsTable()` function.

**Testing**: Run engineer query, verify specs table in response.

---

### Task 2.3: Add Product Feature Tags for Use-Case Matching
**Priority**: P1
**Files**: Database, `src/pipeline/retriever.ts`

**Problem**: Arthritis/accessibility query returned 0 products.

**Implementation**:
1. Add `feature_tags` column to products table
2. Tag products with use-case features
3. Modify product retrieval to match on feature tags

**Feature Tags**:
```
- easy-grip: Products with ergonomic handles
- quiet: Lower noise models (5300, Quiet One)
- compact: Low-profile containers
- budget: Entry-level and reconditioned
- professional: High-end models
- commercial: Restaurant/commercial use
- baby-food: Good for purees
- medical: Suitable for dysphagia/texture control
```

**Testing**: Run arthritis query, verify relevant products returned.

---

## Phase 3: Smart Features

### Task 3.1: Extract and Use Budget Constraints
**Priority**: P1
**Files**: `src/pipeline/classifier.ts`, `src/pipeline/generator.ts`, `src/pipeline/retriever.ts`

**Problem**: $350 budget shown $399+ products without explanation.

**Implementation**:
1. Add budget extraction regex to classifier
2. Pass budget to retriever for price filtering
3. Modify generator to acknowledge budget constraints
4. Add "under budget" and "over budget" messaging

**Changes**:
```typescript
// classifier.ts - Add budget extraction
function extractBudget(query: string): number | null {
  const match = query.match(/\$(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Add to ClassificationResult
interface ClassificationResult {
  // ... existing fields
  budget?: number;
}

// retriever.ts - Filter by price
if (classification.budget) {
  products = products.filter(p => p.price <= classification.budget);
  // If no products under budget, return closest options with explanation
}

// generator.ts - Acknowledge budget in content
// "With a budget of $350, here are your options..."
// "The most affordable new Vitamix starts at $X, but here are alternatives..."
```

**Testing**: Run gift giver and college student queries, verify budget-aware responses.

---

### Task 3.2: Add Specific Product Recommendations
**Priority**: P1
**Files**: `src/pipeline/generator.ts`, `src/prompts/content-atoms.ts`

**Problem**: "Just tell me what to get" got generic response, not specific model.

**Implementation**:
1. Add "recommendation" atom type
2. Modify content generation prompt to include specific recommendations
3. Create recommendation logic based on use-case matching
4. Add "Our Pick" / "Best For You" block renderer

**New Atom Type**:
```typescript
interface RecommendationAtom {
  type: 'recommendation';
  content: {
    productSku: string;
    productName: string;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
    alternatives?: string[];
  };
}
```

**Prompt Update**:
```
When the user asks for a specific recommendation or says "what should I buy",
you MUST provide a specific product recommendation with:
- The exact model name and SKU
- Why this model fits their needs
- One or two alternatives if they want options
```

**Testing**: Run new parent query, verify specific product recommendation.

---

### Task 3.3: Improve Support Query Routing
**Priority**: P1
**Files**: `src/pipeline/renderer.ts`, `src/pipeline/generator.ts`

**Problem**: Support queries don't show actual contact methods.

**Implementation**:
1. Create `support-contact` block with real contact info
2. Add support-specific content atoms (warranty claim steps, contact info)
3. Detect support queries and include contact block

**Support Contact Block**:
```html
<div class="support-contact">
  <div>
    <h3>Contact Vitamix Support</h3>
    <ul>
      <li><strong>Phone:</strong> 1-800-848-2649</li>
      <li><strong>Hours:</strong> Mon-Fri 8am-8pm ET, Sat 9am-5pm ET</li>
      <li><strong>Live Chat:</strong> Available on vitamix.com</li>
      <li><strong>Email:</strong> service@vitamix.com</li>
    </ul>
  </div>
  <div>
    <h3>Warranty Claims</h3>
    <p>Have your serial number ready (found on bottom of motor base)</p>
    <a href="/support/warranty" class="button">Start Warranty Claim</a>
  </div>
</div>
```

**Testing**: Run support query, verify contact info and warranty steps shown.

---

## Phase 4: Polish & Enhancement

### Task 4.1: Add Empathetic Tone for Medical/Emotional Queries
**Priority**: P2
**Files**: `src/pipeline/generator.ts`, `src/prompts/content-atoms.ts`

**Problem**: Medical queries (stroke, arthritis) need warmer tone.

**Implementation**:
1. Detect emotional/medical context in classification
2. Add tone modifier to content generation prompt
3. Include empathetic opening statements

**Prompt Modifier**:
```
When the query involves medical conditions, caregiving, or health challenges:
- Begin with an empathetic acknowledgment
- Use supportive, understanding language
- Focus on how Vitamix can make life easier
- Avoid overly technical or sales-focused language
```

**Testing**: Run stroke survivor and arthritis queries, verify empathetic tone.

---

### Task 4.2: Add Price Transparency
**Priority**: P2
**Files**: `src/pipeline/generator.ts`, `src/pipeline/renderer.ts`

**Problem**: Prices shown but not contextualized.

**Implementation**:
1. Add price range summary to product queries
2. Include financing/payment plan information
3. Explain value proposition vs cheaper alternatives

**Content Addition**:
```
Vitamix Price Ranges:
- Certified Reconditioned: $289 - $399
- Explorian Series: $349 - $449
- Venturist Series: $399 - $499
- Ascent Series: $449 - $649
- Professional Series: $529 - $599

Payment Plans: Available through Affirm, as low as $X/month
```

**Testing**: Run budget queries, verify price context provided.

---

### Task 4.3: Distinguish Commercial vs Consumer Products
**Priority**: P2
**Files**: Database, `src/pipeline/retriever.ts`, `src/pipeline/generator.ts`

**Problem**: "Quiet One" is commercial-only but not explained.

**Implementation**:
1. Add `product_line` field to products (consumer/commercial/both)
2. When commercial product mentioned, explain it's for business use
3. Suggest consumer alternatives

**Database**:
```sql
ALTER TABLE products ADD COLUMN product_line TEXT DEFAULT 'consumer';
UPDATE products SET product_line = 'commercial' WHERE sku IN ('QUIET_ONE', ...);
```

**Testing**: Query about Quiet One, verify commercial designation explained.

---

## Execution Order

```
Phase 1 (Day 1 - Critical):
├── 1.1 Fix empty block rendering
├── 1.2 Audit and fix video IDs
└── 1.3 Improve classification patterns

Phase 2 (Day 2-3 - Data Quality):
├── 2.1 Expand FAQ retrieval
├── 2.2 Add technical specifications
└── 2.3 Add product feature tags

Phase 3 (Day 3-4 - Smart Features):
├── 3.1 Budget constraint handling
├── 3.2 Specific product recommendations
└── 3.3 Support query routing

Phase 4 (Day 5+ - Polish):
├── 4.1 Empathetic tone for medical queries
├── 4.2 Price transparency
└── 4.3 Commercial vs consumer distinction
```

---

## Testing Checklist

After implementation, re-run all 20 original queries and verify:

- [ ] No empty blocks rendered
- [ ] All video IDs are real Vitamix videos
- [ ] Arthritis query classified as product, returns relevant products
- [ ] Noise query classified as product, mentions decibels
- [ ] Medical queries have empathetic tone
- [ ] Budget queries acknowledge budget, filter products appropriately
- [ ] Support queries include contact info and warranty steps
- [ ] Engineer query shows technical specifications
- [ ] Gift giver query gives specific recommendation within budget context
- [ ] Allergies query returns relevant FAQs about cleaning/sanitation
- [ ] "What should I buy" queries give specific model recommendations

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Empty blocks per query | 0.5 avg | 0 |
| Classification accuracy | ~60% | >90% |
| FAQs retrieved (relevant queries) | 0.2 avg | >2 avg |
| Products retrieved (product queries) | 3.5 avg | >5 avg |
| Specific recommendations given | 0% | 100% for "what to buy" queries |
| Support contact info shown | 0% | 100% for support queries |
