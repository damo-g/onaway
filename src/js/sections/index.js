import * as hero from './hero.js';
import * as services from './services.js';
import * as steps from './steps.js';
import * as promises from './promises.js';
import * as gta from './gta.js';
import * as quote from './quote.js';
import * as footer from './footer.js';
import * as request from './request.js';
import * as svchero from './svchero.js';
import * as often from './often.js';
import * as included from './included.js';
import * as questions from './questions.js';
import * as cleancta from './cleancta.js';
import * as movecta from './movecta.js';
import * as soon from './soon.js';
import * as dropcta from './dropcta.js';
import * as help from './help.js';
import * as about from './about.js';

const sections = { hero, services, steps, promises, gta, quote, request, svchero, often, included, questions, cleancta, movecta, soon, dropcta, help, about, footer };

// Runs each section's init(el) when its section is on the page, in page order (pins stack correctly).
export function initSections() {
  for (const [id, mod] of Object.entries(sections)) {
    const el = document.querySelector(`[data-section="${id}"]`);
    if (el) mod.init(el);
  }
}
