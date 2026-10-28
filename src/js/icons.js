// Hugeicons (iconify.design/hugeicons), vendored in src/icons, for markup built in JS. Pages use {{{icon "name"}}}.
const RAW = import.meta.glob('../icons/*.svg', { query: '?raw', import: 'default', eager: true });

export function icon(name, cls = '') {
  const svg = RAW[`../icons/${name}.svg`];
  if (!svg) throw new Error(`No icon "${name}" in src/icons`);
  return svg.trim().replace('<svg ', `<svg class="icon${cls ? ` ${cls}` : ''}" aria-hidden="true" focusable="false" `);
}
