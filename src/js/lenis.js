import Lenis from 'lenis';
import { gsap, ScrollTrigger, prefersReducedMotion } from './motion.js';

// Lenis driven by gsap.ticker and synced to ScrollTrigger. Off under reduced motion.
export function initLenis() {
  if (prefersReducedMotion()) return null;

  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}
