/**
 * Renderer Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { renderBlocks, renderBlocksWithStats, buildPageHtml } from '../pipeline/renderer';
import type { ContentAtom } from '../pipeline/generator';
import type { LayoutBlock } from '../pipeline/layout';

describe('Block Renderer', () => {
  describe('renderBlocks', () => {
    it('should render hero block', () => {
      const atoms: ContentAtom[] = [
        { type: 'heading', content: { text: 'Welcome to Vitamix', level: 1 }, priority: 1 },
        { type: 'paragraph', content: { text: 'Transform your kitchen' }, priority: 2 },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'hero', atomIndices: [0, 1] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('hero');
      expect(result[0].html).toContain('Welcome to Vitamix');
      expect(result[0].html).toContain('Transform your kitchen');
      expect(result[0].html).toContain('class="hero"');
    });

    it('should render cards block with features', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'feature_set',
          content: {
            features: [
              { title: 'Feature 1', description: 'Description 1' },
              { title: 'Feature 2', description: 'Description 2' },
            ],
          },
          priority: 1,
        },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'cards', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('Feature 1');
      expect(result[0].html).toContain('Description 1');
      expect(result[0].html).toContain('class="cards"');
    });

    it('should render accordion block with FAQs', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'faq_set',
          content: {
            faqs: [
              { question: 'What is Vitamix?', answer: 'A premium blender' },
              { question: 'How to clean?', answer: 'Add soap and water' },
            ],
          },
          priority: 1,
        },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'accordion', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('What is Vitamix?');
      expect(result[0].html).toContain('A premium blender');
      expect(result[0].html).toContain('class="accordion"');
    });

    it('should render video block', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'video',
          content: { id: 'abc123', title: 'Getting Started' },
          priority: 1,
        },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'video', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('youtube.com/watch?v=abc123');
      expect(result[0].html).toContain('Getting Started');
    });

    it('should render form block with CTA', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'cta',
          content: { text: 'Ready to start?', buttonText: 'Shop Now', url: '/products' },
          priority: 1,
        },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'form', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('Ready to start?');
      expect(result[0].html).toContain('Shop Now');
      expect(result[0].html).toContain('/products');
    });

    it('should render form block with default content when no CTA', () => {
      const atoms: ContentAtom[] = [];
      const blocks: LayoutBlock[] = [
        { blockName: 'form', atomIndices: [] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('Ready to transform your kitchen');
      expect(result[0].html).toContain('Shop Vitamix Blenders');
    });

    it('should render tips block', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'tips',
          content: { tips: ['Tip 1', 'Tip 2', 'Tip 3'] },
          priority: 1,
        },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'tips', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('Tip 1');
      expect(result[0].html).toContain('Tip 2');
      expect(result[0].html).toContain('Pro Tips');
    });

    it('should render nutrition-facts block', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'nutrition_facts',
          content: { calories: 150, protein: '5g', carbs: '20g', fat: '3g' },
          priority: 1,
        },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'nutrition-facts', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('Nutrition Facts');
      expect(result[0].html).toContain('150');
      expect(result[0].html).toContain('5g');
    });

    it('should render columns with fallback when empty', () => {
      const atoms: ContentAtom[] = [];
      const blocks: LayoutBlock[] = [
        { blockName: 'columns', atomIndices: [] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('Explore our full range');
      expect(result[0].html).not.toContain('[');
    });

    it('should render pdp block', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'product_detail',
          content: {
            sku: 'A3500',
            name: 'Vitamix A3500',
            price: 649,
            description: 'Smart blender',
            features: ['Touch screen', 'Self-detect'],
          },
          priority: 1,
        },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'pdp', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('Vitamix A3500');
      expect(result[0].html).toContain('$649');
      expect(result[0].html).toContain('Touch screen');
    });

    it('should render comparison-cards block', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'comparison',
          content: {
            products: [
              { sku: 'A3500', name: 'A3500', price: 649, pros: ['Smart'] },
              { sku: 'E320', name: 'E320', price: 349, pros: ['Affordable'] },
            ],
          },
          priority: 1,
        },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'comparison-cards', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('A3500');
      expect(result[0].html).toContain('E320');
      expect(result[0].html).toContain('$649');
      expect(result[0].html).toContain('Smart');
    });

    it('should render recipe-detail block', () => {
      const atoms: ContentAtom[] = [
        {
          type: 'recipe_detail',
          content: {
            title: 'Green Smoothie',
            description: 'Healthy and delicious',
            prepTime: 5,
            servings: '2',
            ingredients: ['Spinach', 'Banana'],
            instructions: ['Add ingredients', 'Blend'],
          },
          priority: 1,
        },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'recipe-detail', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('Green Smoothie');
      expect(result[0].html).toContain('Spinach');
      expect(result[0].html).toContain('Step 1');
    });

    it('should handle variant classes', () => {
      const atoms: ContentAtom[] = [
        { type: 'heading', content: { text: 'Test' }, priority: 1 },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'hero', atomIndices: [0], variant: 'dark' },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('class="hero dark"');
    });

    it('should escape HTML in content', () => {
      const atoms: ContentAtom[] = [
        { type: 'heading', content: { text: '<script>alert("xss")</script>' }, priority: 1 },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'hero', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).not.toContain('<script>');
      expect(result[0].html).toContain('&lt;script&gt;');
    });
  });

  describe('renderBlocksWithStats', () => {
    it('should return stats with blocks', () => {
      const atoms: ContentAtom[] = [
        { type: 'heading', content: { text: 'Test' }, priority: 1 },
        {
          type: 'feature_set',
          content: {
            features: [
              { title: 'Feature 1', description: 'Desc 1' },
            ],
          },
          priority: 2,
        },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'hero', atomIndices: [0] },
        { blockName: 'cards', atomIndices: [1] },
      ];

      const result = renderBlocksWithStats(blocks, atoms);

      expect(result.totalCount).toBe(2);
      expect(result.blocks).toHaveLength(2);
      expect(result.skippedCount).toBe(0);
    });

    it('should skip empty blocks and track skippedCount', () => {
      const atoms: ContentAtom[] = [
        { type: 'heading', content: { text: 'Test' }, priority: 1 },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'hero', atomIndices: [0] },
        { blockName: 'cards', atomIndices: [] }, // Empty - should be skipped
      ];

      const result = renderBlocksWithStats(blocks, atoms);

      // totalCount reflects actually rendered blocks
      expect(result.totalCount).toBe(1);
      expect(result.blocks).toHaveLength(1);
      // skippedCount = input blocks (2) - rendered blocks (1)
      expect(result.skippedCount).toBe(1);
      expect(result.blocks[0].name).toBe('hero');
    });

    it('should track failed blocks', () => {
      // This tests error recovery - even with bad data, blocks render with fallback
      const atoms: ContentAtom[] = [];
      const blocks: LayoutBlock[] = [
        { blockName: 'unknown-block', atomIndices: [999] }, // Invalid index
      ];

      const result = renderBlocksWithStats(blocks, atoms);

      expect(result.totalCount).toBe(1);
      // Unknown blocks render with generic renderer, not as errors
      expect(result.blocks[0].name).toBe('unknown-block');
    });
  });

  describe('buildPageHtml', () => {
    it('should build complete HTML document', () => {
      const blocks = [
        { name: 'hero', html: '<div class="hero">Hero</div>', atoms: [] },
        { name: 'cards', html: '<div class="cards">Cards</div>', atoms: [] },
      ];

      const html = buildPageHtml('Test Page', 'Test description', blocks);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Test Page</title>');
      expect(html).toContain('content="Test description"');
      expect(html).toContain('<div class="hero">Hero</div>');
      expect(html).toContain('<div class="cards">Cards</div>');
    });

    it('should include required resources', () => {
      const html = buildPageHtml('Test', 'Desc', []);

      expect(html).toContain('href="/styles/styles.css"');
      expect(html).toContain('src="/scripts/aem.js"');
    });

    it('should escape title and description', () => {
      const html = buildPageHtml('Test <script>', 'Desc "quoted"', []);

      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&quot;quoted&quot;');
    });
  });

  describe('generic block rendering', () => {
    it('should render heading atoms', () => {
      const atoms: ContentAtom[] = [
        { type: 'heading', content: { text: 'Section Title', level: 2 }, priority: 1 },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'custom-section', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('<h2>Section Title</h2>');
    });

    it('should render paragraph atoms', () => {
      const atoms: ContentAtom[] = [
        { type: 'paragraph', content: { text: 'Some content here' }, priority: 1 },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'custom-section', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('<p>Some content here</p>');
    });

    it('should render list atoms', () => {
      const atoms: ContentAtom[] = [
        { type: 'list', content: { items: ['Item 1', 'Item 2'], ordered: true }, priority: 1 },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'custom-section', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).toContain('<ol>');
      expect(result[0].html).toContain('<li>Item 1</li>');
    });

    it('should skip unknown atom types gracefully', () => {
      const atoms: ContentAtom[] = [
        { type: 'unknown_type' as any, content: {}, priority: 1 },
      ];
      const blocks: LayoutBlock[] = [
        { blockName: 'custom-section', atomIndices: [0] },
      ];

      const result = renderBlocks(blocks, atoms);

      expect(result[0].html).not.toContain('[unknown_type]');
      expect(result[0].html).toContain('Explore our Vitamix');
    });
  });
});
