/**
 * Layout Selection
 * Selects optimal block sequence using Gemini Flash
 *
 * Ported from: ../adaptive-web/workers/src/lib/gemini.js
 */

import type { ContentAtom, AtomType } from './generator';
import type { ClassificationResult } from './classifier';

export interface BlockDefinition {
  name: string;
  description: string;
  atomTypes: AtomType[];
  priority: number;
  maxPerPage: number;
}

export interface LayoutBlock {
  blockName: string;
  atomIndices: number[];
  variant?: string;
}

export interface LayoutResult {
  blocks: LayoutBlock[];
  pageStructure: {
    hasHero: boolean;
    hasNavigation: boolean;
    hasFooter: boolean;
    sectionCount: number;
  };
}

// Block library with atom type mappings and priorities
const BLOCK_LIBRARY: BlockDefinition[] = [
  // Hero blocks - priority 1, must be first
  {
    name: 'hero',
    description: 'Large hero banner with title, subtitle, and background image',
    atomTypes: ['heading', 'paragraph'],
    priority: 1,
    maxPerPage: 1,
  },

  // Product blocks
  {
    name: 'pdp',
    description: 'Product detail page with full product information',
    atomTypes: ['product_detail'],
    priority: 2,
    maxPerPage: 1,
  },
  {
    name: 'plp',
    description: 'Product listing page with grid of products',
    atomTypes: ['comparison'],
    priority: 2,
    maxPerPage: 1,
  },
  {
    name: 'comparison-cards',
    description: 'Side-by-side product comparison cards',
    atomTypes: ['comparison'],
    priority: 2,
    maxPerPage: 1,
  },
  {
    name: 'recommended-products',
    description: 'AI-recommended products based on user needs',
    atomTypes: ['comparison', 'product_detail'],
    priority: 3,
    maxPerPage: 1,
  },

  // Recipe blocks
  {
    name: 'recipe-detail',
    description: 'Full recipe with ingredients, steps, and nutrition',
    atomTypes: ['recipe_detail', 'ingredient_list', 'steps', 'nutrition_facts'],
    priority: 2,
    maxPerPage: 1,
  },

  // Content blocks
  {
    name: 'cards',
    description: 'Grid of feature cards or content cards',
    atomTypes: ['feature_set', 'related'],
    priority: 3,
    maxPerPage: 2,
  },
  {
    name: 'columns',
    description: 'Multi-column layout for features or content',
    atomTypes: ['feature_set', 'list', 'paragraph'],
    priority: 3,
    maxPerPage: 2,
  },
  {
    name: 'accordion',
    description: 'Collapsible FAQ or content sections',
    atomTypes: ['faq_set'],
    priority: 3,
    maxPerPage: 1,
  },

  // Interactive blocks
  {
    name: 'speed-control',
    description: 'Interactive speed/setting selector',
    atomTypes: ['interactive_guide', 'steps'],
    priority: 2,
    maxPerPage: 1,
  },
  {
    name: 'carousel',
    description: 'Image or content carousel',
    atomTypes: ['feature_set', 'testimonials'],
    priority: 4,
    maxPerPage: 1,
  },

  // Media blocks
  {
    name: 'video',
    description: 'Embedded video player',
    atomTypes: ['video'],
    priority: 3,
    maxPerPage: 2,
  },
  {
    name: 'collage',
    description: 'Image collage or gallery',
    atomTypes: ['feature_set'],
    priority: 4,
    maxPerPage: 1,
  },

  // Navigation/Structure blocks
  {
    name: 'toc',
    description: 'Table of contents for long pages',
    atomTypes: ['heading', 'list'],
    priority: 5,
    maxPerPage: 1,
  },
  {
    name: 'banner',
    description: 'Promotional or alert banner',
    atomTypes: ['paragraph', 'cta'],
    priority: 4,
    maxPerPage: 1,
  },

  // CTA blocks
  {
    name: 'form',
    description: 'Contact or lead capture form',
    atomTypes: ['cta'],
    priority: 5,
    maxPerPage: 1,
  },
];

const LAYOUT_PROMPT = `You are a layout expert for Vitamix, a premium blender company.
Select the optimal sequence of blocks to display the given content atoms.

## Available Blocks
${BLOCK_LIBRARY.map(b => `- **${b.name}**: ${b.description} (atoms: ${b.atomTypes.join(', ')})`).join('\n')}

## Rules
1. Maximum 8 blocks per page
2. Always start with a "hero" block if there's a heading atom
3. Always end with a CTA-related block if available
4. Match atom types to appropriate blocks
5. For product queries: prioritize pdp, comparison-cards, or plp
6. For recipe queries: prioritize recipe-detail
7. For support queries: prioritize accordion (FAQ)
8. Maintain visual variety - don't repeat the same block type consecutively
9. If there's an interactive_guide atom, ALWAYS include speed-control block

## Output Format
Return ONLY valid JSON:
{
  "blocks": [
    { "blockName": "hero", "atomIndices": [0, 1] },
    { "blockName": "cards", "atomIndices": [2] }
  ]
}

The atomIndices array should reference the indices of atoms that should be rendered in each block.`;

