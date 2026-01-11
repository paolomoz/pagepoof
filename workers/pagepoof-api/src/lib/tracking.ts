/**
 * Analytics Tracking
 * Sends events to the analytics worker
 */

const ANALYTICS_ENDPOINT = 'https://pagepoof-analytics.paolomoz.workers.dev';

export interface TrackingEvent {
  type: 'session_start' | 'query' | 'page_published' | 'conversion';
  sessionId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Track an analytics event
 */
export async function trackEvent(event: TrackingEvent): Promise<void> {
  try {
    await fetch(`${ANALYTICS_ENDPOINT}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

/**
 * Track session start
 */
export async function trackSessionStart(
  sessionId: string,
  metadata: { userAgent?: string; referrer?: string }
): Promise<void> {
  await trackEvent({
    type: 'session_start',
    sessionId,
    timestamp: new Date().toISOString(),
    data: {
      userAgent: metadata.userAgent,
      referrer: metadata.referrer,
    },
  });
}

/**
 * Track a query
 */
export async function trackQuery(
  sessionId: string,
  query: string,
  queryType: string,
  journeyStage: string,
  consecutiveQueryNumber: number
): Promise<void> {
  await trackEvent({
    type: 'query',
    sessionId,
    timestamp: new Date().toISOString(),
    data: {
      query,
      intent: queryType,
      journeyStage,
      consecutiveQueryNumber,
    },
  });
}

/**
 * Track page published
 */
export async function trackPagePublished(
  sessionId: string,
  query: string,
  pageUrl: string,
  pagePath: string
): Promise<void> {
  await trackEvent({
    type: 'page_published',
    sessionId,
    timestamp: new Date().toISOString(),
    data: {
      query,
      generatedPageUrl: pageUrl,
      generatedPagePath: pagePath,
    },
  });
}

/**
 * Track conversion (click to vitamix.com)
 */
export async function trackConversion(
  sessionId: string,
  ctaUrl: string
): Promise<void> {
  await trackEvent({
    type: 'conversion',
    sessionId,
    timestamp: new Date().toISOString(),
    data: {
      ctaUrl,
    },
  });
}

/**
 * Update recent queries list in analytics KV
 * This is called after successful generation
 */
export async function updateRecentQueries(
  query: string,
  queryType: string,
  pageUrl: string,
  sessionId: string,
  consecutiveQueryNumber: number
): Promise<void> {
  try {
    // This would need direct KV access, so we send it as part of the track event
    // The analytics worker will handle adding to the recent-queries list
    await trackEvent({
      type: 'query',
      sessionId,
      timestamp: new Date().toISOString(),
      data: {
        query,
        intent: queryType,
        generatedPageUrl: pageUrl,
        generatedPagePath: new URL(pageUrl).pathname,
        consecutiveQueryNumber,
      },
    });
  } catch (error) {
    console.error('Failed to update recent queries:', error);
  }
}
