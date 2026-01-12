-- Migration: Add allergy-safe feature tags to products
-- Issue 2.4: Allergy queries should recommend containers and cleaning features

-- Extra containers - essential for allergy management
UPDATE products SET features = '["48-oz capacity", "BPA-free Tritan", "Compatible with Ascent series", "SELF-DETECT technology", "Allergy-safe option", "Dedicated container", "Cross-contamination prevention", "Easy to clean"]'
WHERE sku = '48_OUNCE_CONTAINER_WITH_SELF_DETECT';

UPDATE products SET features = '["64-oz capacity", "Low-profile design", "BPA-free Tritan", "SELF-DETECT technology", "Allergy-safe option", "Dedicated container", "Cross-contamination prevention", "Cabinet-friendly"]'
WHERE sku = '64_OUNCE_LOW_PROFILE_CONTAINER_WITH_SELF_DETECT';

UPDATE products SET features = '["48-oz capacity", "Dry grains compatible", "BPA-free Tritan", "SELF-DETECT technology", "Allergy-safe option", "Dedicated dry container", "Nut-free option", "Separate grinding"]'
WHERE sku = '48_OUNCE_DRY_GRAINS_CONTAINER_WITH_SELF_DETECT';

UPDATE products SET features = '["32-oz capacity", "Compact size", "BPA-free Tritan", "Allergy-safe option", "Personal portions", "Easy to clean", "Separate container"]'
WHERE sku = '32_OUNCE_CONTAINER';

UPDATE products SET features = '["32-oz capacity", "Dry grains compatible", "BPA-free Tritan", "Allergy-safe option", "Nut-free grinding", "Dedicated container", "Cross-contamination prevention"]'
WHERE sku = '32_OUNCE_DRY_GRAINS_CONTAINER';

UPDATE products SET features = '["Classic 64-oz capacity", "BPA-free Tritan", "Fits classic models", "Allergy-safe option", "Dedicated container", "Easy to clean", "Large family size"]'
WHERE sku = 'CLASSIC_64_OUNCE_CONTAINER';

UPDATE products SET features = '["Low-profile 64-oz capacity", "BPA-free Tritan", "Cabinet-friendly", "Allergy-safe option", "Dedicated container", "Easy to clean", "Family size"]'
WHERE sku = 'LOW_PROFILE_64_OUNCE_CONTAINER';

UPDATE products SET features = '["48-oz capacity", "Stainless steel", "Premium quality", "Allergy-safe", "Non-porous surface", "Easy sanitizing", "No flavor transfer", "Cross-contamination prevention"]'
WHERE sku = '48_OUNCE_STAINLESS_STEEL_CONTAINER';

-- Personal Cup Adapter - great for individual allergy-safe portions
UPDATE products SET features = '["Personal cup sizes", "On-the-go blending", "Individual portions", "Allergy-safe option", "Personal container", "No cross-contamination", "BPA-free", "Easy to clean"]'
WHERE sku = 'PERSONAL_CUP_ADAPTER';

-- Update main blenders with allergy-friendly messaging
UPDATE products SET features = '["Touchscreen controls", "5 program settings", "Wireless connectivity", "Variable speed control", "Pulse feature", "Self-cleaning", "Built-in timer", "Easy one-touch operation", "Senior-friendly", "Accessibility-designed", "Hands-free presets", "Puree capable", "Smooth texture control", "Medical-friendly", "Therapy approved", "Consistent results", "Baby food ready", "Family-friendly", "Easy to clean", "Batch cooking", "Allergy-friendly", "Easy sanitizing"]'
WHERE sku = 'A3500';

UPDATE products SET features = '["3 program settings", "Touchscreen controls", "Variable speed control", "Pulse feature", "Self-cleaning", "Built-in timer", "Easy one-touch operation", "Senior-friendly", "Intuitive interface", "Puree capable", "Smooth blending", "Medical-friendly", "Baby food ready", "Family-friendly", "Easy to clean", "Allergy-friendly"]'
WHERE sku = 'A2500';