/**
 * Select optimal layout using Gemini Flash
 */
export async function selectLayout(
  atoms: ContentAtom[],
  classification: ClassificationResult,
  apiKey: string
): Promise<LayoutResult> {
  const userPrompt = buildLayoutPrompt(atoms, classification);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: LAYOUT_PROMPT + '\n\n' + userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      return fallbackLayout(atoms, classification);
    }

    const data = await response.json() as {
      candidates: Array<{
        content: {
          parts: Array<{ text: string }>;
        };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parseLayoutResponse(text);

    // Validate and enhance the layout
    return validateLayout(parsed, atoms, classification);
  } catch (error) {
    console.error('Layout selection error:', error);
    return fallbackLayout(atoms, classification);
  }
}

/**
 * Build prompt for layout selection
 */
function buildLayoutPrompt(
  atoms: ContentAtom[],
  classification: ClassificationResult
): string {
  let prompt = `## Query Classification
- Type: ${classification.type}
- Confidence: ${classification.confidence}

## Content Atoms (${atoms.length} total)
`;

  atoms.forEach((atom, index) => {
    prompt += `${index}. **${atom.type}** (priority: ${atom.priority})`;
    if (atom.type === 'heading') {
      prompt += ` - "${(atom.content as { text: string }).text}"`;
    } else if (atom.type === 'feature_set') {
      const features = (atom.content as { features: Array<{ title: string }> }).features || [];
      prompt += ` - ${features.length} features`;
    } else if (atom.type === 'faq_set') {
      const faqs = (atom.content as { faqs: Array<unknown> }).faqs || [];
      prompt += ` - ${faqs.length} FAQs`;
    } else if (atom.type === 'comparison') {
      const products = (atom.content as { products: Array<unknown> }).products || [];
      prompt += ` - ${products.length} products`;
    }
    prompt += '\n';
  });

  prompt += `
Select blocks for these atoms. Return JSON only.`;

  return prompt;
}

/**
 * Parse JSON from Gemini response
 */
function parseLayoutResponse(text: string): { blocks: LayoutBlock[] } {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Extract from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Continue to object match
      }
    }

    // Try to find JSON object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Continue to fallback
      }
    }

    return { blocks: [] };
  }
}

/**
 * Validate and enhance layout
 */
function validateLayout(
  layout: { blocks: LayoutBlock[] },
  atoms: ContentAtom[],
  classification: ClassificationResult
): LayoutResult {
  const blocks = layout.blocks || [];
  const validBlocks: LayoutBlock[] = [];
  const usedAtoms = new Set<number>();

  // Ensure hero is first if we have heading
  const hasHeading = atoms.some(a => a.type === 'heading');
  const hasHeroBlock = blocks.some(b => b.blockName === 'hero');

  if (hasHeading && !hasHeroBlock) {
    const headingIndex = atoms.findIndex(a => a.type === 'heading');
    const subtitleIndex = atoms.findIndex(a => a.type === 'paragraph');
    validBlocks.push({
      blockName: 'hero',
      atomIndices: [headingIndex, subtitleIndex].filter(i => i >= 0),
    });
    if (headingIndex >= 0) usedAtoms.add(headingIndex);
    if (subtitleIndex >= 0) usedAtoms.add(subtitleIndex);
  }

  // Process existing blocks
  for (const block of blocks) {
    const blockDef = BLOCK_LIBRARY.find(b => b.name === block.blockName);
    if (!blockDef) continue;

    // Check max per page
    const existingCount = validBlocks.filter(b => b.blockName === block.blockName).length;
    if (existingCount >= blockDef.maxPerPage) continue;

    // Validate atom indices
    const validIndices = (block.atomIndices || []).filter(
      i => i >= 0 && i < atoms.length && !usedAtoms.has(i)
    );

    if (validIndices.length > 0 || block.blockName === 'hero') {
      validBlocks.push({
        blockName: block.blockName,
        atomIndices: validIndices,
        variant: block.variant,
      });
      validIndices.forEach(i => usedAtoms.add(i));
    }
  }

  // Ensure interactive_guide has speed-control block
  const interactiveGuideIndex = atoms.findIndex(a => a.type === 'interactive_guide');
  const hasSpeedControl = validBlocks.some(b => b.blockName === 'speed-control');

  if (interactiveGuideIndex >= 0 && !hasSpeedControl && !usedAtoms.has(interactiveGuideIndex)) {
    validBlocks.push({
      blockName: 'speed-control',
      atomIndices: [interactiveGuideIndex],
    });
    usedAtoms.add(interactiveGuideIndex);
  }

  // Add remaining atoms to appropriate blocks
  atoms.forEach((atom, index) => {
    if (usedAtoms.has(index)) return;

    const matchingBlock = BLOCK_LIBRARY.find(b => b.atomTypes.includes(atom.type));
    if (matchingBlock) {
      const existingBlock = validBlocks.find(b => b.blockName === matchingBlock.name);
      if (existingBlock) {
        existingBlock.atomIndices.push(index);
      } else {
        validBlocks.push({
          blockName: matchingBlock.name,
          atomIndices: [index],
        });
      }
      usedAtoms.add(index);
    }
  });

  // Limit to 8 blocks
  const finalBlocks = validBlocks.slice(0, 8);

  return {
    blocks: finalBlocks,
    pageStructure: {
      hasHero: finalBlocks.some(b => b.blockName === 'hero'),
      hasNavigation: false, // Added separately
      hasFooter: false, // Added separately
      sectionCount: finalBlocks.length,
    },
  };
}

