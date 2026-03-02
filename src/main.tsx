import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// If a JS chunk fails to load after a SW update (stale bundle hash),
// redirect to root so the new SW serves fresh assets.
window.addEventListener('vite:preloadError', () => {
  window.location.replace('/app');
});

createRoot(document.getElementById("root")!).render(<App />);
