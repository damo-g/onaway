import { registerOptions } from '../options.js';
import { prefersReducedMotion } from '../motion.js';
import { windowShader } from '../shaders/window.js';

// Locked first: Windows fill, Arrive signal, Signal hover, "We'll take it from here."
registerOptions('footer', {
  fill: ['windows', 'sky', 'lake', 'traffic', 'flap', 'flat'],
  signal: ['arrive', 'turn', 'still', 'off'],
  hover: ['signal', 'sweep', 'invert', 'mark'],
  tagline: ['here', 'steady', 'date', 'handled'],
});

export function init(el) {
  // Live Toronto time
  const clock = el.querySelector('[data-toronto-time]');
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit' });
  const tick = () => {
    clock.textContent = fmt.format(new Date()).toUpperCase();
    clock.dateTime = new Date().toISOString();
  };
  tick();
  setInterval(tick, 20000);

  // Wordmark fill: the shader, or flat Paper when WebGL isn't there
  const opt = (key, locked) => el.dataset[key] ?? locked;
  const shader = windowShader(el.querySelector('.footer__wordmark canvas'), { fill: opt('fill', 'windows'), still: prefersReducedMotion() });
  if (!shader) el.classList.add('is-flat');

  if (import.meta.env.DEV) {
    // Review panel: other fills and taglines
    const TAGLINES = { here: 'We’ll take it from here.', steady: 'Steady hands at your door.', date: 'Done right, on your date.', handled: 'Your move, handled.' };
    const apply = () => {
      shader?.setFill(opt('fill', 'windows'));
      el.querySelector('.footer__tag').textContent = TAGLINES[opt('tagline', 'here')];
    };
    apply();
    el.addEventListener('section:options', apply);
  }
}
