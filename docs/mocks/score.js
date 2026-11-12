/* Review scores for the mocks (0–100). A style's score = its base + each option's adjustment, for the options that
   style uses (the rest are dimmed). The panel shows the score for what's on screen, the best combination for the
   style (Apply sets it), and every style ranked by its best combination; each toolbar button carries the score the
   style would get with that value, the best one marked.
   Score({ key: 'o', styles: { id: { name, base, uses: ['col', ...], mods: { col: { rust: 4 } }, note } }, preferred, common }) */
window.Score = function ({ key, styles, preferred, common = {} }) {
  const panel = document.getElementById('score');
  const groups = () => [...document.querySelectorAll('.tools[data-g]')];
  const values = (g) => [...document.querySelectorAll(`.tools[data-g="${g}"] [data-v]`)].map((b) => b.dataset.v);
  const label = (g, v) => document.querySelector(`.tools[data-g="${g}"] [data-v="${v}"]`)?.dataset.name || document.querySelector(`.tools[data-g="${g}"] [data-v="${v}"]`)?.textContent.trim();
  const state = () => Object.fromEntries(groups().map((g) => [g.dataset.g, g.querySelector('[aria-pressed="true"]')?.dataset.v]));
  const mod = (s, g, v) => (s.mods?.[g]?.[v] ?? common[g]?.[v] ?? 0);
  function score(id, st) {
    const s = styles[id]; let n = s.base;
    for (const g of s.uses) { if (g === 'ang' && st.view === 'flat') continue; n += mod(s, g, st[g]); }
    if (s.pair) n += s.pair(st); // options that work together (or against each other)
    return Math.max(0, Math.min(100, n));
  }
  function best(id) {
    const s = styles[id]; let top = { n: -1, st: null };
    const walk = (i, st) => {
      if (i === s.uses.length) { const n = score(id, st); if (n > top.n) top = { n, st: { ...st } }; return; }
      const g = s.uses[i];
      for (const v of values(g)) if (!s.skip?.[g]?.includes(v)) walk(i + 1, { ...st, [g]: v }); // skip: values that don't apply to this style
    };
    walk(0, {});
    return top;
  }
  const press = (g, v) => document.querySelector(`.tools[data-g="${g}"] [data-v="${v}"]`)?.click();
  function apply(id) { press(key, id); const b = best(id); for (const g of styles[id].uses) press(g, b.st[g]); }

  function render() {
    const st = state(), id = st[key], s = styles[id], b = best(id), now = score(id, st);
    // the buttons: what this style scores with each value
    groups().forEach((g) => {
      const name = g.dataset.g, on = name === key || s.uses.includes(name);
      g.classList.toggle('is-off', !on && name in common);
      g.querySelectorAll('[data-v]').forEach((btn) => {
        btn.disabled = name !== key && s.uses.includes(name) && !!s.skip?.[name]?.includes(btn.dataset.v);
        let n = null;
        if (name === key) n = best(btn.dataset.v).n;
        else if (s.uses.includes(name) && !(name === 'ang' && st.view === 'flat')) n = score(id, { ...st, [name]: btn.dataset.v });
        if (n == null) { btn.removeAttribute('data-sc'); btn.classList.remove('is-best'); return; }
        btn.dataset.sc = n;
        btn.classList.toggle('is-best', name === key ? btn.dataset.v === preferred : b.st[name] === btn.dataset.v);
      });
    });
    const rank = Object.keys(styles).map((k) => ({ k, n: best(k).n })).sort((a, z) => z.n - a.n);
    const combo = s.uses.filter((g) => !(g === 'ang' && b.st.view === 'flat')).map((g) => label(g, b.st[g])).join(' · ');
    panel.innerHTML = `
      <div class="sc-now"><span class="sc-k">This combination</span><b>${now}</b><span class="sc-of">/100</span>${now >= b.n ? '<span class="sc-tag">Best</span>' : ''}</div>
      <div class="sc-best"><span class="sc-k">Best for ${s.name}</span><span class="sc-c"><b>${b.n}</b> ${combo || 'as is'}</span>${now < b.n ? '<button class="tbtn" data-apply>Apply</button>' : ''}<p class="sc-note">${s.note || ''}</p></div>
      <ol class="sc-rank">${rank.map((r, i) => `<li class="${r.k === id ? 'is-on' : ''}" data-go="${r.k}"><span class="sc-i">${i + 1}</span><span class="sc-n">${styles[r.k].name}${r.k === preferred ? ' <em>Preferred</em>' : ''}</span><span class="sc-bar"><i style="width:${r.n}%"></i></span><b>${r.n}</b></li>`).join('')}</ol>`;
  }
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-apply]')) apply(state()[key]);
    const go = e.target.closest('[data-go]'); if (go) apply(go.dataset.go);
  });
  document.addEventListener('click', (e) => { if (e.target.closest('.tools')) setTimeout(render, 0); });
  apply(preferred);
  render();
};

/* the styles for the panel and the buttons' scores (shared by the mocks) */
(function () {
  const css = `
  .score{max-width:1512px;margin:0 auto 13px;display:grid;grid-template-columns:auto 1.2fr 1.6fr;gap:21px 34px;align-items:start;padding:13px 21px;border:1px solid var(--line);font-family:var(--body)}
  .score .sc-k{display:block;font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
  .sc-now{white-space:nowrap}.sc-now b{font-family:var(--display);font-stretch:87.5%;font-weight:650;font-size:55px;line-height:.9}
  .sc-of{font-family:var(--mono);font-size:12px;color:var(--muted);margin-left:4px}
  .sc-tag{margin-left:8px;padding:2px 6px;background:#E4BB3F;color:#202521;font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;vertical-align:top}
  .sc-c{font-size:14px;line-height:1.4}.sc-c b{font-family:var(--mono);font-size:14px;margin-right:6px}
  .sc-best .tbtn{margin-top:8px}
  .sc-note{margin:8px 0 0;font-size:13px;line-height:1.45;color:var(--muted);max-width:60ch}
  .sc-rank{list-style:none;margin:0;padding:0;display:grid;gap:3px;font-size:13px}
  .sc-rank li{display:grid;grid-template-columns:18px 1fr 120px 28px;gap:8px;align-items:center;padding:2px 6px;cursor:pointer}
  .sc-rank li:hover{background:var(--line)}
  .sc-rank li.is-on{background:var(--fg);color:var(--bg)}
  .sc-rank .sc-i{font-family:var(--mono);font-size:11px;opacity:.6}
  .sc-rank em{font-style:normal;font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:1px 5px;background:#E4BB3F;color:#202521;margin-left:4px}
  .sc-bar{height:6px;background:var(--line)}.sc-bar i{display:block;height:100%;background:currentColor;opacity:.7}
  .sc-rank b{font-family:var(--mono);font-size:12px;text-align:right}
  .tbtn[data-sc]::after{content:attr(data-sc);margin-left:6px;font-size:10px;opacity:.6}
  .tbtn.is-best{box-shadow:inset 0 -3px 0 #E4BB3F}
  .tools.is-off{opacity:.3}
  .tbtn:disabled{opacity:.3;text-decoration:line-through;cursor:not-allowed}
  @media (width < 900px){.score{grid-template-columns:1fr}}`;
  const s = document.createElement('style'); s.textContent = css; document.head.append(s);
})();
