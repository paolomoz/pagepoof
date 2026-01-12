/**
 * Content Validator Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { validateAtoms } from '../pipeline/validator';
import type { ContentAtom } from '../pipeline/generator';

describe('Content Validator', () => {
  describe('validateAtoms', () => {
    it('should validate a valid heading atom', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'heading',
          content: { text: 'Test Heading', level: 2 },
          priority: 1,
        },
      ];

      const result = validateAtoms(atoms);
      expect(result.valid).toBe(true);
      expect(result.atoms).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject heading without text', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'heading',
          content: { level: 2 },
          priority: 1,
        },
      ];

      const result = validateAtoms(atoms);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('text');
    });

    it('should truncate overly long heading text', () => {
      const longText = 'A'.repeat(250);
      const atoms: ContentAtom[] = [
        {
          type: 'heading',
          content: { text: longText, level: 1 },
          priority: 1,
        },
      ];

      const result = validateAtoms(atoms);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect((result.atoms[0].content as { text: string }).text.length).toBe(200);
    });

    it('should fix invalid heading level', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'heading',
          content: { text: 'Test', level: 10 },
          priority: 1,
        },
      ];

      const result = validateAtoms(atoms);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.field === 'level')).toBe(true);
      expect((result.atoms[0].content as { level: number }).level).toBe(2);
    });

    it('should validate feature_set with valid features', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'feature_set',
          content: {
            features: [
              { title: 'Feature 1', description: 'Desc 1' },
              { title: 'Feature 2', description: 'Desc 2' },
            ],
          },
          priority: 2,
        },
      ];

      const result = validateAtoms(atoms);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should filter out features without titles', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'feature_set',
          content: {
            features: [
              { title: 'Feature 1', description: 'Desc 1' },
              { description: 'Missing title' },
              { title: 'Feature 3', description: 'Desc 3' },
            ],
          },
          priority: 2,
        },
      ];

      const result = validateAtoms(atoms);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      const features = (result.atoms[0].content as { features: unknown[] }).features;
      expect(features).toHaveLength(2);
    });

    it('should validate faq_set with valid FAQs', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'faq_set',
          content: {
            faqs: [
              { question: 'Q1?', answer: 'A1' },
              { question: 'Q2?', answer: 'A2' },
            ],
          },
          priority: 3,
        },
      ];

      const result = validateAtoms(atoms);
      expect(result.valid).toBe(true);
    });

    it('should reject faq_set without faqs array', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'faq_set',
          content: {},
          priority: 3,
        },
      ];

      const result = validateAtoms(atoms);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'faqs')).toBe(true);
    });

    it('should validate video atom', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'video',
          content: { id: 'abc123', title: 'Test Video' },
          priority: 3,
        },
      ];

      const result = validateAtoms(atoms);
      expect(result.valid).toBe(true);
    });

    it('should reject video without id', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'video',
          content: { title: 'Test Video' },
          priority: 3,
        },
      ];

      const result = validateAtoms(atoms);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
    });

    it('should fix missing CTA fields with defaults', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'cta',
          content: {},
          priority: 4,
        },
      ];

      const result = validateAtoms(atoms);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      const content = result.atoms[0].content as { text: string; url: string };
      expect(content.text).toBe('Discover more');
      expect(content.url).toBe('/products');
    });

    it('should fix invalid priority', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'paragraph',
          content: { text: 'Test paragraph' },
          priority: 100, // Invalid - should be 1-10
        },
      ];

      const result = validateAtoms(atoms);
      expect(result.valid).toBe(true);
      expect(result.atoms[0].priority).toBe(5);
    });

    it('should handle multiple atoms with mixed validity', () => {
      const atoms: ContentAtom[] = [
        { type: 'heading', content: { text: 'Valid Heading' }, priority: 1 },
        { type: 'heading', content: {}, priority: 1 }, // Invalid - no text
        { type: 'paragraph', content: { text: 'Valid paragraph' }, priority: 2 },
      ];

      const result = validateAtoms(atoms);
      expect(result.valid).toBe(false);
      expect(result.atoms).toHaveLength(2); // Only valid atoms
      expect(result.errors).toHaveLength(1);
    });
  });
});
