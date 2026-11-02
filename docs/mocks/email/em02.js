// EM-02 · the quote emails as tickets. build(opts) returns one email's full HTML: tables, inline styles,
// no SVG, no CSS masks, images only for the logo, the perforation and the kraft grain (hosted on
// onaway.ca in production; here relative to the mock). Runs in the gallery; port to QuoteEmails.php once picked.
//   style   receipt | board | pass
//   kind    customer | team
//   edge    subtle | edge | notch | plain   (TS-02's Stamp · subtle is 3px bites every 10px; Stamp edge 5px every 15px)
//   surface paper | stub | kraft            (stub = kraft stub only)
//   ref     matrix | flap                   (board only)
//   fonts   system | brand                  (brand = Instrument Sans + Overpass Mono, as Apple Mail would show them)

export const C = { paper: '#F7F2E7', face: '#EFE7D6', stub: '#EAE1CF', carbon: '#202521', yellow: '#E4BB3F', rust: '#A9503E', camel: '#B49A78',
  muted: '#5D625C', rule: '#C9C3B6', ruleDark: '#3F443F', paperDim: '#B9B8AE', unlit: '#2C312D', kraftInk: '#3A3730', kraftRule: '#8F7A5E' };

export const D = {
  ref: 'ONA-2611-0042', service: 'Moving', first: 'Ada', name: 'Ada Lovelace',
  from: 'Mississauga', fromTag: 'L5B · Peel', to: 'Oakville', toTag: 'L6J · Halton',
  received: 'Mon, Nov 2, 2:15 PM EST', quoteBy: 'Mon, Nov 2, 4:15 PM EST', promised: '4:15 PM today', promisedShort: '4:15 PM',
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
const T = (inner, style = '', attrs = '') => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${attrs} style="border-collapse:collapse;${style}">${inner}</table>`;
const gap = (h) => `<div style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</div>`;

export function build(o) {
  const opts = { style: 'receipt', kind: 'customer', edge: 'subtle', surface: 'paper', ref: 'matrix', fonts: 'system', base: 'email/assets/', ...o };
  const A = (f) => opts.base + f;
  const SANS = (opts.fonts === 'brand' ? "'Instrument Sans', " : '') + "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const MONO = (opts.fonts === 'brand' ? "'Overpass Mono', " : '') + "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace";
  const stretch = opts.fonts === 'brand' ? 'font-stretch:87.5%;' : '';
  const mono = (size, color, extra = '') => `font-family:${MONO};font-size:${size}px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;color:${color};${extra}`;
  const sans = (size, color, extra = '') => `font-family:${SANS};${stretch}font-size:${size}px;line-height:1.45;color:${color};${extra}`;
  const square = (color = C.yellow) => `<span style="display:inline-block;width:8px;height:8px;margin-right:8px;background:${color};vertical-align:1px;"></span>`;

  // Surfaces: the ticket face, its stub, and the ink on each
  const kraftFace = { bg: C.camel, img: A('kraft.jpg'), ink: C.carbon, mut: C.kraftInk, rule: C.kraftRule };
  const paperFace = { bg: C.face, img: '', ink: C.carbon, mut: C.muted, rule: C.rule };
  const face = opts.surface === 'kraft' ? kraftFace : paperFace;
  const stub = opts.surface === 'paper' ? { ...paperFace, bg: C.stub } : opts.surface === 'stub' ? kraftFace : { ...paperFace, bg: C.face };
  const bgStyle = (s) => `background-color:${s.bg};${s.img ? `background-image:url('${s.img}');` : ''}`;

  // --- the ticket: perforated edges from tiles (Outlook desktop shows a clean edge instead) ---
  const R = opts.edge === 'edge' ? 5 : 3;
  const tile = (side) => A(`edge-${opts.edge === 'edge' ? 'edge' : 'subtle'}-${side}.png`);
  function ticket(sections, bg = face) {
    // sections: [{ html, surface }] separated by perforation seams
    const stamp = opts.edge === 'subtle' || opts.edge === 'edge';
    const rows = sections.map((s, i) => {
      const sf = s.surface || bg;
      const seam = i === 0 ? '' : stamp
        ? `<tr><td colspan="3" height="${R * 2}" style="height:${R * 2}px;font-size:0;line-height:0;${bgStyle(sections[i - 1].surface || bg)}background-image:url('${tile('holes')}');background-repeat:repeat-x;background-size:${opts.edge === 'edge' ? 15 : 10}px ${R * 2}px;">&nbsp;</td></tr>`
        : opts.edge === 'notch'
          ? `<tr><td colspan="3" style="padding:0;${bgStyle(sf)}">${T(`<tr><td width="13" style="width:13px;height:26px;background:${C.paper};border-radius:0 13px 13px 0;font-size:0;">&nbsp;</td><td style="padding:0 8px;">${T(`<tr><td style="border-top:2px dashed ${sf.rule};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>`)}</td><td width="13" style="width:13px;height:26px;background:${C.paper};border-radius:13px 0 0 13px;font-size:0;">&nbsp;</td></tr>`)}</td></tr>`
          : `<tr><td colspan="3" style="${bgStyle(sf)}padding:0 21px;">${T(`<tr><td style="border-top:1.5px dashed ${sf.rule};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>`)}</td></tr>`;
      const side = (s2) => stamp ? `<td width="${R}" style="width:${R}px;${bgStyle(sf)}background-image:url('${tile(s2)}');background-repeat:repeat-y;background-size:${R}px ${opts.edge === 'edge' ? 15 : 10}px;font-size:0;">&nbsp;</td>` : '';
      return seam + `<tr>${side('left')}<td style="${bgStyle(sf)}">${s.html}</td>${side('right')}</tr>`;
    }).join('');
    const edgeRow = (s2, sf) => `<tr><td colspan="3" height="${R}" style="height:${R}px;font-size:0;line-height:0;${bgStyle(sf)}background-image:url('${tile(s2)}');background-repeat:repeat-x;background-size:${opts.edge === 'edge' ? 15 : 10}px ${R}px;">&nbsp;</td></tr>`;
    const stamp2 = opts.edge === 'subtle' || opts.edge === 'edge';
    return T((stamp2 ? edgeRow('top', sections[0].surface || bg) : '') + rows + (stamp2 ? edgeRow('bottom', sections[sections.length - 1].surface || bg) : ''),
      opts.edge === 'notch' ? 'border-radius:6px;overflow:hidden;' : '');
  }

  const logo = (dark = false, w = 120) => `<img src="${A(dark ? 'wordmark-paper.png' : 'wordmark-carbon.png')}" width="${w}" height="${Math.round(w * 56 / 300)}" alt="ONAWAY" style="display:block;border:0;width:${w}px;height:auto;${sans(16, dark ? C.paper : C.carbon, 'font-weight:700;letter-spacing:0.06em;')}">`;
  const symbol = (dark = false, s = 34) => `<img src="${A(dark ? 'w-paper.png' : 'w-carbon.png')}" width="${s}" height="${s}" alt="" style="display:block;border:0;width:${s}px;height:${s}px;">`;
  const telLink = (color) => `<a href="tel:${D.tel}" style="color:${color};text-decoration:underline;white-space:nowrap;">${D.phone}</a>`;
  const words = (size = 18) => {
    const p = `margin:0 0 21px;${sans(size, C.carbon, 'line-height:1.55;')}`;
    return {
      top: `<p style="${p}">Got it, ${D.first}.</p><p style="${p}">Your request <span style="font-family:${MONO};font-size:${size - 2}px;white-space:nowrap;">${D.ref}</span> is in. You’ll have your quote in writing by <b>${nb(D.promised)}</b>.</p>`,
      call: `<p style="${p}margin:0;">Rather talk? Call ${telLink(C.carbon)}.</p>`,
    };
  };
  const preheader = (t) => `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(t)}</div>`;
  const fontsHead = opts.fonts === 'brand'
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&family=Overpass+Mono:wght@400;600&display=swap">`
    : '';
  const page = (title, inner, width = 560) => `<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">${fontsHead}<title>${e(title)}</title></head>`
    + `<body style="margin:0;padding:0;background:${C.paper};">`
    + T(`<tr><td align="center" style="padding:34px 16px;">${T(`<tr><td align="left">${inner}</td></tr>`, `max-width:${width}px;`)}</td></tr>`, `background:${C.paper};`)
    + `</body></html>`;

  // Barcode from the ref's characters (decorative)
  function barcode(text, color) {
    let bars = '';
    for (const ch of text.replace(/-/g, '')) {
      const n = ch.charCodeAt(0);
      bars += `<td width="${(n % 3) + 1}" style="background:${color};"></td><td width="${((n >> 2) % 2) + 1}"></td><td width="${((n >> 1) % 2) + 2}" style="background:${color};"></td><td width="2"></td>`;
    }
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="border-collapse:collapse;height:34px;"><tr style="height:34px;">${bars}</tr></table>`;
  }

  // Dot matrix: 5×7 glyphs as table cells, lit in yellow, unlit just visible (works with images off)
  const GLYPH = {
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], '-': ['000', '000', '000', '111', '000', '000', '000'],
    0: ['01110', '10011', '10101', '10101', '11001', '10001', '01110'], 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    2: ['01110', '10001', '00001', '00110', '01000', '10000', '11111'], 3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], 5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], 7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], 9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  };
  // One cell per dot, colour as an attribute, 1px gaps from cellspacing: square LEDs, about 25 KB for a ref
  // (round dots cost four times the bytes and would push the email past Gmail's 102 KB clip)
  function matrix(text, dot = 3, on = C.yellow, off = C.unlit) {
    const chars = [...text].map((c) => GLYPH[c] || GLYPH['-']);
    const td = (c) => `<td width="${dot}" height="${dot}" bgcolor="${c}" style="font-size:0;line-height:0"></td>`;
    const blank = `<td width="${dot}" style="font-size:0;line-height:0"></td>`;
    let rows = '';
    for (let y = 0; y < 7; y++) {
      rows += '<tr>' + chars.map((g) => [...g[y]].map((b) => td(b === '1' ? on : off)).join('')).join(blank) + '</tr>';
    }
    return `<table role="presentation" cellpadding="0" cellspacing="1" border="0" aria-label="${e(text)}">${rows}</table>`;
  }
  const flaps = (text, size = 18) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>${[...text].map((ch) => ch === '-'
    ? `<td style="width:8px;text-align:center;${mono(size, C.paperDim, 'letter-spacing:0;')}">–</td>`
    : `<td style="padding:0 1px;"><div style="width:${size + 4}px;padding:6px 0;background:${C.unlit};border-top:1px solid #3A403B;border-radius:2px;text-align:center;font-family:${MONO};font-size:${size}px;font-weight:700;line-height:1.2;color:${C.paper};">${ch}</div></td>`).join('')}</tr></table>`;

  /* ============ RECEIPT (D, on brand) ============ */
  function receipt() {
    const f = face;
    const row = (label, value, sf = f) => `<tr><td valign="top" style="padding:8px 13px 8px 0;border-top:1px dashed ${sf.rule};${mono(12, sf.mut, 'white-space:nowrap;')}">${e(label)}</td>`
      + `<td valign="top" align="right" style="padding:8px 0;border-top:1px dashed ${sf.rule};${sans(15, sf.ink, 'font-weight:600;')}">${nb(e(value))}</td></tr>`;
    const head = (t) => `<div style="margin:34px 0 8px;${sans(20, f.ink, 'font-weight:600;line-height:1.2;')}">${t}</div>`;
    const top = `<div style="padding:34px 21px 0;text-align:center;">`
      + `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center">${symbol(false, 34)}</td></tr><tr><td height="13"></td></tr><tr><td align="center">${logo(false, 120)}</td></tr></table>`
      + `<div style="margin-top:13px;${mono(11, f.mut)}">Cleaning · Moving · Delivery · GTA</div></div>`;
    const stubHtml = (label) => `<div style="padding:21px;text-align:center;">${barcode(D.ref, stub.ink)}<div style="margin-top:8px;${mono(12, stub.ink, 'font-weight:600;')}">${label} ${D.ref}</div></div>`;
    if (opts.kind === 'team') {
      const body = top + `<div style="padding:21px 21px 34px;">`
        + `<div style="padding:13px 0;border-top:1.5px solid ${f.ink};border-bottom:1.5px solid ${f.ink};text-align:center;${mono(12, f.ink, 'font-weight:700;')}">Quote request · ${D.service}</div>`
        + T(row('Received', D.received) + row('Quote by', D.quoteBy), 'margin-top:13px;')
        + head(`Job <span style="color:${f.mut};font-weight:400;">· ${D.from} → ${D.to}</span>`) + T(D.job.map(([k, v]) => row(k, v)).join('') + row('From', `${D.from} · ${D.fromTag}`) + row('To', `${D.to} · ${D.toTag}`))
        + head('When') + T(row('When', D.when))
        + head('Contact') + T(D.contact.map(([k, v]) => row(k, v)).join(''))
        + head('Notes') + `<div style="padding-top:8px;border-top:1px dashed ${f.rule};${sans(15, f.ink, 'line-height:1.5;')}">${e(D.notes)}</div>`
        + head('Sent from') + T(D.sent.map(([k, v]) => row(k, v)).join(''))
        + `</div>`;
      return page(`New quote request ${D.ref}`, preheader(`${D.service} · ${D.from} → ${D.to} · ${D.whenShort}`) + ticket([{ html: body }, { html: stubHtml('Ref'), surface: stub }]), 480);
    }
    const w = words(17);
    const body = top + `<div style="padding:21px 21px 34px;">`
      + `<div style="padding:13px 0;border-top:1.5px solid ${f.ink};border-bottom:1.5px solid ${f.ink};text-align:center;${mono(12, f.ink, 'font-weight:700;')}">Your request</div>`
      + T(row('Service', D.service) + row('From', D.from) + row('To', D.to) + row('When', D.whenShort), 'margin-top:13px;')
      + `<div style="margin-top:34px;${mono(12, f.ink, 'font-weight:700;')}">${square()}Quote in writing by</div>`
      + `<div style="margin-top:8px;${sans(26, f.ink, 'font-weight:600;line-height:1.1;')}">${nb(D.promised)}</div></div>`;
    return page(`We've got your request`, preheader(`Your quote is coming by ${D.promised}.`) + w.top + gap(13) + ticket([{ html: body }, { html: stubHtml('Ref'), surface: stub }]) + gap(34) + w.call, 480);
  }

  /* ============ BOARD (B as a ticket) ============ */
  function board() {
    const dark = { bg: C.carbon, img: '', ink: C.paper, mut: C.paperDim, rule: C.ruleDark };
    const row = (label, value, opts2 = {}) => `<tr><td valign="top" width="34%" style="padding:13px 13px 13px 0;border-top:1px solid ${C.ruleDark};${mono(11, C.paperDim)}">${e(label)}</td>`
      + `<td valign="top" style="padding:13px 0;border-top:1px solid ${C.ruleDark};${sans(16, C.paper, opts2.weight ? `font-weight:${opts2.weight};` : '')}">${opts2.html ? value : nb(e(value))}</td></tr>`;
    const sub = (t) => `<tr><td colspan="2" style="padding:34px 0 8px;${sans(20, C.paper, 'font-weight:600;line-height:1.2;')}">${t}</td></tr>`;
    const chip = (t) => `<span style="display:inline-block;padding:4px 8px;background:${C.yellow};${mono(11, C.carbon, 'font-weight:700;white-space:nowrap;')}">${t}</span>`;
    const refShow = opts.ref === 'matrix'
      ? `<div style="display:inline-block;padding:13px;background:#191D1A;border-radius:3px;">${matrix(D.ref)}</div>`
      : flaps(D.ref);
    const header = (title, right) => T(`<tr><td width="34" valign="middle">${symbol(true, 26)}</td><td valign="middle" style="padding-left:13px;${mono(11, C.paperDim)}">ONAWAY · ${title}</td><td align="right" valign="middle">${right}</td></tr>`);
    const stubHtml = (left, right) => `<div style="padding:21px;">${T(`<tr><td valign="bottom"><div style="${mono(11, stub.mut)}">${left[0]}</div><div style="margin-top:4px;font-family:${MONO};font-size:18px;font-weight:700;letter-spacing:0.04em;color:${stub.ink};white-space:nowrap;">${left[1]}</div></td>`
      + `<td valign="bottom" align="right"><div style="${mono(11, stub.mut)}">${right[0]}</div><div style="margin-top:4px;${sans(16, stub.ink, 'font-weight:700;white-space:nowrap;')}">${right[1]}</div></td></tr>`)}</div>`;
    if (opts.kind === 'team') {
      const rows = row('Route', `${D.from} → ${D.to}`, { weight: 700 }) + row('Received', D.received) + row('Quote by', D.quoteBy)
        + sub('Job') + D.job.map(([k, v]) => row(k, v)).join('')
        + sub('When') + row('When', D.when)
        + sub('Contact') + D.contact.map(([k, v]) => row(k, v)).join('')
        + sub('Notes') + row('Notes', D.notes)
        + sub('Sent from') + D.sent.map(([k, v]) => row(k, v)).join('');
      const body = `<div style="padding:21px 21px 34px;">${header(`Arrivals · ${D.service}`, chip(`Due ${D.promisedShort}`))}${gap(21)}${refShow}${gap(21)}${T(rows)}</div>`;
      return page(`New quote request ${D.ref}`, preheader(`${D.service} · ${D.from} → ${D.to}`) + ticket([{ html: body, surface: dark }, { html: stubHtml(['Ref', D.ref], ['Quote by', D.promised]), surface: stub }], dark));
    }
    const w = words();
    const rows = row('Service', D.service) + row('Route', `${D.from} → ${D.to}`) + row('When', D.whenShort)
      + row('Status', `${square()}Quote in writing by ${nb(D.promised)}`, { html: true, weight: 700 });
    const body = `<div style="padding:21px 21px 34px;">${header('Your request', `<span style="${mono(11, C.paperDim)}">On time</span>`)}${gap(21)}${refShow}${gap(21)}${T(rows)}</div>`;
    return page(`We've got your request`, preheader(`Your quote is coming by ${D.promised}.`) + w.top + gap(13)
      + ticket([{ html: body, surface: dark }, { html: stubHtml(['Ref', D.ref], ['In writing by', D.promised]), surface: stub }], dark) + gap(34) + w.call);
  }

  /* ============ PASS (A, iterated) ============ */
  function pass() {
    const f = face;
    const cell = (label, value, o2 = {}) => `<td valign="top" ${o2.colspan ? `colspan="${o2.colspan}"` : 'width="50%"'} style="padding:13px 21px;border-top:1px dashed ${f.rule};">`
      + `<div style="${mono(11, f.mut)}">${e(label)}</div><div style="margin-top:4px;${sans(16, f.ink, 'font-weight:600;')}">${nb(e(value))}</div></td>`;
    const pairs = (list) => { let out = ''; for (let i = 0; i < list.length; i += 2) out += `<tr>${cell(...list[i])}${list[i + 1] ? cell(...list[i + 1]) : `<td width="50%" style="border-top:1px dashed ${f.rule};"></td>`}</tr>`; return out; };
    const strip = (right) => `<div style="background:${C.carbon};padding:13px 21px;">${T(`<tr><td width="26" valign="middle">${symbol(true, 26)}</td><td valign="middle" style="padding-left:13px;">${logo(true, 96)}</td><td align="right" valign="middle" style="${mono(11, C.paper)}">${right}</td></tr>`)}</div>`;
    const route = (size) => `<div style="padding:34px 21px 21px;"><div style="${mono(11, f.mut)}">From&nbsp;&nbsp;→&nbsp;&nbsp;To</div>`
      + `<div style="margin-top:8px;${sans(size, f.ink, 'font-weight:700;line-height:1.05;letter-spacing:-0.01em;text-transform:uppercase;')}">${D.from} <span style="color:${C.rust};">→</span> ${D.to}</div>`
      + `<div style="margin-top:8px;${mono(11, f.mut)}">${D.fromTag}&nbsp;&nbsp;·&nbsp;&nbsp;${D.toTag}</div></div>`;
    const stubHtml = (rl, rv) => `<div style="padding:21px;">${T(`<tr><td valign="bottom"><div style="${mono(11, stub.mut)}">${square()}Ref</div><div style="margin-top:4px;font-family:${MONO};font-size:20px;font-weight:700;letter-spacing:0.04em;color:${stub.ink};white-space:nowrap;">${D.ref}</div></td>`
      + `<td valign="bottom" align="right"><div style="${mono(11, stub.mut)}">${rl}</div><div style="margin-top:4px;${sans(16, stub.ink, 'font-weight:700;white-space:nowrap;')}">${rv}</div></td></tr>`)}</div>`;
    if (opts.kind === 'team') {
      const sub = (t) => `<tr><td colspan="2" style="padding:34px 21px 8px;${sans(20, f.ink, 'font-weight:600;line-height:1.2;')}">${t}</td></tr>`;
      const body = strip(`Quote request · ${D.service}`) + route(30)
        + T(pairs([['Received', D.received], ['Quote by', D.quoteBy]]) + sub('Job') + pairs(D.job) + sub('When') + pairs([['When', D.when]]) + sub('Contact') + pairs(D.contact)
          + sub('Notes') + `<tr>${cell('Notes', D.notes, { colspan: 2 })}</tr>` + sub('Sent from') + pairs(D.sent.slice(0, 2)) + `<tr>${cell(...D.sent[2], { colspan: 2 })}</tr>`) + gap(21);
      return page(`New quote request ${D.ref}`, preheader(`${D.service} · ${D.from} → ${D.to}`) + ticket([{ html: body }, { html: stubHtml('Quote by', nb(D.promised)), surface: stub }]));
    }
    const w = words();
    const body = strip('Your request') + route(26) + T(pairs([['Service', D.service], ['When', D.whenShort]])) + gap(13);
    return page(`We've got your request`, preheader(`Your quote is coming by ${D.promised}.`) + w.top + gap(13)
      + ticket([{ html: body }, { html: stubHtml('In writing by', nb(D.promised)), surface: stub }]) + gap(34) + w.call);
  }

  return { receipt, board, pass }[opts.style]();
}
