// Page transitions (docs/mocks/pt-0*.html · locked: PT-01 A2 Sign arrives, held · PT-02 C2 Button to ticket ·
// PT-03 D2 Timetable, written). This is the leaving side; the arriving side is the inline script in
// src/partials/vt.hbs, which has to run before the new page's first frame. Native cross-document View
// Transitions only: browsers without them (Firefox today) and reduced motion simply navigate.
import { prefersReducedMotion } from './motion.js';

// Links that carry their sign to the service page: the R2-E cards, the hero cards, the Services drop,
// the phone menu's services and the footer's Get around rows
export const SIGNS = '.sign, .hero-card, .nav-drop__row, .nav-menu__sub a, .footer__explore a.footer__row';

// service (/cleaning/, /moving/, /delivery/) · quote (/quote/) · general (everything else)
export function kindOf(url) {
  const path = new URL(url, location.href).pathname.replace(/(\.html|\/)$/, '');
  if (/^\/(cleaning|moving|delivery)$/.test(path)) return 'service';
  return path === '/quote' ? 'quote' : 'general';
}

export function initTransitions() {
  if (!('onpageswap' in window) || prefersReducedMotion()) return;
  let last = null;

  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a || a.target === '_blank' || a.origin !== location.origin || a.hasAttribute('download')) return;
    last = a;
    // A2 · the sign answers the press (it gives a little) before it leaves
    const plain = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented;
    if (plain && kindOf(a.href) === 'service' && a.matches(SIGNS) && a.href !== location.href) {
      e.preventDefault();
      a.classList.add('is-vt-press');
      setTimeout(() => location.assign(a.href), 180);
    }
  }, true);

  window.addEventListener('pageswap', (e) => {
    if (!e.viewTransition || !e.activation?.entry) return;
    e.viewTransition.ready?.catch?.(() => {});
    const url = e.activation.entry.url;
    const type = e.activation.navigationType === 'traverse' ? 'general' : kindOf(url);
    // the navbar holds still when it's docked at the top on both pages
    const nav = document.querySelector('.site-nav');
    if (nav && Math.round(nav.getBoundingClientRect().top) === 0) nav.style.viewTransitionName = 'nav';
    let carry = '';
    if (last && last.href === url) {
      if (type === 'service' && last.matches(SIGNS)) {
        last.style.viewTransitionName = 'sign'; // becomes the service page's hanging band
        carry = 'sign';
      } else if (type === 'quote' && last.offsetHeight >= 34) {
        last.style.viewTransitionName = 'quote-head'; // a button (not a text link) becomes the ticket's header
        carry = 'quote';
      }
    }
    try {
      if (carry) sessionStorage.setItem('onaway:vt', carry);
      else sessionStorage.removeItem('onaway:vt');
    } catch {}
  });

  // Back to this page from the cache: nothing stays named or pressed
  window.addEventListener('pageshow', () => {
    last = null;
    document.querySelectorAll('.is-vt-press').forEach((el) => el.classList.remove('is-vt-press'));
    document.querySelectorAll('[style*="view-transition-name"]').forEach((el) => (el.style.viewTransitionName = ''));
  });
}
