/**
 * Seed Products Script
 * Populates D1 database with Vitamix product data
 *
 * Usage: node scripts/seed/seed-products.js
 * Or via wrangler: wrangler d1 execute pagepoof-db --file=scripts/seed/products.sql
 */

// Product data scraped from vitamix.com
const products = [
  // Ascent X Series
  {
    sku: 'ascent-x5-smartprep',
    name: 'Ascent® X5 SmartPrep™ Kitchen System',
    series: 'Ascent X',
    model: 'X5',
    price: 949.95,
    regular_price: 949.95,
    warranty_years: 10,
    url: '/us/en_us/shop/blenders/ascent-x5-smartprep-kitchen-system',
    description: 'The ultimate kitchen system with SmartPrep technology, food processor, and premium accessories.',
    features: JSON.stringify(['SmartPrep Technology', 'Food Processor Attachment', 'Self-Detect Technology', 'Touch Interface', '5 Program Settings', 'Tamper Indicator', '+15 Second Button']),
  },
  {
    sku: 'ascent-x4-gourmet-smartprep',
    name: 'Ascent® X4 Gourmet SmartPrep™ Kitchen System',
    series: 'Ascent X',
    model: 'X4',
    price: 899.95,
    regular_price: 899.95,
    warranty_years: 10,
    url: '/us/en_us/shop/blenders/ascent-x4-gourmet-smartprep-kitchen-system',
    description: 'Gourmet kitchen system with SmartPrep technology and premium accessories.',
    features: JSON.stringify(['SmartPrep Technology', 'Self-Detect Technology', 'Touch Interface', '4 Program Settings', 'Tamper Indicator', '+15 Second Button']),
  },
  {
    sku: 'ascent-x5-stainless',
    name: 'Ascent® X5 with Stainless Steel Container',
    series: 'Ascent X',
    model: 'X5',
    price: 799.95,
    regular_price: 799.95,
    warranty_years: 10,
    url: '/us/en_us/shop/blenders/ascent-x5-with-stainless-steel-container',
    description: 'Premium blender with stainless steel container for durability and style.',
    features: JSON.stringify(['Stainless Steel Container', 'Self-Detect Technology', 'Touch Interface', '5 Program Settings', 'Tamper Indicator', '+15 Second Button']),
  },
  {
    sku: 'ascent-x5',
    name: 'Ascent® X5',
    series: 'Ascent X',
    model: 'X5',
    price: 749.95,
    regular_price: 749.95,
    warranty_years: 10,
    url: '/us/en_us/shop/blenders/ascent-x5',
    description: 'Top-of-the-line Ascent X blender with all premium features.',
    features: JSON.stringify(['Self-Detect Technology', 'Touch Interface', '5 Program Settings', 'Digital Timer', 'Tamper Indicator', '+15 Second Button']),
  },
  {
    sku: 'ascent-x4',
    name: 'Ascent® X4',
    series: 'Ascent X',
    model: 'X4',
    price: 699.95,
    regular_price: 699.95,
    warranty_years: 10,
    url: '/us/en_us/shop/blenders/ascent-x4',
    description: 'Premium Ascent X blender with advanced features.',
    features: JSON.stringify(['Self-Detect Technology', 'Touch Interface', '4 Program Settings', 'Digital Timer', 'Tamper Indicator', '+15 Second Button']),
  },
  {
    sku: 'ascent-x3',
    name: 'Ascent® X3',
    series: 'Ascent X',
    model: 'X3',
    price: 649.95,
    regular_price: 649.95,
    warranty_years: 10,
    url: '/us/en_us/shop/blenders/ascent-x3',
    description: 'Mid-range Ascent X blender with touch interface.',
    features: JSON.stringify(['Self-Detect Technology', 'Touch Interface', '3 Program Settings', 'Digital Timer']),
  },
  {
    sku: 'ascent-x2-smartprep',
    name: 'Ascent® X2 SmartPrep™ Kitchen System',
    series: 'Ascent X',
    model: 'X2',
    price: 749.95,
    regular_price: 749.95,
    warranty_years: 10,
    url: '/us/en_us/shop/blenders/ascent-x2-smartprep-kitchen-system',
    description: 'Entry Ascent X with SmartPrep kitchen system accessories.',
    features: JSON.stringify(['SmartPrep Technology', 'Self-Detect Technology', 'Variable Speed', 'Pulse']),
  },
  {
    sku: 'ascent-x2',
    name: 'Ascent® X2',
    series: 'Ascent X',
    model: 'X2',
    price: 549.95,
    regular_price: 549.95,
    warranty_years: 10,
    url: '/us/en_us/shop/blenders/ascent-x2',
    description: 'Entry-level Ascent X blender with Self-Detect technology.',
    features: JSON.stringify(['Self-Detect Technology', 'Variable Speed', 'Pulse', 'Digital Timer']),
  },

  // Legacy/5200 Series
  {
    sku: '5200-stainless',
    name: '5200 + Stainless Steel Container',
    series: 'Legacy',
    model: '5200',
    price: 679.95,
    regular_price: 679.95,
    warranty_years: 7,
    url: '/us/en_us/shop/blenders/5200-plus-stainless-steel-container',
    description: 'Classic 5200 with premium stainless steel container.',
    features: JSON.stringify(['Variable Speed', 'Pulse', 'Stainless Steel Container', '64oz Classic Container']),
  },
  {
    sku: '5200-legacy-bundle',
    name: '5200 Legacy Bundle',
    series: 'Legacy',
    model: '5200',
    price: 649.95,
    regular_price: 649.95,
    warranty_years: 7,
    url: '/us/en_us/shop/blenders/5200-legacy-bundle',
    description: 'Complete 5200 bundle with accessories.',
    features: JSON.stringify(['Variable Speed', 'Pulse', '64oz Classic Container', 'Recipe Book']),
  },
  {
    sku: '5200-standard',
    name: '5200 Standard - Getting Started',
    series: 'Legacy',
    model: '5200',
    price: 499.95,
    regular_price: 499.95,
    warranty_years: 7,
    url: '/us/en_us/shop/blenders/5200-standard-getting-started',
    description: 'Classic Vitamix 5200 - the original high-performance blender.',
    features: JSON.stringify(['Variable Speed', 'Pulse', '64oz Classic Container']),
  },

  // Explorian Series
  {
    sku: 'e310-pca-bundle',
    name: 'E310 + Personal Cup Adapter',
    series: 'Explorian',
    model: 'E310',
    price: 499.95,
    regular_price: 499.95,
    warranty_years: 5,
    url: '/us/en_us/shop/blenders/e310-and-pca-bundle',
    description: 'Entry-level Explorian with personal cup adapter for single servings.',
    features: JSON.stringify(['Variable Speed', 'Pulse', '48oz Container', 'Personal Cup Adapter']),
  },
  {
    sku: 'e310',
    name: 'Explorian® E310',
    series: 'Explorian',
    model: 'E310',
    price: 349.95,
    regular_price: 349.95,
    warranty_years: 5,
    url: '/us/en_us/shop/blenders/e310',
    description: 'Entry-level Vitamix with professional-grade power.',
    features: JSON.stringify(['Variable Speed', 'Pulse', '48oz Container']),
  },
  {
    sku: 'e320',
    name: 'Explorian® E320',
    series: 'Explorian',
    model: 'E320',
    price: 449.95,
    regular_price: 449.95,
    warranty_years: 5,
    url: '/us/en_us/shop/blenders/e320',
    description: 'Explorian with larger container for family-sized batches.',
    features: JSON.stringify(['Variable Speed', 'Pulse', '64oz Low-Profile Container']),
  },

  // Propel Series
  {
    sku: 'propel-750',
    name: 'Propel Series 750',
    series: 'Propel',
    model: '750',
    price: 679.95,
    regular_price: 679.95,
    warranty_years: 7,
    url: '/us/en_us/shop/blenders/propel-750',
    description: 'High-performance Propel with 5 program settings.',
    features: JSON.stringify(['5 Program Settings', 'Variable Speed', 'Pulse', '64oz Low-Profile Container']),
  },
  {
    sku: 'propel-510',
    name: 'Propel Series 510',
    series: 'Propel',
    model: '510',
    price: 549.95,
    regular_price: 549.95,
    warranty_years: 5,
    url: '/us/en_us/shop/blenders/propel-510',
    description: 'Propel with variable speed control.',
    features: JSON.stringify(['Variable Speed', 'Pulse', '48oz Container']),
  },
];

