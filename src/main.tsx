import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register push notification service worker
if ("serviceWorker" in navigator) {
  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const isPreviewHost =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com");

  if (!isPreviewHost && !isInIframe) {
    navigator.serviceWorker.register("/sw-push.js").catch((err) => {
      console.log("SW registration failed:", err);
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
