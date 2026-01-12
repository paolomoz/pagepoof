/**
 * URL Mapper Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildUrlCatalog,
  findProduct,
  findRecipe,
  correctUrls,
  type UrlCatalog,
} from '../pipeline/url-mapper';

describe('URL Mapper', () => {
  let catalog: UrlCatalog;

  beforeEach(() => {
    // Build test catalog
    catalog = buildUrlCatalog(
      [
        { sku: 'A3500', name: 'Vitamix Ascent A3500' },
        { sku: 'E320', name: 'Vitamix Explorian E320' },
        { sku: '750', name: 'Professional Series 750' },
        { sku: '24_OUNCE_TUMBLER', name: '24-ounce Tumbler' },
      ],
      [
        { slug: 'green-smoothie/', title: 'Classic Green Smoothie' },
        { slug: 'tomato-soup/', title: 'Roasted Tomato Soup' },
        { slug: 'almond-butter/', title: 'Homemade Almond Butter' },
        { slug: 'acai-bowl/', title: 'Açaí Bowl' },
      ]
    );
  });

  describe('buildUrlCatalog', () => {
    it('should index products by SKU', () => {
      expect(catalog.products.has('a3500')).toBe(true);
      expect(catalog.products.has('e320')).toBe(true);
    });

    it('should index products by normalized name', () => {
      expect(catalog.products.has('vitamixascenta3500')).toBe(true);
    });

    it('should index recipes by slug', () => {
      expect(catalog.recipes.has('greensmoothie')).toBe(true);
      expect(catalog.recipes.has('tomatosoup')).toBe(true);
    });

    it('should index recipes by title', () => {
      expect(catalog.recipes.has('classicgreensmoothie')).toBe(true);
    });
  });

  describe('findProduct', () => {
    it('should find product by exact SKU', () => {
      const product = findProduct('A3500', catalog);
      expect(product).toBeDefined();
      expect(product?.sku).toBe('A3500');
    });

    it('should find product by lowercase SKU', () => {
      const product = findProduct('a3500', catalog);
      expect(product).toBeDefined();
      expect(product?.sku).toBe('A3500');
    });

    it('should find product by partial name match', () => {
      const product = findProduct('ascent-a3500', catalog);
      expect(product).toBeDefined();
      expect(product?.sku).toBe('A3500');
    });

    it('should return null for unknown product', () => {
      const product = findProduct('unknown-product', catalog);
      expect(product).toBeNull();
    });

    it('should handle SKUs with underscores', () => {
      const product = findProduct('24_OUNCE_TUMBLER', catalog);
      expect(product).toBeDefined();
      expect(product?.sku).toBe('24_OUNCE_TUMBLER');
    });
  });

  describe('findRecipe', () => {
    it('should find recipe by exact slug', () => {
      const recipe = findRecipe('green-smoothie', catalog);
      expect(recipe).toBeDefined();
      expect(recipe?.slug).toBe('green-smoothie/');
    });

    it('should find recipe by title match', () => {
      const recipe = findRecipe('classic-green-smoothie', catalog);
      expect(recipe).toBeDefined();
    });

    it('should find recipe with fuzzy matching', () => {
      const recipe = findRecipe('greensmoothie', catalog);
      expect(recipe).toBeDefined();
    });

    it('should return null for unknown recipe', () => {
      const recipe = findRecipe('unknown-recipe-xyz', catalog);
      expect(recipe).toBeNull();
    });
  });

  describe('correctUrls', () => {
    it('should not modify already correct product URLs', () => {
      const html = '<a href="/products/A3500">Product</a>';
      const corrected = correctUrls(html, catalog);
      expect(corrected).toContain('href="/products/A3500"');
    });

    it('should correct lowercase product URLs', () => {
      const html = '<a href="/products/a3500">Product</a>';
      const corrected = correctUrls(html, catalog);
      expect(corrected).toContain('href="/products/A3500"');
    });

    it('should correct recipe URLs with trailing slashes', () => {
      const html = '<a href="/recipes/green-smoothie//">Recipe</a>';
      const corrected = correctUrls(html, catalog);
      expect(corrected).toContain('href="/recipes/green-smoothie/"');
    });

    it('should preserve unknown URLs', () => {
      const html = '<a href="/products/unknown-xyz">Product</a>';
      const corrected = correctUrls(html, catalog);
      expect(corrected).toContain('href="/products/unknown-xyz"');
    });

    it('should handle multiple URLs in same HTML', () => {
      const html = `
        <a href="/products/a3500">Product 1</a>
        <a href="/recipes/tomato-soup/">Recipe 1</a>
        <a href="/products/e320">Product 2</a>
      `;
      const corrected = correctUrls(html, catalog);
      expect(corrected).toContain('href="/products/A3500"');
      expect(corrected).toContain('href="/products/E320"');
      expect(corrected).toContain('href="/recipes/tomato-soup/"');
    });
  });
});
