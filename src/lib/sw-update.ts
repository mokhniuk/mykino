declare const __APP_VERSION__: string;

/**
 * Trigger a service worker update and reload the page.
 * Used by the manual update button in Settings.
 *
 * We navigate to '/' instead of reload() to avoid hitting the server
 * directly for an SPA route during the brief gap while the new SW activates.
 * The root '/' is always in the SW precache and the nginx fallback,
 * so it is safe to land on.
 */
export async function triggerSWUpdate() {
  if (!('serviceWorker' in navigator)) {
    window.location.replace('/');
    return;
  }

  const reg = await navigator.serviceWorker.getRegistration();
  if (reg?.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.replace('/');
    }, { once: true });
  } else {
    window.location.replace('/');
  }
}

/**
 * Check for a new app version on startup and auto-apply if available.
 * - If a new SW is already waiting, activate it immediately and reload.
 * - If not, trigger registration.update() so the browser downloads the new SW;
 *   reload once it takes control (controllerchange), with a 10 s fallback.
 * - Uses sessionStorage to prevent reload loops when the SW update stalls.
 */
export async function checkAndApplyUpdate(): Promise<void> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { version } = await res.json() as { version?: string };
    if (!version || version === __APP_VERSION__) return;

    // Don't attempt the same version twice in one session (avoids reload loops
    // when the SW update stalls or the network is slow).
    if (sessionStorage.getItem('_sw_update_v') === version) return;
    sessionStorage.setItem('_sw_update_v', version);

    if (!('serviceWorker' in navigator)) {
      window.location.replace('/');
      return;
    }

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      window.location.replace('/');
      return;
    }

    // Navigate to root as soon as the new SW takes control — using replace()
    // instead of reload() ensures we land on a URL that is always in the
    // precache, avoiding a raw network hit on SPA routes during SW activation.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.replace('/');
    }, { once: true });

    if (reg.waiting) {
      // New SW already downloaded and waiting — activate it now.
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Kick off SW update check; with registerType:'autoUpdate' the new SW
      // will call skipWaiting() itself, which fires controllerchange above.
      reg.update();
      // Fallback: if controllerchange never fires (very slow network / no update),
      // just reload — the current SW is still in control so this is safe.
      setTimeout(() => window.location.replace('/'), 10_000);
    }
  } catch {
    // Network unavailable or version.json missing — silent fail, keep running.
  }
}
