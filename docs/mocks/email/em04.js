// EM-04 · the quote emails as tickets. build(opts) returns one email's full HTML: tables and inline styles,
// no SVG, no CSS masks; images only for the wordmark, the W, and the perforation tiles (hosted on onaway.ca in
// production; here relative to the mock). Port to QuoteEmails.php once picked.
// Locked: Stamp · subtle all round (3px bites every 10px, as TS-02); a notched tear where a stub comes away.
//   kind    customer (Receipt) | team (Board ticket)
//   layout  masthead | centred | headline   receipt: three editorial arrangements of the same copy
//   title   sans | mono                     receipt: "Your request" in Instrument Sans or in mono caps
//   seal    tear | stub                     receipt: the W sits on the notched tear, or quietly in the stub
//   theme   light | dark                    board: Ticket Paper (the floral white) or Carbon
//   due     yellow | rust | kraft           board: the due chip
//   fonts   system | brand                  brand = Instrument Sans + Overpass Mono, as Apple Mail can show them

export const C = { paper: '#F7F2E7', face: '#EFE7D6', stub: '#EAE1CF', carbon: '#202521', yellow: '#E4BB3F', rust: '#A9503E', camel: '#B49A78',
  muted: '#5D625C', rule: '#C9C3B6', ruleDark: '#3F443F', paperDim: '#B9B8AE', unlit: '#2C312D', well: '#191D1A',
  lightRule: '#D9D3C7', lightWell: '#EFE7D6', lightUnlit: '#E0D9CB' };

