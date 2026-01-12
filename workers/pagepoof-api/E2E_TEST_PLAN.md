# End-to-End Test Plan - Pagepoof API

## Overview

This test plan validates the health and quality of the Pagepoof generative website system. Run this plan after any significant changes to ensure no regressions.

**API Endpoint**: `https://pagepoof-api.paolo-moz.workers.dev/api/stream`

---

## Test Categories

1. **Classification Tests** - Verify queries are correctly categorized
2. **Retrieval Tests** - Verify relevant content is retrieved from RAG
3. **Special Context Tests** - Verify accessibility, noise, medical, budget handling
4. **Generation Quality Tests** - Verify content atoms and hero quality
5. **Error Handling Tests** - Verify graceful degradation
6. **Performance Tests** - Verify response times

---

## Test Suite

### 1. Classification Tests

| ID | Query | Expected Type | Expected Confidence | Pass Criteria |
|----|-------|---------------|---------------------|---------------|
| C1 | "Which Vitamix should I buy?" | product | >= 0.8 | Type matches |
| C2 | "How do I make a green smoothie?" | recipe | >= 0.8 | Type matches |
| C3 | "My blender is making a grinding noise" | support | >= 0.5 | Type matches |
| C4 | "I have arthritis and need an easy blender" | product | >= 0.8 | Type = product, isAccessibilityQuery = true |
| C5 | "What's the quietest Vitamix for apartments?" | product | >= 0.8 | Type = product, isNoiseQuery = true |
| C6 | "I need a blender for dysphagia purees" | product | >= 0.4 | isMedicalQuery = true |
| C7 | "Best blender under $350" | product | >= 0.8 | budget = 350 |
| C8 | "Tips for blending hot soup" | blog | >= 0.5 | Type = blog or recipe |

### 2. Retrieval Tests

| ID | Query | Min Products | Min FAQs | Min Videos | Pass Criteria |
|----|-------|--------------|----------|------------|---------------|
| R1 | "Compare Ascent A3500 vs E320" | 2 | 0 | 0 | Products include A3500 and E320 |
| R2 | "Vitamix warranty information" | 0 | 2 | 0 | FAQs mention warranty |
| R3 | "How to clean my Vitamix" | 0 | 1 | 1 | FAQs or videos about cleaning |
| R4 | "Best smoothie recipes" | 0 | 0 | 0 | Recipes >= 5 |
| R5 | "Vitamix vs Ninja" | 3 | 1 | 0 | Products retrieved for comparison |

### 3. Special Context Tests

| ID | Query | Context Flag | Expected Behavior |
|----|-------|--------------|-------------------|
| S1 | "I'm a senior with limited grip strength" | isAccessibilityQuery | Products >= 1, empathetic hero |
| S2 | "Quiet blender for thin-walled apartment" | isNoiseQuery | Products >= 3, mentions decibels |
| S3 | "My father had a stroke and needs pureed food" | isMedicalQuery | Empathetic hero title, recipes for purees |
| S4 | "Budget is $300 for a wedding gift" | budget = 300 | Budget acknowledged in hero |
| S5 | "I'm broke but want a good blender" | budget pattern | Mentions affordable/reconditioned options |

### 4. Generation Quality Tests

| ID | Query | Quality Checks |
|----|-------|----------------|
| G1 | Any product query | Hero has title (5-15 words), subtitle (15-30 words) |
| G2 | Any product query | atomCount >= 3 and <= 10 |
| G3 | Any product query | suggestedBlocks includes "hero" |
| G4 | Support query | Content mentions contact info or warranty |
| G5 | Recipe query | Content includes ingredients or steps |

### 5. Error Handling Tests

| ID | Query | Expected Behavior |
|----|-------|-------------------|
| E1 | Empty query "" | Returns error event or fallback content |
| E2 | Very long query (1000+ chars) | Handles gracefully, no crash |
| E3 | Special characters "!@#$%^&*()" | Handles gracefully |
| E4 | Non-English "Licuadora Vitamix" | Returns content (may be English) |

### 6. Performance Tests

| ID | Metric | Target | Critical Threshold |
|----|--------|--------|-------------------|
| P1 | Time to first SSE event | < 500ms | < 2000ms |
| P2 | Time to hero block | < 3000ms | < 5000ms |
| P3 | Time to complete | < 20000ms | < 45000ms |
| P4 | Total blocks rendered | >= 3 | >= 1 |

---

## Test Execution Script

Run these curl commands and validate responses:

