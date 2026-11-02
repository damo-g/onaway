// EM-03 · the quote emails as tickets. build(opts) returns one email's full HTML: tables and inline styles,
// no SVG, no CSS masks; images only for the logo, the perforation tiles and the clock (hosted on onaway.ca in
// production; here relative to the mock). Port to QuoteEmails.php once picked.
//   kind    customer (Receipt) | team (Board ticket)
//   edge    subtle | medium | edge     outer stamp edge: 3px every 10px (TS-02) · 4px every 12px · 5px every 15px
//   theme   dark | light               board only: Carbon, or Ticket Paper (the floral white)
//   due     yellow | rust              board only: the due chip, or Rust with the Hugeicons clock
//   fonts   system | brand             brand = Instrument Sans + Overpass Mono, as Apple Mail can show them
// Where the receipt meets its stub the edge is always notched, never stamped.

export const C = { paper: '#F7F2E7', face: '#EFE7D6', stub: '#EAE1CF', carbon: '#202521', yellow: '#E4BB3F', rust: '#A9503E',
  muted: '#5D625C', rule: '#C9C3B6', ruleDark: '#3F443F', paperDim: '#B9B8AE', unlit: '#2C312D', well: '#191D1A',
  lightRule: '#D9D3C7', lightWell: '#EFE7D6', lightUnlit: '#E0D9CB' };

export const D = {
  ref: 'ONA-2611-0042', service: 'Moving', first: 'Ada', name: 'Ada Lovelace',
  from: 'Mississauga', fromTag: 'L5B · Peel', to: 'Oakville', toTag: 'L6J · Halton',
  received: 'Mon, Nov 2, 2:15 PM EST', quoteBy: 'Mon, Nov 2, 4:15 PM EST', promised: '4:15 PM today', promisedShort: '4:15 PM', zone: 'EST',
  when: 'Wed, Nov 4, 2026 · flexible', whenShort: 'Wed, Nov 4',
  job: [['Service', 'Moving'], ['For a', 'Home'], ['Size', '1–2 bedroom'], ['Getting in and out', 'Stairs only']],
  contact: [['Name', 'Ada Lovelace'], ['Phone', '(416) 555-0100'], ['Email', 'ada@example.com'], ['Prefers', 'Text']],
  notes: 'Piano on the third floor. Street parking only.',
  sent: [['Device', 'Phone · iOS 18.1 · Safari 18'], ['IP', '203.0.113.9'], ['Location', 'Mississauga, Ontario, Canada (approx., from IP)']],
  phone: '+1 647 877 1411', tel: '+16478771411',
};

const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// times break between the day and the time, never inside
const nb = (s) => s.replace(/(\d{1,2}:\d{2} [AP]M(?: [A-Z]{3})?(?: today| tomorrow)?)/g, '<span style="white-space:nowrap;">$1</span>');
const T = (inner, style = '') => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${style}">${inner}</table>`;
const gap = (h) => `<div style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</div>`;
const EDGE = { subtle: [3, 10], medium: [4, 12], edge: [5, 15] };

