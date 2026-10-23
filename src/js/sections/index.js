import * as hero from './hero.js';

const sections = { hero };

// Runs each section's init(el) when its section is on the page.
export function initSections() {
  for (const [id, mod] of Object.entries(sections)) {
    const el = document.querySelector(`[data-section="${id}"]`);
    if (el) mod.init(el);
  }
}
