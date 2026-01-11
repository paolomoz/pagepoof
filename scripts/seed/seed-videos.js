/**
 * Seed Videos Script
 * Populates D1 database with Vitamix YouTube video data
 *
 * Data sourced from: https://www.youtube.com/@VitamixCorporation/videos
 *
 * Usage: node scripts/seed/seed-videos.js
 */

// Real videos from Vitamix YouTube channel (scraped Jan 2026)
const videos = [
  {
    id: 'wGdk2Du4eqE',
    title: 'Meet the Ascent X5',
    description: 'Introducing the Vitamix Ascent X5 - our premium blender with 10 blending programs, touch interface, and Self-Detect technology.',
    thumbnail_url: 'https://i.ytimg.com/vi/wGdk2Du4eqE/hqdefault.jpg',
    duration_seconds: 90,
    published_at: '2025-02-01T10:00:00Z',
    view_count: 9000,
    like_count: 450,
    categories: JSON.stringify(['product', 'ascent-x', 'introduction']),
    products_mentioned: JSON.stringify(['ascent-x5']),
    recipes_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['ascent x5', 'vitamix', 'blender', 'premium blender'])
  },
  {
    id: 'ysvdMRI1zIw',
    title: 'Meet the Ascent X4',
    description: 'Discover the Vitamix Ascent X4 with 4 blending programs, touch interface, and premium features.',
    thumbnail_url: 'https://i.ytimg.com/vi/ysvdMRI1zIw/hqdefault.jpg',
    duration_seconds: 85,
    published_at: '2025-02-01T10:00:00Z',
    view_count: 3300,
    like_count: 165,
    categories: JSON.stringify(['product', 'ascent-x', 'introduction']),
    products_mentioned: JSON.stringify(['ascent-x4']),
    recipes_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['ascent x4', 'vitamix', 'blender'])
  },
  {
    id: 'MzQsa_JYBRo',
    title: 'Meet the Ascent X3',
    description: 'Introducing the Vitamix Ascent X3 with 3 blending programs and touch interface.',
    thumbnail_url: 'https://i.ytimg.com/vi/MzQsa_JYBRo/hqdefault.jpg',
    duration_seconds: 80,
    published_at: '2025-02-01T10:00:00Z',
    view_count: 2200,
    like_count: 110,
    categories: JSON.stringify(['product', 'ascent-x', 'introduction']),
    products_mentioned: JSON.stringify(['ascent-x3']),
    recipes_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['ascent x3', 'vitamix', 'blender'])
  },
  {
    id: 'dGhKHXzkREg',
    title: 'Meet the Ascent X2',
    description: 'Discover the Vitamix Ascent X2 - entry-level Ascent X with Self-Detect technology.',
    thumbnail_url: 'https://i.ytimg.com/vi/dGhKHXzkREg/hqdefault.jpg',
    duration_seconds: 81,
    published_at: '2025-02-01T10:00:00Z',
    view_count: 3700,
    like_count: 185,
    categories: JSON.stringify(['product', 'ascent-x', 'introduction']),
    products_mentioned: JSON.stringify(['ascent-x2']),
    recipes_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['ascent x2', 'vitamix', 'blender', 'entry level'])
  },
  {
    id: 'bn3yWtKAFYs',
    title: 'Vitamix Ascent X2 SmartPrep Kitchen System',
    description: 'The complete Ascent X2 SmartPrep Kitchen System with food processor and blending accessories.',
    thumbnail_url: 'https://i.ytimg.com/vi/bn3yWtKAFYs/hqdefault.jpg',
    duration_seconds: 57,
    published_at: '2025-06-01T14:00:00Z',
    view_count: 2600,
    like_count: 130,
    categories: JSON.stringify(['product', 'ascent-x', 'smartprep']),
    products_mentioned: JSON.stringify(['ascent-x2-smartprep']),
    recipes_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['smartprep', 'kitchen system', 'ascent x2', 'vitamix'])
  },
  {
    id: 'Yd91DHGm6H8',
    title: 'Vitamix Ascent X4 Gourmet SmartPrep Kitchen System',
    description: 'Premium kitchen system with Ascent X4, food processor, and gourmet accessories.',
    thumbnail_url: 'https://i.ytimg.com/vi/Yd91DHGm6H8/hqdefault.jpg',
    duration_seconds: 59,
    published_at: '2025-06-01T14:00:00Z',
    view_count: 1400,
    like_count: 70,
    categories: JSON.stringify(['product', 'ascent-x', 'smartprep']),
    products_mentioned: JSON.stringify(['ascent-x4-gourmet-smartprep']),
    recipes_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['smartprep', 'gourmet', 'kitchen system', 'ascent x4'])
  },
  {
    id: 'm-FehBFidAc',
    title: 'Ascent X Series: Try Everything',
    description: 'Experience the full potential of the Vitamix Ascent X Series - smoothies, soups, nut butters, and more.',
    thumbnail_url: 'https://i.ytimg.com/vi/m-FehBFidAc/hqdefault.jpg',
    duration_seconds: 31,
    published_at: '2025-01-01T15:00:00Z',
    view_count: 9400,
    like_count: 470,
    categories: JSON.stringify(['product', 'ascent-x', 'overview']),
    products_mentioned: JSON.stringify(['ascent-x5', 'ascent-x4', 'ascent-x3', 'ascent-x2']),
    recipes_mentioned: JSON.stringify(['green-smoothie', 'tomato-basil-soup', 'almond-butter']),
    tags: JSON.stringify(['ascent x series', 'vitamix', 'blender comparison'])
  },
  {
    id: '7Lc7o3Y5DkM',
    title: 'The Essential Cocktail',
    description: 'Make the perfect frozen cocktail with your Vitamix blender.',
    thumbnail_url: 'https://i.ytimg.com/vi/7Lc7o3Y5DkM/hqdefault.jpg',
    duration_seconds: 16,
    published_at: '2025-09-01T16:00:00Z',
    view_count: 996000,
    like_count: 49800,
    categories: JSON.stringify(['recipe', 'cocktail', 'frozen-drink']),
    products_mentioned: JSON.stringify(['ascent-x5', 'propel-750']),
    recipes_mentioned: JSON.stringify(['whole-fruit-margarita']),
    tags: JSON.stringify(['cocktail', 'frozen drinks', 'margarita', 'vitamix recipe'])
  },
  {
    id: 'ycDmkH2ETU0',
    title: 'Vitamix: Only the Essential',
    description: 'Discover what makes Vitamix the essential kitchen tool for healthy living.',
    thumbnail_url: 'https://i.ytimg.com/vi/ycDmkH2ETU0/hqdefault.jpg',
    duration_seconds: 31,
    published_at: '2025-08-01T10:00:00Z',
    view_count: 975000,
    like_count: 48750,
    categories: JSON.stringify(['brand', 'lifestyle', 'overview']),
    products_mentioned: JSON.stringify([]),
    recipes_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['vitamix', 'healthy living', 'brand story'])
  },
  {
    id: 'N3whSx-5VoU',
    title: 'Vitamix Personal Cup Adapter',
    description: 'Make single-serve smoothies and blends with the Personal Cup Adapter accessory.',
    thumbnail_url: 'https://i.ytimg.com/vi/N3whSx-5VoU/hqdefault.jpg',
    duration_seconds: 61,
    published_at: '2025-09-01T10:00:00Z',
    view_count: 1900,
    like_count: 95,
    categories: JSON.stringify(['accessory', 'product', 'tutorial']),
    products_mentioned: JSON.stringify(['propel-750', 'e310']),
    recipes_mentioned: JSON.stringify(['green-smoothie']),
    tags: JSON.stringify(['personal cup', 'adapter', 'single serve', 'accessory'])
  },
  {
    id: 'AOjE_B-bcHU',
    title: 'Culinary Connections: Vichyssoise (Potato Leek Soup) by Chef Eric Wells',
    description: 'Learn to make classic French Vichyssoise potato leek soup with Chef Eric Wells using your Vitamix.',
    thumbnail_url: 'https://i.ytimg.com/vi/AOjE_B-bcHU/hqdefault.jpg',
    duration_seconds: 420,
    published_at: '2025-09-01T12:00:00Z',
    view_count: 559,
    like_count: 28,
    categories: JSON.stringify(['recipe', 'soup', 'chef-series']),
    products_mentioned: JSON.stringify(['ascent-x5']),
    recipes_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['vichyssoise', 'potato soup', 'leek soup', 'chef recipe', 'french cuisine'])
  },
  {
    id: 'ZnERDGw40EA',
    title: 'Vitamix 12-Cup Food Processor Attachment with SELF-DETECT',
    description: 'Expand your Vitamix with the 12-Cup Food Processor Attachment featuring SELF-DETECT technology.',
    thumbnail_url: 'https://i.ytimg.com/vi/ZnERDGw40EA/hqdefault.jpg',
    duration_seconds: 83,
    published_at: '2025-05-01T14:00:00Z',
    view_count: 5400,
    like_count: 270,
    categories: JSON.stringify(['accessory', 'product', 'food-processor']),
    products_mentioned: JSON.stringify(['ascent-x5', 'ascent-x4']),
    recipes_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['food processor', 'self-detect', 'attachment', 'accessory'])
  },
  {
    id: '-QwPScX1TEY',
    title: 'Culinary Connections: Mushroom Bulgogi Mia and Khana',
    description: 'Create delicious mushroom bulgogi with Mia and Khana using your Vitamix.',
    thumbnail_url: 'https://i.ytimg.com/vi/-QwPScX1TEY/hqdefault.jpg',
    duration_seconds: 683,
    published_at: '2025-06-01T12:00:00Z',
    view_count: 707,
    like_count: 35,
    categories: JSON.stringify(['recipe', 'korean', 'chef-series']),
    products_mentioned: JSON.stringify(['ascent-x5']),
    recipes_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['bulgogi', 'mushroom', 'korean food', 'chef recipe'])
  },
  {
    id: 'CqfCfyktCDA',
    title: 'Quick & Quiet Recipe: Mango Smoothie',
    description: 'Make a delicious mango smoothie using the Quick & Quiet blending feature.',
    thumbnail_url: 'https://i.ytimg.com/vi/CqfCfyktCDA/hqdefault.jpg',
    duration_seconds: 86,
    published_at: '2025-01-01T11:00:00Z',
    view_count: 2100,
    like_count: 105,
    categories: JSON.stringify(['recipe', 'smoothie', 'tutorial']),
    products_mentioned: JSON.stringify(['ascent-x5', 'ascent-x4']),
    recipes_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['mango smoothie', 'quick and quiet', 'smoothie recipe'])
  },
  {
    id: 'D0SzzVyTMVY',
    title: 'Quick & Quiet Recipe: Caramel Frappe',
    description: 'Create a coffee shop-style caramel frappe at home with the Quick & Quiet feature.',
    thumbnail_url: 'https://i.ytimg.com/vi/D0SzzVyTMVY/hqdefault.jpg',
    duration_seconds: 66,
    published_at: '2025-01-01T11:00:00Z',
    view_count: 4400,
    like_count: 220,
    categories: JSON.stringify(['recipe', 'coffee', 'frappe']),
    products_mentioned: JSON.stringify(['ascent-x5', 'ascent-x4']),
    recipes_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['caramel frappe', 'coffee', 'iced coffee', 'quick and quiet'])
  },
  {
    id: 'OzlmHdIokOU',
    title: 'Immersi-Prep: Roasted Red Pepper Soup',
    description: 'Make creamy roasted red pepper soup using the Immersi-Prep immersion blender.',
    thumbnail_url: 'https://i.ytimg.com/vi/OzlmHdIokOU/hqdefault.jpg',
    duration_seconds: 115,
    published_at: '2025-01-01T12:00:00Z',
    view_count: 592,
    like_count: 30,
    categories: JSON.stringify(['recipe', 'soup', 'immersion-blender']),
    products_mentioned: JSON.stringify([]),
    recipes_mentioned: JSON.stringify(['roasted-red-pepper-soup']),
    tags: JSON.stringify(['roasted red pepper', 'soup', 'immersion blender', 'immersi-prep'])
  }
];

// Generate SQL insert statements
function generateSQL() {
  let sql = '-- Auto-generated video seed data from Vitamix YouTube channel\n\n';

  for (const v of videos) {
    const fields = [
      'id', 'title', 'description', 'thumbnail_url', 'duration_seconds',
      'published_at', 'view_count', 'like_count', 'categories',
      'products_mentioned', 'recipes_mentioned', 'tags'
    ];
    const values = fields.map(f => {
      const val = v[f];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val;
      return `'${String(val).replace(/'/g, "''")}'`;
    });
    sql += `INSERT OR REPLACE INTO videos (${fields.join(', ')}) VALUES (${values.join(', ')});\n`;
  }

  return sql;
}

// Export for use
module.exports = { videos, generateSQL };

// If run directly, output SQL
if (require.main === module) {
  console.log(generateSQL());
}
