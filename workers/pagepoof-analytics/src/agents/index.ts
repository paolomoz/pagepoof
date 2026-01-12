/**
 * Multi-Agent Analysis
 * Runs Claude, Gemini, and GPT-4o in parallel for page analysis
 */

export interface Env {
  ANTHROPIC_API_KEY: string;
  GOOGLE_AI_API_KEY: string;
  OPENAI_API_KEY: string;
}

export interface ModelAnalysis {
  model: string;
  success: boolean;
  analysis?: PageAnalysis;
  error?: string;
  parseError?: boolean; // True if API succeeded but JSON parsing failed
}

export interface PageAnalysis {
  overallScore: number;
  contentScore: number;
  layoutScore: number;
  conversionScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  topIssues: string[];
  suggestions: Suggestion[];
}

export interface Suggestion {
  category: 'content' | 'layout' | 'conversion';
  issue: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  affectedPages?: string[];
}

const ANALYSIS_PROMPT = `You are an expert website analyst specializing in e-commerce and product recommendation sites.

Analyze the following generated page content and provide a structured assessment.

## Scoring Criteria

### Content Score (0-100)
- Relevance to user query
- Accuracy of product information
- Completeness of information
- Clarity and readability
- Proper use of FAQs and tips

### Layout Score (0-100)
- Visual hierarchy
- Block organization
- White space usage
- Mobile responsiveness considerations
- Image placement

### Conversion Score (0-100)
- CTA visibility and placement
- Value proposition clarity
- Trust signals present
- Path to purchase clarity
- Urgency/scarcity elements

## Response Format

Return ONLY valid JSON (no markdown):
{
  "overallScore": 75,
  "contentScore": 80,
  "layoutScore": 72,
  "conversionScore": 73,
  "summary": "Brief 2-3 sentence summary of the page quality",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "topIssues": ["Most critical issue 1", "Critical issue 2"],
  "suggestions": [
    {
      "category": "content|layout|conversion",
      "issue": "Specific issue identified",
      "suggestion": "Actionable fix",
      "impact": "high|medium|low",
      "effort": "high|medium|low"
    }
  ]
}`;

export interface MultiAgentResult {
  analyses: ModelAnalysis[];
  successCount: number;
  totalAgents: number;
  agentStatus: {
    claude: 'success' | 'api_error' | 'parse_error';
    gemini: 'success' | 'api_error' | 'parse_error';
    openai: 'success' | 'api_error' | 'parse_error';
  };
  partialSuccess: boolean; // True if at least 1 but not all agents succeeded
}

/**
 * Run multi-agent analysis in parallel with detailed status reporting
 */
export async function runMultiAgentAnalysis(
  pageContent: string,
  query: string,
  pageUrl: string,
  env: Env
): Promise<MultiAgentResult> {
  const prompt = buildAnalysisPrompt(pageContent, query, pageUrl);

  const results = await Promise.all([
    callClaude(prompt, env),
    callGemini(prompt, env),
    callOpenAI(prompt, env),
  ]);

  const successCount = results.filter(r => r.success).length;
  const totalAgents = results.length;

  // Build detailed status for each agent
  const getStatus = (r: ModelAnalysis): 'success' | 'api_error' | 'parse_error' => {
    if (r.success) return 'success';
    if (r.parseError) return 'parse_error';
    return 'api_error';
  };

  const agentStatus = {
    claude: getStatus(results.find(r => r.model === 'claude')!),
    gemini: getStatus(results.find(r => r.model === 'gemini')!),
    openai: getStatus(results.find(r => r.model === 'openai')!),
  };

  return {
    analyses: results,
    successCount,
    totalAgents,
    agentStatus,
    partialSuccess: successCount > 0 && successCount < totalAgents,
  };
}

/**
 * Build the analysis prompt with page context
 */
