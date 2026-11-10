// "Postal code or town", one behaviour sitewide: the quote section's area blank (06, src/js/sections/quote.js) and
// the quote page's pickers (src/js/sections/request.js). Matching is GT-10's (src/js/data/area.js: postal codes,
// towns, communities, regions, towns outside our areas, a slip of a letter).
//
// A row is picked by a click, a tap or Enter; ↑ ↓ move the marked row. Pressing a row keeps focus in the input, so
// the list never closes under a slow click or a trackpad tap (the bug where only Enter worked).
import { suggestAreas } from './data/area.js';
import { regionLabel } from './data/places.js';

/**
 * @param {{ input: HTMLInputElement, list: HTMLElement, pick: (item) => void, outside?: (item) => Node,
 *   empty?: string, tagClass?: string, onRender?: (hasQuery: boolean) => void }} o
 * outside(item) renders a place outside our areas (default: a line of text); empty is the line when nothing matches.
 */
export function areaSearch({ input, list, pick, outside, empty = 'Try a postal code, like L5B 1A1, or your town.', tagClass = '', onRender }) {
  let rows = [];
  let active = -1;

  const mark = (i) => {
    active = i;
    rows.forEach((r, n) => r.classList.toggle('is-first', n === i));
    rows[i]?.scrollIntoView?.({ block: 'nearest' });
  };

  function row(it) {
    const b = document.createElement('button');
    b.type = 'button';
    b.tabIndex = -1; // the input keeps focus; ↑ ↓ move the mark
    b.innerHTML = `<i aria-hidden="true"></i><span></span><small${tagClass ? ` class="${tagClass}"` : ''}></small>`;
    b.querySelector('span').textContent = it.label;
    b.querySelector('small').textContent = [it.code, it.via, regionLabel(it.region)].filter((x, i, l) => x && x !== it.label && l.indexOf(x) === i).join(' · ');
    b.addEventListener('click', () => pick(it));
    return b;
  }

  function line(text) {
    const p = document.createElement('p');
    p.className = 'area-msg';
    p.textContent = text;
    return p;
  }

  function render() {
    const v = input.value.trim();
    const items = suggestAreas(v);
    list.replaceChildren();
    rows = [];
    for (const it of items) {
      if (it.out) list.append(outside ? outside(it) : line(`${it.label} is outside our five areas for now. Ask anyway, and we will tell you straight.`));
      else rows.push(list.appendChild(row(it)));
    }
    if (v && !items.length) list.append(line(/^[A-Za-z]\d/.test(v) ? 'Keep going: a postal code, like L5B 1A1.' : empty));
    mark(rows.length ? 0 : -1);
    onRender?.(!!v);
  }

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!rows.length) return;
      e.preventDefault();
      e.stopPropagation();
      mark((active + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      rows[active]?.click();
    }
  });
  list.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  list.addEventListener('pointermove', (e) => { const i = rows.indexOf(e.target.closest('button')); if (i >= 0 && i !== active) mark(i); });

  return { render, clear() { input.value = ''; render(); } };
}
