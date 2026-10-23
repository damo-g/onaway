import { onEnterOnce, prefersReducedMotion } from '../motion.js';

// OT-05: the ledger writes in once on entry; the carousel starts after it (2.6s), plays once at 6s a
// slide and stops on the crew, which has no tag. It pauses on hover, keyboard focus and when less than
// 40% is on screen; the bars jump to a slide. Reduced motion: no write-in, no autoplay, bars still work.
const TAGS = ['Cleaning', 'Moving', 'Delivery', ''];
const SLIDE = 6000;
const START = 2600;

export function init(el) {
  const car = el.querySelector('.carousel');
  const track = car.querySelector('.carousel__track');
  const slides = [...car.querySelectorAll('.carousel__slide')];
  const bars = [...car.querySelectorAll('.carousel__bar')];
  const tag = car.querySelector('.carousel__tag');
  const last = slides.length - 1;
  const reduced = prefersReducedMotion();

  let i = 0;
  let timer = null;
  let left = SLIDE;
  let t0 = 0;
  let started = false;
  let hovered = false;
  let focused = false;
  let visible = false;

  const paused = () => hovered || focused || !visible;

  function show(n) {
    i = n;
    track.style.transform = `translateX(${-i * 100}%)`;
    if (TAGS[i]) tag.textContent = TAGS[i];
    tag.classList.toggle('is-off', !TAGS[i]);
    slides.forEach((s, k) => (s.inert = k !== i));
    bars.forEach((b, k) => {
      b.classList.toggle('is-on', k === i);
      b.classList.toggle('is-done', k < i);
      if (k === i) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
      // restart the progress fill
      const fill = b.firstElementChild;
      fill.style.animation = 'none';
      void fill.offsetWidth;
      fill.style.animation = '';
    });
    clearTimeout(timer);
    timer = null;
    left = SLIDE;
    arm();
  }

  function arm() {
    clearTimeout(timer);
    timer = null;
    if (!started || reduced || paused() || i >= last) return;
    t0 = Date.now();
    timer = setTimeout(() => show(i + 1), left);
  }

  function update() {
    if (paused()) {
      if (timer) left -= Date.now() - t0;
      clearTimeout(timer);
      timer = null;
      car.classList.add('is-paused');
    } else {
      car.classList.remove('is-paused');
      arm();
    }
  }

  function start() {
    started = true;
    show(0);
  }

  car.addEventListener('mouseenter', () => { hovered = true; update(); });
  car.addEventListener('mouseleave', () => { hovered = false; update(); });
  car.addEventListener('focusin', () => { focused = true; update(); });
  car.addEventListener('focusout', (e) => { if (!car.contains(e.relatedTarget)) { focused = false; update(); } });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.4 }).observe(car);
  bars.forEach((b, k) => b.addEventListener('click', () => { started = true; show(k); }));
  slides.forEach((s, k) => (s.inert = k !== 0));

  if (reduced) {
    car.classList.add('is-static');
    start();
    return;
  }

  // Entrance, then the carousel after the write-in. Replay (dev panel) runs both again from the start.
  let startTimer;
  const play = () => {
    clearTimeout(startTimer);
    started = false;
    show(0);
    bars.forEach((b) => b.classList.remove('is-on', 'is-done'));
    el.classList.remove('is-armed', 'is-go');
    void el.offsetWidth;
    el.classList.add('is-armed', 'is-go');
    startTimer = setTimeout(start, START);
  };
  el.classList.add('is-armed');
  onEnterOnce(el, play, { start: 'top 70%' });
}
