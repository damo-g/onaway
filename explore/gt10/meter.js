// GT-10 shared · the dev meter (bottom left): FPS over the last second and load timings from when the map started
// loading. Dev only. Also exposes window.__gt10 for the measuring scripts.
export function createMeter() {
  const perf = { boot: null, lib: null, firstFrame: null };
  window.__gt10 = { perf, fps: [] };
  if (!import.meta.env.DEV) return perf;
  const meter = document.createElement('p');
  meter.className = 'g10-meter label';
  meter.setAttribute('aria-hidden', 'true');
  document.body.append(meter);
  const f = (v) => (v == null || perf.boot == null ? '…' : `${((v - perf.boot) / 1000).toFixed(2)}s`);
  let frames = 0;
  let last = performance.now();
  const tick = (t) => {
    frames++;
    if (t - last >= 1000) {
      const fps = Math.round((frames * 1000) / (t - last));
      window.__gt10.fps.push(fps);
      meter.textContent = `${fps} fps · lib ${f(perf.lib)} · first frame ${f(perf.firstFrame)}`;
      frames = 0;
      last = t;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return perf;
}
