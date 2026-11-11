import { areaSearch } from '../area-search.js';
import { lookupArea } from '../data/area.js';
import { icon } from '../icons.js';

// QP-01 The Ticket. Three steps that fold as you finish them (a "GOT IT" cue first), a live ticket that
// mirrors every answer, and a background send to /api/quote.php (server/). Step 1 is the job (service, size,
// access, what's going); step 2 is where and when, all the timing in one place (When by service, and how often
// for cleaning). Phones show the ticket as a sticky summary that opens to the full ticket.
const NAMES = { clean: 'Cleaning', move: 'Moving', deliver: 'Delivery' };
const PLACE_LABEL = { clean: 'The place', move: 'The move', deliver: 'The load' };
const REGION = { Toronto: 'City of Toronto', Peel: 'Peel', York: 'York', Durham: 'Durham', Halton: 'Halton' };
const ORDER = ['job', 'ww', 'you'];
const STEP_NAME = { job: 'The job', ww: 'Where and when', you: 'How we reach you' };
const JOB = ['kind', 'svc', 'size', 'what', 'access'];
// When, by service: the choices each one offers (Pick a date opens the calendar)
const TIMING = { deliver: ['Same day', 'Pick a date', 'Regular'], other: ['This week', 'Next week', 'Pick a date'] };
// The note's hint follows the service
const NOTE = { clean: 'Pets at home, a lockbox code, rooms to skip', move: 'A tight staircase, a booked elevator, a piano', deliver: 'What it is, a buzzer code, which floor' };
// The same rules as the server (server/src/Validator.php)
const RX = {
  name: (v) => v.trim().length > 1,
  phone: (v) => /^\d{10}$/.test(v.trim().replace(/[\s\-().+]/g, '').replace(/^1/, '')),
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
  company: (v) => v.trim().length > 0,
};

// Sending: the endpoint, the privacy line shown under Send, the phone for the failure line
const API = '/api/quote.php';
const PRIVACY_VERSION = '2026-11-v1';
const PHONE = { label: '+1 647 877 1411', tel: '+16478771411' };
const CTA = 'Send my quote request';
// Spam: Cloudflare Turnstile (managed, shown only if Cloudflare wants a click). Dev and tunnel links use
// Cloudflare's always-pass test key, so localhost needn't be on the widget. server/src/QuoteHandler.php checks it.
const TURNSTILE_KEY = import.meta.env.DEV ? '1x00000000000000000000BB' : '0x4AAAAAAFzowRyLhF__zAhO';
const TURNSTILE_JS = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
// The form's values in the endpoint's words
const API_SVC = { clean: 'cleaning', move: 'moving', deliver: 'delivery' };
const API_TIMING = { 'This week': 'this-week', 'Next week': 'next-week', 'Pick a date': 'date', 'Same day': 'same-day', Regular: 'regular' };
const CONTACT = { call: 'Call', text: 'Text', email: 'Email' };
// The endpoint's field names → the form's (for a 400)
const FROM_API = { audience: 'kind', service: 'svc', size: 'size', often: 'often', access: 'access', what: 'what', area: 'area', from: 'from', to: 'to', timing: 'timing', date: 'timing', name: 'name', company: 'company', phone: 'phone', email: 'email', contact_pref: 'contact' };
// Its codes → words: "missing" keeps each field's own line (the locked wording)
const MSG = { email: 'That email doesn’t look right.', phone: 'Please enter a 10-digit number.', date: 'Pick a day from today, up to a year ahead.', invalid: 'Please check this one.' };

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
// A picked day: today or later, at most 12 months ahead (the server's rule)
const lastDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setFullYear(d.getFullYear() + 1); return d; };
const dayOk = (iso) => { const d = new Date(`${iso}T12:00`); const t = new Date(); t.setHours(0, 0, 0, 0); return d >= t && d <= new Date(lastDay().getTime() + 864e5); };

