import { prefersReducedMotion } from '../motion.js';

// HO-08 How often: five weeks of days in a dot row. The visits for the current rhythm travel out from the
// first visit (yellow) into their days; the rhythm cycles every 3.6s (hover pauses). Tapping a day stops
// the loop, regroups the visits from that day, reads the schedule back and offers the quote.
const R = [
  ['One time', 0, 'One visit.', 'A deep clean, a move-in or move-out, or after a renovation.'],
  ['Weekly', 7, 'Same day, every week.', ''],
  ['Every 2 weeks', 14, 'Every other week.', 'The usual choice for homes.'],
  ['Monthly', 28, 'Same day, four weeks apart.', ''],
];
const DAYS = 35;
const STEP = 3600;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function init(el) {
  const row = el.querySelector('.often__row');
  const box = el.querySelector('.often__box');
  const weeks = el.querySelector('.often__weeks');
  const toks = [...el.querySelectorAll('.often__tok')];
  const tabs = [...el.querySelectorAll('.often__tab')];
  const cap = el.querySelector('.often__cap');
  const act = el.querySelector('.often__act');
  const cta = el.querySelector('.often__cta');
  const reduced = prefersReducedMotion();

  // Five weeks from next Sunday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start0 = new Date(today);
  start0.setDate(today.getDate() - today.getDay() + 7);
  const dayAt = (k) => {
    const d = new Date(start0);
    d.setDate(start0.getDate() + k);
    return d;
  };
  for (let k = 0; k < DAYS; k++) {
    const d = dayAt(k);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `often__cell${d.getDate() === 1 || k === 0 ? ' is-month' : ''}`;
    b.dataset.k = k;
    b.innerHTML = `<span>${d.getDate() === 1 || k === 0 ? `<em>${MONTHS[d.getMonth()]} </em>` : ''}${d.getDate()}</span>`;
    b.setAttribute('aria-label', `Start on ${d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}`);
    row.append(b);
  }
  const cells = [...row.children];

  let i = 0;
  let start = 2;
  let picked = false;
  let held = false;
  let timer;

  // Day size: 34 (the spacing step) in one row of five weeks; phones wrap to a 7-across calendar
  function fit() {
    const W = el.querySelector('.often__vis').clientWidth;
    const cal = W < 700;
    el.classList.toggle('is-cal', cal);
    const c = cal ? Math.floor(Math.min(44, (W - 6 * 3) / 7)) : Math.floor(Math.min(34, (W - 34 * 3) / 37));
    el.style.setProperty('--day', `${c}px`);
    el.classList.toggle('is-tiny', c < 20);
    weeks.replaceChildren();
    for (let w = 0; w < 5; w++) {
      const s = document.createElement('span');
      const d0 = dayAt(w * 7);
      const prev = dayAt(w * 7 - 7);
      s.textContent = `Week ${w + 1}${w === 0 || d0.getMonth() !== prev.getMonth() ? ` · ${MONTHS[d0.getMonth()]}` : ''}`;
      s.style.left = `${cells[w * 7].offsetLeft}px`;
      weeks.append(s);
    }
  }

  const days = () => (R[i][1] ? Array.from({ length: Math.ceil((DAYS - start) / R[i][1]) }, (_, n) => start + n * R[i][1]) : [start]);

  function place(anim) {
    const K = days();
    const first = cells[K[0]];
    toks.forEach((t, j) => {
      if (!anim) t.style.transition = 'none';
      if (j < K.length) {
        const c = cells[K[j]];
        t.style.transitionDelay = `${j * 90}ms`;
        t.style.transform = `translate(${c.offsetLeft}px, ${c.offsetTop}px)`;
        t.classList.add('is-in');
      } else {
        t.style.transitionDelay = '0ms';
        t.style.transform = `translate(${first.offsetLeft}px, ${first.offsetTop}px) scale(.6)`;
        t.classList.remove('is-in');
      }
      t.classList.toggle('is-first', j === 0);
      if (!anim) {
        void t.offsetWidth;
        t.style.transition = '';
      }
    });
  }

  function show(anim = !reduced) {
    const r = R[i];
    place(anim);
    if (picked) {
      const d = dayAt(start);
      cap.innerHTML = `${d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}${r[1] ? `, then ${r[0].toLowerCase()}.` : ', one visit.'}<small>The exact time comes with your written quote.</small>`;
      cta.href = `/quote/?service=cleaning&often=${encodeURIComponent(r[0])}&date=${iso(d)}`;
    } else {
      cap.innerHTML = `${r[2]}<small>${r[3] || '&nbsp;'}</small>`;
    }
    cap.classList.remove('is-new');
    void cap.offsetWidth;
    cap.classList.add('is-new');
    tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', String(j === i));
      t.classList.toggle('is-done', j < i && !picked);
      t.classList.remove('is-on');
    });
    void el.offsetWidth;
    tabs[i].classList.add('is-on');
  }

  function loop() {
    clearTimeout(timer);
    if (held || picked || reduced) return;
    timer = setTimeout(() => {
      i = (i + 1) % R.length;
      show();
      loop();
    }, STEP);
  }

  el.addEventListener('mouseenter', () => { held = true; el.classList.add('is-held'); clearTimeout(timer); });
  el.addEventListener('mouseleave', () => { held = false; el.classList.remove('is-held'); if (!picked) { show(false); loop(); } });
  tabs.forEach((t, j) => t.addEventListener('click', () => { i = j; show(); }));
  cells.forEach((c) => c.addEventListener('click', () => {
    start = Number(c.dataset.k);
    picked = true;
    el.classList.add('is-picked');
    act.hidden = false;
    clearTimeout(timer);
    show();
  }));
  el.querySelector('.often__reset').addEventListener('click', () => {
    picked = false;
    el.classList.remove('is-picked');
    act.hidden = true;
    start = 2;
    show();
    loop();
  });

  new ResizeObserver(() => { fit(); place(false); }).observe(el.querySelector('.often__vis'));
  fit();
  show(false);
  loop();
}
