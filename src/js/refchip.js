import { prefersReducedMotion } from './motion.js';

// Tear-off stub: copies the quote reference (src/partials/refchip.hbs). Every chip on the page shares one
// store, so copying from any of them shows COPIED on all of them. request.js sets the store's ref once the
// server answers. The look and timing live in main.css (.refchip).
const HOLD = 1600;

function announce(text) {
  let live = document.getElementById('refchip-live');
  if (!live) {
    live = Object.assign(document.createElement('div'), { id: 'refchip-live', className: 'sr-only' });
    live.setAttribute('aria-live', 'polite');
    document.body.append(live);
  }
  live.textContent = '';
  setTimeout(() => (live.textContent = text), 30);
}

// Clipboard API first; if it's refused, a hidden textarea and execCommand, then focus goes back to the button
async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.setAttribute('aria-hidden', 'true');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
    getSelection()?.removeAllRanges();
    btn.focus({ preventScroll: true });
    return ok;
  }
}

export function registerRefChip(Alpine) {
  Alpine.store('refCopy', { ref: '', done: false });

  Alpine.data('refChip', () => ({
    fail: false,
    held: false, // the tear has played; the stub rests tipped until the hold ends
    word: 'Copied',
    get shown() { return this.$store.refCopy.done || this.fail; },
    async copy(btn) {
      const store = this.$store.refCopy;
      if (store.done || this.fail || !store.ref) return; // taps during the confirmation are ignored
      if (await copyText(store.ref, btn)) {
        this.word = 'Copied';
        store.done = true;
        announce('Reference copied');
        if (!prefersReducedMotion()) navigator.vibrate?.(10);
        setTimeout(() => (store.done = false), HOLD);
      } else {
        this.word = 'Not copied';
        this.fail = true;
        announce(`Couldn’t copy. Your reference is ${store.ref}.`);
        setTimeout(() => (this.fail = false), HOLD);
      }
    },
    init() {
      // once the confirmation fades, the word and the tear reset for next time
      this.$watch('shown', (on) => { if (!on) setTimeout(() => { this.held = false; this.word = 'Copied'; }, 500); });
    },
  }));
}
