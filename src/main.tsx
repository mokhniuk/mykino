import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { checkAndApplyUpdate } from "@/lib/sw-update";

// If a JS chunk fails to load after a SW update (stale bundle hash),
// redirect to root so the new SW serves fresh assets.
window.addEventListener('vite:preloadError', () => {
  window.location.replace('/app');
});

// Check for a new version on every app start; reloads automatically if found.
checkAndApplyUpdate();

// ── Setup handoff ────────────────────────────────────────────────────────────
// When navigating from the landing page to /app, all setup data is encoded in
// a ?_s= URL parameter. We read it here — before React mounts — so that
// I18nProvider and ThemeProvider can initialise synchronously with the correct
// values from localStorage (they call localStorage.getItem in their state
// initialisers). The full payload is kept in _setup_handoff for the async IDB
// writes that happen inside the app (genres, watched movies).
function decodeSetupToken(token: string): string {
  // Normalize base64url → standard base64 and restore any padding.
  let base64 = token.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  // atob gives a binary string; feed through TextDecoder to recover UTF-8.
  const binary = atob(base64);
  const bytes  = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

(function applySetupHandoff() {
  const token = new URLSearchParams(window.location.search).get('_s');
  if (!token) return;
  try {
    const p = JSON.parse(decodeSetupToken(token)) as {
      l?: string; t?: string; lg?: number[]; dg?: number[];
      w?: { i: string; T: string; y: string; p: string; tp: string }[];
    };
    if (p.l) localStorage.setItem('lang', p.l);
    if (p.t) {
      localStorage.setItem('theme', p.t);
      const isDark = p.t === 'dark' || (p.t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    }
    localStorage.setItem('hasSeenLanding', 'true');
    localStorage.setItem('_setup_handoff', JSON.stringify(p));
    // Clean the token from the URL before React router sees it
    window.history.replaceState({}, '', '/app');
  } catch { /* malformed token — ignore */ }
})();

createRoot(document.getElementById("root")!).render(<App />);