function buildAnalysisPrompt(pageContent: string, query: string, pageUrl: string): string {
  return `${ANALYSIS_PROMPT}

## Page Context

**User Query:** ${query}
**Page URL:** ${pageUrl}

## Page Content

${pageContent.slice(0, 8000)}

Analyze this page and return JSON only.`;
}

/**
 * Call Claude Sonnet for analysis
 */
async function callClaude(prompt: string, env: Env): Promise<ModelAnalysis> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown');
      throw new Error(`Claude API error ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const text = data.content[0]?.text || '';
    const { success: parseSuccess, analysis } = parseJsonResponse(text);

    if (!parseSuccess) {
      console.warn('Claude response parsing failed, using fallback');
      return { model: 'claude', success: false, parseError: true, error: 'JSON parsing failed', analysis };
    }

    return { model: 'claude', success: true, analysis };
  } catch (error) {
    console.error('Claude analysis error:', error);
    return { model: 'claude', success: false, error: String(error) };
  }
}

/**
 * Call Gemini for analysis
 */
async function callGemini(prompt: string, env: Env): Promise<ModelAnalysis> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown');
      throw new Error(`Gemini API error ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    const data = await response.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const { success: parseSuccess, analysis } = parseJsonResponse(text);

    if (!parseSuccess) {
      console.warn('Gemini response parsing failed, using fallback');
      return { model: 'gemini', success: false, parseError: true, error: 'JSON parsing failed', analysis };
    }

    return { model: 'gemini', success: true, analysis };
  } catch (error) {
    console.error('Gemini analysis error:', error);
    return { model: 'gemini', success: false, error: String(error) };
  }
}

/**
 * Call GPT-4o for analysis
 */
