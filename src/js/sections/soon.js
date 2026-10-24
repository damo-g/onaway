import { prefersReducedMotion } from '../motion.js';

// DL-02 How soon: the Cleaning How often pattern (HO-08) for delivery. Three tabs tour on the 3.6s fill (hover
// pauses); under the heading, three weeks of days from today (your day yellow, Regular's weekly repeats Carbon)
// and a row of arrival windows. All times are Toronto. Same-day knows the cut-off and never offers a window
// less than the lead time away. Picking a day or a window stops the tour, reads it back and offers the quote.
export const SOON = {
  SAME_DAY_CUTOFF: 12, // 24h, Toronto: booking at or after this makes tomorrow the soonest
  LEAD_TIME_HOURS: 2, // a same-day window starts at least this far from now
  WINDOW_HOURS: 2,
  WINDOWS: [8, 10, 12, 14, 16, 18], // window start hours, 8 AM – 8 PM
  DAYS_SHOWN: 21,
  SCHEDULED_DEFAULT_DAY: 3, // days from today shown while touring
  REGULAR_DEFAULT_DAY: 2,
};
const TABS = ['same-day', 'scheduled', 'regular'];
const STEP = 3600;
const C = SOON;

const ampm = (h) => (h < 12 || h === 24 ? 'AM' : 'PM');
const h12 = (h) => ((h + 11) % 12) + 1;
const hour = (h) => `${h12(h)} ${ampm(h)}`;
const range = (h) => {
  const e = h + C.WINDOW_HOURS;
  return ampm(h) === ampm(e) ? `${h12(h)} – ${h12(e)} ${ampm(e)}` : `${hour(h)} – ${hour(e)}`;
};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Toronto's date and time now, as a local calendar date plus a decimal hour
function toronto() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { today: new Date(+p.year, +p.month - 1, +p.day), now: (+p.hour % 24) + +p.minute / 60 };
}

