-- Pagepoof Seed Data

-- Products
INSERT OR REPLACE INTO products (sku, name, series, price, description, features, specs) VALUES
('A3500', 'Vitamix Ascent A3500', 'Ascent X', 649.95, 'Our smartest blender with touchscreen controls, wireless connectivity, and 5 program settings for hands-free blending.', '["Touchscreen controls", "5 program settings", "Wireless connectivity", "Variable speed control", "Pulse feature", "Self-cleaning", "Built-in timer"]', '{"motor": "2.2 HP", "container": "64 oz", "dimensions": "17.5 x 11 x 8 inches", "weight": "12.5 lbs", "warranty": "10 years"}'),

('A2500', 'Vitamix Ascent A2500', 'Ascent', 549.95, 'Programmable blender with 3 program settings for smoothies, hot soups, and frozen desserts with touchscreen interface.', '["3 program settings", "Touchscreen controls", "Variable speed control", "Pulse feature", "Self-cleaning", "Built-in timer"]', '{"motor": "2.2 HP", "container": "64 oz", "dimensions": "17 x 11 x 8 inches", "weight": "12 lbs", "warranty": "10 years"}'),

('A2300', 'Vitamix Ascent A2300', 'Ascent', 449.95, 'Simple controls with variable speed dial and pulse. Perfect for those who prefer manual control over their blends.', '["Variable speed dial", "Pulse feature", "Self-cleaning", "Built-in timer", "Wireless connectivity"]', '{"motor": "2.2 HP", "container": "64 oz", "dimensions": "17 x 11 x 8 inches", "weight": "11.5 lbs", "warranty": "10 years"}'),

('E310', 'Vitamix Explorian E310', 'Explorian', 349.95, 'Entry-level powerhouse with 10 variable speeds and pulse. Great for everyday blending needs.', '["10 variable speeds", "Pulse feature", "Self-cleaning", "Aircraft-grade blades"]', '{"motor": "2.0 HP", "container": "48 oz", "dimensions": "18 x 11 x 8 inches", "weight": "10.5 lbs", "warranty": "5 years"}'),

('E320', 'Vitamix Explorian E320', 'Explorian', 449.95, 'Full-size 64oz container with variable speed control. Ideal for families and meal prep.', '["10 variable speeds", "Pulse feature", "Self-cleaning", "Large capacity", "Aircraft-grade blades"]', '{"motor": "2.2 HP", "container": "64 oz", "dimensions": "18 x 11 x 8 inches", "weight": "11 lbs", "warranty": "5 years"}'),

('V1200', 'Vitamix Venturist V1200', 'Venturist', 449.95, 'The perfect blend of power and simplicity with variable speed control and compact design.', '["Variable speed control", "Pulse feature", "Compact design", "Self-cleaning"]', '{"motor": "2.2 HP", "container": "64 oz", "dimensions": "17 x 9 x 8 inches", "weight": "11 lbs", "warranty": "5 years"}'),

('780', 'Vitamix Professional Series 780', 'Professional', 649.95, 'Touchscreen interface with 5 programs. Professional-grade performance for home use.', '["Touchscreen controls", "5 program settings", "Variable speed", "Pulse", "Self-cleaning"]', '{"motor": "2.2 HP", "container": "64 oz", "dimensions": "17.5 x 11 x 8 inches", "weight": "12.5 lbs", "warranty": "7 years"}'),

('750', 'Vitamix Professional Series 750', 'Professional', 549.95, 'Metal drive system with 5 pre-programmed settings for reliable, consistent results.', '["5 program settings", "Variable speed", "Pulse", "Self-cleaning", "Metal drive"]', '{"motor": "2.2 HP", "container": "64 oz", "dimensions": "17.5 x 11 x 8 inches", "weight": "12 lbs", "warranty": "7 years"}');

-- Recipes
INSERT OR REPLACE INTO recipes (slug, title, description, ingredients, instructions, prep_time_minutes, servings, dietary_tags, categories) VALUES
('green-smoothie', 'Classic Green Smoothie', 'A refreshing blend of spinach, banana, and tropical fruits for a nutrient-packed start to your day.', '["2 cups fresh spinach", "1 banana, frozen", "1 cup mango chunks", "1 cup almond milk", "1 tbsp honey", "1/2 cup ice"]', '["Add almond milk to the container", "Add spinach and blend on low for 10 seconds", "Add remaining ingredients", "Blend on high for 45 seconds until smooth", "Serve immediately"]', 5, '2 servings', '["vegan", "gluten-free", "dairy-free"]', 'smoothies'),

