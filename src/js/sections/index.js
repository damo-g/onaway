import * as hero from './hero.js';
import * as services from './services.js';
import * as steps from './steps.js';
import * as promises from './promises.js';
import * as gta from './gta.js';

const sections = { hero, services, steps, promises, gta };

// Runs each section's init(el) when its section is on the page, in page order (pins stack correctly).
export function initSections() {
  for (const [id, mod] of Object.entries(sections)) {
    const el = document.querySelector(`[data-section="${id}"]`);
    if (el) mod.init(el);
  }
}
