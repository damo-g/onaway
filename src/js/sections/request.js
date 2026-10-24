import { lookupPostcode } from '../data/postcodes.js';
import { PLACES } from '../data/places.js';

// QP-01 The Ticket. Three steps that fold as you finish them (a "GOT IT" cue first), a live ticket that
// mirrors every answer, and a stubbed send (the PHP handler comes later).
const NAMES = { clean: 'Cleaning', move: 'Moving', deliver: 'Delivery' };
const PLACE_LABEL = { clean: 'The place', move: 'The move', deliver: 'The load' };
const REGION = { Toronto: 'City of Toronto', Peel: 'Peel', York: 'York', Durham: 'Durham', Halton: 'Halton' };
const ORDER = ['job', 'ww', 'you'];
const STEP_NAME = { job: 'The job', ww: 'Where and when', you: 'How we reach you' };
const JOB = ['svc', 'size', 'often', 'what', 'speed', 'access'];
const RX = {
  name: (v) => v.trim().length > 1,
  phone: (v) => v.replace(/\D/g, '').replace(/^1/, '').length === 10,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
  company: () => true,
};

// Toronto clock: "by 4:30 PM" (2 hours), 10 AM outside 8–6; open 8 AM – 8 PM
function clock() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour').value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute').value);
  const fmt = (hh, mm) => `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
  const late = h >= 18;
  const by = h < 8 || late ? fmt(10, 0) : fmt(h + 2, m);
  const open = h >= 8 && h < 20;
  return {
    now: fmt(h, m),
    by: `by ${by}${late ? ' tomorrow' : ''}`,
    short: `by ${by}${late ? ' tmrw' : ''}`,
    open: open ? `Open now · Toronto ${fmt(h, m)}` : 'Closed now · opens 8 AM',
    isOpen: open,
  };
}

const fmtDate = (iso, opts) => new Date(`${iso}T12:00`).toLocaleDateString('en-CA', opts);

export function init(el) {
  const form = el.querySelector('.qp__form');
  const live = el.querySelector('[data-live]');
  const S = { svc: null, kind: 'home', area: null, from: null, to: null, size: null, often: null, access: null, what: null, speed: null, timing: null, date: '', flex: false, details: '', name: '', company: '', phone: '', email: '' };
  const two = () => S.svc === 'move' || S.svc === 'deliver';
  const steps = Object.fromEntries([...el.querySelectorAll('.qstep')].map((s) => [s.dataset.step, s]));

  // ---------- clock ----------
  function tick() {
    const c = clock();
    el.querySelectorAll('[data-q]').forEach((n) => (n.textContent = c[n.dataset.q]));
    el.querySelector('.qp__after').hidden = c.isOpen;
  }
  tick();
  setInterval(tick, 30000);

  // ---------- requirements ----------
  const whereOk = () => (two() ? !!(S.from && S.to) : !!S.area);
  const whenOk = () => !!(S.flex || (S.timing && (S.timing !== 'Pick a date' || S.date)));
  function missing() {
    const m = [];
    if (!S.svc) m.push(['svc', 'service']);
    else {
      if (!whereOk()) m.push(['where', 'where']);
      if ((S.svc === 'clean' || S.svc === 'move') && !S.size) m.push(['size', 'size']);
      if (S.svc === 'clean' && !S.often) m.push(['often', 'how often']);
      if (S.svc === 'move' && !S.access) m.push(['access', 'getting in and out']);
      if (S.svc === 'deliver' && !S.what) m.push(['what', 'what']);
      if (S.svc === 'deliver' && !S.speed) m.push(['speed', 'how soon']);
    }
    if (!whenOk()) m.push(['timing', 'when']);
    if (!RX.name(S.name)) m.push(['name', 'name']);
    if (!RX.phone(S.phone)) m.push(['phone', 'phone']);
    if (!RX.email(S.email)) m.push(['email', 'email']);
    return m;
  }
  const done = {
    job: () => !!S.svc && !missing().some(([k]) => JOB.includes(k)),
    ww: () => whereOk() && whenOk(),
    you: () => false,
  };
  const stepOf = (f) => (JOB.includes(f) ? 'job' : ['where', 'timing', 'area', 'from', 'to'].includes(f) ? 'ww' : 'you');

  // ---------- summary (ticket + folded steps) ----------
  function summary() {
    const where = two() ? (S.from || S.to ? `${S.from ? S.from.place : '…'} → ${S.to ? S.to.place : '…'}` : '') : S.area ? S.area.place : '';
    const place = [S.size, S.often, S.access, S.what, S.speed].filter(Boolean).join(' · ');
    const day = S.timing === 'Pick a date' ? (S.date ? fmtDate(S.date, { weekday: 'short', month: 'short', day: 'numeric' }) : '') : S.timing || '';
    return {
      svc: S.svc ? NAMES[S.svc] : '',
      kind: S.svc ? (S.kind === 'home' ? 'Home' : `Business${S.company ? ` · ${S.company}` : ''}`) : '',
      where,
      place,
      when: day ? `${day}${S.flex ? ' · flexible' : ''}` : S.flex ? 'Flexible' : '',
      who: S.name.trim(),
      reach: [RX.phone(S.phone) ? S.phone : '', RX.email(S.email) ? S.email.trim() : ''].filter(Boolean).join(' · '),
    };
  }

  function coverage() {
    const a = two() ? S.from : S.area;
    const b = two() ? S.to : null;
    const out = [a, b].find((x) => x && x.out);
    const cover = el.querySelector('.qcover');
    let text;
    let tag = '';
    if (out) {
      text = `${out.code} is outside our five areas. Send it anyway and we’ll tell you straight, or call +1 647 877 1411.`;
      tag = 'Outside our areas · we’ll confirm';
    } else if (a && b) {
      text = `${a.place} → ${b.place} · ${a.region === b.region ? `both in ${REGION[a.region]}` : `${REGION[a.region]} to ${REGION[b.region]}`} · both covered`;
      tag = '■ Both covered';
    } else if (a && !two()) {
      text = `${a.place} is in ${REGION[a.region]} · covered, same crew, same promises`;
      tag = `■ ${REGION[a.region]} · covered`;
    } else text = 'We work across the City of Toronto, Peel, York, Durham and Halton.';
    cover.classList.toggle('is-on', !!(a && (!two() || b) && !out));
    cover.classList.toggle('is-out', !!out);
    cover.querySelector('span').textContent = text;
    return tag;
  }

  function update() {
    // conditional questions
    el.querySelectorAll('[data-show]').forEach((n) => {
      const ok = n.dataset.show.split(' ').every((c) => {
        const [k, v] = c.split(':');
        return v.split(',').includes(S[k]);
      });
      n.classList.toggle('is-shown', ok);
    });
    // ticket
    const v = summary();
    v.wtag = coverage();
    el.querySelector('[data-t="placeLabel"]').textContent = PLACE_LABEL[S.svc] || 'The place';
    el.querySelectorAll('.qticket [data-t]').forEach((n) => {
      const k = n.dataset.t;
      if (!(k in v) || k === 'placeLabel') return;
      const nv = v[k] || (k === 'wtag' ? '' : '—');
      if (n.textContent === nv) return;
      n.textContent = nv;
      n.classList.toggle('is-empty', !v[k]);
      n.classList.remove('is-new');
      void n.offsetWidth;
      if (v[k]) n.classList.add('is-new');
    });
    const got = [!!S.svc, S.svc && whereOk(), S.svc && !missing().some(([k]) => ['size', 'often', 'what', 'speed', 'access'].includes(k)), whenOk(), RX.name(S.name) && RX.phone(S.phone) && RX.email(S.email)].filter(Boolean).length;
    el.querySelector('.qticket__prog i').style.width = `${got * 20}%`;
    el.querySelector('[data-t="pct"]').textContent = `${got} of 5`;
    // send button
    const m = missing();
    el.querySelector('.qsend__cta').classList.toggle('is-waiting', m.length > 0);
    el.querySelector('.qsend__need').textContent = m.length ? `Still needed: ${m.map(([, n]) => n).join(' · ')}` : 'Ready to send';
    renderSteps();
  }

  // ---------- steps: open one, fold the finished ones ----------
  let current = 'job';
  const seen = new Set();
  let armTimer;
  const firstOpen = () => ORDER.find((g) => !done[g]()) || 'you';

  function renderSteps() {
    const v = summary();
    const sums = { job: [v.kind, v.svc, v.place].filter(Boolean).join(' · '), ww: [v.where, v.when].filter(Boolean).join(' · '), you: [v.who, v.reach].filter(Boolean).join(' · ') };
    ORDER.forEach((g, i) => {
      const s = steps[g];
      const isOpen = g === current;
      const ok = done[g]() && seen.has(g);
      const prevOk = ORDER.slice(0, i).every((x) => done[x]());
      s.classList.toggle('is-open', isOpen);
      s.classList.toggle('is-done', !isOpen && ok);
      s.classList.toggle('is-waiting', !isOpen && !ok);
      s.classList.toggle('can-open', !isOpen && (ok || prevOk));
      s.querySelector('.qstep__sum').textContent = sums[g];
      s.querySelector('.qstep__head').setAttribute('aria-expanded', String(isOpen));
    });
  }

  function open(g, scroll) {
    disarm();
    current = g;
    seen.add(g);
    ORDER.slice(0, ORDER.indexOf(g)).forEach((x) => done[x]() && seen.add(x));
    renderSteps();
    if (scroll) steps[g].scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (g === 'you') {
      const i = el.querySelector('#qp-name');
      if (i && !i.value) setTimeout(() => i.focus({ preventScroll: true }), 350);
    }
  }

  function disarm() {
    clearTimeout(armTimer);
    ORDER.forEach((g) => steps[g].classList.remove('is-armed'));
  }

  // When a step's last answer lands: "GOT IT" for 0.8s, then fold and open the next
  function picked(f) {
    update();
    if (current === 'you' || f === 'kind') return;
    disarm();
    if (!done[current]()) return;
    const s = steps[current];
    void s.offsetWidth;
    s.classList.add('is-armed');
    armTimer = setTimeout(() => {
      s.classList.remove('is-armed');
      if (current !== 'you' && done[current]()) {
        const was = current;
        const next = firstOpen();
        open(next, true);
        live.textContent = `${STEP_NAME[was]} saved. Now: ${STEP_NAME[next]}.`;
      }
    }, 800);
  }

  ORDER.forEach((g) => steps[g].querySelector('.qstep__head').addEventListener('click', () => steps[g].classList.contains('can-open') && open(g)));
  el.querySelectorAll('.qticket__row').forEach((r) =>
    r.addEventListener('click', () => {
      const s = steps[r.dataset.step];
      if (s.classList.contains('can-open') || s.classList.contains('is-open')) open(r.dataset.step, true);
    }),
  );
  el.addEventListener('focusin', (e) => {
    if (e.target.closest('.qstep__body input:not([type=checkbox]), .qstep__body textarea')) disarm();
  });

  // ---------- tap groups ----------
  function tap(f, v) {
    el.querySelector(`[data-f="${f}"] button[data-v="${CSS.escape(v)}"]`)?.click();
  }
  el.querySelectorAll('[data-f] > button[data-v]').forEach((b) =>
    b.addEventListener('click', () => {
      const g = b.parentElement;
      const f = g.dataset.f;
      g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      S[f] = b.dataset.v;
      g.closest('.qrow')?.classList.remove('is-bad');
      if (f === 'kind') {
        S.size = null;
        el.querySelectorAll('[data-f="size"] button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      }
      if (f === 'timing') {
        if (S.timing === 'Pick a date') cal.open();
        else {
          cal.close();
          if (S.date) cal.clear();
        }
      }
      picked(f);
    }),
  );

  // ---------- calendar ----------
  const calEl = el.querySelector('.qcal');
  const cal = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let vy = today.getFullYear();
    let vm = today.getMonth();
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const chip = () => el.querySelector('[data-f="timing"] [data-v="Pick a date"]');
    function render() {
      const first = new Date(vy, vm, 1);
      const days = new Date(vy, vm + 1, 0).getDate();
      const atNow = vy === today.getFullYear() && vm === today.getMonth();
      let h = `<div class="qcal__head"><button type="button" class="qcal__prev" aria-label="Previous month"${atNow ? ' disabled' : ''}>←</button><b>${MONTHS[vm]} ${vy}</b><button type="button" class="qcal__next" aria-label="Next month">→</button></div>`;
      h += `<div class="qcal__week label">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<span>${x}</span>`).join('')}</div><div class="qcal__grid">`;
      for (let i = 0; i < first.getDay(); i++) h += '<span></span>';
      for (let d = 1; d <= days; d++) {
        const dt = new Date(vy, vm, d);
        const k = iso(dt);
        const cls = [k === iso(today) ? 'is-today' : '', k === S.date ? 'is-picked' : ''].filter(Boolean).join(' ');
        h += `<button type="button" data-d="${k}"${dt < today ? ' disabled' : ''}${cls ? ` class="${cls}"` : ''} aria-label="${dt.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}">${d}</button>`;
      }
      h += `</div><p class="qcal__foot">${S.date ? `Picked: <b>${fmtDate(S.date, { weekday: 'long', month: 'long', day: 'numeric' })}</b>` : 'Pick a day. We confirm the exact time on your quote.'}</p>`;
      calEl.innerHTML = h;
      calEl.querySelector('.qcal__prev').onclick = () => { vm--; if (vm < 0) { vm = 11; vy--; } render(); };
      calEl.querySelector('.qcal__next').onclick = () => { vm++; if (vm > 11) { vm = 0; vy++; } render(); };
      calEl.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => {
        S.date = b.dataset.d;
        chip().textContent = fmtDate(S.date, { weekday: 'short', month: 'short', day: 'numeric' });
        render();
        setTimeout(() => (calEl.hidden = true), 260);
        picked('date');
      }));
    }
    calEl.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', (e) => { if (!e.target.closest('[data-f="timing"]')) calEl.hidden = true; });
    calEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') { calEl.hidden = true; chip().focus(); } });
    return {
      open() {
        render();
        calEl.hidden = false;
        setTimeout(() => calEl.querySelector('.is-picked, .qcal__grid button:not(:disabled)')?.focus({ preventScroll: true }), 30);
      },
      close() { calEl.hidden = true; },
      clear() { S.date = ''; chip().textContent = 'Pick a date'; },
    };
  })();

  el.querySelector('[data-flex]').addEventListener('change', (e) => { S.flex = e.target.checked; el.querySelector('[data-req="timing"]').classList.remove('is-bad'); picked('flex'); });
  el.querySelector('[data-details]').addEventListener('input', (e) => (S.details = e.target.value));
  el.querySelector('.qaddnote').addEventListener('click', (e) => {
    const note = e.currentTarget.nextElementSibling;
    note.hidden = false;
    e.currentTarget.hidden = true;
    note.querySelector('textarea').focus();
  });

  // ---------- place pickers (postal code or town, tagged with the region) ----------
  const pickers = {};
  el.querySelectorAll('.qpick').forEach((pk) => {
    const f = pk.dataset.f;
    const input = pk.querySelector('.qinput');
    const res = pk.querySelector('.qpick__res');
    let first = null;
    function set(a) {
      S[f] = a;
      pk.classList.add('is-set');
      pk.classList.remove('is-open', 'is-bad');
      pk.classList.toggle('is-out', !!a.out);
      pk.querySelector('.qpick__name').textContent = a.place;
      pk.querySelector('.qpick__tag').textContent = a.out ? 'Outside our areas' : `${a.code ? `${a.code} · ` : ''}${REGION[a.region]}`;
      picked(f);
      if (f === 'from' && !S.to) setTimeout(() => el.querySelector('#qp-to')?.focus({ preventScroll: true }), 60);
    }
    function row(name, region, code) {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<i aria-hidden="true"></i><span></span><small class="label"></small>';
      b.querySelector('span').textContent = name;
      b.querySelector('small').textContent = `${code ? `${code} · ` : ''}${REGION[region]}`;
      b.onclick = () => set({ place: name, region, code });
      return b;
    }
    function search() {
      const v = input.value.trim();
      res.replaceChildren();
      first = null;
      pk.classList.toggle('is-open', !!v);
      if (!v) return;
      if (/^[A-Za-z]\d[A-Za-z]/.test(v)) {
        const a = lookupPostcode(v);
        if (a.ok) res.append((first = row(a.place && a.place !== 'Toronto' ? a.place : 'Toronto', a.region, a.fsa)));
        else {
          const p = document.createElement('p');
          p.innerHTML = `<span></span> is outside our five areas for now. <button type="button">Send it anyway</button> and we’ll tell you straight.`;
          p.querySelector('span').textContent = a.fsa;
          p.querySelector('button').onclick = () => set({ place: a.fsa, region: '', code: a.fsa, out: true });
          res.append(p);
        }
      } else {
        const s = v.toLowerCase();
        const starts = PLACES.filter(([n]) => n.toLowerCase().startsWith(s));
        const contains = PLACES.filter(([n]) => !n.toLowerCase().startsWith(s) && n.toLowerCase().includes(s));
        starts.concat(contains).slice(0, 5).forEach(([n, r], i) => {
          const b = row(n, r, '');
          if (!i) first = b;
          res.append(b);
        });
        if (!res.children.length) {
          const p = document.createElement('p');
          p.textContent = 'Try a postal code, like L5B 1A1.';
          res.append(p);
        }
      }
      first?.classList.add('is-first');
    }
    input.addEventListener('input', search);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); first?.click(); }
      if (e.key === 'Escape') pk.classList.remove('is-open');
    });
    input.addEventListener('blur', () => setTimeout(() => pk.classList.remove('is-open'), 180));
    pk.querySelector('.qpick__change').onclick = () => {
      S[f] = null;
      pk.classList.remove('is-set', 'is-out');
      input.value = '';
      update();
      setTimeout(() => input.focus(), 20);
    };
    pickers[f] = { set };
  });

  // ---------- text fields ----------
  el.querySelectorAll('.qfield').forEach((w) => {
    const f = w.dataset.f;
    const i = w.querySelector('input');
    i.addEventListener('input', () => {
      if (f === 'phone') {
        const d = i.value.replace(/\D/g, '').replace(/^1/, '').slice(0, 10);
        i.value = d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d;
      }
      S[f] = i.value;
      if (w.classList.contains('is-bad') && RX[f](i.value)) w.classList.remove('is-bad');
      w.classList.toggle('is-ok', !!i.value && RX[f](i.value) && f !== 'company');
      update();
    });
    i.addEventListener('blur', () => i.value && w.classList.toggle('is-bad', !RX[f](i.value)));
  });

  // ---------- send (stubbed: shows the success state; the PHP handler is added later) ----------
  function mark(f) {
    if (f === 'where') {
      let target = null;
      (two() ? ['from', 'to'] : ['area']).forEach((p) => {
        if (S[p]) return;
        const pk = el.querySelector(`.qpick[data-f="${p}"]`);
        pk.classList.add('is-bad');
        target ??= pk;
      });
      return target;
    }
    const n = el.querySelector(`.qfield[data-f="${f}"]`) || el.querySelector(`[data-req="${f}"]`);
    n?.classList.add('is-bad');
    return n;
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const m = missing();
    if (m.length) {
      let first = null;
      m.forEach(([f]) => { const n = mark(f); first ??= n; });
      open(stepOf(m[0][0]), false);
      if (first) {
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        first.querySelector('input, button')?.focus({ preventScroll: true });
      }
      return;
    }
    const ref = `ONA-${String(Date.now()).slice(-5)}`;
    el.querySelectorAll('[data-o="email"]').forEach((n) => (n.textContent = S.email.trim()));
    el.querySelectorAll('[data-o="ref"]').forEach((n) => (n.textContent = ref));
    // TODO(handler): POST the request to the PHP handler here; show the success state on its OK.
    try { sessionStorage.removeItem('onaway:quote'); } catch {}
    el.classList.add('is-sent');
    el.querySelector('.qp__steps').hidden = true;
    const ok = el.querySelector('.qdone');
    ok.hidden = false;
    ok.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: 'smooth' });
  });

  // ---------- arrive with answers: from the homepage quote or map, or a service page (?service=) ----------
  const SVC = { cleaning: 'clean', moving: 'move', delivery: 'deliver', clean: 'clean', move: 'move', deliver: 'deliver' };
  const regionOf = (place) => PLACES.find(([n]) => n === place)?.[1];
  try {
    const params = new URLSearchParams(location.search);
    const quote = JSON.parse(sessionStorage.getItem('onaway:quote') || 'null') || {};
    const map = JSON.parse(sessionStorage.getItem('onaway:where') || 'null');
    const svc = SVC[params.get('service')] || SVC[quote.service];
    if (svc) tap('svc', svc);
    const placeName = quote.area || map?.place;
    const region = regionOf(placeName) || (map?.place === placeName ? map.region : null);
    if (placeName && region) pickers[two() ? 'from' : 'area'].set({ place: placeName, region, code: map?.place === placeName ? map.fsa : '' });
    const when = { 'this week': 'This week', 'next week': 'Next week' }[quote.when];
    if (when) tap('timing', when);
    if (quote.when === 'not sure yet') {
      const flex = el.querySelector('[data-flex]');
      flex.checked = true;
      flex.dispatchEvent(new Event('change'));
    }
  } catch {}

  disarm();
  update();
  open(firstOpen());
}
