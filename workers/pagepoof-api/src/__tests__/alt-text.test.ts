/**
 * Alt Text Generator Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateAltText,
  generateImageHint,
  improveAltText,
  type AltTextContext,
} from '../pipeline/alt-text';

describe('Alt Text Generator', () => {
  describe('generateAltText', () => {
    it('should use item title when available', () => {
      const context: AltTextContext = {
        itemTitle: 'Green Smoothie Recipe',
      };

      const alt = generateAltText(context);

      expect(alt).toContain('Green Smoothie Recipe');
    });

    it('should add hero context', () => {
      const context: AltTextContext = {
        pageTitle: 'Welcome to Vitamix',
        blockType: 'hero',
      };

      const alt = generateAltText(context);

      expect(alt).toContain('Welcome to Vitamix');
      expect(alt).toContain('hero image');
    });

    it('should add product context', () => {
      const context: AltTextContext = {
        itemTitle: 'Vitamix A3500',
        blockType: 'product',
      };

      const alt = generateAltText(context);

      expect(alt).toContain('Vitamix A3500');
      expect(alt).toContain('product image');
    });

    it('should add recipe context', () => {
      const context: AltTextContext = {
        itemTitle: 'Banana Smoothie',
        blockType: 'recipe',
      };

      const alt = generateAltText(context);

      expect(alt).toContain('Banana Smoothie');
      expect(alt).toContain('recipe photo');
    });

    it('should extract key phrase from description for cards', () => {
      const context: AltTextContext = {
        itemTitle: 'Feature Card',
        blockType: 'cards',
        itemDescription: 'This is a short description',
      };

      const alt = generateAltText(context);

      expect(alt).toContain('Feature Card');
    });

    it('should add category when relevant', () => {
      const context: AltTextContext = {
        itemTitle: 'Product Item',
        category: 'Blenders',
      };

      const alt = generateAltText(context);

      expect(alt).toContain('Blenders');
    });

    it('should not duplicate category in alt text', () => {
      const context: AltTextContext = {
        itemTitle: 'Vitamix Blenders',
        category: 'Blenders',
      };

      const alt = generateAltText(context);

      // Should not contain 'Blenders' twice
      const blenderCount = (alt.match(/Blenders/gi) || []).length;
      expect(blenderCount).toBe(1);
    });

    it('should provide fallback for empty context', () => {
      const context: AltTextContext = {};

      const alt = generateAltText(context);

      expect(alt).toBe('Vitamix content image');
    });

    it('should truncate long alt text', () => {
      const context: AltTextContext = {
        itemTitle: 'A'.repeat(100),
        itemDescription: 'B'.repeat(100),
        blockType: 'cards',
        category: 'Long Category Name',
      };

      const alt = generateAltText(context);

      expect(alt.length).toBeLessThanOrEqual(125);
    });

    it('should handle carousel block type', () => {
      const context: AltTextContext = {
        blockType: 'carousel',
      };

      const alt = generateAltText(context);

      expect(alt).toContain('carousel slide');
    });
  });

  describe('generateImageHint', () => {
    it('should include item title', () => {
      const context: AltTextContext = {
        itemTitle: 'Green Smoothie',
      };

      const hint = generateImageHint(context);

      expect(hint).toContain('Green Smoothie');
    });

    it('should add hero-specific hints', () => {
      const context: AltTextContext = {
        blockType: 'hero',
      };

      const hint = generateImageHint(context);

      expect(hint).toContain('modern Vitamix blender');
      expect(hint).toContain('kitchen background');
      expect(hint).toContain('professional food photography');
    });

    it('should add product-specific hints', () => {
      const context: AltTextContext = {
        blockType: 'product',
      };

      const hint = generateImageHint(context);

      expect(hint).toContain('product shot');
      expect(hint).toContain('white background');
      expect(hint).toContain('studio lighting');
    });

    it('should add recipe-specific hints', () => {
      const context: AltTextContext = {
        blockType: 'recipe',
      };

      const hint = generateImageHint(context);

      expect(hint).toContain('fresh ingredients');
      expect(hint).toContain('healthy food photography');
      expect(hint).toContain('vibrant colors');
    });

    it('should detect smoothie in description', () => {
      const context: AltTextContext = {
        blockType: 'cards',
        itemDescription: 'Make delicious smoothies every day',
      };

      const hint = generateImageHint(context);

      expect(hint).toContain('colorful smoothie');
    });

    it('should detect soup in description', () => {
      const context: AltTextContext = {
        blockType: 'feature',
        itemDescription: 'Hot soup recipes for winter',
      };

      const hint = generateImageHint(context);

      expect(hint).toContain('steaming hot soup');
    });

    it('should provide fallback hint', () => {
      const context: AltTextContext = {};

      const hint = generateImageHint(context);

      expect(hint).toContain('Vitamix blender');
      expect(hint).toContain('fresh ingredients');
    });
  });

  describe('improveAltText', () => {
    it('should improve generic alt text', () => {
      const html = '<img src="/img.jpg" alt="image" data-image-hint="smoothie, healthy">';

      const improved = improveAltText(html, 'Recipe Page');

      expect(improved).toContain('alt="smoothie"');
    });

    it('should replace placeholder alt text', () => {
      const html = '<img src="/img.jpg" alt="placeholder image">';

      const improved = improveAltText(html, 'Vitamix Products');

      expect(improved).toContain('Vitamix Products');
      expect(improved).not.toContain('placeholder');
    });

    it('should use data-sku for product images', () => {
      const html = '<img src="/img.jpg" alt="img" data-sku="A3500">';

      const improved = improveAltText(html, 'Products');

      expect(improved).toContain('Vitamix A3500');
    });

    it('should preserve good alt text', () => {
      const html = '<img src="/img.jpg" alt="Vitamix A3500 professional blender on kitchen counter">';

      const improved = improveAltText(html, 'Page Title');

      expect(improved).toContain('Vitamix A3500 professional blender on kitchen counter');
    });

    it('should handle multiple images', () => {
      const html = `
        <img src="/a.jpg" alt="image" data-image-hint="smoothie">
        <img src="/b.jpg" alt="placeholder" data-sku="E320">
        <img src="/c.jpg" alt="Good alt text that is long enough">
      `;

      const improved = improveAltText(html, 'Test Page');

      expect(improved).toContain('alt="smoothie"');
      expect(improved).toContain('Vitamix E320');
      expect(improved).toContain('Good alt text that is long enough');
    });

    it('should not modify images without alt', () => {
      const html = '<img src="/img.jpg">';

      const improved = improveAltText(html, 'Page');

      expect(improved).toBe(html);
    });
  });
});
