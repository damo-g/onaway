import { dotCount, dotField } from '../dotmatrix.js';
import { registerOptions } from '../options.js';

// 404 (NF-404, Headsign + hanging stops): the headsign's two fields, 404 and WRONG STOP, drawn edge to edge in the
// homepage's 5 × 7 dots at one pitch (the largest that fits both, and the sign's height), redrawn when the sign resizes.
// Panel options (locked first):
//   lit: rust (rust lifted with Paper, about 4.8 : 1 on Carbon) | yellow | paper
//   glow: soft (a faint halo on the lit dots) | off
//   plates: stack (one under the other) | grid (a row, two to a row on phones)
registerOptions('notfound', { lit: ['rust', 'yellow', 'paper'], glow: ['soft', 'off'], plates: ['stack', 'grid'] });

export function init(el) {
  const route = el.querySelector('.notfound__route');
  const dest = el.querySelector('.notfound__dest');
  const draw = () => {
    route.innerHTML = ''; dest.innerHTML = ''; // the old drawing never holds a field open
    const pitch = Math.min(
      dest.clientHeight / 9, route.clientHeight / 9,
      dest.clientWidth / (dotCount(dest.dataset.dmField) + 4),
      route.clientWidth / (dotCount(route.dataset.dmField) + 4),
      13,
    );
    dotField(route, route.dataset.dmField, pitch);
    dotField(dest, dest.dataset.dmField, pitch);
  };
  let w = 0;
  new ResizeObserver(([e]) => { if (Math.round(e.contentRect.width) !== w) { w = Math.round(e.contentRect.width); draw(); } }).observe(el.querySelector('.notfound__sign'));
}
