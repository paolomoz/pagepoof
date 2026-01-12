/**
 * Content Validator
 * Validates and sanitizes content atoms before rendering
 */

import type { ContentAtom, AtomType } from './generator';
import type { Logger } from '../lib/logger';

export interface ValidationResult {
  valid: boolean;
  atoms: ContentAtom[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  atomIndex: number;
  atomType: AtomType;
  field: string;
  message: string;
}

export interface ValidationWarning {
  atomIndex: number;
  atomType: AtomType;
  field: string;
  message: string;
  autoFixed: boolean;
}

/**
 * Validate and sanitize content atoms
 */
export function validateAtoms(atoms: ContentAtom[], logger?: Logger): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const validatedAtoms: ContentAtom[] = [];

  for (let i = 0; i < atoms.length; i++) {
    const atom = atoms[i];
    const { valid, sanitized, atomErrors, atomWarnings } = validateAtom(atom, i);

    errors.push(...atomErrors);
    warnings.push(...atomWarnings);

    if (valid) {
      validatedAtoms.push(sanitized);
    } else {
      // Log validation failure
      logger?.warn(`Atom validation failed`, {
        atomIndex: i,
        atomType: atom.type,
        errors: atomErrors.map(e => e.message),
      });
    }
  }

  // Log summary
  if (errors.length > 0 || warnings.length > 0) {
    logger?.info(`Content validation complete`, {
      totalAtoms: atoms.length,
      validAtoms: validatedAtoms.length,
      errors: errors.length,
      warnings: warnings.length,
    });
  }

  return {
    valid: errors.length === 0,
    atoms: validatedAtoms,
    errors,
    warnings,
  };
}

/**
 * Validate a single atom
 */
function validateAtom(atom: ContentAtom, index: number): {
  valid: boolean;
  sanitized: ContentAtom;
  atomErrors: ValidationError[];
  atomWarnings: ValidationWarning[];
} {
  const atomErrors: ValidationError[] = [];
  const atomWarnings: ValidationWarning[] = [];

  // Clone atom for sanitization
  const sanitized: ContentAtom = {
    ...atom,
    content: { ...atom.content as Record<string, unknown> },
  };

  // Type-specific validation
  switch (atom.type) {
    case 'heading':
      validateHeading(sanitized, index, atomErrors, atomWarnings);
      break;
    case 'paragraph':
      validateParagraph(sanitized, index, atomErrors, atomWarnings);
      break;
    case 'feature_set':
      validateFeatureSet(sanitized, index, atomErrors, atomWarnings);
      break;
    case 'faq_set':
      validateFaqSet(sanitized, index, atomErrors, atomWarnings);
      break;
    case 'product_detail':
      validateProductDetail(sanitized, index, atomErrors, atomWarnings);
      break;
    case 'recipe_detail':
      validateRecipeDetail(sanitized, index, atomErrors, atomWarnings);
      break;
    case 'video':
      validateVideo(sanitized, index, atomErrors, atomWarnings);
      break;
    case 'cta':
      validateCta(sanitized, index, atomErrors, atomWarnings);
      break;
    case 'comparison':
      validateComparison(sanitized, index, atomErrors, atomWarnings);
      break;
    case 'interactive_guide':
      validateInteractiveGuide(sanitized, index, atomErrors, atomWarnings);
      break;
    // Add more validators as needed
  }

  // Validate priority
  if (typeof sanitized.priority !== 'number' || sanitized.priority < 1 || sanitized.priority > 10) {
    sanitized.priority = 5; // Default priority
    atomWarnings.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'priority',
      message: 'Invalid priority, defaulting to 5',
      autoFixed: true,
    });
  }

  return {
    valid: atomErrors.length === 0,
    sanitized,
    atomErrors,
    atomWarnings,
  };
}

function validateHeading(atom: ContentAtom, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  const content = atom.content as { text?: string; level?: number };

  if (!content.text || typeof content.text !== 'string') {
    errors.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'text',
      message: 'Heading must have text',
    });
  } else if (content.text.length > 200) {
    (atom.content as { text: string }).text = content.text.slice(0, 200);
    warnings.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'text',
      message: 'Heading text truncated to 200 characters',
      autoFixed: true,
    });
  }

  if (content.level && (content.level < 1 || content.level > 6)) {
    (atom.content as { level: number }).level = 2;
    warnings.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'level',
      message: 'Invalid heading level, defaulting to 2',
      autoFixed: true,
    });
  }
}

function validateParagraph(atom: ContentAtom, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  const content = atom.content as { text?: string };

  if (!content.text || typeof content.text !== 'string') {
    errors.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'text',
      message: 'Paragraph must have text',
    });
  } else if (content.text.length > 2000) {
    (atom.content as { text: string }).text = content.text.slice(0, 2000);
    warnings.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'text',
      message: 'Paragraph text truncated to 2000 characters',
      autoFixed: true,
    });
  }
}

