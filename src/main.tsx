import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import { setUpdateSW } from './lib/sw-update';
import App from "./App.tsx";
import "./index.css";

// Auto-update on open: when a new SW is waiting, activate it and reload immediately.
const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true);
  },
  onOfflineReady() {},
});

// Expose for manual trigger (e.g. Settings page update button).
setUpdateSW(updateSW);

// After a SW update, old hashed chunk files no longer exist in the new cache.
// Vite fires this event when a dynamic import or preload fails to load.
// Redirect to root so the new SW serves the fresh index.html + new bundles.
window.addEventListener('vite:preloadError', () => {
  window.location.replace('/');
});

createRoot(document.getElementById("root")!).render(<App />);
