import { prefersReducedMotion } from '../motion.js';
import { registerOptions } from '../options.js';

// Locked first: a 380 window, the W avatar on each reply, replies in a bubble, the tinted window with Paper bubbles
registerOptions('questions', { height: ['380', '440', '340'], avatar: ['on', 'name'], answer: ['bubble', 'plain'], surface: ['window', 'open'] });

// CH-03b Questions: the FAQ (already in the HTML) becomes a short message thread. Pick a chip, it's asked,
// and the answer is typed back character by character after typing dots. The window keeps its height and
// scrolls inside; if you scroll up to re-read, a "New reply" tab appears instead of pulling you down.
// Questions and answers are the dl in the page (from src/data/faq.js); data-greet overrides the opening line, and the closing
// line links to the same Help anchor as the heading.
const GREET = 'Hi. Here’s what people ask us most about a clean. Pick one.';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function init(el) {
  const QA = [...el.querySelectorAll('.qs__faq dt')].map((dt) => [dt.textContent, dt.nextElementSibling.textContent]);
  const win = el.querySelector('.qs__window');
  const thread = el.querySelector('.qs__thread');
  const inner = el.querySelector('.qs__inner');
  const chips = el.querySelector('.qs__chips');
  const box = el.querySelector('.qs__box');
  const input = box.querySelector('input');
  const ask = box.querySelector('.qs__ask');
  const newTab = el.querySelector('.qs__new');
  const reduced = prefersReducedMotion();
  const greet = el.dataset.greet || GREET;
  const help = el.querySelector('.qs__title a').getAttribute('href');

  el.querySelector('.qs__faq').hidden = true;
  win.hidden = false;

  let pinned = true;
  let token = { dead: false, fast: false };
  let queue = Promise.resolve();

  const atBottom = () => thread.scrollHeight - thread.scrollTop - thread.clientHeight < 40;
  thread.addEventListener('scroll', () => {
    pinned = atBottom();
    thread.classList.toggle('is-scrolled', thread.scrollTop > 4);
    if (pinned) newTab.classList.remove('is-on');
  });
  const follow = () => {
    if (pinned) thread.scrollTop = thread.scrollHeight;
    else newTab.classList.add('is-on');
    thread.classList.toggle('is-scrolled', thread.scrollTop > 4);
  };
  newTab.addEventListener('click', () => {
    pinned = true;
    thread.scrollTo({ top: thread.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
    newTab.classList.remove('is-on');
  });

  function add(node) {
    inner.append(node);
    pinned = true;
    thread.scrollTo({ top: thread.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }
  function reply() {
    const d = document.createElement('div');
    d.className = 'qs__msg qs__msg--ona';
    d.innerHTML = '<span class="qs__av" aria-hidden="true"><img src="/svg/symbol.svg" alt="" width="18" height="17"></span><div class="qs__body"><span class="qs__who label">Onaway</span><div class="qs__text"></div></div>';
    add(d);
    return d.querySelector('.qs__text');
  }
  async function dots(node, k, ms = 850) {
    if (reduced || k.fast) return;
    node.innerHTML = '<span class="qs__dots" aria-label="Onaway is typing"><i></i><i></i><i></i></span>';
    const end = Date.now() + ms;
    while (Date.now() < end && !k.dead && !k.fast) await sleep(40);
    node.innerHTML = '';
  }
  // Character by character: 13–37ms, 230ms after . and ?, 110ms after a comma. Full text sits in a hidden span.
  async function type(node, text, k) {
    if (reduced || k.fast) { node.textContent = text; follow(); return; }
    node.innerHTML = '<span class="sr-only"></span><span aria-hidden="true"></span><i class="qs__caret" aria-hidden="true"></i>';
    node.firstChild.textContent = text;
    const out = node.children[1];
    for (const c of text) {
      if (k.dead) return;
      if (k.fast) break;
      out.textContent += c;
      follow();
      await sleep(/[.?]/.test(c) ? 230 : c === ',' ? 110 : 13 + Math.random() * 24);
    }
    node.textContent = text;
    follow();
  }

  function send(q, a) {
    token.fast = true; // anything typing finishes at once
    const k = { dead: false, fast: false };
    token = k;
    queue = queue.then(async () => {
      ask.classList.add('is-lit');
      await sleep(reduced ? 0 : 220);
      ask.classList.remove('is-lit');
      const me = document.createElement('div');
      me.className = 'qs__msg qs__msg--me';
      me.innerHTML = '<span class="qs__who label">You</span><p></p>';
      me.querySelector('p').textContent = q;
      add(me);
      await sleep(reduced ? 0 : 300);
      const node = reply();
      await dots(node, k);
      await type(node, a, k);
    });
  }

  chips.innerHTML = QA.map(([q], i) => `<button type="button" data-i="${i}">${q.replace(/</g, '&lt;')}</button>`).join('');
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.classList.contains('is-used')) return;
    b.classList.add('is-used');
    if (![...chips.querySelectorAll('button')].some((x) => !x.classList.contains('is-used'))) {
      const p = document.createElement('p');
      p.className = 'qs__done';
      p.innerHTML = `That’s the most asked. More on the <a href="${help}">Help page</a>.`;
      chips.append(p);
    }
    const i = Number(b.dataset.i);
    send(QA[i][0], QA[i][1]);
  });
  box.addEventListener('submit', (e) => e.preventDefault()); // chips only for now
  el.addEventListener('pointerdown', () => { token.fast = true; });

  // The greeting types once the window comes into view
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    const k = token;
    const node = reply();
    queue = (async () => { await dots(node, k, 600); await type(node, greet, k); })();
  }, { threshold: 0.4 });
  io.observe(win);
}
