/**
 * Trigger a service worker update and reload the page.
 *
 * With registerType: 'autoUpdate', skipWaiting() and clientsClaim() are called
 * automatically by the SW, so the new SW is already active by the time the user
 * sees an update notification. If there is still a waiting SW (edge case), we
 * send SKIP_WAITING and wait for controllerchange before reloading.
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
