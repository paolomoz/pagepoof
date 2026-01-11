/**
 * Content Atoms Generator
 * Generates structured content units using Claude
 *
 * Ported from: ../adaptive-web/workers/src/lib/claude.js
 */

import type { ClassificationResult } from './classifier';

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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
  });

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
  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
  });

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