export function init(el) {
  const form = el.querySelector('.qp__form');
  const openedAt = Date.now(); // the time trap: the server drops anything sent within 3 s of the form opening
  const live = el.querySelector('[data-live]');
  const S = { svc: null, kind: 'home', area: null, from: null, to: null, size: null, often: null, access: null, what: null, timing: null, date: '', flex: false, details: '', name: '', company: '', phone: '', email: '', contact: null };
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
  const whenOk = () => !!(S.flex || (S.timing && (S.timing !== 'Pick a date' || (S.date && dayOk(S.date)))));
  function missing() {
    const m = [];
    if (!S.svc) m.push(['svc', 'service']);
    else {
      if (!whereOk()) m.push(['where', 'where']);
      if ((S.svc === 'clean' || S.svc === 'move') && !S.size) m.push(['size', 'size']);
      if (S.svc === 'move' && !S.access) m.push(['access', 'getting in and out']);
      if (S.svc === 'deliver' && !S.what) m.push(['what', 'what’s going']);
    }
    if (!whenOk()) m.push(['timing', 'when']);
    if (S.svc === 'clean' && !S.often) m.push(['often', 'how often']);
    if (!RX.name(S.name)) m.push(['name', 'name']);
    if (S.kind === 'business' && !RX.company(S.company)) m.push(['company', 'company name']);
    if (!RX.phone(S.phone)) m.push(['phone', 'phone']);
    if (!RX.email(S.email)) m.push(['email', 'email']);
    return m;
  }
  const done = {
    job: () => !!S.svc && !missing().some(([k]) => JOB.includes(k)),
    ww: () => whereOk() && whenOk() && (S.svc !== 'clean' || !!S.often),
    you: () => false,
  };
  const stepOf = (f) => (JOB.includes(f) ? 'job' : ['where', 'timing', 'often', 'area', 'from', 'to'].includes(f) ? 'ww' : 'you');

  // ---------- summary (ticket + folded steps) ----------
  function summary() {
    const where = two() ? (S.from || S.to ? `${S.from ? S.from.place : '…'} → ${S.to ? S.to.place : '…'}` : '') : S.area ? S.area.place : '';
    const place = [S.size, S.access, S.what].filter(Boolean).join(' · ');
    const pick = S.timing === 'Pick a date' ? (S.date ? fmtDate(S.date, { weekday: 'short', month: 'short', day: 'numeric' }) : '') : S.timing === 'Regular' ? 'Regular drop-offs' : S.timing || '';
    const day = [pick, S.svc === 'clean' ? S.often : ''].filter(Boolean).join(' · ');
    return {
      svc: S.svc ? NAMES[S.svc] : '',
      kind: S.svc ? (S.kind === 'home' ? 'Home' : `Business${S.company ? ` · ${S.company}` : ''}`) : '',
      where,
      place,
      when: day ? `${day}${S.flex ? ' · flexible' : ''}` : S.flex ? 'Flexible' : '',
      who: S.name.trim(),
      reach: [RX.phone(S.phone) ? S.phone : '', RX.email(S.email) ? S.email.trim() : '', S.contact ? `prefers ${CONTACT[S.contact]}` : ''].filter(Boolean).join(' · '),
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
      text = `${out.code} is outside our five areas. Send it anyway and we’ll tell you straight, or call ${PHONE.label}.`;
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
    const m0 = missing().map(([k]) => k);
    const got = [!!S.svc, S.svc && whereOk(), S.svc && !m0.some((k) => ['size', 'what', 'access'].includes(k)), whenOk() && !m0.includes('often'), RX.name(S.name) && (S.kind !== 'business' || RX.company(S.company)) && RX.phone(S.phone) && RX.email(S.email)].filter(Boolean).length;
    el.querySelector('.qticket__prog i').style.width = `${got * 20}%`;
    el.querySelector('[data-t="pct"]').textContent = `${got} of 5 answered`;
    // the note's hint follows the service
    const hint = NOTE[S.svc] || 'Anything that helps us quote it right';
    el.querySelector('[data-notehint]').textContent = `Optional · ${hint.toLowerCase()}`;
    el.querySelector('[data-details]').placeholder = `${hint}…`;
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
      const off = f === 'contact' && S.contact === b.dataset.v;
      g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(!off && x === b)));
      S[f] = off ? null : b.dataset.v;
      if (f === 'svc' && S.timing && !TIMING[S.svc === 'deliver' ? 'deliver' : 'other'].includes(S.timing)) {
        S.timing = null;
        if (S.date) cal.clear();
      }
      if (f === 'svc' || f === 'timing') syncTiming();
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

  // When sits in two groups (by service) but holds one answer: press it in both
  function syncTiming() {
    el.querySelectorAll('[data-f="timing"] button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === S.timing)));
    const dated = S.timing === 'Pick a date';
    el.querySelector('[data-flexrow]').hidden = dated;
    if (dated && S.flex) { S.flex = false; el.querySelector('[data-flex]').checked = false; }
  }

  // ---------- calendar ----------
  const calEl = el.querySelector('.qcal');
  const cal = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let vy = today.getFullYear();
    let vm = today.getMonth();
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const chips = () => el.querySelectorAll('[data-f="timing"] [data-v="Pick a date"]');
    const chip = () => el.querySelector('[data-f="timing"].is-shown [data-v="Pick a date"]') || chips()[0];
    function render() {
      const first = new Date(vy, vm, 1);
      const days = new Date(vy, vm + 1, 0).getDate();
      const atNow = vy === today.getFullYear() && vm === today.getMonth();
      const last = lastDay();
      const atEnd = vy === last.getFullYear() && vm === last.getMonth();
      let h = `<div class="qcal__head"><button type="button" class="qcal__prev" aria-label="Previous month"${atNow ? ' disabled' : ''}>${icon('arrow-left-02')}</button><b>${MONTHS[vm]} ${vy}</b><button type="button" class="qcal__next" aria-label="Next month"${atEnd ? ' disabled' : ''}>${icon('arrow-right-02')}</button></div>`;
      h += `<div class="qcal__week label">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<span>${x}</span>`).join('')}</div><div class="qcal__grid">`;
      for (let i = 0; i < first.getDay(); i++) h += '<span></span>';
      for (let d = 1; d <= days; d++) {
        const dt = new Date(vy, vm, d);
        const k = iso(dt);
        const cls = [k === iso(today) ? 'is-today' : '', k === S.date ? 'is-picked' : ''].filter(Boolean).join(' ');
        h += `<button type="button" data-d="${k}"${dt < today || dt > last ? ' disabled' : ''}${cls ? ` class="${cls}"` : ''} aria-label="${dt.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}">${d}</button>`;
      }
      h += `</div><p class="qcal__foot">${S.date ? `Picked: <b>${fmtDate(S.date, { weekday: 'long', month: 'long', day: 'numeric' })}</b>` : 'Pick a day. We confirm the exact time on your quote.'}</p>`;
      calEl.innerHTML = h;
      calEl.querySelector('.qcal__prev').onclick = () => { vm--; if (vm < 0) { vm = 11; vy--; } render(); };
      calEl.querySelector('.qcal__next').onclick = () => { vm++; if (vm > 11) { vm = 0; vy++; } render(); };
      calEl.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => {
        S.date = b.dataset.d;
        chips().forEach((c) => (c.textContent = fmtDate(S.date, { weekday: 'short', month: 'short', day: 'numeric' })));
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
      clear() { S.date = ''; chips().forEach((c) => (c.textContent = 'Pick a date')); },
    };
  })();

  el.querySelector('[data-flex]').addEventListener('change', (e) => { S.flex = e.target.checked; el.querySelector('[data-req="timing"]').classList.remove('is-bad'); picked('flex'); });
  el.querySelector('[data-details]').addEventListener('input', (e) => (S.details = e.target.value));
  const addNote = el.querySelector('.qaddnote');
  function showNote(focus) {
    addNote.nextElementSibling.hidden = false;
    addNote.hidden = true;
    if (focus) addNote.nextElementSibling.querySelector('textarea').focus();
  }
  addNote.addEventListener('click', () => showNote(true));
  const note = (text) => {
    S.details = S.details ? `${S.details} ${text}` : text;
    el.querySelector('[data-details]').value = S.details;
    showNote(false);
  };

  // ---------- the ticket on phones: a summary that opens ----------
  const ticket = el.querySelector('.qticket');
  ticket.querySelector('.qticket__toggle').addEventListener('click', (e) => {
    const on = !ticket.classList.contains('is-expanded');
    ticket.classList.toggle('is-expanded', on);
    e.currentTarget.setAttribute('aria-expanded', String(on));
    e.currentTarget.querySelector('.sr-only').textContent = on ? 'Hide your request' : 'Show your request';
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
    // Postal code or town, matched as in the GTA check (05); the same search as the homepage quote (06)
    const search = areaSearch({
      input,
      list: res,
      tagClass: 'label',
      pick: (it) => set({ place: it.label, region: it.region, code: it.code }),
      outside(it) {
        const p = document.createElement('p');
        p.innerHTML = `<span></span> is outside our five areas for now. <button type="button">Send it anyway</button> and we’ll tell you straight.`;
        p.querySelector('span').textContent = it.label;
        p.querySelector('button').onclick = () => set({ place: it.label, region: '', code: it.code, out: true });
        return p;
      },
      onRender: (has) => pk.classList.toggle('is-open', has),
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') pk.classList.remove('is-open'); });
    // the list closes only when focus really leaves the picker
    pk.addEventListener('focusout', (e) => { if (!pk.contains(e.relatedTarget)) pk.classList.remove('is-open'); });
    pk.querySelector('.qpick__change').onclick = () => {
      S[f] = null;
      pk.classList.remove('is-set', 'is-out');
      search.clear();
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
      w.classList.toggle('is-ok', !!i.value && RX[f](i.value));
      update();
    });
    i.addEventListener('blur', () => i.value && w.classList.toggle('is-bad', !RX[f](i.value)));
  });

  // ---------- errors: words next to the field, the first one focused ----------
  function mark(f, code) {
    let n;
    if (f === 'where') n = (two() ? ['from', 'to'] : ['area']).filter((p) => !S[p]).map((p) => el.querySelector(`.qpick[data-f="${p}"]`));
    else if (['area', 'from', 'to'].includes(f)) n = [el.querySelector(`.qpick[data-f="${f}"]`)];
    else n = [el.querySelector(`.qfield[data-f="${f}"]`) || el.querySelector(`[data-req="${f}"]`)];
    n = n.filter(Boolean);
    n.forEach((x) => {
      x.classList.add('is-bad');
      const err = x.querySelector('.qerr');
      if (!err) return;
      err.dataset.text ??= err.textContent;
      err.textContent = MSG[code] && !(code === 'missing') ? MSG[code] : err.dataset.text;
    });
    return n[0] || null;
  }
  function showErrors(list) {
    let first = null;
    list.forEach(([f, code]) => { const n = mark(f, code); first ??= n; });
    open(stepOf(list[0][0] === 'where' ? 'area' : list[0][0]), false);
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      first.querySelector('input, button')?.focus({ preventScroll: true });
    }
  }

  // ---------- the request as the endpoint reads it (server/src/Validator.php) ----------
  function payload() {
    const place = (p) => p && { name: p.place, region: p.region || '', code: p.code || '', outside: !!p.out };
    return {
      audience: S.kind,
      company: S.kind === 'business' ? S.company.trim() : '',
      service: API_SVC[S.svc],
      size: S.svc === 'clean' || S.svc === 'move' ? S.size : null,
      often: S.svc === 'clean' ? S.often : null,
      access: S.svc === 'move' ? S.access : null,
      what: S.svc === 'deliver' ? S.what : null,
      ...(two() ? { from: place(S.from), to: place(S.to) } : { area: place(S.area) }),
      timing: API_TIMING[S.timing] || (S.flex ? 'flexible' : null),
      date: S.timing === 'Pick a date' ? S.date : null,
      flexible: S.flex,
      notes: S.details.trim(),
      name: S.name.trim(),
      phone: S.phone.trim(),
      email: S.email.trim(),
      contact_pref: S.contact,
      privacy_version: PRIVACY_VERSION,
      website: form.querySelector('[name="website"]').value,
      form_ms: Date.now() - openedAt,
    };
  }

  // ---------- Turnstile: loads with the page, renders explicitly, runs on Send; a fresh token for every send ----------
  const tsBox = el.querySelector('[data-turnstile]');
  let tsWidget = null;
  let tsPending = null;
  const tsDone = (token) => { tsPending?.(token); tsPending = null; };
  const tsReady = new Promise((resolve) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = Object.assign(document.createElement('script'), { src: TURNSTILE_JS, async: true, defer: true });
    script.onload = () => resolve(window.turnstile ?? null);
    script.onerror = () => resolve(null); // blocked or offline: the server answers 403 and the failure line shows
    document.head.append(script);
  }).then((ts) => {
    if (!ts) return null;
    tsWidget = ts.render(tsBox, {
      sitekey: TURNSTILE_KEY,
      action: 'quote',
      execution: 'execute',
      appearance: 'interaction-only',
      callback: (token) => tsDone(token),
      'error-callback': () => { tsDone(''); return true; },
      'timeout-callback': () => tsDone(''),
    });
    return ts;
  });
  // A token, or '' (no script, an error, or no answer in 30 s: long enough for a click if Cloudflare asks for one)
  async function turnstileToken() {
    const ts = await Promise.race([tsReady, new Promise((r) => setTimeout(() => r(null), 8000))]);
    if (!ts || tsWidget === null) return '';
    return new Promise((resolve) => {
      const timer = setTimeout(() => tsDone(''), 30000);
      tsPending = (token) => { clearTimeout(timer); resolve(token || ''); };
      try { ts.execute(tsWidget); } catch { tsDone(''); }
    });
  }
  const turnstileReset = () => { try { if (tsWidget !== null) window.turnstile?.reset(tsWidget); } catch {} };

  // ---------- send: in the background, 15 s at most; answers are kept until it's in ----------
  const cta = el.querySelector('.qsend__cta');
  const fail = el.querySelector('.qsend__fail');
  const failText = fail.innerHTML;
  const setPhone = () => fail.querySelectorAll('[data-phone]').forEach((a) => { a.href = `tel:${PHONE.tel}`; a.textContent = PHONE.label; });
  setPhone();
  let sending = false;
  function busy(on, label) {
    cta.disabled = on;
    cta.setAttribute('aria-busy', String(on));
    cta.querySelector('[data-cta]').textContent = label;
  }

  function sent({ ref, promisedLabel }) {
    el.querySelectorAll('[data-o="email"]').forEach((n) => (n.textContent = S.email.trim()));
    // the tear-off stubs (refchip) all read the reference from one store
    if (window.Alpine) window.Alpine.store('refCopy').ref = ref;
    // the promise the server made replaces the page's live clock
    el.querySelectorAll('.qdone [data-q="by"]').forEach((n) => { n.removeAttribute('data-q'); n.textContent = `by ${promisedLabel}`; });
    try { sessionStorage.removeItem('onaway:quote'); } catch {}
    el.classList.add('is-sent');
    // the page header hides (CSS); the confirmation's heading names the section, and the ticket is just the slip now
    el.setAttribute('aria-labelledby', 'qdone-title');
    ticket.classList.remove('is-expanded');
    ticket.querySelector('.qticket__toggle').setAttribute('aria-expanded', 'false');
    el.querySelector('.qp__steps').hidden = true;
    const ok = el.querySelector('.qdone');
    ok.hidden = false;
    ok.focus({ preventScroll: true });
    // the header is gone, so the confirmation starts at the top of the page
    if (window.lenis) window.lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function send() {
    sending = true;
    fail.hidden = true;
    busy(true, 'Sending…');
    live.textContent = 'Sending your request…';
    const stop = new AbortController();
    let timer; // the 15 s starts once the Turnstile token is in
    let res = null;
    let body = null;
    try {
      const turnstile_token = await turnstileToken();
      timer = setTimeout(() => stop.abort(), 15000);
      res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...payload(), turnstile_token }), signal: stop.signal });
      body = await res.json().catch(() => null);
    } catch {
      res = null;
    }
    clearTimeout(timer);
    sending = false;
    turnstileReset(); // tokens are single use

    if (res?.ok && body?.ok && body.ref) {
      live.textContent = `Sent. Your reference is ${body.ref}.`;
      sent(body);
      return;
    }
    const fields = res?.status === 400 && body?.fields ? Object.entries(body.fields).filter(([k]) => FROM_API[k]) : [];
    if (fields.length) {
      busy(false, CTA);
      live.textContent = 'A few answers need another look.';
      showErrors(fields.map(([k, code]) => [FROM_API[k], code]));
      return;
    }
    busy(false, 'Try again');
    // 429: the rate limit has its own line; anything else (403 from Turnstile, 500, offline) the failure line
    fail.innerHTML = res?.status === 429 ? 'Too many requests. Call us at <a data-phone></a>.' : failText;
    setPhone();
    fail.hidden = false;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (sending) return;
    const m = missing();
    if (m.length) {
      showErrors(m.map(([f]) => [f, 'missing']));
      return;
    }
    send();
  });

  // ---------- arrive with answers: from the homepage quote or map, or a service page (?service=) ----------
  const SVC = { cleaning: 'clean', moving: 'move', delivery: 'deliver', clean: 'clean', move: 'move', deliver: 'deliver' };
  const regionOf = (place) => { const a = lookupArea(place); return a.ok ? a.region : null; };
  try {
    const params = new URLSearchParams(location.search);
    const quote = JSON.parse(sessionStorage.getItem('onaway:quote') || 'null') || {};
    const map = JSON.parse(sessionStorage.getItem('onaway:where') || 'null');
    const kind = { home: 'home', business: 'business' }[params.get('for')];
    if (kind) tap('kind', kind);
    const svc = SVC[params.get('service')] || SVC[quote.service];
    if (svc) tap('svc', svc);
    const size = { studio: 'Studio', '1-2': '1–2 bedroom', '3plus': '3+ bedroom', house: 'House' }[params.get('size')];
    if (size && (svc === 'clean' || svc === 'move')) tap('size', size);
    const often = params.get('often');
    if (often && svc === 'clean') tap('often', often);
    // Delivery: what's going (the closing panel) and when (How soon); the arrival window and a store pickup go in the note
    const what = params.get('what');
    const carry = { single: 'One item', few: 'A few pieces' }[what];
    if (carry && svc === 'deliver') tap('what', carry);
    if (what === 'store' && svc === 'deliver') note('Pickup from a store.');
    const deliverWhen = { 'same-day': 'Same day', regular: 'Regular' }[params.get('when')] || (what === 'regular' ? 'Regular' : null);
    if (deliverWhen && svc === 'deliver') tap('timing', deliverWhen);
    const date = params.get('date');
    const dateOk = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && dayOk(date);
    const win = /^(\d{1,2})-(\d{1,2})$/.exec(params.get('window') || '');
    if (win && svc === 'deliver') {
      const [a, b] = [+win[1], +win[2]];
      const m = (hh) => (hh < 12 || hh === 24 ? 'AM' : 'PM');
      const n = (hh) => ((hh + 11) % 12) + 1;
      const range = m(a) === m(b) ? `${n(a)} – ${n(b)} ${m(b)}` : `${n(a)} ${m(a)} – ${n(b)} ${m(b)}`;
      const from = S.timing === 'Regular' && dateOk ? `, from ${fmtDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}` : '';
      note(`Arrival window: ${range}${S.timing === 'Regular' ? `, every week${from}` : ''}.`);
    }
    // A date (Cleaning's How often, Delivery's How soon) picks it; Same day and Regular keep theirs
    if (dateOk && S.timing !== 'Same day' && S.timing !== 'Regular') {
      S.timing = 'Pick a date';
      S.date = date;
      syncTiming();
      el.querySelectorAll('[data-f="timing"] [data-v="Pick a date"]').forEach((c) => (c.textContent = fmtDate(date, { weekday: 'short', month: 'short', day: 'numeric' })));
    }
    const placeName = quote.area || map?.place;
    const region = placeName ? regionOf(placeName) || (map?.place === placeName ? map.region : null) : null;
    if (placeName && region) pickers[two() ? 'from' : 'area'].set({ place: placeName, region, code: map?.place === placeName ? map.fsa : '' });
    const when = { 'this week': 'This week', 'next week': 'Next week' }[quote.when];
    if (when) tap('timing', when);
    if (quote.when === 'not sure yet' || quote.when === 'later') {
      const flex = el.querySelector('[data-flex]');
      flex.checked = true;
      flex.dispatchEvent(new Event('change'));
    }
  } catch {}

  disarm();
  update();
  open(firstOpen());
}
