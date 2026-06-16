// GA4 analytics wrapper. Loads gtag.js only after user consent.
// No PII is sent — only opaque IDs (station IDs, fuel codes, counts).

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __tucomGaLoaded?: boolean;
  }
}

const CONSENT_KEY = "analytics_consent_v1";
const MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) ?? "";

type EventProps = Record<string, string | number | boolean | undefined | null>;

function consentGranted(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function setConsent(value: "granted" | "denied") {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* noop */
  }
  if (value === "granted") loadGtag();
}

export function getConsent(): "granted" | "denied" | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function loadGtag() {
  if (typeof window === "undefined") return;
  if (window.__tucomGaLoaded) return;
  if (!MEASUREMENT_ID) return;
  if (!consentGranted()) return;

  window.__tucomGaLoaded = true;
  window.dataLayer = window.dataLayer || [];
  const gtag: (...args: unknown[]) => void = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", MEASUREMENT_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(s);
}

// Try to load on module init in case consent was given previously.
if (typeof window !== "undefined") {
  loadGtag();
}

function clean(props?: EventProps): Record<string, string | number | boolean> | undefined {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export function track(event: string, props?: EventProps) {
  try {
    if (!consentGranted()) return;
    window.gtag?.("event", event, clean(props) ?? {});
  } catch {
    /* noop */
  }
}

export function pageView(path: string, title?: string) {
  try {
    if (!consentGranted()) return;
    if (!MEASUREMENT_ID) return;
    window.gtag?.("event", "page_view", {
      page_path: path,
      page_title: title,
    });
  } catch {
    /* noop */
  }
}

export function setUserProperties(props: EventProps) {
  try {
    if (!consentGranted()) return;
    window.gtag?.("set", "user_properties", clean(props) ?? {});
  } catch {
    /* noop */
  }
}

// ----- Pre-defined events (spec) -----
export const analytics = {
  // Legacy/back-compat helpers used across the app
  pageView: (path: string) => pageView(path),
  stationClick: (stationId: string, brand?: string) =>
    track("view_station", { station_id: stationId, brand: brand ?? "" }),
  filterFuel: (fuel: string) => track("filter_fuel", { fuel }),
  filterBrand: (brand: string) => track("filter_brand", { brand }),
  login: (method: string) => track("login", { method }),
  installAccepted: () => track("install_accepted"),
  installDismissed: () => track("install_dismissed"),

  // Spec events
  searchStation: (query: string, results?: number) =>
    track("search_station", { q_len: query.length, results: results ?? 0 }),
  viewStation: (stationId: string, brand?: string) =>
    track("view_station", { station_id: stationId, brand: brand ?? "" }),
  calculateTrip: (fuelType: string, distanceKm: number) =>
    track("calculate_trip", { fuel_type: fuelType, distance_km: Math.round(distanceKm) }),
  openMap: () => track("open_map"),
  useAi: (msgLen: number) => track("use_ai", { msg_len: msgLen }),
  sharePrice: (fuelType?: string, channel?: string) =>
    track("share_price", { fuel_type: fuelType ?? "", channel: channel ?? "native" }),
  addFavorite: (stationId: string) => track("add_favorite", { station_id: stationId }),
  viewBenefit: (brand?: string, payment?: string) =>
    track("view_benefit", { brand: brand ?? "", payment: payment ?? "" }),
  installPrompt: (source: "native" | "ios") => track("install_prompt", { source }),
};
