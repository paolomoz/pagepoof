/**
 * Generative Client
 * Handles SSE streaming for AI-generated pages with reconnection support
 */

const API_BASE = 'https://pagepoof-api.paolo-moz.workers.dev';

// Reconnection settings
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RETRY_BACKOFF_MULTIPLIER = 2;

/**
 * Start page generation with SSE streaming and automatic reconnection
 */
export async function generatePage(query, container, options = {}) {
  const {
    onProgress = () => {},
    onBlock = () => {},
    onImageReady = () => {},
    onComplete = () => {},
    onError = () => {},
    sessionId = getOrCreateSessionId(),
  } = options;

  // Generation state for resume capability
  const state = {
    receivedBlocks: new Set(),
    receivedImages: new Set(),
    lastEventIndex: 0,
    completed: false,
    retryCount: 0,
  };

  // Clear container and show loading state
  container.innerHTML = '';
  container.classList.add('generating');

  // Add shimmer placeholder
  const shimmer = createShimmerPlaceholder();
  container.appendChild(shimmer);

  // Start connection with retry support
  await connectWithRetry(query, container, shimmer, state, {
    onProgress,
    onBlock,
    onImageReady,
    onComplete,
    onError,
    sessionId,
  });
}

/**
 * Connect to SSE stream with automatic retry on failure
 */
async function connectWithRetry(query, container, shimmer, state, callbacks) {
  const { onProgress, onBlock, onImageReady, onComplete, onError, sessionId } = callbacks;

  while (state.retryCount <= MAX_RETRIES && !state.completed) {
    try {
      await connectAndStream(query, container, shimmer, state, callbacks);

      // If we completed successfully, exit the retry loop
      if (state.completed) {
        break;
      }
    } catch (error) {
      state.retryCount++;

      if (state.retryCount > MAX_RETRIES) {
        console.error('Max retries exceeded:', error);
        onError(error);
        showReconnectUI(container, query, callbacks);
        break;
      }

      // Calculate delay with exponential backoff
      const delay = RETRY_DELAY_MS * Math.pow(RETRY_BACKOFF_MULTIPLIER, state.retryCount - 1);
      console.log(`Connection lost. Retrying in ${delay}ms (attempt ${state.retryCount}/${MAX_RETRIES})...`);

      // Show reconnecting message
      updateShimmerMessage(shimmer, `Connection lost. Reconnecting in ${Math.round(delay / 1000)}s...`);

      await sleep(delay);

      // Update shimmer message for resume
      if (state.receivedBlocks.size > 0) {
        updateShimmerMessage(shimmer, `Resuming from block ${state.receivedBlocks.size}...`);
      }
    }
  }

  container.classList.remove('generating');
}

/**
 * Connect to SSE stream and process events
 */
async function connectAndStream(query, container, shimmer, state, callbacks) {
  const { onProgress, onBlock, onImageReady, onComplete, onError, sessionId } = callbacks;

  // Build URL with resume parameters
  const url = new URL(`${API_BASE}/api/stream`);
  url.searchParams.set('query', query);
  url.searchParams.set('sessionId', sessionId);

  // If resuming, send last event index
  if (state.lastEventIndex > 0) {
    url.searchParams.set('resumeFrom', state.lastEventIndex.toString());
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      // Stream ended normally
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    // Process complete events from buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    let currentEvent = null;
    let currentData = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7);
      } else if (line.startsWith('data: ')) {
        currentData = line.slice(6);

        if (currentEvent && currentData) {
          try {
            const data = JSON.parse(currentData);

            // Track event index for resume
            if (data.eventIndex !== undefined) {
              state.lastEventIndex = data.eventIndex;
            }

            // Handle event with deduplication
            handleEventWithDedup(currentEvent, data, state, {
              container,
              shimmer,
              onProgress,
              onBlock,
              onImageReady,
              onComplete,
              onError,
            });

            // Check if completed
            if (currentEvent === 'complete') {
              state.completed = true;
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
          currentEvent = null;
          currentData = '';
        }
      }
    }
  }
}

/**
 * Handle event with deduplication for resume support
 */
function handleEventWithDedup(event, data, state, ctx) {
  // Skip already processed blocks
  if (event === 'block') {
    const blockKey = `${data.name}-${data.index}`;
    if (state.receivedBlocks.has(blockKey)) {
      console.log('Skipping duplicate block:', blockKey);
      return;
    }
    state.receivedBlocks.add(blockKey);
  }

  // Skip already processed images
  if (event === 'image-ready') {
    if (state.receivedImages.has(data.id)) {
      console.log('Skipping duplicate image:', data.id);
      return;
    }
    state.receivedImages.add(data.id);
  }

  handleEvent(event, data, ctx);
}

/**
 * Show reconnect UI after max retries
 */
