export type NavApp = "waze" | "google" | "apple" | "web";

const STORAGE_KEY = "nav_app";

export const isIOS = () =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(navigator as any).MSStream;

export function getPreferredNavApp(): NavApp | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "waze" || v === "google" || v === "apple" || v === "web") return v;
  } catch {}
  return null;
}

export function setPreferredNavApp(app: NavApp) {
  try { localStorage.setItem(STORAGE_KEY, app); } catch {}
}

export function clearPreferredNavApp() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function navUrl(app: NavApp, lat: number, lng: number): string {
  switch (app) {
    case "waze":
      return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    case "google":
      return `https://maps.google.com/maps?daddr=${lat},${lng}`;
    case "apple":
      return `https://maps.apple.com/?daddr=${lat},${lng}`;
    case "web":
    default:
      return `https://maps.google.com/maps?daddr=${lat},${lng}`;
  }
}

export function openNavApp(app: NavApp, lat: number, lng: number) {
  window.open(navUrl(app, lat, lng), "_blank", "noopener,noreferrer");
}
