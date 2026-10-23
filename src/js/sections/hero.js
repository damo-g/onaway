import { registerOptions } from '../options.js';

// Locked: pinned (HF-01). Fallback: scroll-past.
registerOptions('hero', { mode: ['pinned', 'scroll'] });

export function init(el) {
  // Built on branch section/01-hero.
}
