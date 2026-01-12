/**
 * Content Atoms Generator
 * Generates structured content units using Claude
 *
 * Ported from: ../adaptive-web/workers/src/lib/claude.js
 */

import type { ClassificationResult } from './classifier';
import { fetchAnthropic } from '../lib/fetch-utils';

// Content atom types
export type AtomType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'feature_set'
  | 'faq_set'
  | 'steps'
  | 'table'
  | 'comparison'
  | 'cta'
  | 'related'
  | 'product_detail'
  | 'recipe_detail'
  | 'interactive_guide'
  | 'nutrition_facts'
  | 'ingredient_list'
  | 'tips'
  | 'testimonials'
  | 'video';

export interface ContentAtom {
  type: AtomType;
  content: Record<string, unknown>;
  priority: number;
  imageHint?: string;
}

export interface GenerationResult {
  title: string;
  description: string;
  atoms: ContentAtom[];
  suggestedBlocks: string[];
  metadata: {
    queryType: string;
    confidence: number;
    generatedAt: string;
  };
}

export interface RagContext {
  products: Array<{
    sku: string;
    name: string;
    series: string;
    price: number;
    description: string;
    features: string[];
    specs: Record<string, string>;
  }>;
  recipes: Array<{
    slug: string;
    title: string;
    description: string;
    ingredients: string[];
    instructions: string[];
    prepTime: number;
    servings: string;
    dietary: string[];
  }>;
  faqs: Array<{
    question: string;
    answer: string;
    category: string;
  }>;
  videos: Array<{
    id: string;
    title: string;
    description: string;
    thumbnail: string;
  }>;
}

const CONTENT_ATOMS_PROMPT = `You are a content generation expert for Vitamix, a premium blender company.
Generate structured content atoms based on the user query and provided context.

## Available Atom Types

1. **heading** - Section title
   { "type": "heading", "content": { "text": "...", "level": 1|2|3 }, "priority": 1 }

2. **paragraph** - Body text
   { "type": "paragraph", "content": { "text": "..." }, "priority": 2 }

3. **list** - Bullet or numbered list
   { "type": "list", "content": { "items": ["..."], "ordered": boolean }, "priority": 3 }

4. **feature_set** - Feature cards grid
   { "type": "feature_set", "content": { "features": [{ "title": "...", "description": "...", "icon": "..." }] }, "priority": 2 }

5. **faq_set** - Q&A accordion
   { "type": "faq_set", "content": { "faqs": [{ "question": "...", "answer": "..." }] }, "priority": 3 }

6. **steps** - Numbered instructions
   { "type": "steps", "content": { "steps": [{ "number": 1, "title": "...", "description": "..." }] }, "priority": 2 }

7. **table** - Data table
   { "type": "table", "content": { "headers": ["..."], "rows": [["..."]] }, "priority": 3 }

8. **comparison** - Side-by-side products
   { "type": "comparison", "content": { "products": [{ "sku": "...", "name": "...", "price": ..., "features": ["..."], "pros": ["..."], "cons": ["..."] }] }, "priority": 1 }

9. **cta** - Call-to-action
   { "type": "cta", "content": { "text": "...", "buttonText": "...", "url": "..." }, "priority": 4 }

10. **related** - Related links
    { "type": "related", "content": { "items": [{ "title": "...", "description": "...", "url": "..." }] }, "priority": 5 }

11. **product_detail** - Full product information
    { "type": "product_detail", "content": { "sku": "...", "name": "...", "series": "...", "price": ..., "description": "...", "features": ["..."], "specs": {...}, "warranty": "..." }, "priority": 1 }

12. **recipe_detail** - Full recipe information
    { "type": "recipe_detail", "content": { "title": "...", "description": "...", "prepTime": ..., "cookTime": ..., "servings": "...", "ingredients": ["..."], "instructions": ["..."], "tips": ["..."], "nutrition": {...} }, "priority": 1 }

13. **interactive_guide** - Tab-based selector for recommendations
    { "type": "interactive_guide", "content": { "title": "...", "tabs": [{ "label": "...", "content": "..." }], "recommendation": "..." }, "priority": 1 }

14. **nutrition_facts** - Nutrition panel
    { "type": "nutrition_facts", "content": { "calories": ..., "protein": "...", "carbs": "...", "fat": "...", "fiber": "..." }, "priority": 3 }

15. **ingredient_list** - Recipe ingredients with quantities
    { "type": "ingredient_list", "content": { "ingredients": [{ "item": "...", "amount": "...", "unit": "..." }] }, "priority": 2 }

16. **tips** - Pro tips section
    { "type": "tips", "content": { "tips": ["..."] }, "priority": 4 }

17. **video** - Embedded video reference
    { "type": "video", "content": { "id": "...", "title": "...", "description": "..." }, "priority": 3 }

## Rules

1. Generate 3-8 atoms per response
2. Always start with a heading atom
3. End with a cta or related atom
4. Use ONLY information from the provided context - do not make up product details, prices, or specs
5. For product queries, prioritize comparison or product_detail atoms
6. For recipe queries, prioritize recipe_detail or steps atoms
7. For support queries, prioritize faq_set or steps atoms
8. Include imageHint for atoms that should have images (e.g., "vitamix ascent x5 slate gray blender on kitchen counter")

## Special Query Handling

When "Special Context" is provided, adapt your response accordingly:

**ACCESSIBILITY NEED**:
- Highlight products with touchscreen controls, preset programs, or simple operation
- Mention features like large buttons, easy-clean design, lightweight containers
- Use reassuring, supportive language

**NOISE CONCERN**:
- Include decibel ratings in product comparisons when available
- Recommend quieter models (lower dB ratings)
- Acknowledge the concern and provide practical tips (using thick smoothie bases, blending briefly)

**MEDICAL/THERAPY CONTEXT**:
- Use warm, empathetic tone - acknowledge their situation without dwelling on difficulties
- Start with a supportive statement like "We understand how important safe, easy food preparation is for your needs"
- Focus on texture capabilities (smooth purees, consistent blends) that can help with dysphagia or medical dietary requirements
- Highlight safety features and ease of cleaning
- Include relevant recipes for texture-modified diets (purees, smoothies, soups)
- Avoid clinical language; use warm, encouraging words
- Mention that Vitamix is trusted by therapists and healthcare professionals

**BUDGET CONSTRAINT**:
- If products exist within budget: prioritize them in recommendations
- If products are close to budget (within 20%): mention them as options
- If no products meet budget: be honest, suggest certified reconditioned options or payment plans
- Never hide pricing information - be transparent

**PRICE TRANSPARENCY** (apply to all product queries):
- Always show prices clearly in product comparisons
- Explain the price range upfront: "Vitamix blenders range from $XX (reconditioned) to $XXX (premium)"
- For higher-priced items, explain the value: longer warranty, professional-grade motor, multi-decade lifespan
- Mention certified reconditioned as a legitimate option (same warranty, lower price)
- If user seems price-sensitive, lead with affordable options without making assumptions

**COMMERCIAL VS CONSUMER PRODUCTS**:
- The "Quiet One" and drink machine blenders are COMMERCIAL products for restaurants/juice bars only
- If user asks about commercial products for home use, explain they're designed for high-volume businesses
- Recommend equivalent consumer models instead (e.g., Ascent series for home use)
- Commercial products: higher price, higher capacity, designed for continuous use
- Consumer products: home warranties, residential power, designed for occasional use

## Output Format

Return ONLY valid JSON with this structure:
{
  "title": "Page title",
  "description": "Meta description",
  "atoms": [...],
  "suggestedBlocks": ["hero", "cards", "accordion", ...]
}`;