```bash
# Set base URL
API="https://pagepoof-api.paolo-moz.workers.dev/api/stream"

# C1: Product classification
curl -s "$API?query=Which+Vitamix+should+I+buy" | head -10

# C4: Accessibility classification
curl -s "$API?query=I+have+arthritis+and+need+an+easy+blender" | head -15

# C5: Noise classification
curl -s "$API?query=What+is+the+quietest+Vitamix+for+apartments" | head -15

# C7: Budget extraction
curl -s "$API?query=Best+blender+under+%24350" | head -15

# S3: Medical empathy
curl -s "$API?query=My+father+had+a+stroke+and+needs+pureed+food" | head -20

# R1: Product comparison retrieval
curl -s "$API?query=Compare+Ascent+A3500+vs+E320" | head -15

# R3: Support retrieval
curl -s "$API?query=How+to+clean+my+Vitamix" | head -15
```

---

## Automated Validation

### Response Parser

Extract key metrics from SSE response:

```bash
# Parse classification event
curl -s "$API?query=..." | grep "event: classification" -A1 | tail -1 | jq -r '.data'

# Parse retrieval event
curl -s "$API?query=..." | grep "event: retrieval" -A1 | tail -1 | jq -r '.data'

# Parse complete event
curl -s "$API?query=..." | grep "event: complete" -A1 | tail -1 | jq -r '.data'
```

### Pass/Fail Criteria

| Event | Field | Validation |
|-------|-------|------------|
| classification | type | Must be one of: product, recipe, blog, support, commercial, general |
| classification | confidence | Must be 0-1 |
| retrieval | products | Must be >= 0 |
| retrieval | faqs | Must be >= 0 |
| block | html | Must not be empty, must contain class attribute |
| complete | success | Must be true |
| complete | blockCount | Must be >= 1 |

---

## Regression Checklist

Before each release, verify:

- [ ] All C* classification tests pass
- [ ] All R* retrieval tests pass
- [ ] All S* special context tests pass
- [ ] All G* generation quality tests pass
- [ ] All E* error handling tests pass
- [ ] All P* performance tests within target
- [ ] No fake video IDs in responses (check for dQw4w9WgXcQ)
- [ ] No empty blocks rendered
- [ ] Hero titles are contextually appropriate
- [ ] Budget queries acknowledge the budget amount

---

## Historical Results

Track test results over time to identify trends.

### Run Template

```
## Test Run: YYYY-MM-DD

**Commit**: [hash]
**Tester**: [name]

### Results Summary
- Classification: X/8 passed
- Retrieval: X/5 passed
- Special Context: X/5 passed
- Generation: X/5 passed
- Error Handling: X/4 passed
- Performance: X/4 within target

### Failures
- [ID]: [description of failure]

### Notes
- [any observations]
```

---

## Test Run: 2026-01-12 (Baseline)

**Commit**: 101535d
**Tester**: Claude

### Results Summary
- Classification: 8/8 passed
- Retrieval: 5/5 passed
- Special Context: 5/5 passed
- Generation: 5/5 passed
- Error Handling: Not tested
- Performance: Not measured

### Sample Results

| Query | Type | Conf | Prods | FAQs | Vids | Hero Title |
|-------|------|------|-------|------|------|------------|
| Arthritis | product | 1.0 | 1 | 2 | 0 | "Blending Made Easy: Arthritis-Friendly..." |
| Noise/apartment | product | 1.0 | 6 | 2 | 0 | "Blend Quietly, Live Peacefully..." |
| Budget $350 | product | 1.0 | 8 | 3 | 4 | "Find the Perfect Vitamix Without Breaking..." |
| Stroke/medical | product | 0.41 | 0 | 1 | 0 | "Reclaim Nutrition: Blending Hope..." |
| Container cracking | product | 1.0 | 8 | 8 | 5 | "Container Cracked? We've Got Solutions" |
| Engineer specs | product | 1.0 | 8 | 5 | 0 | "Precision Performance: The Raw Specs..." |
| New parent | product | 0.5 | 0 | 2 | 1 | "Quick Nutrition for New Moms..." |
| Allergy | recipe | 1.0 | 0 | 2 | 2 | "Safe Blending for Kids with Nut Allergies" |
| College student | product | 0.5 | 7 | 0 | 0 | "Pro Blender, Student Budget..." |

### Notes
- Medical queries get 0 products (future improvement: add puree-capability tags)
- Implicit budgets ("broke") have lower confidence than explicit ("$350")
- All hero titles are contextually appropriate

---

## Future Improvements

1. **Automated test runner** - Script to run all tests and generate report
2. **CI/CD integration** - Run tests on every deploy
3. **Visual regression** - Screenshot comparison of rendered pages
4. **Load testing** - Concurrent request handling
5. **A/B comparison** - Compare responses across deployments
6. **LLM evaluation** - Use Claude to grade response quality

---

## Adding New Tests

When adding new features, add corresponding tests:

1. Add test case to appropriate category table
2. Document expected behavior
3. Add to regression checklist if critical
4. Run baseline and record results

### Test Case Template

```
| ID | Query | Expected | Pass Criteria |
|----|-------|----------|---------------|
| XX | "query text" | expected outcome | specific validation |
```