export function build(o) {
  const opts = { kind: 'customer', edge: 'subtle', theme: 'dark', due: 'yellow', fonts: 'system', base: 'email/assets/', ...o };
  const A = (f) => opts.base + f;
  const SANS = (opts.fonts === 'brand' ? "'Instrument Sans', " : '') + "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const MONO = (opts.fonts === 'brand' ? "'Overpass Mono', " : '') + "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace";
  const stretch = opts.fonts === 'brand' ? 'font-stretch:87.5%;' : '';
  const mono = (size, color, extra = '') => `font-family:${MONO};font-size:${size}px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;color:${color};${extra}`;
  const sans = (size, color, extra = '') => `font-family:${SANS};${stretch}font-size:${size}px;line-height:1.45;color:${color};${extra}`;
  const square = (color = C.yellow) => `<span style="display:inline-block;width:8px;height:8px;margin-right:8px;background:${color};vertical-align:1px;"></span>`;
  const fontsHead = opts.fonts === 'brand' ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&family=Overpass+Mono:wght@400;600&display=swap">` : '';
  const page = (title, bg, inner, width = 560) => `<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">${fontsHead}<title>${e(title)}</title></head>`
    + `<body style="margin:0;padding:0;background:${bg};">`
    + T(`<tr><td align="center" style="padding:34px 16px;">${T(`<tr><td align="left">${inner}</td></tr>`, `max-width:${width}px;`)}</td></tr>`, `background:${bg};`)
    + `</body></html>`;
  const preheader = (t) => `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(t)}</div>`;

  /* --- the ticket: stamped outer edge from tiles (Outlook desktop shows a clean edge), notched seams --- */
  const [R, P] = EDGE[opts.edge];
  // sections: [{ html, bg }]; pageBg decides the bite colour (paper, or the face tint behind a light ticket)
  function ticket(sections, pageBg) {
    const suf = pageBg === C.face ? '-face' : '';
    const tile = (side) => A(`edge-${opts.edge}${suf}-${side}.png`);
    const sideCell = (side, bg) => `<td width="${R}" style="width:${R}px;background-color:${bg};background-image:url('${tile(side)}');background-repeat:repeat-y;background-size:${R}px ${P}px;font-size:0;">&nbsp;</td>`;
    const edgeRow = (side, bg) => `<tr><td colspan="3" height="${R}" style="height:${R}px;font-size:0;line-height:0;background-color:${bg};background-image:url('${tile(side)}');background-repeat:repeat-x;background-size:${P}px ${R}px;">&nbsp;</td></tr>`;
    // the notch: two half rows, so each half-circle sits across the two tints; the tear line is dashed
    const N = 13;
    // (a cell can't round its corners in a collapsed table, so each quarter is a rounded block on the ticket tint)
    const q = (bg, radius) => `<td width="${N}" height="${N}" style="width:${N}px;height:${N}px;padding:0;background:${bg};font-size:0;line-height:0;"><div style="width:${N}px;height:${N}px;background:${pageBg};border-radius:${radius};font-size:0;line-height:0;">&nbsp;</div></td>`;
    const seam = (up, down) => `<tr><td colspan="3" style="padding:0;">${T(
      `<tr>${q(up, `0 0 ${N}px 0`)}<td style="background:${up};border-bottom:1.5px dashed ${C.rule};font-size:0;">&nbsp;</td>${q(up, `0 0 0 ${N}px`)}</tr>`
      + `<tr>${q(down, `0 ${N}px 0 0`)}<td style="background:${down};font-size:0;">&nbsp;</td>${q(down, `${N}px 0 0 0`)}</tr>`)}</td></tr>`;
    const rows = sections.map((s, i) => (i ? seam(sections[i - 1].bg, s.bg) : '') + `<tr>${sideCell('left', s.bg)}<td style="background-color:${s.bg};">${s.html}</td>${sideCell('right', s.bg)}</tr>`).join('');
    return T(edgeRow('top', sections[0].bg) + rows + edgeRow('bottom', sections[sections.length - 1].bg));
  }

  const symbol = (dark = false, s = 34) => `<img src="${A(dark ? 'w-paper.png' : 'w-carbon.png')}" width="${s}" height="${s}" alt="" style="display:block;border:0;width:${s}px;height:${s}px;">`;
  const logo = (w = 120) => `<img src="${A('wordmark-carbon.png')}" width="${w}" height="${Math.round(w * 56 / 300)}" alt="ONAWAY" style="display:block;border:0;width:${w}px;height:auto;${sans(16, C.carbon, 'font-weight:700;letter-spacing:0.06em;')}">`;
  function barcode(text, color) {
    let bars = '';
    for (const ch of text.replace(/-/g, '')) {
      const n = ch.charCodeAt(0);
      bars += `<td width="${(n % 3) + 1}" style="background:${color};"></td><td width="${((n >> 2) % 2) + 1}"></td><td width="${((n >> 1) % 2) + 2}" style="background:${color};"></td><td width="2"></td>`;
    }
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="border-collapse:collapse;height:34px;"><tr style="height:34px;">${bars}</tr></table>`;
  }

  // Dot matrix: one cell per dot, colour as an attribute, 1px gaps from cellspacing (stays well under Gmail's 102 KB clip)
  const GLYPH = {
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], '-': ['000', '000', '000', '111', '000', '000', '000'],
    0: ['01110', '10011', '10101', '10101', '11001', '10001', '01110'], 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    2: ['01110', '10001', '00001', '00110', '01000', '10000', '11111'], 3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], 5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], 7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], 9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  };
  function matrix(text, on, off, dot = 3) {
    const chars = [...text].map((c) => GLYPH[c] || GLYPH['-']);
    const td = (c) => `<td width="${dot}" height="${dot}" bgcolor="${c}" style="font-size:0;line-height:0"></td>`;
    const blank = `<td width="${dot}" style="font-size:0;line-height:0"></td>`;
    let rows = '';
    for (let y = 0; y < 7; y++) rows += '<tr>' + chars.map((g) => [...g[y]].map((b) => td(b === '1' ? on : off)).join('')).join(blank) + '</tr>';
    return `<table role="presentation" cellpadding="0" cellspacing="1" border="0" aria-label="${e(text)}">${rows}</table>`;
  }

  /* ============ CUSTOMER · Receipt ============ */
  function receipt() {
    const row = (label, value) => `<tr><td valign="top" style="padding:8px 13px 8px 0;border-top:1px dashed ${C.rule};${mono(12, C.muted, 'white-space:nowrap;')}">${e(label)}</td>`
      + `<td valign="top" align="right" style="padding:8px 0;border-top:1px dashed ${C.rule};${sans(15, C.carbon, 'font-weight:600;')}">${nb(e(value))}</td></tr>`;
    const p = `margin:0 0 21px;${sans(17, C.carbon, 'line-height:1.55;')}`;
    const top = `<p style="${p}">Got it, ${D.first}.</p><p style="${p}">Your request <span style="font-family:${MONO};font-size:15px;white-space:nowrap;">${D.ref}</span> is in. You’ll have your quote in writing by <b>${nb(D.promised)}</b>.</p>`;
    const call = `<p style="${p}margin:0;">Rather talk? Call <a href="tel:${D.tel}" style="color:${C.carbon};text-decoration:underline;white-space:nowrap;">${D.phone}</a>.</p>`;
    const body = `<div style="padding:34px 21px 0;text-align:center;">`
      + `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center">${symbol(false, 34)}</td></tr><tr><td height="13"></td></tr><tr><td align="center">${logo(120)}</td></tr></table>`
      + `<div style="margin-top:13px;${mono(11, C.muted)}">Cleaning · Moving · Delivery · GTA</div></div>`
      + `<div style="padding:21px 21px 34px;">`
      + `<div style="padding:13px 0;border-top:1.5px solid ${C.carbon};border-bottom:1.5px solid ${C.carbon};text-align:center;${mono(12, C.carbon, 'font-weight:700;')}">Your request</div>`
      + T(row('Service', D.service) + row('From', D.from) + row('To', D.to) + row('When', D.whenShort), 'margin-top:13px;')
      + `<div style="margin-top:34px;${mono(12, C.carbon, 'font-weight:700;')}">${square()}Quote in writing by</div>`
      + `<div style="margin-top:8px;${sans(26, C.carbon, 'font-weight:600;line-height:1.1;')}">${nb(D.promised)}</div></div>`;
    const stub = `<div style="padding:21px;text-align:center;">${barcode(D.ref, C.carbon)}<div style="margin-top:8px;${mono(12, C.carbon, 'font-weight:600;')}">Ref ${D.ref}</div></div>`;
    return page(`We've got your request`, C.paper, preheader(`Your quote is coming by ${D.promised}.`) + top + gap(13)
      + ticket([{ html: body, bg: C.face }, { html: stub, bg: C.stub }], C.paper) + gap(34) + call, 480);
  }

  /* ============ TEAM · Board ticket (dark or light, no stub) ============ */
  function board() {
    const light = opts.theme === 'light';
    const t = light
      ? { face: C.paper, page: C.face, ink: C.carbon, mut: C.muted, rule: C.lightRule, well: C.lightWell, on: C.carbon, off: C.lightUnlit }
      : { face: C.carbon, page: C.paper, ink: C.paper, mut: C.paperDim, rule: C.ruleDark, well: C.well, on: C.yellow, off: C.unlit };
    const row = (label, value, o2 = {}) => `<tr><td valign="top" width="34%" style="padding:13px 13px 13px 0;border-top:1px solid ${t.rule};${mono(11, t.mut)}">${e(label)}</td>`
      + `<td valign="top" style="padding:13px 0;border-top:1px solid ${t.rule};${sans(16, t.ink, o2.weight ? `font-weight:${o2.weight};` : '')}">${nb(e(value))}</td></tr>`;
    const sub = (s) => `<tr><td colspan="2" style="padding:34px 0 8px;${sans(20, t.ink, 'font-weight:600;line-height:1.2;')}">${s}</td></tr>`;
    // the due chip: Yellow, or Rust with the clock (Hugeicons clock-01 as a PNG; Gmail shows no SVG)
    const chip = opts.due === 'rust'
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right" style="border-collapse:collapse;"><tr><td style="padding:5px 8px 5px 8px;background:${C.rust};"><img src="${A('clock-paper.png')}" width="13" height="13" alt="" style="display:inline-block;border:0;width:13px;height:13px;vertical-align:-2px;margin-right:6px;"><span style="${mono(11, C.paper, 'font-weight:700;white-space:nowrap;')}">Due ${D.promisedShort} ${D.zone}</span></td></tr></table>`
      : `<span style="display:inline-block;padding:4px 8px;background:${C.yellow};${mono(11, C.carbon, 'font-weight:700;white-space:nowrap;')}">Due ${D.promisedShort} ${D.zone}</span>`;
    const header = T(`<tr><td width="26" valign="middle">${symbol(!light, 26)}</td><td valign="middle" style="padding-left:13px;${mono(11, t.mut)}">ONAWAY · Arrivals · ${D.service}</td><td align="right" valign="middle">${chip}</td></tr>`);
    const rows = row('Route', `${D.from} → ${D.to}`, { weight: 700 }) + row('Received', D.received) + row('Quote by', D.quoteBy)
      + sub('Job') + D.job.map(([k, v]) => row(k, v)).join('')
      + sub('When') + row('When', D.when)
      + sub('Contact') + D.contact.map(([k, v]) => row(k, v)).join('')
      + sub('Notes') + row('Notes', D.notes)
      + sub('Sent from') + D.sent.map(([k, v]) => row(k, v)).join('');
    const body = `<div style="padding:21px 21px 34px;">${header}${gap(21)}`
      + `<div style="display:inline-block;padding:13px;background:${t.well};border-radius:3px;">${matrix(D.ref, t.on, t.off)}</div>${gap(21)}${T(rows)}</div>`;
    return page(`New quote request ${D.ref}`, t.page, preheader(`${D.service} · ${D.from} → ${D.to} · due ${D.promisedShort}`) + ticket([{ html: body, bg: t.face }], t.page));
  }

  return opts.kind === 'team' ? board() : receipt();
}
