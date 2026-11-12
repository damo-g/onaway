import { registerOptions } from '../options.js';

// Help page closing (HE-02 N1 Help point, docs/mocks/help-cta.html): the question on the paper, the intercom card
// with the two keys (call, email). The lamp is lit while someone's in: 8 AM – 8 PM, Toronto, read every 20 s.
// Panel options (locked first):
//   email: key (a second, smaller key on the card) | link (a link under the call key) | left (beside the question)
//   lamp: on | off
//   view: angled (the card turned 2°, the mock's best) | flat
//   gap (desktop): 144 | 89 | 55 (the question and the card centred as a pair, that far apart) | spread (left edge, right edge)
registerOptions('helpend', { email: ['key', 'link', 'left'], lamp: ['on', 'off'], view: ['angled', 'flat'], gap: ['144', '89', '55', 'spread'] });

export function init(el) {
  const lamp = el.querySelector('[data-help-lamp]');
  const hourNow = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', hourCycle: 'h23' });
  const tick = () => {
    const h = Number(hourNow.format(new Date()));
    const open = h >= 8 && h < 20;
    el.classList.toggle('is-open', open);
    lamp.setAttribute('aria-label', open ? 'The help desk is open now' : 'The help desk opens at 8 AM');
  };
  tick();
  setInterval(tick, 20000);
}
