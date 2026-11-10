// GT-10 shared · the five brand colours and the one way any other colour is made from them: mixing.
// mix('paper', 'camel', 0.2) is CSS color-mix(in srgb, camel 20%, paper); either side can also be a hex colour.
export const T = { paper: '#F7F2E7', carbon: '#202521', yellow: '#E4BB3F', rust: '#A9503E', camel: '#B49A78' };

export const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const hex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
export const mix = (a, b, t) => hex(rgb(T[a] ?? a).map((v, i) => v + (rgb(T[b] ?? b)[i] - v) * t));
export const alpha = (c, a) => `rgba(${rgb(T[c] ?? c).join(', ')}, ${a})`;