/**
 * Generate content atoms using Claude
 */
export async function generateContentAtoms(
  query: string,
  classification: ClassificationResult,
  context: RagContext,
  apiKey: string
): Promise<GenerationResult> {
  const systemPrompt = CONTENT_ATOMS_PROMPT;

  const userPrompt = buildUserPrompt(query, classification, context);

  const response = await fetchAnthropic(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    },
    {
      onRetry: (attempt) => console.log(`[Generator] Retrying content atoms (attempt ${attempt})`),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const text = data.content[0]?.text || '';

  // Parse JSON from response (handle markdown code blocks)
  const parsed = parseJsonResponse(text);

  return {
    ...parsed,
    metadata: {
      queryType: classification.type,
      confidence: classification.confidence,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Select a recommended product based on user needs
 */
function selectRecommendedProduct(
  context: RagContext,
  classification: ClassificationResult
): { product: RagContext['products'][0]; reason: string } | null {
  if (context.products.length === 0) return null;

  const products = context.products;

  // For accessibility queries: recommend products with touchscreen/presets
  if (classification.isAccessibilityQuery) {
    const touchscreenModels = products.filter(p =>
      p.specs?.touchscreen === 'Yes' || p.specs?.programs?.includes('preset')
    );
    if (touchscreenModels.length > 0) {
      return {
        product: touchscreenModels[0],
        reason: 'Features touchscreen controls and preset programs for easy one-touch operation',
      };
    }
  }

  // For noise queries: recommend quietest model
  if (classification.isNoiseQuery) {
    const withDecibels = products.filter(p => p.specs?.decibels);
    if (withDecibels.length > 0) {
      const quietest = withDecibels.sort((a, b) => {
        const aDb = parseInt(a.specs.decibels || '100', 10);
        const bDb = parseInt(b.specs.decibels || '100', 10);
        return aDb - bDb;
      })[0];
      return {
        product: quietest,
        reason: `Quietest model available at ${quietest.specs.decibels}`,
      };
    }
  }

  // For budget queries: recommend best within budget
  if (classification.budget !== undefined) {
    const withinBudget = products.filter(p => p.price <= classification.budget!);
    if (withinBudget.length > 0) {
      // Prefer highest price within budget (best value)
      const bestValue = withinBudget.sort((a, b) => b.price - a.price)[0];
      return {
        product: bestValue,
        reason: `Best value within your $${classification.budget} budget`,
      };
    }
    // If nothing in budget, recommend reconditioned or cheapest
    const cheapest = products.sort((a, b) => a.price - b.price)[0];
    if (cheapest.sku.includes('RECONDITIONED')) {
      return {
        product: cheapest,
        reason: `Certified reconditioned option - closest to your budget at $${cheapest.price}`,
      };
    }
    return {
      product: cheapest,
      reason: `Most affordable option at $${cheapest.price} (above budget but closest available)`,
    };
  }

  // Default: recommend the top product (usually highest-rated/featured)
  return {
    product: products[0],
    reason: 'Top recommendation based on your needs',
  };
}

/**
 * Build user prompt with context
 */
function buildUserPrompt(
  query: string,
  classification: ClassificationResult,
  context: RagContext
): string {
  let prompt = `## User Query
"${query}"

## Query Classification
- Type: ${classification.type}
- Confidence: ${classification.confidence}
- Keywords: ${classification.keywords.join(', ')}
`;

  // Add special context flags
  const specialContext: string[] = [];
  if (classification.isAccessibilityQuery) {
    specialContext.push('ACCESSIBILITY NEED: User may have mobility/dexterity limitations. Emphasize ease of use, ergonomic features, simple controls.');
  }
  if (classification.isNoiseQuery) {
    specialContext.push('NOISE CONCERN: User is concerned about blender noise. Include decibel information, highlight quieter models, acknowledge apartment/shared living situations.');
  }
  if (classification.isMedicalQuery) {
    specialContext.push('MEDICAL/THERAPY CONTEXT: User may have swallowing difficulties or medical dietary needs. Emphasize smooth textures, puree capabilities, safe food preparation. Be empathetic and supportive.');
  }
  if (classification.budget !== undefined) {
    specialContext.push(`BUDGET CONSTRAINT: User has a budget of $${classification.budget}. Prioritize products within or close to budget. Be transparent about pricing - if no products meet budget, suggest alternatives like certified reconditioned models or payment plans.`);
  }

  if (specialContext.length > 0) {
    prompt += '\n## Special Context\n';
    for (const ctx of specialContext) {
      prompt += `- ${ctx}\n`;
    }
  }

  prompt += `
## Available Context

`;

  // Add products if relevant
  if (context.products.length > 0) {
    prompt += `### Products (${context.products.length} found)\n`;
    for (const product of context.products.slice(0, 5)) {
      prompt += `
**${product.name}** (SKU: ${product.sku})
- Series: ${product.series}
- Price: $${product.price}
- Description: ${product.description}
- Features: ${product.features.slice(0, 5).join(', ')}
- Specs: ${JSON.stringify(product.specs)}
`;
    }
    prompt += '\n';

    // Add specific recommendation
    const recommendation = selectRecommendedProduct(context, classification);
    if (recommendation) {
      prompt += `### Recommended Product
**${recommendation.product.name}** (SKU: ${recommendation.product.sku})
- Price: $${recommendation.product.price}
- Why: ${recommendation.reason}

IMPORTANT: When generating content, prominently feature this as "Our Pick for You" or "Recommended for You" and explain why it's the best choice for this user's specific needs.
`;
    }
  }

  // Add recipes if relevant
  if (context.recipes.length > 0) {
    prompt += `### Recipes (${context.recipes.length} found)\n`;
    for (const recipe of context.recipes.slice(0, 5)) {
      prompt += `
**${recipe.title}** (${recipe.slug})
- Description: ${recipe.description}
- Prep Time: ${recipe.prepTime} minutes
- Servings: ${recipe.servings}
- Dietary: ${recipe.dietary.join(', ')}
- Ingredients: ${recipe.ingredients.slice(0, 5).join(', ')}...
`;
    }
    prompt += '\n';
  }

  // Add FAQs if relevant
  if (context.faqs.length > 0) {
    prompt += `### FAQs (${context.faqs.length} found)\n`;
    for (const faq of context.faqs.slice(0, 5)) {
      prompt += `
**Q: ${faq.question}**
A: ${faq.answer}
Category: ${faq.category}
`;
    }
    prompt += '\n';
  }

  // Add videos if relevant
  if (context.videos.length > 0) {
    prompt += `### Videos (${context.videos.length} found)\n`;
    for (const video of context.videos.slice(0, 3)) {
      prompt += `
- **${video.title}** (ID: ${video.id})
  ${video.description}
`;
    }
    prompt += '\n';
  }

  // Add support information for support queries
  if (classification.type === 'support') {
    prompt += `
### Support Resources
Always include these contact options for support queries:
- Phone: 1-800-848-2649 (Mon-Fri 8am-5pm EST)
- Online: vitamix.com/support
- Live Chat: Available on website during business hours
- Warranty Claims: vitamix.com/warranty-claim

For warranty-related issues, mention:
- Full warranty coverage for motor and performance
- Easy online claim process
- Free repairs during warranty period

For troubleshooting, guide users through:
1. Check power connection
2. Ensure container is properly seated
3. Verify lid is secure
4. If issue persists, contact support with model number and serial number
`;
  }

  prompt += `
## Instructions
Generate content atoms for this query. Use ONLY the information provided above.
If specific product details are not available, use general Vitamix information but do not invent prices or specs.
Return valid JSON only.`;

  return prompt;
}

/**
 * Parse JSON from Claude response (handles markdown code blocks)
 */
function parseJsonResponse(text: string): Omit<GenerationResult, 'metadata'> {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Extract from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Continue to fallback
      }
    }

    // Try to find JSON object in text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Continue to fallback
      }
    }

    // Return fallback
    console.error('Failed to parse JSON from Claude response:', text.slice(0, 500));
    return {
      title: 'Vitamix Information',
      description: 'Information about Vitamix products and recipes',
      atoms: [
        {
          type: 'heading',
          content: { text: 'Vitamix Information', level: 1 },
          priority: 1,
        },
        {
          type: 'paragraph',
          content: {
            text: 'We encountered an issue generating this content. Please try refining your query.',
          },
          priority: 2,
        },
      ],
      suggestedBlocks: ['hero', 'columns'],
    };
  }
}

