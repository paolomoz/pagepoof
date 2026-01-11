/**
 * Pagepoof Analytics Worker
 * Self-improvement system with multi-agent analysis
 */

import { runMultiAgentAnalysis, synthesizeAnalyses, type PageAnalysis, type Suggestion } from './agents';

export interface Env {
  ANALYTICS: KVNamespace;
  CACHE: KVNamespace;
  ANTHROPIC_API_KEY: string;
  GOOGLE_AI_API_KEY: string;
  OPENAI_API_KEY: string;
}

interface AnalyticsEvent {
  type: 'session_start' | 'query' | 'page_published' | 'conversion';
  sessionId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface DailyStats {
  date: string;
  sessions: number;
  queries: number;
  conversions: number;
  sessionIds: string[];
}

interface BatchAnalysisResult {
  timestamp: number;
  overallScore: number;
  contentScore: number;
  layoutScore: number;
  conversionScore: number;
  topIssues: string[];
  suggestions: {
    content: Suggestion[];
    layout: Suggestion[];
    conversion: Suggestion[];
  };
  exemplaryPages: Array<{ url: string; query: string; reason: string }>;
  problematicPages: Array<{ url: string; query: string; reason: string }>;
  pagesAnalyzed: number;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Event tracking
      if (path === '/api/track' && request.method === 'POST') {
        return handleTrack(request, env);
      }

      // Analytics summary
      if (path === '/api/analytics/summary') {
        return handleSummary(env);
      }

      // Session list
      if (path === '/api/analytics/sessions') {
        return handleSessions(request, env);
      }

      // Batch analysis
      if (path === '/api/analytics/analyze' && request.method === 'POST') {
        return handleAnalyze(request, env);
      }

      // Single page analysis
      if (path === '/api/analytics/analyze-page') {
        return handleAnalyzePage(request, env);
      }

