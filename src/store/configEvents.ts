/**
 * @file configEvents — cross-tab refresh signal for the TalkHub product config.
 *
 * TabView keeps every tab panel mounted (inactive ones are hidden with
 * display:none), so a tab's data-loading effect runs only once on first mount.
 * After a mutation in one tab (creating a gateway or extension, saving routes)
 * the sibling tabs would otherwise show stale lists until a full page reload
 * (Strg+Shift+R). Emitting this event makes every config tab re-fetch.
 *
 * Mirrors the existing `license-changed` window-event pattern used elsewhere.
 */
const CONFIG_CHANGED = 'talkhub-config-changed';

/** Notify all config tabs that gateways/extensions/routes changed. */
export function emitConfigChanged(): void {
  window.dispatchEvent(new Event(CONFIG_CHANGED));
}

/**
 * Subscribe to config-changed events.
 * @returns an unsubscribe function for useEffect cleanup.
 */
export function onConfigChanged(handler: () => void): () => void {
  window.addEventListener(CONFIG_CHANGED, handler);
  return () => window.removeEventListener(CONFIG_CHANGED, handler);
}