/**
 * Fast content generation using simpler model for hero/intro
 * Used in two-phase generation pattern
 */
export async function generateHeroContent(
  query: string,
  classification: ClassificationResult,
  apiKey: string
): Promise<{ title: string; subtitle: string; imageHint: string }> {
  const response = await fetchAnthropic(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `Generate a hero section for a Vitamix page about: "${query}"
Query type: ${classification.type}

Return JSON only:
{
  "title": "Compelling headline (5-10 words)",
  "subtitle": "Supporting text (15-25 words)",
  "imageHint": "Image description for generation (e.g., 'vitamix blender with fresh smoothie ingredients')"
}`,
          },
        ],
      }),
    },
    {
      timeout: 15000, // Hero should be fast
      onRetry: (attempt) => console.log(`[Generator] Retrying hero (attempt ${attempt})`),
    }
  );

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const text = data.content[0]?.text || '';

  try {
    // Parse the hero JSON response
    const parsed = parseHeroJson(text);
    return parsed;
  } catch {
    return {
      title: 'Vitamix - Professional Grade Blenders',
      subtitle: 'Discover the power and versatility of Vitamix blenders for your kitchen.',
      imageHint: 'vitamix blender on kitchen counter with fresh ingredients',
    };
  }
}

/**
 * Parse hero content JSON from response
 */
function parseHeroJson(text: string): { title: string; subtitle: string; imageHint: string } {
  const defaultHero = {
    title: 'Vitamix - Professional Grade Blenders',
    subtitle: 'Discover the power and versatility of Vitamix blenders for your kitchen.',
    imageHint: 'vitamix blender on kitchen counter with fresh ingredients',
  };

  try {
    const parsed = JSON.parse(text);
    return {
      title: parsed.title || defaultHero.title,
      subtitle: parsed.subtitle || defaultHero.subtitle,
      imageHint: parsed.imageHint || defaultHero.imageHint,
    };
  } catch {
    // Extract from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        return {
          title: parsed.title || defaultHero.title,
          subtitle: parsed.subtitle || defaultHero.subtitle,
          imageHint: parsed.imageHint || defaultHero.imageHint,
        };
      } catch {
        // Continue to object match
      }
    }

    // Try to find JSON object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        return {
          title: parsed.title || defaultHero.title,
          subtitle: parsed.subtitle || defaultHero.subtitle,
          imageHint: parsed.imageHint || defaultHero.imageHint,
        };
      } catch {
        // Continue to fallback
      }
    }

    return defaultHero;
  }
}
