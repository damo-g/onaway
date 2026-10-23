import '../styles/main.css';
import Alpine from 'alpinejs';
import { initLenis } from './lenis.js';

window.lenis = initLenis();

window.Alpine = Alpine;
Alpine.start();
