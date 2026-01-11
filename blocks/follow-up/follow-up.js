/**
 * Follow-up Block
 * Displays suggestion chips for continued exploration
 */
export default function decorate(block) {
  // The block structure from the worker:
  // Row 0: Header/title (optional)
  // Row 1+: Follow-up suggestions

  const rows = [...block.children];
  if (rows.length === 0) return;

  // Collect all suggestions
  const suggestions = [];
  rows.forEach((row) => {
    const text = row.textContent?.trim();
    if (text && text.length > 0 && text.length < 100) {
      suggestions.push(text);
    }
  });

  if (suggestions.length === 0) return;

  // Build follow-up structure
  block.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'follow-up-header';
  header.innerHTML = '<h4>Continue Exploring</h4>';
  block.appendChild(header);

  // Chips container
  const chipsContainer = document.createElement('div');
  chipsContainer.className = 'follow-up-chips';

  suggestions.forEach((suggestion) => {
    const chip = document.createElement('button');
    chip.className = 'follow-up-chip cta-ai-generated';
    chip.setAttribute('type', 'button');

    // Add AI sparkle icon
    const icon = document.createElement('span');
    icon.className = 'cta-icon cta-icon-ai-generated';
    icon.setAttribute('aria-hidden', 'true');
    chip.appendChild(icon);

    // Add suggestion text - strip any trailing arrows since CSS adds one
    const cleanedSuggestion = suggestion.replace(/\s*[→\u2192]\s*$/g, '').trim();
    const text = document.createElement('span');
    text.className = 'follow-up-chip-text';
    text.textContent = cleanedSuggestion;
    chip.appendChild(text);

    // Handle click - navigate to new query
    chip.addEventListener('click', () => {
      const currentUrl = new URL(window.location.href);
      // Use same parameter that was used to get here
      const param = currentUrl.searchParams.has('q') ? 'q' : 'query';
      currentUrl.searchParams.set(param, suggestion);
      window.location.href = currentUrl.toString();
    });

    chipsContainer.appendChild(chip);
  });

  block.appendChild(chipsContainer);
}
