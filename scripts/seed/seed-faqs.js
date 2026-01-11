/**
 * Seed FAQs Script
 * Populates D1 database with Vitamix FAQ data for RAG
 *
 * Usage: node scripts/seed/seed-faqs.js
 */

// FAQs sourced from vitamix.com support pages
const faqs = [
  // General Questions
  {
    slug: 'which-vitamix-should-i-buy',
    question: 'Which Vitamix should I buy?',
    answer: 'The best Vitamix for you depends on your needs. For beginners, the E310 offers professional power at an accessible price. For advanced features like preset programs and Self-Detect technology, consider the Ascent X series. The X5 is our most advanced model with 10 programs, while the X2 is a great entry point to the Ascent X series.',
    category: 'buying-guide',
    products_mentioned: JSON.stringify(['e310', 'ascent-x5', 'ascent-x2']),
    tags: JSON.stringify(['buying guide', 'comparison', 'recommendations'])
  },
  {
    slug: 'vitamix-vs-regular-blender',
    question: 'What makes a Vitamix different from a regular blender?',
    answer: 'Vitamix blenders feature a powerful motor (2+ HP), aircraft-grade stainless steel blades, and variable speed control that allows you to achieve any texture. Unlike regular blenders, Vitamix machines can heat soup through friction, grind grains into flour, and make nut butters from whole nuts. The durability and 5-10 year warranties also set Vitamix apart.',
    category: 'general',
    products_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['comparison', 'features', 'power'])
  },
  {
    slug: 'how-loud-is-vitamix',
    question: 'How loud is a Vitamix?',
    answer: 'Vitamix blenders operate at approximately 88-92 decibels at high speeds, similar to a food processor. The Ascent X series features improved sound dampening compared to older models. For quieter operation, use the Quick & Quiet feature available on X4 and X5 models, which automatically adjusts the blend cycle for reduced noise.',
    category: 'general',
    products_mentioned: JSON.stringify(['ascent-x4', 'ascent-x5']),
    tags: JSON.stringify(['noise', 'volume', 'quick and quiet'])
  },

  // Usage & Features
  {
    slug: 'self-detect-technology',
    question: 'What is Self-Detect Technology?',
    answer: 'Self-Detect Technology automatically recognizes which container or attachment is placed on the motor base and adjusts the blending programs and maximum run time accordingly. This feature is available on Ascent and Ascent X series machines and works with Self-Detect containers, the Food Processor attachment, and other compatible accessories.',
    category: 'features',
    products_mentioned: JSON.stringify(['ascent-x5', 'ascent-x4', 'ascent-x3', 'ascent-x2']),
    tags: JSON.stringify(['self-detect', 'containers', 'technology'])
  },
  {
    slug: 'blending-programs',
    question: 'What are blending programs and how do they work?',
    answer: 'Blending programs are preset sequences that automatically adjust speed and time for specific results. The Ascent X5 offers 10 programs: Smoothies, Frozen Desserts, Soups, Frozen Cocktails, Dips & Spreads, Smoothie Bowl, Frappé, Nut Butters, Non-Dairy Milks, and Spice Grinding. Simply add ingredients, select a program, and the machine does the rest.',
    category: 'features',
    products_mentioned: JSON.stringify(['ascent-x5', 'ascent-x4']),
    tags: JSON.stringify(['programs', 'presets', 'automatic'])
  },
  {
    slug: 'can-vitamix-make-hot-soup',
    question: 'Can Vitamix make hot soup?',
    answer: 'Yes! Vitamix blenders can heat soup through friction in about 6-8 minutes. The blade speed creates enough friction to heat cold ingredients to steaming hot temperatures. Simply blend your ingredients on high speed using variable speed 10 or the Soup program. No stovetop required.',
    category: 'recipes',
    products_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['soup', 'hot food', 'friction heating'])
  },
  {
    slug: 'making-nut-butter',
    question: 'Can I make nut butter in a Vitamix?',
    answer: 'Absolutely! Vitamix is excellent for making fresh nut butters. Add 3-4 cups of nuts to the container, start on Variable 1, and gradually increase to Variable 10. Use the tamper to keep ingredients moving. The process takes 1-2 minutes. You can make almond butter, peanut butter, cashew butter, and more.',
    category: 'recipes',
    products_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['nut butter', 'almond butter', 'peanut butter'])
  },

  // Cleaning & Maintenance
  {
    slug: 'how-to-clean-vitamix',
    question: 'How do I clean my Vitamix?',
    answer: 'Cleaning your Vitamix is easy: Add warm water and a drop of dish soap, then blend on Variable 10 for 30-60 seconds. Rinse and let dry. For deeper cleaning, blend warm water with a drop of dish soap and a tablespoon of white vinegar. The container is also top-rack dishwasher safe (not the lid or tamper).',
    category: 'maintenance',
    products_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['cleaning', 'maintenance', 'care'])
  },
  {
    slug: 'dishwasher-safe',
    question: 'Is the Vitamix container dishwasher safe?',
    answer: 'Yes, Vitamix containers are top-rack dishwasher safe. However, we recommend hand washing with warm soapy water for best results and longevity. The lid, lid plug, and tamper should always be hand washed and are not dishwasher safe.',
    category: 'maintenance',
    products_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['dishwasher', 'cleaning', 'care'])
  },
  {
    slug: 'blade-sharpening',
    question: 'Do Vitamix blades need sharpening?',
    answer: 'No, Vitamix blades are designed to be dull and never need sharpening. The power comes from the motor and blade speed, not blade sharpness. The blades pulverize ingredients through blunt force impact rather than cutting. This design is safer and more effective for creating smooth textures.',
    category: 'maintenance',
    products_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['blades', 'maintenance', 'safety'])
  },

  // Containers & Accessories
  {
    slug: 'container-sizes',
    question: 'What container sizes are available for Vitamix?',
    answer: 'Vitamix offers several container sizes: 64oz Classic (tall), 64oz Low-Profile (wide and fits under standard cabinets), 48oz (most versatile, great for 1-4 servings), and 20oz personal cups. Ascent series also offers Self-Detect versions of these containers. The 48oz is included with most Ascent X models.',
    category: 'accessories',
    products_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['containers', 'sizes', 'capacity'])
  },
  {
    slug: 'food-processor-attachment',
    question: 'Does Vitamix have a food processor attachment?',
    answer: 'Yes! The 12-Cup Food Processor Attachment is available for Ascent and Ascent X series machines. It features Self-Detect technology and includes multiple disc blades for slicing, shredding, and chopping. It connects to the same motor base as your blender container.',
    category: 'accessories',
    products_mentioned: JSON.stringify(['ascent-x5', 'ascent-x4']),
    tags: JSON.stringify(['food processor', 'attachment', 'accessory'])
  },
  {
    slug: 'container-compatibility',
    question: 'Are containers compatible between different Vitamix models?',
    answer: 'Container compatibility depends on the series. Self-Detect containers work only with Ascent and Ascent X series. Classic and Low-Profile containers without Self-Detect work with Legacy (5200, 750) and Explorian series. The 48oz Stainless Steel and Aer Disc containers work with all series.',
    category: 'accessories',
    products_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['compatibility', 'containers', 'accessories'])
  },

  // Warranty & Support
  {
    slug: 'vitamix-warranty',
    question: 'What warranty comes with a Vitamix?',
    answer: 'Warranty varies by series: Ascent X Series comes with a 10-year full warranty, Legacy Series (5200, 750) includes a 7-year warranty, Explorian Series has a 5-year warranty. All warranties cover the motor, containers, and blades. Extended warranties are available for purchase.',
    category: 'warranty',
    products_mentioned: JSON.stringify(['ascent-x5', 'e310', '5200-standard']),
    tags: JSON.stringify(['warranty', 'support', 'coverage'])
  },
  {
    slug: 'register-vitamix',
    question: 'How do I register my Vitamix?',
    answer: 'Register your Vitamix at vitamix.com/register or call customer service. You will need your machine serial number (found on the bottom of the motor base) and proof of purchase. Registration activates your warranty and provides access to special offers.',
    category: 'warranty',
    products_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['registration', 'warranty', 'serial number'])
  },

  // Troubleshooting
  {
    slug: 'vitamix-overheating',
    question: 'Why does my Vitamix stop during blending?',
    answer: 'Vitamix machines have thermal protection that automatically shuts off the motor if it overheats. This typically happens when blending thick mixtures for extended periods or overfilling the container. Let the machine cool for 45 minutes, then resume. Use the tamper to keep thick blends moving and reduce strain on the motor.',
    category: 'troubleshooting',
    products_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['overheating', 'thermal protection', 'troubleshooting'])
  },
  {
    slug: 'vitamix-leaking',
    question: 'Why is my Vitamix leaking from the bottom?',
    answer: 'Leaking typically indicates a worn blade assembly seal or improper container assembly. Check that the container is fully seated on the motor base and locked into position. If leaking persists, the blade assembly may need replacement. Contact Vitamix customer service for warranty support or to order replacement parts.',
    category: 'troubleshooting',
    products_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['leaking', 'seal', 'troubleshooting'])
  },
  {
    slug: 'smoothie-not-smooth',
    question: 'Why is my smoothie not smooth?',
    answer: 'For smoothest results: Add liquid first, then soft ingredients, then frozen items. Use the tamper to push ingredients into the blades. Blend on Variable 10 for at least 60 seconds. If using ice, blend it last. For green smoothies, blend greens with liquid first before adding other ingredients.',
    category: 'recipes',
    products_mentioned: JSON.stringify([]),
    tags: JSON.stringify(['smoothie', 'texture', 'tips'])
  }
];

// Generate SQL insert statements
function generateSQL() {
  let sql = '-- Auto-generated FAQ seed data\n\n';

  for (const f of faqs) {
    const fields = ['slug', 'question', 'answer', 'category', 'products_mentioned', 'tags'];
    const values = fields.map(field => {
      const val = f[field];
      if (val === null || val === undefined) return 'NULL';
      return `'${String(val).replace(/'/g, "''")}'`;
    });
    sql += `INSERT OR REPLACE INTO faqs (${fields.join(', ')}) VALUES (${values.join(', ')});\n`;
  }

  return sql;
}

// Export for use
module.exports = { faqs, generateSQL };

// If run directly, output SQL
if (require.main === module) {
  console.log(generateSQL());
}
