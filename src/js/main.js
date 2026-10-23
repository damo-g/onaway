import '../styles/main.css';
import Alpine from 'alpinejs';
import { initLenis } from './lenis.js';
import { initSections } from './sections/index.js';

// Dev review panel: applies section options and simulated reduced motion before anything inits.
// Dead code in production, so it never ships.
if (import.meta.env.DEV) {
  const { initPanel } = await import('./dev/panel.js');
  initPanel();
}

window.lenis = initLenis();
initSections();

window.Alpine = Alpine;
Alpine.start();
