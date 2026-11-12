/* Dot matrix for the mocks, in the homepage's own language (src/js/dotmatrix.js, the Services cards' facts): the hand-set
   5 × 7 font, lit dots in currentColor, every other dot of the field at 12%, so the whole plate reads as one board.
   dotField(el, 'HELP DESK', { pitch, style: 'board' | 'bold' | 'glow' }) fills el's box with dots and centres the text.
   (The font is the site's DM_FONT, mirrored here because the mocks are served on their own.) */
window.DM_FONT = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110', C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110', E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001', I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100', K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 10001 11001 10101 10011 10001 10001', O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000', Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100', U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100', W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110', 4: '00010 00110 01010 10010 11111 00010 00010',
  '.': '000 000 000 000 000 011 011', ' ': '000 000 000 000 000 000 000'
};
/* how many columns a text takes (to size every panel of a sign to one pitch) */
window.dotCount = function (text, style) {
  const bold = style === 'bold';
  return [...text.toUpperCase()].reduce((n, ch, i) => n + (DM_FONT[ch] || DM_FONT[' ']).split(' ')[0].length + (bold ? 1 : 0) + (i ? (bold ? 2 : 1) : 0), 0);
};
window.dotField = function (el, text, o = {}) {
  const pitch = o.pitch || 5, style = o.style || 'board';
  // bold widens each glyph by a column (each lit dot also lights the one to its right) and keeps two blanks between letters
  const bold = style === 'bold', cols = [];
  [...text.toUpperCase()].forEach((ch, i) => {
    const g = (DM_FONT[ch] || DM_FONT[' ']).split(' ');
    if (i) { cols.push(null); if (bold) cols.push(null); }
    const w = g[0].length + (bold ? 1 : 0);
    for (let c = 0; c < w; c++) cols.push(g.map((r) => r[c] === '1' || (bold && c > 0 && r[c - 1] === '1')));
  });
  const W = el.clientWidth, H = el.clientHeight;
  const nx = Math.max(cols.length, Math.floor(W / pitch)), ny = Math.max(7, Math.floor(H / pitch));
  const x0 = Math.floor((nx - cols.length) / 2), y0 = Math.floor((ny - 7) / 2);
  const ox = (W - nx * pitch) / 2, oy = (H - ny * pitch) / 2, r = pitch * 0.38;
  let off = '', on = '';
  for (let x = 0; x < nx; x++) for (let y = 0; y < ny; y++) {
    const lit = cols[x - x0]?.[y - y0];
    const c = `<circle cx="${(ox + x * pitch + pitch / 2).toFixed(1)}" cy="${(oy + y * pitch + pitch / 2).toFixed(1)}" r="${r.toFixed(2)}"/>`;
    if (lit) on += c; else off += c;
  }
  const glow = style === 'glow' ? ` style="filter:drop-shadow(0 0 ${(pitch * 0.5).toFixed(1)}px currentColor)"` : '';
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="currentColor" aria-hidden="true" style="display:block"><g opacity=".12">${off}</g><g${glow}>${on}</g></svg>`;
  el.setAttribute('role', 'img'); el.setAttribute('aria-label', text);
};