export function init(el) {
  const row = el.querySelector('.soon__days');
  const wins = el.querySelector('.soon__wins');
  const daysLabel = el.querySelector('.soon__dl');
  const cut = el.querySelector('.soon__cut');
  const tabs = [...el.querySelectorAll('.often__tab')];
  const cap = el.querySelector('.often__cap');
  const act = el.querySelector('.often__act');
  const cta = el.querySelector('.often__cta');
  const reduced = prefersReducedMotion();
  const S = { i: 0, day: 0, win: null, picked: false, held: false };
  let T = toronto();
  let timer;

  el.querySelector('.soon__wl').textContent = `Arrival window · ${C.WINDOW_HOURS} hours`;
  wins.innerHTML = C.WINDOWS.map((h, w) => `<button type="button" class="soon__win" data-w="${w}" aria-pressed="false">${range(h)}</button>`).join('');
  const winBtns = [...wins.children];

  const dayAt = (k) => new Date(T.today.getFullYear(), T.today.getMonth(), T.today.getDate() + k);
  const late = () => T.now >= C.SAME_DAY_CUTOFF;
  const winOk = (k, w) => k > 0 || C.WINDOWS[w] >= T.now + C.LEAD_TIME_HOURS;
  // Today works for same-day only before the cut-off and while a window is still far enough away
  const dayOk = (k, i = S.i) => {
    if (i === 0) return k === 1 || (k === 0 && !late() && C.WINDOWS.some((_, w) => winOk(0, w)));
    return k > 0;
  };
  const soonest = () => (dayOk(0, 0) ? 0 : 1);
  const defaultDay = (i) => [soonest(), C.SCHEDULED_DEFAULT_DAY, C.REGULAR_DEFAULT_DAY][i];

  function build() {
    row.innerHTML = '';
    for (let w = 0; w < C.DAYS_SHOWN / 7; w++) {
      const wk = document.createElement('div');
      wk.className = 'soon__wk';
      for (let k = w * 7; k < w * 7 + 7; k++) {
        const d = dayAt(k);
        wk.insertAdjacentHTML('beforeend', `<button type="button" class="soon__day" data-k="${k}" aria-pressed="false" aria-label="${d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}"><span class="label">${k === 0 ? 'Today' : d.toLocaleDateString('en-CA', { weekday: 'short' }).replace('.', '')}</span><b>${d.getDate() === 1 || k === 0 ? `${d.toLocaleDateString('en-CA', { month: 'short' }).replace('.', '')} ` : ''}${d.getDate()}</b></button>`);
      }
      row.append(wk);
    }
  }
  const dayBtns = () => [...row.querySelectorAll('.soon__day')];

  function readback() {
    const d = dayAt(S.day);
    const w = S.win === null ? '' : range(C.WINDOWS[S.win]);
    const md = d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' });
    if (S.i === 2) return `${d.toLocaleDateString('en-CA', { weekday: 'long' })}s${w ? `, ${w}` : ''}, from ${md}.`;
    if (S.day === 0) return `Today${w ? `, ${w}` : ''}.`;
    return `${d.toLocaleDateString('en-CA', { weekday: 'long' })}, ${md}${w ? `, ${w}` : ''}.`;
  }

  function show() {
    T = toronto();
    if (!dayOk(S.day)) S.day = defaultDay(S.i);
    if (S.win !== null && !winOk(S.day, S.win)) S.win = null;
    const cutoff = hour(C.SAME_DAY_CUTOFF);
    const heads = [
      ['Today, in a window.', late() || !dayOk(0, 0) ? `Past today’s ${cutoff} cut-off: tomorrow is the soonest.` : `Book by ${cutoff} for delivery today.`],
      ['A day and a window.', 'Up to three weeks out.'],
      ['Same day and window, every week.', 'For businesses: weekly drop-offs, pickups or routes.'],
    ];
    cap.innerHTML = S.picked ? `${readback()}<small>The exact time comes with your written quote.</small>` : `${heads[S.i][0]}<small>${heads[S.i][1]}</small>`;
    cap.classList.remove('is-new');
    void cap.offsetWidth;
    cap.classList.add('is-new');
    cut.textContent = S.i === 0 ? `Same-day cut-off ${cutoff}` : '';

    // Days: yours yellow; Regular's weekly repeats Carbon, popping in 120ms apart
    let n = 0;
    dayBtns().forEach((b) => {
      const k = Number(b.dataset.k);
      const on = k === S.day;
      const rep = S.i === 2 && k > S.day && (k - S.day) % 7 === 0;
      b.disabled = !dayOk(k);
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('is-rep', rep);
      b.style.animationDelay = rep ? `${++n * 120}ms` : '';
    });
    winBtns.forEach((b, w) => {
      b.disabled = !winOk(S.day, w);
      b.setAttribute('aria-pressed', String(w === S.win));
    });

    const q = new URLSearchParams({ service: 'delivery', when: TABS[S.i], date: iso(dayAt(S.day)) });
    if (S.win !== null) q.set('window', `${C.WINDOWS[S.win]}-${C.WINDOWS[S.win] + C.WINDOW_HOURS}`);
    if (S.i === 2) q.set('for', 'business');
    cta.href = `/quote/?${q}`;

    tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', String(j === S.i));
      t.classList.toggle('is-done', j < S.i && !S.picked);
      t.classList.remove('is-on');
    });
    void el.offsetWidth;
    tabs[S.i].classList.add('is-on');
  }

  function loop() {
    clearTimeout(timer);
    if (S.held || S.picked || reduced) return;
    timer = setTimeout(() => {
      S.i = (S.i + 1) % TABS.length;
      S.day = defaultDay(S.i);
      show();
      loop();
    }, STEP);
  }
  function pick() {
    S.picked = true;
    el.classList.add('is-picked');
    act.hidden = false;
    clearTimeout(timer);
    show();
  }

  // Hovering the tabs, days or windows pauses the tour
  [el.querySelector('.often__tabs'), el.querySelector('.soon__box')].forEach((zone) => {
    zone.addEventListener('mouseenter', () => { S.held = true; el.classList.add('is-held'); clearTimeout(timer); });
    zone.addEventListener('mouseleave', () => { S.held = false; el.classList.remove('is-held'); if (!S.picked) loop(); });
  });
  tabs.forEach((t, j) => t.addEventListener('click', () => {
    S.i = j;
    if (!S.picked) S.day = defaultDay(j);
    show();
  }));
  row.addEventListener('click', (e) => {
    const b = e.target.closest('.soon__day');
    if (!b || b.disabled) return;
    S.day = Number(b.dataset.k);
    pick();
  });
  wins.addEventListener('click', (e) => {
    const b = e.target.closest('.soon__win');
    if (!b || b.disabled) return;
    S.win = Number(b.dataset.w);
    pick();
  });
  el.querySelector('.often__reset').addEventListener('click', () => {
    S.picked = false;
    S.win = null;
    S.day = defaultDay(S.i);
    el.classList.remove('is-picked');
    act.hidden = true;
    show();
    loop();
  });

  // Phones show the next fortnight as two rows of 7
  new ResizeObserver(() => {
    const two = el.querySelector('.soon__box').clientWidth < 700;
    el.classList.toggle('is-two', two);
    daysLabel.textContent = two ? 'The next two weeks' : 'The next three weeks';
  }).observe(el.querySelector('.soon__box'));

  build();
  S.day = defaultDay(0);
  show();
  loop();
  // Keep "today", the cut-off and today's windows honest if the page stays open; redraw only when they change
  const sig = () => `${T.today.getTime()}|${late()}|${C.WINDOWS.map((_, w) => winOk(0, w)).join()}`;
  let last = sig();
  setInterval(() => {
    const t = toronto();
    const newDay = t.today.getTime() !== T.today.getTime();
    T = t;
    if (newDay) build();
    if (sig() !== last) { last = sig(); show(); }
  }, 60000);
}
