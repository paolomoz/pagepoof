/**
 * Query Classifier
 * Classifies user queries to optimize RAG retrieval and content generation
 *
 * Ported from: ../adaptive-web/workers/src/lib/query-classifier.js
 */

export type QueryType = 'product' | 'recipe' | 'blog' | 'support' | 'commercial' | 'general';

export interface ClassificationResult {
  type: QueryType;
  confidence: number;
  keywords: string[];
  needsProductImages: boolean;
  needsRecipeImages: boolean;
  ragFilters: RagFilters;
}

export interface RagFilters {
  collections: string[];
  minScore: number;
  topK: number;
  diversityPenalty: number;
}

// Strong indicators get 2.0 weight (vs 0.6-1.0 for patterns)
const QUERY_PATTERNS: Record<QueryType, { strong: RegExp[]; patterns: RegExp[]; weight: number }> = {
  product: {
    strong: [
      /\b(vitamix|ascent|explorian|propel|venturist|legacy)\s*(x\d|e\d{3}|\d{3,4})/i,
      /\bsku\s*[:\-]?\s*\w+/i,
      /\b(compare|comparison|vs|versus)\b.*\b(blender|vitamix|model)/i,
      /\bwhich\s+(vitamix|blender|model)\b/i,
    ],
    patterns: [
      /\b(blender|container|blade|motor|base|attachment|accessory)/i,
      /\b(price|cost|warranty|features?|specs?|specifications?)/i,
      /\b(buy|purchase|order|shop)/i,
      /\b(64\s*oz|48\s*oz|20\s*oz|low.?profile)/i,
      /\bself.?detect/i,
    ],
    weight: 1.0,
  },
  recipe: {
    strong: [
      /\b(recipe|recipes)\s+(for|with|using)\b/i,
      /\bhow\s+to\s+(make|prepare|cook|blend)\b/i,
      /\bwhat\s+can\s+i\s+(make|blend|create)\b/i,
    ],
    patterns: [
      /\b(smoothie|soup|sauce|dip|butter|milk|juice|puree|frozen\s+dessert)/i,
      /\b(ingredients?|instructions?|servings?|prep\s+time)/i,
      /\b(vegan|vegetarian|keto|paleo|gluten.?free|dairy.?free)/i,
      /\b(breakfast|lunch|dinner|snack|dessert|appetizer)/i,
      /\b(healthy|nutritious|low.?calorie|high.?protein)/i,
    ],
    weight: 1.0,
  },
  blog: {
    strong: [
      /\b(tips?|tricks?|hacks?)\s+(for|on|about)\b/i,
      /\b(guide|tutorial)\s+(to|for|on)\b/i,
      /\bbest\s+(way|practice|method)\s+to\b/i,
    ],
    patterns: [
      /\b(learn|discover|explore|understand)\b/i,
      /\bwhy\s+(should|do|is)\b/i,
      /\bbenefits?\s+(of|from)\b/i,
      /\b(lifestyle|wellness|nutrition|health)\b/i,
    ],
    weight: 0.8,
  },
  support: {
    strong: [
      /\b(troubleshoot|problem|issue|error|broken|not\s+working)/i,
      /\b(fix|repair|replace|return|warranty\s+claim)/i,
      /\bwhy\s+(does|is|won't|doesn't)\s+my\b/i,
    ],
    patterns: [
      /\b(help|support|contact|service)/i,
      /\b(clean|cleaning|maintenance|care)/i,
      /\b(overheat|leak|noise|loud|smoke|smell)/i,
      /\b(manual|instructions|setup)/i,
      /\b(register|registration|serial\s+number)/i,
    ],
    weight: 1.0,
  },
  commercial: {
    strong: [
      /\b(commercial|professional|restaurant|business|foodservice)/i,
      /\b(bar|café|cafe|coffee\s+shop|juice\s+bar)/i,
      /\bhigh.?volume/i,
    ],
    patterns: [
      /\b(bulk|wholesale|dealer|distributor)/i,
      /\b(quiet\s+one|the\s+quiet\s+one|drink\s+machine)/i,
      /\b(nsf|certified)/i,
    ],
    weight: 0.9,
  },
  general: {
    strong: [],
    patterns: [
      /\bwhat\s+is\b/i,
      /\btell\s+me\s+about\b/i,
      /\b(hello|hi|hey|help)\b/i,
    ],
    weight: 0.6,
  },
};

// Stop words to filter from keyword extraction
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now',
  'about', 'after', 'again', 'any', 'because', 'before', 'between',
  'into', 'through', 'during', 'above', 'below', 'up', 'down', 'out',
  'off', 'over', 'under', 'further', 'then', 'once', 'here', 'there',
  'me', 'my', 'myself', 'your', 'yourself', 'his', 'her', 'its', 'our',
  'their', 'tell', 'show', 'give', 'want', 'need', 'like', 'please',
]);