// Product features for comparison matrix
const productFeatures = [
  // Ascent X features
  { series: 'Ascent X', feature_name: 'Blending Programs', feature_value: '✓', feature_category: 'blender_features', sort_order: 1 },
  { series: 'Ascent X', feature_name: 'Variable Speed Control', feature_value: '✓', feature_category: 'blender_features', sort_order: 2 },
  { series: 'Ascent X', feature_name: 'Touch Buttons', feature_value: '✓ (X3-X5)', feature_category: 'blender_features', sort_order: 3 },
  { series: 'Ascent X', feature_name: 'Pulse', feature_value: '✓', feature_category: 'blender_features', sort_order: 4 },
  { series: 'Ascent X', feature_name: 'Digital Timer', feature_value: '✓', feature_category: 'blender_features', sort_order: 5 },
  { series: 'Ascent X', feature_name: 'Self-Detect Technology', feature_value: '✓', feature_category: 'blender_features', sort_order: 6 },
  { series: 'Ascent X', feature_name: 'Tamper Indicator', feature_value: '✓ (X4, X5)', feature_category: 'blender_features', sort_order: 7 },
  { series: 'Ascent X', feature_name: '+15 Second Button', feature_value: '✓', feature_category: 'blender_features', sort_order: 8 },
  { series: 'Ascent X', feature_name: 'Warranty', feature_value: '10 Year', feature_category: 'blender_features', sort_order: 9 },

  // Ascent features
  { series: 'Ascent', feature_name: 'Blending Programs', feature_value: '✓', feature_category: 'blender_features', sort_order: 1 },
  { series: 'Ascent', feature_name: 'Variable Speed Control', feature_value: '✓', feature_category: 'blender_features', sort_order: 2 },
  { series: 'Ascent', feature_name: 'Touch Buttons', feature_value: '✓ (A3300, A3500)', feature_category: 'blender_features', sort_order: 3 },
  { series: 'Ascent', feature_name: 'Pulse', feature_value: '✓', feature_category: 'blender_features', sort_order: 4 },
  { series: 'Ascent', feature_name: 'Digital Timer', feature_value: '✓', feature_category: 'blender_features', sort_order: 5 },
  { series: 'Ascent', feature_name: 'Self-Detect Technology', feature_value: '✓', feature_category: 'blender_features', sort_order: 6 },
  { series: 'Ascent', feature_name: 'Tamper Indicator', feature_value: '—', feature_category: 'blender_features', sort_order: 7 },
  { series: 'Ascent', feature_name: '+15 Second Button', feature_value: '—', feature_category: 'blender_features', sort_order: 8 },
  { series: 'Ascent', feature_name: 'Warranty', feature_value: '10 Year', feature_category: 'blender_features', sort_order: 9 },

  // Propel features
  { series: 'Propel', feature_name: 'Blending Programs', feature_value: '✓', feature_category: 'blender_features', sort_order: 1 },
  { series: 'Propel', feature_name: 'Variable Speed Control', feature_value: '✓', feature_category: 'blender_features', sort_order: 2 },
  { series: 'Propel', feature_name: 'Touch Buttons', feature_value: '—', feature_category: 'blender_features', sort_order: 3 },
  { series: 'Propel', feature_name: 'Pulse', feature_value: '✓', feature_category: 'blender_features', sort_order: 4 },
  { series: 'Propel', feature_name: 'Digital Timer', feature_value: '—', feature_category: 'blender_features', sort_order: 5 },
  { series: 'Propel', feature_name: 'Self-Detect Technology', feature_value: '—', feature_category: 'blender_features', sort_order: 6 },
  { series: 'Propel', feature_name: 'Tamper Indicator', feature_value: '—', feature_category: 'blender_features', sort_order: 7 },
  { series: 'Propel', feature_name: '+15 Second Button', feature_value: '—', feature_category: 'blender_features', sort_order: 8 },
  { series: 'Propel', feature_name: 'Warranty', feature_value: '5-7 Year', feature_category: 'blender_features', sort_order: 9 },

  // Legacy features
  { series: 'Legacy', feature_name: 'Blending Programs', feature_value: '✓', feature_category: 'blender_features', sort_order: 1 },
  { series: 'Legacy', feature_name: 'Variable Speed Control', feature_value: '✓', feature_category: 'blender_features', sort_order: 2 },
  { series: 'Legacy', feature_name: 'Touch Buttons', feature_value: '—', feature_category: 'blender_features', sort_order: 3 },
  { series: 'Legacy', feature_name: 'Pulse', feature_value: '✓ (750, 7500)', feature_category: 'blender_features', sort_order: 4 },
  { series: 'Legacy', feature_name: 'Digital Timer', feature_value: '—', feature_category: 'blender_features', sort_order: 5 },
  { series: 'Legacy', feature_name: 'Self-Detect Technology', feature_value: '—', feature_category: 'blender_features', sort_order: 6 },
  { series: 'Legacy', feature_name: 'Tamper Indicator', feature_value: '—', feature_category: 'blender_features', sort_order: 7 },
  { series: 'Legacy', feature_name: '+15 Second Button', feature_value: '—', feature_category: 'blender_features', sort_order: 8 },
  { series: 'Legacy', feature_name: 'Warranty', feature_value: '7 Year', feature_category: 'blender_features', sort_order: 9 },

  // Explorian features
  { series: 'Explorian', feature_name: 'Blending Programs', feature_value: '—', feature_category: 'blender_features', sort_order: 1 },
  { series: 'Explorian', feature_name: 'Variable Speed Control', feature_value: '✓', feature_category: 'blender_features', sort_order: 2 },
  { series: 'Explorian', feature_name: 'Touch Buttons', feature_value: '—', feature_category: 'blender_features', sort_order: 3 },
  { series: 'Explorian', feature_name: 'Pulse', feature_value: '✓', feature_category: 'blender_features', sort_order: 4 },
  { series: 'Explorian', feature_name: 'Digital Timer', feature_value: '—', feature_category: 'blender_features', sort_order: 5 },
  { series: 'Explorian', feature_name: 'Self-Detect Technology', feature_value: '—', feature_category: 'blender_features', sort_order: 6 },
  { series: 'Explorian', feature_name: 'Tamper Indicator', feature_value: '—', feature_category: 'blender_features', sort_order: 7 },
  { series: 'Explorian', feature_name: '+15 Second Button', feature_value: '—', feature_category: 'blender_features', sort_order: 8 },
  { series: 'Explorian', feature_name: 'Warranty', feature_value: '5 Year', feature_category: 'blender_features', sort_order: 9 },
];