      if (path === '/health') {
        return new Response(JSON.stringify({ status: 'ok', worker: 'pagepoof-analytics' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Analytics worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

async function handleTrack(request: Request, env: Env): Promise<Response> {
  const event = await request.json() as AnalyticsEvent;
  const dateStr = event.timestamp.split('T')[0];

  // Store event with TTL
  const key = `event:${event.sessionId}:${event.timestamp}`;
  await env.ANALYTICS.put(key, JSON.stringify(event), { expirationTtl: 30 * 24 * 60 * 60 }); // 30 days

  // Update session data
  const sessionKey = `session:${event.sessionId}`;
  const existingSession = await env.ANALYTICS.get(sessionKey);
  const isNewSession = !existingSession;
  const session = existingSession ? JSON.parse(existingSession) : { events: [], queries: [] };

  session.events.push(event);
  if (event.type === 'query' && session.queries.length < 20) {
    session.queries.push(event.data);
  }
  session.lastActivity = event.timestamp;

  await env.ANALYTICS.put(sessionKey, JSON.stringify(session), { expirationTtl: 30 * 24 * 60 * 60 });

  // Update daily stats
  const dailyKey = `daily:${dateStr}`;
  const dailyJson = await env.ANALYTICS.get(dailyKey);
  const daily = dailyJson ? JSON.parse(dailyJson) : { sessions: 0, queries: 0, conversions: 0 };

  if (isNewSession || event.type === 'session_start') {
    daily.sessions += 1;
  }
  if (event.type === 'query') {
    daily.queries += 1;
  }
  if (event.type === 'conversion') {
    daily.conversions += 1;
  }

  await env.ANALYTICS.put(dailyKey, JSON.stringify(daily), { expirationTtl: 30 * 24 * 60 * 60 });

  // Update recent queries list (for top queries)
  if (event.type === 'query' && event.data?.query) {
    const recentJson = await env.ANALYTICS.get('recent-queries');
    const recent = recentJson ? JSON.parse(recentJson) : [];
    recent.unshift({
      query: event.data.query,
      timestamp: event.timestamp,
      sessionId: event.sessionId,
      consecutiveQueryNumber: event.data.consecutiveQueryNumber || 1,
    });
    // Keep last 100 queries
    if (recent.length > 100) {
      recent.length = 100;
    }
    await env.ANALYTICS.put('recent-queries', JSON.stringify(recent), { expirationTtl: 30 * 24 * 60 * 60 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function handleSummary(env: Env): Promise<Response> {
  // Aggregate last 30 days of stats
  const now = new Date();
  let totalSessions = 0;
  let totalQueries = 0;
  let totalConversions = 0;
  const queryCount = new Map<string, number>();
  const dailyTrend: Array<{ date: string; sessions: number; queries: number }> = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const key = `daily:${dateStr}`;

    const statsJson = await env.ANALYTICS.get(key);
    if (statsJson) {
      const stats = JSON.parse(statsJson) as DailyStats;
      totalSessions += stats.sessions;
      totalQueries += stats.queries;
      totalConversions += stats.conversions;
      dailyTrend.push({ date: dateStr, sessions: stats.sessions, queries: stats.queries });
    }
  }

  // Get recent queries for top queries
  const recentQueriesJson = await env.ANALYTICS.get('recent-queries');
  const recentQueries = recentQueriesJson ? JSON.parse(recentQueriesJson) : [];
  for (const q of recentQueries) {
    queryCount.set(q.query, (queryCount.get(q.query) || 0) + 1);
  }

  const topQueries = [...queryCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  // Get last analysis
  const lastAnalysisJson = await env.ANALYTICS.get('analysis:latest');
  const lastAnalysis = lastAnalysisJson ? JSON.parse(lastAnalysisJson) : null;

  const conversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;
  const avgQueriesPerSession = totalSessions > 0 ? totalQueries / totalSessions : 0;
  const engagementRate = totalSessions > 0
    ? (recentQueries.filter((q: { consecutiveQueryNumber: number }) => q.consecutiveQueryNumber > 1).length / totalSessions) * 100
    : 0;

  const summary = {
    period: '30d',
    totalSessions,
    totalQueries,
    totalConversions,
    conversionRate: Math.round(conversionRate * 10) / 10,
    avgQueriesPerSession: Math.round(avgQueriesPerSession * 10) / 10,
    engagementRate: Math.round(engagementRate * 10) / 10,
    topQueries,
    dailyTrend: dailyTrend.reverse().slice(0, 7),
    lastAnalysis,
  };

  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function handleSessions(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  // TODO: Implement session listing with pagination

  return new Response(JSON.stringify({ sessions: [], total: 0, limit, offset }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === 'true';

  // Check rate limit (1 hour) unless forced
  const lastAnalysisJson = await env.ANALYTICS.get('analysis:latest');
  if (!force && lastAnalysisJson) {
    const lastAnalysis = JSON.parse(lastAnalysisJson) as BatchAnalysisResult;
    const hourAgo = Date.now() - 60 * 60 * 1000;
    if (lastAnalysis.timestamp > hourAgo) {
      const nextAvailable = new Date(lastAnalysis.timestamp + 60 * 60 * 1000).toISOString();
      return new Response(JSON.stringify({ cached: true, analysis: lastAnalysis, nextAvailable }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  // Get recent queries to analyze
  const recentQueriesJson = await env.ANALYTICS.get('recent-queries');
  const recentQueries = recentQueriesJson ? JSON.parse(recentQueriesJson) : [];

  if (recentQueries.length === 0) {
    return new Response(JSON.stringify({ error: 'No queries to analyze' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Analyze up to 20 recent pages
  const pagesToAnalyze = recentQueries.slice(0, 20);
  const pageAnalyses: Array<{ query: string; url: string; analysis: PageAnalysis }> = [];

  for (const page of pagesToAnalyze) {
    if (!page.generatedPageUrl) continue;

    try {
      // Fetch page content
      const pageResponse = await fetch(page.generatedPageUrl);
      if (!pageResponse.ok) continue;

      const pageHtml = await pageResponse.text();
      const pageContent = extractMainContent(pageHtml);

      // Run multi-agent analysis
      const { analyses, successCount } = await runMultiAgentAnalysis(
        pageContent,
        page.query,
        page.generatedPageUrl,
        env
      );

      if (successCount > 0) {
        const synthesis = await synthesizeAnalyses(analyses, pageContent, env);
        pageAnalyses.push({ query: page.query, url: page.generatedPageUrl, analysis: synthesis });
      }
    } catch (error) {
      console.error('Error analyzing page:', page.generatedPageUrl, error);
    }
  }

  if (pageAnalyses.length === 0) {
    return new Response(JSON.stringify({ error: 'Could not analyze any pages' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Aggregate results
  const avgScores = {
    overall: 0,
    content: 0,
    layout: 0,
    conversion: 0,
  };

  const allSuggestions: { content: Suggestion[]; layout: Suggestion[]; conversion: Suggestion[] } = {
    content: [],
    layout: [],
    conversion: [],
  };

  const issueCount = new Map<string, number>();
  const exemplaryPages: Array<{ url: string; query: string; reason: string }> = [];
  const problematicPages: Array<{ url: string; query: string; reason: string }> = [];

  for (const { query, url, analysis } of pageAnalyses) {
    avgScores.overall += analysis.overallScore;
    avgScores.content += analysis.contentScore;
    avgScores.layout += analysis.layoutScore;
    avgScores.conversion += analysis.conversionScore;

    // Track issues
    for (const issue of analysis.topIssues) {
      issueCount.set(issue, (issueCount.get(issue) || 0) + 1);
    }

    // Categorize suggestions
    for (const suggestion of analysis.suggestions) {
      suggestion.affectedPages = suggestion.affectedPages || [];
      suggestion.affectedPages.push(url);
      allSuggestions[suggestion.category].push(suggestion);
    }

    // Track exemplary vs problematic
    if (analysis.overallScore >= 80) {
      exemplaryPages.push({ url, query, reason: analysis.strengths[0] || 'High overall score' });
    } else if (analysis.overallScore < 60) {
      problematicPages.push({ url, query, reason: analysis.topIssues[0] || 'Low overall score' });
    }
  }

  const count = pageAnalyses.length;

  // Build batch result
  const batchResult: BatchAnalysisResult = {
    timestamp: Date.now(),
    overallScore: Math.round(avgScores.overall / count),
    contentScore: Math.round(avgScores.content / count),
    layoutScore: Math.round(avgScores.layout / count),
    conversionScore: Math.round(avgScores.conversion / count),
    topIssues: [...issueCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue),
    suggestions: {
      content: deduplicateSuggestions(allSuggestions.content).slice(0, 5),
      layout: deduplicateSuggestions(allSuggestions.layout).slice(0, 5),
      conversion: deduplicateSuggestions(allSuggestions.conversion).slice(0, 5),
    },
    exemplaryPages: exemplaryPages.slice(0, 3),
    problematicPages: problematicPages.slice(0, 3),
    pagesAnalyzed: count,
  };

  // Add Claude Code prompts to suggestions
  addClaudeCodePrompts(batchResult);

  // Cache result
  await env.ANALYTICS.put('analysis:latest', JSON.stringify(batchResult), {
    expirationTtl: 7 * 24 * 60 * 60, // 7 days
  });

  const nextAvailable = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  return new Response(JSON.stringify({ cached: false, analysis: batchResult, nextAvailable }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function handleAnalyzePage(request: Request, env: Env): Promise<Response> {
  const reqUrl = new URL(request.url);
  const pageUrl = reqUrl.searchParams.get('url');
  const query = reqUrl.searchParams.get('query') || 'unknown query';

  if (!pageUrl) {
    return new Response(JSON.stringify({ error: 'URL parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Check cache first (24-hour TTL for single pages)
  const cacheKey = `page-analysis:${pageUrl}`;
  const cached = await env.ANALYTICS.get(cacheKey);
  if (cached) {
    return new Response(JSON.stringify({ cached: true, analysis: JSON.parse(cached) }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    // Fetch page content
    const pageResponse = await fetch(pageUrl);
    if (!pageResponse.ok) {
      return new Response(JSON.stringify({ error: 'Could not fetch page' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const pageHtml = await pageResponse.text();
    const pageContent = extractMainContent(pageHtml);

    // Run multi-agent analysis
    const { analyses, successCount } = await runMultiAgentAnalysis(pageContent, query, pageUrl, env);

    if (successCount === 0) {
      return new Response(JSON.stringify({ error: 'All analysis agents failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Synthesize results
    const analysis = await synthesizeAnalyses(analyses, pageContent, env);

    // Cache result (24 hours)
    await env.ANALYTICS.put(cacheKey, JSON.stringify(analysis), {
      expirationTtl: 24 * 60 * 60,
    });

    return new Response(JSON.stringify({ cached: false, analysis }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('Single page analysis error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

/**
 * Extract main content from HTML (remove scripts, styles, nav, etc.)
 */
function extractMainContent(html: string): string {
  let content = html;
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<(nav|header|footer)[^>]*>[\s\S]*?<\/\1>/gi, '');
  content = content.replace(/<[^>]+>/g, ' ');
  content = content.replace(/\s+/g, ' ').trim();
  return content.slice(0, 8000);
}

/**
 * Deduplicate suggestions by issue text
 */
function deduplicateSuggestions(suggestions: Suggestion[]): Suggestion[] {
  const seen = new Set<string>();
  const result: Suggestion[] = [];

  // Sort by priority (high impact + low effort first)
  const prioritized = suggestions.sort((a, b) => {
    const scoreA = calculatePriority(a.impact, a.effort);
    const scoreB = calculatePriority(b.impact, b.effort);
    return scoreB - scoreA;
  });

  for (const suggestion of prioritized) {
    const key = suggestion.issue.toLowerCase().slice(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(suggestion);
    }
  }

  return result;
}

/**
 * Calculate priority score for suggestions
 */
function calculatePriority(impact: string, effort: string): number {
  const impactScore: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const effortScore: Record<string, number> = { low: 3, medium: 2, high: 1 };
  return (impactScore[impact] || 1) * 2 + (effortScore[effort] || 1);
}

/**
 * Add Claude Code prompts to all suggestions
 */
function addClaudeCodePrompts(result: BatchAnalysisResult): void {
  for (const category of ['content', 'layout', 'conversion'] as const) {
    for (const suggestion of result.suggestions[category]) {
      (suggestion as Suggestion & { claudeCodePrompt: string }).claudeCodePrompt =
        generateClaudeCodePrompt(suggestion, category, result.problematicPages);
    }
  }
}

/**
 * Generate Claude Code prompt for a single improvement
 */
function generateClaudeCodePrompt(
  suggestion: Suggestion,
  category: string,
  affectedPages: Array<{ url: string; query: string; reason: string }>
): string {
  const categoryFocus: Record<string, string> = {
    content: 'content quality, accuracy, and relevance',
    layout: 'visual hierarchy, block organization, and responsive design',
    conversion: 'CTAs, value propositions, and path to purchase',
  };

  const pagesContext = affectedPages
    .slice(0, 3)
    .map(p => `- ${p.url} (${p.reason})`)
    .join('\n');

  return `# Improvement Task: ${category.charAt(0).toUpperCase() + category.slice(1)}

## Issue to Address
${suggestion.issue}

## Suggested Fix
${suggestion.suggestion}

## Category Focus
This improvement focuses on ${categoryFocus[category] || category}.

## Impact & Effort
- Impact: ${suggestion.impact}
- Effort: ${suggestion.effort}

## Affected Pages
${pagesContext || 'Multiple generated pages'}

## Instructions
1. Analyze the relevant blocks and templates in this AEM Edge Delivery Services project
2. Identify the specific code changes needed to address this improvement
3. Implement the changes following existing code patterns and styles
4. Test the changes locally before committing

## Project Context
- This is a Vitamix product recommendation site built on AEM Edge Delivery Services
- Generated pages are created dynamically based on user queries
- Focus on improving the user experience and conversion rate

Please implement this improvement across the affected components.`;
}
