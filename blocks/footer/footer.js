/**
 * Pagepoof Footer
 * Simple footer with links and copyright
 */

/**
 * Decorates the footer block
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // Clear existing content
  block.textContent = '';

  // Create footer structure
  const footer = document.createElement('div');
  footer.className = 'footer-wrapper';

  const currentYear = new Date().getFullYear();

  footer.innerHTML = `
    <div class="footer-content">
      <div class="footer-brand">
        <a href="/" class="footer-logo">
          <span class="brand-icon">P</span>
          <span class="brand-text">Pagepoof</span>
        </a>
        <p class="footer-tagline">AI-powered generative experiences</p>
      </div>

      <div class="footer-links">
        <div class="footer-column">
          <h4>Explore</h4>
          <ul>
            <li><a href="/?generate=smoothie+recipes">Recipes</a></li>
            <li><a href="/?generate=vitamix+blenders">Products</a></li>
            <li><a href="/?generate=blending+tips">Tips</a></li>
          </ul>
        </div>
        <div class="footer-column">
          <h4>Resources</h4>
          <ul>
            <li><a href="/agent-self-improve">AI Analytics</a></li>
            <li><a href="https://www.vitamix.com" target="_blank" rel="noopener">Vitamix.com</a></li>
            <li><a href="https://www.aem.live" target="_blank" rel="noopener">AEM Edge Delivery</a></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <p class="footer-copyright">&copy; ${currentYear} Pagepoof. Built with AEM Edge Delivery Services.</p>
      <p class="footer-powered">Powered by Vitamix content</p>
    </div>
  `;

  block.append(footer);
}
