import { registerOptions } from '../options.js';
import { pinScrub, ScrollTrigger } from '../motion.js';
import { renderDotMatrix } from '../dotmatrix.js';

// Locked first: light environment (EL-01), dark signs, chained, icon left, straight arrows,
// description in its own column, fixed facts.
registerOptions('services', {
  env: ['el01', 'el02', 'ed03', 'ed04'],
  signs: ['dark', 'light'],
  arrangement: ['chain', 'perspective'],
  icon: ['left', 'right'],
  arrows: ['straight', 'angled'],
  description: ['column', 'under'],
  fact: ['fixed', 'window'],
});

// R2-E numbers, drawn at the 1512 frame. Signs hang below the beam painted into the plate.
const PLATE = { w: 1512, h: 1218, beamTop: 67, beamBottom: 223 };
const START = {
  chain: [{ w: 900, h: 104, dim: 1 }, { w: 840, h: 96, dim: 1 }, { w: 780, h: 90, dim: 1 }],
  perspective: [{ w: 940, h: 112, dim: 1, rod: 5 }, { w: 846, h: 100, dim: 0.9, rod: 4 }, { w: 770, h: 90, dim: 0.82, rod: 3 }],
};
const GAPS = { chain: [44, 32, 34], perspective: [42, 21, 21] };
const MIN_H = [64, 60, 56]; // signs stay readable on small screens
// Scroll, pinned: backdrop fades 0→.55, signs move .12→.8, details fade in .62→1
const LENGTH = 800;

const cl = (v) => Math.min(1, Math.max(0, v));
const L = (a, b, t) => a + (b - a) * t;
const ease = (v) => (v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2);