('berry-blast', 'Berry Blast Smoothie', 'Antioxidant-rich berry smoothie with a creamy yogurt base.', '["1 cup mixed berries", "1/2 cup blueberries", "1 cup Greek yogurt", "1/2 cup orange juice", "1 tbsp chia seeds", "1 cup ice"]', '["Add orange juice and yogurt to container", "Add berries and chia seeds", "Add ice", "Blend on high for 60 seconds", "Pour and enjoy"]', 5, '2 servings', '["vegetarian", "gluten-free", "high-protein"]', 'smoothies'),

('tomato-soup', 'Roasted Tomato Soup', 'Creamy tomato soup made hot right in your Vitamix blender.', '["2 lbs roasted tomatoes", "1 cup vegetable broth", "1/2 cup heavy cream", "2 cloves garlic", "1 tsp basil", "Salt and pepper to taste"]', '["Add broth and garlic to container", "Add roasted tomatoes", "Select Hot Soup program or blend on high for 6 minutes", "Add cream and blend for 30 seconds", "Season to taste"]', 10, '4 servings', '["vegetarian", "gluten-free"]', 'soups'),

('almond-butter', 'Homemade Almond Butter', 'Creamy, fresh almond butter made in minutes.', '["3 cups raw almonds", "1/2 tsp sea salt", "1 tbsp coconut oil (optional)"]', '["Add almonds to container", "Start on low speed, gradually increase to high", "Use tamper to push almonds into blades", "Blend for 4-5 minutes until smooth", "Add salt and oil if desired", "Store in airtight container"]', 10, '2 cups', '["vegan", "gluten-free", "paleo", "keto"]', 'nut-butters'),

('frozen-margarita', 'Frozen Margarita', 'Restaurant-quality frozen margaritas at home.', '["2 oz tequila", "1 oz triple sec", "1 oz lime juice", "1 oz simple syrup", "2 cups ice", "Salt for rim"]', '["Add liquid ingredients to container", "Add ice", "Blend on high for 30 seconds", "Salt rim of glass", "Pour and garnish with lime"]', 5, '2 cocktails', '["gluten-free"]', 'beverages'),

('cauliflower-rice', 'Cauliflower Rice', 'Low-carb rice alternative in seconds.', '["1 head cauliflower, cut into florets", "1 tbsp olive oil", "Salt to taste"]', '["Add half the florets to container", "Pulse 5-6 times until rice-sized pieces", "Remove and repeat with remaining florets", "Sauté in olive oil for 5 minutes", "Season with salt"]', 10, '4 servings', '["vegan", "gluten-free", "keto", "paleo", "whole30"]', 'sides'),

('protein-shake', 'Post-Workout Protein Shake', 'Muscle-building shake with 30g protein.', '["1 scoop protein powder", "1 banana", "2 tbsp peanut butter", "1 cup milk", "1/2 cup oats", "1 cup ice"]', '["Add milk to container", "Add protein powder and oats", "Add banana and peanut butter", "Add ice", "Blend on high for 45 seconds"]', 5, '1 serving', '["vegetarian", "high-protein"]', 'smoothies'),

('acai-bowl', 'Açaí Bowl', 'Thick and creamy açaí base topped with fresh fruits and granola.', '["2 açaí packets, frozen", "1 banana, frozen", "1/2 cup blueberries, frozen", "1/4 cup almond milk", "Toppings: granola, fresh berries, coconut"]', '["Add almond milk to container", "Add açaí and frozen fruits", "Use tamper while blending on low", "Blend until thick and creamy", "Pour into bowl and add toppings"]', 10, '1 bowl', '["vegan", "gluten-free"]', 'bowls');

-- FAQs
INSERT OR REPLACE INTO faqs (question, answer, category, tags) VALUES
('What is the difference between Ascent and Explorian series?', 'The Ascent series features wireless connectivity, self-detect technology for different container sizes, and digital timers. Explorian series offers the same powerful motor at a lower price point but without the smart features.', 'Products', 'comparison, ascent, explorian, series'),

('Can Vitamix make hot soup?', 'Yes! Vitamix blenders can heat soup through friction alone. Blending on high speed for 5-6 minutes will create enough friction heat to make steaming hot soup directly in the container.', 'Features', 'soup, hot, heating, friction'),

('How long is the Vitamix warranty?', 'Warranty varies by series: Ascent and Professional series have 10-year warranties, Explorian and Venturist have 5-year warranties. All warranties cover parts, performance, and labor.', 'Support', 'warranty, support, repairs'),

('Can I put ice in my Vitamix?', 'Absolutely! Vitamix blenders are designed to crush ice easily. The aircraft-grade stainless steel blades can handle ice, frozen fruits, and even ice cream without any issues.', 'Usage', 'ice, frozen, blades'),

