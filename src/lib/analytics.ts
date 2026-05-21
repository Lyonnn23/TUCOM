// Plausible Analytics wrapper.
// Script is loaded from index.html. This module exposes a typed `track` helper.

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean>; callback?: () => void },
    ) => void;
  }
}

type EventProps = Record<string, string | number | boolean | undefined | null>;

function clean(props?: EventProps) {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

export function track(event: string, props?: EventProps) {
  try {
    window.plausible?.(event, { props: clean(props) });
  } catch {
    /* no-op */
  }
}

// Pre-defined events used across the app
export const analytics = {
  pageView: (path: string) => track("pageview", { path }),
  stationClick: (stationId: string, brand?: string) =>
    track("station_click", { stationId, brand: brand ?? "" }),
  filterFuel: (fuel: string) => track("filter_fuel", { fuel }),
  filterBrand: (brand: string) => track("filter_brand", { brand }),
  login: (method: string) => track("login", { method }),
  installAccepted: () => track("install_accepted"),
  installDismissed: () => track("install_dismissed"),
};
