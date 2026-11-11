import { registerOptions } from '../options.js';
import { prefersReducedMotion } from '../motion.js';
import { windowShader } from '../shaders/window.js';

// Locked first: Windows fill, Arrive signal, Signal hover, "We'll take it from here."
registerOptions('footer', {
  // board-update and timetable locked (Nov 2026), written on the footer (footer.hbs) so the build has them
  fill: ['board-update', 'windows', 'board', 'board-fine', 'board-glow', 'board-square', 'board-amber', 'dots-stars', 'sky', 'flat'],
  signal: ['arrive', 'turn', 'still', 'off'],
  hover: ['signal', 'sweep', 'invert', 'mark'],
  tagline: ['here', 'steady', 'date', 'handled'],
  // The time and the hours (Nov 2026: the door pictogram, on a sign tile like the Services cards): tile (locked: the
  // tile, the time as a label, the hours under it in Paper) · board (an arrivals board: two ruled rows, LOCAL TIME and
  // HOURS, values to the right) · big (the time large, its city above, the hours under with a dot, yellow while open)
  // · quiet (as built: a small pictogram, muted words) · inline (one line with the time)
  // · timetable (two columns, NOW and HOURS in mono over the values at h3, a hairline between) · plate (a small
  // wayfinding plate: the door on its tile, "Open till 8 PM" in Lead, the time under it, a status bar at its edge)
  hours: ['timetable', 'tile', 'plate', 'board', 'big', 'quiet', 'inline'],
  // The board fills' unlit dots, % of Paper on the board: 2 (locked) · 3 · 1
  dots: ['2', '3', '1'],
});

export function init(el) {
  // Live Toronto time
  const clock = el.querySelector('[data-toronto-time]');
  // Hours (8 AM – 8 PM every day), read against the same clock
  const hours = el.querySelector('[data-toronto-hours]');
  const hourNow = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', hourCycle: 'h23' });
  // en-US for '3:03 PM', the same PM as the hours line (en-CA writes 'p.m.')
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit' });
  const tick = () => {
    clock.textContent = fmt.format(new Date()).toUpperCase();
    clock.dateTime = new Date().toISOString();
    const h = Number(hourNow.format(new Date()));
    const open = h >= 8 && h < 20;
    hours.textContent = open ? 'Open till 8 PM' : 'Opens 8 AM';
    el.querySelector('.footer__when').classList.toggle('is-open', open);
  };
  tick();
  setInterval(tick, 20000);

  // Wordmark fill: the shader, or flat Paper when WebGL isn't there
  const opt = (key, locked) => el.dataset[key] ?? locked;
  // the board fills: the board takes the whole width, no mask
  const sync = () => el.classList.toggle('is-board', opt('fill', 'board-update').startsWith('board'));
  sync();
  const shader = windowShader(el.querySelector('.footer__wordmark canvas'), { fill: opt('fill', 'board-update'), still: prefersReducedMotion() });
  if (!shader) el.classList.add('is-flat');

  if (import.meta.env.DEV) {
    // Review panel: other fills and taglines
    const TAGLINES = { here: 'We’ll take it from here.', steady: 'Steady hands at your door.', date: 'Done right, on your date.', handled: 'Your move, handled.' };
    const apply = () => {
      shader?.setFill(opt('fill', 'board-update'));
      shader?.setDim(+opt('dots', '2') / 100);
      sync();
      el.querySelector('.footer__tag').textContent = TAGLINES[opt('tagline', 'here')];
    };
    apply();
    el.addEventListener('section:options', apply);
  }
}