// Container compatibility matrix
const containerCompatibility = [
  // 48oz Stainless Steel - all series
  { series: 'Ascent X', container_name: '48oz Stainless Steel', compatible: true, notes: null },
  { series: 'Ascent', container_name: '48oz Stainless Steel', compatible: true, notes: null },
  { series: 'Propel', container_name: '48oz Stainless Steel', compatible: true, notes: null },
  { series: 'Legacy', container_name: '48oz Stainless Steel', compatible: true, notes: null },
  { series: 'Explorian', container_name: '48oz Stainless Steel', compatible: true, notes: null },

  // 48oz Aer Disc - all series
  { series: 'Ascent X', container_name: '48oz Aer™ Disc', compatible: true, notes: null },
  { series: 'Ascent', container_name: '48oz Aer™ Disc', compatible: true, notes: null },
  { series: 'Propel', container_name: '48oz Aer™ Disc', compatible: true, notes: null },
  { series: 'Legacy', container_name: '48oz Aer™ Disc', compatible: true, notes: null },
  { series: 'Explorian', container_name: '48oz Aer™ Disc', compatible: true, notes: null },

  // Self-Detect containers - Ascent X and Ascent only
  { series: 'Ascent X', container_name: 'Low-Profile 64oz w/ Self-Detect™', compatible: true, notes: null },
  { series: 'Ascent', container_name: 'Low-Profile 64oz w/ Self-Detect™', compatible: true, notes: null },
  { series: 'Propel', container_name: 'Low-Profile 64oz w/ Self-Detect™', compatible: false, notes: null },
  { series: 'Legacy', container_name: 'Low-Profile 64oz w/ Self-Detect™', compatible: false, notes: null },
  { series: 'Explorian', container_name: 'Low-Profile 64oz w/ Self-Detect™', compatible: false, notes: null },

  { series: 'Ascent X', container_name: '48oz w/ Self-Detect™', compatible: true, notes: null },
  { series: 'Ascent', container_name: '48oz w/ Self-Detect™', compatible: true, notes: null },
  { series: 'Propel', container_name: '48oz w/ Self-Detect™', compatible: false, notes: null },
  { series: 'Legacy', container_name: '48oz w/ Self-Detect™', compatible: false, notes: null },
  { series: 'Explorian', container_name: '48oz w/ Self-Detect™', compatible: false, notes: null },

  // Classic containers - Propel, Legacy only
  { series: 'Ascent X', container_name: 'Classic 64oz', compatible: false, notes: null },
  { series: 'Ascent', container_name: 'Classic 64oz', compatible: false, notes: null },
  { series: 'Propel', container_name: 'Classic 64oz', compatible: true, notes: null },
  { series: 'Legacy', container_name: 'Classic 64oz', compatible: true, notes: null },
  { series: 'Explorian', container_name: 'Classic 64oz', compatible: false, notes: null },

  // Low-Profile 64oz (non Self-Detect)
  { series: 'Ascent X', container_name: 'Low-Profile 64oz', compatible: false, notes: null },
  { series: 'Ascent', container_name: 'Low-Profile 64oz', compatible: false, notes: null },
  { series: 'Propel', container_name: 'Low-Profile 64oz', compatible: true, notes: 'Propel 750 only' },
  { series: 'Legacy', container_name: 'Low-Profile 64oz', compatible: true, notes: null },
  { series: 'Explorian', container_name: 'Low-Profile 64oz', compatible: true, notes: 'Some models' },
];

