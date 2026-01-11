/**
 * Seed Recipes Script
 * Populates D1 database and Vectorize with Vitamix recipe data
 *
 * Usage: node scripts/seed/seed-recipes.js
 */

// Sample recipes scraped from vitamix.com
const recipes = [
  {
    slug: 'blue-spirulina-tropical-smoothie',
    title: 'Blue Spirulina Tropical Smoothie',
    description: 'A tropical and refreshing smoothie with blue spirulina for a vibrant color and nutritional boost.',
    prep_time_minutes: 5,
    cook_time_minutes: 0,
    total_time_minutes: 5,
    servings: '2 servings',
    difficulty: 'easy',
    ingredients: JSON.stringify([
      '1 cup frozen pineapple chunks',
      '1 cup frozen mango chunks',
      '1 banana',
      '1 cup coconut milk',
      '1 teaspoon blue spirulina powder',
      '1/2 cup ice'
    ]),
    instructions: JSON.stringify([
      'Add coconut milk to the Vitamix container.',
      'Add frozen pineapple, mango, banana, and spirulina powder.',
      'Top with ice.',
      'Secure the lid and blend on Variable 1, gradually increasing to Variable 10.',
      'Blend for 45-60 seconds until smooth.',
      'Pour and serve immediately.'
    ]),
    nutrition: JSON.stringify({ calories: 220, protein: '3g', carbs: '45g', fat: '5g', fiber: '4g' }),
    tips: JSON.stringify(['Use fresh fruit for a thinner consistency', 'Add honey for extra sweetness']),
    categories: JSON.stringify(['smoothie', 'tropical', 'healthy']),
    dietary_tags: JSON.stringify(['vegan', 'gluten-free', 'dairy-free']),
    source_url: '/us/en_us/recipes/blue-spirulina-tropical-smoothie'
  },
  {
    slug: 'roasted-red-pepper-soup',
    title: 'Roasted Red Pepper Soup',
    description: 'A creamy and flavorful soup made with roasted red peppers, perfect for warming up on cold days.',
    prep_time_minutes: 15,
    cook_time_minutes: 30,
    total_time_minutes: 45,
    servings: '4 servings',
    difficulty: 'medium',
    ingredients: JSON.stringify([
      '4 large red bell peppers, roasted',
      '1 onion, diced',
      '3 cloves garlic, minced',
      '2 cups vegetable broth',
      '1/2 cup heavy cream',
      '2 tablespoons olive oil',
      'Salt and pepper to taste',
      'Fresh basil for garnish'
    ]),
    instructions: JSON.stringify([
      'Roast red peppers under broiler until charred. Remove skin and seeds.',
      'Sauté onion in olive oil until softened. Add garlic and cook 1 minute.',
      'Add roasted peppers and vegetable broth to the Vitamix container.',
      'Add sautéed onion mixture.',
      'Secure the lid and select the Soup program.',
      'When complete, add cream and blend briefly to combine.',
      'Season with salt and pepper. Serve hot with fresh basil.'
    ]),
    nutrition: JSON.stringify({ calories: 180, protein: '4g', carbs: '18g', fat: '12g', fiber: '3g' }),
    tips: JSON.stringify(['Use jarred roasted peppers for convenience', 'Substitute coconut cream for dairy-free version']),
    categories: JSON.stringify(['soup', 'hot', 'comfort-food']),
    dietary_tags: JSON.stringify(['vegetarian', 'gluten-free']),
    source_url: '/us/en_us/recipes/roasted-red-pepper-soup'
  },
  {
    slug: 'whole-fruit-margarita',
    title: 'Whole Fruit Margarita',
    description: 'A refreshing margarita made with whole fresh fruit for maximum flavor.',
    prep_time_minutes: 5,
    cook_time_minutes: 0,
    total_time_minutes: 5,
    servings: '2 servings',
    difficulty: 'easy',
    ingredients: JSON.stringify([
      '2 limes, peeled and halved',
      '4 oz tequila',
      '2 oz triple sec',
      '2 tablespoons agave nectar',
      '2 cups ice'
    ]),
    instructions: JSON.stringify([
      'Add all ingredients to the Vitamix container.',
      'Secure the lid and blend on Variable 1, gradually increasing to Variable 10.',
      'Blend for 30-45 seconds until smooth and icy.',
      'Rim glasses with salt if desired.',
      'Pour and serve immediately.'
    ]),
    nutrition: JSON.stringify({ calories: 280, protein: '0g', carbs: '24g', fat: '0g', fiber: '1g' }),
    tips: JSON.stringify(['Use frozen limes for an icier drink', 'Add jalapeño for a spicy kick']),
    categories: JSON.stringify(['cocktail', 'frozen-drink', 'party']),
    dietary_tags: JSON.stringify(['vegan', 'gluten-free']),
    source_url: '/us/en_us/recipes/whole-fruit-margarita'
  },
  {
    slug: 'raspberry-chia-fruit-spread',
    title: 'Raspberry Chia Fruit Spread',
    description: 'A quick, easy, and fresh fruit spread made with chia seeds for natural thickening.',
    prep_time_minutes: 5,
    cook_time_minutes: 0,
    total_time_minutes: 5,
    servings: '1 cup',
    difficulty: 'easy',
    ingredients: JSON.stringify([
      '2 cups fresh or frozen raspberries',
      '2 tablespoons chia seeds',
      '2 tablespoons honey or maple syrup',
      '1 tablespoon lemon juice'
    ]),
    instructions: JSON.stringify([
      'Add raspberries to the Vitamix container.',
      'Blend on Variable 1, gradually increasing to Variable 5.',
      'Blend for 20-30 seconds until pureed but still textured.',
      'Transfer to a bowl and stir in chia seeds, honey, and lemon juice.',
      'Refrigerate for 30 minutes to thicken.',
      'Store in refrigerator for up to 1 week.'
    ]),
    nutrition: JSON.stringify({ calories: 40, protein: '1g', carbs: '8g', fat: '1g', fiber: '3g' }),
    tips: JSON.stringify(['Use any berry combination', 'Adjust sweetness to taste']),
    categories: JSON.stringify(['spread', 'jam', 'breakfast']),
    dietary_tags: JSON.stringify(['vegan', 'gluten-free', 'no-sugar-added']),
    source_url: '/us/en_us/recipes/raspberry-chia-fruit-spread'
  },
  {
    slug: 'popovers',
    title: 'Popovers',
    description: 'Steam-puffed pastry that is best served fresh from the oven and paired with jam or butter.',
    prep_time_minutes: 15,
    cook_time_minutes: 45,
    total_time_minutes: 60,
    servings: '6 popovers',
    difficulty: 'medium',
    ingredients: JSON.stringify([
      '2 large eggs',
      '1 cup all-purpose flour',
      '1 cup whole milk',
      '1/2 teaspoon salt',
      '2 tablespoons melted butter'
    ]),
    instructions: JSON.stringify([
      'Preheat oven to 450°F (230°C). Grease popover pan.',
      'Add milk, eggs, and melted butter to the Vitamix container.',
      'Add flour and salt.',
      'Blend on Variable 1, gradually increasing to Variable 5.',
      'Blend for 15-20 seconds until smooth. Do not overmix.',
      'Let batter rest for 30 minutes at room temperature.',
      'Fill each popover cup 2/3 full.',
      'Bake for 20 minutes, then reduce to 350°F and bake 20-25 minutes more.',
      'Do not open oven door while baking. Serve immediately.'
    ]),
    nutrition: JSON.stringify({ calories: 150, protein: '5g', carbs: '17g', fat: '6g', fiber: '1g' }),
    tips: JSON.stringify(['Use room temperature eggs for better rise', 'Pierce popovers after baking to release steam']),
    categories: JSON.stringify(['baked-goods', 'bread', 'breakfast']),
    dietary_tags: JSON.stringify(['vegetarian']),
    source_url: '/us/en_us/recipes/popovers'
  },
  {
    slug: 'green-smoothie',
    title: 'Classic Green Smoothie',
    description: 'A nutritious green smoothie packed with leafy greens and fruit.',
    prep_time_minutes: 5,
    cook_time_minutes: 0,
    total_time_minutes: 5,
    servings: '2 servings',
    difficulty: 'easy',
    ingredients: JSON.stringify([
      '2 cups fresh spinach',
      '1 banana',
      '1 cup frozen mango',
      '1/2 cup plain Greek yogurt',
      '1 cup almond milk',
      '1 tablespoon honey'
    ]),
    instructions: JSON.stringify([
      'Add almond milk and yogurt to the Vitamix container.',
      'Add spinach, banana, mango, and honey.',
      'Secure the lid and blend on Variable 1, gradually increasing to Variable 10.',
      'Blend for 45-60 seconds until completely smooth.',
      'Pour and serve immediately.'
    ]),
    nutrition: JSON.stringify({ calories: 180, protein: '8g', carbs: '35g', fat: '3g', fiber: '4g' }),
    tips: JSON.stringify(['Add protein powder for post-workout recovery', 'Freeze banana for thicker smoothie']),
    categories: JSON.stringify(['smoothie', 'green', 'healthy', 'breakfast']),
    dietary_tags: JSON.stringify(['vegetarian', 'gluten-free']),
    source_url: '/us/en_us/recipes/green-smoothie'
  },
  {
    slug: 'tomato-basil-soup',
    title: 'Tomato Basil Soup',
    description: 'Classic comfort soup made with fresh tomatoes and aromatic basil.',
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    total_time_minutes: 30,
    servings: '4 servings',
    difficulty: 'easy',
    ingredients: JSON.stringify([
      '4 cups diced tomatoes (fresh or canned)',
      '1 cup vegetable broth',
      '1/2 cup fresh basil leaves',
      '2 cloves garlic',
      '1/4 cup heavy cream',
      '2 tablespoons olive oil',
      'Salt and pepper to taste'
    ]),
    instructions: JSON.stringify([
      'Add tomatoes and vegetable broth to the Vitamix container.',
      'Add garlic, basil, and olive oil.',
      'Secure the lid and select the Soup program.',
      'Once the cycle is complete, add cream.',
      'Blend briefly on Variable 3 to combine.',
      'Season with salt and pepper.',
      'Serve hot with crusty bread.'
    ]),
    nutrition: JSON.stringify({ calories: 120, protein: '3g', carbs: '12g', fat: '8g', fiber: '2g' }),
    tips: JSON.stringify(['Use San Marzano tomatoes for best flavor', 'Garnish with fresh basil and parmesan']),
    categories: JSON.stringify(['soup', 'hot', 'comfort-food', 'italian']),
    dietary_tags: JSON.stringify(['vegetarian', 'gluten-free']),
    source_url: '/us/en_us/recipes/tomato-basil-soup'
  },
  {
    slug: 'almond-butter',
    title: 'Homemade Almond Butter',
    description: 'Creamy, fresh almond butter made with just almonds and a pinch of salt.',
    prep_time_minutes: 10,
    cook_time_minutes: 0,
    total_time_minutes: 10,
    servings: '2 cups',
    difficulty: 'easy',
    ingredients: JSON.stringify([
      '3 cups raw almonds',
      '1/2 teaspoon salt',
      '1 tablespoon honey (optional)',
      '1 tablespoon coconut oil (optional)'
    ]),
    instructions: JSON.stringify([
      'Add almonds to the Vitamix container.',
      'Secure the lid and select Variable 1.',
      'Use the tamper to press almonds into the blades.',
      'Gradually increase speed to Variable 10.',
      'Continue blending for 1-2 minutes, using tamper as needed.',
      'The butter will go from crumbly to smooth.',
      'Add salt and optional ingredients, blend briefly to combine.',
      'Store in airtight container for up to 2 weeks.'
    ]),
    nutrition: JSON.stringify({ calories: 100, protein: '4g', carbs: '3g', fat: '9g', fiber: '2g' }),
    tips: JSON.stringify(['Toast almonds for deeper flavor', 'Add cinnamon or vanilla for variety']),
    categories: JSON.stringify(['nut-butter', 'spread', 'snack']),
    dietary_tags: JSON.stringify(['vegan', 'gluten-free', 'paleo', 'keto']),
    source_url: '/us/en_us/recipes/almond-butter'
  }
];

// Generate SQL insert statements
function generateSQL() {
  let sql = '-- Auto-generated recipe seed data\n\n';

  for (const r of recipes) {
    const fields = [
      'slug', 'title', 'description', 'prep_time_minutes', 'cook_time_minutes',
      'total_time_minutes', 'servings', 'difficulty', 'ingredients', 'instructions',
      'nutrition', 'tips', 'categories', 'dietary_tags', 'source_url'
    ];
    const values = fields.map(f => {
      const val = r[f];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val;
      return `'${String(val).replace(/'/g, "''")}'`;
    });
    sql += `INSERT OR REPLACE INTO recipes (${fields.join(', ')}) VALUES (${values.join(', ')});\n`;
  }

  return sql;
}

// Export for use
module.exports = { recipes, generateSQL };

// If run directly, output SQL
if (require.main === module) {
  console.log(generateSQL());
}