export const D = {
  ref: 'ONA-2611-0042', service: 'Moving', first: 'Ada', name: 'Ada Lovelace',
  from: 'Mississauga', fromTag: 'L5B · Peel', to: 'Oakville', toTag: 'L6J · Halton',
  date: 'Mon, Nov 2, 2026', time: '2:15 PM EST',
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
const R = 3, P = 10; // Stamp · subtle

export function build(o) {
  const opts = { kind: 'customer', layout: 'headline', title: 'sans', seal: 'tear', theme: 'light', due: 'rust', fonts: 'system', base: 'email/assets/', ...o };
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

  /* --- the ticket: Stamp · subtle from tiles (Outlook desktop shows a clean edge), notched tears between sections --- */
  function ticket(sections, pageBg, seal = false) {
    const suf = pageBg === C.face ? '-face' : '';
    const tile = (side) => A(`edge-subtle${suf}-${side}.png`);
    const sideCell = (side, bg) => `<td width="${R}" style="width:${R}px;background-color:${bg};background-image:url('${tile(side)}');background-repeat:repeat-y;background-size:${R}px ${P}px;font-size:0;">&nbsp;</td>`;
    const edgeRow = (side, bg) => `<tr><td colspan="3" height="${R}" style="height:${R}px;font-size:0;line-height:0;background-color:${bg};background-image:url('${tile(side)}');background-repeat:repeat-x;background-size:${P}px ${R}px;">&nbsp;</td></tr>`;
    // the notch: half-circles across the two tints, a dashed tear between, the W optionally sealed on the line
    // (a cell can't round its corners in a collapsed table, so each quarter is a rounded block on the ticket tint)
    const N = 13;
    const q = (bg, radius) => `<td width="${N}" height="${N}" style="width:${N}px;height:${N}px;padding:0;background:${bg};font-size:0;line-height:0;"><div style="width:${N}px;height:${N}px;background:${pageBg};border-radius:${radius};font-size:0;line-height:0;">&nbsp;</div></td>`;
    const lineTop = (bg) => `<td style="background:${bg};border-bottom:1.5px dashed ${C.rule};font-size:0;">&nbsp;</td>`;
    const lineBot = (bg) => `<td style="background:${bg};font-size:0;">&nbsp;</td>`;
    const sealCell = `<td rowspan="2" width="42" style="width:42px;padding:0;font-size:0;line-height:0;"><img src="${A('w-tear.png')}" width="42" height="26" alt="" style="display:block;border:0;width:42px;height:26px;"></td>`;
    const seam = (up, down) => `<tr><td colspan="3" style="padding:0;">${T(
      // the W notch (round 3): each quarter's rounded corner faces the tear line, so the two lobes on each side
      // mirror one another, our W, cut into both edges
      `<tr>${q(up, `0 0 ${N}px 0`)}${lineTop(up)}${seal ? sealCell + lineTop(up) : ''}${q(up, `0 0 0 ${N}px`)}</tr>`
      + `<tr>${q(down, `0 ${N}px 0 0`)}${lineBot(down)}${seal ? lineBot(down) : ''}${q(down, `${N}px 0 0 0`)}</tr>`)}</td></tr>`;
    const rows = sections.map((s, i) => (i ? seam(sections[i - 1].bg, s.bg) : '') + `<tr>${sideCell('left', s.bg)}<td style="background-color:${s.bg};">${s.html}</td>${sideCell('right', s.bg)}</tr>`).join('');
    return T(edgeRow('top', sections[0].bg) + rows + edgeRow('bottom', sections[sections.length - 1].bg));
  }

  const symbol = (dark = false, s = 26) => `<img src="${A(dark ? 'w-paper.png' : 'w-carbon.png')}" width="${s}" height="${s}" alt="" style="display:block;border:0;width:${s}px;height:${s}px;">`;
  const wordmark = (w = 120, align = 'left') => `<img src="${A('wordmark-carbon.png')}" width="${w}" height="${Math.round(w * 56 / 300)}" alt="ONAWAY" ${align === 'center' ? 'align="center" ' : ''}style="display:block;border:0;width:${w}px;height:auto;${align === 'center' ? 'margin:0 auto;' : ''}${sans(16, C.carbon, 'font-weight:700;letter-spacing:0.06em;')}">`;
  function barcode(text, color, align = 'center') {
    let bars = '';
    for (const ch of text.replace(/-/g, '')) {
      const n = ch.charCodeAt(0);
      bars += `<td width="${(n % 3) + 1}" style="background:${color};"></td><td width="${((n >> 2) % 2) + 1}"></td><td width="${((n >> 1) % 2) + 2}" style="background:${color};"></td><td width="2"></td>`;
    }
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${align}" style="border-collapse:collapse;height:34px;"><tr style="height:34px;">${bars}</tr></table>`;
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
    const L = opts.layout;
    // the request's date: one line when centred, date over time beside the wordmark (so it never meets it on a phone)
    const meta = (align = 'left') => align === 'center'
      ? `<div style="${mono(11, C.muted, 'text-align:center;white-space:nowrap;')}">${D.date}<span style="color:${C.rule};">&nbsp;&nbsp;·&nbsp;&nbsp;</span>${D.time}</div>`
      : `<div style="${mono(11, C.muted, `text-align:${align};line-height:1.5;`)}"><span style="white-space:nowrap;">${D.date}</span><br><span style="white-space:nowrap;">${D.time}</span></div>`;
    const titleText = 'Your request';
    const title = (size, align = 'left') => opts.title === 'mono'
      ? `<div style="${mono(12, C.carbon, `font-weight:700;text-align:${align};`)}">${titleText}</div>`
      : `<div style="${sans(size, C.carbon, `font-weight:600;line-height:1.15;letter-spacing:-0.01em;text-align:${align};`)}">${titleText}</div>`;
    const row = (label, value) => `<tr><td valign="top" style="padding:8px 13px 8px 0;border-top:1px dashed ${C.rule};${mono(11, C.muted, 'white-space:nowrap;')}">${e(label)}</td>`
      + `<td valign="top" align="right" style="padding:8px 0;border-top:1px dashed ${C.rule};${sans(15, C.carbon, 'font-weight:600;')}">${nb(e(value))}</td></tr>`;
    const stack = (label, value, extra = '') => `<div style="${mono(11, C.muted)}">${e(label)}</div><div style="margin-top:4px;${sans(16, C.carbon, `font-weight:600;${extra}`)}">${nb(e(value))}</div>`;
    const promise = (size = 26) => `<div style="${mono(11, C.carbon, 'font-weight:700;')}">${square()}Quote in writing by</div>`
      + `<div style="margin-top:8px;${sans(size, C.carbon, 'font-weight:600;line-height:1.1;letter-spacing:-0.01em;')}">${nb(D.promised)}</div>`;

    let body;
    if (L === 'centred') {
      // The receipt, refined: wordmark and date centred, the title between hairlines, leaders, the promise
      body = `<div style="padding:34px 21px 0;">${wordmark(120, 'center')}${gap(13)}${meta('center')}</div>`
        + `<div style="padding:21px 21px 34px;">`
        + `<div style="padding:13px 0;border-top:1px solid ${C.carbon};border-bottom:1px solid ${C.carbon};">${title(20, 'center')}</div>`
        + T(row('Service', D.service) + row('From', D.from) + row('To', D.to) + row('When', D.whenShort), 'margin-top:13px;')
        + gap(34) + promise() + `</div>`;
    } else if (L === 'headline') {
      // Editorial: a headline that says the job in words, a meta line, a two-column grid, the promise set large
      body = `<div style="padding:26px 21px 0;">${T(`<tr><td valign="middle">${wordmark(96)}</td><td valign="middle" align="right">${meta('right')}</td></tr>`)}</div>`
        + `<div style="padding:34px 21px 34px;">`
        + (opts.title === 'mono' ? `<div style="${mono(11, C.muted, 'font-weight:700;')}">${titleText}</div>` : `<div style="${sans(15, C.muted, 'font-weight:600;')}">${titleText}</div>`)
        + `<div style="margin-top:8px;${sans(30, C.carbon, 'font-weight:600;line-height:1.1;letter-spacing:-0.015em;')}">${D.service}, ${D.from} <span style="color:${C.rust};">→</span> ${D.to}</div>`
        + gap(21)
        + T(`<tr><td valign="top" width="50%" style="padding:13px 13px 0 0;border-top:1px solid ${C.carbon};">${stack('When', D.whenShort)}</td><td valign="top" width="50%" style="padding:13px 0 0;border-top:1px solid ${C.carbon};">${stack('For a', 'Home')}</td></tr>`)
        + gap(34) + `<div style="padding:21px 0 0;border-top:1px dashed ${C.rule};">${promise(30)}</div></div>`;
    } else {
      // Masthead: wordmark left and the date right on one line, a rule, then the title and the job set like a page
      body = `<div style="padding:26px 21px 0;">${T(`<tr><td valign="bottom">${wordmark(108)}</td><td valign="bottom" align="right" style="padding-bottom:2px;">${meta('right')}</td></tr>`)}</div>`
        + `<div style="padding:13px 21px 0;">${T(`<tr><td style="border-top:1.5px solid ${C.carbon};font-size:0;line-height:0;">&nbsp;</td></tr>`)}</div>`
        + `<div style="padding:21px 21px 34px;">${title(26)}`
        + `<div style="margin-top:8px;${sans(17, C.muted, 'line-height:1.4;')}">${D.service} · ${D.from} → ${D.to}</div>`
        + T(row('When', D.whenShort) + row('For a', 'Home'), 'margin-top:21px;')
        + gap(34) + promise() + `</div>`;
    }
    // the stub: the ref on the left, the barcode on the right; the W joins them only when it isn't on the tear
    const stub = `<div style="padding:21px;">${T(`<tr>${opts.seal === 'stub' ? `<td valign="middle" width="26" style="padding-right:13px;">${symbol(false, 26)}</td>` : ''}<td valign="middle" style="${mono(12, C.carbon, 'font-weight:600;white-space:nowrap;')}">Ref ${D.ref}</td><td valign="middle" align="right">${barcode(D.ref, C.carbon, 'right')}</td></tr>`)}</div>`;
    const p = `margin:0 0 21px;${sans(17, C.carbon, 'line-height:1.55;')}`;
    const top = `<p style="${p}">Got it, ${D.first}.</p><p style="${p}">Your request <span style="font-family:${MONO};font-size:15px;white-space:nowrap;">${D.ref}</span> is in. You’ll have your quote in writing by <b>${nb(D.promised)}</b>.</p>`;
    const call = `<p style="${p}margin:0;">Rather talk? Call <a href="tel:${D.tel}" style="color:${C.carbon};text-decoration:underline;white-space:nowrap;">${D.phone}</a>.</p>`;
    return page(`We've got your request`, C.paper, preheader(`Your quote is coming by ${D.promised}.`) + top + gap(13)
      + ticket([{ html: body, bg: C.face }, { html: stub, bg: C.stub }], C.paper, opts.seal === 'tear') + gap(34) + call, 480);
  }

  /* ============ TEAM · Board ticket (light or dark, no stub) ============ */
  function board() {
    const light = opts.theme === 'light';
    const t = light
      ? { face: C.paper, page: C.face, ink: C.carbon, mut: C.muted, rule: C.lightRule, well: C.lightWell, on: C.carbon, off: C.lightUnlit }
      : { face: C.carbon, page: C.paper, ink: C.paper, mut: C.paperDim, rule: C.ruleDark, well: C.well, on: C.yellow, off: C.unlit };
    const row = (label, value, o2 = {}) => `<tr><td valign="top" width="34%" style="padding:13px 13px 13px 0;border-top:1px solid ${t.rule};${mono(11, t.mut)}">${e(label)}</td>`
      + `<td valign="top" style="padding:13px 0;border-top:1px solid ${t.rule};${sans(16, t.ink, o2.weight ? `font-weight:${o2.weight};` : '')}">${nb(e(value))}</td></tr>`;
    // sub-headings in Instrument Sans caps, like the site's headings
    const sub = (s) => `<tr><td colspan="2" style="padding:34px 0 8px;${sans(20, t.ink, 'font-weight:600;line-height:1.1;text-transform:uppercase;letter-spacing:0.02em;')}">${s}</td></tr>`;
    const dueText = `Due ${D.promisedShort} ${D.zone}`;
    const chips = {
      yellow: `<span style="display:inline-block;padding:5px 10px;background:${C.yellow};${mono(11, C.carbon, 'font-weight:700;white-space:nowrap;')}">${dueText}</span>`,
      // boutique: a double hairline in Rust, wide tracking, no fill
      rust: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right" style="border-collapse:separate;"><tr><td style="padding:2px;border:1px solid ${C.rust};"><div style="padding:4px 10px;border:1px solid ${C.rust};${mono(10, light ? C.rust : C.paper, 'font-weight:600;letter-spacing:0.2em;white-space:nowrap;')}">${dueText}</div></td></tr></table>`,
      kraft: `<span style="display:inline-block;padding:5px 10px;background:${C.camel};${mono(11, C.carbon, 'font-weight:700;white-space:nowrap;')}">${dueText}</span>`,
    };
    const header = T(`<tr><td width="26" valign="middle">${symbol(!light, 26)}</td><td valign="middle" style="padding-left:13px;${mono(11, t.mut)}">ONAWAY · Arrivals · ${D.service}</td><td align="right" valign="middle">${chips[opts.due]}</td></tr>`);
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
