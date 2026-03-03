declare const __APP_VERSION__: string;

/**
 * Trigger a service worker update and reload the page.
 * Used by the manual update button in Settings.
 */
export async function triggerSWUpdate() {
  if (!('serviceWorker' in navigator)) {
    window.location.reload();
    return;
  }

  const reg = await navigator.serviceWorker.getRegistration();
  if (reg?.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    }, { once: true });
  } else {
    window.location.reload();
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
      window.location.reload();
      return;
    }

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      window.location.reload();
      return;
    }

    // Reload as soon as the new SW takes control of this page.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    }, { once: true });

    if (reg.waiting) {
      // New SW already downloaded and waiting — activate it now.
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Kick off SW update check; with registerType:'autoUpdate' the new SW
      // will call skipWaiting() itself, which fires controllerchange above.
      reg.update();
      // Fallback: if controllerchange never fires (very slow network / no update),
      // reload anyway so the user isn't stuck waiting.
      setTimeout(() => window.location.reload(), 10_000);
    }
  } catch {
    // Network unavailable or version.json missing — silent fail, keep running.
  }
}
