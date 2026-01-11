/**
 * Analytics Dashboard Block
 *
 * Displays analytics metrics, session data, and AI-powered analysis.
 */

const ANALYTICS_ENDPOINT = 'https://pagepoof-analytics.paolomoz.workers.dev';

/**
 * Format a number with commas
 */
function formatNumber(num) {
  return num?.toLocaleString() || '0';
}

/**
 * Format a percentage
 */
function formatPercent(num) {
  return `${(num || 0).toFixed(1)}%`;
}

/**
 * Format a timestamp as relative time
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Never';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Show a toast notification
 */
function showNotification(message, type = 'success') {
  const existing = document.querySelector('.analytics-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `analytics-notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Create a metric card element
 */
function createMetricCard(label, value, subtitle = '') {
  const card = document.createElement('div');
  card.className = 'metric-card';
  card.innerHTML = `
    <div class="metric-value">${value}</div>
    <div class="metric-label">${label}</div>
    ${subtitle ? `<div class="metric-subtitle">${subtitle}</div>` : ''}
  `;
  return card;
}

/**
 * Create a score gauge element
 */
function createScoreGauge(score, label) {
  const gauge = document.createElement('div');
  gauge.className = 'score-gauge';

  let color = '#ef4444'; // red for low scores
  if (score >= 70) {
    color = '#22c55e'; // green for high scores
  } else if (score >= 40) {
    color = '#eab308'; // yellow for medium scores
  }

  gauge.innerHTML = `
    <div class="gauge-circle" style="--score: ${score}; --color: ${color}">
      <span class="gauge-value">${score}</span>
    </div>
    <div class="gauge-label">${label}</div>
  `;
  return gauge;
}

/**
 * Create pages list (exemplary or problematic)
 */
function createPagesList(title, pages, className) {
  const container = document.createElement('div');
  container.className = `pages-section ${className}`;
  container.innerHTML = `
    <h4>${title}</h4>
    <ul class="pages-list">
      ${pages.map((p) => `
        <li>
          <a href="${p.url}" target="_blank">${p.query}</a>
          <span class="page-reason">${p.reason}</span>
        </li>
      `).join('')}
    </ul>
  `;
  return container;
}

/**
 * Load and display analytics summary
 */
async function loadSummary(block) {
  const metricsContainer = block.querySelector('.metrics-grid');
  const topQueriesContainer = block.querySelector('.top-queries');

  try {
    const response = await fetch(`${ANALYTICS_ENDPOINT}/api/analytics/summary`);
    if (!response.ok) throw new Error('Failed to load summary');

    const data = await response.json();

    // Clear loading state
    metricsContainer.innerHTML = '';

    // Add metric cards
    metricsContainer.appendChild(createMetricCard('Total Sessions', formatNumber(data.totalSessions), 'Last 30 days'));
    metricsContainer.appendChild(createMetricCard('Total Queries', formatNumber(data.totalQueries)));
    metricsContainer.appendChild(createMetricCard('Avg Queries/Session', data.avgQueriesPerSession?.toFixed(1) || '0', 'Content usefulness'));
    metricsContainer.appendChild(createMetricCard('Conversion Rate', formatPercent(data.conversionRate), 'Clicks to vitamix.com'));
    metricsContainer.appendChild(createMetricCard('Engagement Rate', formatPercent(data.engagementRate), 'Sessions with 2+ queries'));
    metricsContainer.appendChild(createMetricCard('Total Conversions', formatNumber(data.totalConversions)));

    // Show top queries
    if (data.topQueries && data.topQueries.length > 0) {
      topQueriesContainer.innerHTML = `
        <h3>Top Queries</h3>
        <ol class="top-queries-list">
          ${data.topQueries.map((q) => `<li><span class="query-text">${q.query}</span> <span class="query-count">(${q.count})</span></li>`).join('')}
        </ol>
      `;
    } else {
      topQueriesContainer.innerHTML = '<p class="no-data">No queries yet</p>';
    }

    // Show last analysis info
    const analysisInfo = block.querySelector('.analysis-info');
    if (data.lastAnalysis) {
      analysisInfo.innerHTML = `
        <p>Last analysis: ${formatRelativeTime(data.lastAnalysis.timestamp)}
        (Score: ${data.lastAnalysis.overallScore}/100, ${data.lastAnalysis.pagesAnalyzed} pages)</p>
      `;
    } else {
      analysisInfo.innerHTML = '<p>No analysis run yet</p>';
    }
  } catch (error) {
    console.error('[Analytics] Failed to load summary:', error);
    metricsContainer.innerHTML = `
      <div class="error-message">
        <p>Failed to load analytics data.</p>
        <p>Make sure the analytics worker is deployed.</p>
      </div>
    `;
  }
}

/**
 * Run AI analysis
 */
async function runAnalysis(block) {
  const analysisButton = block.querySelector('.run-analysis-btn');
  const analysisResults = block.querySelector('.analysis-results');
  const analysisInfo = block.querySelector('.analysis-info');

  analysisButton.disabled = true;
  analysisButton.textContent = 'Analyzing...';
  analysisResults.innerHTML = '<div class="loading">Running AI analysis on recent pages... This may take 30-60 seconds.</div>';

  try {
    const response = await fetch(`${ANALYTICS_ENDPOINT}/api/analytics/analyze`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Analysis failed');
    }

    const data = await response.json();
    const { analysis } = data;

    // Update analysis info
    analysisInfo.innerHTML = `
      <p>Analysis ${data.cached ? 'from cache' : 'completed'}: ${formatRelativeTime(analysis.timestamp)}
      (${analysis.pagesAnalyzed} pages analyzed)</p>
      ${data.cached ? `<p class="cache-notice">Next analysis available: ${new Date(data.nextAvailable).toLocaleTimeString()}</p>` : ''}
    `;

    // Build results
    analysisResults.innerHTML = '';

    // Scores section
    const scoresSection = document.createElement('div');
    scoresSection.className = 'scores-section';
    scoresSection.appendChild(createScoreGauge(analysis.overallScore, 'Overall'));
    scoresSection.appendChild(createScoreGauge(analysis.contentScore, 'Content'));
    scoresSection.appendChild(createScoreGauge(analysis.layoutScore, 'Layout'));
    scoresSection.appendChild(createScoreGauge(analysis.conversionScore, 'Conversion'));
    analysisResults.appendChild(scoresSection);

    // Top issues
    if (analysis.topIssues && analysis.topIssues.length > 0) {
      const issuesSection = document.createElement('div');
      issuesSection.className = 'issues-section';
      issuesSection.innerHTML = `
        <h3>Top Issues</h3>
        <ul class="issues-list">
          ${analysis.topIssues.map((issue) => `<li>${issue}</li>`).join('')}
        </ul>
      `;
      analysisResults.appendChild(issuesSection);
    }

    // Suggestions tabs
    const suggestionsSection = document.createElement('div');
    suggestionsSection.className = 'suggestions-container';
    suggestionsSection.innerHTML = '<h3>Improvement Suggestions</h3>';

    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'suggestions-tabs';

    const tabs = [
      { id: 'content', label: 'Content', suggestions: analysis.suggestions?.content || [] },
      { id: 'layout', label: 'Layout', suggestions: analysis.suggestions?.layout || [] },
      { id: 'conversion', label: 'Conversion', suggestions: analysis.suggestions?.conversion || [] },
    ];

    tabs.forEach((tab, index) => {
      const tabButton = document.createElement('button');
      tabButton.className = `tab-button ${index === 0 ? 'active' : ''}`;
      tabButton.textContent = tab.label;
      tabButton.dataset.tab = tab.id;
      tabsContainer.appendChild(tabButton);
    });

    suggestionsSection.appendChild(tabsContainer);

    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    tabs.forEach((tab, index) => {
      const panel = document.createElement('div');
      panel.className = `tab-panel ${index === 0 ? 'active' : ''}`;
      panel.dataset.tab = tab.id;
      if (tab.suggestions.length > 0) {
        panel.innerHTML = `
          <ul class="suggestion-cards">
            ${tab.suggestions.map((s) => {
    const suggestion = typeof s === 'string' ? { suggestion: s } : s;
    return `
                <li class="suggestion-card">
                  <div class="suggestion-header">
                    ${suggestion.impact ? `<span class="badge impact-${suggestion.impact}">${suggestion.impact} impact</span>` : ''}
                    ${suggestion.effort ? `<span class="badge effort-${suggestion.effort}">${suggestion.effort} effort</span>` : ''}
                  </div>
                  <p class="suggestion-issue">${suggestion.issue || ''}</p>
                  <p class="suggestion-text">${suggestion.suggestion || s}</p>
                  ${suggestion.claudeCodePrompt ? `
                    <button class="copy-prompt-btn" data-prompt="${encodeURIComponent(suggestion.claudeCodePrompt)}">
                      Copy Claude Code Prompt
                    </button>
                  ` : ''}
                </li>
              `;
  }).join('')}
          </ul>
        `;
      } else {
        panel.innerHTML = '<p class="no-data">No suggestions in this category</p>';
      }
      tabContent.appendChild(panel);
    });
    suggestionsSection.appendChild(tabContent);

    // Add copy prompt click handlers
    suggestionsSection.querySelectorAll('.copy-prompt-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prompt = decodeURIComponent(btn.dataset.prompt);
        navigator.clipboard.writeText(prompt).then(() => {
          showNotification('Prompt copied to clipboard! Paste it in Claude Code.');
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Copy Claude Code Prompt'; }, 2000);
        });
      });
    });

    // Tab click handlers
    tabsContainer.querySelectorAll('.tab-button').forEach((btn) => {
      btn.addEventListener('click', () => {
        tabsContainer.querySelectorAll('.tab-button').forEach((b) => b.classList.remove('active'));
        tabContent.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        tabContent.querySelector(`.tab-panel[data-tab="${btn.dataset.tab}"]`).classList.add('active');
      });
    });

    analysisResults.appendChild(suggestionsSection);

    // Pages lists
    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'pages-container';

    if (analysis.exemplaryPages && analysis.exemplaryPages.length > 0) {
      pagesContainer.appendChild(createPagesList('Exemplary Pages', analysis.exemplaryPages, 'exemplary'));
    }

    if (analysis.problematicPages && analysis.problematicPages.length > 0) {
      pagesContainer.appendChild(createPagesList('Pages Needing Improvement', analysis.problematicPages, 'problematic'));
    }

    if (pagesContainer.children.length > 0) {
      analysisResults.appendChild(pagesContainer);
    }
  } catch (error) {
    console.error('[Analytics] Analysis failed:', error);
    analysisResults.innerHTML = `
      <div class="error-message">
        <p>Analysis failed: ${error.message}</p>
        <p>Make sure the ANTHROPIC_API_KEY is configured in the worker.</p>
      </div>
    `;
  } finally {
    analysisButton.disabled = false;
    analysisButton.textContent = 'Run Analysis';
  }
}

/**
 * Main block decoration function
 */
export default async function decorate(block) {
  block.innerHTML = `
    <div class="dashboard-header">
      <h2>Analytics Dashboard</h2>
      <p>Track user engagement, conversions, and content performance</p>
    </div>

    <div class="metrics-section">
      <h3>Key Metrics</h3>
      <div class="metrics-grid">
        <div class="loading">Loading metrics...</div>
      </div>
    </div>

    <div class="top-queries">
      <div class="loading">Loading top queries...</div>
    </div>

    <div class="analysis-section">
      <h3>AI Content Analysis</h3>
      <div class="analysis-info">
        <p>No analysis run yet</p>
      </div>
      <button class="run-analysis-btn">Run Analysis</button>
      <p class="analysis-note">Analyzes up to 100 recent queries and their generated pages. Available once per hour.</p>
      <div class="analysis-results"></div>
    </div>
  `;

  // Load initial data
  await loadSummary(block);

  // Set up analysis button
  const analysisButton = block.querySelector('.run-analysis-btn');
  analysisButton.addEventListener('click', () => runAnalysis(block));

  // Auto-refresh every 60 seconds
  setInterval(() => loadSummary(block), 60000);
}
