-- Migration: Add baby/family-friendly feature tags to products
-- Issue 2.3: New parent queries need baby-food capable products

-- A3500: Best for baby food - presets ensure consistent smooth texture
UPDATE products SET features = '["Touchscreen controls", "5 program settings", "Wireless connectivity", "Variable speed control", "Pulse feature", "Self-cleaning", "Built-in timer", "Easy one-touch operation", "Senior-friendly", "Accessibility-designed", "Hands-free presets", "Puree capable", "Smooth texture control", "Medical-friendly", "Therapy approved", "Consistent results", "Baby food ready", "Family-friendly", "Easy to clean", "Batch cooking"]'
WHERE sku = 'A3500';

-- A2500: Great for baby food - 3 presets for smooth purees
UPDATE products SET features = '["3 program settings", "Touchscreen controls", "Variable speed control", "Pulse feature", "Self-cleaning", "Built-in timer", "Easy one-touch operation", "Senior-friendly", "Intuitive interface", "Puree capable", "Smooth blending", "Medical-friendly", "Baby food ready", "Family-friendly", "Easy to clean"]'
WHERE sku = 'A2500';

-- 780: Excellent for baby food - touchscreen + 5 presets
UPDATE products SET features = '["Touchscreen controls", "5 program settings", "Variable speed", "Pulse", "Self-cleaning", "Easy one-touch operation", "Senior-friendly", "Accessibility-designed", "Hands-free presets", "Intuitive controls", "Puree capable", "Texture control", "Medical-friendly", "Therapy approved", "Baby food ready", "Family-friendly"]'
WHERE sku = '780';

-- 750: Good for baby food - 5 presets
UPDATE products SET features = '["5 program settings", "Variable speed", "Pulse", "Self-cleaning", "Metal drive", "Easy presets", "Hands-free blending", "Simple operation", "Puree capable", "Smooth texture", "Medical-friendly", "Baby food ready", "Family-friendly"]'
WHERE sku = '750';

-- 5200: Classic choice for baby food - powerful purees
UPDATE products SET features = '["Variable speed control", "Pulse feature", "Self-cleaning", "Aircraft-grade blades", "Classic design", "64-oz container", "Puree capable", "Smooth blending", "Medical-friendly", "Texture control", "Powerful motor", "Baby food ready", "Family-friendly", "Large capacity", "Batch cooking"]'
WHERE sku = '5200_STANDARD_GETTING_STARTED';

-- 5300: Great for families - low profile + powerful
UPDATE products SET features = '["Variable speed control", "Pulse feature", "Self-cleaning", "Low-profile container", "Powerful motor", "Puree capable", "Smooth texture", "Medical-friendly", "Quiet operation", "Baby food ready", "Family-friendly", "Cabinet-friendly"]'
WHERE sku = '5300';

-- 7500: Quiet family blender - great for nap times
UPDATE products SET features = '["Variable speed control", "Pulse feature", "Self-cleaning", "Low-profile container", "Quieter operation", "Powerful motor", "Puree capable", "Smooth blending", "Medical-friendly", "Therapy approved", "Low noise", "Baby food ready", "Family-friendly", "Quiet for nap time"]'
WHERE sku = '7500';

-- E320: Budget-friendly family option
UPDATE products SET features = '["10 variable speeds", "Pulse feature", "Self-cleaning", "Large capacity", "Aircraft-grade blades", "Simple controls", "Easy to clean", "Puree capable", "Smooth blending", "Baby food ready", "Family-friendly", "Great value"]'
WHERE sku = 'E320';

-- E310: Entry-level for new parents
UPDATE products SET features = '["10 variable speeds", "Pulse feature", "Self-cleaning", "Aircraft-grade blades", "Simple dial control", "Easy to use", "Baby food capable", "Family starter", "Great value"]'
WHERE sku = 'E310';

-- Certified Reconditioned Explorian: Budget baby food option
UPDATE products SET features = '["Variable speed control", "Pulse feature", "Self-cleaning", "Certified reconditioned", "Full warranty", "Budget-friendly", "Baby food ready", "Family-friendly", "Great value"]'
WHERE sku = 'CERTIFIED_RECONDITIONED_EXPLORIAN';
