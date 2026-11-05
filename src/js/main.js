// The stylesheet is a <link> in each page's head (render-blocking in dev too, so no page ever paints unstyled)
import Alpine from 'alpinejs';
import { initLenis } from './lenis.js';
import { ScrollTrigger } from './motion.js';
import { initNav } from './nav.js';
import { registerRefChip } from './refchip.js';
import { initSections } from './sections/index.js';
import { initTransitions } from './transitions.js';

// Dev review panel: applies section options and simulated reduced motion before anything inits.
// Dead code in production, so it never ships.
if (import.meta.env.DEV) {
  const { initPanel } = await import('./dev/panel.js');
  initPanel();
}

window.lenis = initLenis();
initSections(); // pins first, so the navbar triggers below account for their spacing
initNav();
initTransitions(); // page transitions, the leaving side (src/partials/vt.hbs is the arriving side)
document.fonts.ready.then(() => ScrollTrigger.refresh());

window.Alpine = Alpine;
registerRefChip(Alpine);
Alpine.start();
