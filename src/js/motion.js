import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Real preference, or simulated from the dev panel (html[data-motion="reduce"]).
export function prefersReducedMotion() {
  return (
    document.documentElement.dataset.motion === 'reduce' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Replays per section id, used by the dev panel's "replay current section".
const replays = new Map();

function addReplay(el, fn) {
  const id = el.closest('[data-section]')?.dataset.section;
  if (!id) return;
  if (!replays.has(id)) replays.set(id, []);
  replays.get(id).push(fn);
}

export function replaySection(id) {
  (replays.get(id) ?? []).forEach((fn) => fn());
}

/**
 * Plays an entrance once, when el comes into view.
 * fn(el) may return a GSAP tween/timeline; under reduced motion it is jumped to its end state.
 */
export function onEnterOnce(el, fn, { start = 'top 80%' } = {}) {
  let anim;
  const play = () => {
    anim = fn(el);
    if (prefersReducedMotion()) anim?.progress?.(1);
  };

  addReplay(el, () => (anim?.restart ? anim.restart() : play()));

  if (prefersReducedMotion()) {
    play();
    return null;
  }
  return ScrollTrigger.create({ trigger: el, start, once: true, onEnter: play });
}

/**
 * Pins el for `length` px of scroll (a number, or a function re-read on resize)
 * and calls fn(progress 0→1) as it scrubs.
 * `smooth` is the scrub catch-up in seconds (true = locked to the scroll).
 * Under reduced motion there is no pin: fn(1) renders the end state.
 */
export function pinScrub(el, length, fn, { smooth = true } = {}) {
  if (prefersReducedMotion()) {
    fn(1);
    return null;
  }
  // The scrub drives a proxy tween, so `smooth` eases the progress fn receives
  const proxy = { p: 0 };
  const scene = gsap.to(proxy, { p: 1, ease: 'none', paused: true, onUpdate: () => fn(proxy.p) });
  fn(0);
  const trigger = ScrollTrigger.create({
    trigger: el,
    start: 'top top',
    end: () => `+=${typeof length === 'function' ? length() : length}`,
    pin: true,
    animation: scene,
    scrub: smooth,
    invalidateOnRefresh: true,
    onRefresh: () => fn(proxy.p),
  });
  addReplay(el, () =>
    window.lenis
      ? window.lenis.scrollTo(trigger.start, { immediate: true })
      : window.scrollTo({ top: trigger.start, behavior: 'instant' }),
  );
  return trigger;
}

export { gsap, ScrollTrigger };
