/**
 * Alt Text Generator
 * Generates contextual alt text for images based on content
 */

export interface AltTextContext {
  pageTitle?: string;
  blockType?: string;
  itemTitle?: string;
  itemDescription?: string;
  category?: string;
}

/**
 * Generate alt text for an image based on context
 */
export function generateAltText(context: AltTextContext): string {
  const parts: string[] = [];

  // Start with the item title if available
  if (context.itemTitle) {
    parts.push(context.itemTitle);
  }

  // Add block type context
  if (context.blockType) {
    switch (context.blockType) {
      case 'hero':
        if (!parts.length && context.pageTitle) {
          parts.push(context.pageTitle);
        }
        parts.push('hero image');
        break;
      case 'cards':
      case 'feature':
        if (context.itemDescription) {
          // Extract key info from description
          const shortDesc = extractKeyPhrase(context.itemDescription);
          if (shortDesc && !parts.includes(shortDesc)) {
            parts.push(shortDesc);
          }
        }
        break;
      case 'pdp':
      case 'product':
        parts.push('Vitamix blender product image');
        break;
      case 'recipe':
        parts.push('recipe photo');
        break;
      case 'carousel':
        if (!parts.length) {
          parts.push('carousel slide');
        }
        break;
    }
  }

  // Add category if helpful
  if (context.category && !parts.some(p => p.toLowerCase().includes(context.category!.toLowerCase()))) {
    parts.push(context.category);
  }

  // Fallback
  if (parts.length === 0) {
    return 'Vitamix content image';
  }

  // Clean and join
  return parts
    .filter(Boolean)
    .map(p => p.trim())
    .join(' - ')
    .slice(0, 125); // Keep alt text reasonable length
}

/**
 * Extract a key phrase from a longer description
 */
function extractKeyPhrase(description: string): string {
  // Take first sentence or up to 50 chars
  const firstSentence = description.split(/[.!?]/)[0];
  if (firstSentence.length <= 50) {
    return firstSentence.trim();
  }

  // Find a natural break point
  const words = firstSentence.split(' ');
  let phrase = '';
  for (const word of words) {
    if ((phrase + ' ' + word).length > 50) break;
    phrase = phrase ? phrase + ' ' + word : word;
  }

  return phrase.trim();
}

/**
 * Generate image hint for AI image generation
 */
export function generateImageHint(context: AltTextContext): string {
  const parts: string[] = [];

  // Add specific content
  if (context.itemTitle) {
    parts.push(context.itemTitle);
  }

  // Add Vitamix branding context based on block type
  switch (context.blockType) {
    case 'hero':
      parts.push('modern Vitamix blender');
      parts.push('clean kitchen background');
      parts.push('professional food photography');
      break;
    case 'product':
    case 'pdp':
      parts.push('Vitamix blender product shot');
      parts.push('white background');
      parts.push('studio lighting');
      break;
    case 'recipe':
      parts.push('fresh ingredients');
      parts.push('healthy food photography');
      parts.push('vibrant colors');
      break;
    case 'cards':
    case 'feature':
      if (context.itemDescription?.toLowerCase().includes('smoothie')) {
        parts.push('colorful smoothie');
      } else if (context.itemDescription?.toLowerCase().includes('soup')) {
        parts.push('steaming hot soup');
      } else {
        parts.push('Vitamix blender feature');
      }
      parts.push('lifestyle photography');
      break;
  }

  if (parts.length === 0) {
    parts.push('Vitamix blender with fresh ingredients');
  }

  return parts.join(', ');
}

/**
 * Post-process HTML to improve alt text
 */
export function improveAltText(html: string, pageTitle: string): string {
  // Match img tags and improve alt text if it's generic
  return html.replace(
    /<img([^>]*?)alt="([^"]*)"([^>]*?)>/g,
    (match, before, alt, after) => {
      // Skip if alt is already good (longer than 20 chars and not a placeholder)
      if (alt.length > 20 && !alt.includes('placeholder') && !alt.includes('image')) {
        return match;
      }

      // Try to extract context from surrounding elements
      const dataHint = extractDataHint(before + after);
      const dataSku = extractDataSku(before + after);

      let improvedAlt = alt;

      if (dataHint) {
        // Use the image hint as alt text base
        improvedAlt = dataHint.split(',')[0].trim();
      } else if (dataSku) {
        improvedAlt = `Vitamix ${dataSku} blender`;
      } else if (alt.includes('placeholder')) {
        // Replace placeholder text with page context
        improvedAlt = `${pageTitle} - Vitamix`;
      }

      return `<img${before}alt="${improvedAlt}"${after}>`;
    }
  );
}

function extractDataHint(attrString: string): string | null {
  const match = attrString.match(/data-image-hint="([^"]+)"/);
  return match ? match[1] : null;
}

function extractDataSku(attrString: string): string | null {
  const match = attrString.match(/data-sku="([^"]+)"/);
  return match ? match[1] : null;
}
