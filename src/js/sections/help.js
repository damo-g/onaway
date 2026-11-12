import { prefersReducedMotion } from '../motion.js';

// Help page: CH-02b Ask in Place rows, grouped, with a sticky topic list (a chip row on phones).
// Ask a question and its row opens in place: typing dots, then the answer types into a bubble from the W.
// Every answer is already in the HTML; the visible copy types over a visually hidden full text.
// Rows deep-link (#how-much-will-it-cost opens that answer; #moving scrolls to the group).
export const HELP = {
  askButton: 'q', // "?" square; 'tx' shows ASK
  questionSide: 'left', // 'right': question right-aligned, ? on the left
  reopen: 'instant', // an answer types only the first time; 'again' types every time
  open: 'one', // one open at a time; 'many' leaves others open
  firstOpen: true, // first question open on load, answer already written
  readMarker: true, // 6 square at 35% after a question that's been read
  replyCapMs: 1200, // character by character, the whole answer within this
  dotsMs: 500, // typing dots before the reply
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function init(el) {
  const reduced = prefersReducedMotion();
  const rows = [...el.querySelectorAll('.help__row')];
  const btns = rows.map((r) => r.querySelector('.help__q'));
  const groups = [...el.querySelectorAll('.help__group')];
  const links = [...el.querySelectorAll('[data-topic]')];
  const chips = el.querySelector('.help__chips');
  el.dataset.ask = HELP.askButton;
  el.dataset.side = HELP.questionSide;
  if (HELP.readMarker) el.classList.add('has-marks');

  // ---------- rows ----------
  const typing = new Map(); // row → { fast }

  async function type(row) {
    const box = row.querySelector('.help__text');
    const more = row.querySelector('.help__more');
    const text = box.textContent;
    const k = { fast: false };
    typing.set(row, k);
    more.classList.add('is-hidden');
    box.innerHTML = '<span class="qs__dots" aria-hidden="true"><i></i><i></i><i></i></span>';
    const end = Date.now() + HELP.dotsMs;
    while (Date.now() < end && !k.fast) await sleep(30);
    box.innerHTML = '<span class="sr-only"></span><span aria-hidden="true"></span><i class="qs__caret" aria-hidden="true"></i>';
    box.firstChild.textContent = text;
    const out = box.children[1];
    const per = Math.min(30, HELP.replyCapMs / text.length);
    const t0 = performance.now();
    await new Promise((res) => {
      (function f() {
        const n = k.fast ? text.length : Math.floor((performance.now() - t0) / per);
        out.textContent = text.slice(0, n);
        if (n >= text.length) return res();
        requestAnimationFrame(f);
      })();
    });
    box.textContent = text;
    more.classList.remove('is-hidden');
    typing.delete(row);
  }

  function close(row) {
    typing.get(row) && (typing.get(row).fast = true);
    row.classList.remove('is-open');
    row.querySelector('.help__q').setAttribute('aria-expanded', 'false');
  }

  function open(row, { instant = false } = {}) {
    if (HELP.open === 'one') rows.forEach((r) => r !== row && r.classList.contains('is-open') && close(r));
    row.classList.add('is-open');
    row.querySelector('.help__q').setAttribute('aria-expanded', 'true');
    const fresh = !row.classList.contains('is-read') || HELP.reopen === 'again';
    row.classList.add('is-read');
    if (!instant && !reduced && fresh) type(row);
  }

  btns.forEach((b, i) => {
    b.addEventListener('click', () => (rows[i].classList.contains('is-open') ? close(rows[i]) : open(rows[i])));
    // ↑ ↓ move between questions
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      btns[Math.min(btns.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
    });
  });
  // Click anywhere while a reply is typing and it finishes at once
  el.addEventListener('pointerdown', (e) => { if (!e.target.closest('.help__q')) typing.forEach((k) => (k.fast = true)); });

  // ---------- scrolling: topics, deep links ----------
  const navH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
  const offset = () => navH() + (chips.offsetParent ? chips.offsetHeight : 0) + 34;
  function go(target, immediate = false) {
    const y = target.getBoundingClientRect().top + scrollY - offset();
    if (window.lenis) window.lenis.scrollTo(y, { immediate });
    else scrollTo({ top: y, behavior: immediate || reduced ? 'auto' : 'smooth' });
  }

  function fromHash(immediate) {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return false;
    const target = document.getElementById(id);
    if (!target || !el.contains(target)) return false;
    if (target.classList.contains('help__row')) open(target, { instant: true });
    // let the row open before measuring; on load, again once fonts and pins have settled the layout
    requestAnimationFrame(() => go(target, immediate));
    if (immediate) document.fonts.ready.then(() => setTimeout(() => go(target, true), 150));
    return true;
  }

  links.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    history.replaceState(null, '', a.getAttribute('href'));
    go(document.getElementById(a.dataset.topic));
  }));
  addEventListener('hashchange', () => fromHash(false));

  // The topic for the group under the line just below the nav follows scroll
  let current = null;
  function spy() {
    const line = offset() + 1;
    let on = groups[0];
    groups.forEach((g) => { if (g.getBoundingClientRect().top <= line) on = g; });
    if (on.id === current) return;
    current = on.id;
    links.forEach((a) => a.classList.toggle('is-on', a.dataset.topic === current));
    const chip = chips.querySelector(`[data-topic="${current}"]`);
    if (chip && chips.offsetParent) chips.scrollTo({ left: chip.offsetLeft - chips.clientWidth / 2 + chip.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
  }
  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; spy(); });
  }, { passive: true });

  if (!fromHash(true) && HELP.firstOpen) open(rows[0], { instant: true });
  spy();
}