export function init(el) {
  const head = el.querySelector('.services__head');
  const plate = el.querySelector('.services__plate');
  const rods = el.querySelector('.services__rods');
  const signs = [...el.querySelectorAll('.sign')].map((a) => ({
    a,
    housing: a.querySelector('.sign__housing'),
    face: a.querySelector('.sign__face'),
    rule: a.querySelector('.sign__rule'),
    tile: a.querySelector('.sign__tile'),
    name: a.querySelector('.sign__name'),
    desc: a.querySelector('.sign__desc'),
    fact: a.querySelector('.sign__fact'),
    arrow: a.querySelector('.sign__arrow'),
  }));
  const opt = (key, locked) => el.dataset[key] ?? locked;
  let g;
  let last = 1;

  function measure() {
    const root = getComputedStyle(document.documentElement);
    const px = (name) => parseFloat(root.getPropertyValue(name));
    const W = el.clientWidth;
    const margin = px('--grid-margin');
    const gutter = px('--grid-gutter');
    const cols = W >= 1024 ? 12 : W >= 768 ? 8 : 4;
    const colW = (W - 2 * margin - (cols - 1) * gutter) / cols;
    const colX = (n) => margin + n * (colW + gutter);
    const wide = W >= 1024;
    const mobile = W < 768;
    const arrangement = opt('arrangement', 'chain');
    const iconRight = opt('icon', 'left') === 'right';
    const under = !wide || opt('description', 'column') === 'under';

    // Pinned at the top; the header's padding clears the navbar, so the stage is the whole viewport
    const view = window.innerHeight;

    // The beam sits 55 under the header (34 on phones), the faded top of the plate tucked behind it.
    // The plate is never narrower than the screen or 900 (so the beam keeps its weight) and is wide
    // enough that it reaches the bottom of the stage; its sides crop.
    const headBottom = head.offsetTop + head.offsetHeight;
    const beamTop = headBottom + (mobile ? 34 : 55);
    const plateW = Math.max(W, 900, ((view - beamTop) * PLATE.w) / (PLATE.h - PLATE.beamTop));
    const plateH = (plateW * PLATE.h) / PLATE.w;
    const plateTop = beamTop - plateH * (PLATE.beamTop / PLATE.h);
    const beamBottom = plateTop + plateH * (PLATE.beamBottom / PLATE.h);
    el.style.setProperty('--plate-top', `${plateTop}px`);
    el.style.setProperty('--plate-w', `${plateW}px`);

    // Start: hanging signs, centred, scaled from the 1512 frame, and shrunk if needed so the
    // bottom sign always clears the bottom of the stage by 34 while pinned
    const hang = (k) => {
      const kk = Math.max(k, 0.6);
      let y = beamBottom;
      return START[arrangement].map((s, i) => {
        const w = s.w * k;
        const h = Math.max(s.h * k, MIN_H[i] * Math.min(1, k / 0.39));
        y += GAPS[arrangement][i] * kk;
        const r = { x: (W - w) / 2, y, w, h, dim: s.dim, rod: (s.rod ?? 5) * kk };
        y += h;
        return r;
      });
    };
    const w0 = Math.min(W * (mobile ? 1 : wide ? 0.595 : 0.75), W - 2 * margin, 1035);
    let k = w0 / 900;
    let start = hang(k);
    const room = view - 34 - beamBottom;
    const used = start[2].y + start[2].h - beamBottom;
    if (used > room && room > 0) {
      k *= room / used;
      start = hang(k);
    }

    // End: full-width board rows
    const rowH = mobile ? 110 : 144;
    const rowsTop = headBottom + (mobile ? 34 : 55);
    const end = start.map((_, i) => ({ x: 0, y: rowsTop + i * rowH, w: W, h: rowH }));

    // End-state contents on the grid
    const tileEnd = mobile ? 55 : 89;
    const nameEnd = mobile ? 26 : wide ? 55 : 42;
    const arrowEnd = mobile ? 26 : 42;
    const nameX = iconRight ? margin : margin + tileEnd + gutter;
    const descX = under ? nameX : iconRight ? colX(3) : colX(4);
    // Wide: its own column; tablet: the right-hand three columns; phones: under the description
    const factX = wide ? (iconRight ? colX(7) : colX(8)) : colX(cols - 3);
    const descW = under ? (mobile ? W - nameX - margin - 34 : colX(cols - 3) - nameX - gutter) : colX(iconRight ? 6 : 7) - descX - gutter;
    const pitch = 5;
    const noFact = mobile; // phones show name and description only
    const nameGap = mobile ? 0 : 8; // tighter on phones (the description's line height gives the air)

    // Dot-matrix size follows the screen; description height at its end width decides the stack
    signs.forEach((s) => s.fact.querySelectorAll('[data-dm]').forEach((d) => (d.dataset.pitch = pitch)));
    renderDotMatrix(el);
    // (measured while shown: mid-scroll they may be display:none)
    const shown = (node, read) => {
      const prev = node.style.display;
      node.style.display = 'block';
      const v = read();
      node.style.display = prev;
      return v;
    };
    const descH = signs.map((s) => {
      s.desc.style.width = `${descW}px`;
      s.desc.style.fontSize = mobile ? 'var(--text-small)' : 'var(--text-body)';
      return shown(s.desc, () => s.desc.offsetHeight);
    });
    const factH = signs.map((s) => shown(s.fact, () => s.fact.offsetHeight));

    // At least the stage, so no paper shows under the plate while pinned
    const height = Math.max(start[2].y + start[2].h + 89, rowsTop + 3 * rowH + 89, view);
    el.style.height = `${height}px`;
    // Paper left under the board once it's done (the section fills the screen while pinned); the steps
    // section counts it so the gap after the board stays consistent
    document.documentElement.style.setProperty('--services-tail', `${height - (rowsTop + 3 * rowH)}px`);

    g = { W, margin, beamBottom, start, end, tileEnd, nameEnd, arrowEnd, nameX, descX, descW, factX, descH, factH, under, noFact, nameGap, iconRight, arrangement, view };
    drawRods();
  }

  function drawRods() {
    const { start, beamBottom, arrangement } = g;
    let html = '';
    start.forEach((s, i) => {
      const fr = arrangement === 'chain' ? [0.16, 0.84] : [i ? 0.24 : 0.16, i ? 0.76 : 0.84];
      const top = arrangement === 'chain' && i ? start[i - 1].y + start[i - 1].h : beamBottom;
      fr.forEach((f) => {
        html += `<span style="left:${s.x + s.w * f}px;top:${top}px;height:${s.y - top}px;width:${s.rod}px;z-index:${4 - i};filter:brightness(${s.dim})"></span>`;
      });
    });
    rods.innerHTML = html;
  }

  function render(t) {
    last = t;
    const b = ease(cl(t / 0.55));
    const p = ease(cl((t - 0.12) / 0.68));
    const c = ease(cl((t - 0.62) / 0.38));
    const lightSigns = opt('signs', 'dark') === 'light';

    plate.style.opacity = 1 - b;
    rods.style.opacity = 1 - cl(b * 1.7);

    signs.forEach((s, i) => {
      const a = g.start[i];
      const e = g.end[i];
      const w = L(a.w, e.w, p);
      const h = L(a.h, e.h, p);
      const pad = L(6, 0, p);
      Object.assign(s.a.style, {
        left: `${L(a.x, e.x, p)}px`,
        top: `${L(a.y, e.y, p)}px`,
        width: `${w}px`,
        height: `${h}px`,
        zIndex: 5 - i,
        filter: a.dim < 1 ? `brightness(${L(a.dim, 1, p)})` : '',
      });

      s.housing.style.borderRadius = `${L(8, 0, p)}px`;
      s.housing.style.opacity = lightSigns ? 1 - p : 1;
      s.housing.style.boxShadow =
        p > 0.98
          ? 'none'
          : g.arrangement === 'perspective'
            ? `0 ${8 - i * 2}px ${21 - i * 3}px -12px color-mix(in srgb, var(--color-carbon) ${(26 - i * 6) * (1 - p)}%, transparent), inset 0 0 0 1px var(--s-edge)`
            : `0 13px 21px -13px color-mix(in srgb, var(--color-carbon) ${55 * (1 - p)}%, transparent), inset 0 0 0 1px var(--s-edge)`;
      Object.assign(s.face.style, { inset: `${pad}px`, borderRadius: `${L(4, 0, p)}px` });
      s.rule.style.opacity = p;

      // Tile, name and arrow keep their sides for the whole scroll
      const ts = L(a.h - 2 * 6 - 12, g.tileEnd, p);
      const ins = L(12, g.margin, p);
      const fs = L(a.h * 0.38, g.nameEnd, p);
      const af = L(a.h * 0.38, g.arrowEnd, p);
      const tx = g.iconRight ? w - ins - ts : ins;
      Object.assign(s.tile.style, { left: `${tx}px`, top: `${(h - ts) / 2}px`, width: `${ts}px`, height: `${ts}px`, borderRadius: `${L(4, 2, p)}px` });

      const nx = g.iconRight ? L(34, g.nameX, p) : tx + ts + L(28, g.nameX - g.margin - g.tileEnd, p);
      // Stacked layouts lift the name so name, description (and fact on phones) sit centred as a block
      const stack = g.under ? fs + g.nameGap + g.descH[i] : fs;
      const nameTop = g.under ? (h - L(fs, stack, c)) / 2 : (h - fs) / 2;
      Object.assign(s.name.style, { left: `${nx}px`, top: `${nameTop}px`, fontSize: `${fs}px` });

      const arR = g.iconRight ? ins + ts + L(28, 34, p) : L(34, g.margin, p);
      Object.assign(s.arrow.style, { right: `${arR}px`, top: `${(h - af) / 2}px`, fontSize: `${af}px` });

      const show = c > 0.01 ? 'block' : 'none';
      const descTop = g.under ? nameTop + fs + g.nameGap : h / 2 - g.descH[i] / 2;
      Object.assign(s.desc.style, { left: `${g.under ? nx : g.descX}px`, top: `${descTop}px`, opacity: c, display: show });
      Object.assign(s.fact.style, { left: `${g.factX}px`, top: `${h / 2 - g.factH[i] / 2}px`, opacity: c, display: g.noFact ? 'none' : show });

      const idle = t <= 0.02 || t >= 0.999;
      s.a.classList.toggle('is-live', idle);
      s.a.classList.toggle('is-lift', t <= 0.02);
    });
  }

  el.classList.add('is-scripted');
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);

  if (import.meta.env.DEV) {
    // Review panel: environment plate, angled arrows and next-window facts are review-only
    const ANGLED = ['↗', '→', '↘'];
    const WINDOW = [['TUE 8-10', 'Tue 20 Oct'], ['WED 1-3', 'Wed 21 Oct'], ['TODAY 2-4', 'Mon 19 Oct']];
    const FIXED = signs.map((s) => s.fact.innerHTML);
    const pictures = { el01: plate.querySelector('picture') };
    const apply = () => {
      const env = opt('env', 'el01');
      const current = plate.querySelector('picture');
      if (current.dataset.image !== env) {
        pictures[env] ??= plate.querySelector(`template[data-env="${env}"]`).content.querySelector('picture');
        current.replaceWith(pictures[env]);
      }
      if (env.startsWith('ed')) el.dataset.navTheme = 'dark';
      else delete el.dataset.navTheme;
      signs.forEach((s, i) => {
        s.arrow.textContent = opt('arrows', 'straight') === 'angled' ? ANGLED[i] : '→';
        s.fact.innerHTML =
          opt('fact', 'fixed') === 'window'
            ? `<span class="label" style="display:block;margin-bottom:8px;color:var(--s-sub)">Next open window · ${WINDOW[i][1]}</span><span data-dm="${WINDOW[i][0]}" data-pitch="5"></span>`
            : FIXED[i];
      });
    };
    apply();
    el.addEventListener('section:options', () => {
      apply();
      measure();
      render(last);
      ScrollTrigger.refresh();
    });
  }

  pinScrub(el, LENGTH, render, { smooth: 0.6 });
}
