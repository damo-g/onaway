// Section options for the dev review panel. The first value of each option is the locked default.
// Build the locked option as the base styles; alternatives hang off [data-<option>="value"].
// In production this is a no-op and the calls are tree-shaken away.
export function registerOptions(sectionId, options) {
  if (import.meta.env.DEV) {
    (window.__onawayOptions ??= new Map()).set(sectionId, options);
  }
}