// RAG configuration per query type
const RAG_CONFIGS: Record<QueryType, RagFilters> = {
  product: {
    collections: ['products', 'faqs', 'videos'],
    minScore: 0.7,
    topK: 8,
    diversityPenalty: 0.1,
  },
  recipe: {
    collections: ['recipes', 'videos', 'faqs'],
    minScore: 0.65,
    topK: 10,
    diversityPenalty: 0.15,
  },
  blog: {
    collections: ['faqs', 'recipes', 'videos'],
    minScore: 0.6,
    topK: 8,
    diversityPenalty: 0.2,
  },
  support: {
    collections: ['faqs', 'products', 'videos'],
    minScore: 0.7,
    topK: 6,
    diversityPenalty: 0.05,
  },
  commercial: {
    collections: ['products', 'faqs'],
    minScore: 0.7,
    topK: 6,
    diversityPenalty: 0.1,
  },
  general: {
    collections: ['faqs', 'products', 'recipes', 'videos'],
    minScore: 0.55,
    topK: 10,
    diversityPenalty: 0.2,
  },
};

/**
 * Classify a user query to determine intent and optimize retrieval
 */
export function classifyQuery(query: string): ClassificationResult {
  const normalizedQuery = query.toLowerCase().trim();
  const scores: Record<QueryType, number> = {
    product: 0,
    recipe: 0,
    blog: 0,
    support: 0,
    commercial: 0,
    general: 0,
  };

  // Score each query type
  for (const [type, config] of Object.entries(QUERY_PATTERNS)) {
    const queryType = type as QueryType;

    // Strong indicators get 2.0 weight
    for (const pattern of config.strong) {
      if (pattern.test(normalizedQuery)) {
        scores[queryType] += 2.0;
      }
    }

    // Regular patterns get weighted score
    for (const pattern of config.patterns) {
      if (pattern.test(normalizedQuery)) {
        scores[queryType] += config.weight;
      }
    }
  }

  // Find highest scoring type
  let maxScore = 0;
  let classifiedType: QueryType = 'general';

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      classifiedType = type as QueryType;
    }
  }

  // Calculate confidence (normalize to 0-1 range)
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.min(maxScore / Math.max(totalScore, 1), 1) : 0.5;

  // Extract keywords
  const keywords = extractKeywords(normalizedQuery);

  // Determine image needs based on query type
  const needsProductImages = ['product', 'commercial', 'support'].includes(classifiedType);
  const needsRecipeImages = ['recipe', 'blog'].includes(classifiedType);

  return {
    type: classifiedType,
    confidence: Math.round(confidence * 100) / 100,
    keywords,
    needsProductImages,
    needsRecipeImages,
    ragFilters: RAG_CONFIGS[classifiedType],
  };
}

/**
 * Extract meaningful keywords from query for search augmentation
 */
export function extractKeywords(query: string): string[] {
  // Tokenize and normalize
  const tokens = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);

  // Filter stop words and duplicates
  const keywords = [...new Set(tokens.filter(token => !STOP_WORDS.has(token)))];

  // Extract multi-word phrases (bigrams for product names, etc.)
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    // Check for known multi-word terms
    if (
      /vitamix|ascent|explorian|propel|venturist/.test(bigram) ||
      /smoothie bowl|nut butter|frozen dessert|hot soup/.test(bigram) ||
      /self detect|low profile|quick quiet/.test(bigram.replace(/-/g, ' '))
    ) {
      bigrams.push(bigram.replace(/\s+/g, '-'));
    }
  }

  return [...keywords, ...bigrams].slice(0, 10);
}

/**
 * Augment query with related terms for better RAG retrieval
 */
export function augmentQuery(query: string, classification: ClassificationResult): string[] {
  const augmented = [query];

  // Add type-specific augmentations
  switch (classification.type) {
    case 'recipe':
      // Add dietary/health terms if detected
      if (/healthy|nutritious/i.test(query)) {
        augmented.push(query + ' nutrition wellness');
      }
      if (/quick|fast|easy/i.test(query)) {
        augmented.push(query + ' simple beginner');
      }
      break;

    case 'product':
      // Add comparison context
      if (/which|best|compare/i.test(query)) {
        augmented.push(query + ' comparison features specs');
      }
      // Add series context for model queries
      if (/ascent|x\d/i.test(query)) {
        augmented.push(query + ' ascent series self-detect');
      }
      if (/explorian|e\d{3}/i.test(query)) {
        augmented.push(query + ' explorian series value');
      }
      break;

    case 'support':
      // Add troubleshooting context
      augmented.push(query + ' troubleshooting fix solution');
      break;
  }

  return augmented;
}
