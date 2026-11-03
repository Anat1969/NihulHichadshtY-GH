import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// After a deploy, an open tab may request lazy chunks that no longer exist.
// Vite reports that as `vite:preloadError`; reload once to pick up the new build.
window.addEventListener("vite:preloadError", (event) => {
  const KEY = "chunk-reload-at";
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last > 10_000) {
    event.preventDefault();
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
