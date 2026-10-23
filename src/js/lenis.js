import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Lenis driven by gsap.ticker and synced to ScrollTrigger. Off under reduced motion.
export function initLenis() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export { gsap, ScrollTrigger };