function showReconnectUI(container, query, callbacks) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'generation-error reconnect-prompt';
  errorDiv.innerHTML = `
    <h2>Connection Lost</h2>
    <p>The connection was interrupted. You can try again to continue generation.</p>
    <button class="retry-btn">Try Again</button>
    <button class="cancel-btn" onclick="location.reload()">Start Over</button>
  `;

  // Add retry handler
  const retryBtn = errorDiv.querySelector('.retry-btn');
  retryBtn.addEventListener('click', () => {
    errorDiv.remove();
    generatePage(query, container, callbacks);
  });

  container.appendChild(errorDiv);
}

/**
 * Get or create session ID for tracking
 */
function getOrCreateSessionId() {
  let sessionId = localStorage.getItem('pagepoof_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('pagepoof_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Generate random session ID
 */
function generateSessionId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handle SSE event
 */
function handleEvent(event, data, ctx) {
  const { container, shimmer, onProgress, onBlock, onImageReady, onComplete, onError } = ctx;

  switch (event) {
    case 'progress':
      onProgress(data);
      updateShimmerMessage(shimmer, data.message);
      break;

    case 'classification':
      console.log('Query classified:', data);
      break;

    case 'retrieval':
      console.log('RAG context retrieved:', data);
      break;

    case 'generation':
      console.log('Content generated:', data);
      break;

    case 'layout':
      console.log('Layout selected:', data);
      break;

    case 'block':
      // Remove shimmer on first block
      if (shimmer.parentNode) {
        shimmer.remove();
      }

      // Append block HTML
      const blockWrapper = document.createElement('div');
      blockWrapper.innerHTML = data.html;
      const blockElement = blockWrapper.firstElementChild;

      if (blockElement) {
        // Add loading class to images
        blockElement.querySelectorAll('img').forEach(img => {
          img.classList.add('image-loading');
          img.dataset.originalSrc = img.src;
        });

        container.appendChild(blockElement);
        onBlock(data);

        // Decorate block (if EDS decorateBlock exists)
        if (window.decorateBlock) {
          window.decorateBlock(blockElement);
        }
      }
      break;

    case 'images-started':
      console.log('Image generation started:', data.count, 'images');
      break;

    case 'image-ready':
      onImageReady(data);
      updateImage(container, data);
      break;

    case 'images-complete':
      console.log('Image generation complete:', data);
      break;

    case 'complete':
      onComplete(data);
      container.classList.add('generation-complete');
      break;

    case 'error':
      onError(data);
      console.error('Generation error:', data);
      break;
  }
}

/**
 * Create shimmer loading placeholder
 */
function createShimmerPlaceholder() {
  const shimmer = document.createElement('div');
  shimmer.className = 'shimmer-placeholder';
  shimmer.innerHTML = `
    <div class="shimmer-hero">
      <div class="shimmer-line shimmer-title"></div>
      <div class="shimmer-line shimmer-subtitle"></div>
    </div>
    <div class="shimmer-content">
      <div class="shimmer-card"></div>
      <div class="shimmer-card"></div>
      <div class="shimmer-card"></div>
    </div>
    <div class="shimmer-message">Starting generation...</div>
  `;
  return shimmer;
}

/**
 * Update shimmer message
 */
function updateShimmerMessage(shimmer, message) {
  const msgEl = shimmer.querySelector('.shimmer-message');
  if (msgEl) {
    msgEl.textContent = message;
  }
}

/**
 * Update image with generated URL
 */
function updateImage(container, imageData) {
  const { id, url, success } = imageData;

  // Find image by index
  const images = container.querySelectorAll('img[data-original-src]');
  const index = parseInt(id.replace('img-', ''), 10);

  if (images[index]) {
    const img = images[index];

    // Create new image to preload
    const newImg = new Image();
    newImg.onload = () => {
      img.src = url;
      img.classList.remove('image-loading');
      img.classList.add('image-loaded');
    };
    newImg.onerror = () => {
      img.classList.remove('image-loading');
      img.classList.add('image-error');
    };
    newImg.src = url;
  }
}

/**
 * Initialize query form handling
 */
export function initQueryForm(formSelector, containerSelector) {
  const form = document.querySelector(formSelector);
  const container = document.querySelector(containerSelector);

  if (!form || !container) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="text"]');
    const query = input?.value?.trim();

    if (!query) return;

    // Update URL with query
    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    window.history.pushState({}, '', url);

    // Generate page
    await generatePage(query, container, {
      onProgress: (data) => console.log('Progress:', data.step),
      onBlock: (data) => console.log('Block rendered:', data.name),
      onImageReady: (data) => console.log('Image ready:', data.id),
      onComplete: (data) => console.log('Generation complete:', data),
      onError: (error) => console.error('Error:', error),
    });
  });

  // Handle initial query from URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q');
  if (initialQuery) {
    const input = form.querySelector('input[type="text"]');
    if (input) input.value = initialQuery;
    form.dispatchEvent(new Event('submit'));
  }
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initQueryForm('.query-form', '.generated-content');
  });
} else {
  initQueryForm('.query-form', '.generated-content');
}
