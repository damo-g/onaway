import { ScrollTrigger } from './motion.js';
import { registerOptions } from './options.js';

// After the hero, the fixed navbar either sits on paper (locked) or stays clear and
// switches its text colour over dark sections ([data-nav-theme="dark"]). Buttons never change.
registerOptions('nav', { after: ['paper', 'clear'], drop: ['invert', 'quiet'], panel: ['flush', 'cards'], blend: ['off', 'on'] });

export function initNav() {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;
  blendLayer(nav);

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

// Blend (option nav.blend): a mirrored copy of the bar above it, set to mix-blend-mode: difference, shows the
// wordmark, links and FR inverted against the page (the bar itself is its own layer, so the real ones can't
// blend with what's under it). The copy follows the bar's attributes (the hero drives it through inline
// variables) and the Services button's open state; it takes no pointer or focus, and Alpine ignores it.
function blendLayer(nav) {
  let copy = null;
  const sync = new MutationObserver(() => {
    if (!copy) return;
    for (const { name, value } of nav.attributes) if (!['class', 'id', 'x-data', 'data-options'].includes(name)) copy.setAttribute(name, value);
    for (const { name } of [...copy.attributes]) if (!nav.hasAttribute(name) && !['class', 'aria-hidden', 'inert', 'x-ignore'].includes(name)) copy.removeAttribute(name);
    copy.querySelector('.nav-drop__btn')?.setAttribute('aria-expanded', nav.querySelector('.nav-drop__btn')?.getAttribute('aria-expanded') ?? 'false');
  });
  const toggle = () => {
    const on = nav.dataset.blend === 'on';
    if (on && !copy) {
      copy = nav.cloneNode(true);
      copy.classList.add('site-nav--blend');
      copy.removeAttribute('data-options');
      copy.removeAttribute('x-data');
      copy.setAttribute('aria-hidden', 'true');
      copy.setAttribute('inert', '');
      copy.setAttribute('x-ignore', '');
      copy.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      copy.querySelector('a[href="#main"]')?.remove();
      nav.after(copy);
      sync.observe(nav, { attributes: true, subtree: true, attributeFilter: ['style', 'class', 'aria-expanded', 'data-past', 'data-hidden', 'data-theme', 'data-after', 'data-blend', 'data-drop', 'data-panel'] });
      sync.takeRecords();
    } else if (!on && copy) {
      sync.disconnect();
      copy.remove();
      copy = null;
    }
    if (copy) for (const { name, value } of nav.attributes) if (!['class', 'id', 'x-data', 'data-options'].includes(name)) copy.setAttribute(name, value);
  };
  new MutationObserver(toggle).observe(nav, { attributes: true, attributeFilter: ['data-blend'] });
  toggle();
}
