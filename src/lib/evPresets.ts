// Presets de vehículos eléctricos populares en Chile.
// Eficiencia (km/kWh) es nominal mixto (WLTP / fichas oficiales).

export type EvConnector = "CCS2" | "CHAdeMO" | "Type2" | "Tesla";

export interface EvPreset {
  brand: string;
  model: string;
  battery_kwh: number;
  efficiency_kmkwh: number;
  max_range_km: number;
  connector: EvConnector;
}

export const EV_PRESETS: EvPreset[] = [
  { brand: "BYD",    model: "Atto 3",       battery_kwh: 60, efficiency_kmkwh: 5.5, max_range_km: 330, connector: "CCS2" },
  { brand: "MG",     model: "MG4",          battery_kwh: 51, efficiency_kmkwh: 6.2, max_range_km: 315, connector: "CCS2" },
  { brand: "GWM",    model: "Ora Funky Cat",battery_kwh: 48, efficiency_kmkwh: 6.0, max_range_km: 290, connector: "CCS2" },
  { brand: "Tesla",  model: "Model 3",      battery_kwh: 60, efficiency_kmkwh: 6.7, max_range_km: 401, connector: "Tesla" },
  { brand: "Tesla",  model: "Model Y",      battery_kwh: 75, efficiency_kmkwh: 6.0, max_range_km: 455, connector: "Tesla" },
  { brand: "Nissan", model: "Leaf",         battery_kwh: 40, efficiency_kmkwh: 6.0, max_range_km: 270, connector: "CHAdeMO" },
  { brand: "Hyundai",model: "Kona Electric",battery_kwh: 64, efficiency_kmkwh: 6.5, max_range_km: 415, connector: "CCS2" },
  { brand: "Volvo",  model: "EX30",         battery_kwh: 64, efficiency_kmkwh: 5.8, max_range_km: 370, connector: "CCS2" },
  { brand: "BYD",    model: "Dolphin",      battery_kwh: 44, efficiency_kmkwh: 6.3, max_range_km: 280, connector: "CCS2" },
  { brand: "Maxus",  model: "Mifa 9",       battery_kwh: 90, efficiency_kmkwh: 4.5, max_range_km: 405, connector: "CCS2" },
];

// Mapa simple operador → marca de red (estilo Bencina en Línea)
export const EV_NETWORK_BRAND: Record<string, string> = {
  "enel x": "Enel X Way",
  "enelx": "Enel X Way",
  "copec": "Copec Voltex",
  "voltex": "Copec Voltex",
  "byd": "BYD",
  "zeccom": "Zeccom",
  "mobi-e": "Mobi-E",
  "mobie": "Mobi-E",
  "tesla": "Tesla Supercharger",
};

export function powerTier(kw: number | null | undefined): {
  label: string;
  tone: "slow" | "medium" | "fast" | "ultra";
  className: string;
} {
  const v = Number(kw ?? 0);
  if (v >= 150) return { label: "Ultra rápido", tone: "ultra", className: "bg-fuel-pink/15 text-fuel-pink border-fuel-pink/30" };
  if (v >= 50)  return { label: "Rápido",        tone: "fast",  className: "bg-primary/15 text-primary border-primary/30" };
  if (v >= 22)  return { label: "Semi-rápido",   tone: "medium",className: "bg-fuel-amber/15 text-fuel-amber border-fuel-amber/30" };
  return        { label: "Lento (AC)",            tone: "slow",  className: "bg-muted text-muted-foreground border-border" };
}
