import { ScrollTrigger } from './motion.js';
import { registerOptions } from './options.js';

// After the hero, the fixed navbar either sits on paper (locked) or stays clear and
// switches its text colour over dark sections ([data-nav-theme="dark"]). Buttons never change.
registerOptions('nav', { after: ['paper', 'clear'] });

export function initNav() {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  const docked = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'));
  const hero = document.querySelector('[data-section="hero"]');

  if (hero) {
    // Only the start matters: past the hero stays true to the bottom of the page
    ScrollTrigger.create({
      trigger: hero,
      start: () => `bottom top+=${docked()}`,
      invalidateOnRefresh: true,
      onEnter: () => nav.setAttribute('data-past', ''),
      onLeaveBack: () => nav.removeAttribute('data-past'),
    });
  } else {
    nav.setAttribute('data-past', '');
  }

  const dark = new Set();
  document.querySelectorAll('[data-nav-theme="dark"]').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: () => `top top+=${docked() / 2}`,
      end: () => `bottom top+=${docked() / 2}`,
      invalidateOnRefresh: true,
      onToggle: (self) => {
        if (self.isActive) dark.add(section);
        else dark.delete(section);
        nav.dataset.theme = dark.size ? 'dark' : 'light';
      },
    });
  });
}