function validateFeatureSet(atom: ContentAtom, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  const content = atom.content as { features?: Array<{ title?: string; description?: string }> };

  if (!Array.isArray(content.features)) {
    errors.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'features',
      message: 'Feature set must have features array',
    });
    return;
  }

  // Validate each feature
  const validFeatures = content.features.filter((f, i) => {
    if (!f.title || typeof f.title !== 'string') {
      warnings.push({
        atomIndex: index,
        atomType: atom.type,
        field: `features[${i}].title`,
        message: 'Feature missing title, skipped',
        autoFixed: true,
      });
      return false;
    }
    return true;
  });

  (atom.content as { features: unknown[] }).features = validFeatures;
}

function validateFaqSet(atom: ContentAtom, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  const content = atom.content as { faqs?: Array<{ question?: string; answer?: string }> };

  if (!Array.isArray(content.faqs)) {
    errors.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'faqs',
      message: 'FAQ set must have faqs array',
    });
    return;
  }

  // Validate each FAQ
  const validFaqs = content.faqs.filter((f, i) => {
    if (!f.question || typeof f.question !== 'string') {
      warnings.push({
        atomIndex: index,
        atomType: atom.type,
        field: `faqs[${i}].question`,
        message: 'FAQ missing question, skipped',
        autoFixed: true,
      });
      return false;
    }
    if (!f.answer || typeof f.answer !== 'string') {
      warnings.push({
        atomIndex: index,
        atomType: atom.type,
        field: `faqs[${i}].answer`,
        message: 'FAQ missing answer, skipped',
        autoFixed: true,
      });
      return false;
    }
    return true;
  });

  (atom.content as { faqs: unknown[] }).faqs = validFaqs;
}

function validateProductDetail(atom: ContentAtom, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  const content = atom.content as { sku?: string; name?: string; price?: number };

  if (!content.name || typeof content.name !== 'string') {
    errors.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'name',
      message: 'Product must have name',
    });
  }

  if (content.price && (typeof content.price !== 'number' || content.price < 0)) {
    warnings.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'price',
      message: 'Invalid price, removed',
      autoFixed: true,
    });
    delete (atom.content as { price?: number }).price;
  }
}

function validateRecipeDetail(atom: ContentAtom, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  const content = atom.content as { title?: string; ingredients?: string[]; instructions?: string[] };

  if (!content.title || typeof content.title !== 'string') {
    errors.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'title',
      message: 'Recipe must have title',
    });
  }

  if (content.ingredients && !Array.isArray(content.ingredients)) {
    (atom.content as { ingredients: string[] }).ingredients = [];
    warnings.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'ingredients',
      message: 'Invalid ingredients, reset to empty',
      autoFixed: true,
    });
  }

  if (content.instructions && !Array.isArray(content.instructions)) {
    (atom.content as { instructions: string[] }).instructions = [];
    warnings.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'instructions',
      message: 'Invalid instructions, reset to empty',
      autoFixed: true,
    });
  }
}

function validateVideo(atom: ContentAtom, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  const content = atom.content as { id?: string; title?: string };

  if (!content.id || typeof content.id !== 'string') {
    errors.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'id',
      message: 'Video must have id',
    });
  }

  if (!content.title || typeof content.title !== 'string') {
    (atom.content as { title: string }).title = 'Vitamix Video';
    warnings.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'title',
      message: 'Video missing title, using default',
      autoFixed: true,
    });
  }
}

function validateCta(atom: ContentAtom, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  const content = atom.content as { text?: string; buttonText?: string; url?: string };

  if (!content.text || typeof content.text !== 'string') {
    (atom.content as { text: string }).text = 'Discover more';
    warnings.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'text',
      message: 'CTA missing text, using default',
      autoFixed: true,
    });
  }

  if (!content.url || typeof content.url !== 'string') {
    (atom.content as { url: string }).url = '/products';
    warnings.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'url',
      message: 'CTA missing url, using default',
      autoFixed: true,
    });
  }
}

function validateComparison(atom: ContentAtom, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  const content = atom.content as { products?: Array<{ name?: string }> };

  if (!Array.isArray(content.products)) {
    errors.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'products',
      message: 'Comparison must have products array',
    });
    return;
  }

  if (content.products.length < 2) {
    warnings.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'products',
      message: 'Comparison has fewer than 2 products',
      autoFixed: false,
    });
  }
}

function validateInteractiveGuide(atom: ContentAtom, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  const content = atom.content as { title?: string; tabs?: Array<{ label?: string; content?: string }> };

  if (!content.title || typeof content.title !== 'string') {
    (atom.content as { title: string }).title = 'Product Guide';
    warnings.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'title',
      message: 'Guide missing title, using default',
      autoFixed: true,
    });
  }

  if (!Array.isArray(content.tabs) || content.tabs.length === 0) {
    errors.push({
      atomIndex: index,
      atomType: atom.type,
      field: 'tabs',
      message: 'Interactive guide must have tabs',
    });
  }
}
