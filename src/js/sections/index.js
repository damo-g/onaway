import * as hero from './hero.js';
import * as services from './services.js';
import * as steps from './steps.js';

const sections = { hero, services, steps };

// Runs each section's init(el) when its section is on the page, in page order (pins stack correctly).
export function initSections() {
  for (const [id, mod] of Object.entries(sections)) {
    const el = document.querySelector(`[data-section="${id}"]`);
    if (el) mod.init(el);
  }
}
