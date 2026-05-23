// Rangos de precios de combustible en Chile — Mayo 2026
// Fuente: CNE Bencina en Línea
// Estos valores se deben actualizar semanalmente.

export interface PriceRange {
  min: number;
  max: number;
  avg: number;
}

export const PRICE_RANGES: Record<string, PriceRange> = {
  gasoline93: { min: 1450, max: 1750, avg: 1570 },
  gasoline95: { min: 1490, max: 1800, avg: 1616 },
  gasoline97: { min: 1550, max: 1850, avg: 1670 },
  diesel:     { min: 1430, max: 1650, avg: 1510 },
  glp:        { min: 500,  max: 750,  avg: 620 },
  electric:   { min: 50,   max: 1000, avg: 120 },
};

export const DEFAULT_PRICES: Record<string, number> = {
  gasoline93: PRICE_RANGES.gasoline93.avg,
  gasoline95: PRICE_RANGES.gasoline95.avg,
  gasoline97: PRICE_RANGES.gasoline97.avg,
  diesel:     PRICE_RANGES.diesel.avg,
  glp:        PRICE_RANGES.glp.avg,
  electric:   PRICE_RANGES.electric.avg,
};

export const PRICES_LAST_UPDATED = "2026-05-22";
export const PRICES_SOURCE = "CNE Bencina en Línea — mayo 2026";

export function isPriceInRange(fuelType: string, price: number): boolean {
  const r = PRICE_RANGES[fuelType];
  if (!r) return false;
  return Number.isFinite(price) && price >= r.min && price <= r.max;
}

// Sugerencias preestablecidas (debajo del avg) para alertas
export function alertPresets(fuelType: string): number[] {
  const r = PRICE_RANGES[fuelType] ?? PRICE_RANGES.gasoline95;
  const base = r.avg;
  return [base - 26, base - 56, base - 86, base - 116].map((v) =>
    Math.max(r.min, Math.round(v / 10) * 10),
  );
}
