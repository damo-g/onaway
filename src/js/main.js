import '../styles/main.css';
import Alpine from 'alpinejs';
import { initLenis } from './lenis.js';
import { ScrollTrigger } from './motion.js';
import { initNav } from './nav.js';
import { initSections } from './sections/index.js';

// Dev review panel: applies section options and simulated reduced motion before anything inits.
// Dead code in production, so it never ships.
if (import.meta.env.DEV) {
  const { initPanel } = await import('./dev/panel.js');
  initPanel();
}

window.lenis = initLenis();
initSections(); // pins first, so the navbar triggers below account for their spacing
initNav();
document.fonts.ready.then(() => ScrollTrigger.refresh());

window.Alpine = Alpine;
Alpine.start();
