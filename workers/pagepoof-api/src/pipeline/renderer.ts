/**
 * Block Renderer
 * Converts content atoms to EDS-compatible HTML blocks
 *
 * Produces AEM Edge Delivery Services compatible HTML structure
 */

import type { ContentAtom } from './generator';
import type { LayoutBlock } from './layout';

export interface RenderedBlock {
  name: string;
  html: string;
  atoms: ContentAtom[];
  error?: boolean;      // True if block rendering failed
  errorMessage?: string; // Error details for debugging
}

export interface RenderResult {
  blocks: RenderedBlock[];
  failedCount: number;
  totalCount: number;
  skippedCount: number;  // Blocks skipped due to no content
}

/**
 * Render all blocks to HTML with error recovery
 * Failed blocks are replaced with placeholder content
 * Empty blocks are filtered out
 */
export function renderBlocks(
  blocks: LayoutBlock[],
  atoms: ContentAtom[]
): RenderedBlock[] {
  const results: RenderedBlock[] = [];

  for (const block of blocks) {
    const blockAtoms = block.atomIndices.map(i => atoms[i]).filter(Boolean);

    try {
      const html = renderBlock(block.blockName, blockAtoms, block.variant);

      // Skip blocks that returned null or empty content
      if (!html || isEmptyBlock(html)) {
        console.log(`Skipping empty block: ${block.blockName}`);
        continue;
      }

      results.push({
        name: block.blockName,
        html,
        atoms: blockAtoms,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Block rendering failed [${block.blockName}]:`, errorMessage);

      // Return fallback placeholder block
      results.push({
        name: block.blockName,
        html: renderErrorPlaceholder(block.blockName, errorMessage),
        atoms: blockAtoms,
        error: true,
        errorMessage,
      });
    }
  }

  return results;
}

/**
 * Check if a rendered block is effectively empty
 */
function isEmptyBlock(html: string): boolean {
  // Remove the outer div and check if there's any meaningful content
  const stripped = html
    .replace(/<div[^>]*>/g, '')
    .replace(/<\/div>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Empty if only whitespace or no content
  return stripped.length === 0;
}

/**
 * Render all blocks with detailed result including failure stats
 */
export function renderBlocksWithStats(
  blocks: LayoutBlock[],
  atoms: ContentAtom[]
): RenderResult {
  const renderedBlocks = renderBlocks(blocks, atoms);
  const failedCount = renderedBlocks.filter(b => b.error).length;
  const skippedCount = blocks.length - renderedBlocks.length;

  return {
    blocks: renderedBlocks,
    failedCount,
    totalCount: renderedBlocks.length,
    skippedCount,
  };
}

/**
 * Render a placeholder for failed blocks
 */
function renderErrorPlaceholder(blockName: string, errorMessage: string): string {
  // In Cloudflare Workers, we don't have process.env
  // Show error details only in the error message for debugging via logs
  console.error(`Block ${blockName} error: ${errorMessage}`);

  return `<div class="${blockName} block-error">
  <div>
    <div>
      <p class="error-placeholder">Content temporarily unavailable</p>
    </div>
  </div>
</div>`;
}

/**
 * Render a single block to HTML
 */
function renderBlock(
  blockName: string,
  atoms: ContentAtom[],
  variant?: string
): string {
  switch (blockName) {
    case 'hero':
      return renderHero(atoms, variant);
    case 'cards':
      return renderCards(atoms, variant);
    case 'columns':
      return renderColumns(atoms, variant);
    case 'accordion':
      return renderAccordion(atoms, variant);
    case 'pdp':
      return renderPdp(atoms, variant);
    case 'comparison-cards':
      return renderComparisonCards(atoms, variant);
    case 'recipe-detail':
      return renderRecipeDetail(atoms, variant);
    case 'video':
      return renderVideo(atoms, variant);
    case 'banner':
      return renderBanner(atoms, variant);
    case 'speed-control':
      return renderSpeedControl(atoms, variant);
    case 'carousel':
      return renderCarousel(atoms, variant);
    case 'form':
      return renderForm(atoms, variant);
    case 'tips':
      return renderTips(atoms, variant);
    case 'nutrition-facts':
      return renderNutritionFacts(atoms, variant);
    default:
      return renderGenericBlock(blockName, atoms, variant);
  }
}

/**
 * Hero block - large banner with title and subtitle
 */
function renderHero(atoms: ContentAtom[], variant?: string): string {
  const heading = atoms.find(a => a.type === 'heading');
  const paragraph = atoms.find(a => a.type === 'paragraph');

  const title = (heading?.content as { text: string })?.text || 'Vitamix';
  const subtitle = (paragraph?.content as { text: string })?.text || '';
  const imageHint = heading?.imageHint || 'vitamix blender on kitchen counter';

  const variantClass = variant ? ` ${variant}` : '';

  return `<div class="hero${variantClass}">
  <div>
    <div>
      <picture>
        <img src="/images/placeholder-hero.jpg" alt="${escapeHtml(title)}" data-image-hint="${escapeHtml(imageHint)}">
      </picture>
    </div>
  </div>
  <div>
    <div>
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
    </div>
  </div>
</div>`;
}

/**
 * Cards block - grid of feature/content cards
 */
function renderCards(atoms: ContentAtom[], variant?: string): string {
  const featureSet = atoms.find(a => a.type === 'feature_set');
  const related = atoms.find(a => a.type === 'related');

  const variantClass = variant ? ` ${variant}` : '';
  let rows = '';

  if (featureSet) {
    const features = (featureSet.content as { features: Array<{ title: string; description: string; icon?: string }> }).features || [];
    rows = features.map(f => `  <div>
    <div>
      <picture>
        <img src="/images/placeholder-card.jpg" alt="${escapeHtml(f.title)}" data-image-hint="${escapeHtml(f.title + ' vitamix feature')}">
      </picture>
    </div>
    <div>
      <h3>${escapeHtml(f.title)}</h3>
      <p>${escapeHtml(f.description)}</p>
    </div>
  </div>`).join('\n');
  } else if (related) {
    const items = (related.content as { items: Array<{ title: string; description: string; url?: string }> }).items || [];
    rows = items.map(item => `  <div>
    <div>
      <h3>${item.url ? `<a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
    </div>
  </div>`).join('\n');
  }

  return `<div class="cards${variantClass}">
${rows}
</div>`;
}

/**
 * Columns block - multi-column layout
 */
function renderColumns(atoms: ContentAtom[], variant?: string): string {
  const variantClass = variant ? ` ${variant}` : '';

  // Try to find feature_set first for better column content
  const featureSet = atoms.find(a => a.type === 'feature_set');
  if (featureSet) {
    const features = (featureSet.content as { features: Array<{ title: string; description: string }> }).features || [];
    if (features.length > 0) {
      const rows = features.slice(0, 3).map(f => `  <div>
    <div>
      <h3>${escapeHtml(f.title)}</h3>
      <p>${escapeHtml(f.description)}</p>
    </div>
  </div>`).join('\n');
      return `<div class="columns${variantClass}">
${rows}
</div>`;
    }
  }

  // Process other atom types
  const rows = atoms.map(atom => {
    if (atom.type === 'paragraph') {
      const text = (atom.content as { text: string }).text;
      return `  <div>
    <div>
      <p>${escapeHtml(text)}</p>
    </div>
  </div>`;
    } else if (atom.type === 'list') {
      const items = (atom.content as { items: string[]; ordered?: boolean }).items || [];
      const ordered = (atom.content as { ordered?: boolean }).ordered;
      const listTag = ordered ? 'ol' : 'ul';
      return `  <div>
    <div>
      <${listTag}>
        ${items.map(i => `<li>${escapeHtml(i)}</li>`).join('\n        ')}
      </${listTag}>
    </div>
  </div>`;
    } else if (atom.type === 'tips') {
      const tips = (atom.content as { tips: string[] }).tips || [];
      if (tips.length > 0) {
        return `  <div>
    <div>
      <h3>Pro Tips</h3>
      <ul>
        ${tips.map(t => `<li>${escapeHtml(t)}</li>`).join('\n        ')}
      </ul>
    </div>
  </div>`;
      }
    }
    return '';
  }).filter(Boolean).join('\n');

  // If no content, return a placeholder that won't render empty
  if (!rows) {
    return `<div class="columns${variantClass}">
  <div>
    <div>
      <p>Explore our full range of Vitamix products and recipes.</p>
    </div>
  </div>
</div>`;
  }

  return `<div class="columns${variantClass}">
${rows}
</div>`;
}

/**
 * Accordion block - collapsible FAQ sections
 */
function renderAccordion(atoms: ContentAtom[], variant?: string): string {
  const faqSet = atoms.find(a => a.type === 'faq_set');
  const variantClass = variant ? ` ${variant}` : '';

  if (!faqSet) {
    return `<div class="accordion${variantClass}"></div>`;
  }

  const faqs = (faqSet.content as { faqs: Array<{ question: string; answer: string }> }).faqs || [];

  const rows = faqs.map(faq => `  <div>
    <div>
      <h3>${escapeHtml(faq.question)}</h3>
    </div>
    <div>
      <p>${escapeHtml(faq.answer)}</p>
    </div>
  </div>`).join('\n');

  return `<div class="accordion${variantClass}">
${rows}
</div>`;
}

/**
 * PDP block - product detail page
 */
function renderPdp(atoms: ContentAtom[], variant?: string): string {
  const product = atoms.find(a => a.type === 'product_detail');
  const variantClass = variant ? ` ${variant}` : '';

  if (!product) {
    return `<div class="pdp${variantClass}"></div>`;
  }

  const p = product.content as {
    sku: string;
    name: string;
    series?: string;
    price?: number;
    description?: string;
    features?: string[];
    specs?: Record<string, string>;
    warranty?: string;
  };

  const featuresHtml = p.features?.map(f => `<li>${escapeHtml(f)}</li>`).join('\n          ') || '';

  return `<div class="pdp${variantClass}">
  <div>
    <div>
      <picture>
        <img src="/images/placeholder-product.jpg" alt="${escapeHtml(p.name)}" data-sku="${escapeHtml(p.sku)}" data-image-hint="${escapeHtml(p.name + ' vitamix blender product shot')}">
      </picture>
    </div>
  </div>
  <div>
    <div>
      <h1>${escapeHtml(p.name)}</h1>
      ${p.series ? `<p class="series">${escapeHtml(p.series)} Series</p>` : ''}
      ${p.price ? `<p class="price">$${p.price}</p>` : ''}
      ${p.description ? `<p>${escapeHtml(p.description)}</p>` : ''}
      ${featuresHtml ? `<ul class="features">\n          ${featuresHtml}\n        </ul>` : ''}
      ${p.warranty ? `<p class="warranty">${escapeHtml(p.warranty)} Warranty</p>` : ''}
    </div>
  </div>
</div>`;
}

/**
 * Comparison cards block - side-by-side products
 */
function renderComparisonCards(atoms: ContentAtom[], variant?: string): string {
  const comparison = atoms.find(a => a.type === 'comparison');
  const variantClass = variant ? ` ${variant}` : '';

  if (!comparison) {
    return `<div class="comparison-cards${variantClass}"></div>`;
  }

  const products = (comparison.content as {
    products: Array<{
      sku: string;
      name: string;
      price?: number;
      features?: string[];
      pros?: string[];
      cons?: string[];
    }>;
  }).products || [];

  const rows = products.map(p => {
    const prosHtml = p.pros?.map(pro => `<li class="pro">${escapeHtml(pro)}</li>`).join('\n          ') || '';
    const consHtml = p.cons?.map(con => `<li class="con">${escapeHtml(con)}</li>`).join('\n          ') || '';

    return `  <div>
    <div>
      <picture>
        <img src="/images/placeholder-product.jpg" alt="${escapeHtml(p.name)}" data-sku="${escapeHtml(p.sku)}">
      </picture>
    </div>
    <div>
      <h3>${escapeHtml(p.name)}</h3>
      ${p.price ? `<p class="price">$${p.price}</p>` : ''}
      ${prosHtml || consHtml ? `<ul class="pros-cons">\n          ${prosHtml}${consHtml}\n        </ul>` : ''}
    </div>
  </div>`;
  }).join('\n');

  return `<div class="comparison-cards${variantClass}">
${rows}
</div>`;
}

/**
 * Recipe detail block - full recipe with ingredients and steps
 */
function renderRecipeDetail(atoms: ContentAtom[], variant?: string): string {
  const recipe = atoms.find(a => a.type === 'recipe_detail');
  const variantClass = variant ? ` ${variant}` : '';

  if (!recipe) {
    return `<div class="recipe-detail${variantClass}"></div>`;
  }

  const r = recipe.content as {
    title: string;
    description?: string;
    prepTime?: number;
    cookTime?: number;
    servings?: string;
    ingredients?: string[];
    instructions?: string[];
    tips?: string[];
    nutrition?: Record<string, string | number>;
  };

  const ingredientsHtml = r.ingredients?.map(i => `<li>${escapeHtml(i)}</li>`).join('\n          ') || '';
  const instructionsHtml = r.instructions?.map((step, i) => `<li><strong>Step ${i + 1}:</strong> ${escapeHtml(step)}</li>`).join('\n          ') || '';
  const tipsHtml = r.tips?.map(t => `<li>${escapeHtml(t)}</li>`).join('\n          ') || '';

  return `<div class="recipe-detail${variantClass}">
  <div>
    <div>
      <picture>
        <img src="/images/placeholder-recipe.jpg" alt="${escapeHtml(r.title)}" data-image-hint="${escapeHtml(r.title + ' healthy recipe food photography')}">
      </picture>
    </div>
  </div>
  <div>
    <div>
      <h1>${escapeHtml(r.title)}</h1>
      ${r.description ? `<p>${escapeHtml(r.description)}</p>` : ''}
      <div class="meta">
        ${r.prepTime ? `<span class="prep-time">Prep: ${r.prepTime} min</span>` : ''}
        ${r.cookTime ? `<span class="cook-time">Cook: ${r.cookTime} min</span>` : ''}
        ${r.servings ? `<span class="servings">Serves: ${escapeHtml(r.servings)}</span>` : ''}
      </div>
    </div>
  </div>
  <div>
    <div>
      <h2>Ingredients</h2>
      <ul>
        ${ingredientsHtml}
      </ul>
    </div>
    <div>
      <h2>Instructions</h2>
      <ol>
        ${instructionsHtml}
      </ol>
    </div>
  </div>
  ${tipsHtml ? `<div>
    <div>
      <h2>Tips</h2>
      <ul>
        ${tipsHtml}
      </ul>
    </div>
  </div>` : ''}
</div>`;
}

/**
 * Video block - embedded video
 */
function renderVideo(atoms: ContentAtom[], variant?: string): string {
  const video = atoms.find(a => a.type === 'video');
  const variantClass = variant ? ` ${variant}` : '';

  if (!video) {
    return `<div class="video${variantClass}"></div>`;
  }

  const v = video.content as { id: string; title: string; description?: string };

  return `<div class="video${variantClass}">
  <div>
    <div>
      <a href="https://www.youtube.com/watch?v=${escapeHtml(v.id)}">${escapeHtml(v.title)}</a>
      ${v.description ? `<p>${escapeHtml(v.description)}</p>` : ''}
    </div>
  </div>
</div>`;
}

/**
 * Banner block - promotional or CTA banner
 */
function renderBanner(atoms: ContentAtom[], variant?: string): string {
  const cta = atoms.find(a => a.type === 'cta');
  const paragraph = atoms.find(a => a.type === 'paragraph');
  const variantClass = variant ? ` ${variant}` : '';

  const text = cta
    ? (cta.content as { text: string }).text
    : (paragraph?.content as { text: string })?.text || '';
  const buttonText = cta ? (cta.content as { buttonText: string }).buttonText : 'Learn More';
  const url = cta ? (cta.content as { url: string }).url : '/';

  return `<div class="banner${variantClass}">
  <div>
    <div>
      <p>${escapeHtml(text)}</p>
      <p><a href="${escapeHtml(url)}" class="button">${escapeHtml(buttonText)}</a></p>
    </div>
  </div>
</div>`;
}

/**
 * Speed control block - interactive guide
 */
function renderSpeedControl(atoms: ContentAtom[], variant?: string): string {
  const guide = atoms.find(a => a.type === 'interactive_guide');
  const variantClass = variant ? ` ${variant}` : '';

  if (!guide) {
    return `<div class="speed-control${variantClass}"></div>`;
  }

  const g = guide.content as {
    title: string;
    tabs?: Array<{ label: string; content: string }>;
    recommendation?: string;
  };

  const tabsHtml = g.tabs?.map((tab, i) => `  <div>
    <div>
      <h3>${escapeHtml(tab.label)}</h3>
    </div>
    <div>
      <p>${escapeHtml(tab.content)}</p>
    </div>
  </div>`).join('\n') || '';

  return `<div class="speed-control${variantClass}">
  <div>
    <div>
      <h2>${escapeHtml(g.title)}</h2>
      ${g.recommendation ? `<p class="recommendation">${escapeHtml(g.recommendation)}</p>` : ''}
    </div>
  </div>
${tabsHtml}
</div>`;
}

/**
 * Carousel block - image/content carousel
 */
function renderCarousel(atoms: ContentAtom[], variant?: string): string {
  const featureSet = atoms.find(a => a.type === 'feature_set');
  const testimonials = atoms.find(a => a.type === 'testimonials');
  const variantClass = variant ? ` ${variant}` : '';

  let items: Array<{ title: string; content: string }> = [];

  if (featureSet) {
    const features = (featureSet.content as { features: Array<{ title: string; description: string }> }).features || [];
    items = features.map(f => ({ title: f.title, content: f.description }));
  } else if (testimonials) {
    const quotes = (testimonials.content as { testimonials: Array<{ quote: string; author: string }> }).testimonials || [];
    items = quotes.map(t => ({ title: t.author, content: t.quote }));
  }

  const rows = items.map(item => `  <div>
    <div>
      <picture>
        <img src="/images/placeholder-carousel.jpg" alt="${escapeHtml(item.title)}">
      </picture>
    </div>
    <div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.content)}</p>
    </div>
  </div>`).join('\n');

  return `<div class="carousel${variantClass}">
${rows}
</div>`;
}

/**
 * Form block - CTA with button
 */
function renderForm(atoms: ContentAtom[], variant?: string): string {
  const cta = atoms.find(a => a.type === 'cta');
  const variantClass = variant ? ` ${variant}` : '';

  if (cta) {
    const c = cta.content as { text: string; buttonText?: string; url?: string };
    const text = c.text || 'Ready to get started?';
    const buttonText = c.buttonText || 'Shop Now';
    const url = c.url || '/products';

    return `<div class="form${variantClass}">
  <div>
    <div>
      <p>${escapeHtml(text)}</p>
      <p><a href="${escapeHtml(url)}" class="button">${escapeHtml(buttonText)}</a></p>
    </div>
  </div>
</div>`;
  }

  // Default CTA if no atom
  return `<div class="form${variantClass}">
  <div>
    <div>
      <p>Ready to transform your kitchen with Vitamix?</p>
      <p><a href="/products" class="button">Shop Vitamix Blenders</a></p>
    </div>
  </div>
</div>`;
}

/**
 * Tips block - pro tips section
 */
function renderTips(atoms: ContentAtom[], variant?: string): string {
  const tips = atoms.find(a => a.type === 'tips');
  const variantClass = variant ? ` ${variant}` : '';

  if (!tips) {
    return `<div class="tips${variantClass}"></div>`;
  }

  const t = tips.content as { tips: string[] };
  const tipsList = t.tips || [];

  if (tipsList.length === 0) {
    return `<div class="tips${variantClass}"></div>`;
  }

  const tipsHtml = tipsList.map(tip => `  <div>
    <div>
      <p>${escapeHtml(tip)}</p>
    </div>
  </div>`).join('\n');

  return `<div class="tips${variantClass}">
  <div>
    <div>
      <h2>Pro Tips</h2>
    </div>
  </div>
${tipsHtml}
</div>`;
}

/**
 * Nutrition facts block - nutrition panel
 */
function renderNutritionFacts(atoms: ContentAtom[], variant?: string): string {
  const nutrition = atoms.find(a => a.type === 'nutrition_facts');
  const variantClass = variant ? ` ${variant}` : '';

  if (!nutrition) {
    return `<div class="nutrition-facts${variantClass}"></div>`;
  }

  const n = nutrition.content as {
    calories?: number;
    protein?: string;
    carbs?: string;
    fat?: string;
    fiber?: string;
    sugar?: string;
    sodium?: string;
  };

  const facts = [
    n.calories ? `<li><strong>Calories:</strong> ${n.calories}</li>` : '',
    n.protein ? `<li><strong>Protein:</strong> ${escapeHtml(n.protein)}</li>` : '',
    n.carbs ? `<li><strong>Carbohydrates:</strong> ${escapeHtml(n.carbs)}</li>` : '',
    n.fat ? `<li><strong>Fat:</strong> ${escapeHtml(n.fat)}</li>` : '',
    n.fiber ? `<li><strong>Fiber:</strong> ${escapeHtml(n.fiber)}</li>` : '',
    n.sugar ? `<li><strong>Sugar:</strong> ${escapeHtml(n.sugar)}</li>` : '',
    n.sodium ? `<li><strong>Sodium:</strong> ${escapeHtml(n.sodium)}</li>` : '',
  ].filter(Boolean).join('\n      ');

  return `<div class="nutrition-facts${variantClass}">
  <div>
    <div>
      <h3>Nutrition Facts</h3>
      <ul>
      ${facts}
      </ul>
    </div>
  </div>
</div>`;
}

/**
 * Generic block renderer for unknown block types
 */
function renderGenericBlock(
  blockName: string,
  atoms: ContentAtom[],
  variant?: string
): string {
  const variantClass = variant ? ` ${variant}` : '';

  const rows = atoms.map(atom => {
    if (atom.type === 'heading') {
      const text = (atom.content as { text: string }).text;
      const level = (atom.content as { level?: number }).level || 2;
      return `  <div>
    <div>
      <h${level}>${escapeHtml(text)}</h${level}>
    </div>
  </div>`;
    } else if (atom.type === 'paragraph') {
      const text = (atom.content as { text: string }).text;
      return `  <div>
    <div>
      <p>${escapeHtml(text)}</p>
    </div>
  </div>`;
    } else if (atom.type === 'cta') {
      const c = atom.content as { text?: string; buttonText?: string; url?: string };
      return `  <div>
    <div>
      <p>${escapeHtml(c.text || 'Discover more')}</p>
      <p><a href="${escapeHtml(c.url || '/products')}" class="button">${escapeHtml(c.buttonText || 'Learn More')}</a></p>
    </div>
  </div>`;
    } else if (atom.type === 'list') {
      const items = (atom.content as { items: string[]; ordered?: boolean }).items || [];
      const ordered = (atom.content as { ordered?: boolean }).ordered;
      const listTag = ordered ? 'ol' : 'ul';
      if (items.length === 0) return '';
      return `  <div>
    <div>
      <${listTag}>
        ${items.map(i => `<li>${escapeHtml(i)}</li>`).join('\n        ')}
      </${listTag}>
    </div>
  </div>`;
    } else if (atom.type === 'tips') {
      const tips = (atom.content as { tips: string[] }).tips || [];
      if (tips.length === 0) return '';
      return `  <div>
    <div>
      <h3>Tips</h3>
      <ul>
        ${tips.map(t => `<li>${escapeHtml(t)}</li>`).join('\n        ')}
      </ul>
    </div>
  </div>`;
    }
    // Skip unknown atom types instead of rendering placeholder
    return '';
  }).filter(Boolean).join('\n');

  // If no rows rendered, provide default content
  if (!rows) {
    return `<div class="${blockName}${variantClass}">
  <div>
    <div>
      <p>Explore our Vitamix products and recipes.</p>
    </div>
  </div>
</div>`;
  }

  return `<div class="${blockName}${variantClass}">
${rows}
</div>`;
}

/**
 * Build complete page HTML
 */
export function buildPageHtml(
  title: string,
  description: string,
  blocks: RenderedBlock[]
): string {
  const blocksHtml = blocks.map(b => b.html).join('\n\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="stylesheet" href="/styles/styles.css">
  <script src="/scripts/aem.js" type="module"></script>
</head>
<body>
  <header></header>
  <main>
${blocksHtml}
  </main>
  <footer></footer>
</body>
</html>`;
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
