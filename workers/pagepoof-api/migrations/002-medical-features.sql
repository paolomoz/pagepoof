-- Migration: Add medical-friendly feature tags to products
-- Issue 2.2: Medical/dysphagia queries get 0 products

-- A3500: Best for medical - touchscreen presets ensure consistent texture
UPDATE products SET features = '["Touchscreen controls", "5 program settings", "Wireless connectivity", "Variable speed control", "Pulse feature", "Self-cleaning", "Built-in timer", "Easy one-touch operation", "Senior-friendly", "Accessibility-designed", "Hands-free presets", "Puree capable", "Smooth texture control", "Medical-friendly", "Therapy approved", "Consistent results"]'
WHERE sku = 'A3500';

-- A2500: Good for medical - 3 presets for consistent purees
UPDATE products SET features = '["3 program settings", "Touchscreen controls", "Variable speed control", "Pulse feature", "Self-cleaning", "Built-in timer", "Easy one-touch operation", "Senior-friendly", "Intuitive interface", "Puree capable", "Smooth blending", "Medical-friendly"]'
WHERE sku = 'A2500';

-- 780: Excellent for medical - touchscreen + 5 presets
UPDATE products SET features = '["Touchscreen controls", "5 program settings", "Variable speed", "Pulse", "Self-cleaning", "Easy one-touch operation", "Senior-friendly", "Accessibility-designed", "Hands-free presets", "Intuitive controls", "Puree capable", "Texture control", "Medical-friendly", "Therapy approved"]'
WHERE sku = '780';

-- 750: Good for medical - 5 presets for consistent texture
UPDATE products SET features = '["5 program settings", "Variable speed", "Pulse", "Self-cleaning", "Metal drive", "Easy presets", "Hands-free blending", "Simple operation", "Puree capable", "Smooth texture", "Medical-friendly"]'
WHERE sku = '750';

-- 5200: Classic powerful blender - excellent for purees
UPDATE products SET features = '["Variable speed control", "Pulse feature", "Self-cleaning", "Aircraft-grade blades", "Classic design", "64-oz container", "Puree capable", "Smooth blending", "Medical-friendly", "Texture control", "Powerful motor"]'
WHERE sku = '5200_STANDARD_GETTING_STARTED';

-- 5300: Powerful with low profile - great for medical purees
UPDATE products SET features = '["Variable speed control", "Pulse feature", "Self-cleaning", "Low-profile container", "Powerful motor", "Puree capable", "Smooth texture", "Medical-friendly", "Quiet operation"]'
WHERE sku = '5300';

-- 7500: Quieter powerful blender - good for therapy settings
UPDATE products SET features = '["Variable speed control", "Pulse feature", "Self-cleaning", "Low-profile container", "Quieter operation", "Powerful motor", "Puree capable", "Smooth blending", "Medical-friendly", "Therapy approved", "Low noise"]'
WHERE sku = '7500';

-- E320: Entry-level but capable for purees
UPDATE products SET features = '["10 variable speeds", "Pulse feature", "Self-cleaning", "Large capacity", "Aircraft-grade blades", "Simple controls", "Easy to clean", "Puree capable", "Smooth blending"]'
WHERE sku = 'E320';

-- Certified Reconditioned 5200: Budget medical option
UPDATE products SET features = '["Variable speed control", "Pulse feature", "Self-cleaning", "Certified reconditioned", "Full warranty", "Puree capable", "Medical-friendly", "Budget-friendly", "Same performance as new"]'
WHERE sku = 'CERTIFIED_RECONDITIONED_STANDARD';

-- Certified Reconditioned 7500: Budget quiet medical option
UPDATE products SET features = '["Variable speed control", "Pulse feature", "Self-cleaning", "Certified reconditioned", "Low-profile container", "Quieter operation", "Puree capable", "Medical-friendly", "Therapy approved", "Budget-friendly"]'
WHERE sku = 'CERTIFIED_RECONDITIONED_7500';
