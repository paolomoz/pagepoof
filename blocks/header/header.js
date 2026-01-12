/**
 * Pagepoof Header
 * Simple header with logo and minimal navigation
 */

/**
 * Decorates the header block
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // Clear existing content
  block.textContent = '';

  // Create nav structure
  const nav = document.createElement('nav');
  nav.className = 'nav-wrapper';

  // Logo/Brand
  const brand = document.createElement('a');
  brand.href = '/';
  brand.className = 'nav-brand';
  brand.innerHTML = `
    <span class="brand-icon">P</span>
    <span class="brand-text">Pagepoof</span>
  `;

  // Navigation links
  const links = document.createElement('div');
  links.className = 'nav-links';
  links.innerHTML = `
    <a href="/">Home</a>
    <a href="/?generate=healthy+smoothie+recipes">Recipes</a>
    <a href="/?generate=vitamix+blenders+comparison">Products</a>
    <a href="/agent-self-improve">Analytics</a>
  `;

  // Mobile hamburger
  const hamburger = document.createElement('button');
  hamburger.className = 'nav-hamburger';
  hamburger.setAttribute('aria-label', 'Toggle menu');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  hamburger.addEventListener('click', () => {
    const expanded = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', !expanded);
    links.classList.toggle('nav-links-open');
    document.body.classList.toggle('nav-open');
  });

  nav.append(brand, links, hamburger);
  block.append(nav);
}
