import { ScrollTrigger } from './motion.js';
import { registerOptions } from './options.js';

// After the hero, the fixed navbar either sits on paper (locked) or stays clear and
// switches its text colour over dark sections ([data-nav-theme="dark"]). Buttons never change.
registerOptions('nav', { after: ['paper', 'clear'], drop: ['quiet', 'invert'], panel: ['cards', 'flush'] });

export function initNav() {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  const docked = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'));
  const hero = document.querySelector('[data-section="hero"]');

  if (hero) {
    // Past the hero as soon as it starts to leave (after its pin), so nothing from it slides under a
    // clear bar. Only the start matters: past stays true to the bottom of the page.
    ScrollTrigger.create({
      trigger: hero,
      start: 'bottom bottom',
      invalidateOnRefresh: true,
      onEnter: () => nav.setAttribute('data-past', ''),
      onLeaveBack: () => nav.removeAttribute('data-past'),
    });
  } else {
    nav.setAttribute('data-past', '');
  }

  // Track which sections sit under the navbar; the dark flag is read live, so a section can change
  // its environment (dev panel) without rebuilding triggers.
  const under = new Set();
  const update = () => {
    nav.dataset.theme = [...under].some((s) => s.dataset.navTheme === 'dark') ? 'dark' : 'light';
  };
  document.querySelectorAll('[data-section]').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: () => `top top+=${docked() / 2}`,
      end: () => `bottom top+=${docked() / 2}`,
      invalidateOnRefresh: true,
      onToggle: (self) => {
        if (self.isActive) under.add(section);
        else under.delete(section);
        update();
      },
    });
  });
  if (import.meta.env.DEV) document.addEventListener('section:options', update);

  // Hide the bar once the footer reaches the middle of the screen; it returns when you scroll back up
  const footer = document.querySelector('.footer');
  if (footer) {
    ScrollTrigger.create({
      trigger: footer,
      start: 'top 50%',
      onEnter: () => { nav.setAttribute('data-hidden', ''); nav.querySelector('.nav-drop')?.dispatchEvent(new MouseEvent('mouseleave')); },
      onLeaveBack: () => nav.removeAttribute('data-hidden'),
    });
  }
}