('How do I clean my Vitamix?', 'Self-cleaning is easy: add warm water and a drop of dish soap, run on high for 30-60 seconds, rinse and dry. For deeper cleaning, blend warm water with white vinegar.', 'Maintenance', 'cleaning, maintenance, self-clean'),

('What container size should I get?', 'The 64oz container is best for families and batch cooking. The 48oz is great for individuals or couples. Personal cup adapters (20oz) are perfect for single-serve smoothies.', 'Products', 'container, size, capacity'),

('Is Vitamix better than other blenders?', 'Vitamix blenders feature more powerful motors (2+ HP), aircraft-grade blades, longer warranties, and superior build quality compared to most competitors. They can handle tasks other blenders cannot.', 'Products', 'comparison, quality, power'),

('Can Vitamix grind coffee beans?', 'Yes, Vitamix can grind coffee beans, though a dry grains container is recommended for best results and to avoid odor transfer. The standard wet container can work for occasional grinding.', 'Usage', 'coffee, grinding, dry container'),

('Why is my Vitamix so loud?', 'The powerful motor that makes Vitamix so effective also creates significant noise (up to 88 decibels on high). This is normal. Using the sound-reducing Quiet One model or enclosures can help.', 'Support', 'noise, loud, sound'),

('Can I blend hot liquids in my Vitamix?', 'Yes, but never fill past the max line and always start on low speed with the lid vent open. The containers are designed to handle hot liquids up to 170°F safely.', 'Usage', 'hot, liquids, safety');

-- Videos
INSERT OR REPLACE INTO videos (id, title, description, thumbnail_url, tags, view_count) VALUES
('dQw4w9WgXcQ', 'Getting Started with Your Vitamix', 'Complete guide to setting up and using your new Vitamix blender for the first time.', 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', 'beginner, setup, tutorial', 250000),

('abc123xyz', 'Perfect Green Smoothie Every Time', 'Learn the technique for making silky smooth green smoothies without chunks.', 'https://img.youtube.com/vi/abc123xyz/maxresdefault.jpg', 'smoothie, green, technique', 180000),

('def456uvw', 'Hot Soup in 6 Minutes', 'Watch how the Vitamix creates steaming hot soup through friction heating alone.', 'https://img.youtube.com/vi/def456uvw/maxresdefault.jpg', 'soup, hot, friction, cooking', 150000),

('ghi789rst', 'Vitamix vs Competition: Blend Test', 'Side-by-side comparison of Vitamix against other popular blenders.', 'https://img.youtube.com/vi/ghi789rst/maxresdefault.jpg', 'comparison, test, review', 320000),

('jkl012opq', 'Making Nut Butter at Home', 'Step-by-step guide to making creamy almond and peanut butter in your Vitamix.', 'https://img.youtube.com/vi/jkl012opq/maxresdefault.jpg', 'nut butter, almond, peanut, tutorial', 95000),

('mno345lmn', 'Cleaning Your Vitamix Properly', 'Best practices for daily cleaning and deep cleaning your Vitamix blender.', 'https://img.youtube.com/vi/mno345lmn/maxresdefault.jpg', 'cleaning, maintenance, care', 75000),

('pqr678ijk', 'Ascent vs Explorian: Which to Buy?', 'Detailed comparison of Vitamix Ascent and Explorian series to help you decide.', 'https://img.youtube.com/vi/pqr678ijk/maxresdefault.jpg', 'comparison, ascent, explorian, buying guide', 210000),

('stu901fgh', 'Frozen Desserts with Vitamix', 'Create ice cream, sorbet, and frozen treats without an ice cream maker.', 'https://img.youtube.com/vi/stu901fgh/maxresdefault.jpg', 'dessert, ice cream, frozen, recipes', 130000);

-- Product Images
INSERT OR REPLACE INTO product_images (sku, image_url, sort_order) VALUES
('A3500', 'https://www.vitamix.com/content/dam/vitamix/products/702/702.png', 0),
('A3500', 'https://www.vitamix.com/content/dam/vitamix/products/702/702-lifestyle.jpg', 1),
('A2500', 'https://www.vitamix.com/content/dam/vitamix/products/701/701.png', 0),
('A2300', 'https://www.vitamix.com/content/dam/vitamix/products/700/700.png', 0),
('E310', 'https://www.vitamix.com/content/dam/vitamix/products/explorian/e310.png', 0),
('E320', 'https://www.vitamix.com/content/dam/vitamix/products/explorian/e320.png', 0),
('V1200', 'https://www.vitamix.com/content/dam/vitamix/products/venturist/v1200.png', 0),
('780', 'https://www.vitamix.com/content/dam/vitamix/products/pro/780.png', 0),
('750', 'https://www.vitamix.com/content/dam/vitamix/products/pro/750.png', 0);