// Attachment compatibility matrix
const attachmentCompatibility = [
  { series: 'Ascent X', attachment_name: 'Food Processor', compatible: true, notes: null },
  { series: 'Ascent', attachment_name: 'Food Processor', compatible: true, notes: null },
  { series: 'Propel', attachment_name: 'Food Processor', compatible: false, notes: null },
  { series: 'Legacy', attachment_name: 'Food Processor', compatible: false, notes: null },
  { series: 'Explorian', attachment_name: 'Food Processor', compatible: false, notes: null },

  { series: 'Ascent X', attachment_name: 'Personal Cup Adapter', compatible: false, notes: 'Use Self-Detect cups' },
  { series: 'Ascent', attachment_name: 'Personal Cup Adapter', compatible: false, notes: 'Use Self-Detect cups' },
  { series: 'Propel', attachment_name: 'Personal Cup Adapter', compatible: true, notes: null },
  { series: 'Legacy', attachment_name: 'Personal Cup Adapter', compatible: true, notes: null },
  { series: 'Explorian', attachment_name: 'Personal Cup Adapter', compatible: true, notes: null },
];

// Generate SQL insert statements
function generateSQL() {
  let sql = '-- Auto-generated product seed data\n\n';

  // Products
  sql += '-- Products\n';
  for (const p of products) {
    sql += `INSERT OR REPLACE INTO products (sku, name, series, model, price, regular_price, warranty_years, url, description, features) VALUES ('${p.sku}', '${p.name.replace(/'/g, "''")}', '${p.series}', '${p.model}', ${p.price}, ${p.regular_price}, ${p.warranty_years}, '${p.url}', '${p.description.replace(/'/g, "''")}', '${p.features}');\n`;
  }

  // Product features
  sql += '\n-- Product Features\n';
  for (const f of productFeatures) {
    sql += `INSERT OR REPLACE INTO product_features (series, feature_name, feature_value, feature_category, sort_order) VALUES ('${f.series}', '${f.feature_name}', '${f.feature_value}', '${f.feature_category}', ${f.sort_order});\n`;
  }

  // Container compatibility
  sql += '\n-- Container Compatibility\n';
  for (const c of containerCompatibility) {
    const notes = c.notes ? `'${c.notes}'` : 'NULL';
    sql += `INSERT OR REPLACE INTO container_compatibility (series, container_name, compatible, notes) VALUES ('${c.series}', '${c.container_name}', ${c.compatible ? 1 : 0}, ${notes});\n`;
  }

  // Attachment compatibility
  sql += '\n-- Attachment Compatibility\n';
  for (const a of attachmentCompatibility) {
    const notes = a.notes ? `'${a.notes}'` : 'NULL';
    sql += `INSERT OR REPLACE INTO attachment_compatibility (series, attachment_name, compatible, notes) VALUES ('${a.series}', '${a.attachment_name}', ${a.compatible ? 1 : 0}, ${notes});\n`;
  }

  return sql;
}

// Export for use
module.exports = { products, productFeatures, containerCompatibility, attachmentCompatibility, generateSQL };

// If run directly, output SQL
if (require.main === module) {
  console.log(generateSQL());
}
