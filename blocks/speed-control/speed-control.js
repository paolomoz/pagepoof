import { toClassName } from '../../scripts/aem.js';

export default function decorate(block) {
  const [caption, ...controls] = block.children;

  const figure = document.createElement('figure');
  const figcaption = document.createElement('figcaption');
  figcaption.append(...caption.children);
  figure.append(figcaption);

  // build tablist
  const tablist = document.createElement('div');
  tablist.className = 'tabs';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-orientation', 'horizontal');

  const panels = [];

  // build tabs
  controls.forEach((control, i) => {
    const heading = control.querySelector('p strong');
    const title = heading ? heading.textContent.trim() : `Control ${i + 1}`;
    const id = toClassName(title);

    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('id', `tab-${id}`);
    tab.setAttribute('aria-controls', `panel-${id}`);
    tab.textContent = title;

    // set active tab
    if (i === 0) {
      tab.classList.add('active');
      tab.setAttribute('aria-selected', true);
    } else tab.setAttribute('aria-selected', false);

    tablist.append(tab);

    // build tabpanel
    const panel = document.createElement('div');
    panel.className = 'tabpanel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('tabindex', 0);
    panel.setAttribute('id', `panel-${id}`);
    panel.setAttribute('aria-labelledby', `tab-${id}`);

    if (i !== 0) panel.hidden = true;

    const paragraphs = [...control.querySelectorAll('p')];
    paragraphs.slice(1).forEach((p) => panel.append(p)); // skip heading
    panels.push(panel);
    control.remove();

    // enable tab functionality
    tab.addEventListener('click', () => {
      tablist.querySelectorAll('[role="tab"]').forEach((t) => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active);
      });

      panels.forEach((p) => {
        p.hidden = p !== panel;
      });

      // animate svg
      const svg = figure.querySelector('svg');
      if (svg) svg.setAttribute('data-mode', id);
    });
  });

  const tabContent = document.createElement('div');
  tabContent.append(tablist);
  panels.forEach((panel) => tabContent.append(panel));

  // add diagram
  const diagram = document.createElement('div');
  diagram.className = 'img-wrapper';

  const img = document.createElement('img');
  img.src = '/blocks/speed-control/speed-control.svg';
  img.alt = 'Vitamix Blender control dial';
  diagram.append(img);
  figure.append(tabContent, diagram);

  block.replaceChild(figure, caption);

  // load SVG when visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        try {
          fetch(img.src)
            .then((resp) => resp.text())
            .then((text) => {
              diagram.innerHTML = text;
              // set default mode
              const svg = diagram.querySelector('svg');
              if (svg) svg.setAttribute('data-mode', 'automated-blending');
            });
        } catch (error) {
          // do nothing, leave as image
        }
        observer.disconnect();
      }
    });
  }, { threshold: 0 });
  observer.observe(block);
}
