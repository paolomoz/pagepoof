/**
 * Session Management
 * KV-based session persistence with 30-day TTL
 */

export interface Session {
  id: string;
  createdAt: string;
  lastActivity: string;
  queries: QueryHistoryItem[];
  profile: UserProfile;
  journeyStage: 'exploring' | 'comparing' | 'deciding';
  metadata: {
    userAgent?: string;
    referrer?: string;
    totalQueries: number;
    conversions: number;
  };
}

export interface QueryHistoryItem {
  query: string;
  timestamp: string;
  queryType: string;
  generatedPageUrl?: string;
  generatedPagePath?: string;
}

export interface UserProfile {
  interests: string[];
  preferredSeries: string[];
  dietaryPreferences: string[];
  priceRange?: { min: number; max: number };
}

const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const MAX_QUERIES_PER_SESSION = 20;

/**
 * Get or create a session
 */
export async function getOrCreateSession(
  sessionId: string | null,
  kv: KVNamespace,
  metadata?: { userAgent?: string; referrer?: string }
): Promise<Session> {
  if (sessionId) {
    const existing = await getSession(sessionId, kv);
    if (existing) {
      return existing;
    }
  }

  // Create new session
  const newId = sessionId || generateSessionId();
  const session: Session = {
    id: newId,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    queries: [],
    profile: {
      interests: [],
      preferredSeries: [],
      dietaryPreferences: [],
    },
    journeyStage: 'exploring',
    metadata: {
      userAgent: metadata?.userAgent,
      referrer: metadata?.referrer,
      totalQueries: 0,
      conversions: 0,
    },
  };

  await saveSession(session, kv);
  return session;
}

/**
 * Get session by ID
 */
export async function getSession(
  sessionId: string,
  kv: KVNamespace
): Promise<Session | null> {
  const key = `session:${sessionId}`;
  const data = await kv.get(key);
  if (!data) return null;

  try {
    return JSON.parse(data) as Session;
  } catch {
    return null;
  }
}

/**
 * Save session to KV
 */
export async function saveSession(
  session: Session,
  kv: KVNamespace
): Promise<void> {
  const key = `session:${session.id}`;
  session.lastActivity = new Date().toISOString();
  await kv.put(key, JSON.stringify(session), { expirationTtl: SESSION_TTL });
}

/**
 * Add query to session history
 */
export async function addQueryToSession(
  session: Session,
  query: string,
  queryType: string,
  generatedPageUrl?: string,
  kv?: KVNamespace
): Promise<Session> {
  const historyItem: QueryHistoryItem = {
    query,
    timestamp: new Date().toISOString(),
    queryType,
    generatedPageUrl,
    generatedPagePath: generatedPageUrl ? new URL(generatedPageUrl).pathname : undefined,
  };

  // Add to history (keep last N queries)
  session.queries.unshift(historyItem);
  if (session.queries.length > MAX_QUERIES_PER_SESSION) {
    session.queries = session.queries.slice(0, MAX_QUERIES_PER_SESSION);
  }

  // Update metadata
  session.metadata.totalQueries++;

  // Update journey stage based on query patterns
  session.journeyStage = inferJourneyStage(session);

  // Update profile based on queries
  updateProfile(session, query, queryType);

  if (kv) {
    await saveSession(session, kv);
  }

  return session;
}

/**
 * Record a conversion
 */
export async function recordConversion(
  session: Session,
  conversionUrl: string,
  kv: KVNamespace
): Promise<void> {
  session.metadata.conversions++;
  session.journeyStage = 'deciding';
  await saveSession(session, kv);
}

/**
 * Infer journey stage from session history
 */
function inferJourneyStage(session: Session): 'exploring' | 'comparing' | 'deciding' {
  const queryCount = session.queries.length;
  const recentQueries = session.queries.slice(0, 5);

  // Check for comparison queries
  const hasComparison = recentQueries.some(q =>
    /compare|vs|versus|difference|better/i.test(q.query)
  );

  // Check for specific product queries
  const hasSpecificProduct = recentQueries.some(q =>
    /ascent\s*x\d|e\d{3}|a\d{4}|propel|venturist/i.test(q.query)
  );

  // Check for buying intent
  const hasBuyingIntent = recentQueries.some(q =>
    /buy|purchase|order|price|cost|where to get/i.test(q.query)
  );

  if (hasBuyingIntent || session.metadata.conversions > 0) {
    return 'deciding';
  }

  if (hasComparison || hasSpecificProduct || queryCount >= 3) {
    return 'comparing';
  }

  return 'exploring';
}

/**
 * Update user profile based on query
 */
function updateProfile(session: Session, query: string, queryType: string): void {
  const lower = query.toLowerCase();

  // Extract interests
  if (/smoothie|juice|blend/i.test(lower)) {
    addToSet(session.profile.interests, 'smoothies');
  }
  if (/soup|hot|warm/i.test(lower)) {
    addToSet(session.profile.interests, 'soups');
  }
  if (/nut butter|almond|peanut/i.test(lower)) {
    addToSet(session.profile.interests, 'nut-butters');
  }
  if (/frozen|ice cream|sorbet/i.test(lower)) {
    addToSet(session.profile.interests, 'frozen-desserts');
  }

  // Extract series preferences
  if (/ascent\s*x/i.test(lower)) {
    addToSet(session.profile.preferredSeries, 'Ascent X');
  }
  if (/explorian|e\d{3}/i.test(lower)) {
    addToSet(session.profile.preferredSeries, 'Explorian');
  }
  if (/propel/i.test(lower)) {
    addToSet(session.profile.preferredSeries, 'Propel');
  }

  // Extract dietary preferences
  if (/vegan|plant.?based/i.test(lower)) {
    addToSet(session.profile.dietaryPreferences, 'vegan');
  }
  if (/keto|low.?carb/i.test(lower)) {
    addToSet(session.profile.dietaryPreferences, 'keto');
  }
  if (/gluten.?free/i.test(lower)) {
    addToSet(session.profile.dietaryPreferences, 'gluten-free');
  }
}

/**
 * Add item to set-like array (no duplicates)
 */
function addToSet(arr: string[], item: string): void {
  if (!arr.includes(item)) {
    arr.push(item);
    // Keep arrays small
    if (arr.length > 10) {
      arr.shift();
    }
  }
}

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Build session context for content generation
 */
export function buildSessionContext(session: Session): string {
  const recentQueries = session.queries.slice(0, 5);
  const interests = session.profile.interests.join(', ') || 'general';
  const series = session.profile.preferredSeries.join(', ') || 'any';
  const dietary = session.profile.dietaryPreferences.join(', ') || 'none specified';

  let context = `## User Session Context

**Journey Stage:** ${session.journeyStage}
**Interests:** ${interests}
**Preferred Series:** ${series}
**Dietary Preferences:** ${dietary}
**Total Queries This Session:** ${session.metadata.totalQueries}

`;

  if (recentQueries.length > 0) {
    context += `**Recent Queries:**\n`;
    for (const q of recentQueries) {
      context += `- "${q.query}" (${q.queryType})\n`;
    }
  }

  return context;
}