/**
 * Fallback rule-based layout selection
 */
function fallbackLayout(
  atoms: ContentAtom[],
  classification: ClassificationResult
): LayoutResult {
  const blocks: LayoutBlock[] = [];
  const usedAtoms = new Set<number>();

  // Always add hero if we have heading
  const headingIndex = atoms.findIndex(a => a.type === 'heading');
  if (headingIndex >= 0) {
    const paragraphIndex = atoms.findIndex(a => a.type === 'paragraph');
    blocks.push({
      blockName: 'hero',
      atomIndices: [headingIndex, paragraphIndex].filter(i => i >= 0),
    });
    usedAtoms.add(headingIndex);
    if (paragraphIndex >= 0) usedAtoms.add(paragraphIndex);
  }

  // Type-specific main content
  switch (classification.type) {
    case 'product': {
      const comparisonIndex = atoms.findIndex(a => a.type === 'comparison');
      const productIndex = atoms.findIndex(a => a.type === 'product_detail');

      if (comparisonIndex >= 0) {
        blocks.push({ blockName: 'comparison-cards', atomIndices: [comparisonIndex] });
        usedAtoms.add(comparisonIndex);
      } else if (productIndex >= 0) {
        blocks.push({ blockName: 'pdp', atomIndices: [productIndex] });
        usedAtoms.add(productIndex);
      }
      break;
    }

    case 'recipe': {
      const recipeIndex = atoms.findIndex(a => a.type === 'recipe_detail');
      if (recipeIndex >= 0) {
        blocks.push({ blockName: 'recipe-detail', atomIndices: [recipeIndex] });
        usedAtoms.add(recipeIndex);
      }
      break;
    }

    case 'support': {
      const faqIndex = atoms.findIndex(a => a.type === 'faq_set');
      if (faqIndex >= 0) {
        blocks.push({ blockName: 'accordion', atomIndices: [faqIndex] });
        usedAtoms.add(faqIndex);
      }
      break;
    }
  }

  // Add feature cards if available
  const featureIndex = atoms.findIndex(a => a.type === 'feature_set' && !usedAtoms.has(atoms.indexOf(a)));
  if (featureIndex >= 0) {
    blocks.push({ blockName: 'cards', atomIndices: [featureIndex] });
    usedAtoms.add(featureIndex);
  }

  // Add FAQ accordion if not already added
  const faqIndex = atoms.findIndex((a, i) => a.type === 'faq_set' && !usedAtoms.has(i));
  if (faqIndex >= 0) {
    blocks.push({ blockName: 'accordion', atomIndices: [faqIndex] });
    usedAtoms.add(faqIndex);
  }

  // Add CTA at the end
  const ctaIndex = atoms.findIndex(a => a.type === 'cta');
  if (ctaIndex >= 0) {
    blocks.push({ blockName: 'banner', atomIndices: [ctaIndex] });
    usedAtoms.add(ctaIndex);
  }

  return {
    blocks: blocks.slice(0, 8),
    pageStructure: {
      hasHero: blocks.some(b => b.blockName === 'hero'),
      hasNavigation: false,
      hasFooter: false,
      sectionCount: blocks.length,
    },
  };
}
