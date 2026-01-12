-- Migration: Add accessibility-friendly feature tags to products
-- Issue 2.1: Products with touchscreen/presets should be tagged for accessibility queries

-- A3500: Touchscreen + 5 presets = excellent for seniors/accessibility
UPDATE products SET features = '["Touchscreen controls", "5 program settings", "Wireless connectivity", "Variable speed control", "Pulse feature", "Self-cleaning", "Built-in timer", "Easy one-touch operation", "Senior-friendly", "Accessibility-designed", "Hands-free presets"]'
WHERE sku = 'A3500';

-- A2500: Touchscreen + 3 presets = good for accessibility
UPDATE products SET features = '["3 program settings", "Touchscreen controls", "Variable speed control", "Pulse feature", "Self-cleaning", "Built-in timer", "Easy one-touch operation", "Senior-friendly", "Intuitive interface"]'
WHERE sku = 'A2500';

-- 780: Touchscreen + 5 presets = excellent for accessibility
UPDATE products SET features = '["Touchscreen controls", "5 program settings", "Variable speed", "Pulse", "Self-cleaning", "Easy one-touch operation", "Senior-friendly", "Accessibility-designed", "Hands-free presets", "Intuitive controls"]'
WHERE sku = '780';

-- 750: 5 presets = good for hands-free operation
UPDATE products SET features = '["5 program settings", "Variable speed", "Pulse", "Self-cleaning", "Metal drive", "Easy presets", "Hands-free blending", "Simple operation"]'
WHERE sku = '750';

-- E310: Entry-level but simple controls
UPDATE products SET features = '["10 variable speeds", "Pulse feature", "Self-cleaning", "Aircraft-grade blades", "Simple dial control", "Easy to use"]'
WHERE sku = 'E310';

-- E320: Family-friendly, larger handles
UPDATE products SET features = '["10 variable speeds", "Pulse feature", "Self-cleaning", "Large capacity", "Aircraft-grade blades", "Simple controls", "Easy to clean"]'
WHERE sku = 'E320';