async function callOpenAI(prompt: string, env: Env): Promise<ModelAnalysis> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown');
      throw new Error(`OpenAI API error ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const text = data.choices?.[0]?.message?.content || '';
    const { success: parseSuccess, analysis } = parseJsonResponse(text);

    if (!parseSuccess) {
      console.warn('OpenAI response parsing failed, using fallback');
      return { model: 'openai', success: false, parseError: true, error: 'JSON parsing failed', analysis };
    }

    return { model: 'openai', success: true, analysis };
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    return { model: 'openai', success: false, error: String(error) };
  }
}

/**
 * Parse JSON from model response with multiple fallback strategies
 * Returns { success, analysis } to distinguish parse success from failure
 */
function parseJsonResponse(text: string): { success: boolean; analysis: PageAnalysis } {
  // Strategy 1: Direct parse
  try {
    const parsed = JSON.parse(text);
    if (isValidAnalysis(parsed)) {
      return { success: true, analysis: parsed };
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Extract JSON object from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (isValidAnalysis(parsed)) {
        return { success: true, analysis: parsed };
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 3: Find first complete JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (isValidAnalysis(parsed)) {
        return { success: true, analysis: parsed };
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 4: Try to fix common JSON issues (trailing commas, etc.)
  try {
    const cleaned = text
      .replace(/,\s*}/g, '}')  // Remove trailing commas before }
      .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
      .replace(/'/g, '"');     // Replace single quotes with double
    const jsonMatch2 = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch2) {
      const parsed = JSON.parse(jsonMatch2[0]);
      if (isValidAnalysis(parsed)) {
        return { success: true, analysis: parsed };
      }
    }
  } catch {
    // All strategies failed
  }

  // Return failure with default structure
  return {
    success: false,
    analysis: {
      overallScore: 0,
      contentScore: 0,
      layoutScore: 0,
      conversionScore: 0,
      summary: 'Unable to parse analysis response',
      strengths: [],
      improvements: [],
      topIssues: ['Analysis parsing failed'],
      suggestions: [],
    },
  };
}

/**
 * Validate that parsed object has required PageAnalysis fields
 */
function isValidAnalysis(obj: unknown): obj is PageAnalysis {
  if (!obj || typeof obj !== 'object') return false;
  const a = obj as Record<string, unknown>;
  return (
    typeof a.overallScore === 'number' &&
    typeof a.contentScore === 'number' &&
    typeof a.layoutScore === 'number' &&
    typeof a.conversionScore === 'number'
  );
}

/**
 * Synthesize multiple agent analyses into one unified result
 */
export async function synthesizeAnalyses(
  analyses: ModelAnalysis[],
  originalContext: string,
  env: Env
): Promise<PageAnalysis> {
  const successfulAnalyses = analyses.filter(a => a.success && a.analysis);

  // If only one succeeded, return it directly
  if (successfulAnalyses.length === 1) {
    return successfulAnalyses[0].analysis!;
  }

  // If none succeeded, return error analysis
  if (successfulAnalyses.length === 0) {
    return {
      overallScore: 0,
      contentScore: 0,
      layoutScore: 0,
      conversionScore: 0,
      summary: 'All analysis agents failed',
      strengths: [],
      improvements: [],
      topIssues: ['Multi-agent analysis failed'],
      suggestions: [],
    };
  }

  // Synthesize multiple analyses with Claude
  const synthesisPrompt = buildSynthesisPrompt(successfulAnalyses, originalContext);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: synthesisPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Synthesis API error: ${response.status}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const text = data.content[0]?.text || '';
    return parseJsonResponse(text);
  } catch (error) {
    console.error('Synthesis error:', error);

    // Fallback: average the scores manually
    return averageAnalyses(successfulAnalyses.map(a => a.analysis!));
  }
}

/**
 * Build synthesis prompt
 */
function buildSynthesisPrompt(analyses: ModelAnalysis[], originalContext: string): string {
  const analysisTexts = analyses
    .map((a, i) => `### Analysis ${i + 1}\n${JSON.stringify(a.analysis, null, 2)}`)
    .join('\n\n');

  return `You are synthesizing multiple independent page analyses into a single unified assessment.

## Original Context
${originalContext.slice(0, 2000)}

## Independent Analyses
${analysisTexts}

## Instructions
1. Calculate weighted average scores (adjust based on reasoning quality)
2. Merge and deduplicate strengths, improvements, and issues
3. Keep the most actionable and specific suggestions
4. Do NOT mention or reference which analysis said what
5. Present as a single unified view

Return ONLY valid JSON with the same structure as the inputs:
{
  "overallScore": number,
  "contentScore": number,
  "layoutScore": number,
  "conversionScore": number,
  "summary": "Unified summary",
  "strengths": ["merged strengths"],
  "improvements": ["merged improvements"],
  "topIssues": ["merged top issues"],
  "suggestions": [merged suggestions array]
}`;
}

/**
 * Simple averaging fallback
 */
function averageAnalyses(analyses: PageAnalysis[]): PageAnalysis {
  const count = analyses.length;

  const avgScore = (key: keyof PageAnalysis) => {
    const sum = analyses.reduce((acc, a) => acc + (a[key] as number), 0);
    return Math.round(sum / count);
  };

  const mergeArrays = (key: keyof PageAnalysis) => {
    const all = analyses.flatMap(a => (a[key] as string[]) || []);
    return [...new Set(all)].slice(0, 5);
  };

  const mergeSuggestions = () => {
    const all = analyses.flatMap(a => a.suggestions || []);
    // Dedupe by issue text
    const seen = new Set<string>();
    return all.filter(s => {
      if (seen.has(s.issue)) return false;
      seen.add(s.issue);
      return true;
    }).slice(0, 10);
  };

  return {
    overallScore: avgScore('overallScore'),
    contentScore: avgScore('contentScore'),
    layoutScore: avgScore('layoutScore'),
    conversionScore: avgScore('conversionScore'),
    summary: analyses[0]?.summary || '',
    strengths: mergeArrays('strengths'),
    improvements: mergeArrays('improvements'),
    topIssues: mergeArrays('topIssues'),
    suggestions: mergeSuggestions(),
  };
}
